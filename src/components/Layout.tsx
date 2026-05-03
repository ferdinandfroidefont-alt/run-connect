import { useAuth } from '@/hooks/useAuth';
import { hasCompletedOnboarding } from '@/lib/arrivalFlowStorage';
import { Navigate, useLocation, useSearchParams } from 'react-router-dom';
import { BottomNavigation } from './BottomNavigation';
import { useAppContext } from '@/contexts/AppContext';
import { useUserProfile } from '@/contexts/UserProfileContext';
import { useAppPreview } from '@/contexts/AppPreviewContext';
import { PreviewModeBanner } from '@/components/preview/PreviewModeBanner';
import { ConsentDialog } from './ConsentDialog';
import { lazy, Suspense, useState, useEffect, type CSSProperties } from 'react';
import { resetBodyInteractionLocks } from '@/lib/bodyInteractionLocks';
import { cn } from '@/lib/utils';
import { TutorialReplayHost } from '@/components/TutorialReplayHost';
import {
  RUCONNECT_SPLASH_BACKGROUND,
  RUCONNECT_SPLASH_ICON_URL,
} from '@/lib/ruconnectSplashChrome';
import { HomeFeedBottomSheet } from '@/components/home/HomeFeedBottomSheet';
const PersistentHomeMap = lazy(() => import('@/components/PersistentHomeMap'));

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout = ({ children }: LayoutProps) => {
  const { user, loading } = useAuth();
  const { userProfile, loading: profileLoading, refreshProfile } = useUserProfile();
  const { isPreviewMode } = useAppPreview();
  const { removeMainBottomInset, homeMapImmersive } = useAppContext();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const isHome = location.pathname === '/';
  const [homeMapPrimed, setHomeMapPrimed] = useState(isHome);

  /** Padding bas du <main> : stable dès le 1er rendu (pas de useEffect) — évite reflow / « remontée » de la zone utile. */
  const layoutBottomInset = removeMainBottomInset ? '0px' : 'var(--bottom-nav-offset)';

  useEffect(() => {
    if (isHome) setHomeMapPrimed(true);
  }, [isHome]);

  // Précharge la carte (+ centre notif en parallèle) : immédiat sur l’accueil, sinon après délai pour ne pas gêner l’onglet courant.
  useEffect(() => {
    if (!user?.id) return;
    if (isHome) {
      void import('@/components/PersistentHomeMap');
      void import('@/components/NotificationCenter');
      return;
    }
    const t = window.setTimeout(() => {
      void import('@/components/PersistentHomeMap');
    }, 1200);
    return () => clearTimeout(t);
  }, [user?.id, isHome]);

  const latStr = searchParams.get('lat');
  const lngStr = searchParams.get('lng');
  const zoomStr = searchParams.get('zoom');
  /** Liens profonds : `?session=` (stories, open link) ou `?sessionId=` (legacy). */
  const sessionIdParam =
    searchParams.get('sessionId') || searchParams.get('session') || undefined;
  const mapInitialLat = latStr ? parseFloat(latStr) : undefined;
  const mapInitialLng = lngStr ? parseFloat(lngStr) : undefined;
  const mapInitialZoom = zoomStr ? parseInt(zoomStr, 10) : undefined;

  // État local pour éviter la boucle infinie RGPD
  const [consentCompleted, setConsentCompleted] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);


  // Vérifier le cache localStorage au montage
  useEffect(() => {
    if (user?.id) {
      const cachedConsent = localStorage.getItem(`consent_${user.id}`);
      if (cachedConsent === 'true') {
        console.log('✅ [Layout] Consentement trouvé en cache localStorage');
        setConsentCompleted(true);
      }
    }
  }, [user?.id]);

  // Une fois le chargement profil terminé (succès ou erreur), activer la logique consentement
  useEffect(() => {
    if (!profileLoading) {
      const timer = setTimeout(() => setIsInitialized(true), 100);
      return () => clearTimeout(timer);
    }
  }, [profileLoading]);

  // Déverrouille body/html après navigation (effet groupé pour limiter les reflows si query bouge souvent).
  useEffect(() => {
    const t = window.setTimeout(() => resetBodyInteractionLocks(), 0);
    return () => clearTimeout(t);
  }, [location.pathname, location.search]);

  // Callback pour ConsentDialog - fermeture immédiate garantie
  const handleConsentComplete = async () => {
    if (user?.id) {
      localStorage.setItem(`consent_${user.id}`, 'true');
      console.log('✅ [Layout] Consentement sauvegardé en localStorage');
    }
    setConsentCompleted(true);
    refreshProfile();
  };

  const needsConsent = isInitialized && 
    !!userProfile && 
    !consentCompleted &&
    (!userProfile.rgpd_accepted || !userProfile.security_rules_accepted);

  // Hook "ready" — MUST be before any conditional return

  /* Un seul splash premium (LoadingScreen) : ne pas bloquer sur profileLoading sinon double plein écran. */
  if (loading) {
    return (
      <div
        className="fixed inset-0 z-[99] flex items-center justify-center px-5"
        style={{
          backgroundColor: RUCONNECT_SPLASH_BACKGROUND,
          paddingTop: 'env(safe-area-inset-top, 0px)',
          paddingBottom: '0px',
        }}
      >
        <div className="flex flex-col items-center">
          <img
            src={RUCONNECT_SPLASH_ICON_URL}
            alt="RunConnect"
            draggable={false}
            className="mb-5 block h-[128px] w-[128px] select-none object-contain"
          />
          <p className="text-[26px] font-bold tracking-[0.08em] text-white">
            RUNCONNECT
          </p>
          <p className="mt-2 text-[12px] font-medium tracking-[0.22em] text-white/70">
            TROUVE. CONNECTE. PARTAGE.
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (user.id && !hasCompletedOnboarding(user.id)) {
    return <Navigate to="/onboarding" replace />;
  }

  if (needsConsent) {
    return <ConsentDialog userId={user.id} onComplete={handleConsentComplete} />;
  }

  return (
    <div
      className="h-screen-safe ios-app-canvas flex flex-col overflow-hidden"
      style={
        {
          ["--layout-bottom-inset" as string]: layoutBottomInset,
        } as CSSProperties
      }
    >
      {/*
        La tab bar est dans le flux (plus en fixed) : le <main> a une hauteur réelle = viewport − barre.
        Le scroll ne s’étend plus derrière les onglets (plus besoin de ios-nav-padding sur le scroll).
      */}
      {/*
        Le scroll est dans chaque page (ios-scroll-region), pas ici : sinon les barres du haut
        partent avec le scroll / le clavier sur iOS. Le main ne fait que cadrer la hauteur utile.
      */}
      <PreviewModeBanner />
      <main
        className="relative flex min-h-0 flex-1 flex-col overflow-x-hidden overflow-y-hidden"
        style={{
          paddingBottom: "var(--layout-bottom-inset)",
          paddingTop: isPreviewMode
            ? "calc(44px + env(safe-area-inset-top, 0px))"
            : undefined,
        }}
      >
        {homeMapPrimed && (
          <div
            className={
              isHome
                ? /* Accueil : carte dans le flux flex → hauteur réelle > 0 pour Mapbox */
                  'relative z-20 flex min-h-0 flex-1 flex-col'
                : /* Autres onglets : carte persistée en arrière-plan */
                  'absolute inset-0 z-0 flex min-h-0 flex-col'
            }
          >
            <Suspense fallback={null}>
              <PersistentHomeMap
                visible={isHome}
                initialLat={mapInitialLat}
                initialLng={mapInitialLng}
                initialZoom={mapInitialZoom}
                highlightSessionId={sessionIdParam}
              />
            </Suspense>
          </div>
        )}
        {/*
          Accueil : pointer-events-none sur cette colonne pour que les clics atteignent la carte (z-20).
          Autres onglets : pointer-events-auto — sans cela, toute la chaîne (Layout + PageTransition) reste
          en « none » et WebKit peut laisser les touches « tomber » sur la carte persistée (z-0) ou les absorber.
        */}
        <div
          className={cn(
            /* Accueil : calque au-dessus de la carte (même hauteur que le main) */
            isHome
              ? 'pointer-events-none absolute inset-0 z-10 flex min-h-0 flex-col overflow-x-hidden overflow-y-hidden bg-transparent'
              : 'pointer-events-auto relative z-10 flex min-h-0 flex-1 flex-col overflow-x-hidden overflow-y-hidden bg-transparent'
          )}
        >
          <div
            className={cn(
              'animate-fade-in relative flex min-h-0 w-full flex-1 flex-col overflow-x-hidden overflow-y-hidden motion-reduce:animate-none',
              isHome ? 'pointer-events-none' : 'pointer-events-auto'
            )}
          >
            {children}
          </div>
        </div>
      </main>
      {isHome && !homeMapImmersive && <HomeFeedBottomSheet />}
      <TutorialReplayHost />
      {/*
        Tab bar toujours montée (pas de mount/unmount par route) : visibilité gérée dans BottomNavigation.
        FAB création : rendu par BottomNavigation sur l’accueil, position fixed au-dessus du dock.
      */}
      <BottomNavigation />
    </div>
  );
};