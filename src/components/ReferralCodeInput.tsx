import { useState, useEffect } from 'react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Gift } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface ReferralCodeInputProps {
  onSuccess?: () => void;
  /** Styles carte inscription maquette HTML (#F2F2F7 + carte blanche 14px). */
  appearance?: "default" | "authSignup";
}

export const ReferralCodeInput = ({ onSuccess, appearance = "default" }: ReferralCodeInputProps) => {
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
          description: "Ton parrain gagne 1 jour Premium et tu débloques 1 semaine offerte.",
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

  if (appearance === "authSignup") {
    return (
      <div
        className={cn(
          "mt-5 rounded-[14px] bg-white p-4",
          "shadow-[0_1px_3px_rgba(0,0,0,0.04),0_0_0_0.5px_rgba(0,0,0,0.06)]",
        )}
      >
        <div className="mb-2.5 flex items-center gap-2">
          <span className="text-[18px]" aria-hidden>
            🎁
          </span>
          <p className="m-0 text-[15px] font-bold tracking-[-0.01em] text-[#0A0F1F]">
            Avez-vous un code de parrainage ?
          </p>
          {codeApplied && (
            <span className="ml-auto text-[12px] font-semibold text-[#007AFF]">✅ Code appliqué</span>
          )}
        </div>
        <div className="flex min-w-0 items-center gap-2">
          <Label htmlFor="referral-code-auth" className="sr-only">
            Code de parrainage
          </Label>
          <input
            id="referral-code-auth"
            placeholder="Entrez votre code"
            value={referralCode}
            onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
            maxLength={8}
            className="min-w-0 flex-1 rounded-full border-0 bg-[#F2F2F7] px-4 py-2.5 font-mono text-[15px] text-[#0A0F1F] outline-none placeholder:text-[#8E8E93]"
          />
          <button
            type="button"
            onClick={handleSubmitReferral}
            disabled={!referralCode.trim() || processing}
            className={cn(
              "shrink-0 rounded-full border border-[#E5E5EA] bg-white px-5 py-2.5 text-[15px] font-extrabold tracking-[-0.01em] transition-opacity active:opacity-80 disabled:opacity-50",
              referralCode.trim() ? "text-[#007AFF]" : "text-[#8E8E93]",
            )}
          >
            {processing ? "..." : "Valider"}
          </button>
        </div>
        <p className="m-0 mt-2.5 text-[13px] leading-snug text-[#8E8E93]">
          En utilisant un code de parrainage, ton parrain gagne 1 jour Premium et tu obtiens 1 semaine offerte.
        </p>
      </div>
    );
  }

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
        En utilisant un code de parrainage, ton parrain gagne 1 jour Premium et tu obtiens 1 semaine offerte.
      </p>
    </div>
  );
};