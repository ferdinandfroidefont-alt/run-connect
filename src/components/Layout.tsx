import { useAuth } from '@/hooks/useAuth';
import { Navigate, useLocation, useSearchParams } from 'react-router-dom';
import { BottomNavigation } from './BottomNavigation';
import { useAppContext } from '@/contexts/AppContext';
import { useUserProfile } from '@/contexts/UserProfileContext';
import { ConsentDialog } from './ConsentDialog';
import { lazy, Suspense, useState, useEffect } from 'react';
import { resetBodyInteractionLocks } from '@/lib/bodyInteractionLocks';
import { cn } from '@/lib/utils';
import { TutorialReplayHost } from '@/components/TutorialReplayHost';
import { HomeFeedBottomSheet } from '@/components/home/HomeFeedBottomSheet';
import { bootLog } from '@/lib/onScreenLogCapture';
import { addBootCheckpoint } from '@/lib/bootDebugOverlay';
import { AppBootFallback } from '@/components/AppBootFallback';

const PersistentHomeMap = lazy(() => import('@/components/PersistentHomeMap'));

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout = ({ children }: LayoutProps) => {
  const { user, loading } = useAuth();
  const { userProfile, loading: profileLoading, refreshProfile } = useUserProfile();
  const { hideBottomNav, homeMapImmersive } = useAppContext();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const isHome = location.pathname === '/';
  const normalizedPath =
    (location.pathname || '/').replace(/\/+$/, '') || '/';
  const isProfileRoute =
    normalizedPath === '/profile' || normalizedPath.startsWith('/profile/');
  const showBottomNav = !hideBottomNav && !isProfileRoute;
  const [homeMapPrimed, setHomeMapPrimed] = useState(isHome);

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
  const sessionIdParam = searchParams.get('sessionId') || undefined;
  const mapInitialLat = latStr ? parseFloat(latStr) : undefined;
  const mapInitialLng = lngStr ? parseFloat(lngStr) : undefined;
  const mapInitialZoom = zoomStr ? parseInt(zoomStr, 10) : undefined;

  // Réserve l’espace sous le contenu quand la tab bar est visible (profil = plein écran sans barre).
  useEffect(() => {
    document.documentElement.style.setProperty(
      '--layout-bottom-inset',
      hideBottomNav || isProfileRoute ? '0px' : 'var(--bottom-nav-offset)'
    );
    return () => {
      document.documentElement.style.removeProperty('--layout-bottom-inset');
    };
  }, [hideBottomNav, isProfileRoute]);
  
  // État local pour éviter la boucle infinie RGPD
  const [consentCompleted, setConsentCompleted] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    addBootCheckpoint("LAYOUT_RENDER");
  }, []);

  useEffect(() => {
    bootLog('[Layout] render state', {
      path: location.pathname,
      authLoading: loading,
      profileLoading,
      hasUser: !!user,
      hasProfile: !!userProfile,
      isHome,
    });

    if (loading) {
      addBootCheckpoint('LAYOUT_AUTH_WAIT');
    } else if (profileLoading) {
      addBootCheckpoint('LAYOUT_PROFILE_WAIT');
    }
  }, [location.pathname, loading, profileLoading, user, userProfile, isHome]);

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
  useEffect(() => {
    if (loading || profileLoading || !user) return;
    addBootCheckpoint("LAYOUT_READY");
    bootLog('[Layout] ready', {
      path: location.pathname,
      showBottomNav,
      homeMapPrimed,
      needsConsent,
    });
  }, [location.pathname, loading, profileLoading, !!user, showBottomNav, homeMapPrimed, needsConsent]);

  if (loading || profileLoading) {
    return (
      <div
        className="fixed inset-0 z-[99] flex items-center justify-center"
        style={{ backgroundColor: '#2E68FF' }}
      >
        <div className="flex flex-col items-center gap-3">
          <img
            src="/brand/runconnect-splash-icon.png"
            alt=""
            draggable={false}
            className="block w-[clamp(10rem,min(72vw,40dvh),19rem)] select-none object-contain"
          />
          <p className="text-center text-lg font-bold tracking-wide text-white">RunConnect</p>
          <div className="mt-2 flex gap-1.5" aria-hidden>
            <span className="inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-white/90 [animation-delay:-0.3s]" />
            <span className="inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-white/90 [animation-delay:-0.15s]" />
            <span className="inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-white/90" />
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (needsConsent) {
    return <ConsentDialog userId={user.id} onComplete={handleConsentComplete} />;
  }

  return (
    <div className="h-screen-safe ios-app-canvas flex flex-col overflow-hidden">
      {/*
        La tab bar est dans le flux (plus en fixed) : le <main> a une hauteur réelle = viewport − barre.
        Le scroll ne s’étend plus derrière les onglets (plus besoin de ios-nav-padding sur le scroll).
      */}
      {/*
        Le scroll est dans chaque page (ios-scroll-region), pas ici : sinon les barres du haut
        partent avec le scroll / le clavier sur iOS. Le main ne fait que cadrer la hauteur utile.
      */}
      <main className="relative flex min-h-0 flex-1 flex-col overflow-x-hidden overflow-y-hidden">
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
        FAB création : rendu par BottomNavigation sur l’accueil, position fixed au-dessus du dock (hors flux des onglets).
      */}
      {showBottomNav && <BottomNavigation />}
    </div>
  );
};