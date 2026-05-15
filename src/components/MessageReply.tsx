import { X } from "lucide-react";

const ACTION_BLUE = "#007AFF";

interface ReplyPreviewProps {
  replyTo: {
    id: string;
    content: string;
    senderName: string;
  };
  onCancel: () => void;
}

export const ReplyPreview = ({ replyTo, onCancel }: ReplyPreviewProps) => {
  return (
    <div
      className="mb-2 flex w-full flex-shrink-0 items-stretch gap-2 px-3 py-2"
      style={{
        background: `${ACTION_BLUE}10`,
        borderTop: "0.5px solid #E5E5EA",
      }}
    >
      <div
        className="flex-shrink-0 rounded-full"
        style={{ width: 3, background: ACTION_BLUE }}
      />
      <div className="min-w-0 flex-1">
        <p
          className="truncate"
          style={{
            fontSize: 13,
            fontWeight: 800,
            color: ACTION_BLUE,
            margin: 0,
            letterSpacing: "-0.01em",
          }}
        >
          {replyTo.senderName}
        </p>
        <p
          className="mt-px truncate"
          style={{
            fontSize: 14,
            color: "#0A0F1F",
            opacity: 0.7,
            margin: 0,
          }}
        >
          {replyTo.content}
        </p>
      </div>
      <button
        type="button"
        onClick={onCancel}
        className="flex-shrink-0 transition-opacity active:opacity-70"
        aria-label="Annuler la réponse"
      >
        <X className="h-5 w-5 text-[#8E8E93]" strokeWidth={2.4} />
      </button>
    </div>
  );
};

interface ReplyBubbleProps {
  replyContent: string;
  replySenderName: string;
  isOwnMessage: boolean;
}

export const ReplyBubble = ({ replyContent, replySenderName, isOwnMessage }: ReplyBubbleProps) => {
  return (
    <div
      className="mb-1.5 rounded-lg px-2.5 py-1.5"
      style={{
        background: isOwnMessage ? "rgba(255,255,255,0.15)" : "#F2F2F7",
        borderLeft: isOwnMessage ? "2.5px solid rgba(255,255,255,0.6)" : `2.5px solid ${ACTION_BLUE}`,
      }}
    >
      <p
        className="truncate text-[12px] font-bold"
        style={{ color: isOwnMessage ? "rgba(255,255,255,0.85)" : ACTION_BLUE, margin: 0 }}
      >
        {replySenderName}
      </p>
      <p
        className="mt-px truncate text-[13px]"
        style={{
          color: isOwnMessage ? "rgba(255,255,255,0.85)" : "#0A0F1F",
          opacity: isOwnMessage ? 1 : 0.7,
          margin: 0,
        }}
      >
        {replyContent}
      </p>
    </div>
  );
};
