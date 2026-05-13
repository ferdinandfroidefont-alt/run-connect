import { Activity, ContactRound, User, Users } from "lucide-react";

export type MessagesDiscoveryMaquetteTab = "profiles" | "clubs" | "strava" | "contacts";

/** Onglets recherche inbox — même logique que {@link SearchTabs}, style maquette Messages (3).jsx */
export function MessagesDiscoveryTabsMaquette({
  activeTab,
  onTabChange,
}: {
  activeTab: MessagesDiscoveryMaquetteTab;
  onTabChange: (t: MessagesDiscoveryMaquetteTab) => void;
}) {
  const tabs: { id: MessagesDiscoveryMaquetteTab; label: string; Icon: typeof User }[] = [
    { id: "profiles", label: "Profils", Icon: User },
    { id: "clubs", label: "Clubs", Icon: Users },
    { id: "strava", label: "Strava", Icon: Activity },
    { id: "contacts", label: "Contacts", Icon: ContactRound },
  ];

  return (
    <div className="mt-4 flex gap-1 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {tabs.map((t) => {
        const active = activeTab === t.id;
        const Icon = t.Icon;
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => onTabChange(t.id)}
            className="flex flex-shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 transition-all"
            style={{
              background: active ? "white" : "transparent",
              boxShadow: active ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
            }}
          >
            <Icon className="h-[18px] w-[18px] text-[#0A0F1F]" strokeWidth={2} />
            <span className="text-[16px] font-bold text-[#0A0F1F]">{t.label}</span>
          </button>
        );
      })}
    </div>
  );
}
