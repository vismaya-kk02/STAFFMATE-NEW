import React from "react";
import { ChevronDown } from "lucide-react";
import type { SpState, Worker } from "../pages/WorkerDetailsPage"; // type-only import, no circular dependency at runtime

/* ---------- Filter model (shared with WorkersPage) ---------- */

export const ANY = "Any";

export interface Filters {
  project: string;
  coordinator: string;
  sp: string;
  reason: string;
  nationality: string;
}

export const NO_FILTERS: Filters = { project: ANY, coordinator: ANY, sp: ANY, reason: ANY, nationality: ANY };

export const SP_OPTIONS: SpState[] = ["Registered", "No evidence", "Uploaded, awaiting verification"];
export const REASON_OPTIONS = ["Awaiting termination documentation", "Did-not-start check", "In preparation", "Available"];

/** The single pending-action reason a worker has (null = not in Pending action). */
export const pendingReason = (w: Worker): string | null =>
  w.status === "Available" ? "Available"
  : w.status === "In preparation" ? "In preparation"
  : w.status === "Did not start" ? "Did-not-start check"
  : null;

/** True when at least one filter is set to something other than "Any". */
export const hasActiveFilters = (f: Filters): boolean => Object.values(f).some((v) => v !== ANY);

/** Does this worker pass every active filter? */
export const matchesFilters = (
  w: Worker,
  f: Filters,
  nationalityOf: (w: Worker) => string,
): boolean =>
  (f.project === ANY || w.project === f.project) &&
  (f.coordinator === ANY || w.coordinator === f.coordinator) &&
  (f.sp === ANY || w.sp === f.sp) &&
  (f.reason === ANY || pendingReason(w) === f.reason) &&
  (f.nationality === ANY || nationalityOf(w) === f.nationality);

const uniqSorted = (list: (string | null | undefined)[]) =>
  Array.from(new Set(list.filter((v): v is string => !!v && v !== "—"))).sort((a, b) => a.localeCompare(b));

/* ---------- Component ---------- */

interface Props {
  workers: Worker[];
  filters: Filters;
  /** Same nationality the detail page shows (includes edits made in Edit Profile). */
  nationalityOf: (w: Worker) => string;
  onChange: (key: keyof Filters, value: string) => void;
  onClear: () => void;
}

export default function WorkerFilters({ workers, filters, nationalityOf, onChange, onClear }: Props): React.JSX.Element {
  const fields: [keyof Filters, string, string[]][] = [
    ["project", "Project", uniqSorted(workers.map((w) => w.project))],
    ["coordinator", "Coordinator", uniqSorted(workers.map((w) => w.coordinator))],
    ["sp", "Social Insurance", SP_OPTIONS],
    ["reason", "Pending action reason", REASON_OPTIONS],
    ["nationality", "Nationality", uniqSorted(workers.map(nationalityOf))],
  ];

  return (
    <div className="wf-panel">
      <style>{css}</style>

      <div className="wf-grid">
        {fields.map(([key, label, options]) => (
          <div key={key} className="wf-field">
            <label htmlFor={`wf-${key}`}>{label}</label>
            <div className="wf-select">
              <select id={`wf-${key}`} value={filters[key]} onChange={(e) => onChange(key, e.target.value)}>
                <option>{ANY}</option>
                {options.map((o) => <option key={o}>{o}</option>)}
              </select>
              <ChevronDown size={16} />
            </div>
          </div>
        ))}
      </div>

      <button type="button" className="wf-clear" onClick={onClear}>Clear filters</button>
    </div>
  );
}

/* ---------- Styles (theme variables, so light + dark both work) ---------- */
const css = `
.wf-panel{margin:0 16px 12px;padding:16px 18px 10px;border:1px solid var(--line);border-radius:10px;background:var(--surface-2)}
.wf-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:18px 13px}
.wf-field{display:flex;flex-direction:column;gap:6px;min-width:0}
.wf-field label{font-size:12.5px;color:var(--muted)}
.wf-select{position:relative}
.wf-select select{appearance:none;-webkit-appearance:none;width:100%;height:37px;padding:0 36px 0 14px;border:1px solid var(--line);border-radius:8px;background:var(--card);font:inherit;font-size:14px;color:var(--text);outline:none;cursor:pointer;box-sizing:border-box}
.wf-select select:focus{border-color:var(--green);box-shadow:0 0 0 3px color-mix(in srgb,var(--green) 18%,transparent)}
.wf-select svg{position:absolute;right:12px;top:50%;transform:translateY(-50%);width:16px;height:16px;pointer-events:none;color:var(--muted)}
.sm-app .wf-clear{margin-top:10px;padding:7px 14px;font-size:14px;font-weight:500;color:var(--green);cursor:pointer;border-radius:6px}
.sm-app .wf-clear:hover{background:var(--hover-soft)}
@media (max-width:1000px){.wf-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media (max-width:560px){.wf-grid{grid-template-columns:1fr}}
`;
