import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Bell, Smartphone, Users, MessageCircle, Play, CheckCircle, UserCheck, Bug, ArrowLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { motion } from "framer-motion";
import { PushDiagnosticPanel } from "./PushDiagnosticPanel";
import { cn } from "@/lib/utils";
import { IosFixedPageHeaderShell } from "@/components/layout/IosFixedPageHeaderShell";
import { IosPageHeaderBar } from "@/components/layout/IosPageHeaderBar";

interface Profile {
  notifications_enabled?: boolean;
  notif_boost_nearby?: boolean;
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
  const { isRegistered, requestPermissions, isNative, testNotification, checkPermissionStatus, pushDebug, refreshDebugFromBackend, permissionStatus } = usePushNotifications();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  /** Évite double-appui pendant la demande système (sinon sensation de bouton « gelé »). */
  const pushPermissionInFlight = useRef(false);

  useEffect(() => {
    if (user) {
      fetchProfile();
      refreshDebugFromBackend();
    }
  }, [user]);

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('notifications_enabled, notif_follow_request, notif_message, notif_session_request, notif_friend_session, notif_club_invitation, notif_session_accepted, notif_presence_confirmed, is_premium' as any)
        .eq('user_id', user?.id)
        .maybeSingle();

      if (error) throw error;
      setProfile(data as any);
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
      toast({ title: "Paramètres mis à jour", description: "Vos préférences de notifications ont été sauvegardées." });

