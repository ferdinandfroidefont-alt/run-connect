import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export type SubscriptionStatus = 'loading' | 'free' | 'premium' | 'expired' | 'expiring_soon' | 'past_due';

export interface SubscriptionState {
  status: SubscriptionStatus;
  tier: 'Mensuel' | 'Annuel' | 'Admin' | null;
  expiresAt: Date | null;
  isExpiringSoon: boolean;
  isPastDue: boolean;
  cancelAtPeriodEnd: boolean;
  isSyncing: boolean;
  stripeSubscriptionId: string | null;
}

const CACHE_KEY = 'runconnect_subscription_cache';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

interface CachedSubscription {
  data: SubscriptionState;
  timestamp: number;
}

export const useSubscription = () => {
  const { user, session } = useAuth();
  const [subscriptionState, setSubscriptionState] = useState<SubscriptionState>({
    status: 'loading',
    tier: null,
    expiresAt: null,
    isExpiringSoon: false,
    isPastDue: false,
    cancelAtPeriodEnd: false,
    isSyncing: false,
    stripeSubscriptionId: null,
  });

  // Load from cache on mount
  const loadFromCache = useCallback((): SubscriptionState | null => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const parsed: CachedSubscription = JSON.parse(cached);
        if (Date.now() - parsed.timestamp < CACHE_DURATION) {
          console.log('📦 [SUBSCRIPTION] Loaded from cache');
          return {
            ...parsed.data,
            expiresAt: parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : null,
          };
        }
      }
    } catch (e) {
      console.error('Error loading subscription cache:', e);
    }
    return null;
  }, []);

  // Save to cache
  const saveToCache = useCallback((data: SubscriptionState) => {
    try {
      const cacheData: CachedSubscription = {
        data: {
          ...data,
          expiresAt: data.expiresAt ? data.expiresAt.toISOString() as any : null,
        },
        timestamp: Date.now(),
      };
      localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
      console.log('💾 [SUBSCRIPTION] Saved to cache');
    } catch (e) {
      console.error('Error saving subscription cache:', e);
    }
  }, []);

  // Fetch subscription from database
  const fetchSubscription = useCallback(async (showSyncing = false) => {
    if (!user) {
      setSubscriptionState(prev => ({
        ...prev,
        status: 'free',
        tier: null,
        isSyncing: false,
      }));
      return;
    }

    if (showSyncing) {
      setSubscriptionState(prev => ({ ...prev, isSyncing: true }));
    }

    try {
      console.log('🔄 [SUBSCRIPTION] Fetching from database...');
      
      // Admin override for specific user
      if (user.email === 'ferdinand.froidefont@gmail.com') {
        const adminState: SubscriptionState = {
          status: 'premium',
          tier: 'Admin',
          expiresAt: new Date('2099-12-31'),
          isExpiringSoon: false,
          isPastDue: false,
          cancelAtPeriodEnd: false,
          isSyncing: false,
          stripeSubscriptionId: null,
        };
        setSubscriptionState(adminState);
        saveToCache(adminState);
        return;
      }

      const { data, error } = await supabase
        .from('subscribers')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching subscription:', error);
        setSubscriptionState(prev => ({ ...prev, status: 'free', isSyncing: false }));
        return;
      }

      if (!data || !data.subscribed) {
        const freeState: SubscriptionState = {
          status: 'free',
          tier: null,
          expiresAt: null,
          isExpiringSoon: false,
          isPastDue: false,
          cancelAtPeriodEnd: false,
          isSyncing: false,
          stripeSubscriptionId: null,
        };
        setSubscriptionState(freeState);
        saveToCache(freeState);
        return;
      }

      const expiresAt = data.subscription_end ? new Date(data.subscription_end) : null;
      const now = new Date();
      const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      
      const isExpired = expiresAt ? expiresAt < now : false;
      const isExpiringSoon = expiresAt ? (expiresAt > now && expiresAt < sevenDaysFromNow) : false;
      const isPastDue = data.subscription_status === 'past_due';

      let status: SubscriptionStatus = 'premium';
      if (isExpired) status = 'expired';
      else if (isPastDue) status = 'past_due';
      else if (isExpiringSoon) status = 'expiring_soon';

      const newState: SubscriptionState = {
        status,
        tier: data.subscription_tier as 'Mensuel' | 'Annuel' | null,
        expiresAt,
        isExpiringSoon,
        isPastDue,
        cancelAtPeriodEnd: data.cancel_at_period_end || false,
        isSyncing: false,
        stripeSubscriptionId: data.stripe_subscription_id || null,
      };

      setSubscriptionState(newState);
      saveToCache(newState);
      console.log('✅ [SUBSCRIPTION] Updated state:', status, data.subscription_tier);
    } catch (error) {
      console.error('Error in fetchSubscription:', error);
      setSubscriptionState(prev => ({ ...prev, status: 'free', isSyncing: false }));
    }
  }, [user, saveToCache]);

  // Sync subscription (force refresh)
  const syncSubscription = useCallback(async () => {
    if (!session) return;

    setSubscriptionState(prev => ({ ...prev, isSyncing: true }));

    try {
      console.log('🔄 [SUBSCRIPTION] Syncing with Stripe...');
      
      const { data, error } = await supabase.functions.invoke('check-subscription', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) {
        console.error('Error syncing subscription:', error);
      } else {
        console.log('✅ [SUBSCRIPTION] Synced with Stripe:', data);
      }

      // Refresh from database after sync
      await fetchSubscription(false);
    } catch (error) {
      console.error('Error in syncSubscription:', error);
    } finally {
      setSubscriptionState(prev => ({ ...prev, isSyncing: false }));
    }
  }, [session, fetchSubscription]);

  // Clear cache (for logout)
  const clearCache = useCallback(() => {
    localStorage.removeItem(CACHE_KEY);
  }, []);

  // Check for success parameter in URL (after Stripe checkout)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('success') === 'true') {
      console.log('🎉 [SUBSCRIPTION] Payment success detected, syncing...');
      // Clear cache and sync
      clearCache();
      syncSubscription();
      // Clean up URL
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
    }
  }, [syncSubscription, clearCache]);

  // Initial load
  useEffect(() => {
    if (!user) {
      setSubscriptionState({
        status: 'free',
        tier: null,
        expiresAt: null,
        isExpiringSoon: false,
        isPastDue: false,
        cancelAtPeriodEnd: false,
        isSyncing: false,
        stripeSubscriptionId: null,
      });
      return;
    }

    // Try cache first
    const cached = loadFromCache();
    if (cached && cached.status !== 'loading') {
      setSubscriptionState(cached);
      // Still fetch in background to verify
      fetchSubscription(false);
    } else {
      fetchSubscription(false);
    }
  }, [user, loadFromCache, fetchSubscription]);

  return {
    ...subscriptionState,
    isPremium: subscriptionState.status === 'premium' || subscriptionState.status === 'expiring_soon',
    refreshSubscription: () => fetchSubscription(true),
    syncSubscription,
    clearCache,
  };
};
