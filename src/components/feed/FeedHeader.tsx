import { Search } from 'lucide-react';
import { cn } from '@/lib/utils';

export type FeedMode = 'friends' | 'discover';

interface FeedHeaderProps {
  onSearch?: () => void;
  onProfileClick?: () => void;
  mode: FeedMode;
  onModeChange: (mode: FeedMode) => void;
}

export const FeedHeader = ({ onSearch, mode, onModeChange }: FeedHeaderProps) => {
  return (
    <header className="sticky top-0 z-20 bg-background">
      <div className="px-4 pt-4 pb-3 flex items-center justify-between">
        {/* Title - Left aligned */}
        <h1 className="text-[28px] font-black tracking-tight uppercase">
          Feed
        </h1>

        {/* Search - Right */}
        <button
          onClick={onSearch}
          className="h-9 w-9 flex items-center justify-center rounded-full active:bg-secondary transition-colors"
        >
          <Search className="h-[22px] w-[22px] text-muted-foreground" />
        </button>
      </div>

      {/* Segmented Control */}
      <div className="px-4 pb-3">
        <div className="bg-muted rounded-xl p-[3px] flex">
          <button
            onClick={() => onModeChange('friends')}
            className={cn(
              "flex-1 py-2 text-[14px] font-semibold rounded-[10px] transition-all",
              mode === 'friends'
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground"
            )}
          >
            Amis
          </button>
          <button
            onClick={() => onModeChange('discover')}
            className={cn(
              "flex-1 py-2 text-[14px] font-semibold rounded-[10px] transition-all",
              mode === 'discover'
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground"
            )}
          >
            Découvrir
          </button>
        </div>
      </div>
    </header>
  );
};
