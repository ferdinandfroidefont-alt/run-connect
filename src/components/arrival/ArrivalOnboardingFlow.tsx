import { useCallback, useEffect, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import useEmblaCarousel from "embla-carousel-react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronRight, Crown, Link2 } from "lucide-react";
import { Capacitor } from "@capacitor/core";
import { Browser } from "@capacitor/browser";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  markOnboardingCompleted,
  markPremiumScreenSeen,
  writePermissionsSnapshot,
  type ArrivalPermissionOutcome,
} from "@/lib/arrivalFlowStorage";
import { requestArrivalGeolocationPermission, requestArrivalNotificationPermission } from "@/lib/arrivalPermissions";
import {
  SlideGraphicCommunity,
  SlideGraphicNearby,
  SlideGraphicRoutePlan,
  SlideGraphicSessionJoin,
} from "@/components/arrival/ArrivalSlideGraphics";
import { toast } from "sonner";

type Phase = "slide1" | "slides234" | "integrations" | "premium";

const midSlides = [
  {
    title: "Rejoins ou crée une séance",
    body: "En quelques secondes, participe à une séance ou organise la tienne.",
    Graphic: SlideGraphicSessionJoin,
  },
  {
    title: "Planifie sur une carte interactive",
    body: "Trace tes parcours, choisis un point de rendez-vous et partage facilement.",
    Graphic: SlideGraphicRoutePlan,
  },
  {
    title: "Progresse avec la communauté",
    body: "Entraîne-toi avec d’autres sportifs et reste motivé toute l’année.",
    Graphic: SlideGraphicCommunity,
  },
] as const;

