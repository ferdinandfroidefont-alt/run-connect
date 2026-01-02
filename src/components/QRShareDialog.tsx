import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Copy, Share2, Instagram } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';
import { motion } from "framer-motion";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

interface QRShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profileUrl: string;
  username: string;
  displayName?: string | null;
  avatarUrl?: string | null;
  referralCode?: string | null;
}

export const QRShareDialog = ({
  open,
  onOpenChange,
  profileUrl,
  username,
  displayName,
  avatarUrl,
  referralCode
}: QRShareDialogProps) => {
  const { toast } = useToast();
  const [qrImageUrl, setQrImageUrl] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (open && profileUrl) {
      generateQR();
    }
  }, [open, profileUrl]);

  const generateQR = async () => {
    if (!profileUrl) return;
    
    setIsLoading(true);
    try {
      console.log('🔍 Generating QR for URL:', profileUrl);
      
      const qrDataURL = await QRCode.toDataURL(profileUrl, {
        width: 320,
        margin: 2,
        color: {
          dark: '#1a1f3a',  // Bleu foncé RunConnect
          light: '#6EC6FF'  // Cyan RunConnect
        },
        errorCorrectionLevel: 'M'
      });
      
      console.log('✅ QR code generated successfully');
      setQrImageUrl(qrDataURL);
    } catch (error) {
      console.error('❌ Error generating QR code:', error);
      toast({
        title: "Erreur",
        description: "Impossible de générer le QR code",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getShareMessage = () => {
    return `Ajoute-moi sur RunConnect (application pour course et vélo) :
${profileUrl}

Voici mon code de parrainage : ${referralCode || 'N/A'}
Entre-le à l'inscription pour gagner un bonus ! 🚀`;
  };

  const copyUrl = async () => {
    try {
      await navigator.clipboard.writeText(getShareMessage());
      toast({
        title: "✅ Lien copié !",
        description: "Le message a été copié dans le presse-papiers"
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de copier le lien",
        variant: "destructive"
      });
    }
  };

  const handleShare = async () => {
    const shareMessage = getShareMessage();
    
    try {
      if (Capacitor.isNativePlatform()) {
        // Partage natif mobile (iOS/Android)
        await Share.share({
          title: 'Rejoins-moi sur RunConnect',
          text: shareMessage,
          url: profileUrl,
          dialogTitle: 'Partager mon profil'
        });
      } else if (navigator.share) {
        // Web Share API (mobile web)
        await navigator.share({
          title: 'Rejoins-moi sur RunConnect',
          text: shareMessage,
          url: profileUrl
        });
      } else {
        // Fallback : copier dans le presse-papiers
        await navigator.clipboard.writeText(shareMessage);
        toast({
          title: "✅ Lien copié !",
          description: "Collez-le dans n'importe quelle application"
        });
      }
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.error('Share error:', error);
        toast({
          title: "Erreur",
          description: "Impossible de partager",
          variant: "destructive"
        });
      }
    }
  };

  const generateInstagramStoryImage = async () => {
    if (!qrImageUrl) {
      toast({
        title: "Erreur",
        description: "Le QR code n'est pas encore généré",
        variant: "destructive"
      });
      return;
    }

    try {
      const canvas = document.createElement('canvas');
      canvas.width = 1080;
      canvas.height = 1920;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) return;

      // Fond bleu RunConnect avec gradient
      const gradient = ctx.createLinearGradient(0, 0, 0, 1920);
      gradient.addColorStop(0, 'hsl(217, 91%, 65%)'); // Bleu clair
      gradient.addColorStop(1, 'hsl(217, 91%, 45%)'); // Bleu foncé
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 1080, 1920);

      // Photo de profil centrée (300x300px, rond)
      if (avatarUrl) {
        const profileImg = new Image();
        profileImg.crossOrigin = 'anonymous';
        profileImg.src = avatarUrl;
        await profileImg.decode();
        
        ctx.save();
        ctx.beginPath();
        ctx.arc(540, 500, 150, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(profileImg, 390, 350, 300, 300);
        ctx.restore();
        
        // Border blanc autour de la photo
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 8;
        ctx.beginPath();
        ctx.arc(540, 500, 150, 0, Math.PI * 2);
        ctx.stroke();
      }

      // QR Code centré (400x400px)
      const qrImg = new Image();
      qrImg.src = qrImageUrl;
      await qrImg.decode();
      ctx.drawImage(qrImg, 340, 900, 400, 400);

      // Texte "Ajoutez-moi sur RunConnect"
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 48px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('Ajoutez-moi sur RunConnect', 540, 750);

      // Username
      ctx.font = 'bold 60px Arial';
      ctx.fillText(`@${username}`, 540, 1400);

      // Code parrainage si disponible
      if (referralCode) {
        ctx.font = 'bold 40px Arial';
        ctx.fillText(`Code: ${referralCode}`, 540, 1500);
      }

      // Télécharger l'image
      canvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = `runconnect-story-${username}.png`;
        link.href = url;
        link.click();
        URL.revokeObjectURL(url);
      }, 'image/png', 1.0);

      toast({
        title: "✅ Story générée !",
        description: "Ouvrez Instagram et ajoutez-la à votre Story"
      });
    } catch (error) {
      console.error('Error generating Instagram story:', error);
      toast({
        title: "Erreur",
        description: "Impossible de générer l'image",
        variant: "destructive"
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full h-full max-w-full max-h-full sm:max-w-sm sm:max-h-[90vh] rounded-none sm:rounded-lg p-0 overflow-hidden border-0 sm:border bg-gradient-to-br from-background via-background to-primary/5 flex flex-col">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          className="relative"
        >
          {/* Header avec gradient */}
          <div className="bg-gradient-to-r from-primary/20 via-primary/10 to-cyan-400/20 px-6 pt-6 pb-4">
            <DialogHeader>
              <DialogTitle className="text-center text-lg font-bold">
                Partager mon profil
              </DialogTitle>
            </DialogHeader>
          </div>
          
          <div className="px-6 pb-6 space-y-5">
            {/* Photo de profil avec effet glow */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="flex flex-col items-center -mt-8"
            >
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-primary to-cyan-400 rounded-full blur-lg opacity-40 scale-110" />
                <div className="relative rounded-full p-[3px] bg-gradient-to-br from-primary via-primary/70 to-cyan-400">
                  <Avatar className="h-20 w-20 border-3 border-background shadow-xl">
                    <AvatarImage src={avatarUrl || undefined} alt={displayName || username} />
                    <AvatarFallback className="text-xl font-bold bg-primary/20 text-primary">
                      {(displayName || username)?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </div>
              </div>
              <h3 className="font-semibold text-base mt-3">
                {displayName || username}
              </h3>
              <p className="text-xs text-muted-foreground">
                Scannez pour m'ajouter
              </p>
            </motion.div>
            
            {/* QR Code avec cadre élégant */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="flex justify-center"
            >
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/30 to-cyan-400/30 rounded-2xl blur-xl opacity-50" />
                <div className="relative bg-gradient-to-br from-card to-card/80 p-4 rounded-2xl border border-primary/20 shadow-lg">
                  {isLoading ? (
                    <div className="w-[240px] h-[240px] flex items-center justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
                    </div>
                  ) : qrImageUrl ? (
                    <img 
                      src={qrImageUrl} 
                      alt="QR Code du profil"
                      className="rounded-lg"
                      style={{ width: 240, height: 240 }}
                    />
                  ) : (
                    <div className="w-[240px] h-[240px] flex items-center justify-center text-muted-foreground text-sm">
                      Erreur de génération
                    </div>
                  )}
                </div>
              </div>
            </motion.div>

            {/* Code parrainage compact */}
            {referralCode && (
              <motion.div
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="bg-gradient-to-r from-primary/10 via-primary/5 to-cyan-400/10 p-3 rounded-xl border border-primary/20"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Code parrainage</span>
                  <span className="font-mono font-bold text-primary text-sm tracking-wider">{referralCode}</span>
                </div>
              </motion.div>
            )}
            
            {/* URL minimaliste */}
            <p className="text-[10px] text-center text-muted-foreground/70 truncate px-2">
              {profileUrl}
            </p>
            
            {/* Boutons d'action redesignés */}
            <div className="space-y-2">
              <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
                <Button
                  variant="default"
                  size="default"
                  onClick={copyUrl}
                  className="w-full bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-lg shadow-primary/20"
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copier le lien
                </Button>
              </motion.div>
              
              <div className="grid grid-cols-2 gap-2">
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Button
                    variant="outline"
                    size="default"
                    onClick={handleShare}
                    className="w-full border-primary/30 hover:bg-primary/10 hover:border-primary/50"
                  >
                    <Share2 className="h-4 w-4 mr-2" />
                    Partager
                  </Button>
                </motion.div>
                
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Button
                    variant="outline"
                    size="default"
                    onClick={generateInstagramStoryImage}
                    disabled={!qrImageUrl}
                    className="w-full border-pink-500/30 hover:bg-pink-500/10 hover:border-pink-500/50 disabled:opacity-50"
                  >
                    <Instagram className="h-4 w-4 mr-2 text-pink-500" />
                    Story
                  </Button>
                </motion.div>
              </div>
            </div>
          </div>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
};
