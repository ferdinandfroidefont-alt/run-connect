import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Bell, Shield, FileText, Check, X, Languages, ChevronRight, ArrowLeft, Loader2 } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Language } from "@/lib/translations";
import { LANGUAGES_SORTED, LANGUAGE_INFO } from "@/lib/i18n/languageCatalog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { IosFixedPageHeaderShell } from "@/components/layout/IosFixedPageHeaderShell";

interface OnboardingDialogProps {
  isOpen: boolean;
  onComplete: () => void;
}

export const OnboardingDialog = ({ isOpen, onComplete }: OnboardingDialogProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { language, setLanguage, t } = useLanguage();
  const [step, setStep] = useState(0);
  const [selectedLanguage, setSelectedLanguage] = useState<Language>(language);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission | null>(null);
  const [acceptedRGPD, setAcceptedRGPD] = useState(false);
  const [acceptedSecurity, setAcceptedSecurity] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission);
    }
  }, []);

  const requestNotificationPermission = async () => {
    if ('Notification' in window) {
      try {
        const permission = await Notification.requestPermission();
        setNotificationPermission(permission);
        
        if (permission === 'granted') {
          toast({
            title: t('onboarding.notificationsGranted'),
            description: t('onboarding.notificationsDescription')
          });
        }
      } catch (error) {
        console.error('Error requesting notification permission:', error);
      }
    }
  };

  const handleComplete = async () => {
    if (!user) return;

    setLoading(true);
    try {
      await setLanguage(selectedLanguage, { manual: true });
      
      const { error } = await (supabase
        .from('profiles')
        .upsert({
          user_id: user.id,
          preferred_language: selectedLanguage,
          language_manually_set: true,
          notifications_enabled: notificationPermission === 'granted',
          rgpd_accepted: acceptedRGPD,
          security_rules_accepted: acceptedSecurity,
          onboarding_completed: true,
          updated_at: new Date().toISOString()
        } as any, {
          onConflict: 'user_id'
        }));

      if (error) throw error;

      toast({
        title: t('onboarding.setupComplete'),
        description: t('onboarding.setupCompleteDescription')
      });

      onComplete();
    } catch (error: any) {
      toast({
        title: t('common.error'),
        description: `${t('onboarding.completeErrorPrefix')}${error.message}`,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const canProceedToStep1 = selectedLanguage !== null;
  const canProceedToStep2 = notificationPermission !== null;
  const canComplete = acceptedRGPD && acceptedSecurity;

  return (
    <Dialog open={isOpen} onOpenChange={() => {}} modal>
      <DialogContent
        fullScreen
        hideCloseButton
        className="flex max-h-[100dvh] flex-col gap-0 overflow-hidden border-0 bg-secondary p-0 shadow-none"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <IosFixedPageHeaderShell
          className="h-full min-h-0"
          headerWrapperClassName="shrink-0"
          contentScroll
          scrollClassName="min-h-0 bg-secondary"
          header={
            <div className="border-b border-border bg-card">
              <div className="flex h-14 items-center justify-between px-4">
                {step > 0 ? (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 rounded-full"
                    onClick={() => setStep(step - 1)}
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </Button>
                ) : (
                  <div className="w-9" />
                )}
                <h1 className="text-[17px] font-semibold">{t("onboarding.title")}</h1>
                <div className="w-9" />
              </div>
            </div>
          }
        >
          <ScrollArea className="h-full min-h-0 flex-1">
            <div className="space-y-6 px-4 py-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
              {/* Step 0: Language */}
              {step === 0 && (
                <>
                  <div className="flex flex-col items-center pb-2 pt-4">
                    <div className="mb-4 flex h-[72px] w-[72px] items-center justify-center rounded-[22px] bg-primary shadow-lg shadow-primary/30 ring-1 ring-primary/20">
                      <Languages className="h-9 w-9 text-primary-foreground" />
                    </div>
                    <h2 className="text-xl font-bold">{t('onboarding.languageTitle')}</h2>
                    <p className="text-[13px] text-muted-foreground mt-1 text-center">
                      {t('onboarding.languageDescription')}
                    </p>
                  </div>

                  <div className="ios-card overflow-hidden">
                    <div className="border-b border-border px-4 py-3">
                      <p className="text-[13px] font-medium uppercase tracking-wider text-muted-foreground">
                        {t('onboarding.languageSectionLabel')}
                      </p>
                    </div>
                    <div className="p-4">
                      <Select value={selectedLanguage} onValueChange={(value) => setSelectedLanguage(value as Language)}>
                        <SelectTrigger className="w-full h-12 rounded-[10px] bg-secondary border-0">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {LANGUAGES_SORTED.map((code) => (
                            <SelectItem key={code} value={code}>
                              {LANGUAGE_INFO[code].nativeName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <Button
                    onClick={() => {
                      void setLanguage(selectedLanguage);
                      setStep(1);
                    }}
                    disabled={!canProceedToStep1}
                    className="h-12 w-full rounded-ios-md text-[17px] font-semibold shadow-md shadow-primary/15"
                  >
                    {t('onboarding.continue')}
                  </Button>
                </>
              )}

              {/* Step 1: Notifications */}
              {step === 1 && (
                <>
                  <div className="flex flex-col items-center pt-4 pb-2">
                    <div className="h-16 w-16 rounded-full bg-[#FF3B30] flex items-center justify-center mb-4">
                      <Bell className="h-8 w-8 text-white" />
                    </div>
                    <h2 className="text-xl font-bold">{t('onboarding.notificationsTitle')}</h2>
                    <p className="text-[13px] text-muted-foreground mt-1 text-center px-4">
                      {t('onboarding.notificationsDescription')}
                    </p>
                  </div>

                  <div className="ios-card overflow-hidden">
                    {notificationPermission === 'granted' ? (
                      <div className="flex items-center gap-2.5 px-4 py-3">
                        <div className="ios-list-row-icon bg-[#34C759]">
                          <Check className="h-[18px] w-[18px] text-white" />
                        </div>
                        <span className="text-[15px] font-medium text-[#34C759]">
                          {t('onboarding.notificationsGranted')}
                        </span>
                      </div>
                    ) : notificationPermission === 'denied' ? (
                      <div className="flex items-center gap-3 px-4 py-4">
                        <div className="h-[30px] w-[30px] rounded-[7px] bg-[#FF3B30] flex items-center justify-center">
                          <X className="h-[18px] w-[18px] text-white" />
                        </div>
                        <span className="text-[15px] font-medium text-[#FF3B30]">
                          {t('onboarding.notificationsDenied')}
                        </span>
                      </div>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={requestNotificationPermission}
                          className="flex w-full items-center justify-between px-4 py-3 transition-colors active:bg-secondary/50"
                        >
                          <div className="flex items-center gap-2.5">
                            <div className="ios-list-row-icon bg-[#007AFF]">
                              <Bell className="h-[18px] w-[18px] text-white" />
                            </div>
                            <span className="text-[15px] font-medium">{t('onboarding.allow')}</span>
                          </div>
                          <ChevronRight className="h-5 w-5 text-muted-foreground/40" />
                        </button>
                        <div className="ios-list-row-inset-sep" />
                        <button
                          type="button"
                          onClick={() => setNotificationPermission('denied')}
                          className="flex w-full items-center justify-between px-4 py-3 transition-colors active:bg-secondary/50"
                        >
                          <div className="flex items-center gap-2.5">
                            <div className="ios-list-row-icon bg-[#8E8E93]">
                              <X className="h-[18px] w-[18px] text-white" />
                            </div>
                            <span className="text-[15px] font-medium text-muted-foreground">{t('onboarding.skip')}</span>
                          </div>
                          <ChevronRight className="h-5 w-5 text-muted-foreground/40" />
                        </button>
                      </>
                    )}
                  </div>

                  <Button
                    onClick={() => setStep(2)}
                    disabled={!canProceedToStep2}
                    className="w-full h-12 rounded-[10px]"
                  >
                    {t('onboarding.continue')}
                  </Button>
                </>
              )}

              {/* Step 2: Consents */}
              {step === 2 && (
                <>
                  <div className="flex flex-col items-center pb-2 pt-4">
                    <div className="mb-4 flex h-[72px] w-[72px] items-center justify-center rounded-[22px] bg-[#34C759] shadow-lg shadow-green-600/25 ring-1 ring-white/10">
                      <Shield className="h-9 w-9 text-white" />
                    </div>
                    <h2 className="text-xl font-bold">{t('onboarding.termsTitle')}</h2>
                    <p className="text-[13px] text-muted-foreground mt-1 text-center">
                      {t('onboarding.termsSubtitle')}
                    </p>
                  </div>

                  {/* RGPD */}
                  <div className="space-y-2">
                    <h3 className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wider px-4">
                      {t('onboarding.rgpdTitle')}
                    </h3>
                    <div className="ios-card overflow-hidden">
                      <div className="border-b border-border px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="ios-list-row-icon bg-[#5856D6]">
                            <FileText className="h-[18px] w-[18px] text-white" />
                          </div>
                          <p className="text-[13px] text-muted-foreground flex-1">
                            {t('onboarding.rgpdDescription')}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setAcceptedRGPD(!acceptedRGPD)}
                        className="w-full flex items-center justify-between px-4 py-4 active:bg-secondary/50 transition-colors"
                      >
                        <span className="text-[15px] font-medium">{t('onboarding.rgpdAccept')}</span>
                        <Checkbox 
                          checked={acceptedRGPD}
                          onCheckedChange={(checked) => setAcceptedRGPD(checked as boolean)}
                        />
                      </button>
                    </div>
                  </div>

                  {/* Security */}
                  <div className="space-y-2">
                    <h3 className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wider px-4">
                      {t('onboarding.securityTitle')}
                    </h3>
                    <div className="ios-card overflow-hidden">
                      <div className="border-b border-border px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="ios-list-row-icon bg-[#34C759]">
                            <Shield className="h-[18px] w-[18px] text-white" />
                          </div>
                          <p className="text-[13px] text-muted-foreground flex-1">
                            {t('onboarding.securityDescription')}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setAcceptedSecurity(!acceptedSecurity)}
                        className="w-full flex items-center justify-between px-4 py-4 active:bg-secondary/50 transition-colors"
                      >
                        <span className="text-[15px] font-medium">{t('onboarding.securityAccept')}</span>
                        <Checkbox 
                          checked={acceptedSecurity}
                          onCheckedChange={(checked) => setAcceptedSecurity(checked as boolean)}
                        />
                      </button>
                    </div>
                  </div>

                  <Button
                    onClick={handleComplete}
                    disabled={!canComplete || loading}
                    className="h-12 w-full rounded-ios-md text-[17px] font-semibold shadow-md shadow-primary/15"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {t('onboarding.finishing')}
                      </>
                    ) : (
                      t('onboarding.finish')
                    )}
                  </Button>
                </>
              )}

              {/* Progress Dots */}
              <div className="flex justify-center gap-2 pt-4">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className={`h-2 w-2 rounded-full transition-colors ${
                      i === step ? 'bg-primary' : 'bg-border'
                    }`}
                  />
                ))}
              </div>
            </div>
          </ScrollArea>
        </IosFixedPageHeaderShell>
      </DialogContent>
    </Dialog>
  );
};
