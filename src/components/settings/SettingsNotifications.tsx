import { useState, useEffect, useRef, useCallback, type ComponentType, type CSSProperties, type ReactNode } from "react";
import type { LucideProps } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Bell, ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { motion } from "framer-motion";
import { PushDiagnosticPanel } from "./PushDiagnosticPanel";
import { IosFixedPageHeaderShell } from "@/components/layout/IosFixedPageHeaderShell";
import {
  NOTIFICATION_PREFERENCE_SECTIONS,
  NOTIFICATION_PROFILE_SELECT,
  NOTIFICATION_PUSH_ROW,
  type NotificationProfileColumn,
} from "@/lib/notificationPreferenceConfig";

/** Tokens maquette Réglages (RunConnect.jsx). */
const ACTION_BLUE = "#007AFF";
const SETTINGS_BG = "#F2F2F7";
const CARD_SHADOW = "0 1px 3px rgba(0,0,0,0.04), 0 0 0 0.5px rgba(0,0,0,0.06)";

type IconComp = ComponentType<LucideProps>;

type Profile = {
  notifications_enabled?: boolean;
  is_premium?: boolean;
} & Partial<Record<NotificationProfileColumn, boolean>>;

function SettingsMaquetteSubHeader({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <div className="flex shrink-0 items-center px-4 pb-3 pt-3" style={{ background: SETTINGS_BG }}>
      <button
        type="button"
        onClick={onBack}
        className="flex shrink-0 items-center gap-0 transition-opacity active:opacity-70"
        style={{ width: 90 }}
      >
        <ChevronLeft className="size-6" color={ACTION_BLUE} strokeWidth={2.6} />
        <span className="-tracking-[0.01em]" style={{ fontSize: 17, fontWeight: 500, color: ACTION_BLUE }}>
          Retour
        </span>
      </button>
      <h1
        className="flex-1 text-center -tracking-[0.02em]"
        style={{ fontSize: 18, fontWeight: 800, color: "#0A0F1F", margin: 0 }}
      >
        {title}
      </h1>
      <div style={{ width: 90 }} aria-hidden />
    </div>
  );
}

function SettingsMaquetteToggle({
  value,
  onChange,
  disabled,
}: {
  value: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      aria-pressed={value}
      disabled={disabled}
      onClick={() => !disabled && onChange(!value)}
      className="shrink-0 transition-opacity disabled:opacity-40 active:not-disabled:opacity-80"
      style={{
        width: 51,
        height: 31,
        borderRadius: 9999,
        background: value ? ACTION_BLUE : "#E5E5EA",
        opacity: disabled ? 0.45 : 1,
        position: "relative",
        padding: 2,
        transition: "background 0.2s",
      }}
    >
      <motion.div
        style={{
          width: 27,
          height: 27,
          borderRadius: "50%",
          background: "white",
          boxShadow: "0 2px 4px rgba(0,0,0,0.15)",
          transition: "transform 0.2s",
          transform: value ? "translateX(20px)" : "translateX(0)",
        }}
      />
    </button>
  );
}

function SettingsMaquetteSectionLabel({ children }: { children: ReactNode }) {
  return (
    <p
      className="tracking-[0.08em]"
      style={{
        fontSize: 13,
        fontWeight: 800,
        color: "#8E8E93",
        padding: "20px 16px 8px",
        margin: 0,
      }}
    >
      {children}
    </p>
  );
}

function maquetteCardSx(): CSSProperties {
  return {
    background: "white",
    borderRadius: 16,
    boxShadow: CARD_SHADOW,
  };
}

