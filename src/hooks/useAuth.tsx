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
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        
        // Update online status and last seen
        if (session?.user) {
          setTimeout(() => {
            updateOnlineStatus(session.user.id, true);
            refreshSubscription();
          }, 0);
        } else {
          setSubscriptionInfo(null);
        }
      }
    );

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      
      // Update online status and check subscription for existing session
      if (session?.user) {
        setTimeout(() => {
          updateOnlineStatus(session.user.id, true);
          refreshSubscription();
        }, 0);
      }
    });

    // Set up beforeunload listener to update offline status
    const handleBeforeUnload = () => {
      if (user) {
        updateOnlineStatus(user.id, false);
      }
    };

    // Set up visibility change listener
    const handleVisibilityChange = () => {
      if (user) {
        const isOnline = !document.hidden;
        updateOnlineStatus(user.id, isOnline);
      }
    };

    // Set up periodic last seen update
    const intervalId = setInterval(() => {
      if (user && !document.hidden) {
        updateLastSeen(user.id);
      }
    }, 30000); // Update every 30 seconds

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearInterval(intervalId);
    };
  }, [user]);

  const updateOnlineStatus = async (userId: string, isOnline: boolean) => {
    try {
      await supabase
        .from('profiles')
        .update({ 
          is_online: isOnline,
          last_seen: new Date().toISOString()
        })
        .eq('user_id', userId);
    } catch (error) {
      console.error('Error updating online status:', error);
    }
  };

  const updateLastSeen = async (userId: string) => {
    try {
      await supabase
        .from('profiles')
        .update({ last_seen: new Date().toISOString() })
        .eq('user_id', userId);
    } catch (error) {
      console.error('Error updating last seen:', error);
    }
  };

  const signOut = async () => {
    try {
      // Update offline status before signing out
      if (user) {
        await updateOnlineStatus(user.id, false);
      }
      await supabase.auth.signOut({ scope: 'global' });
      window.location.href = '/auth';
    } catch (error) {
      console.error('Error signing out:', error);
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