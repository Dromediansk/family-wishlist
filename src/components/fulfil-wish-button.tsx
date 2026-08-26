"use client";

import { PackageCheckIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { fulfilWish } from "@/app/actions/wishes";
import { ConfirmActionDialog } from "@/components/confirm-action-dialog";
import { Button } from "@/components/ui/button";

/**
 * Hand-over, one way. This is the only control in the app that ends a secret:
 * it deletes the wish from its owner's list and writes a record naming the
 * giver to them. docs/decisions/privacy-rule.md#when-the-secret-ends
 *
 * The second sentence of the description is the whole safety mechanism — the
 * only place the buyer is told that pressing this reveals them — so it says so
 * plainly rather than politely.
 */
export function FulfilWishButton({
  wishId,
  title,
  ownerName,
}: {
  wishId: string;
  title: string;
  ownerName: string;
}) {
  const t = useTranslations("wishes.fulfil");
  return (
    <ConfirmActionDialog
      trigger={
        <Button variant="outline">
          <PackageCheckIcon />
          {t("action")}
        </Button>
      }
      question={t("question", { title })}
      refusedTitle={t("refusedTitle", { title })}
      description={t("description", { name: ownerName })}
      confirmLabel={t("action")}
      cancelLabel={t("cancel")}
      action={() => fulfilWish(wishId)}
    />
  );
}
