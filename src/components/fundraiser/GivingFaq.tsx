import { Container, Eyebrow } from "@/components/ui";

/**
 * What a visitor actually wonders before giving — where the money goes, what the church can
 * see, and why the bar has not moved yet.
 *
 * Every answer describes how this platform behaves and is verifiable from the code: giving is
 * an external redirect through /f/{slug}/give to AdventistGiving, the redirect carries a
 * designation for the page, and only treasurer-confirmed gifts reach the progress figures.
 * Nothing here makes a claim about construction timing or what a given amount buys — there is
 * no data behind those, so they are not asserted.
 */
const FAQ: { q: string; a: string }[] = [
  {
    q: "Where does my gift actually go?",
    a: "To the church, through AdventistGiving — the Seventh-day Adventist Church's official online giving platform. The Give button hands you off to AdventistGiving, and your gift is received there.",
  },
  {
    q: "Does the church store my card details?",
    a: "No. This website has no payment page and no card processing of any kind. Everything to do with your payment happens on AdventistGiving, and none of it is stored here.",
  },
  {
    q: "How does my gift get credited to this fundraiser?",
    a: "The Give button carries a designation naming this page. Our treasurer reconciles the AdventistGiving record against it, which is what ties a gift to this fundraiser rather than to the campaign at large.",
  },
  {
    q: "Why hasn't my gift appeared here yet?",
    a: "Only gifts our treasurer has reconciled count toward the progress shown on this page, and reconciliation happens periodically rather than the moment you give. A gift you have just made is safely received even though the figure above has not moved yet.",
  },
  {
    q: "Can I give anonymously?",
    a: "Yes. This page never shows who gave or how much — not to the person fundraising, and not to anyone else. Only totals and the number of gifts are ever published here.",
  },
  {
    q: "What is the difference between a pledge and a gift?",
    a: "A pledge is a commitment recorded so the church can plan. A gift is money actually received and reconciled. Only reconciled gifts move the progress bar on this page.",
  },
];

export function GivingFaq() {
  return (
    <section className="bg-canvas">
      <Container size="narrow" className="py-16 sm:py-20">
        <Eyebrow className="mb-3">Before you give</Eyebrow>
        <h2 className="text-title font-serif font-semibold text-fg">How your gift is handled</h2>

        {/* Native <details>: keyboard-operable and screen-reader-announced with no JavaScript,
            which also means it works on the first paint rather than after hydration. */}
        <div className="mt-8 divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface">
          {FAQ.map((item) => (
            <details key={item.q} className="group">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 font-semibold text-fg marker:content-[''] hover:bg-surface-2">
                {item.q}
                <svg
                  className="h-4 w-4 shrink-0 text-muted transition-transform duration-200 group-open:rotate-90 motion-reduce:transition-none"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.17 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                </svg>
              </summary>
              <p className="px-5 pb-5 text-muted">{item.a}</p>
            </details>
          ))}
        </div>
      </Container>
    </section>
  );
}
