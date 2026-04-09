import React, { useState, useEffect } from 'react';
import mapboxgl from 'mapbox-gl';
import { motion } from 'framer-motion';
import { MapPin, Search, Navigation, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { geocodeSearchMapbox, reverseGeocodeMapbox } from '@/lib/mapboxGeocode';
import { SelectedLocation } from '../types';
import { cn } from '@/lib/utils';

interface LocationStepProps {
  map: mapboxgl.Map | null;
  selectedLocation: SelectedLocation | null;
  onLocationSelect: (location: SelectedLocation) => void;
  onNext: () => void;
}

export const LocationStep: React.FC<LocationStepProps> = ({
  map,
  selectedLocation,
  onLocationSelect,
  onNext,
}) => {
  const [locationSearch, setLocationSearch] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLocating, setIsLocating] = useState(false);

  // Debounced search
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
            onLocationSelect({
              lat: latitude,
              lng: longitude,
              name: placeName,
            });
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
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="flex h-full min-h-0 w-full flex-1 flex-col"
    >
      {/* Zone scroll : contenu centré verticalement entre header wizard et pied fixe */}
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch]">
        <div className="flex min-h-full flex-col justify-center px-0.5 py-10 sm:py-12">
          <div className="mx-auto flex w-full max-w-sm flex-col items-center text-center">
            {/* Icône — légèrement plus grande, fond discret type iOS */}
            <div
              className={cn(
                'flex h-[72px] w-[72px] shrink-0 items-center justify-center rounded-[20px]',
                'bg-muted/75 ring-1 ring-border/45 dark:bg-muted/35'
              )}
              aria-hidden
            >
              <MapPin className="h-10 w-10 text-primary" strokeWidth={1.85} />
            </div>

            {/* 16px : icône → titre */}
            <h2 className="mt-4 text-[22px] font-semibold leading-snug tracking-tight text-foreground">
              Où se passe la séance ?
            </h2>

            {/* 8–12px : titre → description */}
            <p className="mt-2.5 text-[15px] leading-relaxed text-muted-foreground">
              Recherchez un lieu ou sélectionnez sur la carte
            </p>

            {/* 24px : description → recherche */}
            <div className="relative mt-6 w-full text-left">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={locationSearch}
                onChange={(e) => setLocationSearch(e.target.value)}
                placeholder="Rechercher un lieu..."
                className="h-12 w-full pl-10 text-base"
              />
              {isSearching && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                </div>
              )}

              {searchResults.length > 0 && (
                <div className="absolute z-50 mt-2 w-full overflow-hidden rounded-xl border border-border bg-card shadow-lg">
                  {searchResults.map((result, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSelectResult(result)}
                      className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-accent"
                    >
                      <MapPin className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <span className="truncate text-sm">{result.formatted_address}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* 16px : recherche → boutons ; 32–40px après les boutons (fin du bloc principal) */}
            <div className="mt-4 mb-8 flex w-full min-w-0 gap-3 sm:mb-10">
              <Button
                variant="outline"
                onClick={handleMyLocation}
                disabled={isLocating}
                className={map ? 'h-12 min-w-0 flex-1' : 'h-12 w-full'}
              >
                <Navigation className="mr-2 h-4 w-4 shrink-0" />
                <span className="truncate">Ma position</span>
              </Button>
              {map && (
                <Button
                  variant="outline"
                  onClick={handleUseMapCenter}
                  disabled={isLocating}
                  className="h-12 min-w-0 flex-1"
                >
                  <MapPin className="mr-2 h-4 w-4 shrink-0" />
                  <span className="truncate">Centre carte</span>
                </Button>
              )}
            </div>
          </div>

          {/* Lieu sélectionné : dans le flux scroll sous le groupe centré */}
          {selectedLocation && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mx-auto w-full max-w-sm rounded-xl border border-primary/30 bg-primary/10 p-4"
            >
              <div className="flex items-start gap-3 text-left">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                  <MapPin className="h-5 w-5 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground">Lieu sélectionné</p>
                  <p className="truncate text-sm text-muted-foreground">{selectedLocation.name}</p>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* Continuer : fixe en bas du step, safe area iOS */}
      <div
        className={cn(
          'relative z-10 -mx-4 shrink-0 border-t border-border/60 bg-secondary/95 px-4 pt-4',
          'backdrop-blur-md supports-[backdrop-filter]:bg-secondary/90',
          'pb-[max(1rem,env(safe-area-inset-bottom,1rem))]'
        )}
      >
        <Button
          onClick={onNext}
          disabled={!selectedLocation}
          className="h-14 w-full text-lg font-semibold"
        >
          Continuer
          <ChevronRight className="ml-2 h-5 w-5" />
        </Button>
      </div>
    </motion.div>
  );
};
