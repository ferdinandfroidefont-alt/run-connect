export const SeasonRewardBanner = () => {
  return (
    <div className="mx-4 px-3 py-2.5 rounded-xl bg-primary/5 border border-primary/10 flex items-center gap-2.5">
      <span className="text-lg">🎁</span>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-semibold text-foreground">Récompense saison</p>
        <p className="text-[12px] text-muted-foreground">Le #1 gagne un code promo exclusif</p>
      </div>
    </div>
  );
};
