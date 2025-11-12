import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { reference } = await req.json();
    
    if (!reference) {
      return new Response(
        JSON.stringify({ error: 'Payment reference is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const paystackSecret = Deno.env.get('PAYSTACK_SECRET_KEY');
    if (!paystackSecret) {
      console.error('PAYSTACK_SECRET_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'Payment verification not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify transaction with Paystack API
    console.log('Verifying payment with reference:', reference);
    const verifyResponse = await fetch(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        headers: {
          'Authorization': `Bearer ${paystackSecret}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const verifyData = await verifyResponse.json();
    console.log('Paystack verification response:', verifyData);

    if (!verifyData.status || verifyData.data.status !== 'success') {
      return new Response(
        JSON.stringify({ 
          error: 'Payment verification failed',
          details: verifyData.message 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user by email
    const customerEmail = verifyData.data.customer.email;
    const { data: { users }, error: userError } = await supabase.auth.admin.listUsers();
    
    if (userError) {
      console.error('Error fetching users:', userError);
      throw userError;
    }

    const user = users.find(u => u.email === customerEmail);
    
    if (!user) {
      console.error('User not found for email:', customerEmail);
      return new Response(
        JSON.stringify({ error: 'User not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user's profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, balance')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      console.error('Profile not found for user:', user.id);
      return new Response(
        JSON.stringify({ error: 'Profile not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if this transaction was already processed
    const { data: existingLog } = await supabase
      .from('audit_logs')
      .select('id')
      .eq('metadata->>payment_reference', reference)
      .single();

    if (existingLog) {
      console.log('Transaction already processed:', reference);
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Transaction already processed',
          balance: profile.balance 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update balance
    const depositAmount = verifyData.data.amount / 100; // Convert from kobo to naira
    const oldBalance = Number(profile.balance);
    const newBalance = oldBalance + depositAmount;

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ balance: newBalance })
      .eq('id', profile.id);

    if (updateError) {
      console.error('Failed to update balance:', updateError);
      throw updateError;
    }

    // Create audit log
    const { error: auditError } = await supabase
      .from('audit_logs')
      .insert({
        user_id: profile.id,
        action_type: 'deposit',
        amount: depositAmount,
        balance_before: oldBalance,
        balance_after: newBalance,
        reference_type: 'deposit',
        metadata: {
          payment_reference: reference,
          customer_email: customerEmail,
          verified_at: new Date().toISOString()
        }
      });

    if (auditError) {
      console.error('Failed to create audit log:', auditError);
    }

    console.log('Deposit processed successfully:', {
      userId: profile.id,
      oldBalance,
      depositAmount,
      newBalance
    });

    return new Response(
      JSON.stringify({ 
        success: true,
        amount: depositAmount,
        newBalance,
        message: 'Deposit processed successfully'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Payment verification error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
