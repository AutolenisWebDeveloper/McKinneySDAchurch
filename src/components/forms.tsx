import type { ReactNode, SelectHTMLAttributes, InputHTMLAttributes, TextareaHTMLAttributes } from "react";
import { fieldClass, labelClass, FormError, Honeypot } from "./page-ui";
import { SubmitButton } from "./SubmitButton";

/**
 * Shared, accessible form primitives for the McKinney SDA platform.
 *
 * This is a CONSOLIDATION of the label + `fieldClass` markup that was
 * hand-rolled across ~30 forms — not a parallel design system. Controls render
 * the exact same tokenised `fieldClass`/`labelClass` styling; the wrappers add
 * the accessibility affordances every form is supposed to have but repeated
 * unevenly: a persistent label, an explicit required/optional indicator, hint
 * text wired via `aria-describedby`, and inline field errors via
 * `aria-invalid` + `aria-describedby`.
 *
 * All extra props are forwarded to the native control, so existing behaviour
 * (`name`, `required`, `maxLength`, `autoComplete`, `pattern`, `inputMode`,
 * `defaultValue`, …) is preserved exactly. Field `name`s never change.
 *
 * Server-safe (no client hooks) so pages stay Server Components; the only
 * client island is `SubmitButton`, re-exported here for a single import point.
 */

export { fieldClass, labelClass, FormError, Honeypot, SubmitButton };

/* --------------------------------------------------------------- label */

function RequiredMark() {
  return (
    <>
      <span aria-hidden="true" className="ml-0.5 text-accent-strong">*</span>
      <span className="sr-only"> (required)</span>
    </>
  );
}

function OptionalMark() {
  return <span className="ml-1 font-normal text-muted">(optional)</span>;
}

/** A field label with a consistent required (*) / optional indicator. */
export function FieldLabel({
  htmlFor,
  children,
  required,
  optional,
  className = "",
}: {
  htmlFor: string;
  children: ReactNode;
  required?: boolean;
  optional?: boolean;
  className?: string;
}) {
  return (
    <label htmlFor={htmlFor} className={`${labelClass} mb-1 ${className}`}>
      {children}
      {required ? <RequiredMark /> : optional ? <OptionalMark /> : null}
    </label>
  );
}

/* --------------------------------------------------------------- field shell */

type FieldShellProps = {
  id: string;
  label: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  required?: boolean;
  optional?: boolean;
  className?: string;
  children: (a11y: { id: string; "aria-describedby"?: string; "aria-invalid"?: true }) => ReactNode;
};

/** Internal: renders label + control + hint/error and wires the a11y ids. */
function FieldShell({ id, label, hint, error, required, optional, className = "", children }: FieldShellProps) {
  const hintId = hint ? `${id}-hint` : undefined;
  const errId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errId].filter(Boolean).join(" ") || undefined;
  return (
    <div className={className}>
      <FieldLabel htmlFor={id} required={required} optional={optional}>
        {label}
      </FieldLabel>
      {children({ id, "aria-describedby": describedBy, "aria-invalid": error ? true : undefined })}
      {hint && (
        <p id={hintId} className="mt-1 text-xs text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={errId} role="alert" className="mt-1 text-xs font-medium text-accent-strong">
          {error}
        </p>
      )}
    </div>
  );
}

/* --------------------------------------------------------------- controls */

type BaseFieldProps = {
  label: ReactNode;
  name: string;
  id?: string;
  hint?: ReactNode;
  error?: ReactNode;
  optional?: boolean;
  wrapClassName?: string;
};

export function TextField({
  label,
  name,
  id,
  hint,
  error,
  optional,
  wrapClassName,
  className = "",
  required,
  ...rest
}: BaseFieldProps & Omit<InputHTMLAttributes<HTMLInputElement>, "name" | "id">) {
  const fid = id ?? name;
  return (
    <FieldShell id={fid} label={label} hint={hint} error={error} required={required} optional={optional} className={wrapClassName}>
      {(a11y) => <input name={name} required={required} className={`${fieldClass} ${className}`} {...a11y} {...rest} />}
    </FieldShell>
  );
}

