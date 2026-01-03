import { MapPin, MapPinOff } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DiscoverEmptyStateProps {
  hasLocation: boolean;
  onResetFilters: () => void;
}

export const DiscoverEmptyState = ({ hasLocation, onResetFilters }: DiscoverEmptyStateProps) => {
  if (!hasLocation) {
    return (
      <div className="bg-card border border-border rounded-[10px] p-8 text-center mx-4">
        <div className="h-16 w-16 mx-auto mb-4 rounded-full bg-secondary flex items-center justify-center">
          <MapPinOff className="h-8 w-8 text-muted-foreground" />
        </div>
        <p className="text-[17px] font-semibold text-foreground mb-1">
          Localisation requise
        </p>
        <p className="text-[13px] text-muted-foreground">
          Active la géolocalisation pour découvrir les séances à proximité
        </p>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-[10px] p-8 text-center mx-4">
      <div className="h-16 w-16 mx-auto mb-4 rounded-full bg-secondary flex items-center justify-center">
        <MapPin className="h-8 w-8 text-muted-foreground" />
      </div>
      <p className="text-[17px] font-semibold text-foreground mb-1">
        Aucune séance trouvée
      </p>
      <p className="text-[13px] text-muted-foreground mb-4">
        Élargis la distance ou active d'autres sports
      </p>
      <Button
        variant="outline"
        size="sm"
        onClick={onResetFilters}
        className="rounded-full"
      >
        Réinitialiser les filtres
      </Button>
    </div>
  );
};
