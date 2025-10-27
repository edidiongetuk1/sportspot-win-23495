import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { User } from "@supabase/supabase-js";
import { Star, X } from "lucide-react";

interface TowerGameProps {
  user: User | null;
  balance: number;
  onBalanceUpdate: (newBalance: number) => void;
}

const TowerGame = ({ user, balance, onBalanceUpdate }: TowerGameProps) => {
  const [betAmount, setBetAmount] = useState("");
  const [gameActive, setGameActive] = useState(false);
  const [currentLevel, setCurrentLevel] = useState(0);
  const [multiplier, setMultiplier] = useState(1.0);
  const [revealedTiles, setRevealedTiles] = useState<{ [key: string]: boolean }>({});
  const [bombPositions, setBombPositions] = useState<number[]>([]);
  const { toast } = useToast();

  const levels = 10;
  const tilesPerLevel = 3;
  const multipliers = [1.5, 2.0, 2.5, 3.0, 4.0, 5.0, 6.5, 8.0, 10.0, 15.0];

  const startGame = async () => {
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

    // Generate bomb positions (one per level)
    const bombs = Array.from({ length: levels }, () => Math.floor(Math.random() * tilesPerLevel));
    setBombPositions(bombs);

    const newBalance = balance - amount;
    await supabase
      .from("profiles")
      .update({ balance: newBalance })
      .eq("id", user.id);

    onBalanceUpdate(newBalance);
    setGameActive(true);
    setCurrentLevel(0);
    setMultiplier(1.0);
    setRevealedTiles({});

    toast({
      title: "Game Started",
      description: "Choose carefully!",
    });
  };

  const selectTile = async (level: number, tile: number) => {
    if (!gameActive || level !== currentLevel) return;

    const key = `${level}-${tile}`;
    setRevealedTiles({ ...revealedTiles, [key]: true });

    if (bombPositions[level] === tile) {
      // Hit bomb - game over
      setGameActive(false);
      
      const seed = Math.random().toString(36).substring(7);
      await supabase.from("casino_game_rounds").insert({
        game_type: "tower",
        outcome_data: { level_reached: level, hit_bomb: true },
        multiplier: 0,
        result: "lost",
        seed,
      });

      toast({
        title: "Bomb Hit!",
        description: "Better luck next time",
        variant: "destructive",
      });
    } else {
      // Safe tile
      const newLevel = level + 1;
      const newMultiplier = multipliers[level];
      setCurrentLevel(newLevel);
      setMultiplier(newMultiplier);

      if (newLevel === levels) {
        // Won entire tower
        await cashOut(newMultiplier);
      } else {
        toast({
          title: "Safe!",
          description: `Current multiplier: ${newMultiplier.toFixed(2)}x`,
        });
      }
    }
  };

  const cashOut = async (finalMultiplier?: number) => {
    if (!gameActive || !user) return;

    const useMultiplier = finalMultiplier || multiplier;
    const amount = parseFloat(betAmount);
    const payout = amount * useMultiplier;

    const newBalance = balance + payout;
    await supabase
      .from("profiles")
      .update({ balance: newBalance })
      .eq("id", user.id);

    onBalanceUpdate(newBalance);

    const seed = Math.random().toString(36).substring(7);
    await supabase.from("casino_game_rounds").insert({
      game_type: "tower",
      outcome_data: { level_reached: currentLevel, cashed_out: true },
      multiplier: useMultiplier,
      result: "won",
      seed,
    });

    setGameActive(false);

    toast({
      title: "Cashed Out!",
      description: `Won $${payout.toFixed(2)} at ${useMultiplier.toFixed(2)}x`,
    });
  };

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <Card className="lg:col-span-2 p-6 bg-gradient-to-br from-card to-card/50 border-border">
        <div className="space-y-2">
          {Array.from({ length: levels }).reverse().map((_, idx) => {
            const level = levels - 1 - idx;
            const isCurrentLevel = level === currentLevel && gameActive;
            
            return (
              <div key={level} className="flex gap-2">
                <div className="w-12 flex items-center justify-center text-sm font-semibold text-muted-foreground">
                  {multipliers[level].toFixed(1)}x
                </div>
                <div className="flex-1 grid grid-cols-3 gap-2">
                  {Array.from({ length: tilesPerLevel }).map((_, tile) => {
                    const key = `${level}-${tile}`;
                    const isRevealed = revealedTiles[key];
                    const isBomb = bombPositions[level] === tile;
                    const canClick = isCurrentLevel && !isRevealed;

                    return (
                      <button
                        key={tile}
                        onClick={() => selectTile(level, tile)}
                        disabled={!canClick}
                        className={`aspect-square rounded-lg flex items-center justify-center transition-all ${
                          isRevealed
                            ? isBomb
                              ? "bg-destructive text-destructive-foreground"
                              : "bg-primary text-primary-foreground"
                            : canClick
                            ? "bg-muted hover:bg-muted/80 cursor-pointer"
                            : "bg-muted/30"
                        }`}
                      >
                        {isRevealed && (isBomb ? <X /> : <Star />)}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <Card className="p-6 bg-card border-border">
        <h3 className="text-xl font-bold mb-4">Tower Challenge</h3>

        <div className="space-y-4">
          {!gameActive ? (
            <>
              <div>
                <label className="text-sm text-muted-foreground mb-2 block">Bet Amount</label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={betAmount}
                  onChange={(e) => setBetAmount(e.target.value)}
                />
              </div>
              <Button onClick={startGame} className="w-full" variant="bet">
                Start Climb
              </Button>
            </>
          ) : (
            <>
              <div className="text-center py-6 space-y-2">
                <p className="text-sm text-muted-foreground">Current Multiplier</p>
                <p className="text-4xl font-bold text-primary">{multiplier.toFixed(2)}x</p>
                <p className="text-sm text-muted-foreground">Level {currentLevel + 1} / {levels}</p>
              </div>
              <Button onClick={() => cashOut()} className="w-full" variant="default">
                Cash Out ${(parseFloat(betAmount) * multiplier).toFixed(2)}
              </Button>
            </>
          )}

          <div className="pt-4 border-t border-border space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Balance:</span>
              <span className="font-semibold">${balance.toFixed(2)}</span>
            </div>
            {gameActive && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Potential Win:</span>
                <span className="font-semibold text-primary">
                  ${(parseFloat(betAmount) * multiplier).toFixed(2)}
                </span>
              </div>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
};

export default TowerGame;
