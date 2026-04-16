import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { fetchProfileSharePayload } from '@/lib/fetchProfileShareData';
import type { ProfileShareTemplateId } from '@/lib/profileSharePayload';
import { generateProfileShareImage, shareProfileImageToSystem } from '@/services/profileShareService';
import { ProfileShareArtboard } from './ProfileShareArtboard';
import { StaticProfileShareCard, StaticProfileShareCardSkeleton } from './StaticProfileShareCard';
import { Loader2, Share } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

type Props = {
  active?: boolean;
  compact?: boolean;
};

const TEMPLATE_ID: ProfileShareTemplateId = 'light_card';

export function ProfileSharePanel({ active = true, compact = false }: Props) {
  const { user } = useAuth();
  const [payload, setPayload] = useState<Awaited<ReturnType<typeof fetchProfileSharePayload>>>(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
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
      if (!cancelled) {
        setPayload(data);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [active, user?.id]);

  const handleShare = useCallback(async () => {
    if (!exportRef.current || !payload) return;
    setExporting(true);
    try {
      const dataUrl = await generateProfileShareImage(exportRef.current, TEMPLATE_ID);
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
  }, [payload]);

  return (
    <div className="min-w-0 max-w-full">
      <div
        className={cn(
          'flex flex-col items-center px-4 pb-[max(1rem,env(safe-area-inset-bottom))]',
          compact ? 'pt-2' : 'pt-4'
        )}
      >
        <div className="w-full max-w-sm mx-auto">
          {loading || !payload ? (
            <StaticProfileShareCardSkeleton />
          ) : (
            <StaticProfileShareCard
              displayName={payload.displayName}
              username={payload.username}
              avatarUrl={payload.avatarUrl}
              initials={payload.initials}
              isPremium={payload.isPremium}
              roleLinePrimary={payload.roleLinePrimary}
              roleLineSecondary={payload.roleLineSecondary}
              locationLine={payload.locationLine}
              sportLabel={payload.sportLabel}
              presenceRate={payload.presenceRate}
              sessionsCreated={payload.sessionsCreated}
              sessionsJoined={payload.sessionsJoined}
              followersCount={payload.followersCount}
              followingCount={payload.followingCount}
            />
          )}
        </div>

        <button
          type="button"
          disabled={exporting || !payload}
          onClick={() => void handleShare()}
          className={cn(
            'mt-5 flex w-full max-w-sm items-center justify-center gap-2.5 rounded-2xl px-6 py-4 text-[16px] font-semibold text-white shadow-lg transition-all duration-200 active:scale-[0.98]',
            exporting || !payload ? 'bg-primary/70' : 'bg-primary hover:bg-primary/90'
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

      {/* Hidden artboard for export (high-res image) */}
      {payload && (
        <div className="pointer-events-none fixed -left-[12000px] top-0 z-0 overflow-hidden" aria-hidden>
          <ProfileShareArtboard ref={exportRef} payload={payload} templateId={TEMPLATE_ID} />
        </div>
      )}
    </div>
  );
}
