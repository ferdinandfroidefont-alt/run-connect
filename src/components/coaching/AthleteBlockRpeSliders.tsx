import { parseRCC, formatParsedBlockSummary } from "@/lib/rccParser";
import { normalizeBlockRpeLength } from "@/lib/sessionBlockRpe";
import { RpeBlockSliderRow } from "./BlockRpeSliders";

export function AthleteBlockRpeSliders({
  rccCode,
  values,
  onChange,
}: {
  rccCode: string | null | undefined;
  values: number[];
  onChange: (next: number[]) => void;
}) {
  const blocks = parseRCC(rccCode || "").blocks;
  if (blocks.length === 0) return null;
  const v = normalizeBlockRpeLength(values, blocks.length);
  return (
    <div className="space-y-4">
      {blocks.map((b, i) => (
        <RpeBlockSliderRow
          key={`${b.raw}-${i}`}
          label={formatParsedBlockSummary(b)}
          value={v[i] ?? 5}
          onChange={(n) => {
            const next = [...v];
            next[i] = n;
            onChange(next);
          }}
        />
      ))}
    </div>
  );
}
