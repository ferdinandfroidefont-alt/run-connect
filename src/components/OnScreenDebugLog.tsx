import { useCallback, useEffect, useState } from "react";
import {
  clearOnScreenLogs,
  getOnScreenLogs,
  isOnScreenLogsEnabled,
  subscribeOnScreenLogs,
  type OnScreenLogEntry,
} from "@/lib/onScreenLogCapture";
import { cn } from "@/lib/utils";

function formatTime(t: number): string {
  try {
    const d = new Date(t);
    return `${d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" })}.${String(d.getMilliseconds()).padStart(3, "0")}`;
  } catch {
    return String(t);
  }
}

export function OnScreenDebugLog() {
  const [open, setOpen] = useState(true);
  const [lines, setLines] = useState(() => [...getOnScreenLogs()]);

  useEffect(
    () =>
      subscribeOnScreenLogs(() => {
        setLines([...getOnScreenLogs()]);
      }),
    [],
  );

  const copyAll = useCallback(async () => {
    const text = lines
      .map((l) => `[${formatTime(l.t)}] ${l.level.toUpperCase()} ${l.message}`)
      .join("\n");
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      /* ignore */
    }
  }, [lines]);

  if (!isOnScreenLogsEnabled()) return null;

  return (
    <div
      className={cn(
        "pointer-events-auto fixed left-0 right-0 z-[9999] flex max-h-[40vh] flex-col border-t border-border/80 bg-background/95 text-foreground shadow-lg backdrop-blur-md",
        "pb-[env(safe-area-inset-bottom)]",
        open ? "bottom-0" : "bottom-0 max-h-9",
      )}
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <div className="flex min-h-9 shrink-0 items-center gap-2 border-b border-border/60 px-2 py-1">
        <button
          type="button"
          className="text-[11px] font-semibold text-muted-foreground"
          onClick={() => setOpen((o) => !o)}
        >
          Logs {open ? "▼" : "▲"} ({lines.length})
        </button>
        <button
          type="button"
          className="ml-auto rounded-md border border-border px-2 py-0.5 text-[10px] text-muted-foreground"
          onClick={() => void copyAll()}
        >
          Copier
        </button>
        <button
          type="button"
          className="rounded-md border border-border px-2 py-0.5 text-[10px] text-muted-foreground"
          onClick={() => clearOnScreenLogs()}
        >
          Effacer
        </button>
      </div>
      {open && (
        <div className="min-h-0 flex-1 overflow-auto px-2 py-1 font-mono text-[10px] leading-snug">
          {lines.length === 0 ? (
            <span className="text-muted-foreground">Aucun log pour l’instant.</span>
          ) : (
            lines.map((l: OnScreenLogEntry, i: number) => (
              <div
                key={`${l.t}-${i}`}
                className={cn(
                  "whitespace-pre-wrap break-words border-b border-border/30 py-0.5",
                  l.level === "error" && "text-destructive",
                  l.level === "warn" && "text-amber-600 dark:text-amber-400",
                )}
              >
                <span className="text-muted-foreground">{formatTime(l.t)} </span>
                <span className="font-semibold">{l.level} </span>
                {l.message}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
