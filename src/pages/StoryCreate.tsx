import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCamera } from "@/hooks/useCamera";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  X, Camera, Image, ChevronLeft, Send, Type, Music, Smile,
  Pencil, Plus, Minus, RefreshCw, Zap, Video, CalendarPlus, Check
} from "lucide-react";

type CaptureMode = "photo" | "video" | "boomerang";
type StoryStep = "capture" | "edit";

type ScheduledSession = {
  id: string;
  title: string;
  location_name: string;
  scheduled_at: string;
};

const MUSIC_LIBRARY = [
  { id: "1", title: "Motivation Run", artist: "SportBeats", duration: "0:30" },
  { id: "2", title: "Victory Lap", artist: "FitMusic", duration: "0:15" },
  { id: "3", title: "Trail Vibes", artist: "NatureSound", duration: "0:30" },
  { id: "4", title: "Speed Up", artist: "RunTempo", duration: "0:20" },
  { id: "5", title: "Chill Recovery", artist: "ZenRun", duration: "0:30" },
  { id: "6", title: "Race Day", artist: "SportBeats", duration: "0:15" },
  { id: "7", title: "Endurance", artist: "FitMusic", duration: "0:25" },
  { id: "8", title: "Final Sprint", artist: "RunTempo", duration: "0:10" },
];

