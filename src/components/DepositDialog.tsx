import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface DepositDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

declare global {
  interface Window {
    PaystackPop: any;
  }
}

const PAYSTACK_PUBLIC_KEY = "pk_live_c8520149d55a475c1759fd5b09f6d42fd901af2a";

export function DepositDialog({ open, onOpenChange, onSuccess }: DepositDialogProps) {
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const loadPaystackScript = () => {
    return new Promise((resolve, reject) => {
      if (window.PaystackPop) {
        resolve(window.PaystackPop);
        return;
      }

      const script = document.createElement("script");
      script.src = "https://js.paystack.co/v1/inline.js";
      script.async = true;
      script.onload = () => resolve(window.PaystackPop);
      script.onerror = reject;
      document.body.appendChild(script);
    });
  };

  const handleDeposit = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      toast({
        title: "Invalid amount",
        description: "Please enter a valid amount",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);

      // Get user info
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: profile } = await supabase
        .from("profiles")
        .select("email")
        .eq("id", user.id)
        .single();

      if (!profile) throw new Error("Profile not found");

      // Load Paystack script
      await loadPaystackScript();

      const handler = window.PaystackPop.setup({
        key: PAYSTACK_PUBLIC_KEY,
        email: profile.email,
        amount: Math.round(parseFloat(amount) * 100), // Convert to kobo
        currency: "NGN",
        ref: `DEP_${Date.now()}_${user.id.substring(0, 8)}`,
        callback: async function(response: any) {
          console.log('Paystack payment response:', response);
          
          try {
            // Verify and process the payment
            const { data, error } = await supabase.functions.invoke('verify-deposit', {
              body: { reference: response.reference }
            });

            if (error) throw error;

            if (data?.success) {
              toast({
                title: "Deposit successful!",
                description: `₦${data.amount.toFixed(2)} has been added to your balance.`,
              });
              onSuccess();
              onOpenChange(false);
              setAmount("");
            } else {
              throw new Error(data?.error || 'Payment verification failed');
            }
          } catch (error) {
            console.error('Verification error:', error);
            toast({
              title: "Verification failed",
              description: error instanceof Error ? error.message : "Please contact support if amount was deducted",
              variant: "destructive",
            });
          }
          
          setLoading(false);
        },
        onClose: function() {
          setLoading(false);
        },
      });

      handler.openIframe();
    } catch (error) {
      console.error("Deposit error:", error);
      toast({
        title: "Deposit failed",
        description: error instanceof Error ? error.message : "Failed to initialize payment",
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Deposit Funds</DialogTitle>
          <DialogDescription>
            Enter the amount you want to deposit. Payment will be processed via Paystack.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="amount">Amount (₦)</Label>
            <Input
              id="amount"
              type="number"
              placeholder="Enter amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              min="0"
              step="0.01"
            />
          </div>
          <Button 
            onClick={handleDeposit} 
            disabled={loading} 
            className="w-full"
            variant="bet"
          >
            {loading ? "Processing..." : "Deposit Now"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
