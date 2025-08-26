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
      
      // Pour ferdinand.froidefont@gmail.com, vérifier directement dans la base
      if (session.user?.email === 'ferdinand.froidefont@gmail.com') {
        console.log('🔍 SUBSCRIPTION CHECK: Admin user detected, checking database directly');
        
        const { data: directCheck, error: directError } = await supabase
          .from('subscribers')
          .select('*')
          .eq('email', session.user.email)
          .maybeSingle();
          
        console.log('🔍 SUBSCRIPTION CHECK: Direct database result', { directCheck, directError });
        
        if (directCheck && directCheck.subscribed) {
          console.log('🔍 SUBSCRIPTION CHECK: Setting admin premium access');
          setSubscriptionInfo({
            subscribed: true,
            subscription_tier: directCheck.subscription_tier,
            subscription_end: directCheck.subscription_end
          });
          return;
        }
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
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        
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
      await supabase.auth.signOut({ scope: 'global' });
      window.location.href = '/auth';
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, subscriptionInfo, refreshSubscription, signOut }}>
      {/* Debug subscription info */}
      {user?.email === 'ferdinand.froidefont@gmail.com' && (
        <div style={{ 
          position: 'fixed', 
          top: 10, 
          right: 10, 
          background: 'black', 
          color: 'white', 
          padding: '10px', 
          fontSize: '12px',
          zIndex: 9999,
          borderRadius: '5px'
        }}>
          <div>Email: {user.email}</div>
          <div>Subscribed: {subscriptionInfo?.subscribed ? 'YES' : 'NO'}</div>
          <div>Tier: {subscriptionInfo?.subscription_tier || 'None'}</div>
          <button 
            onClick={refreshSubscription}
            style={{ marginTop: '5px', padding: '2px 5px' }}
          >
            Refresh
          </button>
        </div>
      )}
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