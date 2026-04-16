import { Button } from "@/components/ui/button";
import { UserRound, MessageCircle } from "lucide-react";
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
    <div className="bg-card border-b border-border px-ios-4 pt-5 pb-4">
      <div className="flex items-start gap-4">
        <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full bg-secondary ring-[3px] ring-primary/20">
          {avatarUrl ? (
            <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="text-2xl font-bold text-muted-foreground">{displayName.charAt(0).toUpperCase()}</span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-[16px] font-bold leading-tight text-foreground">{displayName}</h2>
          <p className="mt-0.5 truncate text-[13px] text-muted-foreground">
            {username ? `@${username}` : "Athlète"}
            {groupName ? ` · ${groupName}` : ""}
          </p>
          <div className="mt-2">
            <span
              className={cn(
                "inline-flex items-center rounded-lg px-2.5 py-1 text-[12px] font-semibold",
                STATUS_CLASS[status],
              )}
            >
              {STATUS_LABEL[status]}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-3 flex gap-2">
        <Button
          type="button"
          variant="default"
          size="sm"
          className="h-9 flex-1 gap-1.5 rounded-lg text-[13px] font-semibold"
          onClick={onMessage}
        >
          <MessageCircle className="h-4 w-4 shrink-0" />
          Message
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="h-9 flex-1 gap-1.5 rounded-lg text-[13px] font-semibold"
          onClick={onViewProfile}
        >
          <UserRound className="h-4 w-4 shrink-0" />
          Profil
        </Button>
      </div>
    </div>
  );
}
