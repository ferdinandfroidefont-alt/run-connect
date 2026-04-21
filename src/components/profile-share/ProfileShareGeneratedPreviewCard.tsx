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
 * Aperçu « Carte 3 » : composition React/CSS uniquement (mode clair, format publication Insta 1:1).
 * Stats alignées verticalement, header simplifié (logo + RunConnect en noir).
 */
export function ProfileShareGeneratedPreviewCard({ payload, locationParts, className }: Props) {
  if (!payload) {
    return (
      <div
        className={cn(
          'w-full overflow-hidden rounded-[20px] bg-muted/50 shadow-[0_8px_32px_rgba(15,23,42,0.13)] aspect-square animate-pulse',
          className
        )}
      />
    );
  }

  const sportEmoji = sportEmojiFromLabel(payload.sportLabel);

  return (
    <div
      className={cn(
        'relative w-full overflow-hidden rounded-[20px] shadow-[0_8px_32px_rgba(15,23,42,0.13)] aspect-square bg-white',
        className
      )}
    >
      {/* Fond clair : dégradé doux + halo bleu très léger */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(160deg, #ffffff 0%, #f8fafc 45%, #eff6ff 100%)',
        }}
      />
      <div
        className="pointer-events-none absolute -left-1/4 -top-1/4 h-[60%] w-[60%] rounded-full opacity-40 blur-3xl"
        style={{ background: 'radial-gradient(circle, rgba(10,132,255,0.18) 0%, transparent 65%)' }}
      />
      <div
        className="pointer-events-none absolute -bottom-1/4 -right-1/4 h-[55%] w-[55%] rounded-full opacity-30 blur-3xl"
        style={{ background: 'radial-gradient(circle, rgba(56,189,248,0.18) 0%, transparent 65%)' }}
      />

      <div className="relative flex h-full min-h-0 flex-col px-[5%] pb-4 pt-4 text-slate-900">
        {/* Header : logo + RunConnect en noir, plus rien à droite */}
        <div className="flex items-center gap-2">
          <img src="/brand/runconnect-splash-icon.png" alt="" className="h-8 w-8 shrink-0 drop-shadow-sm" />
          <span className="text-[clamp(0.85rem,3.4cqw,1.05rem)] font-extrabold tracking-tight text-slate-900">
            RunConnect
          </span>
        </div>

        <div className="mt-3 flex flex-col items-center">
          <div
            className="relative flex items-center justify-center rounded-full p-[3px] shadow-[0_10px_30px_rgba(10,132,255,0.18)]"
            style={{
              width: 'clamp(64px, 19cqw, 92px)',
              height: 'clamp(64px, 19cqw, 92px)',
              background: 'linear-gradient(135deg, #0A84FF 0%, #38BDF8 100%)',
            }}
          >
            <div className="flex h-full w-full items-center justify-center overflow-hidden rounded-full bg-white ring-2 ring-white">
              {payload.avatarUrl ? (
                <img src={payload.avatarUrl} alt="" className="h-full w-full object-cover" crossOrigin="anonymous" />
              ) : (
                <span className="text-[clamp(1.1rem,5.5cqw,1.8rem)] font-bold text-slate-700">{payload.initials}</span>
              )}
            </div>
          </div>

          <div className="mt-2.5 flex max-w-full items-center justify-center gap-1.5 px-1">
            <h2 className="max-w-[92%] truncate text-center text-[clamp(1.05rem,4.8cqw,1.5rem)] font-extrabold leading-tight tracking-tight text-slate-900">
              {payload.displayName}
            </h2>
            {payload.isPremium && (
              <BadgeCheck className="shrink-0 fill-[#0A84FF] text-white" style={{ width: '1.25rem', height: '1.25rem' }} strokeWidth={2.4} />
            )}
          </div>
          <p className="mt-0.5 text-[clamp(0.65rem,2.6cqw,0.85rem)] font-medium text-slate-500">@{payload.username}</p>

          <div className="mt-2 w-full max-w-[94%] rounded-2xl border border-sky-100 bg-sky-50/80 px-3 py-2 text-center backdrop-blur-md">
            <p className="text-[clamp(0.68rem,2.5cqw,0.8rem)] font-bold" style={{ color: ACCENT }}>
              {payload.roleLinePrimary}
            </p>
            {payload.roleLineSecondary ? (
              <p className="mt-0.5 text-[clamp(0.6rem,2.2cqw,0.72rem)] leading-snug text-slate-600">
                {payload.roleLineSecondary}
              </p>
            ) : null}
          </div>

          <div className="mt-2 flex w-full max-w-[96%] flex-wrap items-center justify-center gap-x-3 gap-y-1.5 text-[clamp(0.62rem,2.4cqw,0.76rem)] font-semibold text-slate-700">
            <span className="inline-flex min-w-0 max-w-[48%] items-center gap-1">
              <MapPin className="h-3.5 w-3.5 shrink-0" style={{ color: ACCENT }} strokeWidth={2.4} />
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
              <Footprints className="h-3.5 w-3.5 shrink-0" style={{ color: ACCENT }} strokeWidth={2.4} />
              <span className="truncate">
                {sportEmoji} {payload.sportLabel}
              </span>
            </span>
          </div>
        </div>

        {/* Stats : empilées verticalement, plus petites */}
        <div className="mt-3 flex flex-col gap-1.5">
          <StatRow icon={Calendar} value={payload.sessionsCreated} label="Séances créées" />
          <StatRow icon={Users} value={payload.sessionsJoined} label="Séances rejointes" />
          <StatRow icon={Users} value={payload.followersCount} label="Abonnés" />
          <StatRow icon={UserPlus} value={payload.followingCount} label="Abonnements" />
        </div>

        {payload.presenceRate != null ? (
          <p className="mt-1.5 text-center text-[clamp(0.62rem,2.4cqw,0.74rem)] font-bold" style={{ color: ACCENT }}>
            {payload.presenceRate}% présence
          </p>
        ) : null}

        {/* CTA (bas de carte) */}
        <div className="mt-auto flex items-end justify-between gap-2 border-t border-slate-200/80 pt-2">
          <div className="min-w-0 flex-1">
            <p className="text-[9px] font-medium uppercase tracking-wide text-slate-400">Rejoins-moi</p>
            <p className="truncate text-[10px] font-semibold text-slate-700">{payload.publicUrlDisplay}</p>
          </div>
          {payload.qrDataUrl ? (
            <div className="shrink-0 rounded-lg bg-white p-1 shadow-md ring-1 ring-slate-200">
              <img src={payload.qrDataUrl} alt="" className="h-[clamp(44px,13cqw,60px)] w-[clamp(44px,13cqw,60px)] object-contain" />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function StatRow({
  icon: Icon,
  value,
  label,
}: {
  icon: typeof Calendar;
  value: number;
  label: string;
}) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-xl border border-slate-200/80 bg-white/90 px-3 py-1.5 shadow-[0_2px_8px_rgba(15,23,42,0.04)]">
      <div className="flex min-w-0 items-center gap-2">
        <Icon className="h-3.5 w-3.5 shrink-0" style={{ color: ACCENT }} strokeWidth={2.3} />
        <span className="truncate text-[clamp(0.6rem,2.3cqw,0.74rem)] font-semibold uppercase tracking-wide text-slate-600">
          {label}
        </span>
      </div>
      <span className="shrink-0 text-[clamp(0.85rem,3.4cqw,1.05rem)] font-extrabold tabular-nums leading-none text-slate-900">
        {value}
      </span>
    </div>
  );
}
