/**
 * Edge Function: process-match-result
 * 
 * Processes match results by:
 * 1. Updating the match status and result
 * 2. Fetching all pending bets for the match
 * 3. Determining winners and losers
 * 4. Crediting winners' accounts
 * 5. Updating bet statuses
 * 
 * Requires admin authentication.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get auth token from request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify user is admin
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if user has admin role
    const { data: roles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single();

    if (!roles) {
      return new Response(JSON.stringify({ error: 'Admin access required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { matchId, result } = await req.json();

    if (!matchId || !result) {
      return new Response(JSON.stringify({ error: 'matchId and result are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Processing match ${matchId} with result: ${result}`);

    // Fetch match to resolve winning team name
    const { data: match, error: matchFetchError } = await supabase
      .from('matches')
      .select('team1, team2')
      .eq('id', matchId)
      .single();

    if (matchFetchError || !match) {
      console.error('Error fetching match:', matchFetchError);
      return new Response(JSON.stringify({ error: 'Match not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const normalizedResult = String(result).toLowerCase().trim();
    let winningSelection: string;
    if (normalizedResult === 'team1_win' || normalizedResult === 'team1' || normalizedResult === '1') {
      winningSelection = match.team1;
    } else if (normalizedResult === 'team2_win' || normalizedResult === 'team2' || normalizedResult === '2') {
      winningSelection = match.team2;
    } else if (normalizedResult === 'draw' || normalizedResult === 'x') {
      winningSelection = 'Draw';
    } else {
      // Assume the admin passed the actual team name
      winningSelection = String(result);
    }

    console.log(`Winning selection resolved to: "${winningSelection}"`);

    // Update match status and result
    const { error: matchError } = await supabase
      .from('matches')
      .update({ result: normalizedResult, status: 'completed' })
      .eq('id', matchId);

    if (matchError) {
      console.error('Error updating match:', matchError);
      return new Response(JSON.stringify({ error: 'Failed to update match' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get all pending bets for this match
    const { data: bets, error: betsError } = await supabase
      .from('bets')
      .select('id, user_id, selection, stake, potential_win')
      .eq('match_id', matchId)
      .eq('status', 'pending');

    if (betsError) {
      console.error('Error fetching bets:', betsError);
      return new Response(JSON.stringify({ error: 'Failed to fetch bets' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Found ${bets?.length || 0} pending bets to process`);

    let winnersCount = 0;
    let losersCount = 0;
    let totalPayout = 0;

    const normalize = (s: string) => String(s ?? '').trim().toLowerCase();

    // Process each bet
    for (const bet of bets || []) {
      const isWinner = normalize(bet.selection) === normalize(winningSelection);
      const betResult = isWinner ? 'won' : 'lost';
      
      console.log(`Processing bet ${bet.id}: user=${bet.user_id}, selection=${bet.selection}, result=${betResult}`);

      // Update bet status
      const { error: betUpdateError } = await supabase
        .from('bets')
        .update({ status: betResult, result })
        .eq('id', bet.id);

      if (betUpdateError) {
        console.error(`Error updating bet ${bet.id}:`, betUpdateError);
        continue;
      }

      // If winner, credit user balance
      if (isWinner) {
        winnersCount++;
        totalPayout += Number(bet.potential_win);

        // Get current user balance
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('balance')
          .eq('id', bet.user_id)
          .single();

        if (profileError) {
          console.error(`Error fetching profile for user ${bet.user_id}:`, profileError);
          continue;
        }

        const newBalance = Number(profile.balance) + Number(bet.potential_win);

        const { error: balanceError } = await supabase
          .from('profiles')
          .update({ balance: newBalance })
          .eq('id', bet.user_id);

        if (balanceError) {
          console.error(`Error updating balance for user ${bet.user_id}:`, balanceError);
        } else {
          console.log(`Credited ${bet.potential_win} to user ${bet.user_id}. New balance: ${newBalance}`);
        }
      } else {
        losersCount++;
      }
    }

    console.log(`Match processed: ${winnersCount} winners, ${losersCount} losers, total payout: ${totalPayout}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Match result processed successfully',
        stats: {
          totalBets: bets?.length || 0,
          winners: winnersCount,
          losers: losersCount,
          totalPayout,
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Unexpected error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
