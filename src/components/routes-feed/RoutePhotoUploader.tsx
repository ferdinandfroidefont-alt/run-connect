import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Camera, Upload, X } from 'lucide-react';

interface RoutePhotoUploaderProps {
  routeId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPhotoUploaded?: () => void;
}

export const RoutePhotoUploader = ({ routeId, open, onOpenChange, onPhotoUploaded }: RoutePhotoUploaderProps) => {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [uploading, setUploading] = useState(false);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    setPreview(URL.createObjectURL(file));
  };

  const handleUpload = async () => {
    if (!user || !selectedFile) return;
    setUploading(true);
    try {
      const ext = selectedFile.name.split('.').pop();
      const filePath = `${user.id}/${routeId}/${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('route-photos')
        .upload(filePath, selectedFile);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('route-photos')
        .getPublicUrl(filePath);

      const { error: insertError } = await supabase
        .from('route_photos')
        .insert({
          route_id: routeId,
          user_id: user.id,
          photo_url: publicUrl,
          caption: caption || null,
        });

      if (insertError) throw insertError;

      toast.success('Photo ajoutée !');
      setSelectedFile(null);
      setPreview(null);
      setCaption('');
      onPhotoUploaded?.();
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message || 'Erreur lors de l\'upload');
    } finally {
      setUploading(false);
    }
  };

  const reset = () => {
    setSelectedFile(null);
    setPreview(null);
    setCaption('');
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" /> Ajouter une photo
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {preview ? (
            <div className="relative">
              <img src={preview} alt="Preview" className="w-full h-48 object-cover rounded-xl" />
              <Button
                variant="secondary"
                size="icon"
                className="absolute top-2 right-2 h-8 w-8 rounded-full"
                onClick={reset}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full h-48 border-2 border-dashed border-border rounded-xl flex flex-col items-center justify-center gap-2 text-muted-foreground hover:bg-secondary/50 transition-colors"
            >
              <Upload className="h-8 w-8" />
              <span className="text-[14px]">Choisir une photo</span>
            </button>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileSelect}
          />

          <Input
            placeholder="Légende (optionnel)"
            value={caption}
            onChange={e => setCaption(e.target.value)}
          />

          <Button
            onClick={handleUpload}
            disabled={!selectedFile || uploading}
            className="w-full"
          >
            {uploading ? 'Upload...' : 'Ajouter la photo'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
