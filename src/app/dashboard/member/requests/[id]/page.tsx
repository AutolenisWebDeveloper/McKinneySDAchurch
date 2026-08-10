import { requirePortal } from "@/auth/actor";
import { WorkItemDetail } from "@/components/portal/WorkItemDetail";

export const dynamic = "force-dynamic";

export default async function MemberRequestPage({ params }: { params: Promise<{ id: string }> }) {
  const actor = await requirePortal("member");
  const { id } = await params;
  return <WorkItemDetail id={id} actor={actor} />;
}
