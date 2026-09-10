/**
 * The details the two legal pages need from whoever runs the app — the only
 * thing here that a domain owner rather than a programmer has to fill in.
 *
 * One file, because these values are quoted in more places than they look: the
 * contact address appears three times across the two pages, the operator's name
 * and address twice each. Filling each site by hand is how one of them stays
 * wrong.
 *
 * Every value starts empty on purpose. An empty one renders as a loud red gap
 * on the page — `Detail` in `src/components/legal-page.tsx` — so an unfinished
 * policy is hard to publish without noticing.
 *
 * What each one *is* used to live here too, as a `hint`. It is a sentence a
 * reader can see, so it moved to `legal.hints.*` in the message catalogues when
 * the app gained a second language; the key here is what ties the two together.
 */

export const LEGAL_DETAILS = {
  /**
   * Both pages carry it under the heading. An ISO date rather than prose: it is
   * the one detail here that is *read* rather than named, so `formatDate` writes
   * it the way each language does — every other value is a proper noun and the
   * same in both.
   */
  effectiveFrom: "2026-08-24",

  /** The data controller — the company that runs the app. */
  operatorName: "Bitloom",

  operatorAddress: "Košice, Slovakia",

  /**
   * Quoted three times, and the one value that has to be real: it is the only
   * route to erasure, since nothing in the app deletes an account, and Google's
   * OAuth review checks that it is reachable.
   */
  contactEmail: "info@bitloom.sk",

  /**
   * Where Vercel and Supabase actually hold the data, and — if that is outside
   * the EU — what makes the transfer lawful.
   */
  hostingRegion: "Ireland, EU",

  /** Terms only, under governing law. */
  courtVenue: "Košice",
} satisfies Record<string, string>;

export type LegalDetailKey = keyof typeof LEGAL_DETAILS;

/**
 * Which details are still waiting for a value. Nothing calls this in the app —
 * the red gap on the page is the working signal — but it keeps the "empty means
 * unfilled" rule in one testable place instead of spread across the components.
 */
export function missingLegalDetails(
  details: Record<string, string> = LEGAL_DETAILS,
): string[] {
  return Object.entries(details)
    .filter(([, value]) => value.trim() === "")
    .map(([key]) => key);
}
