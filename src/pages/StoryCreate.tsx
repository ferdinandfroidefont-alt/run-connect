import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCamera } from "@/hooks/useCamera";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Capacitor } from "@capacitor/core";
import { storyMusicProvider, type StoryMusicTrack } from "@/lib/storyMusicProvider";
import { SessionShareArtboard } from "@/components/session-share/SessionShareArtboard";
import { buildSessionSharePayload } from "@/lib/sessionSharePayload";
import { getSessionPublicUrl } from "@/lib/appLinks";
import { buildSessionStaticMapUrl } from "@/lib/mapboxStaticImage";
import { generateSessionShareImage } from "@/services/sessionShareService";
import {
  ArrowLeft, Camera, Image, Type, Music, Smile,
  Pencil, Plus, Minus, RefreshCw, Zap, Video, CalendarPlus, Check,
  AlignLeft, AlignCenter, AlignRight, Trash2, Search
} from "lucide-react";

type CaptureMode = "photo" | "video" | "boomerang";
type StoryStep = "entry" | "capture" | "edit";
type LayerKind = "text" | "music" | "session" | "emoji";
type DynamicLayerKind = "mention" | "place" | "time" | "music" | "session" | "emoji";
type DynamicLayer = {
  id: string;
  kind: DynamicLayerKind;
  label: string;
  x: number;
  y: number;
  scale: number;
  rotation: number;
};
type TextAlign = "left" | "center" | "right";
type TextStyleMode = "plain" | "bubble" | "outline" | "band";
type TextFontMode = "modern" | "clean" | "signature";
type StoryEditorMode = "idle" | "text" | "music" | "sticker" | "draw";
type MusicSheetTab = "forYou" | "popular" | "original";

type ScheduledSession = {
  id: string;
  title: string;
  location_name: string;
  scheduled_at: string;
  location_lat?: number | null;
  location_lng?: number | null;
  route_id?: string | null;
  route_coordinates?: Array<{ lat: number; lng: number }>;
};

type SessionRowBase = {
  id: string;
  title: string;
  location_name: string;
  location_lat?: number | null;
  location_lng?: number | null;
  route_id?: string | null;
  scheduled_at: string;
};

type StoryDraftPayload = {
  savedAt: number;
  sourceMode: "camera" | "gallery";
  captureMode: CaptureMode;
  mediaDataUrl: string | null;
  mediaType: string | null;
  mediaName: string | null;
  textOverlay: string;
  showTextInput: boolean;
  textPos: { x: number; y: number };
  textScale: number;
  textRotation: number;
  textColor: string;
  textFont: TextFontMode;
  textAlign: TextAlign;
  textStyle: TextStyleMode;
  textSize: number;
  textBold: boolean;
  caption: string;
  selectedMusic: StoryMusicTrack | null;
  selectedSession: ScheduledSession | null;
  dynamicLayers: DynamicLayer[];
  emojiSticker: string | null;
  layerOrder: LayerKind[];
};

const STORY_DRAFT_STORAGE_KEY = "runconnect_story_create_draft_v1";

function parseSessionTimestamp(value: string | null | undefined): number {
  if (!value) return Number.NaN;
  const direct = Date.parse(value);
  if (Number.isFinite(direct)) return direct;
  // Fallback: certaines valeurs SQL sans timezone peuvent être interprétées différemment selon device.
  const normalized = value.includes("T") ? value : value.replace(" ", "T");
  const asLocal = Date.parse(normalized);
  return Number.isFinite(asLocal) ? asLocal : Number.NaN;
}

const FONT_MAP: Record<TextFontMode, string> = {
  modern: '-apple-system, BlinkMacSystemFont, "SF Pro Display", Inter, sans-serif',
  clean: '-apple-system, BlinkMacSystemFont, "SF Pro Text", Inter, sans-serif',
  signature: '"Snell Roundhand", "Segoe Script", cursive',
};

