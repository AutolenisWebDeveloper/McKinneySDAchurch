import { prisma } from "@/lib/db";
import { currentOfficeWhere, officerRank } from "@/lib/governance";

export const dynamic = "force-dynamic";
export const metadata = { title: "Leadership — McKinney SDA Church" };

export default async function Leadership() {
  const offices = await prisma.churchOffice.findMany({ where: currentOfficeWhere(), include: { member: { select: { firstName: true, lastName: true } } } });
  offices.sort((a, b) => officerRank(a.role) - officerRank(b.role));
  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">Church Leadership</h1>
      {offices.length ? (
        <ul className="divide-y divide-black/10 dark:divide-white/10">
          {offices.map((o) => (
            <li key={o.id} className="py-3 flex justify-between">
              <span className="font-medium">{o.title}</span>
              <span className="text-muted">{o.member.firstName} {o.member.lastName}</span>
            </li>
          ))}
        </ul>
      ) : <p className="text-muted">Leadership will be listed here soon.</p>}
    </div>
  );
}
