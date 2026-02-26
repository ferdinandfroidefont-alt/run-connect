import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { MapPin, Search, Navigation, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { SelectedLocation } from '../types';
import { cn } from '@/lib/utils';

interface LocationStepProps {
  map: google.maps.Map | null;
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
      if (window.google?.maps?.places) {
        const service = new google.maps.places.PlacesService(document.createElement('div'));
        service.textSearch({ query }, (results, status) => {
          if (status === google.maps.places.PlacesServiceStatus.OK && results) {
            setSearchResults(results.slice(0, 5).map(r => ({
              formatted_address: r.formatted_address || r.name,
              geometry: {
                location: {
                  lat: r.geometry?.location?.lat() || 0,
                  lng: r.geometry?.location?.lng() || 0,
                }
              }
            })));
          }
          setIsSearching(false);
        });
      } else {
        const { data } = await supabase.functions.invoke('google-maps-proxy', {
          body: { address: query, type: 'geocode' }
        });
        if (data?.results) setSearchResults(data.results.slice(0, 5));
        setIsSearching(false);
      }
    } catch (error) {
      console.error('Search error:', error);
      setIsSearching(false);
    }
  };

  const handleSelectResult = (result: any) => {
    const location = result.geometry.location;
    onLocationSelect({
      lat: location.lat,
      lng: location.lng,
      name: result.formatted_address
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
      const { data } = await supabase.functions.invoke('google-maps-proxy', {
        body: { lat: center.lat(), lng: center.lng(), type: 'reverse' }
      });
      
      if (data?.results?.[0]) {
        onLocationSelect({
          lat: center.lat(),
          lng: center.lng(),
          name: data.results[0].formatted_address
        });
        setLocationSearch(data.results[0].formatted_address);
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
        
        // Center map if available
        if (map) {
          map.setCenter({ lat: latitude, lng: longitude });
          map.setZoom(15);
        }
        
        try {
          const { data } = await supabase.functions.invoke('google-maps-proxy', {
            body: { lat: latitude, lng: longitude, type: 'reverse' }
          });
          
          if (data?.results?.[0]) {
            onLocationSelect({
              lat: latitude,
              lng: longitude,
              name: data.results[0].formatted_address
            });
            setLocationSearch(data.results[0].formatted_address);
          } else {
            // Fallback: use coordinates directly
            onLocationSelect({
              lat: latitude,
              lng: longitude,
              name: `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`
            });
          }
        } catch (error) {
          console.error('Error:', error);
          // Fallback: use coordinates directly
          onLocationSelect({
            lat: latitude,
            lng: longitude,
            name: `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`
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
      className="flex flex-col h-full"
    >
      {/* Header */}
      <div className="text-center mb-6">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/20 flex items-center justify-center">
          <MapPin className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-2xl font-bold text-foreground">Où se passe la séance ?</h2>
        <p className="text-muted-foreground mt-2">Recherchez un lieu ou sélectionnez sur la carte</p>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <Input
          value={locationSearch}
          onChange={(e) => setLocationSearch(e.target.value)}
          placeholder="Rechercher un lieu..."
          className="pl-10 h-12 text-base"
        />
        {isSearching && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        )}
        
        {/* Search results */}
        {searchResults.length > 0 && (
          <div className="absolute z-50 w-full mt-2 bg-card border border-border rounded-xl shadow-lg overflow-hidden">
            {searchResults.map((result, idx) => (
              <button
                key={idx}
                onClick={() => handleSelectResult(result)}
                className="w-full px-4 py-3 text-left hover:bg-accent flex items-center gap-3 transition-colors"
              >
                <MapPin className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <span className="text-sm truncate">{result.formatted_address}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex gap-3 mb-10 overflow-hidden">
        <Button
          variant="outline"
          onClick={handleMyLocation}
          disabled={isLocating}
          className={map ? "flex-1 h-12 min-w-0" : "w-full h-12"}
        >
          <Navigation className="w-4 h-4 mr-2 flex-shrink-0" />
          <span className="truncate">Ma position</span>
        </Button>
        {map && (
          <Button
            variant="outline"
            onClick={handleUseMapCenter}
            disabled={isLocating}
            className="flex-1 h-12 min-w-0"
          >
            <MapPin className="w-4 h-4 mr-2 flex-shrink-0" />
            <span className="truncate">Centre carte</span>
          </Button>
        )}
      </div>

      {/* Selected location preview */}
      {selectedLocation && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-xl bg-primary/10 border border-primary/30 mb-6"
        >
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
              <MapPin className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">Lieu sélectionné</p>
              <p className="text-sm text-muted-foreground truncate">{selectedLocation.name}</p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Next button */}
      <div className="mt-auto">
        <Button
          onClick={onNext}
          disabled={!selectedLocation}
          className="w-full h-14 text-lg font-semibold"
        >
          Continuer
          <ChevronRight className="w-5 h-5 ml-2" />
        </Button>
      </div>
    </motion.div>
  );
};
