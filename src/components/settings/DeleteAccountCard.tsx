import { useState } from "react";
import { Trash2, ChevronRight, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface DeleteAccountCardProps {
  /** Fermeture éventuelle après succès (ex. dialog réglages). */
  onClose?: () => void;
}

export function DeleteAccountCard({ onClose }: DeleteAccountCardProps) {
  const { user, session, signOut } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const handleDeleteAccount = async () => {
    if (!user || !session) return;
    setLoading(true);
    try {
      const { error } = await supabase.functions.invoke("delete-account", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (error) throw error;
      toast({
        title: "Compte supprimé",
        description: "Votre compte a été supprimé avec succès.",
      });
      onClose?.();
      void signOut();
    } catch (error: unknown) {
      console.error("Delete account error:", error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer votre compte. Contactez le support.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="bg-card overflow-hidden">
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <button
            type="button"
            className="w-full flex items-center gap-2.5 px-4 ios-shell:px-2.5 py-2.5 active:bg-destructive/5 transition-colors"
          >
            <div className="ios-list-row-icon bg-[#FF3B30]">
              <Trash2 className="h-[18px] w-[18px] text-white" />
            </div>
            <div className="min-w-0 flex-1 text-left">
              <p className="text-[15px] font-medium text-destructive">Supprimer mon compte</p>
              <p className="text-[13px] text-muted-foreground">Suppression serveur, sans e-mail obligatoire</p>
            </div>
            <ChevronRight className="h-5 w-5 text-destructive/50 shrink-0" />
          </button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer votre compte</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible : profil, activité et données associées seront effacées côté serveur conformément aux politiques RGPD du service.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void handleDeleteAccount()}
              disabled={loading || !session}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Supprimer"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
