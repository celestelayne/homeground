interface AppHeaderProps {
  onAddProperty: () => void;
  addingProperty: boolean;
  /** Hidden before anything is saved: the first-use overlay offers its own. */
  showAddProperty?: boolean;
  /** Back to the region, with nothing selected and nothing half-written. */
  onGoHome: () => void;
}

export function AppHeader({
  onAddProperty,
  addingProperty,
  showAddProperty = true,
  onGoHome,
}: AppHeaderProps) {
  return (
    <header className="flex h-header flex-none items-center gap-[14px] border-b border-line-2 bg-surface px-[14px]">
      {/* Fixed to the sidebar width so the wordmark aligns with the column below. */}
      <div className="flex w-sidebar flex-none items-center gap-2">
        <h1 className="m-0">
          <button
            type="button"
            onClick={onGoHome}
            className="flex items-center gap-2 rounded-sharp text-subhead font-semibold tracking-[-0.01em] hover:opacity-80"
          >
            {/* Decorative: the wordmark beside it already carries the name. */}
            <img src="/logo.svg" alt="" className="size-[18px] flex-none" />
            HomeGround
          </button>
        </h1>
        <span className="numeric rounded-sharp border border-line px-[5px] py-px text-[10px] whitespace-nowrap text-ink-3">
          OCC · PACA
        </span>
      </div>

      {showAddProperty ? (
        <button
          type="button"
          onClick={onAddProperty}
          aria-pressed={addingProperty}
          className="rounded-sharp bg-ink px-[9px] py-[6px] text-caption text-surface"
        >
          + Add property
        </button>
      ) : null}
    </header>
  );
}
