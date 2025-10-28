import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trophy, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface Wager {
  id: string;
  player_a_id: string;
  player_b_id: string | null;
  game_type: string;
  stake_amount: number;
  status: string;
  created_at: string;
  expires_at: string;
}

interface WagerCardProps {
  wager: Wager;
  currentUserId?: string;
  onJoin: (wagerId: string, stakeAmount: number) => void;
}

export const WagerCard = ({ wager, currentUserId, onJoin }: WagerCardProps) => {
  const isExpired = new Date(wager.expires_at) < new Date();
  const canJoin = currentUserId && wager.player_a_id !== currentUserId && !isExpired;

  return (
    <Card className="p-6 bg-gradient-card border-border hover:border-primary/50 transition-colors">
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
        </div>

        <div className="flex items-center gap-3">
          {canJoin ? (
            <Button
              variant="bet"
              onClick={() => onJoin(wager.id, Number(wager.stake_amount))}
            >
              Join Wager
            </Button>
          ) : (
            <Badge variant={isExpired ? "destructive" : "secondary"}>
              {isExpired ? "Expired" : "Waiting"}
            </Badge>
          )}
        </div>
      </div>
    </Card>
  );
};
