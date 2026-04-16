import { forwardRef } from 'react';
import { Calendar, MapPin, Users, UserPlus, Footprints } from 'lucide-react';
import type { ProfileSharePayload } from '@/lib/profileSharePayload';

const RC_BLUE = '#0066ff';

/** Badge vérifié style X / Twitter (Premium). */
function VerifiedBadge({ size = 36 }: { size?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ flexShrink: 0 }}
      aria-hidden
    >
      <path
        d="M12 1.5c-.5 0-.9.2-1.2.5l-1.1 1.2c-.2.2-.4.3-.7.3h-1.6c-.9 0-1.6.7-1.6 1.6V6.7c0 .3-.1.5-.3.7L4.3 8.5c-.6.6-.6 1.6 0 2.2l1.2 1.1c.2.2.3.4.3.7v1.6c0 .9.7 1.6 1.6 1.6h1.6c.3 0 .5.1.7.3l1.1 1.2c.6.6 1.6.6 2.2 0l1.1-1.2c.2-.2.4-.3.7-.3h1.6c.9 0 1.6-.7 1.6-1.6v-1.6c0-.3.1-.5.3-.7l1.2-1.1c.6-.6.6-1.6 0-2.2l-1.2-1.1c-.2-.2-.3-.4-.3-.7V5.1c0-.9-.7-1.6-1.6-1.6h-1.6c-.3 0-.5-.1-.7-.3L13.2 2c-.3-.3-.7-.5-1.2-.5Z"
        fill={RC_BLUE}
      />
      <path d="M9 12l2 2 4-4" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Logo RunConnect : pin avec ondes */
function BrandPin({ size = 44, color = RC_BLUE }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <path d="M24 4C16.27 4 10 10.27 10 18c0 11 14 26 14 26s14-15 14-26c0-7.73-6.27-14-14-14Zm0 19a5 5 0 1 1 0-10 5 5 0 0 1 0 10Z" fill={color} />
      <path d="M34.5 10.5c2.5 2.8 4 6.5 4 10.5" stroke={color} strokeWidth="2" strokeLinecap="round" opacity="0.5" />
      <path d="M37.5 7.5c3.2 3.8 5 8.7 5 14" stroke={color} strokeWidth="2" strokeLinecap="round" opacity="0.3" />
      <path d="M13.5 10.5c-2.5 2.8-4 6.5-4 10.5" stroke={color} strokeWidth="2" strokeLinecap="round" opacity="0.5" />
      <path d="M10.5 7.5c-3.2 3.8-5 8.7-5 14" stroke={color} strokeWidth="2" strokeLinecap="round" opacity="0.3" />
    </svg>
  );
}

/** Avatar avec anneau bleu (style maquette). */
function AvatarRing({ avatarUrl, initials, innerSize }: { avatarUrl: string | null; initials: string; innerSize: number }) {
  return (
    <div
      style={{
        display: 'inline-flex',
        borderRadius: '50%',
        padding: 6,
        background: RC_BLUE,
        boxShadow: '0 16px 40px rgba(0,102,255,0.28)',
      }}
    >
      <div style={{ borderRadius: '50%', background: '#fff', padding: 6 }}>
        <div
          style={{
            width: innerSize,
            height: innerSize,
            borderRadius: '50%',
            overflow: 'hidden',
            background: '#cbd5e1',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#64748b',
            fontWeight: 700,
            fontSize: innerSize * 0.32,
          }}
        >
          {avatarUrl ? (
            <img src={avatarUrl} alt="" crossOrigin="anonymous" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            initials
          )}
        </div>
      </div>
    </div>
  );
}

