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
  onBalanceUpdate: (balance: number) => void;
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
      // Check if user has already uploaded proof
      const { data, error } = await supabase
        .from("wager_proofs")
        .select("status")
        .eq("wager_id", wager.id)
        .eq("user_id", userId)
        .maybeSingle();

      if (error) {
        console.error("Error checking proof status:", error);
      }

      if (data) {
        const statusText = data.status === "pending" ? "Proof submitted" : 
                          data.status === "ai_verified" ? "AI Verified" :
                          data.status === "ai_failed" ? "Needs manual review" :
                          data.status;
        return <Badge variant="outline">{statusText}</Badge>;
      }
      return <Badge>Match in progress</Badge>;
    }
    if (wager.status === "pending_verification") {
      return <Badge variant="outline">Pending verification</Badge>;
    }
    if (wager.status === "completed") {
      if (wager.winner_id === userId) {
        return <Badge className="bg-green-500">Won</Badge>;
      } else {
        return <Badge variant="destructive">Lost</Badge>;
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
      <h2 className="text-2xl font-bold">My Wagers</h2>
      {myWagers.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">You haven't created or joined any wagers yet</p>
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
                  </div>

                  <p className="text-sm text-muted-foreground">
                    Created {format(new Date(wager.created_at), "PPp")}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  {wager.status === "active" && (
                    <Button
                      variant="bet"
                      onClick={() => setUploadWagerId(wager.id)}
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Upload Result
                    </Button>
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
