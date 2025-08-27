import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { useTheme } from "@/contexts/ThemeContext";
import { useToast } from "@/hooks/use-toast";
import { Settings, LogOut, Sun, Moon, Key, Bell, Shield, FileText, Mail, Trash2, Users, Share2, Smartphone, Play, MessageCircle, Palette, Gift } from "lucide-react";
import { Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useShareProfile } from "@/hooks/useShareProfile";
import { useOnboarding } from "@/hooks/useOnboarding";
import { ContactsPermissionButton } from "./ContactsPermissionButton";
import { StravaConnect } from "./StravaConnect";
import { InstagramConnect } from "./InstagramConnect";
import { ConversationThemeSelector } from "./ConversationThemeSelector";
import { useConversationTheme } from "@/hooks/useConversationTheme";
import { ReferralDialog } from "./ReferralDialog";

interface Profile {
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  notifications_enabled?: boolean;
  rgpd_accepted?: boolean;
  security_rules_accepted?: boolean;
  allow_friend_suggestions?: boolean;
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
  const { shareProfile } = useShareProfile();
  const { showWelcomeVideo } = useOnboarding();
  const { conversationTheme, setConversationTheme } = useConversationTheme();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission | null>(null);
  const [showConversationThemes, setShowConversationThemes] = useState(false);
  const [showReferralDialog, setShowReferralDialog] = useState(false);
  
  const { toast } = useToast();

  useEffect(() => {
    if (user && open) {
      fetchProfile();
    }
    // Check notification permission
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission);
    }
  }, [user, open]);

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user?.id)
        .single();

      if (error) throw error;
      setProfile(data);
    } catch (error: any) {
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

  const requestNotificationPermission = async () => {
    if ('Notification' in window) {
      try {
        const permission = await Notification.requestPermission();
        setNotificationPermission(permission);
        
        if (user) {
          await supabase
            .from('profiles')
            .update({ notifications_enabled: permission === 'granted' })
            .eq('user_id', user.id);
        }
        
        toast({
          title: permission === 'granted' ? "Notifications activées" : "Notifications refusées",
          description: permission === 'granted' ? 
            "Vous recevrez désormais des notifications." : 
            "Vous ne recevrez pas de notifications."
        });
      } catch (error) {
        console.error('Error requesting notification permission:', error);
      }
    }
  };

  const updatePrivacySettings = async (field: string, value: boolean) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ [field]: value })
        .eq('user_id', user.id);

      if (error) throw error;

      setProfile(prev => prev ? { ...prev, [field]: value } : null);
      
      toast({
        title: "Paramètres mis à jour",
        description: "Vos préférences ont été sauvegardées."
      });
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour les paramètres",
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

                  {/* Notifications */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Bell className="h-4 w-4" />
                      <div className="grid gap-1.5">
                        <label className="text-sm font-medium leading-none">
                          Notifications
                        </label>
                        <p className="text-xs text-muted-foreground">
                          Recevoir des notifications push
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {notificationPermission === 'denied' && (
                        <span className="text-xs text-red-600">Refusées</span>
                      )}
                      {notificationPermission === 'granted' && (
                        <span className="text-xs text-green-600">Autorisées</span>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={requestNotificationPermission}
                        disabled={notificationPermission === 'granted'}
                      >
                        {notificationPermission === 'granted' ? 'Activées' : 'Activer'}
                      </Button>
                    </div>
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
    </>
  );
};