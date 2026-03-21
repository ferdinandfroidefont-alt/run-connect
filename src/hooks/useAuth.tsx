import { useState, useEffect, createContext, useContext } from 'react';
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

  const refreshSubscription = async () => {
    if (!session) return;
    
    try {
      console.log('🔍 SUBSCRIPTION CHECK: Starting check for user', session.user?.email);
      
      const { data, error } = await supabase.functions.invoke('check-subscription', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
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
  };

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        // Auth state changed
        
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        
        // 🔥 NIVEAU 21 : Sauvegarder le token FCM en attente après connexion
        if (event === 'SIGNED_IN' && session?.user) {
          // Attendre 500ms pour laisser React se stabiliser
          setTimeout(() => {
            const fcmToken = (window as any).fcmToken;
            if (fcmToken) {
              // FCM token detected after sign-in
              
              // Dispatch un événement pour que usePushNotifications sauvegarde le token
              window.dispatchEvent(new CustomEvent('userAuthenticatedWithFCMToken', {
                detail: { token: fcmToken, userId: session.user.id }
              }));
            }
          }, 500);
        }
        
        // Check subscription when user signs in
        if (session?.user) {
          setTimeout(() => {
            refreshSubscription();
          }, 0);
        } else {
          setSubscriptionInfo(null);
        }
      }
    );

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      // Initial session check
      const storedSession = localStorage.getItem('sb-dbptgehpknjsoisirviz-auth-token');
      
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      
      // Check subscription for existing session
      if (session?.user) {
        setTimeout(() => {
          refreshSubscription();
        }, 0);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

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