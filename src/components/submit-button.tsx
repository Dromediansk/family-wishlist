"use client";

import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";

/**
 * The submit button of a plain `<form action={serverAction}>`, with the app's
 * busy state. `useFormStatus` only reads the form this renders inside, which is
 * what lets it stay a client component the size of one hook while the page
 * around it does not have to be one.
 *
 * The form still posts without JavaScript — this only adds the spinner once the
 * component has hydrated.
 */
export function SubmitButton(props: React.ComponentProps<typeof Button>) {
  const { pending } = useFormStatus();

  return <Button type="submit" loading={pending} {...props} />;
}
