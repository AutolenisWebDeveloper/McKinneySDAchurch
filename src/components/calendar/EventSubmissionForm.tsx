"use client";

import { useId, useState } from "react";
import {
  TextField,
  TextareaField,
  SelectField,
  CheckboxField,
  FormRow,
  Fieldset,
} from "@/components/forms";
import { EVENT_CATEGORY_OPTIONS } from "@/lib/calendar";

/**
 * The premium, progressively-disclosed event submission experience used by department heads and
 * admins alike. It is organised into meaningful sections rather than one long wall of inputs, and
 * only reveals the fields relevant to the choices made (location type, registration, board
 * approval, media). Times are entered as Central wall-clock; the server converts + stores UTC.
 *
 * The department is NOT a free choice: when the actor heads a single department it is shown as a
 * read-only identity chip with a hidden input; the server re-resolves and re-authorises it either
 * way (a hidden input can never widen authorization — see src/lib/events.ts).
 */

export type EventFormValues = {
  title?: string;
  ministryId?: string;
  category?: string | null;
  summary?: string | null;
  descriptionHtml?: string | null;
  startWall?: string;
  endWall?: string;
  allDay?: boolean;
  locationType?: string;
  venueName?: string | null;
  addressLine1?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  onlineUrl?: string | null;
  locationInstructions?: string | null;
  contactName?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  contactPublic?: boolean;
  registrationRequired?: boolean;
  registrationUrl?: string | null;
  infoUrl?: string | null;
  ctaLabel?: string | null;
  registrationDeadlineWall?: string;
  capacity?: number | null;
  imageUrl?: string | null;
  imageAlt?: string | null;
  boardApprovalRequired?: boolean;
  boardApprovalState?: string | null;
  boardApprovalDateWall?: string;
  boardApprovalRef?: string | null;
  boardNoteInternal?: string | null;
};

export type DepartmentOption = { id: string; name: string };

