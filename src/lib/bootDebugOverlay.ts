/**
 * Boot Debug Overlay — TEMPORARY diagnostic tool for iOS white screen.
 *
 * Injects small visual checkpoint pills in the top-left corner so we can
 * see exactly how far the boot sequence gets, even if the React tree or
 * console panel never mounts.
 *
 * Everything is gated behind `isOnScreenLogsEnabled()` so it stays invisible
 * in production web builds.
 *
 * To remove: search for `addBootCheckpoint` across the codebase and delete
 * all call sites, then delete this file.
 */

import { isOnScreenLogsEnabled } from "@/lib/onScreenLogCapture";

const BOOT_T0 = Date.now();
let containerEl: HTMLDivElement | null = null;
let watchdogTimer: ReturnType<typeof setTimeout> | null = null;
let lastCheckpoint = "(none)";
let ready = false;

function enabled(): boolean {
  try {
    return isOnScreenLogsEnabled();
  } catch {
    // Module may not be ready yet at very early call sites
    return false;
  }
}

function ensureContainer(): HTMLDivElement | null {
  if (containerEl) return containerEl;
  if (typeof document === "undefined") return null;
  const el = document.createElement("div");
  el.id = "__boot-debug-overlay";
  Object.assign(el.style, {
    position: "fixed",
    top: "env(safe-area-inset-top, 4px)",
    left: "4px",
    zIndex: "100000",
    display: "flex",
    flexDirection: "column",
    gap: "2px",
    pointerEvents: "none",
    fontFamily: "monospace",
    fontSize: "9px",
    lineHeight: "1.2",
    opacity: "0.85",
  } as CSSStyleDeclaration);
  document.documentElement.appendChild(el);
  containerEl = el;
  return el;
}

function addPill(label: string, elapsed: number) {
  const c = ensureContainer();
  if (!c) return;
  const pill = document.createElement("div");
  Object.assign(pill.style, {
    background: "rgba(0,0,0,0.7)",
    color: "#0f0",
    padding: "1px 4px",
    borderRadius: "3px",
    whiteSpace: "nowrap",
  } as CSSStyleDeclaration);
  pill.textContent = `${label} +${elapsed}ms`;
  c.appendChild(pill);
}

function startWatchdog() {
  if (watchdogTimer) return;
  watchdogTimer = setTimeout(() => {
    if (ready) return;
    const c = ensureContainer();
    if (!c) return;
    const banner = document.createElement("div");
    Object.assign(banner.style, {
      position: "fixed",
      top: "0",
      left: "0",
      right: "0",
      zIndex: "100001",
      background: "#e00",
      color: "#fff",
      padding: "12px 16px",
      fontFamily: "system-ui, sans-serif",
      fontSize: "13px",
      lineHeight: "1.4",
      pointerEvents: "auto",
      paddingTop: "calc(env(safe-area-inset-top, 4px) + 12px)",
    } as CSSStyleDeclaration);
    banner.innerHTML = `
      <b>⚠ BOOT TIMEOUT (8s)</b><br/>
      Dernier checkpoint : <b>${lastCheckpoint}</b><br/>
      URL : ${window.location.href}<br/>
      UA : ${navigator.userAgent.slice(0, 80)}…<br/>
      <button onclick="window.location.reload()"
        style="margin-top:8px;padding:6px 16px;background:#fff;color:#e00;border:none;border-radius:6px;font-weight:bold;cursor:pointer">
        Recharger
      </button>
    `;
    document.documentElement.appendChild(banner);
  }, 8000);
}

/**
 * Call this at each meaningful boot step. Each call appends a small green pill
 * in the top-left corner showing the label and time since page load.
 *
 * When label is "APP_READY", the watchdog is cancelled.
 */
export function addBootCheckpoint(label: string) {
  if (!enabled()) return;

  const elapsed = Date.now() - BOOT_T0;
  lastCheckpoint = label;

  // Also push to bootLog for the existing log panel
  try {
    const { bootLog } = require("@/lib/onScreenLogCapture");
    bootLog(`[CHECKPOINT] ${label}`, { elapsed });
  } catch {
    /* early boot — ignore */
  }

  addPill(label, elapsed);
  startWatchdog();

  if (label === "APP_READY") {
    ready = true;
    if (watchdogTimer) {
      clearTimeout(watchdogTimer);
      watchdogTimer = null;
    }
    // Auto-hide pills after 6s once app is ready
    setTimeout(() => {
      if (containerEl) {
        containerEl.style.display = "none";
      }
    }, 6000);
  }
}
