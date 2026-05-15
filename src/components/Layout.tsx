import { supabase } from '@/integrations/supabase/client';
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
import { TutorialReplayHost } from '@/components/TutorialReplayHost';
import { RunConnectAnimatedSplash } from '@/components/RunConnectAnimatedSplash';
const PersistentHomeMap = lazy(() => import('@/components/PersistentHomeMap'));

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout = ({ children }: LayoutProps) => {
  const { user, loading } = useAuth();
  /**
   * Filet : session déjà en stockage mais `useAuth.user` pas encore commit (ex. juste après OAuth).
   * Sans ça, `<Navigate to="/auth" />` flash une fraction de seconde.
   */
  const [sessionCatchup, setSessionCatchup] = useState(false);
  const { userProfile, loading: profileLoading, refreshProfile } = useUserProfile();
  const { isPreviewMode } = useAppPreview();
  const { removeMainBottomInset } = useAppContext();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const isHome = location.pathname === '/';
  const [homeMapPrimed, setHomeMapPrimed] = useState(isHome);

  /** Padding bas du <main> : stable dès le 1er rendu (pas de useEffect) — évite reflow / « remontée » de la zone utile. */
  const layoutBottomInset = removeMainBottomInset ? '0px' : 'var(--bottom-nav-offset)';

  useEffect(() => {
    if (isHome) setHomeMapPrimed(true);
  }, [isHome]);

  useEffect(() => {
    if (loading || user) {
      setSessionCatchup(false);
      return;
    }
    let alive = true;
    void supabase.auth.getSession().then(({ data: { session } }) => {
      if (!alive) return;
      if (session?.user) setSessionCatchup(true);
    });
    return () => {
      alive = false;
    };
  }, [loading, user]);

  useEffect(() => {
    if (!sessionCatchup || user) return;
    const t = window.setTimeout(() => setSessionCatchup(false), 1200);
    return () => window.clearTimeout(t);
  }, [sessionCatchup, user]);

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

  /* Même splash animé que la maquette ; ne pas bloquer sur profileLoading sinon double plein écran. */
  if (loading || (sessionCatchup && !user)) {
    return (
      <RunConnectAnimatedSplash
        className="z-[99]"
        style={{
          paddingTop: 'env(safe-area-inset-top, 0px)',
          paddingBottom: '0px',
        }}
      />
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
        {/* Carte persistée — toujours en arrière-plan (jamais dans le flux flex) */}
        {homeMapPrimed && (
          <div className="absolute inset-0 z-0 flex min-h-0 flex-col pointer-events-none">
            <Suspense fallback={null}>
              <PersistentHomeMap
                visible={false}
                initialLat={mapInitialLat}
                initialLng={mapInitialLng}
                initialZoom={mapInitialZoom}
                highlightSessionId={sessionIdParam}
              />
            </Suspense>
          </div>
        )}

        {/* Contenu de la page — plein écran, toujours interactif */}
        <div className="pointer-events-auto relative z-10 flex min-h-0 flex-1 flex-col overflow-x-hidden overflow-y-hidden bg-transparent">
          <div className="animate-fade-in relative flex min-h-0 w-full flex-1 flex-col overflow-x-hidden overflow-y-hidden pointer-events-auto motion-reduce:animate-none">
            {children}
          </div>
        </div>
      </main>
      <TutorialReplayHost />
      {/*
        Tab bar toujours montée : visibilité gérée dans BottomNavigation (+ bouton + central).
      */}
      <BottomNavigation />
    </div>
  );
};