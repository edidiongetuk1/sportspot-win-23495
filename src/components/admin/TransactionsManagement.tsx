import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Download, Search, Filter } from "lucide-react";
import { format } from "date-fns";

interface AuditLog {
  id: string;
  user_id: string;
  action_type: string;
  amount: number;
  balance_before: number;
  balance_after: number;
  reference_type: string | null;
  reference_id: string | null;
  metadata: any;
  created_at: string;
}

interface Profile {
  id: string;
  email: string;
}

export const TransactionsManagement = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<AuditLog[]>([]);
  const [profiles, setProfiles] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Filters
  const [searchEmail, setSearchEmail] = useState("");
  const [actionTypeFilter, setActionTypeFilter] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [minAmount, setMinAmount] = useState("");
  const [maxAmount, setMaxAmount] = useState("");

  // Stats
  const [stats, setStats] = useState({
    totalDeposits: 0,
    totalWithdrawals: 0,
    totalBets: 0,
    totalWinnings: 0,
  });

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [logs, searchEmail, actionTypeFilter, startDate, endDate, minAmount, maxAmount]);

  const fetchData = async () => {
    try {
      // Fetch all audit logs
      const { data: logsData, error: logsError } = await supabase
        .from("audit_logs")
        .select("*")
        .order("created_at", { ascending: false });

      if (logsError) throw logsError;

      // Fetch all profiles
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("id, email");

      if (profilesError) throw profilesError;

      // Create a map of user_id to email
      const profileMap = new Map<string, string>();
      profilesData?.forEach((profile: Profile) => {
        profileMap.set(profile.id, profile.email);
      });

      setProfiles(profileMap);
      setLogs(logsData || []);
      calculateStats(logsData || []);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast({
        title: "Error",
        description: "Failed to load transactions",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (data: AuditLog[]) => {
    const totalDeposits = data
      .filter((log) => log.action_type === "deposit")
      .reduce((sum, log) => sum + Number(log.amount), 0);

    const totalWithdrawals = data
      .filter((log) => log.action_type === "withdrawal")
      .reduce((sum, log) => sum + Math.abs(Number(log.amount)), 0);

    const totalBets = data
      .filter((log) => log.action_type === "bet_placed" || log.action_type === "casino_bet")
      .reduce((sum, log) => sum + Math.abs(Number(log.amount)), 0);

    const totalWinnings = data
      .filter((log) => log.action_type === "bet_won" || log.action_type === "casino_win")
      .reduce((sum, log) => sum + Number(log.amount), 0);

    setStats({
      totalDeposits,
      totalWithdrawals,
      totalBets,
      totalWinnings,
    });
  };

  const applyFilters = () => {
    let filtered = [...logs];

    // Filter by email
    if (searchEmail) {
      filtered = filtered.filter((log) =>
        profiles.get(log.user_id)?.toLowerCase().includes(searchEmail.toLowerCase())
      );
    }

    // Filter by action type
    if (actionTypeFilter !== "all") {
      filtered = filtered.filter((log) => log.action_type === actionTypeFilter);
    }

    // Filter by date range
    if (startDate) {
      filtered = filtered.filter(
        (log) => new Date(log.created_at) >= new Date(startDate)
      );
    }
    if (endDate) {
      filtered = filtered.filter(
        (log) => new Date(log.created_at) <= new Date(endDate + "T23:59:59")
      );
    }

    // Filter by amount range
    if (minAmount) {
      filtered = filtered.filter(
        (log) => Math.abs(Number(log.amount)) >= Number(minAmount)
      );
    }
    if (maxAmount) {
      filtered = filtered.filter(
        (log) => Math.abs(Number(log.amount)) <= Number(maxAmount)
      );
    }

    setFilteredLogs(filtered);
    calculateStats(filtered);
  };

  const exportToCSV = () => {
    const headers = [
      "Date",
      "Time",
      "User Email",
      "Action Type",
      "Amount",
      "Balance Before",
      "Balance After",
      "Reference Type",
      "Payment Reference",
    ];

    const rows = filteredLogs.map((log) => [
      format(new Date(log.created_at), "yyyy-MM-dd"),
      format(new Date(log.created_at), "HH:mm:ss"),
      profiles.get(log.user_id) || "Unknown",
      log.action_type,
      log.amount,
      log.balance_before,
      log.balance_after,
      log.reference_type || "",
      log.metadata?.payment_reference || "",
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `transactions_${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    toast({
      title: "Success",
      description: `Exported ${filteredLogs.length} transactions`,
    });
  };

  const resetFilters = () => {
    setSearchEmail("");
    setActionTypeFilter("all");
    setStartDate("");
    setEndDate("");
    setMinAmount("");
    setMaxAmount("");
  };

  const getActionColor = (actionType: string) => {
    if (actionType.includes("won") || actionType === "deposit" || actionType.includes("win")) {
      return "bg-green-500";
    }
    if (actionType.includes("lost") || actionType === "withdrawal" || actionType.includes("placed") || actionType.includes("created") || actionType.includes("joined")) {
      return "bg-red-500";
    }
    return "bg-blue-500";
  };

  const formatActionType = (actionType: string) => {
    return actionType
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-muted-foreground">Loading transactions...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Deposits
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">
              ₦{stats.totalDeposits.toLocaleString()}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Withdrawals
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-red-600">
              ₦{stats.totalWithdrawals.toLocaleString()}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Bets
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              ₦{stats.totalBets.toLocaleString()}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Winnings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">
              ₦{stats.totalWinnings.toLocaleString()}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filters
            </CardTitle>
            <Button variant="outline" size="sm" onClick={resetFilters}>
              Reset Filters
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="search-email">User Email</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search-email"
                  placeholder="Search by email..."
                  value={searchEmail}
                  onChange={(e) => setSearchEmail(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="action-type">Action Type</Label>
              <Select value={actionTypeFilter} onValueChange={setActionTypeFilter}>
                <SelectTrigger id="action-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="deposit">Deposit</SelectItem>
                  <SelectItem value="withdrawal">Withdrawal</SelectItem>
                  <SelectItem value="bet_placed">Bet Placed</SelectItem>
                  <SelectItem value="bet_won">Bet Won</SelectItem>
                  <SelectItem value="bet_lost">Bet Lost</SelectItem>
                  <SelectItem value="casino_bet">Casino Bet</SelectItem>
                  <SelectItem value="casino_win">Casino Win</SelectItem>
                  <SelectItem value="wager_created">Wager Created</SelectItem>
                  <SelectItem value="wager_joined">Wager Joined</SelectItem>
                  <SelectItem value="wager_won">Wager Won</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="start-date">Start Date</Label>
              <Input
                id="start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="end-date">End Date</Label>
              <Input
                id="end-date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="min-amount">Min Amount (₦)</Label>
              <Input
                id="min-amount"
                type="number"
                placeholder="0"
                value={minAmount}
                onChange={(e) => setMinAmount(e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="max-amount">Max Amount (₦)</Label>
              <Input
                id="max-amount"
                type="number"
                placeholder="Any"
                value={maxAmount}
                onChange={(e) => setMaxAmount(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Transactions List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>
              All Transactions ({filteredLogs.length})
            </CardTitle>
            <Button onClick={exportToCSV} size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[600px]">
            <div className="space-y-3">
              {filteredLogs.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  No transactions found
                </p>
              ) : (
                filteredLogs.map((log) => (
                  <div key={log.id} className="border rounded-lg p-4 space-y-2">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge className={getActionColor(log.action_type)}>
                            {formatActionType(log.action_type)}
                          </Badge>
                          {log.reference_type && (
                            <span className="text-xs text-muted-foreground">
                              ({log.reference_type})
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {profiles.get(log.user_id) || "Unknown User"}
                        </p>
                        <p
                          className={`text-xl font-bold ${
                            log.amount >= 0 ? "text-green-600" : "text-red-600"
                          }`}
                        >
                          {log.amount >= 0 ? "+" : ""}₦
                          {Math.abs(Number(log.amount)).toLocaleString()}
                        </p>
                      </div>
                      <div className="text-right text-sm">
                        <p className="font-medium">
                          {format(new Date(log.created_at), "MMM d, yyyy")}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(log.created_at), "HH:mm:ss")}
                        </p>
                      </div>
                    </div>

                    <div className="flex justify-between text-sm border-t pt-2">
                      <span className="text-muted-foreground">Balance:</span>
                      <span>
                        ₦{Number(log.balance_before).toLocaleString()} → ₦
                        {Number(log.balance_after).toLocaleString()}
                      </span>
                    </div>

                    {log.metadata && Object.keys(log.metadata).length > 0 && (
                      <details className="text-xs">
                        <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                          View Details
                        </summary>
                        <pre className="mt-2 bg-muted p-2 rounded overflow-x-auto">
                          {JSON.stringify(log.metadata, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};