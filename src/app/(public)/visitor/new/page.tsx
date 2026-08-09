import { submitVisitor } from "./actions";

export const metadata = { title: "Connect with us — McKinney SDA Church" };

export default async function VisitorNew({ searchParams }: { searchParams: Promise<{ thanks?: string }> }) {
  const { thanks } = await searchParams;
  if (thanks) {
    return (
      <div className="max-w-lg">
        <h1 className="text-2xl font-bold mb-2">Thank you!</h1>
        <p className="text-muted">We're glad you visited. We hope to see you again this Sabbath.</p>
      </div>
    );
  }
  return (
    <div className="max-w-lg">
      <h1 className="text-2xl font-bold mb-4">Connect with us</h1>
      <form action={submitVisitor} className="space-y-4">
        <div><label htmlFor="name" className="block text-sm font-medium mb-1">Name</label>
          <input id="name" name="name" required maxLength={120} className="w-full rounded border border-black/20 dark:border-white/20 bg-transparent px-3 py-2" /></div>
        <div><label htmlFor="email" className="block text-sm font-medium mb-1">Email</label>
          <input id="email" name="email" type="email" required className="w-full rounded border border-black/20 dark:border-white/20 bg-transparent px-3 py-2" /></div>
        <div><label htmlFor="phone" className="block text-sm font-medium mb-1">Phone (optional)</label>
          <input id="phone" name="phone" className="w-full rounded border border-black/20 dark:border-white/20 bg-transparent px-3 py-2" /></div>
        <div><label htmlFor="address" className="block text-sm font-medium mb-1">Address (optional)</label>
          <input id="address" name="address" className="w-full rounded border border-black/20 dark:border-white/20 bg-transparent px-3 py-2" /></div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="marketingOptIn" /> Send me weekly invitations and updates.
        </label>
        <button type="submit" className="rounded bg-sda-navy text-white px-4 py-2">Submit</button>
      </form>
    </div>
  );
}
