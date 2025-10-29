import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { screenshot_url, game_name, wager_id } = await req.json();
    
    if (!screenshot_url || !game_name || !wager_id) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Create prompt for AI verification
    const prompt = `You are analyzing a mobile game screenshot to verify match results for a betting system.

Game Name: ${game_name}

Please analyze this screenshot and extract the following information:
1. Player names/usernames visible in the screenshot
2. Final score or result (e.g., "10-5", "Win/Loss", etc.)
3. Confidence level (high/medium/low) - how clear is the result?
4. Any relevant match details (game mode, time, etc.)

CRITICAL: Look for:
- Score displays (usually large numbers separated by "-" or ":")
- Player names/tags
- "Victory", "Defeat", "Win", "Loss" text
- Final result screens
- Match summary information

Respond ONLY with a valid JSON object in this exact format:
{
  "players_detected": ["player1", "player2"],
  "score": "X-Y or Win/Loss",
  "confidence": "high/medium/low",
  "details": "brief description of what you see",
  "is_valid_proof": true/false,
  "reason": "why this is or isn't valid proof"
}`;

    // Call Lovable AI with vision capabilities
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              { type: "image_url", image_url: { url: screenshot_url } }
            ]
          }
        ],
        max_tokens: 500
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "AI verification failed", details: errorText }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const aiResponse = data.choices?.[0]?.message?.content;

    if (!aiResponse) {
      throw new Error("No response from AI");
    }

    // Parse AI response - extract JSON from potential markdown code blocks
    let verificationResult;
    try {
      // Remove markdown code blocks if present
      const cleanedResponse = aiResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      verificationResult = JSON.parse(cleanedResponse);
    } catch (parseError) {
      console.error("Failed to parse AI response:", aiResponse);
      verificationResult = {
        players_detected: [],
        score: "Unable to parse",
        confidence: "low",
        details: aiResponse.substring(0, 500),
        is_valid_proof: false,
        reason: "AI response could not be parsed as JSON"
      };
    }

    // Update the wager proof with AI verification result
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const newStatus = verificationResult.is_valid_proof ? 'ai_verified' : 'ai_failed';
    
    const { error: updateError } = await supabase
      .from('wager_proofs')
      .update({
        ai_verification_result: verificationResult,
        status: newStatus,
        verified_at: new Date().toISOString()
      })
      .eq('wager_id', wager_id);

    if (updateError) {
      console.error("Failed to update proof:", updateError);
      throw updateError;
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        verification: verificationResult,
        status: newStatus
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error("Error in verify-wager-screenshot:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});