import { forwardRef } from 'react';
import {
  Activity,
  Calendar,
  ChevronRight,
  Footprints,
  MapPin,
  Timer,
  UserPlus,
  Users,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ProfileSharePayload, ProfileShareTemplateId } from '@/lib/profileSharePayload';
import { templateDimensions } from '@/lib/profileSharePayload';

const RC = '#2563eb';
/** Bleu principal carte claire — plus proche de la maquette (#0055FF / #0066FF). */
const RC_LIGHT = '#0066ff';

function VerifiedPremiumBadge({ compact }: { compact?: boolean }) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full text-white shadow-md',
        compact ? 'h-8 w-8' : 'h-9 w-9'
      )}
      style={{ background: 'linear-gradient(135deg, #3897f0 0%, #1877f2 100%)' }}
      title="Premium"
      aria-hidden
    >
      <svg
        viewBox="0 0 24 24"
        className={compact ? 'h-4 w-4' : 'h-5 w-5'}
        fill="none"
        stroke="currentColor"
        strokeWidth="2.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polyline points="20 6 9 17 4 12" />
      </svg>
    </span>
  );
}

function AvatarRing({
  avatarUrl,
  initials,
  size,
}: {
  avatarUrl: string | null;
  initials: string;
  size: number;
}) {
  return (
    <div
      className="flex items-center justify-center overflow-hidden rounded-full border-[5px] border-white shadow-xl"
      style={{
        width: size,
        height: size,
        background: '#e2e8f0',
        boxShadow: `0 12px 40px rgba(37,99,235,0.22)`,
        borderColor: '#fff',
      }}
    >
      {avatarUrl ? (
        <img src={avatarUrl} alt="" crossOrigin="anonymous" className="h-full w-full object-cover" />
      ) : (
        <span className="font-bold text-slate-600" style={{ fontSize: size * 0.28 }}>
          {initials}
        </span>
      )}
    </div>
  );
}

/**
 * Maquette : bordure blanche épaisse autour de la photo, puis fin anneau bleu vif (pas l’inverse).
 */
