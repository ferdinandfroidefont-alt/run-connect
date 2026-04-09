import { useState, useEffect, createContext, useContext, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface SubscriptionInfo {
  subscribed: boolean;
  subscription_tier: string | null;
  subscription_end: string | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  subscriptionInfo: SubscriptionInfo | null;
  refreshSubscription: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [subscriptionInfo, setSubscriptionInfo] = useState<SubscriptionInfo | null>(null);

  /** Lit la session courante via Supabase pour éviter une closure obsolète après SIGNED_IN. */
  const refreshSubscription = useCallback(async () => {
    try {
      const { data: { session: active } } = await supabase.auth.getSession();
      if (!active?.access_token) return;

      const { data, error } = await supabase.functions.invoke('check-subscription', {
        headers: {
          Authorization: `Bearer ${active.access_token}`,
        },
      });

      if (error) {
        console.error('Error checking subscription:', error);
        return;
      }

      setSubscriptionInfo(data);
    } catch (error) {
      console.error('Error refreshing subscription:', error);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    /** Débloque l’UI si getSession / listener restent bloqués (réseau très faible). */
    const AUTH_LOADING_FAILSAFE_MS = 12_000;
    const failSafe = setTimeout(() => {
      if (!mounted) return;
      console.warn('[Auth] Fail-safe: déblocage du chargement (timeout session)');
      setLoading(false);
    }, AUTH_LOADING_FAILSAFE_MS);

    const applySession = (session: Session | null) => {
      if (!mounted) return;
      clearTimeout(failSafe);
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      if (session?.user) {
        queueMicrotask(() => {
          void refreshSubscription();
        });
      } else {
        setSubscriptionInfo(null);
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      try {
        applySession(session);
        applySession(session);

        if (event === 'SIGNED_IN' && session?.user) {
          setTimeout(() => {
            const fcmToken = (window as any).fcmToken;
            if (fcmToken) {
              window.dispatchEvent(
                new CustomEvent('userAuthenticatedWithFCMToken', {
                  detail: { token: fcmToken, userId: session.user.id },
                })
              );
            }
          }, 500);
        }
      } catch (e) {
        console.error('[Auth] onAuthStateChange handler error:', e);
        if (mounted) setLoading(false);
      }
    });

    supabase.auth
      .getSession()
      .then(({ data: { session }, error }) => {
        if (error) console.error('[Auth] getSession error:', error);
        if (error) console.error('[Auth] getSession error:', error);
        if (!mounted) return;
        if (session) {
          setSession(session);
          setUser(session.user);
          setLoading(false);
          clearTimeout(failSafe);
          if (session.user) {
            queueMicrotask(() => {
              void refreshSubscription();
            });
          }
        }
      })
      .catch((err) => {
        console.error('[Auth] getSession rejected:', err);
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
      clearTimeout(failSafe);
      subscription.unsubscribe();
    };
  }, [refreshSubscription]);

  const signOut = async () => {
    try {
      console.log('🚪 [AUTH] Starting signOut...');

      // 1. Déconnexion serveur
      await supabase.auth.signOut({ scope: 'global' });

      // 2. Nettoyer tokens Supabase + flags consentement (localStorage)
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.includes('supabase') || key.includes('sb-') || key.startsWith('consent_'))) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach((key) => localStorage.removeItem(key));
      console.log('🗑️ [AUTH] Removed localStorage keys:', keysToRemove);

      sessionStorage.clear();

      // 3. Ne PAS appeler setUser(null) avant la navigation : sinon Layout rend
      //    <Navigate to="/auth" /> en SPA alors qu’un Dialog peut encore avoir verrouillé
      //    le body (pointer-events: none) → boutons Auth non cliquables jusqu’au reload app.
      console.log('✅ [AUTH] SignOut complete, hard redirect...');
      window.location.replace('/auth');
    } catch (error) {
      console.error('❌ [AUTH] Error signing out:', error);
      localStorage.clear();
      sessionStorage.clear();
      window.location.replace('/auth');
    }
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, subscriptionInfo, refreshSubscription, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};