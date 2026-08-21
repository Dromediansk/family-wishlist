"use client";

import { useState, useTransition } from "react";
import { ShieldIcon, Trash2Icon, UserRoundIcon } from "lucide-react";

import {
  removeMember,
  renameMember,
  setMemberRole,
} from "@/app/actions/members";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { GroupId } from "@/lib/ids";
import { wishCount } from "@/lib/utils";
import type { ActionResult, MemberWithCount } from "@/lib/types";

/**
 * One transition drives every control in the list, so a `verb:id` key is what
 * says *which* button was pressed and therefore which one spins; its siblings
 * are held and silent. Handing back the button's props is what keeps the key
 * from being written twice — spelling it once for the spinner and once for the
 * action would type-check either way and quietly leave a button that never
 * spins.
 */
type Busy = (
  key: string,
  action: () => Promise<ActionResult>,
  onSuccess?: () => void,
) => { disabled: boolean; loading: boolean; onClick: () => void };

/** Admin-only. The body of /family, which is what guards it. */
export function ManageMembers({
  groupId,
  members,
}: {
  groupId: GroupId;
  members: MemberWithCount[];
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  /*
   * Never cleared: a stale key stops mattering once `pending` is false again,
   * and clearing it inside the transition would take the spinner away while the
   * button was still disabled.
   */
  const [running, setRunning] = useState<string | null>(null);

  const busy: Busy = (key, action, onSuccess) => ({
    disabled: pending,
    loading: pending && running === key,
    onClick: () => {
      setError(null);
      setRunning(key);
      startTransition(async () => {
        const result = await action();
        if (!result.ok) setError(result.error);
        else onSuccess?.();
      });
    },
  });

  return (
    <div className="flex flex-col gap-4">
      <ul className="divide-y border-t">
        {members.map((member) => (
          <MemberAdminRow
            key={member.id}
            groupId={groupId}
            member={member}
            pending={pending}
            busy={busy}
          />
        ))}
      </ul>

      {error ? (
        <p className="text-destructive text-sm" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function MemberAdminRow({
  groupId,
  member,
  pending,
  busy,
}: {
  groupId: GroupId;
  member: MemberWithCount;
  /** Held by somebody else's action — the trash toggle runs none of its own. */
  pending: boolean;
  busy: Busy;
}) {
  const [name, setName] = useState(member.name);
  const [confirmingRemove, setConfirmingRemove] = useState(false);

  const renamed = name.trim() !== member.name && name.trim() !== "";

  // Below sm: the role button is its icon alone, so this carries the name.
  const roleHint =
    member.role === "admin"
      ? "Zmeniť na bežného člena"
      : "Umožniť spravovať členov skupiny";

  return (
    <li className="flex flex-col gap-2 py-4">
      {/* The name field is three quarters of the row at every width and the two
          controls share the rest — the role button is its icon alone below sm:,
          which is what lets them fit a quarter of a phone. Nothing wraps:
          `min-w-0` beats an input's ~20-character intrinsic minimum, so the
          field is what yields the few pixels the two 44px targets need on a
          narrow phone, and the wider yield when `Uložiť` appears mid-rename. */}
      <div className="flex items-center gap-2">
        <Input
          className="w-3/4 min-w-0"
          value={name}
          onChange={(event) => setName(event.target.value)}
          maxLength={50}
          aria-label={`Meno pre ${member.name}`}
        />
        <div className="flex flex-1 items-center justify-end gap-2">
          {renamed ? (
            <Button
              {...busy(`rename:${member.id}`, () =>
                renameMember(groupId, member.id, name),
              )}
            >
              Uložiť
            </Button>
          ) : null}
          <Button
            variant="outline"
            className="px-3 sm:px-5"
            title={roleHint}
            aria-label={roleHint}
            {...busy(`role:${member.id}`, () =>
              setMemberRole(
                groupId,
                member.id,
                member.role === "admin" ? "member" : "admin",
              ),
            )}
          >
            {member.role === "admin" ? <ShieldIcon /> : <UserRoundIcon />}
            <span className="hidden sm:inline">
              {member.role === "admin" ? "Správca" : "Člen"}
            </span>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-destructive"
            aria-label={`Odstrániť ${member.name}`}
            disabled={pending}
            onClick={() => setConfirmingRemove((previous) => !previous)}
          >
            <Trash2Icon />
          </Button>
        </div>
      </div>

      {confirmingRemove ? (
        <div className="bg-muted flex flex-col gap-3 rounded-md p-4">
          <p>
            Odstrániť <strong>{member.name}</strong> zo skupiny? Ich zoznam (
            {wishCount(member.wishCount)}) im zostane. Rezervácie, ktoré
            existovali len vďaka členstvu v tejto skupine sa uvoľnia. Vrátiť sa
            môžu len cez novú pozvánku.
          </p>
          <div className="flex gap-2">
            <Button
              variant="destructive"
              {...busy(
                `remove:${member.id}`,
                () => removeMember(groupId, member.id),
                () => setConfirmingRemove(false),
              )}
            >
              Odstrániť
            </Button>
            <Button
              variant="outline"
              onClick={() => setConfirmingRemove(false)}
            >
              Zrušiť
            </Button>
          </div>
        </div>
      ) : null}
    </li>
  );
}
