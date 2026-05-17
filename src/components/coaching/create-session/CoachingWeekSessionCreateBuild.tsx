import {
  COACHING_ACTION_BLUE,
  COACHING_SEANCE_SPORTS,
} from "@/components/coaching/create-session/CoachingCreateSessionSchema";
import {
  CoachingBlockEditorPanel,
  type CoachingSessionBlock,
} from "@/components/coaching/CoachingBlockEditorPanel";

type SportType = "running" | "cycling" | "swimming" | "strength";

const SPORT_BY_ACTIVITY: Record<string, SportType> = {
  course: "running",
  velo: "cycling",
  natation: "swimming",
  musculation: "strength",
};

export type CoachingWeekSessionCreateBuildProps = {
  title: string;
  onTitleChange: (value: string) => void;
  wizardSportId: string;
  onSportSelect: (sportId: string, draftSport: SportType) => void;
  blocks: CoachingSessionBlock[];
  onBlocksChange: (blocks: CoachingSessionBlock[]) => void;
  sport: SportType;
  editorKey?: string | number;
};

/** Corps « Construire » · maquette `CreerSeancePage` (RunConnect 20). */
export function CoachingWeekSessionCreateBuild({
  title,
  onTitleChange,
  wizardSportId,
  onSportSelect,
  blocks,
  onBlocksChange,
  sport,
  editorKey,
}: CoachingWeekSessionCreateBuildProps) {
  return (
    <>
      <p className="mb-2 text-[15px] font-extrabold tracking-wide text-[#8E8E93]">Nom de la séance</p>
      <input
        value={title}
        onChange={(e) => onTitleChange(e.target.value)}
        placeholder="Ex. Fractionné piste"
        className="w-full rounded-2xl bg-white px-4 py-3 text-[16px] text-[#0A0F1F] outline-none placeholder:text-[#8E8E93]"
        style={{ boxShadow: "0 1px 2px rgba(0,0,0,0.04)" }}
      />

      <div className="mt-5 grid grid-cols-4 gap-3">
        {COACHING_SEANCE_SPORTS.map((sp) => {
          const selected = wizardSportId === sp.id;
          const draftSport = SPORT_BY_ACTIVITY[sp.activityValue] ?? "running";
          return (
            <button
              key={sp.id}
              type="button"
              onClick={() => onSportSelect(sp.id, draftSport)}
              className="flex aspect-square items-center justify-center rounded-2xl text-[36px] transition-transform active:scale-95"
              style={{
                background: sp.bg,
                boxShadow: selected
                  ? `0 0 0 3px white, 0 0 0 5px ${COACHING_ACTION_BLUE}`
                  : "0 1px 2px rgba(0,0,0,0.04)",
              }}
              aria-label={sp.id}
            >
              {sp.emoji}
            </button>
          );
        })}
      </div>

      <CoachingBlockEditorPanel
        key={editorKey}
        layout="creerSeance"
        sport={sport}
        initialBlocks={blocks.length ? blocks : undefined}
        onChange={onBlocksChange}
      />
    </>
  );
}
