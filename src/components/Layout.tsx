import { useAuth } from '@/hooks/useAuth';
import { Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { BottomNavigation } from './BottomNavigation';
import { NotificationCenter } from './NotificationCenter';
import { useAppContext } from '@/contexts/AppContext';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout = ({ children }: LayoutProps) => {
  const { user, loading } = useAuth();
  const { refreshSessions } = useAppContext();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Notification Center - Fixed in top right */}
      <div className="fixed top-4 right-4 z-50">
        <NotificationCenter onSessionUpdated={refreshSessions} />
      </div>
      <main className="pb-16">{children}</main>
      <BottomNavigation />
    </div>
  );
};