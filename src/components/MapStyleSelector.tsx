import React, { useState } from 'react';
import { Map, Satellite, Mountain, Palette } from 'lucide-react';

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
        onClick={() => setIsOpen(!isOpen)}
        className="bg-map-control/90 backdrop-blur-sm border border-map-control-border rounded-lg p-3 shadow-map-control hover:bg-map-control-hover transition-colors"
        title="Styles de carte"
      >
        <Palette size={20} className="text-foreground" />
      </button>

      {/* Style Options */}
      {isOpen && (
        <div className="absolute top-14 right-0 bg-card/95 backdrop-blur-sm border border-border rounded-lg shadow-map-panel p-3 min-w-[200px]">
          <h3 className="text-sm font-medium text-foreground mb-3">Style de carte</h3>
          <div className="grid grid-cols-2 gap-2">
            {mapStyles.map((style) => {
              const Icon = style.icon;
              const isActive = currentStyle === style.id;
              
              return (
                <button
                  key={style.id}
                  onClick={() => {
                    onStyleChange(style.id);
                    setIsOpen(false);
                  }}
                  className={`
                    flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all
                    ${isActive 
                      ? 'border-primary bg-primary/10' 
                      : 'border-transparent hover:border-border hover:bg-muted/50'
                    }
                  `}
                >
                  <div className={`w-8 h-6 rounded ${style.preview} flex items-center justify-center`}>
                    <Icon size={12} className="text-white drop-shadow" />
                  </div>
                  <span className="text-xs font-medium text-foreground">
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