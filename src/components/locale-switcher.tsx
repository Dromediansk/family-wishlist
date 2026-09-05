import { getLocale } from "next-intl/server";

import { setLocale } from "@/app/actions/locale";
import { LOCALE_FLAGS } from "@/components/flag-icons";
import { SubmitButton } from "@/components/submit-button";
import { LOCALE_LABELS, otherLocale } from "@/i18n/config";

/**
 * The language switch for somebody with no account to hang it off. The header's
 * right-hand half when nobody is signed in, which is the only chrome a stranger
 * gets — and the reason `setLocale` was built to need no caller.
 *
 * The same offer as the avatar menu's item in `account-menu.tsx`, in the shape a
 * menu cannot use: there the form must be mounted outside `DropdownMenu` and
 * reached by id, because Radix unmounts menu content on select. Everything that
 * could drift between the two — the label, the flag, the "other language" rule —
 * is shared. docs/decisions/ui-patterns.md#language
 */
export async function LocaleSwitcher() {
  const other = otherLocale(await getLocale());
  const Flag = LOCALE_FLAGS[other];

  return (
    <form action={setLocale.bind(null, other)}>
      {/*
       * `lang` because the label is deliberately written in the language it
       * selects while the document says the other — without it a screen reader
       * reads "Použiť slovenčinu" in an English voice. The flags are decorative,
       * so that label is also the button's only accessible name: it cannot be
       * hidden on narrow screens the way the header's other labels are.
       */}
      <SubmitButton variant="ghost" size="sm" lang={other}>
        <Flag />
        {LOCALE_LABELS[other]}
      </SubmitButton>
    </form>
  );
}
