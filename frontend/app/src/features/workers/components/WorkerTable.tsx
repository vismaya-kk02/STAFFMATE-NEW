import React, { useEffect, useRef, useState } from "react";
import type { Worker, WorkerStatus } from "../pages/WorkerDetailsPage"; // type-only import, no circular dependency at runtime

/* ---------- Shared with WorkersPage ---------- */

export const PAGE_SIZE = 25;

/** Same "as of" date as the other pages. */
export const AS_OF = "2026-09-09";

/** Pill colour for each worker status (also used by the worker detail page). */
export const STATUS_PILL: Record<WorkerStatus, string> = {
  "Assigned to a project": "info",
  Available: "warn",
  "In preparation": "muted",
  Terminated: "muted",
  "Did not start": "muted",
};

const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Time stamp of a "01 Sep 2026" style date (0 if the text is not a date). */
const dispTime = (disp: string): number => {
  const m = /^(\d{1,2}) (\w{3}) (\d{4})$/.exec(disp);
  const mi = m ? MON.indexOf(m[2]) : -1;
  return m && mi >= 0 ? Date.UTC(+m[3], mi, +m[1]) : 0;
};

/** Days between a "01 Sep 2026" style date and AS_OF (null if the text is not a date). */
const daysSince = (disp: string): number | null => {
  const t = dispTime(disp);
  return t ? Math.round((Date.parse(AS_OF) - t) / 86400000) : null;
};

/** One reason per worker, in this order: awaiting termination documentation, did-not-start check, in preparation, available. */
export interface PendingInfo { label: string; tone: string; action: string }

export const pendingInfo = (w: Worker): PendingInfo | null => {
  if (w.terminating) {
    return { label: "Awaiting termination documentation", tone: "bad", action: "Upload and verify the Social Insurance deregistration document" };
  }
  if (w.status === "In preparation" && (w.docsMissing ?? 0) === 0) {
    return { label: "Did not start (check)", tone: "warn", action: "Record the closure outcome" };
  }
  if (w.status === "In preparation") {
    return { label: "In preparation", tone: "muted", action: "Complete onboarding and documents" };
  }
  if (w.status === "Available") {
    return {
      label: "Available",
      tone: "warn",
      action: w.ended
        ? "Reassign to a project, or begin termination"
        : w.sp !== "Registered" ? "Verify Social Insurance evidence to activate the assignment" : "Assign the worker to a project",
    };
  }
  return null;
};

/* ---------- Tab layouts ---------- */

type Mode = "default" | "pending" | "prep" | "assigned" | "interest" | "reports" | "accom" | "term" | "dns";

const MODE_BY_TAB: Record<string, Mode> = {
  pending: "pending", prep: "prep", assigned: "assigned", interest: "interest",
  reports: "reports", accom: "accom", term: "term", dns: "dns",
};

/** Columns that come after "Pending action / flags" on each tab. */
const EXTRA_HEADS: Record<Mode, string[]> = {
  default: [],
  pending: ["Reason", "Action needed", "Since"],
  prep: ["Planned arrival", "Planned work start"],
  assigned: ["Assignment start", "Planned end"],
  interest: ["Interested coordinator", "Intended project", "Reason", "Next action"],
  reports: [],
  accom: ["Stay start", "Planned departure"],
  term: ["Effective termination", "Confirmed", "Labour Office record"],
  dns: ["Closed on", "Expected start"],
};

const MIN_WIDTH: Record<Mode, number> = {
  default: 1480, pending: 1750, prep: 1780, assigned: 1780, interest: 2150,
  reports: 1680, accom: 1730, term: 1730, dns: 1450,
};

/** Red "SP" badge next to the name: only while the Social Insurance registration is still open. */
const needsSpBadge = (w: Worker) => w.sp !== "Registered" && w.sp !== "Deregistered";

const spTone = (w: Worker) => (w.sp === "Registered" ? "ok" : w.sp === "Deregistered" ? "muted" : "bad");

/** Reports tab order: interest reports first, then departures; newest first inside each group. */
const reportOrder = (a: Worker, b: Worker) =>
  Number(!!a.report?.departure) - Number(!!b.report?.departure) ||
  dispTime(b.report?.date ?? "") - dispTime(a.report?.date ?? "");

