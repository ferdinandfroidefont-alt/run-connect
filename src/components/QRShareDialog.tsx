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
        width: 250,
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
      <DialogContent className="sm:max-w-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
        >
          <DialogHeader>
            <DialogTitle className="text-center">Partager mon profil</DialogTitle>
          </DialogHeader>
          
          <div className="flex flex-col items-center space-y-6 py-4">
            {/* Photo de profil */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="relative"
            >
              <div className="rounded-full p-1 bg-gradient-to-br from-primary via-primary/70 to-cyan-400">
                <Avatar className="h-24 w-24 border-4 border-background">
                  <AvatarImage src={avatarUrl || undefined} alt={displayName || username} />
                  <AvatarFallback className="text-2xl font-bold bg-primary/20">
                    {(displayName || username)?.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </div>
            </motion.div>

            <div className="text-center">
              <h3 className="font-semibold text-lg">
                {displayName || username}
              </h3>
              <p className="text-sm text-muted-foreground">
                Scannez pour m'ajouter sur RunConnect
              </p>
            </div>
            
            {/* QR Code */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="bg-gradient-to-br from-primary/10 to-cyan-400/10 p-6 rounded-2xl border-2 border-primary/20 min-h-[280px] flex items-center justify-center shadow-lg"
            >
              {isLoading ? (
                <div className="text-muted-foreground">Génération du QR code...</div>
              ) : qrImageUrl ? (
                <img 
                  src={qrImageUrl} 
                  alt="QR Code du profil"
                  className="max-w-full h-auto rounded-lg"
                  style={{ width: 250, height: 250 }}
                />
              ) : (
                <div className="text-muted-foreground">Erreur lors de la génération</div>
              )}
            </motion.div>

            {/* Rappel code parrainage */}
            {referralCode && (
              <motion.div
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="w-full bg-primary/10 p-3 rounded-lg border border-primary/20"
              >
                <p className="text-sm text-center">
                  💡 Donne ton code de parrainage pour gagner des points bonus !
                  <br />
                  <span className="font-mono font-bold text-primary text-base">{referralCode}</span>
                </p>
              </motion.div>
            )}
            
            <div className="text-xs text-center text-muted-foreground px-4 break-all">
              {profileUrl}
            </div>
            
            {/* Boutons d'action */}
            <div className="flex flex-col space-y-2 w-full">
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button
                  variant="default"
                  size="lg"
                  onClick={copyUrl}
                  className="w-full bg-primary hover:bg-primary/90"
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copier le lien
                </Button>
              </motion.div>
              
              <div className="grid grid-cols-2 gap-2">
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={handleShare}
                    className="w-full"
                  >
                    <Share2 className="h-4 w-4 mr-2" />
                    Partager
                  </Button>
                </motion.div>
                
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={generateInstagramStoryImage}
                    disabled={!qrImageUrl}
                    className="w-full border-pink-500/50 hover:bg-pink-500/10 hover:border-pink-500"
                  >
                    <Instagram className="h-4 w-4 mr-2" />
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
