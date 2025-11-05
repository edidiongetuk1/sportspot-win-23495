import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";

interface AuditLog {
  id: string;
  action_type: string;
  amount: number;
  balance_before: number;
  balance_after: number;
  reference_type: string | null;
  metadata: any;
  created_at: string;
}

export const AuditLogsList = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      const { data, error } = await supabase
        .from("audit_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      setLogs(data || []);
    } catch (error) {
      console.error("Error fetching audit logs:", error);
      toast({
        title: "Error",
        description: "Failed to load transaction history",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getActionColor = (actionType: string) => {
    if (actionType.includes('won') || actionType === 'deposit' || actionType.includes('win')) {
      return 'bg-green-500';
    }
    if (actionType.includes('lost') || actionType === 'withdrawal' || actionType.includes('placed') || actionType.includes('created') || actionType.includes('joined')) {
      return 'bg-red-500';
    }
    return 'bg-blue-500';
  };

  const formatActionType = (actionType: string) => {
    return actionType
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  if (loading) {
    return <div>Loading transaction history...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Transaction History</CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px]">
          <div className="space-y-3">
            {logs.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No transactions yet</p>
            ) : (
              logs.map((log) => (
                <div
                  key={log.id}
                  className="border rounded-lg p-3 space-y-2"
                >
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
                      <p className={`text-lg font-semibold ${log.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {log.amount >= 0 ? '+' : ''}₦{Math.abs(log.amount).toLocaleString()}
                      </p>
                    </div>
                    <div className="text-right text-sm">
                      <p className="text-muted-foreground">
                        {new Date(log.created_at).toLocaleDateString()}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(log.created_at).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>

                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Balance:</span>
                    <span>
                      ₦{log.balance_before.toLocaleString()} → ₦{log.balance_after.toLocaleString()}
                    </span>
                  </div>

                  {log.metadata && Object.keys(log.metadata).length > 0 && (
                    <details className="text-xs">
                      <summary className="cursor-pointer text-muted-foreground">Details</summary>
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
  );
};