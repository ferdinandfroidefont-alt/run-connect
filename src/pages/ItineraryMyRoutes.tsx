import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { differenceInCalendarDays } from 'date-fns';
import { MapPin, Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { IosFixedPageHeaderShell } from '@/components/layout/IosFixedPageHeaderShell';
import { IosPageHeaderBar } from '@/components/layout/IosPageHeaderBar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { RouteCard } from '@/components/RouteCard';
import { useMyRoutesList, type MyRouteRow } from '@/hooks/useMyRoutesList';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

type FilterPill = 'all' | 'run' | 'bike' | 'fav';

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
  const { user } = useAuth();
  const { routes, loading } = useMyRoutesList();
  const [search, setSearch] = useState('');
  const [pill, setPill] = useState<FilterPill>('all');
  const [favIds, setFavIds] = useState<Set<string>>(new Set());

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
        'h-9 shrink-0 whitespace-nowrap rounded-full px-[18px] text-[15px] font-normal tracking-tight [-webkit-tap-highlight-color:transparent] active:opacity-80',
        active
          ? 'bg-primary text-primary-foreground'
          : 'border border-primary bg-transparent text-primary',
      )}
    >
      {children}
    </button>
  );

  return (
    <>
      <IosFixedPageHeaderShell
        className="flex h-full min-h-0 min-w-0 max-w-full flex-col overflow-x-hidden bg-secondary"
        headerWrapperClassName="shrink-0"
        contentScroll
        scrollClassName="min-h-0 bg-secondary"
        header={
          <div className="min-w-0 border-b border-border bg-card/95 pt-[var(--safe-area-top)]">
            <IosPageHeaderBar
              leadingBack={{
                onClick: () => navigate('/profile'),
                label: 'Page précédente',
              }}
              title="Mes itinéraires"
              right={
                <button
                  type="button"
                  onClick={() => navigate('/route-create')}
                  className="flex min-h-[44px] min-w-[44px] items-center justify-end text-primary [-webkit-tap-highlight-color:transparent] active:opacity-60"
                  aria-label="Créer un itinéraire"
                >
                  <Plus className="h-6 w-6" strokeWidth={2.2} />
                </button>
              }
            />
          </div>
        }
      >
        <ScrollArea className="h-full min-h-0 min-w-0 flex-1 overflow-x-hidden [&>div>div[style]]:!overflow-y-auto [&_.scrollbar]:hidden [&>div>div+div]:hidden">
          <div className="min-w-0 max-w-full pb-28 pt-1">
            <div className="px-4 pb-2 ios-shell:px-2.5">
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-[14px] w-[14px] -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Recherche"
                  className="h-9 rounded-[10px] border-0 bg-muted/80 pl-8 pr-3 text-[17px] placeholder:text-muted-foreground"
                />
              </div>
            </div>

            <div className="flex gap-1.5 overflow-x-auto px-4 pb-1 ios-shell:px-2.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
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

            <div className="min-w-0 space-y-3 px-4 py-3 ios-shell:px-2.5">
              {!user ? (
                <p className="py-8 text-center text-ios-subheadline text-muted-foreground">
                  Connectez-vous pour voir vos itinéraires.
                </p>
              ) : loading ? (
                <div className="space-y-3">
                  {[1, 2].map((i) => (
                    <div key={i} className="h-[106px] animate-pulse rounded-[18px] bg-card" />
                  ))}
                </div>
              ) : routes.length === 0 ? (
                <div className="ios-card border border-border/60 p-8 text-center">
                  <MapPin className="mx-auto mb-3 h-12 w-12 text-muted-foreground" />
                  <p className="mb-1 text-ios-headline font-medium text-foreground">Aucun itinéraire</p>
                  <p className="mb-4 text-ios-subheadline text-muted-foreground">Tracez un parcours sur la carte</p>
                  <Button onClick={() => navigate('/route-create')} className="rounded-full">
                    <Plus className="mr-2 h-4 w-4" />
                    Créer un itinéraire
                  </Button>
                </div>
              ) : filteredRoutes.length === 0 ? (
                <p className="py-10 text-center text-ios-subheadline text-muted-foreground">Aucun résultat.</p>
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
