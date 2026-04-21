import { useCallback, useEffect, useState } from 'react';
import type { EmblaCarouselType } from 'embla-carousel';
import { Carousel, CarouselContent, CarouselItem } from '@/components/ui/carousel';
import type { ProfileSharePayload, ProfileShareTemplateId } from '@/lib/profileSharePayload';
import { templateDimensions } from '@/lib/profileSharePayload';
import { ProfileShareArtboard } from './ProfileShareArtboard';
import { ProfileShareTemplateCard } from './ProfileShareTemplateCard';
import { ProfileSharePaginationDots } from './ProfileSharePaginationDots';

const META: { id: ProfileShareTemplateId; label: string }[] = [
  { id: 'light_card', label: 'Carte claire' },
  { id: 'organizer_focus', label: 'Organisateur' },
  { id: 'minimal_story', label: 'Story minimal' },
  { id: 'generated_card', label: 'Carte 4' },
];

type Props = {
  payload: ProfileSharePayload;
  activeTemplateId: ProfileShareTemplateId;
  onTemplateChange: (id: ProfileShareTemplateId) => void;
};

export function ProfileSharePreviewCarousel({ payload, activeTemplateId, onTemplateChange }: Props) {
  const [api, setApi] = useState<EmblaCarouselType | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const syncFromId = useCallback(
    (embla: EmblaCarouselType | null) => {
      const idx = META.findIndex((t) => t.id === activeTemplateId);
      if (idx >= 0 && embla) {
        embla.scrollTo(idx, true);
        setActiveIndex(idx);
      }
    },
    [activeTemplateId]
  );

  useEffect(() => {
    if (!api) return;
    syncFromId(api);
  }, [api, syncFromId]);

  useEffect(() => {
    if (!api) return;
    const onSelect = () => {
      const i = api.selectedScrollSnap();
      setActiveIndex(i);
      const m = META[i];
      if (m) onTemplateChange(m.id);
    };
    api.on('select', onSelect);
    return () => {
      api.off('select', onSelect);
    };
  }, [api, onTemplateChange]);

  const previewScale = (id: ProfileShareTemplateId) => {
    const { w, h } = templateDimensions(id);
    const maxW = 280;
    const s = maxW / w;
    return { scale: s, boxW: w * s, boxH: h * s };
  };

  return (
    <div className="w-full">
      <Carousel
        className="w-full"
        opts={{ align: 'center', loop: false }}
        setApi={setApi}
      >
        <CarouselContent className="-ml-2">
          {META.map((meta) => {
            const { scale, boxW, boxH } = previewScale(meta.id);
            const dim = templateDimensions(meta.id);
            return (
              <CarouselItem key={meta.id} className="pl-2 basis-[88%] sm:basis-[70%]">
                <div className="flex flex-col items-center">
                  <p className="mb-2 text-center text-[11px] font-medium text-muted-foreground">{meta.label}</p>
                  <ProfileShareTemplateCard style={{ width: boxW, height: boxH }}>
                    <div
                      style={{
                        width: dim.w,
                        height: dim.h,
                        transform: `scale(${scale})`,
                        transformOrigin: 'top left',
                      }}
                    >
                      <ProfileShareArtboard payload={payload} templateId={meta.id} />
                    </div>
                  </ProfileShareTemplateCard>
                </div>
              </CarouselItem>
            );
          })}
        </CarouselContent>
      </Carousel>
      <ProfileSharePaginationDots className="mt-4" count={META.length} activeIndex={activeIndex} />
    </div>
  );
}
