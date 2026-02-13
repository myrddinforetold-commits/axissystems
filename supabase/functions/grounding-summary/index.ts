import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface GroundingData {
  products: Array<{ name: string; description: string }>;
  entities: Array<{ name: string; type: string }>;
  notYetExists: Array<{ name: string; description: string }>;
  aspirations: Array<{ goal: string; timeframe?: string }>;
  intendedCustomer: string;
  constraints: Array<{ type: string; description: string }>;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { company_id, company_stage, grounding_data } = await req.json();

    if (!company_id || !grounding_data) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const data = grounding_data as GroundingData;

    const MOLTBOT_API_URL = Deno.env.get("MOLTBOT_API_URL");
    const MOLTBOT_API_KEY = Deno.env.get("MOLTBOT_API_KEY");

    if (!MOLTBOT_API_URL || !MOLTBOT_API_KEY) {
      return new Response(JSON.stringify({ error: "Moltbot API not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build the analysis prompt
    const prompt = buildAnalysisPrompt(data, company_stage);

    // Call Moltbot API
    const aiResponse = await fetch(
      `${MOLTBOT_API_URL}/chat`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${MOLTBOT_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          company_id: company_id,
          role_id: "grounding-analyst",
          message: prompt,
          messages: [
            {
              role: "system",
              content: `You are an analyst that summarizes company grounding data into three clear categories.
Your output must be valid JSON with exactly this structure:
{
  "knownFacts": ["fact1", "fact2", ...],
  "assumptions": ["assumption1", "assumption2", ...],
  "openQuestions": ["question1", "question2", ...]
}

Guidelines:
- KNOWN FACTS: Only include things explicitly stated by the user. Be specific.
- ASSUMPTIONS: Reasonable inferences based on stage and context. Label these as assumptions.
- OPEN QUESTIONS: Important information that wasn't provided but would help the team. Phrase as questions.

Keep each item concise (1-2 sentences max). Aim for 3-8 items per category.
Return ONLY the JSON, no markdown or explanation.`,
            },
            {
              role: "user",
              content: prompt,
            },
          ],
          temperature: 0.3,
          max_tokens: 1500,
        }),
      }
    );

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI gateway error:", errorText);
      throw new Error("Failed to generate summary from AI");
    }

    const aiResult = await aiResponse.json();
    const content = aiResult.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No content in AI response");
    }

    // Parse the JSON response
    let summary;
    try {
      // Clean up potential markdown code blocks
      const cleanedContent = content
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .trim();
      summary = JSON.parse(cleanedContent);
    } catch (parseError) {
      console.error("Failed to parse AI response:", content);
      // Fallback to basic summary
      summary = generateFallbackSummary(data, company_stage);
    }

    // Validate structure
    if (!Array.isArray(summary.knownFacts)) summary.knownFacts = [];
    if (!Array.isArray(summary.assumptions)) summary.assumptions = [];
    if (!Array.isArray(summary.openQuestions)) summary.openQuestions = [];

    return new Response(JSON.stringify({ summary }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Error in grounding-summary:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function buildAnalysisPrompt(data: GroundingData, stage: string): string {
  let prompt = `Analyze this company grounding data and generate a summary:\n\n`;

  prompt += `COMPANY STAGE: ${stage || "not specified"}\n\n`;

  if (data.products.length > 0) {
    prompt += `EXISTING PRODUCTS/SERVICES:\n`;
    data.products.forEach((p) => {
      prompt += `- ${p.name}${p.description ? `: ${p.description}` : ""}\n`;
    });
    prompt += "\n";
  } else {
    prompt += `EXISTING PRODUCTS/SERVICES: None listed\n\n`;
  }

  if (data.entities.length > 0) {
    prompt += `EXISTING ENTITIES (companies, teams, assets):\n`;
    data.entities.forEach((e) => {
      prompt += `- ${e.name} (${e.type})\n`;
    });
    prompt += "\n";
  }

  if (data.notYetExists.length > 0) {
    prompt += `PLANNED BUT NOT YET BUILT:\n`;
    data.notYetExists.forEach((item) => {
      prompt += `- ${item.name}${item.description ? `: ${item.description}` : ""}\n`;
    });
    prompt += "\n";
  }

  if (data.aspirations.length > 0) {
    prompt += `ASPIRATIONS/GOALS:\n`;
    data.aspirations.forEach((a) => {
      prompt += `- ${a.goal}${a.timeframe ? ` (${a.timeframe})` : ""}\n`;
    });
    prompt += "\n";
  }

  if (data.intendedCustomer) {
    prompt += `TARGET CUSTOMER:\n${data.intendedCustomer}\n\n`;
  } else {
    prompt += `TARGET CUSTOMER: Not specified\n\n`;
  }

  if (data.constraints.length > 0) {
    prompt += `CONSTRAINTS:\n`;
    data.constraints.forEach((c) => {
      prompt += `- [${c.type}] ${c.description}\n`;
    });
    prompt += "\n";
  }

  return prompt;
}

function generateFallbackSummary(
  data: GroundingData,
  stage: string
): { knownFacts: string[]; assumptions: string[]; openQuestions: string[] } {
  const knownFacts: string[] = [];
  const assumptions: string[] = [];
  const openQuestions: string[] = [];

  // Extract known facts
  if (data.products.length > 0) {
    data.products.forEach((p) => {
      knownFacts.push(`Has product/service: ${p.name}`);
    });
  }

  if (data.entities.length > 0) {
    data.entities.forEach((e) => {
      knownFacts.push(`Has ${e.type}: ${e.name}`);
    });
  }

  if (data.intendedCustomer) {
    knownFacts.push(`Target customer: ${data.intendedCustomer}`);
  }

  if (data.constraints.length > 0) {
    data.constraints.forEach((c) => {
      knownFacts.push(`${c.type} constraint: ${c.description}`);
    });
  }

  // Add assumptions based on stage
  if (stage === "early") {
    assumptions.push("Company is in early/startup phase with limited resources");
    assumptions.push("Likely focused on product-market fit and initial traction");
  } else if (stage === "growing") {
    assumptions.push("Company has validated product-market fit");
    assumptions.push("Focused on scaling operations and team");
  } else if (stage === "established") {
    assumptions.push("Company has stable revenue and operations");
    assumptions.push("Focused on optimization and expansion");
  }

  // Identify open questions
  if (data.products.length === 0) {
    openQuestions.push("What products or services does the company offer?");
  }

  if (!data.intendedCustomer) {
    openQuestions.push("Who is the target customer?");
  }

  if (data.constraints.length === 0) {
    openQuestions.push("Are there any constraints the team should be aware of?");
  }

  if (data.aspirations.length === 0) {
    openQuestions.push("What are the company's key goals and aspirations?");
  }

  return { knownFacts, assumptions, openQuestions };
}
