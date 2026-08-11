import { fieldClass, labelClass } from "@/components/page-ui";

export type EventFormValues = {
  title?: string;
  location?: string | null;
  descriptionHtml?: string | null;
  startWall?: string;
  endWall?: string;
  ministryId?: string;
  isFeatured?: boolean;
};

/**
 * Shared create/edit form for a church event. Times are entered as local
 * (Central) wall-clock and converted server-side in the action.
 */
export function EventForm({
  action,
  ministries,
  values = {},
  submitLabel,
  hiddenId,
}: {
  action: (formData: FormData) => Promise<void>;
  ministries: { id: string; name: string }[];
  values?: EventFormValues;
  submitLabel: string;
  hiddenId?: string;
}) {
  return (
    <form action={action} className="space-y-4">
      {hiddenId ? <input type="hidden" name="id" value={hiddenId} /> : null}

      <div>
        <label htmlFor="title" className={labelClass}>Event title</label>
        <input id="title" name="title" required maxLength={200} defaultValue={values.title ?? ""} className={`mt-1 ${fieldClass}`} placeholder="e.g. Community Health Fair" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="startAt" className={labelClass}>Starts</label>
          <input id="startAt" name="startAt" type="datetime-local" required defaultValue={values.startWall ?? ""} className={`mt-1 ${fieldClass}`} />
        </div>
        <div>
          <label htmlFor="endAt" className={labelClass}>Ends</label>
          <input id="endAt" name="endAt" type="datetime-local" required defaultValue={values.endWall ?? ""} className={`mt-1 ${fieldClass}`} />
        </div>
      </div>
      <p className="-mt-2 text-xs text-muted">Times are Central (church local time).</p>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="location" className={labelClass}>Location</label>
          <input id="location" name="location" maxLength={200} defaultValue={values.location ?? ""} className={`mt-1 ${fieldClass}`} placeholder="e.g. Fellowship Hall" />
        </div>
        <div>
          <label htmlFor="ministryId" className={labelClass}>Department</label>
          <select id="ministryId" name="ministryId" required defaultValue={values.ministryId ?? ""} className={`mt-1 ${fieldClass}`}>
            <option value="">Select a department…</option>
            {ministries.map((m) => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="descriptionHtml" className={labelClass}>Description <span className="font-normal text-muted">(optional)</span></label>
        <textarea id="descriptionHtml" name="descriptionHtml" rows={4} maxLength={8000} defaultValue={values.descriptionHtml ?? ""} className={`mt-1 ${fieldClass}`} placeholder="What's happening, who it's for, what to bring…" />
      </div>

      <label className="flex items-center gap-2.5 text-sm text-fg">
        <input type="checkbox" name="isFeatured" defaultChecked={values.isFeatured ?? false} className="h-4 w-4 rounded border-line-strong text-primary focus:ring-ring/30" />
        Feature this event (highlight it on the site)
      </label>

      <button type="submit" className="btn btn-primary">{submitLabel}</button>
    </form>
  );
}
