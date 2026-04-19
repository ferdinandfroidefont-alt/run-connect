import { BadgeCheck, MapPin, Footprints, Calendar, Users, UserPlus } from 'lucide-react';
import type { ProfileSharePayload } from '@/lib/profileSharePayload';
import { PROFILE_SPORT_LABELS } from '@/lib/profileSports';
import { cn } from '@/lib/utils';

type LocationParts = { text: string; isoCode: string };

function sportEmojiFromLabel(label: string): string {
  const found = Object.values(PROFILE_SPORT_LABELS).find(
    (s) => s.label.toLowerCase() === label.toLowerCase()
  );
  return found?.emoji ?? '🏃';
}

const ACCENT = '#0A84FF';

type Props = {
  payload: ProfileSharePayload | null;
  locationParts: LocationParts;
  className?: string;
};

/**
 * Aperçu « Carte 3 » : composition React/CSS uniquement (pas de calque sur PNG carte 1).
 * Mêmes champs que les autres cartes de partage.
 */
export function ProfileShareGeneratedPreviewCard({ payload, locationParts, className }: Props) {
  if (!payload) {
    return (
      <div
        className={cn(
          'w-full overflow-hidden rounded-[20px] bg-muted/50 shadow-[0_8px_32px_rgba(15,23,42,0.13)] aspect-[4/5] animate-pulse',
          className
        )}
      />
    );
  }

  const sportEmoji = sportEmojiFromLabel(payload.sportLabel);

  return (
    <div
      className={cn(
        'relative w-full overflow-hidden rounded-[20px] shadow-[0_8px_32px_rgba(15,23,42,0.13)] aspect-[4/5]',
        className
      )}
    >
      {/* Fond : dégradé + halos (indépendant des assets carte 1 / 2) */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(145deg, #0c1222 0%, #111827 28%, #0f172a 55%, #172554 85%, #1e3a8a 100%)',
        }}
      />
      <div
        className="pointer-events-none absolute -left-1/4 -top-1/4 h-[70%] w-[70%] rounded-full opacity-[0.35] blur-3xl"
        style={{ background: 'radial-gradient(circle, rgba(10,132,255,0.55) 0%, transparent 65%)' }}
      />
      <div
        className="pointer-events-none absolute -bottom-1/4 -right-1/4 h-[60%] w-[60%] rounded-full opacity-25 blur-3xl"
        style={{ background: 'radial-gradient(circle, rgba(56,189,248,0.5) 0%, transparent 65%)' }}
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.5'/%3E%3C/svg%3E")`,
        }}
      />

      <div className="relative flex h-full min-h-0 flex-col px-[5%] pb-5 pt-6 text-white">
        <div className="flex items-center justify-between gap-2">
          <img src="/brand/runconnect-splash-icon.png" alt="" className="h-9 w-9 shrink-0 opacity-95 drop-shadow-md" />
          <span className="text-right text-[11px] font-semibold uppercase tracking-[0.14em] text-white/45">
            Profil
          </span>
        </div>

        <div className="mt-4 flex flex-col items-center">
          <div
            className="relative flex items-center justify-center rounded-full bg-gradient-to-br from-white/25 to-white/5 p-[3px] shadow-[0_12px_40px_rgba(10,132,255,0.35)]"
            style={{ width: 'clamp(72px, 22cqw, 104px)', height: 'clamp(72px, 22cqw, 104px)' }}
          >
            <div className="flex h-full w-full items-center justify-center overflow-hidden rounded-full bg-slate-800 ring-2 ring-white/90">
              {payload.avatarUrl ? (
                <img src={payload.avatarUrl} alt="" className="h-full w-full object-cover" crossOrigin="anonymous" />
              ) : (
                <span className="text-[clamp(1.25rem,6cqw,2rem)] font-bold text-white/90">{payload.initials}</span>
              )}
            </div>
          </div>

          <div className="mt-3 flex max-w-full items-center justify-center gap-1.5 px-1">
            <h2 className="max-w-[92%] truncate text-center text-[clamp(1.15rem,5.2cqw,1.65rem)] font-extrabold leading-tight tracking-tight">
              {payload.displayName}
            </h2>
            {payload.isPremium && (
              <BadgeCheck className="shrink-0 fill-[#0A84FF] text-white" style={{ width: '1.35rem', height: '1.35rem' }} strokeWidth={2.4} />
            )}
          </div>
          <p className="mt-1 text-[clamp(0.7rem,2.8cqw,0.9rem)] font-medium text-white/50">@{payload.username}</p>

          <div className="mt-3 w-full max-w-[94%] rounded-2xl border border-white/10 bg-white/[0.07] px-3 py-2.5 text-center backdrop-blur-md">
            <p className="text-[clamp(0.7rem,2.6cqw,0.82rem)] font-bold" style={{ color: ACCENT }}>
              {payload.roleLinePrimary}
            </p>
            {payload.roleLineSecondary ? (
              <p className="mt-0.5 text-[clamp(0.62rem,2.3cqw,0.75rem)] leading-snug text-white/75">
                {payload.roleLineSecondary}
              </p>
            ) : null}
          </div>

          <div className="mt-3 flex w-full max-w-[96%] flex-wrap items-center justify-center gap-x-4 gap-y-2 text-[clamp(0.65rem,2.5cqw,0.78rem)] font-semibold text-white/90">
            <span className="inline-flex min-w-0 max-w-[48%] items-center gap-1">
              <MapPin className="h-3.5 w-3.5 shrink-0 text-sky-300" strokeWidth={2.4} />
              <span className="truncate">{locationParts.text || '—'}</span>
              {locationParts.isoCode ? (
                <img
                  src={`https://flagcdn.com/${locationParts.isoCode}.svg`}
                  alt=""
                  className="inline-block shrink-0 rounded-[2px]"
                  style={{ width: '1.15em', height: '0.82em', objectFit: 'cover' }}
                />
              ) : null}
            </span>
            <span className="inline-flex min-w-0 max-w-[48%] items-center gap-1">
              <Footprints className="h-3.5 w-3.5 shrink-0 text-sky-300" strokeWidth={2.4} />
              <span className="truncate">
                {sportEmoji} {payload.sportLabel}
              </span>
            </span>
          </div>
        </div>

        <div className="mt-auto grid grid-cols-2 gap-2 pt-4">
          <StatCell icon={Calendar} value={payload.sessionsCreated} label="Créées" />
          <StatCell icon={Users} value={payload.sessionsJoined} label="Rejointes" />
          <StatCell icon={Users} value={payload.followersCount} label="Abonnés" />
          <StatCell icon={UserPlus} value={payload.followingCount} label="Abonnements" />
        </div>

        {payload.presenceRate != null ? (
          <p className="mt-2 text-center text-[clamp(0.68rem,2.6cqw,0.8rem)] font-bold" style={{ color: ACCENT }}>
            {payload.presenceRate}% présence
          </p>
        ) : null}

        <div className="mt-3 flex items-end justify-between gap-3 border-t border-white/10 pt-3">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-medium uppercase tracking-wide text-white/40">Rejoins-moi</p>
            <p className="truncate text-[11px] font-semibold text-white/80">{payload.publicUrlDisplay}</p>
          </div>
          {payload.qrDataUrl ? (
            <div className="shrink-0 rounded-lg bg-white p-1 shadow-lg">
              <img src={payload.qrDataUrl} alt="" className="h-[clamp(52px,16cqw,72px)] w-[clamp(52px,16cqw,72px)] object-contain" />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function StatCell({
  icon: Icon,
  value,
  label,
}: {
  icon: typeof Calendar;
  value: number;
  label: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-white/10 bg-white/[0.06] px-1 py-2.5 backdrop-blur-sm">
      <Icon className="mb-1 h-4 w-4 text-sky-300/90" strokeWidth={2.2} />
      <span className="text-[clamp(1rem,4.2cqw,1.35rem)] font-extrabold tabular-nums leading-none text-white">{value}</span>
      <span className="mt-1 max-w-full px-0.5 text-center text-[9px] font-semibold uppercase tracking-wide text-white/45">{label}</span>
    </div>
  );
}
