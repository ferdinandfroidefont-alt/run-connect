import { useState, useEffect, useRef, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { Users, UserCheck, Save, MapPin, ChevronLeft, ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import { useSendNotification } from "@/hooks/useSendNotification";
import { RCCEditor } from "./RCCEditor";
import { RCCBlocksPreview } from "./RCCBlocksPreview";
import { CoachingTemplatesDialog } from "./CoachingTemplatesDialog";
import {
  rccToSessionBlocks,
  mergeParsedBlocksByIndex,
  parseRCC,
  type RCCResult,
  type ParsedBlock,
} from "@/lib/rccParser";
import {
  blockRpeToJson,
  normalizeBlockRpeLength,
  resolveSessionRpeForInsert,
  stripPerBlockRpeFromSessionBlocks,
} from "@/lib/sessionBlockRpe";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  inferPaletteFromSegment,
  rebuildDurationOnlyMinutes,
  rebuildIntervalDistanceSegment,
  rebuildIntervalTimeSegment,
  rebuildSteadyLikeSegment,
  removeRccSegment,
  replaceRccSegment,
  splitRccSegments,
} from "@/lib/coachingCreateSessionRcc";
import {
  COACHING_ACTION_BLUE,
  COACHING_PAGE_BG,
  CoachingSchemaChart,
  BlockPreviewBars,
  COACHING_BLOCK_PALETTE,
  COACHING_SEANCE_SPORTS,
  type PaletteBlockId,
} from "./create-session/CoachingCreateSessionSchema";
import {
  DistanceWheelPicker,
  PaceWheelPicker,
  TimeWheelPicker,
  formatPaceWheel,
  paceColonToWheel,
  wheelToColon,
  type DistanceWheelValue,
  type PaceWheelValue,
  type TimeWheelValue,
} from "./create-session/CoachingWheelPickers";

interface CreateCoachingSessionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  clubId: string;
  onCreated: () => void;
  preselectedDate?: Date | null;
}

interface ClubMember {
  user_id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
}

type DraggingState = { type: PaletteBlockId; x: number; y: number; over: boolean } | null;

type PickerState =
  | { kind: "time"; title: string; value: TimeWheelValue; onConfirm: (v: TimeWheelValue) => void }
  | { kind: "pace"; title: string; value: PaceWheelValue; onConfirm: (v: PaceWheelValue) => void }
  | { kind: "distance"; title: string; value: DistanceWheelValue; onConfirm: (v: DistanceWheelValue) => void };

function parseSingleSegment(seg: string): ParsedBlock | null {
  const r = parseRCC(seg);
  if (r.errors.length === 0 && r.blocks.length === 1) return r.blocks[0];
  return null;
}

function durationToTimeWheel(minutes: number): TimeWheelValue {
  const m = Math.max(0, Math.round(minutes));
  return { h: Math.floor(m / 60), m: m % 60, s: 0 };
}

function timeWheelToTotalMinutes(v: TimeWheelValue): number {
  return v.h * 60 + v.m + v.s / 60;
}

function metersToDistanceWheel(meters: number): DistanceWheelValue {
  const m = Math.max(0, Math.round(meters));
  return { km: Math.floor(m / 1000), m: m % 1000 };
}

function FieldBox({
  label,
  value,
  suffix,
  onClick,
  placeholder = "—",
}: {
  label: string;
  value: string | number | undefined | null;
  suffix?: string;
  onClick?: () => void;
  placeholder?: string;
}) {
  const display = value !== undefined && value !== null && value !== "" ? String(value) : "";
  return (
    <div>
      <p className="mb-2 text-center text-[12px] font-extrabold tracking-wider text-[#8E8E93]">{label}</p>
      <button
        type="button"
        onClick={onClick}
        disabled={!onClick}
        className="w-full rounded-2xl border-2 border-[#E5E5EA] bg-white py-3 text-center active:bg-[#F8F8F8] disabled:opacity-55"
      >
        <span className={`text-[18px] font-extrabold ${display ? "text-[#0A0F1F]" : "text-[#C7C7CC]"}`}>
          {display || placeholder}
        </span>
      </button>
      {suffix ? <p className="mt-1.5 text-center text-[12px] text-[#8E8E93]">{suffix}</p> : null}
    </div>
  );
}

