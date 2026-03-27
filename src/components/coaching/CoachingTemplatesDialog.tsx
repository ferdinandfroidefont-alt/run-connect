import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { parseRCC } from "@/lib/rccParser";
import { RCCBlocksPreview } from "./RCCBlocksPreview";
import { CoachingFullscreenHeader } from "./CoachingFullscreenHeader";
import { Trash2, BookOpen } from "lucide-react";

interface Template {
  id: string;
  name: string;
  rcc_code: string;
  activity_type: string;
  objective: string | null;
}

interface CoachingTemplatesDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (rccCode: string, objective?: string) => void;
}

export const CoachingTemplatesDialog = ({ isOpen, onClose, onSelect }: CoachingTemplatesDialogProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (isOpen && user) loadTemplates();
  }, [isOpen, user]);

  const loadTemplates = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("coaching_templates")
      .select("*")
      .eq("coach_id", user!.id)
      .order("created_at", { ascending: false });
    setTemplates((data as Template[]) || []);
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    await supabase.from("coaching_templates").delete().eq("id", id);
    setTemplates(prev => prev.filter(t => t.id !== id));
    toast({ title: "Template supprimé" });
  };

  const filtered = templates.filter(t =>
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    (t.objective || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent fullScreen hideCloseButton className="flex flex-col gap-0 p-0">
        <CoachingFullscreenHeader title="Modèles" onBack={onClose} />

        <div className="flex-1 overflow-y-auto bg-secondary [-webkit-overflow-scrolling:touch] px-4 py-4">
          <Input
            placeholder="Rechercher un modèle…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="mb-4 h-11 rounded-xl border-border bg-card"
          />

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="ios-card h-24 animate-pulse border border-border/60" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="ios-card border border-border/60 px-4 py-10 text-center text-muted-foreground shadow-[var(--shadow-card)]">
              <BookOpen className="mx-auto mb-2 h-9 w-9 opacity-45" />
              <p className="text-[15px] font-medium text-foreground">Aucun modèle enregistré</p>
              <p className="mt-1 text-[13px]">Sauvegardez une séance comme modèle pour la réutiliser ici.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((t) => {
                const { blocks } = parseRCC(t.rcc_code);
                return (
                  <div
                    key={t.id}
                    className="ios-card space-y-3 border border-border/60 p-4 text-left shadow-[var(--shadow-card)]"
                  >
                    <div className="flex items-start gap-2">
                      <button
                        type="button"
                        className="min-w-0 flex-1 touch-manipulation text-left active:opacity-90"
                        onClick={() => {
                          onSelect(t.rcc_code, t.objective || undefined);
                          onClose();
                        }}
                      >
                        <p className="text-[15px] font-semibold text-foreground">{t.name}</p>
                        {t.objective ? <p className="mt-0.5 text-[13px] text-muted-foreground">{t.objective}</p> : null}
                        <p className="mt-2 truncate font-mono text-[11px] text-muted-foreground">{t.rcc_code}</p>
                      </button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 shrink-0 text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          void handleDelete(t.id);
                        }}
                        aria-label="Supprimer le modèle"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    {blocks.length > 0 ? <RCCBlocksPreview blocks={blocks} /> : null}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
