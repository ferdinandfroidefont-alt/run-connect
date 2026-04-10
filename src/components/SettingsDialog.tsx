import { lazy, Suspense, useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Settings,
  Bell,
  Link2,
  Shield,
  HelpCircle,
  ChevronRight,
  Loader2,
  ArrowLeft,
  Search,
  Copy,
  Share2,
  Instagram,
} from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';
import { resetBodyInteractionLocks } from "@/lib/bodyInteractionLocks";
import { buildPreferredProfileShareLink } from "@/lib/appLinks";
import {
  TUTORIAL_REPLAY_DEFINITIONS,
  requestTutorialReplay,
  notifyTutorialReplayQueued,
  type TutorialReplayId,
} from "@/lib/tutorials/registry";
import { IosFixedPageHeaderShell } from "@/components/layout/IosFixedPageHeaderShell";
import { IosPageHeaderBar } from "@/components/layout/IosPageHeaderBar";

// Sub-pages
const SettingsGeneral = lazy(() =>
  import("./settings/SettingsGeneral").then((m) => ({ default: m.SettingsGeneral }))
);
const SettingsNotifications = lazy(() =>
  import("./settings/SettingsNotifications").then((m) => ({ default: m.SettingsNotifications }))
);
const SettingsConnections = lazy(() =>
  import("./settings/SettingsConnections").then((m) => ({ default: m.SettingsConnections }))
);
const SettingsPrivacy = lazy(() =>
  import("./settings/SettingsPrivacy").then((m) => ({ default: m.SettingsPrivacy }))
);
const SettingsSupport = lazy(() =>
  import("./settings/SettingsSupport").then((m) => ({ default: m.SettingsSupport }))
);
const SettingsTutorialCatalog = lazy(() =>
  import("./settings/SettingsTutorialCatalog").then((m) => ({ default: m.SettingsTutorialCatalog }))
);

export type SettingsDialogPage =
  | "hub"
  | "general"
  | "notifications"
  | "connections"
  | "privacy"
  | "support"
  | "tutorial-catalog";

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialSearch?: string;
  /** Ouvre directement une sous-page (ex. confidentialité depuis le profil). */
  initialPage?: SettingsDialogPage;
}

const settingsCategories = [
  {
    id: 'general' as const,
    title: 'Général',
    description: 'Langue, thème, distances, mot de passe',
    icon: Settings,
    color: 'bg-[#8E8E93]',
    keywords: 'langue language thème theme apparence mode sombre clair dark light système system unité unités unit distance km mi kilomètre miles mot de passe password sécurité email réinitialiser carte map appui long pression',
  },
  {
    id: 'notifications' as const,
    title: 'Notifications',
    description: 'Push, alertes, préférences',
    icon: Bell,
    color: 'bg-[#FF3B30]',
    keywords: 'push alertes notifications message session ami invitation présence demande suivi coaching club entraînement',
  },
  {
    id: 'connections' as const,
    title: 'Connexions',
    description: 'Strava, Instagram, partage',
    icon: Link2,
    color: 'bg-[#007AFF]',
    keywords: 'strava instagram connexion connecter lier synchronisation import activités réseau social partage',
  },
  {
    id: 'privacy' as const,
    title: 'Confidentialité',
    description: 'RGPD, sécurité, données',
    icon: Shield,
    color: 'bg-[#34C759]',
    keywords: 'rgpd sécurité données privé confidentialité profil privé visibilité bloquer signaler compte supprimer effacer export télécharger',
  },
  {
    id: 'support' as const,
    title: 'Aide & Support',
    description: 'Contact, tutoriels, documents, compte',
    icon: HelpCircle,
    color: 'bg-[#FF9500]',
    keywords: 'aide support contact tutoriel guide faq bug problème signaler feedback version à propos mentions légales conditions politique déconnexion supprimer compte',
  },
];

