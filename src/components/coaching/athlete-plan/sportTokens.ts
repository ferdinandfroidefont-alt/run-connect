export type SportType = "running" | "cycling" | "swimming" | "strength" | "other";

export function sportLabel(s: SportType): string {
  switch (s) {
    case "running":
      return "Course à pied";
    case "cycling":
      return "Vélo";
    case "swimming":
      return "Natation";
    case "strength":
      return "Renforcement";
    default:
      return "Libre";
  }
}

export function sportBadgeClass(s: SportType): string {
  switch (s) {
    case "running":
      return "bg-sky-500/15 text-sky-800 dark:text-sky-200 border-sky-500/25";
    case "cycling":
      return "bg-emerald-500/15 text-emerald-800 dark:text-emerald-200 border-emerald-500/25";
    case "strength":
      return "bg-violet-500/15 text-violet-800 dark:text-violet-200 border-violet-500/25";
    case "swimming":
      return "bg-cyan-500/15 text-cyan-800 dark:text-cyan-200 border-cyan-500/25";
    default:
      return "bg-muted text-muted-foreground border-border";
  }
}

export function sportDotClass(s: SportType): string {
  switch (s) {
    case "running":
      return "bg-sky-500";
    case "cycling":
      return "bg-emerald-500";
    case "strength":
      return "bg-violet-500";
    case "swimming":
      return "bg-cyan-500";
    default:
      return "bg-muted-foreground/50";
  }
}

export function parseSport(raw: string | null | undefined): SportType {
  if (raw === "running" || raw === "cycling" || raw === "swimming" || raw === "strength") return raw;
  return "other";
}
