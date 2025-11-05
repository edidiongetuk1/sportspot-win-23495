import { supabase } from "@/integrations/supabase/client";

export interface AuditLogEntry {
  userId: string;
  actionType: 'deposit' | 'withdrawal' | 'bet_placed' | 'bet_won' | 'bet_lost' | 'wager_created' | 'wager_joined' | 'wager_won' | 'casino_bet' | 'casino_win';
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  referenceId?: string;
  referenceType?: 'bet' | 'wager' | 'withdrawal' | 'deposit' | 'casino_bet';
  metadata?: Record<string, any>;
}

/**
 * Creates an audit log entry for financial transactions
 * This should be called whenever a user's balance changes
 */
export const createAuditLog = async (entry: AuditLogEntry): Promise<void> => {
  try {
    const { error } = await supabase.from("audit_logs").insert({
      user_id: entry.userId,
      action_type: entry.actionType,
      amount: entry.amount,
      balance_before: entry.balanceBefore,
      balance_after: entry.balanceAfter,
      reference_id: entry.referenceId || null,
      reference_type: entry.referenceType || null,
      metadata: entry.metadata || null,
    });

    if (error) {
      console.error("Failed to create audit log:", error);
      // Don't throw - we don't want audit logging failures to break the main flow
    }
  } catch (error) {
    console.error("Error creating audit log:", error);
  }
};

/**
 * Fetches audit logs for a specific user
 */
export const fetchUserAuditLogs = async (userId: string, limit: number = 50) => {
  const { data, error } = await supabase
    .from("audit_logs")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Failed to fetch audit logs:", error);
    return [];
  }

  return data || [];
};