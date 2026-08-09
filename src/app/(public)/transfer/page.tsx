import Link from "next/link";
import { env } from "@/env";
import { submitTransfer } from "./actions";
export const dynamic = "force-dynamic";
export const metadata = { title: "Membership Transfer — McKinney SDA Church" };

export default async function Transfer({ searchParams }: { searchParams: Promise<{ ref?: string }> }) {
  const { ref } = await searchParams;
  if (ref) {
    const url = `${env.NEXT_PUBLIC_SITE_URL}/transfer/status/${encodeURIComponent(ref)}`;
    return (
      <div className="max-w-lg space-y-3">
        <h1 className="text-2xl font-bold">Request received</h1>
        <p>Our clerk will process your transfer with the Adventist membership system. Save this link to check the status later:</p>
        <p className="text-sm break-all rounded border border-black/10 dark:border-white/10 p-2"><Link href={`/transfer/status/${encodeURIComponent(ref)}`} className="underline">{url}</Link></p>
      </div>
    );
  }
  return (
    <div className="max-w-lg space-y-4">
      <h1 className="text-2xl font-bold">Membership Transfer</h1>
      <p className="text-muted">Moving your Adventist membership to or from McKinney SDA? Submit the details and our clerk will handle it through the official system.</p>
      <form action={submitTransfer} className="space-y-3">
        <select name="direction" className="w-full rounded border border-black/20 dark:border-white/20 bg-transparent px-3 py-2">
          <option value="INCOMING">Transfer IN (to McKinney SDA)</option>
          <option value="OUTGOING">Transfer OUT (to another church)</option>
        </select>
        <input name="personName" required placeholder="Your full name" className="w-full rounded border border-black/20 dark:border-white/20 bg-transparent px-3 py-2" />
        <div className="grid grid-cols-2 gap-2">
          <input name="personEmail" type="email" placeholder="Email" className="rounded border border-black/20 dark:border-white/20 bg-transparent px-3 py-2" />
          <input name="personPhone" placeholder="Phone" className="rounded border border-black/20 dark:border-white/20 bg-transparent px-3 py-2" />
        </div>
        <input name="otherChurchName" required placeholder="Other church name" className="w-full rounded border border-black/20 dark:border-white/20 bg-transparent px-3 py-2" />
        <input name="otherChurchContact" placeholder="Other church contact (optional)" className="w-full rounded border border-black/20 dark:border-white/20 bg-transparent px-3 py-2" />
        <textarea name="note" rows={3} placeholder="Anything else (optional)" className="w-full rounded border border-black/20 dark:border-white/20 bg-transparent px-3 py-2" />
        <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
        <button className="rounded bg-sda-navy text-white px-4 py-2">Submit</button>
      </form>
    </div>
  );
}
