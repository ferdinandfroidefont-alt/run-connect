import {
  cloneElement,
  isValidElement,
  useCallback,
  useEffect,
  useState,
  type ReactElement,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { Check, Heart, Lock, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Browser } from "@capacitor/browser";
import { Capacitor } from "@capacitor/core";
import {
  SETTINGS_BG,
  SETTINGS_CARD_BG,
  SETTINGS_CARD_SHADOW,
  SETTINGS_CHIP_BG,
  SETTINGS_FONT,
  SETTINGS_SEPARATOR,
  SETTINGS_SUBTITLE,
  SETTINGS_TERTIARY,
  SETTINGS_TITLE_INK,
} from "@/lib/settingsMaquetteTokens";

const DONATION_SUGGESTIONS = [
  { value: 3, label: "3€", emoji: "🍬", desc: "Un gel énergétique" },
  { value: 5, label: "5€", emoji: "🍫", desc: "Une barre protéinée" },
  { value: 10, label: "10€", emoji: "🧦", desc: "Des chaussettes", popular: true },
  { value: 25, label: "25€", emoji: "🎽", desc: "Un dossard" },
  { value: 50, label: "50€", emoji: "👕", desc: "Un maillot tech" },
  { value: 100, label: "100€", emoji: "👟", desc: "Une paire de runners" },
] as const;

function formatDonAmount(value: number): string {
  if (!Number.isFinite(value)) return "";
  if (Number.isInteger(value)) return String(value);
  return value.toFixed(2).replace(".", ",");
}

interface DonationDialogProps {
  trigger?: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

interface DonateSheetProps {
  onClose: () => void;
  loading: boolean;
  onSubmit: (amount: number, message: string) => void;
}

function DonateSheet({ onClose, loading, onSubmit }: DonateSheetProps) {
  const [amount, setAmount] = useState(10);
  const [customAmount, setCustomAmount] = useState("");
  const [message, setMessage] = useState("");

  const finalAmount = customAmount ? parseFloat(customAmount.replace(",", ".")) : amount;
  const isValid = Number.isFinite(finalAmount) && finalAmount >= 1 && finalAmount <= 10000;

  return (
    <DonateOverlay onClose={onClose}>
      <style>{`
        @keyframes donate-sheet-fade-in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes donate-sheet-slide-up {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        @keyframes donate-heart-beat {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.12); }
        }
        .donate-heart-beat { animation: donate-heart-beat 1.8s ease-in-out infinite; }
      `}</style>

      <div
        onClick={(e) => e.stopPropagation()}
        className="relative flex max-h-[92vh] flex-col overflow-hidden"
        style={{
          background: SETTINGS_BG,
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          animation: "donate-sheet-slide-up 0.32s cubic-bezier(0.32, 0.72, 0, 1)",
          boxShadow: "0 -8px 30px rgba(0,0,0,0.18)",
          fontFamily: SETTINGS_FONT,
        }}
      >
        <div className="flex justify-center pb-1 pt-2">
          <div
          style={{
            width: 38,
            height: 5,
            borderRadius: 9999,
            background: "var(--separator-strong, #C6C6C8)",
          }}
        />
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label="Fermer"
          className="absolute right-[14px] top-[14px] z-[2] flex h-8 w-8 items-center justify-center rounded-full transition-opacity active:opacity-70"
          style={{ background: SETTINGS_CHIP_BG }}
        >
          <X className="h-4 w-4" color={SETTINGS_SUBTITLE} strokeWidth={2.6} />
        </button>

        <div className="flex-1 overflow-y-auto">
          <DonateSheetHero />
          <DonateSheetAmounts
            amount={amount}
            customAmount={customAmount}
            loading={loading}
            setAmount={setAmount}
            setCustomAmount={setCustomAmount}
          />
          <DonateSheetCustomAmount
            customAmount={customAmount}
            loading={loading}
            setCustomAmount={setCustomAmount}
          />
          <DonateSheetMessage message={message} loading={loading} setMessage={setMessage} />
          <DonateSheetTransparency />
          <div style={{ height: 100 }} />
        </div>

        <DonateSheetFooter
          isValid={isValid}
          loading={loading}
          finalAmount={finalAmount}
          onSubmit={() => isValid && onSubmit(finalAmount, message)}
        />
      </div>
    </DonateOverlay>
  );
}

function DonateOverlay({ onClose, children }: { onClose: () => void; children: ReactNode }) {
  return <DonateOverlayRoot onClose={onClose}>{children}</DonateOverlayRoot>;
}

function DonateOverlayRoot({ onClose, children }: { onClose: () => void; children: ReactNode }) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Faire un don"
      className="fixed inset-0 z-[9999] flex flex-col justify-end"
      style={{
        background: "rgba(0,0,0,0.45)",
        animation: "donate-sheet-fade-in 0.2s ease-out",
      }}
      onClick={onClose}
    >
      {children}
    </div>
  );
}

