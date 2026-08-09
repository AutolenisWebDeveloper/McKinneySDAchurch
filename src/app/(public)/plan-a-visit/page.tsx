import Link from "next/link";
import { getServiceTimes } from "@/lib/site";
export const dynamic = "force-dynamic";
export const metadata = { title: "Plan Your Visit — McKinney SDA Church" };
export default async function PlanAVisit() {
  const times = await getServiceTimes();
  return (
    <div className="max-w-2xl space-y-4">
      <h1 className="text-2xl font-bold">Plan Your Visit</h1>
      <p>We'd love to welcome you this Sabbath (Saturday). Come as you are — you'll find a friendly welcome team, classes for all ages, and children's programs.</p>
      {times ? (
        <ul className="text-sm">
          {times.sabbathSchool ? <li>Sabbath School — Sat {times.sabbathSchool}</li> : null}
          {times.divineWorship ? <li>Divine Worship — Sat {times.divineWorship}</li> : null}
          {times.prayerMeeting ? <li>Prayer Meeting — {times.prayerMeeting}</li> : null}
        </ul>
      ) : null}
      <Link href="/visitor/new" className="inline-block rounded bg-sda-navy text-white px-4 py-2">Let us know you're coming</Link>
    </div>
  );
}
