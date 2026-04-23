import { useMemo } from "react";
import {
  Building2,
  ChevronDown,
  LayoutDashboard,
  FileText,
  Activity,
  CalendarDays,
  FolderKanban,
} from "lucide-react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

export type CoachMenuKey =
  | "dashboard"
  | "planning"
  | "my-plan"
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
  clubAvatarUrl?: string | null;
  userMode?: "coach" | "athlete";
  otherClubsCount?: number;
  onPressClubSwitcher?: () => void;
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

function DrawerHeader({
  coachName,
  clubName,
  clubAvatarUrl,
  otherClubsCount = 0,
  onPressClubSwitcher,
}: {
  coachName?: string;
  clubName?: string;
  clubAvatarUrl?: string | null;
  otherClubsCount?: number;
  onPressClubSwitcher?: () => void;
}) {
  const fallbackInitial = (clubName || "Club").slice(0, 1).toUpperCase();
  const otherClubLabel = `${otherClubsCount} autre club${otherClubsCount > 1 ? "s" : ""}`;
  return (
    <div className="border-b border-border/60 px-4 pb-4 pt-[max(1rem,var(--safe-area-top))]">
      <button type="button" onClick={onPressClubSwitcher} className="flex w-full items-center gap-3 text-left">
        <div className="inline-flex h-11 w-11 items-center justify-center overflow-hidden rounded-2xl bg-primary/12 text-[14px] font-semibold text-primary">
          {clubAvatarUrl ? (
            <img src={clubAvatarUrl} alt={clubName || "Club"} className="h-full w-full object-cover" />
          ) : (
            fallbackInitial
          )}
        </div>
        <div className="min-w-0">
          <p className="truncate text-[16px] font-semibold text-foreground">{coachName || "Coach RunConnect"}</p>
          <p className="flex items-center gap-1 truncate text-[12px] text-muted-foreground">
            <span className="truncate">{clubName || "Espace coaching"}</span>
            <ChevronDown className="h-3.5 w-3.5 shrink-0" />
            <span className="shrink-0">{otherClubLabel}</span>
          </p>
        </div>
      </button>
    </div>
  );
}

function DrawerSection({
  title,
  items,
  activeKey,
  onSelect,
  disableAll,
}: {
  title: string;
  items: DrawerItemDef[];
  activeKey: CoachMenuKey;
  onSelect: (key: CoachMenuKey) => void;
  disableAll?: boolean;
}) {
  return (
    <section className="space-y-1.5">
      <p className="px-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">{title}</p>
      <div className="space-y-1">
        {items.map((item) => {
          const active = item.key === activeKey;
          const disabled = Boolean(disableAll);
          return (
            <button
              key={item.key}
              type="button"
              disabled={disabled}
              onClick={() => onSelect(item.key)}
              className={cn(
                "relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors",
                active ? "bg-primary/10 text-primary" : "text-foreground active:bg-secondary",
                disabled && "cursor-not-allowed opacity-45"
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
  clubAvatarUrl,
  userMode = "coach",
  otherClubsCount = 0,
  onPressClubSwitcher,
}: AppDrawerProps) {
  const isAthleteMode = userMode === "athlete";
  const sections = useMemo<DrawerSectionDef[]>(
    () => [
      {
        title: isAthleteMode ? "Vu athlète" : "Coaching",
        items: isAthleteMode
          ? [{ key: "my-plan", label: "Mon plan", icon: FolderKanban }]
          : [
              { key: "dashboard", label: "Tableau de bord", icon: LayoutDashboard },
              { key: "planning", label: "Planification", icon: CalendarDays },
              { key: "groups", label: "Brouillons", icon: FileText },
              { key: "tracking", label: "Suivi athlète", icon: Activity },
              { key: "club", label: "Gérer le club", icon: Building2 },
            ],
      },
      ...(isAthleteMode
        ? []
        : [
            {
              title: "Vu athlète",
              items: [{ key: "my-plan" as CoachMenuKey, label: "Mon plan", icon: FolderKanban }],
            },
          ]),
      ...(isAthleteMode
        ? [
            {
              title: "Vu coach",
              items: [
                { key: "dashboard" as CoachMenuKey, label: "Tableau de bord", icon: LayoutDashboard },
                { key: "planning" as CoachMenuKey, label: "Planification", icon: CalendarDays },
                { key: "groups" as CoachMenuKey, label: "Brouillons", icon: FileText },
                { key: "tracking" as CoachMenuKey, label: "Suivi athlète", icon: Activity },
                { key: "club" as CoachMenuKey, label: "Gérer le club", icon: Building2 },
              ],
            },
          ]
        : []),
    ],
    [isAthleteMode]
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="left"
        showCloseButton={false}
        overlayClassName="!bg-black/45 backdrop-blur-[2px]"
        className="h-[100dvh] w-[86vw] max-w-[360px] border-r border-border/70 bg-card p-0"
      >
        <DrawerHeader
          coachName={coachName}
          clubName={clubName}
          clubAvatarUrl={clubAvatarUrl}
          otherClubsCount={otherClubsCount}
          onPressClubSwitcher={onPressClubSwitcher}
        />
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