/** Une stat carrée. */
function StatCell({
  Icon,
  value,
  label,
}: {
  Icon: React.ComponentType<{ size?: number; color?: string; strokeWidth?: number; style?: React.CSSProperties }>;
  value: number | string;
  label: string;
}) {
  return (
    <div
      style={{
        flex: 1,
        minWidth: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        padding: '14px 4px 16px',
        borderRadius: 16,
        background: '#ffffff',
        border: '1px solid rgba(226,232,240,0.9)',
        boxShadow: '0 2px 10px rgba(15,23,42,0.05)',
      }}
    >
      <Icon size={24} color={RC_BLUE} strokeWidth={2.2} />
      <span
        style={{
          fontSize: 36,
          fontWeight: 800,
          lineHeight: 1,
          color: '#0f172a',
          fontVariantNumeric: 'tabular-nums',
          letterSpacing: '-0.02em',
        }}
      >
        {value}
      </span>
      <span
        style={{
          fontSize: 12,
          fontWeight: 500,
          color: '#475569',
          textAlign: 'center',
          lineHeight: 1.2,
          padding: '0 2px',
        }}
      >
        {label}
      </span>
    </div>
  );
}

export type ProfileShareCardProps = {
  payload: ProfileSharePayload;
};

/**
 * Carte de partage profil — rendue à 1080×1080 (à scale via CSS pour l'aperçu).
 * Reproduit fidèlement la maquette validée : header logo, avatar central,
 * nom + badge premium, @username, pill rôle/club, ville + sport, 4 stats,
 * pill % présence, footer bleu avec QR + URL.
 */
