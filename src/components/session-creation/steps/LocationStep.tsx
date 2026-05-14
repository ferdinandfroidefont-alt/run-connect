import React, { useState, useEffect } from 'react';
import type { Map as MapboxMap } from 'mapbox-gl';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Search, Navigation, Crosshair, Check } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { geocodeSearchMapbox, reverseGeocodeMapbox } from '@/lib/mapboxGeocode';
import { SelectedLocation } from '../types';
import { cn } from '@/lib/utils';
import { AppleStepHeader, AppleStepFooter } from './AppleStepChrome';

interface LocationStepProps {
  map: MapboxMap | null;
  selectedLocation: SelectedLocation | null;
  onLocationSelect: (location: SelectedLocation) => void;
  onNext: () => void;
  /** Masque le pied « Continuer » (création rapide, étape combinée) */
  hideFooter?: boolean;
}

export const LocationStep: React.FC<LocationStepProps> = ({
  map,
  selectedLocation,
  onLocationSelect,
  onNext,
  hideFooter = false,
}) => {
  const [locationSearch, setLocationSearch] = useState(selectedLocation?.name || '');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLocating, setIsLocating] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (locationSearch.trim()) {
        handleSearch(locationSearch);
      } else {
        setSearchResults([]);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [locationSearch]);

  const handleSearch = async (query: string) => {
    if (!query.trim()) return;
    setIsSearching(true);
    try {
      const rows = await geocodeSearchMapbox(query, 5);
      setSearchResults(rows);
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectResult = (result: any) => {
    const location = result.geometry.location;
    onLocationSelect({
      lat: location.lat,
      lng: location.lng,
      name: result.formatted_address,
    });
    setLocationSearch(result.formatted_address);
    setSearchResults([]);

    if (map) {
      map.setCenter({ lat: location.lat, lng: location.lng });
      map.setZoom(15);
    }
  };

  const handleUseMapCenter = async () => {
    if (!map) return;
    const center = map.getCenter();
    if (!center) return;
    setIsLocating(true);
    try {
      const lat = center.lat;
      const lng = center.lng;
      const name = await reverseGeocodeMapbox(lat, lng);
      if (name) {
        onLocationSelect({ lat, lng, name });
        setLocationSearch(name);
      }
    } catch (error) {
      console.error('Reverse geocode error:', error);
    } finally {
      setIsLocating(false);
    }
  };

  const handleMyLocation = () => {
    if (!navigator.geolocation) return;
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        if (map) {
          map.easeTo({
            center: [longitude, latitude],
            zoom: 15,
            duration: 700,
            essential: true,
          });
        }
        try {
          const placeName = await reverseGeocodeMapbox(latitude, longitude);
          if (placeName) {
            onLocationSelect({ lat: latitude, lng: longitude, name: placeName });
            setLocationSearch(placeName);
          } else {
            onLocationSelect({
              lat: latitude,
              lng: longitude,
              name: `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`,
            });
          }
        } catch (error) {
          console.error('Error:', error);
          onLocationSelect({
            lat: latitude,
            lng: longitude,
            name: `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`,
          });
        } finally {
          setIsLocating(false);
        }
      },
      () => setIsLocating(false)
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 12 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -12 }}
      className={hideFooter ? 'flex w-full flex-col' : 'flex h-full min-h-0 w-full flex-1 flex-col'}
    >
      <div
        className={
          hideFooter
            ? 'w-full'
            : 'min-h-0 flex-1 overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch]'
        }
      >
        <div className={cn('flex w-full flex-col px-1', hideFooter ? 'pt-2 pb-4' : 'pt-3 pb-8')}>
          {!hideFooter && (
            <AppleStepHeader
              step={1}
              title="Où ça se passe ?"
              subtitle="Cherche un parc, une rue, ou pose un point sur la carte."
            />
          )}

          {/* Search field — pill shape, Apple search style */}
          <div className="relative px-1">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={locationSearch}
              onChange={(e) => setLocationSearch(e.target.value)}
              placeholder="Cherche un parc, une rue..."
              className="h-12 w-full rounded-full border-border/60 bg-card pl-11 pr-11 text-[17px] tracking-tight placeholder:text-muted-foreground/70"
            />
            {isSearching && (
              <div className="absolute right-4 top-1/2 -translate-y-1/2">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            )}

            <AnimatePresence>
              {searchResults.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className="absolute z-50 mt-2 w-full overflow-hidden rounded-[18px] border border-border/60 bg-card shadow-lg"
                >
                  {searchResults.map((result, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSelectResult(result)}
                      className={cn(
                        'flex w-full items-center gap-3 px-4 py-3 text-left text-[15px] tracking-tight transition-colors',
                        'active:bg-secondary/80',
                        idx < searchResults.length - 1 && 'border-b border-border/40'
                      )}
                    >
                      <MapPin className="h-4 w-4 shrink-0 text-primary" />
                      <span className="truncate text-foreground">{result.formatted_address}</span>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Quick actions — pill grammar */}
          <div className="mt-3 flex flex-wrap gap-2 px-1">
            <button
              type="button"
              onClick={handleMyLocation}
              disabled={isLocating}
              className={cn(
                'inline-flex h-9 items-center gap-1.5 rounded-full bg-primary px-4 text-[14px] font-medium tracking-tight text-white transition-transform',
                'active:scale-[0.96] disabled:opacity-60'
              )}
            >
              <Navigation className="h-3.5 w-3.5" />
              Ma position
            </button>
            {map && (
              <button
                type="button"
                onClick={handleUseMapCenter}
                disabled={isLocating}
                className={cn(
                  'inline-flex h-9 items-center gap-1.5 rounded-full border border-primary/60 bg-card px-4 text-[14px] font-medium tracking-tight text-primary transition-transform',
                  'active:scale-[0.96] disabled:opacity-60'
                )}
              >
                <Crosshair className="h-3.5 w-3.5" />
                Centrer la carte
              </button>
            )}
          </div>

          {/* Selected location card — Apple grouped cell */}
          <div className="mt-5 px-1">
            <AnimatePresence mode="wait">
              {selectedLocation ? (
                <motion.div
                  key="selected"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  className="overflow-hidden rounded-[18px] border border-border/60 bg-card"
                >
                  <div className="flex items-center gap-3 p-4">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-primary/10 text-primary">
                      <MapPin className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[12px] font-medium uppercase tracking-[0.16em] text-primary">
                        Lieu sélectionné
                      </div>
                      <div className="mt-0.5 truncate text-[15px] font-medium tracking-tight text-foreground">
                        {selectedLocation.name}
                      </div>
                    </div>
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-white">
                      <Check className="h-4 w-4" />
                    </div>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="hint"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="rounded-[18px] border border-dashed border-border/70 bg-card/40 p-6 text-center"
                >
                  <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <MapPin className="h-5 w-5" />
                  </div>
                  <p className="text-[15px] font-medium tracking-tight text-foreground">
                    Aucun lieu sélectionné
                  </p>
                  <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
                    Pose un point depuis la carte ou utilise la recherche ci-dessus.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {!hideFooter && (
        <AppleStepFooter
          onNext={onNext}
          nextLabel="Continuer"
          nextDisabled={!selectedLocation}
          showBack={false}
        />
      )}
    </motion.div>
  );
};
