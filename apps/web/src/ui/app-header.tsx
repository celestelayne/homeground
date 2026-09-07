interface AppHeaderProps {
  onAddProperty: () => void;
  addingProperty: boolean;
  /** Hidden before anything is saved: the first-use overlay offers its own. */
  showAddProperty?: boolean;
}

export function AppHeader({
  onAddProperty,
  addingProperty,
  showAddProperty = true,
}: AppHeaderProps) {
  return (
    <header className="flex h-header flex-none items-center gap-[14px] border-b border-line-2 bg-surface px-[14px]">
      {/* Fixed to the sidebar width so the wordmark aligns with the column below. */}
      <div className="flex w-sidebar flex-none items-center gap-2">
        <span className="size-[13px] flex-none rounded-card bg-ink" aria-hidden="true" />
        <h1 className="m-0 text-subhead font-semibold tracking-[-0.01em]">HomeGround</h1>
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
