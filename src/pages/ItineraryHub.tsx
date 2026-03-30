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
import { IosPageHeaderBar } from '@/components/layout/IosPageHeaderBar';
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
      className="flex h-full min-h-0 min-w-0 max-w-full flex-col overflow-x-hidden bg-secondary"
      headerWrapperClassName="shrink-0"
      contentScroll
      scrollClassName="min-h-0 bg-secondary"
      header={
        <div className="min-w-0 border-b border-border bg-card/95 pt-[var(--safe-area-top)]">
          <IosPageHeaderBar
            left={
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="text-[17px] font-medium text-primary"
              >
                Retour
              </button>
            }
            title="Itinéraire"
          />
        </div>
      }
    >
      <ScrollArea className="h-full min-h-0 min-w-0 flex-1 overflow-x-hidden [&>div>div[style]]:!overflow-y-auto [&_.scrollbar]:hidden [&>div>div+div]:hidden">
        {/*
          Tab bar visible : le <main> s’arrête déjà au-dessus de la nav (safe-area gérée sur la nav seule).
          Éviter pb + safe-area-bottom ici → doublon visuel / insets qui peuvent perturber WebKit au retour accueil.
        */}
        <div className="box-border min-w-0 max-w-full space-y-4 overflow-x-hidden py-5 pb-8">
          {/* Alignement Profil / Paramètres : gouttières + largeur utile sm:max-w-2xl */}
          <div className="mx-auto box-border min-w-0 w-full max-w-full px-4 ios-shell:px-2.5 sm:max-w-2xl">
            <p className="mb-4 px-0.5 text-ios-subheadline leading-relaxed text-muted-foreground">
              Choisissez une fonctionnalité. Les écrans existants s’ouvrent ici sans duplication.
            </p>
            <div
              className="ios-card w-full min-w-0 overflow-hidden border border-border/60"
              data-tutorial="tutorial-itinerary-hub"
            >
              {hubItems.map((item, index) => (
                <div key={item.path}>
                  <button
                    type="button"
                    onClick={() => navigate(item.path)}
                    className="flex w-full min-w-0 max-w-full items-center gap-2.5 px-4 py-3 transition-colors active:bg-secondary ios-shell:px-2.5 min-h-[56px]"
                  >
                    <div className={`ios-list-row-icon shrink-0 ${item.color}`}>
                      <item.icon className="h-4 w-4 text-white" />
                    </div>
                    <div className="min-w-0 flex-1 overflow-hidden text-left">
                      <span className="block truncate text-[17px] font-medium text-foreground">{item.title}</span>
                      <span className="mt-0.5 block truncate text-[13px] text-muted-foreground">{item.description}</span>
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
