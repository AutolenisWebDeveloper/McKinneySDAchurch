"use client";

/**
 * Public single-month calendar for McKinney SDA Church.
 *
 * One month at a time, always. All month navigation, filtering, and selection happen on the
 * client over a dataset the server already filtered to APPROVED + PUBLIC events (authorization
 * stays server-side; nothing restricted is ever shipped here). Instants arrive pre-resolved to
 * Central civil days, so this component contains no timezone math and cannot drift from the
 * server render.
 *
 * Accessibility: the grid is a real ARIA grid with roving tabindex and full arrow/Home/End/
 * PageUp/PageDown keyboard support; every icon-only control is labeled; motion is opt-out.
 */

import { useCallback, useEffect, useId, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { Icon } from "@/components/portal/icons";
import {
  addMonths,
  buildMonthGrid,
  CATEGORIES,
  CATEGORY_ORDER,
  expandEventDays,
  monthLabel,
  parseYmd,
  toYmd,
  WEEKDAY_LABELS,
  WEEKDAY_LABELS_FULL,
  type CalendarEvent,
  type CategoryKey,
  type MonthKey,
  type Ymd,
} from "@/lib/calendar";

const EXT = "noopener noreferrer";
const MAX_CHIPS = 3; // desktop chips shown before "+N more"
const MAX_DOTS = 4; // mobile category dots shown before "+N"

/** Shift a civil "YYYY-MM-DD" by a number of days (pure, tz-free). */
function shiftYmd(ymd: Ymd, days: number): Ymd {
  const { year, month1, day } = parseYmd(ymd);
  const d = new Date(Date.UTC(year, month1 - 1, day + days));
  return toYmd(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
}

/** Clamp a day-of-month into a month that may have fewer days. */
function clampDayInMonth({ year, month }: MonthKey, day: number): Ymd {
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return toYmd(year, month + 1, Math.min(day, lastDay));
}

export function MonthCalendar({
  events,
  initialMonth,
  todayYmd,
}: {
  events: CalendarEvent[];
  initialMonth: MonthKey;
  todayYmd: Ymd;
}) {
  const [month, setMonth] = useState<MonthKey>(initialMonth);
  const [selected, setSelected] = useState<Ymd>(todayYmd);
  const [focusYmd, setFocusYmd] = useState<Ymd>(todayYmd);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState<Set<CategoryKey>>(new Set());
  const [isPending, startTransition] = useTransition();

  const gridLabelId = useId();
  const agendaId = useId();
  const dayRefs = useRef<Map<Ymd, HTMLButtonElement>>(new Map());
  const shouldFocus = useRef(false);

  // ---- filtering (category chips + free-text search) -----------------------
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return events.filter((e) => {
      if (active.size && !active.has(e.category)) return false;
      if (!q) return true;
      return (
        e.title.toLowerCase().includes(q) ||
        (e.ministryName?.toLowerCase().includes(q) ?? false) ||
        (e.location?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [events, active, query]);

  // ---- bucket events onto every civil day they cover -----------------------
  const byDay = useMemo(() => {
    const map = new Map<Ymd, CalendarEvent[]>();
    for (const e of filtered) {
      for (const d of expandEventDays(e.startYmd, e.endYmd)) {
        let list = map.get(d);
        if (!list) map.set(d, (list = []));
        list.push(e);
      }
    }
    for (const list of map.values()) {
      list.sort((a, b) => a.startMinutes - b.startMinutes || a.title.localeCompare(b.title));
    }
    return map;
  }, [filtered]);

  const cells = useMemo(() => buildMonthGrid(month, todayYmd), [month, todayYmd]);
  const weeks = useMemo(() => Array.from({ length: 6 }, (_, i) => cells.slice(i * 7, i * 7 + 7)), [cells]);

  // The single day that carries tabindex=0 (must be one of the 42 visible cells).
  const tabbable = useMemo(() => {
    const inGrid = (d: Ymd) => cells.some((c) => c.ymd === d);
    if (inGrid(focusYmd)) return focusYmd;
    if (inGrid(todayYmd)) return todayYmd;
    return cells.find((c) => c.inMonth)?.ymd ?? cells[0]!.ymd;
  }, [cells, focusYmd, todayYmd]);

  useEffect(() => {
    if (!shouldFocus.current) return;
    shouldFocus.current = false;
    dayRefs.current.get(tabbable)?.focus();
  }, [tabbable]);

  const goMonth = useCallback((delta: number) => {
    startTransition(() => setMonth((m) => addMonths(m, delta)));
  }, []);

  const goToday = useCallback(() => {
    startTransition(() => {
      setMonth({ year: parseYmd(todayYmd).year, month: parseYmd(todayYmd).month1 - 1 });
      setSelected(todayYmd);
      setFocusYmd(todayYmd);
    });
  }, [todayYmd]);

  const selectDay = useCallback((ymd: Ymd) => {
    setSelected(ymd);
    setFocusYmd(ymd);
  }, []);

  // Move keyboard focus to a day, switching months if it crosses the boundary.
  const moveFocus = useCallback((ymd: Ymd) => {
    shouldFocus.current = true;
    setFocusYmd(ymd);
    const { year, month1 } = parseYmd(ymd);
    setMonth((m) => (m.year === year && m.month === month1 - 1 ? m : { year, month: month1 - 1 }));
  }, []);

  const onGridKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const from = tabbable;
      let next: Ymd | null = null;
      switch (e.key) {
        case "ArrowLeft": next = shiftYmd(from, -1); break;
        case "ArrowRight": next = shiftYmd(from, 1); break;
        case "ArrowUp": next = shiftYmd(from, -7); break;
        case "ArrowDown": next = shiftYmd(from, 7); break;
        case "Home": next = shiftYmd(from, -parseWeekday(from)); break; // start of week (Sun)
        case "End": next = shiftYmd(from, 6 - parseWeekday(from)); break; // end of week (Sat)
        case "PageUp": next = clampDayInMonth(addMonths(month, -1), parseYmd(from).day); break;
        case "PageDown": next = clampDayInMonth(addMonths(month, 1), parseYmd(from).day); break;
        default: return;
      }
      e.preventDefault();
      if (next) moveFocus(next);
    },
    [tabbable, month, moveFocus],
  );

  const selectedEvents = byDay.get(selected) ?? [];
  const monthHasEvents = cells.some((c) => c.inMonth && (byDay.get(c.ymd)?.length ?? 0) > 0);
  const filtersOn = active.size > 0 || query.trim().length > 0;

  const toggleCategory = (key: CategoryKey) =>
    setActive((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const clearFilters = () => {
    setActive(new Set());
    setQuery("");
  };

  return (
    <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-8 xl:gap-10">
      {/* ---- Calendar column ---- */}
      <div>
        {/* Toolbar: navigation + month/year */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1">
            <NavButton label="Previous month" onClick={() => goMonth(-1)} flip />
            <NavButton label="Next month" onClick={() => goMonth(1)} />
          </div>
          <h2 id={gridLabelId} className="min-w-0 flex-1 font-serif text-xl font-semibold text-fg sm:text-2xl" aria-live="polite">
            {monthLabel(month)}
          </h2>
          <button
            type="button"
            onClick={goToday}
            className="btn btn-outline px-4 py-2 text-sm"
          >
            Today
          </button>
        </div>

        {/* Filter bar: search + category toggles (kept tidy, wraps on mobile) */}
        <div className="mt-4 flex flex-col gap-3 border-t border-line pt-4 sm:flex-row sm:items-center sm:justify-between">
          <label className="relative block w-full sm:max-w-xs">
            <span className="sr-only">Search events</span>
            <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search events"
              className="w-full rounded-full border border-line-strong bg-surface py-2 pl-9 pr-3 text-sm text-fg shadow-sm transition-colors placeholder:text-muted/70 focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/30"
            />
          </label>

          <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Filter by category">
            {CATEGORY_ORDER.map((key) => {
              const cat = CATEGORIES[key];
              const on = active.has(key);
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => toggleCategory(key)}
                  aria-pressed={on}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
                    on
                      ? "border-primary bg-primary/10 text-fg"
                      : "border-line-strong bg-surface text-muted hover:border-line-strong hover:text-fg"
                  }`}
                >
                  <span className={`h-2 w-2 rounded-full ${cat.dotClass}`} aria-hidden="true" />
                  {cat.label.replace(" & Devotion", "")}
                </button>
              );
            })}
            {filtersOn ? (
              <button type="button" onClick={clearFilters} className="rounded-full px-2 py-1 text-xs font-medium text-primary hover:text-primary-hover">
                Clear
              </button>
            ) : null}
          </div>
        </div>

        {/* The month grid */}
        <div
          role="grid"
          aria-labelledby={gridLabelId}
          aria-busy={isPending || undefined}
          onKeyDown={onGridKeyDown}
          className={`mt-4 overflow-hidden rounded-xl border border-line bg-surface transition-opacity motion-reduce:transition-none ${isPending ? "opacity-60" : "opacity-100"}`}
        >
          {/* Weekday header */}
          <div role="row" className="grid grid-cols-7 border-b border-line bg-surface-2">
            {WEEKDAY_LABELS.map((wd, i) => (
              <div key={wd} role="columnheader" className="py-2 text-center text-[0.7rem] font-semibold uppercase tracking-wide text-muted sm:text-xs">
                <abbr title={WEEKDAY_LABELS_FULL[i]} className="no-underline">
                  <span className="sm:hidden" aria-hidden="true">{wd.charAt(0)}</span>
                  <span className="hidden sm:inline">{wd}</span>
                </abbr>
              </div>
            ))}
          </div>

          {/* Weeks */}
          {weeks.map((week, ri) => (
            <div role="row" key={ri} className="grid grid-cols-7">
              {week.map((cell) => {
                const dayEvents = byDay.get(cell.ymd) ?? [];
                const isSelected = cell.ymd === selected;
                return (
                  <DayCell
                    key={cell.ymd}
                    cell={cell}
                    events={dayEvents}
                    isSelected={isSelected}
                    tabbable={cell.ymd === tabbable}
                    onSelect={() => selectDay(cell.ymd)}
                    registerRef={(el) => {
                      if (el) dayRefs.current.set(cell.ymd, el);
                      else dayRefs.current.delete(cell.ymd);
                    }}
                  />
                );
              })}
            </div>
          ))}
        </div>

        {/* Legend + status notices */}
        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted">Categories</span>
          {CATEGORY_ORDER.map((key) => {
            const cat = CATEGORIES[key];
            return (
              <span key={key} className="inline-flex items-center gap-1.5 text-xs text-muted">
                <span className={`h-2.5 w-2.5 rounded-full ${cat.dotClass}`} aria-hidden="true" />
                {cat.label.replace(" & Devotion", "")}
              </span>
            );
          })}
        </div>

        {!monthHasEvents ? (
          <p className="mt-4 rounded-lg border border-dashed border-line-strong px-4 py-3 text-sm text-muted">
            {filtersOn ? (
              <>No events match your filters this month. <button type="button" onClick={clearFilters} className="font-semibold text-primary hover:text-primary-hover">Clear filters</button> or try another month.</>
            ) : (
              <>Nothing is scheduled for {monthLabel(month)} yet. Use the arrows to browse other months.</>
            )}
          </p>
        ) : null}
      </div>

      {/* ---- Agenda side panel (below the grid on mobile/tablet, beside it on desktop) ---- */}
      <aside
        id={agendaId}
        className="mt-8 lg:mt-0 lg:sticky lg:top-24 lg:self-start"
      >
        <DayAgenda ymd={selected} events={selectedEvents} filtersOn={filtersOn} />
      </aside>
    </div>
  );
}

function parseWeekday(ymd: Ymd): number {
  const { year, month1, day } = parseYmd(ymd);
  return new Date(Date.UTC(year, month1 - 1, day)).getUTCDay();
}

// ---------------------------------------------------------------------------
// Day cell
// ---------------------------------------------------------------------------

function DayCell({
  cell,
  events,
  isSelected,
  tabbable,
  onSelect,
  registerRef,
}: {
  cell: { ymd: Ymd; day: number; inMonth: boolean; isToday: boolean };
  events: CalendarEvent[];
  isSelected: boolean;
  tabbable: boolean;
  onSelect: () => void;
  registerRef: (el: HTMLButtonElement | null) => void;
}) {
  const { day, inMonth, isToday, ymd } = cell;
  const parts = parseYmd(ymd);
  const fullDate = new Date(Date.UTC(parts.year, parts.month1 - 1, parts.day)).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
  const label = `${fullDate}${isToday ? ", today" : ""}${
    events.length ? `, ${events.length} event${events.length === 1 ? "" : "s"}` : ", no events"
  }`;

  const overflow = Math.max(0, events.length - MAX_CHIPS);

  return (
    <button
      type="button"
      ref={registerRef}
      role="gridcell"
      aria-selected={isSelected}
      aria-label={label}
      aria-current={isToday ? "date" : undefined}
      tabIndex={tabbable ? 0 : -1}
      onClick={onSelect}
      className={`group relative flex min-h-14 flex-col border-b border-r border-line p-1 text-left transition-colors last:border-r-0 focus:outline-none focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0 sm:min-h-28 sm:p-1.5 ${
      inMonth ? "bg-surface hover:bg-surface-2" : "bg-canvas/60 hover:bg-surface-2"
    } ${isSelected ? "ring-2 ring-inset ring-primary" : ""}`}
    >
      {/* date number */}
      <span
        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold tabular-nums sm:h-7 sm:w-7 sm:text-sm ${
          isToday
            ? "bg-denim-800 text-white dark:bg-denim-500"
            : inMonth
              ? "text-fg"
              : "text-muted/70"
        }`}
      >
        {day}
      </span>

      {/* mobile: category dots */}
      {events.length ? (
        <span className="mt-auto flex flex-wrap items-center gap-1 pt-1 sm:hidden" aria-hidden="true">
          {events.slice(0, MAX_DOTS).map((e, i) => (
            <span key={e.id + i} className={`h-1.5 w-1.5 rounded-full ${CATEGORIES[e.category].dotClass}`} />
          ))}
          {events.length > MAX_DOTS ? <span className="text-[0.6rem] font-semibold text-muted">+{events.length - MAX_DOTS}</span> : null}
        </span>
      ) : null}

      {/* desktop: event chips */}
      <span className="mt-1 hidden flex-col gap-1 sm:flex" aria-hidden="true">
        {events.slice(0, MAX_CHIPS).map((e, i) => {
          const isStart = e.startYmd === ymd;
          const cat = CATEGORIES[e.category];
          return (
            <span
              key={e.id + i}
              title={e.title}
              className={`flex items-center gap-1 rounded px-1 py-0.5 text-[0.7rem] leading-tight text-fg/90 ${
                isSelected ? "bg-surface" : "bg-surface-2"
              } ${e.isFeatured ? "ring-1 ring-gold/50" : ""}`}
            >
              <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${cat.dotClass}`} />
              {isStart && !e.multiDay ? <span className="shrink-0 tabular-nums text-muted">{compactTime(e.timeLabel)}</span> : null}
              <span className="min-w-0 flex-1 truncate">{e.title}</span>
            </span>
          );
        })}
        {overflow > 0 ? <span className="px-1 text-[0.7rem] font-semibold text-primary">+{overflow} more</span> : null}
      </span>
    </button>
  );
}

/** "11:15 AM" → "11:15a" for the tight desktop chip. */
function compactTime(label: string): string {
  return label.replace(":00", "").replace(" AM", "a").replace(" PM", "p");
}

// ---------------------------------------------------------------------------
// Agenda panel — the event-detail experience for the selected date
// ---------------------------------------------------------------------------

function DayAgenda({ ymd, events, filtersOn }: { ymd: Ymd; events: CalendarEvent[]; filtersOn: boolean }) {
  const parts = parseYmd(ymd);
  const heading = new Date(Date.UTC(parts.year, parts.month1 - 1, parts.day)).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });

  return (
    <div className="card p-5">
      <div aria-live="polite">
        <h3 className="font-serif text-lg font-semibold text-fg">{heading}</h3>
        <p className="mt-0.5 text-sm text-muted">
          {events.length ? `${events.length} event${events.length === 1 ? "" : "s"}` : "No events scheduled"}
        </p>
      </div>

      {events.length ? (
        <ul className="mt-4 space-y-4">
          {events.map((e) => {
            const cat = CATEGORIES[e.category];
            const when = e.multiDay
              ? `${e.startLongDate} – ${e.endLongDate}`
              : `${e.timeLabel}`;
            return (
              <li key={e.id} className="border-t border-line pt-4 first:border-0 first:pt-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[0.7rem] font-semibold ${cat.softClass}`}>
                    <Icon name={cat.icon} className="h-3.5 w-3.5" />
                    {cat.label}
                  </span>
                  {e.isFeatured ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-gold/15 px-2 py-0.5 text-[0.7rem] font-semibold text-fg">
                      Featured
                    </span>
                  ) : null}
                  {e.multiDay ? (
                    <span className="inline-flex items-center gap-1 rounded-full border border-line-strong px-2 py-0.5 text-[0.7rem] font-medium text-muted">
                      Multi-day
                    </span>
                  ) : null}
                </div>

                <h4 className="mt-2 font-serif text-base font-semibold leading-snug text-fg">
                  {e.detailUrl ? (
                    <Link href={e.detailUrl} className="hover:text-primary hover:underline">{e.title}</Link>
                  ) : (
                    e.title
                  )}
                </h4>

                <dl className="mt-1.5 space-y-1 text-sm text-muted">
                  <div className="flex items-start gap-2">
                    <Icon name="calendar" className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{when}</span>
                  </div>
                  {e.location ? (
                    <div className="flex items-start gap-2">
                      <Icon name="directory" className="mt-0.5 h-4 w-4 shrink-0" />
                      <span>{e.location}</span>
                    </div>
                  ) : null}
                </dl>

                {e.excerpt ? <p className="mt-2 text-sm leading-relaxed text-muted">{e.excerpt}</p> : null}

                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                  {e.detailUrl ? (
                    <Link href={e.detailUrl} className="font-semibold text-primary hover:text-primary-hover">
                      View details
                    </Link>
                  ) : null}
                  {e.ministrySlug && e.ministryName ? (
                    <Link href={`/ministries/${e.ministrySlug}`} className="font-semibold text-primary hover:text-primary-hover">
                      {e.ministryName}
                    </Link>
                  ) : null}
                  <a className="inline-flex items-center gap-1 font-semibold text-primary hover:text-primary-hover" href={e.googleUrl} target="_blank" rel={EXT}>
                    Add to Google
                  </a>
                  <a className="inline-flex items-center gap-1 font-semibold text-primary hover:text-primary-hover" href={e.icsUrl}>
                    Download .ics
                  </a>
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="mt-4 rounded-lg border border-dashed border-line-strong px-4 py-6 text-center text-sm text-muted">
          {filtersOn ? "No events match your filters on this date." : "Select a date with events, or browse another month."}
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Small labeled icon nav button
// ---------------------------------------------------------------------------

function NavButton({ label, onClick, flip = false }: { label: string; onClick: () => void; flip?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-line-strong bg-surface text-fg shadow-sm transition-colors hover:border-primary hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <Icon name="chevron" className={`h-5 w-5 ${flip ? "rotate-180" : ""}`} />
    </button>
  );
}
