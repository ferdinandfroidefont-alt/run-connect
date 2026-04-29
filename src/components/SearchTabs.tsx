import { cn } from "@/lib/utils";

export type SearchMainTabType = "all" | "profiles" | "clubs" | "strava" | "contacts";

interface SearchTabsProps {
  activeTab: SearchMainTabType;
  onTabChange: (tab: SearchMainTabType) => void;
}

/** Onglets principaux alignés maquette : Tout · Personnes · Clubs */
export const SearchTabs = ({ activeTab, onTabChange }: SearchTabsProps) => {
  const tabs: { id: "all" | "profiles" | "clubs"; label: string }[] = [
    { id: "all", label: "Tout" },
    { id: "profiles", label: "Personnes" },
    { id: "clubs", label: "Clubs" },
  ];

  return (
    <div className="shrink-0 border-b border-border bg-card px-ios-4 pb-0 pt-ios-2">
      <div className="flex gap-8">
        {tabs.map((tab) => {
          const on = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onTabChange(tab.id)}
              className={cn(
                "relative shrink-0 pb-3 text-[15px] font-semibold transition-colors touch-manipulation",
                on ? "text-primary" : "text-muted-foreground"
              )}
            >
              {tab.label}
              <span
                className={cn(
                  "absolute inset-x-0 bottom-0 h-0.5 rounded-full transition-opacity",
                  on ? "bg-primary opacity-100" : "opacity-0"
                )}
                aria-hidden
              />
            </button>
          );
        })}
      </div>
    </div>
  );
};
