import { church } from "@/components/site-info";
import { eventTimeLabel } from "@/lib/bulletin-format";
import type { BulletinView } from "@/lib/bulletin-view";

/**
 * The premium bi-fold print bulletin (§15). One 11×17 landscape sheet, front/back, folded into
 * four 8.5×11 panels: Front Cover · Inside-Left (announcements) · Inside-Right (Sabbath School +
 * Divine Worship) · Back (Connect / Watch / Zoom / Give / Building / contact). Renders the same
 * canonical dataset as the online page, styled for print. QR codes encode canonical URLs.
 */

export type QrItem = { label: string; url: string; svg: string };

function Qr({ svg, className = "" }: { svg: string; className?: string }) {
  if (!svg) return null;
  return <div className={`bp-qr ${className}`} dangerouslySetInnerHTML={{ __html: svg }} />;
}

export function BulletinPrint({
  view, coverQrSvg, backQrs, annQr,
}: {
  view: BulletinView;
  coverQrSvg: string;
  backQrs: QrItem[];
  annQr: Record<string, string>;
}) {
  const dateFull = new Date(view.sabbathDate).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });
  const printAnns = view.categories; // already print-filtered by the view assembler

  return (
    <div className="bp-root">
      {/* ============ SHEET 1 (outside): Back | Front cover ============ */}
      <div className="bp-sheet">
        {/* Back panel */}
        <section className="bp-panel bp-back">
          <h2 className="bp-kicker">Connect with us</h2>
          <div className="bp-connect">
            {backQrs.map((q) => (
              <div key={q.label} className="bp-connect-item">
                <Qr svg={q.svg} />
                <span className="bp-connect-label">{q.label}</span>
              </div>
            ))}
          </div>

          {view.scripture ? (
            <div className="bp-inspiration">
              <p className="bp-inspiration-label">Inspiration</p>
              <p className="bp-inspiration-text">{view.scripture}</p>
            </div>
          ) : null}

          <div className="bp-contact">
            <p className="bp-contact-name">{church.name}</p>
            <p>{church.pastor}</p>
            <p>{church.meetingPlace}, {church.address.line1}</p>
            <p>{church.address.city}, {church.address.state} {church.address.zip}</p>
            <p>{church.phone} · {church.email}</p>
          </div>
        </section>

        {/* Front cover */}
        <section className="bp-panel bp-cover">
          <div className="bp-cover-top">
            <p className="bp-cover-kicker">Seventh-day Adventist Church</p>
            <h1 className="bp-cover-title">McKinney</h1>
            <div className="bp-rule" />
            <p className="bp-cover-date">{dateFull}</p>
          </div>

          <div className="bp-cover-mid">
            <p className="bp-welcome">Welcome Home</p>
            {view.theme ? <p className="bp-theme">{view.theme}</p> : null}
            {view.sermonTitle ? (
              <div className="bp-sermon">
                <p className="bp-sermon-label">Today's Message</p>
                <p className="bp-sermon-title">{view.sermonTitle}</p>
                {view.speaker ? <p className="bp-sermon-meta">{view.speaker}</p> : null}
                {view.scripture ? <p className="bp-sermon-meta">{view.scripture}</p> : null}
              </div>
            ) : null}
          </div>

          <div className="bp-cover-bottom">
            <div className="bp-service">
              {view.sabbathSchoolTime ? <p><strong>Sabbath School</strong> {view.sabbathSchoolTime}</p> : null}
              {view.divineWorshipTime ? <p><strong>Divine Worship</strong> {view.divineWorshipTime}</p> : null}
            </div>
            <div className="bp-cover-qr">
              <Qr svg={coverQrSvg} />
              <span>Read online</span>
            </div>
          </div>
        </section>
      </div>

      {/* ============ SHEET 2 (inside): Announcements | Sabbath School + Worship ============ */}
      <div className="bp-sheet">
        {/* Inside-left: announcements */}
        <section className="bp-panel bp-anns">
          <h2 className="bp-kicker">Announcements</h2>
          {printAnns.length === 0 ? (
            <p className="bp-muted">No announcements this week.</p>
          ) : (
            printAnns.map((cat) => (
              <div key={cat.category} className="bp-ann-cat">
                <h3 className="bp-ann-cat-title">{cat.category}</h3>
                {cat.items.map((a) => (
                  <div key={a.id} className="bp-ann">
                    <div className="bp-ann-body">
                      <p className="bp-ann-title">{a.title}</p>
                      {a.summary ? <p className="bp-ann-summary">{a.summary}</p> : null}
                      {(() => {
                        const when = eventTimeLabel(a.eventStartAt, a.eventEndAt);
                        return when || a.location ? (
                          <p className="bp-ann-meta">{[when, a.location].filter(Boolean).join(" · ")}</p>
                        ) : null;
                      })()}
                    </div>
                    {a.hasExtended && annQr[a.id] ? (
                      <div className="bp-ann-qr">
                        <Qr svg={annQr[a.id]!} />
                        <span>More info</span>
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            ))
          )}
        </section>

        {/* Inside-right: Sabbath School + Divine Worship */}
        <section className="bp-panel bp-worship">
          <h2 className="bp-kicker">Sabbath School</h2>
          <div className="bp-ss">
            {view.sabbathSchoolTime ? <p><strong>{view.sabbathSchoolTime}</strong></p> : null}
            {view.sabbathSchoolLesson ? <p>{view.sabbathSchoolLesson}</p> : null}
            {view.healthNugget ? <p className="bp-muted">Health nugget: {view.healthNugget}</p> : null}
          </div>

          <h2 className="bp-kicker bp-kicker-2">Divine Worship {view.divineWorshipTime ? <span>· {view.divineWorshipTime}</span> : null}</h2>
          <ol className="bp-order">
            {view.order.map((it) => (
              <li key={it.id}>
                <span className="bp-order-title">{it.title}{it.detail ? <span className="bp-order-detail"> — {it.detail}</span> : null}</span>
                {it.participant ? <span className="bp-order-part">{it.participant}</span> : null}
              </li>
            ))}
          </ol>

          {(view.elderOnDuty || view.nurseOnDuty || view.offeringToday || view.sundownTonight) && (
            <div className="bp-duty">
              {view.elderOnDuty ? <p><strong>Elder on duty</strong> {view.elderOnDuty}</p> : null}
              {view.nurseOnDuty ? <p><strong>Nurse on duty</strong> {view.nurseOnDuty}</p> : null}
              {view.offeringToday ? <p><strong>Offering</strong> {view.offeringToday}</p> : null}
              {view.sundownTonight ? <p><strong>Sundown tonight</strong> {view.sundownTonight}</p> : null}
            </div>
          )}

          {(view.nextSabbathSpeaker || view.nextSabbathOffering || view.sundownNext) && (
            <div className="bp-next">
              <p className="bp-next-title">Next Sabbath</p>
              {view.nextSabbathSpeaker ? <p><strong>Speaker</strong> {view.nextSabbathSpeaker}</p> : null}
              {view.nextSabbathOffering ? <p><strong>Offering</strong> {view.nextSabbathOffering}</p> : null}
              {view.sundownNext ? <p><strong>Sundown</strong> {view.sundownNext}</p> : null}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
