import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Globe, Bike, Footprints, Users, Home, MapPin, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";

export type FilterType = 'general' | 'running' | 'cycling' | 'walking' | 'friends' | 'club' | 'local';

interface FilterBarProps {
  activeFilter: FilterType;
  onFilterChange: (filter: FilterType) => void;
  hasClub?: boolean;
}

export const FilterBar = ({ activeFilter, onFilterChange, hasClub = false }: FilterBarProps) => {
  const filters = [
    { value: 'general' as FilterType, label: 'Général', icon: Globe },
    { value: 'running' as FilterType, label: 'Running', icon: Trophy },
    { value: 'cycling' as FilterType, label: 'Vélo', icon: Bike },
    { value: 'walking' as FilterType, label: 'Marche', icon: Footprints },
    { value: 'friends' as FilterType, label: 'Amis', icon: Users },
    ...(hasClub ? [{ value: 'club' as FilterType, label: 'Mon club', icon: Home }] : []),
    { value: 'local' as FilterType, label: 'Local 20km', icon: MapPin },
  ];

  return (
    <div className="w-full overflow-x-auto pb-2 scrollbar-hide">
      <div className="flex gap-2 min-w-max px-1">
        {filters.map((filter) => {
          const Icon = filter.icon;
          return (
            <Button
              key={filter.value}
              variant={activeFilter === filter.value ? "default" : "outline"}
              size="sm"
              onClick={() => onFilterChange(filter.value)}
              className={cn(
                "flex items-center gap-1.5 whitespace-nowrap transition-all",
                activeFilter === filter.value && "shadow-md"
              )}
            >
              <Icon className="h-4 w-4" />
              {filter.label}
            </Button>
          );
        })}
      </div>
    </div>
  );
};
