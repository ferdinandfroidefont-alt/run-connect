import { cn } from "@/lib/utils";

type Role = "athlete" | "coach";

/**
 * Sélecteur Athlète / Coach — copie pixel de la maquette RunConnect (13).jsx (`CoachingPage`).
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
    <div className={cn("px-6 pt-3 pb-0", className)}>
      <div className="flex rounded-xl bg-[#E5E5EA] p-1">
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
                "flex-1 rounded-lg py-2 text-[15px] font-semibold transition-all",
                disabled && "cursor-not-allowed opacity-45"
              )}
              style={{
                background: selected ? "white" : "transparent",
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
