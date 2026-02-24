import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash2, Users, ChevronDown, ChevronUp } from "lucide-react";

interface ClubGroup {
  id: string;
  name: string;
  color: string;
  member_count: number;
}

interface Member {
  user_id: string;
  display_name: string;
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
      // Load groups
      const { data: groupsData } = await supabase
        .from("club_groups")
        .select("*")
        .eq("club_id", clubId)
        .order("created_at");

      // Load club members
      const { data: memberIds } = await supabase
        .from("group_members")
        .select("user_id")
        .eq("conversation_id", clubId);

      if (memberIds && memberIds.length > 0) {
        const uids = memberIds.map(m => m.user_id).filter(id => id !== user?.id);
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, display_name")
          .in("user_id", uids);
        setMembers((profiles || []).map(p => ({ user_id: p.user_id!, display_name: p.display_name || "Athlète" })));
      }

      // Load group memberships
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
        setGroups(groupsData.map(g => ({ ...g, member_count: countMap[g.id] || 0 })));
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
    console.log("🏗️ Creating group:", { clubId, name: newGroupName.trim(), color });
    const { data, error } = await supabase.from("club_groups").insert({
      club_id: clubId,
      name: newGroupName.trim(),
      color,
    }).select();
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

  if (loading) {
    return <div className="space-y-2">{[1,2].map(i => <div key={i} className="h-12 bg-muted rounded-lg animate-pulse" />)}</div>;
  }

  return (
    <div className="space-y-3">
      <p className="text-xs font-medium text-muted-foreground uppercase">Groupes de niveau</p>

      {groups.map(group => (
        <div key={group.id} className="border rounded-lg overflow-hidden">
          <button
            className="w-full flex items-center gap-2 p-3 hover:bg-muted/50 transition-colors"
            onClick={() => setExpandedGroup(expandedGroup === group.id ? null : group.id)}
          >
            <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: group.color }} />
            <span className="text-sm font-medium flex-1 text-left">{group.name}</span>
            <Badge variant="secondary" className="text-[10px]">
              <Users className="h-3 w-3 mr-1" />
              {group.member_count}
            </Badge>
            {expandedGroup === group.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>

          {expandedGroup === group.id && (
            <div className="border-t px-3 py-2 space-y-1.5">
              {members.map(m => {
                const isInGroup = (groupMembers[group.id] || []).includes(m.user_id);
                return (
                  <label key={m.user_id} className="flex items-center gap-2 py-1 cursor-pointer">
                    <Checkbox checked={isInGroup} onCheckedChange={() => toggleMember(group.id, m.user_id)} />
                    <span className="text-sm">{m.display_name}</span>
                  </label>
                );
              })}
              {members.length === 0 && <p className="text-xs text-muted-foreground py-2">Aucun athlète dans le club</p>}
              <Button variant="ghost" size="sm" className="w-full text-destructive text-xs mt-1" onClick={() => deleteGroup(group.id)}>
                <Trash2 className="h-3 w-3 mr-1" /> Supprimer le groupe
              </Button>
            </div>
          )}
        </div>
      ))}

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
