import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Plus, X, Check, EyeOff, BarChart3 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const ACTION_BLUE = "#007AFF";
const BG = "#F2F2F7";

interface CreatePollDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversationId: string;
  userId: string;
  onPollCreated: (pollId: string) => void;
}

type PollOptionRow = { id: string; text: string };

function SectionHeader({ label }: { label: string }) {
  return (
    <p
      className="uppercase"
      style={{
        fontSize: 12.5,
        fontWeight: 700,
        color: "#8E8E93",
        letterSpacing: "0.05em",
        margin: 0,
        marginTop: 22,
        marginBottom: 6,
        paddingLeft: 28,
      }}
    >
      {label}
    </p>
  );
}

function FormCard({ children, padding }: { children: ReactNode; padding?: boolean }) {
  return (
    <div
      className="mx-4 overflow-hidden rounded-2xl bg-white"
      style={{
        boxShadow: "0 0.5px 0 rgba(0,0,0,0.05)",
        padding: padding ? "14px 16px" : 0,
      }}
    >
      {children}
    </div>
  );
}

function FormRowDivider() {
  return <div style={{ height: 0.5, background: "#E5E5EA", marginLeft: 16 }} />;
}

function IOSToggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!on)}
      className="relative shrink-0 transition-colors"
      style={{
        width: 51,
        height: 31,
        borderRadius: 9999,
        background: on ? "#34C759" : "#E9E9EB",
        padding: 2,
      }}
      aria-pressed={on}
    >
      <div
        style={{
          width: 27,
          height: 27,
          borderRadius: "50%",
          background: "white",
          boxShadow: "0 2px 4px rgba(0,0,0,0.15), 0 1px 1px rgba(0,0,0,0.06)",
          transform: on ? "translateX(20px)" : "translateX(0)",
          transition: "transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
        }}
      />
    </button>
  );
}

