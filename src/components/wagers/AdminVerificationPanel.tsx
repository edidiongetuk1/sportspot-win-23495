import { useEffect, useState } from "react";
import { format } from "date-fns";
import { AlertTriangle, ExternalLink, ImageIcon, ShieldCheck, Trophy, UserRound } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

interface VerificationResult {
  players_detected?: string[];
  score?: string;
  confidence?: string;
  details?: string;
  is_valid_proof?: boolean;
  reason?: string;
}

interface WagerProof {
  id: string;
  wager_id: string;
  user_id: string;
  screenshot_url: string;
  status: string;
  submitted_at: string;
  admin_notes: string | null;
  game_name: string | null;
  ai_verification_result: VerificationResult | null;
  verified_at: string | null;
}

interface ReviewWager {
  id: string;
  game_type: string;
  stake_amount: number;
  player_a_id: string;
  player_b_id: string | null;
  status: string;
  wager_code: string;
  created_at: string;
}

interface ProfileSummary {
  id: string;
  email: string;
}

interface ReviewItem {
  wager: ReviewWager;
  playerA: ProfileSummary;
  playerB: ProfileSummary | null;
  proofs: WagerProof[];
}

interface PendingSettlement {
  wagerId: string;
  winnerId: string;
  winnerEmail: string;
  gameType: string;
  payout: number;
}

const unknownProfile = (id: string): ProfileSummary => ({ id, email: "Unknown player" });
const isZeroZero = (score?: string) => !!score && /^\s*0\s*[-:]\s*0\s*$/.test(score);

