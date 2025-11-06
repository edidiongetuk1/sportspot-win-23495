import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { User } from "@supabase/supabase-js";
import { Apple, Gift, Coins } from "lucide-react";

interface AppleFortuneGameProps {
  user: User | null;
  balance: number;
  onBalanceUpdate: (newBalance: number) => void;
}

const AppleFortuneGame = ({ user, balance, onBalanceUpdate }: AppleFortuneGameProps) => {
  const [betAmount, setBetAmount] = useState("");
  const [selectedApple, setSelectedApple] = useState<number | null>(null);
  const [revealing, setRevealing] = useState(false);
  const [results, setResults] = useState<{ multiplier: number; icon: any; label: string; color: string }[]>([]);
  const { toast } = useToast();

  const apples = Array.from({ length: 9 }, (_, i) => i);
  const prizes = [
    { multiplier: 0, icon: Apple, label: "Try Again", color: "text-muted-foreground" },
    { multiplier: 1.5, icon: Coins, label: "Small Win", color: "text-accent" },
    { multiplier: 3, icon: Gift, label: "Big Win", color: "text-primary" },
    { multiplier: 10, icon: Gift, label: "Jackpot!", color: "text-primary-glow" },
  ];

  const generateResults = () => {
    const results = Array.from({ length: 9 }, () => {
      const rand = Math.random();
      if (rand < 0.4) return prizes[0];
      if (rand < 0.75) return prizes[1];
      if (rand < 0.95) return prizes[2];
      return prizes[3];
    });
    return results;
  };

  const pickApple = async (appleIndex: number) => {
    if (!user) {
      toast({
        title: "Login Required",
        description: "Please login to play",
        variant: "destructive",
      });
      return;
    }

    const amount = parseFloat(betAmount);
    if (isNaN(amount) || amount <= 0 || amount > balance || revealing) {
      toast({
        title: "Invalid Bet",
        description: "Please enter a valid bet amount",
        variant: "destructive",
      });
      return;
    }

    setRevealing(true);
    setSelectedApple(appleIndex);

    const generatedResults = generateResults();
    
    setTimeout(async () => {
      setResults(generatedResults);
      const prize = generatedResults[appleIndex];
      const payout = amount * prize.multiplier;

      const seed = Math.random().toString(36).substring(7);
      await supabase.from("casino_game_rounds").insert({
        game_type: "apple_fortune",
        outcome_data: { apple_index: appleIndex, prize: prize.label },
        multiplier: prize.multiplier,
        result: prize.multiplier > 0 ? "won" : "lost",
        seed,
      });

      let newBalance = balance - amount;
      if (payout > 0) {
        newBalance = balance - amount + payout;
      }

      await supabase
        .from("profiles")
        .update({ balance: newBalance })
        .eq("id", user.id);

      onBalanceUpdate(newBalance);

      if (prize.multiplier > 0) {
        toast({
          title: prize.label,
          description: `Won ₦${payout.toFixed(2)}!`,
        });
      } else {
        toast({
          title: "Try Again",
          description: "Better luck next time!",
          variant: "destructive",
        });
      }

      setTimeout(() => {
        setRevealing(false);
        setSelectedApple(null);
        setResults([]);
      }, 3000);
    }, 1000);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <Card className="lg:col-span-2 p-6 bg-gradient-to-br from-card to-card/50 border-border">
        <div className="mb-6 text-center">
          <h3 className="text-2xl font-bold mb-2">Pick Your Fortune</h3>
          <p className="text-muted-foreground">Choose an apple and reveal your prize!</p>
        </div>

        <div className="grid grid-cols-3 gap-4 max-w-md mx-auto">
          {apples.map((appleIndex) => {
            const isSelected = selectedApple === appleIndex;
            const result = results[appleIndex];

            return (
              <button
                key={appleIndex}
                onClick={() => pickApple(appleIndex)}
                disabled={revealing}
                className={`aspect-square rounded-xl flex flex-col items-center justify-center gap-2 transition-all transform ${
                  revealing
                    ? isSelected
                      ? "bg-primary/20 border-2 border-primary scale-105"
                      : "bg-muted opacity-50"
                    : "bg-gradient-to-br from-primary/10 to-accent/10 hover:from-primary/20 hover:to-accent/20 hover:scale-105 cursor-pointer"
                }`}
              >
                {result ? (
                  <>
                    <result.icon className={`w-12 h-12 ${result.color}`} />
                    <p className={`text-sm font-semibold ${result.color}`}>
                      {result.multiplier > 0 ? `${result.multiplier}x` : result.label}
                    </p>
                  </>
                ) : (
                  <Apple className="w-12 h-12 text-primary" />
                )}
              </button>
            );
          })}
        </div>

        <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-3">
          {prizes.map((prize, i) => (
            <div key={i} className="text-center p-3 rounded-lg bg-muted">
              <prize.icon className={`w-8 h-8 mx-auto mb-2 ${prize.color}`} />
              <p className="text-xs font-semibold">{prize.label}</p>
              {prize.multiplier > 0 && (
                <p className="text-xs text-muted-foreground">{prize.multiplier}x</p>
              )}
            </div>
          ))}
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
              disabled={revealing}
            />
          </div>

          <div className="pt-4 border-t border-border space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Balance:</span>
              <span className="font-semibold">₦{balance.toFixed(2)}</span>
            </div>
          </div>

          <div className="space-y-2 pt-4">
            <p className="text-sm text-muted-foreground">How to play:</p>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>• Enter your bet amount</li>
              <li>• Pick an apple to reveal your prize</li>
              <li>• Win up to 10x your bet!</li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default AppleFortuneGame;
