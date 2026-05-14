import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Mail, LogOut, Settings, ChevronRight, FileText, Info, Shield, GraduationCap, Scale, BookOpen } from "lucide-react";
import { AdminPremiumManager } from "@/components/AdminPremiumManager";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/hooks/useAuth";
import { useUserProfile } from "@/contexts/UserProfileContext";
import { hasCreatorSupportAccess } from "@/lib/creatorSupportAccess";
import { useTutorial } from "@/hooks/useTutorial";
import { notifyTutorialReplayQueued } from "@/lib/tutorials/registry";
import { useLanguage } from "@/contexts/LanguageContext";
import { getSupportEmail, getSupportMailtoHref } from "@/lib/legalMeta";
import { DeleteAccountCard } from "@/components/settings/DeleteAccountCard";
import { motion } from "framer-motion";
import { IosFixedPageHeaderShell } from "@/components/layout/IosFixedPageHeaderShell";
import { IosPageHeaderBar } from "@/components/layout/IosPageHeaderBar";
import { SupportInbox } from "@/components/settings/SupportInbox";


interface SettingsSupportProps {
  onBack: () => void;
  onClose: () => void;
  onOpenTutorialCatalog?: () => void;
}

export const SettingsSupport = ({ onBack, onClose, onOpenTutorialCatalog }: SettingsSupportProps) => {
  const { user, signOut } = useAuth();
  const { userProfile } = useUserProfile();
  const { t } = useLanguage();
  const { restartTutorial } = useTutorial();
  const [showAdminPremium, setShowAdminPremium] = useState(false);
  const navigate = useNavigate();

  const handleRestartTutorial = () => {
    restartTutorial();
    onClose();
    navigate("/");
    window.setTimeout(() => notifyTutorialReplayQueued(), 60);
  };

  const handleSignOut = () => {
    // Fermer le dialog d’abord pour que Radix retire scroll-lock / pointer-events sur body,
    // puis navigation forcée dans signOut (évite boutons Auth morts après déconnexion).
    onClose();
    void signOut();
  };

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
            <IosPageHeaderBar leadingBack={{ onClick: onBack }} title="Aide & Support" />
          </div>
        }
      >
        <ScrollArea className="h-full min-h-0 min-w-0 flex-1 overflow-x-hidden">
        <div className="min-w-0 max-w-full space-y-4 overflow-x-hidden py-5">
          <div className="space-y-4" data-tutorial="settings-support-help">
          {/* Legal */}
          <div className="space-y-2">
            <h3 className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wider px-4 ios-shell:px-2.5">
              Mentions légales
            </h3>
            <div className="bg-card overflow-hidden">
              <button 
                onClick={() => { onClose(); navigate('/about'); }}
                className="w-full flex items-center gap-2.5 px-4 ios-shell:px-2.5 py-2.5 active:bg-secondary/50 transition-colors"
              >
                <div className="ios-list-row-icon bg-[#007AFF]">
                  <Info className="h-[18px] w-[18px] text-white" />
                </div>
                <div className="min-w-0 flex-1 text-left">
                  <p className="truncate text-[15px] font-medium">À propos</p>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground/40" />
              </button>

              <div className="ios-list-row-inset-sep" />

              <button
                onClick={() => {
                  onClose();
                  navigate("/legal");
                }}
                className="w-full flex items-center gap-2.5 px-4 ios-shell:px-2.5 py-2.5 active:bg-secondary/50 transition-colors"
              >
                <div className="ios-list-row-icon bg-[#FF9500]">
                  <Scale className="h-[18px] w-[18px] text-white" />
                </div>
                <div className="min-w-0 flex-1 text-left">
                  <p className="truncate text-[15px] font-medium">Mentions légales</p>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground/40" />
              </button>

              <div className="ios-list-row-inset-sep" />

              <button 
                onClick={() => { onClose(); navigate('/terms'); }}
                className="w-full flex items-center gap-2.5 px-4 ios-shell:px-2.5 py-2.5 active:bg-secondary/50 transition-colors"
              >
                <div className="ios-list-row-icon bg-[#5856D6]">
                  <FileText className="h-[18px] w-[18px] text-white" />
                </div>
                <div className="min-w-0 flex-1 text-left">
                  <p className="truncate text-[15px] font-medium">Conditions d'utilisation</p>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground/40" />
              </button>

              <div className="ios-list-row-inset-sep" />

              <button 
                onClick={() => { onClose(); navigate('/privacy'); }}
                className="w-full flex items-center gap-2.5 px-4 ios-shell:px-2.5 py-2.5 active:bg-secondary/50 transition-colors"
              >
                <div className="ios-list-row-icon bg-[#34C759]">
                  <Shield className="h-[18px] w-[18px] text-white" />
                </div>
                <div className="min-w-0 flex-1 text-left">
                  <p className="truncate text-[15px] font-medium">Politique de confidentialité</p>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground/40" />
              </button>
            </div>
          </div>

          {/* Support */}
          <div className="space-y-2">
            <h3 className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wider px-4 ios-shell:px-2.5">
              Assistance
            </h3>
            <div className="bg-card overflow-hidden">
              <button
                type="button"
                onClick={onOpenTutorialCatalog}
                className="w-full flex items-center gap-2.5 px-4 ios-shell:px-2.5 py-2.5 active:bg-secondary/50 transition-colors"
              >
                <div className="ios-list-row-icon bg-[#5856D6]">
                  <BookOpen className="h-[18px] w-[18px] text-white" />
                </div>
                <div className="min-w-0 flex-1 text-left">
                  <p className="truncate text-[15px] font-medium">{t("tutorial.catalogEntry")}</p>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground/40" />
              </button>

              <div className="ios-list-row-inset-sep" />

              <button 
                onClick={handleRestartTutorial}
                className="w-full flex items-center gap-2.5 px-4 ios-shell:px-2.5 py-2.5 active:bg-secondary/50 transition-colors"
              >
                <div className="ios-list-row-icon bg-[#FF9500]">
                  <GraduationCap className="h-[18px] w-[18px] text-white" />
                </div>
                <div className="min-w-0 flex-1 text-left">
                  <p className="truncate text-[15px] font-medium">{t('tutorial.restartTutorial')}</p>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground/40" />
              </button>

              <div className="ios-list-row-inset-sep" />

              {/* Contact */}
              <a 
                href={getSupportMailtoHref()}
                className="w-full flex items-center gap-2.5 px-4 ios-shell:px-2.5 py-2.5 active:bg-secondary/50 transition-colors"
              >
                <div className="ios-list-row-icon bg-[#007AFF]">
                  <Mail className="h-[18px] w-[18px] text-white" />
                </div>
                <div className="min-w-0 flex-1 text-left">
                  <p className="truncate text-[15px] font-medium">Contacter le support</p>
                  <p className="text-[13px] text-muted-foreground">{getSupportEmail()}</p>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground/40" />
              </a>
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wider px-4 ios-shell:px-2.5">
              Centre de support
            </h3>
            <div className="px-4 ios-shell:px-2.5">
              <SupportInbox />
            </div>
          </div>
          </div>

          <div className="space-y-4" data-tutorial="settings-support-account">
          {/* Actions */}
          <div className="space-y-2">
            <h3 className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wider px-4 ios-shell:px-2.5">
              Compte
            </h3>
            <div className="bg-card overflow-hidden">
              <button 
                onClick={handleSignOut}
                className="w-full flex items-center gap-2.5 px-4 ios-shell:px-2.5 py-2.5 active:bg-secondary/50 transition-colors"
              >
                <div className="ios-list-row-icon bg-[#FF9500]">
                  <LogOut className="h-[18px] w-[18px] text-white" />
                </div>
                <div className="min-w-0 flex-1 text-left">
                  <p className="truncate text-[15px] font-medium">Se déconnecter</p>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground/40" />
              </button>

              {/* Creator Mode */}
              {hasCreatorSupportAccess(user?.email, userProfile?.username) && (
                <>
                  <div className="ios-list-row-inset-sep" />
                  <button 
                    onClick={() => setShowAdminPremium(true)}
                    className="w-full flex items-center gap-2.5 px-4 ios-shell:px-2.5 py-2.5 bg-primary/5 active:bg-primary/10 transition-colors"
                  >
                    <div className="ios-list-row-icon bg-[#5856D6]">
                      <Settings className="h-[18px] w-[18px] text-white" />
                    </div>
                    <div className="min-w-0 flex-1 text-left">
                      <p className="text-[15px] font-medium text-primary">Support créateur</p>
                      <p className="text-[12px] text-muted-foreground">Outils internes · RGPD</p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-primary/50" />
                  </button>
                  <AdminPremiumManager open={showAdminPremium} onOpenChange={setShowAdminPremium} />
                </>
              )}
            </div>
          </div>


          {/* Danger Zone */}
          <div className="space-y-2">
            <h3 className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wider px-4 ios-shell:px-2.5">
              Zone de danger
            </h3>
            <DeleteAccountCard onClose={onClose} />
          </div>
          </div>
        </div>
      </ScrollArea>
      </IosFixedPageHeaderShell>
    </motion.div>
  );
};
