import { useState, useEffect, useRef, useCallback, useId } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { parseRCC, type RCCResult } from "@/lib/rccParser";
import { AlertCircle } from "lucide-react";

interface RCCEditorProps {
  value: string;
  onChange: (value: string) => void;
  parsedResult?: RCCResult;
  onParsedChange?: (result: RCCResult) => void;
}

const QUICK_CHIPS = [
  { label: "EF", insert: "20'>5'30", title: "Échauffement 20min" },
  { label: "CD", insert: "10'>6'00", title: "Retour au calme 10min" },
  { label: "x3'", insert: "6x3'>3'30", title: "6×3min @ 3:30" },
  { label: "x1000", insert: "3x1000>4'00", title: "3×1000m @ 4:00" },
  { label: "r=", insert: "r1'30>trot", title: "Récup entre les répétitions" },
  { label: "R=", insert: ", ", title: "Récup entre les blocs (séparateur)" },
];

export const RCCEditor = ({ value, onChange, onParsedChange }: RCCEditorProps) => {
  const uid = useId();
  const inputId = `${uid}-rcc`;
  const errorsId = `${uid}-rcc-errors`;
  const [result, setResult] = useState<RCCResult>({ blocks: [], errors: [] });
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const doParse = useCallback((code: string) => {
    const r = parseRCC(code);
    setResult(r);
    onParsedChange?.(r);
  }, [onParsedChange]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doParse(value), 150);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [value, doParse]);

  const insertText = (text: string) => {
    const sep = value.trim() && !value.trim().endsWith(",") && !value.trim().endsWith("+") && text !== ">" ? ", " : "";
    onChange(value + sep + text);
    textareaRef.current?.focus();
  };

  const modifyReps = (delta: number) => {
    // Find last interval block pattern and adjust reps
    const match = value.match(/(\d+)(x\d+>[^\s,+]+)(?=[^x]*$)/);
    if (match) {
      const currentReps = parseInt(match[1]);
      const newReps = Math.max(1, currentReps + delta);
      const newValue = value.replace(match[0], `${newReps}${match[2]}`);
      onChange(newValue);
    }
  };

  const removeLastBlock = () => {
    const parts = value.split(/[,+]/);
    if (parts.length > 1) {
      parts.pop();
      onChange(parts.join(", ").trim());
    } else {
      onChange("");
    }
  };

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <label
          htmlFor={inputId}
          className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
        >
          Code séance (RCC)
        </label>
        <Textarea
          id={inputId}
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="20'>5'15, 3x1000>3'00 r1'15>trot, 5'>6'00"
          className="min-h-[72px] resize-none rounded-xl border border-border/60 bg-background font-mono text-sm"
          rows={2}
          aria-invalid={result.errors.length > 0}
          aria-describedby={result.errors.length > 0 ? errorsId : undefined}
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
        />
      </div>

      {/* Quick chips */}
      <div className="flex flex-wrap gap-1.5">
        {QUICK_CHIPS.map((chip) => (
          <Button
            key={chip.label}
            type="button"
            variant="outline"
            size="sm"
            className="h-7 text-xs px-2.5 font-mono"
            onClick={() => insertText(chip.insert)}
            title={chip.title}
            aria-label={`Insérer : ${chip.title}`}
          >
            {chip.label}
          </Button>
        ))}
        <div className="w-px bg-border mx-0.5" />
        <Button type="button" variant="outline" size="sm" className="h-7 text-xs px-2" onClick={() => modifyReps(1)} title="+1 répétition">
          +Rep
        </Button>
        <Button type="button" variant="outline" size="sm" className="h-7 text-xs px-2" onClick={() => modifyReps(-1)} title="-1 répétition">
          -Rep
        </Button>
        <Button type="button" variant="outline" size="sm" className="h-7 text-xs px-2" onClick={removeLastBlock} title="Supprimer le dernier bloc">
          -Bloc
        </Button>
      </div>

      {/* Errors */}
      {result.errors.length > 0 && (
        <div id={errorsId} className="space-y-1" role="alert">
          {result.errors.map((err, i) => (
            <div key={i} className="flex items-start gap-1.5 text-xs text-destructive">
              <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              <span>{err.message} — <code className="font-mono bg-destructive/10 px-1 rounded">{err.raw}</code></span>
            </div>
          ))}
        </div>
      )}

    </div>
  );
};
