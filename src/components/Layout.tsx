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

  // Couleurs dynamiques iOS Status Bar + Home Indicator selon la page
  useEffect(() => {
    const path = location.pathname;
    let topColor = 'hsl(var(--background))';

    if (path === '/') {
      topColor = 'hsl(var(--card))';
    } else if (path === '/messages' || path.startsWith('/messages/')) {
      topColor = 'hsl(var(--secondary))';
    }

    document.documentElement.style.setProperty('--ios-top-color', topColor);

    // WKWebView native background - inline direct pour fiabilité native
    document.documentElement.style.backgroundColor = '#F5F5F5';
    document.body.style.backgroundColor = '#F5F5F5';

    return () => {
      document.documentElement.style.removeProperty('--ios-top-color');
      document.documentElement.style.removeProperty('background-color');
      document.body.style.removeProperty('background-color');
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
    <div className="h-screen-safe bg-background flex flex-col overflow-x-hidden overflow-y-hidden">
      <main className={`flex-1 overflow-auto scroll-momentum min-h-0 h-0 ${hideBottomNav ? "" : "pb-[64px] ios-nav-padding"}`}>
        <div className="animate-fade-in h-full relative w-full">
          {children}
        </div>
      </main>
      {!hideBottomNav && <BottomNavigation />}
    </div>
  );
};