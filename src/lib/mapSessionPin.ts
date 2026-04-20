/**
 * Pin séance carte (Accueil / mini-cartes) — rendu DOM Mapbox, cohérent avec la couleur primaire app.
 */

export type SessionPinVariant = "minimal" | "depth" | "premium";

/** Variante affichée sur la carte : `depth` = relief léger + dégradé discret (défaut). */
export const DEFAULT_SESSION_PIN_VARIANT: SessionPinVariant = "depth";

/** `VITE_MAP_PIN_VARIANT` = `minimal` | `depth` | `premium` (sinon défaut). */
export function resolveSessionPinVariant(): SessionPinVariant {
  const v = import.meta.env.VITE_MAP_PIN_VARIANT as string | undefined;
  if (v === "minimal" || v === "depth" || v === "premium") return v;
  return DEFAULT_SESSION_PIN_VARIANT;
}

/**
 * Crée le bouton pin (cercle + pointe + photo), prêt à être inséré dans le wrapper Mapbox (anchor bottom).
 */
export function createSessionPinButton(opts: {
  avatarUrl: string;
  ariaLabel: string;
  variant?: SessionPinVariant;
}): HTMLButtonElement {
  const variant = opts.variant ?? resolveSessionPinVariant();

  const pin = document.createElement("button");
  pin.type = "button";
  pin.className = "rc-session-pin__shape";
  pin.dataset.rcPinVariant = variant;
  pin.setAttribute("aria-label", opts.ariaLabel);
  pin.style.display = "block";
  pin.style.position = "absolute";
  pin.style.left = "50%";
  pin.style.top = "0";
  pin.style.transform = "translate(-50%, -100%)";
  pin.style.width = "58px";
  pin.style.height = "72px";
  pin.style.border = "0";
  pin.style.padding = "0";
  pin.style.margin = "0";
  pin.style.background = "transparent";
  pin.style.cursor = "pointer";
  (pin.style as CSSStyleDeclaration & { webkitTapHighlightColor?: string }).webkitTapHighlightColor = "transparent";

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

  pin.appendChild(ground);
  pin.appendChild(circle);
  pin.appendChild(avatarRing);
  pin.appendChild(tip);

  return pin;
}
