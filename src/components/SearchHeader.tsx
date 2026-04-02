import { useRef, useEffect } from 'react';
import { ArrowLeft, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface SearchHeaderProps {
  onBack: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  placeholder: string;
}

export const SearchHeader = ({
  onBack,
  searchQuery,
  onSearchChange,
  placeholder
}: SearchHeaderProps) => {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Focus automatique avec petit délai pour contourner restrictions mobiles
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  return (
    <header className="sticky top-0 z-10 flex items-center gap-ios-3 border-b border-border/60 bg-background/90 px-ios-4 py-ios-3 backdrop-blur-xl dark:border-[#1f1f1f] dark:bg-black dark:backdrop-blur-none">
      {/* Flèche retour */}
      <Button
        variant="ghost"
        size="icon"
        onClick={onBack}
        className="shrink-0"
        aria-label="Retour"
      >
        <ArrowLeft className="h-5 w-5" />
      </Button>

      {/* Champ de recherche */}
      <div className="flex-1 relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={placeholder}
          className="h-10 border-0 bg-secondary pl-10 rounded-ios-md shadow-[var(--shadow-card)]"
        />
      </div>
    </header>
  );
};
