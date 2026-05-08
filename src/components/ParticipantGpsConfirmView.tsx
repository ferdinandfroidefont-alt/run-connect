import { useEffect, useState } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { ChevronLeft, Loader2, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useGPSValidation } from "@/hooks/useGPSValidation";
import { useAppPreview } from "@/contexts/AppPreviewContext";
import { cn } from "@/lib/utils";

interface Session {
  id: string;
  title: string;
  scheduled_at: string;
  location_name: string;
  location_lat: number;
  location_lng: number;
  organizer_id: string;
  activity_type: string;
  distance_km?: number | null;
}

interface ParticipantGpsConfirmViewProps {
  session: Session;
  userId: string;
  onBack?: () => void;
  onComplete: () => void;
}

export function ParticipantGpsConfirmView({ session, userId, onBack, onComplete }: ParticipantGpsConfirmViewProps) {
  const { toast } = useToast();
  const { validatePresence, validating } = useGPSValidation();
  const { isPreviewMode } = useAppPreview();
  const [gpsValidated, setGpsValidated] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("session_participants")
          .select("confirmed_by_gps")
          .eq("session_id", session.id)
          .eq("user_id", userId)
          .maybeSingle();
        if (cancelled) return;
        if (error) {
          setGpsValidated(false);
          return;
        }
        setGpsValidated(!!data?.confirmed_by_gps);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [session.id, userId]);

  const handleGPSValidation = async () => {
    if (isPreviewMode) {
      toast({
        title: "Mode aperçu",
        description: "La validation GPS est désactivée.",
        variant: "destructive",
      });
      return;
    }

    const result = await validatePresence(
      session.id,
      Number(session.location_lat),
      Number(session.location_lng),
      session.scheduled_at,
      userId,
    );

    if (result.success) {
      setGpsValidated(true);
      toast({
        title: "GPS validé",
        description: `Présence confirmée (${result.distance}m du point de RDV)`,
      });
    } else {
      toast({
        title: "Validation GPS impossible",
        description: result.error,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col pb-[max(10px,env(safe-area-inset-bottom))]">
      <div className="shrink-0 bg-white pb-2 pt-[calc(env(safe-area-inset-top,0px)+10px)] shadow-[0_1px_0_rgba(60,60,67,0.12)]">
        <header className="flex h-12 items-center justify-between px-4">
          <button
            type="button"
            onClick={onBack ?? onComplete}
            className="inline-flex min-w-0 items-center text-[17px] font-medium text-[#007AFF]"
          >
            <ChevronLeft className="h-5 w-5 shrink-0" />
            <span className="truncate">Séance</span>
          </button>
          <h1 className="min-w-0 flex-1 truncate px-2 text-center text-[17px] font-semibold tracking-[-0.4px] text-foreground">
            Confirmer ma présence
          </h1>
          <button type="button" onClick={onComplete} className="shrink-0 text-[17px] font-semibold text-[#007AFF]">
            OK
          </button>
        </header>

        <section className="mx-4 mt-2 rounded-[12px] bg-[#f5f5f7] p-[12px_14px]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.11em] text-[#8E8E93]">Séance</p>
          <p className="mt-1 truncate text-[15px] font-semibold tracking-[-0.2px] text-foreground">{session.title}</p>
          <p className="text-[13px] tracking-[-0.1px] text-[rgba(60,60,67,0.6)]">
            {format(new Date(session.scheduled_at), "EEE d MMM · HH'h'mm", { locale: fr })}
            {session.distance_km ? ` · ${session.distance_km.toString().replace(".", ",")} km` : ""}
          </p>
          <p className="mt-1 line-clamp-2 text-[12px] text-[rgba(60,60,67,0.65)]">{session.location_name}</p>
        </section>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto bg-secondary px-4 pt-4" style={{ WebkitOverflowScrolling: "touch" }}>
        {loading ? (
          <div className="mx-auto flex max-w-md justify-center rounded-[12px] bg-white p-10 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
            <Loader2 className="h-7 w-7 animate-spin text-primary" />
          </div>
        ) : gpsValidated ? (
          <div className="mx-auto max-w-md rounded-[12px] bg-white p-6 text-center shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
            <p className="text-[15px] font-semibold text-[#34C759]">Présence confirmée par GPS</p>
            <p className="mt-2 text-[13px] text-muted-foreground">Tu peux fermer cet écran ou retourner à ta séance.</p>
          </div>
        ) : (
          <div className="mx-auto max-w-md space-y-3">
            <p className="text-[13px] leading-relaxed text-muted-foreground">
              Sur le lieu de RDV, dans les 10 minutes autour de l&apos;heure prévue, valide ta position pour confirmer ta
              présence (rayon ~80 m).
            </p>
            <button
              type="button"
              onClick={() => void handleGPSValidation()}
              disabled={validating}
              className={cn(
                "flex h-[52px] w-full items-center justify-center gap-2 rounded-[14px] bg-[#34C759] text-[16px] font-semibold text-white transition-opacity active:opacity-90 disabled:opacity-50",
              )}
            >
              {validating ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  <MapPin className="h-5 w-5" />
                  Je suis arrivé
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
