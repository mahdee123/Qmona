"use client";

import { useEffect } from "react";
import { Button, ButtonLink } from "@/components/ui/button";

export default function PublicError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <section className="container-q flex flex-1 flex-col items-center justify-center py-28 text-center" role="alert">
      <p className="text-[0.9375rem] font-medium text-accent">Temporary problem</p>
      <h1 className="t-h1 mt-4">Something went wrong.</h1>
      <p className="t-lead mt-5 max-w-lg">This page could not be loaded right now. Please try again in a moment.</p>
      {error.digest && <p className="t-small mt-3">Reference: {error.digest}</p>}
      <div className="mt-10 flex flex-col gap-4 tablet:flex-row">
        <Button onClick={reset} arrow>Try again</Button>
        <ButtonLink href="/" variant="secondary">Back to home</ButtonLink>
      </div>
    </section>
  );
}
