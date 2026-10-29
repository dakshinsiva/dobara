"use client";

import { buttonClass } from "@/components/ui";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto max-w-md py-20 text-center">
      <div className="text-xs font-medium uppercase tracking-wider text-faint">Something went wrong</div>
      <h1 className="mt-2 text-xl font-semibold">This page could not load</h1>
      <p className="mt-2 break-words text-sm text-muted">{error.message}</p>
      <button onClick={reset} className={buttonClass("primary", "md", "mt-6")}>
        Try again
      </button>
    </div>
  );
}
