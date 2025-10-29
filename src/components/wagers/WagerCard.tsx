import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Trophy, Clock, Copy } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useToast } from "@/hooks/use-toast";

interface Wager {
  id: string;
  player_a_id: string;
  player_b_id: string | null;
  game_type: string;
  stake_amount: number;
  status: string;
  created_at: string;
  expires_at: string;
  wager_code: string;
}

interface WagerCardProps {
  wager: Wager;
  currentUserId?: string;
  onJoin: (wagerId: string, stakeAmount: number, code: string) => void;
}

export const WagerCard = ({ wager, currentUserId, onJoin }: WagerCardProps) => {
  const [enteredCode, setEnteredCode] = useState("");
  const [showCodeInput, setShowCodeInput] = useState(false);
  const { toast } = useToast();
  const isExpired = new Date(wager.expires_at) < new Date();
  const canJoin = currentUserId && wager.player_a_id !== currentUserId && !isExpired;
  const isCreator = currentUserId === wager.player_a_id;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(wager.wager_code);
    toast({
      title: "Code copied!",
      description: "Share this code with your opponent",
    });
  };

  const handleJoinAttempt = () => {
    if (enteredCode.toUpperCase() !== wager.wager_code) {
      toast({
        title: "Invalid code",
        description: "Please enter the correct wager code",
        variant: "destructive",
      });
      return;
    }
    onJoin(wager.id, Number(wager.stake_amount), enteredCode.toUpperCase());
  };

  return (
    <Card className="p-6 bg-gradient-card border-border hover:border-primary/50 transition-colors">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-primary" />
              <h3 className="font-bold text-lg">{wager.game_type}</h3>
            </div>
            
            <div className="flex flex-wrap gap-2 items-center">
              <Badge variant="secondary">
                Stake: ₦{Number(wager.stake_amount).toFixed(2)}
              </Badge>
              <Badge variant="outline">
                Win: ₦{(Number(wager.stake_amount) * 2).toFixed(2)}
              </Badge>
            </div>

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="w-4 h-4" />
              <span>
                {isExpired 
                  ? "Expired" 
                  : `Expires ${formatDistanceToNow(new Date(wager.expires_at), { addSuffix: true })}`
                }
              </span>
            </div>

            {isCreator && (
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="default" className="font-mono">
                  {wager.wager_code}
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCopyCode}
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            {canJoin && !showCodeInput && (
              <Button
                variant="bet"
                onClick={() => setShowCodeInput(true)}
              >
                Join with Code
              </Button>
            )}
            {!canJoin && !isCreator && (
              <Badge variant={isExpired ? "destructive" : "secondary"}>
                {isExpired ? "Expired" : "Waiting"}
              </Badge>
            )}
          </div>
        </div>

        {canJoin && showCodeInput && (
          <div className="flex gap-2">
            <Input
              placeholder="Enter wager code"
              value={enteredCode}
              onChange={(e) => setEnteredCode(e.target.value.toUpperCase())}
              className="font-mono"
              maxLength={6}
            />
            <Button variant="bet" onClick={handleJoinAttempt}>
              Join
            </Button>
            <Button variant="outline" onClick={() => setShowCodeInput(false)}>
              Cancel
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
};
