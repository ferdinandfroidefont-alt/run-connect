import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const useReadyPlayerMe = () => {
  const [isCreating, setIsCreating] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const { toast } = useToast();

  const handleAvatarExport = useCallback(async (event: MessageEvent) => {
    if (event.data?.source !== 'readyplayerme') return;

    if (event.data.eventName === 'v1.avatar.exported') {
      const glbUrl = event.data.data.url;
      console.log('Ready Player Me avatar URL:', glbUrl);
      
      setAvatarUrl(glbUrl);
      setIsCreating(false);

      // Save to database
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        const { error } = await supabase
          .from('profiles')
          .update({ rpm_avatar_url: glbUrl })
          .eq('user_id', user.id);

        if (error) throw error;

        toast({
          title: "Avatar créé !",
          description: "Votre avatar photoréaliste a été sauvegardé avec succès.",
        });
      } catch (error) {
        console.error('Error saving avatar URL:', error);
        toast({
          title: "Erreur",
          description: "Impossible de sauvegarder l'avatar. Veuillez réessayer.",
          variant: "destructive",
        });
      }
    }
  }, [toast]);

  const startCreation = useCallback(() => {
    setIsCreating(true);
    window.addEventListener('message', handleAvatarExport);
    
    return () => {
      window.removeEventListener('message', handleAvatarExport);
    };
  }, [handleAvatarExport]);

  return {
    isCreating,
    avatarUrl,
    startCreation,
    setIsCreating,
  };
};
