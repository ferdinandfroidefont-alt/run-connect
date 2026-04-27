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
  shareSessionImageToSystem,
  shareSessionToChannel,
} from '@/services/sessionShareService';
import { SessionShareArtboard } from './SessionShareArtboard';
import { SessionSharePreviewCarousel } from './SessionSharePreviewCarousel';
import { ChevronLeft, Loader2, Share2 } from 'lucide-react';
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
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
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

  // Génère le QR code pour la barre de partage en bas (style profil)
  useEffect(() => {
    if (!open || !publicUrl) {
      setQrDataUrl(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const { default: QRCode } = await import('qrcode');
        const url = await QRCode.toDataURL(publicUrl, {
          width: 220,
          margin: 1,
          color: { dark: '#0f172a', light: '#ffffff' },
        });
        if (!cancelled) setQrDataUrl(url);
      } catch {
        if (!cancelled) setQrDataUrl(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, publicUrl]);

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

  const handleSystemShare = async () => {
    if (!session || !payload) return;
    const imageDataUrl = (await runExport()) ?? lastImage;
    if (imageDataUrl) {
      await shareSessionImageToSystem(imageDataUrl, session.title);
      return;
    }
    await shareSessionToChannel('more', {
      sessionTitle: session.title,
      publicUrl,
    });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        fullScreen
        hideCloseButton
        className="flex max-h-[100dvh] flex-col gap-0 overflow-hidden border-0 bg-[linear-gradient(180deg,#f8fbff_0%,#f1f6ff_48%,#eef3fc_100%)] p-0 sm:max-w-none"
        overlayClassName="bg-slate-950/35 backdrop-blur-[2px]"
        stackNested
      >
        <header className="relative flex shrink-0 items-center justify-center border-b border-slate-200/85 bg-white/84 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur-sm">
          <button
            type="button"
            onClick={onClose}
            className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-0.5 text-[16px] font-medium text-primary transition-opacity active:opacity-70"
          >
            <ChevronLeft className="h-5 w-5" strokeWidth={2.4} />
            <span>Retour</span>
          </button>
          <h2 className="text-[17px] font-semibold text-foreground">Partager la séance</h2>
        </header>

        <ScrollArea className="min-h-0 flex-1">
          <div className="px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4">
            {payload && (
              <SessionSharePreviewCarousel
                payload={payload}
                mapImageUrl={mapImageUrl}
                qrDataUrl={qrDataUrl}
                activeTemplateId={templateId}
                onTemplateChange={(id) => setTemplateId(id)}
                onCardClick={() => void handleSystemShare()}
                disabled={exporting}
              />
            )}

            <Button
              type="button"
              className="mt-8 h-12 w-full rounded-2xl bg-[linear-gradient(135deg,#1d4ed8_0%,#2563eb_48%,#0b63ff_100%)] text-[16px] font-semibold text-primary-foreground shadow-[0_14px_34px_rgba(37,99,235,0.38)] transition-transform active:scale-[0.996] hover:brightness-[1.03]"
              onClick={() => void handleSystemShare()}
              disabled={!payload || exporting}
            >
              <Share2 className="mr-2 h-5 w-5" />
              Partager ma séance
            </Button>

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
              qrDataUrl={qrDataUrl}
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
