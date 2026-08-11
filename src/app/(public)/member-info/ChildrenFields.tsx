"use client";
import { useState } from "react";
import { fieldClass, labelClass } from "@/components/page-ui";

/**
 * Repeatable child rows. Each row renders the same four inputs, so the server
 * receives parallel `getAll()` arrays it can zip by index. Starts with one row.
 */
export function ChildrenFields() {
  const [rows, setRows] = useState<number[]>([0]);
  const [next, setNext] = useState(1);

  const add = () => {
    setRows((r) => [...r, next]);
    setNext((n) => n + 1);
  };
  const remove = (key: number) => setRows((r) => (r.length > 1 ? r.filter((k) => k !== key) : r));

  return (
    <div className="space-y-4">
      {rows.map((key, idx) => (
        <div key={key} className="rounded-xl border border-line p-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm font-semibold text-fg">Child {idx + 1}</span>
            {rows.length > 1 ? (
              <button type="button" onClick={() => remove(key)} className="text-xs font-medium text-muted transition-colors hover:text-accent-strong">
                Remove
              </button>
            ) : null}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className={labelClass}>Full name</label>
              <input name="childFullName" maxLength={160} className={`mt-1 ${fieldClass}`} />
            </div>
            <div>
              <label className={labelClass}>Birth date</label>
              <input name="childBirthDate" type="date" className={`mt-1 ${fieldClass}`} />
            </div>
            <div>
              <label className={labelClass}>Baptism year <span className="font-normal text-muted">(if any)</span></label>
              <input name="childBaptismYear" inputMode="numeric" maxLength={4} placeholder="e.g. 2022" className={`mt-1 ${fieldClass}`} />
            </div>
            <div>
              <label className={labelClass}>Year joined McKinney SDA <span className="font-normal text-muted">(if any)</span></label>
              <input name="childJoinedYear" inputMode="numeric" maxLength={4} className={`mt-1 ${fieldClass}`} />
            </div>
          </div>
        </div>
      ))}
      <button type="button" onClick={add} className="btn btn-outline">+ Add another child</button>
    </div>
  );
}
