import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, AlertTriangle, XCircle, HelpCircle, ShieldCheck, Loader2 } from "lucide-react";

interface Check {
  id: string;
  label: string;
  status: "ok" | "warn" | "fail" | "unknown";
  detail: string;
  fix?: string;
}

interface Result {
  ready: boolean;
  checks: Check[];
  availableBalance?: number;
  currency?: string;
  pendingPayoutTotal?: number;
  webhookUrl?: string;
}

const ICONS = {
  ok: { Icon: CheckCircle2, className: "text-green-500" },
  warn: { Icon: AlertTriangle, className: "text-yellow-500" },
  fail: { Icon: XCircle, className: "text-destructive" },
  unknown: { Icon: HelpCircle, className: "text-muted-foreground" },
} as const;

export function PaystackReadinessPanel() {
  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const runCheck = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("paystack-readiness");
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      setResult(data as Result);
    } catch (e) {
      toast({
        title: "Readiness check failed",
        description: e instanceof Error ? e.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="p-6 animate-fade-in">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-accent" />
            Payout Readiness
          </h2>
          <p className="text-sm text-muted-foreground">
            Verifies everything Paystack needs before an approval can actually pay a user.
          </p>
        </div>
        <Button onClick={runCheck} disabled={loading} variant="bet">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Run check"}
        </Button>
      </div>

      {result && (
        <>
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <Badge variant={result.ready ? "default" : "destructive"}>
              {result.ready ? "Ready to pay out" : "Not ready"}
            </Badge>
            {result.availableBalance !== undefined && (
              <span className="text-sm text-muted-foreground">
                Balance: {result.currency} {result.availableBalance.toFixed(2)}
              </span>
            )}
            {result.pendingPayoutTotal !== undefined && (
              <span className="text-sm text-muted-foreground">
                Pending: {result.currency} {result.pendingPayoutTotal.toFixed(2)}
              </span>
            )}
          </div>

          <div className="space-y-3">
            {result.checks.map((check) => {
              const { Icon, className } = ICONS[check.status];
              return (
                <div key={check.id} className="rounded-lg border border-border p-4">
                  <div className="flex items-start gap-3">
                    <Icon className={`h-5 w-5 shrink-0 mt-0.5 ${className}`} />
                    <div className="min-w-0">
                      <p className="font-semibold">{check.label}</p>
                      <p className="text-sm text-muted-foreground break-words">{check.detail}</p>
                      {check.fix && (
                        <p className="text-sm mt-1 text-accent break-words">→ {check.fix}</p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {!result && !loading && (
        <p className="text-sm text-muted-foreground py-4">
          Run the check to see transfers status, balance, OTP behaviour and webhook delivery.
        </p>
      )}
    </Card>
  );
}
