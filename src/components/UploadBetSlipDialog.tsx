import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Upload } from "lucide-react";

interface UploadBetSlipDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadComplete: () => void;
}

export const UploadBetSlipDialog = ({ isOpen, onClose, onUploadComplete }: UploadBetSlipDialogProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [stakeAmount, setStakeAmount] = useState("");
  const [odds, setOdds] = useState("");
  const [description, setDescription] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!file || !stakeAmount || !odds) {
      toast({
        title: "Missing information",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Upload screenshot to storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/bet_${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from("wager-proofs")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from("wager-proofs")
        .getPublicUrl(fileName);

      // Calculate potential win
      const stake = parseFloat(stakeAmount);
      const oddsValue = parseFloat(odds);
      const potentialWin = stake * oddsValue;

      // Insert bet record
      const { error: betError } = await supabase
        .from("bets")
        .insert({
          user_id: user.id,
          match_id: `uploaded_${Date.now()}`,
          selection: description || "Custom bet",
          odds: oddsValue,
          stake: stake,
          potential_win: potentialWin,
          status: "pending",
          result: publicUrl, // Store screenshot URL in result field
        });

      if (betError) throw betError;

      toast({
        title: "Bet slip uploaded!",
        description: "Your bet has been recorded successfully",
      });

      // Reset form
      setFile(null);
      setStakeAmount("");
      setOdds("");
      setDescription("");
      onUploadComplete();
      onClose();
    } catch (error) {
      console.error("Upload error:", error);
      toast({
        title: "Error",
        description: "Failed to upload bet slip",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Upload Bet Slip</DialogTitle>
          <DialogDescription>
            Upload a screenshot of your bet slip to track your bets
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="betScreenshot">Bet Slip Screenshot *</Label>
            <Input
              id="betScreenshot"
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              required
            />
            <p className="text-xs text-muted-foreground">
              Upload a clear screenshot of your bet slip
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="stakeAmount">Stake Amount (₦) *</Label>
            <Input
              id="stakeAmount"
              type="number"
              placeholder="100.00"
              value={stakeAmount}
              onChange={(e) => setStakeAmount(e.target.value)}
              step="0.01"
              min="0"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="odds">Total Odds *</Label>
            <Input
              id="odds"
              type="number"
              placeholder="2.50"
              value={odds}
              onChange={(e) => setOdds(e.target.value)}
              step="0.01"
              min="1"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              placeholder="e.g., Arsenal vs Chelsea, Over 2.5 goals"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          {stakeAmount && odds && (
            <div className="bg-muted p-3 rounded-lg">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Potential Win:</span>
                <span className="font-bold text-primary">
                  ₦{(parseFloat(stakeAmount) * parseFloat(odds)).toFixed(2)}
                </span>
              </div>
            </div>
          )}

          <Button
            type="submit"
            variant="bet"
            className="w-full"
            disabled={!file || !stakeAmount || !odds || isUploading}
          >
            <Upload className="w-4 h-4 mr-2" />
            {isUploading ? "Uploading..." : "Upload Bet Slip"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};