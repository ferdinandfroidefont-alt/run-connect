import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Bell, Shield, FileText, Check, X, Languages } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { languages, Language } from "@/lib/translations";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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
    if (!user) {
      console.error('No user found');
      return;
    }

    console.log('🚀 Starting onboarding completion for user:', user.id);
    console.log('📋 Current state:', {
      user_id: user.id,
      notifications_enabled: notificationPermission === 'granted',
      rgpd_accepted: acceptedRGPD,
      security_rules_accepted: acceptedSecurity,
      onboarding_completed: true,
      notificationPermission
    });

    setLoading(true);
    try {
      console.log('📤 Sending upsert request to profiles table...');
      
      // Sauvegarder la langue choisie
      setLanguage(selectedLanguage);
      
      // Utiliser upsert pour créer ou mettre à jour le profil
      const { error, data } = await supabase
        .from('profiles')
        .upsert({
          user_id: user.id,
          preferred_language: selectedLanguage,
          notifications_enabled: notificationPermission === 'granted',
          rgpd_accepted: acceptedRGPD,
          security_rules_accepted: acceptedSecurity,
          onboarding_completed: true,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        });

      console.log('📥 Upsert response received:', { data, error });

      if (error) {
        console.error('❌ Database error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        throw error;
      }

      console.log('✅ Onboarding completed successfully!');
      
      toast({
        title: t('onboarding.setupComplete'),
        description: t('onboarding.setupCompleteDescription')
      });

      onComplete();
    } catch (error: any) {
      console.error('💥 Onboarding error caught:', error);
      console.error('💥 Error type:', typeof error);
      console.error('💥 Error constructor:', error.constructor.name);
      console.error('💥 Full error object:', JSON.stringify(error, null, 2));
      
      toast({
        title: "Erreur",
        description: `Impossible de terminer la configuration: ${error.message || 'Erreur inconnue'}`,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const canProceedToStep1 = selectedLanguage !== null;
  const canProceedToStep2 = notificationPermission !== null;
  const canComplete = acceptedRGPD && acceptedSecurity;

  console.log('OnboardingDialog state:', {
    acceptedRGPD,
    acceptedSecurity,
    canComplete,
    user: user?.id
  });

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center">
            {t('onboarding.title')}
          </DialogTitle>
        </DialogHeader>

        {step === 0 && (
          <div className="space-y-6">
            <Card>
              <CardHeader className="text-center pb-3">
                <Languages className="h-12 w-12 mx-auto text-primary mb-2" />
                <CardTitle className="text-lg">{t('onboarding.languageTitle')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground text-center">
                  {t('onboarding.languageDescription')}
                </p>
                
                <Select value={selectedLanguage} onValueChange={(value) => setSelectedLanguage(value as Language)}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(languages).map(([code, { nativeName }]) => (
                      <SelectItem key={code} value={code}>{nativeName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            <Button
              onClick={() => {
                setLanguage(selectedLanguage);
                setStep(1);
              }}
              disabled={!canProceedToStep1}
              className="w-full"
            >
              {t('onboarding.continue')}
            </Button>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-6">
            <Card>
              <CardHeader className="text-center pb-3">
                <Bell className="h-12 w-12 mx-auto text-primary mb-2" />
                <CardTitle className="text-lg">{t('onboarding.notificationsTitle')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground text-center">
                  {t('onboarding.notificationsDescription')}
                </p>
                
                {notificationPermission === 'granted' && (
                  <div className="flex items-center justify-center gap-2 text-green-600">
                    <Check className="h-4 w-4" />
                    <span className="text-sm">{t('onboarding.notificationsGranted')}</span>
                  </div>
                )}
                
                {notificationPermission === 'denied' && (
                  <div className="flex items-center justify-center gap-2 text-red-600">
                    <X className="h-4 w-4" />
                    <span className="text-sm">{t('onboarding.notificationsDenied')}</span>
                  </div>
                )}
                
                <div className="flex gap-2">
                  <Button
                    onClick={requestNotificationPermission}
                    disabled={notificationPermission === 'granted'}
                    className="flex-1"
                  >
                    {notificationPermission === 'granted' ? t('onboarding.notificationsGranted') : t('onboarding.allow')}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setNotificationPermission('denied')}
                    disabled={notificationPermission !== null}
                    className="flex-1"
                  >
                    {t('onboarding.skip')}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setStep(0)}
                className="flex-1"
              >
                {t('onboarding.back')}
              </Button>
              <Button
                onClick={() => setStep(2)}
                disabled={!canProceedToStep2}
                className="flex-1"
              >
                {t('onboarding.continue')}
              </Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <div className="space-y-4">
              {/* RGPD */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <FileText className="h-5 w-5" />
                    {t('onboarding.rgpdTitle')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      {t('onboarding.rgpdDescription')}
                    </p>
                    <div className="flex items-start space-x-3 p-3 rounded-lg bg-muted/50 cursor-pointer hover:bg-muted/80 transition-colors"
                         onClick={() => {
                           console.log('RGPD checkbox clicked, current state:', acceptedRGPD);
                           setAcceptedRGPD(!acceptedRGPD);
                         }}>
                      <Checkbox 
                        id="rgpd" 
                        checked={acceptedRGPD}
                        onCheckedChange={(checked) => {
                          console.log('RGPD onCheckedChange:', checked);
                          setAcceptedRGPD(checked as boolean);
                        }}
                        className="mt-0.5"
                      />
                      <label 
                        htmlFor="rgpd" 
                        className="text-sm font-medium leading-relaxed cursor-pointer flex-1"
                      >
                        {t('onboarding.rgpdAccept')}
                      </label>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Sécurité */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Shield className="h-5 w-5" />
                    {t('onboarding.securityTitle')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      {t('onboarding.securityDescription')}
                    </p>
                    <div className="flex items-start space-x-3 p-3 rounded-lg bg-muted/50 cursor-pointer hover:bg-muted/80 transition-colors"
                         onClick={() => {
                           console.log('Security checkbox clicked, current state:', acceptedSecurity);
                           setAcceptedSecurity(!acceptedSecurity);
                         }}>
                      <Checkbox 
                        id="security" 
                        checked={acceptedSecurity}
                        onCheckedChange={(checked) => {
                          console.log('Security onCheckedChange:', checked);
                          setAcceptedSecurity(checked as boolean);
                        }}
                        className="mt-0.5"
                      />
                      <label 
                        htmlFor="security" 
                        className="text-sm font-medium leading-relaxed cursor-pointer flex-1"
                      >
                        {t('onboarding.securityAccept')}
                      </label>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setStep(1)}
                className="flex-1"
              >
                {t('onboarding.back')}
              </Button>
              <Button
                onClick={handleComplete}
                disabled={!canComplete || loading}
                className={`flex-1 ${!canComplete ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {loading ? t('onboarding.finishing') : t('onboarding.finish')}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};