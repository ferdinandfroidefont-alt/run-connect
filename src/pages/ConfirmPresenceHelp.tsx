import { useNavigate } from "react-router-dom";
import { ChevronLeft, MapPin, UserCheck, Link2, Bell } from "lucide-react";
import { IosPageHeaderBar } from "@/components/layout/IosPageHeaderBar";
import { Button } from "@/components/ui/button";

/**
 * Aide : comment faire confirmer sa présence à une séance (GPS, organisateur, Strava).
 */
export default function ConfirmPresenceHelp() {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-secondary">
      <header className="shrink-0 border-b border-border/60 bg-card pt-[max(env(safe-area-inset-top),8px)]">
        <IosPageHeaderBar
          left={
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-9 w-9 shrink-0 rounded-full"
              onClick={() => navigate(-1)}
              aria-label="Retour"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
          }
          title="Confirmer sa présence"
        />
      </header>

      <div className="ios-scroll-region min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-4 py-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <p className="mb-4 text-[15px] leading-relaxed text-muted-foreground">
          Ta présence peut être reconnue de plusieurs façons. Tu n&apos;as pas besoin de tout faire : une seule
          suffit pour que la séance compte comme validée côté présence.
        </p>

        <ul className="space-y-4">
          <li className="rounded-2xl border border-border/60 bg-card p-4 shadow-[var(--shadow-card)]">
            <div className="mb-2 flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#34C759]/15">
                <MapPin className="h-4 w-4 text-[#34C759]" />
              </div>
              <h2 className="text-[16px] font-semibold text-foreground">Sur place (GPS)</h2>
            </div>
            <p className="text-[14px] leading-relaxed text-muted-foreground">
              Ouvre la séance depuis la carte ou <strong className="text-foreground">Mes séances</strong>, puis
              utilise <strong className="text-foreground">« Je suis arrivé (GPS) »</strong> quand tu es au point
              de rendez-vous. La validation utilise ta position autour du lieu de la séance.
            </p>
          </li>

          <li className="rounded-2xl border border-border/60 bg-card p-4 shadow-[var(--shadow-card)]">
            <div className="mb-2 flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/15">
                <UserCheck className="h-4 w-4 text-primary" />
              </div>
              <h2 className="text-[16px] font-semibold text-foreground">Par l&apos;organisateur</h2>
            </div>
            <p className="text-[14px] leading-relaxed text-muted-foreground">
              L&apos;organisateur peut confirmer ta présence depuis la gestion des participants (écran{" "}
              <strong className="text-foreground">Confirmer les présences</strong> ou fiche séance). Tu peux lui
              envoyer un <strong className="text-foreground">rappel</strong> depuis la fenêtre qui s&apos;affiche
              après la séance si ta présence n&apos;est pas encore confirmée.
            </p>
          </li>

          <li className="rounded-2xl border border-border/60 bg-card p-4 shadow-[var(--shadow-card)]">
            <div className="mb-2 flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-500/15">
                <Link2 className="h-4 w-4 text-orange-600" />
              </div>
              <h2 className="text-[16px] font-semibold text-foreground">Strava</h2>
            </div>
            <p className="text-[14px] leading-relaxed text-muted-foreground">
              Connecte <strong className="text-foreground">Strava</strong> dans{" "}
              <strong className="text-foreground">Profil → Connexions</strong>, puis va dans{" "}
              <strong className="text-foreground">Mes séances</strong> : les activités Strava récentes peuvent être{" "}
              <strong className="text-foreground">associées</strong> à une séance RunConnect quand les horaires et
              le lieu sont cohérents. Cela aide à reconnaître que tu as bien réalisé la sortie.
            </p>
          </li>

          <li className="rounded-2xl border border-border/60 bg-card p-4 shadow-[var(--shadow-card)]">
            <div className="mb-2 flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-muted">
                <Bell className="h-4 w-4 text-muted-foreground" />
              </div>
              <h2 className="text-[16px] font-semibold text-foreground">Rappel</h2>
            </div>
            <p className="text-[14px] leading-relaxed text-muted-foreground">
              Si rien n&apos;est encore en place, tu peux utiliser le bouton{" "}
              <strong className="text-foreground">Rappeler l&apos;organisateur</strong> : il reçoit une notification
              pour confirmer ta présence (une fois par séance).
            </p>
          </li>
        </ul>
      </div>
    </div>
  );
}
