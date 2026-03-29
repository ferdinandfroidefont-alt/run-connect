import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Languages, Key, Loader2, ArrowLeft, ChevronRight, MapPin, Sun, Moon, Monitor, Check, ChevronsUpDown, Ruler } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useLanguage } from "@/contexts/LanguageContext";
import { LANGUAGES_SORTED, LANGUAGE_INFO } from "@/lib/i18n/languageCatalog";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { motion } from "framer-motion";
import { useTheme } from "@/contexts/ThemeContext";
import { cn } from "@/lib/utils";
import { useDistanceUnits } from "@/contexts/DistanceUnitsContext";
import type { DistanceUnit } from "@/lib/distanceUnits";
import { IosFixedPageHeaderShell } from "@/components/layout/IosFixedPageHeaderShell";
import { IosPageHeaderBar } from "@/components/layout/IosPageHeaderBar";

interface SettingsGeneralProps {
  onBack: () => void;
}

const THEME_MODES = [
  { id: "light" as const, labelKey: "themeModeLight" as const, Icon: Sun },
  { id: "dark" as const, labelKey: "themeModeDark" as const, Icon: Moon },
  { id: "system" as const, labelKey: "themeModeSystem" as const, Icon: Monitor },
];

export const SettingsGeneral = ({ onBack }: SettingsGeneralProps) => {
  const { user } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();
  const [themeMounted, setThemeMounted] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [languageOpen, setLanguageOpen] = useState(false);
  const { unit, setUnit } = useDistanceUnits();

  useEffect(() => {
    setThemeMounted(true);
  }, []);

  const handlePasswordReset = async () => {
    if (!user?.email) {
      toast({
        title: t('common.error'),
        description: t('settings.emailError'),
        variant: "destructive",
      });
      return;
    }

    setIsChangingPassword(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
        redirectTo: window.AndroidBridge 
          ? 'app.runconnect://auth'
          : `${window.location.origin}/auth`,
      });

      if (error) throw error;

      toast({
        title: t('settings.emailSent'),
        description: t('settings.emailSentDescription'),
      });
    } catch (error: any) {
      toast({
        title: t('common.error'),
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsChangingPassword(false);
    }
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
          <div className="border-b border-border bg-card">
            <IosPageHeaderBar
              left={
                <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full" onClick={onBack}>
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              }
              title={t("settings.general")}
            />
          </div>
        }
      >
        <ScrollArea className="h-full min-h-0 min-w-0 flex-1 overflow-x-hidden">
        <div className="min-w-0 max-w-full space-y-4 overflow-x-hidden py-5">
          {/* Language & Theme */}
          <div className="space-y-2">
            <h3 className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wider px-4 ios-shell:px-2.5">
              {t('settings.appearance')}
            </h3>
            <div className="bg-card overflow-hidden">
              <div data-tutorial="settings-general-appearance">
              {/* Language Selector */}
              <div className="flex min-w-0 items-center gap-2.5 px-4 ios-shell:px-2.5 py-2.5">
                <div className="ios-list-row-icon bg-primary">
                  <Languages className="h-[18px] w-[18px] text-primary-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[15px] font-medium">{t('settings.language')}</p>
                  <p className="text-[13px] text-muted-foreground leading-snug">{t('settings.languageDescription')}</p>
                </div>
                <Popover open={languageOpen} onOpenChange={setLanguageOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      role="combobox"
                      aria-expanded={languageOpen}
                      className="h-10 min-w-[7rem] max-w-[min(200px,42%)] shrink-0 justify-between rounded-[10px] border-0 bg-secondary/50 px-3 text-[13px] font-medium"
                    >
                      <span className="truncate">{LANGUAGE_INFO[language].nativeName}</span>
                      <ChevronsUpDown className="ml-1 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[min(20rem,calc(100svw-2rem))] max-w-[calc(100%-1rem)] p-0 z-[9999]" align="end" sideOffset={8}>
                    <Command>
                      <CommandInput placeholder={t('settings.languageSearchPlaceholder')} className="h-11" />
                      <CommandList className="max-h-[min(320px,50vh)]">
                        <CommandEmpty>{t('settings.noLanguageMatch')}</CommandEmpty>
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
                                <span className="truncate font-medium">{LANGUAGE_INFO[code].nativeName}</span>
                                <span className="truncate text-xs text-muted-foreground">{LANGUAGE_INFO[code].name}</span>
                              </span>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              <div className="ios-list-row-inset-sep" />

              {/* Thème : clair / sombre / système */}
              <div className="space-y-2.5 px-4 ios-shell:px-2.5 py-2.5">
                <div className="flex items-center gap-2.5">
                  <div className="ios-list-row-icon bg-primary">
                    <Moon className="h-[18px] w-[18px] text-primary-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[15px] font-medium">{t("settings.theme")}</p>
                    <p className="text-[13px] text-muted-foreground leading-snug">
                      {t("settings.themeDescription")}
                    </p>
                  </div>
                </div>
                {!themeMounted ? (
                  <div className="h-11 rounded-[12px] bg-secondary animate-pulse" />
                ) : (
                  <div
                    className="flex rounded-[12px] bg-secondary/80 dark:bg-secondary p-1 gap-0.5 border border-border/50"
                    role="tablist"
                    aria-label={t("settings.theme")}
                  >
                    {THEME_MODES.map(({ id, labelKey, Icon }) => {
                      const label =
                        labelKey === "themeModeLight"
                          ? t("settings.themeModeLight")
                          : labelKey === "themeModeDark"
                            ? t("settings.themeModeDark")
                            : t("settings.themeModeSystem");
                      const active = (theme ?? "system") === id;
                      return (
                      <button
                        key={id}
                        type="button"
                        role="tab"
                        aria-selected={active}
                        onClick={() => setTheme(id)}
                        className={cn(
                          "flex-1 flex flex-col sm:flex-row items-center justify-center gap-1 py-2 px-1.5 rounded-[10px] text-[11px] sm:text-[12px] font-semibold transition-all min-h-[44px]",
                          active
                            ? "bg-card text-foreground shadow-sm ring-1 ring-border/80"
                            : "text-muted-foreground active:opacity-70 hover:text-foreground"
                        )}
                      >
                        <Icon className="h-4 w-4 shrink-0 opacity-90" />
                        <span className="leading-tight text-center">{label}</span>
                      </button>
                    );
                    })}
                  </div>
                )}
              </div>
              </div>

              <div className="ios-list-row-inset-sep" />

              <div className="space-y-2.5 px-4 ios-shell:px-2.5 py-2.5" data-tutorial="settings-general-units">
                <div className="flex items-center gap-2.5">
                  <div className="ios-list-row-icon bg-[#5E5CE6]">
                    <Ruler className="h-[18px] w-[18px] text-white" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[15px] font-medium">{t("settings.distanceUnit")}</p>
                    <p className="text-[13px] text-muted-foreground leading-snug">
                      {t("settings.distanceUnitDescription")}
                    </p>
                  </div>
                </div>
                <div
                  className="flex gap-0.5 rounded-[12px] border border-border/50 bg-secondary/80 p-1 dark:bg-secondary"
                  role="tablist"
                  aria-label={t("settings.distanceUnit")}
                >
                  {(["km", "mi"] as const).map((u: DistanceUnit) => {
                    const active = unit === u;
                    return (
                      <button
                        key={u}
                        type="button"
                        role="tab"
                        aria-selected={active}
                        onClick={async () => {
                          const ok = await setUnit(u);
                          if (!ok && user) {
                            toast({
                              title: t('common.error'),
                              description: t('settings.distanceUnitSaveError'),
                              variant: 'destructive',
                            });
                          }
                        }}
                        className={cn(
                          "min-h-[44px] flex-1 rounded-[10px] px-2 text-[12px] font-semibold transition-all",
                          active
                            ? "bg-card text-foreground shadow-sm ring-1 ring-border/80"
                            : "text-muted-foreground active:opacity-70 hover:text-foreground"
                        )}
                      >
                        {u === "km" ? t("settings.distanceUnitKm") : t("settings.distanceUnitMi")}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Account */}
          <div className="space-y-2">
            <h3 className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wider px-4 ios-shell:px-2.5">
              {t('settings.account')}
            </h3>
            <div className="bg-card overflow-hidden">
              {/* Password Reset */}
              <button 
                onClick={handlePasswordReset}
                disabled={isChangingPassword}
                className="w-full flex items-center gap-2.5 px-4 ios-shell:px-2.5 py-2.5 active:bg-secondary/50 transition-colors disabled:opacity-50"
              >
                <div className="ios-list-row-icon bg-[#FF9500]">
                  {isChangingPassword ? (
                    <Loader2 className="h-[18px] w-[18px] text-white animate-spin" />
                  ) : (
                    <Key className="h-[18px] w-[18px] text-white" />
                  )}
                </div>
                <div className="flex-1 text-left">
                  <p className="text-[15px] font-medium">{t('settings.password')}</p>
                  <p className="text-[13px] text-muted-foreground">{t('settings.passwordDescription')}</p>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground/40" />
              </button>
            </div>
          </div>

          {/* Map Settings */}
          <div className="space-y-2" data-tutorial="settings-general-map">
            <h3 className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wider px-4 ios-shell:px-2.5">
              {t('settings.map')}
            </h3>
            <div className="bg-card overflow-hidden">
              {/* Long Press to Create Session */}
              <div className="flex min-w-0 items-center gap-2.5 px-4 ios-shell:px-2.5 py-2.5">
                <div className="ios-list-row-icon bg-[#34C759]">
                  <MapPin className="h-[18px] w-[18px] text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[15px] font-medium">{t('settings.longPress')}</p>
                  <p className="text-[13px] text-muted-foreground">{t('settings.longPressDescription')}</p>
                </div>
                <Switch
                  checked={localStorage.getItem('enableLongPressCreate') === 'true'}
                  onCheckedChange={(checked) => {
                    localStorage.setItem('enableLongPressCreate', checked.toString());
                    toast({
                      title: t('settings.updated'),
                      description: checked ? t('settings.longPressEnabled') : t('settings.longPressDisabled')
                    });
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </ScrollArea>
      </IosFixedPageHeaderShell>
    </motion.div>
  );
};
