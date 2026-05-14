import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Clock, Loader2, Navigation, Search, X } from "lucide-react";
import { ACTION_BLUE } from "@/components/discover/DiscoverChromeShell";
import { stashDiscoverMapFlyTo } from "@/lib/discoverMapFlyTo";
import { geocodeSearchMapbox, type GeocodeSearchRow } from "@/lib/mapboxGeocode";
import { getMapboxAccessToken } from "@/lib/mapboxConfig";
import { useGeolocation } from "@/hooks/useGeolocation";
import { toast } from "sonner";

const BG = "#F2F2F7";

/** Lieu liste (popular / récent / résultats API). */
type ListedSpot = {
  id: string;
  icon: string;
  color: string;
  name: string;
  addr: string;
  lat: number;
  lng: number;
};

const RECENTS_LS = "rc.discoverLocationRecents.v1";

const POPULAR_RUNNING: ListedSpot[] = [
  {
    id: "l1",
    icon: "📍",
    color: "#FF3B30",
    name: "Parc des Buttes-Chaumont",
    addr: "1 Rue Botzaris, 75019 Paris",
    lat: 48.8779,
    lng: 2.381,
  },
  {
    id: "l2",
    icon: "📍",
    color: "#FF3B30",
    name: "Bois de Vincennes",
    addr: "Route de la Pyramide, 75012 Paris",
    lat: 48.8283,
    lng: 2.4394,
  },
  {
    id: "l3",
    icon: "📍",
    color: "#FF3B30",
    name: "Bois de Boulogne",
    addr: "16e arrondissement, Paris",
    lat: 48.8625,
    lng: 2.249,
  },
  {
    id: "l4",
    icon: "🏟",
    color: "#FF9500",
    name: "Stade Charléty",
    addr: "17 Avenue Pierre de Coubertin, 75013 Paris",
    lat: 48.819,
    lng: 2.348,
  },
  {
    id: "l5",
    icon: "📍",
    color: "#FF3B30",
    name: "Parc Monceau",
    addr: "35 Boulevard de Courcelles, 75008 Paris",
    lat: 48.879,
    lng: 2.309,
  },
  {
    id: "l6",
    icon: "📍",
    color: "#FF3B30",
    name: "Canal Saint-Martin",
    addr: "10e arrondissement, Paris",
    lat: 48.871,
    lng: 2.363,
  },
  {
    id: "l7",
    icon: "🏟",
    color: "#FF9500",
    name: "Hippodrome de Longchamp",
    addr: "Route des Tribunes, 75016 Paris",
    lat: 48.859,
    lng: 2.233,
  },
  {
    id: "l8",
    icon: "📍",
    color: "#FF3B30",
    name: "Parc de Belleville",
    addr: "47 Rue des Couronnes, 75020 Paris",
    lat: 48.872,
    lng: 2.388,
  },
];

const FALLBACK_RECENTS: ListedSpot[] = [
  {
    id: "seed-r1",
    icon: "📍",
    color: "#FF3B30",
    name: "Parc des Buttes-Chaumont",
    addr: "Paris 19e",
    lat: 48.8779,
    lng: 2.381,
  },
  {
    id: "seed-r2",
    icon: "🏟",
    color: "#FF9500",
    name: "Stade Charléty",
    addr: "Paris 13e",
    lat: 48.819,
    lng: 2.348,
  },
];

function loadRecentsFromStorage(): ListedSpot[] {
  try {
    const raw = localStorage.getItem(RECENTS_LS);
    if (!raw) return [...FALLBACK_RECENTS];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [...FALLBACK_RECENTS];
    const out: ListedSpot[] = [];
    for (const item of parsed) {
      if (!item || typeof item !== "object") continue;
      const o = item as ListedSpot;
      if (
        typeof o.id !== "string" ||
        typeof o.name !== "string" ||
        typeof o.addr !== "string" ||
        typeof o.lat !== "number" ||
        typeof o.lng !== "number"
      )
        continue;
      out.push({
        id: o.id,
        icon: typeof o.icon === "string" ? o.icon : "📍",
        color: typeof o.color === "string" ? o.color : "#FF3B30",
        name: o.name,
        addr: o.addr,
        lat: o.lat,
        lng: o.lng,
      });
    }
    return out.length > 0 ? out : [...FALLBACK_RECENTS];
  } catch {
    return [...FALLBACK_RECENTS];
  }
}

function saveRecentsToStorage(items: ListedSpot[]) {
  try {
    localStorage.setItem(RECENTS_LS, JSON.stringify(items.slice(0, 14)));
  } catch {
    /* no-op */
  }
}

