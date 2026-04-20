import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Loader2, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { CoachingFullscreenHeader } from "@/components/coaching/CoachingFullscreenHeader";
import { IosFixedPageHeaderShell } from "@/components/layout/IosFixedPageHeaderShell";

/**
 * Page dédiée RunConnect : confirmation avant suppression définitive d’une story.
 */
export default function StoryDeleteConfirm() {
  const { storyId } = useParams<{ storyId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [isOwner, setIsOwner] = useState(false);

  useEffect(() => {
    if (!storyId || !user?.id) {
      setLoading(false);
      return;
    }
    void (async () => {
      const { data, error } = await (supabase as any)
        .from("session_stories")
        .select("id, author_id")
        .eq("id", storyId)
        .maybeSingle();
      if (error || !data) {
        setIsOwner(false);
        setLoading(false);
        return;
      }
      setIsOwner(data.author_id === user.id);
      setLoading(false);
    })();
  }, [storyId, user?.id]);

  const handleDelete = async () => {
    if (!storyId || !user?.id) return;
    setDeleting(true);
    try {
      const { error, data } = await (supabase as any)
        .from("session_stories")
        .delete()
        .eq("id", storyId)
        .eq("author_id", user.id)
        .select("id");
      if (error) throw error;
      if (!data?.length) {
        toast({
          title: "Impossible de supprimer",
          description: "Story introuvable ou tu n’es pas l’auteur.",
          variant: "destructive",
        });
        return;
      }
      toast({ title: "Story supprimée" });
      navigate(-1);
    } catch (e: any) {
      toast({
        title: "Erreur",
        description: e?.message || "Suppression impossible.",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-secondary">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!storyId || !isOwner) {
    return (
      <div className="flex min-h-[100dvh] flex-col bg-secondary">
        <IosFixedPageHeaderShell
          className="min-h-0 flex-1 bg-secondary"
          contentTopOffsetPx={0}
          header={
            <CoachingFullscreenHeader title="Supprimer la story" onBack={() => navigate(-1)} />
          }
          scrollClassName="bg-secondary px-4 pb-8"
        >
          <p className="pt-2 text-[15px] text-muted-foreground">
            Cette story n’existe pas ou tu n’as pas le droit de la supprimer.
          </p>
          <Button className="mt-6 w-full" variant="secondary" onClick={() => navigate(-1)}>
            Retour
          </Button>
        </IosFixedPageHeaderShell>
      </div>
    );
  }

  return (
    <IosFixedPageHeaderShell
      className="flex min-h-[100dvh] flex-1 flex-col bg-secondary"
      contentTopOffsetPx={0}
      header={<CoachingFullscreenHeader title="Supprimer la story" onBack={() => navigate(-1)} />}
      scrollClassName="bg-secondary px-4 pb-8"
    >
      <div className="space-y-4 pt-0">
        <p className="text-[17px] font-semibold text-foreground">Supprimer cette story ?</p>
        <p className="text-[15px] leading-relaxed text-muted-foreground">
          Elle disparaîtra pour tout le monde (fil, profil, éléments à la une liés). Cette action est
          définitive.
        </p>
        <div className="flex flex-col gap-3 pt-4">
          <Button
            variant="destructive"
            className="h-12 w-full gap-2 rounded-xl text-[17px] font-semibold"
            disabled={deleting}
            onClick={() => void handleDelete()}
          >
            {deleting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Trash2 className="h-5 w-5" />}
            Supprimer définitivement
          </Button>
          <Button variant="outline" className="h-12 w-full rounded-xl text-[17px]" onClick={() => navigate(-1)}>
            Annuler
          </Button>
        </div>
      </div>
    </IosFixedPageHeaderShell>
  );
}
