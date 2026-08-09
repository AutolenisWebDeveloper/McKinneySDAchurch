import { requireActor } from "@/auth/actor";
import { submitAnnouncement } from "../actions";

export default async function NewAnnouncement() {
  await requireActor("MINISTRY_HEAD", "ADMIN", "PASTOR");
  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-bold mb-4">New Announcement</h1>
      <form action={submitAnnouncement} className="space-y-4">
        <div>
          <label htmlFor="title" className="block text-sm font-medium mb-1">Title</label>
          <input id="title" name="title" required maxLength={200} className="w-full rounded border border-black/20 dark:border-white/20 bg-transparent px-3 py-2" />
        </div>
        <div>
          <label htmlFor="contentHtml" className="block text-sm font-medium mb-1">Content</label>
          <textarea id="contentHtml" name="contentHtml" required rows={6} className="w-full rounded border border-black/20 dark:border-white/20 bg-transparent px-3 py-2" />
          <p className="text-xs text-muted mt-1">Basic formatting only; content is sanitized on save.</p>
        </div>
        <button type="submit" className="rounded bg-sda-navy text-white px-4 py-2">Submit for approval</button>
      </form>
    </div>
  );
}
