import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { User } from "@supabase/supabase-js";
import { format } from "date-fns";

interface Match {
  id: string;
  team1: string;
  team2: string;
  competition: string;
  match_date: string;
  odds_team1_win: number;
  odds_draw: number;
  odds_team2_win: number;
  team1_score: number | null;
  team2_score: number | null;
  status: string;
  result: string | null;
}

export default function AdminDashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Form states
  const [team1, setTeam1] = useState("");
  const [team2, setTeam2] = useState("");
  const [competition, setCompetition] = useState("");
  const [matchDate, setMatchDate] = useState("");
  const [oddsTeam1, setOddsTeam1] = useState("");
  const [oddsDraw, setOddsDraw] = useState("");
  const [oddsTeam2, setOddsTeam2] = useState("");

  useEffect(() => {
    checkAdminAccess();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      if (!session) {
        navigate("/auth");
      }
    });
    return () => subscription.unsubscribe();
  }, [navigate]);

  const checkAdminAccess = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      navigate("/auth");
      return;
    }

    setUser(session.user);

    // Check if user has admin role
    const { data: roleData, error } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", session.user.id)
      .eq("role", "admin")
      .single();

    if (error || !roleData) {
      toast({
        title: "Access Denied",
        description: "You don't have admin privileges",
        variant: "destructive",
      });
      navigate("/");
      return;
    }

    setIsAdmin(true);
    fetchMatches();
    setLoading(false);
  };

  const fetchMatches = async () => {
    const { data, error } = await supabase
      .from("matches")
      .select("*")
      .order("match_date", { ascending: true });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to fetch matches",
        variant: "destructive",
      });
    } else {
      setMatches(data || []);
    }
  };

  const handleAddMatch = async (e: React.FormEvent) => {
    e.preventDefault();

    const { error } = await supabase.from("matches").insert({
      team1,
      team2,
      competition,
      match_date: matchDate,
      odds_team1_win: parseFloat(oddsTeam1),
      odds_draw: parseFloat(oddsDraw),
      odds_team2_win: parseFloat(oddsTeam2),
      status: "upcoming",
    });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to add match",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Match added successfully",
      });
      // Reset form
      setTeam1("");
      setTeam2("");
      setCompetition("");
      setMatchDate("");
      setOddsTeam1("");
      setOddsDraw("");
      setOddsTeam2("");
      fetchMatches();
    }
  };

  const handleEnterResult = async (matchId: string, team1Score: number, team2Score: number) => {
    let result = "draw";
    if (team1Score > team2Score) result = "team1_win";
    if (team2Score > team1Score) result = "team2_win";

    const { error } = await supabase
      .from("matches")
      .update({
        team1_score: team1Score,
        team2_score: team2Score,
        result,
        status: "completed",
      })
      .eq("id", matchId);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to update match result",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Match result updated successfully",
      });
      await processMatchBets(matchId, result);
      fetchMatches();
    }
  };

  const processMatchBets = async (matchId: string, result: string) => {
    // Fetch all bets for this match
    const { data: bets, error: betsError } = await supabase
      .from("bets")
      .select("*")
      .eq("match_id", matchId)
      .eq("status", "pending");

    if (betsError || !bets) return;

    // Process each bet
    for (const bet of bets) {
      const won = bet.selection === result;
      
      if (won) {
        // Update user balance
        const { data: profile } = await supabase
          .from("profiles")
          .select("balance")
          .eq("id", bet.user_id)
          .single();

        if (profile) {
          await supabase
            .from("profiles")
            .update({ balance: profile.balance + bet.potential_win })
            .eq("id", bet.user_id);
        }

        // Update bet status
        await supabase
          .from("bets")
          .update({ status: "won", result: "won" })
          .eq("id", bet.id);
      } else {
        await supabase
          .from("bets")
          .update({ status: "lost", result: "lost" })
          .eq("id", bet.id);
      }
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="flex items-center justify-center h-screen">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar 
        balance={0} 
        isAuthenticated={true}
        onLogout={handleLogout}
        isAdmin={isAdmin}
      />
      
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Admin Dashboard</h1>
          <p className="text-muted-foreground">Manage matches and results</p>
        </div>

        {/* Add Match Form */}
        <Card className="p-6 mb-8">
          <h2 className="text-2xl font-bold mb-4">Add New Match</h2>
          <form onSubmit={handleAddMatch} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="team1">Team 1</Label>
                <Input
                  id="team1"
                  value={team1}
                  onChange={(e) => setTeam1(e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="team2">Team 2</Label>
                <Input
                  id="team2"
                  value={team2}
                  onChange={(e) => setTeam2(e.target.value)}
                  required
                />
              </div>
            </div>
            <div>
              <Label htmlFor="competition">Competition</Label>
              <Input
                id="competition"
                value={competition}
                onChange={(e) => setCompetition(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="matchDate">Match Date & Time</Label>
              <Input
                id="matchDate"
                type="datetime-local"
                value={matchDate}
                onChange={(e) => setMatchDate(e.target.value)}
                required
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="oddsTeam1">Team 1 Win Odds</Label>
                <Input
                  id="oddsTeam1"
                  type="number"
                  step="0.01"
                  value={oddsTeam1}
                  onChange={(e) => setOddsTeam1(e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="oddsDraw">Draw Odds</Label>
                <Input
                  id="oddsDraw"
                  type="number"
                  step="0.01"
                  value={oddsDraw}
                  onChange={(e) => setOddsDraw(e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="oddsTeam2">Team 2 Win Odds</Label>
                <Input
                  id="oddsTeam2"
                  type="number"
                  step="0.01"
                  value={oddsTeam2}
                  onChange={(e) => setOddsTeam2(e.target.value)}
                  required
                />
              </div>
            </div>
            <Button type="submit" className="w-full">Add Match</Button>
          </form>
        </Card>

        {/* Matches List */}
        <div>
          <h2 className="text-2xl font-bold mb-4">All Matches</h2>
          {matches.length === 0 ? (
            <Card className="p-8 text-center">
              <p className="text-muted-foreground">No matches added yet</p>
            </Card>
          ) : (
            <div className="space-y-4">
              {matches.map((match) => (
                <Card key={match.id} className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-xl font-bold">
                        {match.team1} vs {match.team2}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {match.competition} • {format(new Date(match.match_date), "MMM d, yyyy HH:mm")}
                      </p>
                    </div>
                    <div className={`px-3 py-1 rounded-full text-sm ${
                      match.status === 'completed' ? 'bg-green-500/20 text-green-500' : 'bg-blue-500/20 text-blue-500'
                    }`}>
                      {match.status}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div>
                      <p className="text-sm text-muted-foreground">{match.team1} Win</p>
                      <p className="font-bold text-accent">{match.odds_team1_win}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Draw</p>
                      <p className="font-bold text-accent">{match.odds_draw}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">{match.team2} Win</p>
                      <p className="font-bold text-accent">{match.odds_team2_win}</p>
                    </div>
                  </div>

                  {match.status === "upcoming" && (
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        placeholder={`${match.team1} score`}
                        id={`team1-score-${match.id}`}
                        className="w-24"
                      />
                      <Input
                        type="number"
                        placeholder={`${match.team2} score`}
                        id={`team2-score-${match.id}`}
                        className="w-24"
                      />
                      <Button
                        onClick={() => {
                          const team1Score = parseInt(
                            (document.getElementById(`team1-score-${match.id}`) as HTMLInputElement).value
                          );
                          const team2Score = parseInt(
                            (document.getElementById(`team2-score-${match.id}`) as HTMLInputElement).value
                          );
                          handleEnterResult(match.id, team1Score, team2Score);
                        }}
                      >
                        Enter Result
                      </Button>
                    </div>
                  )}

                  {match.status === "completed" && (
                    <div className="bg-muted p-3 rounded-lg">
                      <p className="font-bold">
                        Final Score: {match.team1} {match.team1_score} - {match.team2_score} {match.team2}
                      </p>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
