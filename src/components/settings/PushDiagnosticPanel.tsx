import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Copy, RefreshCw, Key, Shield, Smartphone, Cloud, Server, Stethoscope } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type Severity = 'success' | 'warning' | 'error';

interface PushDiagnosticPanelProps {
  pushDebug: any;
  permissionStatus: any;
  isNative: boolean;
  isRegistered: boolean;
  userId?: string;
  requestPermissions: () => Promise<boolean>;
  checkPermissionStatus: () => Promise<void>;
  refreshDebugFromBackend: () => Promise<void>;
}

const maskToken = (token: string | null | undefined): string => {
  if (!token) return 'null';
  if (token.length <= 16) return token;
  return `${token.substring(0, 8)}...${token.substring(token.length - 8)}`;
};

const maskUserId = (id: string | undefined): string => {
  if (!id) return 'null';
  return `${id.substring(0, 8)}...`;
};

const severityConfig: Record<Severity, { bg: string; border: string; text: string; label: string }> = {
  success: { bg: 'bg-green-500/10', border: 'border-green-500/30', text: 'text-green-600 dark:text-green-400', label: '✅ Succès' },
  warning: { bg: 'bg-orange-500/10', border: 'border-orange-500/30', text: 'text-orange-600 dark:text-orange-400', label: '⚠️ Avertissement' },
  error: { bg: 'bg-destructive/10', border: 'border-destructive/30', text: 'text-destructive', label: '❌ Erreur' },
};

const StatusDot = ({ ok }: { ok?: boolean }) => (
  <span className={`inline-block h-2 w-2 rounded-full flex-shrink-0 ${ok === true ? 'bg-green-500' : ok === false ? 'bg-destructive' : 'bg-muted-foreground/40'}`} />
);

const DiagRow = ({ label, value, ok }: { label: string; value: string; ok?: boolean }) => (
  <div className="flex items-center justify-between gap-2 py-1.5 px-4">
    <div className="flex items-center gap-2 min-w-0">
      <StatusDot ok={ok} />
      <span className="text-[12px] text-muted-foreground font-mono truncate">{label}</span>
    </div>
    <span className={`text-[12px] font-mono flex-shrink-0 ${ok === true ? 'text-green-600 dark:text-green-400' : ok === false ? 'text-destructive' : 'text-foreground'}`}>
      {value}
    </span>
  </div>
);

