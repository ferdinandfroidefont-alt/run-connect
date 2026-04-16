import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/hooks/useAuth';
import { useDistanceUnits } from '@/contexts/DistanceUnitsContext';
import { supabase } from '@/integrations/supabase/client';
import { buildSessionSharePayload, type SessionShareTemplateId } from '@/lib/sessionSharePayload';
import { getSessionPublicUrl } from '@/lib/appLinks';
import { buildSessionStaticMapUrl } from '@/lib/mapboxStaticImage';
import {
  generateSessionShareImage,
  shareSessionToChannel,
  type SessionShareChannel,
} from '@/services/sessionShareService';
import { SessionShareArtboard } from './SessionShareArtboard';
import { SessionSharePreviewCarousel } from './SessionSharePreviewCarousel';
import { SessionShareActionsGrid } from './SessionShareActionsGrid';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

type SessionLike = Parameters<typeof buildSessionSharePayload>[0];

type Props = {
  open: boolean;
  onClose: () => void;
  session: SessionLike | null;
  onOpenConversationShare?: () => void;
};

export function SessionShareScreen({ open, onClose, session, onOpenConversationShare }: Props) {
  const { user } = useAuth();
  const { formatKm } = useDistanceUnits();
  const [profile, setProfile] = useState<{ display_name: string | null; avatar_url: string | null } | null>(null);
  const [templateId, setTemplateId] = useState<SessionShareTemplateId>('light_pin');
  const [exporting, setExporting] = useState(false);
  const [lastImage, setLastImage] = useState<string | null>(null);
  const exportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open || !user?.id) return;
    let cancelled = false;
    void (async () => {
      const { data } = await supabase
        .from('profiles')
        .select('display_name, avatar_url')
        .eq('user_id', user.id)
        .maybeSingle();
      if (!cancelled && data) setProfile({ display_name: data.display_name, avatar_url: data.avatar_url });
    })();
    return () => {
      cancelled = true;
    };
  }, [open, user?.id]);

  const publicUrl = session ? getSessionPublicUrl(session.id) : '';

  const payload = useMemo(() => {
    if (!session) return null;
    return buildSessionSharePayload(session, {
      publicUrl,
      sharerDisplayName: profile?.display_name ?? user?.email ?? null,
      sharerAvatarUrl: profile?.avatar_url ?? null,
      formatKm,
    });
  }, [session, publicUrl, profile, user?.email, formatKm]);

  const mapImageUrl = useMemo(() => {
    if (!payload) return null;
    return buildSessionStaticMapUrl({
      routePath: payload.routePath,
      pin: payload.mapPin,
      width: 1080,
      height: 1080,
      padding: payload.hasRoute ? 72 : 48,
    });
  }, [payload]);

  const runExport = useCallback(async (): Promise<string | null> => {
    if (!exportRef.current || !payload) return null;
    setExporting(true);
    try {
      const dataUrl = await generateSessionShareImage(exportRef.current, templateId);
      setLastImage(dataUrl);
      return dataUrl;
    } catch (e) {
      console.error(e);
      toast.error('Impossible de générer l’image');
      return null;
    } finally {
      setExporting(false);
    }
  }, [payload, templateId]);

  const handleChannel = async (channel: SessionShareChannel) => {
    if (!session || !payload) return;

    const needsImage =
      channel === 'instagram_story' ||
      channel === 'instagram_messages' ||
      channel === 'save_image' ||
      channel === 'copy_image';

    let imageDataUrl = lastImage;
    if (needsImage) {
      imageDataUrl = (await runExport()) ?? lastImage;
    }

    await shareSessionToChannel(channel, {
      sessionTitle: session.title,
      publicUrl,
      imageDataUrl: imageDataUrl ?? undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        fullScreen
        hideCloseButton
        className="flex max-h-[100dvh] flex-col gap-0 overflow-hidden border-0 bg-background p-0 sm:max-w-none"
        stackNested
      >
        <header className="flex shrink-0 items-center justify-between border-b border-border px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
          <Button type="button" variant="ghost" className="text-[15px] font-medium" onClick={onClose}>
            Fermer
          </Button>
          <h2 className="pointer-events-none absolute left-1/2 top-[max(0.75rem,env(safe-area-inset-top))] -translate-x-1/2 text-[17px] font-semibold">
            Partager la séance
          </h2>
          <span className="w-16" aria-hidden />
        </header>

        <ScrollArea className="min-h-0 flex-1">
          <div className="px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4">
            {payload && (
              <SessionSharePreviewCarousel
                payload={payload}
                mapImageUrl={mapImageUrl}
                activeTemplateId={templateId}
                onTemplateChange={(id) => setTemplateId(id)}
              />
            )}

            <div className="mt-8">
              <SessionShareActionsGrid busy={exporting} onChannel={(c) => void handleChannel(c)} />
            </div>

            {onOpenConversationShare && (
              <Button
                type="button"
                variant="outline"
                className="mt-6 w-full rounded-xl"
                onClick={onOpenConversationShare}
              >
                Envoyer dans une conversation
              </Button>
            )}
          </div>
        </ScrollArea>

        {exporting && (
          <div className="pointer-events-none fixed inset-0 z-[200] flex items-center justify-center bg-background/40">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}

        {/* Rendu hors écran pour export PNG fidèle */}
        {payload && (
          <div
            className="pointer-events-none fixed -left-[12000px] top-0 z-0 overflow-hidden"
            aria-hidden
          >
            <SessionShareArtboard
              ref={exportRef}
              payload={payload}
              templateId={templateId}
              mapImageUrl={mapImageUrl}
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
