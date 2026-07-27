import { Badge } from "@/components/ui/badge";

interface MatchCardProps {
  homeTeam: string;
  awayTeam: string;
  homeOdds: number;
  drawOdds?: number;
  awayOdds: number;
  startTime: string;
  league: string;
  isLive?: boolean;
  homeScore?: number | null;
  awayScore?: number | null;
  onBetClick: (team: string, odds: number) => void;
}

const OddsButton = ({
  label,
  value,
  onClick,
}: {
  label: string;
  value: number;
  onClick: () => void;
}) => (
  <button
    onClick={onClick}
    className="group/btn flex flex-col items-center justify-center py-3 bg-secondary/60 border border-border rounded-xl transition-all duration-300 hover:bg-primary hover:border-primary hover:-translate-y-0.5 hover:shadow-gold"
    style={{ boxShadow: "inset 0 1px 0 hsl(0 0% 100% / 0.03)" }}
  >
    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest group-hover/btn:text-primary-foreground/80">
      {label}
    </span>
    <span className="font-mono text-lg font-bold text-primary group-hover/btn:text-primary-foreground">
      {value.toFixed(2)}
    </span>
  </button>
);

export const MatchCard = ({
  homeTeam,
  awayTeam,
  homeOdds,
  drawOdds,
  awayOdds,
  startTime,
  league,
  isLive = false,
  homeScore,
  awayScore,
  onBetClick,
}: MatchCardProps) => {
  return (
    <div className="group relative overflow-hidden rounded-3xl bg-card/60 backdrop-blur-sm border border-border p-5 md:p-6 transition-all duration-500 hover:border-primary/40 hover:bg-card/80 animate-fade-in">
      {/* Soft gold corner glow on hover */}
      <div className="pointer-events-none absolute -top-24 -right-24 w-64 h-64 rounded-full bg-primary/5 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />

      {/* Header: league + status */}
      <div className="flex items-center justify-between mb-5 relative">
        <div className="flex items-center gap-2">
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              isLive ? "bg-primary animate-pulse" : "bg-muted-foreground/40"
            }`}
          />
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.18em]">
            {league}
          </span>
        </div>
        {isLive ? (
          <Badge className="bg-primary/10 text-primary border border-primary/20 hover:bg-primary/10 font-mono text-[10px] font-bold uppercase tracking-tight">
            Live
          </Badge>
        ) : (
          <span className="font-mono text-[11px] font-bold text-muted-foreground uppercase tracking-tight">
            {startTime}
          </span>
        )}
      </div>

      {/* Teams */}
      <div className="space-y-3 mb-7 relative">
        <div className="flex justify-between items-center">
          <span className="text-base md:text-lg font-semibold text-foreground truncate pr-3">
            {homeTeam}
          </span>
          <span className="text-xl font-black text-foreground/90 tabular font-mono">
            {isLive && homeScore != null ? homeScore : "—"}
          </span>
        </div>
        <div className="gold-hairline opacity-30" />
        <div className="flex justify-between items-center">
          <span className="text-base md:text-lg font-semibold text-foreground truncate pr-3">
            {awayTeam}
          </span>
          <span className="text-xl font-black text-foreground/90 tabular font-mono">
            {isLive && awayScore != null ? awayScore : "—"}
          </span>
        </div>
      </div>

      {/* Odds grid */}
      <div className={`grid ${drawOdds ? "grid-cols-3" : "grid-cols-2"} gap-2 relative`}>
        <OddsButton label="1" value={homeOdds} onClick={() => onBetClick(homeTeam, homeOdds)} />
        {drawOdds && (
          <OddsButton label="X" value={drawOdds} onClick={() => onBetClick("Draw", drawOdds)} />
        )}
        <OddsButton label="2" value={awayOdds} onClick={() => onBetClick(awayTeam, awayOdds)} />
      </div>
    </div>
  );
};
