import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Settings, Bell, Link2, Shield, HelpCircle, ChevronRight, Loader2, ArrowLeft, Search, Copy, Share2, Instagram } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import QRCode from "qrcode";
import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';

// Sub-pages
import { SettingsGeneral } from "./settings/SettingsGeneral";
import { SettingsNotifications } from "./settings/SettingsNotifications";
import { SettingsConnections } from "./settings/SettingsConnections";
import { SettingsPrivacy } from "./settings/SettingsPrivacy";
import { SettingsSupport } from "./settings/SettingsSupport";

type SettingsPage = 'hub' | 'general' | 'notifications' | 'connections' | 'privacy' | 'support';

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialSearch?: string;
}

const settingsCategories = [
  {
    id: 'general' as const,
    title: 'Général',
    description: 'Langue, thème, mot de passe',
    icon: Settings,
    color: 'bg-[#8E8E93]',
  },
  {
    id: 'notifications' as const,
    title: 'Notifications',
    description: 'Push, alertes, préférences',
    icon: Bell,
    color: 'bg-[#FF3B30]',
  },
  {
    id: 'connections' as const,
    title: 'Connexions',
    description: 'Strava, Instagram, partage',
    icon: Link2,
    color: 'bg-[#007AFF]',
  },
  {
    id: 'privacy' as const,
    title: 'Confidentialité',
    description: 'RGPD, sécurité, données',
    icon: Shield,
    color: 'bg-[#34C759]',
  },
  {
    id: 'support' as const,
    title: 'Aide & Support',
    description: 'Contact, déconnexion, compte',
    icon: HelpCircle,
    color: 'bg-[#FF9500]',
  },
];

