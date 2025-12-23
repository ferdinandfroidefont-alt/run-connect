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
    <header className="sticky top-0 z-10 glass-primary px-4 py-4 flex items-center gap-3 mt-6">
      {/* Animated gradient top bar */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 animate-[shimmer_3s_ease-in-out_infinite]" style={{ backgroundSize: '200% 100%' }} />
      
      {/* Flèche retour with gradient */}
      <Button
        variant="ghost"
        size="icon"
        onClick={onBack}
        className="shrink-0 hover:bg-gradient-to-br hover:from-primary/20 hover:to-accent/20 transition-all duration-300"
        aria-label="Retour"
      >
        <ArrowLeft className="h-5 w-5" />
      </Button>

      {/* Champ de recherche with gradient focus */}
      <div className="flex-1 relative group">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
        <Input
          ref={inputRef}
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={placeholder}
          className="pl-10 glass-card border-0 bg-background/50 h-10 focus:ring-2 focus:ring-primary/50 focus:shadow-lg focus:shadow-primary/20 transition-all duration-300"
        />
      </div>
    </header>
  );
};
