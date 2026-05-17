import { useEffect, useState, type ReactNode } from "react";
import {
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Crown,
  Heart,
  Loader2,
  RefreshCw,
  Star,
} from "lucide-react";
import { Browser } from "@capacitor/browser";
import { Capacitor } from "@capacitor/core";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { DonationDialog } from "@/components/DonationDialog";
import { Skeleton } from "@/components/ui/skeleton";
import { IosFixedPageHeaderShell } from "@/components/layout/IosFixedPageHeaderShell";

const ACTION_BLUE = "#007AFF";
const BG = "#F2F2F7";
const FONT =
  "-apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif";
const CARD_SHADOW = "0 0.5px 0 rgba(0,0,0,0.05)";

const PREMIUM_BENEFITS = [
  {
    label: "Publication mondiale",
    subtitle:
      "Publie tes séances en public sur toute la carte (sans limite de rayon)",
  },
  {
    label: "Export GPX sans publicité",
    subtitle:
      "Exporte n'importe quel itinéraire (autres coureurs inclus) sans regarder de pub",
  },
  {
    label: "Zéro publicité",
    subtitle: "RunConnect sans interruption, jamais de pub",
  },
  {
    label: "Vues de tes publications",
    subtitle:
      "Découvre qui a vu tes séances, tes stories et ton profil — comme sur TikTok",
  },
] as const;

interface SettingsPremiumProps {
  onBack: () => void;
}

function PremiumSectionHeader({ label }: { label: string }) {
  return (
    <p
      style={{
        fontSize: 12.5,
        fontWeight: 700,
        color: "#8E8E93",
        letterSpacing: "0.05em",
        textTransform: "uppercase",
        margin: 0,
        marginTop: 22,
        marginBottom: 6,
        paddingLeft: 28,
        fontFamily: FONT,
      }}
    >
      {label}
    </p>
  );
}

function PremiumFormCard({ children }: { children: ReactNode }) {
  return (
    <div
      className="mx-4 overflow-hidden rounded-2xl bg-white"
      style={{ boxShadow: CARD_SHADOW, fontFamily: FONT }}
    >
      {children}
    </div>
  );
}

function PremiumFormRowDivider() {
  return <div style={{ height: 0.5, background: "#E5E5EA", marginLeft: 16 }} />;
}

function PremiumActionRow({
  icon,
  iconBg,
  label,
  onClick,
  disabled,
  loading,
}: {
  icon: ReactNode;
  iconBg: string;
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  loading?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      className="flex w-full items-center px-4 transition-colors active:bg-[#F8F8F8] disabled:opacity-50"
      style={{ minHeight: 52 }}
    >
      <div
        className="mr-3 flex shrink-0 items-center justify-center"
        style={{
          width: 32,
          height: 32,
          borderRadius: 9,
          background: iconBg,
        }}
      >
        {loading ? <Loader2 className="h-5 w-5 animate-spin text-white" /> : icon}
      </div>
      <p
        className="flex-1 text-left"
        style={{
          fontSize: 17,
          fontWeight: 600,
          color: "var(--text-primary, #0A0F1F)",
          margin: 0,
        }}
      >
        {label}
      </p>
      <ChevronRight className="h-5 w-5 shrink-0 text-[#C7C7CC]" />
    </button>
  );
}

