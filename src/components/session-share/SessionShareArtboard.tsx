import { forwardRef, type ReactNode } from 'react';
import {
  Bike,
  Calendar,
  Clock,
  MapPin,
  Users,
  Waves,
} from 'lucide-react';
import type { SessionSharePayload, SessionShareTemplateId } from '@/lib/sessionSharePayload';
import { templateDimensions } from '@/lib/sessionSharePayload';
import { ShareMapBackdropImg } from '@/components/share/ShareMapBackdropImg';

const RC_BLUE = '#2563eb';
const RC_LIGHT = '#0b6cff';
const RC_DEEP = '#0a3ea8';

const FONT_SANS =
  '-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", system-ui, "Segoe UI", Inter, sans-serif';

function MetaRowIcon({ children }: { children: ReactNode }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        width: 44,
        height: 44,
        flexShrink: 0,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 14,
        background: 'rgba(37, 99, 235, 0.11)',
      }}
    >
      {children}
    </span>
  );
}

function RunnerIcon({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M13.5 5.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM9.8 8.9 7 23h2.1l1.8-8 2.1 2v6h2v-7.5l-2.1-2 .6-3A7.5 7.5 0 0 0 19 13v-2a5.4 5.4 0 0 1-4.4-2.2l-1-1.6a2 2 0 0 0-1.7-1 2 2 0 0 0-.8.2L6 9v5h2V10.1l1.8-.7"
        fill={RC_BLUE}
      />
    </svg>
  );
}

function ActivityGlyph({ type, size = 28 }: { type: string; size?: number }) {
  const t = type.toLowerCase();
  if (t === 'cycling' || t === 'velo' || t === 'mtb') return <Bike style={{ width: size, height: size, color: RC_BLUE }} />;
  if (t === 'swimming') return <Waves style={{ width: size, height: size, color: RC_BLUE }} />;
  return <RunnerIcon size={size} />;
}

function BluePinMarker({
  avatarUrl,
  initials,
  scale = 1,
}: {
  avatarUrl?: string | null;
  initials?: string;
  scale?: number;
}) {
  // Réplique exacte du pin séance utilisé sur la carte d'accueil (variant "depth").
  // Dimensions, dégradés, anneau, ombre et pointe : alignés sur `rc-session-pin__*` (src/index.css).
  const PIN_W = 58 * scale;
  const PIN_H = 72 * scale;

  return (
    <div style={{ position: 'relative', width: PIN_W, height: PIN_H }}>
      {/* Ombre au sol */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          bottom: 2,
          width: 34 * scale,
          height: 12 * scale,
          transform: 'translateX(-50%)',
          borderRadius: 999,
          background: 'rgba(15, 23, 42, 0.18)',
          filter: `blur(${5 * scale}px)`,
          zIndex: 0,
        }}
      />
      {/* Cercle (gradient depth) */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: 1 * scale,
          width: 64 * scale,
          height: 64 * scale,
          transform: 'translateX(-50%)',
          borderRadius: 999,
          background: 'rgba(59, 130, 246, 0.22)',
          filter: `blur(${8 * scale}px)`,
          zIndex: 0,
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: 3 * scale,
          width: 56 * scale,
          height: 56 * scale,
          transform: 'translateX(-50%)',
          borderRadius: 999,
          background:
            'linear-gradient(165deg, hsl(226 100% 68%) 0%, hsl(217 91% 48%) 55%, hsl(221 83% 42%) 100%)',
          boxShadow:
            '0 1px 0 rgba(255,255,255,0.38) inset, 0 -1px 0 rgba(15,23,42,0.08) inset, 0 10px 24px rgba(15,23,42,0.16)',
          zIndex: 1,
        }}
      />
      {/* Pointe triangulaire */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: 55 * scale,
          width: 13 * scale,
          height: 10 * scale,
          transform: 'translateX(-50%)',
          clipPath: 'polygon(50% 100%, 0 0, 100% 0)',
          background: 'linear-gradient(180deg, hsl(217 91% 49%) 0%, hsl(221 83% 41%) 100%)',
          filter: 'drop-shadow(0 3px 6px rgba(15,23,42,0.14))',
          zIndex: 1,
        }}
      />
      {/* Anneau blanc + avatar */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: 8 * scale,
          width: 46 * scale,
          height: 46 * scale,
          transform: 'translateX(-50%)',
          borderRadius: 999,
          border: `${3 * scale}px solid rgba(255,255,255,0.98)`,
          overflow: 'hidden',
          background: '#e2e8f0',
          boxShadow: '0 0 0 1px rgba(15,23,42,0.06)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2,
          boxSizing: 'border-box',
        }}
      >
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt=""
            crossOrigin="anonymous"
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <span style={{ fontSize: 16 * scale, fontWeight: 700, color: '#334155' }}>
            {(initials || 'RC').slice(0, 2)}
          </span>
        )}
      </div>
    </div>
  );
}

