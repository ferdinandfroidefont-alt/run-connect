import { Share } from '@capacitor/share';
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

      // Check if we're on mobile (Capacitor)
      if ((window as any).Capacitor) {
        await Share.share({
          title: shareTitle,
          text: shareText,
          url: profileUrl,
          dialogTitle: 'Partager mon profil'
        });
      } else {
        // Fallback for web - use Web Share API or clipboard
        if (navigator.share) {
          await navigator.share({
            title: shareTitle,
            text: shareText,
            url: profileUrl
          });
        } else {
          // Fallback to clipboard
          await navigator.clipboard.writeText(`${shareText}\n${profileUrl}`);
          toast({
            title: "Lien copié !",
            description: "Le lien de votre profil a été copié dans le presse-papiers"
          });
        }
      }

      toast({
        title: "Profil partagé !",
        description: "Votre profil a été partagé avec succès"
      });
      
    } catch (error: any) {
      console.error('Error sharing profile:', error);
      
      if (error.message !== 'Share canceled') {
        toast({
          title: "Erreur",
          description: "Impossible de partager le profil",
          variant: "destructive"
        });
      }
    }
  };

  return { shareProfile };
};