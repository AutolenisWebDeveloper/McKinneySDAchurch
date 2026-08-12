"use client";
import { useEffect } from "react";

/**
 * Progressive enhancement for deep-linked announcements (§4). When the URL carries a #slug that
 * targets a collapsed <details> announcement, open it and scroll it into view. Without JS the
 * anchor still jumps to the element (it just stays collapsed), so this only enriches, never gates.
 */
export function HashOpener() {
  useEffect(() => {
    const open = () => {
      const id = decodeURIComponent(window.location.hash.replace(/^#/, ""));
      if (!id) return;
      const el = document.getElementById(id);
      if (el instanceof HTMLDetailsElement) {
        el.open = true;
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    };
    open();
    window.addEventListener("hashchange", open);
    return () => window.removeEventListener("hashchange", open);
  }, []);
  return null;
}
