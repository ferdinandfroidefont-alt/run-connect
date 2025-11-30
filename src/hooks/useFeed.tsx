import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export interface FeedSession {
  id: string;
  title: string;
  activity_type: string;
  location_name: string;
  location_lat: number;
  location_lng: number;
  scheduled_at: string;
  max_participants: number | null;
  current_participants: number;
  description: string | null;
  created_at: string;
  organizer: {
    user_id: string;
    username: string;
    display_name: string;
    avatar_url: string;
  };
  likes_count: number;
  comments_count: number;
  is_liked: boolean;
  latest_comments: Array<{
    id: string;
    content: string;
    created_at: string;
    user: {
      username: string;
      avatar_url: string;
    };
  }>;
}

export const useFeed = () => {
  const { user } = useAuth();
  const [feedItems, setFeedItems] = useState<FeedSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  const LIMIT = 10;

  const loadFeed = useCallback(async (reset = false) => {
    if (!user) return;
    
    try {
      const currentOffset = reset ? 0 : offset;
      
      // Récupérer les IDs des amis
      const { data: friends, error: friendsError } = await supabase
        .from('user_follows')
        .select('following_id')
        .eq('follower_id', user.id)
        .eq('status', 'accepted');

      if (friendsError) throw friendsError;

      const friendIds = friends?.map(f => f.following_id) || [];
      
      if (friendIds.length === 0) {
        setHasMore(false);
        if (reset) setFeedItems([]);
        setLoading(false);
        return;
      }

      // Récupérer les sessions des amis
      const { data: sessions, error } = await supabase
        .from('sessions')
        .select(`
          id,
          title,
          activity_type,
          location_name,
          location_lat,
          location_lng,
          scheduled_at,
          max_participants,
          current_participants,
          description,
          created_at,
          organizer_id
        `)
        .in('organizer_id', friendIds)
        .order('created_at', { ascending: false })
        .range(currentOffset, currentOffset + LIMIT - 1);

      if (error) throw error;

      if (!sessions || sessions.length === 0) {
        setHasMore(false);
        if (reset) setFeedItems([]);
        return;
      }

      // Récupérer les profils des organisateurs
      const organizerIds = [...new Set(sessions.map(s => s.organizer_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, username, display_name, avatar_url')
        .in('user_id', organizerIds);

      // Récupérer les likes
      const sessionIds = sessions.map(s => s.id);
      const { data: likes } = await supabase
        .from('session_likes')
        .select('session_id')
        .in('session_id', sessionIds);

      const { data: userLikes } = await supabase
        .from('session_likes')
        .select('session_id')
        .in('session_id', sessionIds)
        .eq('user_id', user.id);

      // Récupérer les commentaires
      const { data: comments } = await supabase
        .from('session_comments')
        .select(`
          id,
          session_id,
          content,
          created_at,
          user_id
        `)
        .in('session_id', sessionIds)
        .order('created_at', { ascending: false });

      // Récupérer les profils des commentateurs
      const commenterIds = comments ? [...new Set(comments.map(c => c.user_id))] : [];
      const { data: commentProfiles } = commenterIds.length > 0 
        ? await supabase
            .from('profiles')
            .select('user_id, username, avatar_url')
            .in('user_id', commenterIds)
        : { data: [] };

      // Assembler les données
      const enrichedSessions: FeedSession[] = sessions.map(session => {
        const organizer = profiles?.find(p => p.user_id === session.organizer_id);
        const sessionLikes = likes?.filter(l => l.session_id === session.id).length || 0;
        const isLiked = userLikes?.some(l => l.session_id === session.id) || false;
        const sessionComments = comments?.filter(c => c.session_id === session.id) || [];
        
        return {
          ...session,
          organizer: organizer || {
            user_id: session.organizer_id,
            username: 'user',
            display_name: 'Utilisateur',
            avatar_url: ''
          },
          likes_count: sessionLikes,
          comments_count: sessionComments.length,
          is_liked: isLiked,
          latest_comments: sessionComments.slice(0, 2).map(comment => {
            const commenter = commentProfiles?.find(p => p.user_id === comment.user_id);
            return {
              id: comment.id,
              content: comment.content,
              created_at: comment.created_at,
              user: {
                username: commenter?.username || 'user',
                avatar_url: commenter?.avatar_url || ''
              }
            };
          })
        };
      });

      if (reset) {
        setFeedItems(enrichedSessions);
        setOffset(LIMIT);
      } else {
        setFeedItems(prev => [...prev, ...enrichedSessions]);
        setOffset(currentOffset + LIMIT);
      }

      setHasMore(enrichedSessions.length === LIMIT);
    } catch (error) {
      console.error('Error loading feed:', error);
      toast.error('Erreur lors du chargement du feed');
    } finally {
      setLoading(false);
    }
  }, [user, offset]);

  const refresh = useCallback(async () => {
    setLoading(true);
    setOffset(0);
    await loadFeed(true);
  }, [loadFeed]);

  const loadMore = useCallback(async () => {
    if (!hasMore || loading) return;
    await loadFeed(false);
  }, [hasMore, loading, loadFeed]);

  const likeSession = useCallback(async (sessionId: string) => {
    if (!user) return;

    try {
      await supabase
        .from('session_likes')
        .insert({ session_id: sessionId, user_id: user.id });

      setFeedItems(prev =>
        prev.map(item =>
          item.id === sessionId
            ? { ...item, is_liked: true, likes_count: item.likes_count + 1 }
            : item
        )
      );
    } catch (error) {
      console.error('Error liking session:', error);
    }
  }, [user]);

  const unlikeSession = useCallback(async (sessionId: string) => {
    if (!user) return;

    try {
      await supabase
        .from('session_likes')
        .delete()
        .eq('session_id', sessionId)
        .eq('user_id', user.id);

      setFeedItems(prev =>
        prev.map(item =>
          item.id === sessionId
            ? { ...item, is_liked: false, likes_count: item.likes_count - 1 }
            : item
        )
      );
    } catch (error) {
      console.error('Error unliking session:', error);
    }
  }, [user]);

  const addComment = useCallback(async (sessionId: string, content: string) => {
    if (!user || !content.trim()) return;

    try {
      const { data: newComment, error } = await supabase
        .from('session_comments')
        .insert({
          session_id: sessionId,
          user_id: user.id,
          content: content.trim()
        })
        .select()
        .single();

      if (error) throw error;

      const { data: profile } = await supabase
        .from('profiles')
        .select('username, avatar_url')
        .eq('user_id', user.id)
        .single();

      setFeedItems(prev =>
        prev.map(item =>
          item.id === sessionId
            ? {
                ...item,
                comments_count: item.comments_count + 1,
                latest_comments: [
                  {
                    id: newComment.id,
                    content: newComment.content,
                    created_at: newComment.created_at,
                    user: {
                      username: profile?.username || 'user',
                      avatar_url: profile?.avatar_url || ''
                    }
                  },
                  ...item.latest_comments
                ].slice(0, 2)
              }
            : item
        )
      );

      toast.success('Commentaire ajouté');
    } catch (error) {
      console.error('Error adding comment:', error);
      toast.error('Erreur lors de l\'ajout du commentaire');
    }
  }, [user]);

  useEffect(() => {
    loadFeed(true);
  }, [user]);

  return {
    feedItems,
    loading,
    hasMore,
    loadMore,
    refresh,
    likeSession,
    unlikeSession,
    addComment
  };
};