export const ProfileShareCard = forwardRef<HTMLDivElement, ProfileShareCardProps>(
  function ProfileShareCard({ payload }, ref) {
    const W = 1080;
    const H = 1080;

    return (
      <div
        ref={ref}
        style={{
          position: 'relative',
          width: W,
          height: H,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          borderRadius: 32,
          background: '#f8fafc',
          fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Inter, sans-serif',
        }}
      >
        {/* Fond carte (Mapbox) */}
        {payload.mapBackgroundUrl ? (
          <img
            src={payload.mapBackgroundUrl}
            alt=""
            crossOrigin="anonymous"
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: 0 }}
          />
        ) : null}
        {/* Voile blanc pour lisibilité */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 1,
            background:
              'linear-gradient(to bottom, rgba(255,255,255,0.78) 0%, rgba(255,255,255,0.72) 45%, rgba(255,255,255,0.55) 75%, rgba(255,255,255,0.30) 100%)',
          }}
        />

        {/* Header logo */}
        <div style={{ position: 'absolute', top: 36, left: 40, zIndex: 3, display: 'flex', alignItems: 'center', gap: 10 }}>
          <BrandPin size={48} />
          <span style={{ fontSize: 26, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.01em' }}>RunConnect</span>
        </div>

        {/* Contenu central */}
        <div
          style={{
            position: 'relative',
            zIndex: 2,
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: '110px 48px 24px',
          }}
        >
          <AvatarRing avatarUrl={payload.avatarUrl} initials={payload.initials} innerSize={210} />

          {/* Nom + badge */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginTop: 22, maxWidth: '100%' }}>
            <h1
              style={{
                margin: 0,
                fontSize: 60,
                fontWeight: 800,
                lineHeight: 1.05,
                color: '#0f172a',
                letterSpacing: '-0.02em',
                textAlign: 'center',
                overflowWrap: 'anywhere',
              }}
            >
              {payload.displayName}
            </h1>
            {payload.isPremium ? <VerifiedBadge size={42} /> : null}
          </div>

          {/* Username */}
          <p style={{ margin: '6px 0 0', fontSize: 24, color: '#94a3b8', fontWeight: 500 }}>
            @{payload.username}
          </p>

          {/* Pill rôle */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'flex-start',
              gap: 12,
              marginTop: 20,
              borderRadius: 50,
              background: 'rgba(219,234,254,0.92)',
              padding: '14px 28px',
              maxWidth: '90%',
            }}
          >
            <Users size={26} color={RC_BLUE} strokeWidth={2.2} style={{ flexShrink: 0, marginTop: 2 }} />
            <div style={{ minWidth: 0, textAlign: 'left' }}>
              <p style={{ margin: 0, fontSize: 18, fontWeight: 700, color: RC_BLUE, lineHeight: 1.2 }}>
                {payload.roleLinePrimary}
              </p>
              {payload.roleLineSecondary ? (
                <p style={{ margin: '2px 0 0', fontSize: 14, color: '#1d4ed8', lineHeight: 1.3 }}>
                  {payload.roleLineSecondary}
                </p>
              ) : null}
            </div>
          </div>

          {/* Ville + sport */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 22,
              marginTop: 18,
              fontSize: 19,
              fontWeight: 600,
              color: '#1e293b',
              flexWrap: 'wrap',
              maxWidth: '94%',
            }}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <MapPin size={20} color="#0f172a" strokeWidth={2.3} />
              <span>{payload.locationLine}</span>
            </span>
            <span style={{ display: 'inline-block', width: 1, height: 22, background: '#cbd5e1' }} aria-hidden />
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <Footprints size={20} color="#0f172a" strokeWidth={2.3} />
              <span>{payload.sportLabel}</span>
            </span>
          </div>

          {/* 4 stats */}
          <div style={{ display: 'flex', gap: 12, marginTop: 22, width: '100%' }}>
            <StatCell Icon={Calendar as any} value={payload.sessionsCreated} label="Séances créées" />
            <StatCell Icon={Users as any} value={payload.sessionsJoined} label="Séances rejointes" />
            <StatCell Icon={Users as any} value={payload.followersCount} label="Abonnés" />
            <StatCell Icon={UserPlus as any} value={payload.followingCount} label="Abonnements" />
          </div>

          {/* Présence */}
          {payload.presenceRate != null ? (
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 10,
                marginTop: 18,
                borderRadius: 50,
                background: 'rgba(219,234,254,0.92)',
                padding: '10px 22px',
              }}
            >
              <Users size={20} color={RC_BLUE} strokeWidth={2.3} />
              <span style={{ fontSize: 18, fontWeight: 700, color: RC_BLUE }}>
                {payload.presenceRate}% <span style={{ color: '#0f172a', fontWeight: 600 }}>présence</span>
              </span>
            </div>
          ) : null}
        </div>

        {/* Footer bleu */}
        <div
          style={{
            position: 'relative',
            zIndex: 3,
            display: 'flex',
            alignItems: 'center',
            gap: 24,
            padding: '28px 36px 32px',
            background: `linear-gradient(115deg, ${RC_BLUE} 0%, #0052d4 100%)`,
            borderRadius: '0 0 32px 32px',
          }}
        >
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <BrandPin size={64} color="#ffffff" />
              <div>
                <p style={{ margin: 0, fontSize: 18, color: 'rgba(255,255,255,0.95)', fontWeight: 500 }}>Rejoins-moi sur</p>
                <p style={{ margin: '2px 0 0', fontSize: 32, fontWeight: 800, color: '#fff', letterSpacing: '-0.01em', lineHeight: 1 }}>
                  RunConnect
                </p>
              </div>
            </div>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 10,
                background: '#fff',
                borderRadius: 50,
                padding: '10px 20px',
                width: 'fit-content',
                boxShadow: '0 4px 14px rgba(0,0,0,0.12)',
              }}
            >
              <span
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: '50%',
                  background: RC_BLUE,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path d="M5 12h14M13 5l7 7-7 7" stroke="white" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              <span style={{ fontSize: 15, fontWeight: 700, color: RC_BLUE, whiteSpace: 'nowrap' }}>
                Ouvrir avec RunConnect
              </span>
            </div>
          </div>

          <div style={{ width: 1, height: 160, background: 'rgba(255,255,255,0.4)', flexShrink: 0 }} aria-hidden />

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            {payload.qrDataUrl ? (
              <img
                src={payload.qrDataUrl}
                alt=""
                style={{
                  width: 140,
                  height: 140,
                  borderRadius: 12,
                  background: '#fff',
                  padding: 6,
                  boxShadow: '0 4px 14px rgba(0,0,0,0.15)',
                }}
              />
            ) : (
              <div
                style={{
                  width: 140,
                  height: 140,
                  borderRadius: 12,
                  background: 'rgba(255,255,255,0.15)',
                  border: '2px solid rgba(255,255,255,0.35)',
                }}
              />
            )}
            <p
              style={{
                margin: 0,
                fontSize: 12,
                color: 'rgba(255,255,255,0.95)',
                fontWeight: 500,
                wordBreak: 'break-all',
                textAlign: 'center',
                maxWidth: 200,
              }}
            >
              {payload.publicUrlDisplay}
            </p>
          </div>
        </div>
      </div>
    );
  },
);