function SettingsMaquetteToggleRow({
  Icon,
  iconColor,
  label,
  subtitle,
  value,
  onChange,
  premium,
  disabled,
}: {
  Icon: IconComp;
  iconColor: string;
  label: string;
  subtitle?: string;
  value: boolean;
  onChange: (v: boolean) => void;
  premium?: boolean;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 px-3 py-3">
      <div
        className="flex shrink-0 items-center justify-center"
        style={{ width: 36, height: 36, borderRadius: 10, background: iconColor }}
      >
        <Icon className="size-[19px] text-white" strokeWidth={2.4} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="-tracking-[0.01em] m-0" style={{ fontSize: 17, fontWeight: 700, color: "#0A0F1F" }}>
            {label}
          </p>
          {premium ? (
            <span
              className="rounded-full uppercase"
              style={{
                fontSize: 10,
                fontWeight: 800,
                color: ACTION_BLUE,
                background: `${ACTION_BLUE}1A`,
                padding: "2px 8px",
                letterSpacing: "0.06em",
              }}
            >
              PREMIUM
            </span>
          ) : null}
        </div>
        {subtitle ? (
          <p className="m-0 mt-0.5 leading-[1.3]" style={{ fontSize: 13, color: "#8E8E93" }}>
            {subtitle}
          </p>
        ) : null}
      </div>
      <SettingsMaquetteToggle value={value} onChange={onChange} disabled={disabled} />
    </div>
  );
}

function SettingsMaquetteChevronRow({
  Icon,
  iconColor,
  label,
  subtitle,
  onClick,
}: {
  Icon: IconComp;
  iconColor: string;
  label: string;
  subtitle?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className="flex w-full touch-manipulation items-center gap-3 px-3 py-3 transition-colors active:bg-[#F8F8F8]"
      onClick={onClick}
    >
      <div
        className="flex shrink-0 items-center justify-center"
        style={{ width: 36, height: 36, borderRadius: 10, background: iconColor }}
      >
        <Icon className="size-[19px] text-white" strokeWidth={2.4} />
      </div>
      <div className="min-w-0 flex-1 text-left">
        <p className="-tracking-[0.01em] m-0" style={{ fontSize: 17, fontWeight: 700, color: "#0A0F1F" }}>
          {label}
        </p>
        {subtitle ? (
          <p className="m-0 mt-0.5" style={{ fontSize: 13, color: "#8E8E93" }}>
            {subtitle}
          </p>
        ) : null}
      </div>
      <ChevronRight className="size-5 shrink-0 text-[#C7C7CC]" />
    </button>
  );
}

interface SettingsNotificationsProps {
  onBack: () => void;
}

