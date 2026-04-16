import { useEffect, useState } from 'react';
import { Share } from 'lucide-react';
import { cn } from '@/lib/utils';
import profileShareCardImg from '@/assets/profile-share-card.png';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

type Props = {
  active?: boolean;
  compact?: boolean;
};

export function ProfileSharePanel({ compact = false }: Props) {
  const { user } = useAuth();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!user?.id) {
      setAvatarUrl(null);
      setDisplayName(null);
      return;
    }
    (async () => {
      const { data } = await supabase
        .from('profiles')
        .select('avatar_url, display_name, username')
        .eq('user_id', user.id)
        .maybeSingle();
      if (!cancelled) {
        setAvatarUrl(data?.avatar_url ?? null);
        setDisplayName(data?.display_name?.trim() || data?.username?.trim() || null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const handleShare = () => {
    // Partage de l'image statique à implémenter
  };

  return (
    <div className="min-w-0 max-w-full">
      <div className="flex min-h-0 flex-col">
        <div className={cn(
          'flex flex-col items-center px-4 pb-[max(1rem,env(safe-area-inset-bottom))]',
          compact ? 'pt-2' : 'pt-4'
        )}>
          <div className="relative w-full max-w-sm mx-auto">
            <img
              src={profileShareCardImg}
              alt="Aperçu carte de partage"
              className="w-full rounded-[20px] shadow-[0_8px_32px_rgba(15,23,42,0.13)]"
            />
            {avatarUrl && (
              <div
                className="absolute overflow-hidden rounded-full"
                style={{
                  left: '50%',
                  top: '16.7%',
                  width: '20.5%',
                  aspectRatio: '1 / 1',
                  transform: 'translate(-50%, -50%)',
                }}
              >
                <img
                  src={avatarUrl}
                  alt="Photo de profil"
                  className="h-full w-full object-cover"
                  crossOrigin="anonymous"
                />
              </div>
            )}
            {displayName && (
              <div
                className="absolute flex items-center justify-center"
                style={{
                  // Masque blanc sur "Prénom Nom" (centre ≈ 33% Y, hauteur ≈ 8%),
                  // en laissant le badge bleu visible à droite.
                  left: '14%',
                  right: '24%',
                  top: '29%',
                  height: '8%',
                  background: '#ffffff',
                }}
              >
                <span
                  className="truncate text-center font-extrabold tracking-tight text-[hsl(222_47%_11%)]"
                  style={{ fontSize: 'clamp(16px, 7cqi, 30px)', lineHeight: 1 }}
                >
                  {displayName}
                </span>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={handleShare}
            className="mt-5 flex w-full max-w-sm items-center justify-center gap-2.5 rounded-2xl bg-primary px-6 py-4 text-[16px] font-semibold text-white shadow-lg transition-all duration-200 hover:bg-primary/90 active:scale-[0.98]"
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
