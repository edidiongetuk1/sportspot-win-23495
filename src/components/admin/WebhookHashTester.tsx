import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle2, XCircle, Loader2, Copy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const WEBHOOK_URL = `https://jophhthiyefsorepgdoz.supabase.co/functions/v1/flutterwave-webhook`;

interface Result {
  matches: boolean;
  expected_configured: boolean;
  expected_length: number;
  candidate_length: number;
  secret_key_configured: boolean;
  preview_hint: string;
}

export function WebhookHashTester() {
  const [candidate, setCandidate] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const { toast } = useToast();

  const run = async () => {
    if (!candidate.trim()) {
      toast({ title: "Enter a hash", description: "Paste the Secret hash from Flutterwave.", variant: "destructive" });
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("test-webhook-hash", {
        body: { candidate: candidate.trim() },
      });
      if (error) throw error;
      setResult(data as Result);
    } catch (e) {
      toast({
        title: "Test failed",
        description: e instanceof Error ? e.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const copy = (v: string) => {
    navigator.clipboard.writeText(v);
    toast({ title: "Copied" });
  };

  return (
    <div className="space-y-6">
      <Card className="p-6 space-y-4">
        <div>
          <h2 className="text-2xl font-bold">Verify Flutterwave Webhook</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Confirm the Secret hash in your Flutterwave dashboard matches the one saved in the backend before making a deposit.
          </p>
        </div>

        <div className="space-y-2">
          <Label>Webhook URL (set this in Flutterwave)</Label>
          <div className="flex gap-2">
            <Input readOnly value={WEBHOOK_URL} className="font-mono text-xs" />
            <Button variant="outline" size="icon" onClick={() => copy(WEBHOOK_URL)}>
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="hash">Secret hash from Flutterwave</Label>
          <Input
            id="hash"
            value={candidate}
            onChange={(e) => setCandidate(e.target.value)}
            placeholder="Paste the exact value you saved in Flutterwave → Settings → Webhooks"
            className="font-mono"
          />
          <p className="text-xs text-muted-foreground">
            The value is checked server-side against <code>FLUTTERWAVE_WEBHOOK_HASH</code>. Nothing is stored.
          </p>
        </div>

        <Button onClick={run} disabled={loading} variant="bet">
          {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Checking…</> : "Run test"}
        </Button>
      </Card>

      {result && (
        <Card className="p-6 space-y-3">
          <div className="flex items-center gap-3">
            {result.matches ? (
              <><CheckCircle2 className="h-6 w-6 text-green-500" /><span className="font-bold text-green-500">Hashes match — deposits will credit automatically.</span></>
            ) : (
              <><XCircle className="h-6 w-6 text-destructive" /><span className="font-bold text-destructive">Mismatch — webhook will reject with 401.</span></>
            )}
          </div>
          <div className="text-sm space-y-1 text-muted-foreground">
            <div>Backend hash configured: {result.expected_configured ? "yes" : "no"}</div>
            <div>Backend hash length: {result.expected_length} · pasted length: {result.candidate_length}</div>
            <div>Backend hint: <code>{result.preview_hint}</code></div>
            <div>Flutterwave secret key configured: {result.secret_key_configured ? "yes" : "no"}</div>
          </div>
          {!result.matches && (
            <p className="text-xs text-muted-foreground border-t pt-3">
              Fix: open Flutterwave → Settings → Webhooks, copy the Secret hash exactly, then update the <code>FLUTTERWAVE_WEBHOOK_HASH</code> secret in the backend with that same value.
            </p>
          )}
        </Card>
      )}
    </div>
  );
}
