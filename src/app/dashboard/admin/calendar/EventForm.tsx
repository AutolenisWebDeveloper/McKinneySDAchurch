import { TextField, TextareaField, SelectField, CheckboxField, FormRow, SubmitButton } from "@/components/forms";

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

      <TextField label="Event title" name="title" required maxLength={200} defaultValue={values.title ?? ""} placeholder="e.g. Community Health Fair" />

      <FormRow>
        <TextField label="Starts" name="startAt" type="datetime-local" required defaultValue={values.startWall ?? ""} />
        <TextField label="Ends" name="endAt" type="datetime-local" required defaultValue={values.endWall ?? ""} />
      </FormRow>
      <p className="-mt-2 text-xs text-muted">Times are Central (church local time).</p>

      <FormRow>
        <TextField label="Location" name="location" optional maxLength={200} defaultValue={values.location ?? ""} placeholder="e.g. Fellowship Hall" />
        <SelectField label="Department" name="ministryId" required defaultValue={values.ministryId ?? ""}>
          <option value="">Select a department…</option>
          {ministries.map((m) => (
            <option key={m.id} value={m.id}>{m.name}</option>
          ))}
        </SelectField>
      </FormRow>

      <TextareaField label="Description" name="descriptionHtml" optional rows={4} maxLength={8000} defaultValue={values.descriptionHtml ?? ""} placeholder="What's happening, who it's for, what to bring…" />

      <CheckboxField label="Feature this event (highlight it on the site)" name="isFeatured" defaultChecked={values.isFeatured ?? false} />

      <SubmitButton pendingLabel="Saving…">{submitLabel}</SubmitButton>
    </form>
  );
}
