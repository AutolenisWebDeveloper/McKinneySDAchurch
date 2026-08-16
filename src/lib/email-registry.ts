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

  // ---- Building Project fundraisers (wired). Members receive these same events in the
  // notification centre; these templates are how a Supporter — who has no portal — is told.
  {
    key: "fundraiser.approved",
    name: "Fundraiser approved",
    category: "Building Project",
    channel: "TRANSACTIONAL",
    wired: true,
    variables: [
      { name: "firstName", description: "Owner's first name" },
      { name: "fundraiserTitle", description: "Fundraiser title" },
      { name: "publicUrl", description: "Public fundraiser page" },
      { name: "manageUrl", description: "One-time link to the manage view" },
      ...COMMON,
    ],
    subject: "Your fundraiser is approved — {{churchName}}",
    htmlBody:
      "<h2>You're live, {{firstName}}</h2>" +
      "<p>“{{fundraiserTitle}}” has been approved and is ready to share.</p>" +
      '<p>Your page: <a href="{{publicUrl}}">{{publicUrl}}</a></p>' +
      '<p><a href="{{manageUrl}}">Open your fundraiser</a> to share it and follow your progress. That link works once and expires in 24 hours — we\'ll send a fresh one whenever you need it.</p>',
  },
  {
    key: "fundraiser.changes_requested",
    name: "Fundraiser needs changes",
    category: "Building Project",
    channel: "TRANSACTIONAL",
    wired: true,
    variables: [
      { name: "firstName", description: "Owner's first name" },
      { name: "fundraiserTitle", description: "Fundraiser title" },
      { name: "note", description: "What needs to change" },
      ...COMMON,
    ],
    subject: "A change is needed before your fundraiser goes live — {{churchName}}",
    htmlBody:
      "<h2>Hello {{firstName}}</h2>" +
      "<p>Before “{{fundraiserTitle}}” can go live, a church administrator has asked for this change:</p>" +
      '<blockquote style="border-left:3px solid #ccc;padding-left:12px;color:#444">{{note}}</blockquote>' +
      "<p>Reply to this email and we'll send you a link to make the change and resubmit.</p>",
  },
  {
    key: "fundraiser.rejected",
    name: "Fundraiser not approved",
    category: "Building Project",
    channel: "TRANSACTIONAL",
    wired: true,
    variables: [
      { name: "firstName", description: "Owner's first name" },
      { name: "fundraiserTitle", description: "Fundraiser title" },
      { name: "note", description: "Reason given" },
      ...COMMON,
    ],
    subject: "About your fundraiser — {{churchName}}",
    htmlBody:
      "<h2>Hello {{firstName}}</h2>" +
      "<p>We weren't able to approve “{{fundraiserTitle}}” for the Building Project.</p>" +
      "<p>{{note}}</p>" +
      "<p>You're still very welcome to give to the Building Project, and you can reply to this email if you'd like to talk it through.</p>",
  },
  {
    key: "fundraiser.milestone",
    name: "Fundraiser milestone reached",
    category: "Building Project",
    channel: "TRANSACTIONAL",
    wired: true,
    variables: [
      { name: "firstName", description: "Owner's first name" },
      { name: "fundraiserTitle", description: "Fundraiser title" },
      { name: "milestone", description: "Milestone percentage reached" },
      { name: "goal", description: "Fundraising goal" },
      { name: "publicUrl", description: "Public fundraiser page" },
      ...COMMON,
    ],
    subject: "You're {{milestone}}% of the way there — {{churchName}}",
    htmlBody:
      "<h2>{{milestone}}% of your goal, {{firstName}}</h2>" +
      "<p>“{{fundraiserTitle}}” has reached {{milestone}}% of {{goal}}. Thank you for the work you're putting in.</p>" +
      '<p>Keep sharing: <a href="{{publicUrl}}">{{publicUrl}}</a></p>',
  },
  {
    key: "fundraiser.goal_reached",
    name: "Fundraiser reached its goal",
    category: "Building Project",
    channel: "TRANSACTIONAL",
    wired: true,
    variables: [
      { name: "firstName", description: "Owner's first name" },
      { name: "fundraiserTitle", description: "Fundraiser title" },
      { name: "goal", description: "Fundraising goal" },
      { name: "publicUrl", description: "Public fundraiser page" },
      ...COMMON,
    ],
    subject: "You reached your fundraising goal — {{churchName}}",
    htmlBody:
      "<h2>You did it, {{firstName}}</h2>" +
      "<p>“{{fundraiserTitle}}” has reached its {{goal}} goal. Thank you for helping build our future home.</p>" +
      '<p>Your page stays open, so anyone who still wants to give can: <a href="{{publicUrl}}">{{publicUrl}}</a></p>',
  },
  {
    key: "fundraiser.referral_start",
    name: "Someone started a fundraiser through your page",
    category: "Building Project",
    channel: "TRANSACTIONAL",
    wired: true,
    variables: [
      { name: "firstName", description: "Owner's first name" },
      { name: "fundraiserTitle", description: "Fundraiser title" },
      { name: "referrerName", description: "Name shown on the new fundraiser" },
      ...COMMON,
    ],
    subject: "Someone started a fundraiser through your page — {{churchName}}",
    htmlBody:
      "<h2>Your page is spreading, {{firstName}}</h2>" +
      "<p>{{referrerName}} started their own Building Project fundraiser after visiting “{{fundraiserTitle}}”.</p>",
  },
  {
    key: "fundraiser.manage_link",
    name: "Fundraiser manage link",
    category: "Building Project",
    channel: "TRANSACTIONAL",
    wired: true,
    variables: [
      { name: "firstName", description: "Owner's first name" },
      { name: "fundraiserTitle", description: "Fundraiser title" },
      { name: "manageUrl", description: "One-time link to the manage view" },
      ...COMMON,
    ],
    subject: "Your link to manage your fundraiser — {{churchName}}",
    htmlBody:
      "<h2>Hello {{firstName}}</h2>" +
      '<p><a href="{{manageUrl}}">Open “{{fundraiserTitle}}”</a>. This link works once and expires in 24 hours.</p>' +
      "<p>If you didn't ask for this, you can ignore this email — nothing changes.</p>",
  },
  {
    key: "fundraiser.submitted",
    name: "Fundraiser submitted for review",
    category: "Building Project",
    channel: "TRANSACTIONAL",
    wired: true,
    variables: [
      { name: "firstName", description: "Owner's first name" },
      { name: "fundraiserTitle", description: "Fundraiser title" },
      ...COMMON,
    ],
    subject: "We received your fundraiser — {{churchName}}",
    htmlBody:
      "<h2>Thanks, {{firstName}}</h2>" +
      "<p>“{{fundraiserTitle}}” has been sent to {{churchName}} for review. We'll email you as soon as it's approved and ready to share.</p>",
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
