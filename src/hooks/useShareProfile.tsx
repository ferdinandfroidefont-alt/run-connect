import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';
import { useToast } from '@/hooks/use-toast';

interface ShareProfileOptions {
  username: string;
  displayName?: string | null;
  bio?: string | null;
}

export const useShareProfile = () => {
  const { toast } = useToast();

  const shareProfile = async (options: ShareProfileOptions) => {
    try {
      // Create a profile URL (this could be a deep link to your app)
      const profileUrl = `https://peak-stat.com/profile/${options.username}`;
      
      const shareTitle = `Profil de ${options.displayName || options.username}`;
      const shareText = options.bio 
        ? `Découvrez le profil de ${options.displayName || options.username}: ${options.bio}`
        : `Découvrez le profil de ${options.displayName || options.username} sur notre app de sport !`;

      // Check if we're on a native mobile platform
      if (Capacitor.isNativePlatform()) {
        await Share.share({
          title: shareTitle,
          text: shareText,
          url: profileUrl,
          dialogTitle: 'Partager mon profil'
        });
        
        toast({
          title: "Profil partagé !",
          description: "Votre profil a été partagé avec succès"
        });
      } else {
        // For web, always use clipboard as primary method
        try {
          // Try Web Share API first (only works in secure contexts and with user interaction)
          if (navigator.share && navigator.canShare && navigator.canShare({
            title: shareTitle,
            text: shareText,
            url: profileUrl
          })) {
            await navigator.share({
              title: shareTitle,
              text: shareText,
              url: profileUrl
            });
            
            toast({
              title: "Profil partagé !",
              description: "Votre profil a été partagé avec succès"
            });
          } else {
            throw new Error('Web Share API not available');
          }
        } catch (shareError) {
          // Fallback to clipboard
          try {
            await navigator.clipboard.writeText(`${shareText}\n${profileUrl}`);
            toast({
              title: "Lien copié !",
              description: "Le lien de votre profil a été copié dans le presse-papiers"
            });
          } catch (clipboardError) {
            // Final fallback: create a temporary text area
            const textArea = document.createElement('textarea');
            textArea.value = `${shareText}\n${profileUrl}`;
            textArea.style.position = 'fixed';
            textArea.style.left = '-999999px';
            textArea.style.top = '-999999px';
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            
            try {
              document.execCommand('copy');
              document.body.removeChild(textArea);
              toast({
                title: "Lien copié !",
                description: "Le lien de votre profil a été copié dans le presse-papiers"
              });
            } catch (execError) {
              document.body.removeChild(textArea);
              throw new Error('Impossible de copier le lien');
            }
          }
        }
      }
      
    } catch (error: any) {
      console.error('Error sharing profile:', error);
      
      if (error.message !== 'Share canceled' && error.message !== 'AbortError') {
        toast({
          title: "Erreur",
          description: "Impossible de partager le profil. Veuillez réessayer.",
          variant: "destructive"
        });
      }
    }
  };

  return { shareProfile };
};