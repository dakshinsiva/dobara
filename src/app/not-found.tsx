import { LinkButton } from "@/components/ui";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-md py-20 text-center">
      <div className="text-xs font-medium uppercase tracking-wider text-faint">404</div>
      <h1 className="mt-2 text-xl font-semibold">Nothing here</h1>
      <p className="mt-2 text-sm text-muted">The page or call you were looking for does not exist.</p>
      <div className="mt-6">
        <LinkButton href="/" variant="primary">
          Back to overview
        </LinkButton>
      </div>
    </div>
  );
}
