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
 */

/**
 * A value the operator supplies, and the one line that stands in for it until
 * they do.
 *
 * The hint does double duty: it is the description you read while filling this
 * file in, and it is the placeholder shown on the page. One string, so the
 * instruction on screen can never disagree with the one in the editor.
 */
export type LegalDetail = {
  hint: string;
  value: string;
};

export const LEGAL_DETAILS = {
  /** Both pages carry it under the heading. */
  effectiveFrom: {
    hint: "dátum účinnosti, napríklad „1. septembra 2026“",
    value: "24. augusta 2026",
  },

  /** The data controller. A person's name is fine; this is a side project. */
  operatorName: {
    hint: "meno alebo obchodný názov prevádzkovateľa",
    value: "Miroslav Pillár",
  },

  operatorAddress: {
    hint: "poštová adresa prevádzkovateľa",
    value: "Košice, Slovensko",
  },

  /**
   * Quoted three times, and the one value that has to be real: it is the only
   * route to erasure, since nothing in the app deletes an account, and Google's
   * OAuth review checks that it is reachable.
   */
  contactEmail: {
    hint: "e-mail, na ktorom prevádzkovateľ naozaj odpovedá",
    value: "pillar.mr@gmail.com",
  },

  /** Where Vercel and Supabase actually hold the data, and — if that is outside
   *  the EU — what makes the transfer lawful. */
  hostingRegion: {
    hint: "región serverov a základ prenosu údajov mimo EÚ",
    value: "Ireland, EU",
  },

  /** Terms only, under governing law. */
  courtVenue: {
    hint: "mesto, ktorého súdy sú príslušné na spory",
    value: "Košice",
  },
} satisfies Record<string, LegalDetail>;

/**
 * Which details are still waiting for a value. Nothing calls this in the app —
 * the red gap on the page is the working signal — but it keeps the "empty means
 * unfilled" rule in one testable place instead of spread across the components.
 */
export function missingLegalDetails(
  details: Record<string, LegalDetail> = LEGAL_DETAILS,
): string[] {
  return Object.entries(details)
    .filter(([, detail]) => detail.value.trim() === "")
    .map(([key]) => key);
}
