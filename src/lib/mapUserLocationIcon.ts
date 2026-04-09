import mapboxgl from "mapbox-gl";

/**
 * Couleur primaire runtime (variables Tailwind : `--primary` = "H S% L%" sans préfixe hsl).
 */
export function getAppPrimaryHslColor(): string {
  if (typeof document === "undefined") return "hsl(212 100% 50%)";
  const raw = getComputedStyle(document.documentElement).getPropertyValue("--primary").trim();
  if (!raw) return "hsl(212 100% 50%)";
  return `hsl(${raw})`;
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
  dot.style.backgroundColor = getAppPrimaryHslColor();
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

  const color = getAppPrimaryHslColor();
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
export function createUserLocationMapboxMarker(lng: number, lat: number): mapboxgl.Marker {
  const el = createStableUserLocationMarkerElement();
  return new mapboxgl.Marker({ element: el, anchor: "center" }).setLngLat([lng, lat]);
}
