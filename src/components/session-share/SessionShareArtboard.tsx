import { forwardRef } from 'react';
import {
  Activity,
  Bike,
  Calendar,
  Clock,
  MapPin,
  Users,
  Waves,
} from 'lucide-react';
import type { SessionSharePayload, SessionShareTemplateId } from '@/lib/sessionSharePayload';
import { templateDimensions } from '@/lib/sessionSharePayload';

const RC_BLUE = '#2563eb';

function ActivityGlyph({ type }: { type: string }) {
  const t = type.toLowerCase();
  if (t === 'cycling' || t === 'velo' || t === 'mtb') return <Bike className="h-7 w-7" style={{ color: RC_BLUE }} />;
  if (t === 'swimming') return <Waves className="h-7 w-7" style={{ color: RC_BLUE }} />;
  return <Activity className="h-7 w-7" style={{ color: RC_BLUE }} />;
}

function PinAvatar({
  avatarUrl,
  initials,
  size = 72,
}: {
  avatarUrl: string | null;
  initials: string;
  size?: number;
}) {
  const s = { width: size, height: size };
  return (
    <div
      className="flex items-center justify-center overflow-hidden rounded-full border-[3px] border-white shadow-md"
      style={{ ...s, background: '#e5e7eb' }}
    >
      {avatarUrl ? (
        <img src={avatarUrl} alt="" crossOrigin="anonymous" className="h-full w-full object-cover" />
      ) : (
        <span className="text-[22px] font-bold text-slate-600">{initials}</span>
      )}
    </div>
  );
}

function CtaBar({ publicUrl: _url }: { publicUrl: string }) {
  void _url;
  return (
    <div
      className="flex items-center justify-between gap-3 rounded-2xl px-6 py-4 text-white"
      style={{ background: RC_BLUE }}
    >
      <div className="flex min-w-0 items-center gap-3">
        <img src="/brand/runconnect-splash-icon.png" alt="" className="h-10 w-10 shrink-0 rounded-xl object-contain" />
        <div className="min-w-0">
          <p className="text-[11px] font-medium leading-tight text-white/90">Retrouve cette séance sur</p>
          <p className="truncate text-lg font-bold leading-tight">RunConnect</p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2 rounded-full bg-white px-4 py-2.5 text-slate-900 shadow-sm">
        <div
          className="flex h-9 w-9 items-center justify-center rounded-full text-white"
          style={{ background: RC_BLUE }}
        >
          <span className="text-lg font-bold">→</span>
        </div>
        <div className="text-left">
          <p className="text-[14px] font-bold leading-tight">Ouvrir</p>
          <p className="text-[10px] text-slate-500">Dans l&apos;app</p>
        </div>
      </div>
    </div>
  );
}

export type SessionShareArtboardProps = {
  payload: SessionSharePayload;
  templateId: SessionShareTemplateId;
  mapImageUrl: string | null;
};

