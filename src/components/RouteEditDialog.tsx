import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Save, X, PenTool, Route, MapPin } from 'lucide-react';

interface RouteEditDialogProps {
  isOpen: boolean;
  onClose: () => void;
  route: any;
  onRouteUpdated: () => void;
}

export const RouteEditDialog = ({ isOpen, onClose, route, onRouteUpdated }: RouteEditDialogProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [isEditingPath, setIsEditingPath] = useState(false);
  
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<google.maps.Map | null>(null);
  const polyline = useRef<google.maps.Polyline | null>(null);
  const currentPath = useRef<google.maps.LatLng[]>([]);

  useEffect(() => {
    if (route) {
      setName(route.name || '');
      setDescription(route.description || '');
    }
  }, [route]);

  useEffect(() => {
    if (!isOpen || !mapContainer.current || !window.google || !route?.coordinates?.length) return;

    // Convert coordinates to LatLng format
    const path = route.coordinates.map((coord: any) => {
      if (coord.lat !== undefined && coord.lng !== undefined) {
        return new google.maps.LatLng(Number(coord.lat), Number(coord.lng));
      } else if (Array.isArray(coord) && coord.length >= 2) {
        return new google.maps.LatLng(Number(coord[0]), Number(coord[1]));
      }
      return null;
    }).filter(coord => coord !== null);

    if (path.length === 0) return;

    currentPath.current = path;

    // Calculate bounds
    const bounds = new google.maps.LatLngBounds();
    path.forEach(coord => bounds.extend(coord));

    // Initialize map
    map.current = new google.maps.Map(mapContainer.current, {
      center: bounds.getCenter(),
      zoom: 13,
      mapTypeId: 'roadmap',
      styles: [
        {
          featureType: 'poi',
          elementType: 'labels',
          stylers: [{ visibility: 'off' }]
        }
      ]
    });

    // Create polyline
    polyline.current = new google.maps.Polyline({
      path: path,
      geodesic: true,
      strokeColor: '#ef4444',
      strokeOpacity: 0.8,
      strokeWeight: 4,
      editable: isEditingPath,
      draggable: isEditingPath,
      map: map.current
    });

    // Fit bounds
    map.current.fitBounds(bounds, 40);

    // Add event listeners for path editing
    if (isEditingPath) {
      polyline.current.addListener('rightclick', (event: any) => {
        if (event.vertex !== undefined) {
          // Remove vertex on right click
          const path = polyline.current!.getPath();
          path.removeAt(event.vertex);
        }
      });

      polyline.current.getPath().addListener('set_at', () => {
        updateCurrentPath();
      });

      polyline.current.getPath().addListener('insert_at', () => {
        updateCurrentPath();
      });

      polyline.current.getPath().addListener('remove_at', () => {
        updateCurrentPath();
      });

      // Allow adding points by clicking on the map
      map.current.addListener('click', (event: google.maps.MapMouseEvent) => {
        if (isEditingPath && event.latLng) {
          const path = polyline.current!.getPath();
          path.push(event.latLng);
        }
      });
    }

    const updateCurrentPath = () => {
      if (polyline.current) {
        const path = polyline.current.getPath();
        currentPath.current = [];
        for (let i = 0; i < path.getLength(); i++) {
          currentPath.current.push(path.getAt(i));
        }
      }
    };

    // Cleanup
    return () => {
      if (polyline.current) {
        polyline.current.setMap(null);
      }
      if (map.current) {
        map.current = null;
      }
    };
  }, [isOpen, route, isEditingPath]);

  const togglePathEditing = () => {
    setIsEditingPath(!isEditingPath);
    if (polyline.current) {
      polyline.current.setEditable(!isEditingPath);
      polyline.current.setDraggable(!isEditingPath);
    }
  };

  const handleSave = async () => {
    if (!route || !user) return;

    setLoading(true);
    try {
      const updateData: any = {
        name: name.trim(),
        description: description.trim()
      };

      // If path was edited, update coordinates
      if (isEditingPath && currentPath.current.length > 0) {
        const coordinates = currentPath.current.map(point => ({
          lat: point.lat(),
          lng: point.lng()
        }));

        updateData.coordinates = coordinates;

        // Recalculate distance and elevation if needed
        if (coordinates.length > 1) {
          let totalDistance = 0;
          for (let i = 0; i < coordinates.length - 1; i++) {
            const point1 = coordinates[i];
            const point2 = coordinates[i + 1];
            const distance = google.maps.geometry.spherical.computeDistanceBetween(
              new google.maps.LatLng(point1.lat, point1.lng),
              new google.maps.LatLng(point2.lat, point2.lng)
            );
            totalDistance += distance;
          }
          updateData.total_distance = totalDistance;
        }
      }

      const { error } = await supabase
        .from('routes')
        .update(updateData)
        .eq('id', route.id)
        .eq('created_by', user.id);

      if (error) throw error;

      toast({
        title: "Succès",
        description: "Itinéraire modifié avec succès",
      });

      onRouteUpdated();
      onClose();
      setIsEditingPath(false);
    } catch (error) {
      console.error('Error updating route:', error);
      toast({
        title: "Erreur",
        description: "Impossible de modifier l'itinéraire",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!route) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Modifier l'itinéraire</DialogTitle>
          <DialogDescription>
            Modifiez les informations et le tracé de votre itinéraire
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Formulaire */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="route-name">Nom de l'itinéraire</Label>
              <Input
                id="route-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Mon itinéraire"
              />
            </div>

            <div>
              <Label htmlFor="route-description">Description (optionnelle)</Label>
              <Textarea
                id="route-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Décrivez votre itinéraire..."
                rows={3}
              />
            </div>

            <Separator />

            <div className="space-y-3">
              <Label>Édition du tracé</Label>
              <div className="flex flex-col gap-2">
                <Button
                  type="button"
                  variant={isEditingPath ? "default" : "outline"}
                  onClick={togglePathEditing}
                  className="w-full"
                >
                  <PenTool className="h-4 w-4 mr-2" />
                  {isEditingPath ? "Terminer l'édition" : "Modifier le tracé"}
                </Button>
                
                {isEditingPath && (
                  <div className="bg-muted p-3 rounded-lg text-sm text-muted-foreground">
                    <p><strong>Instructions :</strong></p>
                    <ul className="mt-1 space-y-1 ml-4 list-disc">
                      <li>Cliquez sur la carte pour ajouter des points</li>
                      <li>Faites glisser les points pour les déplacer</li>
                      <li>Clic droit sur un point pour le supprimer</li>
                    </ul>
                  </div>
                )}
              </div>
            </div>

            <Separator />

            <div className="flex gap-2">
              <Button
                onClick={handleSave}
                disabled={loading || !name.trim()}
                className="flex-1"
              >
                <Save className="h-4 w-4 mr-2" />
                {loading ? "Enregistrement..." : "Enregistrer"}
              </Button>
              <Button
                variant="outline"
                onClick={onClose}
                disabled={loading}
              >
                <X className="h-4 w-4 mr-2" />
                Annuler
              </Button>
            </div>
          </div>

          {/* Carte */}
          <div className="space-y-2">
            <Label>Aperçu de l'itinéraire</Label>
            <div
              ref={mapContainer}
              className="w-full h-80 lg:h-96 rounded-lg border"
              style={{ minHeight: '320px' }}
            />
            {isEditingPath && (
              <p className="text-xs text-muted-foreground text-center">
                Mode édition activé - cliquez sur la carte pour modifier le tracé
              </p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};