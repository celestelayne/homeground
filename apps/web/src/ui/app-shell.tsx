import type { ReactNode } from "react";

interface AppShellProps {
  header: ReactNode;
  /** The commune being researched. Takes half the frame when present. */
  panel?: ReactNode;
  map?: ReactNode;
}

/**
 * Two-part desktop layout. The page never scrolls; the reading half does.
 *
 * A straight half and half rather than a sidebar beside a map: both carry
 * primary content here. Reading a commune's figures and seeing where its
 * facilities are matter equally, so neither gets to be the margin.
 */
export function AppShell({ header, panel, map }: AppShellProps) {
  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden">
      {header}
      <div className="flex min-h-0 flex-1">
        {panel ? (
          <section
            className="flex w-1/2 flex-none flex-col overflow-y-auto border-r border-line-2 bg-surface"
            aria-label="Commune overview"
          >
            {panel}
          </section>
        ) : null}
        <main className="relative min-w-0 flex-1 bg-paper">{map}</main>
      </div>
    </div>
  );
}