export function EventSubmissionForm({
  action,
  departments,
  fixedDepartment,
  values = {},
  hiddenId,
  error,
  primaryLabel = "Save draft",
  secondaryLabel,
}: {
  action: (formData: FormData) => Promise<void>;
  /** All departments the actor may file under (used when they head several, or are an admin). */
  departments: DepartmentOption[];
  /** When the actor heads exactly one department, show it read-only. */
  fixedDepartment?: DepartmentOption;
  values?: EventFormValues;
  hiddenId?: string;
  error?: string;
  /** Label for the default (Save draft) submit button. */
  primaryLabel?: string;
  /** When provided, a second submit that sets intent="submit" (Save & submit for approval). */
  secondaryLabel?: string;
}) {
  const [locationType, setLocationType] = useState(values.locationType ?? "CHURCH");
  const [allDay, setAllDay] = useState(values.allDay ?? false);
  const [registration, setRegistration] = useState(values.registrationRequired ?? false);
  const [board, setBoard] = useState(values.boardApprovalRequired ?? false);
  const [imageUrl, setImageUrl] = useState(values.imageUrl ?? "");
  const errId = useId();

  const showVenue = locationType === "CHURCH" || locationType === "EXTERNAL" || locationType === "HYBRID";
  const showAddress = locationType === "EXTERNAL";
  const showOnline = locationType === "ONLINE" || locationType === "HYBRID";

  return (
    <form action={action} className="space-y-8">
      {hiddenId ? <input type="hidden" name="id" value={hiddenId} /> : null}

      {error ? (
        <p id={errId} role="alert" className="rounded-lg border border-accent-strong/40 bg-accent-strong/10 px-4 py-3 text-sm font-medium text-accent-strong">
          {error}
        </p>
      ) : null}

      {/* ---- Event basics ---- */}
      <Fieldset legend="Event basics" description="The essentials people will see first.">
        <TextField label="Event name" name="title" required maxLength={200} defaultValue={values.title ?? ""} placeholder="e.g. Community Health Fair" />

        {/* Department: read-only identity when single; a scoped select when several. */}
        {fixedDepartment ? (
          <div>
            <span className="mb-1 block text-sm font-medium text-fg">Department</span>
            <div className="flex items-center gap-2 rounded-lg border border-line bg-surface-2 px-3 py-2.5">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-denim-700 text-[0.7rem] font-bold text-white" aria-hidden="true">
                {fixedDepartment.name.charAt(0)}
              </span>
              <span className="font-medium text-fg">{fixedDepartment.name}</span>
              <span className="ml-auto text-xs text-muted">Submitting for your department</span>
            </div>
            <input type="hidden" name="ministryId" value={fixedDepartment.id} />
          </div>
        ) : (
          <SelectField label="Department" name="ministryId" required defaultValue={values.ministryId ?? ""} hint="You can only file events for a department you lead.">
            <option value="">Select a department…</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </SelectField>
        )}

        <FormRow>
          <SelectField label="Category" name="category" defaultValue={values.category ?? ""} optional>
            <option value="">Choose a category…</option>
            {EVENT_CATEGORY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </SelectField>
          <div />
        </FormRow>

        <TextField label="Short description" name="summary" optional maxLength={300} defaultValue={values.summary ?? ""} placeholder="One sentence for the calendar and previews." />
        <TextareaField label="Full description" name="descriptionHtml" optional rows={5} maxLength={8000} defaultValue={values.descriptionHtml ?? ""} hint="What's happening, who it's for, what to bring. Basic formatting is allowed." placeholder="Tell people what to expect…" />
      </Fieldset>

      {/* ---- Date & time ---- */}
      <Fieldset legend="Date & time" description="All times are Central (America/Chicago), the church's timezone.">
        <CheckboxField label="All-day event" name="allDay" checked={allDay} onChange={(e) => setAllDay(e.currentTarget.checked)} hint="Hide specific start/end times (still spans the chosen dates)." />
        <FormRow>
          <TextField label="Starts" name="startAt" type={allDay ? "date" : "datetime-local"} required defaultValue={dateOnlyIf(values.startWall, allDay)} />
          <TextField label="Ends" name="endAt" type={allDay ? "date" : "datetime-local"} required defaultValue={dateOnlyIf(values.endWall, allDay)} hint="For a multi-day event, set the end on the last day." />
        </FormRow>
      </Fieldset>

      {/* ---- Location ---- */}
      <Fieldset legend="Location" description="Only the fields relevant to your choice are shown.">
        <SelectField label="Location type" name="locationType" value={locationType} onChange={(e) => setLocationType(e.currentTarget.value)}>
          <option value="CHURCH">At the church</option>
          <option value="EXTERNAL">Another physical location</option>
          <option value="ONLINE">Online only</option>
          <option value="HYBRID">Hybrid (in person + online)</option>
        </SelectField>

        {showVenue ? (
          <TextField
            label={locationType === "CHURCH" ? "Room / area" : "Venue name"}
            name="venueName"
            optional
            maxLength={200}
            defaultValue={values.venueName ?? ""}
            placeholder={locationType === "CHURCH" ? "e.g. Fellowship Hall" : "e.g. McKinney Community Center"}
          />
        ) : null}

        {showAddress ? (
          <>
            <TextField label="Street address" name="addressLine1" optional maxLength={200} defaultValue={values.addressLine1 ?? ""} />
            <FormRow cols={3}>
              <TextField label="City" name="city" optional maxLength={120} defaultValue={values.city ?? ""} />
              <TextField label="State" name="state" optional maxLength={60} defaultValue={values.state ?? ""} />
              <TextField label="ZIP" name="zip" optional maxLength={20} inputMode="numeric" defaultValue={values.zip ?? ""} />
            </FormRow>
          </>
        ) : null}

        {showOnline ? (
          <TextField label="Online meeting link" name="onlineUrl" type="url" required={locationType === "ONLINE"} maxLength={500} defaultValue={values.onlineUrl ?? ""} placeholder="https://…" hint="Must be an https:// link." />
        ) : null}

        <TextField label="Location instructions" name="locationInstructions" optional maxLength={500} defaultValue={values.locationInstructions ?? ""} placeholder="Parking, entrance, room-finding notes…" />
      </Fieldset>

      {/* ---- Contact ---- */}
      <Fieldset legend="Event contact" description="Who can answer questions about this event.">
        <FormRow>
          <TextField label="Contact person" name="contactName" optional maxLength={120} defaultValue={values.contactName ?? ""} />
          <TextField label="Contact email" name="contactEmail" type="email" optional maxLength={200} defaultValue={values.contactEmail ?? ""} />
        </FormRow>
        <TextField label="Contact phone" name="contactPhone" type="tel" optional maxLength={40} defaultValue={values.contactPhone ?? ""} />
        <CheckboxField
          label="Show this contact publicly on the event page"
          name="contactPublic"
          defaultChecked={values.contactPublic ?? false}
          hint="Leave unchecked to keep the contact for church staff only."
        />
      </Fieldset>

      {/* ---- Registration / information ---- */}
      <Fieldset legend="Registration & information" description="Optional — for events people sign up for or need details on.">
        <CheckboxField label="Registration required" name="registrationRequired" checked={registration} onChange={(e) => setRegistration(e.currentTarget.checked)} />
        {registration ? (
          <>
            <TextField label="Registration link" name="registrationUrl" type="url" required maxLength={500} defaultValue={values.registrationUrl ?? ""} placeholder="https://…" />
            <FormRow>
              <TextField label="Registration deadline" name="registrationDeadline" type="datetime-local" optional defaultValue={values.registrationDeadlineWall ?? ""} />
              <TextField label="Capacity" name="capacity" type="number" min={1} optional defaultValue={values.capacity != null ? String(values.capacity) : ""} placeholder="e.g. 50" />
            </FormRow>
          </>
        ) : null}
        <FormRow>
          <TextField label="More-info link" name="infoUrl" type="url" optional maxLength={500} defaultValue={values.infoUrl ?? ""} placeholder="https://…" />
          <TextField label="Button label" name="ctaLabel" optional maxLength={60} defaultValue={values.ctaLabel ?? ""} placeholder="e.g. Reserve a seat" hint="Text for the call-to-action button." />
        </FormRow>
      </Fieldset>

      {/* ---- Media ---- */}
      <Fieldset legend="Event image" description="An optional banner image shown on the public event page.">
        <TextField label="Image URL" name="imageUrl" type="url" optional maxLength={500} value={imageUrl} onChange={(e) => setImageUrl(e.currentTarget.value)} placeholder="https://…" hint="Paste an https:// image link." />
        {imageUrl ? (
          <>
            <TextField label="Image description (alt text)" name="imageAlt" optional maxLength={200} defaultValue={values.imageAlt ?? ""} hint="Describe the image for screen-reader users." />
            <img src={imageUrl} alt="" className="max-h-48 w-full rounded-lg border border-line object-cover" onError={(e) => (e.currentTarget.style.display = "none")} />
          </>
        ) : null}
      </Fieldset>

      {/* ---- Board approval ---- */}
      <Fieldset legend="Board approval" description="Does this event require church-board sign-off? Submitting this is for admin verification — it never publishes the event by itself.">
        <CheckboxField label="This event requires board approval" name="boardApprovalRequired" checked={board} onChange={(e) => setBoard(e.currentTarget.checked)} />
        {board ? (
          <>
            <FormRow>
              <SelectField label="Board approval status" name="boardApprovalState" defaultValue={values.boardApprovalState ?? "PENDING"}>
                <option value="PENDING">Pending</option>
                <option value="APPROVED">Approved</option>
                <option value="NOT_APPROVED">Not approved</option>
              </SelectField>
              <TextField label="Approval date" name="boardApprovalDate" type="datetime-local" optional defaultValue={values.boardApprovalDateWall ?? ""} />
            </FormRow>
            <TextField label="Approval reference" name="boardApprovalRef" optional maxLength={120} defaultValue={values.boardApprovalRef ?? ""} placeholder="e.g. board minute / motion #" />
            <TextareaField label="Internal board note" name="boardNoteInternal" optional rows={3} maxLength={2000} defaultValue={values.boardNoteInternal ?? ""} hint="Private to admins — never shown publicly." />
          </>
        ) : null}
      </Fieldset>

      {/* ---- Actions ---- */}
      <div className="flex flex-col-reverse gap-3 border-t border-line pt-5 sm:flex-row sm:items-center">
        <button type="submit" name="intent" value="draft" className="btn btn-outline px-5 py-2.5">
          {primaryLabel}
        </button>
        {secondaryLabel ? (
          <button type="submit" name="intent" value="submit" className="btn btn-primary px-5 py-2.5">
            {secondaryLabel}
          </button>
        ) : null}
      </div>
    </form>
  );
}

/** For an all-day event, an existing wall value like "2026-08-15T09:00" is shown as just the date. */
function dateOnlyIf(wall: string | undefined, allDay: boolean): string {
  if (!wall) return "";
  return allDay ? wall.slice(0, 10) : wall;
}
