import { Share } from 'lucide-react';
import { cn } from '@/lib/utils';
import profileShareCardImg from '@/assets/profile-share-card.png';

type Props = {
  active?: boolean;
  compact?: boolean;
};

export function ProfileSharePanel({ compact = false }: Props) {
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
