import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { RefreshCw, Clock, Loader2, CheckCircle2, XCircle } from "lucide-react";

interface Withdrawal {
  id: string;
  amount: number;
  account_number: string;
  bank_name: string;
  status: string;
  admin_notes: string | null;
  failure_reason: string | null;
  created_at: string;
  updated_at: string;
  approved_at: string | null;
  processed_at: string | null;
}

const STATUS_META: Record<
  string,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline"; Icon: typeof Clock; hint: string }
> = {
  pending: {
    label: "Pending",
    variant: "outline",
    Icon: Clock,
    hint: "Waiting for admin review.",
  },
  processing: {
    label: "Processing",
    variant: "secondary",
    Icon: Loader2,
    hint: "Payout sent to the bank — awaiting confirmation.",
  },
  approved: {
    label: "Completed",
    variant: "default",
    Icon: CheckCircle2,
    hint: "Money has been sent to your bank account.",
  },
  failed: {
    label: "Failed",
    variant: "destructive",
    Icon: XCircle,
    hint: "Payout failed — your balance was refunded.",
  },
  rejected: {
    label: "Rejected",
    variant: "destructive",
    Icon: XCircle,
    hint: "Request was declined by an admin.",
  },
};

const maskAccount = (acct: string) => (acct?.length > 4 ? `••••${acct.slice(-4)}` : acct);

export function WithdrawalStatusList() {
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchWithdrawals = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from("withdrawals")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(15);
    setWithdrawals((data as Withdrawal[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchWithdrawals();
    const channel = supabase
      .channel("withdrawal-status")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "withdrawals" },
        () => fetchWithdrawals()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchWithdrawals]);

  return (
    <Card className="p-6 animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-2xl font-bold">Withdrawal Status</h2>
          <p className="text-sm text-muted-foreground">Live payout tracking for your requests</p>
        </div>
        <Button variant="ghost" size="icon" onClick={fetchWithdrawals} aria-label="Refresh withdrawals">
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground py-6 text-center">Loading…</p>
      ) : withdrawals.length === 0 ? (
        <p className="text-sm text-muted-foreground py-6 text-center">No withdrawal requests yet</p>
      ) : (
        <div className="space-y-3">
          {withdrawals.map((w) => {
            const meta = STATUS_META[w.status] ?? {
              label: w.status,
              variant: "outline" as const,
              Icon: Clock,
              hint: "",
            };
            const lastEvent = w.processed_at ?? w.approved_at ?? w.updated_at ?? w.created_at;
            return (
              <div
                key={w.id}
                className="rounded-lg border border-border p-4 hover:border-accent/50 transition-colors animate-fade-in"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-bold text-lg">₦{Number(w.amount).toFixed(2)}</p>
                    <p className="text-sm text-muted-foreground">
                      {w.bank_name} · {maskAccount(w.account_number)}
                    </p>
                  </div>
                  <Badge variant={meta.variant} className="flex items-center gap-1">
                    <meta.Icon className={`h-3 w-3 ${w.status === "processing" ? "animate-spin" : ""}`} />
                    {meta.label}
                  </Badge>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <p className="text-muted-foreground">Requested</p>
                    <p className="font-medium">{format(new Date(w.created_at), "MMM d, yyyy HH:mm")}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Last update</p>
                    <p className="font-medium">{format(new Date(lastEvent), "MMM d, yyyy HH:mm")}</p>
                  </div>
                </div>

                {meta.hint && <p className="mt-2 text-xs text-muted-foreground">{meta.hint}</p>}
                {w.failure_reason && (
                  <p className="mt-2 text-xs text-destructive">Reason: {w.failure_reason}</p>
                )}
                {w.admin_notes && (
                  <p className="mt-1 text-xs text-muted-foreground">Note: {w.admin_notes}</p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
