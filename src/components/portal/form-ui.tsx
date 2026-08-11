"use client";

import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";

/**
 * Standardized administrative form system (§ Consistent Forms).
 *
 * Every control is accessible by construction: a real <label htmlFor>, a required indicator
 * exposed to assistive tech, contextual help wired via aria-describedby, and validation errors
 * announced with role="alert" and aria-invalid. Long forms group into FormSections (no
 * enormous single-column forms), submit with live pending feedback, protect against navigating
 * away with unsaved edits, and pin their Save control with StickyActions.
 *
 * Deliberately NO autosave: these member/household mutations are audited, sensitive, and have
 * real concurrency/uniqueness constraints, so saving stays an explicit, confirmed action.
 *
 * This is a client module because SubmitButton (useFormStatus) and UnsavedGuard need the
 * browser; the presentational parts still render fine inside Server-Component forms.
 */

const CONTROL_BASE =
  "w-full rounded-lg bg-surface px-3.5 py-2.5 text-fg shadow-sm transition-colors placeholder:text-muted/70 focus:outline-none focus:ring-2";
const CONTROL_OK = "border border-line-strong focus:border-primary focus:ring-ring/30";
const CONTROL_ERR = "border border-accent-strong focus:border-accent-strong focus:ring-accent/30";

export function controlClass(hasError?: boolean): string {
  return `${CONTROL_BASE} ${hasError ? CONTROL_ERR : CONTROL_OK}`;
}

function ids(name: string) {
  return { hintId: `${name}-hint`, errorId: `${name}-error` };
}
function describedBy(name: string, hint?: ReactNode, error?: ReactNode): string | undefined {
  const { hintId, errorId } = ids(name);
  return [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(" ") || undefined;
}

/* --------------------------------------------------------------- layout */

export function FormSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-4 border-t border-line pt-5 first:border-t-0 first:pt-0">
      <div>
        <h3 className="text-sm font-semibold text-fg">{title}</h3>
        {description && <p className="mt-0.5 text-xs text-muted">{description}</p>}
      </div>
      {children}
    </section>
  );
}

export function FormGrid({ children, cols = 2 }: { children: ReactNode; cols?: 1 | 2 | 3 }) {
  const cls = cols === 3 ? "sm:grid-cols-3" : cols === 2 ? "sm:grid-cols-2" : "";
  return <div className={`grid gap-4 ${cls}`}>{children}</div>;
}

/* --------------------------------------------------------------- labels + errors */

function Label({ htmlFor, children, required }: { htmlFor: string; children: ReactNode; required?: boolean }) {
  return (
    <label htmlFor={htmlFor} className="block text-sm font-medium text-fg">
      {children}
      {required && (
        <>
          <span aria-hidden="true" className="ml-0.5 text-accent-strong">*</span>
          <span className="sr-only"> (required)</span>
        </>
      )}
    </label>
  );
}

export function FieldHint({ id, children }: { id: string; children: ReactNode }) {
  return (
    <p id={id} className="mt-1 text-xs text-muted">
      {children}
    </p>
  );
}

export function FieldError({ id, children }: { id: string; children: ReactNode }) {
  return (
    <p id={id} role="alert" className="mt-1 text-xs font-medium text-accent-strong">
      {children}
    </p>
  );
}

/* --------------------------------------------------------------- controls */

type BaseProps = {
  name: string;
  label: string;
  hint?: ReactNode;
  error?: ReactNode;
  required?: boolean;
  className?: string;
};

export function Field({
  name,
  label,
  hint,
  error,
  required,
  className = "",
  type = "text",
  defaultValue,
  placeholder,
  autoComplete,
  inputMode,
  maxLength,
}: BaseProps & {
  type?: string;
  defaultValue?: string | number;
  placeholder?: string;
  autoComplete?: string;
  inputMode?: "text" | "numeric" | "tel" | "email";
  maxLength?: number;
}) {
  const { hintId, errorId } = ids(name);
  return (
    <div className={className}>
      <Label htmlFor={name} required={required}>{label}</Label>
      <input
        id={name}
        name={name}
        type={type}
        defaultValue={defaultValue}
        placeholder={placeholder}
        autoComplete={autoComplete}
        inputMode={inputMode}
        maxLength={maxLength}
        required={required}
        aria-required={required || undefined}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(name, hint, error)}
        className={`mt-1 ${controlClass(!!error)}`}
      />
      {hint && <FieldHint id={hintId}>{hint}</FieldHint>}
      {error && <FieldError id={errorId}>{error}</FieldError>}
    </div>
  );
}

