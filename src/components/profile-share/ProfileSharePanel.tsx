import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { fetchProfileSharePayload } from '@/lib/fetchProfileShareData';
import type { ProfileSharePayload } from '@/lib/profileSharePayload';
import { ProfileShareArtboard } from './ProfileShareArtboard';
import { type ProfileShareChannel } from './ProfileShareActionsGrid';
import { useToast } from '@/hooks/use-toast';
import {
  generateProfileShareImage,
  shareProfileToChannel,
} from '@/services/profileShareService';

type Props = {
  active?: boolean;
  compact?: boolean;
};

export function ProfileSharePanel({ compact = false }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [payload, setPayload] = useState<ProfileSharePayload | null>(null);
  const previewFrameRef = useRef<HTMLDivElement | null>(null);
  const exportRef = useRef<HTMLDivElement | null>(null);
  const [previewFrameSize, setPreviewFrameSize] = useState(0);
  const [exporting, setExporting] = useState(false);
  const [lastImage, setLastImage] = useState<string | null>(null);

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

  const runExport = useCallback(async (): Promise<string | null> => {
    if (!exportRef.current || !payload) return null;
    setExporting(true);
    try {
      const dataUrl = await generateProfileShareImage(exportRef.current, 'map_card');
      setLastImage(dataUrl);
      return dataUrl;
    } catch (error) {
      console.error('[profileShare] export failed', error);
      toast({
        title: 'Image indisponible',
        description: "Impossible de générer la carte profil pour le moment.",
        variant: 'destructive',
      });
      return null;
    } finally {
      setExporting(false);
    }
  }, [payload, toast]);

  const displayName = payload?.displayName ?? user?.email ?? 'Mon profil';

  const handleChannel = useCallback(
    async (channel: ProfileShareChannel) => {
      if (!payload?.publicUrl) {
        toast({
          title: 'Lien indisponible',
          description: "Impossible de partager le profil pour l'instant.",
          variant: 'destructive',
        });
        return;
      }

      const needsImage =
        channel === 'instagram_story' || channel === 'save_image' || channel === 'more';
      const imageDataUrl = needsImage ? ((await runExport()) ?? lastImage) : lastImage;

      await shareProfileToChannel(channel, {
        displayName,
        publicUrl: payload.publicUrl,
        imageDataUrl,
      });
    },
    [payload, displayName, lastImage, runExport, toast]
  );

  // Tap sur la carte preview = action principale (Story Instagram avec content_url
  // → Instagram affiche le lien d'attribution « Ouvrir avec RunConnect » sous la story).
  const handleCardTap = () => void handleChannel('instagram_story');

  useEffect(() => {
    const el = previewFrameRef.current;
    if (!el) return;
    const sync = () => {
      const size = Math.floor(el.getBoundingClientRect().width);
      setPreviewFrameSize(size > 0 ? size : 0);
    };
    sync();
    const ro = new ResizeObserver(sync);
    ro.observe(el);
    return () => {
      ro.disconnect();
    };
  }, []);

  const previewScale = useMemo(() => {
    if (!previewFrameSize) return 1;
    return previewFrameSize / 1080;
  }, [previewFrameSize]);

  return (
    <div className="min-w-0 max-w-full">
      <div className="flex min-h-0 flex-col">
        <div
          className={cn(
            'flex flex-col items-center px-4 pb-[max(1rem,env(safe-area-inset-bottom))]',
            compact ? 'pt-2' : 'pt-4'
          )}
        >
          <div ref={previewFrameRef} className="relative w-full max-w-sm mx-auto">
            <button
              type="button"
              onClick={handleCardTap}
              disabled={!payload || exporting}
              aria-label="Partager mon profil en story Instagram"
              className="relative block aspect-square w-full overflow-hidden rounded-none bg-muted/25 text-left shadow-[0_8px_32px_rgba(15,23,42,0.13)] transition-opacity duration-150 hover:opacity-95 active:opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
            >
              <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
                {payload ? (
                  <div
                    style={{
                      width: 1080,
                      height: 1080,
                      transform: `scale(${previewScale})`,
                      transformOrigin: 'center center',
                    }}
                  >
                    <ProfileShareArtboard payload={payload} templateId="map_card" />
                  </div>
                ) : (
                  <div className="h-full w-full animate-pulse bg-muted/50" />
                )}
              </div>
            </button>
          </div>

          <p className="mt-3 text-center text-[12px] text-muted-foreground">
            Touche la carte pour la publier en story Instagram avec un lien
            « Ouvrir avec RunConnect ».
          </p>

          <button
            type="button"
            disabled={exporting || !payload}
            onClick={() => void handleChannel('more')}
            className="mt-6 w-full max-w-sm rounded-2xl bg-[#2563eb] px-4 py-3 text-center text-[15px] font-semibold text-white shadow-[0_10px_28px_rgba(37,99,235,0.35)] transition-opacity hover:opacity-95 active:opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
          >
            Partager mon profil
          </button>
        </div>
      </div>

      {exporting && (
        <div className="pointer-events-none fixed inset-0 z-[200] flex items-center justify-center bg-background/40">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}

      {/* Rendu hors écran pour export PNG fidèle (1080×1080). */}
      {payload && (
        <div
          className="pointer-events-none fixed -left-[12000px] top-0 z-0 overflow-hidden"
          aria-hidden
        >
          <ProfileShareArtboard ref={exportRef} payload={payload} templateId="map_card" />
        </div>
      )}
    </div>
  );
}