export const SessionShareArtboard = forwardRef<HTMLDivElement, SessionShareArtboardProps>(
  function SessionShareArtboard({ payload, templateId, mapImageUrl }, ref) {
    const { w, h } = templateDimensions(templateId);
    const isDark = templateId === 'dark_premium';
    const isMinimal = templateId === 'minimal';
    const isStory = templateId === 'instagram_story';
    const forceRoute = templateId === 'light_route';

    const bg = isDark ? '#0f172a' : '#ffffff';
    const fg = isDark ? '#f8fafc' : '#0f172a';
    const muted = isDark ? '#94a3b8' : '#64748b';

    const showRoute = (payload.hasRoute && !isMinimal) || forceRoute;

    const mapSection = (
      <div className="relative h-full min-h-0 flex-1 overflow-hidden">
        {mapImageUrl ? (
          <img
            src={mapImageUrl}
            alt=""
            crossOrigin="anonymous"
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 bg-slate-200" />
        )}
        {!isDark && (
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background: 'linear-gradient(90deg, rgba(255,255,255,0.97) 0%, rgba(255,255,255,0.75) 38%, rgba(255,255,255,0.1) 100%)',
            }}
          />
        )}
        {isDark && (
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background: 'linear-gradient(90deg, rgba(15,23,42,0.92) 0%, rgba(15,23,42,0.55) 45%, rgba(15,23,42,0.2) 100%)',
            }}
          />
        )}
        {showRoute && (
          <div className="pointer-events-none absolute bottom-[18%] right-[12%] flex flex-col items-center">
            <div
              className="flex h-[88px] w-[88px] items-center justify-center rounded-full shadow-lg ring-4 ring-white/30"
              style={{ background: RC_BLUE }}
            >
              <PinAvatar avatarUrl={payload.sharerAvatarUrl} initials={payload.sharerInitials} size={76} />
            </div>
          </div>
        )}
        {!showRoute && (
          <div className="pointer-events-none absolute bottom-[16%] right-[14%] flex flex-col items-center">
            <div
              className="flex h-[96px] w-[96px] items-center justify-center rounded-full shadow-xl ring-4 ring-white/40"
              style={{ background: RC_BLUE }}
            >
              <PinAvatar avatarUrl={payload.sharerAvatarUrl} initials={payload.sharerInitials} size={82} />
            </div>
            <div className="mt-2 h-3 w-3 rotate-45 bg-white/90 shadow" />
          </div>
        )}
      </div>
    );

    const leftColumn = (
      <div className="flex min-w-0 flex-col gap-3 px-10 pt-10">
        <div className="flex items-center gap-2">
          <ActivityGlyph type={payload.activityType} />
          <span className="text-[13px] font-bold uppercase tracking-wide" style={{ color: RC_BLUE }}>
            {payload.activityHeader}
          </span>
        </div>
        <h1
          className="text-balance font-bold leading-[1.05] tracking-tight"
          style={{ color: fg, fontSize: isStory ? 52 : 56 }}
        >
          {payload.title}
        </h1>
        {payload.structureBadge && !isMinimal && (
          <div
            className="inline-flex w-fit rounded-full px-4 py-2 text-[15px] font-semibold text-white"
            style={{ background: RC_BLUE }}
          >
            {payload.structureBadge}
          </div>
        )}
        {(payload.pacePrimary || payload.structureBadge) && !isMinimal && (
          <div className="mt-1 flex flex-col gap-0.5">
            {payload.pacePrimary && (
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 shrink-0" style={{ color: RC_BLUE }} />
                <span className="text-[22px] font-bold" style={{ color: fg }}>
                  {payload.pacePrimary}
                </span>
              </div>
            )}
            {payload.paceSecondary && (
              <span className="pl-7 text-[13px]" style={{ color: muted }}>
                {payload.paceSecondary}
              </span>
            )}
          </div>
        )}
        <div className="my-2 h-px w-full max-w-[280px] bg-slate-200/80" style={isDark ? { background: '#334155' } : undefined} />
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 shrink-0" style={{ color: RC_BLUE }} />
            <span className="text-[19px] font-semibold capitalize" style={{ color: fg }}>
              {payload.dateLabel}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 shrink-0" style={{ color: RC_BLUE }} />
            <span className="text-[19px] font-semibold" style={{ color: fg }}>
              {payload.timeLabel}
            </span>
          </div>
        </div>
        {!isMinimal && (
          <div
            className="mt-4 w-full max-w-[420px] rounded-2xl border border-black/5 bg-white/90 p-4 shadow-[0_8px_30px_rgba(15,23,42,0.08)]"
            style={isDark ? { background: 'rgba(30,41,59,0.85)', borderColor: 'rgba(148,163,184,0.25)' } : undefined}
          >
            <div className="flex gap-2">
              <MapPin className="mt-0.5 h-5 w-5 shrink-0" style={{ color: RC_BLUE }} />
              <div className="min-w-0">
                <p className="text-[17px] font-bold leading-snug" style={{ color: fg }}>
                  {payload.locationTitle}
                </p>
                {payload.locationSubtitle && (
                  <p className="text-[14px] leading-snug" style={{ color: muted }}>
                    {payload.locationSubtitle}
                  </p>
                )}
              </div>
            </div>
            {payload.audienceLine && (
              <div className="mt-3 flex items-center gap-2 border-t border-black/5 pt-3" style={isDark ? { borderColor: '#334155' } : undefined}>
                <Users className="h-5 w-5 shrink-0" style={{ color: RC_BLUE }} />
                <span className="text-[15px] font-medium" style={{ color: fg }}>
                  {payload.audienceLine}
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    );

    const bottomCta = <CtaBar publicUrl={payload.publicUrl} />;

    if (isStory) {
      return (
        <div
          ref={ref}
          className="relative flex flex-col overflow-hidden"
          style={{ width: w, height: h, background: bg, fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}
        >
          <div className="relative min-h-0 flex-[1.15]">{mapSection}</div>
          <div className="relative z-[1] flex min-h-0 flex-[0.85] flex-col bg-white">
            {leftColumn}
            <div className="mt-auto px-6 pb-8 pt-4">{bottomCta}</div>
          </div>
        </div>
      );
    }

    return (
      <div
        ref={ref}
        className="relative flex overflow-hidden"
        style={{ width: w, height: h, background: bg, fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}
      >
        <div className="relative z-[2] flex w-[52%] min-w-0 flex-col pb-44">{leftColumn}</div>
        <div className="relative z-[1] min-w-0 flex-[1]">{mapSection}</div>
        <div className="absolute bottom-0 left-0 right-0 z-[3] px-8 pb-8 pt-4">{bottomCta}</div>
      </div>
    );
  }
);
