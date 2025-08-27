import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface InstagramConnectProps {
  profile?: any;
  onProfileUpdate?: () => void;
  isOwnProfile?: boolean;
}

export const InstagramConnect = ({ profile, onProfileUpdate, isOwnProfile }: InstagramConnectProps) => {
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  const handleInstagramConnect = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      console.log('Attempting Instagram connection...');
      const { data, error } = await supabase.functions.invoke('instagram-connect');
      
      if (error) {
        console.error('Error connecting to Instagram:', error);
        toast.error('Erreur lors de la connexion à Instagram');
        return;
      }

      console.log('Instagram connect response:', data);

      if (data?.authUrl) {
        console.log('Opening Instagram auth URL:', data.authUrl);
        // Open Instagram auth in new window
        const authWindow = window.open(data.authUrl, 'instagram-auth', 'width=600,height=600,scrollbars=yes,resizable=yes');
        
        if (!authWindow) {
          toast.error('Impossible d\'ouvrir la fenêtre d\'authentification. Vérifiez que les popups ne sont pas bloquées.');
          return;
        }
        
        // Listen for when the window closes (user completed auth)
        const checkClosed = setInterval(() => {
          if (authWindow.closed) {
            clearInterval(checkClosed);
            console.log('Auth window closed, refreshing profile...');
            // Refresh profile data after a short delay
            setTimeout(() => {
              onProfileUpdate?.();
              toast.success('Vérifiez si votre connexion Instagram a réussi');
            }, 1000);
          }
        }, 1000);
        
        // Also set a timeout to clean up the interval after 5 minutes
        setTimeout(() => {
          clearInterval(checkClosed);
        }, 300000);
      } else {
        console.error('No auth URL received from Instagram connect function');
        toast.error('URL d\'authentification non reçue');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Erreur lors de la connexion à Instagram');
    } finally {
      setLoading(false);
    }
  };

  const handleInstagramDisconnect = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { error } = await supabase.functions.invoke('instagram-disconnect');
      
      if (error) {
        console.error('Error disconnecting Instagram:', error);
        toast.error('Erreur lors de la déconnexion d\'Instagram');
        return;
      }

      toast.success('Instagram déconnecté avec succès');
      onProfileUpdate?.();
    } catch (error) {
      console.error('Error:', error);
      toast.error('Erreur lors de la déconnexion d\'Instagram');
    } finally {
      setLoading(false);
    }
  };

  if (!isOwnProfile) {
    // For other users' profiles, just show status
    return (
      <div className="flex items-center gap-2">
        {profile?.instagram_connected ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="text-pink-500">📷</span>
            Instagram connecté (@{profile.instagram_username})
          </div>
        ) : (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="text-gray-400">📷</span>
            Instagram non connecté
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Instagram</h3>
          <p className="text-sm text-muted-foreground">
            Connectez votre compte Instagram pour vérifier votre profil
          </p>
        </div>
        
        <div className="flex flex-col items-end gap-2">
          <Button
            disabled
            variant="outline"
            className="bg-gradient-to-r from-pink-500/20 to-purple-600/20 text-muted-foreground cursor-not-allowed"
          >
            Connecter Instagram
          </Button>
          <p className="text-xs text-muted-foreground italic">
            Fonctionnalité à venir
          </p>
        </div>
      </div>
    </div>
  );
};