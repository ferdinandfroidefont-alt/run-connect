import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronRight } from "lucide-react";
import { RUCONNECT_ONBOARDING_ARRIVAL_BG_URL } from "@/lib/ruconnectSplashChrome";

/** Tokens alignés maquette RunConnect (9).jsx — ACTION_BLUE & surfaces marketing. */
const RC = {
  /** iOS system blue (#007AFF) — CTAs landing / hiérarchie liens sur fond sombre. */
  primary: "#007AFF",
  primaryFocus: "#0056CC",
  primaryOnDark: "#FFFFFF",
  inkMuted48: "#7a7a7a",
  canvas: "#ffffff",
  canvasParchment: "#f5f5f7",
  hairline: "#e0e0e0",
  productShadow: "rgba(0, 0, 0, 0.22) 3px 5px 30px 0",
} as const;

const FEATURE_SLIDES: readonly {
  tag: string;
  title: string;
  mockup: "map" | "placeholder";
  placeholderIcon: string;
  placeholderLabel: string;
}[] = [
  {
    tag: "Carte interactive",
    title: "Programme tes séances là où tu cours",
    mockup: "map",
    placeholderIcon: "",
    placeholderLabel: "",
  },
  {
    tag: "Coaching",
    title: "Suis le programme de ton coach, séance après séance",
    mockup: "placeholder",
    placeholderIcon: "📋",
    placeholderLabel: "Mockup Coaching",
  },
  {
    tag: "Itinéraires",
    title: "Découvre et partage tes meilleurs parcours",
    mockup: "placeholder",
    placeholderIcon: "🗺️",
    placeholderLabel: "Mockup Itinéraires",
  },
  {
    tag: "Live tracking",
    title: "Reste connecté avec ton groupe, en temps réel",
    mockup: "placeholder",
    placeholderIcon: "📡",
    placeholderLabel: "Mockup Live",
  },
];

const SLIDE_COUNT = 1 + FEATURE_SLIDES.length;

export type AuthLandingAppleGalleryProps = {
  onSignUp: () => void;
  onSignIn: () => void;
  disabled?: boolean;
  /** Image hero full-bleed (défaut : photo accueil RunConnect). */
  heroImageSrc?: string;
};

function MiniMapMockup() {
  return (
    <div
      className="relative h-[320px] w-[220px] overflow-hidden rounded-[18px] border"
      style={{
        backgroundColor: RC.canvas,
        borderColor: RC.hairline,
        color: RC.inkMuted48,
        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif',
        boxShadow: RC.productShadow,
      }}
    >
      <div className="absolute inset-0 bg-gradient-to-b from-[#ecf2e1] to-[#e0e9cf]">
        <div
          className="absolute opacity-70"
          style={{
            width: 90,
            height: 50,
            top: "12%",
            right: -15,
            borderRadius: "50% 30% 60% 40%",
            background: "linear-gradient(135deg, #c5dce8 0%, #a8c8db 100%)",
            transform: "rotate(20deg)",
          }}
        />
        <div
          className="absolute opacity-55"
          style={{
            width: 60,
            height: 70,
            bottom: "18%",
            left: -10,
            borderRadius: "60% 40% 50% 50%",
            background: "radial-gradient(ellipse, #b8d49c 0%, #a4c485 100%)",
          }}
        />
        <div
          className="absolute bg-white shadow-[0_0_0_1px_rgba(120,140,100,0.15)]"
          style={{ width: "200%", height: 8, top: "35%", left: "-50%", transform: "rotate(-12deg)" }}
        />
        <div
          className="absolute bg-white shadow-[0_0_0_1px_rgba(120,140,100,0.15)]"
          style={{ width: "180%", height: 6, top: "65%", left: "-40%", transform: "rotate(8deg)" }}
        />
        <div
          className="absolute bg-white shadow-[0_0_0_1px_rgba(120,140,100,0.15)]"
          style={{ width: 4, height: "120%", left: "28%", top: "-10%", transform: "rotate(15deg)" }}
        />
        <div
          className="absolute bg-white shadow-[0_0_0_1px_rgba(120,140,100,0.15)]"
          style={{ width: 5, height: "100%", right: "22%", top: 0, transform: "rotate(-10deg)" }}
        />
        {(
          [
            { top: "22%", left: "18%", label: "JM" },
            { top: "38%", left: "62%", label: "SL" },
            { top: "52%", left: "40%", label: "TR" },
            { top: "68%", left: "12%", label: "CD" },
            { top: "48%", left: "78%", label: "PL" },
          ] as const
        ).map((pin) => (
          <div
            key={pin.label}
            className="absolute z-[5] flex h-8 w-8 items-center justify-center"
            style={{ top: pin.top, left: pin.left }}
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#007AFF] p-0.5 shadow-sm">
              <div className="flex h-[26px] w-[26px] items-center justify-center rounded-full bg-white text-[10px] font-semibold text-[#1d1d1f]">
                {pin.label}
              </div>
            </div>
          </div>
        ))}
        <div
          className="absolute z-[4] h-3 w-3 rounded-full border-2 border-white bg-[#007AFF] shadow"
          style={{ top: "58%", left: "48%", transform: "translate(-50%, -50%)" }}
        />
      </div>
    </div>
  );
}

