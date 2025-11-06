import { useState, useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { User } from "@supabase/supabase-js";
import { Plane } from "lucide-react";

interface AviatorGameProps {
  user: User | null;
  balance: number;
  onBalanceUpdate: (newBalance: number) => void;
}

const AviatorGame = ({ user, balance, onBalanceUpdate }: AviatorGameProps) => {
  const [betAmount, setBetAmount] = useState("");
  const [multiplier, setMultiplier] = useState(1.00);
  const [isFlying, setIsFlying] = useState(false);
  const [isBetPlaced, setIsBetPlaced] = useState(false);
  const [hasCashedOut, setHasCashedOut] = useState(false);
  const [currentBetId, setCurrentBetId] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(5);
  const [history, setHistory] = useState<number[]>([]);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchHistory();
  }, []);

  useEffect(() => {
    if (!isFlying && countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else if (countdown === 0 && !isFlying) {
      startRound();
    }
  }, [countdown, isFlying]);

  const fetchHistory = async () => {
    const { data } = await supabase
      .from("casino_game_rounds")
      .select("multiplier")
      .eq("game_type", "aviator")
      .order("created_at", { ascending: false })
      .limit(10);

    if (data) {
      setHistory(data.map(r => Number(r.multiplier)));
    }
  };

  const generateCrashPoint = () => {
    const rand = Math.random();
    if (rand < 0.33) return 1.0 + Math.random() * 1.5;
    if (rand < 0.66) return 1.5 + Math.random() * 3;
    return 3 + Math.random() * 7;
  };

  const startRound = async () => {
    const crashPoint = generateCrashPoint();
    setIsFlying(true);
    setMultiplier(1.00);
    setHasCashedOut(false);

    let current = 1.00;
    intervalRef.current = setInterval(() => {
      current += 0.01;
      setMultiplier(Number(current.toFixed(2)));

      if (current >= crashPoint) {
        clearInterval(intervalRef.current!);
        endRound(crashPoint);
      }
    }, 50);
  };

  const endRound = async (crashPoint: number) => {
    setIsFlying(false);
    setMultiplier(crashPoint);

    const seed = Math.random().toString(36).substring(7);
    await supabase.from("casino_game_rounds").insert({
      game_type: "aviator",
      outcome_data: { crash_point: crashPoint },
      multiplier: crashPoint,
      result: "crashed",
      seed,
    });

    if (isBetPlaced && !hasCashedOut && currentBetId) {
      await supabase
        .from("casino_bets")
        .update({ 
          status: "lost",
          multiplier: crashPoint,
          settled_at: new Date().toISOString()
        })
        .eq("id", currentBetId);

      toast({
        title: "Crashed!",
        description: `Plane crashed at ${crashPoint.toFixed(2)}x`,
        variant: "destructive",
      });
    }

    setIsBetPlaced(false);
    setCurrentBetId(null);
    setCountdown(5);
    fetchHistory();
  };

  const placeBet = async () => {
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

    const { data: bet, error } = await supabase
      .from("casino_bets")
      .insert({
        user_id: user.id,
        game_type: "aviator",
        amount,
        status: "active",
      })
      .select()
      .single();

    if (error || !bet) {
      toast({
        title: "Error",
        description: "Failed to place bet",
        variant: "destructive",
      });
      return;
    }

    const newBalance = balance - amount;
    await supabase
      .from("profiles")
      .update({ balance: newBalance })
      .eq("id", user.id);

    onBalanceUpdate(newBalance);
    setIsBetPlaced(true);
    setCurrentBetId(bet.id);

    toast({
      title: "Bet Placed!",
      description: `₦${amount} bet placed`,
    });
  };

  const cashOut = async () => {
    if (!isBetPlaced || hasCashedOut || !currentBetId) return;

    setHasCashedOut(true);
    const amount = parseFloat(betAmount);
    const payout = amount * multiplier;

    await supabase
      .from("casino_bets")
      .update({ 
        status: "won",
        multiplier,
        payout,
        settled_at: new Date().toISOString()
      })
      .eq("id", currentBetId);

    const newBalance = balance + payout;
    await supabase
      .from("profiles")
      .update({ balance: newBalance })
      .eq("id", user!.id);

    onBalanceUpdate(newBalance);

    toast({
      title: "Cashed Out!",
      description: `Won ₦${payout.toFixed(2)} at ${multiplier.toFixed(2)}x`,
    });
  };

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <Card className="lg:col-span-2 p-6 bg-gradient-to-br from-card to-card/50 border-border">
        <div className="relative h-[400px] bg-gradient-to-b from-primary/5 to-background rounded-lg overflow-hidden mb-4">
          <div className="absolute inset-0 flex items-center justify-center">
            {!isFlying && countdown > 0 ? (
              <div className="text-center">
                <p className="text-6xl font-bold text-primary">{countdown}</p>
                <p className="text-muted-foreground mt-2">Next round starting...</p>
              </div>
            ) : (
              <div className="text-center">
                <Plane 
                  className={`w-16 h-16 mb-4 mx-auto transition-all duration-300 ${
                    isFlying ? "text-primary animate-pulse" : "text-muted-foreground"
                  }`}
                  style={{
                    transform: isFlying ? `translateY(-${multiplier * 10}px) rotate(-45deg)` : "rotate(0deg)"
                  }}
                />
                <p className="text-6xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                  {multiplier.toFixed(2)}x
                </p>
                {!isFlying && <p className="text-muted-foreground mt-2">Flew away!</p>}
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-2 flex-wrap">
          {history.map((m, i) => (
            <div 
              key={i}
              className={`px-3 py-1 rounded text-sm font-semibold ${
                m >= 2 ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
              }`}
            >
              {m.toFixed(2)}x
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
              disabled={isBetPlaced}
            />
          </div>

          {!isBetPlaced ? (
            <Button 
              onClick={placeBet} 
              className="w-full"
              variant="bet"
              disabled={!betAmount || isFlying}
            >
              Place Bet
            </Button>
          ) : (
            <Button 
              onClick={cashOut} 
              className="w-full"
              variant="default"
              disabled={hasCashedOut || !isFlying}
            >
              {hasCashedOut ? "Cashed Out!" : `Cash Out ${multiplier.toFixed(2)}x`}
            </Button>
          )}

          <div className="pt-4 border-t border-border space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Balance:</span>
              <span className="font-semibold">₦{balance.toFixed(2)}</span>
            </div>
            {isBetPlaced && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Potential Win:</span>
                <span className="font-semibold text-primary">
                  ₦{(parseFloat(betAmount) * multiplier).toFixed(2)}
                </span>
              </div>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
};

export default AviatorGame;
