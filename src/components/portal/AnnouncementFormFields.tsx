import type { PacketSubmission } from "@prisma/client";
import { TextField, TextareaField, SelectField, CheckboxField, FormRow, Fieldset } from "@/components/forms";
import { ANNOUNCEMENT_CATEGORIES } from "@/lib/weekly-packet";
import { utcToCentralWall } from "@/lib/tz";

/**
 * Shared, mobile-first announcement fields (§5/§25). Grouped with progressive disclosure so a
 * ministry leader on a phone fills the essentials first, then optional detail. Used by both the
 * new and edit forms; the edit form prefills from the persisted draft (no lost input).
 */
export function AnnouncementFormFields({
  ministries,
  sub,
}: {
  ministries: { value: string; label: string }[];
  sub?: PacketSubmission | null;
}) {
  const wall = (d?: Date | null) => (d ? utcToCentralWall(d) : undefined);
  return (
    <div className="space-y-8">
      <Fieldset legend="The essentials" description="This is what appears in the printed bulletin.">
        {ministries.length > 1 ? (
          <SelectField label="Ministry / department" name="ministryId" required defaultValue={sub?.ministryId ?? undefined}
            options={ministries} />
        ) : ministries.length === 1 ? (
          <input type="hidden" name="ministryId" value={ministries[0]!.value} />
        ) : null}
        <TextField label="Title" name="title" required maxLength={160} defaultValue={sub?.title ?? ""} placeholder="e.g. Rise! Youth Camporee" />
        <SelectField label="Category" name="category" defaultValue={sub?.category ?? "Coming Up"} options={ANNOUNCEMENT_CATEGORIES as unknown as string[]} />
        <TextareaField
          label="Bulletin summary" name="summary" rows={3} maxLength={600} required
          hint="Short and print-friendly — a sentence or two."
          defaultValue={sub?.summary ?? sub?.body ?? ""}
        />
      </Fieldset>

      <Fieldset legend="Full online details" description="Extended information shown online under “Read more”. Optional.">
        <TextareaField
          label="Full details" name="fullContentHtml" rows={6} optional maxLength={8000}
          hint="Basic formatting is allowed and sanitized. Add schedules, instructions, and any extra context."
          defaultValue={sub?.fullContentHtml ?? ""}
        />
      </Fieldset>

      <Fieldset legend="Event details" description="If this announcement is tied to an event.">
        <FormRow>
          <TextField label="Starts" name="eventStartAt" type="datetime-local" optional defaultValue={wall(sub?.eventStartAt)} />
          <TextField label="Ends" name="eventEndAt" type="datetime-local" optional defaultValue={wall(sub?.eventEndAt)} />
        </FormRow>
        <TextField label="Location" name="location" optional maxLength={240} defaultValue={sub?.location ?? ""} />
        <CheckboxField label="This is a recurring event" name="recurring" defaultChecked={sub?.recurring ?? false} />
        <TextField label="How often" name="recurrence" optional maxLength={240} defaultValue={sub?.recurrence ?? ""} placeholder="e.g. Every Wednesday at 7 PM" />
      </Fieldset>

      <Fieldset legend="Contact" description="Who members can reach for more information.">
        <FormRow>
          <TextField label="Contact name" name="contactName" optional maxLength={160} defaultValue={sub?.contactName ?? ""} />
          <TextField label="Contact phone" name="contactPhone" type="tel" optional maxLength={40} defaultValue={sub?.contactPhone ?? ""} />
        </FormRow>
        <TextField label="Contact email" name="contactEmail" type="email" optional maxLength={254} defaultValue={sub?.contactEmail ?? ""} />
      </Fieldset>

      <Fieldset legend="Links, button & image" description="All links must be valid http(s) URLs.">
        <FormRow>
          <TextField label="Registration link" name="registrationUrl" type="url" optional maxLength={2048} defaultValue={sub?.registrationUrl ?? ""} />
          <TextField label="More-info link" name="externalUrl" type="url" optional maxLength={2048} defaultValue={sub?.externalUrl ?? ""} />
        </FormRow>
        <FormRow>
          <TextField label="Button label" name="ctaLabel" optional maxLength={40} defaultValue={sub?.ctaLabel ?? ""} placeholder="e.g. Sign up" />
          <TextField label="Button link" name="ctaUrl" type="url" optional maxLength={2048} defaultValue={sub?.ctaUrl ?? ""} />
        </FormRow>
        <TextField label="Image URL" name="imageUrl" type="url" optional maxLength={2048} defaultValue={sub?.imageUrl ?? ""} hint="A hosted https image; shown online only." />
      </Fieldset>

      <Fieldset legend="For the bulletin team" description="Only the admin sees these.">
        <FormRow>
          <SelectField label="Requested priority" name="requestedPriority" optional defaultValue={sub?.requestedPriority ?? "NORMAL"}
            options={[{ value: "LOW", label: "Low" }, { value: "NORMAL", label: "Normal" }, { value: "HIGH", label: "High" }]} />
          <div aria-hidden="true" />
        </FormRow>
        <TextareaField label="Note to the admin" name="internalNotes" rows={2} optional maxLength={2000} defaultValue={sub?.internalNotes ?? ""} />
      </Fieldset>
    </div>
  );
}
