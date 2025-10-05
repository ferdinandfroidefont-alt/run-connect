import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { PhotorealisticAvatar3D } from "./PhotorealisticAvatar3D";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { User, Users, Sparkles } from "lucide-react";

// Available avatar models (procéduraux, pas de fichiers externes nécessaires)
const AVAILABLE_AVATARS = [
  { 
    id: 'male-athlete-01', 
    name: 'Athlète masculin',
    gender: 'male',
    description: 'Musclé et sportif',
    icon: User
  },
  { 
    id: 'female-athlete-01', 
    name: 'Athlète féminine',
    gender: 'female',
    description: 'Sportive et élancée',
    icon: Users
  },
  { 
    id: 'male-runner-01', 
    name: 'Coureur endurant',
    gender: 'male',
    description: 'Fin et rapide',
    icon: Sparkles
  },
];

interface AvatarSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentAvatarId?: string;
  onAvatarSelected?: (avatarId: string) => void;
}

export const AvatarSelector = ({ 
  open, 
  onOpenChange, 
  currentAvatarId,
  onAvatarSelected 
}: AvatarSelectorProps) => {
  const [selectedAvatarId, setSelectedAvatarId] = useState<string>(currentAvatarId || 'male-athlete-01');
  const [previewAvatarId, setPreviewAvatarId] = useState<string>(currentAvatarId || 'male-athlete-01');
  const [isSaving, setIsSaving] = useState(false);

  const handleSelectAvatar = async () => {
    if (!selectedAvatarId) {
      toast.error('Veuillez sélectionner un avatar');
      return;
    }

    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Non authentifié');

      const { error } = await supabase
        .from('profiles')
        .update({ avatar_model_id: selectedAvatarId })
        .eq('user_id', user.id);

      if (error) throw error;

      toast.success('Avatar sélectionné avec succès ! 🎉');
      onAvatarSelected?.(selectedAvatarId);
      onOpenChange(false);
    } catch (error) {
      console.error('Erreur lors de la sélection:', error);
      toast.error('Erreur lors de la sélection de l\'avatar');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Choisir votre avatar 3D</DialogTitle>
          <DialogDescription>
            Sélectionnez l'avatar qui vous représente le mieux (style stylisé)
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 3D Preview */}
          <div className="bg-gradient-to-br from-primary/5 to-accent/5 rounded-lg p-4 h-[400px]">
            <h3 className="text-sm font-medium mb-2">Aperçu 3D interactif</h3>
            <div className="h-[calc(100%-2rem)] bg-background/50 rounded-lg overflow-hidden">
              {previewAvatarId ? (
                <PhotorealisticAvatar3D 
                  avatarModelId={previewAvatarId}
                  className="w-full h-full"
                />
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  Survolez un avatar pour l'aperçu
                </div>
              )}
            </div>
          </div>

          {/* Avatar Grid */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium">Avatars disponibles</h3>
            <div className="grid grid-cols-1 gap-3">
              {AVAILABLE_AVATARS.map((avatar) => {
                const IconComponent = avatar.icon;
                return (
                  <div
                    key={avatar.id}
                    className={`relative rounded-lg border-2 cursor-pointer transition-all hover:scale-[1.02] p-4 ${
                      selectedAvatarId === avatar.id
                        ? 'border-primary bg-primary/5 shadow-lg'
                        : 'border-border hover:border-primary/50 bg-card'
                    }`}
                    onClick={() => setSelectedAvatarId(avatar.id)}
                    onMouseEnter={() => setPreviewAvatarId(avatar.id)}
                    onMouseLeave={() => setPreviewAvatarId(selectedAvatarId)}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                        selectedAvatarId === avatar.id ? 'bg-primary/20' : 'bg-muted'
                      }`}>
                        <IconComponent className={`w-6 h-6 ${
                          selectedAvatarId === avatar.id ? 'text-primary' : 'text-muted-foreground'
                        }`} />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{avatar.name}</p>
                        <p className="text-sm text-muted-foreground">{avatar.description}</p>
                      </div>
                      {selectedAvatarId === avatar.id && (
                        <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                          <svg className="w-4 h-4 text-primary-foreground" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button 
            onClick={handleSelectAvatar}
            disabled={!selectedAvatarId || isSaving}
          >
            {isSaving ? "Sauvegarde..." : "Sélectionner"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
