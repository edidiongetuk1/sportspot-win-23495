import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, XCircle, Eye } from "lucide-react";
import { format } from "date-fns";

interface WagerProof {
  id: string;
  wager_id: string;
  user_id: string;
  screenshot_url: string;
  status: string;
  submitted_at: string;
  admin_notes: string | null;
  game_name: string | null;
  ai_verification_result: {
    players_detected?: string[];
    score?: string;
    confidence?: string;
    details?: string;
    is_valid_proof?: boolean;
    reason?: string;
  } | null;
  verified_at: string | null;
}

interface WagerDetails {
  id: string;
  game_type: string;
  stake_amount: number;
  player_a_id: string;
  player_b_id: string;
  status: string;
  wager_code: string;
}

interface ProofWithDetails extends WagerProof {
  wager: WagerDetails;
  profiles: {
    email: string;
  };
}

export const AdminVerificationPanel = () => {
  const [pendingProofs, setPendingProofs] = useState<ProofWithDetails[]>([]);
  const [selectedProof, setSelectedProof] = useState<string | null>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    fetchPendingProofs();
    
    // Set up realtime subscription
    const channel = supabase
      .channel('wager-proofs-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'wager_proofs'
        },
        (payload) => {
          console.log('Proof update received:', payload);
          if (payload.eventType === 'INSERT') {
            toast({
              title: "🔔 New Proof Submitted",
              description: "A user has uploaded a new wager result",
            });
          }
          fetchPendingProofs();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchPendingProofs = async () => {
    const { data, error } = await supabase
      .from("wager_proofs")
      .select(`
        *,
        mobile_wagers!wager_id(*)
      `)
      .in("status", ["pending", "ai_verified", "ai_failed"])
      .order("submitted_at", { ascending: true });

    if (error) {
      console.error("Error fetching pending proofs:", error);
      toast({
        title: "Error loading proofs",
        description: error.message || "Please refresh the page",
        variant: "destructive",
      });
      return;
    }

    if (data) {
      // Fetch user emails separately
      const userIds = data.map(p => p.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, email")
        .in("id", userIds);

      // Combine the data
      const proofsWithDetails = data.map(proof => ({
        ...proof,
        wager: proof.mobile_wagers,
        profiles: profiles?.find(p => p.id === proof.user_id) || { email: 'Unknown' }
      }));

      setPendingProofs(proofsWithDetails as any);
    }
  };

  const handleVerifyProof = async (proofId: string, wagerId: string, userId: string, approved: boolean) => {
    try {
      // Update proof status
      const { error: proofError } = await supabase
        .from("wager_proofs")
        .update({
          status: approved ? "approved" : "rejected",
          admin_notes: adminNotes || null,
          verified_at: new Date().toISOString(),
        })
        .eq("id", proofId);

      if (proofError) {
        console.error("Proof update error:", proofError);
        throw proofError;
      }

      if (approved) {
        // Get wager details
        const { data: wager, error: wagerError } = await supabase
          .from("mobile_wagers")
          .select("*")
          .eq("id", wagerId)
          .single();

        if (wagerError) {
          console.error("Wager fetch error:", wagerError);
          throw wagerError;
        }

        // Check if both players have submitted approved proofs
        const { data: allProofs, error: proofsError } = await supabase
          .from("wager_proofs")
          .select("*")
          .eq("wager_id", wagerId)
          .eq("status", "approved");

        if (proofsError) {
          console.error("Proofs fetch error:", proofsError);
          throw proofsError;
        }

        // If both proofs approved, need to determine winner
        if (allProofs && allProofs.length === 2) {
          toast({
            title: "Both proofs approved",
            description: "Review both screenshots to determine the winner",
          });
        } else {
          // Update wager status to pending_verification
          await supabase
            .from("mobile_wagers")
            .update({ status: "pending_verification" })
            .eq("id", wagerId);
        }
      }

      toast({
        title: approved ? "Proof approved" : "Proof rejected",
        description: approved 
          ? "The proof has been verified" 
          : "The proof has been rejected",
      });

      fetchPendingProofs();
      setAdminNotes("");
      setSelectedProof(null);
    } catch (error: any) {
      console.error("Verify proof error:", error);
      toast({
        title: "Error",
        description: error?.message || "Failed to update proof status",
        variant: "destructive",
      });
    }
  };

  const handleDeclareWinner = async (wagerId: string, winnerId: string) => {
    try {
      // Get wager details
      const { data: wager, error: wagerError } = await supabase
        .from("mobile_wagers")
        .select("*")
        .eq("id", wagerId)
        .single();

      if (wagerError) throw wagerError;

      // Update wager with winner
      const { error: updateError } = await supabase
        .from("mobile_wagers")
        .update({
          winner_id: winnerId,
          status: "completed",
        })
        .eq("id", wagerId);

      if (updateError) throw updateError;

      // Calculate winnings (stake * 2)
      const winnings = Number(wager.stake_amount) * 2;

      // Get winner's current balance
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("balance")
        .eq("id", winnerId)
        .single();

      if (profileError) throw profileError;

      // Update winner's balance
      const { error: balanceError } = await supabase
        .from("profiles")
        .update({ balance: Number(profile.balance) + winnings })
        .eq("id", winnerId);

      if (balanceError) throw balanceError;

      // Record transaction
      await supabase.from("wager_transactions").insert({
        wager_id: wagerId,
        user_id: winnerId,
        type: "win",
        amount: winnings,
      });

      toast({
        title: "Winner declared!",
        description: `₦${winnings.toFixed(2)} has been credited to the winner`,
      });

      fetchPendingProofs();
    } catch (error) {
      console.error("Error declaring winner:", error);
      toast({
        title: "Error",
        description: "Failed to declare winner",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Pending Verifications</h2>
      
      {pendingProofs.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">No pending verifications</p>
        </Card>
      ) : (
        <div className="grid gap-4">
          {pendingProofs.map((proof) => (
            <Card key={proof.id} className="p-6 bg-gradient-card border-border">
                <div className="space-y-4">
                <div className="flex flex-col md:flex-row justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-lg">{proof.wager.game_type}</h3>
                      <Badge variant="secondary">
                        Code: {proof.wager.wager_code}
                      </Badge>
                    </div>
                    
                    <div className="flex gap-2 flex-wrap">
                      <Badge variant="outline">
                        Stake: ₦{Number(proof.wager.stake_amount).toFixed(2)}
                      </Badge>
                      <Badge className={
                        proof.status === 'ai_verified' ? 'bg-green-500' :
                        proof.status === 'ai_failed' ? 'bg-red-500' : ''
                      }>
                        {proof.status}
                      </Badge>
                      {proof.game_name && (
                        <Badge variant="outline">
                          Game: {proof.game_name}
                        </Badge>
                      )}
                    </div>

                    <p className="text-sm text-muted-foreground">
                      Submitted by: {proof.profiles.email}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(proof.submitted_at), "PPp")}
                    </p>

                    {/* AI Verification Results */}
                    {proof.ai_verification_result && (
                      <div className="mt-3 p-3 bg-muted rounded-lg space-y-2">
                        <p className="font-semibold text-sm">AI Analysis:</p>
                        <div className="text-xs space-y-1">
                          {proof.ai_verification_result.score && (
                            <p><strong>Score:</strong> {proof.ai_verification_result.score}</p>
                          )}
                          {proof.ai_verification_result.players_detected && proof.ai_verification_result.players_detected.length > 0 && (
                            <p><strong>Players:</strong> {proof.ai_verification_result.players_detected.join(", ")}</p>
                          )}
                          {proof.ai_verification_result.confidence && (
                            <p><strong>Confidence:</strong> 
                              <Badge variant={
                                proof.ai_verification_result.confidence === 'high' ? 'default' :
                                proof.ai_verification_result.confidence === 'medium' ? 'secondary' : 'destructive'
                              } className="ml-2">
                                {proof.ai_verification_result.confidence}
                              </Badge>
                            </p>
                          )}
                          {proof.ai_verification_result.details && (
                            <p><strong>Details:</strong> {proof.ai_verification_result.details}</p>
                          )}
                          {proof.ai_verification_result.reason && (
                            <p className="text-muted-foreground italic">{proof.ai_verification_result.reason}</p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(proof.screenshot_url, "_blank")}
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      View Screenshot
                    </Button>
                  </div>
                </div>

                {selectedProof === proof.id && (
                  <div className="space-y-3 border-t pt-4">
                    <Textarea
                      placeholder="Admin notes (optional)"
                      value={adminNotes}
                      onChange={(e) => setAdminNotes(e.target.value)}
                      rows={3}
                    />
                    <div className="flex gap-2">
                      <Button
                        variant="default"
                        onClick={() => handleVerifyProof(proof.id, proof.wager_id, proof.user_id, true)}
                        className="bg-green-500 hover:bg-green-600"
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Approve
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={() => handleVerifyProof(proof.id, proof.wager_id, proof.user_id, false)}
                      >
                        <XCircle className="w-4 h-4 mr-2" />
                        Reject
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setSelectedProof(null);
                          setAdminNotes("");
                        }}
                      >
                        Cancel
                      </Button>
                    </div>

                    <div className="space-y-2 border-t pt-3">
                      <p className="font-semibold">Declare Winner:</p>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleDeclareWinner(proof.wager_id, proof.wager.player_a_id)}
                        >
                          Player A Wins
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleDeclareWinner(proof.wager_id, proof.wager.player_b_id)}
                        >
                          Player B Wins
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {selectedProof !== proof.id && (
                  <Button
                    variant="bet"
                    onClick={() => setSelectedProof(proof.id)}
                  >
                    Review & Verify
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
