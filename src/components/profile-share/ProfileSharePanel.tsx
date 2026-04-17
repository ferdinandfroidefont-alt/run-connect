import { useEffect, useState } from 'react';
import { Share, BadgeCheck, MapPin, Footprints, Calendar, Users, UserPlus } from 'lucide-react';
import { cn } from '@/lib/utils';
import profileShareCardImg from '@/assets/profile-share-card.png';
import profileShareCardV2 from '@/assets/profile-share-card-v2.png';
import { useAuth } from '@/hooks/useAuth';
import { fetchProfileSharePayload } from '@/lib/fetchProfileShareData';
import type { ProfileSharePayload } from '@/lib/profileSharePayload';
import { PROFILE_SPORT_LABELS } from '@/lib/profileSports';

type CardVariant = 'v1' | 'v2';
const CARD_IMAGES: Record<CardVariant, string> = { v1: profileShareCardImg, v2: profileShareCardV2 };


const sportEmojiFromLabel = (label: string): string => {
  const found = Object.values(PROFILE_SPORT_LABELS).find(
    (s) => s.label.toLowerCase() === label.toLowerCase()
  );
  return found?.emoji ?? '🏃';
};

type Props = {
  active?: boolean;
  compact?: boolean;
};

export function ProfileSharePanel({ compact = false }: Props) {
  const { user } = useAuth();
  const [payload, setPayload] = useState<ProfileSharePayload | null>(null);
  const [variant, setVariant] = useState<CardVariant>('v1');

  useEffect(() => {
    let cancelled = false;
    if (!user?.id) {
      setPayload(null);
      return;
    }
    (async () => {
      const data = await fetchProfileSharePayload(user.id);
      if (!cancelled) setPayload(data);
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const handleShare = () => {
    // Partage de l'image statique à implémenter
  };

  // Sépare ville / drapeau pour positionnement à gauche
  // Extrait le code ISO 2 lettres (FR, BE, …) depuis profile.country
  // payload.locationLine vaut typiquement "France, 🇫🇷" — on récupère le code via le drapeau emoji
  const flagToIso = (flag: string): string | null => {
    const cps = Array.from(flag).map((c) => c.codePointAt(0) || 0);
    if (cps.length !== 2) return null;
    const a = cps[0] - 0x1f1e6;
    const b = cps[1] - 0x1f1e6;
    if (a < 0 || a > 25 || b < 0 || b > 25) return null;
    return String.fromCharCode(65 + a, 65 + b).toLowerCase();
  };

  const locationParts = (() => {
    if (!payload?.locationLine) return { text: '', isoCode: '' };
    // 1) Drapeau emoji présent → extrait code ISO
    const match = payload.locationLine.match(/^(.*?)([\u{1F1E6}-\u{1F1FF}]{2})\s*$/u);
    if (match) {
      const iso = flagToIso(match[2]) || '';
      return { text: match[1].replace(/[, ]+$/, '').trim(), isoCode: iso };
    }
    // 2) Code ISO type "FR" → utilisé directement
    const iso = payload.locationLine.match(/\b([A-Za-z]{2})\b/);
    if (iso) {
      const text = payload.locationLine.replace(iso[0], '').replace(/[, ]+/g, ' ').trim();
      return { text, isoCode: iso[1].toLowerCase() };
    }
    return { text: payload.locationLine, isoCode: '' };
  })();

  return (
    <div className="min-w-0 max-w-full">
      <div className="flex min-h-0 flex-col">
        <div className={cn(
          'flex flex-col items-center px-4 pb-[max(1rem,env(safe-area-inset-bottom))]',
          compact ? 'pt-2' : 'pt-4'
        )}>
          {/* Card: image template figée + overlay */}
          <div className="relative w-full max-w-sm mx-auto" style={{ containerType: 'inline-size' }}>
            <img
              src={CARD_IMAGES[variant]}
              alt="Aperçu carte de partage"
              className="block w-full rounded-[20px] shadow-[0_8px_32px_rgba(15,23,42,0.13)]"
            />

            {/* Overlay absolu - uniquement pour la Carte 1. La Carte 2 est indépendante (image seule). */}
            <div className="absolute inset-0 pointer-events-none select-none">
              {/* A. Avatar */}
              {variant === 'v1' && payload?.avatarUrl && (
                <div
                  className="absolute overflow-hidden rounded-full"
                  style={{
                    left: '50.2%',
                    top: '17.1%',
                    width: '20%',
                    aspectRatio: '1 / 1',
                    transform: 'translate(-50%, -50%)',
                  }}
                >
                  <img
                    src={payload.avatarUrl}
                    alt=""
                    className="h-full w-full object-cover"
                    crossOrigin="anonymous"
                  />
                </div>
              )}

              {/* B + C. Nom + badge vérifié */}
              {payload && (
                <div
                  className="absolute flex items-center justify-center gap-1.5"
                  style={{
                    left: '50%',
                    top: '28.5%',
                    transform: 'translate(-50%, 0)',
                    width: '90%',
                  }}
                >
                  <span
                    className="truncate font-extrabold text-slate-900 leading-none"
                    style={{ fontSize: 'clamp(20px, 7.2cqw, 32px)' }}
                  >
                    {payload.displayName}
                  </span>
                  {payload.isPremium && (
                    <BadgeCheck
                      className="shrink-0 fill-[#0A84FF] text-white"
                      style={{ width: 'clamp(18px, 5.5cqw, 26px)', height: 'clamp(18px, 5.5cqw, 26px)' }}
                      strokeWidth={2.4}
                    />
                  )}
                </div>
              )}

              {/* D. Username */}
              {payload && (
                <div
                  className="absolute text-center text-slate-400 font-medium"
                  style={{
                    left: '50%',
                    top: '36%',
                    transform: 'translate(-50%, 0)',
                    width: '90%',
                    fontSize: 'clamp(11px, 3.6cqw, 16px)',
                  }}
                >
                  <span className="truncate inline-block max-w-full">@{payload.username}</span>
                </div>
              )}

              {/* E. Pill rôle + club — tient sur 1 ligne dans la pill bleue */}
              {payload && (
                <div
                  className="absolute flex items-center justify-center text-center"
                  style={{
                    left: '50%',
                    top: '43.6%',
                    transform: 'translate(-50%, 0)',
                    width: '58%',
                    paddingLeft: '10%',
                    paddingRight: '4%',
                    height: '5.6%',
                  }}
                >
                  <span
                    className="font-bold text-[#0A84FF] leading-tight truncate max-w-full"
                    style={{ fontSize: 'clamp(10px, 3.1cqw, 13px)' }}
                  >
                    {payload.roleLineSecondary
                      ? `${payload.roleLinePrimary.replace(/^Rôle \((.*)\)$/, '$1')} · ${payload.roleLineSecondary.replace(/^Dans le club /i, '')}`
                      : payload.roleLinePrimary}
                  </span>
                </div>
              )}

              {/* F. Ville + drapeau (gauche de la ligne) */}
              {payload && (
                <div
                  className="absolute flex items-center gap-1 text-slate-900 font-bold"
                  style={{
                    left: '33.3%',
                    top: '50.7%',
                    transform: 'translate(-50%, 0)',
                    fontSize: 'clamp(10px, 3cqw, 13px)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  <span className="truncate">{locationParts.text || '—'}</span>
                  {locationParts.isoCode && (
                    <img
                      src={`https://flagcdn.com/${locationParts.isoCode}.svg`}
                      alt=""
                      className="inline-block rounded-[2px]"
                      style={{ width: '1.4em', height: '1em', objectFit: 'cover' }}
                    />
                  )}
                </div>
              )}

              {/* G. Sport (droite de la ligne) avec emoji */}
              {payload && (
                <div
                  className="absolute flex items-center gap-1 text-slate-900 font-bold"
                  style={{
                    left: '70%',
                    top: '50.7%',
                    transform: 'translate(-50%, 0)',
                    maxWidth: '36%',
                    fontSize: 'clamp(10px, 3cqw, 13px)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  <span>{sportEmojiFromLabel(payload.sportLabel)}</span>
                  <span className="truncate">{payload.sportLabel}</span>
                </div>
              )}

              {/* H. Stats — 4 cartes */}
              {payload && (
                <>
                  <StatNumber value={payload.sessionsCreated} leftPct={14.5} />
                  <StatNumber value={payload.sessionsJoined} leftPct={38.2} />
                  <StatNumber value={payload.followersCount} leftPct={60.2} />
                  <StatNumber value={payload.followingCount} leftPct={83.5} />
                </>
              )}

              {/* I. Présence — uniquement le nombre, sans % */}
              {payload?.presenceRate != null && (
                <div
                  className="absolute flex items-center justify-center"
                  style={{
                    left: '46%',
                    top: '73.6%',
                    transform: 'translate(-50%, 0)',
                  }}
                >
                  <span
                    className="font-extrabold text-[#0A84FF]"
                    style={{ fontSize: 'clamp(11px, 3.2cqw, 15px)' }}
                  >
                    {payload.presenceRate}
                  </span>
                </div>
              )}

              {/* J. QR Code */}
              {payload?.qrDataUrl && (
                <div
                  className="absolute overflow-hidden rounded-[6px] bg-white"
                  style={{
                    left: '78%',
                    top: '89.5%',
                    width: '15.5%',
                    aspectRatio: '1 / 1',
                    transform: 'translate(-50%, -50%)',
                  }}
                >
                  <img src={payload.qrDataUrl} alt="" className="h-full w-full object-contain" />
                </div>
              )}
            </div>
          </div>

          {/* Sélecteur de template */}
          <div className="mt-4 inline-flex rounded-full border border-border bg-muted/40 p-1">
            {([
              { id: 'v1' as const, label: 'Carte 1' },
              { id: 'v2' as const, label: 'Carte 2' },
            ]).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setVariant(opt.id)}
                className={cn(
                  'rounded-full px-4 py-1.5 text-[13px] font-semibold transition-colors',
                  variant === opt.id ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={handleShare}
            className="mt-4 flex w-full max-w-sm items-center justify-center gap-2.5 rounded-2xl bg-primary px-6 py-4 text-[16px] font-semibold text-white shadow-lg transition-all duration-200 hover:bg-primary/90 active:scale-[0.98]"
          >
            <Share className="h-5 w-5" strokeWidth={2.2} />
            Partager mon profil
          </button>

          <p className="mt-3 text-center text-[12px] text-muted-foreground">
            La carte affichée sera celle partagée en story.
          </p>
        </div>
      </div>
    </div>
  );
}

function StatNumber({ value, leftPct }: { value: number; leftPct: number }) {
  return (
    <div
      className="absolute font-extrabold text-slate-900 text-center"
      style={{
        left: `${leftPct}%`,
        top: '64.6%',
        transform: 'translate(-50%, -50%)',
        fontSize: 'clamp(14px, 5cqw, 24px)',
        lineHeight: 1,
      }}
    >
      {value}
    </div>
  );
}