function RunConnectPinIcon({ size = 44, color = '#ffffff' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M24 4C16.27 4 10 10.27 10 18c0 11 14 26 14 26s14-15 14-26c0-7.73-6.27-14-14-14Zm0 19a5 5 0 1 1 0-10 5 5 0 0 1 0 10Z"
        fill={color}
      />
      <path d="M34.5 10.5c2.5 2.8 4 6.5 4 10.5" stroke={color} strokeWidth="2" strokeLinecap="round" opacity="0.5" />
      <path d="M37.5 7.5c3.2 3.8 5 8.7 5 14" stroke={color} strokeWidth="2" strokeLinecap="round" opacity="0.3" />
      <path d="M13.5 10.5c-2.5 2.8-4 6.5-4 10.5" stroke={color} strokeWidth="2" strokeLinecap="round" opacity="0.5" />
      <path d="M10.5 7.5c-3.2 3.8-5 8.7-5 14" stroke={color} strokeWidth="2" strokeLinecap="round" opacity="0.3" />
    </svg>
  );
}

function SessionJoinBar() {
  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        borderRadius: 28,
        overflow: 'hidden',
        background: `linear-gradient(110deg, ${RC_LIGHT} 0%, #0759dc 50%, #0352d6 100%)`,
        boxShadow: '0 16px 44px rgba(9, 86, 220, 0.25), inset 0 1px 0 rgba(255,255,255,0.28)',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(180deg, rgba(255,255,255,0.26) 0%, rgba(255,255,255,0) 38%)',
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          right: -20,
          bottom: -52,
          width: 380,
          height: 220,
          borderRadius: '50%',
          border: '1px solid rgba(255,255,255,0.16)',
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          right: 30,
          bottom: -58,
          width: 300,
          height: 190,
          borderRadius: '50%',
          border: '1px solid rgba(255,255,255,0.12)',
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'relative',
          zIndex: 1,
          minHeight: 174,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 20,
          padding: '24px 28px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, minWidth: 0 }}>
          <RunConnectPinIcon size={64} color="#ffffff" />
          <div style={{ minWidth: 0 }}>
            <p style={{ margin: 0, fontSize: 16, fontWeight: 500, color: 'rgba(255,255,255,0.92)' }}>Retrouve cette séance sur</p>
            <p style={{ margin: '2px 0 0 0', fontSize: 28, fontWeight: 800, lineHeight: 1.02, letterSpacing: '-0.02em', color: '#ffffff' }}>
              RunConnect
            </p>
          </div>
        </div>
        <div style={{ width: 1, height: 118, flexShrink: 0, background: 'rgba(255,255,255,0.34)' }} />
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            borderRadius: 26,
            padding: '18px 24px',
            background: '#ffffff',
            color: '#0f172a',
            boxShadow: '0 10px 24px rgba(2, 16, 45, 0.2)',
            flexShrink: 0,
          }}
        >
          <div
            style={{
              width: 46,
              height: 46,
              borderRadius: 999,
              background: RC_LIGHT,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M5 12h14M13 5l7 7-7 7" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
            <span style={{ fontSize: 16, fontWeight: 800, lineHeight: 1.08 }}>Ouvrir avec RunConnect</span>
            <span style={{ fontSize: 12, fontWeight: 500, lineHeight: 1.15, color: '#475569' }}>Rejoins la séance dans l&apos;app</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export type SessionShareArtboardProps = {
  payload: SessionSharePayload;
  templateId: SessionShareTemplateId;
  mapImageUrl: string | null;
  qrDataUrl?: string | null;
};

export const SessionShareArtboard = forwardRef<HTMLDivElement, SessionShareArtboardProps>(
  function SessionShareArtboard({ payload, templateId, mapImageUrl }, ref) {
    const { w, h } = templateDimensions(templateId);
    const isDark = templateId === 'dark_premium';
    const isMinimal = templateId === 'minimal';
    const isStory = templateId === 'instagram_story';

    const cardBg = isDark ? '#0f172a' : '#f8fafc';
    const fg = isDark ? '#f8fafc' : '#0b0f1a';
    const muted = isDark ? '#94a3b8' : '#64748b';
    const dividerColor = isDark ? 'rgba(51, 65, 85, 0.85)' : 'rgba(226, 232, 240, 0.95)';

    const mapSection = (
      <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
        <ShareMapBackdropImg
          mapUrl={mapImageUrl}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            filter: isDark ? 'saturate(1.06) contrast(1.04) brightness(0.96)' : 'saturate(1.08) contrast(1.08) brightness(1.01)',
          }}
        />
        {!isDark && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              pointerEvents: 'none',
              background:
                'linear-gradient(270deg, rgba(15,23,42,0.22) 0%, rgba(15,23,42,0.14) 20%, rgba(248,250,252,0.18) 52%, rgba(248,250,252,0.68) 75%, rgba(248,250,252,0.96) 100%)',
            }}
          />
        )}
        {isDark && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              pointerEvents: 'none',
              background: 'linear-gradient(270deg, rgba(2,6,23,0.48) 0%, rgba(2,6,23,0.34) 28%, rgba(15,23,42,0.22) 52%, rgba(15,23,42,0.1) 78%, rgba(15,23,42,0) 100%)',
            }}
          />
        )}
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            height: '34%',
            pointerEvents: 'none',
            background: isDark
              ? 'linear-gradient(180deg, rgba(2,6,23,0) 0%, rgba(2,6,23,0.26) 50%, rgba(2,6,23,0.64) 100%)'
              : 'linear-gradient(180deg, rgba(248,250,252,0) 0%, rgba(248,250,252,0.38) 58%, rgba(241,245,249,0.88) 100%)',
          }}
        />
        {/* Pin plus dominant sur la zone map */}
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '66%',
            transform: 'translate(-50%, -100%)',
            pointerEvents: 'none',
          }}
        >
          <BluePinMarker avatarUrl={payload.sharerAvatarUrl} initials={payload.sharerInitials} scale={1.5} />
        </div>
      </div>
    );

    const titleSize = isStory ? 74 : 82;
    const metaSize = isStory ? 22 : 24;
    const locTitleSize = isStory ? 24 : 25;
    const locSubSize = isStory ? 17 : 18;

    const leftColumn = (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 25, minWidth: 0, padding: isStory ? '38px 34px 30px' : '42px 38px 30px' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              alignSelf: 'flex-start',
              opacity: isDark ? 0.9 : 0.62,
            }}
          >
            <ActivityGlyph type={payload.activityType} size={19} />
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.13em',
                color: isDark ? '#93c5fd' : RC_BLUE,
                textTransform: 'uppercase' as const,
              }}
            >
              {payload.activityHeader}
            </span>
          </div>

          <h1
            style={{
              fontSize: titleSize,
              fontWeight: 850,
              color: fg,
              lineHeight: 1.01,
              letterSpacing: '-0.03em',
              margin: 0,
            }}
          >
            {payload.title}
          </h1>

          {payload.structureBadge && !isMinimal && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 4 }}>
              <div
                style={{
                  display: 'inline-flex',
                  width: 'fit-content',
                  borderRadius: 999,
                  padding: '15px 26px',
                  fontSize: isStory ? 34 : 36,
                  fontWeight: 800,
                  color: '#ffffff',
                  background: 'linear-gradient(135deg, #1d4ed8 0%, #2563eb 45%, #1e40af 100%)',
                  letterSpacing: '0.01em',
                  lineHeight: 1,
                  boxShadow: '0 14px 34px rgba(37, 99, 235, 0.34)',
                }}
              >
                {payload.structureBadge}
              </div>
              {payload.pacePrimary && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 8 }}>
                  <MetaRowIcon>
                    <Clock style={{ width: 22, height: 22, color: RC_BLUE }} />
                  </MetaRowIcon>
                  <span style={{ fontSize: metaSize, fontWeight: 600, color: fg }}>
                    {payload.pacePrimary} <span style={{ color: muted, fontWeight: 500, opacity: 0.6 }}>· allure cible</span>
                  </span>
                </div>
              )}
            </div>
          )}

          {payload.pacePrimary && !isMinimal && !payload.structureBadge && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 2 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <MetaRowIcon>
                  <Clock style={{ width: 24, height: 24, color: RC_BLUE }} />
                </MetaRowIcon>
                <span style={{ fontSize: metaSize + 2, fontWeight: 700, color: fg }}>{payload.pacePrimary}</span>
              </div>
              {payload.paceSecondary && (
                <span style={{ paddingLeft: 54, fontSize: 15, color: muted, opacity: 0.62 }}>{payload.paceSecondary}</span>
              )}
            </div>
          )}

          <div style={{ height: 1, width: '100%', maxWidth: 380, background: dividerColor, margin: '8px 0 6px' }} />

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <MetaRowIcon>
                <Calendar style={{ width: 24, height: 24, color: RC_BLUE }} />
              </MetaRowIcon>
              <span style={{ fontSize: metaSize, fontWeight: 600, color: fg, textTransform: 'capitalize' as const }}>
                {payload.dateLabel}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <MetaRowIcon>
                <Clock style={{ width: 24, height: 24, color: RC_BLUE }} />
              </MetaRowIcon>
              <span style={{ fontSize: metaSize, fontWeight: 600, color: fg }}>{payload.timeLabel}</span>
            </div>
          </div>

          {!isMinimal && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, width: '100%', maxWidth: 560, marginTop: 4 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
                <MetaRowIcon>
                  <MapPin style={{ width: 24, height: 24, color: RC_BLUE }} />
                </MetaRowIcon>
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontSize: locTitleSize, fontWeight: 600, color: fg, lineHeight: 1.3, margin: 0 }}>
                    {payload.locationTitle}
                  </p>
                  {payload.locationSubtitle && (
                    <p style={{ fontSize: locSubSize, color: muted, lineHeight: 1.35, opacity: 0.62, margin: '4px 0 0 0' }}>
                      {payload.locationSubtitle}
                    </p>
                  )}
                </div>
              </div>
              {payload.audienceLine && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <MetaRowIcon>
                    <Users style={{ width: 24, height: 24, color: RC_BLUE }} />
                  </MetaRowIcon>
                  <span style={{ fontSize: metaSize, fontWeight: 600, color: fg }}>{payload.audienceLine}</span>
                </div>
              )}
            </div>
          )}
      </div>
    );
    const bottomCta = <SessionJoinBar />;

    if (isStory) {
      return (
        <div
          ref={ref}
          style={{
            width: w,
            height: h,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            background: cardBg,
            fontFamily: FONT_SANS,
          }}
        >
          <div style={{ position: 'relative', flex: '1.1 1 0%', minHeight: 0 }}>{mapSection}</div>
          <div
            style={{
              position: 'relative',
              zIndex: 1,
              flex: '0.85 1 0%',
              display: 'flex',
              flexDirection: 'column',
              background: cardBg,
            }}
          >
            {leftColumn}
            <div style={{ marginTop: 'auto', padding: '10px 28px 32px' }}>{bottomCta}</div>
          </div>
        </div>
      );
    }

    return (
      <div
        ref={ref}
        style={{
          width: w,
          height: h,
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          background: isDark ? cardBg : 'linear-gradient(145deg, #ffffff 0%, #f4f8ff 100%)',
          borderRadius: 36,
          border: isDark ? '1px solid rgba(148,163,184,0.15)' : '1px solid rgba(15,23,42,0.06)',
          boxShadow: isDark
            ? '0 24px 64px rgba(0,0,0,0.45)'
            : '0 1px 0 rgba(15,23,42,0.04), 0 24px 54px rgba(15,23,42,0.13), inset 0 1px 0 rgba(255,255,255,0.85)',
          fontFamily: FONT_SANS,
        }}
      >
        {!isDark && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              zIndex: 0,
              pointerEvents: 'none',
              background:
                'radial-gradient(1200px 480px at 78% -2%, rgba(37,99,235,0.2) 0%, rgba(37,99,235,0.08) 28%, rgba(37,99,235,0) 72%)',
            }}
          />
        )}
        <div style={{ position: 'relative', zIndex: 2, display: 'flex', flex: 1, minHeight: 0, padding: '32px 34px 10px' }}>
          <div style={{ width: '43%', minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            {leftColumn}
          </div>
          <div
            style={{
              width: '57%',
              minWidth: 0,
              overflow: 'hidden',
              borderRadius: 30,
              border: isDark ? '1px solid rgba(148,163,184,0.24)' : '1px solid rgba(148,163,184,0.22)',
              background: isDark ? '#0b1220' : '#f1f5f9',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.36)',
            }}
          >
            {mapSection}
          </div>
        </div>
        <div style={{ position: 'relative', zIndex: 3, padding: '0 48px 36px', flexShrink: 0 }}>
          {bottomCta}
        </div>
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            height: 132,
            pointerEvents: 'none',
            zIndex: 4,
            background: isDark
              ? 'linear-gradient(180deg, rgba(15,23,42,0) 0%, rgba(15,23,42,0.28) 52%, rgba(2,6,23,0.58) 100%)'
              : 'linear-gradient(180deg, rgba(255,255,255,0) 0%, rgba(241,245,249,0.76) 72%, rgba(233,240,252,0.95) 100%)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            left: '8%',
            bottom: -120,
            width: 520,
            height: 260,
            borderRadius: '50%',
            pointerEvents: 'none',
            zIndex: 1,
            background: `radial-gradient(ellipse at center, ${RC_DEEP}26 0%, transparent 72%)`,
          }}
        />
      </div>
    );
  }
);
