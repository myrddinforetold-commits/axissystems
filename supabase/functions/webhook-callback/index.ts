import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-webhook-secret",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { action_id, status, notes, api_key } = await req.json();

    if (!action_id) {
      return new Response(
        JSON.stringify({ error: "action_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch the output action to get the company_id
    const { data: action, error: actionError } = await supabase
      .from("output_actions")
      .select("id, company_id, status")
      .eq("id", action_id)
      .single();

    if (actionError || !action) {
      return new Response(
        JSON.stringify({ error: "Output action not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify the API key matches one of the company's webhook secrets
    if (api_key) {
      const { data: webhooks } = await supabase
        .from("company_webhooks")
        .select("secret")
        .eq("company_id", action.company_id)
        .eq("is_active", true);

      const validSecret = webhooks?.some((w) => w.secret === api_key);
      if (!validSecret) {
        return new Response(
          JSON.stringify({ error: "Invalid API key" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Validate status
    const validStatuses = ["pending", "completed", "failed"];
    const newStatus = status || "completed";
    if (!validStatuses.includes(newStatus)) {
      return new Response(
        JSON.stringify({ error: `Invalid status. Must be one of: ${validStatuses.join(", ")}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update the output action
    const updateData: Record<string, unknown> = {
      status: newStatus,
    };

    if (notes) {
      updateData.notes = notes;
    }

    if (newStatus === "completed") {
      updateData.completed_at = new Date().toISOString();
    }

    const { error: updateError } = await supabase
      .from("output_actions")
      .update(updateData)
      .eq("id", action_id);

    if (updateError) {
      console.error("Failed to update output action:", updateError);
      return new Response(
        JSON.stringify({ error: "Failed to update action" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Output action ${action_id} updated to status: ${newStatus}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        action_id,
        status: newStatus,
        message: `Action status updated to ${newStatus}` 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Webhook callback error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
