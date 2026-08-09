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
  social: {
    facebook:
      "https://www.facebook.com/McKinney-Seventh-day-Adventist-Church-166601966697302",
    youtube: "https://www.youtube.com/channel/UCLtFhKYExYT3XOOa4KzH70A",
    livestream: "https://livestream.com/mckinneysdaenglish",
  },
} as const;

export const addressOneLine = `${church.meetingPlace}, ${church.address.line1}, ${church.address.city}, ${church.address.state} ${church.address.zip}`;