function PlaceholderMockup({ icon, label }: { icon: string; label: string }) {
  return (
    <div
      className="flex h-[320px] w-[220px] flex-col items-center justify-center gap-2 overflow-hidden rounded-[18px] border text-center"
      style={{
        backgroundColor: RC.canvas,
        borderColor: RC.hairline,
        color: RC.inkMuted48,
        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif',
        boxShadow: RC.productShadow,
      }}
    >
      <div
        className="mb-0.5 flex h-12 w-12 items-center justify-center rounded-[11px] text-[22px]"
        style={{ backgroundColor: RC.canvasParchment }}
      >
        {icon}
      </div>
      <span className="text-[14px] font-normal tracking-[-0.224px]">{label}</span>
      <span className="text-[11px] opacity-70">à venir</span>
    </div>
  );
}

/**
 * Landing marketing avant connexion — carrousel horizontal type maquette HTML
 * (`runconnect-landing`), tokens Apple (Action Blue, SF Pro via stacks Tailwind).
 */
export function AuthLandingAppleGallery({
  onSignUp,
  onSignIn,
  disabled,
  heroImageSrc = RUCONNECT_ONBOARDING_ARRIVAL_BG_URL,
}: AuthLandingAppleGalleryProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const updateIndex = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const w = el.clientWidth;
    if (w <= 0) return;
    setActiveIndex(Math.round(el.scrollLeft / w));
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    updateIndex();
    el.addEventListener("scroll", updateIndex, { passive: true });
    window.addEventListener("resize", updateIndex);
    return () => {
      el.removeEventListener("scroll", updateIndex);
      window.removeEventListener("resize", updateIndex);
    };
  }, [updateIndex]);

  const scrollToSlide = (i: number) => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ left: i * el.clientWidth, behavior: "smooth" });
  };

  const showSwipeHint = activeIndex === 0;

  return (
    <div className="relative flex min-h-0 w-full flex-1 flex-col bg-black">
      {/* Fond photo + overlay lisibilité (comme la maquette — dégradé fonctionnel sur photo). */}
      <div
        className="pointer-events-none absolute inset-0 z-[1] bg-cover"
        style={{
          backgroundImage: `url("${heroImageSrc.replace(/"/g, "")}")`,
          backgroundPosition: "center 30%",
        }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 z-[2]"
        style={{
          background:
            "linear-gradient(180deg, rgba(0,0,0,0.30) 0%, rgba(0,0,0,0.05) 18%, rgba(0,0,0,0) 45%, rgba(0,0,0,0.20) 70%, rgba(0,0,0,0.45) 100%)",
        }}
        aria-hidden
      />

      <h1
        className="pointer-events-none absolute left-1/2 z-[50] -translate-x-1/2 text-center text-[38px] font-black leading-none tracking-[-0.03em] text-white"
        style={{
          top: "max(76px, calc(env(safe-area-inset-top, 0px) + 52px))",
          textShadow: "0 2px 12px rgba(0,0,0,0.35)",
          fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif',
        }}
      >
        RunConnect
      </h1>

      <div
        ref={scrollRef}
        role="region"
        aria-roledescription="carrousel"
        aria-label="Découvrir RunConnect"
        className="absolute inset-0 z-[10] flex snap-x snap-mandatory overflow-x-auto overflow-y-hidden [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        style={{ WebkitOverflowScrolling: "touch", touchAction: "pan-x" }}
      >
        {/* Slide hero */}
        <section
          aria-label="Accueil"
          className="relative flex h-full w-full min-w-full shrink-0 snap-start flex-col items-center"
        />

        {FEATURE_SLIDES.map((slide, idx) => (
          <section
            key={slide.tag}
            aria-label={`${idx + 2} sur ${SLIDE_COUNT} · ${slide.tag}`}
            className="relative flex h-full w-full min-w-full shrink-0 snap-start flex-col items-center justify-end px-6 pb-[calc(200px+env(safe-area-inset-bottom,0px))] pt-[calc(env(safe-area-inset-top,0px)+120px)]"
          >
            {slide.mockup === "map" ? (
              <MiniMapMockup />
            ) : (
              <PlaceholderMockup icon={slide.placeholderIcon} label={slide.placeholderLabel} />
            )}
            <div className="mt-8 w-full min-w-0 max-w-[320px] px-1 text-center text-white">
              <p
                className="text-[14px] font-semibold leading-[1.29] tracking-[-0.224px] text-white/95"
                style={{ fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif' }}
              >
                {slide.tag}
              </p>
              <h2 className="font-display mt-2 text-[28px] font-semibold leading-[1.1] tracking-[-0.374px] sm:text-[34px] sm:tracking-[-0.374px] md:text-[40px]">
                {slide.title}
              </h2>
            </div>
          </section>
        ))}
      </div>

      <div
        className={`pointer-events-none absolute bottom-[calc(168px+env(safe-area-inset-bottom,0px))] left-1/2 z-[50] flex -translate-x-1/2 items-center gap-1.5 text-white transition-opacity duration-300 ${
          showSwipeHint ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        style={{ fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif' }}
        aria-hidden={!showSwipeHint}
      >
        <span className="text-[12px] font-extrabold tracking-[0.14em]">DÉCOUVRIR</span>
        <ChevronRight className="h-4 w-4 shrink-0" strokeWidth={2.6} aria-hidden />
      </div>

      <div
        className="absolute bottom-[calc(132px+env(safe-area-inset-bottom,0px))] left-1/2 z-[40] flex -translate-x-1/2 gap-2"
        role="tablist"
        aria-label="Position dans le carrousel"
      >
        {Array.from({ length: SLIDE_COUNT }, (_, i) => (
          <button
            key={i}
            type="button"
            role="tab"
            aria-selected={activeIndex === i}
            aria-label={`Slide ${i + 1}`}
            className="h-2 shrink-0 rounded-full p-0 transition-all duration-200 ease-out focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 motion-reduce:transition-none"
            style={{
              width: activeIndex === i ? 22 : 8,
              backgroundColor: activeIndex === i ? "#ffffff" : "rgba(255,255,255,0.4)",
              outlineColor: RC.primaryFocus,
            }}
            onClick={() => scrollToSlide(i)}
          />
        ))}
      </div>

      <div
        className="absolute inset-x-0 bottom-0 z-[30] px-6 pb-[max(16px,env(safe-area-inset-bottom,0px))] pt-5"
        style={{
          background:
            "linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.35) 35%, rgba(0,0,0,0.55) 100%)",
        }}
      >
        <div className="mx-auto flex w-full max-w-[360px] flex-col gap-2.5 pb-2">
          <button
            type="button"
            disabled={disabled}
            onClick={onSignUp}
            className="w-full rounded-full py-3.5 text-center text-[17px] font-extrabold tracking-[-0.01em] text-white transition-transform duration-150 active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50 motion-reduce:active:scale-100"
            style={{
              backgroundColor: RC.primary,
              outlineColor: RC.primaryFocus,
              fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif',
              boxShadow: "0 4px 16px rgba(0,122,255,0.4)",
            }}
          >
            S&apos;inscrire gratuitement
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={onSignIn}
            className="w-full rounded-full border-[1.5px] border-white bg-transparent py-3.5 text-[17px] font-extrabold tracking-[-0.01em] text-white transition-opacity duration-150 active:opacity-70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50"
            style={{
              outlineColor: "#ffffff",
              fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif',
            }}
          >
            J&apos;ai déjà un compte
          </button>
        </div>
      </div>
    </div>
  );
}
