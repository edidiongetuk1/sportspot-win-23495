import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, XCircle, Eye, AlertCircle } from "lucide-react";
import { createAuditLog } from "@/lib/auditLogger";

interface DepositReceipt {
  id: string;
  user_id: string;
  amount: number;
  receipt_url: string;
  status: string;
  ai_verification_result: any;
  admin_notes: string | null;
  submitted_at: string;
  profiles: {
    email: string;
  };
}

export function DepositVerificationPanel() {
  const [pendingReceipts, setPendingReceipts] = useState<DepositReceipt[]>([]);
  const [selectedReceipt, setSelectedReceipt] = useState<string | null>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const { toast } = useToast();

  const fetchPendingReceipts = async () => {
    const { data, error } = await supabase
      .from('deposit_receipts')
      .select('*')
      .in('status', ['pending', 'ai_verified', 'ai_failed'])
      .order('submitted_at', { ascending: false });

    if (error) {
      console.error('Error fetching receipts:', error);
      return;
    }

    // Fetch user emails separately
    const receiptsWithProfiles = await Promise.all(
      (data || []).map(async (receipt) => {
        const { data: profile } = await supabase
          .from('profiles')
          .select('email')
          .eq('id', receipt.user_id)
          .single();
        
        return {
          ...receipt,
          profiles: { email: profile?.email || 'Unknown' }
        };
      })
    );

    setPendingReceipts(receiptsWithProfiles);
  };

  useEffect(() => {
    fetchPendingReceipts();

    const channel = supabase
      .channel('deposit-receipts-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'deposit_receipts'
        },
        () => {
          fetchPendingReceipts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleApprove = async (receipt: DepositReceipt) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Get current user balance
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('balance')
        .eq('id', receipt.user_id)
        .single();

      if (profileError) throw profileError;

      const balanceBefore = parseFloat(profile.balance.toString());
      const balanceAfter = balanceBefore + parseFloat(receipt.amount.toString());

      // Update user balance
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ balance: balanceAfter })
        .eq('id', receipt.user_id);

      if (updateError) throw updateError;

      // Create audit log
      await createAuditLog({
        userId: receipt.user_id,
        actionType: 'deposit',
        amount: parseFloat(receipt.amount.toString()),
        balanceBefore,
        balanceAfter,
        referenceId: receipt.id,
        referenceType: 'deposit',
        metadata: {
          admin_approved_by: user.id,
          admin_notes: adminNotes
        }
      });

      // Update receipt status
      const { error: receiptError } = await supabase
        .from('deposit_receipts')
        .update({
          status: 'approved',
          admin_notes: adminNotes,
          approved_at: new Date().toISOString(),
          approved_by: user.id
        })
        .eq('id', receipt.id);

      if (receiptError) throw receiptError;

      toast({
        title: "Deposit approved",
        description: `₦${receipt.amount} credited to user's account`,
      });

      setSelectedReceipt(null);
      setAdminNotes("");
      fetchPendingReceipts();
    } catch (error) {
      console.error('Approval error:', error);
      toast({
        title: "Approval failed",
        description: error instanceof Error ? error.message : "Failed to approve deposit",
        variant: "destructive",
      });
    }
  };

  const handleReject = async (receiptId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from('deposit_receipts')
        .update({
          status: 'rejected',
          admin_notes: adminNotes,
          approved_by: user.id
        })
        .eq('id', receiptId);

      if (error) throw error;

      toast({
        title: "Deposit rejected",
        description: "User has been notified",
      });

      setSelectedReceipt(null);
      setAdminNotes("");
      fetchPendingReceipts();
    } catch (error) {
      console.error('Rejection error:', error);
      toast({
        title: "Rejection failed",
        description: error instanceof Error ? error.message : "Failed to reject deposit",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline">Pending</Badge>;
      case 'ai_verified':
        return <Badge className="bg-blue-500">AI Verified</Badge>;
      case 'ai_failed':
        return <Badge variant="destructive">AI Failed</Badge>;
      case 'approved':
        return <Badge className="bg-green-500">Approved</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  if (pendingReceipts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No Pending Verifications</CardTitle>
          <CardDescription>All deposit receipts have been processed</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Pending Deposit Verifications</CardTitle>
          <CardDescription>Review and approve deposit receipts</CardDescription>
        </CardHeader>
      </Card>

      {pendingReceipts.map((receipt) => (
        <Card key={receipt.id}>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-lg">₦{receipt.amount.toFixed(2)}</CardTitle>
                <CardDescription>
                  From: {receipt.profiles.email}
                  <br />
                  Submitted: {new Date(receipt.submitted_at).toLocaleString()}
                </CardDescription>
              </div>
              {getStatusBadge(receipt.status)}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(receipt.receipt_url, '_blank')}
                className="w-full"
              >
                <Eye className="mr-2 h-4 w-4" />
                View Receipt
              </Button>
            </div>

            {receipt.ai_verification_result && (
              <div className="rounded-lg border border-border bg-muted/50 p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  <p className="text-sm font-semibold">AI Verification Results</p>
                </div>
                <div className="text-xs space-y-1">
                  <p><strong>Amount Detected:</strong> ₦{receipt.ai_verification_result.amount_detected || 'N/A'}</p>
                  <p><strong>Account:</strong> {receipt.ai_verification_result.account_number || 'N/A'}</p>
                  <p><strong>Bank:</strong> {receipt.ai_verification_result.bank_name || 'N/A'}</p>
                  <p><strong>Confidence:</strong> {receipt.ai_verification_result.confidence || 'N/A'}</p>
                  <p><strong>Reason:</strong> {receipt.ai_verification_result.reason || 'N/A'}</p>
                </div>
              </div>
            )}

            {selectedReceipt === receipt.id && (
              <div className="space-y-3 pt-3 border-t">
                <div className="space-y-2">
                  <Label htmlFor={`notes-${receipt.id}`}>Admin Notes (Optional)</Label>
                  <Textarea
                    id={`notes-${receipt.id}`}
                    placeholder="Add notes about this verification..."
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    rows={3}
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => handleApprove(receipt)}
                    className="flex-1 bg-green-600 hover:bg-green-700"
                  >
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Approve & Credit
                  </Button>
                  <Button
                    onClick={() => handleReject(receipt.id)}
                    variant="destructive"
                    className="flex-1"
                  >
                    <XCircle className="mr-2 h-4 w-4" />
                    Reject
                  </Button>
                </div>
                <Button
                  onClick={() => {
                    setSelectedReceipt(null);
                    setAdminNotes("");
                  }}
                  variant="ghost"
                  className="w-full"
                >
                  Cancel
                </Button>
              </div>
            )}

            {selectedReceipt !== receipt.id && (
              <Button
                onClick={() => setSelectedReceipt(receipt.id)}
                variant="outline"
                className="w-full"
              >
                Verify This Deposit
              </Button>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
