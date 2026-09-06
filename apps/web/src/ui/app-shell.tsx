import type { ReactNode } from "react";
import { AppHeader } from "./app-header.js";

interface AppShellProps {
  sidebar?: ReactNode;
  map?: ReactNode;
  /** Rendered only when something needs it, per the design. */
  panel?: ReactNode;
}

/** Three-part desktop layout. The page never scrolls; each column does. */
export function AppShell({ sidebar, map, panel }: AppShellProps) {
  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden">
      <AppHeader />
      <div className="flex min-h-0 flex-1">
        <aside
          className="flex w-sidebar flex-none flex-col overflow-y-auto border-r border-line-2 bg-surface"
          aria-label="Saved properties"
        >
          {sidebar}
        </aside>
        {/* Never let the panels squeeze the map below half the viewport. */}
        <main className="min-w-1/2 flex-1 bg-paper">{map}</main>
        {panel ? (
          <aside className="w-panel flex-none overflow-y-auto border-l border-line-2 bg-surface">
            {panel}
          </aside>
        ) : null}
      </div>
    </div>
  );
}
