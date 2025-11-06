import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { User } from "@supabase/supabase-js";

interface RouletteGameProps {
  user: User | null;
  balance: number;
  onBalanceUpdate: (newBalance: number) => void;
}

const RouletteGame = ({ user, balance, onBalanceUpdate }: RouletteGameProps) => {
  const [betAmount, setBetAmount] = useState("");
  const [selectedBets, setSelectedBets] = useState<{ type: string; value: number | string }[]>([]);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<number | null>(null);
  const { toast } = useToast();

  const numbers = Array.from({ length: 37 }, (_, i) => i);
  const redNumbers = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];

  const getNumberColor = (num: number) => {
    if (num === 0) return "bg-primary text-primary-foreground";
    return redNumbers.includes(num) ? "bg-destructive text-destructive-foreground" : "bg-foreground text-background";
  };

  const addBet = (type: string, value: number | string) => {
    setSelectedBets([...selectedBets, { type, value }]);
  };

  const clearBets = () => {
    setSelectedBets([]);
  };

  const spin = async () => {
    if (!user) {
      toast({
        title: "Login Required",
        description: "Please login to play",
        variant: "destructive",
      });
      return;
    }

    const amount = parseFloat(betAmount);
    const totalBet = amount * selectedBets.length;

    if (isNaN(amount) || amount <= 0 || totalBet > balance || selectedBets.length === 0) {
      toast({
        title: "Invalid Bet",
        description: "Check your bet amount and selections",
        variant: "destructive",
      });
      return;
    }

    setSpinning(true);
    const winningNumber = Math.floor(Math.random() * 37);

    // Animate spinning
    setTimeout(async () => {
      setResult(winningNumber);
      setSpinning(false);

      const seed = Math.random().toString(36).substring(7);
      await supabase.from("casino_game_rounds").insert({
        game_type: "roulette",
        outcome_data: { number: winningNumber },
        result: winningNumber.toString(),
        seed,
      });

      let totalWin = 0;
      selectedBets.forEach((bet) => {
        let won = false;
        let multiplier = 0;

        if (bet.type === "number" && bet.value === winningNumber) {
          won = true;
          multiplier = 35;
        } else if (bet.type === "color") {
          if (bet.value === "red" && redNumbers.includes(winningNumber)) {
            won = true;
            multiplier = 1;
          } else if (bet.value === "black" && !redNumbers.includes(winningNumber) && winningNumber !== 0) {
            won = true;
            multiplier = 1;
          }
        } else if (bet.type === "odd" && winningNumber % 2 === 1) {
          won = true;
          multiplier = 1;
        } else if (bet.type === "even" && winningNumber % 2 === 0 && winningNumber !== 0) {
          won = true;
          multiplier = 1;
        }

        if (won) {
          totalWin += amount * (multiplier + 1);
        }
      });

      const newBalance = balance - totalBet + totalWin;
      await supabase
        .from("profiles")
        .update({ balance: newBalance })
        .eq("id", user.id);

      onBalanceUpdate(newBalance);

      if (totalWin > 0) {
        toast({
          title: "Winner!",
          description: `Won ₦${totalWin.toFixed(2)}!`,
        });
      } else {
        toast({
          title: "Better luck next time",
          description: `Number: ${winningNumber}`,
          variant: "destructive",
        });
      }

      clearBets();
    }, 3000);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <Card className="lg:col-span-2 p-6 bg-gradient-to-br from-card to-card/50 border-border">
        <div className="mb-6 text-center">
          {spinning ? (
            <div className="py-12 animate-spin">
              <div className="w-32 h-32 mx-auto rounded-full border-8 border-primary border-t-transparent"></div>
            </div>
          ) : result !== null ? (
            <div className="py-8">
              <div className={`inline-block px-8 py-4 rounded-full text-4xl font-bold ${getNumberColor(result)}`}>
                {result}
              </div>
            </div>
          ) : (
            <div className="py-8 text-muted-foreground">
              Place your bets and spin!
            </div>
          )}
        </div>

        <div className="grid grid-cols-3 gap-2 mb-4">
          <Button
            onClick={() => addBet("color", "red")}
            className="bg-destructive hover:bg-destructive/90"
          >
            Red
          </Button>
          <Button
            onClick={() => addBet("color", "black")}
            className="bg-foreground text-background hover:bg-foreground/90"
          >
            Black
          </Button>
          <Button
            onClick={() => addBet("number", 0)}
            className="bg-primary hover:bg-primary/90"
          >
            0
          </Button>
        </div>

        <div className="grid grid-cols-12 gap-1">
          {numbers.slice(1).map((num) => (
            <button
              key={num}
              onClick={() => addBet("number", num)}
              className={`aspect-square rounded flex items-center justify-center text-xs font-bold transition-transform hover:scale-110 ${getNumberColor(num)}`}
            >
              {num}
            </button>
          ))}
        </div>
      </Card>

      <Card className="p-6 bg-card border-border">
        <h3 className="text-xl font-bold mb-4">Betting Panel</h3>

        <div className="space-y-4">
          <div>
            <label className="text-sm text-muted-foreground mb-2 block">Bet Amount (per selection)</label>
            <Input
              type="number"
              placeholder="0.00"
              value={betAmount}
              onChange={(e) => setBetAmount(e.target.value)}
              disabled={spinning}
            />
          </div>

          <div>
            <label className="text-sm text-muted-foreground mb-2 block">
              Selected Bets ({selectedBets.length})
            </label>
            <div className="flex flex-wrap gap-2 min-h-[60px] p-2 border border-border rounded-lg">
              {selectedBets.map((bet, i) => (
                <span key={i} className="px-2 py-1 bg-primary/20 text-primary rounded text-xs">
                  {bet.type}: {bet.value}
                </span>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Button onClick={spin} className="w-full" variant="bet" disabled={spinning || selectedBets.length === 0}>
              {spinning ? "Spinning..." : "Spin"}
            </Button>
            <Button onClick={clearBets} className="w-full" variant="outline" disabled={spinning}>
              Clear Bets
            </Button>
          </div>

          <div className="pt-4 border-t border-border space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Balance:</span>
              <span className="font-semibold">₦{balance.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total Bet:</span>
              <span className="font-semibold">
                ₦{(parseFloat(betAmount || "0") * selectedBets.length).toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default RouletteGame;
