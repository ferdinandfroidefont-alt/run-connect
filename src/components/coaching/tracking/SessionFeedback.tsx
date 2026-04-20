interface SessionFeedbackProps {
  note: string | null;
  rpeLabel?: string;
}

export function SessionFeedback({ note, rpeLabel }: SessionFeedbackProps) {
  if (!note && !rpeLabel) {
    return <p className="text-[12px] text-muted-foreground">Aucun retour</p>;
  }

  return (
    <div className="space-y-1 rounded-xl bg-secondary/60 px-3 py-2">
      {note ? <p className="text-[12px] leading-snug text-foreground">💬 {note}</p> : null}
      {rpeLabel ? <p className="text-[11px] font-medium text-muted-foreground">{rpeLabel}</p> : null}
    </div>
  );
}

