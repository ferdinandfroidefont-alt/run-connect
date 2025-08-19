import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { User, UserPlus, Users, Trophy } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface Profile {
  user_id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  bio: string | null;
  created_at: string;
}

interface UserStats {
  follower_count: number;
  following_count: number;
  total_points: number;
}

interface ProfilePreviewDialogProps {
  userId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export const ProfilePreviewDialog = ({ userId, isOpen, onClose }: ProfilePreviewDialogProps) => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);

  useEffect(() => {
    if (userId && isOpen) {
      loadProfile();
      checkFollowStatus();
    }
  }, [userId, isOpen]);

  const loadProfile = async () => {
    if (!userId) return;

    try {
      setLoading(true);
      
      // Get profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (profileError) throw profileError;

      // Get stats
      const [followerCount, followingCount, userScore] = await Promise.all([
        supabase.rpc('get_follower_count', { profile_user_id: userId }),
        supabase.rpc('get_following_count', { profile_user_id: userId }),
        supabase
          .from('user_scores')
          .select('total_points')
          .eq('user_id', userId)
          .single()
      ]);

      setProfile(profileData);
      setStats({
        follower_count: followerCount.data || 0,
        following_count: followingCount.data || 0,
        total_points: userScore.data?.total_points || 0
      });
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkFollowStatus = async () => {
    if (!user || !userId || user.id === userId) return;

    try {
      const { data } = await supabase
        .from('user_follows')
        .select('id')
        .eq('follower_id', user.id)
        .eq('following_id', userId)
        .eq('status', 'accepted')
        .maybeSingle();

      setIsFollowing(!!data);
    } catch (error) {
      console.error('Error checking follow status:', error);
    }
  };

  const handleFollow = async () => {
    if (!user || !userId) return;

    try {
      setFollowLoading(true);

      if (isFollowing) {
        // Unfollow
        const { error } = await supabase
          .from('user_follows')
          .delete()
          .eq('follower_id', user.id)
          .eq('following_id', userId);

        if (error) throw error;
        setIsFollowing(false);
        toast.success('Vous ne suivez plus cet utilisateur');
      } else {
        // Follow
        const { error } = await supabase
          .from('user_follows')
          .insert([{
            follower_id: user.id,
            following_id: userId,
            status: 'pending'
          }]);

        if (error) throw error;
        toast.success('Demande de suivi envoyée');
      }
    } catch (error: any) {
      toast.error('Erreur: ' + error.message);
    } finally {
      setFollowLoading(false);
    }
  };

  if (!profile) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Profil utilisateur</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Profile Header */}
          <div className="flex items-center gap-4">
            <Avatar className="w-16 h-16">
              <AvatarImage src={profile.avatar_url || undefined} alt={profile.display_name || profile.username} />
              <AvatarFallback className="text-lg">
                {(profile.display_name || profile.username || 'U').charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1">
              <h3 className="text-lg font-semibold">{profile.display_name || profile.username}</h3>
              <p className="text-sm text-muted-foreground">@{profile.username}</p>
            </div>
          </div>

          {/* Bio */}
          {profile.bio && (
            <Card>
              <CardContent className="p-3">
                <p className="text-sm">{profile.bio}</p>
              </CardContent>
            </Card>
          )}

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-3 text-center">
                <div className="flex items-center justify-center mb-1">
                  <Users className="h-4 w-4 text-primary" />
                </div>
                <div className="text-lg font-semibold">{stats?.follower_count || 0}</div>
                <div className="text-xs text-muted-foreground">Abonnés</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-3 text-center">
                <div className="flex items-center justify-center mb-1">
                  <UserPlus className="h-4 w-4 text-primary" />
                </div>
                <div className="text-lg font-semibold">{stats?.following_count || 0}</div>
                <div className="text-xs text-muted-foreground">Abonnements</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-3 text-center">
                <div className="flex items-center justify-center mb-1">
                  <Trophy className="h-4 w-4 text-primary" />
                </div>
                <div className="text-lg font-semibold">{stats?.total_points || 0}</div>
                <div className="text-xs text-muted-foreground">Points</div>
              </CardContent>
            </Card>
          </div>

          {/* Member since */}
          <Card>
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-primary" />
                <span className="text-sm">
                  Membre depuis {new Date(profile.created_at).toLocaleDateString('fr-FR', { 
                    month: 'long', 
                    year: 'numeric' 
                  })}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          {user && user.id !== userId && (
            <Button
              onClick={handleFollow}
              disabled={followLoading}
              className="w-full"
              variant={isFollowing ? "outline" : "default"}
            >
              <UserPlus className="h-4 w-4 mr-2" />
              {followLoading ? "..." : isFollowing ? "Ne plus suivre" : "Suivre"}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};