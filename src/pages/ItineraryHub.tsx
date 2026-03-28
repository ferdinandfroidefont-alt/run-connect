import { useNavigate } from 'react-router-dom';
import {
  PenTool,
  MapPin,
  Newspaper,
  Box,
  Navigation,
  Camera,
  ChevronRight,
} from 'lucide-react';
import { IosFixedPageHeaderShell } from '@/components/layout/IosFixedPageHeaderShell';
import { ScrollArea } from '@/components/ui/scroll-area';

const hubItems = [
  {
    path: '/route-create',
    title: 'Création d’itinéraire',
    description: 'Tracer un parcours sur la carte',
    icon: PenTool,
    color: 'bg-[#007AFF]',
  },
  {
    path: '/itinerary/my-routes',
    title: 'Mes itinéraires',
    description: 'Itinéraires que vous avez créés',
    icon: MapPin,
    color: 'bg-[#34C759]',
  },
  {
    path: '/itinerary/feed',
    title: 'Feed itinéraire',
    description: 'Découvrir des parcours publics',
    icon: Newspaper,
    color: 'bg-[#FF9500]',
  },
  {
    path: '/itinerary/3d',
    title: 'Mode 3D / Survol',
    description: 'Visualiser un itinéraire en relief',
    icon: Box,
    color: 'bg-[#5856D6]',
  },
  {
    path: '/itinerary/training',
    title: 'Mode entraînement',
    description: 'Course ou vélo guidé sur un tracé',
    icon: Navigation,
    color: 'bg-[#FF2D55]',
  },
  {
    path: '/itinerary/photos',
    title: 'Photos itinéraire',
    description: 'Publier et parcourir les photos du feed',
    icon: Camera,
    color: 'bg-[#8E8E93]',
  },
] as const;

export default function ItineraryHub() {
  const navigate = useNavigate();

  return (
    <IosFixedPageHeaderShell
      className="flex h-full min-h-0 flex-col bg-secondary"
      headerWrapperClassName="shrink-0"
      contentScroll
      scrollClassName="min-h-0 bg-secondary"
      header={
        <div className="min-w-0 border-b border-border bg-card/95 pt-[var(--safe-area-top)]">
          <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 px-4 py-2.5 ios-shell:px-2.5">
            <div className="flex min-w-0 justify-start">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="text-[17px] font-medium text-primary"
              >
                Retour
              </button>
            </div>
            <h1 className="max-w-[220px] truncate text-center text-[17px] font-semibold text-foreground">
              Itinéraire
            </h1>
            <div className="flex min-w-0 justify-end" aria-hidden>
              <div className="h-9 w-14 shrink-0" />
            </div>
          </div>
        </div>
      }
    >
      <ScrollArea className="h-full min-h-0 flex-1 [&>div>div[style]]:!overflow-y-auto [&_.scrollbar]:hidden [&>div>div+div]:hidden">
        <div className="box-border min-w-0 max-w-full space-y-4 overflow-x-hidden py-5">
          <div className="box-border min-w-0 w-full max-w-full px-4 ios-shell:px-2">
            <p className="text-ios-subheadline text-muted-foreground mb-4 leading-relaxed px-1">
              Choisissez une fonctionnalité. Les écrans existants s’ouvrent ici sans duplication.
            </p>
            <div className="ios-card w-full min-w-0 overflow-hidden border border-border/60">
              {hubItems.map((item, index) => (
                <div key={item.path}>
                  <button
                    type="button"
                    onClick={() => navigate(item.path)}
                    className="flex w-full min-w-0 max-w-full items-center gap-2.5 px-4 py-3 transition-colors active:bg-secondary ios-shell:px-2.5 min-h-[56px]"
                  >
                    <div className={`ios-list-row-icon ${item.color}`}>
                      <item.icon className="h-4 w-4 text-white" />
                    </div>
                    <div className="min-w-0 flex-1 text-left">
                      <span className="block truncate text-[17px] font-medium text-foreground">{item.title}</span>
                      <span className="block truncate text-[13px] text-muted-foreground mt-0.5">{item.description}</span>
                    </div>
                    <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
                  </button>
                  {index < hubItems.length - 1 && <div className="ios-list-row-inset-sep" />}
                </div>
              ))}
            </div>
          </div>
        </div>
      </ScrollArea>
    </IosFixedPageHeaderShell>
  );
}
