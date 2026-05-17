import { useMemo, type ComponentType, type ReactNode } from "react";
import {
  Check,
  ChevronLeft,
  Copy,
  Crown,
  Gift,
  Loader2,
  Share,
  UserPlus,
  Users,
} from "lucide-react";
import { Share as CapShare } from "@capacitor/share";
import { useToast } from "@/hooks/use-toast";
import { useReferralProgram } from "@/hooks/useReferralProgram";
import { IosFixedPageHeaderShell } from "@/components/layout/IosFixedPageHeaderShell";
import {
  REFERRAL_TIERS,
  buildReferralAuthLink,
  buildReferralShareMessage,
  getNextReferralTier,
} from "@/lib/referralProgram";

const ACTION_BLUE = "#007AFF";
const SETTINGS_BG = "#F2F2F7";
const CARD_SHADOW = "0 1px 3px rgba(0,0,0,0.04), 0 0 0 0.5px rgba(0,0,0,0.06)";
const SF_FONT = "-apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif";

type ReferralParrainagePageProps = { onBack: () => void };

function ParrainageSectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="m-0 px-4 pb-2 pt-5 text-[13px] font-extrabold uppercase tracking-[0.08em] text-[#8E8E93]" style={{ letterSpacing: "0.08em" }}>
      {children}
    </p>
  );
}

function HowItWorksStep({
  num,
  color,
  icon: Icon,
  title,
  desc,
}: {
  num: number;
  color: string;
  icon: ComponentType<{ className?: string; color?: string; strokeWidth?: number }>;
  title: string;
  desc: string;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3.5">
      <div className="relative flex-shrink-0">
        <div className="flex items-center justify-center" style={{ width: 40, height: 40, borderRadius: 12, background: `${color}18` }}>
          <Icon className="h-5 w-5" color={color} strokeWidth={2.4} />
        </div>
        <div className="absolute flex items-center justify-center text-white" style={{ top: -4, right: -4, width: 18, height: 18, borderRadius: "50%", background: color, fontSize: 10, fontWeight: 900, border: "2px solid white" }}>
          {num}
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <p className="m-0 text-[15px] font-extrabold tracking-tight text-[#0A0F1F]" style={{ letterSpacing: "-0.01em" }}>{title}</p>
        <p className="m-0 mt-0.5 text-[13px] font-medium text-[#8E8E93]">{desc}</p>
      </div>
    </div>
  );
}

function ShareChannel({ label, color, gradient, emoji, onClick }: { label: string; color?: string; gradient?: string; emoji: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="flex flex-col items-center gap-1.5 transition-transform active:scale-95">
      <div className="flex items-center justify-center text-[22px]" style={{ width: 48, height: 48, borderRadius: 14, background: gradient || color, boxShadow: `0 3px 8px ${(color || "#000000")}40` }}>{emoji}</div>
      <span className="text-[10.5px] font-bold tracking-tight text-[#0A0F1F]" style={{ letterSpacing: "-0.01em" }}>{label}</span>
    </button>
  );
}

