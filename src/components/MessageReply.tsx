import { X, Reply } from "lucide-react";

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
    <div className="flex items-center gap-2 px-3 py-2 bg-secondary/80 rounded-t-xl border-b border-border mx-2 mb-0">
      <Reply className="h-4 w-4 text-primary flex-shrink-0" />
      <div className="flex-1 min-w-0 border-l-2 border-primary pl-2">
        <p className="text-[12px] font-semibold text-primary truncate">
          {replyTo.senderName}
        </p>
        <p className="text-[12px] text-muted-foreground truncate">
          {replyTo.content}
        </p>
      </div>
      <button
        onClick={onCancel}
        className="p-1 rounded-full hover:bg-secondary active:bg-secondary/80"
      >
        <X className="h-4 w-4 text-muted-foreground" />
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
    <div className={`rounded-lg px-2.5 py-1.5 mb-1 border-l-2 ${
      isOwnMessage 
        ? 'bg-white/20 border-white/50' 
        : 'bg-secondary/50 border-primary'
    }`}>
      <p className={`text-[11px] font-semibold truncate ${
        isOwnMessage ? 'text-white/90' : 'text-primary'
      }`}>
        {replySenderName}
      </p>
      <p className={`text-[11px] truncate ${
        isOwnMessage ? 'text-white/70' : 'text-muted-foreground'
      }`}>
        {replyContent}
      </p>
    </div>
  );
};
