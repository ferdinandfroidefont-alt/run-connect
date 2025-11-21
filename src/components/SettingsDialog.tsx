import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { useTheme } from "@/contexts/ThemeContext";
import { useToast } from "@/hooks/use-toast";
import { Settings, LogOut, Sun, Moon, Key, Bell, Shield, FileText, Mail, Trash2, Users, Share2, Smartphone, Play, MessageCircle, Palette, Gift, Loader2, Bug, Languages, ArrowLeft, Search, ChevronRight, Info, CheckCircle, UserCheck } from "lucide-react";
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
import { useNavigate } from "react-router-dom";
import { FCMTokenDiagnostic } from "./FCMTokenDiagnostic";

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
  notif_club_invitation?: boolean;
  notif_session_accepted?: boolean;
  notif_presence_confirmed?: boolean;
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
  initialSearch?: string;
}

export const SettingsDialog = ({ open, onOpenChange, initialSearch }: SettingsDialogProps) => {
  const { user, session, signOut } = useAuth();
  const { theme, setTheme } = useTheme();
  const { shareProfile, showQRDialog, setShowQRDialog, qrData } = useShareProfile();
  const { conversationTheme, setConversationTheme } = useConversationTheme();
  const { isRegistered, requestPermissions, isNative, testNotification, checkPermissionStatus } = usePushNotifications();
  const { language, setLanguage } = useLanguage();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [showConversationThemes, setShowConversationThemes] = useState(false);
  const [showReferralDialog, setShowReferralDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState(initialSearch || "");
  
  const { toast } = useToast();

  // Réinitialiser la recherche quand initialSearch change
  useEffect(() => {
    if (initialSearch) {
      setSearchQuery(initialSearch);
    }
  }, [initialSearch]);

  // Fonction de filtrage pour la recherche
  const matchesSearch = (text: string) => {
    if (!searchQuery.trim()) return true;
    const normalizedQuery = searchQuery.toLowerCase().trim();
    const normalizedText = text.toLowerCase();
    return normalizedText.includes(normalizedQuery);
  };

  // Déterminer quelles sections afficher selon la recherche
  const showGeneralSettings = !searchQuery.trim() || 
    matchesSearch("langue language paramètres généraux thème mode sombre clair mot de passe password réinitialiser appui long carte session suggestions amis partager profil instagram whatsapp contacts conversation thèmes parrainage premium don soutenir");
  
  const showNotifications = !searchQuery.trim() || 
    matchesSearch("notifications push demandes suivi messages session amis premium test");
  
  const showExternalConnections = !searchQuery.trim() || 
    matchesSearch("connexions externes strava instagram");
  
  const showPrivacyLegal = !searchQuery.trim() || 
    matchesSearch("confidentialité légal rgpd données personnelles sécurité règles");
  
  const showSupport = !searchQuery.trim() || 
    matchesSearch("support aide contact email ferdinand");
  
  const showActions = !searchQuery.trim() || 
    matchesSearch("actions déconnecter logout supprimer compte delete créateur");

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
        redirectTo: window.AndroidBridge 
          ? 'app.runconnect://auth'
          : `${window.location.origin}/auth`,
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
    try {
      console.log('🔔 [SETTINGS] Toggle notifications, isRegistered:', isRegistered);
      
      if (!isRegistered) {
        // L'utilisateur veut activer
        console.log('🔔 [SETTINGS] Activation notifications...');
        
        const granted = await requestPermissions();
        
        if (granted && user) {
          console.log('✅ [SETTINGS] Permissions accordées');
          await checkPermissionStatus();
          
          // Vérifier que le token est bien en base après 3s
          await new Promise(resolve => setTimeout(resolve, 3000));
          const { data: profile } = await supabase
            .from('profiles')
            .select('push_token')
            .eq('user_id', user.id)
            .single();

          if (!profile?.push_token) {
            toast({
              title: "⚠️ Token manquant",
              description: "Permissions OK mais token non reçu. Relancez l'app.",
              variant: "destructive"
            });
          } else {
            toast({
              title: "✅ Notifications activées",
              description: "Vous recevrez les alertes de RunConnect"
            });
          }
        } else {
          // Permission refusée, ouvrir les paramètres
          toast({
            title: "Permission refusée",
            description: "Ouvrez les paramètres pour activer",
            variant: "destructive"
          });
        }
      } else {
        // L'utilisateur veut désactiver → rediriger vers les paramètres Android
        console.log('🔔 [SETTINGS] Désactivation notifications → ouvrir paramètres');
        
        if (isNative && typeof (window as any).AndroidBridge?.openSettings === 'function') {
          (window as any).AndroidBridge.openSettings();
          
          toast({
            title: "Ouvrir les paramètres",
            description: "Désactivez les notifications dans les paramètres Android"
          });
        } else {
          toast({
            title: "Paramètres Android",
            description: "Allez dans Paramètres > Apps > RunConnect > Notifications",
            variant: "destructive"
          });
        }
      }
    } catch (error) {
      console.error('❌ [SETTINGS] Erreur toggle notifications:', error);
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
              {showGeneralSettings && (
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
                      <SelectContent className="z-[9999]" sideOffset={5}>
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
              )}

              {/* Section: Notifications */}
              {showNotifications && (
              <div className="space-y-3 animate-fade-in">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider px-2">
                  Notifications
                </h3>
                
                {/* 🆕 DIAGNOSTIC FCM */}
                <FCMTokenDiagnostic />
                
                <div className="rounded-xl border border-border/50 bg-card/30 backdrop-blur-sm shadow-sm overflow-hidden divide-y divide-border/30">
                  {/* Notifications Push - Toggle principal */}
                  <div className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors group">
                    <div className="flex items-center gap-3 flex-1">
                      <Smartphone className="h-5 w-5 text-muted-foreground" />
                      <div className="flex-1">
                        <label className="text-sm font-medium">Notifications push</label>
                        <p className="text-xs text-muted-foreground">
                          {profile?.notifications_enabled ? "Activées" : "Désactivées"}
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={profile?.notifications_enabled === true}
                      onCheckedChange={(checked) => updatePrivacySettings('notifications_enabled', checked)}
                    />
                  </div>

                  {/* Bandeau d'info si notifications désactivées */}
                  {profile?.notifications_enabled === false && (
                    <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-400">
                      <p className="text-xs text-yellow-800 dark:text-yellow-200">
                        ⚠️ Notifications désactivées. Les préférences ci-dessous sont inactives.
                      </p>
                    </div>
                  )}

                  {/* Permissions système Android */}
                  {!isRegistered && isNative && profile?.notifications_enabled === true && (
                    <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-400">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 flex-1">
                          <Bell className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                          <div className="flex-1">
                            <label className="text-sm font-medium text-blue-800 dark:text-blue-200">Autoriser les notifications système</label>
                            <p className="text-xs text-blue-600 dark:text-blue-300">Activez les permissions Android</p>
                          </div>
                        </div>
                        <Button
                          variant="default"
                          size="sm"
                          className="h-8 text-xs bg-blue-600 hover:bg-blue-700"
                          onClick={handleNotificationToggle}
                        >
                          Autoriser
                        </Button>
                      </div>
                    </div>
                  )}

                  {profile?.notifications_enabled === true && (
                    <div className="p-4 bg-muted/20">
                      <p className="text-xs text-muted-foreground">
                        ✓ Les préférences ci-dessous contrôlent quelles notifications vous recevez.
                      </p>
                    </div>
                  )}

                  {/* Test notification */}
                  {profile?.notifications_enabled === true && (
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
                      disabled={profile?.notifications_enabled !== true}
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
                      disabled={profile?.notifications_enabled !== true}
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
                      disabled={profile?.notifications_enabled !== true}
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
                      disabled={profile?.notifications_enabled !== true || !profile?.is_premium}
                    />
                  </div>

                  {/* Invitations de club */}
                  <div className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors group">
                    <div className="flex items-center gap-3 flex-1">
                      <Users className="h-5 w-5 text-muted-foreground" />
                      <div className="flex-1">
                        <label className="text-sm font-medium">Invitations de club</label>
                        <p className="text-xs text-muted-foreground">Quand on vous invite à rejoindre un club</p>
                      </div>
                    </div>
                    <Switch
                      checked={profile?.notif_club_invitation === true}
                      onCheckedChange={(checked) => updatePrivacySettings('notif_club_invitation', checked)}
                      disabled={profile?.notifications_enabled !== true}
                    />
                  </div>

                  {/* Acceptation de session */}
                  <div className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors group">
                    <div className="flex items-center gap-3 flex-1">
                      <CheckCircle className="h-5 w-5 text-muted-foreground" />
                      <div className="flex-1">
                        <label className="text-sm font-medium">Participants à vos sessions</label>
                        <p className="text-xs text-muted-foreground">Quand quelqu'un rejoint votre session</p>
                      </div>
                    </div>
                    <Switch
                      checked={profile?.notif_session_accepted === true}
                      onCheckedChange={(checked) => updatePrivacySettings('notif_session_accepted', checked)}
                      disabled={profile?.notifications_enabled !== true}
                    />
                  </div>

                  {/* Confirmation de présence */}
                  <div className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors group">
                    <div className="flex items-center gap-3 flex-1">
                      <UserCheck className="h-5 w-5 text-muted-foreground" />
                      <div className="flex-1">
                        <label className="text-sm font-medium">Confirmation de présence</label>
                        <p className="text-xs text-muted-foreground">Quand l'organisateur confirme votre présence</p>
                      </div>
                    </div>
                    <Switch
                      checked={profile?.notif_presence_confirmed === true}
                      onCheckedChange={(checked) => updatePrivacySettings('notif_presence_confirmed', checked)}
                      disabled={profile?.notifications_enabled !== true}
                    />
                  </div>
                </div>
              </div>
              )}

              {/* Section: Connexions externes */}
              {showExternalConnections && (
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
              )}

              {/* Section: Confidentialité & Légal */}
              {showPrivacyLegal && (
              <div className="space-y-3 animate-fade-in">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider px-2">
                  Confidentialité & Légal
                </h3>
                <div className="rounded-xl border border-border/50 bg-card/30 backdrop-blur-sm shadow-sm overflow-hidden divide-y divide-border/30">
                  {/* Info text */}
                  <div className="p-4 bg-primary/5 border-b border-primary/20">
                    <p className="text-xs text-center text-muted-foreground">
                      Ces options sont <strong className="text-foreground">obligatoires</strong> pour continuer à utiliser RunConnect conformément à la réglementation Google Play.
                    </p>
                  </div>

                  {/* RGPD */}
                  <AlertDialog>
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
                        onCheckedChange={(checked) => {
                          if (!checked) {
                            // Ouvrir le dialog de confirmation
                            const trigger = document.getElementById('rgpd-revoke-trigger');
                            trigger?.click();
                          } else {
                            updatePrivacySettings('rgpd_accepted', checked);
                          }
                        }}
                      />
                    </div>
                    <AlertDialogTrigger id="rgpd-revoke-trigger" className="hidden" />
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Retirer votre consentement RGPD ?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Êtes-vous sûr de vouloir retirer votre consentement ? Vous serez déconnecté 
                          immédiatement et devrez accepter à nouveau les conditions pour utiliser l'application.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Annuler</AlertDialogCancel>
                        <AlertDialogAction 
                          onClick={async () => {
                            if (!user) return;
                            try {
                              await supabase
                                .from('profiles')
                                .update({ 
                                  rgpd_accepted: false, 
                                  security_rules_accepted: false 
                                })
                                .eq('user_id', user.id);
                              
                              toast({
                                title: "Consentement révoqué",
                                description: "Vous allez être déconnecté.",
                              });
                              
                              setTimeout(() => signOut(), 1000);
                            } catch (error) {
                              console.error('Erreur révocation:', error);
                              toast({
                                title: "Erreur",
                                description: "Impossible de révoquer le consentement.",
                                variant: "destructive",
                              });
                            }
                          }}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Confirmer et déconnecter
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>

                  {/* Security Rules */}
                  <AlertDialog>
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
                        onCheckedChange={(checked) => {
                          if (!checked) {
                            // Ouvrir le dialog de confirmation
                            const trigger = document.getElementById('security-revoke-trigger');
                            trigger?.click();
                          } else {
                            updatePrivacySettings('security_rules_accepted', checked);
                          }
                        }}
                      />
                    </div>
                    <AlertDialogTrigger id="security-revoke-trigger" className="hidden" />
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Retirer votre acceptation des règles ?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Êtes-vous sûr de vouloir retirer votre consentement ? Vous serez déconnecté 
                          immédiatement et devrez accepter à nouveau les conditions pour utiliser l'application.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Annuler</AlertDialogCancel>
                        <AlertDialogAction 
                          onClick={async () => {
                            if (!user) return;
                            try {
                              await supabase
                                .from('profiles')
                                .update({ 
                                  rgpd_accepted: false, 
                                  security_rules_accepted: false 
                                })
                                .eq('user_id', user.id);
                              
                              toast({
                                title: "Consentement révoqué",
                                description: "Vous allez être déconnecté.",
                              });
                              
                              setTimeout(() => signOut(), 1000);
                            } catch (error) {
                              console.error('Erreur révocation:', error);
                              toast({
                                title: "Erreur",
                                description: "Impossible de révoquer le consentement.",
                                variant: "destructive",
                              });
                            }
                          }}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Confirmer et déconnecter
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>

                  {/* Revoke Consent */}
                  {profile?.rgpd_accepted && profile?.security_rules_accepted && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <button className="w-full flex items-center justify-between p-4 hover:bg-destructive/5 transition-colors group">
                          <div className="flex items-center gap-3">
                            <Shield className="h-5 w-5 text-destructive" />
                            <div className="flex-1 text-left">
                              <span className="text-sm font-medium text-destructive">Révoquer mon consentement</span>
                              <p className="text-xs text-muted-foreground">Vous serez déconnecté</p>
                            </div>
                          </div>
                          <ChevronRight className="h-5 w-5 text-destructive opacity-60 group-hover:opacity-100 transition-opacity" />
                        </button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Révoquer votre consentement ?</AlertDialogTitle>
                          <AlertDialogDescription>
                            En révoquant votre consentement RGPD et aux règles de sécurité, vous serez déconnecté 
                            et devrez les accepter à nouveau pour utiliser RunConnect.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Annuler</AlertDialogCancel>
                          <AlertDialogAction 
                            onClick={async () => {
                              if (!user) return;
                              try {
                                await supabase
                                  .from('profiles')
                                  .update({ 
                                    rgpd_accepted: false, 
                                    security_rules_accepted: false 
                                  })
                                  .eq('user_id', user.id);
                                
                                toast({
                                  title: "Consentement révoqué",
                                  description: "Vous allez être déconnecté.",
                                });
                                
                                setTimeout(() => signOut(), 1000);
                              } catch (error) {
                                console.error('Erreur révocation consentement:', error);
                                toast({
                                  title: "Erreur",
                                  description: "Impossible de révoquer le consentement.",
                                  variant: "destructive",
                                });
                              }
                            }}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Révoquer et déconnecter
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}

                  {/* Privacy Policy Link */}
                  <button 
                    onClick={() => {
                      navigate('/privacy');
                      onOpenChange(false);
                    }}
                    className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <Info className="h-5 w-5 text-muted-foreground" />
                      <div className="flex-1 text-left">
                        <span className="text-sm font-medium">Politique de confidentialité</span>
                        <p className="text-xs text-muted-foreground">Consulter notre politique complète</p>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground opacity-60 group-hover:opacity-100 transition-opacity" />
                  </button>
                </div>
              </div>
              )}

              {/* Section: Support */}
              {showSupport && (
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
              )}

              {/* Section: Actions */}
              {showActions && (
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
              )}
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