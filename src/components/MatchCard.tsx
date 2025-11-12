import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trophy, Clock } from "lucide-react";

interface MatchCardProps {
  homeTeam: string;
  awayTeam: string;
  homeOdds: number;
  drawOdds?: number;
  awayOdds: number;
  startTime: string;
  league: string;
  isLive?: boolean;
  onBetClick: (team: string, odds: number) => void;
}

export const MatchCard = ({
  homeTeam,
  awayTeam,
  homeOdds,
  drawOdds,
  awayOdds,
  startTime,
  league,
  isLive = false,
  onBetClick,
}: MatchCardProps) => {
  return (
    <Card className="bg-gradient-card border-border hover:border-primary/50 transition-all duration-300 overflow-hidden group hover:shadow-glow hover:scale-[1.02] animate-fade-in">
      <div className="p-4 space-y-4">
        {/* League and Status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-primary group-hover:animate-bounce-subtle" />
            <span className="text-sm text-muted-foreground">{league}</span>
          </div>
          {isLive ? (
            <Badge className="bg-destructive text-destructive-foreground animate-pulse">
              LIVE
            </Badge>
          ) : (
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Clock className="w-4 h-4" />
              <span>{startTime}</span>
            </div>
          )}
        </div>

        {/* Teams */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-foreground">{homeTeam}</span>
            <Button
              variant="bet"
              size="sm"
              onClick={() => onBetClick(homeTeam, homeOdds)}
              className="min-w-[60px] hover:scale-110 transition-transform duration-300"
            >
              {homeOdds.toFixed(2)}
            </Button>
          </div>

          {drawOdds && (
            <div className="flex items-center justify-between">
              <span className="font-semibold text-muted-foreground">Draw</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onBetClick("Draw", drawOdds)}
                className="min-w-[60px] hover:scale-110 transition-transform duration-300"
              >
                {drawOdds.toFixed(2)}
              </Button>
            </div>
          )}

          <div className="flex items-center justify-between">
            <span className="font-semibold text-foreground">{awayTeam}</span>
            <Button
              variant="bet"
              size="sm"
              onClick={() => onBetClick(awayTeam, awayOdds)}
              className="min-w-[60px] hover:scale-110 transition-transform duration-300"
            >
              {awayOdds.toFixed(2)}
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
};
