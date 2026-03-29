import { lazy, Suspense, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { IosFixedPageHeaderShell } from '@/components/layout/IosFixedPageHeaderShell';
import { ScrollArea } from '@/components/ui/scroll-area';
import { RouteCard } from '@/components/RouteCard';
import { useMyRoutesList } from '@/hooks/useMyRoutesList';
import { useAppContext } from '@/contexts/AppContext';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const RouteEditDialog = lazy(() =>
  import('@/components/RouteEditDialog').then((m) => ({ default: m.RouteEditDialog }))
);

export default function ItineraryMyRoutes() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { openCreateRoute } = useAppContext();
  const { routes, loading, refresh } = useMyRoutesList();
  const [editingRoute, setEditingRoute] = useState<any>(null);
  const [isRouteEditDialogOpen, setIsRouteEditDialogOpen] = useState(false);
  const [showRouteDeleteConfirm, setShowRouteDeleteConfirm] = useState(false);
  const [routeToDelete, setRouteToDelete] = useState<string | null>(null);

  const editRoute = (route: any) => {
    setEditingRoute(route);
    setIsRouteEditDialogOpen(true);
  };

  const confirmDeleteRoute = (routeId: string) => {
    setRouteToDelete(routeId);
    setShowRouteDeleteConfirm(true);
  };

  const deleteRoute = async () => {
    if (!routeToDelete) return;
    try {
      const { error } = await supabase.from('routes').delete().eq('id', routeToDelete);
      if (error) throw error;
      await refresh();
    } catch (e) {
      console.error(e);
    } finally {
      setShowRouteDeleteConfirm(false);
      setRouteToDelete(null);
    }
  };

  return (
    <>
      <IosFixedPageHeaderShell
        className="flex h-full min-h-0 min-w-0 max-w-full flex-col overflow-x-hidden bg-secondary"
        headerWrapperClassName="shrink-0"
        contentScroll
        scrollClassName="min-h-0 bg-secondary"
        header={
          <div className="min-w-0 border-b border-border bg-card/95 pt-[var(--safe-area-top)]">
            <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 px-4 py-2.5 ios-shell:px-2.5">
              <div className="flex min-w-0 justify-start">
                <button
                  type="button"
                  onClick={() => navigate('/itinerary')}
                  className="text-[17px] font-medium text-primary"
                >
                  Retour
                </button>
              </div>
              <h1 className="min-w-0 max-w-[220px] truncate text-center text-[17px] font-semibold text-foreground">
                Mes itinéraires
              </h1>
              <div className="flex min-w-0 justify-end" aria-hidden>
                <div className="h-9 w-14 shrink-0" />
              </div>
            </div>
          </div>
        }
      >
        <ScrollArea className="h-full min-h-0 min-w-0 flex-1 overflow-x-hidden [&>div>div[style]]:!overflow-y-auto [&_.scrollbar]:hidden [&>div>div+div]:hidden">
          <div className="min-w-0 max-w-full overflow-x-hidden py-4 pb-24">
            <div className="mx-auto box-border min-w-0 w-full max-w-full px-4 ios-shell:px-2.5 sm:max-w-2xl">
            {!user ? (
              <p className="text-ios-subheadline text-muted-foreground text-center py-8">Connectez-vous pour voir vos itinéraires.</p>
            ) : loading ? (
              <div className="ios-list-stack">
                {[1, 2].map((i) => (
                  <div key={i} className="ios-card p-ios-4 animate-pulse">
                    <div className="h-4 bg-secondary rounded w-3/4 mb-2" />
                    <div className="h-3 bg-secondary rounded w-1/2" />
                  </div>
                ))}
              </div>
            ) : routes.length === 0 ? (
              <div className="ios-card p-8 text-center border border-border/60">
                <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-ios-headline font-medium text-foreground mb-ios-1">Aucun itinéraire</p>
                <p className="text-ios-subheadline text-muted-foreground mb-ios-4">Créez votre premier itinéraire</p>
                <Button onClick={openCreateRoute} className="rounded-full">
                  <Plus className="h-4 w-4 mr-ios-2" />
                  Créer un itinéraire
                </Button>
              </div>
            ) : (
              <div className="ios-list-stack">
                {routes.map((route) => (
                  <RouteCard
                    key={route.id}
                    route={route}
                    onEdit={() => editRoute(route)}
                    onDelete={() => confirmDeleteRoute(route.id)}
                    onPublishToggle={async (isPublic) => {
                      await supabase.from('routes').update({ is_public: isPublic }).eq('id', route.id);
                      await refresh();
                    }}
                    isPublic={route.is_public || false}
                  />
                ))}
              </div>
            )}
            </div>
          </div>
        </ScrollArea>
      </IosFixedPageHeaderShell>

      <Suspense fallback={null}>
        <RouteEditDialog
          isOpen={isRouteEditDialogOpen}
          onClose={() => setIsRouteEditDialogOpen(false)}
          route={editingRoute}
          onRouteUpdated={refresh}
        />
      </Suspense>

      <AlertDialog open={showRouteDeleteConfirm} onOpenChange={setShowRouteDeleteConfirm}>
        <AlertDialogContent className="rounded-ios-lg max-w-[280px] p-0 gap-0">
          <AlertDialogHeader className="p-ios-6 pb-ios-4">
            <AlertDialogTitle className="text-center text-ios-headline font-semibold">
              Supprimer l&apos;itinéraire
            </AlertDialogTitle>
            <AlertDialogDescription className="text-center text-ios-footnote text-muted-foreground">
              Êtes-vous sûr de vouloir supprimer cet itinéraire ? Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="border-t border-border">
            <AlertDialogCancel className="w-full h-[44px] border-0 rounded-none text-primary text-ios-headline font-normal hover:bg-secondary/50">
              Annuler
            </AlertDialogCancel>
          </div>
          <div className="border-t border-border">
            <AlertDialogAction
              onClick={deleteRoute}
              className="w-full h-[44px] border-0 rounded-none bg-transparent hover:bg-secondary/50 text-destructive text-ios-headline font-semibold"
            >
              Supprimer
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
