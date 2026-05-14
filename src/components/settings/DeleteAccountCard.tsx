import { useState } from "react";
import { Trash2, ChevronRight, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
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
  className?: string;
}

export function DeleteAccountCard({ onClose, className }: DeleteAccountCardProps) {
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
    <div className={cn("overflow-hidden bg-transparent", className)}>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <button
            type="button"
            className="flex w-full items-center gap-3 px-3 py-3 text-left transition-colors active:bg-[#F8F8F8]"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-[#FF3B30]">
              <Trash2 className="h-[19px] w-[19px] text-white" strokeWidth={2.4} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="m-0 text-[17px] font-bold tracking-tight text-[#FF3B30]" style={{ letterSpacing: "-0.01em" }}>
                Supprimer mon compte
              </p>
              <p className="m-0 mt-0.5 text-[13px] text-[#8E8E93]">Suppression serveur, sans e-mail obligatoire</p>
            </div>
            <ChevronRight className="h-5 w-5 shrink-0 text-[#C7C7CC]" aria-hidden />
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
