import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { MatchCard } from "@/components/MatchCard";
import { BetSlip } from "@/components/BetSlip";
import { MyBetsTab } from "@/components/MyBetsTab";
import { UploadBetSlipDialog } from "@/components/UploadBetSlipDialog";
import { DepositDialog } from "@/components/DepositDialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { User, Session } from "@supabase/supabase-js";
import heroImage from "@/assets/hero-sports.jpg";
import { format } from "date-fns";
import { Upload } from "lucide-react";
interface Bet {
  id: string;
  matchId: string;
  selection: string;
  odds: number;
}
interface Match {
  id: string;
  team1: string;
  team2: string;
  competition: string;
  match_date: string;
  odds_team1_win: number;
  odds_draw: number;
  odds_team2_win: number;
  status: string;
}
const Index = () => {
  const [bets, setBets] = useState<Bet[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [balance, setBalance] = useState(0);
  const [matches, setMatches] = useState<Match[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [depositDialogOpen, setDepositDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("football");
  const navigate = useNavigate();
  const {
    toast
  } = useToast();
  useEffect(() => {
    fetchMatches();

    // Set up auth state listener
    const {
      data: {
        subscription
      }
    } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
        checkAdminRole(session.user.id);
      } else {
        setBalance(0);
        setIsAdmin(false);
      }
    });

    // Check for existing session
    supabase.auth.getSession().then(({
      data: {
        session
      }
    }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
        checkAdminRole(session.user.id);
      }
    });
    return () => subscription.unsubscribe();
  }, []);
  const fetchMatches = async () => {
    const {
      data,
      error
    } = await supabase.from("matches").select("*").eq("status", "upcoming").order("match_date", {
      ascending: true
    });
    if (!error && data) {
      setMatches(data);
    }
  };
  const fetchProfile = async (userId: string) => {
    const {
      data,
      error
    } = await supabase.from("profiles").select("balance").eq("id", userId).single();
    if (!error && data) {
      setBalance(data.balance);
    }
  };
  const checkAdminRole = async (userId: string) => {
    const {
      data
    } = await supabase.from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").single();
    setIsAdmin(!!data);
  };
  const handleBetClick = (matchId: string, selection: string, odds: number) => {
    const betId = `${matchId}-${selection}`;
    const existingBet = bets.find(bet => bet.id === betId);
    if (existingBet) {
      setBets(bets.filter(bet => bet.id !== betId));
    } else {
      setBets([...bets, {
        id: betId,
        matchId,
        selection,
        odds
      }]);
    }
  };
  const handleRemoveBet = (id: string) => {
    setBets(bets.filter(bet => bet.id !== id));
  };
  const handleClearAll = () => {
    setBets([]);
  };
  const handlePlaceBet = async (stake: number) => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please log in to place bets",
        variant: "destructive"
      });
      navigate("/auth");
      return;
    }
    if (stake > balance) {
      toast({
        title: "Insufficient balance",
        description: "You don't have enough funds",
        variant: "destructive"
      });
      return;
    }
    const totalOdds = bets.reduce((acc, bet) => acc * bet.odds, 1);
    const potentialWin = stake * totalOdds;
    try {
      // Insert all bets
      const betPromises = bets.map(bet => supabase.from("bets").insert({
        user_id: user.id,
        match_id: bet.matchId,
        selection: bet.selection,
        odds: bet.odds,
        stake: stake / bets.length,
        potential_win: potentialWin / bets.length,
        status: "pending"
      }));
      await Promise.all(betPromises);

      // Update balance
      const newBalance = balance - stake;
      await supabase.from("profiles").update({
        balance: newBalance
      }).eq("id", user.id);
      setBalance(newBalance);
      setBets([]);
      toast({
        title: "Bet placed!",
        description: `Your bet has been placed. Potential win: ₦${potentialWin.toFixed(2)}`
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to place bet",
        variant: "destructive"
      });
    }
  };
  const handleLogout = async () => {
    await supabase.auth.signOut();
    setBalance(0);
    setBets([]);
  };
  return <div className="min-h-screen bg-background">
      <Navbar balance={balance} isAuthenticated={!!user} onLogout={handleLogout} isAdmin={isAdmin} onDepositClick={() => setDepositDialogOpen(true)} />

      {/* Hero Section — Elite Noir Gold */}
      <section className="relative">
        <div className="container mx-auto px-4 pt-10 md:pt-16 pb-10">
          <div className="relative overflow-hidden rounded-[2.5rem] bg-card border border-border shadow-card">
            {/* Ambient gold glow */}
            <div className="absolute -top-24 -left-24 w-[28rem] h-[28rem] bg-primary/10 blur-[120px] rounded-full pointer-events-none" />
            <div className="absolute -bottom-32 -right-24 w-[28rem] h-[28rem] bg-primary/5 blur-[120px] rounded-full pointer-events-none" />

            <div className="relative p-8 md:p-14 flex flex-col md:flex-row md:items-end justify-between gap-10">
              <div className="space-y-5 max-w-xl">
                <div className="flex items-center gap-3">
                  <div className="h-px w-10 bg-primary" />
                  <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">
                    Exclusive Markets
                  </span>
                </div>
                <h1 className="font-display text-5xl md:text-7xl font-extrabold text-foreground tracking-tighter leading-[0.95]">
                  Sport<span className="text-primary">Spot</span>
                </h1>
                <p className="text-muted-foreground text-base md:text-lg leading-relaxed max-w-md">
                  The continent's most advanced betting engine. Live, fast, and secure.
                </p>
                <div className="flex flex-wrap gap-3 pt-2">
                  <Button variant="bet" size="lg" className="font-bold uppercase tracking-widest text-xs">
                    Start Betting
                  </Button>
                  <Button variant="outline" size="lg" className="font-bold uppercase tracking-widest text-xs border-border hover:border-primary hover:text-primary">
                    View Live
                  </Button>
                </div>
              </div>

              {/* Featured in-play ticker */}
              <div className="flex flex-col items-start md:items-end">
                <div className="text-[10px] font-bold text-muted-foreground uppercase mb-3 tracking-[0.25em]">
                  Featured In-Play
                </div>
                <div className="bg-background/70 backdrop-blur-md border border-border rounded-2xl p-4 flex items-center gap-4 md:gap-6">
                  <div className="text-center">
                    <div className="font-display text-lg font-bold text-foreground tracking-tight">ARS</div>
                    <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-tight">Arsenal</div>
                  </div>
                  <div className="font-mono text-xl font-black text-primary">2.45</div>
                  <div className="text-muted-foreground/50 font-bold italic text-xs">VS</div>
                  <div className="font-mono text-xl font-black text-primary">3.10</div>
                  <div className="text-center">
                    <div className="font-display text-lg font-bold text-foreground tracking-tight">MCI</div>
                    <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-tight">Man City</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Matches Section */}
          <div className="lg:col-span-2 space-y-6">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="w-full justify-start bg-card border border-border overflow-x-auto">
                <TabsTrigger value="football">Football</TabsTrigger>
                <TabsTrigger value="my-bets">My Bets</TabsTrigger>
                <TabsTrigger value="basketball">Basketball</TabsTrigger>
                <TabsTrigger value="tennis">Tennis</TabsTrigger>
                <TabsTrigger value="live">Live Now</TabsTrigger>
                <TabsTrigger value="casino" onClick={() => navigate("/casino")}>🎰 Casino</TabsTrigger>
              </TabsList>

              <TabsContent value="football" className="space-y-4 mt-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold">Featured Matches</h2>
                  {user && <Button variant="bet" onClick={() => setIsUploadDialogOpen(true)} className="gap-2">
                      <Upload className="w-4 h-4" />
                      Upload Bet Slip
                    </Button>}
                </div>
                {matches.length === 0 ? <p className="text-muted-foreground">No matches available</p> : <div className="grid gap-4">
                    {matches.map(match => <MatchCard key={match.id} homeTeam={match.team1} awayTeam={match.team2} homeOdds={Number(match.odds_team1_win)} drawOdds={Number(match.odds_draw)} awayOdds={Number(match.odds_team2_win)} startTime={format(new Date(match.match_date), "HH:mm")} league={match.competition} isLive={false} onBetClick={(team, odds) => handleBetClick(match.id, team, odds)} />)}
                  </div>}
              </TabsContent>

              <TabsContent value="my-bets" className="space-y-4 mt-6">
                <MyBetsTab userId={user?.id} />
              </TabsContent>

              <TabsContent value="basketball" className="space-y-4 mt-6">
                <h2 className="text-2xl font-bold">Basketball Matches</h2>
                <p className="text-muted-foreground">No matches available</p>
              </TabsContent>

              <TabsContent value="tennis" className="space-y-4 mt-6">
                <h2 className="text-2xl font-bold">Tennis Matches</h2>
                <p className="text-muted-foreground">No matches available</p>
              </TabsContent>

              <TabsContent value="live" className="space-y-4 mt-6">
                <h2 className="text-2xl font-bold">Live Matches</h2>
                <p className="text-muted-foreground">No live matches</p>
              </TabsContent>
            </Tabs>
          </div>

          {/* Bet Slip Section */}
          <div className="lg:col-span-1">
            <BetSlip bets={bets} onRemoveBet={handleRemoveBet} onClearAll={handleClearAll} onPlaceBet={handlePlaceBet} userBalance={balance} />
          </div>
        </div>
      </div>

      <UploadBetSlipDialog isOpen={isUploadDialogOpen} onClose={() => setIsUploadDialogOpen(false)} onUploadComplete={() => {
      setActiveTab("my-bets");
    }} />

      <DepositDialog
        open={depositDialogOpen}
        onOpenChange={setDepositDialogOpen}
        onSuccess={() => {
          if (user) {
            fetchProfile(user.id);
          }
        }}
      />
    </div>;
};
export default Index;