const SectionHeader = ({ icon: Icon, title, severity }: { icon: any; title: string; severity?: Severity }) => (
  <div className="flex items-center gap-2 px-4 py-2 bg-secondary/50">
    <Icon className="h-3.5 w-3.5 text-muted-foreground" />
    <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex-1">{title}</span>
    {severity && <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${severityConfig[severity].bg} ${severityConfig[severity].text}`}>{severityConfig[severity].label}</span>}
  </div>
);

export const PushDiagnosticPanel = ({
  pushDebug,
  permissionStatus,
  isNative,
  isRegistered,
  userId,
  requestPermissions,
  checkPermissionStatus,
  refreshDebugFromBackend,
}: PushDiagnosticPanelProps) => {
  const { toast } = useToast();
  const [retrying, setRetrying] = useState(false);

  const getDiagnostic = (): { message: string; severity: Severity } => {
    if (!isNative) {
      return { severity: 'error', message: "L'application n'est pas en environnement natif, les push ne sont pas disponibles." };
    }
    if (permissionStatus?.denied) {
      return { severity: 'error', message: "Les notifications sont refusées par l'utilisateur. Ouvrez les réglages iOS pour les activer." };
    }
    if (!permissionStatus?.granted) {
      return { severity: 'warning', message: "Les permissions n'ont pas encore été accordées. Appuyez sur « Relancer l'enregistrement »." };
    }
    if (pushDebug.apnsHexDetected && !pushDebug.fcmTokenEventReceived) {
      return { severity: 'error', message: "APNs OK mais FCM absent : problème probable de configuration Firebase iOS (GoogleService-Info.plist, bundle ID, APNs key ou Firebase Messaging)." };
    }
    if (pushDebug.fcmTokenEventReceived && !pushDebug.saveAttempted) {
      return { severity: 'warning', message: "Token FCM obtenu mais sauvegarde non tentée. Attendez quelques secondes ou relancez le diagnostic." };
    }
    if (pushDebug.saveAttempted && pushDebug.saveResponse?.status !== 200) {
      return { severity: 'error', message: `Le token FCM a été obtenu mais n'a pas pu être sauvegardé en base (status: ${pushDebug.saveResponse?.status ?? 'inconnu'}).` };
    }
    if (pushDebug.backendProfilePushToken && pushDebug.backendProfilePushToken.length > 50) {
      return { severity: 'success', message: "Chaîne push complète : permissions ✓, token FCM ✓, sauvegarde backend ✓." };
    }
    return { severity: 'warning', message: "État indéterminé, relancez le diagnostic." };
  };

  const diagnostic = getDiagnostic();
  const sev = severityConfig[diagnostic.severity];

  const permSeverity: Severity = permissionStatus?.granted ? 'success' : permissionStatus?.denied ? 'error' : 'warning';
  const regSeverity: Severity = isNative && isRegistered && pushDebug.registrationEventReceived ? 'success' : !isNative ? 'error' : 'warning';
  const apnsSeverity: Severity = pushDebug.apnsHexDetected ? 'success' : pushDebug.registerCalled ? 'error' : 'warning';
  const fcmSeverity: Severity = pushDebug.fcmTokenEventReceived && (pushDebug.fcmTokenLength ?? 0) > 50 ? 'success' : pushDebug.apnsHexDetected && !pushDebug.fcmTokenEventReceived ? 'error' : 'warning';
  const saveSeverity: Severity = pushDebug.backendProfilePushToken && pushDebug.backendProfilePushToken.length > 50 ? 'success' : pushDebug.saveAttempted && pushDebug.saveResponse?.status !== 200 ? 'error' : 'warning';

  const copyDiagnostic = () => {
    const data = {
      diagnostic: diagnostic.message,
      severity: diagnostic.severity,
      permissions: { permissionRequested: pushDebug.permissionRequested, permissionResult: pushDebug.permissionResult, ...permissionStatus },
      native: { isNative, isRegistered, registerCalled: pushDebug.registerCalled, registrationEventReceived: pushDebug.registrationEventReceived },
      apns: { apnsHexDetected: pushDebug.apnsHexDetected },
      fcm: { fcmTokenEventReceived: pushDebug.fcmTokenEventReceived, fcmTokenLength: pushDebug.fcmTokenLength, selectedFinalToken: pushDebug.selectedFinalToken ? maskToken(pushDebug.selectedFinalToken) : null },
      backend: { saveAttempted: pushDebug.saveAttempted, saveResponseStatus: pushDebug.saveResponse?.status ?? null, backendTokenLength: pushDebug.backendProfilePushToken?.length ?? null },
      user_id: maskUserId(userId),
      traceId: pushDebug.traceId,
      timestamp: pushDebug.timestamp,
      lastError: pushDebug.lastError,
      platform: typeof navigator !== 'undefined' ? navigator.userAgent.substring(0, 80) : 'unknown',
    };
    navigator.clipboard?.writeText(JSON.stringify(data, null, 2));
    toast({ title: "Copié", description: "Diagnostic complet copié dans le presse-papiers" });
  };

  const handleRetryRegistration = async () => {
    setRetrying(true);
    try {
      await requestPermissions();
      await new Promise(r => setTimeout(r, 3000));
      await refreshDebugFromBackend();
    } finally {
      setRetrying(false);
    }
  };

  const handleRetryToken = async () => {
    setRetrying(true);
    try {
      await checkPermissionStatus();
      await new Promise(r => setTimeout(r, 2000));
      await refreshDebugFromBackend();
    } finally {
      setRetrying(false);
    }
  };

  return (
    <div className="space-y-2">
      <h3 className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wider px-4">
        🔧 Diagnostic Push iOS
      </h3>
      <div className="bg-card overflow-hidden">
        {/* Severity banner */}
        <div className={`px-4 py-3 ${sev.bg} border-b ${sev.border}`}>
          <div className="flex items-center gap-2">
            <Stethoscope className={`h-4 w-4 ${sev.text}`} />
            <span className={`text-[13px] font-semibold ${sev.text}`}>{sev.label}</span>
          </div>
          <p className={`text-[12px] mt-1 ${sev.text}`}>{diagnostic.message}</p>
        </div>

        {/* 1. Permissions */}
        <SectionHeader icon={Shield} title="Permissions" severity={permSeverity} />
        <DiagRow label="permissionRequested" value={String(pushDebug.permissionRequested ?? false)} ok={pushDebug.permissionRequested} />
        <DiagRow label="permissionResult" value={pushDebug.permissionResult || 'not checked'} ok={pushDebug.permissionResult === 'granted'} />
        <DiagRow label="granted" value={String(permissionStatus?.granted ?? false)} ok={permissionStatus?.granted} />
        <DiagRow label="denied" value={String(permissionStatus?.denied ?? false)} ok={permissionStatus?.denied ? false : undefined} />
        <DiagRow label="prompt" value={String(permissionStatus?.prompt ?? false)} />

        {/* 2. Enregistrement natif */}
        <SectionHeader icon={Smartphone} title="Enregistrement natif" severity={regSeverity} />
        <DiagRow label="isNative" value={String(isNative)} ok={isNative} />
        <DiagRow label="isRegistered" value={String(isRegistered)} ok={isRegistered} />
        <DiagRow label="registerCalled" value={String(pushDebug.registerCalled ?? false)} ok={pushDebug.registerCalled} />
        <DiagRow label="registrationEventReceived" value={String(pushDebug.registrationEventReceived ?? false)} ok={pushDebug.registrationEventReceived} />

        {/* 3. Token APNs */}
        <SectionHeader icon={Key} title="Token APNs" severity={apnsSeverity} />
        <DiagRow label="apnsHexDetected" value={String(pushDebug.apnsHexDetected ?? false)} ok={pushDebug.apnsHexDetected} />
        {pushDebug.apnsHexDetected && pushDebug.selectedFinalToken && !pushDebug.fcmTokenEventReceived && (
          <>
            <DiagRow label="longueur" value={String(pushDebug.selectedFinalToken?.length ?? 0)} />
            <DiagRow label="token (masqué)" value={maskToken(pushDebug.selectedFinalToken)} />
          </>
        )}

        {/* 4. Token FCM */}
        <SectionHeader icon={Cloud} title="Token Firebase FCM" severity={fcmSeverity} />
        <DiagRow label="fcmTokenEventReceived" value={String(pushDebug.fcmTokenEventReceived ?? false)} ok={pushDebug.fcmTokenEventReceived} />
        <DiagRow label="fcmTokenLength" value={String(pushDebug.fcmTokenLength ?? 'null')} ok={pushDebug.fcmTokenLength ? pushDebug.fcmTokenLength > 50 : false} />
        {pushDebug.selectedFinalToken && pushDebug.fcmTokenEventReceived && (
          <DiagRow label="token (masqué)" value={maskToken(pushDebug.selectedFinalToken)} ok={true} />
        )}

        {/* 5. Sauvegarde backend */}
        <SectionHeader icon={Server} title="Sauvegarde backend" severity={saveSeverity} />
        <DiagRow label="saveAttempted" value={String(pushDebug.saveAttempted ?? false)} ok={pushDebug.saveAttempted} />
        <DiagRow label="saveResponse" value={pushDebug.saveResponse ? `status ${pushDebug.saveResponse.status}` : 'none'} ok={pushDebug.saveResponse?.status === 200} />
        <DiagRow label="DB push_token" value={pushDebug.backendProfilePushToken ? `${maskToken(pushDebug.backendProfilePushToken)} (${pushDebug.backendProfilePushToken.length})` : 'null'} ok={!!pushDebug.backendProfilePushToken && pushDebug.backendProfilePushToken.length > 50} />
        <DiagRow label="user_id" value={maskUserId(userId)} />
        {pushDebug.traceId && <DiagRow label="traceId" value={pushDebug.traceId} />}
        {pushDebug.lastError && <DiagRow label="❌ error" value={pushDebug.lastError.substring(0, 80)} ok={false} />}

        {/* Timestamp */}
        <div className="px-4 py-2 bg-secondary/30">
          <span className="text-[11px] text-muted-foreground font-mono">Dernier diagnostic : {pushDebug.timestamp || 'jamais'}</span>
        </div>

        {/* Action buttons */}
        <div className="flex flex-col gap-2 px-4 py-3">
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="flex-1 gap-1.5 text-[12px]" onClick={handleRetryRegistration} disabled={retrying}>
              <RefreshCw className={`h-3 w-3 ${retrying ? 'animate-spin' : ''}`} />
              Relancer l'enregistrement
            </Button>
            <Button variant="outline" size="sm" className="flex-1 gap-1.5 text-[12px]" onClick={handleRetryToken} disabled={retrying}>
              <Key className={`h-3 w-3 ${retrying ? 'animate-spin' : ''}`} />
              Récupérer le token
            </Button>
          </div>
          <Button variant="outline" size="sm" className="w-full gap-1.5 text-[12px]" onClick={copyDiagnostic}>
            <Copy className="h-3 w-3" />
            Copier le diagnostic complet
          </Button>
        </div>
      </div>
    </div>
  );
};
