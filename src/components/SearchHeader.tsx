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
    <header 
      className="sticky top-0 z-10 px-4 py-4 flex items-center gap-3 border-b border-white/10"
      style={{
        background: 'linear-gradient(135deg, hsl(217 100% 50%) 0%, hsl(191 100% 50%) 100%)',
        backdropFilter: 'blur(12px)'
      }}
    >
      {/* Flèche retour */}
      <Button
        variant="ghost"
        size="icon"
        onClick={onBack}
        className="shrink-0 text-white hover:bg-white/10"
        aria-label="Retour"
      >
        <ArrowLeft className="h-5 w-5" />
      </Button>

      {/* Champ de recherche */}
      <div className="flex-1 relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/70" />
        <Input
          ref={inputRef}
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={placeholder}
          className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-white/60 h-10"
        />
      </div>
    </header>
  );
};
