import type { Bulletin, OrderOfServiceItem } from "@prisma/client";
import { TextField, TextareaField, Fieldset, FormRow, SubmitButton } from "@/components/forms";
import { Panel } from "./dashboard-ui";
import {
  updateBulletinMetaAction, seedOrderAction, addOrderItemAction, updateOrderItemAction,
  deleteOrderItemAction, nudgeOrderItemAction,
} from "@/app/dashboard/admin/weekly/actions";

/**
 * The Weekly Worship Service builder (§7). Edits the bulletin's worship/duty metadata and the
 * ordered OrderOfServiceItem program (add / edit / delete / reorder), with a one-click seed of the
 * standard McKinney SDA program. Admin/Pastor only (enforced in the service + actions).
 */
export function WorshipBuilder({
  packetId, bulletin, items,
}: {
  packetId: string;
  bulletin: Bulletin;
  items: OrderOfServiceItem[];
}) {
  const v = (s: string | null) => s ?? "";
  return (
    <div className="space-y-6">
      {/* Worship metadata */}
      <Panel title="Worship & program details" className="p-5 sm:p-6">
        <form action={updateBulletinMetaAction} className="space-y-8">
          <input type="hidden" name="bulletinId" value={bulletin.id} />
          <input type="hidden" name="packetId" value={packetId} />

          <Fieldset legend="This week's message & program">
            <TextField label="Series / theme" name="theme" optional defaultValue={v(bulletin.theme)} />
            <TextareaField label="Welcome message" name="welcomeMessage" rows={2} optional defaultValue={v(bulletin.welcomeMessage)} />
            <FormRow>
              <TextField label="Sermon title" name="sermonTitle" optional defaultValue={v(bulletin.sermonTitle)} />
              <TextField label="Speaker" name="speaker" optional defaultValue={v(bulletin.speaker)} />
            </FormRow>
            <FormRow>
              <TextField label="Scripture reading" name="scripture" optional defaultValue={v(bulletin.scripture)} />
              <TextField label="Today's offering" name="offeringToday" optional defaultValue={v(bulletin.offeringToday)} />
            </FormRow>
          </Fieldset>

          <Fieldset legend="Sabbath School & service times">
            <FormRow cols={3}>
              <TextField label="Sabbath School time" name="sabbathSchoolTime" optional defaultValue={v(bulletin.sabbathSchoolTime)} placeholder="9:30 AM" />
              <TextField label="Divine Worship time" name="divineWorshipTime" optional defaultValue={v(bulletin.divineWorshipTime)} placeholder="11:00 AM" />
              <TextField label="Sundown tonight" name="sundownTonight" optional defaultValue={v(bulletin.sundownTonight)} placeholder="8:14 PM" />
            </FormRow>
            <TextField label="Sabbath School lesson" name="sabbathSchoolLesson" optional defaultValue={v(bulletin.sabbathSchoolLesson)} />
            <TextareaField label="Health nugget" name="healthNugget" rows={2} optional defaultValue={v(bulletin.healthNugget)} />
          </Fieldset>

          <Fieldset legend="Duty roster & next Sabbath">
            <FormRow>
              <TextField label="Elder on duty" name="elderOnDuty" optional defaultValue={v(bulletin.elderOnDuty)} />
              <TextField label="Nurse on duty" name="nurseOnDuty" optional defaultValue={v(bulletin.nurseOnDuty)} />
            </FormRow>
            <FormRow cols={3}>
              <TextField label="Next Sabbath speaker" name="nextSabbathSpeaker" optional defaultValue={v(bulletin.nextSabbathSpeaker)} />
              <TextField label="Next Sabbath offering" name="nextSabbathOffering" optional defaultValue={v(bulletin.nextSabbathOffering)} />
              <TextField label="Next sundown" name="sundownNext" optional defaultValue={v(bulletin.sundownNext)} />
            </FormRow>
            <TextField label="Hero image URL" name="heroImageUrl" type="url" optional defaultValue={v(bulletin.heroImageUrl)} hint="Optional cover image for the online bulletin." />
          </Fieldset>

          <div className="flex justify-end border-t border-line pt-5">
            <SubmitButton pendingLabel="Saving…">Save worship details</SubmitButton>
          </div>
        </form>
      </Panel>

      {/* Order of service */}
      <Panel title="Order of service" className="p-5 sm:p-6">
        {items.length === 0 ? (
          <div className="mb-4 rounded-lg border border-dashed border-line-strong p-5 text-center">
            <p className="text-sm text-muted">No program items yet.</p>
            <form action={seedOrderAction} className="mt-3">
              <input type="hidden" name="bulletinId" value={bulletin.id} />
              <input type="hidden" name="packetId" value={packetId} />
              <button type="submit" className="btn btn-primary text-sm">Seed the standard Sabbath program</button>
            </form>
          </div>
        ) : (
          <ul className="mb-5 space-y-2">
            {items.map((it, i) => (
              <li key={it.id} className="rounded-lg border border-line p-3">
                <div className="flex items-start gap-3">
                  <div className="flex flex-col pt-1">
                    <form action={nudgeOrderItemAction}>
                      <input type="hidden" name="itemId" value={it.id} />
                      <input type="hidden" name="packetId" value={packetId} />
                      <input type="hidden" name="direction" value="up" />
                      <button type="submit" disabled={i === 0} className="px-1 text-muted disabled:opacity-30 hover:text-primary" aria-label="Move up">▲</button>
                    </form>
                    <form action={nudgeOrderItemAction}>
                      <input type="hidden" name="itemId" value={it.id} />
                      <input type="hidden" name="packetId" value={packetId} />
                      <input type="hidden" name="direction" value="down" />
                      <button type="submit" disabled={i === items.length - 1} className="px-1 text-muted disabled:opacity-30 hover:text-primary" aria-label="Move down">▼</button>
                    </form>
                  </div>
                  <form action={updateOrderItemAction} className="grid flex-1 gap-2 sm:grid-cols-[1.4fr_1.4fr_1fr_auto]">
                    <input type="hidden" name="itemId" value={it.id} />
                    <input type="hidden" name="packetId" value={packetId} />
                    <input name="title" defaultValue={it.title} aria-label="Title" className="rounded-lg border border-line-strong bg-surface px-3 py-1.5 text-sm text-fg" />
                    <input name="detail" defaultValue={it.detail ?? ""} aria-label="Detail" placeholder="detail" className="rounded-lg border border-line-strong bg-surface px-3 py-1.5 text-sm text-fg" />
                    <input name="participant" defaultValue={it.participant ?? ""} aria-label="Participant" placeholder="participant" className="rounded-lg border border-line-strong bg-surface px-3 py-1.5 text-sm text-fg" />
                    <button type="submit" className="rounded-lg border border-line px-3 py-1.5 text-xs font-medium text-primary hover:bg-surface-2">Save</button>
                  </form>
                  <form action={deleteOrderItemAction}>
                    <input type="hidden" name="itemId" value={it.id} />
                    <input type="hidden" name="packetId" value={packetId} />
                    <button type="submit" className="px-2 py-1.5 text-xs text-muted hover:text-accent-strong" aria-label="Delete item">✕</button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}

        <form action={addOrderItemAction} className="grid gap-2 border-t border-line pt-4 sm:grid-cols-[1.4fr_1.4fr_1fr_auto]">
          <input type="hidden" name="bulletinId" value={bulletin.id} />
          <input type="hidden" name="packetId" value={packetId} />
          <input name="title" required placeholder="Add item title" aria-label="New item title" className="rounded-lg border border-line-strong bg-surface px-3 py-2 text-sm text-fg" />
          <input name="detail" placeholder="detail (optional)" aria-label="New item detail" className="rounded-lg border border-line-strong bg-surface px-3 py-2 text-sm text-fg" />
          <input name="participant" placeholder="participant (optional)" aria-label="New item participant" className="rounded-lg border border-line-strong bg-surface px-3 py-2 text-sm text-fg" />
          <button type="submit" className="btn btn-outline text-sm">Add</button>
        </form>
      </Panel>
    </div>
  );
}
