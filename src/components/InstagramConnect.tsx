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
      const { data, error } = await supabase.functions.invoke('instagram-connect');
      
      if (error) {
        console.error('Error connecting to Instagram:', error);
        toast.error('Erreur lors de la connexion à Instagram');
        return;
      }

      if (data?.authUrl) {
        // Open Instagram auth in new window
        window.open(data.authUrl, 'instagram-auth', 'width=600,height=600');
        
        // Listen for when the window closes (user completed auth)
        const checkClosed = setInterval(() => {
          try {
            if (window.closed) {
              clearInterval(checkClosed);
              // Refresh profile data after a short delay
              setTimeout(() => {
                onProfileUpdate?.();
              }, 1000);
            }
          } catch (e) {
            // Window access error, likely means it closed
            clearInterval(checkClosed);
            setTimeout(() => {
              onProfileUpdate?.();
            }, 1000);
          }
        }, 1000);
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
        
        {profile?.instagram_connected ? (
          <div className="flex items-center gap-4">
            <div className="text-sm text-muted-foreground">
              <span className="text-pink-500">📷</span>
              @{profile.instagram_username}
            </div>
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  Déconnecter
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Déconnecter Instagram</DialogTitle>
                  <DialogDescription>
                    Êtes-vous sûr de vouloir déconnecter votre compte Instagram ? 
                    Votre profil ne sera plus vérifié via Instagram.
                  </DialogDescription>
                </DialogHeader>
                <div className="flex justify-end gap-2 mt-4">
                  <Button
                    variant="outline"
                    onClick={() => {}}
                  >
                    Annuler
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleInstagramDisconnect}
                    disabled={loading}
                  >
                    {loading ? 'Déconnexion...' : 'Déconnecter'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        ) : (
          <Button
            onClick={handleInstagramConnect}
            disabled={loading}
            className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700"
          >
            {loading ? 'Connexion...' : 'Connecter Instagram'}
          </Button>
        )}
      </div>
    </div>
  );
};