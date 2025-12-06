import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Bell, Smartphone, Users, MessageCircle, Play, CheckCircle, UserCheck, Bug, ArrowLeft } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { motion } from "framer-motion";

interface Profile {
  notifications_enabled?: boolean;
  notif_follow_request?: boolean;
  notif_message?: boolean;
  notif_session_request?: boolean;
  notif_friend_session?: boolean;
  notif_club_invitation?: boolean;
  notif_session_accepted?: boolean;
  notif_presence_confirmed?: boolean;
  is_premium?: boolean;
}

interface SettingsNotificationsProps {
  onBack: () => void;
}

export const SettingsNotifications = ({ onBack }: SettingsNotificationsProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { isRegistered, requestPermissions, isNative, testNotification, checkPermissionStatus } = usePushNotifications();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('notifications_enabled, notif_follow_request, notif_message, notif_session_request, notif_friend_session, notif_club_invitation, notif_session_accepted, notif_presence_confirmed, is_premium')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (error) throw error;
      setProfile(data);
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
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
        description: "Vos préférences de notifications ont été sauvegardées."
      });
    } catch (error: any) {
      console.error('Error updating settings:', error);
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleNotificationToggle = async () => {
    if (!isRegistered) {
      const granted = await requestPermissions();
      if (granted && user) {
        await checkPermissionStatus();
        await new Promise(resolve => setTimeout(resolve, 3000));
        const { data: profileData } = await supabase
          .from('profiles')
          .select('push_token')
          .eq('user_id', user.id)
          .single();

        if (!profileData?.push_token) {
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
        toast({
          title: "Permission refusée",
          description: "Ouvrez les paramètres pour activer",
          variant: "destructive"
        });
      }
    } else {
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
  };

  const notificationItems = [
    { key: 'notif_follow_request', icon: Users, label: 'Demandes de suivi', desc: 'Push quand quelqu\'un vous suit' },
    { key: 'notif_message', icon: MessageCircle, label: 'Messages', desc: 'Push pour les nouveaux messages' },
    { key: 'notif_session_request', icon: Play, label: 'Demandes de session', desc: 'Push pour les demandes de participation' },
    { key: 'notif_friend_session', icon: Users, label: 'Sessions d\'amis', desc: 'Push quand vos amis créent une session', premium: true },
    { key: 'notif_club_invitation', icon: Users, label: 'Invitations de club', desc: 'Quand on vous invite à rejoindre un club' },
    { key: 'notif_session_accepted', icon: CheckCircle, label: 'Participants à vos sessions', desc: 'Quand quelqu\'un rejoint votre session' },
    { key: 'notif_presence_confirmed', icon: UserCheck, label: 'Confirmation de présence', desc: 'Quand l\'organisateur confirme votre présence' },
  ];

  return (
    <motion.div 
      initial={{ x: 100, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 100, opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="flex flex-col h-full"
    >
      {/* Header */}
      <div className="sticky top-0 z-10 backdrop-blur-xl bg-background/80 border-b border-border/50">
        <div className="flex items-center gap-3 p-4">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-full hover:bg-muted/50"
            onClick={onBack}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Notifications</h2>
          </div>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="px-4 py-6 space-y-4">
          <div className="rounded-xl border border-border/50 bg-card/30 backdrop-blur-sm shadow-sm overflow-hidden divide-y divide-border/30">
            {/* Main toggle */}
            <div className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors">
              <div className="flex items-center gap-3 flex-1">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-red-500 to-pink-600 flex items-center justify-center">
                  <Smartphone className="h-5 w-5 text-white" />
                </div>
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

            {/* Warning if disabled */}
            {profile?.notifications_enabled === false && (
              <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-400">
                <p className="text-xs text-yellow-800 dark:text-yellow-200">
                  ⚠️ Notifications désactivées. Les préférences ci-dessous sont inactives.
                </p>
              </div>
            )}

            {/* Android permissions */}
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

            {/* Test notification */}
            {profile?.notifications_enabled === true && (
              <div className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors">
                <div className="flex items-center gap-3 flex-1">
                  <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                    <Bug className="h-5 w-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <label className="text-sm font-medium">Tester les notifications</label>
                    <p className="text-xs text-muted-foreground">Envoyer une notification de test</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 text-xs text-primary hover:text-primary hover:bg-primary/10"
                  onClick={testNotification}
                >
                  Tester
                </Button>
              </div>
            )}

            {/* Individual toggles */}
            {notificationItems.map((item) => (
              <div key={item.key} className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors">
                <div className="flex items-center gap-3 flex-1">
                  <item.icon className="h-5 w-5 text-muted-foreground" />
                  <div className="flex-1">
                    <label className="text-sm font-medium">
                      {item.label}
                      {item.premium && profile?.is_premium && (
                        <span className="ml-1 text-xs bg-primary/20 text-primary px-1.5 py-0.5 rounded">PREMIUM</span>
                      )}
                    </label>
                    <p className="text-xs text-muted-foreground">{item.desc}</p>
                  </div>
                </div>
                <Switch
                  checked={(profile as any)?.[item.key] === true}
                  onCheckedChange={(checked) => updatePrivacySettings(item.key, checked)}
                  disabled={profile?.notifications_enabled !== true || (item.premium && !profile?.is_premium)}
                />
              </div>
            ))}
          </div>
        </div>
      </ScrollArea>
    </motion.div>
  );
};
