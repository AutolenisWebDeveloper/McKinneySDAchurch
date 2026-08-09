import Link from "next/link";
import { Brand } from "./Brand";
import { navGroups } from "./nav";
import { church, addressOneLine } from "./site-info";

const EXT = "noopener noreferrer";

function SocialLink({ href, label, children }: { href: string; label: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel={EXT}
      aria-label={label}
      className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/20 text-white/80 transition-colors hover:border-white/60 hover:text-white"
    >
      {children}
    </a>
  );
}

export function SiteFooter({ livestream, giveUrl }: { livestream: string | null; giveUrl: string | null }) {
  return (
    <footer className="mt-24 bg-denim-800 text-white/80">
      {/* Invitation band */}
      <div className="border-b border-white/10">
        <div className="mx-auto flex max-w-content flex-col items-start gap-6 px-4 py-12 sm:px-6 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="eyebrow text-accent">You’re welcome here</p>
            <h2 className="mt-2 font-serif text-2xl font-semibold text-white sm:text-3xl">
              Join us this Sabbath.
            </h2>
            <p className="mt-2 max-w-xl text-white/70">
              Come as you are. You’ll find a warm welcome, honest worship, and a
              community glad you came.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/plan-a-visit" className="btn btn-white">Plan a Visit</Link>
            {giveUrl && <a href={giveUrl} target="_blank" rel={EXT} className="btn btn-ghost-light">Give</a>}
          </div>
        </div>
      </div>

      {/* Main footer grid */}
      <div className="mx-auto max-w-content px-4 py-14 sm:px-6">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-12">
          {/* Brand + contact */}
          <div className="lg:col-span-4">
            <Brand size="md" inverse />
            <p className="mt-5 max-w-xs text-sm leading-relaxed text-white/70">
              A Christ-centered Adventist family in McKinney, Texas — worshiping,
              growing, and serving together while we build a home of our own.
            </p>
            <address className="mt-5 space-y-1 text-sm not-italic text-white/70">
              <p className="font-medium text-white/90">We currently gather at</p>
              <p>{addressOneLine}</p>
              <p className="pt-2">
                <a href={church.phoneHref} className="hover:text-white">{church.phone}</a>
              </p>
              <p>
                <a href={church.emailHref} className="hover:text-white">{church.email}</a>
              </p>
            </address>
          </div>

          {/* Nav columns */}
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-4 lg:col-span-6">
            {navGroups.map((group) => (
              <nav key={group.label} aria-label={group.label}>
                <p className="eyebrow mb-3 text-white/50">{group.label}</p>
                <ul className="space-y-2">
                  {group.items.map((item) => (
                    <li key={item.href}>
                      <Link href={item.href} className="text-sm text-white/75 transition-colors hover:text-white">
                        {item.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            ))}
          </div>

          {/* Connect */}
          <div className="lg:col-span-2">
            <p className="eyebrow mb-3 text-white/50">Follow along</p>
            <div className="flex gap-2">
              <SocialLink href={church.social.facebook} label="Facebook">
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M22 12a10 10 0 10-11.56 9.88v-6.99H7.9V12h2.54V9.8c0-2.5 1.49-3.89 3.78-3.89 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56V12h2.78l-.44 2.89h-2.34v6.99A10 10 0 0022 12z" /></svg>
              </SocialLink>
              <SocialLink href={church.social.youtube} label="YouTube">
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M23.5 6.2a3 3 0 00-2.12-2.12C19.5 3.55 12 3.55 12 3.55s-7.5 0-9.38.53A3 3 0 00.5 6.2 31 31 0 000 12a31 31 0 00.5 5.8 3 3 0 002.12 2.12c1.88.53 9.38.53 9.38.53s7.5 0 9.38-.53a3 3 0 002.12-2.12A31 31 0 0024 12a31 31 0 00-.5-5.8zM9.6 15.6V8.4l6.2 3.6-6.2 3.6z" /></svg>
              </SocialLink>
              {livestream && (
                <SocialLink href={livestream} label="Livestream">
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><rect x="2" y="7" width="15" height="10" rx="2" /><path d="M22 8.5v7l-5-3.5z" /></svg>
                </SocialLink>
              )}
            </div>
            <p className="mt-5 text-sm text-white/70">
              Watch our services live and catch up on past sermons anytime.
            </p>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-14 flex flex-col gap-4 border-t border-white/10 pt-6 text-xs text-white/55 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} {church.name}. All rights reserved.</p>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <Link href="/beliefs" className="hover:text-white/80">Beliefs</Link>
            <Link href="/church-manual" className="hover:text-white/80">Church Manual</Link>
            <Link href="/accessibility" className="hover:text-white/80">Accessibility</Link>
            <Link href="/privacy" className="hover:text-white/80">Privacy</Link>
            <Link href="/terms" className="hover:text-white/80">Terms</Link>
            <Link href="/contact" className="hover:text-white/80">Contact</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
