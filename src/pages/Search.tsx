import { lazy, Suspense, useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ChevronLeft, Search as SearchIcon } from "lucide-react";
import { SearchTabs } from "@/components/SearchTabs";
import { ProfilesTab } from "@/components/search/ProfilesTab";
import { ClubsTab } from "@/components/search/ClubsTab";
import { StravaTab } from "@/components/search/StravaTab";
import { ContactsTab } from "@/components/search/ContactsTab";
import { SearchAllTab } from "@/components/search/SearchAllTab";
import { Input } from "@/components/ui/input";
import { IosFixedPageHeaderShell } from "@/components/layout/IosFixedPageHeaderShell";
import { resetBodyInteractionLocks } from "@/lib/bodyInteractionLocks";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";

type TabType = "all" | "profiles" | "clubs" | "strava" | "contacts";

const SettingsDialog = lazy(() =>
  import("@/components/SettingsDialog").then((m) => ({ default: m.SettingsDialog }))
);

function parseTabParam(raw: string | null): TabType {
  if (raw === "strava" || raw === "contacts") return raw;
  if (raw === "clubs" || raw === "profiles" || raw === "all") return raw;
  return "all";
}

export default function Search() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [searchParams, setSearchParams] = useSearchParams();
  const inputRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState<TabType>(() => parseTabParam(searchParams.get("tab")));

  useEffect(() => {
    setActiveTab(parseTabParam(searchParams.get("tab")));
  }, [searchParams]);

  const [searchQuery, setSearchQuery] = useState("");
  const [isClosing, setIsClosing] = useState(false);
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  const [settingsFocus, setSettingsFocus] = useState<string>("");

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => navigate(-1), 250);
  };

  const onTabChange = (tab: TabType) => {
    setActiveTab(tab);
    const next = new URLSearchParams(searchParams);
    if (tab === "all") next.delete("tab");
    else next.set("tab", tab);
    setSearchParams(next, { replace: true });
  };

  useEffect(() => {
    return () => {
      resetBodyInteractionLocks();
    };
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      inputRef.current?.focus({ preventScroll: true });
    }, 400);
    return () => clearTimeout(timer);
  }, []);

  const handleOpenSettings = (focus?: string) => {
    setSettingsFocus(focus || "");
    setShowSettingsDialog(true);
  };

  const placeholder = "Athlètes, clubs, séances...";

  return (
    <>
      <div
        className={`fixed inset-0 z-[60] flex min-h-0 flex-col overflow-hidden bg-background ${
          isClosing ? "animate-slide-down" : "animate-slide-up"
        }`}
      >
        <IosFixedPageHeaderShell
          className="min-h-0 flex-1"
          headerWrapperClassName="shrink-0"
          header={
            <>
              <header className="shrink-0 bg-card px-ios-4 pb-ios-2 pt-[max(var(--safe-area-top),0.75rem)]">
                <div className="mb-ios-3 flex min-h-[44px] items-center gap-2">
                  <button
                    type="button"
                    onClick={handleClose}
                    className="flex min-w-0 items-center gap-1 text-primary active:opacity-70 touch-manipulation"
                  >
                    <ChevronLeft className="h-6 w-6 shrink-0" />
                    <span className="truncate text-[17px]">Retour</span>
                  </button>
                </div>
                <h1 className="text-[28px] font-bold leading-tight tracking-tight text-foreground">
                  {t("navigation.search")}
                </h1>
                <div className="relative mt-ios-4">
                  <SearchIcon
                    className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-muted-foreground"
                    aria-hidden
                  />
                  <Input
                    ref={inputRef}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={placeholder}
                    className={cn(
                      "h-[48px] rounded-full border border-border bg-secondary/80 pl-12 pr-4 text-[16px] shadow-none",
                      "placeholder:text-muted-foreground/80"
                    )}
                  />
                </div>
              </header>
              {activeTab === "strava" || activeTab === "contacts" ? (
                <div className="flex shrink-0 items-center gap-3 border-b border-border bg-card px-ios-4 py-ios-2">
                  <button
                    type="button"
                    onClick={() => onTabChange("all")}
                    className="text-[15px] font-medium text-primary touch-manipulation"
                  >
                    Recherche
                  </button>
                  <span className="text-muted-foreground">·</span>
                  <span className="text-[15px] font-semibold text-foreground">
                    {activeTab === "strava" ? "Strava" : "Contacts"}
                  </span>
                </div>
              ) : (
                <SearchTabs activeTab={activeTab} onTabChange={onTabChange} />
              )}
            </>
          }
          scrollClassName="flex min-h-0 flex-col bg-background"
        >
          <div className="flex min-h-0 flex-1 flex-col bg-background">
            {activeTab === "all" && <SearchAllTab searchQuery={searchQuery} />}
            {activeTab === "profiles" && <ProfilesTab searchQuery={searchQuery} />}
            {activeTab === "clubs" && <ClubsTab searchQuery={searchQuery} />}
            {activeTab === "strava" && (
              <StravaTab searchQuery={searchQuery} onOpenSettings={handleOpenSettings} />
            )}
            {activeTab === "contacts" && <ContactsTab searchQuery={searchQuery} />}
          </div>
        </IosFixedPageHeaderShell>
      </div>

      <Suspense fallback={null}>
        <SettingsDialog
          open={showSettingsDialog}
          onOpenChange={setShowSettingsDialog}
          initialSearch={settingsFocus}
        />
      </Suspense>
    </>
  );
}
