"use client";

import { useState, useTransition } from "react";
import {
  CheckIcon,
  ShieldIcon,
  Trash2Icon,
  UserRoundIcon,
  XIcon,
} from "lucide-react";

import {
  approveMember,
  rejectMember,
  removeMember,
  renameMember,
  setMemberRole,
} from "@/app/actions/members";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { wishCount } from "@/lib/utils";
import type {
  ActionResult,
  MemberAccount,
  MemberWithCount,
} from "@/lib/types";

/**
 * One transition drives every control in the list, so the key is what says
 * *which* button was pressed and therefore which one spins. `verb:id`.
 */
type Run = (
  key: string,
  action: () => Promise<ActionResult>,
  onSuccess?: () => void,
) => void;

/** Admin-only. The body of /family, which is what guards it. */
export function ManageMembers({
  members,
  accounts,
}: {
  members: MemberWithCount[];
  accounts: MemberAccount[];
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  /*
   * Never cleared: once `pending` falls back to false a stale key stops
   * mattering, and clearing it inside the transition would take the spinner
   * away while the button was still disabled.
   */
  const [running, setRunning] = useState<string | null>(null);

  const waiting = accounts.filter((account) => account.status === "pending");

  const run: Run = (key, action, onSuccess) => {
    setError(null);
    setRunning(key);
    startTransition(async () => {
      const result = await action();
      if (!result.ok) setError(result.error);
      else onSuccess?.();
    });
  };

  /** The one button that is working, out of the many that are held. */
  const isRunning = (key: string) => pending && running === key;

  return (
    <div className="flex flex-col gap-4">
      {waiting.length > 0 ? (
        <section className="border-primary/40 bg-primary/5 flex flex-col gap-3 rounded-md border p-3">
          <div>
            <h3 className="text-lg font-semibold">Čakajú na schválenie</h3>
            <p className="text-muted-foreground max-w-[62ch] text-sm">
              Prihlásili sa cez Google, ale zatiaľ nič nevidia. Skontroluj
              e-mail — prihlásiť sa môže ktokoľvek, kto pozná adresu tejto
              stránky.
            </p>
          </div>
          <ul className="flex flex-col gap-2">
            {waiting.map((account) => (
              <li key={account.id} className="flex items-center gap-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{account.name}</p>
                  <p className="text-muted-foreground truncate text-sm">
                    {account.email ?? "bez e-mailu"}
                  </p>
                </div>
                <Button
                  disabled={pending}
                  loading={isRunning(`approve:${account.id}`)}
                  onClick={() =>
                    run(`approve:${account.id}`, () =>
                      approveMember(account.id),
                    )
                  }
                >
                  <CheckIcon />
                  Pustiť dnu
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground hover:text-destructive"
                  aria-label={`Zamietnuť ${account.name}`}
                  disabled={pending}
                  loading={isRunning(`reject:${account.id}`)}
                  onClick={() =>
                    run(`reject:${account.id}`, () => rejectMember(account.id))
                  }
                >
                  <XIcon />
                </Button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <ul className="divide-y border-t">
        {members.map((member) => (
          <MemberAdminRow
            key={member.id}
            member={member}
            email={
              accounts.find((account) => account.id === member.id)?.email ?? null
            }
            pending={pending}
            isRunning={isRunning}
            run={run}
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
  member,
  email,
  pending,
  isRunning,
  run,
}: {
  member: MemberWithCount;
  email: string | null;
  pending: boolean;
  isRunning: (key: string) => boolean;
  run: Run;
}) {
  const [name, setName] = useState(member.name);
  const [confirmingRemove, setConfirmingRemove] = useState(false);

  const renamed = name.trim() !== member.name && name.trim() !== "";

  // Below sm: the role button is its icon alone, so this carries the name.
  const roleHint =
    member.role === "admin"
      ? "Zmeniť na bežného člena"
      : "Umožniť spravovať členov rodiny";

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
              disabled={pending}
              loading={isRunning(`rename:${member.id}`)}
              onClick={() =>
                run(`rename:${member.id}`, () => renameMember(member.id, name))
              }
            >
              Uložiť
            </Button>
          ) : null}
          <Button
            variant="outline"
            className="px-3 sm:px-5"
            disabled={pending}
            loading={isRunning(`role:${member.id}`)}
            title={roleHint}
            aria-label={roleHint}
            onClick={() =>
              run(`role:${member.id}`, () =>
                setMemberRole(
                  member.id,
                  member.role === "admin" ? "member" : "admin",
                ),
              )
            }
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

      {email ? (
        <p className="text-muted-foreground truncate text-sm">{email}</p>
      ) : null}

      {confirmingRemove ? (
        <div className="bg-muted flex flex-col gap-3 rounded-md p-4">
          <p>
            Odstrániť <strong>{member.name}</strong>? Vymažú sa aj všetky
            želania v tomto zozname ({wishCount(member.wishCount)}) a
            rezervácie, ktoré boli urobené v cudzích zoznamoch, sa uvoľnia.
            Prihlásiť sa môžu znova, ale budú čakať na schválenie.
          </p>
          <div className="flex gap-2">
            <Button
              variant="destructive"
              disabled={pending}
              loading={isRunning(`remove:${member.id}`)}
              onClick={() =>
                run(
                  `remove:${member.id}`,
                  () => removeMember(member.id),
                  () => setConfirmingRemove(false),
                )
              }
            >
              Odstrániť
            </Button>
            <Button variant="outline" onClick={() => setConfirmingRemove(false)}>
              Zrušiť
            </Button>
          </div>
        </div>
      ) : null}
    </li>
  );
}
