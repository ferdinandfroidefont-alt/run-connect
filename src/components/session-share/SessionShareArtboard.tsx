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
/** Bleu bandeau / CTA — aligné partage profil */
const RC_LIGHT = '#0066ff';

const FONT_SANS =
  '-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", system-ui, "Segoe UI", Inter, sans-serif';

function MetaRowIcon({ children }: { children: ReactNode }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        width: 40,
        height: 40,
        flexShrink: 0,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 12,
        background: 'rgba(37, 99, 235, 0.1)',
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
}: {
  avatarUrl?: string | null;
  initials?: string;
}) {
  // Pin identique à celui du Feed (MiniMapPreview) : cercle bleu + pointe + avatar rond.
  return (
    <div style={{ position: 'relative', width: 100, height: 128 }}>
      {/* Cercle bleu */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: 4,
          width: 88,
          height: 88,
          transform: 'translateX(-50%)',
          borderRadius: '999px',
          background: RC_BLUE,
          boxShadow: '0 14px 36px rgba(15,23,42,0.30)',
        }}
      />
      {/* Pointe triangulaire */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: 96,
          width: 36,
          height: 32,
          transform: 'translateX(-50%)',
          clipPath: 'polygon(50% 100%, 0 0, 100% 0)',
          background: RC_BLUE,
          filter: 'drop-shadow(0 6px 10px rgba(15,23,42,0.28))',
        }}
      />
      {/* Avatar rond avec bord blanc */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: 16,
          width: 60,
          height: 60,
          transform: 'translateX(-50%)',
          borderRadius: '999px',
          border: '4px solid #ffffff',
          overflow: 'hidden',
          background: '#e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1,
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
          <span style={{ fontSize: 22, fontWeight: 700, color: '#334155' }}>
            {(initials || 'RC').slice(0, 2)}
          </span>
        )}
      </div>
    </div>
  );
}

/** Icône RunConnect : pin de localisation avec ondes radio (identique au partage profil) */
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

/** Motif topographique discret (côté droit du bandeau) — repris du partage profil */
const FOOTER_TOPO_SVG = encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 200" preserveAspectRatio="none"><path fill="none" stroke="white" stroke-opacity="0.12" stroke-width="1" d="M0 120 Q100 100 200 130 T400 110"/><path fill="none" stroke="white" stroke-opacity="0.1" stroke-width="1" d="M0 140 Q120 125 240 150 T400 130"/><path fill="none" stroke="white" stroke-opacity="0.08" stroke-width="1" d="M0 80 Q80 60 160 90 T320 70 T400 85"/><path fill="none" stroke="white" stroke-opacity="0.09" stroke-width="1" d="M200 0 Q220 80 180 160"/></svg>'
);

