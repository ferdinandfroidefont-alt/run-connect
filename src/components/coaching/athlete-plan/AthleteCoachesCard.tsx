import { MessageCircle, User } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { AthleteCoachBrief } from "./types";

type Props = {
  coaches: AthleteCoachBrief[];
  onProfile?: (coachId: string) => void;
  onMessage?: (coachId: string) => void;
  className?: string;
};

export function AthleteCoachesCard({ coaches, onProfile, onMessage, className }: Props) {
  return (
    <div className={cn("rounded-2xl border border-border/80 bg-card p-4 shadow-sm", className)}>
      <p className="mb-3 text-[13px] font-semibold text-foreground">Mes coachs</p>
      {!coaches.length ? (
        <p className="text-[13px] leading-relaxed text-muted-foreground">
          Les coachs liés à vos séances de la semaine apparaissent ici.
        </p>
      ) : (
      <div className="space-y-3">
        {coaches.map((c) => (
          <div key={c.id} className="flex items-center gap-3 rounded-xl bg-secondary/40 px-3 py-2.5">
            <Avatar className="h-11 w-11 border border-border/60">
              {c.avatarUrl ? <AvatarImage src={c.avatarUrl} alt="" /> : null}
              <AvatarFallback>
                <User className="h-5 w-5 text-muted-foreground" />
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[15px] font-semibold text-foreground">{c.name}</p>
              <p className="truncate text-[12px] text-muted-foreground">
                {c.sport}
                {c.clubName ? ` · ${c.clubName}` : ""}
              </p>
            </div>
            <div className="flex shrink-0 gap-1.5">
              {onProfile ? (
                <Button type="button" variant="secondary" size="sm" className="h-8 rounded-lg px-2 text-[12px]" onClick={() => onProfile(c.id)}>
                  Profil
                </Button>
              ) : null}
              {onMessage ? (
                <Button
                  type="button"
                  size="sm"
                  className="h-8 gap-1 rounded-lg px-2 text-[12px]"
                  onClick={() => onMessage(c.id)}
                >
                  <MessageCircle className="h-3.5 w-3.5" />
                </Button>
              ) : null}
            </div>
          </div>
        ))}
      </div>
      )}
    </div>
  );
}
