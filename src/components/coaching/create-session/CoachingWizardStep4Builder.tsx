import { COACHING_ACTION_BLUE } from "@/components/coaching/create-session/CoachingCreateSessionSchema";
import { buildCoachSessionHeadline } from "@/components/coaching/create-session/CoachingSessionCreateWizardSteps";
import {
  CoachingBlockEditorPanel,
  type CoachingSessionBlock,
} from "@/components/coaching/CoachingBlockEditorPanel";
import { ModelsPage } from "@/components/coaching/models/ModelsPage";
import type { SessionModelItem } from "@/components/coaching/models/types";

type SportType = "running" | "cycling" | "swimming" | "strength";

export type CoachingWizardStep4BuilderProps = {
  wizardSportId: string;
  locationLine: string;
  editorTab: "build" | "models";
  onEditorTabChange: (tab: "build" | "models") => void;
  /** Onglets déjà dans le header (flux « + » planification). */
  hideTabs?: boolean;
  blocks: CoachingSessionBlock[];
  onBlocksChange: (blocks: CoachingSessionBlock[]) => void;
  sport: SportType;
  editorKey?: string | number;
  weekDays: Date[];
  existingSessionsByDay: Record<string, string | undefined>;
  myModels: SessionModelItem[];
  baseModels: SessionModelItem[];
  onCreateModel: () => void;
  onAddToPlanning?: (model: SessionModelItem, day: Date, replaceExisting: boolean) => Promise<boolean> | boolean;
  onApplyToSession?: (model: SessionModelItem) => void;
  onEditModel: (model: SessionModelItem) => void;
  onDuplicateModel: (model: SessionModelItem) => void;
  onDeleteModel: (model: SessionModelItem) => void;
};

/** Maquette `WizardStep4Builder` · étape 4/5 du wizard création de séance. */
export function CoachingWizardStep4Builder({
  wizardSportId,
  locationLine,
  editorTab,
  onEditorTabChange,
  hideTabs = false,
  blocks,
  onBlocksChange,
  sport,
  editorKey,
  weekDays,
  existingSessionsByDay,
  myModels,
  baseModels,
  onCreateModel,
  onAddToPlanning,
  onApplyToSession,
  onEditModel,
  onDuplicateModel,
  onDeleteModel,
}: CoachingWizardStep4BuilderProps) {
  return (
    <div className="space-y-4">
      <h1
        className="mb-0 mt-0 text-[22px] font-extrabold tracking-[-0.02em] text-[#0A0F1F]"
        style={{ lineHeight: 1.2 }}
      >
        {buildCoachSessionHeadline(wizardSportId, locationLine)}
      </h1>

      {!hideTabs ? (
        <div className="flex gap-2">
          {(
            [
              { id: "build" as const, label: "Construire" },
              { id: "models" as const, label: "Modèles" },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => onEditorTabChange(tab.id)}
              className="flex-1 rounded-full py-3 text-[16px] font-bold transition-transform active:scale-[0.98]"
              style={{
                background: editorTab === tab.id ? COACHING_ACTION_BLUE : "white",
                color: editorTab === tab.id ? "white" : "#0A0F1F",
                border: editorTab === tab.id ? "none" : "1px solid #E5E5EA",
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      ) : null}

      {editorTab === "build" ? (
        <CoachingBlockEditorPanel
          key={editorKey}
          sport={sport}
          initialBlocks={blocks.length ? blocks : undefined}
          onChange={onBlocksChange}
        />
      ) : (
        <div className="mt-4">
          <ModelsPage
            weekDays={weekDays}
            existingSessionsByDay={existingSessionsByDay}
            myModels={myModels}
            baseModels={baseModels}
            onCreateModel={onCreateModel}
            onAddToPlanning={onAddToPlanning}
            onApplyToSession={onApplyToSession}
            onEditModel={onEditModel}
            onDuplicateModel={onDuplicateModel}
            onDeleteModel={onDeleteModel}
          />
        </div>
      )}
    </div>
  );
}