function pushRecent(prev: ListedSpot[], spot: ListedSpot): ListedSpot[] {
  const keyRound = (n: number) => Math.round(n * 10000);
  const newId =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const next = [{ ...spot, id: `rc-${newId}` }];
  const seen = new Set<string>([`${keyRound(spot.lat)},${keyRound(spot.lng)}`]);
  for (const s of prev) {
    const k = `${keyRound(s.lat)},${keyRound(s.lng)}`;
    if (seen.has(k)) continue;
    seen.add(k);
    next.push(s);
    if (next.length >= 14) break;
  }
  return next;
}

function geocodeRowToSpot(row: GeocodeSearchRow, index: number): ListedSpot {
  const { lat, lng } = row.geometry.location;
  const slug = encodeURIComponent(`${row.formatted_address}|${lat}|${lng}`).slice(0, 80);
  return {
    id: `geo-${slug}-${index}`,
    icon: "📍",
    color: "#8E8E93",
    name: row.formatted_address.split(",")[0]?.trim() || row.formatted_address,
    addr: row.formatted_address,
    lat,
    lng,
  };
}

/**
 * Écran recherche de lieu Découvrir — géocodage Mapbox (globe) ; la carte applique la cible après retour (`discoverMapFlyTo`).
 */
export default function DiscoverLocationSearch() {
  const navigate = useNavigate();
  const locationReact = useLocation();
  const returnPathRaw = (locationReact.state as { returnPath?: string } | null)?.returnPath;
  const returnPath =
    typeof returnPathRaw === "string" && returnPathRaw.startsWith("/") ? returnPathRaw : "/";
  const normalizedReturn = returnPath.split("?")[0]!.split("#")[0]!;
  /** Évite de laisser un « vol » carte actif après retour depuis /feed (sans DiscoverMapCard). */
  const canRevealOnMap =
    normalizedReturn === "/" ||
    normalizedReturn === "/discover/live" ||
    normalizedReturn.startsWith("/discover/live/");
  const { getCurrentPosition } = useGeolocation();

  const geoSearchSeq = useRef(0);

  const [query, setQuery] = useState("");
  const [apiRows, setApiRows] = useState<GeocodeSearchRow[]>([]);
  const [searching, setSearching] = useState(false);
  const [recentSpots, setRecentSpots] = useState<ListedSpot[]>(() => loadRecentsFromStorage());
  const [locatingSelf, setLocatingSelf] = useState(false);

  const trimmed = query.trim();
  const hasMapboxGeocode = Boolean(getMapboxAccessToken());

  const popularFiltered = useMemo(() => {
    if (!trimmed) return [];
    const t = trimmed.toLowerCase();
    return POPULAR_RUNNING.filter((l) => l.name.toLowerCase().includes(t) || l.addr.toLowerCase().includes(t));
  }, [trimmed]);

  useEffect(() => {
    geoSearchSeq.current += 1;
    const mine = geoSearchSeq.current;

    if (!trimmed) {
      setApiRows([]);
      setSearching(false);
      return;
    }
    if (!hasMapboxGeocode) {
      setApiRows([]);
      setSearching(false);
      return;
    }

    const t = window.setTimeout(() => {
      void (async () => {
        if (mine !== geoSearchSeq.current) return;
        setSearching(true);
        try {
          const rows = await geocodeSearchMapbox(trimmed, 10, null);
          if (mine !== geoSearchSeq.current) return;
          setApiRows(rows);
        } catch {
          if (mine !== geoSearchSeq.current) return;
          setApiRows([]);
        } finally {
          if (mine === geoSearchSeq.current) setSearching(false);
        }
      })();
    }, 420);

    return () => {
      window.clearTimeout(t);
    };
  }, [trimmed, hasMapboxGeocode]);

  const applySelection = useCallback(
    (spot: ListedSpot, opts?: { saveRecent?: boolean }) => {
      if (!canRevealOnMap) {
        toast.info(
          "Ouvre Découvrir avec l’onglet Carte (ou Live), puis recherche une adresse : la carte s’y recentrera.",
        );
        navigate(returnPath, { replace: true });
        return;
      }
      stashDiscoverMapFlyTo({ lat: spot.lat, lng: spot.lng, zoom: 14 });
      if (opts?.saveRecent !== false) {
        setRecentSpots((prev) => {
          const next = pushRecent(prev, spot);
          saveRecentsToStorage(next);
          return next;
        });
      }
      navigate(returnPath, { replace: true });
    },
    [canRevealOnMap, navigate, returnPath],
  );

  const dismiss = () => navigate(returnPath, { replace: true });

  const onMyLocation = async () => {
    setLocatingSelf(true);
    try {
      const p = await getCurrentPosition(0, { mode: "fast" });
      if (!p) return;
      if (!canRevealOnMap) {
        toast.info(
          "Ouvre Découvrir depuis l’onglet Carte (ou Live) pour centrer la carte sur ta position.",
        );
        navigate(returnPath, { replace: true });
        return;
      }
      stashDiscoverMapFlyTo({ lat: p.lat, lng: p.lng, zoom: 15 });
      navigate(returnPath, { replace: true });
    } finally {
      setLocatingSelf(false);
    }
  };

  const apiSpots = useMemo(() => apiRows.map(geocodeRowToSpot), [apiRows]);

  const showSearchLoader =
    trimmed && searching && hasMapboxGeocode && !(apiSpots.length > 0 || popularFiltered.length > 0);
  const hasApiResults = trimmed && apiSpots.length > 0;
  const showEmptyHit = trimmed && !searching && !hasApiResults && popularFiltered.length === 0;

  /** Liste scroll : résultats recherche OU blocs récents + populaires. */
  let body: JSX.Element | null;

  if (trimmed) {
    body = (
      <>
        {showSearchLoader ? (
          <div className="flex items-center gap-3 px-4 py-4" style={{ background: "white" }}>
            <Loader2 className="h-[18px] w-[18px] flex-shrink-0 animate-spin text-[#8E8E93]" />
            <span style={{ fontSize: 15, color: "#8E8E93" }}>Recherche…</span>
          </div>
        ) : null}

        {hasApiResults ? (
          <div className="bg-white">
            {apiSpots.map((l, i) => (
              <Fragment key={l.id}>
                {i > 0 ? <div className="ml-[68px] h-px bg-[#E5E5EA]" /> : null}
                <SpotRow listed={l} onPick={() => applySelection(l)} />
              </Fragment>
            ))}
          </div>
        ) : null}

        {!hasMapboxGeocode && trimmed ? (
          <p className="px-4 pb-3 pt-2 text-center" style={{ fontSize: 13, color: "#8E8E93" }}>
            Pour chercher une adresse ou une rue partout comme sur la carte, la même configuration Mapbox que la carte doit
            être présente dans l&apos;application.
          </p>
        ) : null}

        {popularFiltered.length > 0 ? (
          <>
            {!hasApiResults ? null : (
              <p
                style={{
                  fontSize: 13,
                  fontWeight: 800,
                  color: "#8E8E93",
                  letterSpacing: "0.08em",
                  padding: "14px 16px 8px",
                }}
              >
                EXEMPLES
              </p>
            )}
            <div className="bg-white">
              {popularFiltered.map((l, i) => (
                <Fragment key={l.id}>
                  {i > 0 ? <div className="ml-[68px] h-px bg-[#E5E5EA]" /> : null}
                  <SpotRow listed={l} onPick={() => applySelection(l)} />
                </Fragment>
              ))}
            </div>
          </>
        ) : null}

        {showEmptyHit ? (
          <div className="px-6 py-12 text-center">
            <p style={{ fontSize: 15, color: "#8E8E93" }}>Aucun lieu trouvé pour &quot;{trimmed}&quot;</p>
          </div>
        ) : null}
      </>
    );
  } else {
    body = (
      <>
        <p
          style={{
            fontSize: 13,
            fontWeight: 800,
            color: "#8E8E93",
            letterSpacing: "0.08em",
            padding: "20px 16px 8px",
          }}
        >
          RÉCENTS
        </p>
        <div className="bg-white">
          {recentSpots.map((l, i) => (
            <Fragment key={l.id}>
              {i > 0 ? <div className="ml-[68px] h-px bg-[#E5E5EA]" /> : null}
              <SpotRow
                clockIcon
                listed={l}
                onPick={() =>
                  applySelection(l, {
                    saveRecent: false,
                  })
                }
              />
            </Fragment>
          ))}
        </div>

        <p
          style={{
            fontSize: 13,
            fontWeight: 800,
            color: "#8E8E93",
            letterSpacing: "0.08em",
            padding: "20px 16px 8px",
          }}
        >
          LIEUX POPULAIRES POUR COURIR
        </p>
        <div className="bg-white">
          {POPULAR_RUNNING.slice(0, 5).map((l, i) => (
            <Fragment key={l.id}>
              {i > 0 ? <div className="ml-[68px] h-px bg-[#E5E5EA]" /> : null}
              <SpotRow listed={l} onPick={() => applySelection(l)} />
            </Fragment>
          ))}
        </div>
      </>
    );
  }

  return (
    <div
      className="fixed inset-0 flex min-h-0 flex-col overflow-hidden"
      style={{
        zIndex: 200,
        background: BG,
        fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif",
      }}
    >
      <div
        className="flex flex-shrink-0 items-center gap-2 px-4 pb-3"
        style={{
          background: "white",
          borderBottom: "1px solid #E5E5EA",
          paddingTop: "calc(env(safe-area-inset-top, 0px) + 12px)",
        }}
      >
        <div
          className="flex flex-1 min-w-0 items-center gap-2"
          style={{
            background: "#F2F2F7",
            borderRadius: 10,
            padding: "8px 12px",
          }}
        >
          <Search className="h-[18px] w-[18px] flex-shrink-0" color="#8E8E93" strokeWidth={2.4} />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher un lieu, une adresse"
            className="min-w-0 flex-1 bg-transparent outline-none"
            style={{ fontSize: 16, color: "#0A0F1F", fontWeight: 500 }}
            enterKeyHint="search"
          />
          {query ? (
            <button type="button" onClick={() => setQuery("")} className="flex-shrink-0">
              <div
                className="flex items-center justify-center"
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: "50%",
                  background: "#C7C7CC",
                }}
              >
                <X className="h-3 w-3 text-white" strokeWidth={3.2} />
              </div>
            </button>
          ) : null}
        </div>
        <button type="button" onClick={dismiss} className="flex-shrink-0 transition-opacity active:opacity-70">
          <span style={{ fontSize: 16, fontWeight: 500, color: ACTION_BLUE, letterSpacing: "-0.01em" }}>Annuler</span>
        </button>
      </div>

      <div
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        <button
          type="button"
          disabled={locatingSelf}
          onClick={() => void onMyLocation()}
          className="flex w-full min-w-0 items-center gap-3 px-4 py-3.5 transition-colors enabled:active:bg-[#F8F8F8] disabled:opacity-50"
          style={{ background: "white", borderBottom: "1px solid #E5E5EA" }}
        >
          <div
            className="flex flex-shrink-0 items-center justify-center"
            style={{
              width: 36,
              height: 36,
              borderRadius: "50%",
              background: `${ACTION_BLUE}14`,
            }}
          >
            {locatingSelf ? (
              <Loader2 className="h-[18px] w-[18px] animate-spin" color={ACTION_BLUE} strokeWidth={2.4} />
            ) : (
              <Navigation className="h-[18px] w-[18px]" color={ACTION_BLUE} strokeWidth={2.4} />
            )}
          </div>
          <div className="min-w-0 flex-1 text-left">
            <p
              style={{
                fontSize: 16,
                fontWeight: 700,
                color: ACTION_BLUE,
                margin: 0,
                letterSpacing: "-0.01em",
              }}
            >
              Ma position actuelle
            </p>
          </div>
        </button>

        {body}

        <div style={{ height: 40 }} />
      </div>
    </div>
  );
}

function SpotRow(props: {
  listed: ListedSpot;
  clockIcon?: boolean;
  onPick: () => void;
}) {
  const { listed: l, clockIcon, onPick } = props;
  return (
    <button type="button" onClick={onPick} className="flex w-full min-w-0 items-center gap-3 px-4 py-3 transition-colors active:bg-[#F8F8F8]">
      <div
        className="flex flex-shrink-0 items-center justify-center"
        style={{
          width: 36,
          height: 36,
          borderRadius: "50%",
          background: clockIcon ? "#F2F2F7" : `${l.color}14`,
          fontSize: clockIcon ? undefined : 16,
        }}
      >
        {clockIcon ? (
          <Clock className="h-[18px] w-[18px]" color="#8E8E93" strokeWidth={2.4} />
        ) : (
          l.icon
        )}
      </div>
      <div className="min-w-0 flex-1 text-left">
        <p
          style={{
            fontSize: 15,
            fontWeight: 700,
            color: "#0A0F1F",
            margin: 0,
            letterSpacing: "-0.01em",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {l.name}
        </p>
        <p
          style={{
            fontSize: 13,
            color: "#8E8E93",
            margin: 0,
            marginTop: 2,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {l.addr}
        </p>
      </div>
    </button>
  );
}
