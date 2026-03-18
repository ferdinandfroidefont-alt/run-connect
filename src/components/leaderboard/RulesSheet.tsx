import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

interface RulesSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const rules = [
  { emoji: "🏃", label: "Rejoindre une séance validée", points: "+20 pts" },
  { emoji: "🧭", label: "Créer une séance", points: "+15 pts" },
  { emoji: "👍", label: "Liker une activité", points: "+2 pts", note: "limité/jour" },
  { emoji: "🤝", label: "Parrainer un ami", points: "+30 pts" },
  { emoji: "🔥", label: "Bonus régularité (streak)", points: "variable" },
];

export const RulesSheet = ({ open, onOpenChange }: RulesSheetProps) => {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl px-0 pb-8">
        <SheetHeader className="px-5 pb-2">
          <SheetTitle className="text-[17px] font-semibold text-center">
            Comment gagner des points ?
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-0 mt-2">
          {rules.map((r, i) => (
            <div
              key={i}
              className="flex items-center gap-3 px-5 py-3 border-b border-border/30 last:border-b-0"
            >
              <span className="text-xl shrink-0">{r.emoji}</span>
              <div className="flex-1 min-w-0">
                <p className="text-[15px] font-medium text-foreground">{r.label}</p>
                {r.note && (
                  <p className="text-[12px] text-muted-foreground">{r.note}</p>
                )}
              </div>
              <span className="text-[14px] font-semibold text-primary shrink-0">{r.points}</span>
            </div>
          ))}
        </div>

        <div className="mx-5 mt-4 px-3 py-2.5 rounded-lg bg-secondary">
          <p className="text-[13px] text-muted-foreground text-center">
            Seules les activités vérifiées comptent ✅
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
};
