"use client";

import { useState, useTransition } from "react";
import { PlusIcon, SettingsIcon, ShieldIcon, Trash2Icon, UserRoundIcon } from "lucide-react";

import {
  addMember,
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
import { Label } from "@/components/ui/label";
import { wishCount } from "@/lib/utils";
import type { ActionResult, MemberWithCount } from "@/lib/types";

/** Admin-only. Rendered by the home page only when the current member is admin. */
export function ManageMembers({ members }: { members: MemberWithCount[] }) {
  const [open, setOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function run(action: () => Promise<ActionResult>, onSuccess?: () => void) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (!result.ok) setError(result.error);
      else onSuccess?.();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <SettingsIcon />
          Spravovať rodinu
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85dvh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Správa členov rodiny</DialogTitle>
          <DialogDescription>
            Pridávaj ľudí, premenúvaj ich alebo meň, kto môže spravovať tento
            zoznam.
          </DialogDescription>
        </DialogHeader>

        <form
          className="flex flex-col gap-2 sm:flex-row sm:items-end"
          onSubmit={(event) => {
            event.preventDefault();
            run(() => addMember({ name: newName }), () => setNewName(""));
          }}
        >
          <div className="flex flex-1 flex-col gap-2">
            <Label htmlFor="new-member-name">Pridať člena</Label>
            <Input
              id="new-member-name"
              value={newName}
              onChange={(event) => setNewName(event.target.value)}
              placeholder="Meno"
              maxLength={50}
            />
          </div>
          <Button type="submit" disabled={pending || newName.trim() === ""}>
            <PlusIcon />
            Pridať
          </Button>
        </form>

        <ul className="divide-y border-t">
          {members.map((member) => (
            <MemberAdminRow
              key={member.id}
              member={member}
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
  pending,
  run,
}: {
  member: MemberWithCount;
  pending: boolean;
  run: (action: () => Promise<ActionResult>, onSuccess?: () => void) => void;
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

      {confirmingRemove ? (
        <div className="bg-muted flex flex-col gap-2 rounded-md p-3 text-sm">
          <p>
            Odstrániť <strong>{member.name}</strong>? Vymažú sa aj všetky
            želania v tomto zozname ({wishCount(member.wishCount)}) a
            rezervácie, ktoré boli urobené v cudzích zoznamoch, sa uvoľnia.
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
