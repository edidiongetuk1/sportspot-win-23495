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
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!file || !wagerId) return;

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

      // Insert proof record
      const { error: proofError } = await supabase
        .from("wager_proofs")
        .insert({
          wager_id: wagerId,
          user_id: user.id,
          screenshot_url: publicUrl,
        });

      if (proofError) throw proofError;

      // Update wager status to pending_verification
      const { error: wagerError } = await supabase
        .from("mobile_wagers")
        .update({ status: "pending_verification" })
        .eq("id", wagerId);

      if (wagerError) throw wagerError;

      toast({
        title: "Proof uploaded!",
        description: "Your screenshot has been submitted for verification",
      });

      onClose();
      setFile(null);
    } catch (error) {
      console.error("Upload error:", error);
      toast({
        title: "Error",
        description: "Failed to upload proof",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
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
            <Label htmlFor="screenshot">Screenshot</Label>
            <Input
              id="screenshot"
              type="file"
              accept="image/*"
              onChange={handleFileChange}
            />
            <p className="text-xs text-muted-foreground">
              Upload a clear screenshot showing the final score
            </p>
          </div>

          <Button
            type="submit"
            variant="bet"
            className="w-full"
            disabled={!file || isUploading}
          >
            <Upload className="w-4 h-4 mr-2" />
            {isUploading ? "Uploading..." : "Upload Proof"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
