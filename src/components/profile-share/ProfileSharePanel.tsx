import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { fetchProfileSharePayload } from '@/lib/fetchProfileShareData';
import type { ProfileShareTemplateId } from '@/lib/profileSharePayload';
import { templateDimensions } from '@/lib/profileSharePayload';
import { generateProfileShareImage, shareProfileImageToSystem } from '@/services/profileShareService';
import { ProfileShareArtboard } from './ProfileShareArtboard';
import { Loader2, Share } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

const TEMPLATES: { id: ProfileShareTemplateId; label: string }[] = [
  { id: 'light_card', label: 'Carte claire' },
  { id: 'organizer_focus', label: 'Organisateur' },
];

type Props = {
  /** Charge les données seulement quand true (ex. onglet paramètres visible). */
  active?: boolean;
  /** Section compacte dans les réglages (pas de marge hero). */
  compact?: boolean;
};

export function ProfileSharePanel({ active = true, compact = false }: Props) {
  const { user } = useAuth();
  const [payload, setPayload] = useState<Awaited<ReturnType<typeof fetchProfileSharePayload>>>(null);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [exporting, setExporting] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);

  const templateId = TEMPLATES[activeIndex]?.id ?? 'light_card';

  useEffect(() => {
    if (!active || !user?.id) return;
    let cancelled = false;
    setLoading(true);
    void (async () => {
      const { data: refRow } = await supabase
        .from('profiles')
        .select('referral_code')
        .eq('user_id', user.id)
        .maybeSingle();
      const referral = refRow?.referral_code ?? null;
      const data = await fetchProfileSharePayload(user.id, referral);
      if (!cancelled) {
        setPayload(data);
        setActiveIndex(0);
      }
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [active, user?.id]);

  useEffect(() => {
    if (!scrollRef.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && entry.intersectionRatio > 0.55) {
            const idx = cardRefs.current.indexOf(entry.target as HTMLDivElement);
            if (idx >= 0) setActiveIndex(idx);
          }
        }
      },
      { root: scrollRef.current, threshold: 0.55 }
    );

    for (const el of cardRefs.current) {
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [payload]);

  const handleShare = useCallback(async () => {
    if (!exportRef.current || !payload) return;
    setExporting(true);
    try {
      const dataUrl = await generateProfileShareImage(exportRef.current, templateId);
      try {
        const { shareToInstagramStory } = await import('@/lib/instagramStories');
        const result = await shareToInstagramStory({
          imageDataUrl: dataUrl,
          contentUrl: payload.publicUrl,
        });
        if (result.ok) {
          if (result.method === 'download') {
            toast.info('Image enregistrée — ouvre Instagram et ajoute-la à ta story.');
          }
          return;
        }
      } catch {
        /* fallback */
      }
      await shareProfileImageToSystem(dataUrl, payload.displayName);
    } catch (e) {
      console.error(e);
      toast.error("Impossible de générer l'image");
    } finally {
      setExporting(false);
    }
  }, [payload, templateId]);

  const previewScale = (id: ProfileShareTemplateId) => {
    const { w, h } = templateDimensions(id);
    const targetH = compact ? 320 : 420;
    const s = targetH / h;
    return { scale: s, boxW: Math.round(w * s), boxH: Math.round(h * s) };
  };

  return (
    <div className="min-w-0 max-w-full">

      <div className="flex min-h-0 flex-col">
        {loading && (
          <div className="flex justify-center py-10">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}

        {!loading && payload && (
          <div
            className={cn(
              'flex flex-col items-center px-4 pb-[max(1rem,env(safe-area-inset-bottom))]',
              compact ? 'pt-2' : 'pt-4'
            )}
          >
            <div
              ref={scrollRef}
              className="flex w-full max-w-full snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              style={{ justifyContent: TEMPLATES.length === 1 ? 'center' : undefined }}
            >
              {TEMPLATES.map((meta, i) => {
                const { scale, boxW, boxH } = previewScale(meta.id);
                const dim = templateDimensions(meta.id);
                return (
                  <div
                    key={meta.id}
                    ref={(el) => {
                      cardRefs.current[i] = el;
                    }}
                    className="shrink-0 snap-center first:ml-auto last:mr-auto"
                    style={{ width: boxW }}
                  >
                    <div
                      className="overflow-hidden rounded-[20px] shadow-[0_8px_32px_rgba(15,23,42,0.13)]"
                      style={{ width: boxW, height: boxH }}
                    >
                      <div
                        style={{
                          width: dim.w,
                          height: dim.h,
                          transform: `scale(${scale})`,
                          transformOrigin: 'top left',
                        }}
                      >
                        <ProfileShareArtboard payload={payload} templateId={meta.id} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-4 flex items-center justify-center gap-1.5">
              {TEMPLATES.map((_, i) => (
                <span
                  key={i}
                  className={cn(
                    'h-[7px] rounded-full transition-all duration-300',
                    i === activeIndex ? 'w-6 bg-primary' : 'w-[7px] bg-muted-foreground/30'
                  )}
                />
              ))}
            </div>

            <button
              type="button"
              disabled={exporting}
              onClick={() => void handleShare()}
              className={cn(
                'mt-5 flex w-full max-w-sm items-center justify-center gap-2.5 rounded-2xl px-6 py-4 text-[16px] font-semibold text-white shadow-lg transition-all duration-200 active:scale-[0.98]',
                exporting ? 'bg-primary/70' : 'bg-primary hover:bg-primary/90'
              )}
            >
              {exporting ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Share className="h-5 w-5" strokeWidth={2.2} />
              )}
              {exporting ? 'Génération…' : 'Partager mon profil'}
            </button>

            <p className="mt-3 text-center text-[12px] text-muted-foreground">
              La carte affichée sera celle partagée en story.
            </p>
          </div>
        )}
      </div>

      {payload && (
        <div className="pointer-events-none fixed -left-[12000px] top-0 z-0 overflow-hidden" aria-hidden>
          <ProfileShareArtboard ref={exportRef} payload={payload} templateId={templateId} />
        </div>
      )}
    </div>
  );
}
