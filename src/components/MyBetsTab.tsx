import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ExternalLink } from "lucide-react";

interface Bet {
  id: string;
  match_id: string;
  selection: string;
  odds: number;
  stake: number;
  potential_win: number;
  status: string;
  result: string | null;
  created_at: string;
}

interface MyBetsTabProps {
  userId?: string;
}

export const MyBetsTab = ({ userId }: MyBetsTabProps) => {
  const [bets, setBets] = useState<Bet[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    if (userId) {
      fetchMyBets();
    }
  }, [userId]);

  const fetchMyBets = async () => {
    if (!userId) return;

    const { data, error } = await supabase
      .from("bets")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching bets:", error);
      toast({
        title: "Error loading your bets",
        description: "Please refresh the page",
        variant: "destructive",
      });
      return;
    }

    if (data) {
      setBets(data);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="secondary">Pending</Badge>;
      case "won":
        return <Badge className="bg-green-500">Won</Badge>;
      case "lost":
        return <Badge variant="destructive">Lost</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const isUploadedBet = (matchId: string) => {
    return matchId.startsWith("uploaded_");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">My Bets</h2>
        <Badge variant="outline">{bets.length} Total Bets</Badge>
      </div>

      {bets.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">You haven't placed any bets yet</p>
          <p className="text-sm text-muted-foreground mt-2">
            Place bets on matches or upload your bet slips
          </p>
        </Card>
      ) : (
        <div className="grid gap-4">
          {bets.map((bet) => (
            <Card key={bet.id} className="p-6 bg-gradient-card border-border">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-lg">{bet.selection}</h3>
                    {getStatusBadge(bet.status)}
                    {isUploadedBet(bet.match_id) && (
                      <Badge variant="outline">📸 Uploaded</Badge>
                    )}
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary">
                      Stake: ₦{Number(bet.stake).toFixed(2)}
                    </Badge>
                    <Badge variant="outline">
                      Odds: {Number(bet.odds).toFixed(2)}
                    </Badge>
                    <Badge className="bg-primary/20">
                      Potential Win: ₦{Number(bet.potential_win).toFixed(2)}
                    </Badge>
                  </div>

                  <p className="text-sm text-muted-foreground">
                    Placed {format(new Date(bet.created_at), "PPp")}
                  </p>

                  {bet.result && isUploadedBet(bet.match_id) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => window.open(bet.result!, "_blank")}
                      className="mt-2"
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      View Screenshot
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};