export const AdminVerificationPanel = () => {
  const [reviewItems, setReviewItems] = useState<ReviewItem[]>([]);
  const [notesByWager, setNotesByWager] = useState<Record<string, string>>({});
  const [pendingSettlement, setPendingSettlement] = useState<PendingSettlement | null>(null);
  const [settlingWagerId, setSettlingWagerId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchReviewItems();

    const channel = supabase
      .channel("admin-wager-proof-review")
      .on("postgres_changes", { event: "*", schema: "public", table: "wager_proofs" }, (payload) => {
        if (payload.eventType === "INSERT") {
          toast({ title: "New proof submitted", description: "Review the attached wager result before settlement." });
        }
        fetchReviewItems();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "mobile_wagers" }, () => fetchReviewItems())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchReviewItems = async () => {
    const { data: wagers, error: wagersError } = await supabase
      .from("mobile_wagers")
      .select("id, game_type, stake_amount, player_a_id, player_b_id, status, wager_code, created_at")
      .in("status", ["active", "pending_verification"])
      .order("created_at", { ascending: false });

    if (wagersError) {
      toast({ title: "Error loading wager reviews", description: wagersError.message, variant: "destructive" });
      return;
    }

    const wagerRows = (wagers || []).filter((wager) => wager.player_b_id);
    const wagerIds = wagerRows.map((wager) => wager.id);

    if (wagerIds.length === 0) {
      setReviewItems([]);
      return;
    }

    const [{ data: proofs, error: proofsError }, { data: profiles, error: profilesError }] = await Promise.all([
      supabase
        .from("wager_proofs")
        .select("id, wager_id, user_id, screenshot_url, status, submitted_at, admin_notes, game_name, ai_verification_result, verified_at")
        .in("wager_id", wagerIds)
        .order("submitted_at", { ascending: false }),
      supabase
        .from("profiles")
        .select("id, email")
        .in("id", Array.from(new Set(wagerRows.flatMap((wager) => [wager.player_a_id, wager.player_b_id].filter(Boolean))))),
    ]);

    if (proofsError) {
      toast({ title: "Error loading proof attachments", description: proofsError.message, variant: "destructive" });
      return;
    }

    if (profilesError) {
      toast({ title: "Error loading players", description: profilesError.message, variant: "destructive" });
      return;
    }

    const profilesById = new Map((profiles || []).map((profile) => [profile.id, profile]));
    const proofRows = (proofs || []) as WagerProof[];

    setReviewItems(
      wagerRows
        .map((wager) => ({
          wager: wager as ReviewWager,
          playerA: profilesById.get(wager.player_a_id) || unknownProfile(wager.player_a_id),
          playerB: wager.player_b_id ? profilesById.get(wager.player_b_id) || unknownProfile(wager.player_b_id) : null,
          proofs: proofRows.filter((proof) => proof.wager_id === wager.id),
        }))
        .filter((item) => item.proofs.length > 0)
    );
  };

  const openSettlementConfirm = (item: ReviewItem, winner: ProfileSummary) => {
    setPendingSettlement({
      wagerId: item.wager.id,
      winnerId: winner.id,
      winnerEmail: winner.email,
      gameType: item.wager.game_type,
      payout: Number(item.wager.stake_amount) * 2,
    });
  };

  const handleConfirmSettlement = async () => {
    if (!pendingSettlement) return;

    setSettlingWagerId(pendingSettlement.wagerId);

    try {
      const { data, error } = await supabase.functions.invoke("settle-mobile-wager", {
        body: {
          wagerId: pendingSettlement.wagerId,
          winnerId: pendingSettlement.winnerId,
          adminNotes: notesByWager[pendingSettlement.wagerId] || null,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast({
        title: "Winner confirmed",
        description: `₦${pendingSettlement.payout.toFixed(2)} credited to ${pendingSettlement.winnerEmail}.`,
      });

      setPendingSettlement(null);
      setNotesByWager((current) => ({ ...current, [pendingSettlement.wagerId]: "" }));
      fetchReviewItems();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Settlement failed";
      toast({ title: "Settlement blocked", description: message, variant: "destructive" });
    } finally {
      setSettlingWagerId(null);
    }
  };

  const renderProofs = (proofs: WagerProof[]) => {
    if (proofs.length === 0) {
      return <p className="text-sm text-muted-foreground">No proof uploaded by this player.</p>;
    }

    return (
      <div className="space-y-3">
        {proofs.map((proof) => {
          const verification = proof.ai_verification_result;
          const scoreIsZeroZero = isZeroZero(verification?.score);

          return (
            <div key={proof.id} className="rounded-lg border border-border bg-background/60 p-3 space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={proof.status === "ai_verified" ? "default" : proof.status === "ai_failed" ? "destructive" : "secondary"}>
                  {proof.status.replace(/_/g, " ")}
                </Badge>
                {proof.game_name && <Badge variant="outline">{proof.game_name}</Badge>}
                {scoreIsZeroZero && (
                  <Badge variant="destructive" className="gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    0-0 blocked
                  </Badge>
                )}
              </div>

              <button
                type="button"
                onClick={() => window.open(proof.screenshot_url, "_blank", "noopener,noreferrer")}
                className="group relative aspect-video w-full overflow-hidden rounded-lg border border-border bg-muted text-left"
              >
                <img src={proof.screenshot_url} alt="Submitted wager proof screenshot" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" loading="lazy" />
                <div className="absolute inset-0 flex items-center justify-center bg-background/50 opacity-0 transition-opacity group-hover:opacity-100">
                  <span className="inline-flex items-center gap-2 rounded-full bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground">
                    <ExternalLink className="h-3.5 w-3.5" />
                    Open attachment
                  </span>
                </div>
              </button>

              {verification && (
                <div className="space-y-1 rounded-md bg-muted/60 p-3 text-xs text-muted-foreground">
                  {verification.score && <p><span className="font-semibold text-foreground">Score:</span> {verification.score}</p>}
                  {verification.players_detected && verification.players_detected.length > 0 && (
                    <p><span className="font-semibold text-foreground">Players:</span> {verification.players_detected.join(", ")}</p>
                  )}
                  {verification.confidence && <p><span className="font-semibold text-foreground">Confidence:</span> {verification.confidence}</p>}
                  {verification.reason && <p>{verification.reason}</p>}
                </div>
              )}

              <p className="text-xs text-muted-foreground">Uploaded {format(new Date(proof.submitted_at), "PPp")}</p>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold">Proof Review</h2>
          <p className="text-sm text-muted-foreground">Review both players and confirm one winner before any payout is credited.</p>
        </div>
        <Badge variant="outline" className="gap-2">
          <ShieldCheck className="h-4 w-4" />
          No draw crediting
        </Badge>
      </div>

      {reviewItems.length === 0 ? (
        <Card className="p-8 text-center">
          <ImageIcon className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
          <p className="text-muted-foreground">No wager proofs need review.</p>
        </Card>
      ) : (
        <div className="grid gap-5">
          {reviewItems.map((item) => {
            const playerAProofs = item.proofs.filter((proof) => proof.user_id === item.wager.player_a_id);
            const playerBProofs = item.proofs.filter((proof) => proof.user_id === item.wager.player_b_id);
            const canSettleA = playerAProofs.some((proof) => proof.status !== "rejected");
            const canSettleB = playerBProofs.some((proof) => proof.status !== "rejected");

            return (
              <Card key={item.wager.id} className="p-4 md:p-6 bg-gradient-card border-border space-y-5">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Trophy className="h-5 w-5 text-primary" />
                      <h3 className="font-bold text-lg">{item.wager.game_type}</h3>
                      <Badge variant="secondary">Code: {item.wager.wager_code}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">Stake ₦{Number(item.wager.stake_amount).toFixed(2)} · Winner receives ₦{(Number(item.wager.stake_amount) * 2).toFixed(2)}</p>
                  </div>
                  <Badge variant="outline">{item.wager.status.replace(/_/g, " ")}</Badge>
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  {[
                    { label: "Player A", profile: item.playerA, proofs: playerAProofs, canSettle: canSettleA },
                    { label: "Player B", profile: item.playerB, proofs: playerBProofs, canSettle: canSettleB },
                  ].map((player) => {
                    if (!player.profile) return null;

                    return (
                      <div key={player.profile.id} className="rounded-xl border border-border bg-card/70 p-4 space-y-4">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                              <UserRound className="h-5 w-5" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-bold uppercase tracking-widest text-primary">{player.label}</p>
                              <p className="truncate font-semibold">{player.profile.email}</p>
                            </div>
                          </div>
                          <Badge variant={player.proofs.length > 0 ? "default" : "outline"}>{player.proofs.length} proof{player.proofs.length === 1 ? "" : "s"}</Badge>
                        </div>

                        {renderProofs(player.proofs)}

                        <Button
                          variant="bet"
                          className="w-full"
                          disabled={!player.canSettle || settlingWagerId === item.wager.id}
                          onClick={() => openSettlementConfirm(item, player.profile)}
                        >
                          Select {player.label} as Winner
                        </Button>
                      </div>
                    );
                  })}
                </div>

                <Textarea
                  placeholder="Admin settlement notes (optional)"
                  value={notesByWager[item.wager.id] || ""}
                  onChange={(event) => setNotesByWager((current) => ({ ...current, [item.wager.id]: event.target.value }))}
                  rows={2}
                />
              </Card>
            );
          })}
        </div>
      )}

      <AlertDialog open={!!pendingSettlement} onOpenChange={(open) => !open && setPendingSettlement(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm winner and credit payout?</AlertDialogTitle>
            <AlertDialogDescription>
              This is the final settlement step. The backend will only credit the selected player if they are one of the joined players, have proof attached, and the result is not 0-0.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {pendingSettlement && (
            <div className="rounded-lg border border-border bg-muted/50 p-4 text-sm space-y-2">
              <p><span className="font-semibold">Game:</span> {pendingSettlement.gameType}</p>
              <p><span className="font-semibold">Winner:</span> {pendingSettlement.winnerEmail}</p>
              <p><span className="font-semibold">Payout:</span> ₦{pendingSettlement.payout.toFixed(2)}</p>
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={!!settlingWagerId}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmSettlement} disabled={!!settlingWagerId}>
              {settlingWagerId ? "Confirming..." : "Confirm Winner"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
