import { useCallback, useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { useAuth } from '@/hooks/useAuth';
import { fetchProfileSharePayload } from '@/lib/fetchProfileShareData';
import type { ProfileShareTemplateId } from '@/lib/profileSharePayload';
import { templateDimensions } from '@/lib/profileSharePayload';
import { generateProfileShareImage, shareProfileImageToSystem } from '@/services/profileShareService';
import { ProfileShareArtboard } from './ProfileShareArtboard';
import { ChevronLeft, Loader2, Share } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

const TEMPLATES: { id: ProfileShareTemplateId; label: string }[] = [
  { id: 'light_card', label: 'Carte claire' },
  { id: 'organizer_focus', label: 'Organisateur' },
];

type Props = {
  open: boolean;
  onClose: () => void;
  onOpenQr?: () => void;
};

export function ProfileShareScreen({ open, onClose }: Props) {
  const { user } = useAuth();
  const [payload, setPayload] = useState<Awaited<ReturnType<typeof fetchProfileSharePayload>>>(null);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [exporting, setExporting] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);

  const templateId = TEMPLATES[activeIndex]?.id ?? 'light_card';

  useEffect(() => {
    if (!open || !user?.id) return;
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
    return () => { cancelled = true; };
  }, [open, user?.id]);

  // Snap-based index tracking via IntersectionObserver
  useEffect(() => {
    if (!scrollRef.current) return;
    observerRef.current?.disconnect();

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
    observerRef.current = observer;

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
      } catch { /* fallback below */ }
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
    const targetH = 420;
    const s = targetH / h;
    return { scale: s, boxW: Math.round(w * s), boxH: Math.round(h * s) };
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        fullScreen
        hideCloseButton
        className="flex max-h-[100dvh] flex-col gap-0 overflow-hidden border-0 bg-background p-0 sm:max-w-none"
        stackNested
      >
        {/* ─── HEADER iOS style ─── */}
        <header className="relative flex shrink-0 items-center justify-center border-b border-border/60 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
          <button
            type="button"
            onClick={onClose}
            className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-0.5 text-[16px] font-medium text-primary transition-opacity active:opacity-70"
          >
            <ChevronLeft className="h-5 w-5" strokeWidth={2.4} />
            <span>Retour</span>
          </button>
          <h2 className="text-[17px] font-semibold text-foreground">Partager mon profil</h2>
        </header>

        {/* ─── BODY ─── */}
        <div className="flex min-h-0 flex-1 flex-col">
          {loading && (
            <div className="flex flex-1 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          )}

          {!loading && payload && (
            <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
              {/* ─── CAROUSEL horizontal snap ─── */}
              <div
                ref={scrollRef}
                className="flex w-full snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth px-[calc(50%-var(--card-half))] pb-1 pt-4 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                style={
                  { '--card-half': `${previewScale(TEMPLATES[0].id).boxW / 2}px` } as React.CSSProperties
                }
              >
                {TEMPLATES.map((meta, i) => {
                  const { scale, boxW, boxH } = previewScale(meta.id);
                  const dim = templateDimensions(meta.id);
                  return (
                    <div
                      key={meta.id}
                      ref={(el) => { cardRefs.current[i] = el; }}
                      className="shrink-0 snap-center"
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

              {/* ─── DOTS ─── */}
              <div className="mt-4 flex items-center justify-center gap-1.5">
                {TEMPLATES.map((_, i) => (
                  <span
                    key={i}
                    className={cn(
                      'h-[7px] rounded-full transition-all duration-300',
                      i === activeIndex ? 'w-6 bg-primary' : 'w-[7px] bg-muted-foreground/30',
                    )}
                  />
                ))}
              </div>

              {/* ─── CTA Button ─── */}
              <button
                type="button"
                disabled={exporting}
                onClick={() => void handleShare()}
                className={cn(
                  'mt-6 flex w-full max-w-sm items-center justify-center gap-2.5 rounded-2xl px-6 py-4 text-[16px] font-semibold text-white shadow-lg transition-all duration-200 active:scale-[0.98]',
                  exporting ? 'bg-primary/70' : 'bg-primary hover:bg-primary/90',
                )}
              >
                {exporting ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Share className="h-5 w-5" strokeWidth={2.2} />
                )}
                {exporting ? 'Génération…' : 'Partager mon profil'}
              </button>

              {/* ─── Hint ─── */}
              <p className="mt-3 text-center text-[12px] text-muted-foreground">
                La carte affichée sera celle partagée en story.
              </p>
            </div>
          )}
        </div>

        {/* ─── Hidden export artboard ─── */}
        {payload && (
          <div className="pointer-events-none fixed -left-[12000px] top-0 z-0 overflow-hidden" aria-hidden>
            <ProfileShareArtboard ref={exportRef} payload={payload} templateId={templateId} />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
