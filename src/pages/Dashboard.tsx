import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { User } from "@supabase/supabase-js";
import { format } from "date-fns";
import { WithdrawalDialog } from "@/components/WithdrawalDialog";
import { DepositDialog } from "@/components/DepositDialog";
import { AuditLogsList } from "@/components/AuditLogsList";
import { WalletActivityLog } from "@/components/WalletActivityLog";

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

interface Wager {
  id: string;
  game_type: string;
  stake_amount: number;
  status: string;
  created_at: string;
  player_a_id: string;
  player_b_id: string | null;
  winner_id: string | null;
}

interface Transaction {
  id: string;
  type: string;
  amount: number;
  created_at: string;
  wager_id: string;
}

interface Profile {
  balance: number;
}

export default function Dashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [bets, setBets] = useState<Bet[]>([]);
  const [wagers, setWagers] = useState<Wager[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [withdrawalDialogOpen, setWithdrawalDialogOpen] = useState(false);
  const [depositDialogOpen, setDepositDialogOpen] = useState(false);
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
        fetchWagers(session.user.id);
        fetchTransactions(session.user.id);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
        fetchProfile(session.user.id);
        fetchBets(session.user.id);
        fetchWagers(session.user.id);
        fetchTransactions(session.user.id);
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

  const fetchWagers = async (userId: string) => {
    const { data, error } = await supabase
      .from("mobile_wagers")
      .select("*")
      .or(`player_a_id.eq.${userId},player_b_id.eq.${userId}`)
      .order("created_at", { ascending: false })
      .limit(10);

    if (error) {
      console.error("Failed to fetch wagers:", error);
    } else {
      setWagers(data || []);
    }
  };

  const fetchTransactions = async (userId: string) => {
    const { data, error } = await supabase
      .from("wager_transactions")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) {
      console.error("Failed to fetch transactions:", error);
    } else {
      setTransactions(data || []);
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
        onDepositClick={() => setDepositDialogOpen(true)}
      />
      
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">My Dashboard</h1>
          <p className="text-muted-foreground">Welcome back, {user?.email}</p>
        </div>

        <div className="grid gap-6 md:grid-cols-4 mb-8">
          <Card className="p-6">
            <p className="text-sm text-muted-foreground mb-2">Current Balance</p>
            <p className="text-3xl font-bold text-accent">₦{profile?.balance.toFixed(2)}</p>
            <div className="flex gap-2 mt-4">
              <Button
                size="sm"
                variant="bet"
                onClick={() => setDepositDialogOpen(true)}
                className="flex-1"
              >
                Deposit
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setWithdrawalDialogOpen(true)}
                className="flex-1"
              >
                Withdraw
              </Button>
            </div>
          </Card>
          <Card className="p-6">
            <p className="text-sm text-muted-foreground mb-2">Total Bets</p>
            <p className="text-3xl font-bold">{bets.length}</p>
          </Card>
          <Card className="p-6">
            <p className="text-sm text-muted-foreground mb-2">Active Wagers</p>
            <p className="text-3xl font-bold">
              {wagers.filter(w => w.status === 'open' || w.status === 'pending').length}
            </p>
          </Card>
          <Card className="p-6">
            <p className="text-sm text-muted-foreground mb-2">Pending Bets</p>
            <p className="text-3xl font-bold">
              {bets.filter(bet => bet.status === 'pending').length}
            </p>
          </Card>
        </div>

        <div className="mb-8">
          <WalletActivityLog />
        </div>

        <div className="mb-8">
          <AuditLogsList />
        </div>

        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-4">Active Wagers</h2>
          {wagers.length === 0 ? (
            <Card className="p-8 text-center">
              <p className="text-muted-foreground">No wagers yet</p>
            </Card>
          ) : (
            <div className="space-y-4">
              {wagers.slice(0, 5).map((wager) => (
                <Card key={wager.id} className="p-6">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-bold text-lg">{wager.game_type}</p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(wager.created_at), "MMM d, yyyy HH:mm")}
                      </p>
                    </div>
                    <Badge variant={
                      wager.status === 'completed' ? 
                        (wager.winner_id === user?.id ? 'default' : 'destructive') :
                      wager.status === 'draw' ? 'secondary' :
                      'outline'
                    }>
                      {wager.status === 'completed' && wager.winner_id === user?.id ? 'Won' :
                       wager.status === 'completed' ? 'Lost' :
                       wager.status === 'draw' ? 'Draw' :
                       wager.status}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Stake Amount</p>
                      <p className="font-bold">₦{wager.stake_amount.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Potential Win</p>
                      <p className="font-bold text-accent">₦{(wager.stake_amount * 2).toFixed(2)}</p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-4">Recent Transactions</h2>
          {transactions.length === 0 ? (
            <Card className="p-8 text-center">
              <p className="text-muted-foreground">No transactions yet</p>
            </Card>
          ) : (
            <div className="space-y-2">
              {transactions.map((transaction) => (
                <Card key={transaction.id} className="p-4">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <Badge variant={
                        transaction.type === 'win' || transaction.type === 'refund' ? 'default' :
                        transaction.type === 'stake' || transaction.type === 'loss' ? 'destructive' :
                        'secondary'
                      }>
                        {transaction.type}
                      </Badge>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(transaction.created_at), "MMM d, HH:mm")}
                      </p>
                    </div>
                    <p className={`font-bold ${
                      transaction.type === 'win' || transaction.type === 'refund' ? 'text-green-500' : 
                      transaction.type === 'stake' || transaction.type === 'loss' ? 'text-red-500' : 
                      ''
                    }`}>
                      {transaction.type === 'win' || transaction.type === 'refund' ? '+' : '-'}
                      ₦{Math.abs(transaction.amount).toFixed(2)}
                    </p>
                  </div>
                </Card>
              ))}
            </div>
          )}
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
                      <p className="font-bold">₦{bet.stake.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Potential Win</p>
                      <p className="font-bold text-accent">₦{bet.potential_win.toFixed(2)}</p>
                     </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>

      <WithdrawalDialog
        open={withdrawalDialogOpen}
        onOpenChange={setWithdrawalDialogOpen}
        balance={profile?.balance || 0}
        onSuccess={() => {
          if (user) {
            fetchProfile(user.id);
          }
        }}
      />

      <DepositDialog
        open={depositDialogOpen}
        onOpenChange={setDepositDialogOpen}
        onSuccess={() => {
          if (user) {
            fetchProfile(user.id);
          }
        }}
      />
    </div>
  );
}
