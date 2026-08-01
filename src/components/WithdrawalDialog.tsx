import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle2 } from "lucide-react";

interface WithdrawalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  balance: number;
  onSuccess: () => void;
}

interface Bank {
  name: string;
  code: string;
}

export const WithdrawalDialog = ({ open, onOpenChange, balance, onSuccess }: WithdrawalDialogProps) => {
  const [amount, setAmount] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [bankCode, setBankCode] = useState("");
  const [banks, setBanks] = useState<Bank[]>([]);
  const [loadingBanks, setLoadingBanks] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [accountName, setAccountName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const bankName = banks.find((b) => b.code === bankCode)?.name ?? "";

  useEffect(() => {
    if (!open || banks.length > 0) return;
    setLoadingBanks(true);
    supabase.functions
      .invoke("paystack-banks?action=banks", { method: "GET" })
      .then(({ data, error }) => {
        if (error || !data?.banks) throw error ?? new Error("Failed to load banks");
        setBanks(data.banks);
      })
      .catch(() => {
        toast({
          title: "Could not load banks",
          description: "Please close and reopen this dialog to try again.",
          variant: "destructive",
        });
      })
      .finally(() => setLoadingBanks(false));
  }, [open]);

  // Verify the account name once a valid account number + bank are chosen
  useEffect(() => {
    setAccountName("");
    if (accountNumber.length !== 10 || !bankCode) return;

    let cancelled = false;
    setResolving(true);
    const timer = setTimeout(() => {
      supabase.functions
        .invoke(
          `paystack-banks?action=resolve&account_number=${accountNumber}&bank_code=${bankCode}`,
          { method: "GET" }
        )
        .then(({ data, error }) => {
          if (cancelled) return;
          if (error || !data?.accountName) {
            setAccountName("");
            return;
          }
          setAccountName(data.accountName);
        })
        .finally(() => !cancelled && setResolving(false));
    }, 400);

    return () => {
      cancelled = true;
      clearTimeout(timer);
      setResolving(false);
    };
  }, [accountNumber, bankCode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const withdrawalAmount = Number(amount);

    if (!withdrawalAmount || withdrawalAmount <= 0) {
      toast({ title: "Invalid Amount", description: "Please enter a valid withdrawal amount", variant: "destructive" });
      return;
    }
    if (withdrawalAmount > balance) {
      toast({ title: "Insufficient Balance", description: "You don't have enough balance for this withdrawal", variant: "destructive" });
      return;
    }
    if (!/^\d{10}$/.test(accountNumber) || !bankCode) {
      toast({ title: "Missing Information", description: "Enter a valid 10-digit account number and select your bank", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.from("withdrawals").insert({
        user_id: user.id,
        amount: withdrawalAmount,
        account_number: accountNumber,
        bank_name: bankName,
        bank_code: bankCode,
      });

      if (error) throw error;

      toast({
        title: "Withdrawal Request Submitted",
        description: "Once an admin approves it, the payout is sent straight to your bank account.",
      });

      setAmount("");
      setAccountNumber("");
      setBankCode("");
      setAccountName("");
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error("Withdrawal error:", error);
      toast({
        title: "Withdrawal Failed",
        description: error instanceof Error ? error.message : "Failed to submit withdrawal request",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Withdraw Funds</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="amount">Amount (₦)</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Enter amount"
              className="mt-1"
            />
            <p className="text-sm text-muted-foreground mt-1">
              Available: ₦{balance.toLocaleString()}
            </p>
          </div>

          <div>
            <Label htmlFor="bank">Bank</Label>
            <Select value={bankCode} onValueChange={setBankCode}>
              <SelectTrigger id="bank" className="mt-1">
                <SelectValue placeholder={loadingBanks ? "Loading banks..." : "Select your bank"} />
              </SelectTrigger>
              <SelectContent className="max-h-64">
                {banks.map((bank) => (
                  <SelectItem key={bank.code} value={bank.code}>
                    {bank.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="accountNumber">Account Number</Label>
            <Input
              id="accountNumber"
              inputMode="numeric"
              maxLength={10}
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, "").slice(0, 10))}
              placeholder="10-digit account number"
              className="mt-1"
            />
            {resolving && (
              <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
                <Loader2 className="h-3 w-3 animate-spin" /> Verifying account...
              </p>
            )}
            {accountName && !resolving && (
              <p className="text-sm text-primary mt-1 flex items-center gap-1 animate-fade-in">
                <CheckCircle2 className="h-3 w-3" /> {accountName}
              </p>
            )}
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className="flex-1">
              {isSubmitting ? "Submitting..." : "Submit Request"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
