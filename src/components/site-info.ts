/**
 * Canonical public contact / identity details for the church, used across the
 * public front-end (header, footer, contact, visit pages). Presentation-only
 * constants — no secrets. Update here to change everywhere.
 */
export const church = {
  name: "McKinney Seventh-day Adventist Church",
  shortName: "McKinney SDA Church",
  pastor: "Pastor Marlon Wallace",
  phone: "(480) 453-2235",
  phoneHref: "tel:+14804532235",
  email: "info@mckinneysdae.org",
  emailHref: "mailto:info@mckinneysdae.org",
  meetingPlace: "The Legacy Church",
  address: {
    line1: "120 Tickey Dr",
    city: "Princeton",
    state: "TX",
    zip: "75407",
  },
  mapsHref:
    "https://www.google.com/maps/search/?api=1&query=120+Tickey+Dr+Princeton+TX+75407",
  giving: "https://adventistgiving.org/donate/ANWFMK",
  website: "mckinneysda.vercel.app",
  mailing: "P.O. Box 1722, McKinney, TX 75070",
  social: {
    facebook:
      "https://www.facebook.com/McKinney-Seventh-day-Adventist-Church-166601966697302",
    youtube: "https://www.youtube.com/channel/UCLtFhKYExYT3XOOa4KzH70A",
    livestream: "https://livestream.com/mckinneysdaenglish",
  },
  // Bulletin back-cover leadership roster (presentation only — the governance record of
  // record is the ChurchOffice model). Update here to change the printed/online bulletin.
  officers: [
    { role: "Pastor", name: "Pr. Marlon Wallace", phone: "(480) 453-2235" },
    { role: "First Elder", name: "Classere Augustin", phone: "(770) 262-5373" },
    { role: "Elder", name: "Adeola Agboola", phone: "(337) 326-9274" },
    { role: "Elder / Treasurer", name: "Anthony Wanyanga", phone: "(901) 216-2882" },
    { role: "Clerk", name: "Hernande Augustin", phone: "(770) 896-5420" },
    { role: "Head Deacon", name: "Abednigo Sibanda", phone: "(770) 510-9094" },
    { role: "Head Deaconess", name: "Rebecca Gizea", phone: "(980) 422-9382" },
  ],
  // Back-cover "Connect" tiles (labels + captions mirror the redesigned bulletin).
  connectTagline: "Connect. Pray. Give. Grow.",
  connectSub: "Everything you need for the week, right from your phone.",
  building: {
    title: "Our Future Home",
    subtitle: "A place built for generations",
    body: "Our building campaign is ongoing. Every contribution brings us closer to a permanent sanctuary for worship, community, and spiritual growth. Give through AdventistGiving and select “Building Fund.”",
  },
} as const;

export const addressOneLine = `${church.meetingPlace}, ${church.address.line1}, ${church.address.city}, ${church.address.state} ${church.address.zip}`;
