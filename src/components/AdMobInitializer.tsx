import { useEffect, Component, ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useAdMob } from '@/hooks/useAdMob';

// ✅ ErrorBoundary pour empêcher un crash AdMob de faire tomber l'app
class AdMobErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.warn('⚠️ AdMob ErrorBoundary caught:', error.message);
  }

  render() {
    if (this.state.hasError) return null;
    return this.props.children;
  }
}

const AdMobInner = () => {
  const { subscriptionInfo } = useAuth();
  const { showAdAfterSessionCreation } = useAdMob(subscriptionInfo?.subscribed || false);

  useEffect(() => {
    console.log('AdMob initialized via component');
  }, []);

  return null;
};

export const AdMobInitializer = () => {
  return (
    <AdMobErrorBoundary>
      <AdMobInner />
    </AdMobErrorBoundary>
  );
};