export default function StoryCreate() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const { takePicture, checkPermissions, requestPermissions } = useCamera();

  // Flow
  const [step, setStep] = useState<StoryStep>("entry");
  const [sourceMode, setSourceMode] = useState<"camera" | "gallery">("camera");
  const [captureMode, setCaptureMode] = useState<CaptureMode>("photo");

  // Media
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("environment");

  // Camera
  const cameraRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [recordSec, setRecordSec] = useState(0);

  // Edit overlays
  const [textOverlay, setTextOverlay] = useState("");
  const [showTextInput, setShowTextInput] = useState(false);
  const [textPos, setTextPos] = useState({ x: 120, y: 200 });
  const textDragRef = useRef<{ startX: number; startY: number; baseX: number; baseY: number } | null>(null);
  const textInputRef = useRef<HTMLInputElement | null>(null);
  const [textScale, setTextScale] = useState(1);
  const [textRotation, setTextRotation] = useState(0);
  const [textColor, setTextColor] = useState("#FFFFFF");
  const [textFont, setTextFont] = useState<TextFontMode>("modern");
  const [textAlign, setTextAlign] = useState<TextAlign>("center");
  const [textStyle, setTextStyle] = useState<TextStyleMode>("plain");
  const [textSize, setTextSize] = useState(30);
  const [textBold, setTextBold] = useState(true);
  const [textPinching, setTextPinching] = useState(false);
  const [textDragging, setTextDragging] = useState(false);
  const [textSnapGuides, setTextSnapGuides] = useState<{ centerX: boolean; topThird: boolean; midY: boolean; bottomThird: boolean }>({
    centerX: false,
    topThird: false,
    midY: false,
    bottomThird: false,
  });
  const textGestureRef = useRef<{ startDist: number; startAngle: number; baseScale: number; baseRotation: number } | null>(null);
  const [selectedMusic, setSelectedMusic] = useState<StoryMusicTrack | null>(null);
  const [pendingMusic, setPendingMusic] = useState<StoryMusicTrack | null>(null);
  const [showMusicPicker, setShowMusicPicker] = useState(false);
  const [musicQuery, setMusicQuery] = useState("");
  const [filteredMusic, setFilteredMusic] = useState<StoryMusicTrack[]>([]);
  const [musicSheetTab, setMusicSheetTab] = useState<MusicSheetTab>("forYou");
  const musicDragRef = useRef<{ startX: number; startY: number; baseX: number; baseY: number } | null>(null);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  const [previewingTrackId, setPreviewingTrackId] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [activeTool, setActiveTool] = useState<"text" | "music" | "session" | "sticker" | "draw" | null>(null);
  const [editorMode, setEditorMode] = useState<StoryEditorMode>("idle");
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [selectedLayer, setSelectedLayer] = useState<LayerKind | null>(null);
  const [layerOrder, setLayerOrder] = useState<LayerKind[]>(["session", "music", "emoji", "text"]);
  const [dynamicLayers, setDynamicLayers] = useState<DynamicLayer[]>([]);
  const [selectedDynamicLayerId, setSelectedDynamicLayerId] = useState<string | null>(null);
  const dynamicDragRef = useRef<{ id: string; startX: number; startY: number; baseX: number; baseY: number } | null>(null);

  // Session
  const [sessions, setSessions] = useState<ScheduledSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<ScheduledSession | null>(null);
  const [showSessionPicker, setShowSessionPicker] = useState(false);
  const stickerDragRef = useRef<{ startX: number; startY: number; baseX: number; baseY: number } | null>(null);
  const [showStickerPicker, setShowStickerPicker] = useState(false);
  const [emojiSticker, setEmojiSticker] = useState<string | null>(null);
  const emojiDragRef = useRef<{ startX: number; startY: number; baseX: number; baseY: number } | null>(null);
  const [drawMode, setDrawMode] = useState(false);
  const [drawColor, setDrawColor] = useState("#FFFFFF");
  const drawCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawHostRef = useRef<HTMLDivElement | null>(null);
  const drawingRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const drawHistoryRef = useRef<ImageData[]>([]);

  // Pinch-to-zoom on image
  const [imageScale, setImageScale] = useState(1);
  const [imageTranslate, setImageTranslate] = useState({ x: 0, y: 0 });
  const imagePinchRef = useRef<{ startDist: number; startMid: { x: number; y: number }; baseScale: number; baseTx: number; baseTy: number } | null>(null);

  // Share
  const [sharing, setSharing] = useState(false);
  const [hasDraft, setHasDraft] = useState(false);
  const [exitConfirmOpen, setExitConfirmOpen] = useState(false);
  const [pendingExitTarget, setPendingExitTarget] = useState<"back" | "feed" | "entry" | null>(null);
  const autoRestoreDoneRef = useRef(false);
  const autoSessionShareDoneRef = useRef(false);
  const [resumedFromDraft, setResumedFromDraft] = useState(false);

  const musicLayer = useMemo(() => dynamicLayers.find((l) => l.kind === "music") ?? null, [dynamicLayers]);
  const sessionLayer = useMemo(() => dynamicLayers.find((l) => l.kind === "session") ?? null, [dynamicLayers]);
  const emojiLayer = useMemo(() => dynamicLayers.find((l) => l.kind === "emoji") ?? null, [dynamicLayers]);

  const previewUrl = useMemo(() => (mediaFile ? URL.createObjectURL(mediaFile) : null), [mediaFile]);
  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);
  useEffect(() => {
    let mounted = true;
    void (async () => {
      const tracks = await storyMusicProvider.searchTracks(musicQuery);
      if (mounted) setFilteredMusic(tracks);
    })();
    return () => {
      mounted = false;
    };
  }, [musicQuery]);

  useEffect(() => {
    if (selectedMusic) {
      upsertKindLayer("music", { x: 16, y: 520, scale: 1, rotation: 0, label: selectedMusic.title });
    } else {
      removeKindLayer("music");
    }
  }, [selectedMusic]);

  useEffect(() => {
    if (selectedSession) {
      upsertKindLayer("session", { x: 20, y: 80, scale: 1, rotation: 0, label: selectedSession.title });
    } else {
      removeKindLayer("session");
    }
  }, [selectedSession]);

  useEffect(() => {
    if (emojiSticker) {
      upsertKindLayer("emoji", { x: 120, y: 220, scale: 1, rotation: 0, label: emojiSticker });
      requestAnimationFrame(() => {
        setDynamicLayers((prev) => {
          const layer = prev.find((l) => l.kind === "emoji");
          if (layer) setSelectedDynamicLayerId(layer.id);
          return prev;
        });
      });
    } else {
      removeKindLayer("emoji");
      setSelectedDynamicLayerId(null);
    }
  }, [emojiSticker]);

  useEffect(() => {
    return () => {
      if (previewAudioRef.current) {
        previewAudioRef.current.pause();
        previewAudioRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    try {
      setHasDraft(!!window.localStorage.getItem(STORY_DRAFT_STORAGE_KEY));
    } catch {
      setHasDraft(false);
    }
  }, []);

  const layerZ = useCallback(
    (layer: LayerKind) => 10 + layerOrder.indexOf(layer),
    [layerOrder]
  );

  const bringLayerToFront = (layer: LayerKind) => {
    setLayerOrder((prev) => [...prev.filter((l) => l !== layer), layer]);
    setSelectedLayer(layer);
  };

  const deleteSelectedLayer = () => {
    if (!selectedLayer) return;
    if (selectedLayer === "text") {
      setTextOverlay("");
      setShowTextInput(false);
    }
    setSelectedLayer(null);
  };

  const selectedObjectType = selectedDynamicLayerId ? "dynamic" : selectedLayer;
  const editToolbarHeight = editorMode === "text" ? 60 : 0;
  const visibleMusicTracks = useMemo(() => {
    if (musicSheetTab === "forYou") return filteredMusic;
    if (musicSheetTab === "popular") {
      const popular = filteredMusic.filter((track, idx) => /sport|fit|tempo/i.test(track.artist) || idx % 2 === 0);
      return popular.length > 0 ? popular : filteredMusic;
    }
    const original = filteredMusic.filter((track) => /nature|zen|original|audio/i.test(`${track.title} ${track.artist}`));
    return original.length > 0 ? original : filteredMusic.slice(0, Math.min(filteredMusic.length, 4));
  }, [filteredMusic, musicSheetTab]);

  const bringSelectedObjectToFront = () => {
    if (selectedDynamicLayerId) {
      setDynamicLayers((prev) => {
        const target = prev.find((l) => l.id === selectedDynamicLayerId);
        if (!target) return prev;
        return [...prev.filter((l) => l.id !== selectedDynamicLayerId), target];
      });
      return;
    }
    if (selectedLayer) bringLayerToFront(selectedLayer);
  };

  const triggerHaptic = useCallback((style: "light" | "medium" = "light") => {
    if (!Capacitor.isNativePlatform()) return;
    void import("@capacitor/haptics")
      .then(({ Haptics, ImpactStyle }) =>
        Haptics.impact({ style: style === "medium" ? ImpactStyle.Medium : ImpactStyle.Light })
      )
      .catch(() => undefined);
  }, []);

  const nudgeSelectedObjectScale = (delta: number) => {
    if (selectedDynamicLayerId) {
      setDynamicLayers((prev) =>
        prev.map((l) =>
          l.id === selectedDynamicLayerId
            ? { ...l, scale: Math.max(0.6, Math.min(2.4, +(l.scale + delta).toFixed(2))) }
            : l
        )
      );
      return;
    }
    if (selectedLayer === "text") {
      setTextScale((prev) => Math.max(0.6, Math.min(3, +(prev + delta).toFixed(2))));
    }
  };

  const nudgeSelectedObjectRotation = (delta: number) => {
    if (selectedDynamicLayerId) {
      setDynamicLayers((prev) =>
        prev.map((l) => (l.id === selectedDynamicLayerId ? { ...l, rotation: l.rotation + delta } : l))
      );
      return;
    }
    if (selectedLayer === "text") {
      setTextRotation((prev) => prev + delta);
    }
  };

  const deleteSelectedObject = () => {
    if (selectedDynamicLayerId) {
      setDynamicLayers((prev) => prev.filter((l) => l.id !== selectedDynamicLayerId));
      setSelectedDynamicLayerId(null);
      return;
    }
    deleteSelectedLayer();
  };

  const applyPendingMusic = () => {
    setSelectedMusic(pendingMusic);
    setShowMusicPicker(false);
  };

  const resetEditorState = useCallback(() => {
    setMediaFile(null);
    setStep("entry");
    setTextOverlay("");
    setSelectedMusic(null);
    setPendingMusic(null);
    setSelectedSession(null);
    setEmojiSticker(null);
    setDynamicLayers([]);
    setDrawMode(false);
    setShowTextInput(false);
    setShowMusicPicker(false);
    setShowSessionPicker(false);
    setShowStickerPicker(false);
    setEditorMode("idle");
    setSelectedLayer(null);
    setSelectedDynamicLayerId(null);
    setCaption("");
    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
      previewAudioRef.current = null;
    }
  }, []);

  const fileToDataUrl = useCallback((file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result ?? ""));
      reader.onerror = () => reject(new Error("read_error"));
      reader.readAsDataURL(file);
    });
  }, []);

  const dataUrlToFile = useCallback((dataUrl: string, fileName: string, mimeType: string): File | null => {
    const comma = dataUrl.indexOf(",");
    if (comma < 0) return null;
    const b64 = dataUrl.slice(comma + 1);
    try {
      const bin = window.atob(b64);
      const len = bin.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i += 1) bytes[i] = bin.charCodeAt(i);
      return new File([bytes], fileName || `story-draft-${Date.now()}`, { type: mimeType || "application/octet-stream" });
    } catch {
      return null;
    }
  }, []);

  const saveDraft = useCallback(async () => {
    const mediaDataUrl = mediaFile ? await fileToDataUrl(mediaFile) : null;
    const payload: StoryDraftPayload = {
      savedAt: Date.now(),
      sourceMode,
      captureMode,
      mediaDataUrl,
      mediaType: mediaFile?.type ?? null,
      mediaName: mediaFile?.name ?? null,
      textOverlay,
      showTextInput,
      textPos,
      textScale,
      textRotation,
      textColor,
      textFont,
      textAlign,
      textStyle,
      textSize,
      textBold,
      caption,
      selectedMusic,
      selectedSession,
      dynamicLayers,
      emojiSticker,
      layerOrder,
    };
    window.localStorage.setItem(STORY_DRAFT_STORAGE_KEY, JSON.stringify(payload));
    setHasDraft(true);
  }, [
    mediaFile,
    fileToDataUrl,
    sourceMode,
    captureMode,
    textOverlay,
    showTextInput,
    textPos,
    textScale,
    textRotation,
    textColor,
    textFont,
    textAlign,
    textStyle,
    textSize,
    textBold,
    caption,
    selectedMusic,
    selectedSession,
    dynamicLayers,
    emojiSticker,
    layerOrder,
  ]);

  const clearDraft = useCallback(() => {
    try {
      window.localStorage.removeItem(STORY_DRAFT_STORAGE_KEY);
    } catch {
      // ignore
    }
    setHasDraft(false);
  }, []);

  const restoreDraft = useCallback(async () => {
    let raw: string | null = null;
    try {
      raw = window.localStorage.getItem(STORY_DRAFT_STORAGE_KEY);
    } catch {
      raw = null;
    }
    if (!raw) {
      setHasDraft(false);
      toast({ title: "Aucun brouillon", description: "Aucun brouillon à reprendre." });
      return;
    }
    try {
      const draft = JSON.parse(raw) as StoryDraftPayload;
      setSourceMode(draft.sourceMode ?? "gallery");
      setCaptureMode(draft.captureMode ?? "photo");
      setTextOverlay(draft.textOverlay ?? "");
      setShowTextInput(!!draft.showTextInput);
      setTextPos(draft.textPos ?? { x: 120, y: 200 });
      setTextScale(typeof draft.textScale === "number" ? draft.textScale : 1);
      setTextRotation(typeof draft.textRotation === "number" ? draft.textRotation : 0);
      setTextColor(draft.textColor ?? "#FFFFFF");
      setTextFont(draft.textFont ?? "modern");
      setTextAlign(draft.textAlign ?? "center");
      setTextStyle(draft.textStyle ?? "plain");
      setTextSize(typeof draft.textSize === "number" ? draft.textSize : 30);
      setTextBold(draft.textBold ?? true);
      setCaption(draft.caption ?? "");
      setSelectedMusic(draft.selectedMusic ?? null);
      setPendingMusic(draft.selectedMusic ?? null);
      setSelectedSession(draft.selectedSession ?? null);
      setDynamicLayers(Array.isArray(draft.dynamicLayers) ? draft.dynamicLayers : []);
      setEmojiSticker(draft.emojiSticker ?? null);
      setLayerOrder(Array.isArray(draft.layerOrder) ? draft.layerOrder : ["session", "music", "emoji", "text"]);
      if (draft.mediaDataUrl && draft.mediaType) {
        const restoredFile = dataUrlToFile(draft.mediaDataUrl, draft.mediaName || "story-draft", draft.mediaType);
        setMediaFile(restoredFile);
        setStep(restoredFile ? "edit" : "entry");
        setResumedFromDraft(!!restoredFile);
      } else {
        setMediaFile(null);
        setStep("entry");
        setResumedFromDraft(false);
      }
      toast({ title: "Brouillon repris", description: "Ton brouillon a été restauré." });
    } catch {
      toast({ title: "Erreur", description: "Impossible de restaurer le brouillon.", variant: "destructive" });
    }
  }, [dataUrlToFile, toast]);

  useEffect(() => {
    if (autoRestoreDoneRef.current) return;
    if (searchParams.get("restoreDraft") !== "1") return;
    autoRestoreDoneRef.current = true;
    void restoreDraft().finally(() => {
      const next = new URLSearchParams(searchParams);
      next.delete("restoreDraft");
      setSearchParams(next, { replace: true });
    });
  }, [restoreDraft, searchParams, setSearchParams]);

  const proceedExit = useCallback(
    (next: "back" | "feed" | "entry") => {
      if (next === "back") {
        if (window.history.length > 1) {
          navigate(-1);
        } else {
          navigate("/feed");
        }
        return;
      }
      if (next === "feed") {
        navigate("/feed");
        return;
      }
      resetEditorState();
      setResumedFromDraft(false);
    },
    [navigate, resetEditorState]
  );

  const requestExitWithDraftPrompt = useCallback(
    (next: "back" | "feed" | "entry") => {
      const hasWork =
        !!mediaFile ||
        !!caption.trim() ||
        !!textOverlay.trim() ||
        !!selectedMusic ||
        !!selectedSession ||
        !!emojiSticker ||
        dynamicLayers.length > 0;

      if (!hasWork) {
        proceedExit(next);
        return;
      }
      setPendingExitTarget(next);
      setExitConfirmOpen(true);
    },
    [mediaFile, caption, textOverlay, selectedMusic, selectedSession, emojiSticker, dynamicLayers, proceedExit]
  );

  const exitDraftDialog = (
    <AlertDialog open={exitConfirmOpen} onOpenChange={setExitConfirmOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Enregistrer le brouillon ?</AlertDialogTitle>
          <AlertDialogDescription>
            Si tu quittes maintenant, ta story peut être enregistrée pour la reprendre plus tard.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel
            onClick={() => {
              const target = pendingExitTarget;
              setPendingExitTarget(null);
              if (target) proceedExit(target);
            }}
          >
            Quitter sans enregistrer
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={async () => {
              try {
                await saveDraft();
                toast({ title: "Brouillon enregistré", description: "Tu pourras le reprendre plus tard." });
              } catch {
                toast({ title: "Erreur", description: "Impossible d'enregistrer le brouillon.", variant: "destructive" });
              } finally {
                const target = pendingExitTarget;
                setPendingExitTarget(null);
                if (target) proceedExit(target);
              }
            }}
          >
            Enregistrer et quitter
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    let removed = false;
    const setup = async () => {
      try {
        const { App: CapApp } = await import("@capacitor/app");
        const listener = await CapApp.addListener("backButton", () => {
          requestExitWithDraftPrompt("back");
        });
        return () => {
          if (!removed) {
            removed = true;
            listener.remove();
          }
        };
      } catch {
        return undefined;
      }
    };
    const cleanupPromise = setup();
    return () => {
      cleanupPromise.then((cleanup) => cleanup?.());
    };
  }, [requestExitWithDraftPrompt]);

  const addDynamicLayer = (kind: DynamicLayerKind) => {
    const id = `${kind}-${Date.now()}`;
    const label =
      kind === "mention"
        ? "@mention"
        : kind === "place"
          ? "📍 Mon lieu"
          : new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
    const layer: DynamicLayer = { id, kind, label, x: 120, y: 300, scale: 1, rotation: 0 };
    setDynamicLayers((prev) => [...prev, layer]);
    setSelectedDynamicLayerId(id);
  };

  const upsertKindLayer = (kind: DynamicLayerKind, defaults: Pick<DynamicLayer, "x" | "y" | "scale" | "rotation" | "label">) => {
    setDynamicLayers((prev) => {
      const existing = prev.find((l) => l.kind === kind);
      if (existing) return prev;
      return [...prev, { id: `${kind}-${Date.now()}`, kind, ...defaults }];
    });
  };

  const updateKindLayer = (kind: DynamicLayerKind, updater: (layer: DynamicLayer) => DynamicLayer) => {
    setDynamicLayers((prev) => prev.map((l) => (l.kind === kind ? updater(l) : l)));
  };

  const removeKindLayer = (kind: DynamicLayerKind) => {
    setDynamicLayers((prev) => prev.filter((l) => l.kind !== kind));
  };

  const startDynamicDrag = (id: string, e: React.PointerEvent<HTMLDivElement>) => {
    const layer = dynamicLayers.find((l) => l.id === id);
    if (!layer) return;
    dynamicDragRef.current = { id, startX: e.clientX, startY: e.clientY, baseX: layer.x, baseY: layer.y };
    (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
  };
  const moveDynamicDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dynamicDragRef.current) return;
    setDynamicLayers((prev) =>
      prev.map((l) =>
        l.id === dynamicDragRef.current!.id
          ? {
              ...l,
              x: Math.max(0, dynamicDragRef.current!.baseX + e.clientX - dynamicDragRef.current!.startX),
              y: Math.max(0, dynamicDragRef.current!.baseY + e.clientY - dynamicDragRef.current!.startY),
            }
          : l
      )
    );
  };
  const endDynamicDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    if (dynamicDragRef.current) {
      dynamicDragRef.current = null;
      try { (e.currentTarget as HTMLDivElement).releasePointerCapture(e.pointerId); } catch {}
    }
  };

  const toggleTrackPreview = async (track: StoryMusicTrack) => {
    if (!track.previewUrl) {
      toast({
        title: "Aperçu indisponible",
        description: "Cette musique n'a pas de préécoute.",
        variant: "destructive",
      });
      return;
    }
    if (previewAudioRef.current && previewingTrackId === track.id) {
      previewAudioRef.current.pause();
      previewAudioRef.current.currentTime = 0;
      setPreviewingTrackId(null);
      return;
    }
    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
      previewAudioRef.current.currentTime = 0;
    }
    const audio = new Audio(track.previewUrl);
    audio.preload = "auto";
    audio.volume = 1;
    audio.muted = false;
    previewAudioRef.current = audio;
    setPreviewingTrackId(track.id);
    audio.onended = () => setPreviewingTrackId(null);
    try {
      await audio.play();
    } catch {
      setPreviewingTrackId(null);
      toast({
        title: "Lecture impossible",
        description: "Impossible de lancer la préécoute audio.",
        variant: "destructive",
      });
    }
  };

  // ── Camera stream ──
  useEffect(() => {
    if (step !== "capture" || sourceMode !== "camera") return;
    let cancelled = false;
    void (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: facingMode },
            width: { ideal: 3840 },
            height: { ideal: 2160 },
            frameRate: { ideal: 30, max: 60 },
          },
          audio: captureMode !== "photo",
        });
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = stream;
        if (cameraRef.current) {
          cameraRef.current.srcObject = stream;
          await cameraRef.current.play().catch(() => undefined);
        }
      } catch { /* camera unavailable */ }
    })();
    return () => {
      cancelled = true;
      if (recorderRef.current?.state !== "inactive") recorderRef.current?.stop();
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      setIsRecording(false);
      setRecordSec(0);
    };
  }, [step, sourceMode, captureMode, facingMode]);

  // Recording timer
  useEffect(() => {
    if (!isRecording) return;
    const id = setInterval(() => setRecordSec((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [isRecording]);

  // ── Load sessions ──
  const loadSessions = useCallback(async () => {
    if (!user?.id) return;
    try {
      const [createdRes, joinedRes] = await Promise.all([
        supabase
          .from("sessions")
          .select("id, title, location_name, location_lat, location_lng, route_id, scheduled_at")
          .eq("organizer_id", user.id)
          .order("scheduled_at", { ascending: true })
          .limit(120),
        supabase
          .from("session_participants")
          .select("session:sessions(id, title, location_name, location_lat, location_lng, route_id, scheduled_at)")
          .eq("user_id", user.id)
          .limit(180),
      ]);

      if (createdRes.error) {
        console.error("StoryCreate loadSessions created error:", createdRes.error);
      }
      if (joinedRes.error) {
        console.error("StoryCreate loadSessions joined error:", joinedRes.error);
      }

      const createdRows = (createdRes.data ?? []) as SessionRowBase[];
      const joinedRows = (joinedRes.data ?? []) as Array<{ session?: SessionRowBase | null }>;
      const joinedSessions = joinedRows.map((r) => r.session).filter(Boolean) as SessionRowBase[];

      const allRows = [...createdRows, ...joinedSessions];
      const byId = new Map<string, SessionRowBase>();
      for (const s of allRows) {
        if (!s?.id) continue;
        if (!byId.has(s.id)) byId.set(s.id, s);
      }

      const routeIds = Array.from(new Set(allRows.map((s) => s.route_id).filter(Boolean))) as string[];
      const routeCoordsById = new Map<string, Array<{ lat: number; lng: number }>>();
      if (routeIds.length > 0) {
        const routesRes = await supabase.from("routes").select("id, coordinates").in("id", routeIds);
        if (routesRes.error) {
          console.error("StoryCreate loadSessions routes error:", routesRes.error);
        } else {
          for (const route of (routesRes.data ?? []) as Array<{ id: string; coordinates: unknown }>) {
            const coords = Array.isArray(route.coordinates)
              ? route.coordinates
                  .map((c: unknown) => {
                    const row = c as { lat?: number; lng?: number };
                    return row && row.lat != null && row.lng != null
                      ? { lat: Number(row.lat), lng: Number(row.lng) }
                      : null;
                  })
                  .filter(Boolean) as Array<{ lat: number; lng: number }>
              : [];
            routeCoordsById.set(route.id, coords);
          }
        }
      }

      const now = Date.now();
      const normalized = Array.from(byId.values())
        .sort((a, b) => {
          const ta = parseSessionTimestamp(a.scheduled_at);
          const tb = parseSessionTimestamp(b.scheduled_at);
          const aFuture = Number.isFinite(ta) ? ta >= now : false;
          const bFuture = Number.isFinite(tb) ? tb >= now : false;
          if (aFuture !== bFuture) return aFuture ? -1 : 1;
          if (Number.isFinite(ta) && Number.isFinite(tb)) return ta - tb;
          if (Number.isFinite(ta)) return -1;
          if (Number.isFinite(tb)) return 1;
          return 0;
        })
        .slice(0, 40)
        .map((s) => ({
          id: s.id,
          title: s.title ?? "Séance",
          location_name: s.location_name ?? "Lieu non défini",
          location_lat: s.location_lat ?? null,
          location_lng: s.location_lng ?? null,
          route_id: s.route_id ?? null,
          scheduled_at: s.scheduled_at,
          route_coordinates: s.route_id ? routeCoordsById.get(s.route_id) ?? [] : [],
        })) as ScheduledSession[];

      setSessions(normalized);
    } catch (err) {
      console.error("StoryCreate loadSessions fatal:", err);
      setSessions([]);
    }
  }, [user?.id]);

  useEffect(() => { void loadSessions(); }, [loadSessions]);

  /** Capture JPEG depuis le flux live (respecte avant/arrière, miroir selfie comme l’aperçu). */
  const capturePhotoFromStream = useCallback(async (): Promise<File | null> => {
    const video = cameraRef.current;
    const stream = streamRef.current;
    if (!video || !stream || video.readyState < 2) return null;
    const w = video.videoWidth;
    const h = video.videoHeight;
    if (w < 2 || h < 2) return null;
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    if (facingMode === "user") {
      ctx.translate(w, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0, w, h);
    return new Promise((resolve) => {
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            resolve(null);
            return;
          }
          resolve(new File([blob], `story-${Date.now()}.jpg`, { type: "image/jpeg" }));
        },
        "image/jpeg",
        0.98,
      );
    });
  }, [facingMode]);

  // ── Actions ──
  const onCapture = async () => {
    if (captureMode === "photo") {
      if (Capacitor.isNativePlatform()) {
        const nativeFile = await takePicture({ facing: facingMode });
        if (nativeFile) {
          setMediaFile(nativeFile);
          setStep("edit");
          return;
        }
      }
      const fromStream = await capturePhotoFromStream();
      const file = fromStream ?? (await takePicture({ facing: facingMode }));
      if (file) {
        setMediaFile(file);
        setStep("edit");
      }
      return;
    }
    if (Capacitor.isNativePlatform() && captureMode === "video") {
      const nativeVideo = await pickNativeVideoFromCamera(facingMode);
      if (nativeVideo) {
        setMediaFile(nativeVideo);
        setStep("edit");
      }
      return;
    }
    const stream = streamRef.current;
    if (!stream) {
      // Fallback: file input
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "video/*";
      input.capture = facingMode === "user" ? "user" : "environment";
      input.onchange = () => {
        const f = input.files?.[0];
        if (f) { setMediaFile(f); setStep("edit"); }
      };
      input.click();
      return;
    }
    if (isRecording) {
      recorderRef.current?.stop();
      setIsRecording(false);
      return;
    }
    chunksRef.current = [];
    let opts: MediaRecorderOptions | undefined;
    for (const m of ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"]) {
      if (MediaRecorder.isTypeSupported(m)) { opts = { mimeType: m }; break; }
    }
    const rec = opts
      ? new MediaRecorder(stream, { ...opts, videoBitsPerSecond: 8_000_000 })
      : new MediaRecorder(stream, { videoBitsPerSecond: 8_000_000 });
    recorderRef.current = rec;
    rec.ondataavailable = (e) => { if (e.data?.size > 0) chunksRef.current.push(e.data); };
    rec.onstop = () => {
      const type = rec.mimeType || "video/webm";
      const blob = new Blob(chunksRef.current, { type });
      const ext = type.includes("mp4") ? "mp4" : "webm";
      const file = new File([blob], `${captureMode}-${Date.now()}.${ext}`, { type });
      setMediaFile(file);
      setStep("edit");
      setRecordSec(0);
    };
    rec.start();
    setIsRecording(true);
    if (captureMode === "boomerang") {
      setTimeout(() => { if (rec.state !== "inactive") { rec.stop(); setIsRecording(false); } }, 1800);
    }
  };

  const onTakePhoto = async () => {
    setSourceMode("camera");
    setCaptureMode("photo");

    // On mobile native, open system camera app directly for best quality.
    if (Capacitor.isNativePlatform()) {
      const file = await takePicture({ facing: "environment" });
      if (file) {
        setMediaFile(file);
        setStep("edit");
      }
      return;
    }

    setStep("capture");
  };

  const onPickGallery = () => {
    const input = document.createElement("input");
    input.type = "file"; input.accept = "image/*,video/*";
    input.onchange = () => {
      const f = input.files?.[0];
      if (f) { setMediaFile(f); setStep("edit"); }
    };
    input.click();
  };

  const pickNativeVideoFromCamera = (facing: "user" | "environment"): Promise<File | null> =>
    new Promise((resolve) => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "video/*";
      input.capture = facing === "user" ? "user" : "environment";
      input.style.position = "fixed";
      input.style.top = "-9999px";
      input.style.left = "-9999px";
      document.body.appendChild(input);
      const cleanup = () => {
        try {
          input.remove();
        } catch {
          // ignore
        }
      };
      input.onchange = () => {
        const f = input.files?.[0] ?? null;
        cleanup();
        resolve(f);
      };
      input.oncancel = () => {
        cleanup();
        resolve(null);
      };
      input.click();
    });

  const storyShareErrorMessage = (err: unknown): string => {
    const raw =
      err && typeof err === "object" && "message" in err
        ? String((err as { message?: string }).message ?? "")
        : String(err ?? "");
    const lower = raw.toLowerCase();
    if (lower.includes("bucket") && lower.includes("not found")) {
      return "Le bucket Storage « story-media » est absent. Applique les migrations Supabase (ou crée ce bucket public dans le tableau de bord).";
    }
    if (lower.includes("bucket")) {
      return "Problème de stockage des stories (bucket). Vérifie la configuration Supabase Storage.";
    }
    return raw || "Impossible de partager la story.";
  };

  const createSessionStoryImage = useCallback(async (session: ScheduledSession): Promise<File | null> => {
    try {
      const sessionLike = {
        id: session.id,
        title: session.title,
        activity_type: "running",
        scheduled_at: session.scheduled_at,
        location_name: session.location_name,
        location_lat: session.location_lat ?? 48.8566,
        location_lng: session.location_lng ?? 2.3522,
        route_id: session.route_id ?? null,
        routes: session.route_coordinates?.length
          ? { coordinates: session.route_coordinates }
          : null,
      };

      const publicUrl = getSessionPublicUrl(session.id);
      const payload = buildSessionSharePayload(sessionLike, {
        publicUrl,
        sharerDisplayName: user?.email ?? null,
        sharerAvatarUrl: null,
        formatKm: (n) => `${n.toFixed(1)} km`,
      });

      const mapImageUrl = buildSessionStaticMapUrl({
        routePath: payload.routePath,
        pin: payload.mapPin,
        width: 1080,
        height: 1920,
        padding: payload.hasRoute ? 72 : 48,
      });

      const host = document.createElement("div");
      host.style.cssText = "position:fixed;left:-12000px;top:0;pointer-events:none;overflow:hidden;";
      document.body.appendChild(host);

      const root = createRoot(host);
      const artboardRef: { current: HTMLDivElement | null } = { current: null };

      await new Promise<void>((resolve) => {
        root.render(
          <SessionShareArtboard
            ref={(el) => { artboardRef.current = el; }}
            payload={payload}
            templateId="instagram_story"
            mapImageUrl={mapImageUrl}
          />
        );
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      });

      await new Promise((r) => setTimeout(r, 300));

      if (!artboardRef.current) {
        root.unmount();
        document.body.removeChild(host);
        return null;
      }

      const dataUrl = await generateSessionShareImage(artboardRef.current, "instagram_story");
      root.unmount();
      document.body.removeChild(host);

      const res = await fetch(dataUrl);
      const blob = await res.blob();
      return new File([blob], `session-story-${session.id}-${Date.now()}.png`, { type: "image/png" });
    } catch (err) {
      console.error("[StoryCreate] createSessionStoryImage error", err);
      return null;
    }
  }, [user?.email]);

  useEffect(() => {
    if (autoSessionShareDoneRef.current) return;
    const sharedSessionId = searchParams.get("sessionShareId");
    if (!sharedSessionId) return;
    if (sessions.length === 0) return;

    autoSessionShareDoneRef.current = true;
    const targetSession = sessions.find((s) => s.id === sharedSessionId);
    const clearParam = () => {
      const next = new URLSearchParams(searchParams);
      next.delete("sessionShareId");
      setSearchParams(next, { replace: true });
    };

    if (!targetSession) {
      toast({
        title: "Séance introuvable",
        description: "Impossible de préparer cette séance en story.",
        variant: "destructive",
      });
      clearParam();
      return;
    }

    void (async () => {
      const generated = await createSessionStoryImage(targetSession);
      if (!generated) {
        toast({
          title: "Erreur",
          description: "Impossible de préparer la story de séance.",
          variant: "destructive",
        });
        clearParam();
        return;
      }
      setSelectedSession(targetSession);
      setMediaFile(generated);
      setShowSessionPicker(false);
      setStep("edit");
      setResumedFromDraft(false);
      clearParam();
    })();
  }, [createSessionStoryImage, searchParams, sessions, setSearchParams, toast]);

  const onShare = async () => {
    if (!user?.id || !mediaFile) return;
    setSharing(true);
    let createdStoryId: string | null = null;
    let uploadedStoragePath: string | null = null;
    try {
      const mediaType = mediaFile.type.startsWith("video/")
        ? (captureMode === "boomerang" ? "boomerang" : "video")
        : "image";
      let fileToUpload = mediaFile;
      if (mediaType === "image") {
        const hasOverlays =
          !!textOverlay.trim() ||
          !!selectedMusic ||
          !!selectedSession ||
          !!emojiSticker ||
          dynamicLayers.length > 0 ||
          drawHistoryRef.current.length > 0;
        if (hasOverlays) {
          const baked = await renderImageStoryWithOverlays(mediaFile);
          if (baked) fileToUpload = baked;
        }
      }

      const { data: story, error: storyError } = await (supabase as any)
        .from("session_stories")
        .insert({
          author_id: user.id,
          session_id: selectedSession?.id ?? null,
          caption: caption || null,
        })
        .select("id")
        .single();
      if (storyError || !story) throw storyError || new Error("Story creation failed");
      createdStoryId = story.id as string;

      const ext = fileToUpload.name.split(".").pop() || (mediaType === "image" ? "jpg" : "mp4");
      const path = `${user.id}/${story.id}-${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from("story-media").upload(path, fileToUpload, { upsert: false });
      if (uploadError) throw uploadError;
      uploadedStoragePath = path;

      const { data: pub } = supabase.storage.from("story-media").getPublicUrl(path);
      const { error: mediaError } = await (supabase as any).from("story_media").insert({
        story_id: story.id,
        media_url: pub.publicUrl,
        media_type: mediaType,
        metadata: {
          text_overlay: textOverlay
            ? {
                value: textOverlay,
                x: textPos.x,
                y: textPos.y,
                scale: textScale,
                rotation: textRotation,
                color: textColor,
                font: textFont,
                align: textAlign,
                style: textStyle,
                size: textSize,
                bold: textBold,
              }
            : null,
          music: selectedMusic
            ? {
                id: selectedMusic.id,
                title: selectedMusic.title,
                artist: selectedMusic.artist,
                x: musicLayer?.x ?? 16,
                y: musicLayer?.y ?? 520,
                scale: musicLayer?.scale ?? 1,
                rotation: musicLayer?.rotation ?? 0,
              }
            : null,
          sticker: selectedSession
            ? {
                session_id: selectedSession.id,
                x: sessionLayer?.x ?? 20,
                y: sessionLayer?.y ?? 80,
                scale: sessionLayer?.scale ?? 1,
                rotation: sessionLayer?.rotation ?? 0,
              }
            : null,
          emoji_sticker: emojiSticker
            ? {
                emoji: emojiSticker,
                x: emojiLayer?.x ?? 120,
                y: emojiLayer?.y ?? 220,
                scale: emojiLayer?.scale ?? 1,
                rotation: emojiLayer?.rotation ?? 0,
              }
            : null,
          dynamic_layers: dynamicLayers.filter((layer) => layer.kind === "mention" || layer.kind === "place" || layer.kind === "time"),
          draw_enabled: drawMode,
        },
      });
      if (mediaError) throw mediaError;

      toast({ title: "Story partagée ✨", description: "Ta story est en ligne." });
      clearDraft();
      navigate("/feed", { state: { refreshStories: true } });
    } catch (error: unknown) {
      if (uploadedStoragePath) {
        await supabase.storage.from("story-media").remove([uploadedStoragePath]);
      }
      if (createdStoryId) {
        await supabase.from("session_stories").delete().eq("id", createdStoryId);
      }
      toast({
        title: "Erreur",
        description: storyShareErrorMessage(error),
        variant: "destructive",
      });
    } finally {
      setSharing(false);
    }
  };

  // ── Sticker drag ──
  const startDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!sessionLayer) return;
    stickerDragRef.current = { startX: e.clientX, startY: e.clientY, baseX: sessionLayer.x, baseY: sessionLayer.y };
    (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
  };

  const startMusicDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!musicLayer) return;
    musicDragRef.current = { startX: e.clientX, startY: e.clientY, baseX: musicLayer.x, baseY: musicLayer.y };
    (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
  };
  const moveMusicDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!musicDragRef.current) return;
    updateKindLayer("music", (layer) => ({
      ...layer,
      x: Math.max(0, musicDragRef.current!.baseX + e.clientX - musicDragRef.current!.startX),
      y: Math.max(0, musicDragRef.current!.baseY + e.clientY - musicDragRef.current!.startY),
    }));
  };
  const endMusicDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    if (musicDragRef.current) {
      musicDragRef.current = null;
      try { (e.currentTarget as HTMLDivElement).releasePointerCapture(e.pointerId); } catch {}
    }
  };
  const moveDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!stickerDragRef.current) return;
    updateKindLayer("session", (layer) => ({
      ...layer,
      x: Math.max(0, stickerDragRef.current!.baseX + e.clientX - stickerDragRef.current!.startX),
      y: Math.max(0, stickerDragRef.current!.baseY + e.clientY - stickerDragRef.current!.startY),
    }));
  };
  const endDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    if (stickerDragRef.current) {
      stickerDragRef.current = null;
      try { (e.currentTarget as HTMLDivElement).releasePointerCapture(e.pointerId); } catch {}
    }
  };

  const startEmojiDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!emojiLayer) return;
    emojiDragRef.current = { startX: e.clientX, startY: e.clientY, baseX: emojiLayer.x, baseY: emojiLayer.y };
    (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
  };
  const moveEmojiDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!emojiDragRef.current) return;
    updateKindLayer("emoji", (layer) => ({
      ...layer,
      x: Math.max(0, emojiDragRef.current!.baseX + e.clientX - emojiDragRef.current!.startX),
      y: Math.max(0, emojiDragRef.current!.baseY + e.clientY - emojiDragRef.current!.startY),
    }));
  };
  const endEmojiDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    if (emojiDragRef.current) {
      emojiDragRef.current = null;
      try { (e.currentTarget as HTMLDivElement).releasePointerCapture(e.pointerId); } catch {}
    }
  };

  const startTextDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!textOverlay) return;
    setTextDragging(true);
    textDragRef.current = { startX: e.clientX, startY: e.clientY, baseX: textPos.x, baseY: textPos.y };
    (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
  };
  const moveTextDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!textDragRef.current) return;
    const host = drawHostRef.current;
    const baseX = textDragRef.current.baseX + e.clientX - textDragRef.current.startX;
    const baseY = textDragRef.current.baseY + e.clientY - textDragRef.current.startY;
    if (!host) {
      setTextPos({ x: Math.max(0, baseX), y: Math.max(0, baseY) });
      return;
    }
    const rect = host.getBoundingClientRect();
    const snapThreshold = 14;
    const centerTargetX = Math.max(8, rect.width / 2 - 90);
    const topThirdY = rect.height * 0.26;
    const middleY = rect.height * 0.43;
    const bottomThirdY = rect.height * 0.62;

    let nextX = Math.max(0, baseX);
    let nextY = Math.max(0, baseY);
    const guides = { centerX: false, topThird: false, midY: false, bottomThird: false };

    if (Math.abs(nextX - centerTargetX) <= snapThreshold) {
      nextX = centerTargetX;
      guides.centerX = true;
    }
    if (Math.abs(nextY - topThirdY) <= snapThreshold) {
      nextY = topThirdY;
      guides.topThird = true;
    } else if (Math.abs(nextY - middleY) <= snapThreshold) {
      nextY = middleY;
      guides.midY = true;
    } else if (Math.abs(nextY - bottomThirdY) <= snapThreshold) {
      nextY = bottomThirdY;
      guides.bottomThird = true;
    }
    setTextSnapGuides(guides);
    setTextPos({ x: nextX, y: nextY });
  };
  const endTextDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    if (textDragRef.current) {
      textDragRef.current = null;
      setTextDragging(false);
      setTextSnapGuides({ centerX: false, topThird: false, midY: false, bottomThird: false });
      try { (e.currentTarget as HTMLDivElement).releasePointerCapture(e.pointerId); } catch {}
    }
  };

  const onImageTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length !== 2) return;
    if (editorMode !== "idle" || selectedLayer || selectedDynamicLayerId) return;
    const [a, b] = [e.touches[0], e.touches[1]];
    const dist = Math.hypot(b.clientX - a.clientX, b.clientY - a.clientY);
    imagePinchRef.current = {
      startDist: dist,
      startMid: { x: (a.clientX + b.clientX) / 2, y: (a.clientY + b.clientY) / 2 },
      baseScale: imageScale,
      baseTx: imageTranslate.x,
      baseTy: imageTranslate.y,
    };
  };
  const onImageTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length !== 2 || !imagePinchRef.current) return;
    const [a, b] = [e.touches[0], e.touches[1]];
    const dist = Math.hypot(b.clientX - a.clientX, b.clientY - a.clientY);
    const ratio = dist / Math.max(1, imagePinchRef.current.startDist);
    const newScale = Math.max(1, Math.min(4, +(imagePinchRef.current.baseScale * ratio).toFixed(3)));
    const midX = (a.clientX + b.clientX) / 2;
    const midY = (a.clientY + b.clientY) / 2;
    setImageScale(newScale);
    setImageTranslate({
      x: imagePinchRef.current.baseTx + (midX - imagePinchRef.current.startMid.x),
      y: imagePinchRef.current.baseTy + (midY - imagePinchRef.current.startMid.y),
    });
  };
  const onImageTouchEnd = () => {
    if (!imagePinchRef.current) return;
    imagePinchRef.current = null;
    if (imageScale < 1.05) {
      setImageScale(1);
      setImageTranslate({ x: 0, y: 0 });
    }
  };

  useEffect(() => {
    if (step !== "edit") return;
    const updateKeyboardInset = () => {
      const vv = window.visualViewport;
      if (!vv) {
        setKeyboardHeight(0);
        return;
      }
      const inset = Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop));
      setKeyboardHeight(inset);
    };
    updateKeyboardInset();
    window.visualViewport?.addEventListener("resize", updateKeyboardInset);
    window.visualViewport?.addEventListener("scroll", updateKeyboardInset);
    return () => {
      window.visualViewport?.removeEventListener("resize", updateKeyboardInset);
      window.visualViewport?.removeEventListener("scroll", updateKeyboardInset);
    };
  }, [step]);

  const closeEditorMode = useCallback(() => {
    setEditorMode("idle");
    setShowTextInput(false);
    setShowMusicPicker(false);
    setShowSessionPicker(false);
    setShowStickerPicker(false);
    setDrawMode(false);
  }, []);

  const getTextEditingViewport = useCallback(() => {
    const host = drawHostRef.current;
    if (!host) return null;
    const rect = host.getBoundingClientRect();
    const topBoundary = 92;
    // Stable bottom boundary: reserve space for the text styling toolbar only.
    // We intentionally DO NOT include keyboardHeight here — the scene must stay fixed.
    const bottomBoundary = rect.height - Math.max(80, editToolbarHeight + 24);
    return {
      width: rect.width,
      top: Math.max(32, topBoundary),
      bottom: Math.max(topBoundary + 72, bottomBoundary),
    };
  }, [editToolbarHeight]);

  const placeTextEditorAtCenter = useCallback(() => {
    const viewport = getTextEditingViewport();
    if (!viewport) return;
    const x = Math.max(16, viewport.width / 2 - 90);
    const y = Math.max(viewport.top + 8, viewport.top + (viewport.bottom - viewport.top) * 0.42);
    setTextPos({ x, y });
  }, [getTextEditingViewport]);

  // Safety clamp ONLY when text tool opens — never reposition on keyboard changes.
  // This prevents the input from "jumping" while typing.
  useEffect(() => {
    if (!showTextInput) return;
    const viewport = getTextEditingViewport();
    if (!viewport) return;
    const minSafeY = viewport.top + 8;
    const maxSafeY = Math.max(minSafeY + 64, viewport.bottom - 64);
    setTextPos((prev) => {
      if (prev.y >= minSafeY && prev.y <= maxSafeY) return prev;
      return { ...prev, y: Math.max(minSafeY, Math.min(maxSafeY, prev.y)) };
    });
    // Intentionally NOT depending on keyboardHeight or textPos.y to avoid loops/jumps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showTextInput]);

  // Reliable focus with iOS fallback (some iOS Safari builds miss the first focus()).
  useEffect(() => {
    if (!showTextInput) return;
    const focusNow = () => textInputRef.current?.focus({ preventScroll: true });
    focusNow();
    const t1 = window.setTimeout(focusNow, 50);
    const t2 = window.setTimeout(focusNow, 200);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [showTextInput]);

  const onTextTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length !== 2) return;
    const [a, b] = [e.touches[0], e.touches[1]];
    const dx = b.clientX - a.clientX;
    const dy = b.clientY - a.clientY;
    textGestureRef.current = {
      startDist: Math.hypot(dx, dy),
      startAngle: Math.atan2(dy, dx),
      baseScale: textScale,
      baseRotation: textRotation,
    };
    setTextPinching(true);
  };

  const onTextTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length !== 2 || !textGestureRef.current) return;
    const [a, b] = [e.touches[0], e.touches[1]];
    const dx = b.clientX - a.clientX;
    const dy = b.clientY - a.clientY;
    const dist = Math.hypot(dx, dy);
    const angle = Math.atan2(dy, dx);
    const ratio = dist / Math.max(1, textGestureRef.current.startDist);
    setTextScale(Math.max(0.6, Math.min(3, +(textGestureRef.current.baseScale * ratio).toFixed(2))));
    const deltaDeg = ((angle - textGestureRef.current.startAngle) * 180) / Math.PI;
    setTextRotation(textGestureRef.current.baseRotation + deltaDeg);
  };

  const onTextTouchEnd = () => {
    if (textPinching) {
      setTextPinching(false);
      textGestureRef.current = null;
    }
  };

  const syncDrawCanvasSize = useCallback(() => {
    const host = drawHostRef.current;
    const canvas = drawCanvasRef.current;
    if (!host || !canvas) return;
    const rect = host.getBoundingClientRect();
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    const targetW = Math.round(rect.width * dpr);
    const targetH = Math.round(rect.height * dpr);
    if (canvas.width !== targetW || canvas.height !== targetH) {
      const snapshot = document.createElement("canvas");
      snapshot.width = canvas.width;
      snapshot.height = canvas.height;
      const snapCtx = snapshot.getContext("2d");
      if (snapCtx) snapCtx.drawImage(canvas, 0, 0);
      canvas.width = targetW;
      canvas.height = targetH;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        if (snapshot.width > 0 && snapshot.height > 0) {
          ctx.drawImage(snapshot, 0, 0, snapshot.width / dpr, snapshot.height / dpr);
        }
      }
    }
  }, []);

  useEffect(() => {
    if (step !== "edit") return;
    syncDrawCanvasSize();
    const onResize = () => syncDrawCanvasSize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [step, syncDrawCanvasSize, previewUrl]);

  const drawAtPointer = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = drawCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.strokeStyle = drawColor;
    ctx.lineWidth = 4;
    if (!lastPointRef.current) {
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x, y);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.moveTo(lastPointRef.current.x, lastPointRef.current.y);
      ctx.lineTo(x, y);
      ctx.stroke();
    }
    lastPointRef.current = { x, y };
  };

  const snapshotDrawState = () => {
    const canvas = drawCanvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx || canvas.width < 1 || canvas.height < 1) return;
    const snap = ctx.getImageData(0, 0, canvas.width, canvas.height);
    drawHistoryRef.current.push(snap);
    if (drawHistoryRef.current.length > 30) {
      drawHistoryRef.current.shift();
    }
  };

  const undoLastStroke = () => {
    const canvas = drawCanvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const previous = drawHistoryRef.current.pop();
    if (previous) {
      ctx.putImageData(previous, 0, 0);
      return;
    }
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const renderImageStoryWithOverlays = useCallback(async (file: File): Promise<File | null> => {
    const host = drawHostRef.current;
    if (!host) return null;

    const mediaUrl = URL.createObjectURL(file);
    try {
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const el = new window.Image();
        el.onload = () => resolve(el);
        el.onerror = () => reject(new Error("Image load failed"));
        el.src = mediaUrl;
      });

      const hostRect = host.getBoundingClientRect();
      const hostW = Math.max(1, hostRect.width);
      const hostH = Math.max(1, hostRect.height);
      const imgW = Math.max(1, img.naturalWidth);
      const imgH = Math.max(1, img.naturalHeight);
      const coverScale = Math.max(hostW / imgW, hostH / imgH);
      const shownW = imgW * coverScale;
      const shownH = imgH * coverScale;
      const offsetX = (hostW - shownW) / 2;
      const offsetY = (hostH - shownH) / 2;

      const srcX = Math.max(0, (-offsetX) / coverScale);
      const srcY = Math.max(0, (-offsetY) / coverScale);
      const srcW = Math.max(1, hostW / coverScale);
      const srcH = Math.max(1, hostH / coverScale);

      const outW = Math.max(1, Math.round(srcW));
      const outH = Math.max(1, Math.round(srcH));
      const out = document.createElement("canvas");
      out.width = outW;
      out.height = outH;
      const ctx = out.getContext("2d");
      if (!ctx) return null;

      const sx = outW / hostW;
      const sy = outH / hostH;
      ctx.drawImage(img, srcX, srcY, srcW, srcH, 0, 0, outW, outH);

      const drawCanvas = drawCanvasRef.current;
      if (drawCanvas) {
        ctx.drawImage(drawCanvas, 0, 0, drawCanvas.width, drawCanvas.height, 0, 0, outW, outH);
      }

      if (textOverlay.trim()) {
        ctx.save();
        const fontPx = Math.max(18, Math.round(textSize * sx));
        ctx.font = `${textBold ? 700 : 500} ${fontPx}px ${FONT_MAP[textFont]}`;
        ctx.textAlign = textAlign;
        ctx.textBaseline = "top";
        const tx = Math.max(18, textPos.x * sx);
        const ty = Math.max(18, textPos.y * sy);
        const metrics = ctx.measureText(textOverlay);
        const boxW = metrics.width + 30;
        const boxH = Math.max(40, Math.round(outW * 0.08));
        ctx.translate(tx, ty);
        ctx.scale(textScale, textScale);
        ctx.rotate((textRotation * Math.PI) / 180);
        const anchorX = textAlign === "center" ? 0 : textAlign === "right" ? -metrics.width : 0;
        if (textStyle === "bubble" || textStyle === "band") {
          ctx.fillStyle = textStyle === "bubble" ? "rgba(0,0,0,0.55)" : "rgba(0,0,0,0.38)";
          ctx.beginPath();
          ctx.roundRect(anchorX - 14, -10, boxW, boxH, textStyle === "bubble" ? 14 : 4);
          ctx.fill();
        }
        if (textStyle === "outline") {
          ctx.strokeStyle = "rgba(0,0,0,0.6)";
          ctx.lineWidth = Math.max(1, Math.round(fontPx / 12));
          ctx.strokeText(textOverlay, anchorX, 0);
        }
        ctx.fillStyle = textColor;
        ctx.fillText(textOverlay, anchorX, 0);
        ctx.restore();
      }

      if (selectedMusic) {
        ctx.save();
        const bx = Math.round((musicLayer?.x ?? 16) * sx);
        const by = Math.round((musicLayer?.y ?? 520) * sy);
        const bh = Math.round(30 * sy);
        const text = selectedMusic.title;
        ctx.font = `600 ${Math.max(11, Math.round(outW * 0.024))}px -apple-system, BlinkMacSystemFont, "SF Pro Text", Inter, sans-serif`;
        const tw = ctx.measureText(text).width;
        const bw = Math.round(tw + 42 * sx);
        ctx.translate(bx, by);
        ctx.scale(musicLayer?.scale ?? 1, musicLayer?.scale ?? 1);
        ctx.rotate(((musicLayer?.rotation ?? 0) * Math.PI) / 180);
        ctx.fillStyle = "rgba(0,0,0,0.55)";
        ctx.beginPath();
        ctx.roundRect(0, 0, bw, bh, 999);
        ctx.fill();
        ctx.fillStyle = "#FFFFFF";
        ctx.fillText("♪", Math.round(12 * sx), bh / 2 + 4);
        ctx.fillText(text, Math.round(24 * sx), bh / 2 + 4);
        ctx.restore();
      }

      if (selectedSession) {
        ctx.save();
        ctx.translate((sessionLayer?.x ?? 20) * sx, (sessionLayer?.y ?? 80) * sy);
        ctx.scale(sessionLayer?.scale ?? 1, sessionLayer?.scale ?? 1);
        ctx.rotate(((sessionLayer?.rotation ?? 0) * Math.PI) / 180);
        const w = Math.max(170, Math.round(outW * 0.36));
        const h = 66;
        ctx.fillStyle = "rgba(255,255,255,0.92)";
        ctx.beginPath();
        ctx.roundRect(0, 0, w, h, 16);
        ctx.fill();
        ctx.fillStyle = "#111111";
        ctx.font = "700 12px -apple-system, BlinkMacSystemFont, 'SF Pro Text', Inter, sans-serif";
        ctx.fillText(selectedSession.title.slice(0, 30), 12, 24);
        ctx.fillStyle = "#5f5f5f";
        ctx.font = "500 10px -apple-system, BlinkMacSystemFont, 'SF Pro Text', Inter, sans-serif";
        ctx.fillText(selectedSession.location_name.slice(0, 34), 12, 42);
        ctx.restore();
      }

      if (emojiSticker) {
        ctx.save();
        ctx.translate((emojiLayer?.x ?? 120) * sx, (emojiLayer?.y ?? 220) * sy);
        ctx.scale(emojiLayer?.scale ?? 1, emojiLayer?.scale ?? 1);
        ctx.rotate(((emojiLayer?.rotation ?? 0) * Math.PI) / 180);
        ctx.font = `700 ${Math.max(26, Math.round(outW * 0.08))}px -apple-system, BlinkMacSystemFont, "Apple Color Emoji", "Segoe UI Emoji", sans-serif`;
        ctx.fillText(emojiSticker, 0, 0);
        ctx.restore();
      }

      const freestyleLayers = dynamicLayers.filter((layer) => layer.kind === "mention" || layer.kind === "place" || layer.kind === "time");
      if (freestyleLayers.length > 0) {
        for (const layer of freestyleLayers) {
          ctx.save();
          ctx.translate(layer.x * sx, layer.y * sy);
          ctx.scale(layer.scale, layer.scale);
          ctx.rotate((layer.rotation * Math.PI) / 180);
          ctx.fillStyle = "rgba(0,0,0,0.48)";
          ctx.beginPath();
          ctx.roundRect(0, -4, Math.max(120, layer.label.length * 9), 34, 14);
          ctx.fill();
          ctx.fillStyle = "#FFFFFF";
          ctx.font = `700 ${Math.max(14, Math.round(outW * 0.028))}px -apple-system, BlinkMacSystemFont, "SF Pro Text", Inter, sans-serif`;
          ctx.fillText(layer.label, 10, 20);
          ctx.restore();
        }
      }

      const blob = await new Promise<Blob | null>((resolve) => out.toBlob((b) => resolve(b), "image/jpeg", 0.98));
      if (!blob) return null;
      return new File([blob], `story-baked-${Date.now()}.jpg`, { type: "image/jpeg" });
    } catch {
      return null;
    } finally {
      URL.revokeObjectURL(mediaUrl);
    }
  }, [
    dynamicLayers,
    emojiLayer,
    emojiSticker,
    musicLayer,
    selectedMusic,
    selectedSession,
    sessionLayer,
    textAlign,
    textBold,
    textColor,
    textFont,
    textOverlay,
    textPos.x,
    textPos.y,
    textRotation,
    textScale,
    textSize,
    textStyle,
  ]);

  // ═══════════════════════════════════════
  // STEP 0: ENTRY CHOICE
  // ═══════════════════════════════════════
  if (step === "entry") {
    return (
      <>
      <div className="relative flex min-h-0 flex-1 flex-col bg-background">
        <div className="fixed inset-x-0 top-0 z-30 border-b border-border bg-card pt-[env(safe-area-inset-top,0px)]">
          <div className="grid grid-cols-[72px_1fr_72px] items-center px-3 py-2.5">
            <button
              type="button"
              onClick={() => void requestExitWithDraftPrompt("back")}
              className="justify-self-start inline-flex items-center gap-1 rounded-full px-2 py-1 text-[15px] font-medium text-primary active:opacity-70"
            >
              <ArrowLeft className="h-4 w-4" />
              Retour
            </button>
            <h1 className="truncate px-2 text-center text-[17px] font-semibold text-foreground">Créer une story</h1>
            <div aria-hidden />
          </div>
        </div>
        <div className="flex min-h-0 flex-1 items-center justify-center px-5 pt-[calc(env(safe-area-inset-top,0px)+52px)]">
          <div className="w-full max-w-sm space-y-3">
            <button
              type="button"
              onClick={() => void onTakePhoto()}
              className="ios-card flex w-full items-center gap-3 rounded-2xl border border-border/60 bg-card px-4 py-4 text-left text-foreground transition active:scale-[0.98]"
            >
              <Camera className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm font-semibold">Prendre une photo</p>
                <p className="text-xs text-muted-foreground">Partager depuis la caméra</p>
              </div>
            </button>
            <button
              type="button"
              onClick={() => {
                setSourceMode("gallery");
                onPickGallery();
              }}
              className="ios-card flex w-full items-center gap-3 rounded-2xl border border-border/60 bg-card px-4 py-4 text-left text-foreground transition active:scale-[0.98]"
            >
              <Image className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm font-semibold">Choisir dans la galerie</p>
                <p className="text-xs text-muted-foreground">Image ou vidéo existante</p>
              </div>
            </button>
            <button
              type="button"
              onClick={() => setShowSessionPicker((v) => !v)}
              className="ios-card flex w-full items-center gap-3 rounded-2xl border border-border/60 bg-card px-4 py-4 text-left text-foreground transition active:scale-[0.98]"
            >
              <CalendarPlus className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm font-semibold">Partager une séance programmée</p>
                <p className="text-xs text-muted-foreground">Carte, pin et itinéraire</p>
              </div>
            </button>
            {hasDraft && (
              <button
                type="button"
                onClick={() => navigate("/drafts/stories")}
                className="ios-card flex w-full items-center gap-3 rounded-2xl border border-border/60 bg-card px-4 py-4 text-left text-foreground transition active:scale-[0.98]"
              >
                <RefreshCw className="h-5 w-5 text-primary" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">Reprendre un brouillon</p>
                  <p className="text-xs text-muted-foreground">Voir tous les brouillons</p>
                </div>
              </button>
            )}
          </div>
        </div>
        {showSessionPicker && (
          <div className="shrink-0 rounded-t-3xl bg-background px-4 pb-[max(16px,env(safe-area-inset-bottom,16px))] pt-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-semibold">Sélectionne une séance</p>
              <button type="button" className="text-xs text-muted-foreground" onClick={() => setShowSessionPicker(false)}>
                Fermer
              </button>
            </div>
            <div className="max-h-56 space-y-1 overflow-y-auto rounded-2xl border bg-card p-2">
              {sessions.length === 0 ? (
                <p className="px-3 py-4 text-center text-sm text-muted-foreground">Aucune séance disponible</p>
              ) : (
                sessions.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={async () => {
                      const generated = await createSessionStoryImage(s);
                      if (!generated) {
                        toast({ title: "Erreur", description: "Impossible de préparer la story de séance", variant: "destructive" });
                        return;
                      }
                      setSelectedSession(s);
                      setMediaFile(generated);
                      setShowSessionPicker(false);
                      setStep("edit");
                    }}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-secondary"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary">
                      <CalendarPlus className="h-3.5 w-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{s.title}</p>
                      <p className="truncate text-xs text-muted-foreground">{s.location_name}</p>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>
      {exitDraftDialog}
      </>
    );
  }

  // ═══════════════════════════════════════
  // STEP 1: CAPTURE (Camera / Gallery)
  // ═══════════════════════════════════════
  if (step === "capture") {
    return (
      <div className="relative flex min-h-0 flex-1 flex-col bg-black">
        {/* Top bar */}
        <div className="fixed inset-x-0 top-0 z-30 border-b border-border/70 bg-card/95 pt-[env(safe-area-inset-top,0px)] backdrop-blur">
          <div className="grid grid-cols-[72px_1fr_72px] items-center px-3 py-2.5">
            <button
              type="button"
              onClick={() => void requestExitWithDraftPrompt("back")}
              className="justify-self-start inline-flex items-center gap-1 rounded-full px-2 py-1 text-[15px] font-medium text-primary active:opacity-70"
            >
              <ArrowLeft className="h-4 w-4" />
              Retour
            </button>
            <h1 className="truncate px-2 text-center text-[17px] font-semibold text-foreground">Créer une story</h1>
            <div aria-hidden />
          </div>
        </div>

        {/* Camera viewfinder */}
        {sourceMode === "camera" ? (
          <div className="relative flex-1">
            <video
              ref={cameraRef}
              className={cn(
                "h-full w-full object-cover",
                facingMode === "user" && "scale-x-[-1]",
              )}
              playsInline
              muted
              autoPlay
            />
            {isRecording && (
              <div className="absolute left-1/2 top-20 -translate-x-1/2 rounded-full bg-destructive/90 px-4 py-1.5 text-sm font-semibold text-white">
                ● {recordSec}s
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-1 items-center justify-center">
            <button
              type="button"
              onClick={onPickGallery}
              className="flex flex-col items-center gap-3 text-white/70"
            >
              <div className="rounded-2xl border-2 border-dashed border-white/30 p-10">
                <Image className="h-12 w-12" />
              </div>
              <span className="text-sm font-medium">Choisir depuis la galerie</span>
            </button>
          </div>
        )}

        {/* Bottom controls */}
        <div className="absolute inset-x-0 bottom-0 z-10 pb-[max(24px,env(safe-area-inset-bottom,24px))]">
          {/* Mode selector (style bandeau type Stories) */}
          <div className="mb-6 flex flex-col items-center gap-1">
            <div className="flex items-center justify-center gap-6">
              {(["photo", "video", "boomerang"] as CaptureMode[]).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setCaptureMode(mode)}
                  className={`text-xs font-bold uppercase tracking-wider ${
                    captureMode === mode ? "text-white" : "text-white/50"
                  }`}
                >
                  {mode === "photo" ? "PHOTO" : mode === "video" ? "VIDEO" : "BOOMERANG"}
                </button>
              ))}
            </div>
            {sourceMode === "camera" && (
              <p className="text-[11px] font-medium text-white/45">
                {facingMode === "user" ? "Selfie" : "Caméra arrière"}
              </p>
            )}
          </div>

          {/* Capture + gallery toggle */}
          <div className="flex items-center justify-center gap-8">
            {/* Gallery toggle */}
            <button
              type="button"
              onClick={() => {
                if (sourceMode === "gallery") {
                  setSourceMode("camera");
                } else {
                  setSourceMode("gallery");
                  onPickGallery();
                }
              }}
              className="flex h-12 w-12 items-center justify-center rounded-xl border-2 border-white/30 bg-white/10 backdrop-blur-sm"
            >
              <Image className="h-5 w-5 text-white" />
            </button>

            {/* Shutter button */}
            {sourceMode === "camera" && (
              <button
                type="button"
                onClick={() => void onCapture()}
                className="relative flex h-[76px] w-[76px] items-center justify-center"
              >
                <div className="absolute inset-0 rounded-full border-[3px] border-white" />
                <div className={`h-[62px] w-[62px] rounded-full transition-all ${
                  isRecording
                    ? "scale-75 rounded-2xl bg-destructive"
                    : captureMode === "photo"
                      ? "bg-white"
                      : "bg-destructive"
                }`} />
              </button>
            )}

            {/* Inverser la caméra (comme Snapchat / Instagram) */}
            {sourceMode === "camera" ? (
              <button
                type="button"
                onClick={() => setFacingMode((m) => (m === "user" ? "environment" : "user"))}
                className="flex h-12 w-12 items-center justify-center rounded-xl border-2 border-white/30 bg-white/10 backdrop-blur-sm text-white transition-transform active:scale-95"
                aria-label={
                  facingMode === "user" ? "Passer à la caméra arrière" : "Passer à la caméra avant (selfie)"
                }
              >
                <RefreshCw className="h-5 w-5" />
              </button>
            ) : (
              <div className="h-12 w-12" />
            )}
          </div>
        </div>
      {exitDraftDialog}
      </div>
    );
  }

  // ═══════════════════════════════════════
  // STEP 2: EDIT & SHARE
  // ═══════════════════════════════════════
  const isVideo = mediaFile?.type.startsWith("video/");

  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-black">
      {/* Preview fullscreen */}
      <div
        className="relative flex-1 overflow-hidden"
        ref={drawHostRef}
        onClick={(e) => {
          if (showMusicPicker || showStickerPicker || showSessionPicker) {
            closeEditorMode();
            return;
          }
          if (editorMode === "text") {
            closeEditorMode();
            return;
          }
          if (editorMode !== "idle") return;
          setSelectedLayer(null);
          setSelectedDynamicLayerId(null);
        }}
        onTouchStart={onImageTouchStart}
        onTouchMove={onImageTouchMove}
        onTouchEnd={onImageTouchEnd}
        onTouchCancel={onImageTouchEnd}
      >
        {previewUrl && (
          isVideo ? (
            <video
              src={previewUrl}
              className="h-full w-full object-cover"
              style={{
                transform: `scale(${imageScale}) translate(${imageTranslate.x / imageScale}px, ${imageTranslate.y / imageScale}px)`,
                transition: imagePinchRef.current ? "none" : "transform 200ms ease-out",
              }}
              autoPlay loop muted playsInline
            />
          ) : (
            <img
              src={previewUrl}
              alt=""
              className="h-full w-full object-cover"
              style={{
                transform: `scale(${imageScale}) translate(${imageTranslate.x / imageScale}px, ${imageTranslate.y / imageScale}px)`,
                transition: imagePinchRef.current ? "none" : "transform 200ms ease-out",
              }}
            />
          )
        )}
        {editorMode !== "idle" && (
          <div className="pointer-events-none absolute inset-0 z-[6] bg-black/20 transition-opacity duration-200" />
        )}
        {textDragging && (
          <>
            {textSnapGuides.centerX && <div className="pointer-events-none absolute bottom-0 top-0 z-[11] w-px bg-white/50" style={{ left: "50%" }} />}
            {textSnapGuides.topThird && <div className="pointer-events-none absolute left-0 right-0 z-[11] h-px bg-white/45" style={{ top: "26%" }} />}
            {textSnapGuides.midY && <div className="pointer-events-none absolute left-0 right-0 z-[11] h-px bg-white/45" style={{ top: "43%" }} />}
            {textSnapGuides.bottomThird && <div className="pointer-events-none absolute left-0 right-0 z-[11] h-px bg-white/45" style={{ top: "62%" }} />}
          </>
        )}

        {/* Text overlay on preview (positioned at cursor) */}
        {(textOverlay || showTextInput) && (
          <div
            className="absolute"
            style={{
              zIndex: layerZ("text"),
              left: 0,
              top: 0,
              transform: `translate(${textPos.x}px, ${textPos.y}px)`,
              transition: textDragging || textPinching ? "none" : "transform 220ms cubic-bezier(0.22, 1, 0.36, 1)",
            }}
            onPointerDown={startTextDrag}
            onPointerMove={moveTextDrag}
            onPointerUp={endTextDrag}
            onPointerCancel={endTextDrag}
            onTouchStart={onTextTouchStart}
            onTouchMove={onTextTouchMove}
            onTouchEnd={onTextTouchEnd}
            onTouchCancel={onTextTouchEnd}
            onClick={(e) => {
              e.stopPropagation();
              setSelectedLayer("text");
              setSelectedDynamicLayerId(null);
              bringLayerToFront("text");
              setActiveTool("text");
              setEditorMode("text");
              setShowTextInput(true);
              window.setTimeout(() => textInputRef.current?.focus({ preventScroll: true }), 0);
              triggerHaptic("light");
            }}
          >
            {showTextInput ? (
              // While editing: NO scale/rotate on the input's parent so the caret is rendered correctly.
              <div className={cn(selectedLayer === "text" && "rounded ring-1 ring-white/40")}>
                <input
                  ref={textInputRef}
                  value={textOverlay}
                  onChange={(e) => setTextOverlay(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  onPointerDown={(e) => e.stopPropagation()}
                  placeholder=""
                  className="min-w-[2px] border-none bg-transparent p-0 text-white outline-none"
                  style={{
                    fontFamily: FONT_MAP[textFont],
                    fontWeight: textBold ? 800 : 600,
                    textAlign,
                    fontSize: `${Math.max(30, textSize)}px`,
                    color: textColor,
                    caretColor: textColor,
                  }}
                />
              </div>
            ) : (
              <div
                className={cn(selectedLayer === "text" && "ring-2 ring-white/60 rounded-xl")}
                style={{
                  transform: `scale(${textScale}) rotate(${textRotation}deg)`,
                  transformOrigin: "top left",
                }}
              >
                <div
                  className="px-1"
                  style={{
                    fontFamily: FONT_MAP[textFont],
                    fontWeight: textBold ? 700 : 500,
                    textAlign,
                    fontSize: `${textSize}px`,
                    color: textColor,
                    WebkitTextStroke: textStyle === "outline" ? "1px rgba(0,0,0,0.45)" : undefined,
                    textShadow: "0 1px 2px rgba(0,0,0,0.35)",
                  }}
                >
                  {textOverlay}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Music badge */}
        {selectedMusic && (
          <div
            className={cn(
              "absolute flex cursor-move items-center gap-2 rounded-full bg-black/50 px-3 py-1.5 backdrop-blur-sm",
              selectedDynamicLayerId === musicLayer?.id && "ring-2 ring-white/60"
            )}
            style={{
              zIndex: layerZ("music"),
              transform: `translate(${musicLayer?.x ?? 16}px, ${musicLayer?.y ?? 520}px) scale(${musicLayer?.scale ?? 1}) rotate(${musicLayer?.rotation ?? 0}deg)`,
              transformOrigin: "top left",
            }}
            onPointerDown={startMusicDrag}
            onPointerMove={moveMusicDrag}
            onPointerUp={endMusicDrag}
            onPointerCancel={endMusicDrag}
            onClick={(e) => {
              e.stopPropagation();
              if (musicLayer) {
                setSelectedDynamicLayerId(musicLayer.id);
                setDynamicLayers((prev) => [...prev.filter((l) => l.id !== musicLayer.id), musicLayer]);
              }
              setActiveTool("music");
            }}
          >
            <Music className="h-3.5 w-3.5 text-white" />
            <span className="text-xs font-medium text-white">{selectedMusic.title}</span>
          </div>
        )}

        {/* Session sticker on preview */}
        {selectedSession && (
          <div
            className={cn(
              "absolute cursor-move rounded-2xl border border-white/20 bg-white/90 p-3 shadow-lg dark:bg-black/80",
              selectedDynamicLayerId === sessionLayer?.id && "ring-2 ring-white/65"
            )}
            style={{
              zIndex: layerZ("session"),
              transform: `translate(${sessionLayer?.x ?? 20}px, ${sessionLayer?.y ?? 80}px) scale(${sessionLayer?.scale ?? 1}) rotate(${sessionLayer?.rotation ?? 0}deg)`,
              transformOrigin: "top left",
            }}
            onPointerDown={startDrag}
            onPointerMove={moveDrag}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
            onClick={(e) => {
              e.stopPropagation();
              if (sessionLayer) {
                setSelectedDynamicLayerId(sessionLayer.id);
                setDynamicLayers((prev) => [...prev.filter((l) => l.id !== sessionLayer.id), sessionLayer]);
              }
              setActiveTool("session");
            }}
          >
            <p className="text-xs font-bold text-foreground">{selectedSession.title}</p>
            <p className="text-[10px] text-muted-foreground">{selectedSession.location_name}</p>
            <div className="mt-1.5 flex items-center gap-1">
              <button type="button" className="rounded-full border p-0.5" onClick={(e) => { e.stopPropagation(); nudgeSelectedObjectScale(-0.1); }}>
                <Minus className="h-3 w-3" />
              </button>
              <button type="button" className="rounded-full border p-0.5" onClick={(e) => { e.stopPropagation(); nudgeSelectedObjectScale(0.1); }}>
                <Plus className="h-3 w-3" />
              </button>
            </div>
          </div>
        )}

        {emojiSticker && (
          <div
            className={cn("absolute cursor-move select-none", selectedDynamicLayerId === emojiLayer?.id && "ring-2 ring-white/65 rounded-2xl")}
            style={{
              zIndex: layerZ("emoji"),
              transform: `translate(${emojiLayer?.x ?? 120}px, ${emojiLayer?.y ?? 220}px) scale(${emojiLayer?.scale ?? 1}) rotate(${emojiLayer?.rotation ?? 0}deg)`,
              transformOrigin: "top left",
            }}
            onPointerDown={startEmojiDrag}
            onPointerMove={moveEmojiDrag}
            onPointerUp={endEmojiDrag}
            onPointerCancel={endEmojiDrag}
            onClick={(e) => {
              e.stopPropagation();
              if (emojiLayer) {
                setSelectedDynamicLayerId(emojiLayer.id);
                setDynamicLayers((prev) => [...prev.filter((l) => l.id !== emojiLayer.id), emojiLayer]);
              }
              setActiveTool("sticker");
            }}
          >
            <div className="rounded-2xl bg-black/35 px-3 py-2 text-3xl backdrop-blur-sm">{emojiSticker}</div>
          </div>
        )}

        {dynamicLayers
          .filter((layer) => layer.kind === "mention" || layer.kind === "place" || layer.kind === "time")
          .map((layer, i) => (
          <div
            key={layer.id}
            className={cn(
              "absolute cursor-move select-none rounded-2xl border border-white/20 bg-black/45 px-3 py-2 text-sm font-semibold text-white backdrop-blur-md",
              selectedDynamicLayerId === layer.id && "ring-2 ring-white/70"
            )}
            style={{
              zIndex: 40 + i,
              transform: `translate(${layer.x}px, ${layer.y}px) scale(${layer.scale}) rotate(${layer.rotation}deg)`,
              transformOrigin: "top left",
            }}
            onPointerDown={(e) => startDynamicDrag(layer.id, e)}
            onPointerMove={moveDynamicDrag}
            onPointerUp={endDynamicDrag}
            onPointerCancel={endDynamicDrag}
            onClick={(e) => {
              e.stopPropagation();
              setSelectedDynamicLayerId(layer.id);
              setSelectedLayer(null);
            }}
          >
            {layer.label}
          </div>
        ))}

        <canvas
          ref={drawCanvasRef}
          className={cn("absolute inset-0 z-[5]", drawMode ? "pointer-events-auto touch-none" : "pointer-events-none")}
          onPointerDown={(e) => {
            if (!drawMode) return;
            snapshotDrawState();
            drawingRef.current = true;
            (e.currentTarget as HTMLCanvasElement).setPointerCapture(e.pointerId);
            drawAtPointer(e);
          }}
          onPointerMove={(e) => {
            if (!drawMode || !drawingRef.current) return;
            drawAtPointer(e);
          }}
          onPointerUp={(e) => {
            if (!drawMode) return;
            drawingRef.current = false;
            lastPointRef.current = null;
            try { (e.currentTarget as HTMLCanvasElement).releasePointerCapture(e.pointerId); } catch {}
          }}
          onPointerCancel={() => {
            drawingRef.current = false;
            lastPointRef.current = null;
          }}
        />

        {editorMode === "idle" && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[18] bg-gradient-to-t from-black/55 via-black/25 to-transparent px-4 pb-[max(12px,env(safe-area-inset-bottom,12px))] pt-14">
            <div className="pointer-events-auto">
              <div className="relative">
                <Type className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/50" />
                <Input
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="Ajouter une légende..."
                  className="h-12 rounded-full border-white/20 bg-black/35 pl-10 text-[15px] text-white placeholder:text-white/60 backdrop-blur-md focus-visible:ring-white/30"
                />
              </div>
            </div>
          </div>
        )}

        {/* Top bar */}
        <div
          className={cn(
            "fixed inset-x-0 top-0 z-30 pt-[env(safe-area-inset-top,0px)] backdrop-blur-xl transition-colors duration-200",
            editorMode === "idle" ? "border-b border-white/15 bg-black/35" : "border-b border-white/10 bg-black/25"
          )}
        >
          <div className="grid grid-cols-[72px_1fr_72px] items-center px-3 py-2.5">
            <button
              type="button"
              onClick={() => void requestExitWithDraftPrompt("back")}
              className="justify-self-start inline-flex items-center gap-1 rounded-full px-2 py-1 text-[15px] font-medium text-white active:opacity-70"
            >
              <ArrowLeft className="h-4 w-4" />
              Retour
            </button>
            <h1 className="truncate px-2 text-center text-[17px] font-semibold text-white">Créer une story</h1>
            <Button
              type="button"
              disabled={sharing || (editorMode === "idle" && !mediaFile)}
              onClick={() => {
                if (editorMode !== "idle") {
                  closeEditorMode();
                  return;
                }
                void onShare();
              }}
              className="justify-self-end h-9 rounded-full bg-primary px-4 text-xs font-semibold text-primary-foreground shadow-md"
            >
              {sharing ? "Envoi..." : editorMode === "idle" ? "Partager" : "Terminé"}
            </Button>
          </div>
        </div>

        {/* Vertical tool rail (iOS map controls style) */}
        <div className="absolute right-4 top-[max(5.25rem,calc(env(safe-area-inset-top)+4.25rem))] z-20 flex flex-col gap-2">
          {[
            {
              id: "text",
              label: "Texte",
              icon: Type,
              active: editorMode === "text",
              onClick: () => {
                // iOS exige que .focus() (qui ouvre le clavier + curseur) soit appelé
                // dans la même tâche que le geste utilisateur. flushSync force le rendu
                // synchrone de l'input avant qu'on ne le focus.
                flushSync(() => {
                  setActiveTool("text");
                  setEditorMode("text");
                  placeTextEditorAtCenter();
                  setSelectedLayer("text");
                  setSelectedDynamicLayerId(null);
                  setShowTextInput(true);
                  setShowMusicPicker(false);
                  setShowSessionPicker(false);
                  setShowStickerPicker(false);
                  setDrawMode(false);
                });
                textInputRef.current?.focus({ preventScroll: true });
                triggerHaptic("light");
              },
            },
            {
              id: "music",
              label: "Musique",
              icon: Music,
              active: editorMode === "music" || !!selectedMusic,
              onClick: () => {
                setActiveTool("music");
                setEditorMode("music");
                setShowMusicPicker(true);
                setMusicSheetTab("forYou");
                setPendingMusic(selectedMusic);
                setShowTextInput(false);
                setShowSessionPicker(false);
                setShowStickerPicker(false);
                setDrawMode(false);
                triggerHaptic("light");
              },
            },
            {
              id: "session",
              label: "Séance",
              icon: CalendarPlus,
              active: showSessionPicker || !!selectedSession,
              onClick: () => {
                setActiveTool("session");
                setEditorMode("idle");
                setShowSessionPicker((v) => !v);
                setShowTextInput(false);
                setShowMusicPicker(false);
                setShowStickerPicker(false);
                setDrawMode(false);
                triggerHaptic("light");
              },
            },
            {
              id: "sticker",
              label: "Sticker",
              icon: Smile,
              active: editorMode === "sticker" || !!emojiSticker,
              onClick: () => {
                setActiveTool("sticker");
                setEditorMode("sticker");
                setShowStickerPicker(true);
                setShowTextInput(false);
                setShowMusicPicker(false);
                setShowSessionPicker(false);
                setDrawMode(false);
                triggerHaptic("light");
              },
            },
            {
              id: "draw",
              label: "Dessin",
              icon: Pencil,
              active: drawMode,
              onClick: () => {
                setActiveTool("draw");
                const next = !drawMode;
                setEditorMode(next ? "draw" : "idle");
                setDrawMode(next);
                setShowTextInput(false);
                setShowMusicPicker(false);
                setShowSessionPicker(false);
                setShowStickerPicker(false);
                triggerHaptic("light");
              },
            },
          ].map((tool) => (
            <button
              key={tool.id}
              type="button"
              onClick={tool.onClick}
              className={cn(
                "flex h-12 w-12 items-center justify-center rounded-2xl border border-white/20 bg-black/50 text-white shadow-lg backdrop-blur-xl transition-all duration-200 ease-out active:scale-[0.92]",
                tool.active && "bg-primary text-primary-foreground",
              )}
              aria-label={tool.label}
              title={tool.label}
            >
              <tool.icon className="h-5 w-5" />
            </button>
          ))}
        </div>
      </div>

      {/* Session picker */}
        {showSessionPicker && (
          <div onClick={(e) => e.stopPropagation()} className="absolute inset-x-3 bottom-[max(4.75rem,calc(env(safe-area-inset-bottom)+3.75rem))] z-30 max-h-40 space-y-1 overflow-y-auto rounded-2xl border bg-card p-2">
            {sessions.length === 0 ? (
              <p className="px-3 py-4 text-center text-sm text-muted-foreground">
                Aucune séance disponible
              </p>
            ) : (
              sessions.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => {
                    setSelectedSession(selectedSession?.id === s.id ? null : s);
                    setSelectedLayer(selectedSession?.id === s.id ? null : "session");
                    setShowSessionPicker(false);
                  }}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${
                    selectedSession?.id === s.id ? "bg-primary/10" : "hover:bg-secondary"
                  }`}
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary">
                    <CalendarPlus className="h-3.5 w-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{s.title}</p>
                    <p className="truncate text-xs text-muted-foreground">{s.location_name}</p>
                  </div>
                  {selectedSession?.id === s.id && <Check className="h-4 w-4 text-primary" />}
                </button>
              ))
            )}
          </div>
        )}

      {/* Emoji sticker picker */}
        {showStickerPicker && (
          <div onClick={(e) => e.stopPropagation()} className="absolute inset-x-3 bottom-[max(4.75rem,calc(env(safe-area-inset-bottom)+3.75rem))] z-30 rounded-2xl border bg-card p-3">
            <p className="mb-2 text-xs font-semibold text-muted-foreground">Choisir un sticker</p>
            <div className="mb-2 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  addDynamicLayer("mention");
                  setShowStickerPicker(false);
                }}
                className="rounded-full border px-2 py-1 text-xs"
              >
                + Mention
              </button>
              <button
                type="button"
                onClick={() => {
                  addDynamicLayer("place");
                  setShowStickerPicker(false);
                }}
                className="rounded-full border px-2 py-1 text-xs"
              >
                + Lieu
              </button>
              <button
                type="button"
                onClick={() => {
                  addDynamicLayer("time");
                  setShowStickerPicker(false);
                }}
                className="rounded-full border px-2 py-1 text-xs"
              >
                + Heure
              </button>
            </div>
            <div className="grid grid-cols-8 gap-2">
              {["🔥", "💪", "🏃", "🚴", "🏊", "🎯", "⚡", "👏", "❤️", "📍", "🏁", "🌟", "🎵", "📸", "😎", "✅"].map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => {
                    const toggling = emojiSticker === emoji;
                    setEmojiSticker(toggling ? null : emoji);
                    if (toggling) {
                      setSelectedLayer(null);
                      setSelectedDynamicLayerId(null);
                    } else {
                      setSelectedLayer(null);
                      const existing = dynamicLayers.find((l) => l.kind === "emoji");
                      if (existing) {
                        setSelectedDynamicLayerId(existing.id);
                      }
                    }
                    setShowStickerPicker(false);
                  }}
                  className={cn(
                    "rounded-lg border px-2 py-1.5 text-lg transition-colors",
                    emojiSticker === emoji ? "border-primary bg-primary/10" : "hover:bg-secondary",
                  )}
                >
                  {emoji}
                </button>
              ))}
            </div>
            {emojiSticker && (
              <div className="mt-2 flex items-center justify-end gap-2">
                <button type="button" className="rounded-full border p-1" onClick={() => nudgeSelectedObjectScale(-0.1)}>
                  <Minus className="h-3.5 w-3.5" />
                </button>
                <button type="button" className="rounded-full border p-1" onClick={() => nudgeSelectedObjectScale(0.1)}>
                  <Plus className="h-3.5 w-3.5" />
                </button>
                <button type="button" className="rounded-full border px-2 py-1 text-xs" onClick={() => setEmojiSticker(null)}>
                  Supprimer
                </button>
              </div>
            )}
          </div>
        )}

      {/* Draw controls */}
        {drawMode && (
          <div onClick={(e) => e.stopPropagation()} className="absolute inset-x-3 bottom-[max(4.75rem,calc(env(safe-area-inset-bottom)+3.75rem))] z-30 flex items-center justify-between rounded-2xl border bg-card p-3">
            <div className="flex items-center gap-2">
              {["#FFFFFF", "#2563EB", "#EF4444", "#22C55E", "#F59E0B"].map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setDrawColor(color)}
                  className={cn("h-6 w-6 rounded-full border", drawColor === color && "ring-2 ring-primary ring-offset-2")}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
            <div className="flex items-center gap-2">
              <button type="button" className="rounded-lg border px-2 py-1 text-xs" onClick={undoLastStroke}>
                Annuler
              </button>
              <button
                type="button"
                className="rounded-lg border px-2 py-1 text-xs"
                onClick={() => {
                  const canvas = drawCanvasRef.current;
                  const ctx = canvas?.getContext("2d");
                  if (canvas && ctx) {
                    drawHistoryRef.current = [];
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                  }
                }}
              >
                Effacer
              </button>
            </div>
          </div>
        )}

      {showTextInput && (
        <div
          className="absolute inset-x-3 z-40 flex items-center gap-2 rounded-xl border border-white/20 bg-black/55 px-2 py-2 text-white backdrop-blur-xl transition-all duration-250 ease-out animate-in slide-in-from-bottom-2"
          style={{ bottom: "max(12px, env(safe-area-inset-bottom, 12px))" }}
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            className={cn("rounded-lg border border-white/20 p-1.5", textStyle === "bubble" && "bg-primary text-primary-foreground")}
            onClick={() => {
              setTextStyle((prev) => (prev === "bubble" ? "plain" : "bubble"));
              triggerHaptic("light");
            }}
            aria-label="Style texte"
          >
            Aa
          </button>
          {["#FFFFFF", "#2563EB", "#EF4444", "#22C55E", "#F59E0B", "#F472B6"].map((c) => (
            <button key={c} type="button" onClick={() => { setTextColor(c); triggerHaptic("light"); }} className={cn("h-6 w-6 rounded-full border transition-transform active:scale-90", textColor === c && "ring-2 ring-white/80")} style={{ backgroundColor: c }} />
          ))}
          <button
            type="button"
            className="rounded-lg border border-white/20 p-1.5"
            onClick={() => {
              setTextAlign((prev) => (prev === "left" ? "center" : prev === "center" ? "right" : "left"));
              triggerHaptic("light");
            }}
            aria-label="Alignement"
          >
            {textAlign === "left" ? <AlignLeft className="h-4 w-4" /> : textAlign === "center" ? <AlignCenter className="h-4 w-4" /> : <AlignRight className="h-4 w-4" />}
          </button>
          <button
            type="button"
            className={cn("rounded-lg border border-white/20 px-2 text-sm", textBold && "bg-primary text-primary-foreground")}
            onClick={() => {
              setTextBold((v) => !v);
              triggerHaptic("light");
            }}
            aria-label="Gras"
          >
            B
          </button>
          <button
            type="button"
            className="rounded-lg border border-white/20 p-1"
            onClick={() => setTextSize((s) => Math.max(20, s - 2))}
          >
            <Minus className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            className="rounded-lg border border-white/20 p-1"
            onClick={() => setTextSize((s) => Math.min(72, s + 2))}
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            className="rounded-lg border border-white/20 px-2 py-1 text-xs"
            onClick={() => {
              setTextFont((prev) => (prev === "modern" ? "clean" : prev === "clean" ? "signature" : "modern"));
              triggerHaptic("light");
            }}
          >
            {textFont}
          </button>
        </div>
      )}

      {showMusicPicker && (
        <div onClick={(e) => e.stopPropagation()} className="absolute inset-x-0 bottom-0 z-40 rounded-t-3xl border-t border-white/15 bg-black/90 px-4 pb-[max(16px,env(safe-area-inset-bottom,16px))] pt-3 backdrop-blur-xl transition-all duration-300 ease-out animate-in slide-in-from-bottom-3">
          <div className="mx-auto mb-2 h-1 w-12 rounded-full bg-white/25" />
          <div className="mb-3 flex items-center justify-between">
            <p className="text-base font-semibold text-white">Musique</p>
            <button type="button" onClick={applyPendingMusic} className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-white">
              Mettre cette musique
            </button>
          </div>
          <div className="mb-2 flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-3">
            <Search className="h-3.5 w-3.5 text-white/60" />
            <Input
              value={musicQuery}
              onChange={(e) => setMusicQuery(e.target.value)}
              placeholder="Rechercher..."
              className="h-10 border-0 bg-transparent px-0 text-white placeholder:text-white/60"
            />
          </div>
          <div className="mb-2 flex items-center gap-2 text-xs text-white/80">
            {([
              { id: "forYou", label: "Pour vous" },
              { id: "popular", label: "Populaire" },
              { id: "original", label: "Audio d'origine" },
            ] as const).map((chip) => (
              <button
                key={chip.id}
                type="button"
                onClick={() => {
                  setMusicSheetTab(chip.id);
                  triggerHaptic("light");
                }}
                className={cn(
                  "rounded-full border px-2.5 py-1 transition-colors",
                  musicSheetTab === chip.id ? "border-white/70 bg-white/20 text-white" : "border-white/20 text-white/80"
                )}
              >
                {chip.label}
              </button>
            ))}
          </div>
          <div className="max-h-[52vh] space-y-1 overflow-y-auto pb-1">
            {visibleMusicTracks.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => {
                  const next = pendingMusic?.id === m.id ? null : m;
                  setPendingMusic(next);
                  if (next) void toggleTrackPreview(next);
                }}
                className={cn("flex w-full items-center justify-between rounded-xl px-2 py-2 text-left", pendingMusic?.id === m.id ? "bg-white/15" : "hover:bg-white/10")}
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-white/15" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-white">{m.title}</p>
                    <p className="truncate text-xs text-white/65">{m.artist}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-white/60">{m.duration}</span>
                  {pendingMusic?.id === m.id ? <Check className="h-4 w-4 text-white" /> : null}
                </div>
              </button>
            ))}
            {visibleMusicTracks.length === 0 ? (
              <p className="py-6 text-center text-xs text-white/65">Aucun son dans cet onglet.</p>
            ) : null}
          </div>
        </div>
      )}

      {selectedObjectType && editorMode === "idle" && (
          <div className="absolute inset-x-3 bottom-[max(4.75rem,calc(env(safe-area-inset-bottom)+3.75rem))] z-30 flex items-center gap-2 rounded-xl border border-white/20 bg-black/35 px-2 py-2 text-white">
            <button
              type="button"
              className="rounded-lg border border-white/20 px-2 py-1 text-xs"
              onClick={bringSelectedObjectToFront}
            >
              Premier plan
            </button>
            {selectedObjectType !== "text" && (
              <>
                <button
                  type="button"
                  className="rounded-lg border border-white/20 p-1"
                  onClick={() => nudgeSelectedObjectScale(-0.1)}
                >
                  <Minus className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  className="rounded-lg border border-white/20 p-1"
                  onClick={() => nudgeSelectedObjectScale(0.1)}
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  className="rounded-lg border border-white/20 px-2 py-1 text-xs"
                  onClick={() => nudgeSelectedObjectRotation(-8)}
                >
                  ↺
                </button>
                <button
                  type="button"
                  className="rounded-lg border border-white/20 px-2 py-1 text-xs"
                  onClick={() => nudgeSelectedObjectRotation(8)}
                >
                  ↻
                </button>
              </>
            )}
            <button
              type="button"
              className="ml-auto rounded-lg border border-white/20 p-1.5 text-white/85"
              onClick={deleteSelectedObject}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        )}
      {exitDraftDialog}
    </div>
  );
}