export function TextareaField({
  label,
  name,
  id,
  hint,
  error,
  optional,
  wrapClassName,
  className = "",
  required,
  rows = 5,
  ...rest
}: BaseFieldProps & Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "name" | "id">) {
  const fid = id ?? name;
  return (
    <FieldShell id={fid} label={label} hint={hint} error={error} required={required} optional={optional} className={wrapClassName}>
      {(a11y) => <textarea name={name} required={required} rows={rows} className={`${fieldClass} ${className}`} {...a11y} {...rest} />}
    </FieldShell>
  );
}

export type SelectOption = { value: string; label: string };

export function SelectField({
  label,
  name,
  id,
  hint,
  error,
  optional,
  wrapClassName,
  className = "",
  required,
  options,
  children,
  ...rest
}: BaseFieldProps &
  Omit<SelectHTMLAttributes<HTMLSelectElement>, "name" | "id"> & {
    /** Convenience: pass a flat option list, or provide <option> children directly. */
    options?: readonly (SelectOption | string)[];
  }) {
  const fid = id ?? name;
  return (
    <FieldShell id={fid} label={label} hint={hint} error={error} required={required} optional={optional} className={wrapClassName}>
      {(a11y) => (
        <select name={name} required={required} className={`${fieldClass} ${className}`} {...a11y} {...rest}>
          {options
            ? options.map((o) => {
                const value = typeof o === "string" ? o : o.value;
                const text = typeof o === "string" ? o : o.label;
                return (
                  <option key={value} value={value}>
                    {text}
                  </option>
                );
              })
            : children}
        </select>
      )}
    </FieldShell>
  );
}

/** Checkbox with the label to the right (the correct pattern for a boolean). */
export function CheckboxField({
  label,
  name,
  id,
  hint,
  className = "",
  wrapClassName = "",
  ...rest
}: {
  label: ReactNode;
  name: string;
  id?: string;
  hint?: ReactNode;
  wrapClassName?: string;
} & Omit<InputHTMLAttributes<HTMLInputElement>, "name" | "id" | "type">) {
  const fid = id ?? name;
  const hintId = hint ? `${fid}-hint` : undefined;
  return (
    <div className={wrapClassName}>
      <div className="flex items-start gap-2.5">
        <input
          id={fid}
          name={name}
          type="checkbox"
          aria-describedby={hintId}
          className={`mt-0.5 h-4 w-4 shrink-0 rounded border-line-strong text-primary focus:ring-2 focus:ring-ring/40 ${className}`}
          {...rest}
        />
        <label htmlFor={fid} className="text-sm text-fg">
          {label}
        </label>
      </div>
      {hint && (
        <p id={hintId} className="mt-1 pl-[1.625rem] text-xs text-muted">
          {hint}
        </p>
      )}
    </div>
  );
}

/* --------------------------------------------------------------- layout */

/** Responsive row that lays out fields in equal columns (stacks on mobile). */
export function FormRow({ children, cols = 2 }: { children: ReactNode; cols?: 2 | 3 }) {
  const grid = cols === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2";
  return <div className={`grid gap-4 ${grid}`}>{children}</div>;
}

/** A titled section within a longer form (renders a fieldset/legend). */
export function Fieldset({
  legend,
  description,
  children,
  className = "",
}: {
  legend: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <fieldset className={`space-y-4 ${className}`}>
      <legend className="w-full">
        <span className="block font-serif text-base font-semibold text-fg">{legend}</span>
        {description && <span className="mt-0.5 block text-sm text-muted">{description}</span>}
      </legend>
      {children}
    </fieldset>
  );
}

/** The action row at the foot of a form (primary + optional secondary). */
export function FormActions({
  children,
  align = "start",
  className = "",
}: {
  children: ReactNode;
  align?: "start" | "end" | "between";
  className?: string;
}) {
  const justify = align === "end" ? "sm:justify-end" : align === "between" ? "sm:justify-between" : "sm:justify-start";
  return (
    <div className={`flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:items-center ${justify} ${className}`}>
      {children}
    </div>
  );
}