export default function StoryCreate() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const { takePicture, checkPermissions, requestPermissions } = useCamera();

  // Flow
  const [step, setStep] = useState<StoryStep>("capture");
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
  const [selectedMusic, setSelectedMusic] = useState<typeof MUSIC_LIBRARY[0] | null>(null);
  const [showMusicPicker, setShowMusicPicker] = useState(false);
  const [caption, setCaption] = useState("");

  // Session
  const [sessions, setSessions] = useState<ScheduledSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<ScheduledSession | null>(null);
  const [showSessionPicker, setShowSessionPicker] = useState(false);
  const [stickerPos, setStickerPos] = useState({ x: 20, y: 80 });
  const [stickerScale, setStickerScale] = useState(1);
  const stickerDragRef = useRef<{ startX: number; startY: number; baseX: number; baseY: number } | null>(null);
  const [showStickerPicker, setShowStickerPicker] = useState(false);
  const [emojiSticker, setEmojiSticker] = useState<string | null>(null);
  const [emojiPos, setEmojiPos] = useState({ x: 120, y: 220 });
  const [emojiScale, setEmojiScale] = useState(1);
  const emojiDragRef = useRef<{ startX: number; startY: number; baseX: number; baseY: number } | null>(null);
  const [drawMode, setDrawMode] = useState(false);
  const [drawColor, setDrawColor] = useState("#FFFFFF");
  const drawCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawHostRef = useRef<HTMLDivElement | null>(null);
  const drawingRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const drawHistoryRef = useRef<ImageData[]>([]);

  // Share
  const [sharing, setSharing] = useState(false);

  const previewUrl = useMemo(() => (mediaFile ? URL.createObjectURL(mediaFile) : null), [mediaFile]);
  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);

  // ── Camera stream ──
  useEffect(() => {
    if (step !== "capture" || sourceMode !== "camera") return;
    let cancelled = false;
    void (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: facingMode } },
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
    const { data } = await supabase
      .from("sessions")
      .select("id, title, location_name, scheduled_at")
      .eq("organizer_id", user.id)
      .gt("scheduled_at", new Date().toISOString())
      .order("scheduled_at", { ascending: true })
      .limit(30);
    setSessions((data ?? []) as ScheduledSession[]);
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
        0.92,
      );
    });
  }, [facingMode]);

  // ── Actions ──
  const onCapture = async () => {
    if (captureMode === "photo") {
      const fromStream = await capturePhotoFromStream();
      const file = fromStream ?? (await takePicture({ facing: facingMode }));
      if (file) {
        setMediaFile(file);
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
    const rec = opts ? new MediaRecorder(stream, opts) : new MediaRecorder(stream);
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

  const onPickGallery = () => {
    const input = document.createElement("input");
    input.type = "file"; input.accept = "image/*,video/*";
    input.onchange = () => {
      const f = input.files?.[0];
      if (f) { setMediaFile(f); setStep("edit"); }
    };
    input.click();
  };

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

  const onShare = async () => {
    if (!user?.id || !mediaFile) return;
    setSharing(true);
    let createdStoryId: string | null = null;
    let uploadedStoragePath: string | null = null;
    try {
      const mediaType = mediaFile.type.startsWith("video/")
        ? (captureMode === "boomerang" ? "boomerang" : "video")
        : "image";

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

      const ext = mediaFile.name.split(".").pop() || (mediaType === "image" ? "jpg" : "mp4");
      const path = `${user.id}/${story.id}-${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from("story-media").upload(path, mediaFile, { upsert: false });
      if (uploadError) throw uploadError;
      uploadedStoragePath = path;

      const { data: pub } = supabase.storage.from("story-media").getPublicUrl(path);
      const { error: mediaError } = await (supabase as any).from("story_media").insert({
        story_id: story.id,
        media_url: pub.publicUrl,
        media_type: mediaType,
        metadata: {
          text_overlay: textOverlay || null,
          music: selectedMusic ? { id: selectedMusic.id, title: selectedMusic.title } : null,
          sticker: selectedSession
            ? { session_id: selectedSession.id, x: stickerPos.x, y: stickerPos.y, scale: stickerScale }
            : null,
        },
      });
      if (mediaError) throw mediaError;

      toast({ title: "Story partagée ✨", description: "Ta story est en ligne." });
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
    if (!selectedSession) return;
    stickerDragRef.current = { startX: e.clientX, startY: e.clientY, baseX: stickerPos.x, baseY: stickerPos.y };
    (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
  };
  const moveDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!stickerDragRef.current) return;
    setStickerPos({
      x: Math.max(0, stickerDragRef.current.baseX + e.clientX - stickerDragRef.current.startX),
      y: Math.max(0, stickerDragRef.current.baseY + e.clientY - stickerDragRef.current.startY),
    });
  };
  const endDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    if (stickerDragRef.current) {
      stickerDragRef.current = null;
      try { (e.currentTarget as HTMLDivElement).releasePointerCapture(e.pointerId); } catch {}
    }
  };

  const startEmojiDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!emojiSticker) return;
    emojiDragRef.current = { startX: e.clientX, startY: e.clientY, baseX: emojiPos.x, baseY: emojiPos.y };
    (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
  };
  const moveEmojiDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!emojiDragRef.current) return;
    setEmojiPos({
      x: Math.max(0, emojiDragRef.current.baseX + e.clientX - emojiDragRef.current.startX),
      y: Math.max(0, emojiDragRef.current.baseY + e.clientY - emojiDragRef.current.startY),
    });
  };
  const endEmojiDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    if (emojiDragRef.current) {
      emojiDragRef.current = null;
      try { (e.currentTarget as HTMLDivElement).releasePointerCapture(e.pointerId); } catch {}
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

  // ═══════════════════════════════════════
  // STEP 1: CAPTURE (Camera / Gallery)
  // ═══════════════════════════════════════
  if (step === "capture") {
    return (
      <div className="fixed inset-0 z-[180] flex flex-col bg-black">
        {/* Top bar */}
        <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between px-4 pt-[calc(env(safe-area-inset-top,0px)+12px)]">
          <button type="button" onClick={() => navigate("/feed")} className="rounded-full bg-black/40 p-2 text-white backdrop-blur-sm">
            <X className="h-5 w-5" />
          </button>
          <div className="h-9 w-9" aria-hidden />
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
      </div>
    );
  }

  // ═══════════════════════════════════════
  // STEP 2: EDIT & SHARE
  // ═══════════════════════════════════════
  const isVideo = mediaFile?.type.startsWith("video/");

  return (
    <div className="fixed inset-0 z-[180] flex flex-col bg-black">
      {/* Preview fullscreen */}
      <div className="relative flex-1" ref={drawHostRef}>
        {previewUrl && (
          isVideo ? (
            <video src={previewUrl} className="h-full w-full object-cover" autoPlay loop muted playsInline />
          ) : (
            <img src={previewUrl} alt="" className="h-full w-full object-cover" />
          )
        )}

        {/* Text overlay on preview */}
        {textOverlay && (
          <div className="absolute inset-x-0 top-1/3 flex justify-center">
            <div className="rounded-lg bg-black/50 px-4 py-2 text-lg font-bold text-white backdrop-blur-sm">
              {textOverlay}
            </div>
          </div>
        )}

        {/* Music badge */}
        {selectedMusic && (
          <div className="absolute bottom-20 left-4 flex items-center gap-2 rounded-full bg-black/50 px-3 py-1.5 backdrop-blur-sm">
            <Music className="h-3.5 w-3.5 text-white" />
            <span className="text-xs font-medium text-white">{selectedMusic.title}</span>
          </div>
        )}

        {/* Session sticker on preview */}
        {selectedSession && (
          <div
            className="absolute cursor-move rounded-2xl border border-white/20 bg-white/90 p-3 shadow-lg dark:bg-black/80"
            style={{
              transform: `translate(${stickerPos.x}px, ${stickerPos.y}px) scale(${stickerScale})`,
              transformOrigin: "top left",
            }}
            onPointerDown={startDrag}
            onPointerMove={moveDrag}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
          >
            <p className="text-xs font-bold text-foreground">{selectedSession.title}</p>
            <p className="text-[10px] text-muted-foreground">{selectedSession.location_name}</p>
            <div className="mt-1.5 flex items-center gap-1">
              <button type="button" className="rounded-full border p-0.5" onClick={(e) => { e.stopPropagation(); setStickerScale((s) => Math.max(0.7, +(s - 0.1).toFixed(2))); }}>
                <Minus className="h-3 w-3" />
              </button>
              <button type="button" className="rounded-full border p-0.5" onClick={(e) => { e.stopPropagation(); setStickerScale((s) => Math.min(1.8, +(s + 0.1).toFixed(2))); }}>
                <Plus className="h-3 w-3" />
              </button>
            </div>
          </div>
        )}

        {emojiSticker && (
          <div
            className="absolute cursor-move select-none"
            style={{
              transform: `translate(${emojiPos.x}px, ${emojiPos.y}px) scale(${emojiScale})`,
              transformOrigin: "top left",
            }}
            onPointerDown={startEmojiDrag}
            onPointerMove={moveEmojiDrag}
            onPointerUp={endEmojiDrag}
            onPointerCancel={endEmojiDrag}
          >
            <div className="rounded-2xl bg-black/35 px-3 py-2 text-3xl backdrop-blur-sm">{emojiSticker}</div>
          </div>
        )}

        <canvas
          ref={drawCanvasRef}
          className={cn("absolute inset-0 z-[5]", drawMode ? "pointer-events-auto touch-none" : "pointer-events-none")}
          onPointerDown={(e) => {
            if (!drawMode) return;
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

        {/* Top bar */}
        <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between px-4 pt-[calc(env(safe-area-inset-top,0px)+12px)]">
          <button
            type="button"
            onClick={() => { setMediaFile(null); setStep("capture"); setTextOverlay(""); setSelectedMusic(null); setSelectedSession(null); }}
            className="rounded-full bg-black/40 p-2 text-white backdrop-blur-sm"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
        </div>

        {/* Vertical tool rail (iOS map controls style) */}
        <div className="absolute right-4 top-[max(5.25rem,calc(env(safe-area-inset-top)+4.25rem))] z-20 flex flex-col gap-2">
          {[
            {
              id: "text",
              label: "Texte",
              icon: Type,
              active: showTextInput || !!textOverlay,
              onClick: () => {
                setShowTextInput((v) => !v);
                setShowMusicPicker(false);
                setShowSessionPicker(false);
                setShowStickerPicker(false);
              },
            },
            {
              id: "music",
              label: "Musique",
              icon: Music,
              active: showMusicPicker || !!selectedMusic,
              onClick: () => {
                setShowMusicPicker((v) => !v);
                setShowTextInput(false);
                setShowSessionPicker(false);
                setShowStickerPicker(false);
              },
            },
            {
              id: "session",
              label: "Séance",
              icon: CalendarPlus,
              active: showSessionPicker || !!selectedSession,
              onClick: () => {
                setShowSessionPicker((v) => !v);
                setShowTextInput(false);
                setShowMusicPicker(false);
                setShowStickerPicker(false);
              },
            },
            {
              id: "sticker",
              label: "Sticker",
              icon: Smile,
              active: showStickerPicker || !!emojiSticker,
              onClick: () => {
                setShowStickerPicker((v) => !v);
                setShowTextInput(false);
                setShowMusicPicker(false);
                setShowSessionPicker(false);
              },
            },
            {
              id: "draw",
              label: "Dessin",
              icon: Pencil,
              active: drawMode,
              onClick: () => {
                setDrawMode((v) => !v);
                setShowTextInput(false);
                setShowMusicPicker(false);
                setShowSessionPicker(false);
                setShowStickerPicker(false);
              },
            },
          ].map((tool) => (
            <button
              key={tool.id}
              type="button"
              onClick={tool.onClick}
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-[10px] border border-white/20 bg-black/45 text-white shadow-lg backdrop-blur-sm transition-transform active:scale-[0.96]",
                tool.active && "bg-primary text-primary-foreground",
              )}
              aria-label={tool.label}
              title={tool.label}
            >
              <tool.icon className="h-4 w-4" />
            </button>
          ))}
        </div>
      </div>

      {/* Bottom editing panel */}
      <div className="shrink-0 rounded-t-3xl bg-background px-4 pb-[max(16px,env(safe-area-inset-bottom,16px))] pt-4">
        {/* Text input */}
        {showTextInput && (
          <div className="mb-3">
            <Input
              value={textOverlay}
              onChange={(e) => setTextOverlay(e.target.value)}
              placeholder="Ajouter du texte..."
              className="rounded-xl"
              autoFocus
            />
          </div>
        )}

        {/* Music picker */}
        {showMusicPicker && (
          <div className="mb-3 max-h-44 space-y-1 overflow-y-auto rounded-2xl border bg-card p-2">
            {MUSIC_LIBRARY.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => { setSelectedMusic(selectedMusic?.id === m.id ? null : m); }}
                className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left transition-colors ${
                  selectedMusic?.id === m.id ? "bg-primary/10" : "hover:bg-secondary"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`flex h-8 w-8 items-center justify-center rounded-full ${
                    selectedMusic?.id === m.id ? "bg-primary text-primary-foreground" : "bg-secondary"
                  }`}>
                    <Music className="h-3.5 w-3.5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{m.title}</p>
                    <p className="text-xs text-muted-foreground">{m.artist}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">{m.duration}</span>
                  {selectedMusic?.id === m.id && <Check className="h-4 w-4 text-primary" />}
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Session picker */}
        {showSessionPicker && (
          <div className="mb-3 max-h-40 space-y-1 overflow-y-auto rounded-2xl border bg-card p-2">
            {sessions.length === 0 ? (
              <p className="px-3 py-4 text-center text-sm text-muted-foreground">
                Aucune séance à venir
              </p>
            ) : (
              sessions.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => {
                    setSelectedSession(selectedSession?.id === s.id ? null : s);
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
          <div className="mb-3 rounded-2xl border bg-card p-3">
            <p className="mb-2 text-xs font-semibold text-muted-foreground">Choisir un sticker</p>
            <div className="grid grid-cols-8 gap-2">
              {["🔥", "💪", "🏃", "🚴", "🏊", "🎯", "⚡", "👏", "❤️", "📍", "🏁", "🌟", "🎵", "📸", "😎", "✅"].map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => {
                    setEmojiSticker(emojiSticker === emoji ? null : emoji);
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
                <button type="button" className="rounded-full border p-1" onClick={() => setEmojiScale((s) => Math.max(0.7, +(s - 0.1).toFixed(2)))}>
                  <Minus className="h-3.5 w-3.5" />
                </button>
                <button type="button" className="rounded-full border p-1" onClick={() => setEmojiScale((s) => Math.min(2, +(s + 0.1).toFixed(2)))}>
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
          <div className="mb-3 flex items-center justify-between rounded-2xl border bg-card p-3">
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
            <button
              type="button"
              className="rounded-lg border px-2 py-1 text-xs"
              onClick={() => {
                const canvas = drawCanvasRef.current;
                const ctx = canvas?.getContext("2d");
                if (canvas && ctx) {
                  ctx.clearRect(0, 0, canvas.width, canvas.height);
                }
              }}
            >
              Effacer
            </button>
          </div>
        )}

        {/* Caption + Share */}
        <div className="flex items-center gap-3">
          <Input
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Ajouter une description..."
            className="flex-1 rounded-xl"
          />
          <Button
            type="button"
            disabled={!mediaFile || sharing}
            onClick={() => void onShare()}
            className="h-11 shrink-0 gap-2 rounded-xl px-6"
          >
            {sharing ? (
              <span className="text-sm">Envoi...</span>
            ) : (
              <>
                <Send className="h-4 w-4" />
                <span className="text-sm font-semibold">Story</span>
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
