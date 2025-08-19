import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Bell, Shield, FileText, Check, X } from "lucide-react";

interface OnboardingDialogProps {
  isOpen: boolean;
  onComplete: () => void;
}

export const OnboardingDialog = ({ isOpen, onComplete }: OnboardingDialogProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
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
            title: "Notifications activées",
            description: "Vous recevrez désormais des notifications pour les nouvelles séances et messages."
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
      // Mettre à jour le profil avec les acceptations
      const { error } = await supabase
        .from('profiles')
        .update({
          notifications_enabled: notificationPermission === 'granted',
          rgpd_accepted: acceptedRGPD,
          security_rules_accepted: acceptedSecurity,
          onboarding_completed: true,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id);

      if (error) throw error;

      toast({
        title: "Configuration terminée",
        description: "Votre compte est maintenant configuré et prêt à l'emploi!"
      });

      onComplete();
    } catch (error: any) {
      console.error('Error completing onboarding:', error);
      toast({
        title: "Erreur",
        description: "Impossible de terminer la configuration",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const canProceedToStep2 = notificationPermission !== null;
  const canComplete = acceptedRGPD && acceptedSecurity;

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center">
            Configuration de votre compte
          </DialogTitle>
        </DialogHeader>

        {step === 1 && (
          <div className="space-y-6">
            <Card>
              <CardHeader className="text-center pb-3">
                <Bell className="h-12 w-12 mx-auto text-primary mb-2" />
                <CardTitle className="text-lg">Notifications</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground text-center">
                  Autorisez les notifications pour être informé des nouvelles séances, demandes de participation et messages.
                </p>
                
                {notificationPermission === 'granted' && (
                  <div className="flex items-center justify-center gap-2 text-green-600">
                    <Check className="h-4 w-4" />
                    <span className="text-sm">Notifications autorisées</span>
                  </div>
                )}
                
                {notificationPermission === 'denied' && (
                  <div className="flex items-center justify-center gap-2 text-red-600">
                    <X className="h-4 w-4" />
                    <span className="text-sm">Notifications refusées</span>
                  </div>
                )}
                
                <div className="flex gap-2">
                  <Button
                    onClick={requestNotificationPermission}
                    disabled={notificationPermission === 'granted'}
                    className="flex-1"
                  >
                    {notificationPermission === 'granted' ? 'Autorisées' : 'Autoriser'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setNotificationPermission('denied')}
                    disabled={notificationPermission !== null}
                    className="flex-1"
                  >
                    Passer
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Button
              onClick={() => setStep(2)}
              disabled={!canProceedToStep2}
              className="w-full"
            >
              Continuer
            </Button>
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
                    Règlement RGPD
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      Nous collectons et traitons vos données personnelles (nom, email, photo de profil) 
                      uniquement dans le cadre de l'utilisation de l'application. Vous disposez d'un droit 
                      d'accès, de rectification et de suppression de vos données.
                    </p>
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="rgpd" 
                        checked={acceptedRGPD}
                        onCheckedChange={(checked) => setAcceptedRGPD(checked as boolean)}
                      />
                      <label 
                        htmlFor="rgpd" 
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        J'accepte le traitement de mes données personnelles
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
                    Règles de sécurité
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      Pour votre sécurité et celle des autres utilisateurs, vous vous engagez à :
                      ne pas partager vos identifiants, signaler tout comportement inapproprié, 
                      et respecter les autres membres de la communauté.
                    </p>
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="security" 
                        checked={acceptedSecurity}
                        onCheckedChange={(checked) => setAcceptedSecurity(checked as boolean)}
                      />
                      <label 
                        htmlFor="security" 
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        J'accepte les règles de sécurité et d'utilisation
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
                Retour
              </Button>
              <Button
                onClick={handleComplete}
                disabled={!canComplete || loading}
                className="flex-1"
              >
                {loading ? "Configuration..." : "Terminer"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};