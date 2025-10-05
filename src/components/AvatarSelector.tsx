import { useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Environment, ContactShadows } from '@react-three/drei';
import { useGLTF } from '@react-three/drei';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

// Liste des avatars disponibles
const AVAILABLE_AVATARS = [
  {
    id: 'male-athlete-01',
    name: 'Athlète masculin 1',
    gender: 'male',
    thumbnail: '/models/avatars/thumbnails/male-athlete-01.jpg', // L'utilisateur devra ajouter ces miniatures
  },
  {
    id: 'female-athlete-01',
    name: 'Athlète féminine 1',
    gender: 'female',
    thumbnail: '/models/avatars/thumbnails/female-athlete-01.jpg',
  },
  {
    id: 'male-runner-01',
    name: 'Coureur masculin 1',
    gender: 'male',
    thumbnail: '/models/avatars/thumbnails/male-runner-01.jpg',
  },
];

interface AvatarModelProps {
  url: string;
}

function AvatarModel({ url }: AvatarModelProps) {
  const { scene } = useGLTF(url);
  return <primitive object={scene} scale={1.5} position={[0, -1, 0]} />;
}

interface AvatarSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentAvatarId?: string;
  onAvatarSelected?: (avatarId: string) => void;
}

export function AvatarSelector({ 
  open, 
  onOpenChange, 
  currentAvatarId,
  onAvatarSelected 
}: AvatarSelectorProps) {
  const [selectedAvatarId, setSelectedAvatarId] = useState<string | null>(null);
  const [previewAvatarId, setPreviewAvatarId] = useState<string | null>(null);
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

      toast.success('Avatar sélectionné avec succès');
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
          <DialogTitle>Choisir votre avatar</DialogTitle>
          <DialogDescription>
            Sélectionnez un avatar photoréaliste pour votre profil
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Aperçu 3D */}
          {previewAvatarId && (
            <div className="w-full h-[400px] bg-muted rounded-lg overflow-hidden">
              <Canvas>
                <PerspectiveCamera makeDefault position={[0, 0, 3]} />
                <ambientLight intensity={0.5} />
                <directionalLight position={[5, 5, 5]} intensity={1} />
                <directionalLight position={[-5, 5, -5]} intensity={0.5} />
                <Environment preset="studio" />
                <AvatarModel url={`/models/avatars/${previewAvatarId}.glb`} />
                <ContactShadows 
                  position={[0, -1, 0]} 
                  opacity={0.4} 
                  scale={10} 
                  blur={2} 
                />
                <OrbitControls 
                  enableZoom={true}
                  enablePan={false}
                  minDistance={2}
                  maxDistance={5}
                  target={[0, 0, 0]}
                />
              </Canvas>
            </div>
          )}

          {/* Galerie d'avatars */}
          <div className="grid grid-cols-3 gap-4">
            {AVAILABLE_AVATARS.map((avatar) => (
              <button
                key={avatar.id}
                onClick={() => {
                  setSelectedAvatarId(avatar.id);
                  setPreviewAvatarId(avatar.id);
                }}
                onMouseEnter={() => setPreviewAvatarId(avatar.id)}
                className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all hover:scale-105 ${
                  selectedAvatarId === avatar.id
                    ? 'border-primary shadow-lg'
                    : 'border-border'
                } ${
                  currentAvatarId === avatar.id
                    ? 'ring-2 ring-primary ring-offset-2'
                    : ''
                }`}
              >
                <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                  <span className="text-sm font-medium text-center px-2">
                    {avatar.name}
                  </span>
                </div>
                {currentAvatarId === avatar.id && (
                  <div className="absolute top-2 right-2 bg-primary text-primary-foreground text-xs px-2 py-1 rounded">
                    Actuel
                  </div>
                )}
              </button>
            ))}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSaving}
            >
              Annuler
            </Button>
            <Button
              onClick={handleSelectAvatar}
              disabled={!selectedAvatarId || isSaving}
            >
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Sélectionner
            </Button>
          </div>

          {/* Instructions */}
          <div className="text-sm text-muted-foreground space-y-2 border-t pt-4">
            <p className="font-medium">📦 Installation des modèles 3D :</p>
            <ol className="list-decimal list-inside space-y-1 ml-2">
              <li>Téléchargez des modèles 3D photoréalistes depuis <a href="https://renderpeople.com" target="_blank" rel="noopener" className="text-primary hover:underline">Renderpeople.com</a></li>
              <li>Nommez-les selon les IDs : male-athlete-01.glb, female-athlete-01.glb, etc.</li>
              <li>Placez-les dans le dossier <code className="bg-muted px-1 py-0.5 rounded">/public/models/avatars/</code></li>
              <li>Ajoutez des miniatures (JPG) dans <code className="bg-muted px-1 py-0.5 rounded">/public/models/avatars/thumbnails/</code></li>
            </ol>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
