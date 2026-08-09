type Address = { street?: string; city?: string; state?: string; zip?: string };

/** JSON-LD for the church (Sabbath worship = Saturday). */
export function churchJsonLd(p: { name: string; url: string; address?: Address; serviceTimes?: Record<string, string> }): Record<string, unknown> {
  const ld: Record<string, unknown> = { "@context": "https://schema.org", "@type": "Church", name: p.name, url: p.url };
  if (p.address) ld.address = { "@type": "PostalAddress", streetAddress: p.address.street, addressLocality: p.address.city, addressRegion: p.address.state, postalCode: p.address.zip };
  if (p.serviceTimes?.divineWorship) ld.openingHours = `Sa ${p.serviceTimes.divineWorship}`;
  return ld;
}

export function eventJsonLd(e: { title: string; startAt: Date; endAt: Date; location?: string | null; url: string }): Record<string, unknown> {
  return {
    "@context": "https://schema.org", "@type": "Event", name: e.title,
    startDate: new Date(e.startAt).toISOString(), endDate: new Date(e.endAt).toISOString(),
    ...(e.location ? { location: { "@type": "Place", name: e.location } } : {}), url: e.url,
  };
}
