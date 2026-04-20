import type { Marker } from "mapbox-gl";
import { loadMapboxGl } from "@/lib/mapboxLazy";

/**
 * Couleur primaire runtime (variables Tailwind : `--primary` = "H S% L%" sans préfixe hsl).
 */
export function getAppPrimaryHslColor(): string {
  if (typeof document === "undefined") return "hsl(212 100% 50%)";
  const raw = getComputedStyle(document.documentElement).getPropertyValue("--primary").trim();
  if (!raw) return "hsl(212 100% 50%)";
  return `hsl(${raw.split("/")[0].trim()})`;
}

/** Luminosité (0–100) d’un triplet CSS type "H S% L%" (ignore la partie / alpha). */
function cssTripletLightnessPercent(triplet: string): number | null {
  const base = triplet.trim().split("/")[0].trim();
  const parts = base.split(/\s+/).filter(Boolean);
  if (parts.length < 3) return null;
  const l = parseFloat(parts[2].replace("%", ""));
  return Number.isFinite(l) ? l : null;
}

/**
 * Remplissage du point « position actuelle » sur la carte.
 * Si `--primary` est très clair (peu de contraste avec une bordure blanche), on utilise `--primary-foreground`.
 */
export function getUserLocationDotFillColor(): string {
  if (typeof document === "undefined") return "hsl(212 100% 50%)";
  const rs = getComputedStyle(document.documentElement);
  const primaryRaw = rs.getPropertyValue("--primary").trim();
  const pfRaw = rs.getPropertyValue("--primary-foreground").trim();
  if (!primaryRaw) return "hsl(212 100% 50%)";
  const primaryL = cssTripletLightnessPercent(primaryRaw);
  const primaryHsl = `hsl(${primaryRaw.split("/")[0].trim()})`;
  if (primaryL !== null && primaryL >= 76 && pfRaw) {
    return `hsl(${pfRaw.split("/")[0].trim()})`;
  }
  return primaryHsl;
}

/**
 * Marqueur HTML stable (pas de pulse, pas de halo) — point bleu app + bord blanc discret.
 */
export function createStableUserLocationMarkerElement(): HTMLDivElement {
  const wrap = document.createElement("div");
  wrap.style.display = "flex";
  wrap.style.alignItems = "center";
  wrap.style.justifyContent = "center";
  wrap.style.width = "28px";
  wrap.style.height = "28px";
  wrap.style.pointerEvents = "none";
  wrap.setAttribute("aria-hidden", "true");

  const dot = document.createElement("div");
  dot.style.width = "13px";
  dot.style.height = "13px";
  dot.style.borderRadius = "9999px";
  dot.style.boxSizing = "border-box";
  dot.style.backgroundColor = getUserLocationDotFillColor();
  dot.style.border = "2.5px solid white";
  dot.style.boxShadow = "0 0 0 1px rgba(0,0,0,0.14)";

  wrap.appendChild(dot);
  return wrap;
}

/** @deprecated Préférer createStableUserLocationMarkerElement / createUserLocationMapboxMarker */
export function createUserLocationMapIconDataUrl(): string {
  const size = 36;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";

  const color = getUserLocationDotFillColor();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, 5.5, 0, 2 * Math.PI);
  ctx.fill();
  ctx.strokeStyle = "white";
  ctx.lineWidth = 2.5;
  ctx.stroke();
  ctx.strokeStyle = "rgba(0,0,0,0.12)";
  ctx.lineWidth = 1;
  ctx.stroke();

  return canvas.toDataURL("image/png");
}

/** Marqueur Mapbox « position utilisateur » (sans l’ajouter à la carte). */
export async function createUserLocationMapboxMarker(lng: number, lat: number): Promise<Marker> {
  const mapboxgl = await loadMapboxGl();
  const el = createStableUserLocationMarkerElement();
  return new mapboxgl.Marker({ element: el, anchor: "center" }).setLngLat([lng, lat]);
}
