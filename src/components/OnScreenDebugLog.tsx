import { useCallback, useEffect, useRef, useState } from "react";
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
  const scrollerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    window.__BOOT_REACT_OVERLAY_MOUNTED__ = true;
    const raw = document.getElementById("__boot-log-overlay");
    if (raw) raw.style.display = "none";
    return () => {
      window.__BOOT_REACT_OVERLAY_MOUNTED__ = false;
      if (raw) raw.style.display = "flex";
    };
  }, []);

  useEffect(
    () =>
      subscribeOnScreenLogs(() => {
        setLines([...getOnScreenLogs()]);
      }),
    [],
  );

  useEffect(() => {
    const node = scrollerRef.current;
    if (!node || !open) return;
    node.scrollTop = node.scrollHeight;
  }, [lines, open]);

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
        "pointer-events-auto fixed left-0 right-0 z-[9999] flex max-h-[45vh] flex-col border-t border-emerald-300/30 bg-black/95 text-emerald-200 shadow-lg",
        "pb-[env(safe-area-inset-bottom)]",
        open ? "bottom-0" : "bottom-0 max-h-9",
      )}
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <div className="flex min-h-9 shrink-0 items-center gap-2 border-b border-emerald-300/20 px-2 py-1 text-white">
        <button
          type="button"
          className="text-[11px] font-semibold text-emerald-100"
          onClick={() => setOpen((o) => !o)}
        >
          Logs {open ? "▼" : "▲"} ({lines.length})
        </button>
        <button
          type="button"
          className="ml-auto rounded-md border border-emerald-300/30 px-2 py-0.5 text-[10px] text-emerald-100"
          onClick={() => void copyAll()}
        >
          Copier
        </button>
        <button
          type="button"
          className="rounded-md border border-emerald-300/30 px-2 py-0.5 text-[10px] text-emerald-100"
          onClick={() => clearOnScreenLogs()}
        >
          Effacer
        </button>
      </div>
      {open && (
        <div ref={scrollerRef} className="min-h-0 flex-1 overflow-auto px-2 py-1 font-mono text-[10px] leading-snug">
          {lines.length === 0 ? (
            <span className="text-emerald-100/70">Aucun log pour l’instant.</span>
          ) : (
            lines.map((l: OnScreenLogEntry, i: number) => (
              <div
                key={`${l.t}-${i}`}
                className={cn(
                  "whitespace-pre-wrap break-words border-b border-white/5 py-0.5",
                  l.level === "error" && "text-red-300",
                  l.level === "warn" && "text-amber-300",
                  (l.level === "log" || l.level === "debug") && "text-emerald-200",
                  l.level === "info" && "text-white",
                )}
              >
                <span className="text-emerald-100/55">{formatTime(l.t)} </span>
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
