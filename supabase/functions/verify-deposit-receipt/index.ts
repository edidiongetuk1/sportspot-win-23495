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
    const { receipt_url, amount, receipt_id } = await req.json();
    
    if (!receipt_url || !amount || !receipt_id) {
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
    const prompt = `You are analyzing a bank transfer receipt to verify a deposit for a betting platform.

Amount Claimed: ₦${amount}
Bank Account: 9128477187 (Opay Bank)

Please analyze this receipt and extract the following information:
1. Transfer amount (look for amount sent/transferred)
2. Recipient account number (should match 9128477187)
3. Bank name (should be Opay or similar)
4. Transaction date and time
5. Transaction reference/ID
6. Sender details (if visible)

CRITICAL: Verify that:
- The amount matches or is close to ₦${amount}
- The recipient account is 9128477187
- The receipt looks authentic (not edited/fake)
- The transaction appears completed/successful

Respond ONLY with a valid JSON object in this exact format:
{
  "amount_detected": "detected amount as number",
  "account_number": "recipient account detected",
  "bank_name": "bank name detected",
  "transaction_ref": "reference number if visible",
  "transaction_date": "date/time if visible",
  "is_valid_receipt": true/false,
  "confidence": "high/medium/low",
  "reason": "explanation of verification result",
  "details": "additional observations"
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
              { type: "image_url", image_url: { url: receipt_url } }
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

    // Parse AI response
    let verificationResult;
    try {
      const cleanedResponse = aiResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      verificationResult = JSON.parse(cleanedResponse);
    } catch (parseError) {
      console.error("Failed to parse AI response:", aiResponse);
      verificationResult = {
        amount_detected: 0,
        account_number: "unknown",
        bank_name: "unknown",
        transaction_ref: "unknown",
        is_valid_receipt: false,
        confidence: "low",
        reason: "AI response could not be parsed as JSON",
        details: aiResponse.substring(0, 500)
      };
    }

    // Update the deposit receipt with AI verification result
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const newStatus = verificationResult.is_valid_receipt ? 'ai_verified' : 'ai_failed';
    
    const { error: updateError } = await supabase
      .from('deposit_receipts')
      .update({
        ai_verification_result: verificationResult,
        status: newStatus,
        verified_at: new Date().toISOString()
      })
      .eq('id', receipt_id);

    if (updateError) {
      console.error("Failed to update receipt:", updateError);
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
    console.error("Error in verify-deposit-receipt:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
