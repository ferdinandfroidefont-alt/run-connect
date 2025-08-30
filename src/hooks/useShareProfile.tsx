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

      const shareData = {
        title: shareTitle,
        text: shareText,
        url: profileUrl
      };

      console.log('🔍 Share debug info:', {
        hasNavigatorShare: !!navigator.share,
        hasCanShare: !!navigator.canShare,
        canShareData: navigator.canShare ? navigator.canShare(shareData) : 'N/A',
        isHttps: window.location.protocol === 'https:',
        userAgent: navigator.userAgent,
        shareData
      });

      // Prioritize native browser Web Share API over Capacitor
      // This opens the system share menu on mobile browsers
      if (navigator.share) {
        console.log('🔍 Attempting navigator.share...');
        
        // Check if we can share this data
        if (navigator.canShare && !navigator.canShare(shareData)) {
          console.log('❌ canShare returned false, falling back to clipboard');
          throw new Error('Cannot share this data');
        }
        
        await navigator.share(shareData);
        console.log('✅ navigator.share succeeded');
        
        toast({
          title: "Profil partagé !",
          description: "Votre profil a été partagé avec succès"
        });
        return;
      }

      console.log('🔍 navigator.share not available, checking Capacitor...');

      // Only use Capacitor Share when actually on a native mobile app
      const isActuallyNative = Capacitor.isNativePlatform() && !window.location.hostname.includes('lovable');
      
      console.log('🔍 Capacitor check:', {
        isNativePlatform: Capacitor.isNativePlatform(),
        hostname: window.location.hostname,
        isActuallyNative
      });
      
      if (isActuallyNative) {
        console.log('🔍 Using Capacitor Share...');
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
        console.log('🔍 Falling back to clipboard...');
        // Fallback to clipboard for desktop browsers without Web Share API
        await navigator.clipboard.writeText(`${shareText}\n${profileUrl}`);
        toast({
          title: "Lien copié !",
          description: "Le lien de votre profil a été copié dans le presse-papiers"
        });
      }
      
    } catch (error: any) {
      console.error('Error sharing profile:', error);
      
      // Handle user cancellation gracefully
      if (error.name === 'AbortError' || error.message === 'Share canceled') {
        return; // User cancelled, don't show error
      }
      
      // For any other error, try clipboard as fallback
      try {
        const profileUrl = `https://peak-stat.com/profile/${options.username}`;
        const shareContent = `${options.displayName || options.username} - ${profileUrl}`;
        await navigator.clipboard.writeText(shareContent);
        toast({
          title: "Lien copié !",
          description: "Le partage a échoué, mais le lien a été copié dans le presse-papiers"
        });
      } catch (clipboardError) {
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