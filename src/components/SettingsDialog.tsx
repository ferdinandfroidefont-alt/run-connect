import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { useTheme } from "@/contexts/ThemeContext";
import { useToast } from "@/hooks/use-toast";
import { Settings, LogOut, Sun, Moon, Key, Bell, Shield, FileText, Mail, Trash2, Users, Share2, Smartphone, Play, MessageCircle, Palette, Gift, Loader2, Bug, Languages } from "lucide-react";
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
  const { showWelcomeVideo } = useOnboarding();
  const { conversationTheme, setConversationTheme } = useConversationTheme();
  const { isRegistered, requestPermissions, isNative, testNotification } = usePushNotifications();
  const { language, setLanguage } = useLanguage();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [showConversationThemes, setShowConversationThemes] = useState(false);
  const [showReferralDialog, setShowReferralDialog] = useState(false);
  
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
    const success = await requestPermissions();
    if (!success) {
      // Si la permission échoue, ouvrir les paramètres Android
      const { androidPermissions } = await import('@/lib/androidPermissions');
      const opened = await androidPermissions.openAppSettings();
      if (opened) {
        toast({
          title: "Paramètres ouverts",
          description: "Activez les notifications dans les paramètres Android puis revenez dans l'app.",
        });
      }
    } else if (user) {
      // Mettre à jour le profil pour marquer les notifications comme activées
      await supabase
        .from('profiles')
        .update({ notifications_enabled: true })
        .eq('user_id', user.id);
      
      setProfile(prev => prev ? { ...prev, notifications_enabled: true } : null);
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
        <DialogContent className="max-w-md max-h-[80vh] p-0 flex flex-col">
          <DialogHeader className="p-6 pb-0 shrink-0">
            <DialogTitle className="text-center text-2xl font-bold flex items-center justify-center gap-2">
              <Settings className="h-6 w-6" />
              Paramètres
            </DialogTitle>
          </DialogHeader>
          
          <ScrollArea className="flex-1 px-6 pb-6 overflow-y-auto">
            <div className="space-y-4 pb-4 min-h-full"
                 style={{ scrollbarWidth: 'thin', scrollbarColor: 'hsl(var(--border)) transparent' }}>
              
              {/* Theme Settings */}
              <Card>
                <CardHeader>
                  <div className="flex items-center">
                    <Settings className="h-5 w-5 text-primary mr-2" />
                    <CardTitle className="text-lg">Paramètres généraux</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Language Selector */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Languages className="h-4 w-4" />
                      <div className="grid gap-1.5">
                        <label className="text-sm font-medium leading-none">
                          Langue
                        </label>
                        <p className="text-xs text-muted-foreground">
                          Choisir la langue de l'application
                        </p>
                      </div>
                    </div>
                    <Select value={language} onValueChange={(value) => setLanguage(value as Language)}>
                      <SelectTrigger className="w-[140px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(languages).map(([code, { nativeName }]) => (
                          <SelectItem key={code} value={code}>
                            {nativeName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Theme Toggle */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      {theme === 'dark' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
                      <div className="grid gap-1.5">
                        <label className="text-sm font-medium leading-none">
                          Mode {theme === 'dark' ? 'sombre' : 'clair'}
                        </label>
                        <p className="text-xs text-muted-foreground">
                          Basculer entre thème clair et sombre
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={theme === 'dark'}
                      onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')}
                    />
                  </div>

                  {/* Password Reset */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Key className="h-4 w-4" />
                      <div className="grid gap-1.5">
                        <label className="text-sm font-medium leading-none">
                          Mot de passe
                        </label>
                        <p className="text-xs text-muted-foreground">
                          Réinitialiser votre mot de passe
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handlePasswordReset}
                      disabled={isChangingPassword}
                    >
                      {isChangingPassword ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        'Changer'
                      )}
                    </Button>
                  </div>

                  {/* Vidéo de bienvenue */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Play className="h-4 w-4" />
                      <div className="grid gap-1.5">
                        <label className="text-sm font-medium leading-none">
                          Vidéo de présentation
                        </label>
                        <p className="text-xs text-muted-foreground">
                          Revoir la vidéo des fonctionnalités
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={showWelcomeVideo}
                    >
                      Regarder
                    </Button>
                  </div>

                   {/* Long Press to Create Session */}
                   <div className="flex items-center justify-between">
                     <div className="flex items-center space-x-2">
                       <Settings className="h-4 w-4" />
                       <div className="grid gap-1.5">
                         <label className="text-sm font-medium leading-none">
                           Appui long sur la carte
                         </label>
                         <p className="text-xs text-muted-foreground">
                           Créer une session en appuyant longuement sur la carte
                         </p>
                       </div>
                     </div>
                     <Switch
                       checked={localStorage.getItem('enableLongPressCreate') === 'true'}
                       onCheckedChange={(checked) => {
                         localStorage.setItem('enableLongPressCreate', checked.toString());
                         toast({
                           title: "Paramètre mis à jour",
                           description: checked ? "Appui long activé sur la carte" : "Appui long désactivé sur la carte"
                         });
                       }}
                     />
                   </div>

                   {/* Friend Suggestions */}
                   <div className="flex items-center justify-between">
                     <div className="flex items-center space-x-2">
                       <Users className="h-4 w-4" />
                       <div className="grid gap-1.5">
                         <label className="text-sm font-medium leading-none">
                           Suggestions d'amis
                         </label>
                         <p className="text-xs text-muted-foreground">
                           Autoriser les suggestions et être suggéré
                         </p>
                       </div>
                     </div>
                     <Switch
                       checked={profile?.allow_friend_suggestions !== false}
                       onCheckedChange={(checked) => updatePrivacySettings('allow_friend_suggestions', checked)}
                     />
                   </div>

                  {/* Share Profile */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Share2 className="h-4 w-4" />
                      <div className="grid gap-1.5">
                        <label className="text-sm font-medium leading-none">
                          Partager mon profil
                        </label>
                        <p className="text-xs text-muted-foreground">
                          Partagez votre profil sur Instagram, WhatsApp...
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (profile) {
                          shareProfile({
                            username: profile.username,
                            displayName: profile.display_name,
                            bio: profile.bio
                          });
                        }
                      }}
                    >
                      Partager
                    </Button>
                  </div>

                   {/* Contacts Access - Only show on mobile */}
                   <ContactsPermissionButton />

                  {/* Conversation Themes */}
                   <div className="flex items-center justify-between">
                     <div className="flex items-center space-x-2">
                       <Palette className="h-4 w-4" />
                       <div className="grid gap-1.5">
                         <label className="text-sm font-medium leading-none">
                           Thèmes de conversation
                         </label>
                         <p className="text-xs text-muted-foreground">
                           Personnaliser l'apparence des messages
                         </p>
                       </div>
                     </div>
                     <Button
                       variant="outline"
                       size="sm"
                       onClick={() => setShowConversationThemes(true)}
                     >
                       Choisir
                     </Button>
                   </div>

                   {/* Parrainage */}
                   <div className="flex items-center justify-between">
                     <div className="flex items-center space-x-2">
                       <Gift className="h-4 w-4" />
                       <div className="grid gap-1.5">
                         <label className="text-sm font-medium leading-none">
                           Parrainage
                         </label>
                         <p className="text-xs text-muted-foreground">
                           Invitez vos amis et gagnez du premium !
                         </p>
                       </div>
                     </div>
                     <Button
                       variant="outline"
                       size="sm"
                       onClick={() => setShowReferralDialog(true)}
                     >
                       Voir mon code
                     </Button>
                   </div>

                   {/* Don / Premium */}
                   <div className="flex items-center justify-between">
                     <div className="flex items-center space-x-2">
                       <Gift className="h-4 w-4" />
                       <div className="grid gap-1.5">
                         <label className="text-sm font-medium leading-none">
                           Soutenir l'application
                         </label>
                         <p className="text-xs text-muted-foreground">
                           Faire un don ou gérer votre abonnement premium
                         </p>
                       </div>
                     </div>
                     <Button
                       variant="outline"
                       size="sm"
                       onClick={() => {
                         onOpenChange(false);
                         window.location.href = '/subscription';
                       }}
                     >
                       Soutenir
                     </Button>
                   </div>
                </CardContent>
              </Card>

              {/* Notifications Settings */}
              <Card>
                <CardHeader>
                  <div className="flex items-center">
                    <Bell className="h-5 w-5 text-primary mr-2" />
                    <CardTitle className="text-lg">Préférences de notifications</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Notifications générales */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Smartphone className="h-4 w-4" />
                      <div className="grid gap-1.5">
                        <label className="text-sm font-medium leading-none">
                          Notifications push
                        </label>
                        <p className="text-xs text-muted-foreground">
                          {isNative 
                            ? "✓ Compatible toutes versions Android"
                            : "Autoriser les notifications sur votre appareil"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {!isRegistered && (
                        <span className="text-xs text-red-600">Non activées</span>
                      )}
                      {isRegistered && (
                        <span className="text-xs text-green-600">✓ Activées</span>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleNotificationToggle}
                        disabled={isRegistered}
                      >
                        {isRegistered ? 'Activées' : 'Activer'}
                      </Button>
                    </div>
                  </div>

                  {isRegistered && (
                    <div className="rounded-md bg-muted/50 p-3 text-xs text-muted-foreground">
                      <p>✓ Les préférences ci-dessous contrôlent quelles notifications push vous recevez.</p>
                      <p className="mt-1">✓ Vérifié côté serveur pour toutes versions Android.</p>
                    </div>
                  )}

                  {/* Test notification - NOUVEAU */}
                  {isRegistered && (
                    <div className="flex items-center justify-between border-t pt-4">
                      <div className="flex items-center space-x-2">
                        <Bug className="h-4 w-4" />
                        <div className="grid gap-1.5">
                          <label className="text-sm font-medium leading-none">
                            Tester les notifications
                          </label>
                          <p className="text-xs text-muted-foreground">
                            Envoyer une notification de test
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={testNotification}
                      >
                        Tester
                      </Button>
                    </div>
                  )}

                  {/* Demandes de suivi */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Users className="h-4 w-4" />
                      <div className="grid gap-1.5">
                        <label className="text-sm font-medium leading-none">
                          Demandes de suivi
                        </label>
                        <p className="text-xs text-muted-foreground">
                          Recevoir push quand quelqu'un vous suit
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={profile?.notif_follow_request === true}
                      onCheckedChange={(checked) => updatePrivacySettings('notif_follow_request', checked)}
                      disabled={!isRegistered}
                    />
                  </div>

                  {/* Messages */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <MessageCircle className="h-4 w-4" />
                      <div className="grid gap-1.5">
                        <label className="text-sm font-medium leading-none">
                          Messages
                        </label>
                        <p className="text-xs text-muted-foreground">
                          Recevoir push pour les nouveaux messages
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={profile?.notif_message === true}
                      onCheckedChange={(checked) => updatePrivacySettings('notif_message', checked)}
                      disabled={!isRegistered}
                    />
                  </div>

                  {/* Demandes de session */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Play className="h-4 w-4" />
                      <div className="grid gap-1.5">
                        <label className="text-sm font-medium leading-none">
                          Demandes de session
                        </label>
                        <p className="text-xs text-muted-foreground">
                          Recevoir push pour les demandes de participation
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={profile?.notif_session_request === true}
                      onCheckedChange={(checked) => updatePrivacySettings('notif_session_request', checked)}
                      disabled={!isRegistered}
                    />
                  </div>

                  {/* Sessions d'amis (Premium) */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Users className="h-4 w-4" />
                      <div className="grid gap-1.5">
                        <label className="text-sm font-medium leading-none">
                          Sessions d'amis
                          {profile?.is_premium && <span className="ml-1 text-xs bg-primary text-primary-foreground px-1 rounded">PREMIUM</span>}
                        </label>
                        <p className="text-xs text-muted-foreground">
                          Recevoir push quand vos amis créent une session
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={profile?.notif_friend_session === true}
                      onCheckedChange={(checked) => updatePrivacySettings('notif_friend_session', checked)}
                      disabled={!isRegistered || !profile?.is_premium}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Strava & Instagram Connection */}
              <Card>
                <CardHeader>
                  <div className="flex items-center">
                    <Shield className="h-5 w-5 text-primary mr-2" />
                    <CardTitle className="text-lg">Connexions externes</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <StravaConnect profile={profile} isOwnProfile={true} onProfileUpdate={fetchProfile} />
                  <InstagramConnect profile={profile} isOwnProfile={true} onProfileUpdate={fetchProfile} />
                </CardContent>
              </Card>

              {/* Privacy & Legal Settings */}
              <Card>
                <CardHeader>
                  <div className="flex items-center">
                    <Shield className="h-5 w-5 text-primary mr-2" />
                    <CardTitle className="text-lg">Confidentialité & Légal</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* RGPD */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <FileText className="h-4 w-4" />
                      <div className="grid gap-1.5">
                        <label className="text-sm font-medium leading-none">
                          Règlement RGPD
                        </label>
                        <p className="text-xs text-muted-foreground">
                          Traitement des données personnelles
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={profile?.rgpd_accepted || false}
                      onCheckedChange={(checked) => updatePrivacySettings('rgpd_accepted', checked)}
                    />
                  </div>

                  {/* Security Rules */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Shield className="h-4 w-4" />
                      <div className="grid gap-1.5">
                        <label className="text-sm font-medium leading-none">
                          Règles de sécurité
                        </label>
                        <p className="text-xs text-muted-foreground">
                          Règles d'utilisation et sécurité
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={profile?.security_rules_accepted || false}
                      onCheckedChange={(checked) => updatePrivacySettings('security_rules_accepted', checked)}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Support */}
              <Card>
                <CardHeader>
                  <div className="flex items-center">
                    <Mail className="h-5 w-5 text-primary mr-2" />
                    <CardTitle className="text-lg">Support</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-center space-y-2">
                    <p className="text-sm text-muted-foreground">
                      Besoin d'aide ? Contactez notre équipe support
                    </p>
                    <a 
                      href="mailto:ferdinand.froidefont@gmail.com"
                      className="inline-flex items-center gap-2 text-primary hover:underline"
                    >
                      <Mail className="h-4 w-4" />
                      ferdinand.froidefont@gmail.com
                    </a>
                  </div>
                </CardContent>
              </Card>

              {/* Actions */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button 
                    variant="outline" 
                    onClick={handleSignOut}
                    className="w-full text-destructive hover:text-destructive"
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Se déconnecter
                  </Button>
                  
                  {/* Creator Button - Only for specific email */}
                  {user?.email === 'ferdinand.froidefont@gmail.com' && (
                    <Button
                      variant="outline"
                      className="w-full bg-gradient-to-r from-primary/10 to-primary/5 hover:from-primary/20 hover:to-primary/10 text-primary border-primary/20"
                    >
                      <Settings className="h-4 w-4 mr-2" />
                      Créateur
                    </Button>
                  )}
                  
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button 
                        variant="outline" 
                        className="w-full text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Supprimer mon compte
                      </Button>
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
                </CardContent>
              </Card>
            </div>
            
            {/* Indicateur de scroll en bas */}
            <div className="flex justify-center pt-4 pb-2">
              <div className="h-1 w-12 bg-muted rounded-full opacity-50"></div>
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