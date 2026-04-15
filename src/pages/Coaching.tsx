export default function Coaching() {
  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-secondary" data-tutorial="tutorial-coaching">
      <div className="z-50 shrink-0 border-b border-border bg-card pt-[var(--safe-area-top)]">
        <div className="px-ios-4 py-ios-3 relative flex items-center justify-center">
          <h1 className="text-ios-largetitle font-bold tracking-tight text-center">Coaching</h1>
        </div>
      </div>
      <div className="ios-scroll-region flex-1 overflow-y-auto px-ios-4 pt-ios-4 pb-ios-6">
        <div className="mx-auto w-full max-w-xl rounded-2xl border border-dashed border-border bg-card p-6 text-center">
          <p className="text-[18px] font-semibold text-foreground">Nouvelle page Coaching</p>
          <p className="mt-2 text-[14px] text-muted-foreground">
            L&apos;ancienne page a été supprimée. Cette base est prête pour reconstruire la nouvelle expérience.
          </p>
        </div>
      </div>
    </div>
  );
}
