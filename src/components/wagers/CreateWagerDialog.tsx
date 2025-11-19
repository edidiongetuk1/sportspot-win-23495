import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { GameSelectionGrid } from "./GameSelectionGrid";

}: CreateWagerDialogProps) => {
  const [gameType, setGameType] = useState("");
  const [stakeAmount, setStakeAmount] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const generateWagerCode = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const amount = parseFloat(stakeAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: "Invalid amount",
        description: "Please enter a valid stake amount",
        variant: "destructive",
      });
      return;
    }

    if (amount > userBalance) {
      toast({
        title: "Insufficient balance",
        description: "You don't have enough funds",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Generate unique wager code
      const wagerCode = generateWagerCode();

      // Create wager
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24); // Expires in 24 hours

      const { error: wagerError } = await supabase
        .from("mobile_wagers")
        .insert({
          player_a_id: user.id,
          game_type: gameType,
          stake_amount: amount,
          expires_at: expiresAt.toISOString(),
          wager_code: wagerCode,
        });

      if (wagerError) {
        console.error("Wager creation error:", wagerError);
        throw wagerError;
      }

      // Deduct stake from balance
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ balance: userBalance - amount })
        .eq("id", user.id);

      if (profileError) {
        console.error("Profile update error:", profileError);
        throw profileError;
      }

      toast({
        title: "Wager created!",
        description: `Share this code with your opponent: ${wagerCode}`,
        duration: 10000,
      });

      onWagerCreated();
      onOpenChange(false);
      setGameType("");
      setStakeAmount("");
    } catch (error: any) {
      console.error("Create wager error:", error);
      toast({
        title: "Error",
        description: error?.message || "Failed to create wager",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create New Wager</DialogTitle>
          <DialogDescription>
            Challenge another player to a 1v1 match
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <GameSelectionGrid
            selectedGame={gameType}
            onSelectGame={setGameType}
          />

          <div className="space-y-2">
            <Label htmlFor="stake">Stake Amount</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                ₦
              </span>
              <Input
                id="stake"
                type="number"
                placeholder="0.00"
                value={stakeAmount}
                onChange={(e) => setStakeAmount(e.target.value)}
                className="pl-8"
                min="0"
                step="0.01"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Available balance: ₦{userBalance.toFixed(2)}
            </p>
          </div>

          <Button
            type="submit"
            variant="bet"
            className="w-full"
            disabled={!gameType || !stakeAmount || isSubmitting}
          >
            {isSubmitting ? "Creating..." : "Create Wager"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