export const SettingsDialog = ({ open, onOpenChange, initialSearch, initialPage }: SettingsDialogProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [currentPage, setCurrentPage] = useState<SettingsDialogPage>("hub");
  const [searchQuery, setSearchQuery] = useState(initialSearch || "");
  const [loading, setLoading] = useState(false);

  const goToSettingsHub = () => {
    setCurrentPage("hub");
  };

  const startTutorialReplay = (id: TutorialReplayId) => {
    const def = TUTORIAL_REPLAY_DEFINITIONS[id];
    if (!def) return;
    requestTutorialReplay(id);
    handleOpenChange(false);
    navigate(def.path);
    window.setTimeout(() => notifyTutorialReplayQueued(), 60);
  };
  
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

  useEffect(() => {
    if (open && initialPage && initialPage !== "hub") {
      setCurrentPage(initialPage);
    }
  }, [open, initialPage]);

  // Reset to hub when dialog closes
  const handleOpenChange = (next: boolean) => {
    onOpenChange(next);
    if (!next) {
      // Immédiat + après l’anim de sortie Radix : évite pointer-events / scroll-lock résiduels.
      resetBodyInteractionLocks();
      window.setTimeout(resetBodyInteractionLocks, 0);
      window.setTimeout(resetBodyInteractionLocks, 120);
      window.setTimeout(resetBodyInteractionLocks, 360);
    }
  };

  useEffect(() => {
    if (!open) {
      resetBodyInteractionLocks();
      window.setTimeout(resetBodyInteractionLocks, 0);
      window.setTimeout(resetBodyInteractionLocks, 360);
      setTimeout(() => {
        setCurrentPage("hub");
      }, 300);
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
        const profileUrl = buildPreferredProfileShareLink({
          username: profile.username,
          referralCode: profile.referral_code,
        });
        
        const { default: QRCode } = await import("qrcode");
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
    return buildPreferredProfileShareLink({
      username: profile.username,
      referralCode: profile.referral_code,
    });
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
      // Priority 1: AndroidBridge for native Android WebView
      const win = window as any;
      if (win.AndroidBridge && typeof win.AndroidBridge.shareText === 'function') {
        console.log('[Share] Using AndroidBridge.shareText');
        win.AndroidBridge.shareText(shareMessage, profileUrl);
        return;
      }
      
      // Priority 2: Capacitor Share for native apps
      if (Capacitor.isNativePlatform()) {
        console.log('[Share] Using Capacitor Share');
        await Share.share({
          title: 'Rejoins-moi sur RunConnect',
          text: shareMessage,
          url: profileUrl,
          dialogTitle: 'Partager mon profil'
        });
        return;
      }
      
      // Priority 3: Web Share API for mobile browsers
      if (navigator.share) {
        console.log('[Share] Using Web Share API');
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
    handleOpenChange(false);
    window.location.href = '/subscription';
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'general':
      return (
        <Suspense fallback={<div className="flex items-center justify-center p-8"><Loader2 className="h-7 w-7 animate-spin text-muted-foreground" /></div>}>
          <SettingsGeneral onBack={goToSettingsHub} />
        </Suspense>
      );
      case 'notifications':
        return (
          <Suspense fallback={<div className="flex items-center justify-center p-8"><Loader2 className="h-7 w-7 animate-spin text-muted-foreground" /></div>}>
            <SettingsNotifications onBack={goToSettingsHub} />
          </Suspense>
        );
      case 'connections':
        return (
          <Suspense fallback={<div className="flex items-center justify-center p-8"><Loader2 className="h-7 w-7 animate-spin text-muted-foreground" /></div>}>
            <SettingsConnections 
              onBack={goToSettingsHub} 
              onNavigateToSubscription={handleNavigateToSubscription}
            />
          </Suspense>
        );
      case 'privacy':
        return (
          <Suspense fallback={<div className="flex items-center justify-center p-8"><Loader2 className="h-7 w-7 animate-spin text-muted-foreground" /></div>}>
            <SettingsPrivacy 
              onBack={goToSettingsHub} 
              onClose={() => handleOpenChange(false)}
            />
          </Suspense>
        );
      case 'support':
        return (
          <Suspense fallback={<div className="flex items-center justify-center p-8"><Loader2 className="h-7 w-7 animate-spin text-muted-foreground" /></div>}>
            <SettingsSupport 
              onBack={goToSettingsHub} 
              onClose={() => handleOpenChange(false)}
              onOpenTutorialCatalog={() => setCurrentPage("tutorial-catalog")}
            />
          </Suspense>
        );
      case "tutorial-catalog":
        return (
          <Suspense fallback={<div className="flex items-center justify-center p-8"><Loader2 className="h-7 w-7 animate-spin text-muted-foreground" /></div>}>
            <SettingsTutorialCatalog
              onBack={() => setCurrentPage("support")}
              onReplay={startTutorialReplay}
            />
          </Suspense>
        );
      default:
        return null;
    }
  };

  if (loading && open) {
    return (
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-md max-h-[80vh] p-0">
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        hideCloseButton
        className="fixed inset-0 left-0 right-0 top-0 z-[116] mx-auto w-full min-w-0 max-w-full translate-x-0 translate-y-0 box-border flex h-[100dvh] max-h-[100dvh] flex-col overflow-x-hidden overflow-y-hidden rounded-none border-0 bg-secondary p-0 sm:inset-auto sm:left-1/2 sm:right-auto sm:top-1/2 sm:z-[115] sm:mx-0 sm:h-auto sm:max-h-[85vh] sm:w-[calc(100%-2rem)] sm:max-w-md sm:-translate-x-1/2 sm:-translate-y-1/2 sm:overflow-y-auto sm:rounded-lg sm:border"
      >
        <AnimatePresence mode="wait">
          {currentPage === 'hub' ? (
            <motion.div
              key="hub"
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -20, opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="flex h-full min-h-0 min-w-0 max-w-full flex-col overflow-x-hidden"
            >
              <IosFixedPageHeaderShell
                className="min-h-0 flex-1"
                headerWrapperClassName="shrink-0"
                contentScroll
                scrollClassName="min-h-0 bg-secondary"
                header={
                  <div className="min-w-0 max-w-full border-b border-border bg-card/95">
                    <IosPageHeaderBar
                      left={
                        <button
                          type="button"
                          onClick={() => handleOpenChange(false)}
                          className="flex min-w-0 max-w-full items-center gap-1 text-primary"
                        >
                          <ArrowLeft className="h-5 w-5 shrink-0" />
                          <span className="truncate text-[17px]">Retour</span>
                        </button>
                      }
                      title="Paramètres"
                    />
                    <div className="min-w-0 px-4 pb-2.5 ios-shell:px-2.5">
                      <div className="relative min-w-0 max-w-full">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          placeholder="Rechercher"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="w-full min-w-0 max-w-full bg-background pl-10"
                        />
                      </div>
                    </div>
                  </div>
                }
              >
              <ScrollArea className="h-full min-h-0 min-w-0 flex-1 overflow-x-hidden [&>div>div[style]]:!overflow-y-auto [&_.scrollbar]:hidden [&>div>div+div]:hidden">
                <div className="min-w-0 max-w-full space-y-4 overflow-x-hidden py-5">
                  {/* iOS grouped list style — px sur le wrapper pour éviter w-full + mx = débordement iOS */}
                  <div className="box-border min-w-0 w-full max-w-full px-4 ios-shell:px-2">
                    <div className="ios-card w-full min-w-0 overflow-hidden">
                    {filteredCategories.map((category, index) => (
                      <div key={category.id}>
                        <button
                          type="button"
                          onClick={() => {
                            setCurrentPage(category.id);
                          }}
                          className="flex w-full min-w-0 max-w-full items-center gap-2.5 px-4 py-2.5 transition-colors active:bg-secondary ios-shell:px-2.5"
                        >
                          {/* iOS colored icon square */}
                          <div className={`ios-list-row-icon ${category.color}`}>
                            <category.icon className="h-4 w-4 text-white" />
                          </div>
                          <div className="min-w-0 flex-1 text-left">
                            <span className="truncate text-[17px]">{category.title}</span>
                          </div>
                          <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
                        </button>
                        {/* Separator - iOS style (inset) */}
                        {index < filteredCategories.length - 1 && (
                          <div className="ios-list-row-inset-sep" />
                        )}
                      </div>
                    ))}
                    </div>
                  </div>

                  {filteredCategories.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <p className="text-[15px]">Aucun paramètre trouvé</p>
                    </div>
                  )}

                  {/* Partager le profil + QR : colonne centrée comme le profil, tout en % du parent (pas de vw) */}
                  {profile && (
                    <div className="box-border flex w-full min-w-0 max-w-full justify-center px-4 ios-shell:px-2">
                      <div className="w-full min-w-0 max-w-md">
                        <div className="ios-card box-border w-full min-w-0 max-w-full space-y-ios-3 overflow-hidden rounded-ios-md p-ios-3 ios-shell:p-2.5">
                          <h3 className="text-center text-[13px] font-medium text-muted-foreground uppercase tracking-wide">
                            Partager mon profil
                          </h3>

                          <div className="flex w-full min-w-0 flex-col items-center">
                            <div className="relative isolate mx-auto max-w-full overflow-hidden rounded-full p-1">
                              <div className="pointer-events-none absolute inset-0 scale-110 rounded-full bg-gradient-to-br from-primary to-cyan-400 opacity-40 blur-md" />
                              <div className="relative rounded-full bg-gradient-to-br from-primary via-primary/70 to-cyan-400 p-[3px]">
                                <Avatar className="h-16 w-16 border-2 border-background shadow-xl">
                                  <AvatarImage src={profile.avatar_url || undefined} alt={profile.display_name || profile.username} />
                                  <AvatarFallback className="text-lg font-bold bg-primary/20 text-primary">
                                    {(profile.display_name || profile.username)?.charAt(0).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                              </div>
                            </div>
                            <h4 className="mt-2 w-full min-w-0 max-w-full truncate px-2 text-center text-sm font-semibold">
                              {profile.display_name || profile.username}
                            </h4>
                            <p className="text-xs text-muted-foreground">Scannez pour m&apos;ajouter</p>
                          </div>

                          <div className="mx-auto w-full min-w-0 max-w-[min(13rem,calc(100%-0.5rem))]">
                            <div className="relative overflow-hidden rounded-2xl">
                              <div className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/25 to-cyan-400/25 opacity-60 blur-2xl" />
                              <div className="relative rounded-2xl border border-primary/20 bg-gradient-to-br from-card to-card/80 p-2 shadow-lg sm:p-3">
                                {qrLoading ? (
                                  <div className="flex aspect-square w-full items-center justify-center">
                                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                                  </div>
                                ) : qrImageUrl ? (
                                  <img
                                    src={qrImageUrl}
                                    alt="QR Code du profil"
                                    className="mx-auto block aspect-square w-full rounded-lg object-contain"
                                  />
                                ) : (
                                  <div className="flex aspect-square w-full items-center justify-center text-xs text-muted-foreground">
                                    Erreur de génération
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>

                          {profile.referral_code && (
                            <div className="ios-card w-full min-w-0 overflow-hidden bg-primary/[0.06] p-ios-3 ring-1 ring-primary/15">
                              <div className="flex min-w-0 items-center justify-between gap-2">
                                <span className="shrink-0 text-xs text-muted-foreground">Code parrainage</span>
                                <span className="min-w-0 truncate font-mono text-sm font-bold tracking-wider text-primary">
                                  {profile.referral_code}
                                </span>
                              </div>
                            </div>
                          )}

                          <p className="w-full min-w-0 max-w-full break-all px-1 text-center text-[10px] leading-snug text-muted-foreground/80">
                            {getProfileUrl()}
                          </p>

                          <div className="flex w-full min-w-0 max-w-full flex-col gap-2">
                            <Button
                              variant="default"
                              size="default"
                              onClick={copyUrl}
                              className="h-11 w-full min-w-0 justify-center bg-gradient-to-r from-primary to-primary/90 shadow-lg shadow-primary/20 hover:from-primary/90 hover:to-primary"
                            >
                              <Copy className="mr-2 h-4 w-4 shrink-0" />
                              <span className="min-w-0 truncate">Copier le lien</span>
                            </Button>
                            <Button
                              variant="outline"
                              size="default"
                              onClick={handleShare}
                              className="h-11 w-full min-w-0 justify-center border-primary/30 hover:border-primary/50 hover:bg-primary/10"
                            >
                              <Share2 className="mr-2 h-4 w-4 shrink-0" />
                              <span className="min-w-0 truncate">Partager</span>
                            </Button>
                            <Button
                              variant="outline"
                              size="default"
                              onClick={generateInstagramStoryImage}
                              disabled={!qrImageUrl}
                              className="h-11 w-full min-w-0 justify-center border-pink-500/30 hover:border-pink-500/50 hover:bg-pink-500/10 disabled:opacity-50"
                            >
                              <Instagram className="mr-2 h-4 w-4 shrink-0 text-pink-500" />
                              <span className="min-w-0 truncate">Story Instagram</span>
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>
              </IosFixedPageHeaderShell>
            </motion.div>
          ) : (
            <motion.div
              key={currentPage}
              className="relative flex h-full min-h-0 min-w-0 max-w-full flex-1 flex-col overflow-x-hidden bg-background"
            >
              {renderPage()}
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
};
