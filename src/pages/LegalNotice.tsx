import type { ReactNode } from "react";
import { ArrowLeft, Building2, Mail, Scale, Server, UserCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useNavigate } from "react-router-dom";
import {
  getLegalAddressLines,
  getLegalEntityName,
  getLegalHostingNotice,
  getLegalPublicationDirector,
  getLegalRcs,
  getLegalSiretOrSiren,
  getSupportEmail,
  getSupportMailtoHref,
  LEGAL_LAST_UPDATED_LABEL,
} from "@/lib/legalMeta";

function Placeholder({ children }: { children: ReactNode }) {
  return <span className="text-muted-foreground italic">{children}</span>;
}

export default function LegalNotice() {
  const navigate = useNavigate();
  const entity = getLegalEntityName();
  const addressLines = getLegalAddressLines();
  const siret = getLegalSiretOrSiren();
  const rcs = getLegalRcs();
  const director = getLegalPublicationDirector();
  const hosting = getLegalHostingNotice();

  return (
    <div className="fixed inset-0 bg-background flex flex-col overflow-x-hidden min-w-0">
      <div className="sticky top-0 z-10 backdrop-blur-xl bg-background/95 border-b border-border/50 pt-[env(safe-area-inset-top,0px)]">
        <div className="flex items-center gap-3 p-4">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 shrink-0 rounded-full hover:bg-muted/50"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="min-w-0">
            <h1 className="text-lg font-semibold truncate">Mentions légales</h1>
            <p className="text-xs text-muted-foreground truncate">{entity}</p>
          </div>
        </div>
      </div>

      <ScrollArea className="flex-1 min-h-0 min-w-0">
        <div className="max-w-3xl mx-auto p-6 space-y-8 pb-24">
          <p className="text-sm text-muted-foreground text-center">
            Dernière mise à jour : {LEGAL_LAST_UPDATED_LABEL}
          </p>

          <section className="space-y-3 p-6 bg-primary/5 rounded-xl border border-primary/20">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
              <h2 className="text-xl font-semibold">Éditeur</h2>
            </div>
            <p className="text-foreground font-medium">{entity}</p>
            <div className="text-sm text-muted-foreground space-y-1">
              {addressLines.length > 0 ? (
                addressLines.map((line, i) => <p key={i}>{line}</p>)
              ) : (
                <Placeholder>
                  Adresse du siège : renseigner <code className="text-xs">VITE_PUBLIC_LEGAL_ADDRESS</code> (lignes
                  séparées par <code className="text-xs">|</code>).
                </Placeholder>
              )}
            </div>
          </section>

          <section className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center shrink-0">
                <Scale className="h-5 w-5 text-foreground" />
              </div>
              <h2 className="text-xl font-semibold">Immatriculation</h2>
            </div>
            <ul className="text-sm text-muted-foreground space-y-2 pl-1">
              <li>
                <span className="text-foreground font-medium">SIREN / SIRET : </span>
                {siret ?? (
                  <Placeholder>À renseigner (<code className="text-xs">VITE_PUBLIC_LEGAL_SIRET</code>)</Placeholder>
                )}
              </li>
              <li>
                <span className="text-foreground font-medium">RCS / RM : </span>
                {rcs ?? (
                  <Placeholder>À renseigner (<code className="text-xs">VITE_PUBLIC_LEGAL_RCS</code>)</Placeholder>
                )}
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center shrink-0">
                <UserCircle className="h-5 w-5 text-foreground" />
              </div>
              <h2 className="text-xl font-semibold">Directeur de la publication</h2>
            </div>
            <p className="text-sm text-muted-foreground">
              {director ?? (
                <Placeholder>À renseigner (<code className="text-xs">VITE_PUBLIC_LEGAL_DIRECTOR</code>)</Placeholder>
              )}
            </p>
          </section>

          <section className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center shrink-0">
                <Mail className="h-5 w-5 text-foreground" />
              </div>
              <h2 className="text-xl font-semibold">Contact</h2>
            </div>
            <a
              href={getSupportMailtoHref()}
              className="text-sm text-primary font-medium hover:underline break-all"
            >
              {getSupportEmail()}
            </a>
            <p className="text-xs text-muted-foreground">
              Pour toute réclamation relative aux données personnelles, voir aussi la{" "}
              <button type="button" className="text-primary underline" onClick={() => navigate("/privacy")}>
                politique de confidentialité
              </button>
              .
            </p>
          </section>

          <section className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center shrink-0">
                <Server className="h-5 w-5 text-foreground" />
              </div>
              <h2 className="text-xl font-semibold">Hébergement</h2>
            </div>
            <div className="text-sm text-muted-foreground whitespace-pre-line">
              {hosting ?? (
                <Placeholder>
                  Décrire l’hébergeur (nom, adresse, site) via <code className="text-xs">VITE_PUBLIC_LEGAL_HOSTING</code>
                  .
                </Placeholder>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Les données applicatives peuvent être traitées via des prestataires listés dans la politique de
              confidentialité (ex. base de données, authentification).
            </p>
          </section>

          <section className="space-y-2 text-sm text-muted-foreground border-t border-border pt-6">
            <p className="font-medium text-foreground">Propriété intellectuelle</p>
            <p>
              L’application RunConnect, son interface, ses textes, logos et marques sont protégés. Toute reproduction
              non autorisée est interdite.
            </p>
          </section>

          <Button onClick={() => navigate(-1)} size="lg" className="w-full max-w-md mx-auto block">
            Retour
          </Button>
        </div>
      </ScrollArea>
    </div>
  );
}
