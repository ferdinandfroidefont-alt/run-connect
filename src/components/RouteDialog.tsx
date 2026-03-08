import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { ArrowLeft } from "lucide-react";

interface RouteDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string, description: string, createSession?: boolean) => void;
  title: string;
  initialName?: string;
  initialDescription?: string;
  loading?: boolean;
  showCreateSessionOption?: boolean;
}

export const RouteDialog = ({ 
  isOpen, 
  onClose, 
  onSave, 
  title, 
  initialName = "", 
  initialDescription = "",
  loading = false,
  showCreateSessionOption = false
}: RouteDialogProps) => {
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [formData, setFormData] = useState({
    name: initialName,
    description: initialDescription
  });
  const [createSession, setCreateSession] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setFormData({
        name: initialName,
        description: initialDescription
      });
    }
  }, [isOpen, initialName, initialDescription]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast({
        title: "Erreur",
        description: "Le nom de l'itinéraire est obligatoire",
        variant: "destructive"
      });
      return;
    }

    onSave(formData.name.trim(), formData.description.trim(), createSession);
  };

  const handleClose = () => {
    setFormData({ name: "", description: "" });
    setCreateSession(false);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent fullScreen={isMobile} hideCloseButton={isMobile} className={isMobile ? "[&>button]:hidden" : "sm:max-w-md"}>
        {/* iOS-style header */}
        <div className="flex items-center gap-3 p-4 sticky top-0 bg-background z-10 border-b border-border">
          <Button variant="ghost" size="sm" onClick={handleClose} className="p-0 h-auto">
            <ArrowLeft className="h-5 w-5 mr-1" />
            Retour
          </Button>
          <DialogHeader className="flex-1 text-left space-y-0">
            <DialogTitle className="text-[17px]">{title}</DialogTitle>
            <DialogDescription className="text-[13px]">
              Donnez un nom et une description à votre itinéraire
            </DialogDescription>
          </DialogHeader>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 space-y-4">
          <div>
            <Label htmlFor="route-name">Nom de l'itinéraire *</Label>
            <Input
              id="route-name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Mon super itinéraire"
              className="mt-1"
              maxLength={100}
            />
          </div>

          <div>
            <Label htmlFor="route-description">Description (optionnel)</Label>
            <Textarea
              id="route-description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Description de l'itinéraire, difficulté, points d'intérêt..."
              className="mt-1"
              rows={3}
              maxLength={500}
            />
          </div>

          {showCreateSessionOption && (
            <div className="flex items-center space-x-2 p-3 bg-primary/10 rounded-lg border border-primary/20">
              <input
                type="checkbox"
                id="create-session"
                checked={createSession}
                onChange={(e) => setCreateSession(e.target.checked)}
                className="h-4 w-4 rounded border-border"
              />
              <Label htmlFor="create-session" className="text-sm text-primary">
                Créer une séance avec cet itinéraire
              </Label>
            </div>
          )}

          <div className="flex gap-2 pt-4">
            <Button
              type="submit"
              disabled={loading || !formData.name.trim()}
              className="flex-1"
            >
              {loading ? "Enregistrement..." : createSession ? "Enregistrer et créer une séance" : "Enregistrer"}
            </Button>
            <Button type="button" variant="outline" onClick={handleClose}>
              Annuler
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
