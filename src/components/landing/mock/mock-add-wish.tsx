import { CheckIcon } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { MockPanel } from "@/components/landing/mock/mock-card";
import { buttonVariants } from "@/components/ui/button";
import { BODY, FOOTER } from "@/components/ui/dialog-styles";
import {
  CHECKBOX,
  INPUT,
  LABEL,
  TEXTAREA,
} from "@/components/ui/field-styles";
import {
  MOCK_GROUPS,
  TICKED_MOCK_GROUPS,
  WRITTEN_MOCK_KEY,
} from "@/lib/landing";
import { cn } from "@/lib/utils";

/**
 * Beat one: the add-wish dialog, filled in, with two of three groups ticked.
 *
 * The beat's sentence promises that the list is yours and that you choose which
 * group sees it. A finished list showed neither, so this draws the moment the
 * sentence is about.
 *
 * It is a *picture* of `AddWishDialog` + `WishForm`, not those components: they
 * are client components, `DialogContent` renders into a portal over a
 * full-screen overlay so it cannot be drawn inline at all, and every real field
 * would be a tab stop in an illustration. What is shared instead is everything
 * that decides how it looks — the dialog's own body and footer regions from
 * `dialog-styles.ts` and the field classes from `field-styles.ts` — so a
 * restyled dialog restyles this with it.
 *
 * Three things the real dialog has are left out. The beat's prose is three
 * lines, and a card standing twice as tall as the words beside it reads as the
 * subject of the page rather than as its illustration:
 *
 * - **The header.** No loss beyond the height — "Pridať želanie" is already on
 *   the button, the beat's own heading says what the picture is about, and the
 *   dialog's subtitle explains a thing the reader has not done yet.
 * - **The link and photo fields.** Both optional in the real form.
 * - **The textarea's floor**, lowered to hug the note it holds.
 *
 * PRIVACY-RULE: no tag. Nothing here is read — the wish, the note and the group
 * names come from `src/lib/landing.ts` and the catalogues.
 */
export async function MockAddWish() {
  const t = await getTranslations("landing.mock");
  const tAdd = await getTranslations("wishes.add");
  const tForm = await getTranslations("wishes.form");
  const common = await getTranslations("common");

  return (
    <MockPanel>
      {/* `pt-6` stands in for the header the illustration does not draw: it is
          the same 24px the dialog's own `HEADER` puts above its title, so the
          first label does not sit on the card's edge.

          `overflow-visible overscroll-auto` drops the two `BODY` carries for
          the real dialog: a body that scrolls inside a height-capped panel, and
          an `overscroll-contain` that keeps a phone from rubber-banding the page
          behind it. This card has no cap, so the region would be a scroll
          container with nothing to scroll — and `overscroll-contain` refuses to
          pass the wheel on, stopping the whole page while the pointer rests on
          the picture. The axis-specific spelling will not do: tailwind-merge
          drops `overscroll-contain` for `overscroll-auto`, but keeps it beside
          `overscroll-y-auto`. */}
      <div
        className={cn(
          BODY,
          "flex flex-col gap-4 overflow-visible overscroll-auto pt-6",
        )}
      >
        <div className="flex flex-col gap-2">
          <p className={LABEL}>{tForm("title")}</p>
          {/* A div, not an `<input>`: a field is a tab stop, and a read-only one
              would still announce itself as somewhere to type. `items-center`
              is the one thing a div has to be told — a real input centres its
              own value in the box. */}
          <div className={cn(INPUT, "items-center")}>
            {t(`wishes.${WRITTEN_MOCK_KEY}`)}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <p className={LABEL}>
            {tForm("description")}{" "}
            <span className="text-muted-foreground">{common("optional")}</span>
          </p>
          {/* A lower floor than the real field's `min-h-28`: a textarea keeps
              room for what has not been typed yet, and an illustration has
              nothing left to type. */}
          <div className={cn(TEXTAREA, "min-h-0")}>{t("wishNote")}</div>
        </div>

        <div className="flex flex-col gap-2">
          <p className={LABEL}>{tForm("visibleInGroups")}</p>
          {/* The real picker's grid, down to the two columns at every width. */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-2">
            {MOCK_GROUPS.map((key) => {
              const ticked = TICKED_MOCK_GROUPS.includes(key);
              return (
                /* A span, not a `<label>`: there is no control to label. */
                <span key={key} className="flex items-start gap-2 text-base">
                  {/* The one piece that stands in rather than reuses: the real
                      box is a native checkbox coloured by `accent-primary`,
                      which does nothing to anything else, so a tick has to be
                      drawn. Only the geometry is shared. */}
                  <span
                    className={cn(
                      CHECKBOX,
                      "flex items-center justify-center rounded-[0.25rem]",
                      ticked
                        ? "bg-primary text-primary-foreground"
                        : "border-input bg-background border",
                    )}
                  >
                    {ticked ? (
                      <CheckIcon className="size-3.5" strokeWidth={3} />
                    ) : null}
                  </span>
                  <span className="min-w-0 break-words">
                    {t(`groups.${key}`)}
                  </span>
                </span>
              );
            })}
          </div>
        </div>
      </div>

      <div className={FOOTER}>
        {/* A span wearing the button's classes, the same stand-in `MockList`
            uses for its claim action. */}
        <span
          className={cn(
            buttonVariants({ size: "lg" }),
            "pointer-events-none w-full sm:w-auto",
          )}
        >
          {tAdd("action")}
        </span>
      </div>
    </MockPanel>
  );
}
