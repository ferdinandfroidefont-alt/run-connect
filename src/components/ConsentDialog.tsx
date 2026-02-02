import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Shield, FileText, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ConsentDialogProps {
  userId: string;
  onComplete: () => void;
}

export const ConsentDialog = ({ userId, onComplete }: ConsentDialogProps) => {
  const [rgpdAccepted, setRgpdAccepted] = useState(false);
  const [securityAccepted, setSecurityAccepted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const canContinue = rgpdAccepted && securityAccepted;

  const handleAccept = async () => {
    if (!canContinue) return;

    setIsSubmitting(true);
    try {
      console.log('📝 [Consent] Enregistrement du consentement pour user:', userId);
      
      // 1. Mettre à jour le profil
      const { data: updatedProfile, error } = await supabase
        .from('profiles')
        .update({ 
          rgpd_accepted: true, 
          security_rules_accepted: true 
        })
        .eq('user_id', userId)
        .select('rgpd_accepted, security_rules_accepted')
        .single();

      if (error) throw error;

      console.log('✅ [Consent] Mise à jour réussie:', updatedProfile);

      // 2. Vérifier que les données sont bien lisibles (RLS check)
      const { data: verified, error: verifyError } = await supabase
        .from('profiles')
        .select('rgpd_accepted, security_rules_accepted')
        .eq('user_id', userId)
        .single();

      if (verifyError || !verified) {
        console.error('❌ [Consent] Vérification échouée:', verifyError);
        throw new Error('Consentement enregistré mais profil non lisible - vérifiez RLS');
      }

      if (!verified.rgpd_accepted || !verified.security_rules_accepted) {
        console.error('❌ [Consent] Données non mises à jour:', verified);
        throw new Error('Les données de consentement ne sont pas correctement enregistrées');
      }

      console.log('✅ [Consent] Vérification réussie, rafraîchissement du profil...');

      toast({
        title: "Consentement enregistré",
        description: "Bienvenue sur RunConnect !",
      });

      // 3. Rafraîchir le profil et attendre un peu pour que le contexte se mette à jour
      await onComplete();
      
      // 4. Forcer un petit délai pour laisser le contexte React se mettre à jour
      await new Promise(resolve => setTimeout(resolve, 300));
      
      console.log('✅ [Consent] Profil rechargé, le dialog devrait se fermer');
    } catch (error: any) {
      console.error('❌ [Consent] Erreur sauvegarde consentement:', error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible d'enregistrer votre consentement. Réessayez.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={true} modal>
      <DialogContent className="max-w-2xl max-h-[90vh] p-0 [&>button]:hidden">
        <DialogHeader className="p-6 pb-4 border-b">
          <DialogTitle className="text-2xl">Consentement obligatoire</DialogTitle>
          <DialogDescription>
            Avant d'utiliser RunConnect, vous devez accepter les conditions suivantes
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[500px] px-6">
          <div className="space-y-8 py-4">
            {/* RGPD Section */}
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-4 bg-primary/5 rounded-lg border border-primary/20">
                <FileText className="h-6 w-6 text-primary shrink-0 mt-1" />
                <div className="flex-1 space-y-3">
                  <h3 className="font-semibold text-lg">Règlement RGPD</h3>
                  
                  <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
                    <p>
                      En utilisant RunConnect, vous consentez au traitement de vos données personnelles 
                      dans le cadre de l'utilisation de l'application (création de profil, suivi de séances, 
                      géolocalisation).
                    </p>
                    
                    <p>
                      <strong className="text-foreground">Vos données ne sont ni revendues ni partagées à des tiers.</strong> 
                      {" "}Vous pouvez à tout moment consulter, modifier ou supprimer vos informations depuis votre compte.
                    </p>
                    
                    <p>
                      Le stockage est effectué de manière sécurisée sur nos serveurs Supabase, 
                      situés dans l'Union Européenne.
                    </p>
                    
                    <p className="pt-2 border-t">
                      📧 <strong>Contact RGPD :</strong>{" "}
                      <a href="mailto:ferdinand.froidefont@gmail.com" className="text-primary hover:underline">
                        ferdinand.froidefont@gmail.com
                      </a>
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t">
                    <label htmlFor="rgpd-switch" className="text-sm font-medium cursor-pointer">
                      J'accepte le traitement de mes données personnelles
                    </label>
                    <Switch
                      id="rgpd-switch"
                      checked={rgpdAccepted}
                      onCheckedChange={setRgpdAccepted}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Security Rules Section */}
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-4 bg-accent/5 rounded-lg border border-accent/20">
                <Shield className="h-6 w-6 text-accent shrink-0 mt-1" />
                <div className="flex-1 space-y-3">
                  <h3 className="font-semibold text-lg">Règles de sécurité et d'utilisation</h3>
                  
                  <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
                    <p>
                      RunConnect s'engage à garantir la sécurité de vos données et le bon usage de l'application.
                    </p>
                    
                    <div>
                      <p className="font-medium text-foreground mb-2">L'utilisateur s'engage à :</p>
                      <ul className="list-disc list-inside space-y-1 ml-2">
                        <li>Utiliser RunConnect uniquement pour ses activités sportives</li>
                        <li>Ne pas publier de contenu inapproprié</li>
                        <li>Ne pas partager de données d'autrui sans consentement</li>
                      </ul>
                    </div>
                    
                    <p className="pt-2 border-t">
                      <strong className="text-destructive">⚠️ Toute utilisation abusive entraînera la suspension du compte.</strong>
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t">
                    <label htmlFor="security-switch" className="text-sm font-medium cursor-pointer">
                      J'accepte les règles de sécurité et d'utilisation
                    </label>
                    <Switch
                      id="security-switch"
                      checked={securityAccepted}
                      onCheckedChange={setSecurityAccepted}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>

        <div className="p-6 pt-4 border-t bg-muted/30">
          <div className="flex justify-center w-full">
            <Button 
              onClick={handleAccept}
              disabled={!canContinue || isSubmitting}
              className="w-full h-12 text-base"
              size="lg"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Enregistrement...
                </>
              ) : (
                <>
                  {canContinue ? "✓ Continuer vers RunConnect" : "⚠️ Veuillez accepter les deux conditions"}
                </>
              )}
            </Button>
          </div>
          
          <p className="text-xs text-center text-muted-foreground mt-3">
            En continuant, vous acceptez nos conditions d'utilisation
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};
