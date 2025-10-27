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
    { id: 1, home: "Thunder FC", away: "Lightning United", odds: [2.1, 3.2, 2.8] },
    { id: 2, home: "Storm City", away: "Blaze Athletic", odds: [1.8, 3.5, 3.1] },
    { id: 3, home: "Phoenix Riders", away: "Dragon Warriors", odds: [2.5, 3.0, 2.3] },
  ];

  const [currentMatch] = useState(matches[Math.floor(Math.random() * matches.length)]);

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
          description: `${winner} won ${score}! Won $${payout.toFixed(2)}`,
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
    <div className="grid gap-6 lg:grid-cols-3">
      <Card className="lg:col-span-2 p-6 bg-gradient-to-br from-card to-card/50 border-border">
        <div className="flex items-center gap-2 mb-6">
          <Zap className="w-6 h-6 text-accent" />
          <h3 className="text-2xl font-bold">Virtual Match - Instant Result</h3>
        </div>

        <div className="bg-gradient-to-br from-primary/5 to-accent/5 rounded-lg p-6 mb-6">
          {simulating ? (
            <div className="text-center py-12 space-y-4">
              <div className="animate-pulse">
                <Trophy className="w-16 h-16 mx-auto text-primary mb-4" />
                <p className="text-xl font-semibold">Match in progress...</p>
              </div>
              <div className="flex justify-center gap-2">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="w-3 h-3 bg-primary rounded-full animate-bounce" 
                       style={{ animationDelay: `${i * 0.1}s` }} />
                ))}
              </div>
            </div>
          ) : matchResult ? (
            <div className="text-center py-12 space-y-4">
              <Trophy className="w-16 h-16 mx-auto text-accent mb-4" />
              <div>
                <p className="text-sm text-muted-foreground mb-2">Final Result</p>
                <p className="text-3xl font-bold text-primary">{matchResult.winner}</p>
                <p className="text-xl text-muted-foreground mt-2">{matchResult.score}</p>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-4">Quick Match</p>
                <div className="flex items-center justify-center gap-4">
                  <div className="text-center">
                    <div className="w-16 h-16 mx-auto mb-2 rounded-full bg-primary/20 flex items-center justify-center">
                      <Trophy className="w-8 h-8 text-primary" />
                    </div>
                    <p className="font-semibold">{currentMatch.home}</p>
                    <p className="text-xs text-muted-foreground">Odds: {currentMatch.odds[0]}</p>
                  </div>
                  
                  <div className="text-2xl font-bold text-muted-foreground">VS</div>
                  
                  <div className="text-center">
                    <div className="w-16 h-16 mx-auto mb-2 rounded-full bg-accent/20 flex items-center justify-center">
                      <Trophy className="w-8 h-8 text-accent" />
                    </div>
                    <p className="font-semibold">{currentMatch.away}</p>
                    <p className="text-xs text-muted-foreground">Odds: {currentMatch.odds[2]}</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <Button
                  onClick={() => simulateMatch("home")}
                  className="flex flex-col py-6 h-auto"
                  variant="outline"
                >
                  <span className="font-semibold mb-1">{currentMatch.home}</span>
                  <span className="text-primary text-lg">{currentMatch.odds[0]}x</span>
                </Button>
                
                <Button
                  onClick={() => simulateMatch("draw")}
                  className="flex flex-col py-6 h-auto"
                  variant="outline"
                >
                  <span className="font-semibold mb-1">Draw</span>
                  <span className="text-primary text-lg">{currentMatch.odds[1]}x</span>
                </Button>
                
                <Button
                  onClick={() => simulateMatch("away")}
                  className="flex flex-col py-6 h-auto"
                  variant="outline"
                >
                  <span className="font-semibold mb-1">{currentMatch.away}</span>
                  <span className="text-primary text-lg">{currentMatch.odds[2]}x</span>
                </Button>
              </div>
            </div>
          )}
        </div>

        <div className="text-center text-sm text-muted-foreground">
          <p>⚡ Instant result in 3 seconds • Real-time simulation • Fair odds</p>
        </div>
      </Card>

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
              <span className="font-semibold">${balance.toFixed(2)}</span>
            </div>
          </div>

          <div className="space-y-2 pt-4">
            <p className="text-sm font-semibold">How it works:</p>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>• Pick home win, draw, or away win</li>
              <li>• Match simulates instantly</li>
              <li>• Results based on realistic odds</li>
              <li>• New match every round</li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default InstantVirtualsGame;
