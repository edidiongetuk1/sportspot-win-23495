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
import { useToast } from "@/hooks/use-toast";
import { Upload } from "lucide-react";

interface UploadProofDialogProps {
  wagerId: string | null;
  onClose: () => void;
}

export const UploadProofDialog = ({ wagerId, onClose }: UploadProofDialogProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [gameName, setGameName] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!file || !wagerId || !gameName.trim()) {
      toast({
        title: "Missing information",
        description: "Please provide both screenshot and game name",
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
      const fileName = `${user.id}/${wagerId}_${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from("wager-proofs")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from("wager-proofs")
        .getPublicUrl(fileName);

      // Insert proof record with game name
      const { error: proofError } = await supabase
        .from("wager_proofs")
        .insert({
          wager_id: wagerId,
          user_id: user.id,
          screenshot_url: publicUrl,
          game_name: gameName.trim(),
        });

      if (proofError) throw proofError;

      toast({
        title: "Proof uploaded!",
        description: "Starting AI verification...",
      });

      // Trigger AI verification
      setIsVerifying(true);
      const { data: functionData, error: functionError } = await supabase.functions.invoke(
        'verify-wager-screenshot',
        {
          body: {
            screenshot_url: publicUrl,
            game_name: gameName.trim(),
            wager_id: wagerId
          }
        }
      );

      if (functionError) {
        console.error("AI verification error:", functionError);
        toast({
          title: "AI verification failed",
          description: "Your proof was uploaded but automatic verification failed. Admin will review manually.",
          variant: "destructive",
        });
      } else if (functionData?.verification?.is_valid_proof) {
        toast({
          title: "AI Verification Complete!",
          description: `Confidence: ${functionData.verification.confidence}. Admin will review final results.`,
        });
        
        // Update wager status to pending_verification
        await supabase
          .from("mobile_wagers")
          .update({ status: "pending_verification" })
          .eq("id", wagerId);
      } else {
        toast({
          title: "Verification Issue",
          description: functionData?.verification?.reason || "Screenshot needs manual review",
          variant: "destructive",
        });
      }

      onClose();
      setFile(null);
      setGameName("");
    } catch (error) {
      console.error("Upload error:", error);
      toast({
        title: "Error",
        description: "Failed to upload proof",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      setIsVerifying(false);
    }
  };

  return (
    <Dialog open={!!wagerId} onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Upload Match Result</DialogTitle>
          <DialogDescription>
            Upload a screenshot of the match result screen
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="gameName">Game Name</Label>
            <Input
              id="gameName"
              type="text"
              placeholder="e.g., FIFA 24, Call of Duty, PUBG Mobile"
              value={gameName}
              onChange={(e) => setGameName(e.target.value)}
              required
            />
            <p className="text-xs text-muted-foreground">
              Enter the game name to help AI verify your result
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="screenshot">Screenshot</Label>
            <Input
              id="screenshot"
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              required
            />
            <p className="text-xs text-muted-foreground">
              Upload a clear screenshot showing the final score and player names
            </p>
          </div>

          <Button
            type="submit"
            variant="bet"
            className="w-full"
            disabled={!file || !gameName.trim() || isUploading || isVerifying}
          >
            <Upload className="w-4 h-4 mr-2" />
            {isVerifying ? "AI Verifying..." : isUploading ? "Uploading..." : "Upload & Verify"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
