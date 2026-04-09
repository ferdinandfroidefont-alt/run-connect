import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

type SupportTicket = {
  id: string;
  subject: string;
  category: string;
  status: "open" | "in_progress" | "resolved" | "closed";
  created_at: string;
  updated_at: string;
};

type SupportTicketMessage = {
  id: string;
  message: string;
  is_staff: boolean;
  created_at: string;
};

const STATUS_LABEL: Record<SupportTicket["status"], string> = {
  open: "Ouvert",
  in_progress: "En cours",
  resolved: "Resolue",
  closed: "Fermee",
};

export function SupportInbox() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [activeTicketId, setActiveTicketId] = useState<string | null>(null);
  const [messages, setMessages] = useState<SupportTicketMessage[]>([]);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [reply, setReply] = useState("");

  const activeTicket = useMemo(
    () => tickets.find((t) => t.id === activeTicketId) ?? null,
    [tickets, activeTicketId]
  );

  const loadTickets = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from("support_tickets")
        .select("id, subject, category, status, created_at, updated_at")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      const rows = (data ?? []) as SupportTicket[];
      setTickets(rows);
      if (!activeTicketId && rows.length > 0) setActiveTicketId(rows[0].id);
    } catch (error: any) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (ticketId: string) => {
    try {
      const { data, error } = await (supabase as any)
        .from("support_ticket_messages")
        .select("id, message, is_staff, created_at")
        .eq("ticket_id", ticketId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      setMessages((data ?? []) as SupportTicketMessage[]);
    } catch (error: any) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    }
  };

  useEffect(() => {
    void loadTickets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  useEffect(() => {
    if (!activeTicketId) {
      setMessages([]);
      return;
    }
    void loadMessages(activeTicketId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTicketId]);

  const createTicket = async () => {
    if (!user?.id) return;
    const s = subject.trim();
    const b = body.trim();
    if (!s || !b) {
      toast({
        title: "Champs requis",
        description: "Ajoutez un sujet et votre message.",
        variant: "destructive",
      });
      return;
    }
    setLoading(true);
    try {
      const { data: ticket, error } = await (supabase as any)
        .from("support_tickets")
        .insert({ user_id: user.id, category: "general", subject: s, status: "open" })
        .select("id, subject, category, status, created_at, updated_at")
        .single();
      if (error) throw error;

      const { error: msgError } = await (supabase as any)
        .from("support_ticket_messages")
        .insert({ ticket_id: ticket.id, author_user_id: user.id, is_staff: false, message: b });
      if (msgError) throw msgError;

      setSubject("");
      setBody("");
      await loadTickets();
      setActiveTicketId(ticket.id);
      await loadMessages(ticket.id);
      toast({ title: "Ticket cree", description: "Le support reviendra vers vous dans ce fil." });
    } catch (error: any) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const sendReply = async () => {
    if (!user?.id || !activeTicketId) return;
    const msg = reply.trim();
    if (!msg) return;
    setLoading(true);
    try {
      const { error } = await (supabase as any)
        .from("support_ticket_messages")
        .insert({ ticket_id: activeTicketId, author_user_id: user.id, is_staff: false, message: msg });
      if (error) throw error;
      setReply("");
      await loadMessages(activeTicketId);
      await loadTickets();
    } catch (error: any) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="rounded-[10px] bg-card p-3">
        <p className="mb-2 text-[13px] font-medium text-muted-foreground">Nouveau ticket</p>
        <Input
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Sujet (ex: probleme de paiement)"
          className="mb-2"
        />
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Decrivez votre probleme..."
          className="mb-2 min-h-[90px]"
        />
        <Button onClick={() => void createTicket()} disabled={loading} className="w-full">
          Ouvrir un ticket
        </Button>
      </div>

      <div className="rounded-[10px] bg-card p-3">
        <p className="mb-2 text-[13px] font-medium text-muted-foreground">Mes tickets</p>
        {tickets.length === 0 ? (
          <p className="text-[13px] text-muted-foreground">Aucun ticket pour le moment.</p>
        ) : (
          <div className="space-y-2">
            {tickets.map((ticket) => (
              <button
                key={ticket.id}
                type="button"
                onClick={() => setActiveTicketId(ticket.id)}
                className={`w-full rounded-md border px-3 py-2 text-left transition-colors ${
                  activeTicketId === ticket.id ? "border-primary bg-primary/5" : "border-border"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-[14px] font-medium">{ticket.subject}</p>
                  <Badge variant="outline">{STATUS_LABEL[ticket.status]}</Badge>
                </div>
                <p className="text-[12px] text-muted-foreground">
                  Maj: {new Date(ticket.updated_at).toLocaleString("fr-FR")}
                </p>
              </button>
            ))}
          </div>
        )}
      </div>

      {activeTicket && (
        <div className="rounded-[10px] bg-card p-3">
          <p className="mb-2 text-[13px] font-medium text-muted-foreground">Conversation: {activeTicket.subject}</p>
          <div className="mb-3 max-h-64 space-y-2 overflow-y-auto rounded-md border border-border p-2">
            {messages.length === 0 ? (
              <p className="text-[13px] text-muted-foreground">Aucun message.</p>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={`max-w-[90%] rounded-md px-2 py-1.5 text-[13px] ${
                    message.is_staff
                      ? "mr-auto bg-secondary text-foreground"
                      : "ml-auto bg-primary text-primary-foreground"
                  }`}
                >
                  <p>{message.message}</p>
                  <p className="mt-1 text-[11px] opacity-80">
                    {new Date(message.created_at).toLocaleString("fr-FR")}
                  </p>
                </div>
              ))
            )}
          </div>
          <div className="flex gap-2">
            <Input
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              placeholder="Repondre..."
              className="flex-1"
            />
            <Button onClick={() => void sendReply()} disabled={loading || !reply.trim()}>
              Envoyer
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
