import { createPortal } from "react-dom";
import { Paperclip, Camera, Image as ImageIcon, BarChart3 } from "lucide-react";

const ACTION_BLUE = "#007AFF";

const ITEMS = [
  { id: "doc" as const, Icon: Paperclip, label: "Document" },
  { id: "cam" as const, Icon: Camera, label: "Caméra" },
  { id: "photo" as const, Icon: ImageIcon, label: "Photo" },
  { id: "poll" as const, Icon: BarChart3, label: "Sondage" },
];

type Props = {
  open: boolean;
  onClose: () => void;
  onDocument: () => void;
  onCamera: () => void | Promise<void>;
  onPhoto: () => void | Promise<void>;
  onPoll: () => void;
};

/**
 * Menu pièces jointes conversation — aligné maquette RunConnect (16) :
 * carte blanche arrondie, ancrée bas-gauche au-dessus du composer.
 */
export function ChatAttachPopover({ open, onClose, onDocument, onCamera, onPhoto, onPoll }: Props) {
  if (typeof document === "undefined" || !open) return null;

  const run = (id: (typeof ITEMS)[number]["id"]) => {
    onClose();
    if (id === "doc") onDocument();
    else if (id === "cam") void onCamera();
    else if (id === "photo") void onPhoto();
    else onPoll();
  };

  const menu = (
    <>
      <div
        role="presentation"
        onClick={onClose}
        className="fixed inset-0 z-[120]"
        style={{ background: "transparent" }}
      />
      <div
        className="fixed left-3 z-[130] overflow-hidden bg-white"
        style={{
          bottom: "calc(env(safe-area-inset-bottom, 0px) + 70px)",
          borderRadius: 16,
          boxShadow: "0 12px 32px rgba(0,0,0,0.18), 0 0 0 0.5px rgba(0,0,0,0.06)",
          minWidth: 240,
          animation: "rcAttachIn 0.18s cubic-bezier(0.32, 0.72, 0, 1)",
        }}
      >
        <style>{`
          @keyframes rcAttachIn {
            from { opacity: 0; transform: translateY(8px) scale(0.96); transform-origin: bottom left; }
            to { opacity: 1; transform: translateY(0) scale(1); transform-origin: bottom left; }
          }
        `}</style>
        {ITEMS.map((it, i) => (
          <div key={it.id}>
            {i > 0 ? (
              <div style={{ height: 0.5, background: "#E5E5EA", marginLeft: 52 }} />
            ) : null}
            <button
              type="button"
              onClick={() => run(it.id)}
              className="flex w-full items-center gap-3 px-4 py-3.5 text-left active:bg-[#F8F8F8]"
            >
              <it.Icon
                className="h-[22px] w-[22px] shrink-0"
                color={ACTION_BLUE}
                strokeWidth={2.2}
                aria-hidden
              />
              <span
                style={{
                  fontSize: 17,
                  fontWeight: 600,
                  color: "#0A0F1F",
                  letterSpacing: "-0.01em",
                }}
              >
                {it.label}
              </span>
            </button>
          </div>
        ))}
      </div>
    </>
  );

  return createPortal(menu, document.body);
}
