import Link from "next/link";
import { requireActor } from "@/auth/actor";
import { prisma } from "@/lib/db";
import { PortalPage, PortalSection } from "@/components/portal/home-ui";
import { Notice } from "@/components/portal/fundraiser-ui";
import { saveAsset, toggleAsset } from "../fundraisers/actions";

export const dynamic = "force-dynamic";

const field = "w-full rounded-lg border border-line bg-surface px-3 py-2 text-fg placeholder:text-muted";
const label = "block text-sm font-semibold text-fg";

/**
 * The share content library (§16). Fundraiser owners pick their wording and graphics from this
 * list, so what goes out under the church's name is what the church actually approved —
 * the app never generates marketing copy on a member's behalf.
 */
export default async function FundraisingLibrary({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  await requireActor("ADMIN", "PASTOR");
  const { error, saved } = await searchParams;

  const assets = await prisma.fundraisingAsset.findMany({
    orderBy: [{ kind: "asc" }, { sortOrder: "asc" }, { createdAt: "asc" }],
  });
  const messages = assets.filter((a) => a.kind === "MESSAGE");
  const graphics = assets.filter((a) => a.kind === "GRAPHIC");

  return (
    <PortalPage
      title="Share content library"
      intro="Approved wording and campaign graphics offered to fundraiser owners in their Share tab."
    >
      {error && <div role="alert"><Notice tone="attention" title="That didn't save">{error}</Notice></div>}
      {saved && <Notice tone="quiet" title="Saved">Fundraiser owners will see it in their Share tab.</Notice>}

      <PortalSection title={`Approved messages (${messages.length})`}>
        {messages.length ? (
          <ul className="space-y-2">
            {messages.map((m) => (
              <li key={m.id} className="card flex flex-wrap items-start justify-between gap-3 p-4">
                <div className="min-w-0">
                  <p className="font-semibold text-fg">{m.title}</p>
                  <p className="mt-1 text-sm text-muted">{m.body}</p>
                </div>
                <ToggleForm id={m.id} active={m.active} />
              </li>
            ))}
          </ul>
        ) : (
          <div className="card p-6 text-center">
            <p className="font-medium text-fg">No approved messages yet</p>
            <p className="mt-1 text-sm text-muted">
              Until you add some, owners write their own words — which works, but a couple of good options helps.
            </p>
          </div>
        )}
      </PortalSection>

      <PortalSection title={`Campaign graphics (${graphics.length})`}>
        {graphics.length ? (
          <ul className="grid gap-3 sm:grid-cols-2">
            {graphics.map((g) => (
              <li key={g.id} className="card p-4">
                {g.imageUrl ? (
                  // Plain <img>: the source is an admin-supplied campaign asset on an arbitrary host.
                  <img src={g.imageUrl} alt={g.title} className="w-full rounded" loading="lazy" />
                ) : (
                  // A graphic saved without an address would render as a broken box, and owners
                  // are never offered it — say so here so an admin can fix or remove it.
                  <p className="rounded border border-dashed border-line-strong p-4 text-sm text-muted">
                    No image address on this graphic, so it isn&rsquo;t offered to fundraiser owners.
                  </p>
                )}
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold text-fg">{g.title}</p>
                  <ToggleForm id={g.id} active={g.active} />
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="card p-6 text-center">
            <p className="font-medium text-fg">No campaign graphics yet</p>
            <p className="mt-1 text-sm text-muted">Add the address of an image that&rsquo;s already hosted for the campaign.</p>
          </div>
        )}
      </PortalSection>

      <PortalSection title="Add to the library">
        <form action={saveAsset} className="card max-w-2xl space-y-4 p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={label} htmlFor="kind">Type</label>
              <select id="kind" name="kind" className={`${field} mt-1`}>
                <option value="MESSAGE">Message</option>
                <option value="GRAPHIC">Graphic</option>
              </select>
            </div>
            <div>
              <label className={label} htmlFor="sortOrder">Order</label>
              <input id="sortOrder" name="sortOrder" type="number" min={0} max={999} defaultValue={0} className={`${field} mt-1`} />
            </div>
          </div>
          <div>
            <label className={label} htmlFor="title">Name</label>
            <input id="title" name="title" type="text" required maxLength={160} placeholder="e.g. Short text message" className={`${field} mt-1`} />
          </div>
          <div>
            <label className={label} htmlFor="body">Message wording</label>
            <textarea id="body" name="body" rows={3} maxLength={1000} placeholder="Our church is building a permanent home. Would you help?" className={`${field} mt-1`} />
            <p className="mt-1 text-xs text-muted">Required for a message. The owner&rsquo;s own link is appended automatically when they copy it.</p>
          </div>
          <div>
            <label className={label} htmlFor="imageUrl">Image address</label>
            <input id="imageUrl" name="imageUrl" type="url" maxLength={500} placeholder="https://…" className={`${field} mt-1`} />
            <p className="mt-1 text-xs text-muted">Required for a graphic.</p>
          </div>
          <button type="submit" className="btn btn-accent">Add to library</button>
        </form>
      </PortalSection>

      <p className="text-sm text-muted">
        <Link href="/dashboard/admin/construction/fundraisers" className="font-semibold text-primary hover:text-primary-hover">
          ← Back to Building Project fundraisers
        </Link>
      </p>
    </PortalPage>
  );
}

function ToggleForm({ id, active }: { id: string; active: boolean }) {
  return (
    <form action={toggleAsset} className="shrink-0">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="active" value={active ? "false" : "true"} />
      <button className="btn btn-outline px-3 py-1.5 text-sm">
        {active ? "Hide from owners" : "Offer to owners"}
      </button>
    </form>
  );
}
