import { cn } from "@/lib/utils";

export function ChevronGlyph({ className }: { className?: string }) {
  return (
    <svg
      width="7"
      height="12"
      viewBox="0 0 7 12"
      fill="none"
      aria-hidden
      className={cn("apple-cell-chevron", className)}
    >
      <path
        d="M1 1l5 5-5 5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
