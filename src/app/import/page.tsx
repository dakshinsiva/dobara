import { ImportForm } from "@/components/ImportForm";
import { ReorderForm } from "@/components/ReorderForm";
import { Card, PageHeader } from "@/components/ui";

export const metadata = { title: "Import" };

export default function ImportPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Import data"
        title="Bring in customers and orders"
        description="Two exports from the brand's order system are all Dobara needs: who bought what and when, and who has bought again since."
      />

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="space-y-6 lg:col-span-3">
          <Card
            title="Customers"
            description="CSV with name, phone, language (en, hi, kn, ta), cohort (new, running_low, lapsed), product, flavour, last_order_at (YYYY-MM-DD). Add a group column (called or control) to force assignment."
          >
            <ImportForm />
          </Card>
          <Card title="Record reorders" description="Paste the phone numbers of customers who placed a repeat order. Called and control customers are matched alike.">
            <ReorderForm />
          </Card>
        </div>

        <aside className="space-y-6 lg:col-span-2">
          <Card title="How the experiment works">
            <ol className="list-decimal space-y-2 pl-5 text-sm leading-6 text-muted">
              <li>Each phone number is hashed to a stable bucket, so a customer always lands in the same group, even across re-imports.</li>
              <li>The called group is dialled by cohort inside the 10:00 to 19:00 window. The control group is never called from this app.</li>
              <li>When the brand records reorders, both groups are matched by phone. The difference in reorder rate is the lift.</li>
            </ol>
          </Card>
          <Card title="Cohorts">
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="font-medium">New customer</dt>
                <dd className="text-muted">First order delivered 4 to 7 days ago. The agent shares one usage tip and listens for early problems.</dd>
              </div>
              <div>
                <dt className="font-medium">Running low</dt>
                <dd className="text-muted">About to run out. The agent asks how many days or scoops are left and offers the reorder link.</dd>
              </div>
              <div>
                <dt className="font-medium">Lapsed</dt>
                <dd className="text-muted">No order for 60 days or more. The agent asks what made them stop and records the reason.</dd>
              </div>
            </dl>
          </Card>
        </aside>
      </div>
    </div>
  );
}
