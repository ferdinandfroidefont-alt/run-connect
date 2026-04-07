import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCamera } from "@/hooks/useCamera";
import { useToast } from "@/hooks/use-toast";
import { Camera, Search, X, Settings, Music, Type, Smile, Pencil, Plus, Minus } from "lucide-react";

type CreateTab = "gallery" | "camera" | "privacy";
type CameraMode = "normal" | "video" | "boomerang";
type PrivacyMode = "public" | "friends" | "custom";

type ScheduledSession = {
  id: string;
  title: string;
  location_name: string;
  scheduled_at: string;
};

export default function StoryCreate() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const { takePicture, checkPermissions, requestPermissions } = useCamera();

  const [activeTab, setActiveTab] = useState<CreateTab>("gallery");
  const [cameraMode, setCameraMode] = useState<CameraMode>("normal");
  const [privacy, setPrivacy] = useState<PrivacyMode>("friends");
  const [hideFromRaw, setHideFromRaw] = useState("");
  const [shareToInstagram, setShareToInstagram] = useState(false);
  const [multipleSelect, setMultipleSelect] = useState(false);
  const [mediaPool, setMediaPool] = useState<File[]>([]);
  const [selectedMediaIndex, setSelectedMediaIndex] = useState(0);
  const [sessions, setSessions] = useState<ScheduledSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<ScheduledSession | null>(null);
  const [showSessionPicker, setShowSessionPicker] = useState(false);
  const [caption, setCaption] = useState("");
  const [textOverlay, setTextOverlay] = useState("");
  const [photosDenied, setPhotosDenied] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [stickerPos, setStickerPos] = useState({ x: 20, y: 20 });
  const [stickerScale, setStickerScale] = useState(1);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const stickerDragRef = useRef<{ startX: number; startY: number; baseX: number; baseY: number } | null>(null);
  const cameraPreviewRef = useRef<HTMLVideoElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaChunksRef = useRef<BlobPart[]>([]);

  const selectedMedia = mediaPool[selectedMediaIndex] ?? null;
  const mediaPreviewUrls = useMemo(() => mediaPool.map((f) => URL.createObjectURL(f)), [mediaPool]);
  const selectedPreviewUrl = mediaPreviewUrls[selectedMediaIndex] ?? null;

  useEffect(() => {
    return () => {
      mediaPreviewUrls.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [mediaPreviewUrls]);

  useEffect(() => {
    if (activeTab !== "camera") return;
    let cancelled = false;
    void (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: cameraMode !== "normal" });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        mediaStreamRef.current = stream;
        if (cameraPreviewRef.current) {
          cameraPreviewRef.current.srcObject = stream;
          await cameraPreviewRef.current.play().catch(() => undefined);
        }
      } catch {
        // ignore: devices may block preview, capture fallback still works
      }
    })();
    return () => {
      cancelled = true;
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
      }
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((t) => t.stop());
        mediaStreamRef.current = null;
      }
      setIsRecording(false);
      setRecordingSeconds(0);
    };
  }, [activeTab, cameraMode]);

  useEffect(() => {
    if (!isRecording) return;
    const id = window.setInterval(() => setRecordingSeconds((s) => s + 1), 1000);
    return () => window.clearInterval(id);
  }, [isRecording]);

  const loadSessions = useCallback(async () => {
    if (!user?.id) return;
    const nowIso = new Date().toISOString();
    const { data } = await supabase
      .from("sessions")
      .select("id, title, location_name, scheduled_at")
      .eq("organizer_id", user.id)
      .gt("scheduled_at", nowIso)
      .order("scheduled_at", { ascending: true })
      .limit(30);
    setSessions((data ?? []) as ScheduledSession[]);
  }, [user?.id]);

  useEffect(() => {
    void loadSessions();
    void (async () => {
      const perms = await checkPermissions();
      setPhotosDenied(perms.photos === "denied");
    })();
  }, [checkPermissions, loadSessions]);

  const onPickFromGallery = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*,video/*";
    input.multiple = multipleSelect;
    input.onchange = () => {
      const files = Array.from(input.files ?? []);
      if (!files.length) return;
      setMediaPool((prev) => (multipleSelect ? [...prev, ...files] : files));
      setSelectedMediaIndex(0);
    };
    input.click();
  };

  const onCapture = async () => {
    if (cameraMode === "normal") {
      const file = await takePicture();
      if (!file) return;
      setMediaPool([file]);
      setSelectedMediaIndex(0);
      return;
    }
    const stream = mediaStreamRef.current;
    if (!stream) {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "video/*";
      input.capture = "environment";
      input.onchange = () => {
        const file = input.files?.[0];
        if (!file) return;
        setMediaPool([file]);
        setSelectedMediaIndex(0);
      };
      input.click();
      return;
    }
    if (isRecording) {
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
      return;
    }
    mediaChunksRef.current = [];
    let recorderOptions: MediaRecorderOptions | undefined;
    for (const mime of ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"]) {
      if (MediaRecorder.isTypeSupported(mime)) {
        recorderOptions = { mimeType: mime };
        break;
      }
    }
    const recorder = recorderOptions ? new MediaRecorder(stream, recorderOptions) : new MediaRecorder(stream);
    mediaRecorderRef.current = recorder;
    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) mediaChunksRef.current.push(e.data);
    };
    recorder.onstop = () => {
      const blobType = recorder.mimeType || "video/webm";
      const blob = new Blob(mediaChunksRef.current, { type: blobType });
      const ext = blobType.includes("mp4") ? "mp4" : "webm";
      const file = new File([blob], `${cameraMode}-${Date.now()}.${ext}`, { type: blobType });
      setMediaPool([file]);
      setSelectedMediaIndex(0);
      setRecordingSeconds(0);
    };
    recorder.start();
    setIsRecording(true);
    if (cameraMode === "boomerang") {
      window.setTimeout(() => {
        if (recorder.state !== "inactive") {
          recorder.stop();
          setIsRecording(false);
        }
      }, 1800);
    }
  };

  const onShare = async () => {
    if (!user?.id || !selectedMedia) return;
    setSharing(true);
    try {
      const mediaType = selectedMedia.type.startsWith("video/")
        ? (cameraMode === "boomerang" ? "boomerang" : "video")
        : "image";
      const uuidRe = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/;
      const hideFrom = hideFromRaw
        .split(",")
        .map((x) => x.trim())
        .filter((x) => uuidRe.test(x));

      const { data: story, error: storyError } = await (supabase as any)
        .from("session_stories")
        .insert({
          author_id: user.id,
          session_id: selectedSession?.id ?? null,
          caption: caption || null,
          privacy,
          hide_from: hideFrom,
        })
        .select("id")
        .single();
      if (storyError || !story) throw storyError || new Error("Story creation failed");

      const ext = selectedMedia.name.split(".").pop() || (mediaType === "image" ? "jpg" : "mp4");
      const path = `${user.id}/${story.id}-${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from("story-media").upload(path, selectedMedia, {
        upsert: false,
      });
      if (uploadError) throw uploadError;
      const { data: mediaPublic } = supabase.storage.from("story-media").getPublicUrl(path);
      const { error: mediaError } = await (supabase as any).from("story_media").insert({
        story_id: story.id,
        media_url: mediaPublic.publicUrl,
        media_type: mediaType,
        metadata: {
          text_overlay: textOverlay || null,
          sticker: selectedSession
            ? { session_id: selectedSession.id, x: stickerPos.x, y: stickerPos.y, scale: stickerScale }
            : null,
          share_to_instagram: shareToInstagram,
        },
      });
      if (mediaError) throw mediaError;

      toast({ title: "Story partagee", description: "Ta story est en ligne." });
      navigate("/feed", { state: { refreshStories: true } });
    } catch (error: any) {
      toast({ title: "Erreur", description: error?.message || "Impossible de partager.", variant: "destructive" });
    } finally {
      setSharing(false);
    }
  };

  const startStickerDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!selectedSession) return;
    stickerDragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      baseX: stickerPos.x,
      baseY: stickerPos.y,
    };
    (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
  };
  const moveStickerDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!stickerDragRef.current) return;
    const dx = e.clientX - stickerDragRef.current.startX;
    const dy = e.clientY - stickerDragRef.current.startY;
    setStickerPos({
      x: Math.max(0, stickerDragRef.current.baseX + dx),
      y: Math.max(0, stickerDragRef.current.baseY + dy),
    });
  };
  const endStickerDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    if (stickerDragRef.current) {
      stickerDragRef.current = null;
      try {
        (e.currentTarget as HTMLDivElement).releasePointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
    }
  };

  return (
    <div className="fixed inset-0 z-[180] flex flex-col bg-background">
      <div className="border-b bg-card pt-[env(safe-area-inset-top,0px)]">
        <div className="flex items-center justify-between px-4 py-3">
          <button type="button" onClick={() => navigate("/feed")} className="text-muted-foreground">
            <X className="h-5 w-5" />
          </button>
          <h1 className="text-[17px] font-semibold">Creer une story</h1>
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => setActiveTab("camera")} className="text-muted-foreground">
              <Camera className="h-5 w-5" />
            </button>
            <button type="button" onClick={() => setActiveTab("privacy")} className="text-muted-foreground">
              <Settings className="h-5 w-5" />
            </button>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-1 px-3 pb-3">
          {[
            { id: "gallery", label: "Galerie" },
            { id: "camera", label: "Camera" },
            { id: "privacy", label: "Confidentialite" },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as CreateTab)}
              className={`min-h-[38px] rounded-ios-md text-xs font-semibold ${activeTab === tab.id ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {activeTab === "gallery" && (
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="flex items-center justify-between px-4 py-3">
              <button type="button" onClick={onPickFromGallery} className="inline-flex items-center gap-1 text-sm text-primary">
                <Search className="h-4 w-4" />
                Rechercher
              </button>
              <button type="button" onClick={() => setMultipleSelect((v) => !v)} className="text-sm text-primary">
                {multipleSelect ? "Selection multiplee" : "Selection multiple"}
              </button>
            </div>
            {photosDenied ? (
              <div className="m-4 rounded-ios-lg border p-5 text-center">
                <p className="text-base font-semibold">Autoriser l'acces aux photos</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Pour partager une story, autorise l'acces a ta galerie.
                </p>
                <Button
                  className="mt-4"
                  onClick={async () => {
                    const result = await requestPermissions();
                    setPhotosDenied(result.photos === "denied");
                  }}
                >
                  Autoriser
                </Button>
              </div>
            ) : (
              <div className="grid flex-1 grid-cols-3 gap-1 overflow-y-auto px-2 pb-2">
                {mediaPool.length === 0 ? (
                  <button
                    type="button"
                    onClick={onPickFromGallery}
                    className="col-span-3 m-4 rounded-ios-lg border border-dashed p-10 text-center text-sm text-muted-foreground"
                  >
                    Ouvre ta pellicule pour selectionner un media.
                  </button>
                ) : (
                  mediaPool.map((file, idx) => (
                    <button
                      key={`${file.name}-${idx}`}
                      type="button"
                      onClick={() => setSelectedMediaIndex(idx)}
                      className={`aspect-square overflow-hidden rounded-ios-md border ${idx === selectedMediaIndex ? "border-primary" : "border-border"}`}
                    >
                      {file.type.startsWith("video/") ? (
                        <video src={mediaPreviewUrls[idx]} className="h-full w-full object-cover" muted />
                      ) : (
                        <img src={mediaPreviewUrls[idx]} alt="" className="h-full w-full object-cover" />
                      )}
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === "camera" && (
          <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-4">
            <div className="mb-4 h-44 w-full max-w-sm overflow-hidden rounded-ios-lg border bg-black">
              <video ref={cameraPreviewRef} className="h-full w-full object-cover" playsInline muted autoPlay />
            </div>
            <div className="mb-8 text-sm text-muted-foreground">Mode {cameraMode.toUpperCase()}</div>
            <button
              type="button"
              onClick={() => void onCapture()}
              className={`mb-3 flex h-20 w-20 items-center justify-center rounded-full border-4 border-white text-primary-foreground ${isRecording ? "bg-destructive" : "bg-primary"}`}
            >
              <Camera className="h-8 w-8" />
            </button>
            {cameraMode !== "normal" && (
              <p className="mb-5 text-xs text-muted-foreground">
                {isRecording ? `Enregistrement ${recordingSeconds}s` : cameraMode === "boomerang" ? "Capture courte auto." : "Appuie pour demarrer/arreter."}
              </p>
            )}
            <div className="grid w-full max-w-sm grid-cols-3 gap-2">
              {(["normal", "video", "boomerang"] as CameraMode[]).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setCameraMode(mode)}
                  className={`min-h-[38px] rounded-ios-md text-xs font-semibold ${cameraMode === mode ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}
                >
                  {mode === "normal" ? "NORMAL" : mode === "video" ? "VIDEO" : "BOOMERANG"}
                </button>
              ))}
            </div>
          </div>
        )}

        {activeTab === "privacy" && (
          <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-4">
            {(["public", "friends", "custom"] as PrivacyMode[]).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPrivacy(p)}
                className={`rounded-ios-md border px-4 py-3 text-left ${privacy === p ? "border-primary bg-primary/5" : "border-border"}`}
              >
                <p className="font-medium">{p === "public" ? "Public" : p === "friends" ? "Amis" : "Personnalise"}</p>
              </button>
            ))}
            <div className="rounded-ios-md border p-3">
              <p className="mb-2 text-sm font-medium">Masquer a... (ids utilisateur, separes par virgules)</p>
              <Input value={hideFromRaw} onChange={(e) => setHideFromRaw(e.target.value)} placeholder="uuid1, uuid2" />
            </div>
            <div className="rounded-ios-md border p-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">Partager Instagram</p>
                <Switch checked={shareToInstagram} onCheckedChange={setShareToInstagram} />
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="border-t bg-card px-4 pb-[max(14px,env(safe-area-inset-bottom,14px))] pt-3">
        <div className="mb-3 rounded-ios-md border p-3">
          <p className="mb-2 text-sm font-medium">Ajouter une seance</p>
          <Button type="button" variant="outline" onClick={() => setShowSessionPicker((v) => !v)}>
            {selectedSession ? "Changer la seance" : "Ajouter une seance"}
          </Button>
          {sessions.length === 0 && (
            <p className="mt-2 text-xs text-muted-foreground">Aucune seance programmee. Cree-en une pour la partager.</p>
          )}
          {showSessionPicker && sessions.length > 0 && (
            <div className="mt-2 max-h-32 space-y-2 overflow-auto">
              {sessions.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => {
                    setSelectedSession(s);
                    setShowSessionPicker(false);
                  }}
                  className="w-full rounded-ios-md border px-3 py-2 text-left"
                >
                  <p className="text-sm font-semibold">{s.title}</p>
                  <p className="text-xs text-muted-foreground">{s.location_name}</p>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="mb-3 rounded-ios-md border p-3">
          <p className="mb-2 text-sm font-medium">Edition</p>
          <div className="mb-2 flex flex-wrap gap-2">
            <Button type="button" size="sm" variant="outline"><Type className="mr-1 h-4 w-4" />Texte</Button>
            <Button type="button" size="sm" variant="outline"><Music className="mr-1 h-4 w-4" />Musique</Button>
            <Button type="button" size="sm" variant="outline"><Smile className="mr-1 h-4 w-4" />Sticker</Button>
            <Button type="button" size="sm" variant="outline"><Pencil className="mr-1 h-4 w-4" />Dessin</Button>
          </div>
          <Input value={textOverlay} onChange={(e) => setTextOverlay(e.target.value)} placeholder="Ajouter du texte..." />
          <Input value={caption} onChange={(e) => setCaption(e.target.value)} className="mt-2" placeholder="Description optionnelle..." />
        </div>

        <div className="mb-3 rounded-ios-md border p-2">
          <div className="relative aspect-[9/16] w-full overflow-hidden rounded-ios-md bg-secondary">
            {selectedPreviewUrl ? (
              selectedMedia?.type.startsWith("video/") ? (
                <video src={selectedPreviewUrl} className="h-full w-full object-cover" controls />
              ) : (
                <img src={selectedPreviewUrl} alt="" className="h-full w-full object-cover" />
              )
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Apercu story</div>
            )}
            {textOverlay && (
              <div className="absolute left-3 top-3 rounded bg-black/50 px-2 py-1 text-sm text-white">
                {textOverlay}
              </div>
            )}
            {selectedSession && (
              <div
                className="absolute cursor-move rounded-ios-md border bg-background/90 p-2 shadow"
                style={{
                  transform: `translate(${stickerPos.x}px, ${stickerPos.y}px) scale(${stickerScale})`,
                  transformOrigin: "top left",
                }}
                onPointerDown={startStickerDrag}
                onPointerMove={moveStickerDrag}
                onPointerUp={endStickerDrag}
                onPointerCancel={endStickerDrag}
              >
                <p className="text-xs font-semibold">Seance: {selectedSession.title}</p>
                <p className="text-[10px] text-muted-foreground">{selectedSession.location_name}</p>
                <div className="mt-1 flex items-center gap-1">
                  <button
                    type="button"
                    className="rounded border p-0.5"
                    onClick={(e) => {
                      e.stopPropagation();
                      setStickerScale((s) => Math.max(0.7, Number((s - 0.1).toFixed(2))));
                    }}
                  >
                    <Minus className="h-3 w-3" />
                  </button>
                  <button
                    type="button"
                    className="rounded border p-0.5"
                    onClick={(e) => {
                      e.stopPropagation();
                      setStickerScale((s) => Math.min(1.8, Number((s + 0.1).toFixed(2))));
                    }}
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <Button type="button" className="w-full" disabled={!selectedMedia || sharing} onClick={() => void onShare()}>
          {sharing ? "Partage..." : "Partager la story"}
        </Button>
      </div>
    </div>
  );
}
