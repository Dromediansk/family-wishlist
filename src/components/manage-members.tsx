"use client";

import { useState, useTransition } from "react";
import {
  CheckIcon,
  SettingsIcon,
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { wishCount } from "@/lib/utils";
import type {
  ActionResult,
  MemberAccount,
  MemberWithCount,
} from "@/lib/types";

type Run = (
  action: () => Promise<ActionResult>,
  onSuccess?: () => void,
) => void;

/** Admin-only. Rendered by the home page only when the current member is admin. */
export function ManageMembers({
  members,
  accounts,
}: {
  members: MemberWithCount[];
  accounts: MemberAccount[];
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const waiting = accounts.filter((account) => account.status === "pending");

  const run: Run = (action, onSuccess) => {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (!result.ok) setError(result.error);
      else onSuccess?.();
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="relative">
          <SettingsIcon />
          Spravovať rodinu
          {waiting.length > 0 ? (
            <span
              className="bg-primary text-primary-foreground ml-1 rounded-full px-1.5 text-xs leading-5 font-semibold"
              aria-label={`${waiting.length} čaká na schválenie`}
            >
              {waiting.length}
            </span>
          ) : null}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85dvh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Správa členov rodiny</DialogTitle>
          <DialogDescription>
            Púšťaj dnu nových ľudí, premenúvaj ich alebo meň, kto môže spravovať
            tento zoznam.
          </DialogDescription>
        </DialogHeader>

        {waiting.length > 0 ? (
          <section className="border-primary/40 bg-primary/5 flex flex-col gap-3 rounded-md border p-3">
            <div>
              <h3 className="text-sm font-semibold">Čakajú na schválenie</h3>
              <p className="text-muted-foreground text-xs">
                Prihlásili sa cez Google, ale zatiaľ nič nevidia. Skontroluj
                e-mail — prihlásiť sa môže ktokoľvek, kto pozná adresu tejto
                stránky.
              </p>
            </div>
            <ul className="flex flex-col gap-2">
              {waiting.map((account) => (
                <li
                  key={account.id}
                  className="flex flex-wrap items-center gap-2"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {account.name}
                    </p>
                    <p className="text-muted-foreground truncate text-xs">
                      {account.email ?? "bez e-mailu"}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    disabled={pending}
                    onClick={() => run(() => approveMember(account.id))}
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
                    onClick={() => run(() => rejectMember(account.id))}
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
                accounts.find((account) => account.id === member.id)?.email ??
                null
              }
              pending={pending}
              run={run}
            />
          ))}
        </ul>

        {error ? (
          <p className="text-destructive text-sm" role="alert">
            {error}
          </p>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function MemberAdminRow({
  member,
  email,
  pending,
  run,
}: {
  member: MemberWithCount;
  email: string | null;
  pending: boolean;
  run: Run;
}) {
  const [name, setName] = useState(member.name);
  const [confirmingRemove, setConfirmingRemove] = useState(false);

  const renamed = name.trim() !== member.name && name.trim() !== "";

  return (
    <li className="flex flex-col gap-2 py-3">
      <div className="flex items-center gap-2">
        <Input
          value={name}
          onChange={(event) => setName(event.target.value)}
          maxLength={50}
          aria-label={`Meno pre ${member.name}`}
        />
        {renamed ? (
          <Button
            size="sm"
            disabled={pending}
            onClick={() => run(() => renameMember(member.id, name))}
          >
            Uložiť
          </Button>
        ) : null}
        <Button
          variant="outline"
          size="sm"
          disabled={pending}
          title={
            member.role === "admin"
              ? "Zmeniť na bežného člena"
              : "Umožniť spravovať členov rodiny"
          }
          onClick={() =>
            run(() =>
              setMemberRole(
                member.id,
                member.role === "admin" ? "member" : "admin",
              ),
            )
          }
        >
          {member.role === "admin" ? <ShieldIcon /> : <UserRoundIcon />}
          {member.role === "admin" ? "Správca" : "Člen"}
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

      {email ? (
        <p className="text-muted-foreground truncate text-xs">{email}</p>
      ) : null}

      {confirmingRemove ? (
        <div className="bg-muted flex flex-col gap-2 rounded-md p-3 text-sm">
          <p>
            Odstrániť <strong>{member.name}</strong>? Vymažú sa aj všetky
            želania v tomto zozname ({wishCount(member.wishCount)}) a
            rezervácie, ktoré boli urobené v cudzích zoznamoch, sa uvoľnia.
            Prihlásiť sa môžu znova, ale budú čakať na schválenie.
          </p>
          <div className="flex gap-2">
            <Button
              variant="destructive"
              size="sm"
              disabled={pending}
              onClick={() =>
                run(() => removeMember(member.id), () =>
                  setConfirmingRemove(false),
                )
              }
            >
              Odstrániť
            </Button>
            <Button
              variant="outline"
              size="sm"
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
