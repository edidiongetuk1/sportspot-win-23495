import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Withdrawal {
  id: string;
  amount: number;
  account_number: string;
  bank_name: string;
  bank_code: string | null;
  status: string;
  created_at: string;
  admin_notes: string | null;
  failure_reason: string | null;
  transfer_reference: string | null;
  profiles: {
    email: string;
    balance: number;
  };
}


export const WithdrawalManagement = () => {
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<Withdrawal | null>(null);
  const [action, setAction] = useState<'approve' | 'reject' | null>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [processing, setProcessing] = useState(false);
  const { toast } = useToast();

  const fetchWithdrawals = async () => {
    try {
      console.log("Fetching withdrawals...");
      
      // Fetch withdrawals
      const { data: withdrawalsData, error: withdrawalsError } = await supabase
        .from("withdrawals")
        .select("*")
        .order("created_at", { ascending: false });

      if (withdrawalsError) {
        console.error("Withdrawal fetch error:", withdrawalsError);
        throw withdrawalsError;
      }

      console.log("Withdrawals fetched:", withdrawalsData);

      // Fetch all user profiles
      const userIds = withdrawalsData?.map(w => w.user_id) || [];
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("id, email, balance")
        .in("id", userIds);

      if (profilesError) {
        console.error("Profiles fetch error:", profilesError);
        throw profilesError;
      }

      console.log("Profiles fetched:", profilesData);

      // Combine the data
      const combined = withdrawalsData?.map(withdrawal => ({
        ...withdrawal,
        profiles: profilesData?.find(p => p.id === withdrawal.user_id) || { email: "Unknown", balance: 0 }
      })) || [];

      console.log("Combined data:", combined);
      setWithdrawals(combined as any);
    } catch (error) {
      console.error("Error fetching withdrawals:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to load withdrawals",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWithdrawals();
  }, []);

  const handleAction = (withdrawal: Withdrawal, actionType: 'approve' | 'reject') => {
    setSelectedWithdrawal(withdrawal);
    setAction(actionType);
    setAdminNotes("");
  };

  const confirmAction = async () => {
    if (!selectedWithdrawal || !action) return;

    setProcessing(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error("Not authenticated");
      }

      const { data, error } = await supabase.functions.invoke('process-withdrawal', {
        body: {
          withdrawalId: selectedWithdrawal.id,
          action,
          adminNotes: adminNotes || null,
        },
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: data.message,
      });

      setSelectedWithdrawal(null);
      setAction(null);
      setAdminNotes("");
      fetchWithdrawals();
    } catch (error) {
      console.error("Error processing withdrawal:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to process withdrawal",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-500';
      case 'processing':
        return 'bg-blue-500';
      case 'approved':
        return 'bg-green-500';
      case 'rejected':
      case 'failed':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };


  if (loading) {
    return <div>Loading withdrawals...</div>;
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Withdrawal Requests</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {withdrawals.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No withdrawal requests</p>
            ) : (
              withdrawals.map((withdrawal) => (
                <div
                  key={withdrawal.id}
                  className="border rounded-lg p-4 space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold">{withdrawal.profiles.email}</p>
                        <Badge className={getStatusColor(withdrawal.status)}>
                          {withdrawal.status}
                        </Badge>
                      </div>
                      <p className="text-2xl font-bold">₦{Number(withdrawal.amount).toLocaleString()}</p>
                      <p className="text-sm text-muted-foreground">
                        Current Balance: ₦{Number(withdrawal.profiles.balance).toLocaleString()}
                      </p>
                    </div>
                    <div className="text-right text-sm text-muted-foreground">
                      {new Date(withdrawal.created_at).toLocaleDateString()}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Bank:</span>
                      <p className="font-medium">{withdrawal.bank_name}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Account:</span>
                      <p className="font-medium">{withdrawal.account_number}</p>
                    </div>
                  </div>

                  {withdrawal.admin_notes && (
                    <div className="bg-muted p-2 rounded text-sm">
                      <span className="text-muted-foreground">Admin Notes:</span>
                      <p>{withdrawal.admin_notes}</p>
                    </div>
                  )}

                  {withdrawal.failure_reason && (
                    <div className="bg-destructive/10 text-destructive p-2 rounded text-sm">
                      <span className="opacity-80">Payout issue:</span>
                      <p>{withdrawal.failure_reason}</p>
                    </div>
                  )}

                  {withdrawal.status === 'processing' && (
                    <p className="text-sm text-muted-foreground">
                      Payout sent to the bank — awaiting confirmation.
                    </p>
                  )}


                  {withdrawal.status === 'pending' && (
                    <div className="flex gap-2 pt-2">
                      <Button
                        size="sm"
                        onClick={() => handleAction(withdrawal, 'approve')}
                        className="flex-1"
                      >
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleAction(withdrawal, 'reject')}
                        className="flex-1"
                      >
                        Reject
                      </Button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={!!selectedWithdrawal && !!action} onOpenChange={() => {
        setSelectedWithdrawal(null);
        setAction(null);
        setAdminNotes("");
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {action === 'approve' ? 'Approve' : 'Reject'} Withdrawal
            </AlertDialogTitle>
            <AlertDialogDescription>
              {action === 'approve' 
                ? `This sends ₦${selectedWithdrawal?.amount.toLocaleString()} automatically to ${selectedWithdrawal?.bank_name} • ${selectedWithdrawal?.account_number} (${selectedWithdrawal?.profiles.email}). The balance is debited immediately and refunded automatically if the payout fails.`
                : `Reject withdrawal request from ${selectedWithdrawal?.profiles.email}?`
              }

            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="py-4">
            <Label htmlFor="adminNotes">Admin Notes (Optional)</Label>
            <Textarea
              id="adminNotes"
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              placeholder="Add notes about this decision..."
              className="mt-2"
            />
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={processing}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmAction} disabled={processing}>
              {processing ? 'Processing...' : 'Confirm'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};