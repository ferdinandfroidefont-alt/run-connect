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
    <header className="sticky top-0 z-10 glass-card px-4 py-3 flex items-center gap-3">
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
          className="pl-10 glass-card border-0 bg-background/50"
        />
      </div>
    </header>
  );
};
