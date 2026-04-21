import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Plus, Trash2, Users, ChevronDown, ChevronUp, Camera, X, MessageCircle, Pencil, GraduationCap, ArchiveRestore, Archive } from "lucide-react";

interface ClubGroup {
  id: string;
  name: string;
  color: string;
  member_count: number;
  avatar_url: string | null;
}

interface Member {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  is_coach: boolean;
}

interface ClubGroupsManagerProps {
  clubId: string;
  onMessageGroup?: (group: { id: string; name: string; avatarUrl: string | null; memberIds: string[] }) => void;
}

const GROUP_COLORS = [
  "#3B82F6", "#EF4444", "#10B981", "#F59E0B", "#8B5CF6", "#EC4899", "#06B6D4", "#F97316",
];

export const ClubGroupsManager = ({ clubId, onMessageGroup }: ClubGroupsManagerProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [groups, setGroups] = useState<ClubGroup[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [newGroupName, setNewGroupName] = useState("");
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);
  const [groupMembers, setGroupMembers] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);
  const [archivedGroups, setArchivedGroups] = useState<Set<string>>(new Set());

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: groupsData } = await supabase
        .from("club_groups")
        .select("*")
        .eq("club_id", clubId)
        .order("created_at");

      const { data: memberIds } = await supabase
        .from("group_members")
        .select("user_id, is_coach")
        .eq("conversation_id", clubId);

      if (memberIds && memberIds.length > 0) {
        const uids = memberIds.map(m => m.user_id).filter(id => id !== user?.id);
        const roleById = new Map(memberIds.map((m) => [m.user_id, !!m.is_coach]));
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, display_name, avatar_url")
          .in("user_id", uids);
        setMembers((profiles || []).map(p => ({
          user_id: p.user_id!,
          display_name: p.display_name || "Athlète",
          avatar_url: p.avatar_url || null,
          is_coach: roleById.get(p.user_id!) ?? false,
        })));
      }

      if (groupsData && groupsData.length > 0) {
        const { data: allMemberships } = await supabase
          .from("club_group_members")
          .select("group_id, user_id")
          .in("group_id", groupsData.map(g => g.id));

        const memberMap: Record<string, string[]> = {};
        const countMap: Record<string, number> = {};
        (allMemberships || []).forEach(m => {
          if (!memberMap[m.group_id]) memberMap[m.group_id] = [];
          memberMap[m.group_id].push(m.user_id);
          countMap[m.group_id] = (countMap[m.group_id] || 0) + 1;
        });

        setGroupMembers(memberMap);
        const archived = new Set<string>();
        setGroups(groupsData.map(g => {
          if (g.name.startsWith("[ARCHIVE] ")) archived.add(g.id);
          return ({
          ...g,
          member_count: countMap[g.id] || 0,
          avatar_url: g.avatar_url || null,
          });
        }));
        setArchivedGroups(archived);
      } else {
        setGroups([]);
        setArchivedGroups(new Set());
      }
    } catch (e) {
      console.error("Error loading groups:", e);
    } finally {
      setLoading(false);
    }
  }, [clubId, user?.id]);

  useEffect(() => { loadData(); }, [loadData]);

  const createGroup = async () => {
    if (!newGroupName.trim()) return;
    const color = GROUP_COLORS[groups.length % GROUP_COLORS.length];
    const { error } = await supabase.from("club_groups").insert({
      club_id: clubId,
      name: newGroupName.trim(),
      color,
    });
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      setNewGroupName("");
      loadData();
    }
  };

  const deleteGroup = async (groupId: string) => {
    await supabase.from("club_groups").delete().eq("id", groupId);
    loadData();
  };

  const renameGroup = async (groupId: string, currentName: string) => {
    const cleanCurrent = currentName.replace(/^\[ARCHIVE\]\s*/, "");
    const next = window.prompt("Renommer le groupe", cleanCurrent);
    if (!next?.trim()) return;
    const isArchived = currentName.startsWith("[ARCHIVE] ");
    const updatedName = `${isArchived ? "[ARCHIVE] " : ""}${next.trim()}`;
    const { error } = await supabase.from("club_groups").update({ name: updatedName }).eq("id", groupId);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      return;
    }
    loadData();
    toast({ title: "Groupe renommé" });
  };

  const assignCoach = async (groupId: string) => {
    const coaches = members.filter((m) => m.is_coach);
    if (coaches.length === 0) {
      toast({ title: "Aucun coach disponible", description: "Ajoutez un coach au club d'abord." });
      return;
    }
    const list = coaches.map((coach, index) => `${index + 1}. ${coach.display_name}`).join("\n");
    const picked = window.prompt(`Assigner coach (numéro):\n${list}`, "1");
    if (!picked) return;
    const idx = Number(picked) - 1;
    if (!Number.isInteger(idx) || idx < 0 || idx >= coaches.length) {
      toast({ title: "Choix invalide", variant: "destructive" });
      return;
    }
    const coach = coaches[idx];
    const { error } = await supabase.from("club_group_members").upsert({ group_id: groupId, user_id: coach.user_id });
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      return;
    }
    loadData();
    toast({ title: `${coach.display_name} assigné au groupe` });
  };

  const toggleArchiveGroup = async (groupId: string, currentName: string) => {
    const isArchived = currentName.startsWith("[ARCHIVE] ");
    const nextName = isArchived ? currentName.replace(/^\[ARCHIVE\]\s*/, "") : `[ARCHIVE] ${currentName}`;
    const { error } = await supabase.from("club_groups").update({ name: nextName }).eq("id", groupId);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      return;
    }
    loadData();
    toast({ title: isArchived ? "Groupe désarchivé" : "Groupe archivé" });
  };

  const toggleMember = async (groupId: string, userId: string) => {
    const current = groupMembers[groupId] || [];
    if (current.includes(userId)) {
      await supabase.from("club_group_members").delete().eq("group_id", groupId).eq("user_id", userId);
    } else {
      await supabase.from("club_group_members").insert({ group_id: groupId, user_id: userId });
    }
    loadData();
  };

  const handleGroupPhoto = async (groupId: string) => {
    if (!user) {
      toast({ title: "Erreur", description: "Utilisateur non connecté", variant: "destructive" });
      return;
    }
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const extension = file.name.split(".").pop() || "jpg";
      const filePath = `${user.id}/club-groups/${groupId}-${Date.now()}.${extension}`;
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, { upsert: true });
      if (uploadError) {
        toast({ title: "Erreur upload", description: uploadError.message, variant: "destructive" });
        return;
      }
      const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(filePath);
      await supabase.from("club_groups").update({ avatar_url: urlData.publicUrl }).eq("id", groupId);
      loadData();
      toast({ title: "Photo mise à jour !" });
    };
    input.click();
  };

  if (loading) {
    return <div className="space-y-2 px-4">{[1,2].map(i => <div key={i} className="h-12 bg-muted rounded-lg animate-pulse" />)}</div>;
  }

  return (
    <div className="space-y-3 px-4">
      <p className="text-xs font-medium text-muted-foreground uppercase">Groupes de niveau</p>

      {groups.map(group => {
        const isExpanded = expandedGroup === group.id;
        const groupMembersList = groupMembers[group.id] || [];
        const isArchived = archivedGroups.has(group.id);
        return (
          <div
            key={group.id}
            className="rounded-[12px] overflow-hidden bg-card"
            style={{ boxShadow: '0 1px 3px hsl(0 0% 0% / 0.06)' }}
          >
            <button
              className="w-full flex items-center gap-3 p-3.5 active:bg-secondary transition-colors"
              onClick={() => setExpandedGroup(isExpanded ? null : group.id)}
            >
              {/* Group avatar or color band */}
              {group.avatar_url ? (
                <Avatar className="h-10 w-10 shrink-0">
                  <AvatarImage src={group.avatar_url} />
                  <AvatarFallback style={{ backgroundColor: group.color }} className="text-white text-sm font-bold">
                    {group.name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
              ) : (
                <div
                  className="w-10 h-10 rounded-full shrink-0 flex items-center justify-center text-white text-sm font-bold"
                  style={{ backgroundColor: group.color }}
                >
                  {group.name.charAt(0)}
                </div>
              )}
              <div className="flex-1 text-left">
                <p className="text-[15px] font-semibold text-foreground">{group.name.replace(/^\[ARCHIVE\]\s*/, "")}</p>
                <p className="text-[12px] text-muted-foreground">
                  {group.member_count} athlète{group.member_count > 1 ? "s" : ""}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
              </div>
            </button>

            {isExpanded && (
              <div className="border-t border-border px-4 py-2 space-y-1">
                {/* Group photo button */}
                <button
                  onClick={() => handleGroupPhoto(group.id)}
                  className="flex items-center gap-2 py-2 px-1 text-primary text-[13px] font-medium w-full active:opacity-70"
                >
                  <Camera className="h-4 w-4" />
                  {group.avatar_url ? "Changer la photo" : "Ajouter une photo"}
                </button>
                {onMessageGroup ? (
                  <button
                    onClick={() =>
                      onMessageGroup({
                        id: group.id,
                        name: group.name,
                        avatarUrl: group.avatar_url,
                        memberIds: groupMembersList,
                      })
                    }
                    className="flex items-center gap-2 py-2 px-1 text-primary text-[13px] font-medium w-full active:opacity-70"
                  >
                    <MessageCircle className="h-4 w-4" />
                    Envoyer un message au groupe
                  </button>
                ) : null}
                <div className="grid grid-cols-3 gap-1 px-1 pb-1">
                  <Button variant="secondary" size="sm" className="h-8 text-[11px]" onClick={() => renameGroup(group.id, group.name)}>
                    <Pencil className="h-3.5 w-3.5 mr-1" /> Renommer
                  </Button>
                  <Button variant="secondary" size="sm" className="h-8 text-[11px]" onClick={() => assignCoach(group.id)}>
                    <GraduationCap className="h-3.5 w-3.5 mr-1" /> Assigner coach
                  </Button>
                  <Button variant="secondary" size="sm" className="h-8 text-[11px]" onClick={() => toggleArchiveGroup(group.id, group.name)}>
                    {isArchived ? <ArchiveRestore className="h-3.5 w-3.5 mr-1" /> : <Archive className="h-3.5 w-3.5 mr-1" />}
                    {isArchived ? "Désarchiver" : "Archiver"}
                  </Button>
                </div>

                <div className="border-t border-border pt-1">
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium py-1.5">Membres</p>
                  {/* Members in group */}
                  {groupMembersList.length > 0 && (
                    <div className="space-y-0.5 mb-2">
                      {groupMembersList.map(uid => {
                        const m = members.find(m => m.user_id === uid);
                        if (!m) return null;
                        return (
                          <div key={uid} className="flex items-center gap-2.5 py-1.5 px-1">
                            <Avatar className="h-7 w-7">
                              <AvatarImage src={m.avatar_url || ""} />
                              <AvatarFallback className="text-[10px]">{m.display_name.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <span className="text-[14px] text-foreground flex-1">{m.display_name}</span>
                            <button
                              onClick={() => toggleMember(group.id, uid)}
                              className="h-7 w-7 rounded-full flex items-center justify-center text-destructive hover:bg-destructive/10 active:bg-destructive/20 transition-colors"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Members NOT in group - add */}
                  {members.filter(m => !groupMembersList.includes(m.user_id)).length > 0 && (
                    <>
                      <p className="text-[11px] text-muted-foreground py-1">Ajouter au groupe</p>
                      {members.filter(m => !groupMembersList.includes(m.user_id)).map(m => (
                        <button
                          key={m.user_id}
                          onClick={() => toggleMember(group.id, m.user_id)}
                          className="flex items-center gap-2.5 py-1.5 px-1 w-full active:bg-muted rounded-lg transition-colors"
                        >
                          <Avatar className="h-7 w-7 opacity-50">
                            <AvatarImage src={m.avatar_url || ""} />
                            <AvatarFallback className="text-[10px]">{m.display_name.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <span className="text-[14px] text-muted-foreground flex-1">{m.display_name}</span>
                          <Plus className="h-4 w-4 text-primary" />
                        </button>
                      ))}
                    </>
                  )}
                </div>

                {members.length === 0 && <p className="text-xs text-muted-foreground py-2">Aucun athlète dans le club</p>}
                <div className="border-t border-border mt-1 pt-1">
                  <Button variant="ghost" size="sm" className="w-full text-destructive text-xs" onClick={() => deleteGroup(group.id)}>
                    <Trash2 className="h-3 w-3 mr-1" /> Supprimer le groupe
                  </Button>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* Create new group */}
      <div className="flex gap-2">
        <Input
          placeholder="Nouveau groupe (ex: Demi-fond)"
          value={newGroupName}
          onChange={e => setNewGroupName(e.target.value)}
          className="text-sm h-9"
          onKeyDown={e => e.key === "Enter" && createGroup()}
        />
        <Button size="sm" className="h-9 shrink-0" onClick={createGroup} disabled={!newGroupName.trim()}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};
