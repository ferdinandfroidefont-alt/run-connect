import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Camera, Images, X } from 'lucide-react';
import { extractGpsFromImageFile } from '@/lib/exifGps';

interface RoutePhotoUploaderProps {
  routeId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPhotoUploaded?: () => void;
}

export const RoutePhotoUploader = ({ routeId, open, onOpenChange, onPhotoUploaded }: RoutePhotoUploaderProps) => {
  const { user } = useAuth();
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [uploading, setUploading] = useState(false);
  const [detectedGps, setDetectedGps] = useState<{ lat: number; lng: number } | null>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setSelectedFile(file);
    setPreview(URL.createObjectURL(file));
    setDetectedGps(null);
    try {
      const coords = await extractGpsFromImageFile(file);
      if (coords) {
        setDetectedGps(coords);
        toast.success('Localisation détectée automatiquement');
      }
    } catch {
      /* pas de GPS : OK */
    }
  };

  const handleUpload = async () => {
    if (!user || !selectedFile) return;
    setUploading(true);
    try {
      let lat: number | null = detectedGps?.lat ?? null;
      let lng: number | null = detectedGps?.lng ?? null;
      if (lat == null || lng == null) {
        const coords = await extractGpsFromImageFile(selectedFile);
        if (coords) {
          lat = coords.lat;
          lng = coords.lng;
        }
      }

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
          lat,
          lng,
        });

      if (insertError) throw insertError;

      toast.success('Photo ajoutée !');
      setSelectedFile(null);
      setPreview(null);
      setCaption('');
      setDetectedGps(null);
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
    setDetectedGps(null);
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
            <>
              <p className="text-[12px] text-muted-foreground text-center">
                <strong>Appareil photo</strong> ou <strong>galerie</strong> — le GPS EXIF sera utilisé s&apos;il est présent.
              </p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                  className="h-28 border-2 border-dashed border-border rounded-xl flex flex-col items-center justify-center gap-1.5 text-muted-foreground hover:bg-secondary/50 transition-colors focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <Camera className="h-6 w-6" />
                  <span className="text-[12px] font-medium text-foreground">Prendre une photo</span>
                </button>
                <button
                  type="button"
                  onClick={() => galleryInputRef.current?.click()}
                  className="h-28 border-2 border-dashed border-border rounded-xl flex flex-col items-center justify-center gap-1.5 text-muted-foreground hover:bg-secondary/50 transition-colors focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <Images className="h-6 w-6" />
                  <span className="text-[12px] font-medium text-foreground">Galerie</span>
                </button>
              </div>
            </>
          )}

          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleFileSelect}
          />
          <input
            ref={galleryInputRef}
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

          {detectedGps && (
            <p className="text-[12px] text-muted-foreground">
              Position GPS enregistrée avec la photo (modifiable plus tard sur la fiche itinéraire via la carte).
            </p>
          )}

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
