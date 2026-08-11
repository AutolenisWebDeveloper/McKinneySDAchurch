import { requirePortal } from "@/auth/actor";
import { prisma } from "@/lib/db";
import { readPreferences, PREF_CATEGORIES } from "@/lib/preferences";
import { PortalPage, PortalSection, EmptyState } from "@/components/portal/home-ui";
import { Callout } from "@/components/page-ui";
import { savePreferencesAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function Preferences({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  const actor = await requirePortal("member");
  const { saved } = await searchParams;
  const user = await prisma.user.findUnique({ where: { id: actor.userId }, select: { email: true } });

  if (!user?.email) {
    return (
      <PortalPage title="Communication preferences" intro="Choose which church emails you'd like to receive.">
        <EmptyState title="No email on file" hint="Add an email to your profile to manage preferences." />
      </PortalPage>
    );
  }

  const current = await readPreferences(user.email);

  return (
    <PortalPage title="Communication preferences" intro="Choose which church emails you'd like to receive. You can change this any time.">
      {saved && <div className="rounded-lg border border-denim-200 bg-denim-50 px-4 py-3 text-sm text-denim-900">Your preferences were saved.</div>}
      <Callout tone="info" title="Good to know">
        These control optional church mailings. Important account and request emails are always sent.
        You can also unsubscribe from any marketing email using the link at its bottom.
      </Callout>

      <PortalSection title={`Preferences for ${user.email}`}>
        <form action={savePreferencesAction} className="card divide-y divide-line p-0">
          {PREF_CATEGORIES.map((c) => (
            <label key={c.type} className="flex items-start justify-between gap-4 px-5 py-4">
              <span>
                <span className="font-medium text-fg">{c.label}</span>
                <span className="mt-0.5 block text-sm text-muted">{c.description}</span>
              </span>
              <input type="checkbox" name={c.type} defaultChecked={current[c.type]} className="mt-1 h-5 w-5 shrink-0" />
            </label>
          ))}
          <div className="px-5 py-4">
            <button className="btn btn-primary">Save preferences</button>
          </div>
        </form>
      </PortalSection>
    </PortalPage>
  );
}
