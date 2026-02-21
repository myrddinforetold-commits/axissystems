import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const AXIS_API_URL = Deno.env.get("AXIS_API_URL");
const AXIS_API_SECRET = Deno.env.get("AXIS_API_SECRET");

interface RoleRecord {
  id: string;
  company_id: string;
  memory_scope: "role" | "company";
}

interface ChatContext {
  grounding?: Record<string, unknown>;
  companyMemory?: Array<{ content: string; label?: string }>;
  objectives?: Array<{ id: string; title: string; status: string }>;
  recentMessages?: Array<{ sender: string; content: string }>;
}

function toOpenAiDelta(content: string): Uint8Array {
  return new TextEncoder().encode(
    `data: ${JSON.stringify({ choices: [{ delta: { content } }] })}\n\n`
  );
}

function toOpenAiDone(): Uint8Array {
  return new TextEncoder().encode("data: [DONE]\n\n");
}

function toSseKeepAlive(): Uint8Array {
  return new TextEncoder().encode(": keepalive\n\n");
}

async function loadChatContext(
  supabaseUser: SupabaseClient,
  role: RoleRecord
): Promise<ChatContext> {
  const context: ChatContext = {};

  const { data: grounding } = await supabaseUser
    .from("company_grounding")
    .select(
      "products, entities, intended_customer, constraints, current_state_summary, technical_context"
    )
    .eq("company_id", role.company_id)
    .eq("status", "confirmed")
    .maybeSingle();

  if (grounding) {
    context.grounding = {
      products: grounding.products || [],
      entities: grounding.entities || [],
      intendedCustomer: grounding.intended_customer,
      constraints: grounding.constraints || [],
      currentStateSummary: grounding.current_state_summary || null,
      technicalContext: grounding.technical_context || null,
    };
  }

  const { data: objectives } = await supabaseUser
    .from("role_objectives")
    .select("id, title, status")
    .eq("role_id", role.id)
    .eq("status", "active")
    .order("priority", { ascending: true })
    .limit(5);

  if (objectives && objectives.length > 0) {
    context.objectives = objectives.map((o) => ({
      id: o.id,
      title: o.title,
      status: o.status,
    }));
  }

  if (role.memory_scope === "company") {
    const { data: memories } = await supabaseUser
      .from("company_memory")
      .select("content, label")
      .eq("company_id", role.company_id)
      .order("created_at", { ascending: false })
      .limit(15);

    if (memories && memories.length > 0) {
      context.companyMemory = memories.map((m) => ({
        content: m.content,
        label: m.label || undefined,
      }));
    }
  }

  const { data: recentMessages } = await supabaseUser
    .from("role_messages")
    .select("sender, content")
    .eq("role_id", role.id)
    .order("created_at", { ascending: false })
    .limit(12);

  if (recentMessages && recentMessages.length > 0) {
    context.recentMessages = [...recentMessages]
      .reverse()
      .filter((m) => typeof m.content === "string" && m.content.trim().length > 0)
      .map((m) => ({
        sender: m.sender,
        content: m.content,
      }));
  }

  return context;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!AXIS_API_URL || !AXIS_API_SECRET) {
      return new Response(
        JSON.stringify({ error: "AXIS_API_URL / AXIS_API_SECRET not configured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { role_id, message } = await req.json();

    if (!role_id || !message) {
      return new Response(
        JSON.stringify({ error: "role_id and message are required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Authorization required" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");

    if (!supabaseUrl || !supabaseServiceKey || !supabaseAnonKey) {
      return new Response(
        JSON.stringify({ error: "Supabase environment not configured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const supabaseService = createClient(supabaseUrl, supabaseServiceKey);

    const { data: userData, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !userData?.user) {
      return new Response(JSON.stringify({ error: "Invalid authentication" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: role, error: roleError } = await supabaseUser
      .from("roles")
      .select("id, company_id, memory_scope")
      .eq("id", role_id)
      .single();

    if (roleError || !role) {
      return new Response(
        JSON.stringify({ error: "Role not found or access denied" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const context = await loadChatContext(supabaseUser, role as RoleRecord);

    const { error: insertUserError } = await supabaseUser.from("role_messages").insert({
      role_id,
      company_id: role.company_id,
      sender: "user",
      content: String(message),
    });

    if (insertUserError) {
      console.error("Failed to store user message:", insertUserError);
    }

    const axisResponse = await fetch(`${AXIS_API_URL}/api/v1/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${AXIS_API_SECRET}`,
      },
      body: JSON.stringify({
        company_id: role.company_id,
        role_id,
        message,
        context,
      }),
    });

    if (!axisResponse.ok || !axisResponse.body) {
      const errText = await axisResponse.text().catch(() => "");
      return new Response(JSON.stringify({ error: "Axis API chat failed", details: errText }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let fullResponse = "";
    const decoder = new TextDecoder();
    const encoder = new TextEncoder();

    let heartbeat: number | null = null;

    const transformedStream = new ReadableStream<Uint8Array>({
      async start(controller) {
        const reader = axisResponse.body!.getReader();
        let buffer = "";
        let eventName = "";
        let dataLines: string[] = [];
        let doneEmitted = false;
        const keepAlivePayload = toSseKeepAlive();

        heartbeat = setInterval(() => {
          try {
            controller.enqueue(keepAlivePayload);
          } catch {
            // Ignore if stream is already closed.
          }
        }, 10000) as unknown as number;

        const emitDone = () => {
          if (doneEmitted) return;
          doneEmitted = true;
          controller.enqueue(toOpenAiDone());
        };

        const flushEvent = () => {
          if (!eventName && dataLines.length === 0) return;

          const payloadText = dataLines.join("\n").trim();
          dataLines = [];

          if (!payloadText) {
            eventName = "";
            return;
          }

          let payload: any;
          try {
            payload = JSON.parse(payloadText);
          } catch {
            eventName = "";
            return;
          }

          if (eventName === "delta") {
            const content = payload?.content;
            if (typeof content === "string" && content.length > 0) {
              fullResponse += content;
              controller.enqueue(toOpenAiDelta(content));
            }
          } else if (eventName === "done") {
            const content = payload?.content;
            if (typeof content === "string" && content.length > 0 && fullResponse.length === 0) {
              fullResponse = content;
              controller.enqueue(toOpenAiDelta(content));
            }
            emitDone();
          } else if (eventName === "error") {
            throw new Error(payload?.error || "Axis API stream error");
          }

          eventName = "";
        };

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            if (!value) continue;

            buffer += decoder.decode(value, { stream: true });

            let newlineIndex = buffer.indexOf("\n");
            while (newlineIndex !== -1) {
              let line = buffer.slice(0, newlineIndex);
              buffer = buffer.slice(newlineIndex + 1);

              if (line.endsWith("\r")) line = line.slice(0, -1);

              if (line === "") {
                flushEvent();
              } else if (line.startsWith("event:")) {
                eventName = line.slice(6).trim();
              } else if (line.startsWith("data:")) {
                dataLines.push(line.slice(5).trimStart());
              }

              newlineIndex = buffer.indexOf("\n");
            }
          }

          buffer += decoder.decode();
          if (buffer.length > 0) {
            const trailing = buffer.split(/\r?\n/);
            for (const rawLine of trailing) {
              if (rawLine.startsWith("event:")) {
                eventName = rawLine.slice(6).trim();
              } else if (rawLine.startsWith("data:")) {
                dataLines.push(rawLine.slice(5).trimStart());
              }
            }
          }

          flushEvent();
          emitDone();
          controller.close();
        } catch (error) {
          controller.error(error);
        } finally {
          if (heartbeat !== null) {
            clearInterval(heartbeat);
            heartbeat = null;
          }

          try {
            await reader.cancel();
          } catch {
            // Ignore cancellation errors
          }

          if (fullResponse.trim().length > 0) {
            const { error } = await supabaseService.from("role_messages").insert({
              role_id,
              company_id: role.company_id,
              sender: "ai",
              content: fullResponse,
            });
            if (error) {
              console.error("Failed to store AI message:", error);
            }
          }
        }
      },
      cancel() {
        if (heartbeat !== null) {
          clearInterval(heartbeat);
          heartbeat = null;
        }
        return Promise.resolve();
      },
    });

    return new Response(transformedStream, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
      },
    });
  } catch (error) {
    console.error("role-chat error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
