import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Copy, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useState } from "react";
import QRCode from "qrcode";

interface QRShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profileUrl: string;
  username: string;
  displayName?: string | null;
}

export const QRShareDialog = ({
  open,
  onOpenChange,
  profileUrl,
  username,
  displayName
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
        width: 256,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
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

  const copyUrl = async () => {
    try {
      await navigator.clipboard.writeText(profileUrl);
      toast({
        title: "Lien copié !",
        description: "Le lien du profil a été copié dans le presse-papiers"
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de copier le lien",
        variant: "destructive"
      });
    }
  };

  const downloadQR = () => {
    if (!qrImageUrl) return;
    
    const link = document.createElement('a');
    link.download = `profil-${username}-qr.png`;
    link.href = qrImageUrl;
    link.click();
    
    toast({
      title: "QR code téléchargé !",
      description: "Le QR code a été sauvegardé dans vos téléchargements"
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Partager le profil</DialogTitle>
        </DialogHeader>
        
        <div className="flex flex-col items-center space-y-4">
          <div className="text-center">
            <h3 className="font-medium">
              Profil de {displayName || username}
            </h3>
            <p className="text-sm text-muted-foreground">
              Scannez ce QR code pour accéder au profil
            </p>
          </div>
          
          <div className="bg-white p-4 rounded-lg border min-h-[280px] flex items-center justify-center">
            {isLoading ? (
              <div className="text-muted-foreground">Génération du QR code...</div>
            ) : qrImageUrl ? (
              <img 
                src={qrImageUrl} 
                alt="QR Code du profil"
                className="max-w-full h-auto"
                style={{ width: 256, height: 256 }}
              />
            ) : (
              <div className="text-muted-foreground">Erreur lors de la génération</div>
            )}
          </div>
          
          <div className="text-xs text-center text-muted-foreground px-4 break-all">
            {profileUrl}
          </div>
          
          <div className="flex space-x-2 w-full">
            <Button
              variant="outline"
              size="sm"
              onClick={copyUrl}
              className="flex-1"
            >
              <Copy className="h-4 w-4 mr-2" />
              Copier le lien
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={downloadQR}
              disabled={!qrImageUrl}
              className="flex-1"
            >
              <Download className="h-4 w-4 mr-2" />
              Télécharger QR
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};