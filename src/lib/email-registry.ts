import type { EmailType } from "@prisma/client";

/**
 * Catalog of transactional email templates (§38). Each entry is the CODE DEFAULT; an admin may
 * override subject/body per key (stored in EmailTemplate, rendered via lib/email-render). `wired`
 * marks templates the application currently sends through the template system (editing them has a
 * live effect); the rest are catalog entries ready to be wired as their senders are migrated.
 */

export type TemplateVar = { name: string; description: string };

export type RegistryEntry = {
  key: string;
  name: string;
  category: string;
  channel: EmailType;
  wired: boolean;
  variables: TemplateVar[];
  subject: string;
  htmlBody: string;
  textBody?: string;
};

const COMMON: TemplateVar[] = [{ name: "churchName", description: "The church's name" }];

export const EMAIL_REGISTRY: RegistryEntry[] = [
  // ---- Account lifecycle (wired: Phase 2 account requests) ----
  {
    key: "account.request_received",
    name: "Account request received",
    category: "Account",
    channel: "TRANSACTIONAL",
    wired: true,
    variables: [{ name: "firstName", description: "Requester's first name" }, ...COMMON],
    subject: "We received your account request — {{churchName}}",
    htmlBody:
      "<h2>Thanks, {{firstName}}</h2>" +
      "<p>We received your request for a member account at {{churchName}}. A church administrator will review it and confirm your membership. You'll get an email as soon as your account is ready.</p>",
  },
  {
    key: "account.approved",
    name: "Account approved",
    category: "Account",
    channel: "TRANSACTIONAL",
    wired: true,
    variables: [{ name: "firstName", description: "Member's first name" }, { name: "loginUrl", description: "Sign-in URL" }, ...COMMON],
    subject: "Your account is ready — {{churchName}}",
    htmlBody:
      "<h2>Welcome, {{firstName}}</h2>" +
      "<p>Your member account at {{churchName}} is approved and ready to use.</p>" +
      '<p><a href="{{loginUrl}}">Sign in</a> with the email and password you chose.</p>',
  },
  {
    key: "account.needs_info",
    name: "Account needs more information",
    category: "Account",
    channel: "TRANSACTIONAL",
    wired: true,
    variables: [{ name: "firstName", description: "Member's first name" }, { name: "note", description: "What is needed" }, { name: "contactEmail", description: "Church contact email" }, ...COMMON],
    subject: "A little more information needed — {{churchName}}",
    htmlBody:
      "<h2>Hello {{firstName}}</h2>" +
      "<p>Before we can finish setting up your account, we need a bit more information:</p>" +
      '<blockquote style="border-left:3px solid #ccc;padding-left:12px;color:#444">{{note}}</blockquote>' +
      '<p>Please reply to <a href="mailto:{{contactEmail}}">{{contactEmail}}</a> and we\'ll take it from there.</p>',
  },
  {
    key: "account.rejected",
    name: "Account request declined",
    category: "Account",
    channel: "TRANSACTIONAL",
    wired: true,
    variables: [{ name: "firstName", description: "Member's first name" }, { name: "reason", description: "Optional reason" }, { name: "contactEmail", description: "Church contact email" }, ...COMMON],
    subject: "About your account request — {{churchName}}",
    htmlBody:
      "<h2>Hello {{firstName}}</h2>" +
      "<p>We're sorry, but we weren't able to approve your member account request at this time.</p>" +
      "<p>{{reason}}</p>" +
      '<p>If you believe this is a mistake, please contact <a href="mailto:{{contactEmail}}">{{contactEmail}}</a>.</p>',
  },

  // ---- System ----
  {
    key: "system.test",
    name: "Test email",
    category: "System",
    channel: "TRANSACTIONAL",
    wired: true,
    variables: [{ name: "churchName", description: "The church's name" }, { name: "sentBy", description: "Who triggered the test" }],
    subject: "Test email from {{churchName}}",
    htmlBody: "<h2>It works</h2><p>This is a test of the {{churchName}} email pipeline, sent by {{sentBy}}.</p>",
  },

  // ---- Catalog entries (ready to wire; documented for the admin) ----
  {
    key: "care.received",
    name: "Care request received",
    category: "Care",
    channel: "TRANSACTIONAL",
    wired: false,
    variables: [{ name: "firstName", description: "Requester's first name" }, { name: "reference", description: "Reference code" }, ...COMMON],
    subject: "We received your care request — {{churchName}}",
    htmlBody: "<h2>Thank you, {{firstName}}</h2><p>We've received your care request and a pastor or elder will follow up personally. Reference: <strong>{{reference}}</strong>.</p>",
  },
  {
    key: "transfer.confirm_request",
    name: "Transfer confirmation request",
    category: "Transfer",
    channel: "TRANSACTIONAL",
    wired: false,
    variables: [{ name: "name", description: "Member name" }, { name: "otherChurch", description: "Destination church" }, { name: "confirmUrl", description: "Confirm/decline URL" }, ...COMMON],
    subject: "Please confirm your membership transfer",
    htmlBody: "<h2>Hello {{name}}</h2><p>{{churchName}} has begun a transfer of your membership to <strong>{{otherChurch}}</strong> on your behalf. <a href=\"{{confirmUrl}}\">Confirm or decline</a>.</p>",
  },
  {
    key: "volunteer.received",
    name: "Volunteer application received",
    category: "Volunteer",
    channel: "TRANSACTIONAL",
    wired: true,
    variables: [{ name: "firstName", description: "Applicant's first name" }, { name: "opportunity", description: "Opportunity/area of interest" }, ...COMMON],
    subject: "Thank you for volunteering — {{churchName}}",
    htmlBody: "<h2>Thank you, {{firstName}}</h2><p>We've received your interest in serving with {{opportunity}} at {{churchName}}. A ministry coordinator will follow up with next steps.</p>",
  },
  {
    key: "sponsor.received",
    name: "Sponsorship inquiry received",
    category: "Sponsor",
    channel: "TRANSACTIONAL",
    wired: true,
    variables: [{ name: "firstName", description: "Inquirer's first name" }, ...COMMON],
    subject: "Thank you for your sponsorship interest — {{churchName}}",
    htmlBody: "<h2>Thank you, {{firstName}}</h2><p>We've received your sponsorship inquiry and someone from {{churchName}} will reach out shortly with details.</p>",
  },
  {
    key: "support.received",
    name: "Support request received",
    category: "Support",
    channel: "TRANSACTIONAL",
    wired: true,
    variables: [{ name: "reference", description: "Reference code" }, ...COMMON],
    subject: "We received your support request — {{churchName}}",
    htmlBody: "<h2>Support request received</h2><p>Thanks for letting us know. Our team will look into it. Reference: <strong>{{reference}}</strong>.</p>",
  },
  {
    key: "weekly.request",
    name: "Weekly bulletin request",
    category: "Weekly Communications",
    channel: "TRANSACTIONAL",
    wired: false,
    variables: [{ name: "sabbathDate", description: "Sabbath date" }, { name: "submitUrl", description: "Submission URL" }],
    subject: "This week's bulletin — please send your ministry's items",
    htmlBody: "<h2>Weekly communications for Sabbath {{sabbathDate}}</h2><p>Please submit your ministry's items or mark \"nothing this week\": <a href=\"{{submitUrl}}\">submit</a>.</p>",
  },
];

export const REGISTRY_BY_KEY: Record<string, RegistryEntry> = Object.fromEntries(
  EMAIL_REGISTRY.map((e) => [e.key, e]),
);

export function registryEntry(key: string): RegistryEntry | undefined {
  return REGISTRY_BY_KEY[key];
}

/** Categories in display order. */
export const EMAIL_CATEGORIES = [...new Set(EMAIL_REGISTRY.map((e) => e.category))];
