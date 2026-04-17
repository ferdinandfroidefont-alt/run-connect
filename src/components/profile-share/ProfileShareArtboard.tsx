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
import { ShareMapBackdropImg } from '@/components/share/ShareMapBackdropImg';
import profileShareCardV2 from '@/assets/profile-share-card-v2.png';

const RC = '#2563eb';
/** Bleu principal carte claire — plus proche de la maquette (#0055FF / #0066FF). */
const RC_LIGHT = '#0066ff';

/** Badge vérifié style dentelé (comme Twitter/X) — bleu avec coche blanche */
function VerifiedPremiumBadge({ compact, size }: { compact?: boolean; size?: number }) {
  const s = size ?? (compact ? 32 : 36);
  return (
    <span
      style={{ display: 'inline-flex', flexShrink: 0, width: s, height: s }}
      title="Premium"
      aria-hidden
    >
      <svg viewBox="0 0 24 24" width={s} height={s} fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M12 1.5c-.5 0-.9.2-1.2.5l-1.1 1.2c-.2.2-.4.3-.7.3h-1.6c-.9 0-1.6.7-1.6 1.6V6.7c0 .3-.1.5-.3.7L4.3 8.5c-.6.6-.6 1.6 0 2.2l1.2 1.1c.2.2.3.4.3.7v1.6c0 .9.7 1.6 1.6 1.6h1.6c.3 0 .5.1.7.3l1.1 1.2c.6.6 1.6.6 2.2 0l1.1-1.2c.2-.2.4-.3.7-.3h1.6c.9 0 1.6-.7 1.6-1.6v-1.6c0-.3.1-.5.3-.7l1.2-1.1c.6-.6.6-1.6 0-2.2l-1.2-1.1c-.2-.2-.3-.4-.3-.7V5.1c0-.9-.7-1.6-1.6-1.6h-1.6c-.3 0-.5-.1-.7-.3L13.2 2c-.3-.3-.7-.5-1.2-.5Z"
          fill={RC_LIGHT}
        />
        <path d="M9 12l2 2 4-4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}

/** Icône RunConnect : pin de localisation avec ondes radio */
function RunConnectPinIcon({ size = 44, color = RC_LIGHT }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M24 4C16.27 4 10 10.27 10 18c0 11 14 26 14 26s14-15 14-26c0-7.73-6.27-14-14-14Zm0 19a5 5 0 1 1 0-10 5 5 0 0 1 0 10Z" fill={color} />
      <path d="M34.5 10.5c2.5 2.8 4 6.5 4 10.5" stroke={color} strokeWidth="2" strokeLinecap="round" opacity="0.5" />
      <path d="M37.5 7.5c3.2 3.8 5 8.7 5 14" stroke={color} strokeWidth="2" strokeLinecap="round" opacity="0.3" />
      <path d="M13.5 10.5c-2.5 2.8-4 6.5-4 10.5" stroke={color} strokeWidth="2" strokeLinecap="round" opacity="0.5" />
      <path d="M10.5 7.5c-3.2 3.8-5 8.7-5 14" stroke={color} strokeWidth="2" strokeLinecap="round" opacity="0.3" />
    </svg>
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
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: '50%',
        padding: 8,
        background: RC_LIGHT,
        boxShadow: '0 18px 52px rgba(0, 102, 255, 0.26)',
        flexShrink: 0,
      }}
    >
      <div style={{ borderRadius: '50%', background: '#ffffff', padding: 8 }}>
        <div
          style={{
            width: innerSize,
            height: innerSize,
            borderRadius: '50%',
            overflow: 'hidden',
            background: '#e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {avatarUrl ? (
            <img src={avatarUrl} alt="" crossOrigin="anonymous" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <span style={{ fontSize: innerSize * 0.28, fontWeight: 700, color: '#475569' }}>
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

function RunConnectBrandHeader({ dark = false, large = false }: { dark?: boolean; large?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <img
        src="/brand/runconnect-splash-icon.png"
        alt=""
        className={cn('shrink-0 drop-shadow-sm', large ? 'h-11 w-11' : 'h-9 w-9')}
      />
      <span
        className={cn(
          'font-bold tracking-tight',
          large ? 'text-[21px]' : 'text-[18px]',
          dark ? 'text-white' : 'text-slate-900',
        )}
      >
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
    <div style={{ display: 'flex', width: '100%', gap: 12, marginTop: 20 }}>
      {items.map((row) => (
        <div
          key={row.label}
          style={{
            flex: 1,
            minWidth: 0,
            minHeight: 128,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            borderRadius: 16,
            border: '1px solid rgba(226,232,240,0.7)',
            background: 'rgba(255,255,255,0.95)',
            padding: '16px 4px',
            boxShadow: '0 4px 20px rgba(15,23,42,0.06)',
          }}
        >
          <row.icon style={{ width: 22, height: 22, flexShrink: 0, color: RC_LIGHT }} strokeWidth={2.2} />
          <span style={{ fontSize: 36, fontWeight: 800, lineHeight: 1, letterSpacing: '-0.01em', color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>{row.value}</span>
          <span style={{ fontSize: 10.5, fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.06em', lineHeight: 1.2, color: '#64748b', textAlign: 'center', maxWidth: '100%', padding: '0 4px' }}>{row.label}</span>
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
      style={{
        position: 'relative',
        display: 'flex',
        width: '100%',
        flexShrink: 0,
        alignItems: 'stretch',
        overflow: 'hidden',
        borderRadius: '0 0 36px 36px',
        background: `linear-gradient(115deg, ${RC_LIGHT} 0%, #0052d4 42%, #0039a3 100%)`,
        boxShadow: '0 -12px 40px rgba(0, 82, 212, 0.15)',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          right: 0,
          width: '55%',
          pointerEvents: 'none',
          opacity: 0.9,
          backgroundImage: `url("data:image/svg+xml,${FOOTER_TOPO_SVG}")`,
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'right bottom',
          backgroundSize: 'cover',
        }}
      />
      <div
        style={{
          position: 'relative',
          zIndex: 1,
          display: 'flex',
          width: '100%',
          minHeight: 224,
          alignItems: 'center',
          gap: 24,
          padding: '32px 32px 32px 32px',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'start', gap: 16 }}>
            <RunConnectPinIcon size={72} color="#ffffff" />
            <div style={{ minWidth: 0, paddingTop: 4 }}>
              <p style={{ fontSize: 16, fontWeight: 500, lineHeight: 1.3, color: 'rgba(255,255,255,0.95)', margin: 0 }}>Rejoins-moi sur</p>
              <p style={{ fontSize: 28, fontWeight: 800, lineHeight: 1, letterSpacing: '-0.01em', color: '#ffffff', margin: '4px 0 0 0' }}>RunConnect</p>
            </div>
          </div>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 10,
              background: '#ffffff',
              borderRadius: 50,
              padding: '10px 20px',
              width: 'fit-content',
              boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
            }}
          >
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                background: RC_LIGHT,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M5 12h14M13 5l7 7-7 7" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <span style={{ fontSize: 14, fontWeight: 700, color: RC_LIGHT, whiteSpace: 'nowrap' }}>Ouvrir avec RunConnect</span>
          </div>
        </div>

        <div style={{ height: 156, width: 1, flexShrink: 0, background: 'rgba(255,255,255,0.4)' }} aria-hidden="true" />

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8, flexShrink: 0, alignSelf: 'center' }}>
          {payload.qrDataUrl ? (
            <img
              src={payload.qrDataUrl}
              alt=""
              style={{
                width: 132,
                height: 132,
                borderRadius: 10,
                border: '3px solid #ffffff',
                background: '#ffffff',
                padding: 6,
                boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
              }}
            />
          ) : (
            <div style={{ width: 132, height: 132, borderRadius: 10, border: '3px solid rgba(255,255,255,0.35)', background: 'rgba(255,255,255,0.1)' }} />
          )}
          <p style={{ maxWidth: 220, textAlign: 'right', fontSize: 11, fontWeight: 500, lineHeight: 1.3, color: 'rgba(255,255,255,0.9)', wordBreak: 'break-all', margin: 0 }}>
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

    if (templateId === 'generated_card') {
      const fontStack = 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Inter, sans-serif';
      return (
        <div
          ref={ref}
          style={{
            position: 'relative',
            width: w,
            height: h,
            overflow: 'hidden',
            fontFamily: fontStack,
            background: '#ffffff',
          }}
        >
          <img
            src={profileShareCardV2}
            alt=""
            crossOrigin="anonymous"
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: 0 }}
          />

          {/* Avatar */}
          <div style={{ position: 'absolute', top: 140, left: '50%', transform: 'translateX(-50%)', zIndex: 2 }}>
            <AvatarRing avatarUrl={payload.avatarUrl} initials={payload.initials} size={200} />
          </div>

          {/* Name + premium badge */}
          <div style={{ position: 'absolute', top: 360, left: 0, right: 0, zIndex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, padding: '0 60px' }}>
            <h1 style={{ fontSize: 56, fontWeight: 800, color: '#0f172a', margin: 0, letterSpacing: '-0.02em', textAlign: 'center' }}>
              {payload.displayName}
            </h1>
            {payload.isPremium ? <VerifiedPremiumBadge size={42} /> : null}
          </div>

          {/* Username */}
          <p style={{ position: 'absolute', top: 440, left: 0, right: 0, zIndex: 2, textAlign: 'center', fontSize: 26, color: '#64748b', margin: 0 }}>
            @{payload.username}
          </p>

          {/* Role + location */}
          <div style={{ position: 'absolute', top: 500, left: 0, right: 0, zIndex: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 22, fontWeight: 700, color: RC_LIGHT }}>{payload.roleLinePrimary}</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 20, color: '#1e293b', fontWeight: 600 }}>
              <MapPin style={{ width: 22, height: 22, color: '#0f172a' }} strokeWidth={2.3} />
              {payload.locationLine}
              <span style={{ display: 'inline-block', width: 1, height: 18, background: '#cbd5e1', margin: '0 6px' }} />
              <Footprints style={{ width: 22, height: 22, color: '#0f172a' }} strokeWidth={2.3} />
              {payload.sportLabel}
            </span>
          </div>

          {/* Stats grid 4 */}
          <div style={{ position: 'absolute', top: 640, left: 60, right: 60, zIndex: 2, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
            {[
              { value: payload.sessionsCreated, label: 'Créées' },
              { value: payload.sessionsJoined, label: 'Rejointes' },
              { value: payload.followersCount, label: 'Abonnés' },
              { value: payload.followingCount, label: 'Suivis' },
            ].map((s) => (
              <div key={s.label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px 8px', borderRadius: 20, background: 'rgba(255,255,255,0.95)', border: '1px solid rgba(226,232,240,0.8)', boxShadow: '0 4px 16px rgba(15,23,42,0.06)' }}>
                <span style={{ fontSize: 42, fontWeight: 800, color: '#0f172a', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{s.value}</span>
                <span style={{ marginTop: 8, fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#64748b' }}>{s.label}</span>
              </div>
            ))}
          </div>

          {/* Presence */}
          {presence ? (
            <div style={{ position: 'absolute', top: 850, left: 0, right: 0, zIndex: 2, display: 'flex', justifyContent: 'center' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, padding: '12px 24px', borderRadius: 50, background: '#ffffff', border: `2px solid ${RC_LIGHT}`, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                <Users style={{ width: 20, height: 20, color: RC_LIGHT }} strokeWidth={2.3} />
                <span style={{ fontSize: 18, fontWeight: 700, color: RC_LIGHT }}>{presence} présence</span>
              </div>
            </div>
          ) : null}

          {/* QR + URL */}
          <div style={{ position: 'absolute', bottom: 50, left: 0, right: 0, zIndex: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
            {payload.qrDataUrl ? (
              <img
                src={payload.qrDataUrl}
                alt=""
                style={{ width: 150, height: 150, borderRadius: 14, padding: 8, background: '#ffffff', boxShadow: '0 6px 20px rgba(0,0,0,0.12)' }}
              />
            ) : null}
            <p style={{ fontSize: 14, fontWeight: 600, color: '#475569', margin: 0 }}>{payload.publicUrlDisplay}</p>
          </div>
        </div>
      );
    }

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
          <ShareMapBackdropImg
            mapUrl={payload.mapBackgroundUrl}
            className="pointer-events-none absolute left-0 top-0 h-full w-full object-cover"
            style={{ zIndex: 0 }}
          />
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              zIndex: 1,
              background:
                'linear-gradient(to bottom, rgba(255,255,255,0.78) 0%, rgba(255,255,255,0.72) 40%, rgba(255,255,255,0.45) 70%, rgba(255,255,255,0.18) 100%)',
            }}
          />
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.08]"
            style={{
              zIndex: 2,
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 60 L60 0' stroke='%23fff' stroke-width='0.5' fill='none'/%3E%3C/svg%3E")`,
              backgroundSize: '48px 48px',
            }}
          />
          <div className="relative z-[2] flex items-start justify-between px-10 pt-8">
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

          <div className="relative z-[2] mt-5 flex justify-center">
            <AvatarRing avatarUrl={payload.avatarUrl} initials={payload.initials} size={148} />
          </div>

          <div className="relative z-[2] mt-6 px-10">
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

          <div className="relative z-[2] mt-6 grid grid-cols-4 gap-2 px-10">
            <StatQuad value={payload.sessionsCreated} label="Séances créées" />
            <StatQuad value={payload.sessionsJoined} label="Séances rejointes" />
            <StatQuad value={payload.followersCount} label="Abonnés" />
            <StatQuad value={payload.followingCount} label="Abonnements" />
          </div>

          <div className="relative z-[2] mt-5 space-y-3 px-10">
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

          <div className="relative z-[2] mt-auto px-10 pb-10 pt-6">
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
    const fontStack = 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Inter, sans-serif';

    return (
      <div
        ref={ref}
        style={{
          position: 'relative',
          width: w,
          height: h,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          borderRadius: 36,
          fontFamily: fontStack,
          boxShadow: '0 24px 64px rgba(15, 23, 42, 0.12)',
        }}
      >
        <ShareMapBackdropImg
          mapUrl={payload.mapBackgroundUrl}
          style={{ position: 'absolute', left: 0, top: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: 0, pointerEvents: 'none' }}
        />
        <div
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 1,
            pointerEvents: 'none',
            background: 'linear-gradient(to bottom, rgba(255,255,255,0.72) 0%, rgba(255,255,255,0.68) 40%, rgba(255,255,255,0.40) 70%, rgba(255,255,255,0.15) 100%)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 1,
            pointerEvents: 'none',
            opacity: 0.35,
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.035'/%3E%3C/svg%3E")`,
          }}
        />

        {/* RunConnect brand header */}
        <div style={{ position: 'absolute', left: 40, top: 36, zIndex: 2, display: 'flex', alignItems: 'center', gap: 8 }}>
          <RunConnectPinIcon size={48} color={RC_LIGHT} />
          <span style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.01em', color: '#0f172a' }}>RunConnect</span>
        </div>

        <div style={{ position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, minHeight: 0, padding: '72px 40px 12px' }}>
            <LightCardAvatarRing avatarUrl={payload.avatarUrl} initials={payload.initials} innerSize={220} />

            {/* Name + badge */}
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: 12, marginTop: 20, maxWidth: 920, width: '100%' }}>
              <h1 style={{ fontSize: 50, fontWeight: 800, lineHeight: 1.04, letterSpacing: '-0.02em', color: '#0f172a', textAlign: 'center', margin: 0, overflowWrap: 'anywhere', maxWidth: '100%' }}>
                {payload.displayName}
              </h1>
              {payload.isPremium ? <VerifiedPremiumBadge size={38} /> : null}
            </div>

            {/* Username */}
            <p style={{ marginTop: 8, fontSize: 22, color: '#64748b', textAlign: 'center', maxWidth: '90%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: '8px 0 0 0' }}>
              @{payload.username}
            </p>

            {/* Role pill */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginTop: 14, maxWidth: '94%', borderRadius: 50, background: 'rgba(224,242,254,0.95)', padding: '12px 24px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
              <Users style={{ width: 26, height: 26, flexShrink: 0, marginTop: 2, color: RC_LIGHT }} strokeWidth={2.2} />
              <div style={{ minWidth: 0, textAlign: 'left' }}>
                <p style={{ fontSize: 16, fontWeight: 700, lineHeight: 1.3, color: RC_LIGHT, margin: 0 }}>{payload.roleLinePrimary}</p>
                {payload.roleLineSecondary ? (
                  <p style={{ fontSize: 13.5, fontWeight: 400, lineHeight: 1.4, color: '#1d4ed8', margin: '2px 0 0 0' }}>{payload.roleLineSecondary}</p>
                ) : null}
              </div>
            </div>

            {/* Location + sport */}
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: '4px 20px', marginTop: 16, maxWidth: '96%', fontSize: 17, fontWeight: 600, color: '#1e293b' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                <MapPin style={{ width: 19, height: 19, flexShrink: 0, color: '#0f172a' }} strokeWidth={2.3} />
                <span style={{ minWidth: 0, overflowWrap: 'anywhere' as const }}>{payload.locationLine}</span>
              </span>
              <span style={{ display: 'inline-block', height: 20, width: 1, flexShrink: 0, background: '#cbd5e1' }} aria-hidden="true" />
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                <Footprints style={{ width: 19, height: 19, flexShrink: 0, color: '#0f172a' }} strokeWidth={2.3} />
                <span style={{ minWidth: 0, overflowWrap: 'anywhere' as const }}>{payload.sportLabel}</span>
              </span>
            </div>

            <LightCardStatsRow payload={payload} />

            {/* Presence badge */}
            {payload.presenceRate != null ? (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginTop: 16, borderRadius: 50, border: `2px solid ${RC_LIGHT}`, background: '#ffffff', padding: '8px 20px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                <Users style={{ width: 18, height: 18, flexShrink: 0, color: RC_LIGHT }} strokeWidth={2.3} />
                <span style={{ fontSize: 15, fontWeight: 700, color: RC_LIGHT }}>{payload.presenceRate}% présence</span>
              </div>
            ) : null}
          </div>

          <LightCardFooter payload={payload} />
        </div>
      </div>
    );
  }
);
