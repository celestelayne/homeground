const AMOUNT = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 });

/** Missing stays missing: a property with no price shows no price. */
export function formatPrice(askingPrice: number | null): string | null {
  return askingPrice === null ? null : `\u20AC${AMOUNT.format(askingPrice)}`;
}

export function formatCoordinates(latitude: number, longitude: number): string {
  return `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
}
