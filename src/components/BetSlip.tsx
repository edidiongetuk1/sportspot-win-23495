import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, DollarSign } from "lucide-react";
import { useState } from "react";

interface Bet {
  id: string;
  selection: string;
  odds: number;
}

interface BetSlipProps {
  bets: Bet[];
  onRemoveBet: (id: string) => void;
  onClearAll: () => void;
  onPlaceBet: (stake: number) => void;
  userBalance: number;
}

export const BetSlip = ({ bets, onRemoveBet, onClearAll, onPlaceBet, userBalance }: BetSlipProps) => {
  const [stake, setStake] = useState("");

  const totalOdds = bets.reduce((acc, bet) => acc * bet.odds, 1);
  const stakeAmount = parseFloat(stake) || 0;
  const potentialWin = stakeAmount * totalOdds;

  const handlePlaceBet = () => {
    if (stakeAmount > 0 && stakeAmount <= userBalance) {
      onPlaceBet(stakeAmount);
      setStake("");
    }
  };

  return (
    <Card className="bg-gradient-card border-border sticky top-4">
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-lg">Bet Slip</h3>
          {bets.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearAll}
              className="text-muted-foreground hover:text-destructive"
            >
              Clear All
            </Button>
          )}
        </div>
      </div>

      <div className="p-4 space-y-4">
        {bets.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>No bets selected</p>
            <p className="text-sm mt-2">Click on odds to add to bet slip</p>
          </div>
        ) : (
          <>
            {/* Bet Items */}
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {bets.map((bet) => (
                <div
                  key={bet.id}
                  className="flex items-center justify-between p-3 bg-secondary rounded-lg group"
                >
                  <div className="flex-1">
                    <p className="font-medium text-sm">{bet.selection}</p>
                    <p className="text-accent font-bold">{bet.odds.toFixed(2)}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onRemoveBet(bet.id)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>

            {/* Stake Input */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Stake Amount</label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="number"
                  placeholder="0.00"
                  value={stake}
                  onChange={(e) => setStake(e.target.value)}
                  className="pl-10"
                  min="0"
                  step="0.01"
                />
              </div>
            </div>

            {/* Summary */}
            <div className="space-y-2 pt-2 border-t border-border">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total Odds</span>
                <span className="font-bold text-accent">{totalOdds.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Potential Win</span>
                <span className="font-bold text-primary">${potentialWin.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Balance</span>
                <span className="font-medium">${userBalance.toFixed(2)}</span>
              </div>
            </div>

            {/* Place Bet Button */}
            <Button
              variant="bet"
              className="w-full"
              disabled={!stake || stakeAmount <= 0 || stakeAmount > userBalance}
              onClick={handlePlaceBet}
            >
              Place Bet - ${potentialWin.toFixed(2)}
            </Button>
            {stakeAmount > userBalance && (
              <p className="text-xs text-destructive text-center">
                Insufficient balance
              </p>
            )}
          </>
        )}
      </div>
    </Card>
  );
};
