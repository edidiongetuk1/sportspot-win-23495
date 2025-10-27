import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";

const DepositCallback = () => {
  const [searchParams] = useSearchParams();
  const [amount, setAmount] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [user, setUser] = useState<any>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
      return;
    }
    setUser(user);
  };

  const handleConfirmDeposit = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      toast({
        title: "Invalid amount",
        description: "Please enter a valid deposit amount",
        variant: "destructive",
      });
      return;
    }

    if (!user) return;

    setIsProcessing(true);

    try {
      // Get current balance
      const { data: profile } = await supabase
        .from("profiles")
        .select("balance")
        .eq("id", user.id)
        .single();

      if (!profile) {
        throw new Error("Profile not found");
      }

      const newBalance = Number(profile.balance) + Number(amount);

      // Update balance
      const { error } = await supabase
        .from("profiles")
        .update({ balance: newBalance })
        .eq("id", user.id);

      if (error) throw error;

      toast({
        title: "Deposit successful!",
        description: `$${amount} has been added to your balance`,
      });

      navigate("/dashboard");
    } catch (error) {
      console.error("Deposit error:", error);
      toast({
        title: "Deposit failed",
        description: "Failed to process your deposit. Please contact support.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const status = searchParams.get("status");
  const txRef = searchParams.get("tx_ref");
  const transactionId = searchParams.get("transaction_id");

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-md w-full p-6 space-y-6">
        {status === "successful" ? (
          <>
            <div className="flex flex-col items-center text-center space-y-4">
              <CheckCircle2 className="w-16 h-16 text-green-500" />
              <h1 className="text-2xl font-bold">Payment Successful!</h1>
              <p className="text-muted-foreground">
                Your payment has been processed successfully.
              </p>
              {txRef && (
                <p className="text-sm text-muted-foreground">
                  Reference: {txRef}
                </p>
              )}
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Enter Deposit Amount
                </label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  min="0"
                  step="0.01"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Please enter the amount you deposited
                </p>
              </div>

              <Button
                className="w-full"
                onClick={handleConfirmDeposit}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  "Confirm & Add to Balance"
                )}
              </Button>
            </div>
          </>
        ) : status === "cancelled" ? (
          <>
            <div className="flex flex-col items-center text-center space-y-4">
              <XCircle className="w-16 h-16 text-destructive" />
              <h1 className="text-2xl font-bold">Payment Cancelled</h1>
              <p className="text-muted-foreground">
                Your payment was cancelled. No charges were made.
              </p>
            </div>
            <Button className="w-full" onClick={() => navigate("/")}>
              Return to Home
            </Button>
          </>
        ) : (
          <>
            <div className="flex flex-col items-center text-center space-y-4">
              <h1 className="text-2xl font-bold">Confirm Your Deposit</h1>
              <p className="text-muted-foreground">
                If you've completed your payment, please enter the deposit amount below
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Deposit Amount
                </label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  min="0"
                  step="0.01"
                />
              </div>

              <Button
                className="w-full"
                onClick={handleConfirmDeposit}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  "Confirm Deposit"
                )}
              </Button>

              <Button
                variant="outline"
                className="w-full"
                onClick={() => navigate("/")}
              >
                Cancel
              </Button>
            </div>
          </>
        )}
      </Card>
    </div>
  );
};

export default DepositCallback;
