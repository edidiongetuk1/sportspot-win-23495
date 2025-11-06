import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { User } from "@supabase/supabase-js";
import { Trophy, Zap } from "lucide-react";

interface InstantVirtualsGameProps {
  user: User | null;
  balance: number;
  onBalanceUpdate: (newBalance: number) => void;
}

const InstantVirtualsGame = ({ user, balance, onBalanceUpdate }: InstantVirtualsGameProps) => {
  const [betAmount, setBetAmount] = useState("");
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);
  const [simulating, setSimulating] = useState(false);
  const [matchResult, setMatchResult] = useState<{ winner: string; score: string } | null>(null);
  const { toast } = useToast();

  const matches = [
    // Premier League
    { id: 1, home: "Man City", away: "Liverpool", league: "Premier League", odds: [2.1, 3.2, 2.8] },
    { id: 2, home: "Arsenal", away: "Chelsea", league: "Premier League", odds: [1.9, 3.4, 3.0] },
    { id: 3, home: "Man United", away: "Tottenham", league: "Premier League", odds: [2.3, 3.1, 2.6] },
    // La Liga
    { id: 4, home: "Real Madrid", away: "Barcelona", league: "La Liga", odds: [2.0, 3.3, 2.9] },
    { id: 5, home: "Atletico", away: "Sevilla", league: "La Liga", odds: [1.8, 3.5, 3.1] },
    { id: 6, home: "Valencia", away: "Villarreal", league: "La Liga", odds: [2.2, 3.0, 2.7] },
    // Serie A
    { id: 7, home: "Inter Milan", away: "AC Milan", league: "Serie A", odds: [2.1, 3.2, 2.8] },
    { id: 8, home: "Juventus", away: "Napoli", league: "Serie A", odds: [1.9, 3.4, 2.9] },
    { id: 9, home: "Roma", away: "Lazio", league: "Serie A", odds: [2.0, 3.1, 2.8] },
    // Bundesliga
    { id: 10, home: "Bayern Munich", away: "Dortmund", league: "Bundesliga", odds: [1.7, 3.6, 3.2] },
    { id: 11, home: "RB Leipzig", away: "Leverkusen", league: "Bundesliga", odds: [2.2, 3.0, 2.7] },
    { id: 12, home: "Frankfurt", away: "Wolfsburg", league: "Bundesliga", odds: [2.1, 3.2, 2.8] },
  ];

  const [currentMatch, setCurrentMatch] = useState(matches[0]);

  const simulateMatch = async (teamChoice: "home" | "away" | "draw") => {
    if (!user) {
      toast({
        title: "Login Required",
        description: "Please login to play",
        variant: "destructive",
      });
      return;
    }

    const amount = parseFloat(betAmount);
    if (isNaN(amount) || amount <= 0 || amount > balance) {
      toast({
        title: "Invalid Bet",
        description: "Please enter a valid bet amount",
        variant: "destructive",
      });
      return;
    }

    setSimulating(true);
    setSelectedTeam(teamChoice);

    // Simulate match with weighted randomness
    const outcomes = ["home", "draw", "away"];
    const weights = [0.35, 0.25, 0.40]; // Slight away advantage
    const rand = Math.random();
    let cumulative = 0;
    let result = "home";

    for (let i = 0; i < outcomes.length; i++) {
      cumulative += weights[i];
      if (rand < cumulative) {
        result = outcomes[i];
        break;
      }
    }

    // Generate realistic score
    const homeScore = Math.floor(Math.random() * 4);
    const awayScore = result === "home" ? Math.floor(Math.random() * homeScore) :
                      result === "away" ? homeScore + Math.floor(Math.random() * 3) + 1 :
                      homeScore;
    
    const score = `${homeScore}-${awayScore}`;
    const winner = result === "draw" ? "Draw" : 
                   result === "home" ? currentMatch.home : currentMatch.away;

    setTimeout(async () => {
      setMatchResult({ winner, score });
      
      const won = result === teamChoice;
      const multiplierIndex = teamChoice === "home" ? 0 : teamChoice === "draw" ? 1 : 2;
      const odds = currentMatch.odds[multiplierIndex];
      const payout = won ? amount * odds : 0;

      const seed = Math.random().toString(36).substring(7);
      await supabase.from("casino_game_rounds").insert({
        game_type: "instant_virtuals",
        outcome_data: { match: currentMatch.home + " vs " + currentMatch.away, result, score },
        multiplier: won ? odds : 0,
        result: won ? "won" : "lost",
        seed,
      });

      const newBalance = balance - amount + payout;
      await supabase
        .from("profiles")
        .update({ balance: newBalance })
        .eq("id", user.id);

      onBalanceUpdate(newBalance);

      if (won) {
        toast({
          title: "Winner!",
          description: `${winner} won ${score}! Won ₦${payout.toFixed(2)}`,
        });
      } else {
        toast({
          title: "Lost",
          description: `${winner} won ${score}`,
          variant: "destructive",
        });
      }

      setTimeout(() => {
        setSimulating(false);
        setSelectedTeam(null);
        setMatchResult(null);
      }, 3000);
    }, 3000);
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-6 bg-card border-border">
          <h3 className="text-xl font-bold mb-4">Place Bet</h3>
          <div className="space-y-4">
            <div>
              <label className="text-sm text-muted-foreground mb-2 block">Bet Amount</label>
              <Input
                type="number"
                placeholder="0.00"
                value={betAmount}
                onChange={(e) => setBetAmount(e.target.value)}
                disabled={simulating}
              />
            </div>
            <div className="pt-4 border-t border-border space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Balance:</span>
                <span className="font-semibold">₦{balance.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </Card>

        {simulating && (
          <Card className="p-6 bg-gradient-to-br from-card to-card/50 border-border">
            <div className="text-center py-12 space-y-4">
              <div className="animate-pulse">
                <Trophy className="w-16 h-16 mx-auto text-primary mb-4" />
                <p className="text-xl font-semibold">Match in progress...</p>
                <p className="text-sm text-muted-foreground mt-2">{currentMatch.league}</p>
                <p className="text-lg font-semibold mt-2">{currentMatch.home} vs {currentMatch.away}</p>
              </div>
              <div className="flex justify-center gap-2">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="w-3 h-3 bg-primary rounded-full animate-bounce" 
                       style={{ animationDelay: `${i * 0.1}s` }} />
                ))}
              </div>
            </div>
          </Card>
        )}

        {matchResult && (
          <Card className="p-6 bg-gradient-to-br from-card to-card/50 border-border">
            <div className="text-center py-12 space-y-4">
              <Trophy className="w-16 h-16 mx-auto text-accent mb-4" />
              <div>
                <p className="text-sm text-muted-foreground mb-2">Final Result</p>
                <p className="text-sm text-muted-foreground">{currentMatch.league}</p>
                <p className="text-2xl font-bold text-primary mt-2">{matchResult.winner}</p>
                <p className="text-xl text-muted-foreground mt-2">{matchResult.score}</p>
              </div>
            </div>
          </Card>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {matches.map((match) => (
          <Card 
            key={match.id} 
            className={`p-4 bg-gradient-to-br from-card to-card/50 border-border transition-all ${
              currentMatch.id === match.id && simulating ? 'ring-2 ring-primary' : ''
            }`}
          >
            <div className="space-y-3">
              <div className="text-center">
                <p className="text-xs text-muted-foreground mb-2">{match.league}</p>
                <div className="flex items-center justify-center gap-2 mb-3">
                  <p className="text-sm font-semibold">{match.home}</p>
                  <span className="text-xs text-muted-foreground">vs</span>
                  <p className="text-sm font-semibold">{match.away}</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <Button
                  onClick={() => {
                    setCurrentMatch(match);
                    simulateMatch("home");
                  }}
                  className="flex flex-col py-4 h-auto text-xs"
                  variant="outline"
                  disabled={simulating}
                  size="sm"
                >
                  <span className="font-semibold mb-1">Home</span>
                  <span className="text-primary">{match.odds[0]}x</span>
                </Button>
                
                <Button
                  onClick={() => {
                    setCurrentMatch(match);
                    simulateMatch("draw");
                  }}
                  className="flex flex-col py-4 h-auto text-xs"
                  variant="outline"
                  disabled={simulating}
                  size="sm"
                >
                  <span className="font-semibold mb-1">Draw</span>
                  <span className="text-primary">{match.odds[1]}x</span>
                </Button>
                
                <Button
                  onClick={() => {
                    setCurrentMatch(match);
                    simulateMatch("away");
                  }}
                  className="flex flex-col py-4 h-auto text-xs"
                  variant="outline"
                  disabled={simulating}
                  size="sm"
                >
                  <span className="font-semibold mb-1">Away</span>
                  <span className="text-primary">{match.odds[2]}x</span>
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="text-center text-sm text-muted-foreground">
        <p>⚡ Instant result in 3 seconds • {matches.length} matches available • Fair odds from top 4 leagues</p>
      </div>
    </div>
  );
};

export default InstantVirtualsGame;
