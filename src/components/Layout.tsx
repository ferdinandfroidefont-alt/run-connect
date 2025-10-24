import { useAuth } from '@/hooks/useAuth';
import { Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { BottomNavigation } from './BottomNavigation';
import { useAppContext } from '@/contexts/AppContext';
import { useUserProfile } from '@/contexts/UserProfileContext';
import { ConsentDialog } from './ConsentDialog';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout = ({ children }: LayoutProps) => {
  const { user, loading } = useAuth();
  const { userProfile, loading: profileLoading, refreshProfile } = useUserProfile();
  const { hideBottomNav } = useAppContext();

  if (loading || profileLoading) {
    return <div className="min-h-screen bg-background" />;
  }

  if (!user) {
    console.log('🚨 Layout: No user found, redirecting to auth');
    return <Navigate to="/auth" replace />;
  }

  // Check if consent is required
  const needsConsent = userProfile && 
    (!userProfile.rgpd_accepted || !userProfile.security_rules_accepted);

  if (needsConsent) {
    return <ConsentDialog userId={user.id} onComplete={refreshProfile} />;
  }

  return (
    <div className="min-h-screen bg-background">
      <main className={hideBottomNav ? "" : "pb-32"}>{children}</main>
      {!hideBottomNav && <BottomNavigation />}
    </div>
  );
};