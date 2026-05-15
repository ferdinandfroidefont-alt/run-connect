import { cn } from "@/lib/utils";

type Role = "athlete" | "coach";

/**
 * Sélecteur Athlète / Coach — aligné `RunConnect (17).jsx` · `CoachingPage` (toggle sous StickyPage).
 * Rendu dans le **corps scrollable**, pas dans le bloc titre (`<main className="… pt-3">`).
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
    <div className={cn("px-5 pt-3 pb-0 [-webkit-tap-highlight-color:transparent]", className)}>
      {/* Maquette RunConnect (17).jsx : `rounded-xl p-1`, segment actif fond blanc + ombre ; inactif = texte #8E8E93 sur piste. */}
      <div className="flex rounded-xl bg-[#E5E5EA] p-1 [-webkit-tap-highlight-color:transparent]">
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
                "flex-1 rounded-lg py-2 text-center text-[15px] font-semibold leading-snug tracking-[-0.02em] outline-none transition-all",
                "touch-manipulation [-webkit-tap-highlight-color:transparent]",
                "focus-visible:ring-2 focus-visible:ring-[#007AFF]/35 focus-visible:ring-offset-2 focus-visible:ring-offset-[#F2F2F7]",
                disabled ? "cursor-not-allowed opacity-45" : "active:opacity-[0.92]",
              )}
              style={{
                background: selected ? "#FFFFFF" : "transparent",
                color: selected ? "#0A0F1F" : "#8E8E93",
                boxShadow: selected ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
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
