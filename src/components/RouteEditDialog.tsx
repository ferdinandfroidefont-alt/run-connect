import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Save, X, PenTool } from 'lucide-react';

interface RouteEditDialogProps {
  isOpen: boolean;
  onClose: () => void;
  route: any;
  onRouteUpdated: () => void;
}

export const RouteEditDialog = ({ isOpen, onClose, route, onRouteUpdated }: RouteEditDialogProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (route) {
      setName(route.name || '');
      setDescription(route.description || '');
    }
  }, [route]);

  const handleEditPath = () => {
    // Stocker les données de l'itinéraire pour l'édition (inclure les waypoints)
    localStorage.setItem('editRouteData', JSON.stringify({
      id: route.id,
      name: route.name,
      description: route.description,
      coordinates: route.coordinates,
      waypoints: route.waypoints || []
    }));
    onClose();
    navigate('/route-creation?edit=true');
  };

  const handleSave = async () => {
    if (!route || !user) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('routes')
        .update({
          name: name.trim(),
          description: description.trim()
        })
        .eq('id', route.id)
        .eq('created_by', user.id);

      if (error) throw error;

      toast({
        title: "Succès",
        description: "Itinéraire modifié avec succès",
      });

      onRouteUpdated();
      onClose();
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
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Modifier l'itinéraire</DialogTitle>
          <DialogDescription>
            Modifiez les informations de votre itinéraire
          </DialogDescription>
        </DialogHeader>

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

          <Button
            type="button"
            variant="outline"
            onClick={handleEditPath}
            className="w-full"
          >
            <PenTool className="h-4 w-4 mr-2" />
            Modifier le tracé
          </Button>

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
      </DialogContent>
    </Dialog>
  );
};
