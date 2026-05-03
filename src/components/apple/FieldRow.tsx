import { forwardRef, type InputHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface FieldRowProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "defaultValue"> {
  label: ReactNode;
  /** Valeur affichée (mode lecture). Si `onChange` est fourni → input éditable. */
  value?: string;
  /** Pour mode éditable */
  defaultValue?: string;
  /** Dernière ligne du group : pas de séparateur bas */
  last?: boolean;
  /** Affichage statique (pas d’input, juste valeur en muted) */
  readOnlyDisplay?: boolean;
  /** Classe extra sur la row */
  className?: string;
}

/**
 * Ligne champ iOS (Settings.app : "Email" — "ferdinand@…").
 * - readOnlyDisplay : juste affichage muted (utilisé en récap)
 * - sinon : input éditable (placeholder = value)
 */
export const FieldRow = forwardRef<HTMLInputElement, FieldRowProps>(function FieldRow(
  { label, value, defaultValue, last, readOnlyDisplay, className, placeholder, ...rest },
  ref
) {
  return (
    <div className={cn("apple-field-row", last && "apple-field-row-last", className)}>
      <div className="apple-field-label">{label}</div>
      {readOnlyDisplay ? (
        <div className="apple-cell-value flex-1">{value}</div>
      ) : (
        <input
          ref={ref}
          value={value}
          defaultValue={defaultValue}
          placeholder={placeholder}
          className="apple-field-value"
          {...rest}
        />
      )}
    </div>
  );
});
