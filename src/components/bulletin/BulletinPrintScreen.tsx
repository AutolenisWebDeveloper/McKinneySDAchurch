import Link from "next/link";
import { env } from "@/env";
import { qrSvg } from "@/lib/qr";
import { bulletinConnectTiles } from "@/lib/bulletin-links";
import type { BulletinView } from "@/lib/bulletin-view";
import { BulletinPrint, type QrItem } from "./BulletinPrint";
import { PrintButton } from "./PrintButton";
import { PRINT_CSS } from "./print-css";

/**
 * The full printable bulletin screen (§15/§17): on-screen toolbar + the bi-fold document with all
 * QR codes generated from canonical URLs. Shared by the public print route and the admin print
 * preview so the two never drift.
 */
export async function BulletinPrintScreen({
  view, backHref, backLabel = "Back", auto = false,
}: {
  view: BulletinView;
  backHref: string;
  backLabel?: string;
  auto?: boolean;
}) {
  const site = env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  const [coverQrSvg, tiles] = await Promise.all([
    qrSvg(`${site}/bulletin/${view.slug}`, { size: 96 }),
    bulletinConnectTiles(view.slug),
  ]);
  const backQrs: QrItem[] = await Promise.all(tiles.map(async (t) => ({ ...t, svg: await qrSvg(t.url, { size: 84 }) })));
  const extended = view.announcements.filter((a) => a.hasExtended);
  const annQrEntries = await Promise.all(
    extended.map(async (a) => [a.id, await qrSvg(`${site}/bulletin/${view.slug}#${a.slug}`, { size: 60 })] as const),
  );
  const annQr = Object.fromEntries(annQrEntries);

  return (
    <div className="bg-surface-2 py-6">
      <style>{PRINT_CSS}</style>
      <div className="bp-toolbar mx-auto mb-6 flex max-w-3xl flex-wrap items-center justify-between gap-3 px-4">
        <div>
          <p className="font-serif text-lg font-semibold text-fg">Printable bulletin</p>
          <p className="text-sm text-muted">Use Print / Save as PDF, then choose “Tabloid / 11×17”, landscape.</p>
        </div>
        <div className="flex gap-2">
          <Link href={backHref} className="btn btn-outline" prefetch={false}>{backLabel}</Link>
          <PrintButton auto={auto} />
        </div>
      </div>
      <BulletinPrint view={view} coverQrSvg={coverQrSvg} backQrs={backQrs} annQr={annQr} />
    </div>
  );
}
