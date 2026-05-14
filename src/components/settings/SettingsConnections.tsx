import { useState, useEffect, useCallback, type ReactNode } from "react";
import { useToast } from "@/hooks/use-toast";
import {
  ChevronLeft,
  ChevronRight,
  Gift,
  Phone,
  Share,
  Users,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { StravaConnect } from "@/components/StravaConnect";
import { InstagramConnect } from "@/components/InstagramConnect";
import { QRShareDialog } from "@/components/QRShareDialog";
import { ProfileShareScreen } from "@/components/profile-share/ProfileShareScreen";
import { ReferralDialog } from "@/components/ReferralDialog";
import { useShareProfile } from "@/hooks/useShareProfile";
import { motion } from "framer-motion";
import { IosFixedPageHeaderShell } from "@/components/layout/IosFixedPageHeaderShell";
import { useContacts } from "@/hooks/useContacts";

const ACTION_BLUE = "#007AFF";
const SETTINGS_BG = "#F2F2F7";
const SETTINGS_CARD_SHADOW =
  "0 1px 3px rgba(0,0,0,0.04), 0 0 0 0.5px rgba(0,0,0,0.06)";

const SF_FONT =
  "-apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif";

interface Profile {
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  allow_friend_suggestions?: boolean;
  strava_connected?: boolean;
  instagram_connected?: boolean;
}

interface SettingsConnectionsProps {
  onBack: () => void;
  onNavigateToSubscription: () => void;
}

function SettingsConnexionsSectionLabel({ children }: { children: ReactNode }) {
  return (
    <p
      style={{
        fontSize: 13,
        fontWeight: 800,
        color: "#8E8E93",
        letterSpacing: "0.08em",
        padding: "20px 16px 8px",
        margin: 0,
      }}
    >
      {children}
    </p>
  );
}

function SettingsConnexionsToggle({
  value,
  onChange,
}: {
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className="flex-shrink-0 transition-opacity active:opacity-80"
      style={{
        width: 51,
        height: 31,
        borderRadius: 9999,
        background: value ? ACTION_BLUE : "#E5E5EA",
        position: "relative",
        padding: 2,
        transition: "background 0.2s",
      }}
      aria-pressed={value}
    >
      <div
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

function SettingsConnexionsToggleRow({
  Icon,
  iconColor,
  label,
  subtitle,
  value,
  onChange,
}: {
  Icon: typeof Users;
  iconColor: string;
  label: string;
  subtitle: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center gap-3 px-3 py-3">
      <div
        className="flex flex-shrink-0 items-center justify-center"
        style={{ width: 36, height: 36, borderRadius: 10, background: iconColor }}
      >
        <Icon className="h-[19px] w-[19px] text-white" strokeWidth={2.4} />
      </div>
      <div className="min-w-0 flex-1">
        <p
          style={{
            fontSize: 17,
            fontWeight: 700,
            color: "#0A0F1F",
            margin: 0,
            letterSpacing: "-0.01em",
          }}
        >
          {label}
        </p>
        {subtitle ? (
          <p
            style={{
              fontSize: 13,
              color: "#8E8E93",
              margin: 0,
              marginTop: 2,
              lineHeight: 1.3,
            }}
          >
            {subtitle}
          </p>
        ) : null}
      </div>
      <SettingsConnexionsToggle value={value} onChange={onChange} />
    </div>
  );
}

function SettingsConnexionsRow({
  Icon,
  color,
  label,
  subtitle,
  onClick,
}: {
  Icon: typeof Share;
  color: string;
  label: string;
  subtitle: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 px-3 py-3 transition-colors active:bg-[#F8F8F8]"
    >
      <div
        className="flex flex-shrink-0 items-center justify-center"
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          background: color,
        }}
      >
        <Icon className="h-[19px] w-[19px] text-white" strokeWidth={2.4} />
      </div>
      <div className="min-w-0 flex-1 text-left">
        <p
          style={{
            fontSize: 17,
            fontWeight: 700,
            color: "#0A0F1F",
            margin: 0,
            letterSpacing: "-0.01em",
          }}
        >
          {label}
        </p>
        {subtitle ? (
          <p
            style={{
              fontSize: 13,
              color: "#8E8E93",
              margin: 0,
              marginTop: 2,
            }}
          >
            {subtitle}
          </p>
        ) : null}
      </div>
      <ChevronRight className="h-5 w-5 flex-shrink-0 text-[#C7C7CC]" />
    </button>
  );
}

export const SettingsConnections = ({
  onBack,
  onNavigateToSubscription,
}: SettingsConnectionsProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const {
    shareProfile,
    showProfileShare,
    setShowProfileShare,
    showQRDialog,
    setShowQRDialog,
    qrData,
  } = useShareProfile();
  const { isNative, hasPermission, requestPermissions } = useContacts();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [showReferralDialog, setShowReferralDialog] = useState(false);

  const fetchProfile = useCallback(async () => {
    const uid = user?.id;
    if (!uid) return;

    try {
      const { data, error } = await supabase.from("profiles").select("*").eq("user_id", uid).maybeSingle();

      if (error) throw error;
      setProfile(data);
    } catch (error) {
      console.error("Error fetching profile:", error);
    }
  }, [user?.id]);

  useEffect(() => {
    void fetchProfile();
  }, [fetchProfile]);

  const updatePrivacySettings = async (field: string, value: boolean) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from("profiles")
        .update({ [field]: value })
        .eq("user_id", user.id);

      if (error) throw error;
      setProfile((prev) => (prev ? { ...prev, [field]: value } : null));

      toast({
        title: "Paramètres mis à jour",
        description: "Vos préférences ont été sauvegardées.",
      });
    } catch (error: unknown) {
      console.error("Error updating settings:", error);
    }
  };

  const handleContactsAction = async () => {
    if (!isNative) {
      toast({
        title: "Fonction mobile uniquement",
        description:
          "L’accès aux contacts n’est disponible que sur l’application mobile",
        variant: "destructive",
      });
      return;
    }

    try {
      const granted = await requestPermissions();

      if (granted) {
        toast({
          title: "Permissions accordées",
          description: "Vous pouvez maintenant accéder à vos contacts",
        });
      } else {
        toast({
          title: "Permissions refusées",
          description:
            "Allez dans Paramètres > Applications > RunConnect > Autorisations > Contacts pour les activer manuellement",
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: "Erreur",
        description:
          "Impossible de demander les permissions. Vérifiez les paramètres de votre téléphone.",
        variant: "destructive",
      });
    }
  };

  const suggestionsOn = profile?.allow_friend_suggestions !== false;

  return (
    <motion.div
      initial={{ x: 100, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 100, opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="flex h-full min-h-0 min-w-0 max-w-full flex-col overflow-x-hidden"
      style={{
        background: SETTINGS_BG,
        fontFamily: SF_FONT,
      }}
    >
      <IosFixedPageHeaderShell
        className="min-h-0 flex-1"
        headerWrapperClassName="shrink-0"
        contentScroll
        scrollClassName="min-h-0"
        header={
          <div className="flex-shrink-0 px-4 pb-3 pt-3" style={{ background: SETTINGS_BG }}>
            <div className="flex items-center">
              <button
                type="button"
                onClick={onBack}
                className="flex items-center gap-0 transition-opacity active:opacity-70"
                style={{ width: 90 }}
              >
                <ChevronLeft className="h-6 w-6" color={ACTION_BLUE} strokeWidth={2.6} />
                <span
                  style={{
                    fontSize: 17,
                    fontWeight: 500,
                    color: ACTION_BLUE,
                    letterSpacing: "-0.01em",
                  }}
                >
                  Retour
                </span>
              </button>
              <h1
                className="flex-1 text-center"
                style={{
                  fontSize: 18,
                  fontWeight: 800,
                  color: "#0A0F1F",
                  letterSpacing: "-0.02em",
                  margin: 0,
                }}
              >
                Connexions
              </h1>
              <div style={{ width: 90 }} />
            </div>
          </div>
        }
      >
        <div
          className="ios-scroll-region min-h-0 flex-1 overflow-x-hidden overflow-y-auto pb-8"
          style={{ background: SETTINGS_BG }}
          data-tutorial="settings-connections-root"
        >
          <SettingsConnexionsSectionLabel>CONNEXIONS EXTERNES</SettingsConnexionsSectionLabel>
          <div data-tutorial="settings-connections-external">
            <StravaConnect
              profile={profile ?? undefined}
              isOwnProfile
              onProfileUpdate={fetchProfile}
              presentation="settings-pixel"
            />
            <InstagramConnect
              profile={profile ?? undefined}
              isOwnProfile
              onProfileUpdate={fetchProfile}
              presentation="settings-pixel"
            />
          </div>

          <div data-tutorial="settings-connections-social">
            <SettingsConnexionsSectionLabel>SOCIAL & PARTAGE</SettingsConnexionsSectionLabel>
          </div>
          <div
            className="mx-4 mb-3 overflow-hidden"
            style={{
              background: "white",
              borderRadius: 16,
              boxShadow: SETTINGS_CARD_SHADOW,
            }}
          >
                <SettingsConnexionsToggleRow
                  Icon={Users}
                  iconColor={ACTION_BLUE}
                  label="Suggestions d'amis"
                  subtitle="Autoriser les suggestions"
                  value={suggestionsOn}
                  onChange={(checked) =>
                    void updatePrivacySettings("allow_friend_suggestions", checked)
                  }
                />
                <div className="ml-[64px] h-px bg-[#E5E5EA]" />
                <SettingsConnexionsRow
                  Icon={Share}
                  color="#FF3B30"
                  label="Partager mon profil"
                  subtitle="Story, lien, modèles..."
                  onClick={async () => {
                    if (profile) {
                      const { data: profileData } = await supabase
                        .from("profiles")
                        .select("referral_code, avatar_url")
                        .eq("user_id", user?.id)
                        .single();

                      shareProfile({
                        username: profile.username,
                        displayName: profile.display_name,
                        bio: profile.bio,
                        avatarUrl: profileData?.avatar_url || profile.avatar_url,
                        referralCode: profileData?.referral_code,
                      });
                    }
                  }}
                />
                <div className="ml-[64px] h-px bg-[#E5E5EA]" />
                <div className="flex items-center gap-3 px-3 py-3">
                  <div
                    className="flex flex-shrink-0 items-center justify-center"
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      background: "#8E8E93",
                    }}
                  >
                    <Phone className="h-[19px] w-[19px] text-white" strokeWidth={2.4} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p
                      style={{
                        fontSize: 17,
                        fontWeight: 700,
                        color: "#0A0F1F",
                        margin: 0,
                        letterSpacing: "-0.01em",
                      }}
                    >
                      Accès aux contacts
                    </p>
                    <p
                      style={{
                        fontSize: 13,
                        color: "#8E8E93",
                        margin: 0,
                        marginTop: 2,
                      }}
                    >
                      {isNative
                        ? "Trouvez vos amis dans vos contacts"
                        : "Disponible uniquement sur mobile"}
                    </p>
                  </div>
                  {hasPermission ? (
                    <div
                      className="flex flex-shrink-0 items-center gap-1 px-3 py-1.5"
                      style={{
                        background: "white",
                        border: `1px solid ${ACTION_BLUE}`,
                        borderRadius: 9999,
                      }}
                    >
                      <span
                        style={{
                          fontSize: 13,
                          fontWeight: 800,
                          color: ACTION_BLUE,
                          letterSpacing: "-0.01em",
                        }}
                      >
                        Accordé ✓
                      </span>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => void handleContactsAction()}
                      className="flex flex-shrink-0 items-center gap-1 px-3 py-1.5 transition-opacity active:opacity-80 disabled:opacity-50"
                      style={{
                        background: "white",
                        border: `1px solid ${isNative ? ACTION_BLUE : "#C7C7CC"}`,
                        borderRadius: 9999,
                      }}
                    >
                      <span
                        style={{
                          fontSize: 13,
                          fontWeight: 800,
                          color: isNative ? ACTION_BLUE : "#8E8E93",
                          letterSpacing: "-0.01em",
                        }}
                      >
                        {isNative ? "Autoriser" : "Mobile"}
                      </span>
                    </button>
                  )}
                </div>
                <div className="ml-[64px] h-px bg-[#E5E5EA]" />
                <SettingsConnexionsRow
                  Icon={Gift}
                  color="#FF9500"
                  label="Parrainage"
                  subtitle="Invitez vos amis"
                  onClick={() => setShowReferralDialog(true)}
                />
                <div className="ml-[64px] h-px bg-[#E5E5EA]" />
                <SettingsConnexionsRow
                  Icon={Gift}
                  color="#FFCC00"
                  label="Soutenir l'application"
                  subtitle="Don ou abonnement premium"
                  onClick={onNavigateToSubscription}
                />
              </div>
        </div>
      </IosFixedPageHeaderShell>

      <ReferralDialog isOpen={showReferralDialog} onClose={() => setShowReferralDialog(false)} />

      <ProfileShareScreen
        open={showProfileShare}
        onClose={() => setShowProfileShare(false)}
        onOpenQr={() => {
          setShowProfileShare(false);
          setShowQRDialog(true);
        }}
      />

      {qrData ? (
        <QRShareDialog
          open={showQRDialog}
          onOpenChange={setShowQRDialog}
          profileUrl={qrData.profileUrl}
          username={qrData.username}
          displayName={qrData.displayName}
          avatarUrl={qrData.avatarUrl}
          referralCode={qrData.referralCode}
        />
      ) : null}
    </motion.div>
  );
};