function newOptionId() {
  return `opt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export const CreatePollDialog = ({
  open,
  onOpenChange,
  conversationId,
  userId,
  onPollCreated,
}: CreatePollDialogProps) => {
  const [slideOpen, setSlideOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState<PollOptionRow[]>([
    { id: newOptionId(), text: "" },
    { id: newOptionId(), text: "" },
  ]);
  const [multipleAnswers, setMultipleAnswers] = useState(false);
  const [anonymous, setAnonymous] = useState(false);
  const [loading, setLoading] = useState(false);
  const prevOpen = useRef(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open && !prevOpen.current) {
      setQuestion("");
      setOptions([
        { id: newOptionId(), text: "" },
        { id: newOptionId(), text: "" },
      ]);
      setMultipleAnswers(false);
      setAnonymous(false);
      const t = setTimeout(() => setSlideOpen(true), 10);
      prevOpen.current = true;
      return () => clearTimeout(t);
    }
    if (!open && prevOpen.current) {
      setSlideOpen(false);
      prevOpen.current = false;
    }
  }, [open]);

  const finishClose = useCallback(() => {
    setSlideOpen(false);
    setTimeout(() => onOpenChange(false), 260);
  }, [onOpenChange]);

  const validOptions = options.filter((o) => o.text.trim().length > 0);
  const canSend = question.trim().length > 0 && validOptions.length >= 2;

  const addOption = () => {
    if (options.length < 12) {
      setOptions([...options, { id: newOptionId(), text: "" }]);
    }
  };

  const updateOption = (id: string, text: string) => {
    setOptions(options.map((o) => (o.id === id ? { ...o, text } : o)));
  };

  const removeOption = (id: string) => {
    if (options.length > 2) {
      setOptions(options.filter((o) => o.id !== id));
    }
  };

  const handleCreate = async () => {
    if (!canSend || loading) return;

    const pollOptions = validOptions.map((o) => ({
      id: o.id,
      text: o.text.trim(),
      votes: [] as string[],
    }));

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("polls")
        .insert({
          conversation_id: conversationId,
          creator_id: userId,
          question: question.trim(),
          options: pollOptions,
          multiple_answers: multipleAnswers,
          anonymous,
        })
        .select("id")
        .single();

      if (error) throw error;

      await onPollCreated((data as { id: string }).id);
      toast({ title: "📊 Sondage créé !" });
      setSlideOpen(false);
      setTimeout(() => onOpenChange(false), 260);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Erreur inconnue";
      toast({ title: "Erreur", description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  if (typeof document === "undefined" || !open) return null;

  const overlay = (
    <div
      className="fixed inset-0 z-[180]"
      style={{
        fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif",
      }}
    >
      <div
        className="absolute inset-0 flex flex-col"
        style={{
          background: BG,
          transform: slideOpen ? "translateY(0)" : "translateY(100%)",
          transition: "transform 0.32s cubic-bezier(0.32, 0.72, 0, 1)",
        }}
      >
        <div
          className="flex shrink-0 items-center px-4 pb-3 pt-3"
          style={{ background: "white", borderBottom: "1px solid #E5E5EA" }}
        >
          <button type="button" onClick={finishClose} className="shrink-0 px-1 transition-opacity active:opacity-70">
            <span
              style={{
                fontSize: 17,
                fontWeight: 500,
                color: ACTION_BLUE,
                letterSpacing: "-0.01em",
              }}
            >
              Annuler
            </span>
          </button>
          <h1
            className="min-w-0 flex-1 text-center"
            style={{
              fontSize: 17,
              fontWeight: 800,
              color: "#0A0F1F",
              letterSpacing: "-0.01em",
              margin: 0,
            }}
          >
            Sondage
          </h1>
          <button
            type="button"
            onClick={() => void handleCreate()}
            disabled={!canSend || loading}
            className="shrink-0 px-1 transition-opacity active:opacity-70 disabled:opacity-40"
          >
            <span
              style={{
                fontSize: 17,
                fontWeight: 800,
                color: ACTION_BLUE,
                letterSpacing: "-0.01em",
              }}
            >
              {loading ? "…" : "Créer"}
            </span>
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto pb-8">
          <SectionHeader label="Question" />
          <FormCard padding>
            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value.slice(0, 200))}
              placeholder="Pose ta question…"
              rows={2}
              style={{
                width: "100%",
                border: "none",
                outline: "none",
                resize: "none",
                fontSize: 17,
                fontWeight: 500,
                color: "#0A0F1F",
                lineHeight: 1.35,
                letterSpacing: "-0.01em",
                background: "transparent",
                fontFamily: "inherit",
              }}
            />
            <p
              className="text-right"
              style={{
                fontSize: 12.5,
                fontWeight: 600,
                color: "#8E8E93",
                margin: 0,
                marginTop: 2,
              }}
            >
              {question.length}/200
            </p>
          </FormCard>

          <SectionHeader label="Options" />
          <FormCard>
            {options.map((o, i) => (
              <div key={o.id}>
                {i > 0 ? <FormRowDivider /> : null}
                <div className="flex items-center px-4" style={{ minHeight: 48, gap: 10 }}>
                  <div
                    className="flex shrink-0 items-center justify-center"
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: "50%",
                      border: "1.5px solid #C7C7CC",
                      background: "transparent",
                    }}
                  />
                  <input
                    type="text"
                    value={o.text}
                    onChange={(e) => updateOption(o.id, e.target.value.slice(0, 80))}
                    placeholder={`Option ${i + 1}`}
                    className="min-w-0 flex-1 border-0 bg-transparent outline-none"
                    style={{
                      fontSize: 17,
                      fontWeight: 500,
                      color: "#0A0F1F",
                      letterSpacing: "-0.01em",
                      fontFamily: "inherit",
                    }}
                  />
                  {options.length > 2 ? (
                    <button
                      type="button"
                      onClick={() => removeOption(o.id)}
                      className="shrink-0 transition-opacity active:opacity-60"
                      aria-label="Supprimer cette option"
                    >
                      <div
                        className="flex items-center justify-center"
                        style={{
                          width: 22,
                          height: 22,
                          borderRadius: "50%",
                          background: "#FF3B30",
                        }}
                      >
                        <X className="h-3 w-3 text-white" strokeWidth={3} />
                      </div>
                    </button>
                  ) : null}
                </div>
              </div>
            ))}
            {options.length < 12 ? (
              <>
                <FormRowDivider />
                <button
                  type="button"
                  onClick={addOption}
                  className="flex w-full items-center px-4 active:bg-[#F8F8F8]"
                  style={{ minHeight: 48, gap: 10 }}
                >
                  <div
                    className="flex shrink-0 items-center justify-center"
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: "50%",
                      background: "#34C759",
                    }}
                  >
                    <Plus className="h-3.5 w-3.5 text-white" strokeWidth={3} />
                  </div>
                  <span
                    style={{
                      fontSize: 17,
                      fontWeight: 600,
                      color: ACTION_BLUE,
                      letterSpacing: "-0.01em",
                    }}
                  >
                    Ajouter une option
                  </span>
                </button>
              </>
            ) : null}
          </FormCard>
          <p
            style={{
              fontSize: 12.5,
              color: "#8E8E93",
              margin: 0,
              marginTop: 6,
              paddingLeft: 28,
              paddingRight: 28,
              fontWeight: 500,
              lineHeight: 1.35,
            }}
          >
            Tu peux ajouter jusqu'à 12 options. Idéal pour gérer un même sondage par groupes (ex : "Groupe 1 — 10h",
            "Groupe 2 — 18h").
          </p>

          <SectionHeader label="Paramètres" />
          <FormCard>
            <div className="flex items-center px-4" style={{ minHeight: 52, gap: 12 }}>
              <div
                className="flex shrink-0 items-center justify-center rounded-md"
                style={{ width: 30, height: 30, background: ACTION_BLUE }}
              >
                <Check className="h-[18px] w-[18px] text-white" strokeWidth={2.8} />
              </div>
              <div className="min-w-0 flex-1">
                <p
                  style={{
                    fontSize: 16,
                    fontWeight: 600,
                    color: "#0A0F1F",
                    letterSpacing: "-0.01em",
                    margin: 0,
                  }}
                >
                  Plusieurs réponses
                </p>
                <p style={{ fontSize: 12.5, color: "#8E8E93", margin: 0, marginTop: 1, fontWeight: 500 }}>
                  Chacun peut voter pour plusieurs options
                </p>
              </div>
              <IOSToggle on={multipleAnswers} onChange={setMultipleAnswers} />
            </div>
            <FormRowDivider />
            <div className="flex items-center px-4" style={{ minHeight: 52, gap: 12 }}>
              <div
                className="flex shrink-0 items-center justify-center rounded-md"
                style={{ width: 30, height: 30, background: "#8E8E93" }}
              >
                <EyeOff className="h-[18px] w-[18px] text-white" strokeWidth={2.4} />
              </div>
              <div className="min-w-0 flex-1">
                <p
                  style={{
                    fontSize: 16,
                    fontWeight: 600,
                    color: "#0A0F1F",
                    letterSpacing: "-0.01em",
                    margin: 0,
                  }}
                >
                  Sondage anonyme
                </p>
                <p style={{ fontSize: 12.5, color: "#8E8E93", margin: 0, marginTop: 1, fontWeight: 500 }}>
                  Personne ne voit qui a voté quoi
                </p>
              </div>
              <IOSToggle on={anonymous} onChange={setAnonymous} />
            </div>
          </FormCard>

          <div className="mt-6 px-4">
            <button
              type="button"
              onClick={() => void handleCreate()}
              disabled={!canSend || loading}
              className={cn(
                "w-full transition-transform active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40 disabled:active:scale-100",
              )}
              style={{
                padding: "15px",
                background: ACTION_BLUE,
                color: "white",
                borderRadius: 9999,
                fontSize: 17,
                fontWeight: 800,
                letterSpacing: "-0.01em",
                boxShadow: "0 4px 14px rgba(0,122,255,0.3)",
              }}
            >
              Envoyer le sondage
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(overlay, document.body);
};