function PremiumBenefitRow({ label, subtitle }: { label: string; subtitle?: string }) {
  return (
    <div className="flex items-start px-4 py-3" style={{ gap: 12 }}>
      <div
        className="flex shrink-0 items-center justify-center"
        style={{
          width: 32,
          height: 32,
          borderRadius: 9,
          background: "#34C759",
          marginTop: 1,
        }}
      >
        <Check className="h-4 w-4 text-white" strokeWidth={3.5} />
      </div>
      <div className="min-w-0 flex-1">
        <p
          style={{
            fontSize: 16,
            fontWeight: 700,
            color: "var(--text-primary, #0A0F1F)",
            margin: 0,
            letterSpacing: "-0.01em",
            lineHeight: 1.25,
          }}
        >
          {label}
        </p>
        {subtitle ? (
          <p
            style={{
              fontSize: 13,
              fontWeight: 500,
              color: "var(--text-secondary, #8E8E93)",
              margin: 0,
              marginTop: 3,
              lineHeight: 1.35,
            }}
          >
            {subtitle}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function PremiumPageHeader({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <div
      className="flex shrink-0 items-center px-4 pb-3 pt-[max(12px,env(safe-area-inset-top,0px))]"
      style={{
        background: "var(--card-bg, white)",
        borderBottom: "1px solid var(--separator, #E5E5EA)",
        fontFamily: FONT,
      }}
    >
      <button
        type="button"
        onClick={onBack}
        className="flex shrink-0 items-center transition-opacity active:opacity-70"
        aria-label="Retour"
      >
        <ChevronLeft className="h-7 w-7" color={ACTION_BLUE} strokeWidth={2.6} />
      </button>
      <h1
        className="flex-1 text-center"
        style={{
          fontSize: 18,
          fontWeight: 900,
          color: "var(--text-primary, #0A0F1F)",
          letterSpacing: "-0.02em",
          margin: 0,
        }}
      >
        {title}
      </h1>
      <div style={{ width: 28 }} aria-hidden />
    </div>
  );
}

export const SettingsPremium = ({ onBack }: SettingsPremiumProps) => {
  const { user, session } = useAuth();
  const {
    status,
    tier,
    expiresAt,
    isSyncing,
    isPremium,
    syncSubscription,
  } = useSubscription();
  const [loading, setLoading] = useState<"monthly" | "annual" | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("success") === "true") {
      toast({
        title: "🎉 Merci pour votre abonnement !",
        description: "Votre compte premium est maintenant actif.",
      });
    } else if (params.get("canceled") === "true") {
      toast({
        title: "Paiement annulé",
        description: "Votre abonnement n'a pas été modifié.",
        variant: "destructive",
      });
    }
  }, [toast]);

  const handleSubscribe = async (planType: "monthly" | "annual") => {
    if (!session) return;

    setLoading(planType);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: { planType },
      });

      if (error) throw error;

      if (Capacitor.isNativePlatform()) {
        await Browser.open({ url: data.url, presentationStyle: "popover" });
      } else {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error("Error creating checkout:", error);
      toast({
        title: "Erreur",
        description: "Impossible de créer la session de paiement.",
        variant: "destructive",
      });
    } finally {
      setLoading(null);
    }
  };

  const handleManageSubscription = async () => {
    if (!session) return;

    setPortalLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("customer-portal", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;

      if (Capacitor.isNativePlatform()) {
        await Browser.open({ url: data.url, presentationStyle: "popover" });
      } else {
        window.open(data.url, "_blank");
      }
    } catch (error) {
      console.error("Error opening customer portal:", error);
      toast({
        title: "Erreur",
        description: "Impossible d'ouvrir le portail client.",
        variant: "destructive",
      });
    } finally {
      setPortalLoading(false);
    }
  };

  const expiresLabel = expiresAt
    ? expiresAt.toLocaleDateString("fr-FR")
    : null;

  if (!user) {
    return (
      <div
        className="flex h-full min-h-0 flex-col overflow-hidden"
        style={{ background: BG, fontFamily: FONT }}
      >
        <PremiumPageHeader title="RunConnect Premium" onBack={onBack} />
        <div className="flex flex-1 items-center justify-center px-6 pb-8">
          <PremiumFormCard>
            <div className="px-4 py-8 text-center">
              <Crown className="mx-auto mb-4 h-12 w-12 text-[#FFCC00]" />
              <p style={{ fontSize: 17, fontWeight: 700, color: "#0A0F1F", margin: 0 }}>
                Connectez-vous
              </p>
              <p
                style={{
                  fontSize: 14,
                  fontWeight: 500,
                  color: "#8E8E93",
                  margin: "8px 0 0",
                }}
              >
                Vous devez être connecté pour voir vos options d&apos;abonnement.
              </p>
            </div>
          </PremiumFormCard>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ x: 100, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 100, opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="flex h-full min-h-0 min-w-0 max-w-full flex-col overflow-hidden"
      style={{ background: BG, fontFamily: FONT }}
    >
      <IosFixedPageHeaderShell
        className="min-h-0 flex-1"
        headerWrapperClassName="shrink-0"
        contentScroll
        scrollClassName="min-h-0"
        scrollProps={{ style: { backgroundColor: BG } }}
        header={<PremiumPageHeader title="RunConnect Premium" onBack={onBack} />}
      >
        <div className="min-w-0 max-w-full overflow-x-hidden pb-8" style={{ background: BG }}>
          {/* Hero */}
          <div className="px-4 pt-5">
            <div
              style={{
                borderRadius: 22,
                background:
                  "linear-gradient(135deg, #1B6FE6 0%, #5856D6 60%, #AF52DE 100%)",
                padding: "22px 22px 20px",
                color: "white",
                position: "relative",
                overflow: "hidden",
                boxShadow: "0 8px 24px rgba(88,86,214,0.35)",
              }}
            >
              <motion.div
                style={{
                  position: "absolute",
                  top: -40,
                  right: -40,
                  width: 160,
                  height: 160,
                  borderRadius: "50%",
                  background:
                    "radial-gradient(circle, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0) 70%)",
                  pointerEvents: "none",
                }}
              />
              <div className="relative flex items-center gap-3">
                <div
                  className="flex shrink-0 items-center justify-center"
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 14,
                    background: "rgba(255,255,255,0.22)",
                    backdropFilter: "blur(10px)",
                  }}
                >
                  <Crown className="h-7 w-7 text-white" strokeWidth={2.2} />
                </div>
                <div className="min-w-0 flex-1">
                  <p
                    style={{
                      fontSize: 11,
                      fontWeight: 900,
                      letterSpacing: "0.18em",
                      textTransform: "uppercase",
                      opacity: 0.85,
                      margin: 0,
                    }}
                  >
                    {isPremium ? "Membre actif" : "Passe au niveau supérieur"}
                  </p>
                  <p
                    style={{
                      fontSize: 22,
                      fontWeight: 900,
                      letterSpacing: "-0.02em",
                      margin: 0,
                      marginTop: 2,
                      lineHeight: 1.1,
                    }}
                  >
                    {isPremium ? "Tu es Premium 👑" : "Deviens Premium"}
                  </p>
                </div>
              </div>
              <p
                style={{
                  fontSize: 13.5,
                  fontWeight: 500,
                  opacity: 0.92,
                  margin: 0,
                  marginTop: 12,
                  lineHeight: 1.4,
                  position: "relative",
                }}
              >
                {isPremium
                  ? "Profite de toutes les fonctionnalités sans limite."
                  : "Publie partout, exporte sans pub, soutiens RunConnect."}
              </p>
            </div>
          </div>

          {isPremium ? (
            <>
              <PremiumSectionHeader label="Mon abonnement" />
              <PremiumFormCard>
                {status === "loading" ? (
                  <div className="space-y-3 px-4 py-4">
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                  </div>
                ) : (
                  <>
                    <div className="flex items-center px-4" style={{ minHeight: 52 }}>
                      <div
                        className="mr-3 flex shrink-0 items-center justify-center"
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 9,
                          background: "#FFCC00",
                        }}
                      >
                        <Crown className="h-5 w-5 text-white" strokeWidth={2.4} />
                      </div>
                      <p
                        className="flex-1"
                        style={{
                          fontSize: 17,
                          fontWeight: 600,
                          color: "var(--text-primary, #0A0F1F)",
                          margin: 0,
                        }}
                      >
                        Statut
                      </p>
                      <p
                        style={{
                          fontSize: 17,
                          fontWeight: 800,
                          color: "#34C759",
                          margin: 0,
                        }}
                      >
                        Premium
                      </p>
                    </div>
                    {expiresLabel ? (
                      <>
                        <PremiumFormRowDivider />
                        <div className="flex items-center px-4" style={{ minHeight: 52 }}>
                          <div
                            className="mr-3 flex shrink-0 items-center justify-center"
                            style={{
                              width: 32,
                              height: 32,
                              borderRadius: 9,
                              background: "#FF9500",
                            }}
                          >
                            <CalendarDays
                              className="h-5 w-5 text-white"
                              strokeWidth={2.4}
                            />
                          </div>
                          <p
                            className="flex-1"
                            style={{
                              fontSize: 17,
                              fontWeight: 600,
                              color: "var(--text-primary, #0A0F1F)",
                              margin: 0,
                            }}
                          >
                            Expire le
                          </p>
                          <p
                            style={{
                              fontSize: 17,
                              fontWeight: 600,
                              color: "var(--text-secondary, #8E8E93)",
                              margin: 0,
                            }}
                          >
                            {expiresLabel}
                          </p>
                        </div>
                      </>
                    ) : null}
                    <PremiumFormRowDivider />
                    <PremiumActionRow
                      icon={<RefreshCw className="h-5 w-5 text-white" strokeWidth={2.4} />}
                      iconBg={ACTION_BLUE}
                      label="Synchroniser"
                      onClick={() => void syncSubscription()}
                      disabled={isSyncing}
                      loading={isSyncing}
                    />
                    <PremiumFormRowDivider />
                    <PremiumActionRow
                      icon={<Star className="h-5 w-5 text-white" strokeWidth={2.4} />}
                      iconBg="#8E8E93"
                      label="Gérer l'abonnement"
                      onClick={() => void handleManageSubscription()}
                      loading={portalLoading}
                    />
                  </>
                )}
              </PremiumFormCard>
            </>
          ) : null}

          <PremiumSectionHeader label="Plans disponibles" />
          <PremiumFormCard>
            <button
              type="button"
              onClick={() => void handleSubscribe("monthly")}
              disabled={loading !== null || tier === "Mensuel"}
              className="flex w-full items-center px-4 py-3 text-left transition-colors active:bg-[#F8F8F8] disabled:opacity-50"
            >
              <div
                className="mr-3 flex shrink-0 items-center justify-center"
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 11,
                  background: ACTION_BLUE,
                  boxShadow: `0 2px 6px ${ACTION_BLUE}40`,
                }}
              >
                {loading === "monthly" ? (
                  <Loader2 className="h-5 w-5 animate-spin text-white" />
                ) : (
                  <Star className="h-5 w-5 text-white" strokeWidth={2.2} fill="white" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p
                  style={{
                    fontSize: 17,
                    fontWeight: 800,
                    color: "var(--text-primary, #0A0F1F)",
                    margin: 0,
                    letterSpacing: "-0.01em",
                  }}
                >
                  Plan Mensuel
                </p>
                <p
                  style={{
                    fontSize: 14,
                    fontWeight: 700,
                    color: "var(--text-secondary, #8E8E93)",
                    margin: 0,
                    marginTop: 2,
                  }}
                >
                  2,99€/mois
                </p>
              </div>
              <ChevronRight className="h-5 w-5 shrink-0 text-[#C7C7CC]" />
            </button>
            <PremiumFormRowDivider />
            <button
              type="button"
              onClick={() => void handleSubscribe("annual")}
              disabled={loading !== null || tier === "Annuel"}
              className="flex w-full items-center px-4 py-3 text-left transition-colors active:bg-[#F8F8F8] disabled:opacity-50"
            >
              <div
                className="mr-3 flex shrink-0 items-center justify-center"
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 11,
                  background: "#34C759",
                  boxShadow: "0 2px 6px rgba(52,199,89,0.4)",
                }}
              >
                {loading === "annual" ? (
                  <Loader2 className="h-5 w-5 animate-spin text-white" />
                ) : (
                  <Star className="h-5 w-5 text-white" strokeWidth={2.2} fill="white" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p
                    style={{
                      fontSize: 17,
                      fontWeight: 800,
                      color: "var(--text-primary, #0A0F1F)",
                      margin: 0,
                      letterSpacing: "-0.01em",
                    }}
                  >
                    Plan Annuel
                  </p>
                  <span
                    style={{
                      padding: "2px 9px",
                      background: "#34C75922",
                      color: "#1E8E3E",
                      fontSize: 11,
                      fontWeight: 900,
                      borderRadius: 9999,
                      letterSpacing: "-0.01em",
                    }}
                  >
                    2 mois offerts
                  </span>
                </div>
                <p
                  style={{
                    fontSize: 14,
                    fontWeight: 700,
                    color: "var(--text-secondary, #8E8E93)",
                    margin: 0,
                    marginTop: 2,
                  }}
                >
                  29,99€/an <span style={{ opacity: 0.6 }}>(2,50€/mois)</span>
                </p>
              </div>
              <ChevronRight className="h-5 w-5 shrink-0 text-[#C7C7CC]" />
            </button>
          </PremiumFormCard>

          <PremiumSectionHeader label="Avantages Premium" />
          <PremiumFormCard>
            {PREMIUM_BENEFITS.map((benefit, index) => (
              <div key={benefit.label}>
                {index > 0 ? <PremiumFormRowDivider /> : null}
                <PremiumBenefitRow label={benefit.label} subtitle={benefit.subtitle} />
              </div>
            ))}
          </PremiumFormCard>

          <PremiumSectionHeader label="Soutenir RunConnect" />
          <PremiumFormCard>
            <DonationDialog
              trigger={
                <button
                  type="button"
                  className="flex w-full items-center px-4 py-3 text-left transition-colors active:bg-[#F8F8F8]"
                >
                  <div
                    className="mr-3 flex shrink-0 items-center justify-center"
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 11,
                      background: "#FF3B30",
                      boxShadow: "0 2px 6px rgba(255,59,48,0.35)",
                    }}
                  >
                    <Heart className="h-5 w-5 text-white" strokeWidth={2.2} fill="white" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p
                      style={{
                        fontSize: 17,
                        fontWeight: 800,
                        color: "var(--text-primary, #0A0F1F)",
                        margin: 0,
                        letterSpacing: "-0.01em",
                      }}
                    >
                      Faire un don
                    </p>
                    <p
                      style={{
                        fontSize: 14,
                        fontWeight: 500,
                        color: "var(--text-secondary, #8E8E93)",
                        margin: 0,
                        marginTop: 2,
                      }}
                    >
                      Soutenez le développement
                    </p>
                  </div>
                  <ChevronRight className="h-5 w-5 shrink-0 text-[#C7C7CC]" />
                </button>
              }
            />
          </PremiumFormCard>
        </div>
      </IosFixedPageHeaderShell>
    </motion.div>
  );
};