export function ReferralParrainagePage({ onBack }: ReferralParrainagePageProps) {
  const { toast } = useToast();
  const { loading, data, error, reload } = useReferralProgram();
  const code = data?.referralCode ?? "";
  const invitedCount = data?.invitedCount ?? 0;
  const daysEarned = data?.daysEarned ?? 0;
  const history = data?.history ?? [];
  const nextTier = useMemo(() => getNextReferralTier(invitedCount), [invitedCount]);
  const progress = nextTier.count > 0 ? (invitedCount / nextTier.count) * 100 : 100;
  const remaining = Math.max(0, nextTier.count - invitedCount);
  const sharePayload = useMemo(() => {
    if (!code) return { text: "", url: "" };
    return { text: buildReferralShareMessage(code), url: buildReferralAuthLink(code) };
  }, [code]);

  const copyCode = async () => {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      toast({ title: "Code copié", description: "Ton code de parrainage est dans le presse-papiers." });
    } catch {
      toast({ title: "Erreur", description: "Impossible de copier le code.", variant: "destructive" });
    }
  };

  const shareNative = async () => {
    if (!code) return;
    const text = `${sharePayload.text}\n${sharePayload.url}`;
    try {
      const isNative = !!(window as Window & { Capacitor?: unknown }).Capacitor;
      if (isNative) { await CapShare.share({ title: "Parrainage RunConnect", text, url: sharePayload.url }); return; }
      if (navigator.share) { await navigator.share({ title: "Parrainage RunConnect", text, url: sharePayload.url }); return; }
      await navigator.clipboard.writeText(text);
      toast({ title: "Message copié", description: "Le message de partage est prêt à être collé." });
    } catch { /* cancelled */ }
  };

  const shareWhatsApp = () => window.open(`https://wa.me/?text=${encodeURIComponent(`${sharePayload.text}\n${sharePayload.url}`)}`, "_blank", "noopener,noreferrer");
  const shareSms = () => { window.location.href = `sms:?&body=${encodeURIComponent(`${sharePayload.text} ${sharePayload.url}`)}`; };
  const shareMail = () => { window.location.href = `mailto:?subject=${encodeURIComponent("Rejoins-moi sur RunConnect")}&body=${encodeURIComponent(`${sharePayload.text}\n\n${sharePayload.url}`)}`; };

  return (
    <div className="flex h-full min-h-0 min-w-0 max-w-full flex-col overflow-x-hidden" style={{ background: SETTINGS_BG, fontFamily: SF_FONT }}>
      <IosFixedPageHeaderShell className="min-h-0 flex-1" headerWrapperClassName="shrink-0" contentScroll scrollClassName="min-h-0" header={
        <div className="shrink-0 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))]" style={{ background: SETTINGS_BG }}>
          <div className="flex items-center">
            <button type="button" onClick={onBack} className="flex items-center gap-0 transition-opacity active:opacity-70" style={{ width: 90 }}>
              <ChevronLeft className="h-6 w-6" color={ACTION_BLUE} strokeWidth={2.6} />
              <span className="text-[17px] font-medium tracking-tight text-[#007AFF]" style={{ letterSpacing: "-0.01em" }}>Retour</span>
            </button>
            <h1 className="m-0 min-w-0 flex-1 text-center text-[18px] font-extrabold tracking-tight text-[#0A0F1F]" style={{ letterSpacing: "-0.02em" }}>Parrainage</h1>
            <div style={{ width: 90 }} />
          </div>
        </div>
      }>
        <div className="ios-scroll-region min-h-0 flex-1 overflow-y-auto overflow-x-hidden pb-8" style={{ background: SETTINGS_BG }}>
          {loading ? (
            <div className="flex min-h-[40vh] items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-[#007AFF]" /></div>
          ) : error ? (
            <div className="px-4 pt-6 text-center">
              <p className="text-[15px] font-semibold text-[#0A0F1F]">{error}</p>
              <button type="button" onClick={() => void reload()} className="mt-3 text-[15px] font-bold text-[#007AFF]">Réessayer</button>
            </div>
          ) : (
            <>
              <div className="px-4 pt-4">
                <div style={{ background: "linear-gradient(135deg, #1B6FE6 0%, #5856D6 55%, #AF52DE 100%)", borderRadius: 22, padding: "22px 18px", color: "white", position: "relative", overflow: "hidden", boxShadow: "0 8px 24px rgba(88,86,214,0.35)" }}>
                  <div style={{ position: "absolute", top: -60, right: -50, width: 200, height: 200, borderRadius: "50%", background: "radial-gradient(circle, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0) 70%)", pointerEvents: "none" }} />
                  <div style={{ position: "absolute", bottom: -50, left: -30, width: 160, height: 160, borderRadius: "50%", background: "radial-gradient(circle, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0) 70%)", pointerEvents: "none" }} />
                  <div className="relative mb-3 flex items-center justify-center" style={{ width: 64, height: 64, borderRadius: 18, background: "rgba(255,255,255,0.22)", backdropFilter: "blur(10px)" }}>
                    <Gift className="h-8 w-8 text-white" strokeWidth={2.2} />
                  </div>
                  <h2 className="relative m-0 text-[26px] font-black leading-[1.1] tracking-[-0.035em]">Invite tes amis,<br />gagne du Premium</h2>
                  <p className="relative m-0 mt-2 text-[14.5px] font-medium leading-snug opacity-95">Partage ton code. Chaque ami qui s&apos;inscrit te rapporte <span className="font-extrabold">1 jour Premium</span>. Plus tu parraines, plus tu gagnes.</p>
                </div>
              </div>
              <ParrainageSectionLabel>TON CODE</ParrainageSectionLabel>
              <div className="mx-4 rounded-2xl bg-white p-4" style={{ boxShadow: CARD_SHADOW }}>
                <div className="mb-3 flex items-center justify-center rounded-[14px] bg-[#F2F2F7] px-3 py-4">
                  <span className="font-mono text-[18px] font-black tracking-[0.06em] text-[#0A0F1F] tabular-nums">{code || "—"}</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => void copyCode()} className="flex items-center justify-center gap-2 rounded-xl bg-[#F2F2F7] py-3 text-[14px] font-extrabold tracking-tight text-[#0A0F1F] transition-transform active:scale-[0.97]"><Copy className="h-4 w-4" strokeWidth={2.4} />Copier</button>
                  <button type="button" onClick={() => void shareNative()} className="flex items-center justify-center gap-2 rounded-xl py-3 text-[14px] font-extrabold tracking-tight text-white transition-transform active:scale-[0.97]" style={{ background: ACTION_BLUE, boxShadow: "0 3px 10px rgba(0,122,255,0.3)" }}><Share className="h-4 w-4" strokeWidth={2.4} />Partager</button>
                </div>
              </div>
              <ParrainageSectionLabel>TES STATISTIQUES</ParrainageSectionLabel>
              <div className="mx-4 grid grid-cols-2 gap-2">
                <div className="rounded-2xl bg-white p-3.5" style={{ boxShadow: CARD_SHADOW }}>
                  <div className="mb-2 flex items-center gap-1.5"><Users className="h-3.5 w-3.5" color={ACTION_BLUE} strokeWidth={2.6} /><span className="text-[11px] font-black uppercase tracking-[0.08em] text-[#8E8E93]">Invités</span></div>
                  <p className="m-0 text-[28px] font-black leading-none tracking-tight text-[#007AFF] tabular-nums">{invitedCount}</p>
                  <p className="m-0 mt-1 text-[12px] font-bold text-[#8E8E93]">{invitedCount > 1 ? "personnes" : "personne"}</p>
                </div>
                <div className="rounded-2xl bg-white p-3.5" style={{ boxShadow: CARD_SHADOW }}>
                  <div className="mb-2 flex items-center gap-1.5"><Crown className="h-3.5 w-3.5" color="#FFCC00" strokeWidth={2.6} /><span className="text-[11px] font-black uppercase tracking-[0.08em] text-[#8E8E93]">Premium gagnés</span></div>
                  <p className="m-0 text-[28px] font-black leading-none tracking-tight text-[#FFCC00] tabular-nums">{daysEarned}</p>
                  <p className="m-0 mt-1 text-[12px] font-bold text-[#8E8E93]">{daysEarned > 1 ? "jours" : "jour"}</p>
                </div>
              </div>
              <div className="mx-4 mt-3 rounded-2xl bg-white p-3.5" style={{ boxShadow: CARD_SHADOW }}>
                <div className="mb-2 flex items-center justify-between">
                  <p className="m-0 text-[13px] font-extrabold tracking-tight text-[#0A0F1F]">Prochain palier</p>
                  <p className="m-0 text-[12px] font-extrabold tabular-nums" style={{ color: nextTier.color }}>{invitedCount} / {nextTier.count}</p>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-[#F2F2F7]">
                  <div className="h-full rounded-full transition-[width] duration-300" style={{ width: `${Math.min(progress, 100)}%`, background: `linear-gradient(90deg, ${ACTION_BLUE}, ${nextTier.color})` }} />
                </div>
                <p className="m-0 mt-2 text-[12.5px] font-semibold leading-snug text-[#8E8E93]">Plus que <span className="font-extrabold" style={{ color: nextTier.color }}>{remaining} {remaining > 1 ? "amis" : "ami"}</span> pour débloquer <span className="font-extrabold text-[#0A0F1F]">{nextTier.reward}</span></p>
              </div>
              <ParrainageSectionLabel>COMMENT ÇA MARCHE</ParrainageSectionLabel>
              <div className="mx-4 overflow-hidden rounded-2xl bg-white" style={{ boxShadow: CARD_SHADOW }}>
                <HowItWorksStep num={1} color={ACTION_BLUE} icon={Share} title="Partage ton code" desc="Envoie-le à tes amis coureurs" />
                <div className="ml-[68px] h-px bg-[#E5E5EA]" />
                <HowItWorksStep num={2} color="#34C759" icon={UserPlus} title="Ton ami s'inscrit" desc="Avec ton code lors de la création de compte" />
                <div className="ml-[68px] h-px bg-[#E5E5EA]" />
                <HowItWorksStep num={3} color="#FFCC00" icon={Crown} title="Vous gagnez tous les deux" desc="Toi 1 jour Premium, ton ami 1 semaine offerte" />
              </div>
              <ParrainageSectionLabel>RÉCOMPENSES</ParrainageSectionLabel>
              <div className="mx-4 overflow-hidden rounded-2xl bg-white" style={{ boxShadow: CARD_SHADOW }}>
                {REFERRAL_TIERS.map((t, i) => {
                  const unlocked = invitedCount >= t.count;
                  return (
                    <div key={t.count}>
                      {i > 0 ? <div className="ml-[64px] h-px bg-[#E5E5EA]" /> : null}
                      <div className="flex items-center gap-3 px-4 py-3" style={{ opacity: unlocked ? 1 : 0.7 }}>
                        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[10px]" style={{ background: unlocked ? t.color : `${t.color}25` }}>
                          {unlocked ? <Check className="h-5 w-5 text-white" strokeWidth={2.8} /> : <span className="text-[14px] font-black" style={{ color: t.color }}>{t.count}</span>}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="m-0 text-[15px] font-extrabold tracking-tight text-[#0A0F1F]">{t.count} {t.count > 1 ? "amis" : "ami"}</p>
                          <p className="m-0 text-[13px] font-semibold text-[#8E8E93]">{t.reward}</p>
                        </div>
                        {unlocked ? <span className="rounded-full px-2 py-0.5 text-[11px] font-black uppercase tracking-[0.06em] text-[#34C759]" style={{ background: "#34C75915" }}>Débloqué</span> : null}
                      </div>
                    </div>
                  );
                })}
              </div>
              <ParrainageSectionLabel>PARTAGER VIA</ParrainageSectionLabel>
              <div className="mx-4 rounded-2xl bg-white p-4" style={{ boxShadow: CARD_SHADOW }}>
                <div className="grid grid-cols-5 gap-3">
                  <ShareChannel label="WhatsApp" color="#25D366" emoji="💬" onClick={shareWhatsApp} />
                  <ShareChannel label="Messages" color="#34C759" emoji="📱" onClick={shareSms} />
                  <ShareChannel label="Instagram" gradient="linear-gradient(45deg, #F58529, #DD2A7B, #8134AF, #515BD4)" emoji="📷" onClick={() => void shareNative()} />
                  <ShareChannel label="Mail" color={ACTION_BLUE} emoji="✉️" onClick={shareMail} />
                  <ShareChannel label="Plus" color="#8E8E93" emoji="⋯" onClick={() => void shareNative()} />
                </div>
              </div>
              <ParrainageSectionLabel>HISTORIQUE</ParrainageSectionLabel>
              {history.length === 0 ? (
                <div className="mx-4 rounded-2xl bg-white px-7 py-7 text-center" style={{ boxShadow: CARD_SHADOW }}>
                  <div className="mx-auto mb-2 flex h-[52px] w-[52px] items-center justify-center rounded-full bg-[#F2F2F7]"><Users className="h-6 w-6 text-[#8E8E93]" strokeWidth={2.2} /></div>
                  <p className="m-0 text-[15px] font-extrabold tracking-tight text-[#0A0F1F]">Aucun parrainage pour l&apos;instant</p>
                  <p className="m-0 mt-1 text-[13px] font-medium leading-snug text-[#8E8E93]">Tes amis parrainés apparaîtront ici dès qu&apos;ils s&apos;inscrivent.</p>
                </div>
              ) : (
                <div className="mx-4 overflow-hidden rounded-2xl bg-white" style={{ boxShadow: CARD_SHADOW }}>
                  {history.map((entry, i) => (
                    <div key={entry.referred_id}>
                      {i > 0 ? <div className="ml-[64px] h-px bg-[#E5E5EA]" /> : null}
                      <div className="flex items-center gap-3 px-4 py-3">
                        {entry.avatar_url ? (
                          <img src={entry.avatar_url} alt="" className="h-10 w-10 flex-shrink-0 rounded-full object-cover" />
                        ) : (
                          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-[#F2F2F7] text-[14px] font-bold text-[#8E8E93]">{(entry.display_name || "?")[0]}</div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="m-0 truncate text-[15px] font-extrabold tracking-tight text-[#0A0F1F]">{entry.display_name}</p>
                          <p className="m-0 text-[12px] font-medium text-[#8E8E93]">{new Date(entry.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <p className="px-8 pb-2 pt-5 text-center text-[11.5px] font-medium leading-snug text-[#8E8E93]">Les jours Premium sont crédités automatiquement dès que ton ami crée son compte. Ils s&apos;ajoutent à ton abonnement en cours ou démarrent un essai Premium.</p>
            </>
          )}
        </div>
      </IosFixedPageHeaderShell>
    </div>
  );
}
