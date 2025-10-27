import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { User } from "@supabase/supabase-js";
import { format } from "date-fns";

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

interface Profile {
  balance: number;
}

export default function Dashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [bets, setBets] = useState<Bet[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
        fetchProfile(session.user.id);
        fetchBets(session.user.id);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
        fetchProfile(session.user.id);
        fetchBets(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const fetchProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("balance")
      .eq("id", userId)
      .single();

    if (error) {
      toast({
        title: "Error",
        description: "Failed to fetch profile",
        variant: "destructive",
      });
    } else {
      setProfile(data);
    }
    setLoading(false);
  };

  const fetchBets = async (userId: string) => {
    const { data, error } = await supabase
      .from("bets")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to fetch bets",
        variant: "destructive",
      });
    } else {
      setBets(data || []);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar balance={0} isAuthenticated={false} />
        <div className="flex items-center justify-center h-screen">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar 
        balance={profile?.balance || 0} 
        isAuthenticated={true}
        onLogout={handleLogout}
      />
      
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">My Dashboard</h1>
          <p className="text-muted-foreground">Welcome back, {user?.email}</p>
        </div>

        <div className="grid gap-6 md:grid-cols-3 mb-8">
          <Card className="p-6">
            <p className="text-sm text-muted-foreground mb-2">Current Balance</p>
            <p className="text-3xl font-bold text-accent">${profile?.balance.toFixed(2)}</p>
          </Card>
          <Card className="p-6">
            <p className="text-sm text-muted-foreground mb-2">Total Bets</p>
            <p className="text-3xl font-bold">{bets.length}</p>
          </Card>
          <Card className="p-6">
            <p className="text-sm text-muted-foreground mb-2">Pending Bets</p>
            <p className="text-3xl font-bold">
              {bets.filter(bet => bet.status === 'pending').length}
            </p>
          </Card>
        </div>

        <div>
          <h2 className="text-2xl font-bold mb-4">My Bets</h2>
          {bets.length === 0 ? (
            <Card className="p-8 text-center">
              <p className="text-muted-foreground">No bets placed yet</p>
            </Card>
          ) : (
            <div className="space-y-4">
              {bets.map((bet) => (
                <Card key={bet.id} className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <p className="font-bold text-lg">{bet.selection}</p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(bet.created_at), "MMM d, yyyy HH:mm")}
                      </p>
                      {bet.result === 'won' && (
                        <p className="text-lg font-bold text-green-500 mt-2">🎉 You Won!</p>
                      )}
                      {bet.result === 'lost' && (
                        <p className="text-sm text-red-500 mt-2">Better luck next time</p>
                      )}
                    </div>
                    <Badge variant={
                      bet.status === 'won' ? 'default' : 
                      bet.status === 'lost' ? 'destructive' : 
                      'secondary'
                    }>
                      {bet.status}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Odds</p>
                      <p className="font-bold text-accent">{bet.odds.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Stake</p>
                      <p className="font-bold">${bet.stake.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Potential Win</p>
                      <p className="font-bold text-accent">${bet.potential_win.toFixed(2)}</p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
