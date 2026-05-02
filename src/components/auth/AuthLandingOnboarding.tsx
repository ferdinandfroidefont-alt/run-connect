import { useCallback, useEffect, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { cn } from "@/lib/utils";
import slide1Image from "@/assets/auth-onboarding-slide-1.png";

export type AuthLandingSlide = {
  id: string;
  imageSrc: string;
  imageAlt: string;
  /** Placeholder si pas encore de capture produit */
  imagePlaceholder?: boolean;
  caption: string;
};

const DEFAULT_SLIDES: AuthLandingSlide[] = [
  {
    id: "map-friends",
    imageSrc: slide1Image,
    imageAlt: "Cyclistes planifiant une sortie ensemble",
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

function SlideVisual({ slide }: { slide: AuthLandingSlide }) {
  if (slide.imagePlaceholder || !slide.imageSrc) {
    return (
      <div
        className="flex aspect-[9/16] w-[min(72vw,280px)] flex-col items-center justify-center rounded-[28px] border border-border/60 bg-gradient-to-br from-primary/12 via-secondary/80 to-background px-6 text-center shadow-[0_24px_48px_-18px_hsl(0_0%_0%_/0.35)]"
        aria-hidden={!slide.imageAlt}
      >
        <p className="text-[13px] font-semibold uppercase tracking-[0.14em] text-primary/90">RunConnect</p>
        <p className="mt-3 text-[15px] font-medium leading-snug text-muted-foreground">
          Capture d’écran à venir
        </p>
      </div>
    );
  }

  return (
    <div
      className="relative w-[min(78vw,300px)] overflow-hidden rounded-[28px] shadow-[0_24px_48px_-18px_hsl(0_0%_0%_/0.38)] ring-1 ring-black/5"
      style={{ aspectRatio: "9 / 16" }}
    >
      <img src={slide.imageSrc} alt={slide.imageAlt} className="h-full w-full object-cover" draggable={false} />
    </div>
  );
}

type AuthLandingOnboardingProps = {
  slides?: AuthLandingSlide[];
  className?: string;
};

/**
 * Bandeau onboarding sur l’écran d’arrivée /auth : carrousel image + accroche, points de pagination synchronisés.
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
      <AuthAmbientBackdrop />

      <div ref={emblaRef} className="min-h-0 flex-1 overflow-hidden">
        <div className="flex h-full">
          {slides.map((slide) => (
            <div key={slide.id} className="min-w-0 flex-[0_0_100%] px-5">
              <div className="flex h-full min-h-0 flex-col">
                {/* Zone visuelle ~65–75 % : marges haut/bas équilibrées, chevauchement vers le bas */}
                <div className="flex min-h-0 flex-[1_1_70%] flex-col justify-center pt-[max(12px,env(safe-area-inset-top))]">
                  <div className="flex flex-1 flex-col justify-center pb-4 pt-4">
                    <div className="flex justify-center">
                      <div className="-mb-6 flex justify-center sm:-mb-8">
                        <SlideVisual slide={slide} />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="relative z-[1] shrink-0 px-1 pb-2 pt-8">
                  <p className="mx-auto max-w-[340px] text-balance text-center text-[17px] font-semibold leading-snug tracking-tight text-foreground">
                    {slide.caption}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="relative z-[2] flex shrink-0 justify-center gap-2 pb-1 pt-3">
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

function AuthAmbientBackdrop() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <div className="absolute -left-1/4 top-0 h-[55%] w-[150%] rounded-b-[40%] bg-gradient-to-b from-primary/[0.07] to-transparent" />
    </div>
  );
}
