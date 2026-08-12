"use client";
import { useState } from "react";
import { TextField } from "@/components/forms";

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
            <TextField id={`childFullName_${key}`} name="childFullName" label="Full name" maxLength={160} />
            <TextField id={`childBirthDate_${key}`} name="childBirthDate" label="Birth date" type="date" />
            <TextField id={`childBaptismYear_${key}`} name="childBaptismYear" label={<>Baptism year <span className="font-normal text-muted">(if any)</span></>} inputMode="numeric" maxLength={4} placeholder="e.g. 2022" />
            <TextField id={`childJoinedYear_${key}`} name="childJoinedYear" label={<>Year joined McKinney SDA <span className="font-normal text-muted">(if any)</span></>} inputMode="numeric" maxLength={4} />
          </div>
        </div>
      ))}
      <button type="button" onClick={add} className="btn btn-outline">+ Add another child</button>
    </div>
  );
}
