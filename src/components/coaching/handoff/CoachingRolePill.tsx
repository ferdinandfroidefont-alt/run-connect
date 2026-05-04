import { cn } from "@/lib/utils";

type Role = "athlete" | "coach";

export function CoachingRolePill({
  active,
  onSelect,
  className,
}: {
  active: Role;
  onSelect: (role: Role) => void;
  className?: string;
}) {
  return (
    <div className={cn("px-4 pb-3.5", className)}>
      <div className="flex rounded-[9px] bg-muted p-0.5">
        {(
          [
            { id: "athlete" as const, label: "Athlète" },
            { id: "coach" as const, label: "Coach" },
          ] as const
        ).map((item) => {
          const selected = active === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelect(item.id)}
              className={cn(
                "min-h-[44px] flex-1 touch-manipulation rounded-[7px] py-1.5 text-center text-[13px] font-medium tracking-[-0.02em] transition-shadow",
                selected
                  ? "bg-card text-foreground shadow-[0_1px_2px_rgba(0,0,0,0.12)]"
                  : "bg-transparent text-muted-foreground"
              )}
            >
              {item.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
