import { useCallback, useEffect, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { cn } from "@/lib/utils";
import slide1Image from "@/assets/auth-onboarding-slide-1.png";

export type AuthLandingSlide = {
  id: string;
  /** Image de fond — plein cadre sur la zone héros (~65–75 % de la hauteur d’écran). */
  imageSrc: string;
  imageAlt: string;
  /** Capture d’écran de l’app superposée au centre (optionnel). */
  appScreenshotSrc?: string;
  appScreenshotAlt?: string;
  /** Pas encore de visuel : fond dégradé plein cadre. */
  imagePlaceholder?: boolean;
  caption: string;
};

const DEFAULT_SLIDES: AuthLandingSlide[] = [
  {
    id: "map-friends",
    imageSrc: slide1Image,
    imageAlt: "Ambiance sport et entraide entre coureurs",
    caption: "Planifie tes séances sur la carte avec tes amis",
  },
  {
    id: "nearby",
    imageSrc: "",
    imagePlaceholder: true,
    imageAlt: "",
    caption: "Découvre des séances près de toi et rejoins la communauté en un instant.",
  },
  {
    id: "organize",
    imageSrc: "",
    imagePlaceholder: true,
    imageAlt: "",
    caption: "Organise tes parcours, fixe un rendez-vous et coordonne-toi sans friction.",
  },
  {
    id: "together",
    imageSrc: "",
    imagePlaceholder: true,
    imageAlt: "",
    caption: "Entraîne-toi avec d’autres sportifs et reste motivé sur la durée.",
  },
];

/** Hauteur de la zone « fond + capture » : ~65–75 % de la fenêtre. */
const HERO_HEIGHT_CLASS = "h-[70dvh] min-h-[240px] max-h-[75dvh]";

function SlideHeroBackground({ slide }: { slide: AuthLandingSlide }) {
  if (slide.imagePlaceholder || !slide.imageSrc) {
    return (
      <div
        className="absolute inset-0 bg-gradient-to-br from-primary/25 via-primary/10 to-secondary/90"
        aria-hidden
      />
    );
  }

  return (
    <img
      src={slide.imageSrc}
      alt={slide.imageAlt}
      className="absolute inset-0 h-full w-full object-cover object-center"
      draggable={false}
    />
  );
}

/** Couche pour la capture d’app (non obligatoire). Centrée, sans rogner le fond. */
function SlideAppScreenshotOverlay({ slide }: { slide: AuthLandingSlide }) {
  if (!slide.appScreenshotSrc) {
    return null;
  }

  return (
    <div className="pointer-events-none absolute inset-0 z-[1] flex items-center justify-center p-[min(4vw,18px)]">
      <img
        src={slide.appScreenshotSrc}
        alt={slide.appScreenshotAlt ?? ""}
        className="max-h-[min(72dvh,92%)] w-auto max-w-[min(92vw,380px)] rounded-[20px] object-contain shadow-[0_20px_50px_-12px_rgba(0,0,0,0.45)] ring-1 ring-white/25"
        draggable={false}
      />
    </div>
  );
}

type AuthLandingOnboardingProps = {
  slides?: AuthLandingSlide[];
  className?: string;
};

/**
 * Bandeau onboarding sur l’écran d’arrivée /auth : carrousel, points de pagination synchronisés.
 * Les boutons d’action restent gérés par le parent (fixes sous ce bloc).
 */
export function AuthLandingOnboarding({ slides = DEFAULT_SLIDES, className }: AuthLandingOnboardingProps) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: false, align: "start", axis: "x" });
  const [active, setActive] = useState(0);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setActive(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    emblaApi.on("select", onSelect);
    onSelect();
    return () => {
      emblaApi.off("select", onSelect);
    };
  }, [emblaApi, onSelect]);

  return (
    <div className={cn("relative z-10 flex min-h-0 w-full flex-1 flex-col", className)}>
      <div ref={emblaRef} className="min-h-0 flex-1 overflow-hidden">
        <div className="flex h-full">
          {slides.map((slide) => (
            <div key={slide.id} className="min-w-0 flex-[0_0_100%]">
              <div className="flex h-full min-h-0 flex-col">
                {/* Zone héros : fond plein cadre (bords écran gauche/droit + haut/bas de cette bande). */}
                <div className={cn("relative w-full shrink-0 overflow-hidden", HERO_HEIGHT_CLASS)}>
                  <SlideHeroBackground slide={slide} />
                  <SlideAppScreenshotOverlay slide={slide} />
                </div>

                <div className="relative z-[2] shrink-0 bg-background px-5 pb-2 pt-5">
                  <p className="mx-auto max-w-[340px] text-balance text-center text-[17px] font-semibold leading-snug tracking-tight text-foreground">
                    {slide.caption}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="relative z-[2] flex shrink-0 justify-center gap-2 bg-background pb-1 pt-3">
        {slides.map((s, i) => (
          <button
            key={s.id}
            type="button"
            aria-label={`Slide ${i + 1}`}
            aria-current={i === active}
            className={cn(
              "h-2 w-2 rounded-full transition-all duration-200",
              i === active ? "scale-125 bg-primary" : "bg-muted-foreground/35 hover:bg-muted-foreground/50"
            )}
            onClick={() => emblaApi?.scrollTo(i)}
          />
        ))}
      </div>
    </div>
  );
}
