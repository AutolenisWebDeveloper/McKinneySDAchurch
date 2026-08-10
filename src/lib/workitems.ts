import type {
  Prisma,
  WorkItem,
  WorkItemStatus,
  WorkItemType,
  WorkItemPriority,
  WorkItemConfidentiality,
} from "@prisma/client";
import { prisma } from "./db";
import { encryptField } from "./crypto";
import { writeAudit } from "./audit";
import { assertTransition, type TransitionInput } from "./workflow";
import { routeWorkItem } from "./routing";
import { notifyRoles, notify } from "./notify";
import {
  type Actor,
  canManageWorkItem,
  canMessageWorkItem,
  ForbiddenError,
  type WorkItemRef,
} from "./rbac";

/**
 * Server-side WorkItem spine (§15/§16/§17). Binds the pure workflow + routing logic to the
 * database: every create/transition/note/message runs in a transaction, appends an immutable
 * WorkItemEvent, writes an audit entry for privileged changes, and fans out notifications to
 * the routing roles. Sensitive bodies/notes are AES-256-GCM encrypted at rest.
 */

const ref = (w: {
  type: WorkItemType;
  ministryId: string | null;
  confidentiality: WorkItemConfidentiality;
  assigneeUserId: string | null;
  requesterUserId: string | null;
}): WorkItemRef => ({
  type: w.type,
  ministryId: w.ministryId,
  confidentiality: w.confidentiality,
  assigneeUserId: w.assigneeUserId,
  requesterUserId: w.requesterUserId,
});

export type CreateWorkItemInput = {
  type: WorkItemType;
  title: string;
  category?: string | null;
  /** Free-text detail; stored encrypted at rest. */
  body?: string | null;
  priority?: WorkItemPriority;
  confidentiality?: WorkItemConfidentiality;
  requesterUserId?: string | null;
  requesterName?: string | null;
  requesterEmail?: string | null;
  subjectName?: string | null;
  ministryId?: string | null;
  /** Skip the role fan-out notification (e.g. bulk auto-generated items from a scan). */
  silent?: boolean;
};

/**
 * Create a WorkItem (from a public form or an authenticated portal), route it, record the
 * CREATED event, and notify the routing roles. Returns the created item.
 */
export async function createWorkItem(input: CreateWorkItemInput): Promise<WorkItem> {
  const route = routeWorkItem(input.type, {
    category: input.category,
    priority: input.priority,
    ministryId: input.ministryId,
  });

  const item = await prisma.$transaction(async (tx) => {
    const created = await tx.workItem.create({
      data: {
        type: input.type,
        title: input.title.trim().slice(0, 300),
        category: input.category ?? null,
        bodyEncrypted: input.body ? encryptField(input.body) : null,
        priority: input.priority ?? "NORMAL",
        confidentiality: input.confidentiality ?? "NORMAL",
        requesterUserId: input.requesterUserId ?? null,
        requesterName: input.requesterName ?? null,
        requesterEmail: input.requesterEmail ?? null,
        subjectName: input.subjectName ?? null,
        ministryId: input.ministryId ?? null,
        status: "NEW",
      },
    });
    await tx.workItemEvent.create({
      data: {
        workItemId: created.id,
        actorUserId: input.requesterUserId ?? null,
        kind: "CREATED",
        toStatus: "NEW",
      },
    });
    return created;
  });

  // Fan-out notifications after commit (best-effort; a notify failure never voids the item).
  if (input.silent) return item;
  try {
    await notifyRoles(
      route.roles,
      {
        category: `workitem:${item.type.toLowerCase()}`,
        title: `New ${labelForType(item.type)}: ${item.title}`,
        deepLink: staffWorkItemLink(item.type, item.id),
      },
      { ministryId: route.ministryScoped ? item.ministryId : null },
    );
  } catch {
    /* non-fatal */
  }
  return item;
}

/**
 * Apply a lifecycle transition. Enforces authorization (canManageWorkItem), the pure
 * transition guards, optimistic concurrency on updatedAt, an immutable event, and an audit
 * entry. Notifies the requester on resolution/needs-info and a new assignee on assignment.
 */
