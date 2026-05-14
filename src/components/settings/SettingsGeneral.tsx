import { useState, useEffect, type ComponentType, type ReactNode } from "react";

import { useToast } from "@/hooks/use-toast";
import {
  Languages,
  Key,
  Loader2,
  ChevronRight,
  MapPin,
  Sun,
  Moon,
  Monitor,
  Check,
  Ruler,
  RotateCcw,
  Sparkles,
  ChevronLeft,
  ChevronUp,
  ChevronDown,
  type LucideProps,
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useLanguage } from "@/contexts/LanguageContext";
import { LANGUAGES_SORTED, LANGUAGE_INFO } from "@/lib/i18n/languageCatalog";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { motion } from "framer-motion";
import { useTheme } from "@/contexts/ThemeContext";
import { cn } from "@/lib/utils";
import { useDistanceUnits } from "@/contexts/DistanceUnitsContext";
import type { DistanceUnit } from "@/lib/distanceUnits";
import { IosFixedPageHeaderShell } from "@/components/layout/IosFixedPageHeaderShell";
import { resetArrivalFlowForDev } from "@/lib/arrivalFlowDev";
import { clearOnboardingCompleted } from "@/lib/arrivalFlowStorage";

/** Palette / mesures alignées maquette RunConnect (9).jsx — sous-page Général */
const SETTINGS_BG = "#F2F2F7";
const SETTINGS_ACTION_BLUE = "#007AFF";
const SETTINGS_TITLE_INK = "#0A0F1F";
const SETTINGS_SUBTITLE = "#8E8E93";
const SETTINGS_CARD_SHADOW =
  "0 1px 3px rgba(0,0,0,0.04), 0 0 0 0.5px rgba(0,0,0,0.06)";
const SETTINGS_FONT =
  "-apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif";

interface SettingsGeneralProps {
  onBack: () => void;
}

const THEME_MODES = [
  { id: "light" as const, labelKey: "themeModeLight" as const, Icon: Sun },
  { id: "dark" as const, labelKey: "themeModeDark" as const, Icon: Moon },
  { id: "system" as const, labelKey: "themeModeSystem" as const, Icon: Monitor },
];

function SettingsMaquetteSubHeader({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <div
      className="flex flex-shrink-0 items-center px-4 pb-3 pt-3"
      style={{ background: SETTINGS_BG, fontFamily: SETTINGS_FONT }}
    >
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-0 transition-opacity active:opacity-70"
        style={{ width: 90 }}
      >
        <ChevronLeft className="h-6 w-6" color={SETTINGS_ACTION_BLUE} strokeWidth={2.6} />
        <span
          style={{
            fontSize: 17,
            fontWeight: 500,
            color: SETTINGS_ACTION_BLUE,
            letterSpacing: "-0.01em",
          }}
        >
          Retour
        </span>
      </button>
      <h1
        className="flex-1 text-center"
        style={{
          fontSize: 18,
          fontWeight: 800,
          color: SETTINGS_TITLE_INK,
          letterSpacing: "-0.02em",
          margin: 0,
          fontFamily: SETTINGS_FONT,
        }}
      >
        {title}
      </h1>
      <div style={{ width: 90 }} />
    </div>
  );
}

function SettingsMaquetteSectionLabel({ children }: { children: ReactNode }) {
  return (
    <p
      style={{
        fontSize: 13,
        fontWeight: 800,
        color: SETTINGS_SUBTITLE,
        letterSpacing: "0.08em",
        padding: "20px 16px 8px",
        margin: 0,
        fontFamily: SETTINGS_FONT,
      }}
    >
      {children}
    </p>
  );
}

function SettingsMaquetteSegmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { id: T; label: string; Icon?: ComponentType<LucideProps> }[];
  value: T;
  onChange: (id: T) => void;
}) {
  return (
    <div
      className="mx-3 mb-3 mt-1 flex p-1"
      style={{ background: "#E5E5EA", borderRadius: 12, fontFamily: SETTINGS_FONT }}
    >
      {options.map((o) => {
        const sel = value === o.id;
        return (
          <button
            key={o.id}
            type="button"
            onClick={() => onChange(o.id)}
            className="flex flex-1 flex-col items-center justify-center gap-1 py-2 transition-opacity active:opacity-80"
            style={{
              background: sel ? "white" : "transparent",
              borderRadius: 10,
              boxShadow: sel
                ? "0 1px 3px rgba(0,0,0,0.1), 0 0 0 0.5px rgba(0,0,0,0.04)"
                : "none",
              transition: "background 0.15s, box-shadow 0.15s",
            }}
          >
            {o.Icon && (
              <o.Icon className="h-[18px] w-[18px]" color={SETTINGS_TITLE_INK} strokeWidth={2.2} />
            )}
            <span
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: SETTINGS_TITLE_INK,
                letterSpacing: "-0.01em",
              }}
            >
              {o.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function SettingsMaquetteToggle({
  value,
  onChange,
}: {
  value: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className="flex-shrink-0 transition-opacity active:opacity-80"
      style={{
        width: 51,
        height: 31,
        borderRadius: 9999,
        background: value ? SETTINGS_ACTION_BLUE : "#E5E5EA",
        position: "relative",
        padding: 2,
        transition: "background 0.2s",
      }}
      aria-pressed={value}
    >
      <div
        style={{
          width: 27,
          height: 27,
          borderRadius: "50%",
          background: "white",
          boxShadow: "0 2px 4px rgba(0,0,0,0.15)",
          transition: "transform 0.2s",
          transform: value ? "translateX(20px)" : "translateX(0)",
        }}
      />
    </button>
  );
}

function SettingsMaquetteToggleRow({
  Icon,
  iconColor,
  label,
  subtitle,
  value,
  onChange,
}: {
  Icon: ComponentType<LucideProps>;
  iconColor: string;
  label: string;
  subtitle?: string;
  value: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <div className="flex items-center gap-3 px-3 py-3">
      <div
        className="flex flex-shrink-0 items-center justify-center"
        style={{ width: 36, height: 36, borderRadius: 10, background: iconColor }}
      >
        <Icon className="h-[19px] w-[19px] text-white" strokeWidth={2.4} />
      </div>
      <div className="min-w-0 flex-1" style={{ fontFamily: SETTINGS_FONT }}>
        <p
          style={{
            fontSize: 17,
            fontWeight: 700,
            color: SETTINGS_TITLE_INK,
            margin: 0,
            letterSpacing: "-0.01em",
          }}
        >
          {label}
        </p>
        {subtitle && (
          <p
            style={{
              fontSize: 13,
              color: SETTINGS_SUBTITLE,
              margin: 0,
              marginTop: 2,
              lineHeight: 1.3,
            }}
          >
            {subtitle}
          </p>
        )}
      </div>
      <SettingsMaquetteToggle value={value} onChange={onChange} />
    </div>
  );
}

function SettingsMaquetteActionRow({
  Icon,
  iconColor,
  label,
  subtitle,
  action,
}: {
  Icon: ComponentType<LucideProps>;
  iconColor: string;
  label: string;
  subtitle?: string;
  action: ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 px-3 py-3">
      <div
        className="flex flex-shrink-0 items-center justify-center"
        style={{ width: 36, height: 36, borderRadius: 10, background: iconColor }}
      >
        <Icon className="h-[19px] w-[19px] text-white" strokeWidth={2.4} />
      </div>
      <div className="min-w-0 flex-1" style={{ fontFamily: SETTINGS_FONT }}>
        <p
          style={{
            fontSize: 17,
            fontWeight: 700,
            color: SETTINGS_TITLE_INK,
            margin: 0,
            letterSpacing: "-0.01em",
          }}
        >
          {label}
        </p>
        {subtitle && (
          <p style={{ fontSize: 13, color: SETTINGS_SUBTITLE, margin: 0, marginTop: 2 }}>
            {subtitle}
          </p>
        )}
      </div>
      {action}
    </div>
  );
}

function SettingsMaquetteNavRow({
  Icon,
  iconNode,
  color,
  label,
  subtitle,
  onClick,
  disabled,
}: {
  Icon?: ComponentType<LucideProps>;
  iconNode?: ReactNode;
  color: string;
  label: string;
  subtitle?: string;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex w-full items-center gap-3 px-3 py-3 transition-colors active:bg-[#F8F8F8] disabled:opacity-50"
      style={{ background: "transparent", fontFamily: SETTINGS_FONT }}
    >
      <div
        className="flex flex-shrink-0 items-center justify-center"
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          background: color,
        }}
      >
        {iconNode ??
          (Icon ? <Icon className="h-[19px] w-[19px] text-white" strokeWidth={2.4} /> : null)}
      </div>
      <div className="min-w-0 flex-1 text-left">
        <p
          style={{
            fontSize: 17,
            fontWeight: 700,
            color: SETTINGS_TITLE_INK,
            margin: 0,
            letterSpacing: "-0.01em",
          }}
        >
          {label}
        </p>
        {subtitle && (
          <p style={{ fontSize: 13, color: SETTINGS_SUBTITLE, margin: 0, marginTop: 2 }}>
            {subtitle}
          </p>
        )}
      </div>
      <ChevronRight className="h-5 w-5 flex-shrink-0 text-[#C7C7CC]" />
    </button>
  );
}

function SettingsMaquetteCard({ children }: { children: ReactNode }) {
  return (
    <div
      className="mx-4 overflow-hidden"
      style={{
        background: "white",
        borderRadius: 16,
        boxShadow: SETTINGS_CARD_SHADOW,
        fontFamily: SETTINGS_FONT,
      }}
    >
      {children}
    </div>
  );
}

function RowSep() {
  return <div className="ml-[64px] h-px bg-[#E5E5EA]" />;
}

export const SettingsGeneral = ({ onBack }: SettingsGeneralProps) => {
  const { user } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();
  const [themeMounted, setThemeMounted] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [languageOpen, setLanguageOpen] = useState(false);
  const { unit, setUnit } = useDistanceUnits();
  const [longPressEnabled, setLongPressEnabled] = useState(() => {
    try {
      return localStorage.getItem("enableLongPressCreate") === "true";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    setThemeMounted(true);
  }, []);

  const handlePasswordReset = async () => {
    if (!user?.email) {
      toast({
        title: t("common.error"),
        description: t("settings.emailError"),
        variant: "destructive",
      });
      return;
    }

    setIsChangingPassword(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
        redirectTo: window.AndroidBridge ? "app.runconnect://auth" : `${window.location.origin}/auth`,
      });

      if (error) throw error;

      toast({
        title: t("settings.emailSent"),
        description: t("settings.emailSentDescription"),
      });
    } catch (error: unknown) {
      toast({
        title: t("common.error"),
        description: error instanceof Error ? error.message : String(error),
        variant: "destructive",
      });
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleResetOnboardingForDev = () => {
    if (!import.meta.env.DEV) return;
    const confirmed = window.confirm(
      "Réinitialiser le tunnel d’arrivée pour ce compte ? Vous reverrez consentement, onboarding et permissions au prochain passage."
    );
    if (!confirmed) return;

    resetArrivalFlowForDev(user?.id);
    toast({
      title: "Onboarding réinitialisé",
      description: "Le tunnel d’arrivée est prêt à être rejoué.",
    });
  };

  const handleReplayOnboarding = () => {
    if (!user?.id) return;
    const confirmed = window.confirm("Voulez-vous revoir l’onboarding maintenant ?");
    if (!confirmed) return;
    clearOnboardingCompleted(user.id);
    toast({
      title: "Onboarding relancé",
      description: "Vous allez revoir le tunnel d’arrivée.",
    });
    window.location.assign("/onboarding");
  };

  const onLongPressChange = (checked: boolean) => {
    localStorage.setItem("enableLongPressCreate", checked.toString());
    setLongPressEnabled(checked);
    toast({
      title: t("settings.updated"),
      description: checked ? t("settings.longPressEnabled") : t("settings.longPressDisabled"),
    });
  };

  return (
    <motion.div
      initial={{ x: 100, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 100, opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="flex h-full min-h-0 min-w-0 max-w-full flex-col overflow-x-hidden"
      style={{ background: SETTINGS_BG, fontFamily: SETTINGS_FONT }}
    >
      <IosFixedPageHeaderShell
        className="min-h-0 flex-1"
        headerWrapperClassName="shrink-0"
        contentScroll
        scrollClassName="min-h-0"
        scrollProps={{ style: { backgroundColor: SETTINGS_BG } }}
        header={
          <div className="shrink-0" style={{ background: SETTINGS_BG }}>
            <SettingsMaquetteSubHeader title={t("settings.general")} onBack={onBack} />
          </div>
        }
      >
        <ScrollArea className="h-full min-h-0 min-w-0 flex-1 overflow-x-hidden">
          <div className="min-w-0 max-w-full overflow-x-hidden pb-8" style={{ background: SETTINGS_BG }}>
            {/* APPARENCE */}
            <SettingsMaquetteSectionLabel>
              {t("settings.appearance").toUpperCase()}
            </SettingsMaquetteSectionLabel>
            <SettingsMaquetteCard>
              <div data-tutorial="settings-general-appearance">
                <SettingsMaquetteActionRow
                  Icon={Languages}
                  iconColor={SETTINGS_ACTION_BLUE}
                  label={t("settings.language")}
                  subtitle={t("settings.languageDescription")}
                  action={
                    <Popover open={languageOpen} onOpenChange={setLanguageOpen}>
                      <PopoverTrigger asChild>
                        <button
                          type="button"
                          className="flex items-center gap-1 px-3 py-1.5 transition-opacity active:opacity-80"
                          style={{
                            background: "#F2F2F7",
                            borderRadius: 9999,
                          }}
                        >
                          <span
                            style={{
                              fontSize: 14,
                              fontWeight: 600,
                              color: SETTINGS_TITLE_INK,
                              fontFamily: SETTINGS_FONT,
                            }}
                          >
                            {LANGUAGE_INFO[language].nativeName}
                          </span>
                          <div className="-my-1 flex flex-col">
                            <ChevronUp
                              className="-mb-0.5 h-3 w-3"
                              color={SETTINGS_SUBTITLE}
                              strokeWidth={2.4}
                            />
                            <ChevronDown
                              className="-mt-0.5 h-3 w-3"
                              color={SETTINGS_SUBTITLE}
                              strokeWidth={2.4}
                            />
                          </div>
                        </button>
                      </PopoverTrigger>
                      <PopoverContent
                        className="z-[9999] w-[min(20rem,calc(100svw-2rem))] max-w-[calc(100%-1rem)] p-0"
                        align="end"
                        sideOffset={8}
                      >
                        <Command>
                          <CommandInput
                            placeholder={t("settings.languageSearchPlaceholder")}
                            className="h-11"
                          />
                          <CommandList className="max-h-[min(320px,50vh)]">
                            <CommandEmpty>{t("settings.noLanguageMatch")}</CommandEmpty>
                            <CommandGroup>
                              {LANGUAGES_SORTED.map((code) => (
                                <CommandItem
                                  key={code}
                                  value={`${LANGUAGE_INFO[code].nativeName} ${LANGUAGE_INFO[code].name} ${code}`}
                                  onSelect={() => {
                                    void setLanguage(code, { manual: true });
                                    setLanguageOpen(false);
                                  }}
                                  className="cursor-pointer"
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4 shrink-0",
                                      language === code ? "opacity-100" : "opacity-0"
                                    )}
                                  />
                                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                                    <span className="truncate font-medium">
                                      {LANGUAGE_INFO[code].nativeName}
                                    </span>
                                    <span className="truncate text-xs text-muted-foreground">
                                      {LANGUAGE_INFO[code].name}
                                    </span>
                                  </span>
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  }
                />
              </div>

              <RowSep />

              {/* Thème */}
              <div>
                <div className="flex items-center gap-3 px-3 pb-2 pt-3">
                  <div
                    className="flex flex-shrink-0 items-center justify-center"
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      background: SETTINGS_ACTION_BLUE,
                    }}
                  >
                    <Moon className="h-[19px] w-[19px] text-white" strokeWidth={2.4} />
                  </div>
                  <div className="flex-1" style={{ fontFamily: SETTINGS_FONT }}>
                    <p
                      style={{
                        fontSize: 17,
                        fontWeight: 700,
                        color: SETTINGS_TITLE_INK,
                        margin: 0,
                        letterSpacing: "-0.01em",
                      }}
                    >
                      {t("settings.theme")}
                    </p>
                    <p style={{ fontSize: 13, color: SETTINGS_SUBTITLE, margin: 0, marginTop: 2 }}>
                      {t("settings.themeDescription")}
                    </p>
                  </div>
                </div>
                {!themeMounted ? (
                  <div className="mx-3 mb-3 mt-1 h-[72px] animate-pulse rounded-[12px] bg-[#E5E5EA]" />
                ) : (
                  <SettingsMaquetteSegmented
                    value={(theme ?? "system") as "light" | "dark" | "system"}
                    onChange={(id) => void setTheme(id)}
                    options={THEME_MODES.map(({ id, labelKey, Icon }) => ({
                      id,
                      Icon,
                      label:
                        labelKey === "themeModeLight"
                          ? t("settings.themeModeLight")
                          : labelKey === "themeModeDark"
                            ? t("settings.themeModeDark")
                            : t("settings.themeModeSystem"),
                    }))}
                  />
                )}
              </div>

              <RowSep />

              {/* Unités */}
              <div data-tutorial="settings-general-units">
                <div className="flex items-center gap-3 px-3 pb-2 pt-3">
                  <div
                    className="flex flex-shrink-0 items-center justify-center"
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      background: "#5856D6",
                    }}
                  >
                    <Ruler className="h-[19px] w-[19px] text-white" strokeWidth={2.4} />
                  </div>
                  <div className="flex-1" style={{ fontFamily: SETTINGS_FONT }}>
                    <p
                      style={{
                        fontSize: 17,
                        fontWeight: 700,
                        color: SETTINGS_TITLE_INK,
                        margin: 0,
                        letterSpacing: "-0.01em",
                      }}
                    >
                      {t("settings.distanceUnit")}
                    </p>
                    <p style={{ fontSize: 13, color: SETTINGS_SUBTITLE, margin: 0, marginTop: 2 }}>
                      {t("settings.distanceUnitDescription")}
                    </p>
                  </div>
                </div>
                <SettingsMaquetteSegmented
                  value={unit}
                  onChange={async (u) => {
                    const ok = await setUnit(u as DistanceUnit);
                    if (!ok && user) {
                      toast({
                        title: t("common.error"),
                        description: t("settings.distanceUnitSaveError"),
                        variant: "destructive",
                      });
                    }
                  }}
                  options={[
                    { id: "km" as const, label: t("settings.distanceUnitKm") },
                    { id: "mi" as const, label: t("settings.distanceUnitMi") },
                  ]}
                />
              </div>
            </SettingsMaquetteCard>

            {/* COMPTE */}
            <SettingsMaquetteSectionLabel>
              {t("settings.account").toUpperCase()}
            </SettingsMaquetteSectionLabel>
            <SettingsMaquetteCard>
              <SettingsMaquetteNavRow
                color="#FF9500"
                iconNode={
                  isChangingPassword ? (
                    <Loader2 className="h-[19px] w-[19px] animate-spin text-white" strokeWidth={2.4} />
                  ) : (
                    <Key className="h-[19px] w-[19px] text-white" strokeWidth={2.4} />
                  )
                }
                label={t("settings.password")}
                subtitle={t("settings.passwordDescription")}
                onClick={handlePasswordReset}
                disabled={isChangingPassword}
              />
              <RowSep />
              <SettingsMaquetteNavRow
                Icon={Sparkles}
                color={SETTINGS_ACTION_BLUE}
                label="Revoir l’onboarding"
                subtitle="Relancer le tunnel d’arrivée"
                onClick={handleReplayOnboarding}
              />
            </SettingsMaquetteCard>

            {/* CARTE */}
            <div data-tutorial="settings-general-map">
              <SettingsMaquetteSectionLabel>{t("settings.map").toUpperCase()}</SettingsMaquetteSectionLabel>
              <SettingsMaquetteCard>
                <SettingsMaquetteToggleRow
                  Icon={MapPin}
                  iconColor="#34C759"
                  label={t("settings.longPress")}
                  subtitle={t("settings.longPressDescription")}
                  value={longPressEnabled}
                  onChange={onLongPressChange}
                />
              </SettingsMaquetteCard>
            </div>

            {import.meta.env.DEV && (
              <>
                <SettingsMaquetteSectionLabel>DÉVELOPPEMENT</SettingsMaquetteSectionLabel>
                <SettingsMaquetteCard>
                  <SettingsMaquetteNavRow
                    Icon={RotateCcw}
                    color="#FF3B30"
                    label="Réinitialiser onboarding"
                    subtitle="Rejouer le tunnel d’arrivée (consentement + onboarding)"
                    onClick={handleResetOnboardingForDev}
                  />
                </SettingsMaquetteCard>
              </>
            )}
          </div>
        </ScrollArea>
      </IosFixedPageHeaderShell>
    </motion.div>
  );
};
