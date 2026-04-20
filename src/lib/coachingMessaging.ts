import { supabase } from "@/integrations/supabase/client";

export async function getOrCreateDirectConversation(userA: string, userB: string) {
  const { data: existing, error: existingError } = await supabase
    .from("conversations")
    .select("id, participant_1, participant_2, is_group, updated_at")
    .or(`and(participant_1.eq.${userA},participant_2.eq.${userB}),and(participant_1.eq.${userB},participant_2.eq.${userA})`)
    .eq("is_group", false)
    .maybeSingle();

  if (existingError) throw existingError;
  if (existing?.id) return existing.id;

  const { data: created, error: createError } = await supabase
    .from("conversations")
    .insert({
      participant_1: userA,
      participant_2: userB,
      is_group: false,
      updated_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (createError) throw createError;
  return created.id;
}

export async function sendCoachingMessageToConversation(
  conversationId: string,
  senderId: string,
  content: string
) {
  const safe = content.trim();
  if (!safe) return;

  const { error: messageError } = await supabase.from("messages").insert({
    conversation_id: conversationId,
    sender_id: senderId,
    content: safe,
  });
  if (messageError) throw messageError;

  const { error: updateError } = await supabase
    .from("conversations")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", conversationId);
  if (updateError) throw updateError;
}

