import { cn } from "@/lib/utils";

type Role = "athlete" | "coach";

/**
 * Sélecteur Athlète / Coach — aligné capture maquette (piste groupe #F2F2F7, pilule active).
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
      {/* Capture maquette : piste #F2F2F7, segment inactif = texte #8E8E93 medium sans fond ; actif = pilule #FFF très arrondie, texte #000 semibold, ombre très douce. */}
      <div className="flex w-full rounded-[14px] bg-[#F2F2F7] p-[3px] [-webkit-tap-highlight-color:transparent]">
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
                "flex min-h-[42px] flex-1 items-center justify-center rounded-[11px] text-center text-[15px] leading-none tracking-[-0.02em] outline-none transition-[background-color,box-shadow,color,opacity] duration-150 ease-out",
                selected ? "font-semibold" : "font-medium",
                "touch-manipulation [-webkit-tap-highlight-color:transparent]",
                "focus-visible:ring-2 focus-visible:ring-[#007AFF]/35 focus-visible:ring-offset-2 focus-visible:ring-offset-[#F2F2F7]",
                disabled ? "cursor-not-allowed opacity-45" : "active:opacity-[0.92]",
              )}
              style={{
                background: selected ? "#FFFFFF" : "transparent",
                color: selected ? "#000000" : "#8E8E93",
                boxShadow: selected ? "0 1px 4px rgba(0, 0, 0, 0.07), 0 0 1px rgba(0, 0, 0, 0.04)" : "none",
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
