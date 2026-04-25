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
const RC_INK = '#0b1530';
const RC_MUTED = '#64748b';

const FONT_SANS =
  '-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", system-ui, "Segoe UI", Inter, sans-serif';

function RunnerIcon({ size = 36, color = RC_BLUE }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M13.5 5.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM9.8 8.9 7 23h2.1l1.8-8 2.1 2v6h2v-7.5l-2.1-2 .6-3A7.5 7.5 0 0 0 19 13v-2a5.4 5.4 0 0 1-4.4-2.2l-1-1.6a2 2 0 0 0-1.7-1 2 2 0 0 0-.8.2L6 9v5h2V10.1l1.8-.7"
        fill={color}
      />
    </svg>
  );
}

function ActivityGlyph({ type, size = 36 }: { type: string; size?: number }) {
  const t = type.toLowerCase();
  if (t === 'cycling' || t === 'velo' || t === 'mtb')
    return <Bike style={{ width: size, height: size, color: RC_BLUE }} />;
  if (t === 'swimming') return <Waves style={{ width: size, height: size, color: RC_BLUE }} />;
  return <RunnerIcon size={size} />;
}

/**
 * Pin séance — réplique exacte du pin utilisé sur la carte d'accueil
 * (variant "depth" : dégradé bleu, anneau blanc avec avatar, pointe triangulaire).
 * Aligné sur `rc-session-pin__*` (src/index.css).
 */
function BluePinMarker({
  avatarUrl,
  initials,
  scale = 1,
}: {
  avatarUrl?: string | null;
  initials?: string;
  scale?: number;
}) {
  const PIN_W = 58 * scale;
  const PIN_H = 72 * scale;

  return (
    <div style={{ position: 'relative', width: PIN_W, height: PIN_H }}>
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

function RunConnectPinIcon({ size = 88, color = '#ffffff' }: { size?: number; color?: string }) {
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

function MetaIcon({ size = 36, children }: { size?: number; children: ReactNode }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: size,
        height: size,
        flexShrink: 0,
      }}
    >
      {children}
    </span>
  );
}

/**
 * Bandeau bleu CTA — inset (margins gauche/droite/bas) avec coins arrondis sur les 4 côtés,
 * fidèle à la maquette « Retrouve cette séance sur RunConnect » + bouton blanc.
 */
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
      {/* Cercles décoratifs en bas-droite (style maquette) */}
      <div
        style={{
          position: 'absolute',
          right: -40,
          bottom: -100,
          width: 380,
          height: 220,
          borderRadius: '50%',
          border: '1px solid rgba(255,255,255,0.18)',
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          right: 30,
          bottom: -110,
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
          minHeight: 168,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 18,
          padding: '20px 26px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 18, minWidth: 0 }}>
          <RunConnectPinIcon size={88} color="#ffffff" />
          <div style={{ minWidth: 0 }}>
            <p
              style={{
                margin: 0,
                fontSize: 22,
                fontWeight: 500,
                lineHeight: 1.15,
                color: 'rgba(255,255,255,0.94)',
              }}
            >
              Retrouve cette séance sur
            </p>
            <p
              style={{
                margin: '2px 0 0 0',
                fontSize: 44,
                fontWeight: 800,
                lineHeight: 1.02,
                letterSpacing: '-0.02em',
                color: '#ffffff',
              }}
            >
              RunConnect
            </p>
          </div>
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            borderRadius: 22,
            padding: '16px 22px',
            background: '#ffffff',
            color: '#0f172a',
            boxShadow: '0 10px 24px rgba(2, 16, 45, 0.2)',
            flexShrink: 0,
          }}
        >
          <div
            style={{
              width: 50,
              height: 50,
              borderRadius: 999,
              background: RC_LIGHT,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M5 12h14M13 5l7 7-7 7"
                stroke="#fff"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }}>
            <span style={{ fontSize: 22, fontWeight: 800, lineHeight: 1.08 }}>Ouvrir avec RunConnect</span>
            <span style={{ fontSize: 16, fontWeight: 500, lineHeight: 1.15, color: '#475569' }}>
              Rejoins la séance dans l&apos;app
            </span>
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
    const isStory = templateId === 'instagram_story';

    if (isStory) {
      return <StoryArtboard ref={ref} payload={payload} mapImageUrl={mapImageUrl} width={w} height={h} />;
    }

    return <SquareArtboard ref={ref} payload={payload} mapImageUrl={mapImageUrl} width={w} height={h} />;
  }
);