export const SettingsNotifications = ({ onBack }: SettingsNotificationsProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const {
    isRegistered,
    requestPermissions,
    isNative,
    testNotification,
    checkPermissionStatus,
    pushDebug,
    refreshDebugFromBackend,
    permissionStatus,
  } = usePushNotifications();
  const [profile, setProfile] = useState<Profile | null>(null);
  const pushPermissionInFlight = useRef(false);

  const fetchProfile = useCallback(async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select(NOTIFICATION_PROFILE_SELECT)
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;
      setProfile(data as unknown as Profile);
    } catch (error) {
      console.error("Error fetching profile:", error);
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    void fetchProfile();
    void refreshDebugFromBackend();
  }, [user, fetchProfile, refreshDebugFromBackend]);

  const updatePrivacySettings = async (field: string, value: boolean) => {
    if (!user) return;
    try {
      const { error } = await supabase.from("profiles").update({ [field]: value }).eq("user_id", user.id);

      if (error) throw error;
      setProfile((prev) => (prev ? { ...prev, [field]: value } : null));
      toast({ title: "Paramètres mis à jour", description: "Vos préférences de notifications ont été sauvegardées." });

      if (field === "notifications_enabled" && value && isNative) {
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
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Erreur inconnue";
      toast({ title: "Erreur", description: msg, variant: "destructive" });
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
          const { data: profileData } = await supabase.from("profiles").select("push_token").eq("user_id", user.id).single();

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
        if (isNative && typeof (window as unknown as { AndroidBridge?: { openSettings?: () => void } }).AndroidBridge?.openSettings === "function") {
          (window as unknown as { AndroidBridge: { openSettings: () => void } }).AndroidBridge.openSettings();
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

  const handleTestTap = async () => {
    if (!profile?.notifications_enabled) {
      toast({ title: "Notifications push", description: "Activez d'abord les notifications push.", variant: "destructive" });
      return;
    }
    await testNotification();
  };

  const pushOn = profile?.notifications_enabled === true;
  const typesDisabled = !pushOn;
  const showAuthorizeRow = !isRegistered && isNative && pushOn;
  const PushIcon = NOTIFICATION_PUSH_ROW.icon;

  const renderPreferenceCard = (section: (typeof NOTIFICATION_PREFERENCE_SECTIONS)[number]) => (
    <div key={section.id} data-tutorial={`settings-notifications-${section.id}`}>
      <SettingsMaquetteSectionLabel>{section.label}</SettingsMaquetteSectionLabel>
      <div className="mx-4 overflow-hidden" style={maquetteCardSx()}>
        {section.items.map((item, index) => {
          const rowDisabled = typesDisabled || !!(item.premium && !profile?.is_premium);
          const checked = profile?.[item.key] === true;
          return (
            <div key={item.key}>
              {index > 0 ? <div className="ml-[64px] h-px bg-[#E5E5EA]" /> : null}
              <SettingsMaquetteToggleRow
                Icon={item.icon}
                iconColor={item.iconColor}
                label={item.label}
                subtitle={item.desc}
                premium={!!item.premium}
                value={checked}
                disabled={rowDisabled}
                onChange={(v) => {
                  if (!user || typesDisabled || (item.premium && !profile?.is_premium)) return;
                  void updatePrivacySettings(item.key, v);
                }}
              />
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <motion.div
      initial={{ x: 100, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 100, opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="flex h-full min-h-0 min-w-0 max-w-full flex-col overflow-x-hidden bg-[#F2F2F7]"
      style={{
        fontFamily:
          "-apple-system, BlinkMacSystemFont, 'SF Pro Display', SF Pro Display, system-ui, sans-serif",
      }}
    >
      <IosFixedPageHeaderShell
        className="min-h-0 flex-1"
        headerWrapperClassName="shrink-0"
        contentScroll
        scrollClassName="min-h-0 bg-[#F2F2F7]"
        header={
          <div className="shrink-0">
            <SettingsMaquetteSubHeader title="Notifications" onBack={onBack} />
          </div>
        }
      >
        <div className="ios-scroll-region min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch]">
          <div className="min-w-0 max-w-full pb-8" data-tutorial="settings-notifications-root">
            <div data-tutorial="settings-notifications-push">
              <SettingsMaquetteSectionLabel>NOTIFICATIONS PUSH</SettingsMaquetteSectionLabel>
              <div className="mx-4 overflow-hidden" style={maquetteCardSx()}>
                <SettingsMaquetteToggleRow
                  Icon={PushIcon}
                  iconColor={NOTIFICATION_PUSH_ROW.iconColor}
                  label={NOTIFICATION_PUSH_ROW.label}
                  subtitle={pushOn ? "Activées" : "Désactivées"}
                  value={pushOn}
                  onChange={(v) => void updatePrivacySettings("notifications_enabled", v)}
                />
                <div className="ml-[64px] h-px bg-[#E5E5EA]" />
                {showAuthorizeRow ? (
                  <>
                    <SettingsMaquetteChevronRow
                      Icon={Bell}
                      iconColor={ACTION_BLUE}
                      label="Autoriser les notifications"
                      subtitle="Activez les permissions système"
                      onClick={() => void handleNotificationToggle()}
                    />
                    <div className="ml-[64px] h-px bg-[#E5E5EA]" />
                  </>
                ) : null}
                <SettingsMaquetteChevronRow
                  Icon={Bell}
                  iconColor="#5856D6"
                  label="Tester les notifications"
                  subtitle="Envoyer une notification de test"
                  onClick={() => void handleTestTap()}
                />
              </div>
            </div>

            {NOTIFICATION_PREFERENCE_SECTIONS.map((section) => renderPreferenceCard(section))}

            {import.meta.env.DEV ? (
              <div className="mt-6">
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
              </div>
            ) : null}
          </div>
        </div>
      </IosFixedPageHeaderShell>
    </motion.div>
  );
};
