import { useAuth } from '@/hooks/useAuth';
import { Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { BottomNavigation } from './BottomNavigation';
import { useAppContext } from '@/contexts/AppContext';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout = ({ children }: LayoutProps) => {
  const { user, loading } = useAuth();
  const { hideBottomNav } = useAppContext();

  if (loading) {
    return <div className="min-h-screen bg-background" />;
  }

  if (!user) {
    console.log('🚨 Layout: No user found, redirecting to auth');
    return <Navigate to="/auth" replace />;
  }

  return (
    <div className="min-h-screen bg-background">
      <main className={hideBottomNav ? "" : "pb-32"}>{children}</main>
      {!hideBottomNav && <BottomNavigation />}
    </div>
  );
};