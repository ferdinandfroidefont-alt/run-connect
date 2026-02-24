import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { parseRCC } from "@/lib/rccParser";
import { RCCBlocksPreview } from "./RCCBlocksPreview";
import { ChevronLeft, Trash2, BookOpen } from "lucide-react";

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
      <DialogContent fullScreen hideCloseButton>
        <DialogHeader className="sticky top-0 bg-background z-10 border-b p-4">
          <DialogTitle className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 -ml-2">
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <BookOpen className="h-5 w-5" />
            Mes templates
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          <Input
            placeholder="Rechercher un template..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />

          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => <div key={i} className="h-20 bg-muted rounded-lg animate-pulse" />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Aucun template sauvegardé</p>
              <p className="text-xs mt-1">Créez une séance et cliquez "Sauver template"</p>
            </div>
          ) : (
            filtered.map(t => {
              const { blocks } = parseRCC(t.rcc_code);
              return (
                <button
                  key={t.id}
                  className="w-full text-left p-3 rounded-lg border hover:bg-muted/50 transition-colors space-y-2"
                  onClick={() => { onSelect(t.rcc_code, t.objective || undefined); onClose(); }}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">{t.name}</p>
                      {t.objective && <p className="text-xs text-muted-foreground">{t.objective}</p>}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive"
                      onClick={(e) => { e.stopPropagation(); handleDelete(t.id); }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <p className="text-xs font-mono text-muted-foreground truncate">{t.rcc_code}</p>
                  {blocks.length > 0 && <RCCBlocksPreview blocks={blocks} />}
                </button>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
