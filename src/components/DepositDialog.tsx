import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, CreditCard, Wallet } from "lucide-react";

interface DepositDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

type Provider = "flutterwave" | "paystack";

export function DepositDialog({ open, onOpenChange, onSuccess }: DepositDialogProps) {
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState<Provider | null>(null);
  const { toast } = useToast();

  const handlePay = async (provider: Provider) => {
    const amt = parseFloat(amount);
    if (!amt || amt < 100) {
      toast({ title: "Invalid amount", description: "Enter at least ₦100", variant: "destructive" });
      return;
    }

    try {
      setLoading(provider);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const callbackUrl = `${window.location.origin}/deposit-callback`;

      const { data, error } =
        provider === "paystack"
          ? await supabase.functions.invoke("paystack-initiate", {
              body: { amount: amt, callback_url: callbackUrl },
            })
          : await supabase.functions.invoke("flutterwave-initiate", {
              body: { amount: amt, redirect_url: callbackUrl },
            });

      if (error) throw error;
      if (!data?.link) throw new Error("No payment link returned");

      onSuccess();
      onOpenChange(false);
      setAmount("");
      window.location.href = data.link;
    } catch (e) {
      console.error("Deposit error:", e);
      toast({
        title: "Payment failed to start",
        description: e instanceof Error ? e.message : "Try again",
        variant: "destructive",
      });
    } finally {
      setLoading(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Deposit Funds</DialogTitle>
          <DialogDescription>
            Pay instantly with card, bank transfer, USSD or mobile money.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="amount">Amount (₦)</Label>
            <Input
              id="amount"
              type="number"
              placeholder="Enter amount to deposit"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              min="100"
              step="100"
            />
          </div>

          <div className="space-y-2">
            <Button
              onClick={() => handlePay("paystack")}
              disabled={loading !== null}
              className="w-full"
              variant="bet"
            >
              {loading === "paystack" ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Redirecting…
                </>
              ) : (
                <>
                  <CreditCard className="mr-2 h-4 w-4" />
                  Pay with Paystack
                </>
              )}
            </Button>

            <Button
              onClick={() => handlePay("flutterwave")}
              disabled={loading !== null}
              className="w-full"
              variant="outline"
            >
              {loading === "flutterwave" ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Redirecting…
                </>
              ) : (
                <>
                  <Wallet className="mr-2 h-4 w-4" />
                  Pay with Flutterwave
                </>
              )}
            </Button>
          </div>

          <p className="text-xs text-muted-foreground text-center">
            You'll be redirected to a secure checkout. Your balance is credited automatically after a successful payment.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
