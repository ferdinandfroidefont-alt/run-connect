import { useState } from 'react';
import { Camera } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useRoutePhotosGallery, GalleryPhoto } from '@/hooks/useRoutePhotosGallery';
import { RoutePhotoDetailSheet } from './RoutePhotoDetailSheet';

export const RoutePhotosGallery = () => {
  const { photos, loading } = useRoutePhotosGallery();
  const [selectedPhoto, setSelectedPhoto] = useState<GalleryPhoto | null>(null);

  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-0.5 px-0.5">
        {[1, 2, 3, 4, 5, 6].map(i => (
          <div key={i} className="aspect-square bg-secondary animate-pulse" />
        ))}
      </div>
    );
  }

  if (photos.length === 0) {
    return (
      <div className="bg-card p-8 text-center">
        <Camera className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
        <p className="text-[17px] font-medium text-foreground mb-1">Aucune photo</p>
        <p className="text-[15px] text-muted-foreground">
          Les photos ajoutées aux itinéraires publics apparaîtront ici
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-0.5">
        {photos.map((photo, i) => (
          <div
            key={photo.id}
            className="relative aspect-square bg-secondary cursor-pointer overflow-hidden active:opacity-80 transition-opacity animate-fade-in"
            style={{ animationDelay: `${i * 40}ms`, animationFillMode: 'both' }}
            onClick={() => setSelectedPhoto(photo)}
          >
            <img
              src={photo.photo_url}
              alt={photo.caption || photo.route_name}
              className="w-full h-full object-cover"
              loading="lazy"
            />
            {/* Bottom overlay */}
            <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent p-2 pt-6">
              <div className="flex items-center gap-1.5">
                <Avatar className="h-5 w-5">
                  <AvatarImage src={photo.photographer.avatar_url || undefined} />
                  <AvatarFallback className="text-[8px]">
                    {photo.photographer.username[0]?.toUpperCase() || '?'}
                  </AvatarFallback>
                </Avatar>
                <span className="text-[11px] text-white font-medium truncate">
                  {photo.route_name}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <RoutePhotoDetailSheet
        photo={selectedPhoto}
        open={!!selectedPhoto}
        onOpenChange={(open) => { if (!open) setSelectedPhoto(null); }}
      />
    </>
  );
};
