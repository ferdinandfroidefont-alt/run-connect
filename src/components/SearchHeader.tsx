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
    <header className="sticky top-0 z-10 bg-gradient-to-r from-primary/5 to-primary/10 backdrop-blur-sm border-b border-white/10 px-4 py-4 flex items-center gap-3 mt-6">
      {/* Flèche retour */}
      <Button
        variant="ghost"
        size="icon"
        onClick={onBack}
        className="shrink-0 hover:bg-white/10 rounded-xl"
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
          className="pl-10 h-10"
        />
      </div>
    </header>
  );
};
