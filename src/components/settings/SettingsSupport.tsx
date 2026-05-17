import { useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import {
  Mail,
  LogOut,
  Settings,
  ChevronRight,
  FileText,
  Info,
  Shield,
  GraduationCap,
  Scale,
  BookOpen,
  ChevronLeft,
} from "lucide-react";
import { AdminPremiumManager } from "@/components/AdminPremiumManager";
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
import { SupportInbox } from "@/components/settings/SupportInbox";

const SETTINGS_BG = "#F2F2F7";
const ACTION_BLUE = "#007AFF";
const CARD_SHADOW = "0 1px 3px rgba(0,0,0,0.04), 0 0 0 0.5px rgba(0,0,0,0.06)";

function SupportMaquetteSectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="m-0 px-4 pb-2 pt-5 text-[13px] font-extrabold uppercase tracking-[0.08em] text-[#8E8E93]">{children}</p>
  );
}

function SupportMaquetteCard({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`mx-4 overflow-hidden rounded-2xl bg-white ${className}`} style={{ boxShadow: CARD_SHADOW }}>
      {children}
    </div>
  );
}

function SupportMaquetteInsetSep() {
  return <div className="ml-16 h-px bg-[#E5E5EA]" />;
}

function SupportMaquetteRow({
  Icon,
  iconColor,
  label,
  subtitle,
  labelColor,
  highlighted,
  onClick,
  href,
}: {
  Icon: typeof Info;
  iconColor: string;
  label: string;
  subtitle?: string;
  labelColor?: string;
  highlighted?: boolean;
  onClick?: () => void;
  href?: string;
}) {
  const body = (
    <>
      <div
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px]"
        style={{ background: iconColor }}
      >
        <Icon className="h-[19px] w-[19px] text-white" strokeWidth={2.4} />
      </div>
      <div className="min-w-0 flex-1 text-left">
        <p
          className="m-0 text-[17px] font-bold tracking-tight"
          style={{ letterSpacing: "-0.01em", color: labelColor ?? "#0A0F1F" }}
        >
          {label}
        </p>
        {subtitle ? <p className="m-0 mt-0.5 text-[13px] text-[#8E8E93]">{subtitle}</p> : null}
      </div>
      <ChevronRight className="h-5 w-5 shrink-0 text-[#C7C7CC]" aria-hidden />
    </>
  );

  const className =
    "flex w-full min-w-0 items-center gap-3 px-3 py-3 text-left transition-colors active:bg-[#F8F8F8]";

  if (href) {
    return (
      <a href={href} className={className} style={{ background: highlighted ? `${ACTION_BLUE}08` : "transparent" }}>
        {body}
      </a>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={className}
      style={{ background: highlighted ? `${ACTION_BLUE}08` : "transparent" }}
    >
      {body}
    </button>
  );
}

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
    onClose();
    void signOut();
  };

  return (
    <motion.div
      initial={{ x: 100, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 100, opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="flex h-full min-h-0 min-w-0 max-w-full flex-col overflow-x-hidden"
      style={{
        background: SETTINGS_BG,
        fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif",
      }}
    >
      <IosFixedPageHeaderShell
        className="min-h-0 flex-1"
        headerWrapperClassName="shrink-0"
        contentScroll
        scrollClassName="min-h-0 bg-[#F2F2F7]"
        header={
          <div className="flex shrink-0 items-center bg-[#F2F2F7] px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
            <button
              type="button"
              onClick={onBack}
              className="flex shrink-0 items-center gap-0 transition-opacity active:opacity-70"
              style={{ width: 90 }}
            >
              <ChevronLeft className="h-6 w-6 shrink-0 text-[#007AFF]" strokeWidth={2.6} aria-hidden />
              <span
                className="text-[17px] font-medium tracking-tight text-[#007AFF]"
                style={{ letterSpacing: "-0.01em" }}
              >
                Retour
              </span>
            </button>
            <h1
              className="m-0 min-w-0 flex-1 text-center text-[18px] font-extrabold tracking-tight text-[#0A0F1F]"
              style={{ letterSpacing: "-0.02em" }}
            >
              Aide & Support
            </h1>
            <div className="shrink-0" style={{ width: 90 }} aria-hidden />
          </div>
        }
      >
        <div
          className="ios-scroll-region min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch]"
          data-tutorial="settings-support-help"
        >
          <div className="min-w-0 max-w-full pb-[max(2rem,env(safe-area-inset-bottom))]">
          <SupportMaquetteSectionLabel>MENTIONS LÉGALES</SupportMaquetteSectionLabel>
          <SupportMaquetteCard>
            <SupportMaquetteRow
              Icon={Info}
              iconColor={ACTION_BLUE}
              label="À propos"
              onClick={() => {
                onClose();
                navigate("/about");
              }}
            />
            <SupportMaquetteInsetSep />
            <SupportMaquetteRow
              Icon={Scale}
              iconColor="#FF9500"
              label="Mentions légales"
              onClick={() => {
                onClose();
                navigate("/legal");
              }}
            />
            <SupportMaquetteInsetSep />
            <SupportMaquetteRow
              Icon={FileText}
              iconColor="#5856D6"
              label="Conditions d'utilisation"
              onClick={() => {
                onClose();
                navigate("/terms");
              }}
            />
            <SupportMaquetteInsetSep />
            <SupportMaquetteRow
              Icon={Shield}
              iconColor="#34C759"
              label="Politique de confidentialité"
              onClick={() => {
                onClose();
                navigate("/privacy");
              }}
            />
          </SupportMaquetteCard>

          <SupportMaquetteSectionLabel>ASSISTANCE</SupportMaquetteSectionLabel>
          <SupportMaquetteCard>
            <SupportMaquetteRow
              Icon={BookOpen}
              iconColor="#5856D6"
              label={t("tutorial.catalogEntry")}
              onClick={() => onOpenTutorialCatalog?.()}
            />
            <SupportMaquetteInsetSep />
            <SupportMaquetteRow
              Icon={GraduationCap}
              iconColor="#FF9500"
              label={t("tutorial.restartTutorial")}
              onClick={handleRestartTutorial}
            />
            <SupportMaquetteInsetSep />
            <SupportMaquetteRow
              Icon={Mail}
              iconColor={ACTION_BLUE}
              label="Contacter le support"
              subtitle={getSupportEmail()}
              href={getSupportMailtoHref()}
            />
          </SupportMaquetteCard>

          <SupportMaquetteSectionLabel>CENTRE DE SUPPORT</SupportMaquetteSectionLabel>
          <SupportInbox variant="settingsMaquette" />

          <div data-tutorial="settings-support-account">
            <SupportMaquetteSectionLabel>COMPTE</SupportMaquetteSectionLabel>
            <SupportMaquetteCard>
              <SupportMaquetteRow Icon={LogOut} iconColor="#FF9500" label="Se déconnecter" onClick={handleSignOut} />
              {hasCreatorSupportAccess(user?.email, userProfile?.username) ? (
                <>
                  <SupportMaquetteInsetSep />
                  <SupportMaquetteRow
                    Icon={Settings}
                    iconColor="#5856D6"
                    label="Support créateur"
                    subtitle="Outils internes · RGPD"
                    labelColor={ACTION_BLUE}
                    highlighted
                    onClick={() => setShowAdminPremium(true)}
                  />
                  <AdminPremiumManager open={showAdminPremium} onOpenChange={setShowAdminPremium} />
                </>
              ) : null}
            </SupportMaquetteCard>

            <SupportMaquetteSectionLabel>ZONE DE DANGER</SupportMaquetteSectionLabel>
            <SupportMaquetteCard>
              <DeleteAccountCard onClose={onClose} riskSubtitle="Action irréversible" />
            </SupportMaquetteCard>
          </div>
          </div>
        </div>
      </IosFixedPageHeaderShell>
    </motion.div>
  );
};