/**
 * Carte carrée 1080×1080 — proportions fidèles à la maquette :
 * - Header + titre `Séance seuil` (110px ultra-bold) + badge structure
 * - Allure cible / date / heure dans la colonne gauche (icônes outline)
 * - Carte Mapbox réelle pleine bleed à droite avec gros pin séance
 * - Carte « lieu » flottante en bas-gauche
 * - Bandeau bleu CTA inset, coins arrondis 4 côtés
 */
const SquareArtboard = forwardRef<
  HTMLDivElement,
  { payload: SessionSharePayload; mapImageUrl: string | null; width: number; height: number }
>(function SquareArtboard({ payload, mapImageUrl, width, height }, ref) {
  return (
    <div
      ref={ref}
      style={{
        width,
        height,
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        background: '#ffffff',
        borderRadius: 36,
        border: '1px solid rgba(15,23,42,0.06)',
        boxShadow: '0 24px 54px rgba(15,23,42,0.13)',
        fontFamily: FONT_SANS,
      }}
    >
      {/* Zone supérieure : texte + carte */}
      <div style={{ position: 'relative', flex: 1, minHeight: 0 }}>
        {/* Carte Mapbox — pleine bleed à droite, fade gauche vers blanc */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            bottom: 0,
            width: '62%',
            overflow: 'hidden',
          }}
        >
          <ShareMapBackdropImg
            mapUrl={mapImageUrl}
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              filter: 'saturate(1.05) contrast(1.04)',
            }}
          />
          <div
            style={{
              position: 'absolute',
              inset: 0,
              pointerEvents: 'none',
              background:
                'linear-gradient(90deg, #ffffff 0%, rgba(255,255,255,0.92) 12%, rgba(255,255,255,0.45) 26%, rgba(255,255,255,0.05) 42%, rgba(255,255,255,0) 58%)',
            }}
          />
          <div
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: 0,
              height: 110,
              pointerEvents: 'none',
              background:
                'linear-gradient(180deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.45) 60%, rgba(255,255,255,0.92) 100%)',
            }}
          />
          <div
            style={{
              position: 'absolute',
              top: '46%',
              left: '54%',
              transform: 'translate(-50%, -100%)',
              pointerEvents: 'none',
            }}
          >
            <BluePinMarker
              avatarUrl={payload.sharerAvatarUrl}
              initials={payload.sharerInitials}
              scale={1.7}
            />
          </div>
        </div>

        {/* Colonne texte (gauche) — overflow visible pour laisser respirer le titre */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            bottom: 0,
            width: '54%',
            display: 'flex',
            flexDirection: 'column',
            gap: 22,
            padding: '52px 0 30px 44px',
            zIndex: 2,
            overflow: 'visible',
          }}
        >
          {/* Header activité */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <ActivityGlyph type={payload.activityType} size={32} />
            <span
              style={{
                fontSize: 26,
                fontWeight: 800,
                letterSpacing: '0.045em',
                color: RC_BLUE,
                textTransform: 'uppercase' as const,
              }}
            >
              {payload.activityHeader}
            </span>
          </div>

          {/* Titre — peut déborder visuellement sur la zone de fade de la carte */}
          <h1
            style={{
              fontSize: 110,
              fontWeight: 900,
              color: RC_INK,
              lineHeight: 0.97,
              letterSpacing: '-0.04em',
              margin: 0,
              whiteSpace: 'nowrap',
            }}
          >
            {payload.title}
          </h1>

          {/* Badge structure (X × X km) */}
          {payload.structureBadge && (
            <div
              style={{
                display: 'inline-flex',
                width: 'fit-content',
                alignItems: 'center',
                padding: '14px 32px',
                borderRadius: 14,
                background: `linear-gradient(135deg, #1d4ed8 0%, ${RC_BLUE} 50%, #1e40af 100%)`,
                color: '#ffffff',
                fontSize: 50,
                fontWeight: 800,
                lineHeight: 1,
                letterSpacing: '0.005em',
                boxShadow: '0 14px 30px rgba(37,99,235,0.32)',
              }}
            >
              {payload.structureBadge}
            </div>
          )}

          {/* Allure cible */}
          {payload.pacePrimary && (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginTop: 4 }}>
              <MetaIcon size={36}>
                <Clock style={{ width: 36, height: 36, color: RC_BLUE, strokeWidth: 1.85 }} />
              </MetaIcon>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{ fontSize: 46, fontWeight: 800, color: RC_INK, lineHeight: 1.02 }}>
                  {payload.pacePrimary}
                </span>
                <span style={{ fontSize: 22, fontWeight: 500, color: RC_MUTED, lineHeight: 1 }}>
                  allure cible
                </span>
              </div>
            </div>
          )}

          {/* Séparateur */}
          <div
            style={{
              height: 1,
              width: 360,
              background: 'rgba(15,23,42,0.10)',
              margin: '6px 0 4px',
            }}
          />

          {/* Date */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <MetaIcon size={36}>
              <Calendar style={{ width: 36, height: 36, color: RC_BLUE, strokeWidth: 1.85 }} />
            </MetaIcon>
            <span
              style={{
                fontSize: 38,
                fontWeight: 800,
                color: RC_INK,
                textTransform: 'capitalize' as const,
                lineHeight: 1.05,
              }}
            >
              {payload.dateLabel}
            </span>
          </div>

          {/* Heure */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <MetaIcon size={36}>
              <Clock style={{ width: 36, height: 36, color: RC_BLUE, strokeWidth: 1.85 }} />
            </MetaIcon>
            <span style={{ fontSize: 38, fontWeight: 800, color: RC_INK, lineHeight: 1.05 }}>
              {payload.timeLabel}
            </span>
          </div>
        </div>

        {/* Carte « lieu » flottante (bas-gauche) */}
        <div
          style={{
            position: 'absolute',
            left: 36,
            bottom: 22,
            width: 510,
            background: '#ffffff',
            borderRadius: 24,
            padding: '22px 28px',
            boxShadow: '0 16px 38px rgba(15,23,42,0.10), 0 1px 0 rgba(15,23,42,0.04)',
            border: '1px solid rgba(15,23,42,0.05)',
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
            zIndex: 3,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
            <MapPin
              style={{
                width: 32,
                height: 32,
                color: RC_BLUE,
                strokeWidth: 2.2,
                flexShrink: 0,
                marginTop: 4,
                fill: 'rgba(37,99,235,0.16)',
              }}
            />
            <div style={{ minWidth: 0, flex: 1 }}>
              <p
                style={{
                  margin: 0,
                  fontSize: 30,
                  fontWeight: 800,
                  color: RC_INK,
                  lineHeight: 1.12,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {payload.locationTitle}
              </p>
              {payload.locationSubtitle && (
                <p
                  style={{
                    margin: '4px 0 0 0',
                    fontSize: 20,
                    fontWeight: 500,
                    color: RC_MUTED,
                    lineHeight: 1.2,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {payload.locationSubtitle}
                </p>
              )}
            </div>
          </div>
          {payload.audienceLine && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <Users
                style={{ width: 32, height: 32, color: RC_BLUE, strokeWidth: 2.05, flexShrink: 0 }}
              />
              <span style={{ fontSize: 24, fontWeight: 600, color: RC_INK, lineHeight: 1.1 }}>
                {payload.audienceLine}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Bandeau bleu CTA — inset (margins gauche/droite/bas) */}
      <div style={{ flexShrink: 0, padding: '0 22px 28px' }}>
        <SessionJoinBar />
      </div>
    </div>
  );
});

/**
 * Story Instagram 1080×1920 — variante verticale alignée sur la maquette.
 */
const StoryArtboard = forwardRef<
  HTMLDivElement,
  { payload: SessionSharePayload; mapImageUrl: string | null; width: number; height: number }
>(function StoryArtboard({ payload, mapImageUrl, width, height }, ref) {
  return (
    <div
      ref={ref}
      style={{
        width,
        height,
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        background: '#ffffff',
        fontFamily: FONT_SANS,
      }}
    >
      <div style={{ position: 'relative', height: '54%', overflow: 'hidden' }}>
        <ShareMapBackdropImg
          mapUrl={mapImageUrl}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            filter: 'saturate(1.05) contrast(1.04)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            height: 220,
            pointerEvents: 'none',
            background:
              'linear-gradient(180deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.6) 60%, #ffffff 100%)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -100%)',
            pointerEvents: 'none',
          }}
        >
          <BluePinMarker
            avatarUrl={payload.sharerAvatarUrl}
            initials={payload.sharerInitials}
            scale={2}
          />
        </div>
      </div>

      <div
        style={{
          flex: 1,
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
          padding: '40px 48px 0',
          gap: 24,
          background: '#ffffff',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <ActivityGlyph type={payload.activityType} size={32} />
          <span
            style={{
              fontSize: 26,
              fontWeight: 800,
              letterSpacing: '0.045em',
              color: RC_BLUE,
              textTransform: 'uppercase' as const,
            }}
          >
            {payload.activityHeader}
          </span>
        </div>

        <h1
          style={{
            fontSize: 116,
            fontWeight: 900,
            color: RC_INK,
            lineHeight: 0.97,
            letterSpacing: '-0.04em',
            margin: 0,
          }}
        >
          {payload.title}
        </h1>

        {payload.structureBadge && (
          <div
            style={{
              display: 'inline-flex',
              width: 'fit-content',
              padding: '14px 32px',
              borderRadius: 16,
              background: `linear-gradient(135deg, #1d4ed8 0%, ${RC_BLUE} 50%, #1e40af 100%)`,
              color: '#ffffff',
              fontSize: 52,
              fontWeight: 800,
              lineHeight: 1,
              boxShadow: '0 14px 30px rgba(37,99,235,0.32)',
            }}
          >
            {payload.structureBadge}
          </div>
        )}

        {payload.pacePrimary && (
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginTop: 2 }}>
            <MetaIcon size={36}>
              <Clock style={{ width: 36, height: 36, color: RC_BLUE, strokeWidth: 1.85 }} />
            </MetaIcon>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ fontSize: 48, fontWeight: 800, color: RC_INK, lineHeight: 1.02 }}>
                {payload.pacePrimary}
              </span>
              <span style={{ fontSize: 22, fontWeight: 500, color: RC_MUTED }}>allure cible</span>
            </div>
          </div>
        )}

        <div
          style={{
            height: 1,
            background: 'rgba(15,23,42,0.10)',
            margin: '4px 0',
          }}
        />

        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <MetaIcon size={36}>
            <Calendar style={{ width: 36, height: 36, color: RC_BLUE, strokeWidth: 1.85 }} />
          </MetaIcon>
          <span
            style={{
              fontSize: 40,
              fontWeight: 800,
              color: RC_INK,
              textTransform: 'capitalize' as const,
            }}
          >
            {payload.dateLabel}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <MetaIcon size={36}>
            <Clock style={{ width: 36, height: 36, color: RC_BLUE, strokeWidth: 1.85 }} />
          </MetaIcon>
          <span style={{ fontSize: 40, fontWeight: 800, color: RC_INK }}>{payload.timeLabel}</span>
        </div>

        <div
          style={{
            marginTop: 8,
            background: '#ffffff',
            borderRadius: 28,
            padding: '24px 28px',
            boxShadow: '0 16px 38px rgba(15,23,42,0.10)',
            border: '1px solid rgba(15,23,42,0.06)',
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
            <MapPin
              style={{
                width: 32,
                height: 32,
                color: RC_BLUE,
                strokeWidth: 2.2,
                flexShrink: 0,
                marginTop: 4,
                fill: 'rgba(37,99,235,0.16)',
              }}
            />
            <div style={{ minWidth: 0, flex: 1 }}>
              <p style={{ margin: 0, fontSize: 30, fontWeight: 800, color: RC_INK, lineHeight: 1.18 }}>
                {payload.locationTitle}
              </p>
              {payload.locationSubtitle && (
                <p
                  style={{
                    margin: '4px 0 0 0',
                    fontSize: 20,
                    fontWeight: 500,
                    color: RC_MUTED,
                  }}
                >
                  {payload.locationSubtitle}
                </p>
              )}
            </div>
          </div>
          {payload.audienceLine && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <Users
                style={{ width: 32, height: 32, color: RC_BLUE, strokeWidth: 2.05, flexShrink: 0 }}
              />
              <span style={{ fontSize: 24, fontWeight: 600, color: RC_INK }}>
                {payload.audienceLine}
              </span>
            </div>
          )}
        </div>

        <div style={{ flex: 1 }} />
      </div>

      {/* CTA en pied — inset */}
      <div style={{ flexShrink: 0, padding: '0 28px 36px' }}>
        <SessionJoinBar />
      </div>
    </div>
  );
});
