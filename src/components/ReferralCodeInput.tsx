import { useState, useEffect } from 'react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Gift } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface ReferralCodeInputProps {
  onSuccess?: () => void;
}

export const ReferralCodeInput = ({ onSuccess }: ReferralCodeInputProps) => {
  const [referralCode, setReferralCode] = useState('');
  const [processing, setProcessing] = useState(false);
  const [codeApplied, setCodeApplied] = useState(false);
  const { toast } = useToast();

  // Auto-detect referral code from sessionStorage
  useEffect(() => {
    const savedCode = sessionStorage.getItem('referralCode');
    if (savedCode) {
      setReferralCode(savedCode.toUpperCase());
      setCodeApplied(true);
      console.log('🎁 Code de parrainage auto-détecté:', savedCode);
    }
  }, []);

  const handleSubmitReferral = async () => {
    if (!referralCode.trim()) return;

    try {
      setProcessing(true);
      
      const { data, error } = await supabase.functions.invoke('process-referral', {
        body: { referralCode: referralCode.trim().toUpperCase() }
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: "Parrainage réussi !",
          description: "Votre parrain vient de recevoir 1 jour de premium gratuit !",
        });
        setReferralCode('');
        onSuccess?.();
      } else {
        toast({
          title: "Code invalide",
          description: data.message || "Ce code de parrainage n'est pas valide ou a déjà été utilisé",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error('Error processing referral:', error);
      toast({
        title: "Erreur",
        description: "Impossible de traiter le code de parrainage",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Gift className="h-4 w-4" />
        <span>Avez-vous un code de parrainage ?</span>
        {codeApplied && (
          <span className="text-xs text-primary font-medium">✅ Code appliqué</span>
        )}
      </div>
      
      <div className="flex gap-2">
        <div className="flex-1">
          <Label htmlFor="referral-code" className="sr-only">
            Code de parrainage
          </Label>
          <Input
            id="referral-code"
            placeholder="Entrez votre code"
            value={referralCode}
            onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
            className="font-mono"
            maxLength={8}
          />
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={handleSubmitReferral}
          disabled={!referralCode.trim() || processing}
          className="shrink-0"
        >
          {processing ? "..." : "Valider"}
        </Button>
      </div>
      
      <p className="text-xs text-muted-foreground">
        En utilisant un code de parrainage, vous et votre parrain obtenez des avantages premium !
      </p>
    </div>
  );
};