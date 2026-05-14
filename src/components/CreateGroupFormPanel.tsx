import { useEffect, useId, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { UserPlus, Search, Camera, Check, Loader2 } from "lucide-react";
import { ImageCropEditor } from "./ImageCropEditor";

const ACTION_BLUE = "#007AFF";

interface Profile {
  user_id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
}

export type CreateGroupFormPanelProps = {
  active: boolean;
  onSuccess: (groupId: string) => void;
};

function SectionLabel({ text }: { text: string }) {
  return (
    <p className="mb-2 mt-6 px-1 text-[12px] font-bold uppercase tracking-wider text-[#8E8E93]">
      {text}
    </p>
  );
}

export function CreateGroupFormPanel({ active, onSuccess }: CreateGroupFormPanelProps) {
  const avatarInputId = useId();
  const { user } = useAuth();
  const { toast } = useToast();
  const [groupName, setGroupName] = useState("");
  const [groupAvatarUrl, setGroupAvatarUrl] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<Profile[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);
  const [showImageCrop, setShowImageCrop] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);

  useEffect(() => {
    if (!active) {
      setSearchResults([]);
      return;
    }
    const uid = user?.id;
    if (!uid) return;

    const q = searchQuery.trim();
    if (!q) {
      setSearchResults([]);
      return;
    }

    const timeout = setTimeout(async () => {
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("user_id, username, display_name, avatar_url")
          .neq("user_id", uid)
          .or(`username.ilike.%${q}%,display_name.ilike.%${q}%`)
          .limit(10);
        if (error) throw error;
        setSearchResults(data || []);
      } catch (error) {
        console.error("Error searching users:", error);
      }
    }, 300);
    return () => clearTimeout(timeout);
  }, [active, searchQuery, user?.id]);

  const toggleMember = (profile: Profile) => {
    const isSelected = selectedMembers.some((m) => m.user_id === profile.user_id);
    if (isSelected) {
      setSelectedMembers((prev) => prev.filter((m) => m.user_id !== profile.user_id));
    } else {
      setSelectedMembers((prev) => [...prev, profile]);
    }
  };

  const handleAvatarSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: "Erreur", description: "Veuillez sélectionner un fichier image", variant: "destructive" });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Erreur", description: "L'image ne doit pas dépasser 5MB", variant: "destructive" });
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      setSelectedImage(e.target?.result as string);
      setShowImageCrop(true);
    };
    reader.readAsDataURL(file);
  };

  const handleCroppedImage = async (croppedImageBlob: Blob) => {
    if (!user) return;
    setAvatarUploading(true);
    try {
      const filename = `${user.id}/group/new-${Date.now()}.jpg`;
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filename, croppedImageBlob, { contentType: "image/jpeg", upsert: true });
      if (uploadError) throw uploadError;
      const {
        data: { publicUrl },
      } = supabase.storage.from("avatars").getPublicUrl(filename);
      setGroupAvatarUrl(publicUrl);
      setShowImageCrop(false);
      setSelectedImage(null);
    } catch {
      toast({ title: "Erreur", description: "Impossible d'ajouter la photo", variant: "destructive" });
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleCreateGroup = async () => {
    if (!user || !groupName.trim()) return;
    setLoading(true);
    try {
      const { data: conversation, error: convError } = await supabase
        .from("conversations")
        .insert([
          {
            is_group: true,
            group_name: groupName.trim(),
            group_description: null,
            location: null,
            group_avatar_url: groupAvatarUrl || null,
            is_private: true,
            created_by: user.id,
            participant_1: user.id,
            participant_2: user.id,
          },
        ])
        .select()
        .single();
      if (convError) throw convError;

      const { error: adminError } = await supabase.from("group_members").insert([
        {
          conversation_id: conversation.id,
          user_id: user.id,
          is_admin: true,
          is_coach: true,
        },
      ]);
      if (adminError) {
        await supabase.from("conversations").delete().eq("id", conversation.id);
        throw new Error("Impossible d'ajouter le créateur comme admin du groupe");
      }

      await supabase.from("messages").insert([
        {
          conversation_id: conversation.id,
          sender_id: user.id,
          content: "a créé le groupe",
          message_type: "system",
        },
      ]);

      if (selectedMembers.length > 0) {
        await supabase.from("group_members").insert(
          selectedMembers.map((member) => ({
            conversation_id: conversation.id,
            user_id: member.user_id,
            is_admin: false,
          }))
        );
        const memberNames = selectedMembers.map((m) => m.username || m.display_name).join(", ");
        await supabase.from("messages").insert([
          {
            conversation_id: conversation.id,
            sender_id: user.id,
            content: `a ajouté ${memberNames}`,
            message_type: "system",
          },
        ]);
      }

      toast({ title: "Groupe créé", description: "Ton groupe privé est prêt." });
      onSuccess(conversation.id);
    } catch {
      toast({ title: "Erreur", description: "Impossible de créer le groupe", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const canCreate = groupName.trim().length > 0;

  return (
    <>
      <div className="mt-2 flex flex-col items-center">
        <div className="relative">
          <button
            type="button"
            className="relative cursor-pointer border-0 bg-transparent p-0"
            onClick={() => document.getElementById(avatarInputId)?.click()}
          >
            <div className="flex h-24 w-24 items-center justify-center rounded-full border-2 border-[#E5E5EA] bg-white">
              {groupAvatarUrl ? (
                <Avatar className="h-24 w-24 border-0">
                  <AvatarImage src={groupAvatarUrl} className="object-cover" />
                  <AvatarFallback className="rounded-full bg-white">
                    <UserPlus className="h-10 w-10 text-[#8E8E93]" strokeWidth={1.8} />
                  </AvatarFallback>
                </Avatar>
              ) : (
                <UserPlus className="h-10 w-10 text-[#8E8E93]" strokeWidth={1.8} />
              )}
            </div>
            <span
              className="absolute bottom-0 right-0 flex h-9 w-9 items-center justify-center rounded-full shadow-md"
              style={{ background: ACTION_BLUE }}
            >
              <Camera className="h-4 w-4 text-white" strokeWidth={2.4} />
            </span>
          </button>
          <input
            id={avatarInputId}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleAvatarSelect}
          />
        </div>
        <p className="mt-2 text-[14px] font-semibold text-[#0A0F1F]">Ajouter une photo</p>
      </div>

      <SectionLabel text="Informations" />
      <div className="overflow-hidden rounded-2xl bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
        <input
          value={groupName}
          onChange={(e) => setGroupName(e.target.value)}
          placeholder="Nom du groupe *"
          maxLength={50}
          className="w-full px-4 py-4 text-[16px] font-medium text-[#0A0F1F] outline-none placeholder:text-[#8E8E93]"
        />
      </div>

      <SectionLabel text="Ajouter des membres" />
      <div className="rounded-2xl bg-white px-4 py-3 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
        <div className="flex items-center gap-2">
          <Search className="h-4 w-4 shrink-0 text-[#8E8E93]" strokeWidth={2.5} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher un utilisateur..."
            className="min-w-0 flex-1 bg-transparent py-0.5 text-[15px] text-[#0A0F1F] outline-none placeholder:text-[#8E8E93]"
          />
        </div>
      </div>

      {searchResults.length > 0 && (
        <div className="mt-2 overflow-hidden rounded-2xl bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
          {searchResults.map((profile, idx) => {
            const isSelected = selectedMembers.some((m) => m.user_id === profile.user_id);
            return (
              <div key={profile.user_id}>
                {idx > 0 ? <div className="mx-4 h-px bg-[#F2F2F7]" /> : null}
                <button
                  type="button"
                  onClick={() => toggleMember(profile)}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left active:bg-[#F8F8F8]"
                >
                  <Avatar className="h-9 w-9 shrink-0">
                    <AvatarImage src={profile.avatar_url || ""} />
                    <AvatarFallback className="text-xs">
                      {(profile.username || "U")[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[15px] font-semibold text-[#0A0F1F]">
                      {profile.username || profile.display_name}
                    </p>
                    <p className="truncate text-[13px] text-[#8E8E93]">@{profile.username}</p>
                  </div>
                  {isSelected ? <Check className="h-5 w-5 shrink-0 text-[#007AFF]" strokeWidth={2.4} /> : null}
                </button>
              </div>
            );
          })}
        </div>
      )}

      <p className="mt-3 px-1 text-[13px] leading-snug text-[#8E8E93]">
        Les groupes sont privés. Seuls les membres invités peuvent voir les messages.
      </p>

      <button
        type="button"
        disabled={!canCreate || loading || avatarUploading}
        onClick={() => void handleCreateGroup()}
        className="mt-6 flex w-full touch-manipulation items-center justify-center gap-2 rounded-full py-3.5 text-[16px] font-bold text-white transition-opacity disabled:opacity-50"
        style={{ background: ACTION_BLUE }}
      >
        {loading ? (
          <Loader2 className="h-5 w-5 animate-spin" strokeWidth={2.4} />
        ) : (
          <UserPlus className="h-5 w-5" strokeWidth={2.4} />
        )}
        {loading ? "Création…" : "Créer le groupe"}
      </button>

      {showImageCrop && selectedImage && (
        <ImageCropEditor
          open={showImageCrop}
          onClose={() => {
            setShowImageCrop(false);
            setSelectedImage(null);
          }}
          imageSrc={selectedImage}
          onCropComplete={handleCroppedImage}
        />
      )}
    </>
  );
}
