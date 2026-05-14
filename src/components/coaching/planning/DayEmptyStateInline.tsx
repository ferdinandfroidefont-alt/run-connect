interface DayEmptyStateInlineProps {
  label?: string;
  /** Style dense coach (maquette DayPlanRow) vs. léger athlète. */
  variant?: "coach" | "athlete";
}

export function DayEmptyStateInline({ label = "Ajouter une séance", variant = "athlete" }: DayEmptyStateInlineProps) {
  if (variant === "coach") {
    return <p className="truncate text-[15px] text-muted-foreground/80">{label}</p>;
  }
  return <p className="truncate text-[13px] font-medium text-muted-foreground">{label}</p>;
}
