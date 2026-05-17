import {
  type LucideIcon,
  Shield,
  FileText,
  Info,
  ChevronRight,
  ChevronLeft,
  BarChart3,
  Key,
  Smartphone,
  Download,
  Trash2,
  Check,
} from "lucide-react";
import { useState, useEffect, useCallback, type ReactNode } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { motion } from "framer-motion";
import {
  getAnalyticsConsent,
  isAnalyticsFeatureEnabledInBuild,
  setAnalyticsConsent,
} from "@/lib/analyticsConsent";
import { IosFixedPageHeaderShell } from "@/components/layout/IosFixedPageHeaderShell";

const SETTINGS_BG = "#F2F2F7";
const ACTION_BLUE = "#007AFF";
const CARD_SHADOW = "0 1px 3px rgba(0,0,0,0.04), 0 0 0 0.5px rgba(0,0,0,0.06)";

function errMessage(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

type AuthMfaApi = {
  listFactors: () => Promise<{ data?: { totp?: Array<{ id: string; status: string }> } }>;
  unenroll: (args: { factorId: string }) => Promise<unknown>;
  enroll: (args: { factorType: "totp" }) => Promise<{ data?: { totp?: { qr_code?: string } } }>;
};

function getAuthMfa(auth: typeof supabase.auth): AuthMfaApi | undefined {
  return (auth as { mfa?: AuthMfaApi }).mfa;
}

interface Profile {
  rgpd_accepted?: boolean;
  security_rules_accepted?: boolean;
}

interface SettingsPrivacyProps {
  onBack: () => void;
  onClose: () => void;
}

function PrivacyMaquetteSectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="m-0 px-4 pb-2 pt-5 text-[13px] font-extrabold uppercase tracking-[0.08em] text-[#8E8E93]">
      {children}
    </p>
  );
}

function PrivacyMaquetteCard({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`mx-4 overflow-hidden rounded-2xl bg-white ${className}`} style={{ boxShadow: CARD_SHADOW }}>
      {children}
    </div>
  );
}

function PrivacyMaquetteToggle({ value, onChange }: { value: boolean; onChange: (next: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className="relative shrink-0 rounded-full p-0.5 transition-colors active:opacity-80"
      style={{
        width: 51,
        height: 31,
        background: value ? ACTION_BLUE : "#E5E5EA",
      }}
      aria-pressed={value}
    >
      <div
        className="rounded-full bg-white shadow-[0_2px_4px_rgba(0,0,0,0.15)] transition-transform duration-200"
        style={{
          width: 27,
          height: 27,
          transform: value ? "translateX(20px)" : "translateX(0)",
        }}
      />
    </button>
  );
}

function PrivacyMaquetteToggleRow({
  Icon,
  iconColor,
  label,
  subtitle,
  value,
  onChange,
}: {
  Icon: LucideIcon;
  iconColor: string;
  label: string;
  subtitle?: string;
  value: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <div className="flex min-w-0 items-center gap-3 px-3 py-3">
      <div
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px]"
        style={{ background: iconColor }}
      >
        <Icon className="h-[19px] w-[19px] text-white" strokeWidth={2.4} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="m-0 text-[17px] font-bold tracking-tight text-[#0A0F1F]" style={{ letterSpacing: "-0.01em" }}>
          {label}
        </p>
        {subtitle ? (
          <p className="m-0 mt-0.5 text-[13px] leading-[1.3] text-[#8E8E93]">{subtitle}</p>
        ) : null}
      </div>
      <PrivacyMaquetteToggle value={value} onChange={onChange} />
    </div>
  );
}

