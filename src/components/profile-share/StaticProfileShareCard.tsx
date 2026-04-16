import { Calendar, MapPin, Activity, Timer, UserPlus, Users } from 'lucide-react';

const RC_LIGHT = '#0066ff';

const formatNumber = (n: number) => new Intl.NumberFormat('fr-FR').format(n ?? 0);

type Props = {
  displayName: string;
  username: string;
  avatarUrl: string | null;
  initials: string;
  isPremium: boolean;
  roleLinePrimary: string;
  roleLineSecondary: string | null;
  locationLine: string;
  sportLabel: string;
  presenceRate: number | null;
  sessionsCreated: number;
  sessionsJoined: number;
  followersCount: number;
  followingCount: number;
};

function VerifiedBadge() {
  return (
    <span style={{ display: 'inline-flex', flexShrink: 0, width: 22, height: 22 }} aria-hidden>
      <svg viewBox="0 0 24 24" width={22} height={22} fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M12 1.5c-.5 0-.9.2-1.2.5l-1.1 1.2c-.2.2-.4.3-.7.3h-1.6c-.9 0-1.6.7-1.6 1.6V6.7c0 .3-.1.5-.3.7L4.3 8.5c-.6.6-.6 1.6 0 2.2l1.2 1.1c.2.2.3.4.3.7v1.6c0 .9.7 1.6 1.6 1.6h1.6c.3 0 .5.1.7.3l1.1 1.2c.6.6 1.6.6 2.2 0l1.1-1.2c.2-.2.4-.3.7-.3h1.6c.9 0 1.6-.7 1.6-1.6v-1.6c0-.3.1-.5.3-.7l1.2-1.1c.6-.6.6-1.6 0-2.2l-1.2-1.1c-.2-.2-.3-.4-.3-.7V5.1c0-.9-.7-1.6-1.6-1.6h-1.6c-.3 0-.5-.1-.7-.3L13.2 2c-.3-.3-.7-.5-1.2-.5Z"
          fill={RC_LIGHT}
        />
        <path d="M9 12l2 2 4-4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}

export function StaticProfileShareCard({
  displayName,
  username,
  avatarUrl,
  initials,
  isPremium,
  roleLinePrimary,
  roleLineSecondary,
  locationLine,
  sportLabel,
  presenceRate,
  sessionsCreated,
  sessionsJoined,
  followersCount,
  followingCount,
}: Props) {
  const stats = [
    { icon: Calendar, value: sessionsCreated, label: 'Séances créées' },
    { icon: Users, value: sessionsJoined, label: 'Séances rejointes' },
    { icon: Users, value: followersCount, label: 'Abonnés' },
    { icon: UserPlus, value: followingCount, label: 'Abonnements' },
  ];

  return (
    <div className="w-full overflow-hidden rounded-[24px] bg-white shadow-[0_8px_32px_rgba(15,23,42,0.13)]">
      {/* Header brand */}
      <div className="flex items-center gap-2 px-5 pt-5">
        <img src="/brand/runconnect-splash-icon.png" alt="" className="h-7 w-7 shrink-0" />
        <span className="text-[15px] font-bold tracking-tight text-slate-900">RunConnect</span>
      </div>

      {/* Avatar + name */}
      <div className="flex flex-col items-center px-5 pt-3">
        <div
          className="inline-flex items-center justify-center rounded-full p-[5px]"
          style={{ background: RC_LIGHT, boxShadow: '0 10px 28px rgba(0,102,255,0.22)' }}
        >
          <div className="rounded-full bg-white p-[5px]">
            <div
              className="flex items-center justify-center overflow-hidden rounded-full bg-slate-200"
              style={{ width: 92, height: 92 }}
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="text-[26px] font-bold text-slate-600">{initials}</span>
              )}
            </div>
          </div>
        </div>

        <div className="mt-3 flex items-center gap-1.5">
          <h2 className="text-[20px] font-bold leading-tight text-slate-900">{displayName}</h2>
          {isPremium && <VerifiedBadge />}
        </div>
        <p className="text-[13px] text-slate-500">@{username}</p>

        {/* Role pill */}
        <div
          className="mt-3 inline-flex flex-col items-center rounded-full px-4 py-1.5 text-center"
          style={{ background: RC_LIGHT }}
        >
          <span className="text-[12px] font-semibold leading-tight text-white">{roleLinePrimary}</span>
          {roleLineSecondary && (
            <span className="text-[10px] font-medium leading-tight text-white/90">{roleLineSecondary}</span>
          )}
        </div>
      </div>

      {/* Stats grid 2x2 */}
      <div className="grid grid-cols-2 gap-2 px-5 pt-4">
        {stats.map((s) => (
          <div
            key={s.label}
            className="flex flex-col items-center justify-center gap-1 rounded-2xl border border-slate-200/70 bg-white py-3 shadow-[0_2px_10px_rgba(15,23,42,0.04)]"
          >
            <s.icon className="h-4 w-4" style={{ color: RC_LIGHT }} strokeWidth={2.2} />
            <span className="text-[20px] font-extrabold leading-none tabular-nums text-slate-900">
              {formatNumber(s.value)}
            </span>
            <span className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">{s.label}</span>
          </div>
        ))}
      </div>

      {/* Info rows */}
      <div className="flex flex-col gap-1.5 px-5 pt-3">
        <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2">
          <MapPin className="h-3.5 w-3.5 shrink-0" style={{ color: RC_LIGHT }} strokeWidth={2.2} />
          <span className="truncate text-[12px] font-semibold text-slate-800">{locationLine}</span>
        </div>
        <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2">
          <Activity className="h-3.5 w-3.5 shrink-0" style={{ color: RC_LIGHT }} strokeWidth={2.2} />
          <span className="truncate text-[12px] font-semibold text-slate-800">{sportLabel}</span>
        </div>
        {presenceRate != null && (
          <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2">
            <Timer className="h-3.5 w-3.5 shrink-0" style={{ color: RC_LIGHT }} strokeWidth={2.2} />
            <span className="text-[12px] font-semibold text-slate-800">{presenceRate}% présence</span>
          </div>
        )}
      </div>

      {/* Footer CTA */}
      <div
        className="mt-4 flex items-center justify-between gap-3 px-5 py-4"
        style={{ background: `linear-gradient(115deg, ${RC_LIGHT} 0%, #0052d4 60%, #0039a3 100%)` }}
      >
        <div className="min-w-0">
          <p className="text-[11px] font-medium leading-tight text-white/90">Rejoins-moi sur</p>
          <p className="text-[18px] font-extrabold leading-tight text-white">RunConnect</p>
        </div>
        <div className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 shadow">
          <div
            className="flex h-5 w-5 items-center justify-center rounded-full"
            style={{ background: RC_LIGHT }}
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
              <path
                d="M5 12h14M13 5l7 7-7 7"
                stroke="white"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <span className="text-[11px] font-bold whitespace-nowrap" style={{ color: RC_LIGHT }}>
            Ouvrir
          </span>
        </div>
      </div>
    </div>
  );
}

export function StaticProfileShareCardSkeleton() {
  return (
    <div className="w-full animate-pulse overflow-hidden rounded-[24px] bg-white shadow-[0_8px_32px_rgba(15,23,42,0.13)]">
      <div className="flex items-center gap-2 px-5 pt-5">
        <div className="h-7 w-7 rounded-full bg-slate-200" />
        <div className="h-4 w-24 rounded bg-slate-200" />
      </div>
      <div className="flex flex-col items-center px-5 pt-3">
        <div className="h-[112px] w-[112px] rounded-full bg-slate-200" />
        <div className="mt-3 h-5 w-32 rounded bg-slate-200" />
        <div className="mt-1 h-3 w-20 rounded bg-slate-200" />
        <div className="mt-3 h-7 w-40 rounded-full bg-slate-200" />
      </div>
      <div className="grid grid-cols-2 gap-2 px-5 pt-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-[78px] rounded-2xl bg-slate-100" />
        ))}
      </div>
      <div className="flex flex-col gap-1.5 px-5 pt-3 pb-5">
        <div className="h-9 rounded-xl bg-slate-100" />
        <div className="h-9 rounded-xl bg-slate-100" />
      </div>
      <div className="h-16 bg-slate-200" />
    </div>
  );
}
