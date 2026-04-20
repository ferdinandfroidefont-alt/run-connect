import { Button } from "@/components/ui/button";
import { UserRound } from "lucide-react";
import { MessageShortcutButton } from "@/components/coaching/tracking/MessageShortcutButton";
import { cn } from "@/lib/utils";

interface AthleteHeaderProps {
  displayName: string;
  avatarUrl: string | null;
  username: string | null;
  groupName: string | null;
  status?: "active" | "late" | "injured";
  onMessage: () => void;
  onViewProfile: () => void;
}

const STATUS_LABEL: Record<NonNullable<AthleteHeaderProps["status"]>, string> = {
  active: "Actif",
  late: "En retard",
  injured: "Blessé",
};

const STATUS_CLASS: Record<NonNullable<AthleteHeaderProps["status"]>, string> = {
  active: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  late: "bg-orange-500/15 text-orange-700 dark:text-orange-300",
  injured: "bg-red-500/15 text-red-700 dark:text-red-300",
};

export function AthleteHeader({
  displayName,
  avatarUrl,
  username,
  groupName,
  status = "active",
  onMessage,
  onViewProfile,
}: AthleteHeaderProps) {
  return (
    <div className="border-b border-border bg-card px-4 py-3">
      <div className="flex items-start gap-3">
        <div className="h-14 w-14 rounded-full bg-secondary overflow-hidden flex items-center justify-center">
          {avatarUrl ? (
            <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="text-[18px] font-bold text-muted-foreground">{displayName.charAt(0).toUpperCase()}</span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[17px] font-semibold text-foreground">{displayName}</p>
          <p className="truncate text-[12px] text-muted-foreground">
            {username ? `@${username}` : "Athlète"}
            {groupName ? ` • ${groupName}` : ""}
          </p>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <span
              className={cn(
                "inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[10px] font-semibold",
                STATUS_CLASS[status]
              )}
            >
              {STATUS_LABEL[status]}
            </span>
          </div>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <MessageShortcutButton onClick={onMessage} variant="primary" />
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-9 rounded-full px-3 text-[12px] font-semibold"
          onClick={onViewProfile}
        >
          <UserRound className="mr-1.5 h-4 w-4" />
          Voir profil
        </Button>
      </div>
    </div>
  );
}

