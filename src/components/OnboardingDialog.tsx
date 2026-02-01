import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Bell, Shield, FileText, Check, X, Languages, ChevronRight, ArrowLeft, Loader2 } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { languages, Language } from "@/lib/translations";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";

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
      setLanguage(selectedLanguage);
      
      const { error } = await (supabase
        .from('profiles')
        .upsert({
          user_id: user.id,
          preferred_language: selectedLanguage,
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
        title: "Erreur",
        description: `Impossible de terminer: ${error.message}`,
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
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent fullScreen className="p-0 gap-0 bg-secondary">
        <div className="flex flex-col h-full">
          {/* iOS Header */}
          <div className="bg-card border-b border-border">
            <div className="flex items-center justify-between px-4 h-[56px]">
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
              <h1 className="text-[17px] font-semibold">{t('onboarding.title')}</h1>
              <div className="w-9" />
            </div>
          </div>

          <ScrollArea className="flex-1">
            <div className="px-4 py-6 space-y-6">
              {/* Step 0: Language */}
              {step === 0 && (
                <>
                  <div className="flex flex-col items-center pt-4 pb-2">
                    <div className="h-16 w-16 rounded-full bg-[#007AFF] flex items-center justify-center mb-4">
                      <Languages className="h-8 w-8 text-white" />
                    </div>
                    <h2 className="text-xl font-bold">{t('onboarding.languageTitle')}</h2>
                    <p className="text-[13px] text-muted-foreground mt-1 text-center">
                      {t('onboarding.languageDescription')}
                    </p>
                  </div>

                  <div className="bg-card rounded-[10px] overflow-hidden">
                    <div className="px-4 py-3 border-b border-border">
                      <p className="text-[13px] text-muted-foreground uppercase tracking-wider">Langue</p>
                    </div>
                    <div className="p-4">
                      <Select value={selectedLanguage} onValueChange={(value) => setSelectedLanguage(value as Language)}>
                        <SelectTrigger className="w-full h-12 rounded-[10px] bg-secondary border-0">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(languages).map(([code, { nativeName }]) => (
                            <SelectItem key={code} value={code}>{nativeName}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <Button
                    onClick={() => { setLanguage(selectedLanguage); setStep(1); }}
                    disabled={!canProceedToStep1}
                    className="w-full h-12 rounded-[10px]"
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

                  <div className="bg-card rounded-[10px] overflow-hidden">
                    {notificationPermission === 'granted' ? (
                      <div className="flex items-center gap-3 px-4 py-4">
                        <div className="h-[30px] w-[30px] rounded-[7px] bg-[#34C759] flex items-center justify-center">
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
                          className="w-full flex items-center justify-between px-4 py-4 active:bg-secondary/50 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div className="h-[30px] w-[30px] rounded-[7px] bg-[#007AFF] flex items-center justify-center">
                              <Bell className="h-[18px] w-[18px] text-white" />
                            </div>
                            <span className="text-[15px] font-medium">{t('onboarding.allow')}</span>
                          </div>
                          <ChevronRight className="h-5 w-5 text-muted-foreground/40" />
                        </button>
                        <div className="h-px bg-border ml-[54px]" />
                        <button
                          type="button"
                          onClick={() => setNotificationPermission('denied')}
                          className="w-full flex items-center justify-between px-4 py-4 active:bg-secondary/50 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div className="h-[30px] w-[30px] rounded-[7px] bg-[#8E8E93] flex items-center justify-center">
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
                  <div className="flex flex-col items-center pt-4 pb-2">
                    <div className="h-16 w-16 rounded-full bg-[#34C759] flex items-center justify-center mb-4">
                      <Shield className="h-8 w-8 text-white" />
                    </div>
                    <h2 className="text-xl font-bold">Conditions d'utilisation</h2>
                    <p className="text-[13px] text-muted-foreground mt-1 text-center">
                      Veuillez accepter les conditions pour continuer
                    </p>
                  </div>

                  {/* RGPD */}
                  <div className="space-y-2">
                    <h3 className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wider px-4">
                      {t('onboarding.rgpdTitle')}
                    </h3>
                    <div className="bg-card rounded-[10px] overflow-hidden">
                      <div className="px-4 py-3 border-b border-border">
                        <div className="flex items-center gap-3">
                          <div className="h-[30px] w-[30px] rounded-[7px] bg-[#5856D6] flex items-center justify-center">
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
                    <div className="bg-card rounded-[10px] overflow-hidden">
                      <div className="px-4 py-3 border-b border-border">
                        <div className="flex items-center gap-3">
                          <div className="h-[30px] w-[30px] rounded-[7px] bg-[#34C759] flex items-center justify-center">
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
                    className="w-full h-12 rounded-[10px]"
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
        </div>
      </DialogContent>
    </Dialog>
  );
};
