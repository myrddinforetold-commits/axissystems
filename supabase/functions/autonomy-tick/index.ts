import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const AUTO_APPROVE_TYPES = [
  "send_memo",
  "start_task",
  "suggest_next_task",
  "continue_task",
] as const;

function isLegacyServiceRoleJwt(token: string): boolean {
  try {
    const segments = token.split(".");
    if (segments.length !== 3) return false;
    const payloadBase64 = segments[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = payloadBase64.padEnd(payloadBase64.length + ((4 - (payloadBase64.length % 4)) % 4), "=");
    const payload = JSON.parse(atob(padded));
    return payload?.role === "service_role";
  } catch {
    return false;
  }
}

interface TickBody {
  company_id?: string;
  max_companies?: number;
  max_roles_per_company?: number;
  max_auto_approvals_per_company?: number;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ error: "Supabase environment not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const isServiceRole = token === supabaseServiceKey || isLegacyServiceRoleJwt(token);
    if (!isServiceRole) {
      return new Response(
        JSON.stringify({ error: "Service role authorization required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let body: TickBody = {};
    try {
      body = await req.json();
    } catch {
      // Optional body
    }

    const maxCompanies = Math.max(1, Math.min(100, body.max_companies ?? 12));
    const maxRolesPerCompany = Math.max(1, Math.min(30, body.max_roles_per_company ?? 8));
    const maxAutoApprovalsPerCompany = Math.max(1, Math.min(100, body.max_auto_approvals_per_company ?? 30));

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    let companies: Array<{ id: string }> = [];
    if (body.company_id) {
      companies = [{ id: body.company_id }];
    } else {
      const { data: companiesData, error: companiesError } = await supabase
        .from("companies")
        .select("id")
        .order("created_at", { ascending: false })
        .limit(maxCompanies);

      if (companiesError) {
        return new Response(
          JSON.stringify({ error: "Failed to fetch companies", details: companiesError.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      companies = companiesData || [];
    }

    let rolesTriggered = 0;
    let approvalsAttempted = 0;
    let approvalsSucceeded = 0;
    const errors: string[] = [];

    const companyJobs = companies.map(async (company) => {
      // 1) Drive autonomous loop for active roles.
      const { data: roles, error: rolesError } = await supabase
        .from("roles")
        .select("id")
        .eq("company_id", company.id)
        .eq("is_activated", true)
        .order("created_at", { ascending: true })
        .limit(maxRolesPerCompany);

      if (rolesError) {
        errors.push(`roles fetch failed for ${company.id}: ${rolesError.message}`);
        return;
      }

      for (const role of roles || []) {
        const triggerLoop = async () => {
          try {
            const response = await fetch(`${supabaseUrl}/functions/v1/role-autonomous-loop`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${supabaseServiceKey}`,
              },
              body: JSON.stringify({ role_id: role.id }),
            });

            if (!response.ok) {
              const details = await response.text().catch(() => "");
              errors.push(`autonomous loop failed for role ${role.id}: ${details.slice(0, 240)}`);
            }
          } catch (err) {
            const message = err instanceof Error ? err.message : "unknown error";
            errors.push(`autonomous loop exception for role ${role.id}: ${message}`);
          }
        };

        const edgeRuntime = (globalThis as any).EdgeRuntime;
        if (edgeRuntime?.waitUntil) {
          edgeRuntime.waitUntil(triggerLoop());
        } else {
          void triggerLoop();
        }
        rolesTriggered++;
      }

      // 2) Auto-approve internal workflow transitions.
      const { data: pendingRequests, error: pendingError } = await supabase
        .from("workflow_requests")
        .select("id, request_type")
        .eq("company_id", company.id)
        .eq("status", "pending")
        .in("request_type", [...AUTO_APPROVE_TYPES])
        .order("created_at", { ascending: true })
        .limit(maxAutoApprovalsPerCompany);

      if (pendingError) {
        errors.push(`pending workflow fetch failed for ${company.id}: ${pendingError.message}`);
        return;
      }

      for (const wf of pendingRequests || []) {
        approvalsAttempted++;
        try {
          const response = await fetch(`${supabaseUrl}/functions/v1/workflow-approve`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${supabaseServiceKey}`,
            },
            body: JSON.stringify({
              request_id: wf.id,
              action: "approve",
              review_notes: "Auto-approved by internal autonomy policy (memo/task transition).",
            }),
          });

          if (!response.ok) {
            const details = await response.text().catch(() => "");
            errors.push(`auto-approve failed for ${wf.id} (${wf.request_type}): ${details.slice(0, 240)}`);
          } else {
            approvalsSucceeded++;
          }
        } catch (err) {
          errors.push(
            `auto-approve exception for ${wf.id}: ${
              err instanceof Error ? err.message : "unknown error"
            }`
          );
        }
      }
    });

    await Promise.allSettled(companyJobs);

    return new Response(
      JSON.stringify({
        ok: true,
        tick_at: new Date().toISOString(),
        companies_processed: companies.length,
        roles_triggered: rolesTriggered,
        approvals_attempted: approvalsAttempted,
        approvals_succeeded: approvalsSucceeded,
        errors_count: errors.length,
        errors: errors.slice(0, 50),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: "Autonomy tick failed",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