/* ---------- Component ---------- */

/** Extra dated fields the list needs (they live in the worker detail data on the page). */
export interface WorkerListInfo { assignStart: string; arrival: string; workStart: string; stayStart: string }

interface Props {
  /** All workers that passed the tab, search and filters (the table slices the current page itself). */
  rows: Worker[];
  page: number;
  onPageChange: (page: number) => void;
  compact: boolean;
  /** Pending action tab: Accommodation / Documentation are replaced by Reason, Action needed and Since. */
  showPending: boolean;
  /** Current tab key; each of the special tabs has its own extra columns. */
  tabKey: string;
  infoOf: (w: Worker) => WorkerListInfo;
  onOpenWorker: (id: string) => void;
  /** Coordinator reports tab: "Begin termination" on an expected-departure report. */
  onBeginTermination?: (id: string) => void;
  /** Coordinator reports tab: "Acknowledge" on an expected-departure report. */
  onAcknowledge?: (id: string) => void;
}

function Pill({ tone, children }: { tone: string; children: React.ReactNode }): React.JSX.Element {
  return <span className={`sm-pill ${tone}`}>{children}</span>;
}

export default function WorkerTable({
  rows, page, onPageChange, compact, showPending, tabKey, infoOf, onOpenWorker, onBeginTermination, onAcknowledge,
}: Props): React.JSX.Element {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const scrollRef = useRef<HTMLDivElement>(null);
  const headCheck = useRef<HTMLInputElement>(null);

  const mode: Mode = showPending ? "pending" : MODE_BY_TAB[tabKey] ?? "default";
  const showAccDocs = mode !== "pending" && mode !== "interest";
  const extraHeads = EXTRA_HEADS[mode];
  const columns = 6 + (showAccDocs ? 2 : 0) + extraHeads.length;

  const ordered = mode === "reports" ? rows.filter((w) => w.report).sort(reportOrder) : rows;
  const pages = Math.max(1, Math.ceil(ordered.length / PAGE_SIZE));
  const current = Math.min(page, pages);
  const start = (current - 1) * PAGE_SIZE;
  const pageRows = ordered.slice(start, start + PAGE_SIZE);
  const allChecked = pageRows.length > 0 && pageRows.every((w) => selected.has(w.id));
  const someChecked = pageRows.some((w) => selected.has(w.id));

  // back to the top of the table when the page, tab or list changes
  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = 0; }, [current, rows]);
  useEffect(() => { if (headCheck.current) headCheck.current.indeterminate = someChecked && !allChecked; }, [someChecked, allChecked]);

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

  const docsCell = (w: Worker) =>
    w.docsMissing ? <Pill tone="bad">{w.docsMissing} missing</Pill>
    : w.docsExpired ? <Pill tone="bad">{w.docsExpired} expired</Pill>
    : w.docsPending ? <Pill tone="warn">{w.docsPending} pending</Pill>
    : <Pill tone="ok">Complete</Pill>;

  // The interest tab has its own columns for this, so the pill is not repeated there.
  // Reports have their own tab too, so there is no "Report" pill anywhere.
  const hasFlag = (w: Worker) => !!w.coordinatorInterest && mode !== "interest";
  const flagPills = (w: Worker) => (
    <>{hasFlag(w) && <span className="wk-gap"><Pill tone="info">Interest</Pill></span>}</>
  );

  /** The cells after "Pending action / flags", different on every special tab. */
  const extraCells = (w: Worker, reason: PendingInfo | null): React.ReactNode => {
    const info = infoOf(w);
    switch (mode) {
      case "pending": {
        const days = w.pendingSince ? daysSince(w.pendingSince) : null;
        return (
          <>
            <td>{reason && <Pill tone={reason.tone}>{reason.label}</Pill>}</td>
            <td>{reason?.action}</td>
            <td>
              {w.pendingSince ?? "—"}
              {days !== null && days > 0 && ` · ${days} day${days === 1 ? "" : "s"}`}
            </td>
          </>
        );
      }
      case "prep":
        return <><td>{info.arrival}</td><td>{info.workStart}</td></>;
      case "assigned":
        return <><td>{info.assignStart}</td><td>Open-ended</td></>;
      case "interest": {
        const i = w.interest;
        return (
          <>
            <td>
              {i ? <><div>{i.coordinator}</div><small className="wk-sub">{i.date}</small></> : "—"}
            </td>
            <td>{i?.project ?? "—"}</td>
            <td>{i?.reason ?? "—"}</td>
            <td>{i?.next ?? "—"}</td>
          </>
        );
      }
      case "accom":
        return <><td>{info.stayStart}</td><td>Open-ended</td></>;
      case "term":
        return (
          <>
            <td>{w.termEffective ?? "—"}</td>
            <td>{w.termConfirmed ?? "—"}</td>
            <td>{w.labourOffice ?? <Pill tone="warn">Not recorded</Pill>}</td>
          </>
        );
      case "dns":
        return <><td>{w.closedOn ?? "—"}</td><td>{w.expectedStart ?? "—"}</td></>;
      default:
        return null;
    }
  };

  /* ---- Coordinator reports: a different table (no checkboxes, no footer) ---- */
  if (mode === "reports") {
    return (
      <>
        <style>{css}</style>
        <div ref={scrollRef} className={`wk-scroll${compact ? " is-compact" : ""}`}>
          <table className="sm-table wk-table" style={{ minWidth: MIN_WIDTH.reports }}>
            <thead>
              <tr>
                <th>Worker</th>
                <th>Report</th>
                <th>From</th>
                <th>Date</th>
                <th>Details</th>
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {pageRows.map((w) => {
                const r = w.report!;
                return (
                  <tr key={w.id}>
                    <td>
                      <strong>
                        <button type="button" className="wk-link" onClick={() => onOpenWorker(w.id)}>{w.name}</button>
                        {needsSpBadge(w) && <span className="wk-sp">SP</span>}
                      </strong>
                    </td>
                    <td>{r.kind}</td>
                    <td>{r.from}</td>
                    <td>{r.date}</td>
                    <td>{r.details}</td>
                    <td>
                      <div className="wk-act">
                        {r.departure ? (
                          r.acknowledged ? (
                            <Pill tone="muted">Acknowledged</Pill>
                          ) : (
                            <>
                              <button type="button" className="sm-btn sm-btn-primary" onClick={() => onBeginTermination?.(w.id)}>Begin termination</button>
                              <button type="button" className="wk-textbtn" onClick={() => onAcknowledge?.(w.id)}>Acknowledge</button>
                            </>
                          )
                        ) : (
                          <button type="button" className="sm-btn sm-btn-outline" onClick={() => onOpenWorker(w.id)}>Open</button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}

              {pageRows.length === 0 && (
                <tr><td colSpan={6} className="wk-none">No workers found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </>
    );
  }

  return (
    <>
      <style>{css}</style>

      <div ref={scrollRef} className={`wk-scroll${compact ? " is-compact" : ""}`}>
        <table className="sm-table wk-table" style={{ minWidth: MIN_WIDTH[mode] }}>
          <thead>
            <tr>
              <th className="wk-check">
                <input ref={headCheck} type="checkbox" checked={allChecked} onChange={toggleAll} aria-label="Select all" />
              </th>
              <th>Worker</th>
              <th>Worker status</th>
              <th>Project</th>
              <th>Coordinator</th>
              {showAccDocs && <th>Accommodation</th>}
              {showAccDocs && <th>Documentation</th>}
              <th>Pending action / flags</th>
              {extraHeads.map((h) => <th key={h}>{h}</th>)}
            </tr>
          </thead>

          <tbody>
            {pageRows.map((w) => {
              const reason = pendingInfo(w);
              return (
                <tr key={w.id} className={selected.has(w.id) ? "is-selected" : ""}>
                  <td className="wk-check">
                    <input type="checkbox" checked={selected.has(w.id)} onChange={() => toggle(w.id)} aria-label={`Select ${w.name}`} />
                  </td>

                  <td className="wk-worker">
                    <strong>
                      <button type="button" className="wk-link" onClick={() => onOpenWorker(w.id)}>{w.name}</button>
                      {needsSpBadge(w) && <span className="wk-sp">SP</span>}
                    </strong>
                    <small>
                      {w.id} · <span className={`sm-pill ${spTone(w)}`}>SP – {w.sp}</span>
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

                  {showAccDocs && <td>{w.accommodation ?? "Not Accommodated"}</td>}
                  {showAccDocs && <td>{docsCell(w)}</td>}

                  {/* Pending tab: flags only (the reason has its own column). Other tabs: reason + flags. */}
                  <td>
                    {mode === "pending" ? (
                      <><span className="wk-dash">—</span>{flagPills(w)}</>
                    ) : reason || hasFlag(w) ? (
                      <>
                        {reason && <Pill tone={reason.tone}>{reason.label}</Pill>}
                        {flagPills(w)}
                      </>
                    ) : "—"}
                  </td>

                  {extraCells(w, reason)}
                </tr>
              );
            })}

            {pageRows.length === 0 && (
              <tr><td colSpan={columns} className="wk-none">No workers found.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="wk-foot">
        <span>
          Showing {ordered.length === 0 ? 0 : start + 1}–{Math.min(start + PAGE_SIZE, ordered.length)} of {ordered.length} {ordered.length === 1 ? "worker" : "workers"}
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
/* scrolls both ways; the header row stays visible */
.wk-scroll{max-height:560px;overflow:auto;margin:0 12px;scrollbar-width:thin;scrollbar-color:var(--line) transparent}
.wk-scroll::-webkit-scrollbar{width:10px;height:10px}
.wk-scroll::-webkit-scrollbar-track{background:transparent}
.wk-scroll::-webkit-scrollbar-thumb{background:var(--line);border-radius:999px;border:2px solid transparent;background-clip:padding-box}

.wk-table{font-size:13.5px}
.wk-table thead th{position:sticky;top:0;z-index:2;background:var(--card);white-space:nowrap;padding:8px 12px;font-size:12.5px}
.wk-table td{padding:8px 12px;white-space:nowrap;vertical-align:middle}
.wk-table tbody tr:hover{background:var(--hover-soft)}
.wk-table tbody tr.is-selected{background:var(--green-soft)}
.wk-scroll.is-compact .wk-table td{padding-top:4px;padding-bottom:4px}
.wk-worker{min-width:400px}
.wk-table small{display:flex;align-items:center;gap:6px;margin-top:2px;font-size:12px}
.wk-table small .sm-pill{padding:1px 8px;font-size:12px}
.wk-table .sm-pill{font-size:12.5px;padding:2px 10px}
.wk-table .wk-sub{display:block;color:var(--muted)}

/* small dot in each pill's own colour */
.wk-table .sm-pill::before{content:"";display:inline-block;width:6px;height:6px;border-radius:50%;background:currentColor;margin-right:6px;vertical-align:middle}

.wk-check{width:40px;padding-left:12px!important}
.wk-check input{width:16px;height:16px;accent-color:var(--green)}

.wk-sp{display:inline-block;margin-left:8px;padding:0 6px;border-radius:5px;background:var(--danger);color:var(--card);font-size:11px;font-weight:700;vertical-align:middle}
.wk-gap{margin-left:6px}
.wk-dash{margin-right:2px}
.wk-none{text-align:center;color:var(--muted);padding:32px 0!important}

.sm-app .wk-link{padding:0;text-align:left;color:var(--text);font:inherit;font-weight:inherit;cursor:pointer}
.sm-app .wk-link:hover{color:var(--green)}

/* Coordinator reports: row actions */
.wk-act{display:flex;align-items:center;gap:16px}
.wk-table .wk-act .sm-btn{height:32px;padding:0 14px;font-size:13.5px}
.sm-app .wk-textbtn{padding:0;background:none;color:var(--green);font:inherit;font-size:13.5px;font-weight:500;cursor:pointer}
.sm-app .wk-textbtn:hover{text-decoration:underline}

.wk-foot{display:flex;justify-content:space-between;align-items:center;padding:10px 16px 0;font-size:13.5px;color:var(--muted)}
.wk-pager{display:flex;align-items:center;gap:8px}
.wk-pager .sm-btn{height:30px;padding:0 12px;font-size:13px}
.wk-pager .sm-btn:disabled{opacity:.5;cursor:default}
`;