      if (field === "notifications_enabled" && value && isNative) {
        /* Ne pas await ici : la modale iOS/Android + le Switch Radix sur le même tick = UI bloquée / clics ignorés. */
        window.setTimeout(() => {
          if (pushPermissionInFlight.current) return;
          pushPermissionInFlight.current = true;
          void (async () => {
            try {
              const granted = await requestPermissions();
              if (granted) await checkPermissionStatus();
            } finally {
              pushPermissionInFlight.current = false;
            }
          })();
        }, 0);
      }
    } catch (error: any) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    }
  };

  const handleNotificationToggle = async () => {
    if (pushPermissionInFlight.current) return;
    pushPermissionInFlight.current = true;
    try {
      if (!isRegistered) {
        const granted = await requestPermissions();
        if (granted && user) {
          await checkPermissionStatus();
          await new Promise((resolve) => setTimeout(resolve, 3000));
          const { data: profileData } = await supabase
            .from("profiles")
            .select("push_token")
            .eq("user_id", user.id)
            .single();

          if (!profileData?.push_token) {
            toast({
              title: "⚠️ Token manquant",
              description: "Permissions OK mais token non reçu. Relancez l'app.",
              variant: "destructive",
            });
          } else {
            toast({ title: "✅ Notifications activées", description: "Vous recevrez les alertes de RunConnect" });
          }
        } else if (!granted) {
          toast({ title: "Permission refusée", description: "Ouvrez les paramètres pour activer", variant: "destructive" });
        }
      } else {
        if (isNative && typeof (window as any).AndroidBridge?.openSettings === "function") {
          (window as any).AndroidBridge.openSettings();
        } else {
          toast({
            title: "Paramètres système",
            description: "Réglages → RunConnect → Notifications",
            variant: "destructive",
          });
        }
      }
    } finally {
      pushPermissionInFlight.current = false;
    }
  };

  const notificationItems = [
    { key: 'notif_boost_nearby', icon: Bell, color: 'bg-amber-500', label: 'Boosts proches', desc: 'Séances boostées qui démarrent bientôt autour de vous' },
    { key: 'notif_follow_request', icon: Users, color: 'bg-primary', label: 'Demandes de suivi', desc: 'Quand quelqu\'un vous suit' },
    { key: 'notif_message', icon: MessageCircle, color: 'bg-green-500', label: 'Messages', desc: 'Nouveaux messages reçus' },
    { key: 'notif_session_request', icon: Play, color: 'bg-orange-500', label: 'Demandes de session', desc: 'Demandes de participation' },
    { key: 'notif_friend_session', icon: Users, color: 'bg-violet-500', label: 'Sessions d\'amis', desc: 'Vos amis créent une session', premium: true },
    { key: 'notif_club_invitation', icon: Users, color: 'bg-destructive', label: 'Invitations de club', desc: 'Invitations à rejoindre un club' },
    { key: 'notif_session_accepted', icon: CheckCircle, color: 'bg-green-500', label: 'Participants acceptés', desc: 'Quelqu\'un rejoint votre session' },
    { key: 'notif_presence_confirmed', icon: UserCheck, color: 'bg-primary', label: 'Confirmation de présence', desc: 'L\'organisateur confirme votre présence' },
  ];


  return (
    <motion.div 
      initial={{ x: 100, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 100, opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="flex h-full min-h-0 min-w-0 max-w-full flex-col overflow-x-hidden bg-secondary"
    >
      <IosFixedPageHeaderShell
        className="min-h-0 flex-1"
        headerWrapperClassName="shrink-0"
        contentScroll
        scrollClassName="min-h-0 bg-secondary"
        header={
          <div className="border-b border-border bg-card">
            <IosPageHeaderBar
              left={
                <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full" onClick={onBack}>
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              }
              title="Notifications"
            />
          </div>
        }
      >
        <div className="ios-scroll-region min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch]">
        <div className="min-w-0 max-w-full space-y-6 overflow-x-hidden py-6">
          {/* Main Toggle */}
          <div className="space-y-2" data-tutorial="settings-notifications-push">
            <h3 className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wider px-4 ios-shell:px-2.5">
              Notifications Push
            </h3>
            <div className="bg-card overflow-hidden">
              <div className="flex min-w-0 items-center gap-2.5 px-4 ios-shell:px-2.5 py-2.5">
                <div className="ios-list-row-icon bg-[#FF3B30]">
                  <Smartphone className="h-[18px] w-[18px] text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[15px] font-medium">Notifications push</p>
                  <p className="text-[13px] text-muted-foreground">
                    {profile?.notifications_enabled ? "Activées" : "Désactivées"}
                  </p>
                </div>
                <Switch
                  checked={profile?.notifications_enabled === true}
                  onCheckedChange={(checked) => updatePrivacySettings('notifications_enabled', checked)}
                />
              </div>

              {profile?.notifications_enabled === false && (
                <>
                  <div className="h-px bg-border" />
                  <div className="px-4 ios-shell:px-2.5 py-2.5 bg-orange-500/10">
                    <p className="text-[13px] text-orange-500">⚠️ Les préférences ci-dessous sont inactives</p>
                  </div>
                </>
              )}

              {!isRegistered && isNative && profile?.notifications_enabled === true && (
                <>
                  <div className="h-px bg-border" />
                  <button
                    type="button"
                    onClick={() => void handleNotificationToggle()}
                    className="relative z-10 flex w-full touch-manipulation items-center gap-2.5 px-4 ios-shell:px-2.5 py-2.5 bg-primary/10 transition-colors active:bg-primary/20"
                  >
                    <div className="ios-list-row-icon bg-primary">
                      <Bell className="h-[18px] w-[18px] text-primary-foreground" />
                    </div>
                    <div className="min-w-0 flex-1 text-left">
                      <p className="truncate text-[15px] font-medium text-primary">Autoriser les notifications</p>
                      <p className="text-[13px] text-primary/70">Activez les permissions</p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-primary/50" />
                  </button>
                </>
              )}

              {profile?.notifications_enabled === true && (
                <>
                  <div className="h-px bg-border ml-[54px]" />
                  <button
                    type="button"
                    onClick={() => void testNotification()}
                    className="relative z-10 flex w-full min-w-0 touch-manipulation items-center gap-3 px-4 ios-shell:px-2.5 py-3 active:bg-secondary/50 transition-colors"
                  >
                    <div className="h-[30px] w-[30px] rounded-[7px] bg-[#5856D6] flex items-center justify-center">
                      <Bug className="h-[18px] w-[18px] text-white" />
                    </div>
                    <div className="flex-1 text-left">
                      <p className="text-[15px] font-medium">Tester les notifications</p>
                      <p className="text-[13px] text-muted-foreground">Envoyer une notification de test</p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground/40" />
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Individual Toggles */}
          <div className="space-y-2" data-tutorial="settings-notifications-types">
            <h3 className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wider px-4 ios-shell:px-2.5">
              Types de notifications
            </h3>
            <div className="bg-card overflow-hidden">
              {notificationItems.map((item, index) => (
                <div key={item.key}>
                  <div className="flex min-w-0 items-center gap-2.5 px-4 ios-shell:px-2.5 py-2.5">
                    <div className={cn("ios-list-row-icon", item.color)}>
                      <item.icon className="h-[18px] w-[18px] text-white" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-[15px] font-medium">{item.label}</p>
                        {item.premium && profile?.is_premium && (
                          <span className="text-[11px] bg-primary/20 text-primary px-1.5 py-0.5 rounded font-medium">PREMIUM</span>
                        )}
                      </div>
                      <p className="mt-px text-[13px] leading-snug text-muted-foreground">{item.desc}</p>
                    </div>
                    <Switch
                      checked={(profile as any)?.[item.key] === true}
                      onCheckedChange={(checked) => updatePrivacySettings(item.key, checked)}
                      disabled={profile?.notifications_enabled !== true || (item.premium && !profile?.is_premium)}
                    />
                  </div>
                  {index < notificationItems.length - 1 && <div className="ios-list-row-inset-sep" />}
                </div>
              ))}
            </div>
          </div>

          {/* ─── Diagnostic Push iOS (dev only) ─── */}
          {import.meta.env.DEV && (
            <PushDiagnosticPanel
              pushDebug={pushDebug}
              permissionStatus={permissionStatus}
              isNative={isNative}
              isRegistered={isRegistered}
              userId={user?.id}
              requestPermissions={requestPermissions}
              checkPermissionStatus={checkPermissionStatus}
              refreshDebugFromBackend={refreshDebugFromBackend}
            />
          )}
        </div>
      </div>
      </IosFixedPageHeaderShell>
    </motion.div>
  );
};
