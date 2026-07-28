import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertTriangle, CheckCircle2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Bet {
  id: string;
  match_id: string;
  selection: string;
  odds: number;
  stake: number;
  potential_win: number;
  status: string;
  result: string | null;
  created_at: string;
}

interface Match {
  id: string;
  team1: string;
  team2: string;
  competition: string;
  result: string | null;
  status: string;
}

interface Group {
  match: Match | null;
  matchId: string;
  bets: Bet[];
  winners: number;
  losers: number;
  totalStake: number;
  totalPayout: number;
  expectedWinner: string | null;
  inconsistencies: string[];
}

export const SettlementDiagnostics = () => {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    const [{ data: bets }, { data: matches }] = await Promise.all([
      supabase
        .from("bets")
        .select("*")
        .in("status", ["won", "lost"])
        .order("created_at", { ascending: false })
        .limit(500),
      supabase.from("matches").select("*").eq("status", "completed"),
    ]);

    const matchMap = new Map<string, Match>();
    (matches || []).forEach((m: any) => matchMap.set(m.id, m));

    const grouped = new Map<string, Bet[]>();
    (bets || []).forEach((b: any) => {
      const list = grouped.get(b.match_id) || [];
      list.push(b);
      grouped.set(b.match_id, list);
    });

    const result: Group[] = Array.from(grouped.entries()).map(([matchId, list]) => {
      const match = matchMap.get(matchId) || null;
      const norm = (s: string) => String(s ?? "").trim().toLowerCase();
      let expectedWinner: string | null = null;
      if (match?.result) {
        const r = norm(match.result);
        if (r === "team1_win") expectedWinner = match.team1;
        else if (r === "team2_win") expectedWinner = match.team2;
        else if (r === "draw") expectedWinner = "Draw";
        else expectedWinner = match.result;
      }

      let winners = 0,
        losers = 0,
        totalStake = 0,
        totalPayout = 0;
      const inconsistencies: string[] = [];

      list.forEach((b) => {
        totalStake += Number(b.stake);
        if (b.status === "won") {
          winners++;
          totalPayout += Number(b.potential_win);
          if (expectedWinner && norm(b.selection) !== norm(expectedWinner)) {
            inconsistencies.push(
              `Bet ${b.id.slice(0, 8)} marked WON but selection "${b.selection}" ≠ "${expectedWinner}"`
            );
          }
        } else {
          losers++;
          if (expectedWinner && norm(b.selection) === norm(expectedWinner)) {
            inconsistencies.push(
              `Bet ${b.id.slice(0, 8)} marked LOST but selection "${b.selection}" = "${expectedWinner}"`
            );
          }
        }
      });

      return {
        matchId,
        match,
        bets: list,
        winners,
        losers,
        totalStake,
        totalPayout,
        expectedWinner,
        inconsistencies,
      };
    });

    result.sort((a, b) => b.bets.length - a.bets.length);
    setGroups(result);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
    const channel = supabase
      .channel("settlement-diag")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bets" },
        () => fetchData()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const totalInconsistencies = groups.reduce(
    (acc, g) => acc + g.inconsistencies.length,
    0
  );

  return (
    <Card className="animate-fade-in">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Settlement Diagnostics</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Live view of settled bets grouped by match with payout checks.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {totalInconsistencies > 0 ? (
            <Badge variant="destructive" className="gap-1">
              <AlertTriangle className="w-3 h-3" />
              {totalInconsistencies} issue{totalInconsistencies === 1 ? "" : "s"}
            </Badge>
          ) : (
            <Badge className="bg-green-500 gap-1">
              <CheckCircle2 className="w-3 h-3" />
              All consistent
            </Badge>
          )}
          <Button size="sm" variant="outline" onClick={fetchData} disabled={loading}>
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[500px] pr-2">
          {groups.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No settled bets yet.
            </p>
          ) : (
            <div className="space-y-3">
              {groups.map((g) => (
                <div
                  key={g.matchId}
                  className={`border rounded-lg p-4 space-y-2 animate-fade-in ${
                    g.inconsistencies.length ? "border-destructive/50 bg-destructive/5" : ""
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div>
                      <p className="font-semibold">
                        {g.match ? `${g.match.team1} vs ${g.match.team2}` : `Match ${g.matchId.slice(0, 8)}`}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {g.match?.competition || "—"} · Winner:{" "}
                        <span className="text-primary font-mono">
                          {g.expectedWinner ?? "unknown"}
                        </span>
                      </p>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      <Badge variant="outline">{g.bets.length} bets</Badge>
                      <Badge className="bg-green-500">{g.winners} won</Badge>
                      <Badge variant="destructive">{g.losers} lost</Badge>
                      <Badge variant="secondary">
                        Stake ₦{g.totalStake.toLocaleString()}
                      </Badge>
                      <Badge className="bg-primary/20 text-primary">
                        Payout ₦{g.totalPayout.toLocaleString()}
                      </Badge>
                    </div>
                  </div>
                  {g.inconsistencies.length > 0 && (
                    <div className="space-y-1 pt-2 border-t border-destructive/30">
                      {g.inconsistencies.map((msg, i) => (
                        <p key={i} className="text-xs text-destructive flex gap-2">
                          <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5" />
                          {msg}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
