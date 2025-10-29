import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { User } from "@supabase/supabase-js";
import { CreateWagerDialog } from "@/components/wagers/CreateWagerDialog";
import { WagerCard } from "@/components/wagers/WagerCard";
import { MyWagersTab } from "@/components/wagers/MyWagersTab";
import { AdminVerificationPanel } from "@/components/wagers/AdminVerificationPanel";
import { Trophy, Target } from "lucide-react";

interface Wager {
  id: string;
  player_a_id: string;
  player_b_id: string | null;
  game_type: string;
  stake_amount: number;
  status: string;
  created_at: string;
  expires_at: string;
  wager_code: string;
}

const MobileWagers = () => {
  const [user, setUser] = useState<User | null>(null);
  const [balance, setBalance] = useState(0);
  const [openWagers, setOpenWagers] = useState<Wager[]>([]);
  const [filteredWagers, setFilteredWagers] = useState<Wager[]>([]);
  const [searchCode, setSearchCode] = useState("");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null);
        if (session?.user) {
          fetchProfile(session.user.id);
          checkAdminRole(session.user.id);
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
        checkAdminRole(session.user.id);
      }
    });

    fetchOpenWagers();

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("balance")
      .eq("id", userId)
      .single();

    if (!error && data) {
      setBalance(data.balance);
    }
  };

  const checkAdminRole = async (userId: string) => {
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .single();

    setIsAdmin(!!data);
  };

  const fetchOpenWagers = async () => {
    const { data, error } = await supabase
      .from("mobile_wagers")
      .select("*")
      .eq("status", "open")
      .order("created_at", { ascending: false });

    if (!error && data) {
      setOpenWagers(data);
      setFilteredWagers(data);
    }
  };

  useEffect(() => {
    if (searchCode.trim() === "") {
      setFilteredWagers(openWagers);
    } else {
      const filtered = openWagers.filter(wager => 
        wager.wager_code.toLowerCase().includes(searchCode.toLowerCase())
      );
      setFilteredWagers(filtered);
    }
  }, [searchCode, openWagers]);

  const handleJoinWager = async (wagerId: string, stakeAmount: number, code: string) => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please log in to join wagers",
        variant: "destructive",
      });
      navigate("/auth");
      return;
    }

    if (stakeAmount > balance) {
      toast({
        title: "Insufficient balance",
        description: "You don't have enough funds",
        variant: "destructive",
      });
      return;
    }

    try {
      // Update wager status
      const { error: wagerError } = await supabase
        .from("mobile_wagers")
        .update({ 
          player_b_id: user.id,
          status: "active"
        })
        .eq("id", wagerId);

      if (wagerError) throw wagerError;

      // Deduct stake from balance
      const newBalance = balance - stakeAmount;
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ balance: newBalance })
        .eq("id", user.id);

      if (profileError) throw profileError;

      setBalance(newBalance);
      fetchOpenWagers();

      toast({
        title: "Wager joined!",
        description: "Play your match and upload the result screenshot",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to join wager",
        variant: "destructive",
      });
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar 
        balance={balance} 
        isAuthenticated={!!user}
        onLogout={handleLogout}
        isAdmin={isAdmin}
      />

      {/* Hero Section */}
      <div className="bg-gradient-to-r from-primary/20 via-primary/10 to-background py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center space-y-4">
            <Trophy className="w-16 h-16 mx-auto text-primary" />
            <h1 className="text-4xl md:text-5xl font-bold">
              <span className="bg-gradient-primary bg-clip-text text-transparent">
                Mobile Wagers
              </span>
            </h1>
            <p className="text-xl text-muted-foreground">
              Challenge other players to 1v1 matches and win real money
            </p>
            <div className="flex gap-4 justify-center">
              <Button 
                variant="bet" 
                size="lg"
                onClick={() => setShowCreateDialog(true)}
                disabled={!user}
              >
                <Target className="w-4 h-4 mr-2" />
                Create Wager
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <Tabs defaultValue="open" className="w-full">
          <TabsList className="w-full justify-start bg-card border border-border mb-6">
            <TabsTrigger value="open">Open Wagers</TabsTrigger>
            <TabsTrigger value="mywagers">My Wagers</TabsTrigger>
            {isAdmin && <TabsTrigger value="admin">Admin Panel</TabsTrigger>}
          </TabsList>

          <TabsContent value="open" className="space-y-4">
            <div className="flex flex-col md:flex-row gap-4 mb-6">
              <div className="flex-1">
                <h2 className="text-2xl font-bold mb-2">Available Wagers</h2>
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Search by code..."
                  value={searchCode}
                  onChange={(e) => setSearchCode(e.target.value)}
                  className="max-w-xs"
                />
              </div>
            </div>
            {filteredWagers.length === 0 ? (
              <Card className="p-8 text-center">
                <p className="text-muted-foreground">
                  {searchCode ? "No wagers found with that code" : "No open wagers available"}
                </p>
                <Button 
                  className="mt-4"
                  onClick={() => setShowCreateDialog(true)}
                  disabled={!user}
                >
                  Create First Wager
                </Button>
              </Card>
            ) : (
              <div className="grid gap-4">
                {filteredWagers.map((wager) => (
                  <WagerCard
                    key={wager.id}
                    wager={wager}
                    currentUserId={user?.id}
                    onJoin={handleJoinWager}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="mywagers">
            <MyWagersTab userId={user?.id} onBalanceUpdate={setBalance} />
          </TabsContent>

          {isAdmin && (
            <TabsContent value="admin">
              <AdminVerificationPanel />
            </TabsContent>
          )}
        </Tabs>
      </div>

      <CreateWagerDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        userBalance={balance}
        onWagerCreated={() => {
          fetchOpenWagers();
          if (user) fetchProfile(user.id);
        }}
      />
    </div>
  );
};

export default MobileWagers;
