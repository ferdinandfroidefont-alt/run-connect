import { useAuth } from '@/hooks/useAuth';
import { Navigate, useLocation, useSearchParams } from 'react-router-dom';
import { BottomNavigation } from './BottomNavigation';
import { useAppContext } from '@/contexts/AppContext';
import { useUserProfile } from '@/contexts/UserProfileContext';
import { ConsentDialog } from './ConsentDialog';
import { lazy, Suspense, useState, useEffect } from 'react';
import { AppBootFallback } from '@/components/AppBootFallback';
import { resetBodyInteractionLocks } from '@/lib/bodyInteractionLocks';

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
  const [homeMapPrimed, setHomeMapPrimed] = useState(isHome);

  useEffect(() => {
    if (isHome) setHomeMapPrimed(true);
  }, [isHome]);

  // Précharge le chunk carte après le premier rendu pour lisser le retour sur l’accueil.
  useEffect(() => {
    if (!user?.id) return;
    const t = window.setTimeout(() => {
      void import('@/components/PersistentHomeMap');
    }, 1200);
    return () => clearTimeout(t);
  }, [user?.id]);

  const latStr = searchParams.get('lat');
  const lngStr = searchParams.get('lng');
  const zoomStr = searchParams.get('zoom');
  const sessionIdParam = searchParams.get('sessionId') || undefined;
  const mapInitialLat = latStr ? parseFloat(latStr) : undefined;
  const mapInitialLng = lngStr ? parseFloat(lngStr) : undefined;
  const mapInitialZoom = zoomStr ? parseInt(zoomStr, 10) : undefined;

  // Réserve l’espace sous les pages en position:fixed (Classement, etc.) quand la barre du bas est visible
  useEffect(() => {
    document.documentElement.style.setProperty(
      '--layout-bottom-inset',
      hideBottomNav ? '0px' : 'var(--bottom-nav-offset)'
    );
  }, [hideBottomNav]);
  
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

  // Si un dialog / overlay a laissé un verrou `pointer-events:none` sur body/html,
  // ça rend l'app non cliquable (symptôme: boutons qui "ne font rien").
  useEffect(() => {
    resetBodyInteractionLocks();
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
      <main className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
        {homeMapPrimed && (
          <div className="absolute inset-0 z-0 min-h-0">
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
          pointer-events-none : la route accueil (Index) ne doit pas intercepter les clics — ils passent à la carte.
          Chaque page avec contenu (Feed, etc.) réactive les clics sur son conteneur racine (pointer-events: auto par défaut).
        */}
        <div className="pointer-events-none relative z-10 flex min-h-0 flex-1 flex-col overflow-hidden bg-transparent">
          <div className="animate-fade-in pointer-events-none relative flex min-h-0 w-full flex-1 flex-col overflow-hidden motion-reduce:animate-none">
            {children}
          </div>
        </div>
      </main>
      {!hideBottomNav && <BottomNavigation />}
    </div>
  );
};