function DonateSheetHero() {
  return (
    <div
      className="relative overflow-hidden text-white"
      style={{
        background: "linear-gradient(160deg, #FF6B7C 0%, #FF3B30 50%, #E0245A 100%)",
        padding: "24px 20px 28px",
      }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute rounded-full"
        style={{
          top: -50,
          right: -40,
          width: 180,
          height: 180,
          background: "radial-gradient(circle, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0) 70%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute rounded-full"
        style={{
          bottom: -40,
          left: -30,
          width: 140,
          height: 140,
          background: "radial-gradient(circle, rgba(0,0,0,0.16) 0%, rgba(0,0,0,0) 70%)",
        }}
      />
      <div
        className="donate-heart-beat relative mb-3 flex h-[60px] w-[60px] items-center justify-center"
        style={{
          borderRadius: 18,
          background: "rgba(255,255,255,0.22)",
          backdropFilter: "blur(10px)",
        }}
      >
        <Heart className="h-7 w-7 text-white" strokeWidth={2.2} fill="white" />
      </div>
      <h2
        className="relative m-0"
        style={{
          fontSize: 26,
          fontWeight: 900,
          letterSpacing: "-0.035em",
          lineHeight: 1.1,
        }}
      >
        Soutiens RunConnect
      </h2>
      <p
        className="relative m-0"
        style={{
          fontSize: 14.5,
          fontWeight: 500,
          marginTop: 8,
          opacity: 0.95,
          lineHeight: 1.4,
        }}
      >
        Chaque don, même petit, aide à garder l&apos;app indépendante, sans pub et en évolution permanente.
        Merci 💪
      </p>
    </div>
  );
}

function DonateSheetAmounts({
  amount,
  customAmount,
  loading,
  setAmount,
  setCustomAmount,
}: {
  amount: number;
  customAmount: string;
  loading: boolean;
  setAmount: (n: number) => void;
  setCustomAmount: (v: string) => void;
}) {
  return (
    <div className="mt-4 px-4">
      <p
        className="m-0 mb-2.5 pl-1"
        style={{
          fontSize: 12,
          fontWeight: 900,
          color: SETTINGS_SUBTITLE,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
        }}
      >
        Choisis un montant
      </p>
      <div className="grid grid-cols-3 gap-2">
        {DONATION_SUGGESTIONS.map((s) => {
          const selected = !customAmount && amount === s.value;
          return (
            <button
              key={s.value}
              type="button"
              disabled={loading}
              onClick={() => {
                setAmount(s.value);
                setCustomAmount("");
              }}
              className="relative flex flex-col items-center transition-transform active:scale-[0.96]"
              style={{
                padding: "12px 8px",
                background: selected
                  ? "linear-gradient(135deg, #FF6B7C 0%, #FF3B30 100%)"
                  : SETTINGS_CARD_BG,
                color: selected ? "white" : SETTINGS_TITLE_INK,
                borderRadius: 16,
                boxShadow: selected
                  ? "0 6px 18px rgba(255,59,48,0.35)"
                  : SETTINGS_CARD_SHADOW,
              }}
            >
              {"popular" in s && s.popular ? (
                <span
                  className="absolute uppercase"
                  style={{
                    top: -7,
                    right: 8,
                    padding: "2px 7px",
                    background: "#FFCC00",
                    color: "#0A0F1F",
                    fontSize: 9,
                    fontWeight: 900,
                    letterSpacing: "0.06em",
                    borderRadius: 9999,
                    boxShadow: "0 2px 6px rgba(0,0,0,0.12)",
                  }}
                >
                  Top
                </span>
              ) : null}
              <span style={{ fontSize: 24, lineHeight: 1, marginBottom: 3 }}>{s.emoji}</span>
              <span
                style={{
                  fontSize: 18,
                  fontWeight: 900,
                  letterSpacing: "-0.025em",
                  lineHeight: 1,
                }}
              >
                {s.label}
              </span>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  marginTop: 4,
                  opacity: selected ? 0.95 : 0.7,
                  letterSpacing: "-0.01em",
                }}
              >
                {s.desc}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function DonateSheetCustomAmount({
  customAmount,
  loading,
  setCustomAmount,
}: {
  customAmount: string;
  loading: boolean;
  setCustomAmount: (v: string) => void;
}) {
  return (
    <div className="mt-5 px-4">
      <p
        className="m-0 mb-2.5 pl-1"
        style={{
          fontSize: 12,
          fontWeight: 900,
          color: SETTINGS_SUBTITLE,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
        }}
      >
        Ou montant libre
      </p>
      <div
        style={{
          background: SETTINGS_CARD_BG,
          borderRadius: 16,
          padding: 4,
          boxShadow: SETTINGS_CARD_SHADOW,
        }}
      >
        <div className="flex items-center" style={{ padding: "12px 16px" }}>
          <span
            style={{
              fontSize: 22,
              fontWeight: 900,
              color: customAmount ? SETTINGS_TITLE_INK : SETTINGS_TERTIARY,
              letterSpacing: "-0.02em",
              marginRight: 8,
            }}
          >
            €
          </span>
          <input
            type="number"
            inputMode="decimal"
            value={customAmount}
            disabled={loading}
            onChange={(e) => setCustomAmount(e.target.value)}
            placeholder="Autre montant"
            className="min-w-0 flex-1 border-none bg-transparent outline-none"
            style={{
              fontSize: 22,
              fontWeight: 900,
              color: SETTINGS_TITLE_INK,
              letterSpacing: "-0.02em",
              fontFamily: "inherit",
              fontVariantNumeric: "tabular-nums",
            }}
          />
        </div>
      </div>
      <p
        className="m-0 mt-2 pl-1"
        style={{ fontSize: 12.5, fontWeight: 500, color: SETTINGS_SUBTITLE }}
      >
        Entre 1€ et 10 000€
      </p>
    </div>
  );
}

function DonateSheetMessage({
  message,
  loading,
  setMessage,
}: {
  message: string;
  loading: boolean;
  setMessage: (v: string) => void;
}) {
  return (
    <div className="mt-5 px-4">
      <p
        className="m-0 mb-2.5 pl-1"
        style={{
          fontSize: 12,
          fontWeight: 900,
          color: SETTINGS_SUBTITLE,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
        }}
      >
        Un petit mot (optionnel)
      </p>
      <div
        style={{
          background: SETTINGS_CARD_BG,
          borderRadius: 16,
          padding: 14,
          boxShadow: SETTINGS_CARD_SHADOW,
        }}
      >
        <textarea
          value={message}
          disabled={loading}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Bravo pour l'app, continue comme ça !"
          rows={3}
          className="w-full resize-none border-none bg-transparent outline-none"
          style={{
            fontSize: 15,
            fontWeight: 500,
            color: SETTINGS_TITLE_INK,
            fontFamily: "inherit",
            letterSpacing: "-0.01em",
            lineHeight: 1.45,
          }}
        />
      </div>
    </div>
  );
}

function DonateSheetTransparency() {
  return (
    <div className="mt-5 px-4">
      <div
        className="flex items-center gap-3"
        style={{
          background: SETTINGS_CARD_BG,
          borderRadius: 16,
          padding: 14,
          boxShadow: SETTINGS_CARD_SHADOW,
        }}
      >
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center"
          style={{ borderRadius: 10, background: "#34C75918" }}
        >
          <Check className="h-5 w-5" color="#34C759" strokeWidth={2.8} />
        </div>
        <div className="min-w-0 flex-1">
          <p
            className="m-0"
            style={{
              fontSize: 13.5,
              fontWeight: 800,
              color: SETTINGS_TITLE_INK,
              letterSpacing: "-0.01em",
            }}
          >
            100% reversé au développement
          </p>
          <p
            className="m-0 mt-px"
            style={{
              fontSize: 12,
              fontWeight: 500,
              color: SETTINGS_SUBTITLE,
              lineHeight: 1.35,
            }}
          >
            Serveurs, nouvelles fonctionnalités, indépendance
          </p>
        </div>
      </div>
    </div>
  );
}

function DonateSheetFooter({
  isValid,
  loading,
  finalAmount,
  onSubmit,
}: {
  isValid: boolean;
  loading: boolean;
  finalAmount: number;
  onSubmit: () => void;
}) {
  return (
    <div
      className="shrink-0 border-t px-4 pt-3"
      style={{
        background: SETTINGS_BG,
        borderColor: SETTINGS_SEPARATOR,
        paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 14px)",
      }}
    >
      <button
        type="button"
        disabled={!isValid || loading}
        onClick={onSubmit}
        className="flex w-full items-center justify-center gap-2 transition-transform active:scale-[0.98] disabled:opacity-60"
        style={{
          padding: 16,
          background: isValid
            ? "linear-gradient(135deg, #FF6B7C 0%, #FF3B30 100%)"
            : SETTINGS_CHIP_BG,
          color: isValid ? "white" : SETTINGS_TERTIARY,
          borderRadius: 9999,
          fontSize: 16,
          fontWeight: 900,
          letterSpacing: "-0.01em",
          boxShadow: isValid ? "0 6px 18px rgba(255,59,48,0.4)" : "none",
        }}
      >
        <Heart className="h-5 w-5" strokeWidth={2.4} fill={isValid ? "white" : SETTINGS_TERTIARY} />
        {loading
          ? "Redirection…"
          : isValid
            ? `Faire un don de ${formatDonAmount(finalAmount)}€`
            : "Choisis un montant"}
      </button>
      <div className="mt-3 flex items-center justify-center gap-1.5">
        <Lock className="h-3 w-3" color={SETTINGS_SUBTITLE} strokeWidth={2.4} />
        <p
          className="m-0"
          style={{
            fontSize: 11.5,
            fontWeight: 500,
            color: SETTINGS_SUBTITLE,
            letterSpacing: "-0.01em",
          }}
        >
          Paiement sécurisé par <span style={{ fontWeight: 800 }}>Stripe</span>
        </p>
      </div>
    </div>
  );
}

function wrapTrigger(trigger: ReactNode, onOpen: () => void): ReactNode {
  if (!isValidElement(trigger)) return trigger;
  const el = trigger as ReactElement<{ onClick?: (e: React.MouseEvent) => void }>;
  return cloneElement(el, {
    onClick: (e: React.MouseEvent) => {
      el.props.onClick?.(e);
      if (!e.defaultPrevented) onOpen();
    },
  });
}

export const DonationDialog = ({ trigger, open, onOpenChange }: DonationDialogProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [internalOpen, setInternalOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const isControlled = open !== undefined;
  const isOpen = isControlled ? open : internalOpen;

  const setOpen = useCallback(
    (next: boolean) => {
      if (!isControlled) setInternalOpen(next);
      onOpenChange?.(next);
    },
    [isControlled, onOpenChange],
  );

  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  const handleDonation = async (numAmount: number, message: string) => {
    try {
      setLoading(true);

      if (!user?.email) {
        toast({
          title: "Connexion requise",
          description: "Connecte-toi pour faire un don depuis l'app.",
          variant: "destructive",
        });
        return;
      }

      const amountInCents = Math.round(numAmount * 100);

      const { data, error } = await supabase.functions.invoke("create-donation", {
        body: {
          amount: amountInCents,
          currency: "eur",
          donorName: user.email.split("@")[0] || "Anonyme",
          donorEmail: user.email,
          message: message.trim(),
        },
      });

      if (error) {
        throw new Error(error.message || "Erreur lors de la création du don");
      }

      if (data?.error) {
        throw new Error(typeof data.error === "string" ? data.error : "Donation checkout failed");
      }

      if (!data?.url) {
        throw new Error("URL de paiement non reçue");
      }

      if (Capacitor.isNativePlatform()) {
        await Browser.open({ url: data.url, presentationStyle: "popover" });
      } else {
        window.location.href = data.url;
      }

      setOpen(false);

      toast({
        title: "Redirection vers Stripe",
        description: "Tu vas être redirigé vers la page de paiement sécurisée.",
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Impossible de créer le don";
      toast({
        title: "Erreur",
        description: msg,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const sheet =
    isOpen && typeof document !== "undefined"
      ? createPortal(
          <DonateSheet onClose={() => setOpen(false)} loading={loading} onSubmit={handleDonation} />,
          document.body,
        )
      : null;

  return (
    <>
      {trigger ? wrapTrigger(trigger, () => setOpen(true)) : null}
      {sheet}
    </>
  );
};
