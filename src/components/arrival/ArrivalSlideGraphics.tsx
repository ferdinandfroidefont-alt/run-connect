import { cn } from "@/lib/utils";

/** Carte + pins — slide « séances autour de toi » */
export function SlideGraphicNearby({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "relative mx-auto aspect-[4/3] w-full max-w-[320px] overflow-hidden rounded-[20px] border border-border/60 bg-gradient-to-b from-sky-100/90 to-background shadow-[0_20px_50px_-12px_hsl(0_0%_0%_/0.18)] dark:from-sky-950/40 dark:to-background",
        className
      )}
    >
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 320 240" aria-hidden>
        <defs>
          <linearGradient id="gMap" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="hsl(var(--muted))" stopOpacity="0.35" />
            <stop offset="100%" stopColor="hsl(var(--card))" stopOpacity="0.9" />
          </linearGradient>
        </defs>
        <rect width="320" height="240" fill="url(#gMap)" rx="12" />
        <path
          d="M40 180 Q80 120 120 140 T200 100 T280 60"
          fill="none"
          stroke="hsl(var(--primary))"
          strokeWidth="3"
          strokeLinecap="round"
          opacity="0.35"
        />
        <circle cx="200" cy="88" r="36" fill="hsl(var(--primary) / 0.12)" />
        <circle cx="200" cy="88" r="6" fill="hsl(var(--primary))" />
      </svg>
      <div className="absolute left-[12%] top-[18%] flex flex-col items-center gap-1">
        <div className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card text-[11px] font-semibold shadow-sm">
          JD
        </div>
        <span className="rounded-full bg-background/90 px-2 py-0.5 text-[10px] font-medium text-muted-foreground shadow-sm backdrop-blur-sm">
          2 km
        </span>
      </div>
      <div className="absolute right-[14%] top-[38%] flex flex-col items-center gap-1">
        <div className="h-8 w-8 rounded-full border-2 border-primary bg-primary/15 shadow-[0_0_0_4px_hsl(var(--primary)/0.15)]" />
        <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold text-primary-foreground shadow-sm">
          Séance
        </span>
      </div>
      <div className="absolute bottom-[14%] left-[22%] flex flex-col items-center gap-1">
        <div className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card text-[11px] font-semibold shadow-sm">
          AL
        </div>
        <span className="rounded-full bg-background/90 px-2 py-0.5 text-[10px] font-medium text-muted-foreground shadow-sm backdrop-blur-sm">
          4 km
        </span>
      </div>
      <div className="absolute bottom-[10%] right-[10%] rounded-[10px] bg-card/95 px-2.5 py-1.5 text-[10px] font-medium shadow-md backdrop-blur-sm">
        Carte live
      </div>
    </div>
  );
}

/** Fiche séance + Rejoindre */
export function SlideGraphicSessionJoin({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "relative mx-auto aspect-[4/3] w-full max-w-[320px] overflow-hidden rounded-[20px] border border-border/60 bg-gradient-to-br from-background to-muted/40 shadow-[0_20px_50px_-12px_hsl(0_0%_0%_/0.15)]",
        className
      )}
    >
      <div className="absolute left-3 top-3 right-3 rounded-[14px] border border-border/70 bg-card/95 p-3 shadow-lg backdrop-blur-md">
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="text-[13px] font-bold leading-tight">Sortie footing</p>
          <span className="rounded-md bg-primary/12 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
            18:30
          </span>
        </div>
        <p className="text-[11px] text-muted-foreground">Parc · 8 km · Débutants OK</p>
        <div className="mt-3 flex gap-2">
          <div className="h-7 flex-1 rounded-[8px] bg-primary text-center text-[12px] font-semibold leading-7 text-primary-foreground shadow-sm">
            Rejoindre
          </div>
          <div className="h-7 w-14 rounded-[8px] border border-border bg-secondary text-center text-[11px] leading-7 text-muted-foreground">
            Infos
          </div>
        </div>
      </div>
      <svg className="absolute inset-0 -z-10 h-full w-full" viewBox="0 0 320 240" aria-hidden>
        <rect width="320" height="240" fill="hsl(var(--muted) / 0.25)" rx="16" />
        <circle cx="160" cy="170" r="10" fill="hsl(var(--primary))" opacity="0.85" />
        <circle cx="160" cy="170" r="28" fill="none" stroke="hsl(var(--primary))" strokeWidth="2" opacity="0.35" />
      </svg>
    </div>
  );
}

/** Itinéraire tracé + RDV */
export function SlideGraphicRoutePlan({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "relative mx-auto aspect-[4/3] w-full max-w-[320px] overflow-hidden rounded-[20px] border border-border/60 bg-gradient-to-b from-emerald-50/80 to-background shadow-[0_20px_50px_-12px_hsl(0_0%_0%_/0.16)] dark:from-emerald-950/25",
        className
      )}
    >
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 320 240" aria-hidden>
        <rect width="320" height="240" fill="hsl(var(--muted) / 0.2)" rx="14" />
        <path
          d="M50 180 C90 40 230 40 270 160"
          fill="none"
          stroke="hsl(var(--primary))"
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray="8 6"
        />
        <circle cx="50" cy="180" r="7" fill="hsl(var(--primary))" />
        <circle cx="270" cy="160" r="7" fill="hsl(142 70% 42%)" />
        <rect x="118" y="96" width="84" height="36" rx="10" fill="hsl(var(--card))" stroke="hsl(var(--border))" />
        <text x="160" y="118" textAnchor="middle" fill="hsl(var(--foreground))" fontSize="11" fontWeight="600">
          RDV
        </text>
      </svg>
      <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between rounded-[12px] bg-card/95 px-3 py-2 text-[11px] font-medium shadow-md backdrop-blur-sm">
        <span className="text-muted-foreground">Parcours</span>
        <span className="font-semibold text-foreground">12,4 km</span>
      </div>
    </div>
  );
}

/** Communauté — avatars + dynamique */
export function SlideGraphicCommunity({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "relative mx-auto aspect-[4/3] w-full max-w-[320px] overflow-hidden rounded-[20px] border border-border/60 bg-gradient-to-br from-violet-50/90 to-background shadow-[0_20px_50px_-12px_hsl(0_0%_0%_/0.14)] dark:from-violet-950/30",
        className
      )}
    >
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6">
        <div className="flex -space-x-3">
          {["SK", "MR", "AL", "JD"].map((t) => (
            <div
              key={t}
              className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-background bg-gradient-to-br from-primary/25 to-primary/5 text-[12px] font-bold shadow-md"
            >
              {t}
            </div>
          ))}
        </div>
        <div className="w-full max-w-[260px] space-y-2 rounded-[14px] border border-border/60 bg-card/95 p-3 shadow-md backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-primary/15 text-center text-[10px] font-bold leading-8 text-primary">
              RC
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[12px] font-semibold">Séance terminée · bravo !</p>
              <p className="text-[11px] text-muted-foreground">+42 points communauté</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
