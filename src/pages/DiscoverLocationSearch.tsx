import { Fragment, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Clock, Navigation, Search, X } from "lucide-react";
import { ACTION_BLUE } from "@/components/discover/DiscoverChromeShell";

const BG = "#F2F2F7";

type MockLocation = {
  id: string;
  icon: string;
  color: string;
  name: string;
  addr: string;
};

const MOCK_LOCATIONS: MockLocation[] = [
  { id: "l1", icon: "📍", color: "#FF3B30", name: "Parc des Buttes-Chaumont", addr: "1 Rue Botzaris, 75019 Paris" },
  { id: "l2", icon: "📍", color: "#FF3B30", name: "Bois de Vincennes", addr: "Route de la Pyramide, 75012 Paris" },
  { id: "l3", icon: "📍", color: "#FF3B30", name: "Bois de Boulogne", addr: "16e arrondissement, Paris" },
  { id: "l4", icon: "🏟", color: "#FF9500", name: "Stade Charléty", addr: "17 Avenue Pierre de Coubertin, 75013 Paris" },
  { id: "l5", icon: "📍", color: "#FF3B30", name: "Parc Monceau", addr: "35 Boulevard de Courcelles, 75008 Paris" },
  { id: "l6", icon: "📍", color: "#FF3B30", name: "Canal Saint-Martin", addr: "10e arrondissement, Paris" },
  { id: "l7", icon: "🏟", color: "#FF9500", name: "Hippodrome de Longchamp", addr: "Route des Tribunes, 75016 Paris" },
  { id: "l8", icon: "📍", color: "#FF3B30", name: "Parc de Belleville", addr: "47 Rue des Couronnes, 75020 Paris" },
];

const MOCK_RECENT_LOCATIONS: MockLocation[] = [
  { id: "r1", icon: "📍", color: "#FF3B30", name: "Parc des Buttes-Chaumont", addr: "Paris 19e" },
  { id: "r2", icon: "🏟", color: "#FF9500", name: "Stade Charléty", addr: "Paris 13e" },
];

/**
 * Écran recherche de lieu Découvrir — fidèle au sheet `LocationSearchSheet` de RunConnect (7).jsx (maquette).
 */
export default function DiscoverLocationSearch() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");

  const filtered = query.trim()
    ? MOCK_LOCATIONS.filter(
        (l) =>
          l.name.toLowerCase().includes(query.toLowerCase()) ||
          l.addr.toLowerCase().includes(query.toLowerCase()),
      )
    : [];

  const dismiss = () => navigate(-1);

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
          className="flex flex-1 items-center gap-2"
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
            className="flex-1 bg-transparent outline-none"
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
          <span
            style={{ fontSize: 16, fontWeight: 500, color: ACTION_BLUE, letterSpacing: "-0.01em" }}
          >
            Annuler
          </span>
        </button>
      </div>

      <div
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        <button
          type="button"
          onClick={() => dismiss()}
          className="flex w-full items-center gap-3 px-4 py-3.5 transition-colors active:bg-[#F8F8F8]"
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
            <Navigation className="h-[18px] w-[18px]" color={ACTION_BLUE} strokeWidth={2.4} />
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

        {filtered.length > 0 ? (
          <div className="bg-white">
            {filtered.map((l, i) => (
              <Fragment key={l.id}>
                {i > 0 ? <div className="ml-[68px] h-px bg-[#E5E5EA]" /> : null}
                <button
                  type="button"
                  onClick={() => dismiss()}
                  className="flex w-full items-center gap-3 px-4 py-3 transition-colors active:bg-[#F8F8F8]"
                >
                  <div
                    className="flex flex-shrink-0 items-center justify-center"
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: "50%",
                      background: `${l.color}14`,
                      fontSize: 16,
                    }}
                  >
                    {l.icon}
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
              </Fragment>
            ))}
          </div>
        ) : query.trim() ? (
          <div className="px-6 py-12 text-center">
            <p style={{ fontSize: 15, color: "#8E8E93" }}>Aucun lieu trouvé pour &quot;{query}&quot;</p>
          </div>
        ) : (
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
              {MOCK_RECENT_LOCATIONS.map((l, i) => (
                <Fragment key={l.id}>
                  {i > 0 ? <div className="ml-[68px] h-px bg-[#E5E5EA]" /> : null}
                  <button
                    type="button"
                    onClick={() => dismiss()}
                    className="flex w-full items-center gap-3 px-4 py-3 transition-colors active:bg-[#F8F8F8]"
                  >
                    <div
                      className="flex flex-shrink-0 items-center justify-center"
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: "50%",
                        background: "#F2F2F7",
                      }}
                    >
                      <Clock className="h-[18px] w-[18px]" color="#8E8E93" strokeWidth={2.4} />
                    </div>
                    <div className="min-w-0 flex-1 text-left">
                      <p
                        style={{
                          fontSize: 15,
                          fontWeight: 700,
                          color: "#0A0F1F",
                          margin: 0,
                          letterSpacing: "-0.01em",
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
                        }}
                      >
                        {l.addr}
                      </p>
                    </div>
                  </button>
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
              {MOCK_LOCATIONS.slice(0, 5).map((l, i) => (
                <Fragment key={l.id}>
                  {i > 0 ? <div className="ml-[68px] h-px bg-[#E5E5EA]" /> : null}
                  <button
                    type="button"
                    onClick={() => dismiss()}
                    className="flex w-full items-center gap-3 px-4 py-3 transition-colors active:bg-[#F8F8F8]"
                  >
                    <div
                      className="flex flex-shrink-0 items-center justify-center"
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: "50%",
                        background: `${l.color}14`,
                        fontSize: 16,
                      }}
                    >
                      {l.icon}
                    </div>
                    <div className="min-w-0 flex-1 text-left">
                      <p
                        style={{
                          fontSize: 15,
                          fontWeight: 700,
                          color: "#0A0F1F",
                          margin: 0,
                          letterSpacing: "-0.01em",
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
                </Fragment>
              ))}
            </div>
          </>
        )}

        <div style={{ height: 40 }} />
      </div>
    </div>
  );
}
