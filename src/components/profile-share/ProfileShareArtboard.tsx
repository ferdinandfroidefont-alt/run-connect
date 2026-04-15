import { forwardRef } from 'react';
import {
  Activity,
  BarChart3,
  CheckCircle2,
  MapPin,
  Route,
  Timer,
  UserCheck,
  Users,
} from 'lucide-react';
import type { ProfileSharePayload, ProfileShareTemplateId } from '@/lib/profileSharePayload';
import { templateDimensions } from '@/lib/profileSharePayload';

const RC = '#2563eb';

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
      className="flex items-center justify-center overflow-hidden rounded-full border-[4px] border-white shadow-xl"
      style={{
        width: size,
        height: size,
        background: '#e5e7eb',
        boxShadow: `0 8px 32px rgba(37,99,235,0.35)`,
        borderColor: RC,
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

function StatCell({ value, label }: { value: number | string; label: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl bg-white/90 px-2 py-3 text-center shadow-sm">
      <span className="text-[28px] font-bold leading-none" style={{ color: RC }}>
        {value}
      </span>
      <span className="mt-1 text-[11px] font-medium leading-tight text-slate-600">{label}</span>
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
    const presence = payload.presenceRate != null ? `${payload.presenceRate}%` : '—';

    const ctaText = 'Ajoute-moi sur RunConnect';

    const footerBlue = (
      <div
        className="flex items-center justify-between gap-4 rounded-2xl px-6 py-4 text-white"
        style={{ background: RC }}
      >
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-medium text-white/95">Rejoins-moi sur</p>
          <p className="truncate text-lg font-bold">RunConnect</p>
        </div>
        {payload.qrDataUrl ? (
          <img src={payload.qrDataUrl} alt="" className="h-[72px] w-[72px] shrink-0 rounded-lg bg-white p-1" />
        ) : (
          <div className="h-[72px] w-[72px] shrink-0 rounded-lg bg-white/20" />
        )}
      </div>
    );

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
            className="pointer-events-none absolute inset-0 opacity-[0.12]"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 60 L60 0' stroke='%23fff' stroke-width='0.5' fill='none'/%3E%3C/svg%3E")`,
              backgroundSize: '48px 48px',
            }}
          />
          <div className="relative z-[1] flex items-start justify-between px-10 pt-10">
            <div className="min-w-0">
              <p className="text-[13px] font-semibold uppercase tracking-wider text-slate-400">Profil organisateur</p>
              <h1 className="mt-2 text-balance text-[44px] font-bold leading-tight text-white">{payload.displayName}</h1>
              <p className="mt-1 text-[20px] text-slate-400">@{payload.username}</p>
            </div>
            <img src="/brand/runconnect-splash-icon.png" alt="" className="h-11 w-11 shrink-0 opacity-95" />
          </div>

          <div className="relative z-[1] mt-8 flex justify-center">
            <AvatarRing avatarUrl={payload.avatarUrl} initials={payload.initials} size={140} />
          </div>

          <div className="relative z-[1] mt-8 space-y-3 px-10">
            {[
              { icon: BarChart3, text: `${payload.sessionsCreated} Séances créées` },
              { icon: Users, text: `${payload.sessionsJoined} Séances rejointes` },
              { icon: Activity, text: `${payload.modelsCount} Modèles enregistrés` },
              { icon: Route, text: `${payload.routesPublished} Itinéraires publiés` },
              ...(payload.participationsReceived > 0
                ? [{ icon: UserCheck, text: `${payload.participationsReceived} Participations reçues` }]
                : []),
              { icon: Timer, text: `${presence} Taux de présence` },
            ].map((row, i) => (
              <div key={i} className="flex items-center gap-3 rounded-xl bg-slate-800/80 px-4 py-3">
                <row.icon className="h-6 w-6 shrink-0" style={{ color: RC }} />
                <span className="text-[19px] font-semibold text-white">{row.text}</span>
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
          <div className="flex flex-col items-center px-10 pt-16">
            <AvatarRing avatarUrl={payload.avatarUrl} initials={payload.initials} size={160} />
            <div className="mt-6 flex items-center gap-2">
              <h1 className="text-center text-[48px] font-bold leading-none text-white">{payload.displayName}</h1>
              {payload.isPremium && <CheckCircle2 className="h-10 w-10 shrink-0 text-sky-400" />}
            </div>
            <p className="mt-2 text-[22px] text-slate-400">@{payload.username}</p>
            <div
              className="mt-4 rounded-full px-5 py-2 text-[15px] font-semibold text-white"
              style={{ background: RC }}
            >
              {payload.roleLabel}
            </div>
          </div>

          <div className="mt-12 space-y-6 px-12">
            <p className="text-[26px] font-semibold text-white">
              {payload.sessionsCreated} <span className="text-slate-400">séances créées</span>
            </p>
            <p className="text-[26px] font-semibold text-white">
              {payload.sessionsJoined} <span className="text-slate-400">séances rejointes</span>
            </p>
            <p className="text-[26px] font-semibold text-white">
              {presence} <span className="text-slate-400">taux de présence</span>
            </p>
          </div>

          <div className="mt-auto px-8 pb-14 pt-8">
            <div
              className="rounded-3xl px-8 py-6 text-center text-white"
              style={{ background: 'rgba(37,99,235,0.92)' }}
            >
              <p className="text-[20px] font-bold">{ctaText}</p>
              <p className="mt-2 text-[14px] text-white/90">{payload.publicUrlDisplay}</p>
            </div>
          </div>
        </div>
      );
    }

    // light_card (default)
    return (
      <div
        ref={ref}
        className="relative flex flex-col overflow-hidden bg-white"
        style={{
          width: w,
          height: h,
          fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        }}
      >
        <div
          className="relative h-[38%] min-h-[360px] w-full"
          style={{
            background: 'linear-gradient(180deg, rgba(220,252,231,0.9) 0%, rgba(255,255,255,0.95) 100%)',
          }}
        >
          <div
            className="pointer-events-none absolute inset-0 opacity-30"
            style={{
              backgroundImage: `radial-gradient(circle at 30% 20%, rgba(37,99,235,0.15), transparent 50%)`,
            }}
          />
          <div className="absolute right-8 top-8">
            <img src="/brand/runconnect-splash-icon.png" alt="" className="h-10 w-10" />
          </div>
        </div>

        <div className="relative z-[2] -mt-32 flex flex-1 flex-col px-10 pb-10">
          <div className="flex flex-col items-center">
            <AvatarRing avatarUrl={payload.avatarUrl} initials={payload.initials} size={168} />
            <div className="mt-5 flex items-center gap-2">
              <h1 className="text-center text-[46px] font-bold leading-tight text-slate-900">{payload.displayName}</h1>
              {payload.isPremium && <CheckCircle2 className="h-9 w-9 shrink-0" style={{ color: RC }} />}
            </div>
            <p className="mt-1 text-[22px] text-slate-500">@{payload.username}</p>
            <div
              className="mt-4 rounded-full px-5 py-2 text-[15px] font-semibold text-white"
              style={{ background: RC }}
            >
              {payload.roleLabel}
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-center gap-3 text-[17px] text-slate-700">
              <span className="flex items-center gap-1.5">
                <MapPin className="h-5 w-5" style={{ color: RC }} />
                {payload.locationLine}
              </span>
              <span className="text-slate-300">|</span>
              <span className="flex items-center gap-1.5">
                <Activity className="h-5 w-5" style={{ color: RC }} />
                {payload.sportLabel}
              </span>
            </div>
            {payload.clubLine && (
              <p className="mt-2 text-[15px] text-slate-500">{payload.clubLine}</p>
            )}
          </div>

          <div className="mt-8 grid grid-cols-2 gap-3">
            <StatCell value={payload.sessionsCreated} label="Séances créées" />
            <StatCell value={payload.sessionsJoined} label="Séances rejointes" />
            <StatCell value={payload.modelsCount} label="Modèles" />
            <StatCell value={payload.routesPublished} label="Itinéraires" />
          </div>

          {payload.presenceRate != null && (
            <div className="mt-5 rounded-2xl bg-sky-50 px-5 py-4">
              <div className="flex items-center justify-between">
                <span className="text-[15px] font-medium text-slate-600">Taux de présence</span>
                <span className="text-[32px] font-bold" style={{ color: RC }}>
                  {payload.presenceRate}%
                </span>
              </div>
            </div>
          )}

          <div className="mt-6">{footerBlue}</div>
        </div>
      </div>
    );
  }
);