export function TextareaField({
  name,
  label,
  hint,
  error,
  required,
  className = "",
  defaultValue,
  rows = 3,
  maxLength,
}: BaseProps & { defaultValue?: string; rows?: number; maxLength?: number }) {
  const { hintId, errorId } = ids(name);
  return (
    <div className={className}>
      <Label htmlFor={name} required={required}>{label}</Label>
      <textarea
        id={name}
        name={name}
        rows={rows}
        maxLength={maxLength}
        defaultValue={defaultValue}
        required={required}
        aria-required={required || undefined}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(name, hint, error)}
        className={`mt-1 ${controlClass(!!error)}`}
      />
      {hint && <FieldHint id={hintId}>{hint}</FieldHint>}
      {error && <FieldError id={errorId}>{error}</FieldError>}
    </div>
  );
}

export function SelectField({
  name,
  label,
  hint,
  error,
  required,
  className = "",
  defaultValue,
  options,
}: BaseProps & { defaultValue?: string; options: { value: string; label: string }[] }) {
  const { hintId, errorId } = ids(name);
  return (
    <div className={className}>
      <Label htmlFor={name} required={required}>{label}</Label>
      <select
        id={name}
        name={name}
        defaultValue={defaultValue}
        required={required}
        aria-required={required || undefined}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(name, hint, error)}
        className={`mt-1 ${controlClass(!!error)}`}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {hint && <FieldHint id={hintId}>{hint}</FieldHint>}
      {error && <FieldError id={errorId}>{error}</FieldError>}
    </div>
  );
}

export function CheckboxField({
  name,
  label,
  hint,
  defaultChecked,
}: {
  name: string;
  label: ReactNode;
  hint?: ReactNode;
  defaultChecked?: boolean;
}) {
  const { hintId } = ids(name);
  return (
    <div>
      <label className="flex items-start gap-2.5 text-sm text-fg">
        <input
          type="checkbox"
          name={name}
          defaultChecked={defaultChecked}
          aria-describedby={hint ? hintId : undefined}
          className="mt-0.5 h-4 w-4 rounded border-line-strong text-primary focus:ring-ring/30"
        />
        <span>{label}</span>
      </label>
      {hint && (
        <p id={hintId} className="ml-7 mt-1 text-xs text-muted">
          {hint}
        </p>
      )}
    </div>
  );
}

/* --------------------------------------------------------------- actions */

/**
 * Submit button with live pending feedback (disabled + spinner) so a save is never ambiguous.
 * Pending is driven by the enclosing form's own submit event — which only fires once the form
 * passes HTML5 validation — and resets on bfcache restore, so it never sticks after a failed
 * client-side validation or a back-navigation.
 */
export function SubmitButton({ children = "Save changes", className = "btn btn-primary" }: { children?: ReactNode; className?: string }) {
  const ref = useRef<HTMLButtonElement>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    const form = ref.current?.closest("form");
    if (!form) return;
    const onSubmit = () => setPending(true);
    const onPageShow = () => setPending(false);
    form.addEventListener("submit", onSubmit);
    window.addEventListener("pageshow", onPageShow);
    return () => {
      form.removeEventListener("submit", onSubmit);
      window.removeEventListener("pageshow", onPageShow);
    };
  }, []);

  return (
    <button ref={ref} type="submit" disabled={pending} className={`${className} disabled:opacity-70`} aria-busy={pending || undefined}>
      {pending && (
        <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" className="opacity-25" />
          <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        </svg>
      )}
      {pending ? "Saving…" : children}
    </button>
  );
}

/** Sticky footer that pins Save/Cancel to the viewport bottom on long forms. */
export function StickyActions({ children }: { children: ReactNode }) {
  return (
    <div className="sticky bottom-0 z-10 mt-4 flex flex-wrap items-center justify-end gap-3 border-t border-line bg-surface/95 py-3 backdrop-blur">
      {children}
    </div>
  );
}

/**
 * In-form sentinel that warns before leaving with unsaved edits. It attaches to its parent
 * form, marks dirty on the first input/change, arms `beforeunload`, and disarms on submit. It
 * also surfaces a visible "Unsaved changes" indicator (aria-live) so the state is never hidden.
 */
export function UnsavedGuard() {
  const ref = useRef<HTMLSpanElement>(null);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    const form = ref.current?.closest("form");
    if (!form) return;
    const mark = () => setDirty(true);
    const clear = () => setDirty(false);
    form.addEventListener("input", mark);
    form.addEventListener("change", mark);
    form.addEventListener("submit", clear);
    return () => {
      form.removeEventListener("input", mark);
      form.removeEventListener("change", mark);
      form.removeEventListener("submit", clear);
    };
  }, []);

  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  return (
    <span ref={ref} aria-live="polite" className={`mr-auto text-xs ${dirty ? "text-accent-strong" : "sr-only"}`}>
      {dirty ? "Unsaved changes" : "No unsaved changes"}
    </span>
  );
}
