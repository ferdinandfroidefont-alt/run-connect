import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Plus, Trash2, Users, ChevronDown, ChevronUp, Camera, X } from "lucide-react";

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
}

interface ClubGroupsManagerProps {
  clubId: string;
}

const GROUP_COLORS = [
  "#3B82F6", "#EF4444", "#10B981", "#F59E0B", "#8B5CF6", "#EC4899", "#06B6D4", "#F97316",
];

export const ClubGroupsManager = ({ clubId }: ClubGroupsManagerProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [groups, setGroups] = useState<ClubGroup[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [newGroupName, setNewGroupName] = useState("");
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);
  const [groupMembers, setGroupMembers] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data: groupsData } = await supabase
        .from("club_groups")
        .select("*")
        .eq("club_id", clubId)
        .order("created_at");

      const { data: memberIds } = await supabase
        .from("group_members")
        .select("user_id")
        .eq("conversation_id", clubId);

      if (memberIds && memberIds.length > 0) {
        const uids = memberIds.map(m => m.user_id).filter(id => id !== user?.id);
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, display_name, avatar_url")
          .in("user_id", uids);
        setMembers((profiles || []).map(p => ({
          user_id: p.user_id!,
          display_name: p.display_name || "Athlète",
          avatar_url: p.avatar_url || null,
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
        setGroups(groupsData.map(g => ({
          ...g,
          member_count: countMap[g.id] || 0,
          avatar_url: (g as any).avatar_url || null,
        })));
      } else {
        setGroups([]);
      }
    } catch (e) {
      console.error("Error loading groups:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [clubId]);

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
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const filePath = `club-groups/${groupId}/${Date.now()}.${file.name.split('.').pop()}`;
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, { upsert: true });
      if (uploadError) {
        toast({ title: "Erreur upload", description: uploadError.message, variant: "destructive" });
        return;
      }
      const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(filePath);
      await supabase.from("club_groups").update({ avatar_url: urlData.publicUrl } as any).eq("id", groupId);
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
                <p className="text-[15px] font-semibold text-foreground">{group.name}</p>
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
