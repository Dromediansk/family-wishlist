"use client";

import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";

/**
 * The submit button of a plain `<form action={serverAction}>`. `useFormStatus`
 * reads only the form this renders inside, which is what lets the busy state be
 * a client component the size of one hook while the page around it stays a
 * Server Component. The form still posts without JavaScript; this only adds the
 * spinner once hydrated.
 */
export function SubmitButton(
  props: Omit<React.ComponentProps<typeof Button>, "loading" | "asChild">,
) {
  const { pending } = useFormStatus();

  // Spread first: the two props this component exists to set are not the call
  // site's to override.
  return <Button {...props} type="submit" loading={pending} />;
}
