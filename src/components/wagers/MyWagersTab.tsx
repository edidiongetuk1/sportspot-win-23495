import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Upload, CheckCircle, Clock, XCircle } from "lucide-react";
import { format } from "date-fns";
import { UploadProofDialog } from "./UploadProofDialog";

interface MyWager {
  id: string;
  player_a_id: string;
  player_b_id: string | null;
  game_type: string;
  stake_amount: number;
  status: string;
  created_at: string;
  winner_id: string | null;
  wager_code: string;
}

interface MyWagersTabProps {
  userId?: string;
  onBalanceUpdate: () => void;
}

export const MyWagersTab = ({ userId, onBalanceUpdate }: MyWagersTabProps) => {
  const [myWagers, setMyWagers] = useState<MyWager[]>([]);
  const [uploadWagerId, setUploadWagerId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (userId) {
      fetchMyWagers();
    }
  }, [userId]);

  // Real-time subscription for wager updates
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel('my-wagers-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'mobile_wagers',
        },
        (payload) => {
          console.log('My wager update received:', payload);
          
          // Check if this wager involves the current user
          const isMyWager = payload.new?.player_a_id === userId || payload.new?.player_b_id === userId;
          if (!isMyWager) return;

          const newStatus = payload.new?.status;
          
          if (newStatus === 'completed') {
            const isWinner = payload.new?.winner_id === userId;
            toast({
              title: isWinner ? "🎉 You Won!" : "😔 You Lost",
              description: isWinner 
                ? "Winnings have been credited to your account!" 
                : "Better luck next time",
              variant: isWinner ? "default" : "destructive",
            });
            // Refresh balance
            onBalanceUpdate();
          } else if (newStatus === 'draw') {
            toast({
              title: "⚖️ Draw Declared",
              description: "50% of your stake has been refunded",
            });
            // Refresh balance
            onBalanceUpdate();
          } else if (newStatus === 'active') {
            toast({
              title: "Match Started!",
              description: "Your opponent has joined the wager",
            });
          }
          fetchMyWagers();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'wager_proofs',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          console.log('Wager proof update received:', payload);
          if (payload.eventType === 'UPDATE') {
            const status = payload.new?.status;
            if (status === 'approved') {
              toast({
                title: "✅ Proof Approved",
                description: "Admin has verified your screenshot",
              });
            } else if (status === 'rejected') {
              toast({
                title: "❌ Proof Rejected",
                description: payload.new?.admin_notes || "Please upload a clearer screenshot",
                variant: "destructive",
              });
            }
          }
          fetchMyWagers();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const fetchMyWagers = async () => {
    if (!userId) return;

    const { data, error } = await supabase
      .from("mobile_wagers")
      .select("*")
      .or(`player_a_id.eq.${userId},player_b_id.eq.${userId}`)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching my wagers:", error);
      toast({
        title: "Error loading your wagers",
        description: "Please refresh the page",
        variant: "destructive",
      });
      return;
    }

    if (data) {
      setMyWagers(data);
    }
  };


  const getStatusBadge = async (wager: MyWager) => {
    if (wager.status === "open") {
      return <Badge variant="secondary">Waiting for opponent</Badge>;
    }
    if (wager.status === "active") {
      // Check if user has already uploaded proof (get most recent)
      const { data, error } = await supabase
        .from("wager_proofs")
        .select("status")
        .eq("wager_id", wager.id)
        .eq("user_id", userId)
        .order("submitted_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error("Error checking proof status:", error);
      }

      if (data) {
        const statusText = data.status === "pending" ? "Proof submitted" : 
                          data.status === "ai_verified" ? "AI Verified" :
                          data.status === "ai_failed" ? "Needs manual review" :
                          data.status === "approved" ? "Approved - Awaiting result" :
                          data.status === "rejected" ? "Rejected" :
                          data.status;
        return <Badge variant="outline">{statusText}</Badge>;
      }
      return <Badge>Match in progress</Badge>;
    }
    if (wager.status === "pending_verification") {
      return <Badge variant="outline">Admin reviewing</Badge>;
    }
    if (wager.status === "draw") {
      return <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-700 dark:text-yellow-400">Draw - 50% Refunded</Badge>;
    }
    if (wager.status === "completed") {
      if (wager.winner_id === userId) {
        return <Badge className="bg-green-500">Won ✓</Badge>;
      } else {
        return <Badge variant="destructive">Lost ✗</Badge>;
      }
    }
    return <Badge>{wager.status}</Badge>;
  };

  const [statusBadges, setStatusBadges] = useState<{ [key: string]: JSX.Element }>({});

  useEffect(() => {
    const loadBadges = async () => {
      const badges: { [key: string]: JSX.Element } = {};
      for (const wager of myWagers) {
        badges[wager.id] = await getStatusBadge(wager);
      }
      setStatusBadges(badges);
    };
    if (myWagers.length > 0) {
      loadBadges();
    }
  }, [myWagers]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 mb-4">
        <h2 className="text-2xl font-bold">My Wagers</h2>
        <div className="bg-muted/50 p-4 rounded-lg border border-border">
          <h3 className="font-semibold text-sm mb-2">📸 How to Upload Results (AI Verified)</h3>
          <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
            <li>Create a wager or join one using the code</li>
            <li>Wait for both players to join (status: "Match in progress")</li>
            <li>Play your match</li>
            <li>Click "Upload Result" button that appears below</li>
            <li>Enter the game name and upload your screenshot</li>
            <li>AI will automatically verify and analyze your screenshot</li>
            <li>Admin will review and declare the winner</li>
          </ol>
        </div>
      </div>
      {myWagers.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">You haven't created or joined any wagers yet</p>
          <p className="text-sm text-muted-foreground mt-2">
            Go to "Open Wagers" tab to join or create your first wager
          </p>
        </Card>
      ) : (
        <div className="grid gap-4">
          {myWagers.map((wager) => (
            <Card key={wager.id} className="p-6 bg-gradient-card border-border">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex-1 space-y-2">
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-lg">{wager.game_type}</h3>
                      {statusBadges[wager.id]}
                    </div>
                    <Badge variant="outline" className="font-mono w-fit">
                      Code: {wager.wager_code}
                    </Badge>
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary">
                      Stake: ₦{Number(wager.stake_amount).toFixed(2)}
                    </Badge>
                    {wager.status === "completed" && wager.winner_id === userId && (
                      <Badge className="bg-green-500">
                        Won: ₦{(Number(wager.stake_amount) * 2).toFixed(2)}
                      </Badge>
                    )}
                    {wager.status === "draw" && (
                      <Badge variant="outline" className="bg-yellow-500/10">
                        Refunded: ₦{(Number(wager.stake_amount) * 0.5).toFixed(2)}
                      </Badge>
                    )}
                  </div>

                  <p className="text-sm text-muted-foreground">
                    Created {format(new Date(wager.created_at), "PPp")}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  {wager.status === "active" && (
                    <div className="flex flex-col gap-2">
                      <Button
                        variant="bet"
                        onClick={() => setUploadWagerId(wager.id)}
                        className="animate-pulse"
                      >
                        <Upload className="w-4 h-4 mr-2" />
                        Upload Result (AI Verify)
                      </Button>
                      <p className="text-xs text-muted-foreground text-center">
                        Screenshot will be AI verified
                      </p>
                    </div>
                  )}
                  {wager.status === "open" && (
                    <Badge variant="secondary">
                      Waiting for opponent to join
                    </Badge>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <UploadProofDialog
        wagerId={uploadWagerId}
        onClose={() => {
          setUploadWagerId(null);
          fetchMyWagers();
        }}
      />
    </div>
  );
};
