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
  return (
    <div style={{ position: 'relative', width: 56, height: 72 }}>
      <svg width="56" height="72" viewBox="0 0 56 72" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M28 0C12.536 0 0 12.536 0 28c0 21 28 44 28 44s28-23 28-44C56 12.536 43.464 0 28 0Z"
          fill={RC_BLUE}
        />
      </svg>
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: 16,
          transform: 'translateX(-50%)',
          width: 24,
          height: 24,
          borderRadius: '999px',
          overflow: 'hidden',
          border: '2px solid #ffffff',
          background: '#e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {avatarUrl ? (
          <img src={avatarUrl} alt="" crossOrigin="anonymous" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <span style={{ fontSize: 10, fontWeight: 700, color: '#334155' }}>{(initials || 'RC').slice(0, 2)}</span>
        )}
      </div>
    </div>
  );
}

function CtaBar({ publicUrl }: { publicUrl: string }) {
  void publicUrl;
  return (
    <div
      style={{
        background: RC_BLUE,
        borderRadius: 20,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '20px 24px',
        gap: 16,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0 }}>
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: 14,
            background: 'rgba(255,255,255,0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
            <path
              d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7Zm0 9.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5Z"
              fill="white"
            />
            <circle cx="12" cy="9" r="8" stroke="white" strokeWidth="1.5" fill="none" opacity="0.4" />
            <circle cx="12" cy="9" r="11" stroke="white" strokeWidth="1" fill="none" opacity="0.2" />
          </svg>
        </div>
        <div style={{ minWidth: 0 }}>
          <p style={{ fontSize: 12, fontWeight: 500, color: 'rgba(255,255,255,0.85)', lineHeight: 1.3, margin: 0 }}>
            Retrouve cette séance sur
          </p>
          <p style={{ fontSize: 22, fontWeight: 800, color: '#ffffff', lineHeight: 1.2, margin: 0 }}>
            RunConnect
          </p>
        </div>
      </div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          background: '#ffffff',
          borderRadius: 50,
          padding: '12px 20px',
          flexShrink: 0,
        }}
      >
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: '50%',
            background: RC_BLUE,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M5 12h14M13 5l7 7-7 7" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <div>
          <p style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', lineHeight: 1.2, margin: 0, whiteSpace: 'nowrap' }}>
            Ouvrir avec RunConnect
          </p>
          <p style={{ fontSize: 11, fontWeight: 500, color: '#64748b', lineHeight: 1.3, margin: 0, whiteSpace: 'nowrap' }}>
            Rejoins la séance dans l&apos;app
          </p>
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
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '44px 0 0 44px', minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <ActivityGlyph type={payload.activityType} />
          <span style={{ fontSize: 14, fontWeight: 700, letterSpacing: '0.08em', color: RC_BLUE, textTransform: 'uppercase' as const }}>
            {payload.activityHeader}
          </span>
        </div>

        <h1
          style={{
            fontSize: isStory ? 48 : 54,
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
          <div
            style={{
              display: 'inline-flex',
              width: 'fit-content',
              borderRadius: 50,
              padding: '10px 22px',
              fontSize: 16,
              fontWeight: 700,
              color: '#ffffff',
              background: RC_BLUE,
              letterSpacing: '0.01em',
            }}
          >
            {payload.structureBadge}
          </div>
        )}

        {payload.pacePrimary && !isMinimal && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginTop: 4 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Clock style={{ width: 22, height: 22, flexShrink: 0, color: RC_BLUE }} />
              <span style={{ fontSize: 24, fontWeight: 700, color: fg }}>{payload.pacePrimary}</span>
            </div>
            {payload.paceSecondary && (
              <span style={{ paddingLeft: 32, fontSize: 13, color: muted }}>{payload.paceSecondary}</span>
            )}
          </div>
        )}

        <div style={{ height: 1, width: '70%', maxWidth: 280, background: dividerColor, margin: '4px 0' }} />

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Calendar style={{ width: 22, height: 22, flexShrink: 0, color: RC_BLUE }} />
            <span style={{ fontSize: 20, fontWeight: 600, color: fg, textTransform: 'capitalize' as const }}>
              {payload.dateLabel}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Clock style={{ width: 22, height: 22, flexShrink: 0, color: RC_BLUE }} />
            <span style={{ fontSize: 20, fontWeight: 600, color: fg }}>{payload.timeLabel}</span>
          </div>
        </div>

        {!isMinimal && (
          <div
            style={{
              marginTop: 16,
              width: '100%',
              maxWidth: 420,
              borderRadius: 18,
              border: isDark ? '1px solid rgba(148,163,184,0.25)' : '1px solid rgba(0,0,0,0.06)',
              background: cardInnerBg,
              padding: 18,
              boxShadow: isDark ? 'none' : '0 4px 24px rgba(15,23,42,0.06)',
            }}
          >
            <div style={{ display: 'flex', gap: 10 }}>
              <MapPin style={{ width: 22, height: 22, flexShrink: 0, marginTop: 2, color: RC_BLUE }} />
              <div style={{ minWidth: 0 }}>
                <p style={{ fontSize: 18, fontWeight: 700, color: fg, lineHeight: 1.3, margin: 0 }}>
                  {payload.locationTitle}
                </p>
                {payload.locationSubtitle && (
                  <p style={{ fontSize: 14, color: muted, lineHeight: 1.3, margin: 0 }}>
                    {payload.locationSubtitle}
                  </p>
                )}
              </div>
            </div>
            {payload.audienceLine && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  marginTop: 14,
                  paddingTop: 14,
                  borderTop: `1px solid ${dividerColor}`,
                }}
              >
                <Users style={{ width: 22, height: 22, flexShrink: 0, color: RC_BLUE }} />
                <span style={{ fontSize: 16, fontWeight: 500, color: fg }}>{payload.audienceLine}</span>
              </div>
            )}
          </div>
        )}
      </div>
    );

    const bottomCta = <CtaBar publicUrl={payload.publicUrl} />;

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
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          background: cardBg,
          borderRadius: 28,
          fontFamily: fontStack,
        }}
      >
        <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
          <div style={{ position: 'relative', zIndex: 2, width: '52%', minWidth: 0, display: 'flex', flexDirection: 'column' }}>
            {leftColumn}
          </div>
          <div style={{ position: 'relative', zIndex: 1, flex: 1, minWidth: 0 }}>
            {mapSection}
          </div>
        </div>
        <div style={{ position: 'relative', zIndex: 3, padding: '0 32px 32px', flexShrink: 0 }}>
          {bottomCta}
        </div>
      </div>
    );
  }
);
