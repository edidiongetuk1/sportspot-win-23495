import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Clock } from "lucide-react";

const DepositCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [verifying, setVerifying] = useState(false);
  const [balance, setBalance] = useState<number | null>(null);
  const [credited, setCredited] = useState<number | null>(null);

  const paystackRef = searchParams.get("reference") || searchParams.get("trxref");

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }
      if (paystackRef) {
        setVerifying(true);
        try {
          const { data } = await supabase.functions.invoke("verify-deposit", {
            body: { reference: paystackRef },
          });
          if (typeof data?.amount === "number") setCredited(data.amount);
          if (typeof data?.newBalance === "number") {
            setBalance(data.newBalance);
          } else {
            const { data: profile } = await supabase
              .from("profiles").select("balance").eq("id", user.id).maybeSingle();
            if (profile) setBalance(Number(profile.balance));
          }
        } catch (e) {
          console.error("Verification error:", e);
        } finally {
          setVerifying(false);
        }
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const status = paystackRef && !verifying ? "successful" : searchParams.get("status");
  const txRef = searchParams.get("tx_ref") || paystackRef;




  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-md w-full p-6 space-y-6">
        {status === "successful" ? (
          <>
            <div className="flex flex-col items-center text-center space-y-4">
              <CheckCircle2 className="w-16 h-16 text-green-500" />
              <h1 className="text-2xl font-bold">Payment Received!</h1>
              <p className="text-muted-foreground">
                Your payment has been processed successfully. Your account will be credited automatically within a few moments.
              </p>
              {txRef && (
                <p className="text-sm text-muted-foreground">
                  Reference: {txRef}
                </p>
              )}
              <p className="text-xs text-muted-foreground border-t pt-4 mt-4">
                Please check your dashboard to confirm the balance update. If the balance is not updated within 5 minutes, please contact support.
              </p>
            </div>

            <Button className="w-full" onClick={() => navigate("/dashboard")}>
              Go to Dashboard
            </Button>
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
            <Button className="w-full" onClick={() => navigate("/dashboard")}>
              Return to Dashboard
            </Button>
          </>
        ) : (
          <>
            <div className="flex flex-col items-center text-center space-y-4">
              <Clock className="w-16 h-16 text-blue-500 animate-pulse" />
              <h1 className="text-2xl font-bold">Processing Payment</h1>
              <p className="text-muted-foreground">
                Please wait while we process your payment. This may take a few moments.
              </p>
            </div>
            <Button className="w-full" onClick={() => navigate("/dashboard")}>
              Return to Dashboard
            </Button>
          </>
        )}
      </Card>
    </div>
  );
};

export default DepositCallback;
