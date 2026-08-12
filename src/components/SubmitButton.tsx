"use client";

import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";

/**
 * Submit button wired to the enclosing <form>'s pending state (React 19 /
 * useFormStatus). While the server action is in flight it disables itself and
 * shows a spinner — this is the platform's duplicate-submission guard and the
 * visible "submitting" state every form is required to have.
 *
 * Must be rendered as a descendant of a <form> that uses a server action.
 */
export function SubmitButton({
  children,
  className = "btn btn-primary",
  pendingLabel,
  fullWidth = false,
}: {
  children: ReactNode;
  className?: string;
  /** Label shown while submitting (defaults to the button's normal children). */
  pendingLabel?: ReactNode;
  fullWidth?: boolean;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className={`${className}${fullWidth ? " w-full" : ""}${pending ? " cursor-progress opacity-90" : ""}`}
    >
      {pending && (
        <svg
          className="h-4 w-4 animate-spin"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.4 0 0 5.4 0 12h4z" />
        </svg>
      )}
      {pending && pendingLabel ? pendingLabel : children}
    </button>
  );
}
