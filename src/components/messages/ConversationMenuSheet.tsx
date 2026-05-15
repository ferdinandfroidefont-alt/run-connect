import {
  User,
  Users,
  Bell,
  Search,
  Camera,
  Trash2,
  Flag,
  Shield,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const ACTION_BLUE = "#007AFF";

type MenuAction =
  | { type: "divider" }
  | {
      type: "item";
      icon: LucideIcon;
      label: string;
      danger?: boolean;
      onSelect: () => void;
    };

export type ConversationMenuSheetProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle: string;
  avatarUrl?: string | null;
  avatarFallbackLabel: string;
  isGroup: boolean;
  onViewProfile: () => void;
  onToggleMute: () => void;
  onSearch: () => void;
  onSharedMedia: () => void;
  onDelete: () => void;
  onReport: () => void;
  onBlock: () => void;
};

/**
 * Bottom sheet menu — aligné sur la maquette RC (RunConnect 13) : actions conversation + Annuler.
 */
export function ConversationMenuSheet({
  open,
  onClose,
  title,
  subtitle,
  avatarUrl,
  avatarFallbackLabel,
  isGroup,
  onViewProfile,
  onToggleMute,
  onSearch,
  onSharedMedia,
  onDelete,
  onReport,
  onBlock,
}: ConversationMenuSheetProps) {
  if (!open) return null;

  const actions: MenuAction[] = [
    { type: "item", icon: User, label: "Voir le profil", onSelect: onViewProfile },
    { type: "item", icon: Bell, label: "Mettre en sourdine", onSelect: onToggleMute },
    { type: "item", icon: Search, label: "Rechercher", onSelect: onSearch },
    { type: "item", icon: Camera, label: "Médias partagés", onSelect: onSharedMedia },
    { type: "divider" },
    {
      type: "item",
      icon: Trash2,
      label: "Supprimer la conversation",
      danger: true,
      onSelect: onDelete,
    },
    { type: "item", icon: Flag, label: "Signaler", danger: true, onSelect: onReport },
    { type: "item", icon: Shield, label: "Bloquer", danger: true, onSelect: onBlock },
  ];

  return (
    <div
      role="presentation"
      onClick={onClose}
      className="fixed inset-0 flex flex-col justify-end"
      style={{
        zIndex: 400,
        background: "rgba(0,0,0,0.4)",
        animation: "fadeIn 0.2s ease-out",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="px-3 pb-[max(1.5rem,env(safe-area-inset-bottom))]"
        style={{
          animation: "slideUp 0.28s cubic-bezier(0.32, 0.72, 0, 1)",
        }}
      >
        <div
          className="mb-2.5 overflow-hidden"
          style={{
            background: "white",
            borderRadius: 18,
          }}
        >
          <div
            className="flex items-center gap-3 border-b border-[#E5E5EA] px-4 py-4"
            style={{ borderBottomWidth: 0.5 }}
          >
            <Avatar className="h-12 w-12 shrink-0 rounded-full">
              <AvatarImage src={avatarUrl || ""} alt="" />
              <AvatarFallback
                className="rounded-full bg-[#E5E5EA] text-[15px] font-bold text-[#0A0F1F]"
                style={{ fontFamily: "system-ui, sans-serif" }}
              >
                {isGroup ? (
                  <Users className="h-5 w-5 text-[#0A0F1F]" strokeWidth={2} />
                ) : (
                  avatarFallbackLabel.charAt(0).toUpperCase()
                )}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p
                className="truncate"
                style={{
                  fontSize: 17,
                  fontWeight: 800,
                  color: "#0A0F1F",
                  letterSpacing: "-0.01em",
                  margin: 0,
                }}
              >
                {title}
              </p>
              <p
                className="mt-0.5 truncate"
                style={{
                  fontSize: 13,
                  color: "#8E8E93",
                  margin: 0,
                }}
              >
                {subtitle}
              </p>
            </div>
          </div>

          {actions.map((a, i) => {
            if (a.type === "divider") {
              return <div key={`d-${i}`} className="h-2 bg-[#F2F2F7]" />;
            }
            const Icon = a.icon;
            const next = actions[i + 1];
            const showBorder = next && next.type !== "divider";
            return (
              <button
                key={`a-${i}`}
                type="button"
                onClick={() => {
                  a.onSelect();
                }}
                className="flex w-full items-center justify-between px-4 py-3.5 transition-colors active:bg-[#F2F2F7]"
                style={{
                  borderBottom: showBorder ? "0.5px solid #E5E5EA" : "none",
                }}
              >
                <span
                  style={{
                    fontSize: 17,
                    fontWeight: 600,
                    color: a.danger ? "#FF3B30" : "#0A0F1F",
                    letterSpacing: "-0.01em",
                  }}
                >
                  {a.label}
                </span>
                <Icon
                  className="h-5 w-5 shrink-0"
                  color={a.danger ? "#FF3B30" : "#0A0F1F"}
                  strokeWidth={2}
                />
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={onClose}
          className="w-full transition-colors active:bg-[#F8F8F8]"
          style={{
            background: "white",
            borderRadius: 14,
            padding: "16px",
            fontSize: 17,
            fontWeight: 800,
            color: ACTION_BLUE,
            letterSpacing: "-0.01em",
          }}
        >
          Annuler
        </button>
      </div>
    </div>
  );
}
