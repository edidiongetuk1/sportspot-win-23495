import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { ArrowDownCircle, ArrowUpCircle, Ticket, Radio } from "lucide-react";
import { format } from "date-fns";

interface Log {
  id: string;
  user_id: string;
  user_email?: string;
  action_type: string;
  amount: number;
  balance_before: number;
  balance_after: number;
  reference_type: string | null;
  created_at: string;
}

interface Props {
  /** When true, shows all users' activity (admin view). Otherwise scoped by RLS to current user. */
  adminView?: boolean;
}

const CATEGORY: Record<
  string,
  { label: string; tone: "in" | "out" | "neutral"; icon: JSX.Element }
> = {
  deposit: { label: "Deposit", tone: "in", icon: <ArrowDownCircle className="w-4 h-4" /> },
  withdrawal: { label: "Withdrawal", tone: "out", icon: <ArrowUpCircle className="w-4 h-4" /> },
  withdrawal_approved: { label: "Withdrawal Paid", tone: "out", icon: <ArrowUpCircle className="w-4 h-4" /> },
  withdrawal_rejected: { label: "Withdrawal Refund", tone: "in", icon: <ArrowDownCircle className="w-4 h-4" /> },
  bet_placed: { label: "Bet Placed", tone: "out", icon: <Ticket className="w-4 h-4" /> },
  bet_won: { label: "Bet Won", tone: "in", icon: <Ticket className="w-4 h-4" /> },
  bet_lost: { label: "Bet Lost", tone: "neutral", icon: <Ticket className="w-4 h-4" /> },
  wager_created: { label: "Wager Created", tone: "out", icon: <Ticket className="w-4 h-4" /> },
  wager_joined: { label: "Wager Joined", tone: "out", icon: <Ticket className="w-4 h-4" /> },
  wager_won: { label: "Wager Won", tone: "in", icon: <Ticket className="w-4 h-4" /> },
};

const statusFor = (t: string) => {
  const c = CATEGORY[t];
  if (!c) return { label: t.replace(/_/g, " "), tone: "neutral" as const, icon: <Ticket className="w-4 h-4" /> };
  return c;
};

export const WalletActivityLog = ({ adminView = false }: Props) => {
  const [logs, setLogs] = useState<Log[]>([]);
  const [filter, setFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [flashId, setFlashId] = useState<string | null>(null);

  const fetchLogs = async () => {
    const { data } = await supabase
      .from("audit_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);

    let enriched: Log[] = (data || []) as Log[];
    if (adminView) {
      const ids = Array.from(new Set(enriched.map((l) => l.user_id)));
      if (ids.length) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, email")
          .in("id", ids);
        const map = new Map((profiles || []).map((p: any) => [p.id, p.email]));
        enriched = enriched.map((l) => ({ ...l, user_email: map.get(l.user_id) }));
      }
    }
    setLogs(enriched);
    setLoading(false);
  };

  useEffect(() => {
    fetchLogs();
    const channel = supabase
      .channel("wallet-activity-log")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "audit_logs" },
        (payload) => {
          const row = payload.new as Log;
          setFlashId(row.id);
          setTimeout(() => setFlashId(null), 1500);
          fetchLogs();
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [adminView]);

  const categories = ["all", "deposit", "withdrawal", "bet", "wager"];
  const filtered = logs.filter((l) => {
    if (filter !== "all" && !l.action_type.includes(filter)) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      l.action_type.toLowerCase().includes(q) ||
      (l.user_email || "").toLowerCase().includes(q)
    );
  });

  return (
    <Card className="animate-fade-in">
      <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-primary animate-pulse" />
            Wallet Activity
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Live stream of {adminView ? "all users' " : "your "}deposits, withdrawals and bets.
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {categories.map((c) => (
            <Badge
              key={c}
              variant={filter === c ? "default" : "outline"}
              className="cursor-pointer capitalize"
              onClick={() => setFilter(c)}
            >
              {c}
            </Badge>
          ))}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {adminView && (
          <Input
            placeholder="Search by email or action…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        )}
        <ScrollArea className="h-[500px] pr-2">
          {loading ? (
            <p className="text-muted-foreground text-center py-8">Loading…</p>
          ) : filtered.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No activity yet.</p>
          ) : (
            <div className="space-y-2">
              {filtered.map((l) => {
                const s = statusFor(l.action_type);
                const isInflow = s.tone === "in";
                const isOutflow = s.tone === "out";
                return (
                  <div
                    key={l.id}
                    className={`border rounded-lg p-3 flex items-center justify-between gap-3 flex-wrap transition-all duration-500 ${
                      flashId === l.id
                        ? "border-primary bg-primary/10 shadow-gold"
                        : ""
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-9 h-9 rounded-full flex items-center justify-center ${
                          isInflow
                            ? "bg-green-500/15 text-green-500"
                            : isOutflow
                            ? "bg-red-500/15 text-red-500"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {s.icon}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-sm">{s.label}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {adminView && l.user_email ? `${l.user_email} · ` : ""}
                          {format(new Date(l.created_at), "PPp")}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap justify-end">
                      <Badge
                        variant="outline"
                        className={
                          isInflow
                            ? "border-green-500/40 text-green-500"
                            : isOutflow
                            ? "border-red-500/40 text-red-500"
                            : ""
                        }
                      >
                        {isInflow ? "+" : isOutflow ? "-" : ""}₦
                        {Math.abs(Number(l.amount)).toLocaleString()}
                      </Badge>
                      <span className="text-xs font-mono text-muted-foreground">
                        ₦{Number(l.balance_after).toLocaleString()}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
