"use client";
import { useEffect } from "react";

/**
 * Print/Save-as-PDF control for the bulletin print route (§17). The "Download PDF" action opens
 * this print-optimized page; the user saves it as a PDF from the browser's print dialog. Passing
 * ?auto=1 opens the dialog automatically. The rendered content is the immutable published edition,
 * so the output is stable per publish.
 */
export function PrintButton({ auto = false }: { auto?: boolean }) {
  useEffect(() => {
    if (auto) {
      const t = setTimeout(() => window.print(), 400);
      return () => clearTimeout(t);
    }
  }, [auto]);
  return (
    <button type="button" onClick={() => window.print()} className="btn btn-primary">
      Print / Save as PDF
    </button>
  );
}
