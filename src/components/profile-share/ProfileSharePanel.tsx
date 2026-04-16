import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { fetchProfileSharePayload } from '@/lib/fetchProfileShareData';
import { generateProfileShareImage, shareProfileImageToSystem } from '@/services/profileShareService';
import { ProfileShareCard } from './ProfileShareCard';
import { Loader2, Share } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

type Props = {
  active?: boolean;
  compact?: boolean;
};

const CARD_NATIVE_SIZE = 1080;

export function ProfileSharePanel({ active = true, compact = false }: Props) {
  const { user } = useAuth();
  const [payload, setPayload] = useState<Awaited<ReturnType<typeof fetchProfileSharePayload>>>(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [previewWidth, setPreviewWidth] = useState(360);
  const previewWrapRef = useRef<HTMLDivElement>(null);
  const exportRef = useRef<HTMLDivElement>(null);

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
      if (!cancelled) setPayload(data);
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [active, user?.id]);

  // Mesure la largeur dispo pour scale la carte 1080×1080.
  useEffect(() => {
    if (!previewWrapRef.current) return;
    const el = previewWrapRef.current;
    const ro = new ResizeObserver(() => {
      setPreviewWidth(el.clientWidth);
    });
    ro.observe(el);
    setPreviewWidth(el.clientWidth);
    return () => ro.disconnect();
  }, [payload]);

  const handleShare = useCallback(async () => {
    if (!exportRef.current || !payload) return;
    setExporting(true);
    try {
      const dataUrl = await generateProfileShareImage(exportRef.current, 'light_card');
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
      } catch { /* fallback */ }
      await shareProfileImageToSystem(dataUrl, payload.displayName);
    } catch (e) {
      console.error(e);
      toast.error("Impossible de générer l'image");
    } finally {
      setExporting(false);
    }
  }, [payload]);

  const scale = previewWidth > 0 ? previewWidth / CARD_NATIVE_SIZE : 0;

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
              compact ? 'pt-2' : 'pt-4',
            )}
          >
            {/* Aperçu carte (rendu réel scalé) */}
            <div ref={previewWrapRef} className="w-full max-w-sm mx-auto">
              <div
                style={{
                  width: '100%',
                  aspectRatio: '1 / 1',
                  position: 'relative',
                  borderRadius: 24,
                  overflow: 'hidden',
                  boxShadow: '0 8px 32px rgba(15,23,42,0.13)',
                }}
              >
                {scale > 0 && (
                  <div
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: CARD_NATIVE_SIZE,
                      height: CARD_NATIVE_SIZE,
                      transform: `scale(${scale})`,
                      transformOrigin: 'top left',
                    }}
                  >
                    <ProfileShareCard payload={payload} />
                  </div>
                )}
              </div>
            </div>

            <button
              type="button"
              disabled={exporting}
              onClick={() => void handleShare()}
              className={cn(
                'mt-5 flex w-full max-w-sm items-center justify-center gap-2.5 rounded-2xl px-6 py-4 text-[16px] font-semibold text-white shadow-lg transition-all duration-200 active:scale-[0.98]',
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

            <p className="mt-3 text-center text-[12px] text-muted-foreground">
              La carte affichée sera celle partagée en story.
            </p>
          </div>
        )}
      </div>

      {/* Carte cachée pour l'export (taille native 1080×1080) */}
      {payload && (
        <div className="pointer-events-none fixed -left-[12000px] top-0 z-0 overflow-hidden" aria-hidden>
          <ProfileShareCard ref={exportRef} payload={payload} />
        </div>
      )}
    </div>
  );
}
