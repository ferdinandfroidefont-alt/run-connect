import { forwardRef } from 'react';
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

function ActivityGlyph({ type }: { type: string }) {
  const t = type.toLowerCase();
  if (t === 'cycling' || t === 'velo' || t === 'mtb') return <Bike style={{ width: 28, height: 28, color: RC_BLUE }} />;
  if (t === 'swimming') return <Waves style={{ width: 28, height: 28, color: RC_BLUE }} />;
  return <RunnerIcon size={28} />;
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

/** Footer QR — strictement aligné sur la barre du partage profil. */
function CtaBar({ publicUrl, qrDataUrl }: { publicUrl: string; qrDataUrl: string | null }) {
  const RC_LIGHT = '#0066ff';
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
        borderRadius: 24,
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
          minHeight: 200,
          alignItems: 'center',
          gap: 24,
          padding: '28px 28px',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18, flex: 1, minWidth: 0, paddingLeft: 40 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 22 }}>
            <RunConnectPinIcon size={140} color="#ffffff" />
            <div style={{ minWidth: 0 }}>
              <p style={{ fontSize: 22, fontWeight: 600, lineHeight: 1.2, color: 'rgba(255,255,255,0.95)', margin: 0 }}>
                Rejoins-moi sur
              </p>
              <p style={{ fontSize: 42, fontWeight: 800, lineHeight: 1, letterSpacing: '-0.02em', color: '#ffffff', margin: '6px 0 0 0' }}>
                RunConnect
              </p>
            </div>
          </div>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 12,
              background: '#ffffff',
              borderRadius: 60,
              padding: '14px 26px',
              width: 'fit-content',
              marginLeft: 162,
              boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
            }}
          >
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: '50%',
                background: RC_LIGHT,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M5 12h14M13 5l7 7-7 7" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <span style={{ fontSize: 18, fontWeight: 700, color: RC_LIGHT, whiteSpace: 'nowrap' }}>
              Ouvrir avec RunConnect
            </span>
          </div>
        </div>

        <div style={{ height: 140, width: 1, flexShrink: 0, background: 'rgba(255,255,255,0.4)' }} aria-hidden="true" />

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8, flexShrink: 0, alignSelf: 'center' }}>
          {qrDataUrl ? (
            <img
              src={qrDataUrl}
              alt=""
              crossOrigin="anonymous"
              style={{
                width: 120,
                height: 120,
                borderRadius: 10,
                border: '3px solid #ffffff',
                background: '#ffffff',
                padding: 6,
                boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
              }}
            />
          ) : (
            <div style={{ width: 120, height: 120, borderRadius: 10, border: '3px solid rgba(255,255,255,0.35)', background: 'rgba(255,255,255,0.1)' }} />
          )}
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
  function SessionShareArtboard({ payload, templateId, mapImageUrl, qrDataUrl = null }, ref) {
    const { w, h } = templateDimensions(templateId);
    const isDark = templateId === 'dark_premium';
    const isMinimal = templateId === 'minimal';
    const isStory = templateId === 'instagram_story';

    const cardBg = isDark ? '#0f172a' : '#f5f7fa';
    const fg = isDark ? '#f8fafc' : '#0f172a';
    const muted = isDark ? '#94a3b8' : '#64748b';
    const cardInnerBg = isDark ? 'rgba(30,41,59,0.85)' : '#ffffff';
    const dividerColor = isDark ? '#334155' : '#e2e8f0';

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
              background: 'linear-gradient(90deg, rgba(245,247,250,0.98) 0%, rgba(245,247,250,0.92) 38%, rgba(245,247,250,0.55) 58%, rgba(245,247,250,0.05) 80%, rgba(245,247,250,0) 100%)',
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

    const leftColumn = (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '44px 0 0 44px', minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <ActivityGlyph type={payload.activityType} />
          <span style={{ fontSize: 18, fontWeight: 800, letterSpacing: '0.08em', color: RC_BLUE, textTransform: 'uppercase' as const }}>
            {payload.activityHeader}
          </span>
        </div>

        <h1
          style={{
            fontSize: isStory ? 60 : 68,
            fontWeight: 800,
            color: fg,
            lineHeight: 1.05,
            letterSpacing: '-0.02em',
            margin: 0,
          }}
        >
          {payload.title}
        </h1>

        {payload.structureBadge && !isMinimal && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4 }}>
            <div
              style={{
                display: 'inline-flex',
                width: 'fit-content',
                borderRadius: 60,
                padding: '16px 36px',
                fontSize: isStory ? 36 : 40,
                fontWeight: 800,
                color: '#ffffff',
                background: RC_BLUE,
                letterSpacing: '0.01em',
                lineHeight: 1,
                boxShadow: '0 8px 24px rgba(37, 99, 235, 0.35)',
              }}
            >
              {payload.structureBadge}
            </div>
            {payload.pacePrimary && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 10 }}>
                <Clock style={{ width: 28, height: 28, flexShrink: 0, color: RC_BLUE }} />
                <span style={{ fontSize: 26, fontWeight: 600, color: fg }}>
                  {payload.pacePrimary} <span style={{ color: muted, fontWeight: 500 }}>· allure cible</span>
                </span>
              </div>
            )}
          </div>
        )}

        {payload.pacePrimary && !isMinimal && !payload.structureBadge && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 4 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Clock style={{ width: 28, height: 28, flexShrink: 0, color: RC_BLUE }} />
              <span style={{ fontSize: 30, fontWeight: 700, color: fg }}>{payload.pacePrimary}</span>
            </div>
            {payload.paceSecondary && (
              <span style={{ paddingLeft: 40, fontSize: 16, color: muted }}>{payload.paceSecondary}</span>
            )}
          </div>
        )}

        <div style={{ height: 1, width: '70%', maxWidth: 280, background: dividerColor, margin: '4px 0' }} />

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Calendar style={{ width: 28, height: 28, flexShrink: 0, color: RC_BLUE }} />
            <span style={{ fontSize: 26, fontWeight: 600, color: fg, textTransform: 'capitalize' as const }}>
              {payload.dateLabel}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Clock style={{ width: 28, height: 28, flexShrink: 0, color: RC_BLUE }} />
            <span style={{ fontSize: 26, fontWeight: 600, color: fg }}>{payload.timeLabel}</span>
          </div>
        </div>

        {!isMinimal && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%', maxWidth: 460 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              <MapPin style={{ width: 28, height: 28, flexShrink: 0, marginTop: 2, color: RC_BLUE }} />
              <div style={{ minWidth: 0 }}>
                <p style={{ fontSize: 26, fontWeight: 600, color: fg, lineHeight: 1.3, margin: 0 }}>
                  {payload.locationTitle}
                </p>
                {payload.locationSubtitle && (
                  <p style={{ fontSize: 20, color: muted, lineHeight: 1.3, margin: '2px 0 0 0' }}>
                    {payload.locationSubtitle}
                  </p>
                )}
              </div>
            </div>
            {payload.audienceLine && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <Users style={{ width: 28, height: 28, flexShrink: 0, color: RC_BLUE }} />
                <span style={{ fontSize: 26, fontWeight: 600, color: fg }}>{payload.audienceLine}</span>
              </div>
            )}
          </div>
        )}
      </div>
    );

    const bottomCta = <CtaBar publicUrl={payload.publicUrl} qrDataUrl={qrDataUrl} />;

    const fontStack = 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Inter, sans-serif';

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
            fontFamily: fontStack,
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
            <div style={{ marginTop: 'auto', padding: '16px 32px 40px' }}>{bottomCta}</div>
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
          borderRadius: 28,
          fontFamily: fontStack,
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
        <div style={{ position: 'relative', zIndex: 3, padding: '0 32px 32px', flexShrink: 0 }}>
          {bottomCta}
        </div>
      </div>
    );
  }
);
