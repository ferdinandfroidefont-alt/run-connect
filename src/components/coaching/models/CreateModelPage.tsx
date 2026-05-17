import { useMemo, useState, type ReactNode } from "react";
import { Globe, Lock, Users } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { CoachingBlockEditorPanel, type CoachingSessionBlock } from "@/components/coaching/CoachingBlockEditorPanel";
import { COACHING_ACTION_BLUE, COACHING_PAGE_BG } from "@/components/coaching/create-session/CoachingCreateSessionSchema";
import {
  ALL_WIZARD_SPORTS,
  type CoachPlanningSport,
} from "@/components/coaching/create-session/CoachingSessionCreateWizardSteps";
import { SportFilterCarousel, type SportFilterItem } from "@/components/feed/SportFilterCarousel";
import { coachingBlocksToRccCode } from "@/lib/coachingBlocksRcc";
import type { SessionModelItem } from "@/components/coaching/models/types";

const MODEL_SPORT_FILTERS: SportFilterItem[] = ALL_WIZARD_SPORTS.map((s) => ({
  id: s.id,
  emoji: s.emoji,
  label: s.label,
  color: s.color,
}));

type ModelVisibility = "prive" | "club" | "public";

export type CreateModelPageProps = {
  onClose: () => void;
  onSaved: (model: SessionModelItem) => void;
  defaultWizardSportId?: string;
  defaultSport?: CoachPlanningSport;
};

function ModelCard({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={className}
      style={{
        background: "white",
        borderRadius: 14,
        padding: "12px 14px",
        boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 0 0 0.5px rgba(0,0,0,0.06)",
      }}
    >
      {children}
    </div>
  );
}

