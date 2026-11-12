import React, { useState } from "react";
import type { Worker, WorkerStatus } from "../pages/WorkerDetailsPage"; // type-only import, no circular dependency at runtime

/* ---------- Shared with WorkersPage ---------- */

export const PAGE_SIZE = 25;

/** Pill colour for each worker status (also used by the worker detail page). */
export const STATUS_PILL: Record<WorkerStatus, string> = {
  "Assigned to a project": "info",
  Available: "warn",
  "In preparation": "muted",
  Terminated: "bad",
  "Did not start": "bad",
};

/* ---------- Component ---------- */

interface Props {
  /** All workers that passed the tab, search and filters (the table slices the current page itself). */
  rows: Worker[];
  page: number;
  onPageChange: (page: number) => void;
  compact: boolean;
  /** Show the extra "Pending reason" column (Pending action tab). */
  showPending: boolean;
  onOpenWorker: (id: string) => void;
}

export default function WorkerTable({ rows, page, onPageChange, compact, showPending, onOpenWorker }: Props): React.JSX.Element {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const pages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const current = Math.min(page, pages);
  const start = (current - 1) * PAGE_SIZE;
  const pageRows = rows.slice(start, start + PAGE_SIZE);
  const allChecked = pageRows.length > 0 && pageRows.every((w) => selected.has(w.id));
  const columns = showPending ? 9 : 8;

  const toggle = (id: string) =>
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });

  const toggleAll = () =>
    setSelected((s) => {
      const n = new Set(s);
      pageRows.forEach((w) => (allChecked ? n.delete(w.id) : n.add(w.id)));
      return n;
    });

  return (
    <>
      <style>{css}</style>

      <div className={`wk-scroll${compact ? " is-compact" : ""}`}>
        <table className="sm-table wk-table">
          <thead>
            <tr>
              <th className="wk-check">
                <input type="checkbox" checked={allChecked} onChange={toggleAll} aria-label="Select all" />
              </th>
              <th>Worker</th>
              <th>Worker status</th>
              <th>Project</th>
              <th>Coordinator</th>
              {showPending && <th>Pending reason</th>}
              <th>Accommodation</th>
              <th>Documentation</th>
            </tr>
          </thead>

          <tbody>
            {pageRows.map((w) => (
              <tr key={w.id}>
                <td className="wk-check">
                  <input type="checkbox" checked={selected.has(w.id)} onChange={() => toggle(w.id)} aria-label={`Select ${w.name}`} />
                </td>

                <td>
                  <strong>
                    <button type="button" className="wk-link" onClick={() => onOpenWorker(w.id)}>{w.name}</button>
                    {w.sp !== "Registered" && <span className="wk-sp">SP</span>}
                  </strong>
                  <small>
                    {w.id} · <span className={`sm-pill ${w.sp === "Registered" ? "ok" : "bad"}`}>SP – {w.sp}</span>
                  </small>
                </td>

                <td>
                  <span className={`sm-pill ${STATUS_PILL[w.status]}`}>{w.status}</span>
                  {w.blocked && <span className="sm-pill bad wk-gap">Blocked</span>}
                </td>

                <td>
                  {w.project ?? "—"}
                  {w.intended && <span className="sm-pill muted wk-gap">Intended</span>}
                </td>

                <td>{w.coordinator}</td>

                {showPending && <td>{w.status === "Available" ? "Available" : "In preparation"}</td>}

                <td>{w.accommodation ?? "Not Accommodated"}</td>

                <td>
                  {w.docsMissing
                    ? <span className="sm-pill bad">{w.docsMissing} missing</span>
                    : <span className="sm-pill ok">Complete</span>}
                </td>
              </tr>
            ))}

            {pageRows.length === 0 && (
              <tr><td colSpan={columns} className="wk-none">No workers found.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="wk-foot">
        <span>
          Showing {rows.length === 0 ? 0 : start + 1}–{Math.min(start + PAGE_SIZE, rows.length)} of {rows.length} workers
        </span>
        <span className="wk-pager">
          <button type="button" className="sm-btn sm-btn-outline" disabled={current <= 1} onClick={() => onPageChange(current - 1)}>Previous</button>
          Page {current} of {pages}
          <button type="button" className="sm-btn sm-btn-outline" disabled={current >= pages} onClick={() => onPageChange(current + 1)}>Next</button>
        </span>
      </div>
    </>
  );
}

/* ---------- Styles (theme variables, so light + dark both work) ---------- */
const css = `
.wk-scroll{max-height:560px;overflow:auto;margin:0 12px}
.wk-table{min-width:1050px;font-size:13.5px}
.wk-table thead th{position:sticky;top:0;z-index:1;background:var(--card);white-space:nowrap;padding:8px 12px;font-size:12.5px}
.wk-table td{padding:8px 12px;white-space:nowrap}
.wk-scroll.is-compact .wk-table td{padding-top:4px;padding-bottom:4px}
.wk-table small{display:flex;align-items:center;gap:6px;margin-top:2px;font-size:12px}
.wk-table small .sm-pill{padding:1px 8px;font-size:12px}
.wk-table .sm-pill{font-size:12.5px;padding:2px 10px}

.wk-check{width:40px;padding-left:12px!important}
.wk-check input{width:16px;height:16px;accent-color:var(--green)}

.wk-sp{display:inline-block;margin-left:8px;padding:0 6px;border-radius:5px;background:var(--danger);color:var(--card);font-size:11px;font-weight:700;vertical-align:middle}
.wk-gap{margin-left:6px}
.wk-none{text-align:center;color:var(--muted);padding:32px 0!important}

.sm-app .wk-link{padding:0;text-align:left;color:var(--text);font:inherit;font-weight:inherit;cursor:pointer}
.sm-app .wk-link:hover{color:var(--green)}

.wk-foot{display:flex;justify-content:space-between;align-items:center;padding:10px 16px 0;font-size:13.5px;color:var(--muted)}
.wk-pager{display:flex;align-items:center;gap:8px}
.wk-pager .sm-btn{height:30px;padding:0 12px;font-size:13px}
.wk-pager .sm-btn:disabled{opacity:.5;cursor:default}
`;
