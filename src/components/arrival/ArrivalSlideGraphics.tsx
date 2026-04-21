import { cn } from "@/lib/utils";

function PhoneFrame({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "relative mx-auto w-full max-w-[290px] rounded-[28px] border border-border/70 bg-card p-2 shadow-[0_30px_70px_-24px_hsl(0_0%_0%_/0.35)]",
        className
      )}
    >
      <div className="absolute left-1/2 top-1.5 h-1.5 w-16 -translate-x-1/2 rounded-full bg-muted-foreground/25" />
      <div className="overflow-hidden rounded-[22px] border border-border/60 bg-background">{children}</div>
    </div>
  );
}

/** Écran type "map home" — proche d’une capture app. */
export function SlideGraphicNearby({ className }: { className?: string }) {
  return (
    <PhoneFrame className={className}>
      <div className="relative h-[208px] bg-gradient-to-b from-sky-100/80 to-background dark:from-sky-950/35">
        <div className="absolute inset-x-0 top-0 flex items-center justify-between px-3 py-2">
          <div className="rounded-full bg-card/95 px-3 py-1 text-[10px] font-semibold shadow-sm">Autour de toi</div>
          <div className="h-7 w-7 rounded-full bg-card/95 shadow-sm" />
        </div>
        <svg className="absolute inset-0 h-full w-full" viewBox="0 0 290 208" aria-hidden>
          <path d="M12 165 Q48 122 78 132 T142 100 T278 54" fill="none" stroke="hsl(var(--primary))" strokeWidth="3" opacity="0.4" />
          <circle cx="215" cy="78" r="34" fill="hsl(var(--primary)/0.12)" />
          <circle cx="215" cy="78" r="6" fill="hsl(var(--primary))" />
          <circle cx="92" cy="138" r="5" fill="hsl(142 70% 42%)" />
        </svg>
        <div className="absolute left-4 top-[30%] rounded-full bg-card/95 px-2 py-0.5 text-[10px] shadow-sm">2 km</div>
        <div className="absolute right-4 top-[56%] rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold text-primary-foreground shadow-sm">
          Séance live
        </div>
      </div>
      <div className="space-y-2 bg-background p-2.5">
        <div className="rounded-[12px] border border-border/60 bg-card px-2.5 py-2">
          <p className="text-[11px] font-semibold">Footing groupe · 18:30</p>
          <p className="text-[10px] text-muted-foreground">Parc central · 6 participants</p>
        </div>
        <div className="h-2 w-20 rounded-full bg-muted-foreground/20 mx-auto" />
      </div>
    </PhoneFrame>
  );
}

/** Écran type "détail séance" */
export function SlideGraphicSessionJoin({ className }: { className?: string }) {
  return (
    <PhoneFrame className={className}>
      <div className="space-y-2.5 bg-background p-2.5">
        <div className="rounded-[14px] border border-border/60 bg-card p-3 shadow-sm">
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <p className="text-[12px] font-bold">Sortie footing</p>
            <span className="rounded-md bg-primary/12 px-1.5 py-0.5 text-[10px] font-semibold text-primary">18:30</span>
          </div>
          <p className="text-[10px] text-muted-foreground">Parc • 8 km • Débutants OK</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className="rounded-[9px] bg-primary py-2 text-center text-[11px] font-semibold text-primary-foreground">Rejoindre</div>
            <div className="rounded-[9px] border border-border bg-secondary py-2 text-center text-[11px] text-muted-foreground">Créer</div>
          </div>
        </div>
        <div className="rounded-[14px] border border-border/60 bg-card p-3">
          <div className="mb-2 flex items-center gap-2">
            <div className="h-7 w-7 rounded-full bg-primary/15" />
            <div className="min-w-0">
              <p className="text-[11px] font-semibold">Alex organise</p>
              <p className="text-[10px] text-muted-foreground">5 min ago</p>
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground">“Départ devant l’entrée nord, rythme progressif.”</p>
        </div>
      </div>
    </PhoneFrame>
  );
}

/** Écran type "création itinéraire / map editor" */
export function SlideGraphicRoutePlan({ className }: { className?: string }) {
  return (
    <PhoneFrame className={className}>
      <div className="relative h-[150px] bg-gradient-to-b from-emerald-100/70 to-background dark:from-emerald-950/30">
        <svg className="absolute inset-0 h-full w-full" viewBox="0 0 290 150" aria-hidden>
          <path d="M30 116 C68 24 206 24 252 98" fill="none" stroke="hsl(var(--primary))" strokeWidth="4" strokeDasharray="7 5" />
          <circle cx="30" cy="116" r="6" fill="hsl(var(--primary))" />
          <circle cx="252" cy="98" r="6" fill="hsl(142 70% 42%)" />
        </svg>
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-[9px] border border-border bg-card/95 px-2 py-1 text-[10px] font-semibold shadow-sm">
          Point de RDV
        </div>
      </div>
      <div className="space-y-2 bg-background p-2.5">
        <div className="flex items-center justify-between rounded-[11px] border border-border/60 bg-card px-2.5 py-2 text-[11px]">
          <span className="text-muted-foreground">Distance</span>
          <span className="font-semibold">12,4 km</span>
        </div>
        <div className="flex items-center justify-between rounded-[11px] border border-border/60 bg-card px-2.5 py-2 text-[11px]">
          <span className="text-muted-foreground">Dénivelé</span>
          <span className="font-semibold">+220 m</span>
        </div>
      </div>
    </PhoneFrame>
  );
}

/** Écran type "feed communauté / progression". */
export function SlideGraphicCommunity({ className }: { className?: string }) {
  return (
    <PhoneFrame className={className}>
      <div className="space-y-2.5 bg-background p-2.5">
        <div className="rounded-[14px] border border-border/60 bg-card p-3">
          <p className="text-[11px] font-semibold">Progression hebdo</p>
          <div className="mt-2 flex items-end gap-1.5">
            {[28, 42, 36, 52, 48, 62, 54].map((h, i) => (
              <div key={i} className="flex-1 rounded-t-[5px] bg-primary/70" style={{ height: `${h / 2}px` }} />
            ))}
          </div>
        </div>
        <div className="rounded-[14px] border border-border/60 bg-card p-3">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-primary/15" />
            <div className="min-w-0">
              <p className="text-[11px] font-semibold">Séance terminée · bravo !</p>
              <p className="text-[10px] text-muted-foreground">+42 points communauté</p>
            </div>
          </div>
          <div className="mt-2.5 flex -space-x-2">
            <div className="h-6 w-6 rounded-full border-2 border-card bg-violet-400/70" />
            <div className="h-6 w-6 rounded-full border-2 border-card bg-sky-400/70" />
            <div className="h-6 w-6 rounded-full border-2 border-card bg-emerald-400/70" />
            <div className="h-6 w-6 rounded-full border-2 border-card bg-primary/70" />
          </div>
        </div>
      </div>
    </PhoneFrame>
  );
}
