import { motion } from "framer-motion";
import { ChevronRight, GraduationCap } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useLanguage } from "@/contexts/LanguageContext";
import { IosFixedPageHeaderShell } from "@/components/layout/IosFixedPageHeaderShell";
import { IosPageHeaderBar } from "@/components/layout/IosPageHeaderBar";
import {
  TUTORIAL_REPLAY_MENU_ORDER,
  type TutorialReplayId,
} from "@/lib/tutorials/registry";

interface SettingsTutorialCatalogProps {
  onBack: () => void;
  onReplay: (id: TutorialReplayId) => void;
}

export const SettingsTutorialCatalog = ({ onBack, onReplay }: SettingsTutorialCatalogProps) => {
  const { t } = useLanguage();

  return (
    <motion.div
      initial={{ x: 100, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 100, opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="flex h-full min-h-0 min-w-0 max-w-full flex-col overflow-x-hidden bg-secondary"
    >
      <IosFixedPageHeaderShell
        className="min-h-0 flex-1"
        headerWrapperClassName="shrink-0"
        contentScroll
        scrollClassName="min-h-0 bg-secondary"
        header={
          <div className="shrink-0 bg-secondary">
            <IosPageHeaderBar leadingBack={{ onClick: onBack }} title={t("tutorial.catalogPageTitle")} />
          </div>
        }
      >
        <ScrollArea className="h-full min-h-0 min-w-0 flex-1 overflow-x-hidden">
          <div className="min-w-0 max-w-full space-y-4 overflow-x-hidden py-5">
            <div className="px-4 ios-shell:px-2.5">
              <p className="px-1 text-[13px] leading-snug text-muted-foreground">
                {t("tutorial.catalogPageSubtitle")}
              </p>
            </div>
            <div className="px-4 ios-shell:px-2.5">
              <div className="ios-card w-full min-w-0 overflow-hidden">
                {TUTORIAL_REPLAY_MENU_ORDER.map((id, index) => (
                  <div key={id}>
                    <button
                      type="button"
                      onClick={() => onReplay(id)}
                      className="flex w-full min-w-0 max-w-full items-center gap-2.5 px-4 py-2.5 transition-colors active:bg-secondary ios-shell:px-2.5"
                    >
                      <div className="ios-list-row-icon bg-[#5856D6]">
                        <GraduationCap className="h-4 w-4 text-white" aria-hidden />
                      </div>
                      <div className="min-w-0 flex-1 text-left">
                        <span className="truncate text-[17px]">{t(`tutorial.replayMenu.items.${id}`)}</span>
                      </div>
                      <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground/40" />
                    </button>
                    {index < TUTORIAL_REPLAY_MENU_ORDER.length - 1 ? (
                      <div className="ios-list-row-inset-sep" />
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </ScrollArea>
      </IosFixedPageHeaderShell>
    </motion.div>
  );
};
