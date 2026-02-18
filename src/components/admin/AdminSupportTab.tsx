import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  ChevronLeft, Loader2, RotateCcw, KeyRound, Ban, Trash2, Edit3, BellOff, BarChart3,
  AlertTriangle, Check
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { UserResult } from "../AdminPremiumManager";

export const AdminSupportTab = ({
  selectedUser,
  onBack,
  invokeAdmin,
}: {
  selectedUser: UserResult | null;
  onBack: () => void;
  invokeAdmin: (body: Record<string, unknown>) => Promise<any>;
}) => {
  const { toast } = useToast();
  const [processing, setProcessing] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editFields, setEditFields] = useState({ username: "", display_name: "", bio: "" });

  if (!selectedUser) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground text-[14px] p-8">
        Sélectionnez un utilisateur ci-dessus
      </div>
    );
  }

  const runAction = async (action: string, extra: Record<string, unknown> = {}) => {
    setProcessing(action);
    try {
      const data = await invokeAdmin({ action, target_user_id: selectedUser.user_id, ...extra });
      toast({ title: "✅ Action effectuée", description: `${action} réussi` });
      return data;
    } catch (error: any) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } finally {
      setProcessing(null);
    }
  };

  const ActionButton = ({
    action,
    label,
    icon: Icon,
    variant = "outline",
    onClick,
  }: {
    action: string;
    label: string;
    icon: any;
    variant?: "outline" | "destructive" | "default";
    onClick?: () => void;
  }) => (
    <Button
      onClick={onClick || (() => runAction(action))}
      disabled={!!processing}
      variant={variant}
      size="sm"
      className="w-full justify-start gap-2 text-[13px]"
    >
      {processing === action ? <Loader2 className="h-4 w-4 animate-spin" /> : <Icon className="h-4 w-4" />}
      {label}
    </Button>
  );

  return (
    <div className="p-4 space-y-4">
      <button onClick={onBack} className="flex items-center gap-1 text-primary text-[14px]">
        <ChevronLeft className="h-4 w-4" /> Retour
      </button>

      <div className="flex items-center gap-3">
        <Avatar className="h-10 w-10">
          <AvatarImage src={selectedUser.avatar_url || ""} />
          <AvatarFallback className="bg-primary/10 text-primary text-sm">
            {(selectedUser.display_name || selectedUser.username)?.[0]?.toUpperCase() || "?"}
          </AvatarFallback>
        </Avatar>
        <div>
          <p className="text-[14px] font-semibold text-foreground">{selectedUser.display_name || selectedUser.username}</p>
          <p className="text-[11px] text-muted-foreground">@{selectedUser.username}</p>
        </div>
      </div>

      {/* Actions */}
      <div className="space-y-2">
        <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Actions rapides</p>

        <ActionButton action="reset_tutorial" label="Reset tutoriel & onboarding" icon={RotateCcw} />
        <ActionButton action="reset_password" label="Envoyer reset mot de passe" icon={KeyRound} />
        <ActionButton action="purge_notifications" label="Purger les notifications" icon={BellOff} />
        <ActionButton action="reset_score" label="Reset score & points" icon={BarChart3} />
      </div>

      {/* Edit profile */}
      <div className="space-y-2">
        <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Modifier le profil</p>
        {!editMode ? (
          <Button onClick={() => {
            setEditFields({
              username: selectedUser.username || "",
              display_name: selectedUser.display_name || "",
              bio: "",
            });
            setEditMode(true);
          }} variant="outline" size="sm" className="w-full justify-start gap-2 text-[13px]">
            <Edit3 className="h-4 w-4" /> Modifier le profil
          </Button>
        ) : (
          <div className="space-y-2 bg-secondary rounded-[10px] p-3">
            <Input
              placeholder="Username"
              value={editFields.username}
              onChange={(e) => setEditFields({ ...editFields, username: e.target.value })}
              className="h-[36px] text-[13px]"
            />
            <Input
              placeholder="Nom affiché"
              value={editFields.display_name}
              onChange={(e) => setEditFields({ ...editFields, display_name: e.target.value })}
              className="h-[36px] text-[13px]"
            />
            <Input
              placeholder="Bio"
              value={editFields.bio}
              onChange={(e) => setEditFields({ ...editFields, bio: e.target.value })}
              className="h-[36px] text-[13px]"
            />
            <div className="flex gap-2">
              <Button
                onClick={async () => {
                  await runAction("update_profile", { updates: editFields });
                  setEditMode(false);
                }}
                size="sm"
                className="flex-1 gap-1 text-[13px]"
                disabled={!!processing}
              >
                {processing === "update_profile" ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                Sauvegarder
              </Button>
              <Button onClick={() => setEditMode(false)} variant="outline" size="sm" className="text-[13px]">
                Annuler
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Danger zone */}
      <div className="space-y-2">
        <p className="text-[11px] text-destructive uppercase tracking-wide">Zone dangereuse</p>
        <ActionButton action="ban_user" label="Bannir l'utilisateur" icon={Ban} variant="destructive" />
        <ActionButton action="unban_user" label="Débannir l'utilisateur" icon={Ban} variant="outline" />

        {!confirmDelete ? (
          <Button
            onClick={() => setConfirmDelete(true)}
            variant="destructive"
            size="sm"
            className="w-full justify-start gap-2 text-[13px]"
          >
            <Trash2 className="h-4 w-4" /> Supprimer le compte
          </Button>
        ) : (
          <div className="bg-destructive/10 rounded-[10px] p-3 space-y-2">
            <div className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-4 w-4" />
              <p className="text-[13px] font-medium">Confirmer la suppression ?</p>
            </div>
            <p className="text-[11px] text-muted-foreground">Cette action est irréversible.</p>
            <div className="flex gap-2">
              <Button
                onClick={() => {
                  runAction("delete_user");
                  setConfirmDelete(false);
                  onBack();
                }}
                variant="destructive"
                size="sm"
                className="flex-1 text-[13px]"
                disabled={!!processing}
              >
                {processing === "delete_user" ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                Confirmer
              </Button>
              <Button onClick={() => setConfirmDelete(false)} variant="outline" size="sm" className="text-[13px]">
                Annuler
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
