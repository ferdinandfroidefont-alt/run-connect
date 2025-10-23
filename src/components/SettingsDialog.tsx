import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { useTheme } from "@/contexts/ThemeContext";
import { useToast } from "@/hooks/use-toast";
import { Settings, LogOut, Sun, Moon, Key, Bell, Shield, FileText, Mail, Trash2, Users, Share2, Smartphone, Play, MessageCircle, Palette, Gift, Loader2, Bug, Languages, ArrowLeft, Search, ChevronRight, Info } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useShareProfile } from "@/hooks/useShareProfile";
import { useOnboarding } from "@/hooks/useOnboarding";
import { ContactsPermissionButton } from "./ContactsPermissionButton";
import { StravaConnect } from "./StravaConnect";
import { InstagramConnect } from "./InstagramConnect";
import { ConversationThemeSelector } from "./ConversationThemeSelector";
import { QRShareDialog } from "./QRShareDialog";
import { useConversationTheme } from "@/hooks/useConversationTheme";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { ReferralDialog } from "./ReferralDialog";
import { useLanguage } from "@/contexts/LanguageContext";
import { languages, Language } from "@/lib/translations";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";

interface Profile {
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  notifications_enabled?: boolean;
  rgpd_accepted?: boolean;
  security_rules_accepted?: boolean;
  allow_friend_suggestions?: boolean;
  notif_follow_request?: boolean;
  notif_message?: boolean;
  notif_session_request?: boolean;
  notif_friend_session?: boolean;
  is_premium?: boolean;
  strava_connected?: boolean;
  strava_verified_at?: string;
  instagram_connected?: boolean;
  instagram_verified_at?: string;
  instagram_username?: string;
}

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const SettingsDialog = ({ open, onOpenChange }: SettingsDialogProps) => {
  const { user, session, signOut } = useAuth();
  const { theme, setTheme } = useTheme();
  const { shareProfile, showQRDialog, setShowQRDialog, qrData } = useShareProfile();
  const { conversationTheme, setConversationTheme } = useConversationTheme();
  const { isRegistered, requestPermissions, isNative, testNotification } = usePushNotifications();
  const { language, setLanguage } = useLanguage();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [showConversationThemes, setShowConversationThemes] = useState(false);
  const [showReferralDialog, setShowReferralDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  
  const { toast } = useToast();

  useEffect(() => {
    if (user && open) {
      fetchProfile();
    }
  }, [user, open]);

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (error) throw error;
      setProfile(data);
    } catch (error: any) {
      console.error('Error fetching profile:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger votre profil",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!user?.email) {
      toast({
        title: "Erreur",
        description: "Impossible de récupérer votre adresse email.",
        variant: "destructive",
      });
      return;
    }

    setIsChangingPassword(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
        redirectTo: `${window.location.origin}/auth?reset=true`,
      });

      if (error) throw error;

      toast({
        title: "Email envoyé !",
        description: "Vérifiez votre boîte email pour réinitialiser votre mot de passe.",
      });
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleNotificationToggle = async () => {
    // ✅ Attendre que AndroidBridge soit disponible (max 3s)
    let bridgeAvailable = false;
    for (let i = 0; i < 30; i++) {
      // @ts-ignore
      if (typeof window.AndroidBridge?.requestNotificationPermissions === 'function') {
        bridgeAvailable = true;
        break;
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    if (!bridgeAvailable) {
      toast({
        title: "Erreur",
        description: "Service de notifications non disponible. Redémarrez l'application.",
        variant: "destructive"
      });
      return;
    }
    
    console.log('🔔 [SETTINGS] Demande popup notifications via AndroidBridge...');
    
    const notificationPromise = new Promise<boolean>((resolve) => {
      const timeout = setTimeout(() => resolve(false), 60000); // ✅ 60s au lieu de 30s
      
      const handler = (event: any) => {
        clearTimeout(timeout);
        const granted = event.detail?.granted === true;
        console.log('✅ [SETTINGS] Résultat popup:', granted);
        window.removeEventListener('androidPermissionsUpdated', handler);
        resolve(granted);
      };
      
      // ✅ ATTACHER LE LISTENER EN PREMIER
      window.addEventListener('androidPermissionsUpdated', handler);
    });
    
    // ✅ ENSUITE déclencher la popup
    // @ts-ignore
    window.AndroidBridge.requestNotificationPermissions();
    
    const granted = await notificationPromise;
    
    if (granted && user) {
      await supabase
        .from('profiles')
        .update({ notifications_enabled: true })
        .eq('user_id', user.id);
      
      setProfile(prev => prev ? { ...prev, notifications_enabled: true } : null);
      
      toast({
        title: "Notifications activées !",
        description: "Vous recevrez les notifications de RunConnect"
      });
    } else {
      // ✅ Afficher un toast si refusé
      toast({
        title: "Permission refusée",
        description: "Vous pouvez activer les notifications dans Paramètres > Applications > RunConnect",
        variant: "destructive"
      });
    }
  };

  const updatePrivacySettings = async (field: string, value: boolean) => {
    if (!user) {
      console.error('updatePrivacySettings: No user found');
      return;
    }

    console.log('updatePrivacySettings called with:', { field, value, userId: user.id });

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ [field]: value })
        .eq('user_id', user.id);

      if (error) throw error;

      // Mettre à jour l'état local immédiatement
      setProfile(prev => prev ? { ...prev, [field]: value } : null);
      
      toast({
        title: "Paramètres mis à jour",
        description: "Vos préférences de notifications ont été sauvegardées."
      });
    } catch (error: any) {
      console.error('Error updating privacy settings:', error);
      toast({
        title: "Erreur",
        description: `Impossible de mettre à jour les paramètres: ${error.message}`,
        variant: "destructive"
      });
    }
  };

  const handleSignOut = () => {
    signOut();
    onOpenChange(false);
  };

  const handleDeleteAccount = async () => {
    if (!user || !session) return;

    try {
      setLoading(true);
      
      // Call the delete-account edge function
      const { data, error } = await supabase.functions.invoke('delete-account', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) {
        throw error;
      }

      toast({
        title: "Compte supprimé",
        description: "Votre compte a été supprimé avec succès.",
      });

      // Sign out and redirect
      signOut();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Delete account error:', error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer votre compte. Contactez le support.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading && open) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md max-h-[80vh] p-0">
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md max-h-[90vh] p-0 flex flex-col backdrop-blur-xl bg-background/95 border-border/50">
          {/* Header avec flèche retour et recherche */}
          <div className="sticky top-0 z-10 backdrop-blur-xl bg-background/80 border-b border-border/50">
            <div className="flex items-center gap-3 p-4">
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-full hover:bg-muted/50"
                onClick={() => onOpenChange(false)}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <h2 className="text-lg font-semibold">Paramètres</h2>
            </div>
            
            {/* Barre de recherche */}
            <div className="px-4 pb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher dans les paramètres"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-muted/30 border-border/50 focus-visible:ring-primary/50"
                />
              </div>
            </div>
          </div>
          
          <ScrollArea className="flex-1 overflow-y-auto">
            <div className="px-4 pb-6 space-y-8">
              
              {/* Section: Paramètres généraux */}
              <div className="space-y-3 animate-fade-in">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider px-2">
                  Paramètres généraux
                </h3>
                <div className="rounded-xl border border-border/50 bg-card/30 backdrop-blur-sm shadow-sm overflow-hidden divide-y divide-border/30">
                  {/* Language Selector */}
                  <div className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors group">
                    <div className="flex items-center gap-3 flex-1">
                      <Languages className="h-5 w-5 text-muted-foreground" />
                      <div className="flex-1">
                        <label className="text-sm font-medium">Langue</label>
                        <p className="text-xs text-muted-foreground">Choisir la langue de l'application</p>
                      </div>
                    </div>
                    <Select value={language} onValueChange={(value) => setLanguage(value as Language)}>
                      <SelectTrigger className="w-[120px] h-8 text-xs border-border/50 bg-background/50">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(languages).map(([code, { nativeName }]) => (
                          <SelectItem key={code} value={code}>{nativeName}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Theme Toggle */}
                  <div className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors group">
                    <div className="flex items-center gap-3 flex-1">
                      {theme === 'dark' ? <Moon className="h-5 w-5 text-muted-foreground" /> : <Sun className="h-5 w-5 text-muted-foreground" />}
                      <div className="flex-1">
                        <label className="text-sm font-medium">Mode {theme === 'dark' ? 'sombre' : 'clair'}</label>
                        <p className="text-xs text-muted-foreground">Basculer entre thème clair et sombre</p>
                      </div>
                    </div>
                    <Switch
                      checked={theme === 'dark'}
                      onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')}
                    />
                  </div>

                  {/* Password Reset */}
                  <div className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors group">
                    <div className="flex items-center gap-3 flex-1">
                      <Key className="h-5 w-5 text-muted-foreground" />
                      <div className="flex-1">
                        <label className="text-sm font-medium">Mot de passe</label>
                        <p className="text-xs text-muted-foreground">Réinitialiser votre mot de passe</p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 text-xs text-primary hover:text-primary hover:bg-primary/10"
                      onClick={handlePasswordReset}
                      disabled={isChangingPassword}
                    >
                      {isChangingPassword ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Changer'}
                    </Button>
                  </div>

                  {/* Long Press to Create Session */}
                  <div className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors group">
                    <div className="flex items-center gap-3 flex-1">
                      <Settings className="h-5 w-5 text-muted-foreground" />
                      <div className="flex-1">
                        <label className="text-sm font-medium">Appui long sur la carte</label>
                        <p className="text-xs text-muted-foreground">Créer une session en appuyant longuement</p>
                      </div>
                    </div>
                    <Switch
                      checked={localStorage.getItem('enableLongPressCreate') === 'true'}
                      onCheckedChange={(checked) => {
                        localStorage.setItem('enableLongPressCreate', checked.toString());
                        toast({
                          title: "Paramètre mis à jour",
                          description: checked ? "Appui long activé" : "Appui long désactivé"
                        });
                      }}
                    />
                  </div>

                  {/* Friend Suggestions */}
                  <div className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors group">
                    <div className="flex items-center gap-3 flex-1">
                      <Users className="h-5 w-5 text-muted-foreground" />
                      <div className="flex-1">
                        <label className="text-sm font-medium">Suggestions d'amis</label>
                        <p className="text-xs text-muted-foreground">Autoriser les suggestions</p>
                      </div>
                    </div>
                    <Switch
                      checked={profile?.allow_friend_suggestions !== false}
                      onCheckedChange={(checked) => updatePrivacySettings('allow_friend_suggestions', checked)}
                    />
                  </div>

                  {/* Share Profile */}
                  <div className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors group cursor-pointer"
                       onClick={() => {
                         if (profile) {
                           shareProfile({
                             username: profile.username,
                             displayName: profile.display_name,
                             bio: profile.bio
                           });
                         }
                       }}>
                    <div className="flex items-center gap-3 flex-1">
                      <Share2 className="h-5 w-5 text-muted-foreground" />
                      <div className="flex-1">
                        <label className="text-sm font-medium">Partager mon profil</label>
                        <p className="text-xs text-muted-foreground">Partagez sur Instagram, WhatsApp...</p>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                  </div>

                  {/* Contacts Access */}
                  <div className="p-4">
                    <ContactsPermissionButton />
                  </div>

                  {/* Conversation Themes */}
                  <div className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors group cursor-pointer"
                       onClick={() => setShowConversationThemes(true)}>
                    <div className="flex items-center gap-3 flex-1">
                      <Palette className="h-5 w-5 text-muted-foreground" />
                      <div className="flex-1">
                        <label className="text-sm font-medium">Thèmes de conversation</label>
                        <p className="text-xs text-muted-foreground">Personnaliser l'apparence</p>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                  </div>

                  {/* Parrainage */}
                  <div className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors group cursor-pointer"
                       onClick={() => setShowReferralDialog(true)}>
                    <div className="flex items-center gap-3 flex-1">
                      <Gift className="h-5 w-5 text-muted-foreground" />
                      <div className="flex-1">
                        <label className="text-sm font-medium">Parrainage</label>
                        <p className="text-xs text-muted-foreground">Invitez vos amis et gagnez du premium</p>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                  </div>

                  {/* Don / Premium */}
                  <div className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors group cursor-pointer"
                       onClick={() => {
                         onOpenChange(false);
                         window.location.href = '/subscription';
                       }}>
                    <div className="flex items-center gap-3 flex-1">
                      <Gift className="h-5 w-5 text-muted-foreground" />
                      <div className="flex-1">
                        <label className="text-sm font-medium">Soutenir l'application</label>
                        <p className="text-xs text-muted-foreground">Don ou abonnement premium</p>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                  </div>
                </div>
              </div>

              {/* Section: Notifications */}
              <div className="space-y-3 animate-fade-in">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider px-2">
                  Notifications
                </h3>
                <div className="rounded-xl border border-border/50 bg-card/30 backdrop-blur-sm shadow-sm overflow-hidden divide-y divide-border/30">
                  {/* Notifications Push */}
                  <div className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors group">
                    <div className="flex items-center gap-3 flex-1">
                      <Smartphone className="h-5 w-5 text-muted-foreground" />
                      <div className="flex-1">
                        <label className="text-sm font-medium">Notifications push</label>
                        <p className="text-xs text-muted-foreground">
                          {isRegistered ? "✓ Activées" : "Autoriser les notifications"}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant={isRegistered ? "ghost" : "default"}
                      size="sm"
                      className="h-8 text-xs"
                      onClick={handleNotificationToggle}
                      disabled={isRegistered}
                    >
                      {isRegistered ? '✓ Activées' : 'Activer'}
                    </Button>
                  </div>

                  {isRegistered && (
                    <div className="p-4 bg-muted/20">
                      <p className="text-xs text-muted-foreground">
                        ✓ Les préférences ci-dessous contrôlent quelles notifications vous recevez.
                      </p>
                    </div>
                  )}

                  {/* Test notification */}
                  {isRegistered && (
                    <div className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors group">
                      <div className="flex items-center gap-3 flex-1">
                        <Bug className="h-5 w-5 text-muted-foreground" />
                        <div className="flex-1">
                          <label className="text-sm font-medium">Tester les notifications</label>
                          <p className="text-xs text-muted-foreground">Envoyer une notification de test</p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 text-xs text-primary hover:text-primary hover:bg-primary/10"
                        onClick={testNotification}
                      >
                        Tester
                      </Button>
                    </div>
                  )}

                  {/* Demandes de suivi */}
                  <div className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors group">
                    <div className="flex items-center gap-3 flex-1">
                      <Users className="h-5 w-5 text-muted-foreground" />
                      <div className="flex-1">
                        <label className="text-sm font-medium">Demandes de suivi</label>
                        <p className="text-xs text-muted-foreground">Push quand quelqu'un vous suit</p>
                      </div>
                    </div>
                    <Switch
                      checked={profile?.notif_follow_request === true}
                      onCheckedChange={(checked) => updatePrivacySettings('notif_follow_request', checked)}
                      disabled={!isRegistered}
                    />
                  </div>

                  {/* Messages */}
                  <div className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors group">
                    <div className="flex items-center gap-3 flex-1">
                      <MessageCircle className="h-5 w-5 text-muted-foreground" />
                      <div className="flex-1">
                        <label className="text-sm font-medium">Messages</label>
                        <p className="text-xs text-muted-foreground">Push pour les nouveaux messages</p>
                      </div>
                    </div>
                    <Switch
                      checked={profile?.notif_message === true}
                      onCheckedChange={(checked) => updatePrivacySettings('notif_message', checked)}
                      disabled={!isRegistered}
                    />
                  </div>

                  {/* Demandes de session */}
                  <div className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors group">
                    <div className="flex items-center gap-3 flex-1">
                      <Play className="h-5 w-5 text-muted-foreground" />
                      <div className="flex-1">
                        <label className="text-sm font-medium">Demandes de session</label>
                        <p className="text-xs text-muted-foreground">Push pour les demandes de participation</p>
                      </div>
                    </div>
                    <Switch
                      checked={profile?.notif_session_request === true}
                      onCheckedChange={(checked) => updatePrivacySettings('notif_session_request', checked)}
                      disabled={!isRegistered}
                    />
                  </div>

                  {/* Sessions d'amis (Premium) */}
                  <div className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors group">
                    <div className="flex items-center gap-3 flex-1">
                      <Users className="h-5 w-5 text-muted-foreground" />
                      <div className="flex-1">
                        <label className="text-sm font-medium">
                          Sessions d'amis
                          {profile?.is_premium && <span className="ml-1 text-xs bg-primary/20 text-primary px-1.5 py-0.5 rounded">PREMIUM</span>}
                        </label>
                        <p className="text-xs text-muted-foreground">Push quand vos amis créent une session</p>
                      </div>
                    </div>
                    <Switch
                      checked={profile?.notif_friend_session === true}
                      onCheckedChange={(checked) => updatePrivacySettings('notif_friend_session', checked)}
                      disabled={!isRegistered || !profile?.is_premium}
                    />
                  </div>
                </div>
              </div>

              {/* Section: Connexions externes */}
              <div className="space-y-3 animate-fade-in">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider px-2">
                  Connexions externes
                </h3>
                <div className="rounded-xl border border-border/50 bg-card/30 backdrop-blur-sm shadow-sm overflow-hidden divide-y divide-border/30">
                  <div className="p-4 space-y-6">
                    <StravaConnect profile={profile} isOwnProfile={true} onProfileUpdate={fetchProfile} />
                    <InstagramConnect profile={profile} isOwnProfile={true} onProfileUpdate={fetchProfile} />
                  </div>
                </div>
              </div>

              {/* Section: Confidentialité & Légal */}
              <div className="space-y-3 animate-fade-in">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider px-2">
                  Confidentialité & Légal
                </h3>
                <div className="rounded-xl border border-border/50 bg-card/30 backdrop-blur-sm shadow-sm overflow-hidden divide-y divide-border/30">
                  {/* RGPD */}
                  <div className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors group">
                    <div className="flex items-center gap-3 flex-1">
                      <FileText className="h-5 w-5 text-muted-foreground" />
                      <div className="flex-1">
                        <label className="text-sm font-medium">Règlement RGPD</label>
                        <p className="text-xs text-muted-foreground">Traitement des données personnelles</p>
                      </div>
                    </div>
                    <Switch
                      checked={profile?.rgpd_accepted || false}
                      onCheckedChange={(checked) => updatePrivacySettings('rgpd_accepted', checked)}
                    />
                  </div>

                  {/* Security Rules */}
                  <div className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors group">
                    <div className="flex items-center gap-3 flex-1">
                      <Shield className="h-5 w-5 text-muted-foreground" />
                      <div className="flex-1">
                        <label className="text-sm font-medium">Règles de sécurité</label>
                        <p className="text-xs text-muted-foreground">Règles d'utilisation et sécurité</p>
                      </div>
                    </div>
                    <Switch
                      checked={profile?.security_rules_accepted || false}
                      onCheckedChange={(checked) => updatePrivacySettings('security_rules_accepted', checked)}
                    />
                  </div>
                </div>
              </div>

              {/* Section: Support */}
              <div className="space-y-3 animate-fade-in">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider px-2">
                  Support
                </h3>
                <div className="rounded-xl border border-border/50 bg-card/30 backdrop-blur-sm shadow-sm overflow-hidden">
                  <div className="p-4 text-center space-y-3">
                    <p className="text-sm text-muted-foreground">
                      Besoin d'aide ? Contactez notre équipe support
                    </p>
                    <a 
                      href="mailto:ferdinand.froidefont@gmail.com"
                      className="inline-flex items-center gap-2 text-primary hover:text-primary/80 transition-colors"
                    >
                      <Mail className="h-4 w-4" />
                      <span className="text-sm">ferdinand.froidefont@gmail.com</span>
                    </a>
                  </div>
                </div>
              </div>

              {/* Section: Actions */}
              <div className="space-y-3 animate-fade-in pb-4">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider px-2">
                  Actions
                </h3>
                <div className="rounded-xl border border-border/50 bg-card/30 backdrop-blur-sm shadow-sm overflow-hidden divide-y divide-border/30">
                  <button 
                    onClick={handleSignOut}
                    className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <LogOut className="h-5 w-5 text-destructive" />
                      <span className="text-sm font-medium text-destructive">Se déconnecter</span>
                    </div>
                    <ChevronRight className="h-5 w-5 text-destructive opacity-60 group-hover:opacity-100 transition-opacity" />
                  </button>
                  
                  {/* Creator Button */}
                  {user?.email === 'ferdinand.froidefont@gmail.com' && (
                    <button
                      className="w-full flex items-center justify-between p-4 hover:bg-primary/5 transition-colors group bg-primary/5"
                    >
                      <div className="flex items-center gap-3">
                        <Settings className="h-5 w-5 text-primary" />
                        <span className="text-sm font-medium text-primary">Créateur</span>
                      </div>
                      <ChevronRight className="h-5 w-5 text-primary opacity-60 group-hover:opacity-100 transition-opacity" />
                    </button>
                  )}
                  
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <button
                        className="w-full flex items-center justify-between p-4 hover:bg-destructive/5 transition-colors group"
                      >
                        <div className="flex items-center gap-3">
                          <Trash2 className="h-5 w-5 text-destructive" />
                          <span className="text-sm font-medium text-destructive">Supprimer mon compte</span>
                        </div>
                        <ChevronRight className="h-5 w-5 text-destructive opacity-60 group-hover:opacity-100 transition-opacity" />
                      </button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Supprimer votre compte</AlertDialogTitle>
                        <AlertDialogDescription>
                          Êtes-vous sûr de vouloir supprimer définitivement votre compte ? 
                          Cette action est irréversible et toutes vos données seront perdues.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Annuler</AlertDialogCancel>
                        <AlertDialogAction 
                          onClick={handleDeleteAccount}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Supprimer définitivement
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Referral Dialog */}
      <ReferralDialog 
        isOpen={showReferralDialog}
        onClose={() => setShowReferralDialog(false)}
      />

      {/* Conversation Themes Dialog */}
      <Dialog open={showConversationThemes} onOpenChange={setShowConversationThemes}>
        <DialogContent className="max-w-md max-h-[80vh] p-0 flex flex-col">
          <DialogHeader className="p-6 pb-0 shrink-0">
            <DialogTitle className="text-center text-2xl font-bold flex items-center justify-center gap-2">
              <MessageCircle className="h-6 w-6" />
              Thèmes de conversation
            </DialogTitle>
          </DialogHeader>
          
          <ScrollArea className="flex-1 px-6 pb-6 overflow-y-auto">
            <ConversationThemeSelector 
              currentTheme={conversationTheme}
              onThemeSelect={(themeId) => {
                setConversationTheme(themeId);
                setShowConversationThemes(false);
              }}
            />
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* QR Share Dialog */}
      {qrData && (
        <QRShareDialog
          open={showQRDialog}
          onOpenChange={setShowQRDialog}
          profileUrl={qrData.profileUrl}
          username={qrData.username}
          displayName={qrData.displayName}
        />
      )}
    </>
  );
};