/** Bandeau QR + marque — mêmes proportions que le partage profil (évite pin/typos surdimensionnés). */
function CtaBar({ publicUrl, qrDataUrl }: { publicUrl: string; qrDataUrl: string | null }) {
  const publicUrlDisplay = publicUrl.replace(/^https?:\/\//, '');
  return (
    <div
      style={{
        position: 'relative',
        display: 'flex',
        width: '100%',
        flexShrink: 0,
        alignItems: 'stretch',
        overflow: 'hidden',
        borderRadius: 28,
        background: `linear-gradient(125deg, ${RC_LIGHT} 0%, #0052d4 45%, #0039a3 100%)`,
        boxShadow: '0 16px 48px rgba(0, 82, 212, 0.22)',
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
          opacity: 0.88,
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
          minHeight: 216,
          alignItems: 'center',
          gap: 20,
          padding: '28px 28px',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
            <RunConnectPinIcon size={72} color="#ffffff" />
            <div style={{ minWidth: 0, paddingTop: 2 }}>
              <p style={{ fontSize: 16, fontWeight: 500, lineHeight: 1.3, color: 'rgba(255,255,255,0.95)', margin: 0 }}>Rejoins-moi sur</p>
              <p style={{ fontSize: 28, fontWeight: 800, lineHeight: 1.05, letterSpacing: '-0.02em', color: '#ffffff', margin: '4px 0 0 0' }}>
                RunConnect
              </p>
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

        <div style={{ height: 148, width: 1, flexShrink: 0, background: 'rgba(255,255,255,0.35)' }} aria-hidden="true" />

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0, alignSelf: 'center' }}>
          {qrDataUrl ? (
            <img
              src={qrDataUrl}
              alt=""
              crossOrigin="anonymous"
              style={{
                width: 128,
                height: 128,
                borderRadius: 12,
                border: '3px solid #ffffff',
                background: '#ffffff',
                padding: 6,
                boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
              }}
            />
          ) : (
            <div style={{ width: 128, height: 128, borderRadius: 12, border: '3px solid rgba(255,255,255,0.35)', background: 'rgba(255,255,255,0.1)' }} />
          )}
          <p
            style={{
              maxWidth: 200,
              textAlign: 'right',
              fontSize: 11,
              fontWeight: 500,
              lineHeight: 1.35,
              color: 'rgba(255,255,255,0.88)',
              wordBreak: 'break-all',
              margin: 0,
            }}
          >
            {publicUrlDisplay}
          </p>
        </div>
      </div>
    </div>
  );
}

/** Bloc infos séance — carte opaque façon fiche iOS (export PNG compatible, pas de blur). */
function SessionInfoPanel({
  children,
  isDark,
  isStory,
}: {
  children: ReactNode;
  isDark: boolean;
  isStory: boolean;
}) {
  const bg = isDark ? 'rgba(30, 41, 59, 0.94)' : '#ffffff';
  const border = isDark ? '1px solid rgba(148, 163, 184, 0.22)' : '1px solid rgba(15, 23, 42, 0.07)';
  const shadow = isDark
    ? '0 12px 44px rgba(0, 0, 0, 0.38)'
    : '0 1px 0 rgba(15, 23, 42, 0.04), 0 14px 42px rgba(15, 23, 42, 0.09)';

  const margin = isStory ? '12px 24px 6px 24px' : '26px 18px 26px 28px';
  const padding = isStory ? '26px 22px 28px' : '30px 26px 32px';

  return (
    <div style={{ margin, padding, borderRadius: 22, background: bg, border, boxShadow: shadow, minWidth: 0 }}>{children}</div>
  );
}

export type SessionShareArtboardProps = {
  payload: SessionSharePayload;
  templateId: SessionShareTemplateId;
  mapImageUrl: string | null;
  qrDataUrl?: string | null;
};

export const SessionShareArtboard = forwardRef<HTMLDivElement, SessionShareArtboardProps>(
  function SessionShareArtboard({ payload, templateId, mapImageUrl, qrDataUrl = null }, ref) {
    const { w, h } = templateDimensions(templateId);
    const isDark = templateId === 'dark_premium';
    const isMinimal = templateId === 'minimal';
    const isStory = templateId === 'instagram_story';

    const cardBg = isDark ? '#0f172a' : '#eef2f7';
    const fg = isDark ? '#f8fafc' : '#0f172a';
    const muted = isDark ? '#94a3b8' : '#64748b';
    const dividerColor = isDark ? 'rgba(51, 65, 85, 0.85)' : 'rgba(226, 232, 240, 0.95)';

    const mapSection = (
      <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
        <ShareMapBackdropImg
          mapUrl={mapImageUrl}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
        />
        {!isDark && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              pointerEvents: 'none',
              background:
                'linear-gradient(90deg, rgba(238,242,247,0.99) 0%, rgba(238,242,247,0.93) 36%, rgba(238,242,247,0.5) 58%, rgba(238,242,247,0.08) 82%, rgba(238,242,247,0) 100%)',
            }}
          />
        )}
        {isDark && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              pointerEvents: 'none',
              background: 'linear-gradient(90deg, rgba(15,23,42,0.96) 0%, rgba(15,23,42,0.85) 38%, rgba(15,23,42,0.4) 60%, rgba(15,23,42,0) 80%)',
            }}
          />
        )}
        {/* Pin centré sur la zone visible droite (≈ 75% horizontal) */}
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '75%',
            transform: 'translate(-50%, -100%)',
            pointerEvents: 'none',
          }}
        >
          <BluePinMarker avatarUrl={payload.sharerAvatarUrl} initials={payload.sharerInitials} />
        </div>
      </div>
    );

    const titleSize = isStory ? 54 : 56;
    const metaSize = isStory ? 22 : 23;
    const locTitleSize = isStory ? 24 : 25;
    const locSubSize = isStory ? 18 : 19;

    const leftColumn = (
      <SessionInfoPanel isDark={isDark} isStory={isStory}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, minWidth: 0 }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              alignSelf: 'flex-start',
              padding: '7px 14px 7px 10px',
              borderRadius: 999,
              background: isDark ? 'rgba(37, 99, 235, 0.22)' : 'rgba(37, 99, 235, 0.09)',
              border: isDark ? '1px solid rgba(96, 165, 250, 0.28)' : '1px solid rgba(37, 99, 235, 0.14)',
            }}
          >
            <ActivityGlyph type={payload.activityType} size={22} />
            <span
              style={{
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: '0.07em',
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
              fontWeight: 800,
              color: fg,
              lineHeight: 1.08,
              letterSpacing: '-0.025em',
              margin: 0,
            }}
          >
            {payload.title}
          </h1>

          {payload.structureBadge && !isMinimal && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 2 }}>
              <div
                style={{
                  display: 'inline-flex',
                  width: 'fit-content',
                  borderRadius: 14,
                  padding: '12px 22px',
                  fontSize: isStory ? 30 : 32,
                  fontWeight: 800,
                  color: '#ffffff',
                  background: `linear-gradient(135deg, ${RC_BLUE} 0%, #1d4ed8 100%)`,
                  letterSpacing: '0.01em',
                  lineHeight: 1,
                  boxShadow: '0 10px 28px rgba(37, 99, 235, 0.32)',
                }}
              >
                {payload.structureBadge}
              </div>
              {payload.pacePrimary && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 4 }}>
                  <MetaRowIcon>
                    <Clock style={{ width: 22, height: 22, color: RC_BLUE }} />
                  </MetaRowIcon>
                  <span style={{ fontSize: metaSize, fontWeight: 600, color: fg }}>
                    {payload.pacePrimary} <span style={{ color: muted, fontWeight: 500 }}>· allure cible</span>
                  </span>
                </div>
              )}
            </div>
          )}

          {payload.pacePrimary && !isMinimal && !payload.structureBadge && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 2 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <MetaRowIcon>
                  <Clock style={{ width: 22, height: 22, color: RC_BLUE }} />
                </MetaRowIcon>
                <span style={{ fontSize: metaSize + 2, fontWeight: 700, color: fg }}>{payload.pacePrimary}</span>
              </div>
              {payload.paceSecondary && (
                <span style={{ paddingLeft: 52, fontSize: 15, color: muted }}>{payload.paceSecondary}</span>
              )}
            </div>
          )}

          <div style={{ height: 1, width: '100%', maxWidth: 300, background: dividerColor, margin: '6px 0 2px' }} />

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <MetaRowIcon>
                <Calendar style={{ width: 22, height: 22, color: RC_BLUE }} />
              </MetaRowIcon>
              <span style={{ fontSize: metaSize, fontWeight: 600, color: fg, textTransform: 'capitalize' as const }}>
                {payload.dateLabel}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <MetaRowIcon>
                <Clock style={{ width: 22, height: 22, color: RC_BLUE }} />
              </MetaRowIcon>
              <span style={{ fontSize: metaSize, fontWeight: 600, color: fg }}>{payload.timeLabel}</span>
            </div>
          </div>

          {!isMinimal && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%', maxWidth: 460, marginTop: 2 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <MetaRowIcon>
                  <MapPin style={{ width: 22, height: 22, color: RC_BLUE }} />
                </MetaRowIcon>
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontSize: locTitleSize, fontWeight: 600, color: fg, lineHeight: 1.3, margin: 0 }}>
                    {payload.locationTitle}
                  </p>
                  {payload.locationSubtitle && (
                    <p style={{ fontSize: locSubSize, color: muted, lineHeight: 1.35, margin: '4px 0 0 0' }}>
                      {payload.locationSubtitle}
                    </p>
                  )}
                </div>
              </div>
              {payload.audienceLine && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <MetaRowIcon>
                    <Users style={{ width: 22, height: 22, color: RC_BLUE }} />
                  </MetaRowIcon>
                  <span style={{ fontSize: metaSize, fontWeight: 600, color: fg }}>{payload.audienceLine}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </SessionInfoPanel>
    );

    const bottomCta = <CtaBar publicUrl={payload.publicUrl} qrDataUrl={qrDataUrl} />;

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
          <div style={{ position: 'relative', flex: '1.15 1 0%', minHeight: 0 }}>{mapSection}</div>
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
            <div style={{ marginTop: 'auto', padding: '12px 28px 36px' }}>{bottomCta}</div>
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
          background: cardBg,
          borderRadius: 32,
          border: isDark ? '1px solid rgba(148,163,184,0.15)' : '1px solid rgba(15,23,42,0.06)',
          boxShadow: isDark
            ? '0 24px 64px rgba(0,0,0,0.45)'
            : '0 1px 0 rgba(15,23,42,0.04), 0 28px 64px rgba(15,23,42,0.1)',
          fontFamily: FONT_SANS,
        }}
      >
        {/* Carte en fond, occupe toute la largeur jusqu'au bord gauche */}
        <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
          {mapSection}
        </div>
        {/* Contenu textuel par-dessus à gauche */}
        <div style={{ position: 'relative', zIndex: 2, display: 'flex', flex: 1, minHeight: 0 }}>
          <div style={{ width: '58%', minWidth: 0, display: 'flex', flexDirection: 'column' }}>
            {leftColumn}
          </div>
        </div>
        <div style={{ position: 'relative', zIndex: 3, padding: '0 48px 36px', flexShrink: 0 }}>
          {bottomCta}
        </div>
      </div>
    );
  }
);
