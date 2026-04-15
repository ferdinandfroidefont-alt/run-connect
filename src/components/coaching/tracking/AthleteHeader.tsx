import { Badge } from "@/components/ui/badge";
import { MessageShortcutButton } from "@/components/coaching/tracking/MessageShortcutButton";

interface AthleteHeaderProps {
  displayName: string;
  avatarUrl: string | null;
  username: string | null;
  groupName: string | null;
  age: number | null;
  onMessage: () => void;
}

export function AthleteHeader({ displayName, avatarUrl, username, groupName, age, onMessage }: AthleteHeaderProps) {
  return (
    <div className="ios-card border border-border/60 bg-card px-4 py-3">
      <div className="flex items-center gap-3">
        <div className="h-12 w-12 rounded-full bg-secondary overflow-hidden flex items-center justify-center">
          {avatarUrl ? (
            <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="text-[16px] font-bold text-muted-foreground">{displayName.charAt(0).toUpperCase()}</span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[17px] font-semibold text-foreground">{displayName}</p>
          <p className="truncate text-[12px] text-muted-foreground">
            {username ? `@${username}` : "Athlète"}
            {groupName ? ` • ${groupName}` : ""}
          </p>
          <div className="mt-1 flex items-center gap-1.5">
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5 rounded-md">
              Espace coaching
            </Badge>
            {age ? (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0.5 rounded-md">
                {age} ans
              </Badge>
            ) : null}
          </div>
        </div>
        <MessageShortcutButton onClick={onMessage} />
      </div>
    </div>
  );
}

