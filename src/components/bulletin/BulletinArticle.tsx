import { church } from "@/components/site-info";
import { Section, Container, Eyebrow, ArrowLink } from "@/components/ui";
import { Card } from "@/components/page-ui";
import { Reveal } from "@/components/motion/Reveal";
import type { BulletinView } from "@/lib/bulletin-view";
import { BulletinActions, type BulletinActionUrls } from "./BulletinActions";
import { AnnouncementItem } from "./AnnouncementItem";
import { HashOpener } from "./HashOpener";

/**
 * The premium online bulletin (§3). A first-class responsive webpage — never a PDF in a frame —
 * rendered entirely from the canonical BulletinView. Consumed by /bulletin, /bulletin/[slug], and
 * the admin preview. Every fact derives from the one approved dataset (§21).
 */

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-2 py-4 text-center sm:py-0">
      <p className="text-xs font-semibold uppercase tracking-widest text-white/60">{label}</p>
      <p className="mt-1 font-serif text-lg text-white">{value}</p>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="flex justify-between gap-4 border-b border-line py-2.5 last:border-0">
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="text-right text-sm font-medium text-fg">{value}</dd>
    </div>
  );
}

export function BulletinArticle({ view, urls }: { view: BulletinView; urls: BulletinActionUrls }) {
  const dateFull = new Date(view.sabbathDate).toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric", timeZone: "UTC" });
  const facts = [
    view.sabbathSchoolTime ? { label: "Sabbath School", value: view.sabbathSchoolTime } : null,
    view.divineWorshipTime ? { label: "Divine Worship", value: view.divineWorshipTime } : null,
    view.sundownTonight ? { label: "Sundown", value: view.sundownTonight } : null,
  ].filter(Boolean) as { label: string; value: string }[];

  return (
    <article>
      <HashOpener />

      {/* ---------- Hero ---------- */}
      <section data-dark-hero="true" className="relative overflow-hidden bg-hero-denim text-white hero-under-header">
        <div className="glow-denim absolute inset-0" aria-hidden="true" />
        <Container className="relative py-14 sm:py-20">
          <div className="max-w-3xl">
            <p className="eyebrow mb-4 text-denim-300">Sabbath Bulletin</p>
            <h1 className="text-display font-serif font-semibold text-white">{view.theme || view.title || "Happy Sabbath"}</h1>
            <p className="mt-4 text-lg text-white/80">{dateFull}</p>
            {view.welcomeMessage ? <p className="mt-5 max-w-2xl leading-relaxed text-white/75">{view.welcomeMessage}</p> : null}

            {(view.sermonTitle || view.speaker || view.scripture) && (
              <div className="mt-8 max-w-xl rounded-xl border border-white/15 bg-white/5 p-5 backdrop-blur-sm">
                <p className="text-xs font-semibold uppercase tracking-widest text-denim-300">This week's message</p>
                {view.sermonTitle ? <p className="mt-1.5 font-serif text-xl text-white">{view.sermonTitle}</p> : null}
                <p className="mt-1 text-sm text-white/75">
                  {view.speaker ? <span>{view.speaker}</span> : null}
                  {view.speaker && view.scripture ? <span className="text-white/40"> · </span> : null}
                  {view.scripture ? <span>{view.scripture}</span> : null}
                </p>
              </div>
            )}

            <div className="mt-8"><BulletinActions urls={urls} variant="hero" /></div>
          </div>
        </Container>

        {facts.length ? (
          <div className="relative border-t border-white/10">
            <Container className="grid divide-y divide-white/10 py-2 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
              {facts.map((f) => <Fact key={f.label} label={f.label} value={f.value} />)}
            </Container>
          </div>
        ) : null}
      </section>

      <Section container size="narrow" className="space-y-14">
        {/* ---------- Announcements ---------- */}
        <div>
          <Eyebrow className="mb-1">Announcements</Eyebrow>
          <h2 className="text-title font-serif font-semibold text-fg">What's happening</h2>
          {view.categories.length === 0 ? (
            <p className="mt-4 text-muted">No announcements this week.</p>
          ) : (
            <div className="mt-6 space-y-10">
              {view.categories.map((cat) => (
                <Reveal key={cat.category}>
                  <section aria-label={cat.category}>
                    <h3 className="mb-1 flex items-center gap-3 text-sm font-semibold uppercase tracking-widest text-primary">
                      <span className="h-px w-6 bg-primary/40" aria-hidden="true" />
                      {cat.category}
                    </h3>
                    <div>{cat.items.map((a) => <AnnouncementItem key={a.id} a={a} />)}</div>
                  </section>
                </Reveal>
              ))}
            </div>
          )}
          <div className="mt-8"><ArrowLink href="/calendar">See the full calendar</ArrowLink></div>
        </div>

        {/* ---------- Order of service + worship details ---------- */}
        <div className="grid gap-8 lg:grid-cols-5">
          <Reveal className="lg:col-span-3">
            <Card>
              <Eyebrow className="mb-5">Order of service</Eyebrow>
              {view.order.length === 0 ? (
                <p className="text-muted">The order of service will be posted before Sabbath.</p>
              ) : (
                <ol className="space-y-0">
                  {view.order.map((it, i) => (
                    <li key={it.id} className="flex gap-4 border-b border-line py-3.5 last:border-0">
                      <span className="mt-0.5 w-6 shrink-0 font-serif text-sm font-semibold text-primary">{String(i + 1).padStart(2, "0")}</span>
                      <div className="flex flex-1 flex-col gap-0.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
                        <span className="font-medium text-fg">
                          {it.title}
                          {it.detail ? <span className="font-normal text-muted"> — {it.detail}</span> : null}
                        </span>
                        {it.participant ? <span className="shrink-0 text-sm text-muted">{it.participant}</span> : null}
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </Card>
          </Reveal>

          <div className="space-y-6 lg:col-span-2">
            {(view.elderOnDuty || view.nurseOnDuty || view.offeringToday || view.sundownTonight) && (
              <Card>
                <Eyebrow className="mb-3">This Sabbath</Eyebrow>
                <dl>
                  <DetailRow label="Elder on duty" value={view.elderOnDuty} />
                  <DetailRow label="Nurse on duty" value={view.nurseOnDuty} />
                  <DetailRow label="Today's offering" value={view.offeringToday} />
                  <DetailRow label="Sundown tonight" value={view.sundownTonight} />
                </dl>
              </Card>
            )}
            {(view.nextSabbathSpeaker || view.nextSabbathOffering || view.sundownNext) && (
              <Card>
                <Eyebrow className="mb-3">Next Sabbath</Eyebrow>
                <dl>
                  <DetailRow label="Speaker" value={view.nextSabbathSpeaker} />
                  <DetailRow label="Offering" value={view.nextSabbathOffering} />
                  <DetailRow label="Sundown" value={view.sundownNext} />
                </dl>
              </Card>
            )}
            {view.healthNugget ? (
              <Card>
                <Eyebrow className="mb-2">Health nugget</Eyebrow>
                <p className="text-sm leading-relaxed text-fg/90">{view.healthNugget}</p>
              </Card>
            ) : null}
          </div>
        </div>

        {/* ---------- Connect / Give / Watch ---------- */}
        <Reveal>
          <div className="rounded-2xl border border-line bg-tint p-6 sm:p-8">
            <Eyebrow className="mb-5">Connect this week</Eyebrow>
            <div className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-3">
                <p className="text-sm leading-relaxed text-fg/85">
                  Worship with us in person at <strong>{church.meetingPlace}</strong>, {church.address.line1}, {church.address.city}, {church.address.state} {church.address.zip} — or join online.
                </p>
                <BulletinActions urls={urls} variant="light" />
              </div>
              <dl className="space-y-0">
                <DetailRow label="Phone" value={church.phone} />
                <DetailRow label="Email" value={church.email} />
                <DetailRow label="Pastor" value={church.pastor} />
              </dl>
            </div>
            <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 border-t border-line pt-5 text-sm">
              <ArrowLink href="/construction">Building project</ArrowLink>
              <ArrowLink href="/sabbath-school">Sabbath School</ArrowLink>
              <ArrowLink href="/ministries">Ministries</ArrowLink>
              <ArrowLink href="/contact">Contact us</ArrowLink>
            </div>
          </div>
        </Reveal>
      </Section>
    </article>
  );
}