export function ArrivalOnboardingFlow() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const userId = user?.id ?? "";

  const [phase, setPhase] = useState<Phase>("slide1");
  const [locWorking, setLocWorking] = useState(false);
  const [notifWorking, setNotifWorking] = useState(false);
  const [locationResolved, setLocationResolved] = useState(false);
  const [notificationResolved, setNotificationResolved] = useState(false);

  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: false, align: "start" });
  const [midIndex, setMidIndex] = useState(0);

  const [stravaConnected, setStravaConnected] = useState<boolean | null>(null);

  useEffect(() => {
    if (!emblaApi) return;
    const onSelect = () => setMidIndex(emblaApi.selectedScrollSnap());
    emblaApi.on("select", onSelect);
    onSelect();
    return () => {
      emblaApi.off("select", onSelect);
    };
  }, [emblaApi]);

  useEffect(() => {
    if (!userId) return;
    void supabase
      .from("profiles")
      .select("strava_connected, strava_access_token")
      .eq("user_id", userId)
      .maybeSingle()
      .then(({ data }) => {
        const ok = Boolean(data?.strava_connected && data?.strava_access_token);
        setStravaConnected(ok);
      })
      .catch(() => setStravaConnected(false));
  }, [userId]);

  useEffect(() => {
    if (phase === "premium" && userId) {
      markPremiumScreenSeen(userId);
    }
  }, [phase, userId]);

  const persistPermission = useCallback(
    (key: "location" | "notifications", outcome: ArrivalPermissionOutcome) => {
      if (!userId) return;
      writePermissionsSnapshot(userId, { [key]: outcome });
    },
    [userId]
  );

  const skipAhead = useCallback(() => {
    if (!userId) return;
    if (!locationResolved) persistPermission("location", "skipped");
    if (!notificationResolved) persistPermission("notifications", "skipped");
    setLocationResolved(true);
    setNotificationResolved(true);
    setPhase("integrations");
  }, [userId, locationResolved, notificationResolved, persistPermission]);

  /** Déclenche la vraie demande système (iOS / Android / navigateur), sans écran intermédiaire. */
  const requestLocationFromSlide1 = async () => {
    setLocWorking(true);
    try {
      const outcome = await requestArrivalGeolocationPermission();
      persistPermission("location", outcome);
      setLocationResolved(true);
      setPhase("slides234");
    } finally {
      setLocWorking(false);
    }
  };

  const skipLocationFromSlide1 = () => {
    persistPermission("location", "skipped");
    setLocationResolved(true);
    setPhase("slides234");
  };

  const requestNotificationsAfterSlides = async () => {
    setNotifWorking(true);
    try {
      const outcome = await requestArrivalNotificationPermission();
      persistPermission("notifications", outcome);
      setNotificationResolved(true);
      setPhase("integrations");
    } finally {
      setNotifWorking(false);
    }
  };

  const skipNotificationsAfterSlides = () => {
    persistPermission("notifications", "skipped");
    setNotificationResolved(true);
    setPhase("integrations");
  };

  const onMidPrimaryAction = () => {
    if (!emblaApi) return;
    if (emblaApi.canScrollNext()) {
      emblaApi.scrollNext();
      return;
    }
    void requestNotificationsAfterSlides();
  };

  const finishToHome = () => {
    if (userId) markOnboardingCompleted(userId);
    navigate("/", { replace: true });
  };

  const goTryPremium = () => {
    if (userId) {
      markOnboardingCompleted(userId);
      markPremiumScreenSeen(userId);
    }
    navigate("/subscription", { replace: true });
  };

  const connectStrava = async () => {
    if (!user?.id) return;
    try {
      const { data, error } = await supabase.functions.invoke("strava-connect", {
        headers: {
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
      });
      if (error) throw error;
      const isNative = Capacitor.isNativePlatform();
      const authUrl = data?.authUrl as string | undefined;
      if (!authUrl) throw new Error("Pas d’URL Strava");

      if (isNative) {
        await Browser.open({ url: authUrl, presentationStyle: "popover" });
      } else {
        window.open(authUrl, "strava_auth", "width=600,height=700");
      }
      toast.message("Strava", { description: "Terminez la connexion dans la fenêtre ouverte." });
    } catch (e: unknown) {
      console.error(e);
      toast.error("Impossible de lancer Strava pour le moment.");
    }
  };

  const showSkip = phase === "slide1" || phase === "slides234" || phase === "integrations";
  const isLastMidSlide = midIndex === midSlides.length - 1;

  return (
    <div
      className="fixed inset-0 z-[130] flex flex-col bg-background"
      style={{
        paddingTop: "env(safe-area-inset-top, 0px)",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}
    >
      <header className="flex shrink-0 items-center justify-end px-4 pb-2 pt-2">
        {showSkip && (
          <button
            type="button"
            onClick={() => {
              if (phase === "integrations") {
                setPhase("premium");
                return;
              }
              skipAhead();
            }}
            className="rounded-full px-3 py-1.5 text-[14px] font-medium text-muted-foreground transition-colors active:bg-secondary"
          >
            Passer
          </button>
        )}
      </header>

      <div className="min-h-0 flex-1 overflow-hidden">
        <AnimatePresence mode="wait">
          {phase === "slide1" && (
            <motion.section
              key="slide1"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25 }}
              className="flex h-full flex-col px-6"
            >
              <div className="min-h-0 flex-1 overflow-y-auto pb-6" style={{ WebkitOverflowScrolling: "touch" }}>
                <p className="mb-6 text-center text-[12px] font-semibold uppercase tracking-[0.2em] text-primary/80">
                  Bienvenue
                </p>
                <SlideGraphicNearby className="mb-8" />
                <h2 className="text-balance text-center text-[26px] font-bold leading-tight tracking-tight">
                  Trouve des séances autour de toi
                </h2>
                <p className="mx-auto mt-3 max-w-[340px] text-center text-[15px] leading-relaxed text-muted-foreground">
                  Découvre des entraînements près de toi et rejoins d’autres sportifs en un instant.
                </p>
              </div>
              <div className="shrink-0 space-y-2 pb-4">
                <p className="px-1 text-center text-[12px] leading-snug text-muted-foreground">
                  En continuant, la fenêtre d’autorisation <span className="font-medium text-foreground">localisation</span>{" "}
                  de ton appareil s’affichera (iOS, Android ou navigateur).
                </p>
                <Button
                  type="button"
                  className="h-[52px] w-full rounded-[14px] text-[16px] font-semibold"
                  disabled={locWorking}
                  onClick={() => void requestLocationFromSlide1()}
                >
                  {locWorking ? "Ouverture…" : "Suivant"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="h-[48px] w-full rounded-[14px] text-[15px] font-semibold"
                  disabled={locWorking}
                  onClick={skipLocationFromSlide1}
                >
                  Plus tard
                </Button>
              </div>
            </motion.section>
          )}

          {phase === "slides234" && (
            <motion.section
              key="slides234"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25 }}
              className="flex h-full flex-col px-2"
            >
              <div className="min-h-0 flex-1 overflow-hidden pb-4">
                <div className="overflow-hidden px-4" ref={emblaRef}>
                  <div className="flex">
                    {midSlides.map((s) => (
                      <div key={s.title} className="min-w-0 flex-[0_0_100%] px-2">
                        <div className="mx-auto flex max-w-md flex-col pb-4">
                          <s.Graphic className="mb-6" />
                          <h2 className="text-balance text-center text-[24px] font-bold leading-tight tracking-tight">
                            {s.title}
                          </h2>
                          <p className="mt-3 text-center text-[15px] leading-relaxed text-muted-foreground">{s.body}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="mt-4 flex justify-center gap-1.5">
                  {midSlides.map((_, i) => (
                    <span
                      key={i}
                      className={cn(
                        "h-1.5 rounded-full transition-all",
                        i === midIndex ? "w-6 bg-primary" : "w-1.5 bg-muted-foreground/25"
                      )}
                    />
                  ))}
                </div>
              </div>
              <div className="shrink-0 space-y-2 px-6 pb-4">
                {isLastMidSlide ? (
                  <>
                    <p className="px-1 text-center text-[12px] leading-snug text-muted-foreground">
                      En continuant, la fenêtre d’autorisation{" "}
                      <span className="font-medium text-foreground">notifications</span> de ton appareil s’affichera.
                    </p>
                    <Button
                      type="button"
                      className="h-[52px] w-full rounded-[14px] text-[16px] font-semibold"
                      disabled={notifWorking}
                      onClick={() => void requestNotificationsAfterSlides()}
                    >
                      {notifWorking ? "Ouverture…" : "Continuer"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="h-[48px] w-full rounded-[14px] text-[15px] font-semibold"
                      disabled={notifWorking}
                      onClick={skipNotificationsAfterSlides}
                    >
                      Plus tard
                    </Button>
                  </>
                ) : (
                  <Button
                    type="button"
                    className="h-[52px] w-full rounded-[14px] text-[16px] font-semibold"
                    onClick={onMidPrimaryAction}
                  >
                    Suivant
                  </Button>
                )}
              </div>
            </motion.section>
          )}

          {phase === "integrations" && (
            <motion.section
              key="integrations"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25 }}
              className="flex h-full flex-col px-6"
            >
              <div className="min-h-0 flex-1 overflow-y-auto pb-6" style={{ WebkitOverflowScrolling: "touch" }}>
                <div className="mx-auto mb-8 flex max-w-md flex-col items-center text-center">
                  <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-[18px] border border-border/60 bg-card shadow-md">
                    <Link2 className="h-7 w-7 text-primary" strokeWidth={1.5} />
                  </div>
                  <h2 className="text-[26px] font-bold tracking-tight">Connecte tes apps</h2>
                  <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
                    Synchronise tes activités et simplifie ton expérience RunConnect.
                  </p>
                </div>

                <div className="mx-auto max-w-md space-y-3">
                  <IntegrationRow
                    title="Strava"
                    subtitle="Synchronise tes sorties"
                    actionLabel={stravaConnected ? "Connecté" : "Connecter"}
                    disabled={stravaConnected === true}
                    onAction={() => void connectStrava()}
                    brand={
                      <span className="text-[11px] font-bold tracking-tight text-[#fc5200]">strava</span>
                    }
                  />
                  <IntegrationRow
                    title="Apple Santé"
                    subtitle="HealthKit · activités & données santé"
                    actionLabel="Bientôt"
                    disabled
                    onAction={() => {}}
                    featureDisabled
                    brand={<span className="text-[20px]">❤️</span>}
                  />
                  <IntegrationRow
                    title="Garmin"
                    subtitle="Connexion appareils & activités"
                    actionLabel="Bientôt"
                    disabled
                    onAction={() => {}}
                    featureDisabled
                    brand={<span className="text-[12px] font-bold text-sky-600">G</span>}
                  />
                </div>
              </div>
              <div className="shrink-0 pb-4">
                <Button
                  type="button"
                  className="h-[52px] w-full rounded-[14px] text-[16px] font-semibold"
                  onClick={() => setPhase("premium")}
                >
                  Continuer
                  <ChevronRight className="ml-1 h-4 w-4 opacity-80" />
                </Button>
              </div>
            </motion.section>
          )}

          {phase === "premium" && (
            <motion.section
              key="premium"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25 }}
              className="flex h-full flex-col px-6"
            >
              <div className="flex min-h-0 flex-1 flex-col items-center justify-center text-center">
                <div className="mb-8 w-full max-w-[280px] overflow-hidden rounded-[24px] border border-border/60 bg-gradient-to-br from-primary/15 via-background to-violet-500/10 p-8 shadow-[0_24px_60px_-20px_hsl(0_0%_0%_/0.35)]">
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/15">
                    <Crown className="h-8 w-8 text-primary" />
                  </div>
                  <h2 className="text-[24px] font-bold tracking-tight">Passe au niveau supérieur</h2>
                  <p className="mt-3 text-[14px] leading-relaxed text-muted-foreground">
                    Accède à plus de visibilité, des outils avancés et une expérience encore plus complète.
                  </p>
                  <ul className="mt-6 space-y-2.5 text-left text-[13px] text-muted-foreground">
                    <li className="flex gap-2">
                      <span className="mt-0.5 text-primary">✓</span>
                      <span>Visibilité renforcée pour tes séances et ton profil</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="mt-0.5 text-primary">✓</span>
                      <span>Outils avancés pour organiser et suivre ton activité</span>
                    </li>
                  </ul>
                </div>
              </div>
              <div className="shrink-0 space-y-3 pb-4">
                <Button
                  type="button"
                  className="h-[52px] w-full rounded-[14px] text-[16px] font-semibold"
                  onClick={goTryPremium}
                >
                  Essayer gratuitement
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="h-[52px] w-full rounded-[14px] text-[16px] font-semibold"
                  onClick={finishToHome}
                >
                  Continuer gratuitement
                </Button>
              </div>
            </motion.section>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function IntegrationRow({
  title,
  subtitle,
  actionLabel,
  onAction,
  disabled,
  brand,
  featureDisabled,
}: {
  title: string;
  subtitle: string;
  actionLabel: string;
  onAction: () => void;
  disabled?: boolean;
  brand: ReactNode;
  featureDisabled?: boolean;
}) {
  return (
    <div className="ios-list-row flex items-center gap-3 rounded-[14px] border border-border/60 bg-card p-3 shadow-sm">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[12px] border border-border/50 bg-secondary/50">
        {brand}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[15px] font-semibold">{title}</p>
        <p className="truncate text-[12px] text-muted-foreground">{subtitle}</p>
      </div>
      <Button
        type="button"
        size="sm"
        variant={featureDisabled ? "secondary" : "default"}
        className="shrink-0 rounded-[10px] font-semibold"
        disabled={disabled}
        onClick={onAction}
      >
        {actionLabel}
      </Button>
    </div>
  );
}
