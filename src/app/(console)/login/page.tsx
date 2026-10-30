import { PhoneCall } from "lucide-react";
import { buttonClass } from "@/components/ui";
import { optionalEnv } from "@/lib/env";

export const metadata = { title: "Sign in" };

export default async function LoginPage(props: { searchParams: Promise<{ back?: string; error?: string }> }) {
  const { back, error } = await props.searchParams;
  const brand = optionalEnv("BRAND_NAME", "Cosmix");

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-sm flex-col justify-center">
      <div className="rounded-xl border border-line bg-surface p-6 shadow-card">
        <div className="mb-5 flex items-center gap-2.5">
          <span className="grid size-8 place-items-center rounded-lg bg-accent text-accent-fg">
            <PhoneCall className="size-4" aria-hidden />
          </span>
          <div>
            <div className="text-base font-semibold">Dobara</div>
            <div className="text-xs text-muted">{brand} retention workspace</div>
          </div>
        </div>
        <form method="post" action="/api/login" className="space-y-3">
          <input type="hidden" name="back" value={back ?? "/overview"} />
          <label className="block text-sm">
            <span className="text-muted">Workspace password</span>
            <input
              name="password"
              type="password"
              autoFocus
              autoComplete="current-password"
              className="mt-1 h-10 w-full rounded-lg border border-line bg-canvas px-3 text-sm focus:outline-2 focus:outline-offset-1 focus:outline-accent"
            />
          </label>
          {error && <p className="text-sm text-danger-fg">That password did not match.</p>}
          <button type="submit" className={buttonClass("primary", "md", "w-full")}>
            Enter
          </button>
        </form>
      </div>
    </div>
  );
}
