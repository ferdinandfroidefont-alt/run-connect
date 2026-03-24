import React, { useState } from 'react';
import { Map, Satellite, Mountain, Palette } from 'lucide-react';
import { MAP_HOME_FAB_CLASS, MAP_HOME_PANEL_CLASS } from '@/lib/mapHomeUi';
import { cn } from '@/lib/utils';

interface MapStyleSelectorProps {
  currentStyle: string;
  onStyleChange: (style: string) => void;
}

const mapStyles = [
  {
    id: 'roadmap',
    name: 'Route',
    icon: Map,
    preview: 'bg-gradient-to-br from-gray-50 to-gray-200'
  },
  {
    id: 'satellite',
    name: 'Satellite',
    icon: Satellite,
    preview: 'bg-gradient-to-br from-green-600 to-blue-600'
  },
  {
    id: 'hybrid',
    name: 'Hybride',
    icon: Mountain,
    preview: 'bg-gradient-to-br from-green-500 to-yellow-600'
  },
  {
    id: 'terrain',
    name: 'Terrain',
    icon: Mountain,
    preview: 'bg-gradient-to-br from-amber-600 to-green-700'
  }
];

export const MapStyleSelector: React.FC<MapStyleSelectorProps> = ({
  currentStyle,
  onStyleChange,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      {/* Toggle Button */}
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className={MAP_HOME_FAB_CLASS}
        title="Styles de carte"
        aria-expanded={isOpen}
      >
        <Palette className="text-foreground" strokeWidth={1.75} />
      </button>

      {/* Style Options */}
      {isOpen && (
        <div className={cn('absolute bottom-12 left-0 z-20 min-w-[200px]', MAP_HOME_PANEL_CLASS)}>
          <h3 className="mb-3 text-ios-subheadline font-semibold text-foreground">Style de carte</h3>
          <div className="grid grid-cols-2 gap-2">
            {mapStyles.map((style) => {
              const Icon = style.icon;
              const isActive = currentStyle === style.id;
              
              return (
                <button
                  key={style.id}
                  type="button"
                  onClick={() => {
                    onStyleChange(style.id);
                    setIsOpen(false);
                  }}
                  className={cn(
                    'flex flex-col items-center gap-2 rounded-ios-md border p-3 transition-colors',
                    isActive
                      ? 'border-primary bg-primary/10'
                      : 'border-border bg-card hover:bg-secondary/60'
                  )}
                >
                  <div className={`flex h-6 w-8 items-center justify-center rounded-ios-sm ${style.preview}`}>
                    <Icon size={12} className="text-white drop-shadow" />
                  </div>
                  <span className="text-ios-caption1 font-medium text-foreground">
                    {style.name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-[-1]" 
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
};