const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type OnboardingState =
  | "ask_name"
  | "ask_company"
  | "ask_url"
  | "extracting"
  | "confirm"
  | "ask_customer"
  | "ask_goal"
  | "manual_description"
  | "manual_customer"
  | "manual_goal"
  | "manual_confirm"
  | "provisioning"
  | "done";

interface OnboardingContext {
  name?: string;
  company?: string;
  url?: string;
  extracted?: {
    company_name?: string;
    description?: string;
    products?: Array<{ name: string; description: string }>;
    tech_stack?: string[];
    target_customer?: string;
    team_members?: Array<{ name: string; role: string }>;
  };
  description?: string;
  customer?: string;
  goal?: string;
  company_id?: string;
}

interface ChatRequest {
  message: string;
  state: OnboardingState;
  context: OnboardingContext;
}

interface ChatResponse {
  reply: string;
  state: OnboardingState;
  context: OnboardingContext;
  done?: boolean;
  company_id?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No auth header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify user from token
    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { message, state, context }: ChatRequest = await req.json();
    let response: ChatResponse;

    switch (state) {
      case "ask_name": {
        const name = message.trim();
        response = {
          reply: `Nice to meet you, ${name}! What's your company called?`,
          state: "ask_company",
          context: { ...context, name },
        };
        break;
      }

      case "ask_company": {
        const company = message.trim();
        response = {
          reply:
            `Got it — **${company}**. Want me to learn about your company automatically?\n\n` +
            `Drop a link to your **website** or **GitHub repo**, and I'll extract key info.\n\n` +
            `Or type **skip** to describe it yourself.`,
          state: "ask_url",
          context: { ...context, company },
        };
        break;
      }

      case "ask_url": {
        if (message.trim().toLowerCase() === "skip") {
          response = {
            reply: `No problem! In one sentence, what does **${context.company}** do?`,
            state: "manual_description",
            context,
          };
          break;
        }

        // Try to scrape the URL
        const MOLTBOT_API_URL = Deno.env.get("MOLTBOT_API_URL")!;
        const MOLTBOT_API_KEY = Deno.env.get("MOLTBOT_API_KEY")!;

        let url = message.trim();
        if (!url.startsWith("http://") && !url.startsWith("https://")) {
          url = `https://${url}`;
        }

        try {
          const scrapeEndpoint = `${MOLTBOT_API_URL}/scrape`;
          console.log("Scraping URL:", url, "via", scrapeEndpoint);
          
          const scrapeRes = await fetch(scrapeEndpoint, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${MOLTBOT_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ url }),
          });

          console.log("Scrape response status:", scrapeRes.status, scrapeRes.statusText);
          const scrapeText = await scrapeRes.text();
          console.log("Scrape response body (first 500):", scrapeText.substring(0, 500));

          if (!scrapeRes.ok) {
            response = {
              reply:
                `I couldn't fetch that URL (status ${scrapeRes.status}). Could you try another link, or type **skip** to describe your company manually?`,
              state: "ask_url",
              context,
            };
            break;
          }
          
          const scrapeData = JSON.parse(scrapeText);

          // scrapeData already parsed above
          const extracted = scrapeData.extracted || {};

          // Build a summary of what was found
          const lines: string[] = ["Here's what I found:\n"];
          lines.push(
            `**Company:** ${extracted.company_name || context.company}`
          );
          if (extracted.description)
            lines.push(`**Description:** ${extracted.description}`);
          if (extracted.products?.length)
            lines.push(
              `**Products:** ${extracted.products.map((p: { name: string }) => p.name).join(", ")}`
            );
          if (extracted.tech_stack?.length)
            lines.push(`**Tech Stack:** ${extracted.tech_stack.join(", ")}`);
          if (extracted.target_customer)
            lines.push(`**Target Customer:** ${extracted.target_customer}`);

          lines.push(
            "\nDoes this look right? Say **yes** to confirm, or tell me what to change."
          );

          response = {
            reply: lines.join("\n"),
            state: "confirm",
            context: { ...context, extracted, url },
          };
        } catch (_e) {
          response = {
            reply:
              "Something went wrong fetching that URL. Try another link, or type **skip**.",
            state: "ask_url",
            context,
          };
        }
        break;
      }

      case "confirm": {
        if (message.trim().toLowerCase().startsWith("yes")) {
          // Check if we're missing target customer
          if (!context.extracted?.target_customer) {
            response = {
              reply:
                "Great! One more thing — who's your **target customer**? (e.g., 'Enterprise banks', 'SMB founders', 'Developers')",
              state: "ask_customer",
              context,
            };
          } else if (!context.goal) {
            response = {
              reply:
                "Almost done! What's **one goal** you want to achieve in the next 3 months?",
              state: "ask_goal",
              context,
            };
          } else {
            // Provision
            response = await provisionCompany(supabase, user.id, context);
          }
        } else {
          response = {
            reply:
              "What should I change? Just describe the corrections and I'll update.",
            state: "confirm",
            context,
          };
        }
        break;
      }

      case "ask_customer": {
        const customer = message.trim();
        const updatedContext = {
          ...context,
          customer,
          extracted: {
            ...context.extracted,
            target_customer: customer,
          },
        };
        response = {
          reply:
            "Almost done! What's **one goal** you want to achieve in the next 3 months?",
          state: "ask_goal",
          context: updatedContext,
        };
        break;
      }

      case "ask_goal": {
        const goal = message.trim();
        const updatedContext = { ...context, goal };
        response = await provisionCompany(supabase, user.id, updatedContext);
        break;
      }

      // Manual flow (skip URL)
      case "manual_description": {
        const description = message.trim();
        response = {
          reply:
            "Who's your **target customer**? (e.g., 'Enterprise banks', 'SMB founders')",
          state: "manual_customer",
          context: { ...context, description },
        };
        break;
      }

      case "manual_customer": {
        const customer = message.trim();
        response = {
          reply:
            "Last question — what's **one goal** you want to achieve in the next 3 months?",
          state: "manual_goal",
          context: { ...context, customer },
        };
        break;
      }

      case "manual_goal": {
        const goal = message.trim();
        const updatedContext: OnboardingContext = {
          ...context,
          goal,
          extracted: {
            description: context.description,
            target_customer: context.customer,
            products: [],
            tech_stack: [],
          },
        };

        // Build confirmation
        const lines = ["Here's your company summary:\n"];
        lines.push(`**Company:** ${updatedContext.company}`);
        lines.push(`**Description:** ${updatedContext.description}`);
        lines.push(`**Target Customer:** ${updatedContext.customer}`);
        lines.push(`**Goal:** ${goal}`);
        lines.push("\nLooks good? Say **yes** to create your AI team!");

        response = {
          reply: lines.join("\n"),
          state: "manual_confirm",
          context: updatedContext,
        };
        break;
      }

      case "manual_confirm": {
        if (message.trim().toLowerCase().startsWith("yes")) {
          response = await provisionCompany(supabase, user.id, context);
        } else {
          response = {
            reply: "What should I change?",
            state: "manual_confirm",
            context,
          };
        }
        break;
      }

      default:
        response = {
          reply: "Something went wrong. Let's start over — what's your name?",
          state: "ask_name",
          context: {},
        };
    }

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Onboarding chat error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Internal error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

