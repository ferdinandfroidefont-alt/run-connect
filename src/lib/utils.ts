import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Prénom + nom (1er mot + reste) à partir du nom d’affichage, ou seul le pseudo. Chaîne vide si rien. */
export function formatProfileFirstLastName(
  displayName: string | null | undefined,
  username: string | null | undefined,
): string {
  const raw = (displayName && displayName.trim()) || (username && username.trim()) || "";
  if (!raw) return "";
  const parts = raw.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts.slice(1).join(" ")}`;
}
