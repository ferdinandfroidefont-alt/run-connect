import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { withTimeout } from '@/lib/promiseUtils';

export interface UserProfile {
  id: string;
  user_id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  age: number | null;
  bio: string | null;
  phone: string | null;
  is_premium: boolean;
  is_admin: boolean;
  notifications_enabled: boolean;
  rgpd_accepted: boolean;
  security_rules_accepted: boolean;
  onboarding_completed: boolean;
  running_records: any;
  cycling_records: any;
  swimming_records: any;
  triathlon_records: any;
  walking_records: any;
  strava_connected: boolean;
  strava_verified_at: string | null;
  strava_user_id: string | null;
  instagram_connected: boolean;
  instagram_verified_at: string | null;
  instagram_username: string | null;
  rpm_avatar_url: string | null;
  avatar_model_id: string | null;
  created_at: string;
  updated_at: string;
  /** km | mi — affichage des distances (données toujours en km côté API) */
  distance_unit?: string | null;
}

interface UserProfileContextType {
  userProfile: UserProfile | null;
  loading: boolean;
  error: string | null;
  refreshProfile: () => Promise<void>;
}

const UserProfileContext = createContext<UserProfileContextType | undefined>(undefined);

export const UserProfileProvider = ({ children }: { children: ReactNode }) => {
  const { user, session } = useAuth();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadProfile = async (retryCount = 0): Promise<void> => {
    if (!user?.id) {
      console.log('🔍 [UserProfile] No user ID, skipping profile load');
      setUserProfile(null);
      setLoading(false);
      return;
    }

    const PROFILE_FETCH_MS = 18_000;

    try {
      console.log(`🔍 [UserProfile] Loading profile for user: ${user.id} (attempt ${retryCount + 1}/3)`);

      let data: any = null;
      let fetchError: any = null;
      try {
        const res = await withTimeout(
          supabase.from('profiles').select('*').eq('user_id', user.id).single(),
          PROFILE_FETCH_MS,
          'profile_fetch'
        );
        data = res.data;
        fetchError = res.error;
      } catch (timeoutErr: unknown) {
        const msg = timeoutErr instanceof Error ? timeoutErr.message : String(timeoutErr);
        if (msg.includes('TIMEOUT')) {
          console.error('❌ [UserProfile] Timeout chargement profil (réseau lent)');
          setError('Connexion trop lente — impossible de charger le profil pour le moment');
          setUserProfile(null);
          return;
        }
        throw timeoutErr;
      }

      if (fetchError) {
        // Retry on JWT/auth errors
        if (fetchError.message.includes('JWT') && retryCount < 2) {
          console.warn(`⚠️ [UserProfile] Auth error, retrying in 1s... (${retryCount + 1}/3)`);
          await new Promise(resolve => setTimeout(resolve, 1000));
          return loadProfile(retryCount + 1);
        }
        
        console.error('❌ [UserProfile] Error loading profile:', fetchError);
        setError('Impossible de charger le profil');
        setUserProfile(null);
        return;
      }

      if (!data) {
        console.error('❌ [UserProfile] No profile data found');
        setError('Profil non trouvé');
        setUserProfile(null);
        return;
      }

      console.log('✅ [UserProfile] Profile loaded successfully:', {
        username: data.username,
        display_name: data.display_name,
        avatar_url: data.avatar_url ? 'present' : 'missing',
        age: data.age,
        bio: data.bio ? 'present' : 'missing',
        phone: data.phone ? 'present' : 'missing'
      });

      setUserProfile(data as UserProfile);
      setError(null);
    } catch (err: any) {
      console.error('❌ [UserProfile] Unexpected error:', err);
      setError(err.message || 'Erreur inconnue');
      setUserProfile(null);
    } finally {
      setLoading(false);
    }
  };

  const refreshProfile = async () => {
    // NE PAS remettre loading à true pour éviter les flashs et les boucles
    // Le rechargement se fait en arrière-plan
    console.log('🔄 [UserProfile] Rafraîchissement du profil en arrière-plan...');
    await loadProfile();
  };

  // Load profile when user changes or session is established
  useEffect(() => {
    if (user && session) {
      console.log('🔄 [UserProfile] User or session changed, loading profile...');
      setLoading(true);
      // Small delay to ensure auth is fully established
      const timer = setTimeout(() => {
        loadProfile();
      }, 500);
      
      return () => clearTimeout(timer);
    } else {
      console.log('🔄 [UserProfile] No user/session, clearing profile');
      setUserProfile(null);
      setLoading(false);
      setError(null);
    }
  }, [user?.id, session]);

  // Subscribe to profile changes
  useEffect(() => {
    if (!user?.id) return;

    console.log('👂 [UserProfile] Setting up real-time subscription');
    
    const channel = supabase
      .channel('profile-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('🔄 [UserProfile] Profile updated via real-time:', payload);
          if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
            setUserProfile(payload.new as UserProfile);
          } else if (payload.eventType === 'DELETE') {
            setUserProfile(null);
          }
        }
      )
      .subscribe();

    return () => {
      console.log('👋 [UserProfile] Cleaning up real-time subscription');
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  return (
    <UserProfileContext.Provider value={{ userProfile, loading, error, refreshProfile }}>
      {children}
    </UserProfileContext.Provider>
  );
};

export const useUserProfile = () => {
  const context = useContext(UserProfileContext);
  if (context === undefined) {
    throw new Error('useUserProfile must be used within UserProfileProvider');
  }
  return context;
};