async function provisionCompany(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  context: OnboardingContext
): Promise<ChatResponse> {
  const MOLTBOT_API_URL = Deno.env.get("MOLTBOT_API_URL")!;
  const MOLTBOT_API_KEY = Deno.env.get("MOLTBOT_API_KEY")!;

  // Service role client bypasses RLS — insert company directly
  const { data: newCompany, error: cError } = await supabase
    .from("companies")
    .insert({ name: context.company || "My Company" })
    .select("id")
    .single();

  if (cError) {
    console.error("Failed to create company:", cError);
    return {
      reply: "Sorry, something went wrong creating your company. Please try again.",
      state: "ask_name" as OnboardingState,
      context: {},
    };
  }

  const newCompanyId = newCompany.id;

  // 2. Add user as owner
  await supabase.from("company_members").insert({
    company_id: newCompanyId,
    user_id: userId,
    role: "owner",
  });

  // 3. Insert company context
  await supabase.from("company_context").insert({
    company_id: newCompanyId,
    set_by: userId,
    stage: "early",
    is_grounded: true,
  });

  // 4. Insert grounding data
  const products = context.extracted?.products || [];
  const techStack = context.extracted?.tech_stack || [];

  await supabase.from("company_grounding").insert({
    company_id: newCompanyId,
    products: products,
    entities: [],
    not_yet_exists: [],
    aspirations: context.goal
      ? [{ goal: context.goal, timeframe: "3 months" }]
      : [],
    constraints: [],
    intended_customer:
      context.extracted?.target_customer || context.customer || null,
    technical_context: { techStack, databaseTables: [], apiEndpoints: [], externalServices: [] },
    status: "confirmed",
    confirmed_at: new Date().toISOString(),
    confirmed_by: userId,
    current_state_summary: {
      knownFacts: [
        `Company: ${context.company}`,
        ...(context.extracted?.description
          ? [`Description: ${context.extracted.description}`]
          : context.description
            ? [`Description: ${context.description}`]
            : []),
        ...(context.extracted?.target_customer || context.customer
          ? [
              `Target Customer: ${context.extracted?.target_customer || context.customer}`,
            ]
          : []),
        ...(products.length
          ? [`Products: ${products.map((p: { name: string }) => p.name).join(", ")}`]
          : []),
        ...(techStack.length ? [`Tech Stack: ${techStack.join(", ")}`] : []),
      ],
      assumptions: [],
      openQuestions: [],
    },
  });

  // 5. Create default roles (startup template)
  const defaultRoles = [
    {
      name: "CEO",
      mandate:
        "Set vision, strategy, and make final calls on company direction.",
      system_prompt: `You are the CEO. You operate autonomously, setting strategic direction and making high-stakes decisions. All proposals require human approval via the Workflow Control Plane.`,
      authority_level: "executive",
      memory_scope: "company",
    },
    {
      name: "Chief of Staff",
      mandate:
        "Orchestrate operations, synthesize information across roles, and ensure execution.",
      system_prompt: `You are the Chief of Staff. You operate autonomously, synthesizing information across roles, surfacing blockers, and maintaining execution rhythm. All actions require human approval.`,
      authority_level: "orchestrator",
      memory_scope: "company",
    },
    {
      name: "Product",
      mandate:
        "Define product strategy, prioritize features, and represent the user.",
      system_prompt: `You are the Head of Product. You operate autonomously, prioritizing features and translating user needs into clear requirements. All proposals require human approval.`,
      authority_level: "advisor",
      memory_scope: "role",
    },
  ];

  const { data: createdRoles, error: rolesError } = await supabase
    .from("roles")
    .insert(
      defaultRoles.map((r) => ({
        company_id: newCompanyId,
        created_by: userId,
        name: r.name,
        mandate: r.mandate,
        system_prompt: r.system_prompt,
        authority_level: r.authority_level,
        memory_scope: r.memory_scope,
        is_activated: false,
      }))
    )
    .select("id, name, mandate");

  if (rolesError) {
    console.error("Failed to create roles:", rolesError);
  }

  // 6. Call Moltbot provision (fire and forget)
  try {
    // Get owner profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("id", userId)
      .single();

    await fetch(`${MOLTBOT_API_URL}/provision`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${MOLTBOT_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        company_id: newCompanyId,
        company_name: context.company,
        grounding: {
          products: products,
          entities: [],
          intendedCustomer:
            context.extracted?.target_customer || context.customer,
          constraints: [],
        },
        roles:
          createdRoles?.map((r) => ({
            id: r.id,
            name: r.name,
            mandate: r.mandate,
          })) || [],
        owner: {
          name: profile?.display_name || context.name || "Founder",
        },
      }),
    });
    console.log("Moltbot provisioned successfully");
  } catch (e) {
    console.error("Moltbot provision failed:", e);
  }

  const roleNames =
    createdRoles?.map((r) => `✅ **${r.name}** — ${r.mandate}`).join("\n") ||
    "✅ CEO\n✅ Chief of Staff\n✅ Product";

  return {
    reply:
      `🎉 **${context.company}** is set up!\n\n` +
      `Your AI executive team:\n\n${roleNames}\n\n` +
      `Click **Get Started** to go to your dashboard and start working with your team.`,
    state: "done",
    context: { ...context, company_id: newCompanyId },
    done: true,
    company_id: newCompanyId,
  };
}
