import { forwardRef } from 'react';
import { Activity, MapPin, Radio, Timer, UserCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ProfileSharePayload, ProfileShareTemplateId } from '@/lib/profileSharePayload';
import { templateDimensions } from '@/lib/profileSharePayload';

const RC = '#2563eb';

function VerifiedPremiumBadge() {
  return (
    <span
      className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white shadow-md"
      style={{ background: 'linear-gradient(135deg, #3897f0 0%, #1877f2 100%)' }}
      title="Premium"
      aria-hidden
    >
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
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

/** Une stat : chiffre au-dessus, libellé court en dessous — une seule ligne visuelle par colonne. */
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

function CtaFooter({ payload }: { payload: ProfileSharePayload }) {
  return (
    <div
      className="flex items-center gap-4 rounded-2xl px-5 py-4 text-white shadow-lg"
      style={{
        background: `linear-gradient(135deg, ${RC} 0%, #1d4ed8 100%)`,
        boxShadow: '0 10px 36px rgba(37, 99, 235, 0.35)',
      }}
    >
      <div className="relative shrink-0">
        <img src="/brand/runconnect-splash-icon.png" alt="" className="relative z-[1] h-14 w-14 rounded-2xl bg-white/10 p-1.5" />
        <span className="pointer-events-none absolute -right-0.5 -top-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-white/95 text-[#1d4ed8] shadow">
          <Radio className="h-3.5 w-3.5" strokeWidth={2.5} />
        </span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[17px] font-bold leading-snug">Rejoins-moi sur RunConnect</p>
        <p className="mt-0.5 truncate text-[12px] font-medium text-white/90">{payload.publicUrlDisplay}</p>
      </div>
      {payload.qrDataUrl ? (
        <img src={payload.qrDataUrl} alt="" className="h-[88px] w-[88px] shrink-0 rounded-xl border-2 border-white/90 bg-white p-1.5 shadow-md" />
      ) : (
        <div className="h-[88px] w-[88px] shrink-0 rounded-xl border-2 border-white/40 bg-white/10" />
      )}
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

    const footerBlue = <CtaFooter payload={payload} />;

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
              className="inline-flex rounded-full px-5 py-2 text-[15px] font-semibold text-white"
              style={{ background: RC }}
            >
              {payload.rolePillLabel}
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
              ...(presence
                ? [{ icon: Timer, text: `${presence} présence` }]
                : []),
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
            <div className="mt-4 rounded-full px-5 py-2 text-[15px] font-semibold text-white" style={{ background: RC }}>
              {payload.rolePillLabel}
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

    // light_card (default) — 1080×1080, dense, premium
    return (
      <div
        ref={ref}
        className="relative flex flex-col overflow-hidden"
        style={{
          width: w,
          height: h,
          fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          background: 'linear-gradient(165deg, #f8fafc 0%, #ffffff 38%, #f1f5f9 100%)',
        }}
      >
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse 90% 55% at 50% -5%, rgba(37,99,235,0.07), transparent 50%), radial-gradient(ellipse 70% 40% at 100% 100%, rgba(37,99,235,0.05), transparent 45%)',
          }}
        />
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.4]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E")`,
          }}
        />

        <div className="relative z-[2] flex h-full min-h-0 flex-col px-10 pb-8 pt-5">
          <div className="flex shrink-0 justify-end">
            <RunConnectBrandHeader />
          </div>

          <div className="mt-2 flex flex-col items-center">
            <AvatarRing avatarUrl={payload.avatarUrl} initials={payload.initials} size={208} />
            <div className="mt-3 flex items-center justify-center gap-2.5">
              <h1 className="text-center text-[42px] font-bold leading-[1.05] tracking-tight text-slate-900">{payload.displayName}</h1>
              {payload.isPremium ? <VerifiedPremiumBadge /> : null}
            </div>
            <p className="mt-1 text-[18px] text-slate-500">@{payload.username}</p>
            <div
              className="mt-3 max-w-[92%] truncate rounded-full px-5 py-2 text-[14px] font-semibold text-white shadow-md"
              style={{ background: RC }}
            >
              {payload.rolePillLabel}
            </div>
            <p className="mt-4 text-center text-[17px] leading-snug text-slate-700">
              <span className="font-medium">{payload.locationLine}</span>
              <span className="mx-2 text-slate-300">·</span>
              <span className="font-medium">{payload.sportLabel}</span>
            </p>
          </div>

          <div className="mt-5 grid w-full grid-cols-4 gap-2.5">
            <StatQuad value={payload.sessionsCreated} label="Séances créées" />
            <StatQuad value={payload.sessionsJoined} label="Séances rejointes" />
            <StatQuad value={payload.followersCount} label="Abonnés" />
            <StatQuad value={payload.followingCount} label="Abonnements" />
          </div>

          {payload.presenceRate != null ? (
            <div className="mt-4 flex justify-center">
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200/80 bg-white/90 px-4 py-2 shadow-sm">
                <UserCheck className="h-4 w-4" style={{ color: RC }} />
                <span className="text-[14px] font-semibold text-slate-700">{payload.presenceRate}% présence</span>
              </div>
            </div>
          ) : null}

          <div className="mt-auto min-h-0 pt-5">{footerBlue}</div>
        </div>
      </div>
    );
  }
);
