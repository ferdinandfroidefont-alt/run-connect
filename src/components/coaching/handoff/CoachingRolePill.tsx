import { cn } from "@/lib/utils";

type Role = "athlete" | "coach";

/** Segmented control identique à la maquette (fond search-fill, segments 7px, ombre segment actif). */
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
    <div className={cn("px-5 pb-3.5 pt-3", className)}>
      <div className="handoff-role-track">
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
              className={cn("handoff-role-thumb", selected ? "handoff-role-thumb-active" : "handoff-role-thumb-idle")}
            >
              {item.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