export async function transitionWorkItem(
  actor: Actor,
  workItemId: string,
  to: WorkItemStatus,
  input: TransitionInput = {},
): Promise<WorkItem> {
  return prisma.$transaction(async (tx) => {
    const current = await tx.workItem.findUnique({ where: { id: workItemId } });
    if (!current) throw new ForbiddenError("NOT_FOUND");
    if (!canManageWorkItem(actor, ref(current))) throw new ForbiddenError();

    const patch = assertTransition(current.status, to, input);

    const updated = await tx.workItem.updateMany({
      where: { id: workItemId, updatedAt: current.updatedAt }, // optimistic concurrency
      data: {
        status: patch.status,
        ...(patch.assigneeUserId !== undefined ? { assigneeUserId: patch.assigneeUserId } : {}),
        ...(patch.closeReason !== undefined ? { closeReason: patch.closeReason } : {}),
        ...(patch.followUpAt !== undefined ? { followUpAt: patch.followUpAt } : {}),
        ...(patch.closedAt !== undefined ? { closedAt: patch.closedAt } : {}),
      },
    });
    if (updated.count === 0) throw new ForbiddenError("STALE");

    await tx.workItemEvent.create({
      data: {
        workItemId,
        actorUserId: actor.userId,
        kind: patch.assigneeUserId ? "ASSIGNED" : "STATUS_CHANGE",
        fromStatus: current.status,
        toStatus: patch.status,
        detail: input.reason?.trim() || null,
      },
    });

    await writeAudit(tx, {
      actorId: actor.userId,
      action: `workitem.${patch.status.toLowerCase()}`,
      entity: "WorkItem",
      entityId: workItemId,
      metadata: { type: current.type, from: current.status, to: patch.status },
    });

    // In-app notifications (inside the tx so they are consistent with the transition).
    if (patch.assigneeUserId && patch.assigneeUserId !== actor.userId) {
      await notify(
        {
          userId: patch.assigneeUserId,
          category: `workitem:${current.type.toLowerCase()}`,
          title: `Assigned to you: ${current.title}`,
          deepLink: staffWorkItemLink(current.type, workItemId),
        },
        tx,
      );
    }
    if (current.requesterUserId && (patch.status === "RESOLVED" || patch.status === "NEEDS_INFO")) {
      await notify(
        {
          userId: current.requesterUserId,
          category: `workitem:${current.type.toLowerCase()}`,
          title:
            patch.status === "RESOLVED"
              ? `Your ${labelForType(current.type)} has been resolved`
              : `More information needed on your ${labelForType(current.type)}`,
          deepLink: `/dashboard/member/requests/${workItemId}`,
        },
        tx,
      );
    }

    return (await tx.workItem.findUnique({ where: { id: workItemId } }))!;
  });
}

/** Add an internal, encrypted staff note. */
export async function addWorkItemNote(
  actor: Actor,
  workItemId: string,
  body: string,
): Promise<void> {
  if (!body.trim()) throw new ForbiddenError("EMPTY");
  await prisma.$transaction(async (tx) => {
    const item = await tx.workItem.findUnique({ where: { id: workItemId } });
    if (!item) throw new ForbiddenError("NOT_FOUND");
    if (!canManageWorkItem(actor, ref(item))) throw new ForbiddenError();
    await tx.workItemNote.create({
      data: { workItemId, authorUserId: actor.userId, bodyEncrypted: encryptField(body) },
    });
    await tx.workItemEvent.create({
      data: { workItemId, actorUserId: actor.userId, kind: "NOTE_ADDED" },
    });
  });
}

/** Post a message on the requester <-> staff thread. */
export async function addWorkItemMessage(
  actor: Actor,
  workItemId: string,
  body: string,
  direction: "INBOUND" | "OUTBOUND",
): Promise<void> {
  if (!body.trim()) throw new ForbiddenError("EMPTY");
  await prisma.$transaction(async (tx) => {
    const item = await tx.workItem.findUnique({ where: { id: workItemId } });
    if (!item) throw new ForbiddenError("NOT_FOUND");
    if (!canMessageWorkItem(actor, ref(item))) throw new ForbiddenError();
    await tx.workItemMessage.create({
      data: { workItemId, authorUserId: actor.userId, body: body.trim(), direction },
    });
    await tx.workItemEvent.create({
      data: { workItemId, actorUserId: actor.userId, kind: "MESSAGE", detail: direction },
    });
    // Notify the counterpart.
    if (direction === "OUTBOUND" && item.requesterUserId && item.requesterUserId !== actor.userId) {
      await notify(
        {
          userId: item.requesterUserId,
          category: `workitem:${item.type.toLowerCase()}`,
          title: `New reply on your ${labelForType(item.type)}`,
          deepLink: `/dashboard/member/requests/${workItemId}`,
        },
        tx,
      );
    }
  });
}

/** Staff-facing deep link: care/prayer/leadership messages triage in the Leadership portal;
 *  volunteer/sponsor/support/contact triage in the Admin portal. */
export function staffWorkItemLink(type: WorkItemType, id: string): string {
  const leadership = type === "CARE" || type === "PRAYER" || type === "LEADERSHIP_MESSAGE";
  return `/dashboard/${leadership ? "leadership" : "admin"}/workitems/${id}`;
}

function labelForType(type: WorkItemType): string {
  switch (type) {
    case "CARE": return "care request";
    case "PRAYER": return "prayer request";
    case "LEADERSHIP_MESSAGE": return "message to leadership";
    case "SUPPORT": return "support request";
    case "VOLUNTEER": return "volunteer application";
    case "SPONSOR": return "sponsorship inquiry";
    case "CONTACT": return "contact message";
    default: return "request";
  }
}
