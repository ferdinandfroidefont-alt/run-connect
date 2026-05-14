import React, { useState, useEffect } from 'react';
import type { Map as MapboxMap } from 'mapbox-gl';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Search, Navigation, Compass, Check } from 'lucide-react';
import { geocodeSearchMapbox, reverseGeocodeMapbox } from '@/lib/mapboxGeocode';
import { SelectedLocation } from '../types';
import { cn } from '@/lib/utils';
import { AppleStepHeader, AppleStepFooter } from './AppleStepChrome';
import {
  WIZARD_ACTION_BLUE,
  WIZARD_CARD_SHADOW,
  WIZARD_MUTED,
  WIZARD_PIN_TINT,
  WIZARD_SOFT_SHADOW,
  WIZARD_TITLE,
} from '../wizardVisualTokens';

interface LocationStepProps {
  map: MapboxMap | null;
  selectedLocation: SelectedLocation | null;
  onLocationSelect: (location: SelectedLocation) => void;
  onNext: () => void;
  /** Masque le pied « Continuer » (création rapide, étape combinée) */
  hideFooter?: boolean;
  /** Pied géré par `CreateSessionWizard` (maquette plein écran) */
  wizardShellFooter?: boolean;
}

export const LocationStep: React.FC<LocationStepProps> = ({
  map,
  selectedLocation,
  onLocationSelect,
  onNext,
  hideFooter = false,
  wizardShellFooter = false,
}) => {
  const [locationSearch, setLocationSearch] = useState(selectedLocation?.name || '');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLocating, setIsLocating] = useState(false);

  const embeddedNoHero = hideFooter;
  const suppressFooter = hideFooter || wizardShellFooter;

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
      className={embeddedNoHero ? 'flex w-full flex-col' : 'flex h-full min-h-0 w-full flex-1 flex-col'}
    >
      <div
        className={
          embeddedNoHero
            ? 'w-full'
            : 'min-h-0 flex-1 overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch]'
        }
      >
        <div className={cn('flex w-full flex-col px-0', embeddedNoHero ? 'pt-2 pb-4' : 'pt-0 pb-6')}>
          {!embeddedNoHero && (
            <AppleStepHeader
              title="Où ça se passe ?"
              subtitle="Cherche un parc, une rue, ou pose un point sur la carte."
            />
          )}

          {/* Barre recherche — maquette */}
          <div className="relative">
            <div
              className="flex items-center gap-2 rounded-full bg-white py-[13px] pl-[18px] pr-[18px]"
              style={{ boxShadow: WIZARD_SOFT_SHADOW }}
            >
              <Search className="h-4 w-4 shrink-0" strokeWidth={2.4} style={{ color: WIZARD_MUTED }} />
              <input
                value={locationSearch}
                onChange={(e) => setLocationSearch(e.target.value)}
                placeholder="Adresse, parc, lieu..."
                className="min-w-0 flex-1 truncate border-0 bg-transparent p-0 text-[16px] font-semibold outline-none placeholder:text-[#8E8E93] focus:ring-0"
                style={{ color: WIZARD_TITLE }}
              />
            </div>
            {isSearching && (
              <div className="absolute right-4 top-1/2 -translate-y-1/2">
                <div
                  className="h-4 w-4 animate-spin rounded-full border-2 border-t-transparent"
                  style={{ borderColor: `${WIZARD_ACTION_BLUE}55`, borderTopColor: WIZARD_ACTION_BLUE }}
                />
              </div>
            )}

            <AnimatePresence>
              {searchResults.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className="absolute z-50 mt-2 w-full overflow-hidden rounded-2xl bg-white"
                  style={{ boxShadow: WIZARD_CARD_SHADOW }}
                >
                  {searchResults.map((result, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSelectResult(result)}
                      className={cn(
                        'flex w-full items-center gap-3 px-4 py-3 text-left text-[15px] transition-colors',
                        'active:bg-[#F2F2F7]',
                        idx < searchResults.length - 1 && 'border-b border-[#E5E5EA]'
                      )}
                    >
                      <MapPin className="h-4 w-4 shrink-0" style={{ color: WIZARD_ACTION_BLUE }} />
                      <span className="truncate" style={{ color: WIZARD_TITLE }}>
                        {result.formatted_address}
                      </span>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="mt-3 flex gap-2.5">
            <button
              type="button"
              onClick={handleMyLocation}
              disabled={isLocating}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-full py-3 transition-transform active:scale-[0.97] disabled:opacity-60"
              style={{ background: WIZARD_ACTION_BLUE }}
            >
              <Navigation className="h-4 w-4 text-white" strokeWidth={2.6} />
              <span className="text-[15px] font-bold text-white">Ma position</span>
            </button>
            {map ? (
              <button
                type="button"
                onClick={handleUseMapCenter}
                disabled={isLocating}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-full border-[1.5px] bg-white py-3 transition-transform active:scale-[0.97] disabled:opacity-60"
                style={{ borderColor: WIZARD_ACTION_BLUE }}
              >
                <Compass className="h-4 w-4 shrink-0" color={WIZARD_ACTION_BLUE} strokeWidth={2.6} />
                <span className="text-[15px] font-bold" style={{ color: WIZARD_ACTION_BLUE }}>
                  Centrer la carte
                </span>
              </button>
            ) : null}
          </div>

          {selectedLocation ? (
            <div className="mt-4 flex items-center gap-3 rounded-2xl bg-white p-3" style={{ boxShadow: WIZARD_CARD_SHADOW }}>
              <div
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
                style={{ background: WIZARD_PIN_TINT }}
              >
                <MapPin className="h-5 w-5 shrink-0" color={WIZARD_ACTION_BLUE} strokeWidth={2.4} />
              </div>
              <div className="min-w-0 flex-1">
                <p
                  className="m-0 text-[11px] font-extrabold uppercase"
                  style={{ color: WIZARD_ACTION_BLUE, letterSpacing: '0.1em' }}
                >
                  Lieu sélectionné
                </p>
                <p className="mt-0.5 truncate text-[15px] font-bold" style={{ color: WIZARD_TITLE }}>
                  {selectedLocation.name}
                </p>
              </div>
              <div
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white"
                style={{ background: WIZARD_ACTION_BLUE }}
              >
                <Check className="h-4 w-4" strokeWidth={3} />
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {!suppressFooter && (
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
