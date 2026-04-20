import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, FileText, Route, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const STORY_DRAFT_STORAGE_KEY = "runconnect_story_create_draft_v1";
const ROUTE_DRAFT_STORAGE_KEY = "runconnect_route_creation_draft_v1";

type DraftRow = {
  id: "story" | "route";
  title: string;
  subtitle: string;
  savedAt: number;
};

type SwipeState = {
  id: DraftRow["id"];
  startX: number;
  baseX: number;
};

export default function Drafts() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [refreshTick, setRefreshTick] = useState(0);
  const [openSwipeId, setOpenSwipeId] = useState<DraftRow["id"] | null>(null);
  const [offsets, setOffsets] = useState<Record<string, number>>({});
  const swipeRef = useRef<SwipeState | null>(null);

  const mode: "all" | "stories" | "routes" =
    pathname.includes("/drafts/stories") ? "stories" : pathname.includes("/drafts/routes") ? "routes" : "all";

  const rows = useMemo(() => {
    const list: DraftRow[] = [];
    try {
      const storyRaw = localStorage.getItem(STORY_DRAFT_STORAGE_KEY);
      if (storyRaw && mode !== "routes") {
        const story = JSON.parse(storyRaw) as { savedAt?: number };
        list.push({
          id: "story",
          title: "Story",
          subtitle: "Créer une story",
          savedAt: Number(story?.savedAt ?? 0),
        });
      }
      const routeRaw = localStorage.getItem(ROUTE_DRAFT_STORAGE_KEY);
      if (routeRaw && mode !== "stories") {
        const route = JSON.parse(routeRaw) as { savedAt?: number };
        list.push({
          id: "route",
          title: "Itinéraire",
          subtitle: "Création d’itinéraire",
          savedAt: Number(route?.savedAt ?? 0),
        });
      }
    } catch {
      return [];
    }
    return list.sort((a, b) => b.savedAt - a.savedAt);
  }, [refreshTick, mode]);

  useEffect(() => {
    if (rows.length === 0) setOpenSwipeId(null);
  }, [rows.length]);

  const formatSavedAt = (savedAt: number): string => {
    if (!Number.isFinite(savedAt) || savedAt <= 0) return "Date inconnue";
    return new Date(savedAt).toLocaleString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const openDraft = (row: DraftRow) => {
    if (row.id === "story") {
      navigate("/stories/create?restoreDraft=1");
      return;
    }
    navigate("/route-create?restoreDraft=1");
  };

  const deleteDraft = (row: DraftRow) => {
    try {
      localStorage.removeItem(row.id === "story" ? STORY_DRAFT_STORAGE_KEY : ROUTE_DRAFT_STORAGE_KEY);
    } catch {
      // ignore
    }
    setRefreshTick((v) => v + 1);
    setOpenSwipeId(null);
    setOffsets((prev) => ({ ...prev, [row.id]: 0 }));
  };

  return (
    <div className="fixed inset-0 z-[180] flex flex-col bg-background">
      <div className="shrink-0 border-b border-border bg-card pt-[env(safe-area-inset-top,0px)]">
        <div className="grid grid-cols-[72px_1fr_72px] items-center px-3 py-2.5">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="justify-self-start inline-flex items-center gap-1 rounded-full px-2 py-1 text-[15px] font-medium text-primary active:opacity-70"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour
          </button>
          <h1 className="truncate px-2 text-center text-[17px] font-semibold text-foreground">
            {mode === "stories" ? "Brouillons story" : mode === "routes" ? "Brouillons itinéraire" : "Brouillons"}
          </h1>
          <div aria-hidden />
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-[max(16px,env(safe-area-inset-bottom,16px))] pt-4">
        {rows.length === 0 ? (
          <div className="ios-card rounded-2xl border border-border/60 bg-card p-5 text-center">
            <p className="text-sm font-semibold text-foreground">Aucun brouillon</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {mode === "stories"
                ? "Tes stories non publiées apparaîtront ici."
                : mode === "routes"
                  ? "Tes brouillons d’itinéraire apparaîtront ici."
                  : "Tes stories et itinéraires non publiés apparaîtront ici."}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {rows.map((row) => {
              const offset = offsets[row.id] ?? (openSwipeId === row.id ? -92 : 0);
              return (
                <div key={row.id} className="relative overflow-hidden rounded-2xl">
                  <div className="absolute inset-y-0 right-0 flex w-[92px] items-center justify-center bg-destructive/12">
                    <Button
                      type="button"
                      variant="ghost"
                      className="h-full w-full rounded-none text-destructive hover:bg-destructive/15"
                      onClick={() => deleteDraft(row)}
                    >
                      <Trash2 className="mr-1 h-4 w-4" />
                      Suppr.
                    </Button>
                  </div>
                  <button
                    type="button"
                    className="ios-card relative z-[1] flex w-full items-center gap-3 rounded-2xl border border-border/60 bg-card px-4 py-4 text-left transition-transform"
                    style={{ transform: `translateX(${offset}px)` }}
                    onClick={() => openDraft(row)}
                    onPointerDown={(e) => {
                      swipeRef.current = { id: row.id, startX: e.clientX, baseX: offset };
                      (e.currentTarget as HTMLButtonElement).setPointerCapture(e.pointerId);
                    }}
                    onPointerMove={(e) => {
                      if (!swipeRef.current || swipeRef.current.id !== row.id) return;
                      const delta = e.clientX - swipeRef.current.startX;
                      const next = Math.max(-92, Math.min(0, swipeRef.current.baseX + delta));
                      setOffsets((prev) => ({ ...prev, [row.id]: next }));
                    }}
                    onPointerUp={(e) => {
                      if (!swipeRef.current || swipeRef.current.id !== row.id) return;
                      const current = offsets[row.id] ?? 0;
                      const open = current <= -46;
                      setOpenSwipeId(open ? row.id : null);
                      setOffsets((prev) => ({ ...prev, [row.id]: open ? -92 : 0 }));
                      swipeRef.current = null;
                      try {
                        (e.currentTarget as HTMLButtonElement).releasePointerCapture(e.pointerId);
                      } catch {
                        // ignore
                      }
                    }}
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary">
                      {row.id === "story" ? <FileText className="h-4 w-4 text-primary" /> : <Route className="h-4 w-4 text-primary" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-foreground">{row.title}</p>
                      <p className="text-xs text-muted-foreground">{row.subtitle}</p>
                    </div>
                    <p className="shrink-0 text-[11px] text-muted-foreground">{formatSavedAt(row.savedAt)}</p>
                  </button>
                </div>
              );
            })}
            <p className="px-1 text-[11px] text-muted-foreground">Glisse vers la gauche pour supprimer un brouillon.</p>
          </div>
        )}
      </div>
    </div>
  );
}

