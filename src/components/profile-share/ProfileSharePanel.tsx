import { useEffect, useMemo, useRef, useState } from 'react';
import { Share } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { fetchProfileSharePayload } from '@/lib/fetchProfileShareData';
import type { ProfileSharePayload } from '@/lib/profileSharePayload';
import { ProfileShareArtboard } from './ProfileShareArtboard';
import { useToast } from '@/hooks/use-toast';
import { Capacitor } from '@capacitor/core';
import { Share as CapacitorShare } from '@capacitor/share';

type Props = {
  active?: boolean;
  compact?: boolean;
};

export function ProfileSharePanel({ compact = false }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [payload, setPayload] = useState<ProfileSharePayload | null>(null);
  const previewFrameRef = useRef<HTMLDivElement | null>(null);
  const [previewFrameSize, setPreviewFrameSize] = useState(0);

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

  const handleShare = async () => {
    if (!payload?.publicUrl) {
      toast({
        title: 'Lien indisponible',
        description: "Impossible de partager le profil pour l'instant.",
        variant: 'destructive',
      });
      return;
    }

    const shareText = `Rejoins-moi sur RunConnect\n${payload.publicUrl}`;

    try {
      if (Capacitor.isNativePlatform()) {
        await CapacitorShare.share({
          title: 'Partager mon profil',
          text: shareText,
          url: payload.publicUrl,
          dialogTitle: 'Partager mon profil',
        });
        return;
      }

      if (navigator.share) {
        await navigator.share({
          title: 'Partager mon profil',
          text: shareText,
          url: payload.publicUrl,
        });
        return;
      }
    } catch (error: unknown) {
      if (error instanceof Error && error.name === 'AbortError') return;
    }

    try {
      await navigator.clipboard.writeText(shareText);
      toast({
        title: 'Lien copié',
        description: 'Le lien RunConnect a été copié dans le presse-papiers.',
      });
    } catch {
      toast({
        title: 'Partage impossible',
        description: 'Impossible de partager ou copier le lien.',
        variant: 'destructive',
      });
    }
  };

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
        <div className={cn(
          'flex flex-col items-center px-4 pb-[max(1rem,env(safe-area-inset-bottom))]',
          compact ? 'pt-2' : 'pt-4'
        )}>
          <div ref={previewFrameRef} className="relative w-full max-w-sm mx-auto">
            <button
              type="button"
              onClick={handleShare}
              disabled={!payload}
              aria-label="Partager mon profil"
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
