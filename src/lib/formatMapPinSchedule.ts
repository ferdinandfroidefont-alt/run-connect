import { format, isToday, isTomorrow } from "date-fns";
import { fr } from "date-fns/locale";

/**
 * Ligne carte près du pin : « Aujourd'hui 18h30 », « Demain 09h00 », puis date courte FR.
 */
export function formatMapPinScheduleLine(input: string | Date): string {
  const date = typeof input === "string" ? new Date(input) : input;
  if (Number.isNaN(date.getTime())) return "";
  const timeRaw = format(date, "HH:mm");
  const timeLabel = timeRaw.replace(":", "h");
  if (isToday(date)) return `Aujourd'hui ${timeLabel}`;
  if (isTomorrow(date)) return `Demain ${timeLabel}`;
  const dayPart = format(date, "EEE d MMM", { locale: fr });
  return `${dayPart} ${timeLabel}`;
}
