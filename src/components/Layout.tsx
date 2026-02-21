import { useAuth } from '@/hooks/useAuth';
import { Navigate, useLocation } from 'react-router-dom';
import { BottomNavigation } from './BottomNavigation';
import { useAppContext } from '@/contexts/AppContext';
import { useUserProfile } from '@/contexts/UserProfileContext';
import { ConsentDialog } from './ConsentDialog';
import { useState, useEffect } from 'react';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout = ({ children }: LayoutProps) => {
  const { user, loading } = useAuth();
  const { userProfile, loading: profileLoading, refreshProfile } = useUserProfile();
  const { hideBottomNav } = useAppContext();
  const location = useLocation();

  // Classes de page pour les safe areas iOS (haut + bas)
  useEffect(() => {
    // Ne pas écraser page-loading si le loading screen est actif
    if (document.body.classList.contains('page-loading')) return;

    const path = location.pathname;
    document.body.classList.remove(
      'page-home', 'page-default', 'page-search', 'page-conversation'
    );

    if (path === '/') {
      document.body.classList.add('page-home');
    } else if (path.startsWith('/messages/')) {
      document.body.classList.add('page-conversation');
    } else {
      document.body.classList.add('page-default');
    }

    return () => {
      document.body.classList.remove(
        'page-home', 'page-default', 'page-conversation'
      );
    };
  }, [location.pathname]);
  
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

  // Attendre que le profil soit stable avant de vérifier le consentement
  useEffect(() => {
    if (userProfile && !profileLoading) {
      const timer = setTimeout(() => {
        setIsInitialized(true);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [userProfile, profileLoading]);

  // Callback pour ConsentDialog - fermeture immédiate garantie
  const handleConsentComplete = async () => {
    if (user?.id) {
      localStorage.setItem(`consent_${user.id}`, 'true');
      console.log('✅ [Layout] Consentement sauvegardé en localStorage');
    }
    setConsentCompleted(true);
    refreshProfile();
  };

  if (loading || profileLoading) {
    return <div className="min-h-screen bg-background" />;
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
    <div className="h-screen-safe bg-background flex flex-col bg-pattern overflow-x-hidden overflow-y-hidden">
      <main className={`flex-1 overflow-auto scroll-momentum min-h-0 h-0 ${hideBottomNav ? "" : "pb-[64px] ios-nav-padding"}`}>
        <div className="animate-fade-in h-full relative w-full">
          {children}
        </div>
      </main>
      {!hideBottomNav && <BottomNavigation />}
    </div>
  );
};