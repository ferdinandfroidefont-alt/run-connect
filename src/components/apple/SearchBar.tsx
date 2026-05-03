import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export interface SearchBarProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  /** Wrapper extra class (sur la pillule, pas l’input) */
  wrapperClassName?: string;
}

/**
 * SearchBar iOS — pillule grise (#f2f2f7 light, rgba(120,120,128,0.24) dark)
 * Hauteur 36, padding 8, icône loupe à gauche.
 *
 * Comportement : champ contrôlé/incontrôlé standard (value/onChange/placeholder).
 * À brancher sur la logique de recherche existante (debounce, supabase, etc.).
 */
export const SearchBar = forwardRef<HTMLInputElement, SearchBarProps>(function SearchBar(
  { wrapperClassName, className, placeholder = "Recherche", ...rest },
  ref
) {
  return (
    <div className={cn("apple-search", wrapperClassName)}>
      <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden className="shrink-0">
        <path d="M11.5 10h-.79l-.28-.27a6.5 6.5 0 1 0-.7.7l.27.28v.79l5 4.99L16.49 15zm-6 0a4.5 4.5 0 1 1 0-9 4.5 4.5 0 0 1 0 9z" />
      </svg>
      <input
        ref={ref}
        type="search"
        placeholder={placeholder}
        className={cn(
          "min-w-0 flex-1 bg-transparent text-[17px] text-foreground placeholder:text-muted-foreground",
          "focus:outline-none",
          className
        )}
        {...rest}
      />
    </div>
  );
});