export const SettingsDialog = ({ open, onOpenChange, initialSearch }: SettingsDialogProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [currentPage, setCurrentPage] = useState<SettingsPage>('hub');
  const [searchQuery, setSearchQuery] = useState(initialSearch || "");
  const [loading, setLoading] = useState(false);
  
  // Profile share state
  const [profile, setProfile] = useState<{
    username: string;
    display_name: string | null;
    avatar_url: string | null;
    referral_code: string | null;
  } | null>(null);
  const [qrImageUrl, setQrImageUrl] = useState<string>("");
  const [qrLoading, setQrLoading] = useState(false);

  useEffect(() => {
    if (initialSearch) {
      setSearchQuery(initialSearch);
    }
  }, [initialSearch]);

  // Reset to hub when dialog closes
  useEffect(() => {
    if (!open) {
      setTimeout(() => setCurrentPage('hub'), 300);
    }
  }, [open]);

  // Load profile data for QR code
  useEffect(() => {
    const loadProfile = async () => {
      if (!user || !open) return;
      
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('username, display_name, avatar_url, referral_code')
          .eq('user_id', user.id)
          .single();
        
        if (error) throw error;
        if (data) {
          setProfile(data);
        }
      } catch (error) {
        console.error('Error loading profile:', error);
      }
    };
    
    loadProfile();
  }, [user, open]);

  // Generate QR code when profile is loaded
  useEffect(() => {
    const generateQR = async () => {
      if (!profile?.username) return;
      
      setQrLoading(true);
      try {
        const profileUrl = profile.referral_code 
          ? `https://run-connect.lovable.app/p/${profile.username}?r=${profile.referral_code}`
          : `https://run-connect.lovable.app/p/${profile.username}`;
        
        const qrDataURL = await QRCode.toDataURL(profileUrl, {
          width: 240,
          margin: 2,
          color: {
            dark: '#1a1f3a',
            light: '#6EC6FF'
          },
          errorCorrectionLevel: 'M'
        });
        
        setQrImageUrl(qrDataURL);
      } catch (error) {
        console.error('Error generating QR code:', error);
      } finally {
        setQrLoading(false);
      }
    };
    
    if (profile) {
      generateQR();
    }
  }, [profile]);

  const getProfileUrl = () => {
    if (!profile?.username) return '';
    return profile.referral_code 
      ? `https://run-connect.lovable.app/p/${profile.username}?r=${profile.referral_code}`
      : `https://run-connect.lovable.app/p/${profile.username}`;
  };

  const getShareMessage = () => {
    return `Ajoute-moi sur RunConnect (application pour course et vélo) :
${getProfileUrl()}

Voici mon code de parrainage : ${profile?.referral_code || 'N/A'}
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
    const profileUrl = getProfileUrl();
    
    try {
      // Priority 1: Native Android WebView bridge
      const win = window as any;
      if (win.AndroidBridge?.shareText) {
        win.AndroidBridge.shareText(shareMessage);
        return;
      }
      
      // Priority 2: Capacitor Share plugin
      const { Share } = await import('@capacitor/share');
      const canShare = await Share.canShare();
      if (canShare.value) {
        await Share.share({
          title: 'Rejoins-moi sur RunConnect',
          text: shareMessage,
          url: profileUrl,
          dialogTitle: 'Partager mon profil'
        });
        return;
      }
      
      // Priority 3: Web Share API
      if (navigator.share) {
        await navigator.share({
          title: 'Rejoins-moi sur RunConnect',
          text: shareMessage,
          url: profileUrl
        });
        return;
      }
      
      // Fallback for desktop: copy to clipboard
      await navigator.clipboard.writeText(shareMessage);
      toast({
        title: "✅ Lien copié !",
        description: "Collez-le dans n'importe quelle application"
      });
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.error('Share error:', error);
        // Fallback on error: try clipboard
        try {
          await navigator.clipboard.writeText(shareMessage);
          toast({
            title: "✅ Lien copié !",
            description: "Collez-le dans n'importe quelle application"
          });
        } catch {
          toast({
            title: "Erreur",
            description: "Impossible de partager",
            variant: "destructive"
          });
        }
      }
    }
  };

  const generateInstagramStoryImage = async () => {
    if (!qrImageUrl || !profile) {
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

      const gradient = ctx.createLinearGradient(0, 0, 0, 1920);
      gradient.addColorStop(0, 'hsl(217, 91%, 65%)');
      gradient.addColorStop(1, 'hsl(217, 91%, 45%)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 1080, 1920);

      if (profile.avatar_url) {
        const profileImg = new Image();
        profileImg.crossOrigin = 'anonymous';
        profileImg.src = profile.avatar_url;
        await profileImg.decode();
        
        ctx.save();
        ctx.beginPath();
        ctx.arc(540, 500, 150, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(profileImg, 390, 350, 300, 300);
        ctx.restore();
        
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 8;
        ctx.beginPath();
        ctx.arc(540, 500, 150, 0, Math.PI * 2);
        ctx.stroke();
      }

      const qrImg = new Image();
      qrImg.src = qrImageUrl;
      await qrImg.decode();
      ctx.drawImage(qrImg, 340, 900, 400, 400);

      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 48px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('Ajoutez-moi sur RunConnect', 540, 750);

      ctx.font = 'bold 60px Arial';
      ctx.fillText(`@${profile.username}`, 540, 1400);

      if (profile.referral_code) {
        ctx.font = 'bold 40px Arial';
        ctx.fillText(`Code: ${profile.referral_code}`, 540, 1500);
      }

      canvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = `runconnect-story-${profile.username}.png`;
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

  const matchesSearch = (text: string) => {
    if (!searchQuery.trim()) return true;
    const normalizedQuery = searchQuery.toLowerCase().trim();
    const normalizedText = text.toLowerCase();
    return normalizedText.includes(normalizedQuery);
  };

  const filteredCategories = settingsCategories.filter(cat => 
    matchesSearch(cat.title) || matchesSearch(cat.description)
  );

  const handleNavigateToSubscription = () => {
    onOpenChange(false);
    window.location.href = '/subscription';
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'general':
        return <SettingsGeneral onBack={() => setCurrentPage('hub')} />;
      case 'notifications':
        return <SettingsNotifications onBack={() => setCurrentPage('hub')} />;
      case 'connections':
        return (
          <SettingsConnections 
            onBack={() => setCurrentPage('hub')} 
            onNavigateToSubscription={handleNavigateToSubscription}
          />
        );
      case 'privacy':
        return (
          <SettingsPrivacy 
            onBack={() => setCurrentPage('hub')} 
            onClose={() => onOpenChange(false)}
          />
        );
      case 'support':
        return (
          <SettingsSupport 
            onBack={() => setCurrentPage('hub')} 
            onClose={() => onOpenChange(false)}
          />
        );
      default:
        return null;
    }
  };

  if (loading && open) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md max-h-[80vh] p-0">
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full h-full max-w-full max-h-full sm:max-w-md sm:max-h-[85vh] rounded-none sm:rounded-lg p-0 flex flex-col bg-secondary overflow-hidden border-0 sm:border">
        <AnimatePresence mode="wait">
          {currentPage === 'hub' ? (
            <motion.div
              key="hub"
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -20, opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="flex flex-col h-full"
            >
              {/* iOS Header */}
              <div className="sticky top-0 z-40 bg-card border-b border-border shrink-0">
                <div className="flex items-center justify-between px-4 py-3">
                  <button
                    onClick={() => onOpenChange(false)}
                    className="flex items-center gap-1 text-primary"
                  >
                    <ArrowLeft className="h-5 w-5" />
                    <span className="text-[17px]">Retour</span>
                  </button>
                  <h1 className="text-[17px] font-semibold text-foreground">Paramètres</h1>
                  <div className="w-16" />
                </div>
                
                {/* iOS-style search bar */}
                <div className="px-4 pb-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Rechercher"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 bg-background"
                    />
                  </div>
                </div>
              </div>

              <ScrollArea className="flex-1">
                <div className="p-4 space-y-6">
                  {/* iOS grouped list style */}
                  <div className="bg-background rounded-[10px] overflow-hidden">
                    {filteredCategories.map((category, index) => (
                      <div key={category.id}>
                        <button
                          onClick={() => setCurrentPage(category.id)}
                          className="w-full flex items-center gap-3 py-3 px-4 active:bg-secondary transition-colors"
                        >
                          {/* iOS colored icon square */}
                          <div className={`h-[29px] w-[29px] rounded-[6px] ${category.color} flex items-center justify-center`}>
                            <category.icon className="h-4 w-4 text-white" />
                          </div>
                          <div className="flex-1 text-left">
                            <span className="text-[17px]">{category.title}</span>
                          </div>
                          <ChevronRight className="h-5 w-5 text-muted-foreground" />
                        </button>
                        {/* Separator - iOS style (inset) */}
                        {index < filteredCategories.length - 1 && (
                          <div className="h-px bg-border ml-[52px]" />
                        )}
                      </div>
                    ))}
                  </div>

                  {filteredCategories.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <p className="text-[15px]">Aucun paramètre trouvé</p>
                    </div>
                  )}

                  {/* Profile Share Section */}
                  {profile && (
                    <div className="bg-background rounded-[10px] overflow-hidden p-4 space-y-4">
                      <h3 className="text-[13px] font-medium text-muted-foreground uppercase tracking-wide px-1">
                        Partager mon profil
                      </h3>
                      
                      {/* Avatar + Username */}
                      <div className="flex flex-col items-center">
                        <div className="relative">
                          <div className="absolute inset-0 bg-gradient-to-br from-primary to-cyan-400 rounded-full blur-lg opacity-40 scale-110" />
                          <div className="relative rounded-full p-[3px] bg-gradient-to-br from-primary via-primary/70 to-cyan-400">
                            <Avatar className="h-16 w-16 border-2 border-background shadow-xl">
                              <AvatarImage src={profile.avatar_url || undefined} alt={profile.display_name || profile.username} />
                              <AvatarFallback className="text-lg font-bold bg-primary/20 text-primary">
                                {(profile.display_name || profile.username)?.charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                          </div>
                        </div>
                        <h4 className="font-semibold text-sm mt-2">
                          {profile.display_name || profile.username}
                        </h4>
                        <p className="text-xs text-muted-foreground">
                          Scannez pour m'ajouter
                        </p>
                      </div>
                      
                      {/* QR Code */}
                      <div className="flex justify-center">
                        <div className="relative">
                          <div className="absolute inset-0 bg-gradient-to-br from-primary/30 to-cyan-400/30 rounded-2xl blur-xl opacity-50" />
                          <div className="relative bg-gradient-to-br from-card to-card/80 p-3 rounded-2xl border border-primary/20 shadow-lg">
                            {qrLoading ? (
                              <div className="w-[180px] h-[180px] flex items-center justify-center">
                                <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent" />
                              </div>
                            ) : qrImageUrl ? (
                              <img 
                                src={qrImageUrl} 
                                alt="QR Code du profil"
                                className="rounded-lg"
                                style={{ width: 180, height: 180 }}
                              />
                            ) : (
                              <div className="w-[180px] h-[180px] flex items-center justify-center text-muted-foreground text-xs">
                                Erreur de génération
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Referral code */}
                      {profile.referral_code && (
                        <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-cyan-400/10 p-3 rounded-xl border border-primary/20">
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">Code parrainage</span>
                            <span className="font-mono font-bold text-primary text-sm tracking-wider">{profile.referral_code}</span>
                          </div>
                        </div>
                      )}
                      
                      {/* URL */}
                      <p className="text-[10px] text-center text-muted-foreground/70 truncate">
                        {getProfileUrl()}
                      </p>
                      
                      {/* Action buttons */}
                      <div className="space-y-2">
                        <Button
                          variant="default"
                          size="default"
                          onClick={copyUrl}
                          className="w-full bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-lg shadow-primary/20"
                        >
                          <Copy className="h-4 w-4 mr-2" />
                          Copier le lien
                        </Button>
                        
                        <div className="grid grid-cols-2 gap-2">
                          <Button
                            variant="outline"
                            size="default"
                            onClick={handleShare}
                            className="w-full border-primary/30 hover:bg-primary/10 hover:border-primary/50"
                          >
                            <Share2 className="h-4 w-4 mr-2" />
                            Partager
                          </Button>
                          
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
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </motion.div>
          ) : (
            <motion.div
              key={currentPage}
              className="flex-1 h-full bg-background"
            >
              {renderPage()}
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
};
