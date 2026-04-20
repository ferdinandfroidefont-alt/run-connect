interface DayEmptyStateInlineProps {
  label?: string;
}

export function DayEmptyStateInline({ label = "Ajouter une séance" }: DayEmptyStateInlineProps) {
  return <p className="truncate text-[13px] font-medium text-muted-foreground">{label}</p>;
}

