import type { PropertyStatus } from "../api/types.js";

/** The order the sidebar groups statuses in, per the design. */
export const STATUS_ORDER: PropertyStatus[] = ["shortlist", "visit", "saved", "rejected"];

/**
 * Presentation strings live in the client. The API returns language-neutral
 * identifiers, per the internationalization boundary in docs/architecture.md.
 */
export const STATUS_LABEL: Record<PropertyStatus, string> = {
  saved: "Saved",
  shortlist: "Shortlist",
  visit: "To visit",
  rejected: "Rejected",
};
