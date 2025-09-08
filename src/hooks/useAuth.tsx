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
          .eq('user_id', session.user.id)
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
      async (event, session) => {
        console.log('🔄 AUTH STATE CHANGE:', event, session?.user?.email);
        
        // Si l'événement indique une erreur de token ou de session
        if (event === 'TOKEN_REFRESHED' && !session) {
          console.log('🚨 TOKEN REFRESH FAILED - clearing session');
          await supabase.auth.signOut({ scope: 'global' });
          setSession(null);
          setUser(null);
          setSubscriptionInfo(null);
          setLoading(false);
          return;
        }
        
        // Vérifier si le profil existe toujours pour les sessions existantes
        if (session?.user) {
          try {
            const { data: profile, error: profileError } = await supabase
              .from('profiles')
              .select('user_id')
              .eq('user_id', session.user.id)
              .maybeSingle();
              
            console.log('🔍 PROFILE CHECK:', { profile, profileError });
            
            // Si le profil n'existe pas ou erreur d'accès, c'est que le compte a été supprimé
            if (profileError || !profile) {
              console.log('🚨 ACCOUNT DELETED OR INACCESSIBLE - signing out');
              await supabase.auth.signOut({ scope: 'global' });
              setSession(null);
              setUser(null);
              setSubscriptionInfo(null);
              setLoading(false);
              
              // Rediriger vers l'authentification avec un message
              setTimeout(() => {
                window.location.href = '/auth';
              }, 100);
              return;
            }
          } catch (error) {
            console.error('Error checking profile:', error);
            // En cas d'erreur réseau, on laisse passer mais on surveille
          }
        }
        
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        
        // Force premium status for ferdinand.froidefont@gmail.com
        if (session?.user?.email === 'ferdinand.froidefont@gmail.com') {
          console.log('🔍 ADMIN USER: Forcing premium access');
          setSubscriptionInfo({
            subscribed: true,
            subscription_tier: 'Admin',
            subscription_end: '2099-12-31T23:59:59+00:00'
          });
        } else {
          // Check subscription when user signs in
          if (session?.user) {
            setTimeout(() => {
              refreshSubscription();
            }, 0);
          } else {
            setSubscriptionInfo(null);
          }
        }
      }
    );

    // Get initial session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      console.log('🔄 INITIAL SESSION CHECK:', session?.user?.email);
      
      // Vérifier si le profil existe toujours pour les sessions existantes
      if (session?.user) {
        try {
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('user_id')
            .eq('user_id', session.user.id)
            .maybeSingle();
            
          console.log('🔍 INITIAL PROFILE CHECK:', { profile, profileError });
          
          // Si le profil n'existe pas ou erreur d'accès, c'est que le compte a été supprimé
          if (profileError || !profile) {
            console.log('🚨 ACCOUNT DELETED OR INACCESSIBLE - clearing session');
            await supabase.auth.signOut({ scope: 'global' });
            setSession(null);
            setUser(null);
            setSubscriptionInfo(null);
            setLoading(false);
            return;
          }
        } catch (error) {
          console.error('Error checking initial profile:', error);
          // En cas d'erreur réseau, on continue normalement
        }
      }
      
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      
      // Force premium status for ferdinand.froidefont@gmail.com
      if (session?.user?.email === 'ferdinand.froidefont@gmail.com') {
        console.log('🔍 ADMIN USER: Forcing premium access on initial load');
        setSubscriptionInfo({
          subscribed: true,
          subscription_tier: 'Admin',
          subscription_end: '2099-12-31T23:59:59+00:00'
        });
      } else {
        // Check subscription for existing session
        if (session?.user) {
          setTimeout(() => {
            refreshSubscription();
          }, 0);
        }
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    try {
      // Nettoyer complètement le stockage local
      localStorage.removeItem('supabase.auth.token');
      localStorage.removeItem('sb-dbptgehpknjsoisirviz-auth-token');
      sessionStorage.clear();
      
      await supabase.auth.signOut({ scope: 'global' });
      window.location.href = '/auth';
    } catch (error) {
      console.error('Error signing out:', error);
      // Forcer la redirection même en cas d'erreur
      window.location.href = '/auth';
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