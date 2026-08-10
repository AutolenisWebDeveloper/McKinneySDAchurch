import { requireActor } from "@/auth/actor";
import { submitEvent } from "../actions";

export default async function NewEvent() {
  await requireActor("MINISTRY_HEAD", "ADMIN", "PASTOR");
  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-bold mb-4">New Event</h1>
      <form action={submitEvent} className="space-y-4">
        <div>
          <label htmlFor="title" className="block text-sm font-medium mb-1">Title</label>
          <input id="title" name="title" required maxLength={200} className="w-full rounded border border-black/20 dark:border-white/20 bg-transparent px-3 py-2" />
        </div>
        <div>
          <label htmlFor="location" className="block text-sm font-medium mb-1">Location</label>
          <input id="location" name="location" className="w-full rounded border border-black/20 dark:border-white/20 bg-transparent px-3 py-2" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="startAt" className="block text-sm font-medium mb-1">Start</label>
            <input id="startAt" name="startAt" type="datetime-local" required className="w-full rounded border border-black/20 dark:border-white/20 bg-transparent px-3 py-2" />
          </div>
          <div>
            <label htmlFor="endAt" className="block text-sm font-medium mb-1">End</label>
            <input id="endAt" name="endAt" type="datetime-local" required className="w-full rounded border border-black/20 dark:border-white/20 bg-transparent px-3 py-2" />
          </div>
        </div>
        <button type="submit" className="rounded bg-sda-navy text-white px-4 py-2">Submit for approval</button>
      </form>
    </div>
  );
}
