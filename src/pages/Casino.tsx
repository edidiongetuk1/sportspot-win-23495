import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { DepositDialog } from "@/components/DepositDialog";
import { useToast } from "@/hooks/use-toast";
import { User, Session } from "@supabase/supabase-js";
import { Plane, Dices, Castle, Apple, Zap } from "lucide-react";
import AviatorGame from "@/components/casino/AviatorGame";
import RouletteGame from "@/components/casino/RouletteGame";
import TowerGame from "@/components/casino/TowerGame";
import AppleFortuneGame from "@/components/casino/AppleFortuneGame";
import InstantVirtualsGame from "@/components/casino/InstantVirtualsGame";

const Casino = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [balance, setBalance] = useState(0);
  const [isAdmin, setIsAdmin] = useState(false);
  const [depositDialogOpen, setDepositDialogOpen] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          fetchProfile(session.user.id);
          checkAdminRole(session.user.id);
        } else {
          setBalance(0);
          setIsAdmin(false);
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
        checkAdminRole(session.user.id);
      }
    });

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

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setBalance(0);
  };

  const handleBalanceUpdate = (newBalance: number) => {
    setBalance(newBalance);
  };

  const games = [
    { id: "aviator", name: "Aviator", icon: Plane, color: "from-blue-500 to-cyan-500" },
    { id: "roulette", name: "Roulette", icon: Dices, color: "from-red-500 to-rose-500" },
    { id: "tower", name: "Tower Legend", icon: Castle, color: "from-purple-500 to-pink-500" },
    { id: "apple", name: "Apple of Fortune", icon: Apple, color: "from-green-500 to-emerald-500" },
    { id: "virtuals", name: "Instant Virtuals", icon: Zap, color: "from-amber-500 to-orange-500" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar 
        balance={balance} 
        isAuthenticated={!!user}
        onLogout={handleLogout}
        isAdmin={isAdmin}
        onDepositClick={() => setDepositDialogOpen(true)}
      />

      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            <span className="bg-gradient-primary bg-clip-text text-transparent">
              Casino Games
            </span>
          </h1>
          <p className="text-xl text-muted-foreground">
            Instant play, instant wins. Choose your fortune!
          </p>
        </div>

        <Tabs defaultValue="aviator" className="w-full">
          <TabsList className="w-full justify-start bg-card border border-border overflow-x-auto flex-wrap h-auto gap-2 p-2">
            {games.map(game => (
              <TabsTrigger 
                key={game.id} 
                value={game.id}
                className="flex items-center gap-2"
              >
                <game.icon className="w-4 h-4" />
                {game.name}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="aviator" className="mt-6">
            <AviatorGame 
              user={user} 
              balance={balance} 
              onBalanceUpdate={handleBalanceUpdate}
            />
          </TabsContent>

          <TabsContent value="roulette" className="mt-6">
            <RouletteGame 
              user={user} 
              balance={balance} 
              onBalanceUpdate={handleBalanceUpdate}
            />
          </TabsContent>

          <TabsContent value="tower" className="mt-6">
            <TowerGame 
              user={user} 
              balance={balance} 
              onBalanceUpdate={handleBalanceUpdate}
            />
          </TabsContent>

          <TabsContent value="apple" className="mt-6">
            <AppleFortuneGame 
              user={user} 
              balance={balance} 
              onBalanceUpdate={handleBalanceUpdate}
            />
          </TabsContent>

          <TabsContent value="virtuals" className="mt-6">
            <InstantVirtualsGame 
              user={user} 
              balance={balance} 
              onBalanceUpdate={handleBalanceUpdate}
            />
          </TabsContent>
        </Tabs>
      </div>

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
};

export default Casino;
