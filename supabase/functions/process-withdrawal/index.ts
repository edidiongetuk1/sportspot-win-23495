import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify admin authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error('Invalid authentication');
    }

    // Check if user is admin
    const { data: roleData, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single();

    if (roleError || !roleData) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized - Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { withdrawalId, action, adminNotes } = await req.json();

    if (!withdrawalId || !action || !['approve', 'reject'].includes(action)) {
      return new Response(
        JSON.stringify({ error: 'Invalid request parameters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch withdrawal details
    console.log('Fetching withdrawal:', withdrawalId);
    const { data: withdrawal, error: withdrawalError } = await supabase
      .from('withdrawals')
      .select('*')
      .eq('id', withdrawalId)
      .eq('status', 'pending')
      .single();

    console.log('Withdrawal fetch result:', { withdrawal, withdrawalError });

    if (withdrawalError || !withdrawal) {
      console.error('Withdrawal not found:', { withdrawalId, withdrawalError });
      return new Response(
        JSON.stringify({ error: 'Withdrawal not found or already processed' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch user profile separately
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('balance, email')
      .eq('id', withdrawal.user_id)
      .single();

    console.log('Profile fetch result:', { profile, profileError });

    if (profileError || !profile) {
      console.error('Profile not found:', { userId: withdrawal.user_id, profileError });
      return new Response(
        JSON.stringify({ error: 'User profile not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Attach profile to withdrawal for backward compatibility
    withdrawal.profiles = profile;

    if (action === 'approve') {
      const currentBalance = Number(withdrawal.profiles.balance);
      const withdrawalAmount = Number(withdrawal.amount);

      if (currentBalance < withdrawalAmount) {
        return new Response(
          JSON.stringify({ error: 'Insufficient balance' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const newBalance = currentBalance - withdrawalAmount;

      // Update withdrawal status
      const { error: updateError } = await supabase
        .from('withdrawals')
        .update({
          status: 'approved',
          approved_by: user.id,
          approved_at: new Date().toISOString(),
          admin_notes: adminNotes || null
        })
        .eq('id', withdrawalId);

      if (updateError) {
        console.error('Failed to update withdrawal:', updateError);
        throw updateError;
      }

      // Update user balance
      const { error: balanceError } = await supabase
        .from('profiles')
        .update({ balance: newBalance })
        .eq('id', withdrawal.user_id);

      if (balanceError) {
        console.error('Failed to update balance:', balanceError);
        throw balanceError;
      }

      // Create audit log
      const { error: auditError } = await supabase
        .from('audit_logs')
        .insert({
          user_id: withdrawal.user_id,
          action_type: 'withdrawal',
          amount: -withdrawalAmount,
          balance_before: currentBalance,
          balance_after: newBalance,
          reference_id: withdrawalId,
          reference_type: 'withdrawal',
          metadata: {
            account_number: withdrawal.account_number,
            bank_name: withdrawal.bank_name,
            approved_by: user.id,
            admin_notes: adminNotes
          }
        });

      if (auditError) {
        console.error('Failed to create audit log:', auditError);
      }

      console.log('Withdrawal approved:', {
        withdrawalId,
        userId: withdrawal.user_id,
        amount: withdrawalAmount,
        newBalance
      });

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Withdrawal approved and processed',
          newBalance 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } else if (action === 'reject') {
      // Update withdrawal status
      const { error: updateError } = await supabase
        .from('withdrawals')
        .update({
          status: 'rejected',
          approved_by: user.id,
          approved_at: new Date().toISOString(),
          admin_notes: adminNotes || null
        })
        .eq('id', withdrawalId);

      if (updateError) {
        console.error('Failed to update withdrawal:', updateError);
        throw updateError;
      }

      console.log('Withdrawal rejected:', {
        withdrawalId,
        userId: withdrawal.user_id,
        adminNotes
      });

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Withdrawal rejected' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Withdrawal processing error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});