function LightCardAvatarRing({
  avatarUrl,
  initials,
  innerSize,
}: {
  avatarUrl: string | null;
  initials: string;
  innerSize: number;
}) {
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-full p-[3px]"
      style={{
        background: RC_LIGHT,
        boxShadow: '0 18px 52px rgba(0, 102, 255, 0.28)',
      }}
    >
      <div className="rounded-full bg-white p-[10px] shadow-inner">
        <div
          className="flex items-center justify-center overflow-hidden rounded-full bg-slate-200"
          style={{ width: innerSize, height: innerSize }}
        >
          {avatarUrl ? (
            <img src={avatarUrl} alt="" crossOrigin="anonymous" className="h-full w-full object-cover" />
          ) : (
            <span className="font-bold text-slate-600" style={{ fontSize: innerSize * 0.28 }}>
              {initials}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

/** Une stat : chiffre au-dessus, libellé court en dessous — templates sombres. */
function StatQuad({ value, label }: { value: number | string; label: string }) {
  return (
    <div className="flex min-w-0 flex-col items-center justify-center rounded-xl border border-slate-200/90 bg-white/90 px-1 py-2.5 text-center shadow-sm">
      <span className="text-[30px] font-bold leading-none tabular-nums" style={{ color: RC }}>
        {value}
      </span>
      <span className="mt-1.5 max-w-[100%] px-0.5 text-[10px] font-semibold uppercase leading-tight tracking-wide text-slate-600">
        {label}
      </span>
    </div>
  );
}

function RunConnectBrandHeader({ dark = false }: { dark?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <img src="/brand/runconnect-splash-icon.png" alt="" className="h-9 w-9 shrink-0 drop-shadow-sm" />
      <span className={cn('text-[18px] font-bold tracking-tight', dark ? 'text-white' : 'text-slate-900')}>
        RunConnect
      </span>
    </div>
  );
}

function LightCardStatsRow({ payload }: { payload: ProfileSharePayload }) {
  const items = [
    { icon: Calendar, value: payload.sessionsCreated, label: 'Séances créées' },
    { icon: Users, value: payload.sessionsJoined, label: 'Séances rejointes' },
    { icon: Users, value: payload.followersCount, label: 'Abonnés' },
    { icon: UserPlus, value: payload.followingCount, label: 'Abonnements' },
  ] as const;

  return (
    <div className="mt-5 flex w-full min-w-0 gap-2.5">
      {items.map((row) => (
        <div
          key={row.label}
          className="flex min-h-[118px] min-w-0 flex-1 flex-col items-center justify-center gap-1.5 rounded-[14px] border border-slate-200/90 bg-white px-1 py-3 shadow-[0_3px_14px_rgba(15,23,42,0.07)]"
        >
          <row.icon className="h-[22px] w-[22px] shrink-0" strokeWidth={2.25} style={{ color: RC_LIGHT }} />
          <span className="text-[31px] font-bold tabular-nums leading-none tracking-tight text-slate-900">{row.value}</span>
          <span className="max-w-[100%] px-1 text-center text-[10px] font-semibold leading-[1.2] text-slate-500">{row.label}</span>
        </div>
      ))}
    </div>
  );
}

/** Motif topographique discret (côté droit du bandeau), comme la maquette. */
const FOOTER_TOPO_SVG = encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 200" preserveAspectRatio="none"><path fill="none" stroke="white" stroke-opacity="0.12" stroke-width="1" d="M0 120 Q100 100 200 130 T400 110"/><path fill="none" stroke="white" stroke-opacity="0.1" stroke-width="1" d="M0 140 Q120 125 240 150 T400 130"/><path fill="none" stroke="white" stroke-opacity="0.08" stroke-width="1" d="M0 80 Q80 60 160 90 T320 70 T400 85"/><path fill="none" stroke="white" stroke-opacity="0.09" stroke-width="1" d="M200 0 Q220 80 180 160"/></svg>'
);

function LightCardFooter({ payload }: { payload: ProfileSharePayload }) {
  return (
    <div
      className="relative flex w-full shrink-0 items-stretch overflow-hidden rounded-b-[36px]"
      style={{
        background: `linear-gradient(115deg, ${RC_LIGHT} 0%, #0052d4 42%, #0039a3 100%)`,
        boxShadow: '0 -12px 40px rgba(0, 82, 212, 0.15)',
      }}
    >
      <div
        className="pointer-events-none absolute inset-y-0 right-0 w-[55%] opacity-90"
        style={{
          backgroundImage: `url("data:image/svg+xml,${FOOTER_TOPO_SVG}")`,
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'right bottom',
          backgroundSize: 'cover',
        }}
      />
      <div className="relative z-[1] flex min-h-[200px] w-full items-center gap-6 px-7 pb-8 pt-8">
        <div className="flex min-w-0 flex-1 flex-col gap-4">
          <div className="flex items-start gap-4">
            <img
              src="/brand/runconnect-splash-icon.png"
              alt=""
              className="h-[76px] w-[76px] shrink-0 brightness-0 invert drop-shadow-md"
            />
            <div className="min-w-0 pt-0.5">
              <p className="text-[15px] font-medium leading-tight text-white/95">Rejoins-moi sur</p>
              <p className="mt-0.5 text-[26px] font-extrabold leading-none tracking-tight text-white">RunConnect</p>
            </div>
          </div>
          <a
            href={payload.publicUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex w-max max-w-full items-center gap-2 rounded-full bg-white px-5 py-2.5 text-[13px] font-bold shadow-lg transition-opacity hover:opacity-95"
            style={{ color: RC_LIGHT }}
          >
            Ouvrir avec RunConnect
            <ChevronRight className="h-4 w-4 shrink-0" strokeWidth={2.8} style={{ color: RC_LIGHT }} />
          </a>
        </div>

        <div className="h-[148px] w-px shrink-0 bg-white/45" aria-hidden />

        <div className="flex shrink-0 flex-col items-end gap-1.5 self-center">
          {payload.qrDataUrl ? (
            <img
              src={payload.qrDataUrl}
              alt=""
              className="h-[128px] w-[128px] rounded-[10px] border-[3px] border-white bg-white p-1.5 shadow-lg"
            />
          ) : (
            <div className="h-[128px] w-[128px] rounded-[10px] border-[3px] border-white/35 bg-white/10" />
          )}
          <p className="max-w-[220px] text-right text-[10px] font-medium leading-tight text-white/90 [word-break:break-all]">
            {payload.publicUrlDisplay}
          </p>
        </div>
      </div>
    </div>
  );
}

export type ProfileShareArtboardProps = {
  payload: ProfileSharePayload;
  templateId: ProfileShareTemplateId;
};

export const ProfileShareArtboard = forwardRef<HTMLDivElement, ProfileShareArtboardProps>(
  function ProfileShareArtboard({ payload, templateId }, ref) {
    const { w, h } = templateDimensions(templateId);
    const presence = payload.presenceRate != null ? `${payload.presenceRate}%` : null;

    const ctaText = 'Ajoute-moi sur RunConnect';

    if (templateId === 'organizer_focus') {
      return (
        <div
          ref={ref}
          className="relative flex flex-col overflow-hidden"
          style={{
            width: w,
            height: h,
            background: 'linear-gradient(165deg, #0f172a 0%, #020617 55%, #0b1220 100%)',
            fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          }}
        >
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.08]"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 60 L60 0' stroke='%23fff' stroke-width='0.5' fill='none'/%3E%3C/svg%3E")`,
              backgroundSize: '48px 48px',
            }}
          />
          <div className="relative z-[1] flex items-start justify-between px-10 pt-8">
            <div className="min-w-0">
              <p className="text-[13px] font-semibold uppercase tracking-wider text-slate-400">Profil organisateur</p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <h1 className="text-balance text-[44px] font-bold leading-tight text-white">{payload.displayName}</h1>
                {payload.isPremium ? <VerifiedPremiumBadge /> : null}
              </div>
              <p className="mt-1 text-[19px] text-slate-400">@{payload.username}</p>
            </div>
            <RunConnectBrandHeader dark />
          </div>

          <div className="relative z-[1] mt-5 flex justify-center">
            <AvatarRing avatarUrl={payload.avatarUrl} initials={payload.initials} size={148} />
          </div>

          <div className="relative z-[1] mt-6 px-10">
            <div
              className="inline-flex flex-col items-start rounded-full px-5 py-2.5 text-left text-[15px] font-semibold text-white"
              style={{ background: RC }}
            >
              <span>{payload.roleLinePrimary}</span>
              {payload.roleLineSecondary ? (
                <span className="mt-0.5 text-[12px] font-medium text-white/90">{payload.roleLineSecondary}</span>
              ) : null}
            </div>
          </div>

          <div className="relative z-[1] mt-6 grid grid-cols-4 gap-2 px-10">
            <StatQuad value={payload.sessionsCreated} label="Séances créées" />
            <StatQuad value={payload.sessionsJoined} label="Séances rejointes" />
            <StatQuad value={payload.followersCount} label="Abonnés" />
            <StatQuad value={payload.followingCount} label="Abonnements" />
          </div>

          <div className="relative z-[1] mt-5 space-y-3 px-10">
            {[
              { icon: MapPin, text: payload.locationLine },
              { icon: Activity, text: payload.sportLabel },
              ...(presence ? [{ icon: Timer, text: `${presence} présence` }] : []),
            ].map((row, i) => (
              <div key={i} className="flex items-center gap-3 rounded-xl bg-slate-800/80 px-4 py-3">
                <row.icon className="h-6 w-6 shrink-0" style={{ color: RC }} />
                <span className="text-[18px] font-semibold text-white">{row.text}</span>
              </div>
            ))}
          </div>

          <div className="relative z-[1] mt-auto px-10 pb-10 pt-6">
            <div className="rounded-2xl bg-black px-6 py-4 text-white">
              <p className="text-center text-[16px] font-semibold">{ctaText}</p>
              <p className="mt-1 text-center text-[12px] text-slate-400">{payload.publicUrlDisplay}</p>
            </div>
          </div>
        </div>
      );
    }

    if (templateId === 'minimal_story') {
      return (
        <div
          ref={ref}
          className="relative flex flex-col overflow-hidden"
          style={{
            width: w,
            height: h,
            background: 'linear-gradient(180deg, #1e293b 0%, #0f172a 40%, #020617 100%)',
            fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          }}
        >
          <div className="flex items-start justify-end px-10 pt-10">
            <RunConnectBrandHeader dark />
          </div>
          <div className="flex flex-col items-center px-10 pt-4">
            <AvatarRing avatarUrl={payload.avatarUrl} initials={payload.initials} size={168} />
            <div className="mt-5 flex items-center gap-2">
              <h1 className="text-center text-[48px] font-bold leading-none text-white">{payload.displayName}</h1>
              {payload.isPremium ? <VerifiedPremiumBadge /> : null}
            </div>
            <p className="mt-2 text-[21px] text-slate-400">@{payload.username}</p>
            <div
              className="mt-4 inline-flex flex-col items-center rounded-full px-5 py-2 text-center text-[15px] font-semibold text-white"
              style={{ background: RC }}
            >
              <span>{payload.roleLinePrimary}</span>
              {payload.roleLineSecondary ? (
                <span className="mt-0.5 text-[12px] font-medium text-white/90">{payload.roleLineSecondary}</span>
              ) : null}
            </div>
          </div>

          <div className="mt-10 grid grid-cols-4 gap-2 px-10">
            <StatQuad value={payload.sessionsCreated} label="Créées" />
            <StatQuad value={payload.sessionsJoined} label="Rejointes" />
            <StatQuad value={payload.followersCount} label="Abonnés" />
            <StatQuad value={payload.followingCount} label="Abonnements" />
          </div>

          {presence ? (
            <p className="mt-8 px-12 text-center text-[28px] font-semibold text-white">
              {presence} <span className="text-slate-400">présence</span>
            </p>
          ) : null}

          <div className="mt-auto px-8 pb-14 pt-10">
            <div className="rounded-3xl px-8 py-6 text-center text-white" style={{ background: 'rgba(37,99,235,0.92)' }}>
              <p className="text-[20px] font-bold">{ctaText}</p>
              <p className="mt-2 text-[14px] text-white/90">{payload.publicUrlDisplay}</p>
            </div>
          </div>
        </div>
      );
    }

    // light_card — 1080×1080, aligné maquette partage
    return (
      <div
        ref={ref}
        className="relative flex flex-col overflow-hidden rounded-[36px]"
        style={{
          width: w,
          height: h,
          fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          boxShadow: '0 24px 64px rgba(15, 23, 42, 0.12)',
        }}
      >
        {payload.mapBackgroundUrl ? (
          <img
            src={payload.mapBackgroundUrl}
            alt=""
            crossOrigin="anonymous"
            className="pointer-events-none absolute inset-0 h-full w-full scale-[1.06] object-cover opacity-[0.44]"
          />
        ) : null}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/[0.92] via-white/[0.88] to-white/[0.93]" />
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.35]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.035'/%3E%3C/svg%3E")`,
          }}
        />

        <div className="absolute left-10 top-8 z-20">
          <RunConnectBrandHeader />
        </div>

        <div className="relative z-10 flex h-full min-h-0 flex-col">
          <div className="flex min-h-0 flex-1 flex-col items-center px-10 pb-3 pt-[72px]">
            <LightCardAvatarRing avatarUrl={payload.avatarUrl} initials={payload.initials} innerSize={188} />

            <div className="mt-4 flex w-full max-w-[920px] flex-wrap items-center justify-center gap-2.5">
              <h1 className="max-w-full text-center text-[40px] font-bold leading-[1.08] tracking-tight text-slate-900 [overflow-wrap:anywhere]">
                {payload.displayName}
              </h1>
              {payload.isPremium ? <VerifiedPremiumBadge compact /> : null}
            </div>

            <p className="mt-1 max-w-[90%] truncate text-center text-[17px] text-slate-500">@{payload.username}</p>

            <div className="mt-3 flex max-w-[94%] items-start gap-2.5 rounded-full bg-sky-100/95 px-5 py-2.5 shadow-sm">
              <Users className="mt-0.5 h-6 w-6 shrink-0" strokeWidth={2.25} style={{ color: RC_LIGHT }} />
              <div className="min-w-0 text-left">
                <p className="text-[15px] font-bold leading-tight" style={{ color: RC_LIGHT }}>
                  {payload.roleLinePrimary}
                </p>
                {payload.roleLineSecondary ? (
                  <p className="mt-0.5 text-[13px] font-normal leading-snug" style={{ color: '#1d4ed8' }}>
                    {payload.roleLineSecondary}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="mt-4 flex max-w-[96%] flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[15px] font-semibold text-slate-800">
              <span className="inline-flex min-w-0 items-center gap-1.5">
                <MapPin className="h-4 w-4 shrink-0 text-slate-900" strokeWidth={2.4} />
                <span className="min-w-0 [overflow-wrap:anywhere]">{payload.locationLine}</span>
              </span>
              <span className="inline-block h-4 w-px shrink-0 bg-slate-300" aria-hidden />
              <span className="inline-flex min-w-0 items-center gap-1.5">
                <Footprints className="h-4 w-4 shrink-0 text-slate-900" strokeWidth={2.4} />
                <span className="min-w-0 [overflow-wrap:anywhere]">{payload.sportLabel}</span>
              </span>
            </div>

            <LightCardStatsRow payload={payload} />

            {payload.presenceRate != null ? (
              <div
                className="mt-3.5 inline-flex items-center gap-2 rounded-full border-2 bg-white px-4 py-1.5 shadow-sm"
                style={{ borderColor: RC_LIGHT }}
              >
                <Users className="h-4 w-4 shrink-0" strokeWidth={2.4} style={{ color: RC_LIGHT }} />
                <span className="text-[14px] font-bold" style={{ color: RC_LIGHT }}>
                  {payload.presenceRate}% présence
                </span>
              </div>
            ) : null}
          </div>

          <LightCardFooter payload={payload} />
        </div>
      </div>
    );
  }
);
