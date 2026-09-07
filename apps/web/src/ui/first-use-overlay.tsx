interface FirstUseOverlayProps {
  onAddProperty: () => void;
}

/**
 * Shown over the map when nothing is saved. The gradient thins to the right so
 * the map stays legible: geography is the mental model, and it should be
 * established before anything has been saved.
 */
export function FirstUseOverlay({ onAddProperty }: FirstUseOverlayProps) {
  return (
    <div
      className="absolute inset-0 z-[800] flex items-center"
      style={{
        background:
          "linear-gradient(90deg, rgb(247 245 241 / 0.96) 0%, rgb(247 245 241 / 0.90) 42%, rgb(247 245 241 / 0.28) 100%)",
      }}
    >
      <div className="ml-[7vw] flex max-w-[520px] flex-col gap-4">
        <span className="text-label font-medium tracking-[0.09em] text-ink-3 uppercase">
          HomeGround
        </span>

        <h2 className="m-0 text-hero leading-[1.08] font-semibold tracking-[-0.03em]">
          Find somewhere worth living.
        </h2>

        <p className="m-0 max-w-[440px] text-[15.5px] leading-[1.6] text-ink-2">
          Save a property and HomeGround will help you understand its wildfire context, healthcare
          access and everyday remoteness.
        </p>

        <div>
          <button
            type="button"
            onClick={onAddProperty}
            className="h-[38px] rounded-sharp bg-ink px-4 text-caption text-surface"
          >
            Add your first property
          </button>
        </div>

        <p className="m-0 max-w-[420px] text-body text-ink-3">
          You find houses wherever you like. This is where you work out whether their locations suit
          the life you want — evidence and trade-offs, never a verdict on safety.
        </p>
      </div>
    </div>
  );
}