function PrivacyMaquetteActionRow({
  Icon,
  iconColor,
  label,
  subtitle,
  action,
}: {
  Icon: LucideIcon;
  iconColor: string;
  label: string;
  subtitle?: string;
  action: React.ReactNode;
}) {
  return (
    <div className="flex min-w-0 items-center gap-3 px-3 py-3">
      <div
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px]"
        style={{ background: iconColor }}
      >
        <Icon className="h-[19px] w-[19px] text-white" strokeWidth={2.4} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="m-0 text-[17px] font-bold tracking-tight text-[#0A0F1F]" style={{ letterSpacing: "-0.01em" }}>
          {label}
        </p>
        {subtitle ? (
          <p className="m-0 mt-0.5 text-[13px] text-[#8E8E93]">{subtitle}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

function PrivacyMaquetteInsetSep() {
  return <div className="ml-16 h-px bg-[#E5E5EA]" />;
}

export const SettingsPrivacy = ({ onBack, onClose }: SettingsPrivacyProps) => {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [analyticsOptIn, setAnalyticsOptIn] = useState(() => getAnalyticsConsent() === "granted");
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [mfaLoading, setMfaLoading] = useState(false);
  const [dataSelection, setDataSelection] = useState<Record<string, boolean>>({
    profile: true,
    records: true,
    sessions: false,
    social: false,
    stories: false,
  });
  const [dataLoading, setDataLoading] = useState(false);

  const syncAnalyticsToggle = () => {
    setAnalyticsOptIn(getAnalyticsConsent() === "granted");
  };

  const fetchProfile = useCallback(async () => {
    if (!user?.id) return;
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("rgpd_accepted, security_rules_accepted")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;
      setProfile(data);
    } catch (error) {
      console.error("Error fetching profile:", error);
    }
  }, [user?.id]);

  const loadMfaStatus = useCallback(async () => {
    try {
      const mfaApi = getAuthMfa(supabase.auth);
      if (!mfaApi?.listFactors) {
        setMfaEnabled(false);
        return;
      }
      const res = await mfaApi.listFactors();
      const factors = res?.data?.totp ?? [];
      setMfaEnabled(factors.some((f) => f.status === "verified"));
    } catch {
      setMfaEnabled(false);
    }
  }, []);

  useEffect(() => {
    if (user) {
      void fetchProfile();
      void loadMfaStatus();
    }
  }, [user, fetchProfile, loadMfaStatus]);

  useEffect(() => {
    syncAnalyticsToggle();
    const onChange = () => syncAnalyticsToggle();
    window.addEventListener("runconnect-analytics-consent-changed", onChange);
    return () => window.removeEventListener("runconnect-analytics-consent-changed", onChange);
  }, []);

  const toggleMfa = async () => {
    setMfaLoading(true);
    try {
      const mfaApi = getAuthMfa(supabase.auth);
      if (!mfaApi?.listFactors) {
        toast({
          title: "2FA non disponible",
          description: "Votre environnement n'expose pas encore l'API MFA.",
          variant: "destructive",
        });
        return;
      }

      const listed = await mfaApi.listFactors();
      const totpFactors = listed?.data?.totp ?? [];
      const verifiedFactor = totpFactors.find((f) => f.status === "verified");

      if (verifiedFactor) {
        await mfaApi.unenroll({ factorId: verifiedFactor.id });
        setMfaEnabled(false);
        toast({ title: "2FA desactivee", description: "La verification a 2 facteurs est desactivee." });
        return;
      }

      const enrollment = await mfaApi.enroll({ factorType: "totp" });
      const qr = enrollment?.data?.totp?.qr_code;
      if (!qr) {
        toast({
          title: "2FA initialisee",
          description: "Scannez le QR dans une app TOTP puis confirmez lors d'une prochaine connexion.",
        });
      } else {
        toast({
          title: "2FA initialisee",
          description: "Scannez le QR dans votre app d'authentification. Activation en cours.",
        });
      }
      setMfaEnabled(true);
    } catch (error: unknown) {
      toast({
        title: "Erreur 2FA",
        description: errMessage(error) || "Impossible de mettre a jour la 2FA.",
        variant: "destructive",
      });
    } finally {
      setMfaLoading(false);
    }
  };

  const signOutAllSessions = async () => {
    try {
      await supabase.auth.signOut({ scope: "global" });
      toast({
        title: "Sessions deconnectees",
        description: "Toutes les sessions ont ete revoquees. Reconnectez-vous.",
      });
      onClose();
      setTimeout(() => {
        void signOut();
      }, 200);
    } catch (error: unknown) {
      toast({ title: "Erreur", description: errMessage(error), variant: "destructive" });
    }
  };

  const selectedKeys = () => Object.entries(dataSelection).filter(([, v]) => v).map(([k]) => k);

  const exportSelectedData = async () => {
    if (!user?.id) return;
    const selections = selectedKeys();
    if (selections.length === 0) {
      toast({ title: "Selection vide", description: "Choisissez au moins un bloc de donnees.", variant: "destructive" });
      return;
    }
    setDataLoading(true);
    try {
      const payload: Record<string, unknown> = {
        exported_at: new Date().toISOString(),
        user_id: user.id,
      };

      if (dataSelection.profile) {
        const { data } = await supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle();
        payload.profile = data ?? null;
      }
      if (dataSelection.records) {
        const { data } = await supabase.from("profile_sport_records").select("*").eq("user_id", user.id);
        payload.records = data ?? [];
      }
      if (dataSelection.sessions) {
        const [{ data: organized }, { data: joined }] = await Promise.all([
          supabase.from("sessions").select("*").eq("organizer_id", user.id),
          supabase.from("session_participants").select("*").eq("user_id", user.id),
        ]);
        payload.sessions = { organized: organized ?? [], joined: joined ?? [] };
      }
      if (dataSelection.social) {
        const [{ data: following }, { data: followers }] = await Promise.all([
          supabase.from("user_follows").select("*").eq("follower_id", user.id),
          supabase.from("user_follows").select("*").eq("following_id", user.id),
        ]);
        payload.social = { following: following ?? [], followers: followers ?? [] };
      }
      if (dataSelection.stories) {
        const [{ data: stories }, { data: highlights }] = await Promise.all([
          supabase.from("session_stories").select("*").eq("author_id", user.id),
          supabase.from("profile_story_highlights").select("*").eq("owner_id", user.id),
        ]);
        payload.stories = { stories: stories ?? [], highlights: highlights ?? [] };
      }

      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `runconnect-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);

      toast({ title: "Export termine", description: "Le fichier JSON a ete telecharge." });
    } catch (error: unknown) {
      toast({ title: "Erreur export", description: errMessage(error), variant: "destructive" });
    } finally {
      setDataLoading(false);
    }
  };

  const deleteSelectedData = async () => {
    if (!user?.id) return;
    const selections = selectedKeys();
    if (selections.length === 0) {
      toast({ title: "Selection vide", description: "Choisissez au moins un bloc de donnees.", variant: "destructive" });
      return;
    }
    setDataLoading(true);
    try {
      if (dataSelection.records) {
        await supabase.from("profile_sport_records").delete().eq("user_id", user.id);
      }
      if (dataSelection.sessions) {
        await supabase.from("session_participants").delete().eq("user_id", user.id);
      }
      if (dataSelection.social) {
        await supabase.from("user_follows").delete().eq("follower_id", user.id);
        await supabase.from("user_follows").delete().eq("following_id", user.id);
      }
      if (dataSelection.stories) {
        await supabase.from("profile_story_highlights").delete().eq("owner_id", user.id);
        await supabase.from("session_stories").delete().eq("author_id", user.id);
      }
      if (dataSelection.profile) {
        await supabase.from("profiles").update({ bio: null, phone: null }).eq("user_id", user.id);
      }

      toast({ title: "Suppression terminee", description: "Les donnees selectionnees ont ete supprimees." });
    } catch (error: unknown) {
      toast({ title: "Erreur suppression", description: errMessage(error), variant: "destructive" });
    } finally {
      setDataLoading(false);
    }
  };

  const handleRevokeConsent = async () => {
    if (!user) return;
    try {
      await supabase
        .from("profiles")
        .update({
          rgpd_accepted: false,
          security_rules_accepted: false,
        })
        .eq("user_id", user.id);

      toast({
        title: "Consentement révoqué",
        description: "Vous allez être déconnecté.",
      });

      onClose();
      setTimeout(() => {
        void signOut();
      }, 200);
    } catch (error) {
      console.error("Erreur révocation:", error);
      toast({
        title: "Erreur",
        description: "Impossible de révoquer le consentement.",
        variant: "destructive",
      });
    }
  };

  const analyticsSubtitle = isAnalyticsFeatureEnabledInBuild()
    ? "Pages vues et événements agrégés (ex. Google Analytics) si vous acceptez."
    : "Non activé sur cette version. Votre choix sera appliqué si l'éditeur active l'outil.";

  const pillOutlineBtn =
    "rounded-full border border-[#C7C7CC] bg-white px-4 py-1.5 text-[14px] font-extrabold tracking-tight text-[#0A0F1F] transition-colors active:bg-[#F8F8F8] disabled:pointer-events-none disabled:opacity-50";

  const dataRows = [
    { key: "profile" as const, label: "Profil (bio, telephone)" },
    { key: "records" as const, label: "Records sportifs" },
    { key: "sessions" as const, label: "Participation aux séances" },
    { key: "social" as const, label: "Relations sociales (abonnements)" },
    { key: "stories" as const, label: "Stories et highlights" },
  ];

  return (
    <motion.div
      initial={{ x: 100, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 100, opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="flex h-full min-h-0 min-w-0 max-w-full flex-col overflow-x-hidden"
      style={{
        background: SETTINGS_BG,
        fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif",
      }}
    >
      <IosFixedPageHeaderShell
        className="min-h-0 flex-1"
        headerWrapperClassName="shrink-0"
        contentScroll
        scrollClassName="min-h-0 bg-[#F2F2F7]"
        header={
          <div className="flex shrink-0 items-center bg-[#F2F2F7] px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
            <button
              type="button"
              onClick={onBack}
              className="flex shrink-0 items-center gap-0 transition-opacity active:opacity-70"
              style={{ width: 90 }}
            >
              <ChevronLeft className="h-6 w-6 shrink-0 text-[#007AFF]" strokeWidth={2.6} aria-hidden />
              <span className="text-[17px] font-medium tracking-tight text-[#007AFF]" style={{ letterSpacing: "-0.01em" }}>
                Retour
              </span>
            </button>
            <h1
              className="m-0 min-w-0 flex-1 text-center text-[18px] font-extrabold tracking-tight text-[#0A0F1F]"
              style={{ letterSpacing: "-0.02em" }}
            >
              Confidentialité
            </h1>
            <div className="shrink-0" style={{ width: 90 }} aria-hidden />
          </div>
        }
      >
        <div className="ios-scroll-region min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch]">
          <div className="min-w-0 max-w-full pb-[max(2rem,env(safe-area-inset-bottom))]">
          <div data-tutorial="settings-privacy-consents">
            <PrivacyMaquetteSectionLabel>CONSENTEMENTS</PrivacyMaquetteSectionLabel>
            <PrivacyMaquetteCard>
              <AlertDialog>
                <PrivacyMaquetteToggleRow
                  Icon={FileText}
                  iconColor="#34C759"
                  label="RGPD / Données personnelles"
                  subtitle="Gestion de vos données"
                  value={profile?.rgpd_accepted || false}
                  onChange={(next) => {
                    if (!next) {
                      document.getElementById("rgpd-revoke-trigger")?.click();
                    }
                  }}
                />
                <AlertDialogTrigger id="rgpd-revoke-trigger" className="hidden" />
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Retirer votre consentement RGPD ?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Vous serez déconnecté immédiatement et devrez accepter à nouveau les conditions.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Annuler</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleRevokeConsent}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Confirmer
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              <PrivacyMaquetteInsetSep />
              <AlertDialog>
                <PrivacyMaquetteToggleRow
                  Icon={Shield}
                  iconColor={ACTION_BLUE}
                  label="Règles de sécurité"
                  subtitle="Règles d'utilisation"
                  value={profile?.security_rules_accepted || false}
                  onChange={(next) => {
                    if (!next) {
                      document.getElementById("security-revoke-trigger")?.click();
                    }
                  }}
                />
                <AlertDialogTrigger id="security-revoke-trigger" className="hidden" />
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Retirer votre acceptation des règles ?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Vous serez déconnecté immédiatement et devrez accepter à nouveau les conditions.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Annuler</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleRevokeConsent}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Confirmer
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </PrivacyMaquetteCard>
          </div>

          <div data-tutorial="settings-privacy-analytics">
            <PrivacyMaquetteSectionLabel>MESURE D&apos;AUDIENCE</PrivacyMaquetteSectionLabel>
            <PrivacyMaquetteCard>
              <PrivacyMaquetteToggleRow
                Icon={BarChart3}
                iconColor="#5856D6"
                label="Analytics"
                subtitle={analyticsSubtitle}
                value={analyticsOptIn}
                onChange={(checked) => {
                  setAnalyticsConsent(checked);
                  setAnalyticsOptIn(checked);
                  toast({
                    title: checked ? "Mesure d’audience acceptée" : "Mesure d’audience refusée",
                    description: checked
                      ? "Les statistiques anonymisées nous aident à améliorer l’app."
                      : "Aucun envoi vers l’outil d’analyse.",
                  });
                }}
              />
            </PrivacyMaquetteCard>
          </div>

          <PrivacyMaquetteSectionLabel>SECURITE DU COMPTE</PrivacyMaquetteSectionLabel>
          <PrivacyMaquetteCard>
            <PrivacyMaquetteActionRow
              Icon={Key}
              iconColor="#5856D6"
              label="2FA (authenticator)"
              subtitle={mfaEnabled ? "Activée" : "Désactivée"}
              action={
                <button type="button" className={pillOutlineBtn} onClick={() => void toggleMfa()} disabled={mfaLoading}>
                  {mfaEnabled ? "Desactiver" : "Activer"}
                </button>
              }
            />
            <PrivacyMaquetteInsetSep />
            <PrivacyMaquetteActionRow
              Icon={Smartphone}
              iconColor="#FF3B30"
              label="Sessions actives"
              subtitle="Déconnecter tous les appareils"
              action={
                <button type="button" className={pillOutlineBtn} onClick={() => void signOutAllSessions()}>
                  Révoquer
                </button>
              }
            />
          </PrivacyMaquetteCard>

          <PrivacyMaquetteSectionLabel>DONNÉES PERSONNELLES</PrivacyMaquetteSectionLabel>
          <PrivacyMaquetteCard className="p-3">
            {dataRows.map((it) => {
              const checked = dataSelection[it.key];
              return (
                <button
                  key={it.key}
                  type="button"
                  onClick={() => setDataSelection((prev) => ({ ...prev, [it.key]: !prev[it.key] }))}
                  className="flex w-full items-center gap-3 py-2 transition-opacity active:opacity-80"
                >
                  <div
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition-all duration-150"
                    style={{
                      background: checked ? ACTION_BLUE : "transparent",
                      border: checked ? `1.5px solid ${ACTION_BLUE}` : "1.5px solid #C7C7CC",
                    }}
                  >
                    {checked ? <Check className="h-3.5 w-3.5 text-white" strokeWidth={3.5} /> : null}
                  </div>
                  <span className="text-left text-[16px] font-semibold tracking-tight text-[#0A0F1F]" style={{ letterSpacing: "-0.01em" }}>
                    {it.label}
                  </span>
                </button>
              );
            })}
            <div className="mt-3 flex gap-2 pt-1">
              <button
                type="button"
                className="flex flex-1 items-center justify-center gap-2 rounded-full border border-[#C7C7CC] bg-white py-3 text-[15px] font-extrabold tracking-tight text-[#0A0F1F] transition-colors active:bg-[#F8F8F8] disabled:pointer-events-none disabled:opacity-50"
                style={{ letterSpacing: "-0.01em" }}
                onClick={() => void exportSelectedData()}
                disabled={dataLoading}
              >
                <Download className="h-4 w-4 shrink-0 text-[#0A0F1F]" strokeWidth={2.4} />
                Exporter
              </button>
              <button
                type="button"
                className="flex flex-1 items-center justify-center gap-2 rounded-full bg-[#FF3B30] py-3 text-[15px] font-extrabold tracking-tight text-white transition-opacity active:opacity-90 disabled:pointer-events-none disabled:opacity-50"
                style={{ letterSpacing: "-0.01em" }}
                onClick={() => void deleteSelectedData()}
                disabled={dataLoading}
              >
                <Trash2 className="h-4 w-4 shrink-0 text-white" strokeWidth={2.4} />
                Supprimer
              </button>
            </div>
          </PrivacyMaquetteCard>

          <PrivacyMaquetteCard className="mt-5">
            <button
              type="button"
              onClick={() => {
                navigate("/privacy");
                onClose();
              }}
              className="flex w-full items-center gap-3 px-3 py-3 transition-colors active:bg-[#F8F8F8]"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-[#8E8E93]">
                <Info className="h-[19px] w-[19px] text-white" strokeWidth={2.4} />
              </div>
              <div className="min-w-0 flex-1 text-left">
                <p className="m-0 text-[17px] font-bold tracking-tight text-[#0A0F1F]" style={{ letterSpacing: "-0.01em" }}>
                  Politique de confidentialité
                </p>
                <p className="m-0 mt-0.5 text-[13px] text-[#8E8E93]">Consulter notre politique</p>
              </div>
              <ChevronRight className="h-5 w-5 shrink-0 text-[#C7C7CC]" aria-hidden />
            </button>
          </PrivacyMaquetteCard>

          {profile?.rgpd_accepted && profile?.security_rules_accepted ? (
            <>
              <PrivacyMaquetteSectionLabel>ZONE DE DANGER</PrivacyMaquetteSectionLabel>
              <PrivacyMaquetteCard>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <button
                      type="button"
                      className="flex w-full items-center gap-3 px-3 py-3 text-left transition-colors active:bg-[#F8F8F8]"
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-[#FF3B30]">
                        <Shield className="h-[19px] w-[19px] text-white" strokeWidth={2.4} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="m-0 text-[17px] font-bold tracking-tight text-[#FF3B30]" style={{ letterSpacing: "-0.01em" }}>
                          Révoquer mon consentement
                        </p>
                        <p className="m-0 mt-0.5 text-[13px] text-[#8E8E93]">Vous serez déconnecté</p>
                      </div>
                      <ChevronRight className="h-5 w-5 shrink-0 text-[#C7C7CC]" aria-hidden />
                    </button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Révoquer votre consentement ?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Vous serez déconnecté et devrez accepter à nouveau les conditions.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Annuler</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleRevokeConsent}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Révoquer
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </PrivacyMaquetteCard>
            </>
          ) : null}

          </div>
        </div>
      </IosFixedPageHeaderShell>
    </motion.div>
  );
};
