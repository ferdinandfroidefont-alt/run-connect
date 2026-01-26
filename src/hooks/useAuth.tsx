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
  isAdmin: boolean;
  refreshSubscription: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [subscriptionInfo, setSubscriptionInfo] = useState<SubscriptionInfo | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  // Check if user has admin role using database function
  const checkAdminRole = async (userId: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase.rpc('has_role', {
        _user_id: userId,
        _role: 'admin'
      });
      
      if (error) {
        console.error('Error checking admin role:', error);
        return false;
      }
      
      return data === true;
    } catch (error) {
      console.error('Error in checkAdminRole:', error);
      return false;
    }
  };

  const refreshSubscription = async () => {
    if (!session) return;
    
    try {
      console.log('🔍 SUBSCRIPTION CHECK: Starting check for user');
      
      // Check if user is admin via database role
      const userIsAdmin = await checkAdminRole(session.user.id);
      setIsAdmin(userIsAdmin);
      
      if (userIsAdmin) {
        console.log('🔍 SUBSCRIPTION CHECK: Admin role detected via database');
        
        // Check if admin has a subscription record, otherwise create default admin access
        const { data: adminSub, error: adminSubError } = await supabase
          .from('subscribers')
          .select('*')
          .eq('user_id', session.user.id)
          .maybeSingle();
          
        if (adminSub && adminSub.subscribed) {
          setSubscriptionInfo({
            subscribed: true,
            subscription_tier: adminSub.subscription_tier || 'Admin',
            subscription_end: adminSub.subscription_end
          });
        } else {
          // Admin role grants premium access even without subscriber record
          setSubscriptionInfo({
            subscribed: true,
            subscription_tier: 'Admin',
            subscription_end: null
          });
        }
        return;
      }
      
      const { data, error } = await supabase.functions.invoke('check-subscription', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });
      
      console.log('🔍 SUBSCRIPTION CHECK: Response received', { data, error });
      
      if (error) {
        console.error('Error checking subscription:', error);
        return;
      }
      
      console.log('🔍 SUBSCRIPTION CHECK: Setting subscription info', data);
      setSubscriptionInfo(data);
    } catch (error) {
      console.error('Error refreshing subscription:', error);
    }
  };

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔄 AUTH STATE CHANGE:', event);
        
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        
        // 🔥 NIVEAU 21 : Sauvegarder le token FCM en attente après connexion
        if (event === 'SIGNED_IN' && session?.user) {
          // Attendre 500ms pour laisser React se stabiliser
          setTimeout(() => {
            const fcmToken = (window as any).fcmToken;
            if (fcmToken) {
              console.log('🔥 [AUTH] Token FCM détecté après connexion, sauvegarde immédiate...');
              
              // Dispatch un événement pour que usePushNotifications sauvegarde le token
              window.dispatchEvent(new CustomEvent('userAuthenticatedWithFCMToken', {
                detail: { token: fcmToken, userId: session.user.id }
              }));
            }
          }, 500);
        }
        
        // Check subscription and admin role for signed in users
        if (session?.user) {
          setTimeout(() => {
            refreshSubscription();
          }, 0);
        } else {
          setSubscriptionInfo(null);
          setIsAdmin(false);
        }
      }
    );

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('🔄 INITIAL SESSION CHECK');
      console.log('🔄 Session access_token present:', !!session?.access_token);
      console.log('🔄 Session refresh_token present:', !!session?.refresh_token);
      
      // Vérifier le localStorage
      const storedSession = localStorage.getItem('sb-dbptgehpknjsoisirviz-auth-token');
      console.log('🔄 LocalStorage session found:', !!storedSession);
      
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      
      // Check subscription and admin role for existing session
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
      // Clear all sensitive application data from localStorage
      const sensitiveKeys = [
        'supabase.auth.token',
        'sb-dbptgehpknjsoisirviz-auth-token',
        'pendingRoute',          // GPS route data
        'editRouteData',         // Route editing data with coordinates
        'subscription_cache',    // Subscription cache
      ];
      
      sensitiveKeys.forEach(key => {
        localStorage.removeItem(key);
      });
      
      // Clear all sessionStorage (includes referralCode, targetProfileUsername)
      sessionStorage.clear();
      
      await supabase.auth.signOut({ scope: 'global' });
      window.location.href = '/auth';
    } catch (error) {
      console.error('Error signing out:', error);
      // Force redirect even on error, but still try to clear storage
      try {
        localStorage.clear();
        sessionStorage.clear();
      } catch (e) {
        // Ignore storage errors during cleanup
      }
      window.location.href = '/auth';
    }
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, subscriptionInfo, isAdmin, refreshSubscription, signOut }}>
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