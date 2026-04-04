import { useAuth } from '@/hooks/useAuth';
import { Navigate, useLocation, useSearchParams } from 'react-router-dom';
import { BottomNavigation } from './BottomNavigation';
import { useAppContext } from '@/contexts/AppContext';
import { useUserProfile } from '@/contexts/UserProfileContext';
import { ConsentDialog } from './ConsentDialog';
import { lazy, Suspense, useState, useEffect } from 'react';
import { AppBootFallback } from '@/components/AppBootFallback';
import { resetBodyInteractionLocks } from '@/lib/bodyInteractionLocks';
import { cn } from '@/lib/utils';
import { TutorialReplayHost } from '@/components/TutorialReplayHost';

const PersistentHomeMap = lazy(() => import('@/components/PersistentHomeMap'));

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout = ({ children }: LayoutProps) => {
  const { user, loading } = useAuth();
  const { userProfile, loading: profileLoading, refreshProfile } = useUserProfile();
  const { hideBottomNav } = useAppContext();
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

  if (loading) {
    return <AppBootFallback phase="auth" />;
  }

  if (profileLoading) {
    return <AppBootFallback phase="profile" />;
  }

  if (!user) {
    console.log('🚨 Layout: No user found, redirecting to auth');
    return <Navigate to="/auth" replace />;
  }

  const needsConsent = isInitialized && 
    userProfile && 
    !consentCompleted &&
    (!userProfile.rgpd_accepted || !userProfile.security_rules_accepted);

  if (needsConsent) {
    console.log('📋 [Layout] Affichage dialog consentement');
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
      <TutorialReplayHost />
      {/*
        FAB création : rendu par BottomNavigation sur l’accueil, position fixed au-dessus du dock (hors flux des onglets).
      */}
      {showBottomNav && <BottomNavigation />}
    </div>
  );
};