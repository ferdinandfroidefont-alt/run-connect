import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Loader2 } from 'lucide-react';

interface ImageCropEditorProps {
  open: boolean;
  onClose: () => void;
  imageSrc: string;
  onCropComplete: (croppedImageBlob: Blob) => void;
}

const MIN_ZOOM = 1;
const MAX_ZOOM = 4;

export const ImageCropEditor: React.FC<ImageCropEditorProps> = ({
  open,
  onClose,
  imageSrc,
  onCropComplete,
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageLoadError, setImageLoadError] = useState(false);
  const [naturalSize, setNaturalSize] = useState({ width: 0, height: 0 });
  const [stageSize, setStageSize] = useState({ width: 0, height: 0 });
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const imgRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const pointersRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  const gestureRef = useRef<{
    panPoint: { x: number; y: number } | null;
    pinchDistance: number | null;
    pinchMidpoint: { x: number; y: number } | null;
  }>({
    panPoint: null,
    pinchDistance: null,
    pinchMidpoint: null,
  });

  const cropDiameter = useMemo(() => {
    if (!stageSize.width) return 0;
    const preferred = stageSize.width * 0.85;
    const maxByHeight = Math.max(stageSize.height - 20, 120);
    return Math.min(preferred, maxByHeight);
  }, [stageSize.height, stageSize.width]);

  const baseScale = useMemo(() => {
    if (!naturalSize.width || !naturalSize.height || !cropDiameter) return 1;
    return Math.max(cropDiameter / naturalSize.width, cropDiameter / naturalSize.height);
  }, [cropDiameter, naturalSize.height, naturalSize.width]);

  const clampPosition = useCallback((nextX: number, nextY: number, nextScale: number) => {
    if (!naturalSize.width || !naturalSize.height || !cropDiameter) {
      return { x: 0, y: 0 };
    }

    const renderWidth = naturalSize.width * nextScale;
    const renderHeight = naturalSize.height * nextScale;
    const maxOffsetX = Math.max(0, (renderWidth - cropDiameter) / 2);
    const maxOffsetY = Math.max(0, (renderHeight - cropDiameter) / 2);

    return {
      x: Math.min(maxOffsetX, Math.max(-maxOffsetX, nextX)),
      y: Math.min(maxOffsetY, Math.max(-maxOffsetY, nextY)),
    };
  }, [cropDiameter, naturalSize.height, naturalSize.width]);

  // Reset états quand l'image source change
  useEffect(() => {
    setImageLoaded(false);
    setImageLoadError(false);
    setNaturalSize({ width: 0, height: 0 });
    setScale(1);
    setPosition({ x: 0, y: 0 });
  }, [imageSrc]);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    const observer = new ResizeObserver((entries) => {
      const rect = entries[0]?.contentRect;
      if (!rect) return;
      setStageSize({ width: rect.width, height: rect.height });
    });

    observer.observe(stage);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!imageLoaded || !baseScale) return;
    setScale(baseScale);
    setPosition({ x: 0, y: 0 });
  }, [baseScale, imageLoaded]);

  function onImageLoad(e: React.SyntheticEvent<HTMLImageElement>) {
    setImageLoaded(true);
    setImageLoadError(false);
    setNaturalSize({
      width: e.currentTarget.naturalWidth,
      height: e.currentTarget.naturalHeight,
    });
  }

  function onImageError(e: React.SyntheticEvent<HTMLImageElement>) {
    console.error('📸 [CropEditor] Erreur chargement image:', imageSrc?.substring(0, 50));
    setImageLoadError(true);
    setImageLoaded(false);
  }

  const getStageCenter = useCallback(() => {
    const rect = stageRef.current?.getBoundingClientRect();
    if (!rect) return null;
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  }, []);

  const zoomAroundClientPoint = useCallback((nextScaleCandidate: number, point: { x: number; y: number }) => {
    const center = getStageCenter();
    if (!center) return;

    setScale((previousScale) => {
      const minScale = Math.max(baseScale * MIN_ZOOM, 0.01);
      const maxScale = Math.max(baseScale * MAX_ZOOM, minScale);
      const nextScale = Math.min(maxScale, Math.max(minScale, nextScaleCandidate));

      setPosition((previousPosition) => {
        const localX = point.x - center.x;
        const localY = point.y - center.y;
        const nextX = localX - ((localX - previousPosition.x) / previousScale) * nextScale;
        const nextY = localY - ((localY - previousPosition.y) / previousScale) * nextScale;
        return clampPosition(nextX, nextY, nextScale);
      });

      return nextScale;
    });
  }, [baseScale, clampPosition, getStageCenter]);

  const resetGestureState = useCallback(() => {
    gestureRef.current.panPoint = null;
    gestureRef.current.pinchDistance = null;
    gestureRef.current.pinchMidpoint = null;
  }, []);

  const updatePointersFromEvent = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
  }, []);

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!imageLoaded || isProcessing) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    updatePointersFromEvent(e);
  }, [imageLoaded, isProcessing, updatePointersFromEvent]);

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!imageLoaded || isProcessing || !pointersRef.current.has(e.pointerId)) return;

    updatePointersFromEvent(e);
    const points = Array.from(pointersRef.current.values());

    if (points.length === 1) {
      const point = points[0];
      if (!gestureRef.current.panPoint) {
        gestureRef.current.panPoint = point;
        return;
      }

      const dx = point.x - gestureRef.current.panPoint.x;
      const dy = point.y - gestureRef.current.panPoint.y;
      gestureRef.current.panPoint = point;

      setPosition((previous) => clampPosition(previous.x + dx, previous.y + dy, scale));
      return;
    }

    if (points.length === 2) {
      const [a, b] = points;
      const distance = Math.hypot(b.x - a.x, b.y - a.y);
      const midpoint = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };

      if (!gestureRef.current.pinchDistance || !gestureRef.current.pinchMidpoint) {
        gestureRef.current.pinchDistance = distance;
        gestureRef.current.pinchMidpoint = midpoint;
        gestureRef.current.panPoint = null;
        return;
      }

      const ratio = distance / gestureRef.current.pinchDistance;
      zoomAroundClientPoint(scale * ratio, midpoint);

      const dx = midpoint.x - gestureRef.current.pinchMidpoint.x;
      const dy = midpoint.y - gestureRef.current.pinchMidpoint.y;
      if (dx || dy) {
        setPosition((previous) => clampPosition(previous.x + dx, previous.y + dy, scale));
      }

      gestureRef.current.pinchDistance = distance;
      gestureRef.current.pinchMidpoint = midpoint;
      return;
    }

    resetGestureState();
  }, [clampPosition, imageLoaded, isProcessing, resetGestureState, scale, updatePointersFromEvent, zoomAroundClientPoint]);

  const handlePointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    pointersRef.current.delete(e.pointerId);
    if (pointersRef.current.size <= 1) {
      resetGestureState();
    }
  }, [resetGestureState]);

  const handleWheel = useCallback((e: React.WheelEvent<HTMLDivElement>) => {
    if (!imageLoaded || isProcessing) return;
    e.preventDefault();
    const factor = e.deltaY > 0 ? 0.95 : 1.05;
    zoomAroundClientPoint(scale * factor, { x: e.clientX, y: e.clientY });
  }, [imageLoaded, isProcessing, scale, zoomAroundClientPoint]);

  const getCroppedImg = useCallback(async () => {
    if (!imgRef.current || !canvasRef.current || !naturalSize.width || !naturalSize.height || !cropDiameter || !stageSize.width || !stageSize.height) {
      return;
    }

    setIsProcessing(true);

    const image = imgRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      setIsProcessing(false);
      return;
    }

    // Fichier servi en plein écran : ≥1024px pour rester net sur rétina (l’ancien 200px floutait à l’agrandissement)
    const targetSize = 1024;
    canvas.width = targetSize;
    canvas.height = targetSize;

    ctx.imageSmoothingQuality = 'high';

    const renderWidth = naturalSize.width * scale;
    const renderHeight = naturalSize.height * scale;
    const stageCenterX = stageSize.width / 2;
    const stageCenterY = stageSize.height / 2;
    const imageLeft = stageCenterX + position.x - renderWidth / 2;
    const imageTop = stageCenterY + position.y - renderHeight / 2;
    const circleLeft = stageCenterX - cropDiameter / 2;
    const circleTop = stageCenterY - cropDiameter / 2;

    const cropX = (circleLeft - imageLeft) / scale;
    const cropY = (circleTop - imageTop) / scale;
    const cropWidth = cropDiameter / scale;
    const cropHeight = cropDiameter / scale;

    // Dessiner l'image croppée sur le canvas
    ctx.drawImage(
      image,
      cropX,
      cropY,
      cropWidth,
      cropHeight,
      0,
      0,
      targetSize,
      targetSize
    );

    // Convertir le canvas en blob
    canvas.toBlob(
      (blob) => {
        if (blob) {
          onCropComplete(blob);
          // Ne PAS appeler onClose() ici - c'est handleCropComplete du parent qui gère la fermeture
        }
        setIsProcessing(false);
      },
      'image/jpeg',
      0.9
    );
  }, [cropDiameter, naturalSize.height, naturalSize.width, onCropComplete, position.x, position.y, scale, stageSize.height, stageSize.width]);

  return (
    <Dialog 
      open={open} 
      onOpenChange={(isOpen) => {
        // Ne pas permettre la fermeture pendant le traitement
        if (!isProcessing && !isOpen) {
          onClose();
        }
      }}
    >
      <DialogContent
        fullScreen
        hideCloseButton
        overlayClassName="bg-black/90"
        className="!z-[280] bg-black p-0 text-white data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:slide-in-from-bottom-2 data-[state=closed]:slide-out-to-bottom-2"
      >
        <div className="flex h-full w-full flex-col bg-black">
          <header className="flex items-center justify-between px-4 pb-3 pt-[max(env(safe-area-inset-top),12px)]">
            <button
              type="button"
              onClick={onClose}
              disabled={isProcessing}
              className="text-[17px] font-normal text-white disabled:opacity-40"
            >
              Annuler
            </button>
            <p className="text-[17px] font-medium text-white">Deplacer et redimensionner</p>
            <button
              type="button"
              onClick={getCroppedImg}
              disabled={isProcessing || !imageLoaded || imageLoadError}
              className="text-[17px] font-semibold text-[#0A84FF] disabled:opacity-40"
            >
              {isProcessing ? <Loader2 className="h-5 w-5 animate-spin" /> : 'OK'}
            </button>
          </header>

          <div
            ref={stageRef}
            className="relative flex-1 touch-none overflow-hidden"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            onPointerLeave={handlePointerUp}
            onWheel={handleWheel}
          >
            {!imageLoaded && !imageLoadError && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                <Loader2 className="h-9 w-9 animate-spin text-white" />
                <span className="text-[15px] text-white/80">Chargement de l'image...</span>
              </div>
            )}

            {imageLoadError && (
              <div className="absolute inset-0 flex items-center justify-center px-8 text-center text-[15px] text-red-300">
                Impossible de charger l'image
              </div>
            )}

            <img
              ref={imgRef}
              alt="Recadrage photo de profil"
              src={imageSrc}
              decoding="async"
              fetchPriority="high"
              className={imageLoaded && !imageLoadError ? 'absolute left-1/2 top-1/2 select-none' : 'hidden'}
              style={{
                width: `${naturalSize.width * scale}px`,
                height: `${naturalSize.height * scale}px`,
                transform: `translate(calc(-50% + ${position.x}px), calc(-50% + ${position.y}px))`,
                touchAction: 'none',
                userSelect: 'none',
                ...({ WebkitUserDrag: 'none' } as React.CSSProperties),
              }}
              draggable={false}
              onLoad={onImageLoad}
              onError={onImageError}
            />

            {imageLoaded && !imageLoadError && cropDiameter > 0 && (
              <div
                className="pointer-events-none absolute left-1/2 top-1/2 rounded-full border border-white/90"
                style={{
                  width: `${cropDiameter}px`,
                  height: `${cropDiameter}px`,
                  transform: 'translate(-50%, -50%)',
                  boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.7)',
                }}
              />
            )}
          </div>

          <div className="px-4 pb-[max(env(safe-area-inset-bottom),14px)] pt-3">
            <p className="text-center text-[13px] text-white/60">Pincez pour zoomer · Glissez pour repositionner</p>
          </div>
        </div>

        {/* Canvas caché pour le traitement */}
        <canvas
          ref={canvasRef}
          style={{ display: 'none' }}
        />
      </DialogContent>
    </Dialog>
  );
};