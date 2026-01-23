import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createHmac } from "https://deno.land/std@0.177.0/node/crypto.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface WebhookPayload {
  event: string;
  timestamp: string;
  data: {
    action_id: string;
    task_id: string;
    task_title: string;
    role_name: string;
    output_summary: string;
    company_id: string;
    notes?: string;
  };
  signature?: string;
}

interface Webhook {
  id: string;
  url: string;
  secret: string | null;
  headers: Record<string, string>;
  name: string;
}

// deno-lint-ignore no-explicit-any
type SupabaseClientType = ReturnType<typeof createClient<any>>;

async function deliverWebhook(
  supabase: SupabaseClientType,
  webhook: Webhook,
  payload: WebhookPayload,
  outputActionId: string | null,
  companyId: string
): Promise<void> {
  const deliveryId = crypto.randomUUID();
  
  // Sign payload if secret is configured
  const signedPayload = { ...payload };
  if (webhook.secret) {
    const hmac = createHmac("sha256", webhook.secret);
    hmac.update(JSON.stringify(payload.data));
    signedPayload.signature = hmac.digest("hex");
  }

  // Create delivery record
  await supabase.from("webhook_deliveries").insert({
    id: deliveryId,
    webhook_id: webhook.id,
    output_action_id: outputActionId,
    company_id: companyId,
    payload: signedPayload as unknown as Record<string, unknown>,
  });

  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "X-Axis-Event": payload.event,
      "X-Axis-Delivery": deliveryId,
      ...(webhook.headers || {}),
    };

    if (signedPayload.signature) {
      headers["X-Axis-Signature"] = `sha256=${signedPayload.signature}`;
    }

    const response = await fetch(webhook.url, {
      method: "POST",
      headers,
      body: JSON.stringify(signedPayload),
    });

    const responseBody = await response.text();

    // Update delivery record with response
    await supabase
      .from("webhook_deliveries")
      .update({
        response_status: response.status,
        response_body: responseBody.substring(0, 1000),
        delivered_at: new Date().toISOString(),
        error_message: response.ok ? null : `HTTP ${response.status}`,
      })
      .eq("id", deliveryId);

    console.log(`Webhook delivered to ${webhook.name}: ${response.status}`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    
    // Update delivery record with error
    await supabase
      .from("webhook_deliveries")
      .update({
        error_message: errorMessage,
        retry_count: 1,
      })
      .eq("id", deliveryId);

    console.error(`Webhook delivery failed for ${webhook.name}:`, errorMessage);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { output_action_id, company_id, action_data, test_webhook_id } = await req.json();

    // If this is a test delivery, only send to the specified webhook
    if (test_webhook_id) {
      const { data: webhook, error: webhookError } = await supabase
        .from("company_webhooks")
        .select("*")
        .eq("id", test_webhook_id)
        .single();

      if (webhookError || !webhook) {
        return new Response(
          JSON.stringify({ error: "Webhook not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const testPayload: WebhookPayload = {
        event: "test",
        timestamp: new Date().toISOString(),
        data: {
          action_id: "test-action-id",
          task_id: "test-task-id",
          task_title: "Test Webhook Delivery",
          role_name: "Test Role",
          output_summary: "This is a test payload from Axis to verify webhook connectivity.",
          company_id: company_id,
        },
      };

      await deliverWebhook(supabase, webhook, testPayload, output_action_id || null, company_id);

      return new Response(
        JSON.stringify({ success: true, message: "Test webhook sent" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Normal flow: fetch output action details
    const { data: outputAction, error: actionError } = await supabase
      .from("output_actions")
      .select(`
        *,
        task:tasks(
          id,
          title,
          description,
          role:roles(id, name, display_name)
        )
      `)
      .eq("id", output_action_id)
      .single();

    if (actionError || !outputAction) {
      console.error("Output action not found:", actionError);
      return new Response(
        JSON.stringify({ error: "Output action not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch active webhooks for this company that listen to mark_external events
    const { data: webhooks, error: webhooksError } = await supabase
      .from("company_webhooks")
      .select("*")
      .eq("company_id", company_id)
      .eq("is_active", true)
      .contains("event_types", ["mark_external"]);

    if (webhooksError) {
      console.error("Error fetching webhooks:", webhooksError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch webhooks" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!webhooks || webhooks.length === 0) {
      console.log("No active webhooks configured for company:", company_id);
      return new Response(
        JSON.stringify({ message: "No webhooks configured" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build the payload
    const payload: WebhookPayload = {
      event: "external_action_created",
      timestamp: new Date().toISOString(),
      data: {
        action_id: output_action_id,
        task_id: outputAction.task?.id || action_data?.task_id,
        task_title: outputAction.task?.title || action_data?.task_title || "Unknown Task",
        role_name: outputAction.task?.role?.display_name || outputAction.task?.role?.name || action_data?.role_name || "Unknown Role",
        output_summary: action_data?.output_summary || outputAction.notes || "",
        company_id: company_id,
        notes: outputAction.notes,
      },
    };

    // Send to all active webhooks
    const deliveryPromises = webhooks.map((webhook) =>
      deliverWebhook(supabase, webhook, payload, output_action_id, company_id)
    );

    await Promise.all(deliveryPromises);

    return new Response(
      JSON.stringify({ 
        success: true, 
        webhooks_triggered: webhooks.length 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Webhook dispatcher error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
