import { useMemo } from "react";
import {
  BarChart3,
  BookOpen,
  Building2,
  FolderKanban,
  LayoutDashboard,
  MessageCircle,
  Settings,
  Users,
  UsersRound,
  Activity,
  CalendarDays,
} from "lucide-react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

export type CoachMenuKey =
  | "dashboard"
  | "planning"
  | "athletes"
  | "groups"
  | "tracking"
  | "library"
  | "templates"
  | "club"
  | "messages"
  | "settings";

interface AppDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activeKey: CoachMenuKey;
  onSelect: (key: CoachMenuKey) => void;
  coachName?: string;
  clubName?: string;
  messageBadge?: number;
}

type DrawerItemDef = {
  key: CoachMenuKey;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
};

type DrawerSectionDef = {
  title: string;
  items: DrawerItemDef[];
};

function DrawerHeader({ coachName, clubName }: { coachName?: string; clubName?: string }) {
  const initials = (coachName || "Coach")
    .split(" ")
    .map((part) => part[0] || "")
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <div className="border-b border-border/60 px-4 pb-4 pt-[max(1rem,var(--safe-area-top))]">
      <div className="flex items-center gap-3">
        <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/12 text-[14px] font-semibold text-primary">
          {initials}
        </div>
        <div className="min-w-0">
          <p className="truncate text-[16px] font-semibold text-foreground">{coachName || "Coach RunConnect"}</p>
          <p className="truncate text-[12px] text-muted-foreground">{clubName || "Espace coaching"}</p>
        </div>
      </div>
    </div>
  );
}

function DrawerSection({
  title,
  items,
  activeKey,
  onSelect,
}: {
  title: string;
  items: DrawerItemDef[];
  activeKey: CoachMenuKey;
  onSelect: (key: CoachMenuKey) => void;
}) {
  return (
    <section className="space-y-1.5">
      <p className="px-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">{title}</p>
      <div className="space-y-1">
        {items.map((item) => {
          const active = item.key === activeKey;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => onSelect(item.key)}
              className={cn(
                "relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors",
                active ? "bg-primary/10 text-primary" : "text-foreground active:bg-secondary"
              )}
            >
              {active && <span className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-primary" />}
              <item.icon className={cn("h-4.5 w-4.5 shrink-0", active ? "text-primary" : "text-muted-foreground")} />
              <span className="min-w-0 flex-1 truncate text-[14px] font-medium">{item.label}</span>
              {item.badge && item.badge > 0 ? (
                <span className="rounded-full bg-destructive px-1.5 py-0.5 text-[10px] font-semibold text-destructive-foreground">
                  {item.badge > 99 ? "99+" : item.badge}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </section>
  );
}

export function AppDrawer({
  open,
  onOpenChange,
  activeKey,
  onSelect,
  coachName,
  clubName,
  messageBadge = 0,
}: AppDrawerProps) {
  const sections = useMemo<DrawerSectionDef[]>(
    () => [
      {
        title: "Coaching",
        items: [
          { key: "dashboard", label: "Tableau de bord", icon: LayoutDashboard },
          { key: "planning", label: "Planification", icon: CalendarDays },
          { key: "athletes", label: "Athlètes", icon: Users },
          { key: "groups", label: "Groupes", icon: UsersRound },
          { key: "tracking", label: "Suivi athlète", icon: Activity },
        ],
      },
      {
        title: "Contenu",
        items: [
          { key: "library", label: "Bibliothèque", icon: BookOpen },
          { key: "templates", label: "Modèles", icon: FolderKanban },
        ],
      },
      {
        title: "Organisation",
        items: [
          { key: "club", label: "Gérer le club", icon: Building2 },
          { key: "messages", label: "Messages", icon: MessageCircle, badge: messageBadge },
        ],
      },
      {
        title: "Compte",
        items: [
          { key: "settings", label: "Paramètres", icon: Settings },
          { key: "dashboard", label: "Notifications", icon: BarChart3 },
        ],
      },
    ],
    [messageBadge]
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="left"
        showCloseButton={false}
        overlayClassName="!bg-black/45 backdrop-blur-[2px]"
        className="h-[100dvh] w-[86vw] max-w-[360px] border-r border-border/70 bg-card p-0"
      >
        <DrawerHeader coachName={coachName} clubName={clubName} />
        <div className="no-scrollbar space-y-5 overflow-y-auto px-3 pb-[max(1rem,var(--safe-area-bottom))] pt-3">
          {sections.map((section) => (
            <DrawerSection
              key={section.title}
              title={section.title}
              items={section.items}
              activeKey={activeKey}
              onSelect={onSelect}
            />
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}