export function CreateModelPage({
  onClose,
  onSaved,
  defaultWizardSportId = "course",
  defaultSport = "running",
}: CreateModelPageProps) {
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [wizardSportId, setWizardSportId] = useState(defaultWizardSportId);
  const [blocks, setBlocks] = useState<CoachingSessionBlock[]>([]);
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState<ModelVisibility>("prive");
  const [exitDialogOpen, setExitDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const sportMeta = useMemo(
    () => ALL_WIZARD_SPORTS.find((s) => s.id === wizardSportId) ?? ALL_WIZARD_SPORTS[0],
    [wizardSportId]
  );

  const draftSport: CoachPlanningSport = sportMeta?.draftSport ?? defaultSport;
  const hasDraft = name.trim().length > 0 || blocks.length > 0 || description.trim().length > 0;
  const canSave = name.trim().length > 0 && blocks.length > 0 && !saving;

  const tryClose = () => {
    if (hasDraft) setExitDialogOpen(true);
    else onClose();
  };

  const handleSave = async () => {
    if (!canSave || !user) return;
    const trimmedName = name.trim();
    const rccCode = coachingBlocksToRccCode(blocks);
    if (!rccCode.trim()) {
      toast.error("Ajoute au moins un bloc valide au schéma");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        coach_id: user.id,
        name: trimmedName,
        objective: description.trim() || null,
        activity_type: draftSport,
        rcc_code: rccCode.trim(),
      };
      const { data, error } = await supabase
        .from("coaching_templates")
        .insert(payload)
        .select("id")
        .single();
      if (error) throw error;

      onSaved({
        id: data.id,
        source: "mine",
        title: trimmedName,
        objective: payload.objective,
        activityType: payload.activity_type,
        rccCode: payload.rcc_code,
      });
      toast.success("Modèle créé");
    } catch (e: unknown) {
      toast.error("Création du modèle impossible", e instanceof Error ? e.message : undefined);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div
        className="flex flex-col"
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 200,
          background: COACHING_PAGE_BG,
          fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif",
          paddingTop: "var(--safe-area-top)",
          paddingBottom: "var(--safe-area-bottom)",
        }}
      >
        <div
          className="flex shrink-0 items-center px-4"
          style={{ height: 52, background: "white", borderBottom: "1px solid #E5E5EA" }}
        >
          <button
            type="button"
            onClick={tryClose}
            className="text-[16px] font-medium tracking-[-0.01em] active:opacity-70"
            style={{ color: COACHING_ACTION_BLUE }}
          >
            Annuler
          </button>
          <h1 className="m-0 flex-1 text-center text-[17px] font-extrabold tracking-[-0.02em] text-[#0A0F1F]">
            Nouveau modèle
          </h1>
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={!canSave}
            className="text-[16px] font-extrabold tracking-[-0.01em] active:opacity-70"
            style={{ color: canSave ? COACHING_ACTION_BLUE : "#C7C7CC" }}
          >
            {saving ? "…" : "Enregistrer"}
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-8 pt-4" style={{ WebkitOverflowScrolling: "touch" }}>
          <p className="mb-2 mt-0 text-[12px] font-black uppercase tracking-[0.1em] text-[#8E8E93]">
            Nom du modèle
          </p>
          <ModelCard className="mb-[18px]">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: VMA piste 8×400m"
              maxLength={50}
              className="w-full border-0 bg-transparent text-[16px] font-bold tracking-[-0.02em] text-[#0A0F1F] outline-none placeholder:text-[#C7C7CC]"
            />
          </ModelCard>

          <p className="mb-2 mt-0 text-[12px] font-black uppercase tracking-[0.1em] text-[#8E8E93]">Sport</p>
          <div className="-mx-5 mb-1.5 px-5">
            <SportFilterCarousel
              sports={MODEL_SPORT_FILTERS}
              selected={wizardSportId}
              onToggle={setWizardSportId}
              size="md"
            />
          </div>

          <p className="mb-2.5 mt-3.5 text-[18px] font-extrabold tracking-[-0.01em] text-[#0A0F1F]">
            Schéma du modèle
          </p>
          <CoachingBlockEditorPanel
            sport={draftSport}
            initialBlocks={blocks.length ? blocks : undefined}
            onChange={setBlocks}
          />

          <p className="mb-2 mt-[22px] text-[12px] font-black uppercase tracking-[0.1em] text-[#8E8E93]">
            Description (optionnel)
          </p>
          <ModelCard className="mb-[18px]">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Conseils, objectif, allure cible..."
              maxLength={300}
              rows={3}
              className="w-full resize-none border-0 bg-transparent text-[14.5px] font-medium leading-[1.45] tracking-[-0.01em] text-[#0A0F1F] outline-none placeholder:text-[#C7C7CC]"
            />
          </ModelCard>

          <p className="mb-2 mt-0 text-[12px] font-black uppercase tracking-[0.1em] text-[#8E8E93]">Visibilité</p>
          <ModelCard className="overflow-hidden p-0">
            {(
              [
                { id: "prive" as const, icon: Lock, color: "#8E8E93", label: "Privé", desc: "Visible par toi" },
                { id: "club" as const, icon: Users, color: "#FF3B30", label: "Club", desc: "Membres de ton club" },
                { id: "public" as const, icon: Globe, color: COACHING_ACTION_BLUE, label: "Public", desc: "Toute la communauté" },
              ] as const
            ).map((opt, i) => {
              const selected = visibility === opt.id;
              const Icon = opt.icon;
              return (
                <div key={opt.id}>
                  {i > 0 ? <div className="ml-[60px] h-px bg-[#E5E5EA]" /> : null}
                  <button
                    type="button"
                    onClick={() => setVisibility(opt.id)}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left active:bg-[#F8F8F8]"
                  >
                    <div
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px]"
                      style={{ background: `${opt.color}18` }}
                    >
                      <Icon className="h-4 w-4" color={opt.color} strokeWidth={2.4} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="m-0 text-[15px] font-extrabold tracking-[-0.01em] text-[#0A0F1F]">{opt.label}</p>
                      <p className="m-0 mt-0.5 text-[12.5px] font-semibold text-[#8E8E93]">{opt.desc}</p>
                    </div>
                    <div
                      className="shrink-0"
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: "50%",
                        border: selected ? `7px solid ${COACHING_ACTION_BLUE}` : "2px solid #C6C6C8",
                        background: selected ? "white" : "transparent",
                      }}
                    />
                  </button>
                </div>
              );
            })}
          </ModelCard>
          {visibility !== "prive" ? (
            <p className="mt-2 text-[12px] font-medium leading-snug text-[#8E8E93]">
              Le partage club et public sera disponible prochainement — le modèle est enregistré en privé pour l’instant.
            </p>
          ) : null}
        </div>
      </div>

      <AlertDialog open={exitDialogOpen} onOpenChange={setExitDialogOpen}>
        <AlertDialogContent className="max-w-[320px] rounded-2xl p-0">
          <AlertDialogHeader className="px-[18px] pb-4 pt-5 text-center">
            <AlertDialogTitle className="text-[17px] font-extrabold tracking-[-0.01em] text-[#0A0F1F]">
              Quitter sans enregistrer ?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-[13px] font-medium leading-snug text-[#8E8E93]">
              Ton modèle sera perdu.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="grid grid-cols-2 border-t border-[#E5E5EA] sm:space-x-0">
            <AlertDialogCancel className="m-0 rounded-none border-0 border-r border-[#E5E5EA] bg-transparent py-3.5 text-[16px] font-semibold text-[#007AFF] shadow-none hover:bg-[#F8F8F8]">
              Continuer
            </AlertDialogCancel>
            <AlertDialogAction
              className="m-0 rounded-none border-0 bg-transparent py-3.5 text-[16px] font-extrabold text-[#FF3B30] shadow-none hover:bg-[#F8F8F8]"
              onClick={onClose}
            >
              Quitter
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
