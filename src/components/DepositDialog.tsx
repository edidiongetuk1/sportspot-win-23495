import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Copy, Upload, CheckCircle } from "lucide-react";

interface DepositDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const BANK_ACCOUNT = "9128477187";
const BANK_NAME = "Opay Bank";

export function DepositDialog({ open, onOpenChange, onSuccess }: DepositDialogProps) {
  const [amount, setAmount] = useState("");
  const [receipt, setReceipt] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast({
      title: "Copied!",
      description: "Account number copied to clipboard",
    });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setReceipt(e.target.files[0]);
    }
  };

  const handleSubmit = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      toast({
        title: "Invalid amount",
        description: "Please enter a valid amount",
        variant: "destructive",
      });
      return;
    }

    if (!receipt) {
      toast({
        title: "Receipt required",
        description: "Please upload your payment receipt",
        variant: "destructive",
      });
      return;
    }

    try {
      setUploading(true);

      // Get user info
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Upload receipt to storage
      const fileExt = receipt.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('deposit-receipts')
        .upload(fileName, receipt);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('deposit-receipts')
        .getPublicUrl(fileName);

      // Create deposit receipt record
      const { data: receiptData, error: insertError } = await supabase
        .from('deposit_receipts')
        .insert({
          user_id: user.id,
          amount: parseFloat(amount),
          receipt_url: publicUrl,
          status: 'pending'
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // Trigger AI verification
      const { error: verifyError } = await supabase.functions.invoke('verify-deposit-receipt', {
        body: {
          receipt_url: publicUrl,
          amount: parseFloat(amount),
          receipt_id: receiptData.id
        }
      });

      if (verifyError) {
        console.error('AI verification error:', verifyError);
        // Don't throw - receipt is saved, admin can verify manually
      }

      toast({
        title: "Receipt submitted!",
        description: "Your deposit receipt is being verified. You'll be notified once approved.",
      });

      onSuccess();
      onOpenChange(false);
      setAmount("");
      setReceipt(null);
    } catch (error) {
      console.error("Upload error:", error);
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Failed to upload receipt",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Deposit Funds</DialogTitle>
          <DialogDescription>
            Transfer money to our bank account and upload your receipt for verification.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {/* Bank Details */}
          <div className="rounded-lg border border-border bg-muted/50 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Account Number</p>
                <p className="text-lg font-bold">{BANK_ACCOUNT}</p>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => copyToClipboard(BANK_ACCOUNT)}
              >
                {copied ? <CheckCircle className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Bank Name</p>
              <p className="font-semibold">{BANK_NAME}</p>
            </div>
          </div>

          {/* Amount Input */}
          <div className="space-y-2">
            <Label htmlFor="amount">Amount (₦)</Label>
            <Input
              id="amount"
              type="number"
              placeholder="Enter amount to deposit"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              min="0"
              step="0.01"
            />
          </div>

          {/* Receipt Upload */}
          <div className="space-y-2">
            <Label htmlFor="receipt">Upload Receipt</Label>
            <div className="flex items-center gap-2">
              <Input
                id="receipt"
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="flex-1"
              />
              {receipt && <CheckCircle className="h-5 w-5 text-green-500" />}
            </div>
            {receipt && (
              <p className="text-sm text-muted-foreground">
                Selected: {receipt.name}
              </p>
            )}
          </div>

          <Button 
            onClick={handleSubmit} 
            disabled={uploading} 
            className="w-full"
            variant="bet"
          >
            {uploading ? (
              <>
                <Upload className="mr-2 h-4 w-4 animate-pulse" />
                Uploading...
              </>
            ) : (
              "Submit Receipt"
            )}
          </Button>

          <p className="text-xs text-muted-foreground text-center">
            Your deposit will be credited after admin verification (usually within 24 hours)
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
