import { useState, useRef, useEffect } from "react";
import mapboxgl from "mapbox-gl";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ArrowLeft, MapPin, Check } from "lucide-react";
import { createEmbeddedMapboxMap } from "@/lib/mapboxEmbed";
import { getMapboxAccessToken } from "@/lib/mapboxConfig";
import { reverseGeocodeMapbox } from "@/lib/mapboxGeocode";

interface LocationPickerMapProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (name: string, lat: number, lng: number) => void;
  initialLat?: number;
  initialLng?: number;
}

export const LocationPickerMap = ({
  isOpen,
  onClose,
  onSelect,
  initialLat = 48.8566,
  initialLng = 2.3522,
}: LocationPickerMapProps) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<mapboxgl.Map | null>(null);
  const markerRef = useRef<mapboxgl.Marker | null>(null);
  const [selectedPos, setSelectedPos] = useState<{ lat: number; lng: number } | null>(null);
  const [address, setAddress] = useState("");

  useEffect(() => {
    if (!isOpen || !mapContainerRef.current || !getMapboxAccessToken()) return;

    const map = createEmbeddedMapboxMap(mapContainerRef.current, {
      center: { lat: initialLat, lng: initialLng },
      zoom: 14,
      interactive: true,
    });
    mapInstanceRef.current = map;

    let pressTimer: ReturnType<typeof setTimeout> | null = null;
    let pressPos: { lat: number; lng: number } | null = null;

    const placeAt = (lat: number, lng: number) => {
      void (async () => {
        if (!mapInstanceRef.current) return;
        if (markerRef.current) {
          markerRef.current.setLngLat([lng, lat]);
        } else {
          const el = document.createElement("div");
          el.style.width = "14px";
          el.style.height = "14px";
          el.style.borderRadius = "50%";
          el.style.background = "#5B7CFF";
          el.style.border = "3px solid white";
          el.style.boxShadow = "0 2px 8px rgba(0,0,0,0.25)";
          markerRef.current = new mapboxgl.Marker({ element: el }).setLngLat([lng, lat]).addTo(mapInstanceRef.current);
        }
        setSelectedPos({ lat, lng });
        const label = await reverseGeocodeMapbox(lat, lng);
        setAddress(
          label && label.length > 60 ? `${label.substring(0, 60)}…` : label || `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
        );
      })();
    };

    const onMouseDown = (e: mapboxgl.MapMouseEvent) => {
      pressPos = { lat: e.lngLat.lat, lng: e.lngLat.lng };
      pressTimer = window.setTimeout(() => {
        if (pressPos) placeAt(pressPos.lat, pressPos.lng);
      }, 500);
    };

    const clearPress = () => {
      if (pressTimer) {
        clearTimeout(pressTimer);
        pressTimer = null;
      }
    };

    map.on("mousedown", onMouseDown);
    map.on("mouseup", clearPress);
    map.on("dragstart", clearPress);
    map.on("click", (e: mapboxgl.MapMouseEvent) => {
      placeAt(e.lngLat.lat, e.lngLat.lng);
    });

    return () => {
      clearPress();
      map.off("mousedown", onMouseDown);
      map.off("mouseup", clearPress);
      map.off("dragstart", clearPress);
      markerRef.current?.remove();
      markerRef.current = null;
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [isOpen, initialLat, initialLng]);

  const handleConfirm = () => {
    if (!selectedPos) return;
    onSelect(address || `${selectedPos.lat.toFixed(5)}, ${selectedPos.lng.toFixed(5)}`, selectedPos.lat, selectedPos.lng);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent fullScreen hideCloseButton className="flex flex-col p-0 gap-0">
        <div className="sticky top-0 z-10 bg-card border-b border-border px-4 py-3 flex items-center shrink-0">
          <button type="button" onClick={onClose} className="flex items-center gap-0.5 text-primary text-[17px] min-w-[70px]">
            <ArrowLeft className="h-5 w-5" />
            <span className="text-[15px]">Retour</span>
          </button>
          <span className="flex-1 text-center text-[17px] font-semibold text-foreground">Choisir le lieu</span>
          <div className="min-w-[70px]" />
        </div>

        <div className="flex-1 relative min-h-[50vh]">
          <div ref={mapContainerRef} className="w-full h-full absolute inset-0" />

          {!selectedPos && (
            <div className="absolute top-4 left-4 right-4 bg-card/95 backdrop-blur-sm rounded-xl p-3 shadow-lg pointer-events-none">
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
                  <p className="text-[12px] text-muted-foreground">
                    {selectedPos.lat.toFixed(5)}, {selectedPos.lng.toFixed(5)}
                  </p>
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
