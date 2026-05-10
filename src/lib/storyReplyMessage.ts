/**
 * Messages « réponse story » envoyés depuis SessionStoryDialog (contenu texte historique).
 */
const STORY_REPLY_UNACCENTED = /^reponse\s+a\s+ta\s+story:\s*(.*)$/i;
const STORY_REPLY_ACCENTED = /^réponse\s+à\s+ta\s+story:\s*(.*)$/i;

export function parseStoryReplyContent(content: string | null | undefined): { replyText: string } | null {
  if (!content || typeof content !== "string") return null;
  const m = content.match(STORY_REPLY_UNACCENTED) ?? content.match(STORY_REPLY_ACCENTED);
  if (!m) return null;
  const replyText = m[1]?.trim() ?? "";
  return { replyText };
}
