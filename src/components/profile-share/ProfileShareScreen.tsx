import { useCallback, useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/hooks/useAuth';
import { fetchProfileSharePayload } from '@/lib/fetchProfileShareData';
import type { ProfileShareTemplateId } from '@/lib/profileSharePayload';
import { generateProfileShareImage, shareProfileToChannel } from '@/services/profileShareService';
import type { ProfileShareChannel } from './ProfileShareActionsGrid';
import { ProfileShareArtboard } from './ProfileShareArtboard';
import { ProfileSharePreviewCarousel } from './ProfileSharePreviewCarousel';
import { ProfileShareActionsGrid } from './ProfileShareActionsGrid';
import { Link2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

type Props = {
  open: boolean;
  onClose: () => void;
  /** Appelé pour ouvrir le dialogue QR existant (optionnel). */
  onOpenQr?: () => void;
};

export function ProfileShareScreen({ open, onClose, onOpenQr }: Props) {
  const { user } = useAuth();
  const [payload, setPayload] = useState<Awaited<ReturnType<typeof fetchProfileSharePayload>>>(null);
  const [loading, setLoading] = useState(false);
  const [templateId, setTemplateId] = useState<ProfileShareTemplateId>('light_card');
  const [exporting, setExporting] = useState(false);
  const [lastImage, setLastImage] = useState<string | null>(null);
  const exportRef = useRef<HTMLDivElement>(null);

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
        setLastImage(null);
      }
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [open, user?.id]);

  const runExport = useCallback(async (): Promise<string | null> => {
    if (!exportRef.current || !payload) return null;
    setExporting(true);
    try {
      const dataUrl = await generateProfileShareImage(exportRef.current, templateId);
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

  const handleChannel = async (channel: ProfileShareChannel) => {
    if (!payload) return;
    let imageDataUrl = lastImage;
    if (channel === 'instagram_story') {
      imageDataUrl = (await runExport()) ?? lastImage;
    }
    await shareProfileToChannel(channel, {
      displayName: payload.displayName,
      publicUrl: payload.publicUrl,
      imageDataUrl: imageDataUrl ?? undefined,
    });
  };

  const copyLink = async () => {
    if (!payload) return;
    await navigator.clipboard.writeText(payload.publicUrl);
    toast.success('Lien copié');
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
            Partager mon profil
          </h2>
          <span className="w-16" aria-hidden />
        </header>

        <ScrollArea className="min-h-0 flex-1">
          <div className="px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4">
            {loading && (
              <div className="flex justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            )}
            {!loading && payload && (
              <>
                <ProfileSharePreviewCarousel
                  payload={payload}
                  activeTemplateId={templateId}
                  onTemplateChange={setTemplateId}
                />

                <div className="mt-8">
                  <ProfileShareActionsGrid busy={exporting} onChannel={(c) => void handleChannel(c)} />
                </div>

                <div className="mt-6 flex items-center gap-3 rounded-2xl border border-border bg-muted/40 px-4 py-3">
                  <Link2 className="h-5 w-5 shrink-0 text-primary" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                      Ton lien RunConnect
                    </p>
                    <p className="truncate text-[14px] font-medium text-primary">{payload.publicUrlDisplay}</p>
                  </div>
                  <Button type="button" size="sm" variant="secondary" className="shrink-0 rounded-xl" onClick={() => void copyLink()}>
                    Copier
                  </Button>
                </div>

                {onOpenQr && (
                  <Button type="button" variant="outline" className="mt-4 w-full rounded-xl" onClick={onOpenQr}>
                    Afficher le QR code
                  </Button>
                )}
              </>
            )}
          </div>
        </ScrollArea>

        {exporting && (
          <div className="pointer-events-none fixed inset-0 z-[200] flex items-center justify-center bg-background/40">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}

        {payload && (
          <div className="pointer-events-none fixed -left-[12000px] top-0 z-0 overflow-hidden" aria-hidden>
            <ProfileShareArtboard ref={exportRef} payload={payload} templateId={templateId} />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