export const CreateCoachingSessionDialog = ({
  isOpen,
  onClose,
  clubId,
  onCreated,
  preselectedDate,
}: CreateCoachingSessionDialogProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { sendPushNotification } = useSendNotification();
  const [loading, setLoading] = useState(false);

  const [activityType, setActivityType] = useState("course");
  const [objective, setObjective] = useState("");
  const [rccCode, setRccCode] = useState("");
  const [parsedResult, setParsedResult] = useState<RCCResult>({ blocks: [], errors: [] });
  const [parsedBlocks, setParsedBlocks] = useState<ParsedBlock[]>([]);
  const [blockRpe, setBlockRpe] = useState<number[]>([]);
  const [coachNotes, setCoachNotes] = useState("");
  const [locationName, setLocationName] = useState("");
  const [sendMode, setSendMode] = useState<"club" | "individual">("club");
  const [members, setMembers] = useState<ClubMember[]>([]);
  const [selectedAthletes, setSelectedAthletes] = useState<Set<string>>(new Set());
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const [showTemplates, setShowTemplates] = useState(false);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [templateName, setTemplateName] = useState("");

  const [tab, setTab] = useState<"construire" | "modeles">("construire");
  const [dragging, setDragging] = useState<DraggingState>(null);
  const schemaRef = useRef<HTMLDivElement>(null);
  const [expandedSeg, setExpandedSeg] = useState<Set<number>>(new Set());
  const [picker, setPicker] = useState<PickerState | null>(null);

  useEffect(() => {
    if (isOpen && clubId) loadMembers();
  }, [isOpen, clubId]);

  useEffect(() => {
    if (!isOpen) resetForm();
  }, [isOpen]);

  useEffect(() => {
    if (!dragging) return;

    const onMove = (x: number, y: number) => {
      setDragging((d) => {
        if (!d) return d;
        const over = isOverSchema(x, y);
        return { ...d, x, y, over };
      });
    };
    const onMouseMove = (e: MouseEvent) => onMove(e.clientX, e.clientY);
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 0) return;
      e.preventDefault();
      onMove(e.touches[0].clientX, e.touches[0].clientY);
    };
    const finish = () => {
      setDragging((d) => {
        if (d?.over) {
          const meta = COACHING_BLOCK_PALETTE.find((b) => b.id === d.type);
          if (meta) {
            setTimeout(() => {
              setRccCode((prev) => (prev.trim() ? `${prev}, ${meta.rccInsert}` : meta.rccInsert));
            }, 0);
          }
        }
        return null;
      });
    };

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", finish);
    document.addEventListener("touchmove", onTouchMove, { passive: false });
    document.addEventListener("touchend", finish);
    document.addEventListener("touchcancel", finish);

    return () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", finish);
      document.removeEventListener("touchmove", onTouchMove);
      document.removeEventListener("touchend", finish);
      document.removeEventListener("touchcancel", finish);
    };
  }, [dragging?.type]);

  const isOverSchema = (x: number, y: number) => {
    if (!schemaRef.current) return false;
    const r = schemaRef.current.getBoundingClientRect();
    return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
  };

  const startDrag = (type: PaletteBlockId, x: number, y: number) => {
    setDragging({ type, x, y, over: false });
  };

  const loadMembers = async () => {
    setLoadingMembers(true);
    try {
      const { data: memberIds, error: gmError } = await supabase
        .from("group_members")
        .select("user_id")
        .eq("conversation_id", clubId)
        .neq("user_id", user?.id || "");

      if (gmError) throw gmError;

      if (!memberIds?.length) {
        setMembers([]);
        return;
      }

      const { data: profiles, error: profError } = await supabase
        .from("profiles")
        .select("user_id, username, display_name, avatar_url")
        .in(
          "user_id",
          memberIds.map((m) => m.user_id)
        );
      if (profError) throw profError;
      setMembers(profiles || []);
    } catch (e: unknown) {
      console.error(e);
      setMembers([]);
      toast({
        title: "Membres du club",
        description: e instanceof Error ? e.message : "Impossible de charger la liste des membres.",
        variant: "destructive",
      });
    } finally {
      setLoadingMembers(false);
    }
  };

  const toggleAthlete = (userId: string) => {
    setSelectedAthletes((prev) => {
      const next = new Set(prev);
      next.has(userId) ? next.delete(userId) : next.add(userId);
      return next;
    });
  };

  const handleSaveTemplate = async () => {
    if (!templateName.trim() || !rccCode.trim() || !user) return;
    setSavingTemplate(true);
    try {
      const { error } = await supabase.from("coaching_templates").insert({
        coach_id: user.id,
        name: templateName.trim(),
        rcc_code: rccCode.trim(),
        activity_type: activityType,
        objective: objective.trim() || null,
      } as never);
      if (error) throw error;
      toast({ title: "Template sauvegardé !" });
      setTemplateName("");
    } catch (e: unknown) {
      toast({
        title: "Erreur",
        description: e instanceof Error ? e.message : "Échec",
        variant: "destructive",
      });
    } finally {
      setSavingTemplate(false);
    }
  };

  const handleSubmit = async () => {
    if (!objective.trim() || !rccCode.trim() || !user) return;
    if (sendMode === "club" && members.length === 0) {
      toast({
        title: "Aucun destinataire",
        description:
          "Ce club n’a pas d’autres membres à notifier. Invitez des athlètes ou choisissez le mode individuel.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const targetIds = sendMode === "individual" ? Array.from(selectedAthletes) : [];
      const rawBlocks = parsedBlocks.length > 0 ? rccToSessionBlocks(parsedBlocks) : null;
      const sessionBlocks = rawBlocks ? stripPerBlockRpeFromSessionBlocks(rawBlocks) : null;
      const title = `${objective.trim()}`;
      const effectiveBlockRpe = normalizeBlockRpeLength(blockRpe, parsedBlocks.length);
      const resolvedRpe = resolveSessionRpeForInsert(null, rawBlocks, effectiveBlockRpe);

      const { data: session, error } = await supabase
        .from("coaching_sessions")
        .insert({
          club_id: clubId,
          coach_id: user.id,
          title,
          description: null,
          coach_notes: coachNotes.trim() || null,
          scheduled_at: (preselectedDate || new Date()).toISOString(),
          activity_type: activityType,
          session_blocks: sessionBlocks as never,
          status: "planned",
          send_mode: sendMode,
          target_athletes: targetIds,
          rcc_code: rccCode.trim(),
          objective: objective.trim(),
          default_location_name: locationName.trim() || null,
          rpe: resolvedRpe,
          rpe_phases: blockRpeToJson(effectiveBlockRpe),
        } as never)
        .select("id")
        .single();

      if (error) throw error;

      const recipientIds =
        sendMode === "individual" && selectedAthletes.size > 0 ? targetIds : members.map((m) => m.user_id);

      if (recipientIds.length > 0) {
        const { error: partError } = await supabase.from("coaching_participations").insert(
          recipientIds.map((userId) => ({
            coaching_session_id: session.id,
            user_id: userId,
            status: "sent",
          }))
        );
        if (partError) throw partError;
      }

      const { data: coachProfile } = await supabase
        .from("profiles")
        .select("display_name, username")
        .eq("user_id", user.id)
        .single();
      const coachName = coachProfile?.display_name || coachProfile?.username || "Coach";

      for (const athleteId of recipientIds) {
        await supabase.from("notifications").insert({
          user_id: athleteId,
          type: "coaching_session",
          title: `Nouvelle séance de ${coachName}`,
          message: title,
          data: { club_id: clubId, coaching_session_id: session.id },
        });
        sendPushNotification(athleteId, `Nouvelle séance de ${coachName}`, title, "coaching_session");
      }

      toast({ title: "Séance envoyée !", description: `${recipientIds.length} athlète(s) notifié(s)` });
      onCreated();
      onClose();
    } catch (error: unknown) {
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Erreur",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setActivityType("course");
    setObjective("");
    setRccCode("");
    setParsedResult({ blocks: [], errors: [] });
    setParsedBlocks([]);
    setBlockRpe([]);
    setCoachNotes("");
    setLocationName("");
    setSendMode("club");
    setSelectedAthletes(new Set());
    setSearchQuery("");
    setTemplateName("");
    setTab("construire");
    setDragging(null);
    setExpandedSeg(new Set());
    setPicker(null);
  };

  const filteredMembers = members.filter(
    (m) =>
      !searchQuery || (m.display_name || m.username || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleParsedChange = (result: RCCResult) => {
    setParsedResult(result);
    setParsedBlocks((prev) => {
      const merged = mergeParsedBlocksByIndex(result.blocks, prev);
      setBlockRpe((br) => normalizeBlockRpeLength(br, merged.length));
      return merged;
    });
  };

  const canSubmit =
    objective.trim().length > 0 &&
    rccCode.trim().length > 0 &&
    parsedResult.errors.length === 0 &&
    (sendMode === "club" ? members.length > 0 : selectedAthletes.size > 0);

  const dateLabel = preselectedDate
    ? format(preselectedDate, "EEE d MMM", { locale: fr })
    : format(new Date(), "EEE d MMM", { locale: fr });

  const segments = useMemo(() => splitRccSegments(rccCode), [rccCode]);
  const chartBlocks = useMemo(
    () =>
      segments.map((seg, i) => ({
        id: `seg-${i}-${seg.slice(0, 12)}`,
        type: inferPaletteFromSegment(seg),
      })),
    [segments]
  );

  const draggedMeta = dragging ? COACHING_BLOCK_PALETTE.find((bt) => bt.id === dragging.type) : null;

  const toggleSeg = (i: number) => {
    setExpandedSeg((prev) => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });
  };

  const removeSeg = (i: number) => {
    setRccCode((c) => removeRccSegment(c, i));
    setExpandedSeg((prev) => {
      const next = new Set<number>();
      prev.forEach((idx) => {
        if (idx < i) next.add(idx);
        else if (idx > i) next.add(idx - 1);
      });
      return next;
    });
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent fullScreen hideCloseButton className="flex min-h-0 flex-col gap-0 overflow-hidden p-0">
          <div
            className="flex h-full min-h-0 flex-col overflow-hidden"
            style={{
              background: COACHING_PAGE_BG,
              fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif",
            }}
          >
            {/* HEADER maquette */}
            <div
              className="flex shrink-0 items-center gap-2 px-4 pb-3 pt-[max(12px,var(--safe-area-top))]"
              style={{ background: "white", borderBottom: "1px solid #E5E5EA" }}
            >
              <button type="button" onClick={onClose} className="flex flex-shrink-0 items-center gap-0">
                <ChevronLeft className="h-6 w-6" color={COACHING_ACTION_BLUE} strokeWidth={2.6} />
                <span className="text-[17px] font-semibold" style={{ color: COACHING_ACTION_BLUE }}>
                  Retour
                </span>
              </button>
              <p className="min-w-0 flex-1 truncate px-1 text-center text-[17px] font-bold text-[#0A0F1F]">
                Créer une séance
              </p>
              <div className="flex flex-shrink-0 flex-col items-end">
                <button type="button" onClick={onClose}>
                  <span className="text-[17px] font-bold" style={{ color: COACHING_ACTION_BLUE }}>
                    OK
                  </span>
                </button>
                <span className="max-w-[92px] truncate text-[11px] font-medium capitalize text-[#8E8E93]">
                  {dateLabel}
                </span>
              </div>
            </div>

            {/* TABS */}
            <div
              className="flex shrink-0 gap-3 px-5 pb-3 pt-3"
              style={{ background: "white", borderBottom: "1px solid #E5E5EA" }}
            >
              {(
                [
                  { id: "construire" as const, label: "Construire" },
                  { id: "modeles" as const, label: "Modèles" },
                ] as const
              ).map((t) => {
                const active = tab === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => {
                      setTab(t.id);
                      if (t.id === "modeles") setShowTemplates(true);
                    }}
                    className="flex-1 rounded-full py-2 text-[16px] font-bold transition-colors"
                    style={{
                      background: active ? COACHING_ACTION_BLUE : "white",
                      color: active ? "white" : "#0A0F1F",
                      border: active ? "none" : "1.5px solid #E5E5EA",
                    }}
                  >
                    {t.label}
                  </button>
                );
              })}
            </div>

            <div
              className="min-h-0 flex-1 overflow-y-auto px-5 pt-5"
              style={{
                WebkitOverflowScrolling: "touch",
                paddingBottom: "calc(120px + var(--safe-area-bottom))",
                overflowY: dragging ? "hidden" : "auto",
                background: COACHING_PAGE_BG,
              }}
            >
              {tab === "modeles" ? (
                <div className="rounded-[20px] bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
                  <p className="text-[20px] font-extrabold text-[#0A0F1F]">Bibliothèque</p>
                  <p className="mt-2 text-[13px] leading-snug text-[#8E8E93]">
                    Ouvre tes modèles sauvegardés pour remplir automatiquement le schéma RCC et le nom.
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowTemplates(true)}
                    className="mt-5 w-full rounded-2xl py-3.5 text-[16px] font-bold text-white"
                    style={{
                      background: COACHING_ACTION_BLUE,
                      boxShadow: "0 2px 8px rgba(0, 122, 255, 0.25)",
                    }}
                  >
                    Voir les modèles
                  </button>
                </div>
              ) : (
                <>
                  <p className="mb-2 text-[15px] font-extrabold tracking-wide text-[#8E8E93]">Nom de la séance</p>
                  <input
                    value={objective}
                    onChange={(e) => setObjective(e.target.value)}
                    placeholder="Ex. Fractionné piste"
                    className="w-full rounded-2xl px-4 py-3 text-[16px] text-[#0A0F1F] placeholder:text-[#8E8E93] outline-none"
                    style={{ boxShadow: "0 1px 2px rgba(0,0,0,0.04)", background: "white" }}
                  />

                  <div className="mt-5 grid grid-cols-4 gap-3">
                    {COACHING_SEANCE_SPORTS.map((sp) => {
                      const sel = activityType === sp.activityValue;
                      return (
                        <button
                          key={sp.id}
                          type="button"
                          onClick={() => setActivityType(sp.activityValue)}
                          className="flex aspect-square items-center justify-center rounded-2xl text-[36px] transition-transform active:scale-95"
                          style={{
                            background: sp.bg,
                            boxShadow: sel ? `0 0 0 3px white, 0 0 0 5px ${COACHING_ACTION_BLUE}` : "0 1px 2px rgba(0,0,0,0.04)",
                          }}
                          aria-label={sp.id}
                        >
                          {sp.emoji}
                        </button>
                      );
                    })}
                  </div>

                  <p className="mb-3 mt-7 text-[20px] font-extrabold text-[#0A0F1F]">Schéma de séance</p>
                  <CoachingSchemaChart ref={schemaRef} blocks={chartBlocks} dragOver={dragging?.over} />

                  <p className="mb-1 mt-7 text-[20px] font-extrabold text-[#0A0F1F]">Ajouter un bloc</p>
                  <p className="mb-3 text-[13px] text-[#8E8E93]">Glisse un bloc sur le schéma ↑</p>
                  <div className="grid grid-cols-4 gap-2.5">
                    {COACHING_BLOCK_PALETTE.map((bt) => {
                      const isBeingDragged = dragging?.type === bt.id;
                      return (
                        <div
                          key={bt.id}
                          role="button"
                          tabIndex={0}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            startDrag(bt.id, e.clientX, e.clientY);
                          }}
                          onTouchStart={(e) => {
                            if (e.touches.length === 0) return;
                            startDrag(bt.id, e.touches[0].clientX, e.touches[0].clientY);
                          }}
                          className="select-none"
                          style={{
                            background: "white",
                            borderRadius: 14,
                            padding: "12px 8px 10px 8px",
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            gap: 6,
                            border: "1px solid #E5E5EA",
                            cursor: "grab",
                            opacity: isBeingDragged ? 0.35 : 1,
                            transform: isBeingDragged ? "scale(0.94)" : "scale(1)",
                            transition: "opacity 0.18s ease-out, transform 0.18s ease-out",
                            touchAction: "none",
                          }}
                        >
                          <BlockPreviewBars type={bt.id} />
                          <span
                            style={{
                              fontSize: 12,
                              fontWeight: 700,
                              color: "#0A0F1F",
                              letterSpacing: "-0.01em",
                            }}
                          >
                            {bt.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {segments.length > 0 && (
                    <div className="mt-5 space-y-3">
                      {segments.map((seg, idx) => {
                        const parsed = parseSingleSegment(seg);
                        const paletteType = inferPaletteFromSegment(seg);
                        const meta = COACHING_BLOCK_PALETTE.find((b) => b.id === paletteType);
                        const accentColor = meta?.color ?? "#8E8E93";
                        const expanded = expandedSeg.has(idx);

                        let title = meta?.label ?? "Bloc";
                        let badge: string | null = null;
                        let subtitle = "";

                        if (parsed?.type === "interval") {
                          title = "Intervalle";
                          badge = `${parsed.repetitions ?? "?"}×`;
                          subtitle =
                            parsed.distance != null
                              ? `${parsed.distance} m @ ${parsed.pace ?? "—"}`
                              : `${parsed.duration ?? "?"}' @ ${parsed.pace ?? "—"}`;
                        } else if (parsed && (parsed.type === "steady" || parsed.type === "warmup" || parsed.type === "cooldown")) {
                          title = parsed.type === "warmup" ? "Échauffement" : parsed.type === "cooldown" ? "Retour au calme" : "Bloc continu";
                          badge = "1";
                          subtitle = parsed.pace ? `${parsed.duration ?? "?"} min · ${parsed.pace}` : `${parsed.duration ?? "?"} min`;
                        } else if (!parsed) {
                          title = "Bloc";
                          subtitle = seg.length > 48 ? `${seg.slice(0, 48)}…` : seg;
                        }

                        const replaceAt = (nextSeg: string) => setRccCode((c) => replaceRccSegment(c, idx, nextSeg));

                        return (
                          <div
                            key={`card-${idx}-${seg.slice(0, 24)}`}
                            className="relative overflow-hidden rounded-2xl bg-white"
                            style={{ boxShadow: "0 1px 2px rgba(0,0,0,0.04)" }}
                          >
                            <div className="absolute bottom-0 left-0 top-0 w-1" style={{ background: accentColor }} />

                            <div className="flex items-center gap-3 px-4 py-3 pl-5">
                              <div
                                className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full text-[18px] font-extrabold text-white"
                                style={{ background: accentColor }}
                              >
                                {meta?.emoji ?? "◆"}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="text-[18px] font-extrabold text-[#0A0F1F]">{title}</span>
                                  {badge ? (
                                    <span
                                      className="rounded-full px-2.5 py-0.5 text-[12px] font-bold"
                                      style={{ background: `${accentColor}22`, color: accentColor }}
                                    >
                                      {badge}
                                    </span>
                                  ) : null}
                                </div>
                                {subtitle ? <p className="mt-0.5 truncate text-[13px] text-[#8E8E93]">{subtitle}</p> : null}
                              </div>
                              <button type="button" onClick={() => toggleSeg(idx)} className="p-1">
                                {expanded ? (
                                  <ChevronUp className="h-5 w-5 text-[#8E8E93]" />
                                ) : (
                                  <ChevronDown className="h-5 w-5 text-[#8E8E93]" />
                                )}
                              </button>
                              <button type="button" onClick={() => removeSeg(idx)} className="p-1" aria-label="Supprimer le bloc">
                                <Trash2 className="h-5 w-5 text-[#8E8E93]" strokeWidth={2} />
                              </button>
                            </div>

                            {expanded && (
                              <div className="px-4 pb-4 pl-5">
                                {!parsed ? (
                                  <p className="text-[13px] leading-snug text-[#8E8E93]">
                                    Ce segment utilise un format RCC avancé. Modifie-le dans l’éditeur en bas de page.
                                  </p>
                                ) : parsed.type === "interval" ? (
                                  <div>
                                    <div className="mt-2 grid grid-cols-3 gap-2">
                                      <FieldBox
                                        label="RÉPÉTITIONS"
                                        value={parsed.repetitions ?? 1}
                                        onClick={() => {
                                          const next = Math.min(30, (parsed.repetitions ?? 1) + 1);
                                          if (parsed.distance != null && parsed.pace) {
                                            replaceAt(
                                              rebuildIntervalDistanceSegment(
                                                next,
                                                parsed.distance,
                                                parsed.pace,
                                                parsed.recoveryDuration,
                                                parsed.recoveryType ?? "trot"
                                              )
                                            );
                                          } else if (parsed.duration != null && parsed.pace) {
                                            replaceAt(
                                              rebuildIntervalTimeSegment(
                                                next,
                                                parsed.duration,
                                                parsed.pace,
                                                parsed.recoveryDuration,
                                                parsed.recoveryType ?? "trot"
                                              )
                                            );
                                          }
                                        }}
                                      />
                                      <FieldBox label="RÉCUP (min)" value={parsed.recoveryDuration != null ? Math.round(parsed.recoveryDuration / 60) : "—"} suffix="" />
                                      <FieldBox label="TYPE RÉCUP" value={parsed.recoveryType ?? "trot"} />
                                    </div>
                                    <div className="mt-3 grid grid-cols-3 gap-2">
                                      {parsed.distance != null ? (
                                        <FieldBox
                                          label="DISTANCE"
                                          value={`${parsed.distance} m`}
                                          onClick={() =>
                                            setPicker({
                                              kind: "distance",
                                              title: "Distance",
                                              value: metersToDistanceWheel(parsed.distance!),
                                              onConfirm: (v: DistanceWheelValue) => {
                                                const meters = v.km * 1000 + v.m;
                                                if (parsed.pace) {
                                                  replaceAt(
                                                    rebuildIntervalDistanceSegment(
                                                      parsed.repetitions ?? 1,
                                                      meters,
                                                      parsed.pace,
                                                      parsed.recoveryDuration,
                                                      parsed.recoveryType ?? "trot"
                                                    )
                                                  );
                                                }
                                                setPicker(null);
                                              },
                                            })
                                          }
                                        />
                                      ) : (
                                        <FieldBox
                                          label="TEMPS (min)"
                                          value={parsed.duration ?? "—"}
                                          onClick={() =>
                                            setPicker({
                                              kind: "time",
                                              title: "Durée effort",
                                              value: durationToTimeWheel(parsed.duration ?? 0),
                                              onConfirm: (tv: TimeWheelValue) => {
                                                const mins = Math.max(1, Math.round(timeWheelToTotalMinutes(tv)));
                                                if (parsed.pace) {
                                                  replaceAt(
                                                    rebuildIntervalTimeSegment(
                                                      parsed.repetitions ?? 1,
                                                      mins,
                                                      parsed.pace,
                                                      parsed.recoveryDuration,
                                                      parsed.recoveryType ?? "trot"
                                                    )
                                                  );
                                                }
                                                setPicker(null);
                                              },
                                            })
                                          }
                                        />
                                      )}
                                      <FieldBox
                                        label="ALLURE"
                                        value={parsed.pace ? formatPaceWheel(paceColonToWheel(parsed.pace)) : "—"}
                                        suffix="/km"
                                        onClick={() =>
                                          setPicker({
                                            kind: "pace",
                                            title: "Allure",
                                            value: paceColonToWheel(parsed.pace || "5:00"),
                                            onConfirm: (pv: PaceWheelValue) => {
                                              const colon = wheelToColon(pv);
                                              if (parsed.distance != null) {
                                                replaceAt(
                                                  rebuildIntervalDistanceSegment(
                                                    parsed.repetitions ?? 1,
                                                    parsed.distance,
                                                    colon,
                                                    parsed.recoveryDuration,
                                                    parsed.recoveryType ?? "trot"
                                                  )
                                                );
                                              } else if (parsed.duration != null) {
                                                replaceAt(
                                                  rebuildIntervalTimeSegment(
                                                    parsed.repetitions ?? 1,
                                                    parsed.duration,
                                                    colon,
                                                    parsed.recoveryDuration,
                                                    parsed.recoveryType ?? "trot"
                                                  )
                                                );
                                              }
                                              setPicker(null);
                                            },
                                          })
                                        }
                                      />
                                    </div>
                                    <p className="mt-2 text-[11px] text-[#C7C7CC]">Récup : ajuste dans l’éditeur RCC si besoin (r1&apos;15&gt;trot).</p>
                                  </div>
                                ) : parsed.type === "steady" ||
                                  parsed.type === "warmup" ||
                                  parsed.type === "cooldown" ? (
                                  parsed.pace ? (
                                    <div className="mt-2 grid grid-cols-3 gap-2">
                                      <FieldBox
                                        label="ALLURE"
                                        value={formatPaceWheel(paceColonToWheel(parsed.pace))}
                                        suffix="/km"
                                        onClick={() =>
                                          parsed.duration != null &&
                                          setPicker({
                                            kind: "pace",
                                            title: "Allure",
                                            value: paceColonToWheel(parsed.pace || "5:30"),
                                            onConfirm: (pv: PaceWheelValue) => {
                                              replaceAt(rebuildSteadyLikeSegment(parsed.duration!, wheelToColon(pv)));
                                              setPicker(null);
                                            },
                                          })
                                        }
                                      />
                                      <FieldBox label="DISTANCE" value="—" suffix="via RCC" />
                                      <FieldBox
                                        label="TEMPS"
                                        value={parsed.duration != null ? `${parsed.duration}` : "—"}
                                        suffix="min"
                                        onClick={() =>
                                          parsed.pace &&
                                          parsed.duration != null &&
                                          setPicker({
                                            kind: "time",
                                            title: "Durée du bloc",
                                            value: durationToTimeWheel(parsed.duration ?? 20),
                                            onConfirm: (tv: TimeWheelValue) => {
                                              const mins = Math.max(1, Math.round(timeWheelToTotalMinutes(tv)));
                                              replaceAt(rebuildSteadyLikeSegment(mins, parsed.pace!));
                                              setPicker(null);
                                            },
                                          })
                                        }
                                      />
                                    </div>
                                  ) : parsed.duration != null ? (
                                    <div className="mt-2">
                                      <FieldBox
                                        label="TEMPS"
                                        value={`${parsed.duration}`}
                                        suffix="min"
                                        onClick={() =>
                                          setPicker({
                                            kind: "time",
                                            title: "Durée du bloc",
                                            value: durationToTimeWheel(parsed.duration ?? 20),
                                            onConfirm: (tv: TimeWheelValue) => {
                                              const mins = Math.max(1, Math.round(timeWheelToTotalMinutes(tv)));
                                              replaceAt(rebuildDurationOnlyMinutes(mins));
                                              setPicker(null);
                                            },
                                          })
                                        }
                                      />
                                    </div>
                                  ) : (
                                    <p className="text-[13px] text-[#8E8E93]">Modifie ce segment dans l’éditeur RCC.</p>
                                  )
                                ) : (
                                  <p className="text-[13px] text-[#8E8E93]">
                                    Type de bloc non éditable ici — utilise l’éditeur RCC.
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <div className="mt-6 rounded-[20px] bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
                    <p className="text-[15px] font-extrabold text-[#0A0F1F]">Éditeur RCC</p>
                    <p className="mb-3 text-[12px] text-[#8E8E93]">Syntaxe avancée, même logique qu&apos;avant.</p>
                    <RCCEditor value={rccCode} onChange={setRccCode} onParsedChange={handleParsedChange} />
                    {parsedBlocks.length > 0 && (
                      <div className="mt-4">
                        <RCCBlocksPreview blocks={parsedBlocks} blockRpe={blockRpe} onBlockRpeChange={setBlockRpe} />
                      </div>
                    )}
                  </div>

                  <div className="mt-5 space-y-4 rounded-[20px] bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
                    <div className="space-y-1.5">
                      <Label className="flex items-center gap-1 text-[12px] font-semibold text-[#8E8E93]">
                        <MapPin className="h-3.5 w-3.5 shrink-0" />
                        Lieu (optionnel)
                      </Label>
                      <Input
                        placeholder="Parc, stade, forêt..."
                        value={locationName}
                        onChange={(e) => setLocationName(e.target.value)}
                        className="h-11 rounded-2xl border-[#E5E5EA] bg-[#F2F2F7]"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[12px] font-semibold text-[#8E8E93]">Consignes coach (optionnel)</Label>
                      <Textarea
                        placeholder="Hydratation, échauffement spécifique..."
                        value={coachNotes}
                        onChange={(e) => setCoachNotes(e.target.value)}
                        rows={2}
                        className="rounded-2xl border-[#E5E5EA] bg-[#F2F2F7]"
                      />
                    </div>
                  </div>

                  <div className="mt-5 space-y-3 rounded-[20px] bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
                    <p className="text-[12px] font-extrabold uppercase tracking-wide text-[#8E8E93]">Destinataires</p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setSendMode("club")}
                        className="min-h-[44px] min-w-0 flex-1 rounded-xl px-3 text-[13px] font-bold"
                        style={{
                          background: sendMode === "club" ? COACHING_ACTION_BLUE : "#F2F2F7",
                          color: sendMode === "club" ? "white" : "#0A0F1F",
                          border: sendMode === "club" ? "none" : "1px solid #E5E5EA",
                        }}
                      >
                        <span className="flex items-center justify-center gap-1">
                          <Users className="h-4 w-4 shrink-0" />
                          <span className="truncate">Club ({members.length})</span>
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setSendMode("individual")}
                        className="min-h-[44px] min-w-0 flex-1 rounded-xl px-3 text-[13px] font-bold"
                        style={{
                          background: sendMode === "individual" ? COACHING_ACTION_BLUE : "#F2F2F7",
                          color: sendMode === "individual" ? "white" : "#0A0F1F",
                          border: sendMode === "individual" ? "none" : "1px solid #E5E5EA",
                        }}
                      >
                        <span className="flex items-center justify-center gap-1">
                          <UserCheck className="h-4 w-4 shrink-0" />
                          <span className="truncate">Sélection</span>
                        </span>
                      </button>
                    </div>

                    {sendMode === "individual" && (
                      <div className="space-y-2">
                        <Input
                          placeholder="Rechercher un athlète..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="h-10 rounded-xl border-[#E5E5EA] bg-[#F2F2F7] text-[13px]"
                        />
                        <div className="max-h-40 space-y-1 overflow-y-auto [-webkit-overflow-scrolling:touch]">
                          {filteredMembers.map((m) => {
                            const isSelected = selectedAthletes.has(m.user_id);
                            return (
                              <div
                                key={m.user_id}
                                className={`flex min-w-0 cursor-pointer items-center gap-2 rounded-xl p-2 transition-colors ${
                                  isSelected ? "border border-[#007AFF]/25 bg-[#007AFF]/10" : "hover:bg-[#F2F2F7]"
                                }`}
                                onClick={() => toggleAthlete(m.user_id)}
                              >
                                <Checkbox checked={isSelected} />
                                <Avatar className="h-7 w-7 shrink-0">
                                  <AvatarImage src={m.avatar_url || ""} />
                                  <AvatarFallback className="text-[11px]">{(m.username || "?")[0].toUpperCase()}</AvatarFallback>
                                </Avatar>
                                <span className="min-w-0 truncate text-[13px] font-semibold">{m.display_name || m.username}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  {rccCode.trim() ? (
                    <div className="mt-5 flex items-end gap-2 rounded-[20px] bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
                      <div className="min-w-0 flex-1 space-y-1">
                        <Label className="text-[12px] font-semibold text-[#8E8E93]">Sauver comme modèle</Label>
                        <Input
                          placeholder="Nom du modèle..."
                          value={templateName}
                          onChange={(e) => setTemplateName(e.target.value)}
                          className="h-10 rounded-xl border-[#E5E5EA] bg-[#F2F2F7] text-[13px]"
                        />
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleSaveTemplate}
                        disabled={!templateName.trim() || savingTemplate}
                        className="h-10 shrink-0 rounded-xl border-[#E5E5EA]"
                      >
                        <Save className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : null}

                  {loadingMembers ? (
                    <p className="mt-4 pb-8 text-center text-[13px] text-[#8E8E93]">Chargement des membres…</p>
                  ) : (
                    <div className="h-4 pb-[env(safe-area-bottom)]" />
                  )}
                </>
              )}
            </div>

            {/* FOOTER */}
            <div
              className="shrink-0 px-5 py-3 pb-[max(12px,var(--safe-area-bottom))]"
              style={{ background: "white", borderTop: "1px solid #E5E5EA" }}
            >
              <button
                type="button"
                disabled={!canSubmit || loading}
                onClick={handleSubmit}
                className="w-full rounded-2xl py-3.5 text-[16px] font-bold text-white transition-all active:scale-[0.99]"
                style={{
                  background: canSubmit && !loading ? COACHING_ACTION_BLUE : `${COACHING_ACTION_BLUE}66`,
                  boxShadow: canSubmit && !loading ? "0 2px 8px rgba(0, 122, 255, 0.25)" : "none",
                }}
              >
                {loading ? "Envoi…" : "Enregistrer la séance"}
              </button>
            </div>

            {dragging && draggedMeta && (
              <div
                style={{
                  position: "fixed",
                  left: dragging.x,
                  top: dragging.y,
                  transform: dragging.over ? "translate(-50%, -50%) scale(1.08)" : "translate(-50%, -50%) scale(1)",
                  pointerEvents: "none",
                  zIndex: 9998,
                  background: "white",
                  borderRadius: 18,
                  padding: "12px 16px",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 6,
                  boxShadow: dragging.over
                    ? `0 12px 32px rgba(0, 122, 255, 0.4), 0 0 0 1.5px ${COACHING_ACTION_BLUE}`
                    : "0 10px 28px rgba(0,0,0,0.22), 0 0 0 0.5px rgba(0,0,0,0.06)",
                  transition: "box-shadow 0.15s ease-out, transform 0.15s ease-out",
                }}
              >
                <BlockPreviewBars type={dragging.type} size="lg" />
                <span style={{ fontSize: 13, fontWeight: 700, color: "#0A0F1F", letterSpacing: "-0.01em" }}>
                  {draggedMeta.label}
                </span>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <CoachingTemplatesDialog
        isOpen={showTemplates}
        onClose={() => {
          setShowTemplates(false);
          setTab("construire");
        }}
        onSelect={(code, obj) => {
          setRccCode(code);
          if (obj) setObjective(obj);
          setTab("construire");
        }}
      />

      {picker?.kind === "pace" ? (
        <PaceWheelPicker
          title={picker.title}
          value={picker.value}
          onClose={() => setPicker(null)}
          onConfirm={(v) => picker.onConfirm(v)}
        />
      ) : picker?.kind === "distance" ? (
        <DistanceWheelPicker
          title={picker.title}
          value={picker.value}
          onClose={() => setPicker(null)}
          onConfirm={(v) => picker.onConfirm(v)}
        />
      ) : picker ? (
        <TimeWheelPicker
          title={picker.title}
          value={picker.value}
          onClose={() => setPicker(null)}
          onConfirm={(v) => picker.onConfirm(v)}
        />
      ) : null}
    </>
  );
};
