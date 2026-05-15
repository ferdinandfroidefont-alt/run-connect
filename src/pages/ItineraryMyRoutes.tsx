import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { differenceInCalendarDays } from 'date-fns';
import { MapPin, Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { IosFixedPageHeaderShell } from '@/components/layout/IosFixedPageHeaderShell';
import { IosPageHeaderBar } from '@/components/layout/IosPageHeaderBar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { RouteCard } from '@/components/RouteCard';
import { useMyRoutesList, type MyRouteRow } from '@/hooks/useMyRoutesList';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

/** Bleu action — aligné maquette `MesItinerairesPage` (RunConnect (12).jsx). */
const ACTION_BLUE = '#007AFF';

type FilterPill = 'all' | 'run' | 'bike' | 'fav';

type LocationState = { itineraryBackTo?: string };

function modifiedLabel(route: MyRouteRow) {
  const raw = route.updated_at || route.created_at;
  const days = differenceInCalendarDays(new Date(), new Date(raw));
  if (days <= 0) return "Aujourd'hui";
  if (days === 1) return 'Modifié il y a 1j';
  return `Modifié il y a ${days}j`;
}

const isRunActivity = (t: string | null | undefined) =>
  !t || t === 'course' || t === 'running' || t === 'trail' || t === 'marche';
const isBikeActivity = (t: string | null | undefined) => t === 'velo' || t === 'cycling';

export default function ItineraryMyRoutes() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { routes, loading } = useMyRoutesList();
  const [search, setSearch] = useState('');
  const [pill, setPill] = useState<FilterPill>('all');
  const [favIds, setFavIds] = useState<Set<string>>(new Set());

  const itineraryBackTo = (location.state as LocationState | null)?.itineraryBackTo;

  useEffect(() => {
    if (!user) {
      setFavIds(new Set());
      return;
    }
    let cancelled = false;
    void supabase
      .from('saved_routes')
      .select('route_id')
      .eq('user_id', user.id)
      .then(({ data }) => {
        if (cancelled) return;
        setFavIds(new Set((data ?? []).map((r) => r.route_id as string)));
      });
    return () => {
      cancelled = true;
    };
  }, [user, routes.length]);

  const filteredRoutes = useMemo(() => {
    let list = routes;
    const q = search.trim().toLowerCase();
    if (q) list = list.filter((r) => r.name.toLowerCase().includes(q));
    if (pill === 'run') list = list.filter((r) => isRunActivity(r.activity_type));
    if (pill === 'bike') list = list.filter((r) => isBikeActivity(r.activity_type));
    if (pill === 'fav') list = list.filter((r) => favIds.has(r.id));
    return list;
  }, [routes, search, pill, favIds]);

  const allCount = routes.length;

  const Pill = ({
    active,
    children,
    onClick,
  }: {
    active: boolean;
    children: ReactNode;
    onClick: () => void;
  }) => (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex shrink-0 items-center justify-center rounded-full px-[18px] py-2 active:opacity-80 [-webkit-tap-highlight-color:transparent]',
        active ? 'border-0 bg-[#007AFF]' : 'bg-white dark:bg-card',
      )}
      style={
        active
          ? undefined
          : { borderWidth: 1.5, borderStyle: 'solid', borderColor: ACTION_BLUE }
      }
    >
      <span
        className={cn(
          'whitespace-nowrap text-[14px] font-bold tracking-tight',
          active ? 'text-white' : 'text-[#007AFF] dark:text-primary',
        )}
      >
        {children}
      </span>
    </button>
  );

  const handleBack = () => {
    navigate(itineraryBackTo ?? '/route-create');
  };

  return (
    <>
      <IosFixedPageHeaderShell
        className="flex h-full min-h-0 min-w-0 max-w-full flex-col overflow-x-hidden bg-[#F2F2F7] dark:bg-secondary"
        headerWrapperClassName="shrink-0 bg-[#F2F2F7] dark:bg-secondary"
        contentScroll
        scrollClassName="min-h-0 bg-[#F2F2F7] dark:bg-secondary"
        header={
          <div className="min-w-0 bg-[#F2F2F7] pt-[var(--safe-area-top)] dark:bg-secondary">
            <IosPageHeaderBar
              className="px-4 py-3 ios-shell:px-4"
              sideClassName="w-[110px] min-w-0 shrink-0"
              titleClassName="text-[18px] font-extrabold leading-snug tracking-[-0.02em]"
              leadingBack={{
                onClick: handleBack,
                label: 'Découvrir',
                buttonClassName: 'font-bold tracking-[-0.01em]',
              }}
              title="Mes itinéraires"
              right={
                <button
                  type="button"
                  onClick={() => navigate('/route-create')}
                  className="flex min-h-[44px] min-w-[44px] items-center justify-end text-[#007AFF] active:opacity-60 dark:text-[#0A84FF] [-webkit-tap-highlight-color:transparent]"
                  aria-label="Créer un itinéraire"
                >
                  <Plus className="h-7 w-7" strokeWidth={2.4} />
                </button>
              }
            />
          </div>
        }
      >
        <ScrollArea className="h-full min-h-0 min-w-0 flex-1 overflow-x-hidden [&>div>div[style]]:!overflow-y-auto [&_.scrollbar]:hidden [&>div>div+div]:hidden">
          <div className="min-w-0 max-w-full pb-28">
            <div className="mb-3 flex-shrink-0 px-4 ios-shell:px-4">
              <div
                className="flex items-center gap-2 rounded-xl bg-[#E5E5EA] px-3.5 py-2.5 dark:bg-muted/90"
                style={{ borderRadius: 12 }}
              >
                <Search className="h-5 w-5 shrink-0 text-[#8E8E93]" strokeWidth={2.4} aria-hidden />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Recherche"
                  className="min-w-0 flex-1 border-0 bg-transparent p-0 text-[16px] font-medium text-[#0A0F1F] outline-none placeholder:text-[#8E8E93] dark:text-foreground dark:placeholder:text-muted-foreground"
                />
              </div>
            </div>

            <div className="mb-3 flex flex-shrink-0 gap-2 overflow-x-auto px-4 ios-shell:px-4 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <Pill active={pill === 'all'} onClick={() => setPill('all')}>
                Tous · {allCount}
              </Pill>
              <Pill active={pill === 'run'} onClick={() => setPill('run')}>
                Course
              </Pill>
              <Pill active={pill === 'bike'} onClick={() => setPill('bike')}>
                Vélo
              </Pill>
              <Pill active={pill === 'fav'} onClick={() => setPill('fav')}>
                Favoris
              </Pill>
            </div>

            <div className="min-w-0 space-y-3 px-4 ios-shell:px-4">
              {!user ? (
                <p className="py-8 text-center text-[15px] text-[#8E8E93] dark:text-muted-foreground">
                  Connectez-vous pour voir vos itinéraires.
                </p>
              ) : loading ? (
                <div className="space-y-3">
                  {[1, 2].map((i) => (
                    <div
                      key={i}
                      className="h-[106px] animate-pulse rounded-[18px] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)] dark:bg-card"
                    />
                  ))}
                </div>
              ) : routes.length === 0 ? (
                <div className="ios-card rounded-[18px] border border-black/[0.06] bg-white p-8 text-center shadow-[0_1px_3px_rgba(0,0,0,0.04),0_0_0_0.5px_rgba(0,0,0,0.06)] dark:border-border/60 dark:bg-card">
                  <MapPin className="mx-auto mb-3 h-12 w-12 text-[#8E8E93] dark:text-muted-foreground" />
                  <p className="mb-1 text-[17px] font-semibold text-[#0A0F1F] dark:text-foreground">Aucun itinéraire</p>
                  <p className="mb-4 text-[15px] text-[#8E8E93] dark:text-muted-foreground">Tracez un parcours sur la carte</p>
                  <Button
                    onClick={() => navigate('/route-create')}
                    className="rounded-full"
                    style={{ background: ACTION_BLUE }}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Créer un itinéraire
                  </Button>
                </div>
              ) : filteredRoutes.length === 0 ? (
                <p className="py-10 text-center text-[15px] text-[#8E8E93] dark:text-muted-foreground">
                  Aucun résultat.
                </p>
              ) : (
                filteredRoutes.map((route, index) => (
                  <RouteCard key={route.id} route={route} listIndex={index} subtitle={modifiedLabel(route)} />
                ))
              )}
            </div>
          </div>
        </ScrollArea>
      </IosFixedPageHeaderShell>
    </>
  );
}
