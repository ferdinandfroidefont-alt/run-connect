import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ProfilePreviewDialog } from "@/components/ProfilePreviewDialog";
import { useToast } from "@/hooks/use-toast";

/**
 * Aperçu profil d’un autre utilisateur (plein écran), avec gestion du query `error=`.
 */
export function ProfileOtherUserShell({ userId }: { userId: string }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  useEffect(() => {
    const errorParam = searchParams.get("error");
    if (errorParam === "not_friends") {
      toast({
        title: "Non autorisé",
        description:
          "Vous n'êtes pas amis donc vous n'êtes pas autorisé à envoyer un message",
        variant: "destructive",
      });
      const newParams = new URLSearchParams(searchParams);
      newParams.delete("error");
      navigate({ search: newParams.toString() }, { replace: true });
    }
  }, [searchParams, toast, navigate]);

  return (
    <div className="h-full min-h-0 w-full min-w-0 overflow-x-hidden bg-secondary">
      <ProfilePreviewDialog userId={userId} onClose={() => navigate(-1)} />
    </div>
  );
}
