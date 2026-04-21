import { useCallback, useEffect, useState } from 'react';
import type { EmblaCarouselType } from 'embla-carousel-react';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from '@/components/ui/carousel';
import type { SessionSharePayload, SessionShareTemplateId } from '@/lib/sessionSharePayload';
import { templateDimensions } from '@/lib/sessionSharePayload';
import { SessionShareArtboard } from './SessionShareArtboard';
import { SessionSharePaginationDots } from './SessionSharePaginationDots';

const TEMPLATE_META: { id: SessionShareTemplateId; label: string }[] = [
  { id: 'light_pin', label: 'Partage de séance' },
];

type Props = {
  payload: SessionSharePayload;
  mapImageUrl: string | null;
  qrDataUrl?: string | null;
  activeTemplateId: SessionShareTemplateId;
  onTemplateChange: (id: SessionShareTemplateId, index: number) => void;
};

export function SessionSharePreviewCarousel({
  payload,
  mapImageUrl,
  qrDataUrl,
  activeTemplateId,
  onTemplateChange,
}: Props) {
  const [api, setApi] = useState<EmblaCarouselType | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const syncFromId = useCallback(
    (embla: EmblaCarouselType | null) => {
      const idx = TEMPLATE_META.findIndex((t) => t.id === activeTemplateId);
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
      const meta = TEMPLATE_META[i];
      if (meta) onTemplateChange(meta.id, i);
    };
    api.on('select', onSelect);
    return () => {
      api.off('select', onSelect);
    };
  }, [api, onTemplateChange]);

  const previewScale = (templateId: SessionShareTemplateId) => {
    const { w, h } = templateDimensions(templateId);
    // Limite la largeur d'aperçu pour rester dans l'écran mobile (évite le débordement)
    const viewport = typeof window !== 'undefined' ? window.innerWidth : 375;
    const maxW = Math.min(288, viewport - 72);
    const s = maxW / w;
    return { scale: s, boxW: w * s, boxH: h * s };
  };

  return (
    <div className="w-full">
      <Carousel
        className="w-full"
        opts={{ align: 'center', loop: false, skipSnaps: false, dragFree: false }}
        setApi={setApi}
      >
        <CarouselContent className="-ml-2">
          {TEMPLATE_META.map((meta) => {
            const { scale, boxW, boxH } = previewScale(meta.id);
            return (
              <CarouselItem key={meta.id} className="pl-2 basis-[80%] sm:basis-[70%] md:basis-[55%]">
                <div className="flex flex-col items-center">
                  <p className="mb-2.5 text-center text-[12px] font-semibold tracking-tight text-muted-foreground">{meta.label}</p>
                  <div
                    className="ios-card overflow-hidden shadow-[0_20px_50px_rgba(15,23,42,0.1)]"
                    style={{ width: boxW, height: boxH }}
                  >
                    <div
                      style={{
                        width: templateDimensions(meta.id).w,
                        height: templateDimensions(meta.id).h,
                        transform: `scale(${scale})`,
                        transformOrigin: 'top left',
                      }}
                    >
                      <SessionShareArtboard
                        payload={payload}
                        templateId={meta.id}
                        mapImageUrl={mapImageUrl}
                        qrDataUrl={qrDataUrl ?? null}
                      />
                    </div>
                  </div>
                </div>
              </CarouselItem>
            );
          })}
        </CarouselContent>
      </Carousel>
      <SessionSharePaginationDots className="mt-4" count={TEMPLATE_META.length} activeIndex={activeIndex} />
    </div>
  );
}

export const SESSION_SHARE_TEMPLATES = TEMPLATE_META.map((m) => m.id);
