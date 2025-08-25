import { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useAdMob } from '@/hooks/useAdMob';

export const AdMobInitializer = () => {
  const { subscriptionInfo } = useAuth();
  const { showAdAfterSessionCreation } = useAdMob(subscriptionInfo?.subscribed || false);

  // Ce composant initialise simplement AdMob
  useEffect(() => {
    console.log('AdMob initialized via component');
  }, []);

  return null;
};