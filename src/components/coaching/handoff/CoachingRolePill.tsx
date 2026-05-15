import { cn } from "@/lib/utils";

type Role = "athlete" | "coach";

/**
 * Sélecteur Athlète / Coach — aligné `_maquette_extract/apple-screens.jsx` (Screens Athlète · Mon plan / Planification).
 * Rendu dans le **corps scrollable**, pas dans le bloc titre (StickyPage : `<main pt-3>`).
 */
export function CoachingRolePill({
  active,
  onSelect,
  className,
  /** Sans rôle coach : pastille Coach visible mais non interactive (vue Mon plan athlète). */
  coachSegmentDisabled = false,
}: {
  active: Role;
  onSelect: (role: Role) => void;
  className?: string;
  coachSegmentDisabled?: boolean;
}) {
  return (
    <div className={cn("px-4 pb-[14px] pt-3 [-webkit-tap-highlight-color:transparent]", className)}>
      {/* Maquette `apple-screens.jsx` · ScreenAthletePlan / ScreenCoachPlan : piste 9px · pastille 7px · 13/500 · ombre sélection. */}
      <div className="flex rounded-[9px] bg-[#E5E5EA] p-[2px] [-webkit-tap-highlight-color:transparent]">
        {(
          [
            { id: "athlete" as const, label: "Athlète" },
            { id: "coach" as const, label: "Coach" },
          ] as const
        ).map((item) => {
          const selected = active === item.id;
          const disabled = coachSegmentDisabled && item.id === "coach";
          return (
            <button
              key={item.id}
              type="button"
              disabled={disabled}
              aria-disabled={disabled}
              onClick={() => !disabled && onSelect(item.id)}
              className={cn(
                "flex-1 rounded-[7px] py-1.5 text-center text-[13px] font-medium leading-snug tracking-[-0.2px] outline-none transition-colors",
                "touch-manipulation [-webkit-tap-highlight-color:transparent]",
                "focus-visible:ring-2 focus-visible:ring-[#007AFF]/35 focus-visible:ring-offset-2 focus-visible:ring-offset-[#E5E5EA]",
                disabled ? "cursor-not-allowed opacity-45" : "active:opacity-[0.92]",
              )}
              style={{
                background: selected ? "#FFFFFF" : "transparent",
                color: "#0A0F1F",
                boxShadow: selected ? "0 1px 2px rgba(0,0,0,0.12)" : "none",
              }}
            >
              {item.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
