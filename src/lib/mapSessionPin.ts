/**
 * Pin séance carte (Accueil / mini-cartes) — rendu DOM Mapbox, cohérent avec la couleur primaire app.
 */

export type SessionPinVariant = "minimal" | "depth" | "premium";

/** Métadonnées affichées à droite de l’avatar (bulle blanche). */
export type SessionPinMeta = {
  /** Ex. « Aujourd'hui 18h30 » */
  scheduleLine: string;
  /** Ex. « à 15km » ; vide pour masquer la 2ᵉ ligne */
  distanceLine?: string;
};

/** Variante affichée sur la carte : `depth` = relief léger + dégradé discret (défaut). */
export const DEFAULT_SESSION_PIN_VARIANT: SessionPinVariant = "depth";
/** Décalage vertical (px) pour aligner le centre visuel du pin sur le point Mapbox. */
export const SESSION_PIN_CENTER_OFFSET_Y: number = 39;

function resolveSessionPinColor(activityType?: string): string {
  const t = (activityType ?? "").toLowerCase();
  if (t.includes("trail") || t.includes("rando") || t.includes("marche") || t.includes("walk") || t.includes("hike")) {
    return "#7b2cbf";
  }
  if (t.includes("velo") || t.includes("vtt") || t.includes("bike") || t.includes("cycl") || t.includes("gravel")) {
    return "#0e8e3a";
  }
  if (t.includes("nat") || t.includes("swim") || t.includes("kayak") || t.includes("surf")) {
    return "#00858f";
  }
  if (t.includes("muscu") || t.includes("strength") || t.includes("gym") || t.includes("crossfit")) {
    return "#cc4d00";
  }
  return "#0066cc";
}

/** `VITE_MAP_PIN_VARIANT` = `minimal` | `depth` | `premium` (sinon défaut). */
export function resolveSessionPinVariant(): SessionPinVariant {
  const v = import.meta.env.VITE_MAP_PIN_VARIANT as string | undefined;
  if (v === "minimal" || v === "depth" || v === "premium") return v;
  return DEFAULT_SESSION_PIN_VARIANT;
}

/**
 * Crée le bouton pin (cercle + pointe + photo), optionnellement bulle infos à droite.
 */
export function createSessionPinButton(opts: {
  avatarUrl: string;
  ariaLabel: string;
  variant?: SessionPinVariant;
  meta?: SessionPinMeta;
  activityType?: string;
  colorOverride?: string;
}): HTMLButtonElement {
  const variant = opts.variant ?? resolveSessionPinVariant();
  const pinColor = opts.colorOverride ?? resolveSessionPinColor(opts.activityType);

  const pin = document.createElement("button");
  pin.type = "button";
  pin.className = "rc-session-pin__shape";
  pin.dataset.rcPinVariant = variant;
  pin.setAttribute("aria-label", opts.ariaLabel);
  pin.style.position = "absolute";
  pin.style.left = "50%";
  pin.style.top = "0";
  pin.style.transform = "translate(-50%, -100%)";
  pin.style.border = "0";
  pin.style.padding = "0";
  pin.style.margin = "0";
  pin.style.background = "transparent";
  pin.style.cursor = "pointer";
  pin.style.setProperty("--rc-session-pin-color", pinColor);
  (pin.style as CSSStyleDeclaration & { webkitTapHighlightColor?: string }).webkitTapHighlightColor = "transparent";

  const visual = document.createElement("span");
  visual.className = "rc-session-pin__marker-visual";

  // Pin shape from Apple-style mockup: exact SVG path (viewBox 80x96).
  const shell = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  shell.setAttribute("viewBox", "0 0 80 96");
  shell.setAttribute("aria-hidden", "true");
  shell.classList.add("rc-session-pin__shell");
  const shellPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
  shellPath.setAttribute("d", "M 40 0 A 40 40 0 0 1 68 68.57 L 40 96 L 12 68.57 A 40 40 0 0 1 40 0 Z");
  shellPath.setAttribute("fill", "var(--rc-session-pin-color, #007aff)");
  shell.appendChild(shellPath);

  const ground = document.createElement("span");
  ground.className = "rc-session-pin__ground";
  ground.setAttribute("aria-hidden", "true");

  const circle = document.createElement("span");
  circle.className = "rc-session-pin__circle";

  const avatarRing = document.createElement("span");
  avatarRing.className = "rc-session-pin__avatar-ring";
  const avatarImg = document.createElement("img");
  avatarImg.className = "rc-session-pin__avatar";
  avatarImg.src = opts.avatarUrl || "/placeholder.svg";
  avatarImg.alt = "";
  avatarImg.draggable = false;
  avatarImg.style.width = "100%";
  avatarImg.style.height = "100%";
  avatarImg.style.objectFit = "cover";
  avatarImg.style.pointerEvents = "none";
  avatarRing.appendChild(avatarImg);

  const tip = document.createElement("span");
  tip.className = "rc-session-pin__tip";

  visual.appendChild(ground);
  visual.appendChild(shell);
  visual.appendChild(circle);
  visual.appendChild(avatarRing);
  visual.appendChild(tip);

  pin.appendChild(visual);

  if (opts.meta?.scheduleLine) {
    const scheduleText = opts.meta.scheduleLine.trim();
    if (scheduleText) {
      const meta = document.createElement("span");
      meta.className = "rc-session-pin__meta";
      meta.setAttribute("aria-hidden", "true");

      const scheduleSpan = document.createElement("span");
      scheduleSpan.className = "rc-session-pin__meta-schedule";
      scheduleSpan.textContent = scheduleText;

      const distanceSpan = document.createElement("span");
      distanceSpan.className = "rc-session-pin__meta-distance";
      const dLine = opts.meta.distanceLine?.trim();
      if (dLine) {
        distanceSpan.textContent = dLine;
      } else {
        distanceSpan.classList.add("is-empty");
      }

      meta.appendChild(scheduleSpan);
      meta.appendChild(distanceSpan);
      pin.appendChild(meta);
    }
  }

  return pin;
}
