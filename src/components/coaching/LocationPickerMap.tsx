import { useState, useCallback, useRef, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ArrowLeft, MapPin, Check } from "lucide-react";

interface LocationPickerMapProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (name: string, lat: number, lng: number) => void;
  initialLat?: number;
  initialLng?: number;
}

export const LocationPickerMap = ({ isOpen, onClose, onSelect, initialLat = 48.8566, initialLng = 2.3522 }: LocationPickerMapProps) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);
  const [selectedPos, setSelectedPos] = useState<{ lat: number; lng: number } | null>(null);
  const [address, setAddress] = useState("");

  useEffect(() => {
    if (!isOpen || !mapRef.current) return;
    if (!window.google?.maps) return;

    const map = new google.maps.Map(mapRef.current, {
      center: { lat: initialLat, lng: initialLng },
      zoom: 14,
      disableDefaultUI: true,
      zoomControl: true,
      mapTypeControl: false,
      streetViewControl: false,
    });
    mapInstanceRef.current = map;

    // Long press handler
    let pressTimer: NodeJS.Timeout | null = null;
    let pressPos: { lat: number; lng: number } | null = null;

    const handleMouseDown = (e: google.maps.MapMouseEvent) => {
      if (!e.latLng) return;
      pressPos = { lat: e.latLng.lat(), lng: e.latLng.lng() };
      pressTimer = setTimeout(() => {
        if (pressPos) placeMarker(pressPos.lat, pressPos.lng);
      }, 500);
    };

    const handleMouseUp = () => {
      if (pressTimer) clearTimeout(pressTimer);
    };

    map.addListener("mousedown", handleMouseDown);
    map.addListener("mouseup", handleMouseUp);
    map.addListener("dragstart", handleMouseUp);

    // Also support regular click for desktop
    map.addListener("click", (e: google.maps.MapMouseEvent) => {
      if (!e.latLng) return;
      placeMarker(e.latLng.lat(), e.latLng.lng());
    });

    return () => {
      google.maps.event.clearInstanceListeners(map);
    };
  }, [isOpen]);

  const placeMarker = useCallback((lat: number, lng: number) => {
    if (!mapInstanceRef.current) return;

    if (markerRef.current) {
      markerRef.current.setPosition({ lat, lng });
    } else {
      markerRef.current = new google.maps.Marker({
        position: { lat, lng },
        map: mapInstanceRef.current,
        animation: google.maps.Animation.DROP,
      });
    }

    setSelectedPos({ lat, lng });

    // Reverse geocode
    const geocoder = new google.maps.Geocoder();
    geocoder.geocode({ location: { lat, lng } }, (results, status) => {
      if (status === "OK" && results?.[0]) {
        const addr = results[0].formatted_address;
        setAddress(addr.length > 60 ? addr.substring(0, 60) + "…" : addr);
      } else {
        setAddress(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
      }
    });
  }, []);

  const handleConfirm = () => {
    if (!selectedPos) return;
    onSelect(address || `${selectedPos.lat.toFixed(5)}, ${selectedPos.lng.toFixed(5)}`, selectedPos.lat, selectedPos.lng);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent fullScreen hideCloseButton className="flex flex-col p-0 gap-0">
        <div className="sticky top-0 z-10 bg-card border-b border-border px-4 py-3 flex items-center shrink-0">
          <button onClick={onClose} className="flex items-center gap-0.5 text-primary text-[17px] min-w-[70px]">
            <ArrowLeft className="h-5 w-5" />
            <span className="text-[15px]">Retour</span>
          </button>
          <span className="flex-1 text-center text-[17px] font-semibold text-foreground">
            Choisir le lieu
          </span>
          <div className="min-w-[70px]" />
        </div>

        <div className="flex-1 relative">
          <div ref={mapRef} className="w-full h-full" />

          {!selectedPos && (
            <div className="absolute top-4 left-4 right-4 bg-card/95 backdrop-blur-sm rounded-xl p-3 shadow-lg">
              <p className="text-[14px] text-foreground font-medium flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary" />
                Appuyez sur la carte pour placer le lieu
              </p>
            </div>
          )}

          {selectedPos && (
            <div className="absolute bottom-6 left-4 right-4 bg-card rounded-xl p-4 shadow-lg space-y-3">
              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-[15px] font-semibold text-foreground truncate">{address || "Lieu sélectionné"}</p>
                  <p className="text-[12px] text-muted-foreground">{selectedPos.lat.toFixed(5)}, {selectedPos.lng.toFixed(5)}</p>
                </div>
              </div>
              <Button className="w-full h-11 rounded-xl" onClick={handleConfirm}>
                <Check className="h-4 w-4 mr-2" />
                Confirmer ce lieu
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
