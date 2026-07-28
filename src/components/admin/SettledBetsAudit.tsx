import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";

interface Row {
  id: string;
  user_id: string;
  user_email?: string;
  match_id: string;
  selection: string;
  odds: number;
  stake: number;
  potential_win: number;
  status: string;
  created_at: string;
}

export const SettledBetsAudit = () => {
  const [rows, setRows] = useState<Row[]>([]);
  const [filter, setFilter] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchRows = async () => {
    setLoading(true);
    const { data: bets } = await supabase
      .from("bets")
      .select("*")
      .in("status", ["won", "lost"])
      .order("created_at", { ascending: false })
      .limit(300);

    const userIds = Array.from(new Set((bets || []).map((b: any) => b.user_id)));
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, email")
      .in("id", userIds.length ? userIds : ["00000000-0000-0000-0000-000000000000"]);
    const emailMap = new Map((profiles || []).map((p: any) => [p.id, p.email]));

    setRows(
      (bets || []).map((b: any) => ({ ...b, user_email: emailMap.get(b.user_id) }))
    );
    setLoading(false);
  };

  useEffect(() => {
    fetchRows();
    const channel = supabase
      .channel("settled-bets-audit")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bets" },
        () => fetchRows()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const filtered = rows.filter((r) => {
    if (!filter) return true;
    const q = filter.toLowerCase();
    return (
      (r.user_email || "").toLowerCase().includes(q) ||
      r.selection.toLowerCase().includes(q) ||
      r.status.toLowerCase().includes(q)
    );
  });

  const totalPayout = filtered
    .filter((r) => r.status === "won")
    .reduce((acc, r) => acc + Number(r.potential_win), 0);

  return (
    <Card className="animate-fade-in">
      <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <CardTitle>Settled Bets Audit Trail</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            {filtered.length} settled bets · Total payout ₦{totalPayout.toLocaleString()}
          </p>
        </div>
        <Input
          placeholder="Filter by email, selection, status…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="md:w-72"
        />
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[500px]">
          {loading ? (
            <p className="text-muted-foreground text-center py-8">Loading…</p>
          ) : filtered.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No settled bets match your filter.
            </p>
          ) : (
            <div className="space-y-2">
              {filtered.map((r) => (
                <div
                  key={r.id}
                  className="border rounded-lg p-3 flex items-center justify-between gap-3 flex-wrap animate-fade-in"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge
                        className={r.status === "won" ? "bg-green-500" : "bg-red-500"}
                      >
                        {r.status.toUpperCase()}
                      </Badge>
                      <span className="font-semibold truncate">{r.selection}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {r.user_email || r.user_id.slice(0, 8)} ·{" "}
                      {format(new Date(r.created_at), "PPp")}
                    </p>
                  </div>
                  <div className="flex gap-2 flex-wrap justify-end">
                    <Badge variant="secondary">Stake ₦{Number(r.stake).toLocaleString()}</Badge>
                    <Badge variant="outline">Odds {Number(r.odds).toFixed(2)}</Badge>
                    <Badge
                      className={
                        r.status === "won"
                          ? "bg-primary/20 text-primary"
                          : "bg-muted text-muted-foreground"
                      }
                    >
                      {r.status === "won" ? "+" : ""}₦
                      {(r.status === "won"
                        ? Number(r.potential_win)
                        : -Number(r.stake)
                      ).toLocaleString()}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
