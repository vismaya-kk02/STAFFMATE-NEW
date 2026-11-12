import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link, useSearchParams } from "react-router-dom";
import {
  ChevronRight, ChevronLeft, Plus, Search, SlidersHorizontal, Columns3, Download,
  ChevronDown, CircleCheck, ListX, Umbrella, TriangleAlert, BarChart3, CalendarX2,
  Minimize2, ArrowRightLeft, Users, X, Factory, TrendingUp, ClipboardCheck, Pencil,
} from "lucide-react";

/* ---------- Types & data ---------- */
type ProjectStatus = "Active" | "In preparation" | "Completed";

interface Project {
  name: string;
  client: string;
  industry: string;
  location: string;
  coordinator: string;
  startDate: string;
  assigned: number;
  confirmed: number;
  potential: number | null;
  status: ProjectStatus;
  endDate?: string; // ISO yyyy-mm-dd, set through the Edit Project dialog
  pid?: string;     // stable project ID (kept when the project is renamed)
}

const PROJECTS: Project[] = ([
  { name: "AutoParts Slovakia", client: "Bosch Automotive s.r.o.", industry: "Automotive", location: "Trnava", coordinator: "Jana Kollárová", startDate: "03 Feb 2025", assigned: 11, confirmed: 7, potential: 20, status: "Active" },
  { name: "Line 3 Assembly", client: "Kia Motors Slovakia", industry: "Automotive", location: "Žilina", coordinator: "Peter Vrábel", startDate: "18 Jun 2024", assigned: 11, confirmed: 0, potential: null, status: "Active" },
  { name: "Warehouse Ops", client: "DHL Logistics SK", industry: "Logistics", location: "Bratislava", coordinator: "Jana Kollárová", startDate: "11 Nov 2024", assigned: 11, confirmed: 2, potential: 15, status: "Active" },
  { name: "Packaging Line B", client: "Nestlé Slovensko", industry: "Food Manufacturing", location: "Prievidza", coordinator: "Peter Vrábel", startDate: "15 Sep 2026", assigned: 0, confirmed: 18, potential: 25, status: "In preparation" },
  { name: "CNC Machining Hall", client: "ZF Slovakia", industry: "Manufacturing", location: "Trnava", coordinator: "Jana Kollárová", startDate: "22 Jan 2023", assigned: 11, confirmed: 0, potential: 10, status: "Active" },
  { name: "Cold Storage Facility", client: "Lidl Distribučné centrum", industry: "Logistics", location: "Sereď", coordinator: "Peter Vrábel", startDate: "09 Aug 2022", assigned: 0, confirmed: 0, potential: 0, status: "Completed" },
] as Project[]).map((p, i) => ({ ...p, pid: `p${i + 1}` }));

const TABS = ["Projects", "Daily work status", "Statistics"] as const;
type Tab = (typeof TABS)[number];

const STATUS_CLASS: Record<ProjectStatus, string> = {
  Active: "ok",
  "In preparation": "warn",
  Completed: "muted",
};

/* ---------- Daily work status: types, data, helpers ---------- */
interface DayWorker {
  id: string;
  name: string;
  code: string;
  role: string;
  notEligible?: boolean; // Social Insurance not verified -> never counted as worked
}

const DAY_WORKERS: DayWorker[] = [
  { id: "w1", name: "Andriy Le", code: "SM-1143", role: "Assembler" },
  { id: "w2", name: "Anh Popa", code: "SM-1149", role: "Packer", notEligible: true },
  { id: "w3", name: "Cristian Savchenko", code: "SM-1124", role: "Machine Operator" },
  { id: "w4", name: "Dragan Jovanović", code: "SM-1120", role: "Forklift Operator" },
  { id: "w5", name: "Dragan Pavlović", code: "SM-1125", role: "Packer" },
  { id: "w6", name: "Marko Jovanović", code: "SM-0981", role: "Machine Operator" },
  { id: "w7", name: "Petar Stoyanov", code: "SM-1122", role: "Forklift Operator" },
  { id: "w8", name: "Taras Georgiev", code: "SM-1119", role: "Production Operator" },
  { id: "w9", name: "Vasile Jovanović", code: "SM-1123", role: "Forklift Operator" },
  { id: "w10", name: "Vasile Kravets", code: "SM-1126", role: "Packer" },
  { id: "w11", name: "Vlad Moldovan", code: "SM-1121", role: "Machine Operator" },
];

// AutoParts Slovakia roster (alphabetical, as shown in the reference design)
const AUTOPARTS_WORKERS: DayWorker[] = [
  { id: "a1", name: "Dragan Pavlović", code: "SM-1113", role: "Machine Operator" },
  { id: "a2", name: "Ion Kravets", code: "SM-1118", role: "Machine Operator" },
  { id: "a3", name: "Ion Pavlović", code: "SM-1114", role: "Packer" },
  { id: "a4", name: "Ivan Petrenko", code: "SM-1042", role: "Production Operator", notEligible: true },
  { id: "a5", name: "Maksym Koval", code: "SM-1142", role: "Packer" },
  { id: "a6", name: "Marko Nguyen", code: "SM-1112", role: "Production Operator" },
  { id: "a7", name: "Nikola Nguyen", code: "SM-1111", role: "Machine Operator" },
  { id: "a8", name: "Tomislav Marković", code: "SM-1115", role: "Production Operator" },
  { id: "a9", name: "Viorel Moldovan", code: "SM-1110", role: "Packer" },
  { id: "a10", name: "Vlad Bratu", code: "SM-1117", role: "Assembler" },
  { id: "a11", name: "Vlad Vasilev", code: "SM-1116", role: "Forklift Operator" },
];
const workersFor = (project: string): DayWorker[] =>
  project === "AutoParts Slovakia" ? AUTOPARTS_WORKERS : DAY_WORKERS;

const DEFAULT_REASON = "Scheduled day off / not scheduled to work";
const HOLIDAY_REASON = "Factory holiday / shutdown";
const REASONS = [DEFAULT_REASON, "Sick leave", "Approved leave", "Absent — no notice", HOLIDAY_REASON];

interface Mark { didNotWork: boolean; reason: string; note: string }
type DayState = "not_started" | "draft" | "confirmed";

interface ReviewItem {
  id: string;
  worker: string;
  days: number;
  project: string;
  from: string;
  to: string;
}

const INITIAL_REVIEWS: ReviewItem[] = [
  { id: "r1", worker: "Petar Marković", days: 13, project: "Warehouse Ops", from: "20 Aug 2026", to: "03 Sep 2026" },
];

// Demo "previous day" — matches the 08 Sep 2026 date used on the Overview page.
const DEFAULT_DAY = "2026-09-08";

const parseIso = (iso: string) => new Date(`${iso}T00:00:00`);
const toIso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const addDays = (iso: string, n: number) => {
  const d = parseIso(iso);
  d.setDate(d.getDate() + n);
  return toIso(d);
};
const fmtDate = (iso: string) =>
  parseIso(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

const freshMarks = (list: DayWorker[] = DAY_WORKERS): Record<string, Mark> =>
  Object.fromEntries(list.map((w) => [w.id, { didNotWork: false, reason: DEFAULT_REASON, note: "" }]));

/* ---------- Confirmation records (who confirmed which project-day, and when) ---------- */
const CONFIRMER = "Marek Máhr";
interface Confirmation { by: string; at: string }
const keyOf = (project: string, iso: string) => `${project}|${iso}`;
const stamp = () => {
  const d = new Date();
  return `${toIso(d)} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};
// Demo data so the "Confirmed by …" state shows on first load
const SEED_CONFIRMATIONS: Record<string, Confirmation> = {
  [keyOf("AutoParts Slovakia", DEFAULT_DAY)]: { by: CONFIRMER, at: "2026-09-09 08:29" },
};

/* ---------- Factory holiday / shutdown modal ---------- */
interface Holiday { project: string; from: string; to: string; note: string; exceptions: string[] }

function HolidayModal({ open, project, defaultDate, workers, onClose, onApply }: {
  open: boolean;
  project: string;
  defaultDate: string;
  workers: DayWorker[];
  onClose: () => void;
  onApply: (h: Holiday) => void;
}): React.JSX.Element | null {
  const [from, setFrom] = useState(defaultDate);
  const [to, setTo] = useState(defaultDate);
  const [note, setNote] = useState("");
  const [exc, setExc] = useState<string[]>([]);
  const [touched, setTouched] = useState(false);

  // Reset the form each time the modal opens
  useEffect(() => {
    if (open) { setFrom(defaultDate); setTo(defaultDate); setNote(""); setExc([]); setTouched(false); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Close on Escape + lock page scroll while open
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, [open, onClose]);

  if (!open) return null;

  const sorted = [...workers].sort((a, b) => a.name.localeCompare(b.name));
  const invalid = !from || !to || to < from;
  const toggle = (id: string) => setExc((l) => (l.includes(id) ? l.filter((x) => x !== id) : [...l, id]));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (invalid) return;
    onApply({ project, from, to, note: note.trim(), exceptions: exc });
  };

  return createPortal(
    <>
      <style>{modalCss}{holidayCss}</style>
      <div className="ap-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
        <form className="ap-modal hl-modal" role="dialog" aria-modal="true" aria-labelledby="hl-title" onSubmit={submit} noValidate>
          <div className="ap-head">
            <h2 id="hl-title">{project}</h2>
            <button type="button" className="ap-close" aria-label="Close" onClick={onClose}>
              <X size={20} strokeWidth={1.5} />
            </button>
          </div>

          <div className="ap-grid">
            <div className="ap-field">
              <label htmlFor="hl-from">From *</label>
              <input id="hl-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            </div>
            <div className="ap-field">
              <label htmlFor="hl-to">To *</label>
              <input id="hl-to" type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} />
            </div>
          </div>
          {touched && invalid && <span className="ap-err">Choose a valid date range (To must not be before From).</span>}

          <div className="ap-field hl-note">
            <label htmlFor="hl-note">Note</label>
            <input id="hl-note" placeholder="e.g. Plant holiday" value={note} onChange={(e) => setNote(e.target.value)} />
          </div>

          <div className="ap-field hl-exc">
            <label id="hl-exc-label">Exceptions — workers who still worked</label>
            <div className="hl-list" role="group" aria-labelledby="hl-exc-label">
              {sorted.map((w) => (
                <label key={w.id} className="hl-row">
                  <input type="checkbox" checked={exc.includes(w.id)} onChange={() => toggle(w.id)} />
                  <span>{w.name}</span>
                  <span className="hl-code">{w.code}</span>
                </label>
              ))}
            </div>
          </div>

          <button type="submit" className="ap-save hl-apply">Apply to the date range</button>
        </form>
      </div>
    </>,
    document.body,
  );
}

const holidayCss = `
.ap-modal.hl-modal{max-width:600px;padding:20px 22px 20px}
.hl-modal .ap-head{margin-bottom:18px}
.hl-modal .ap-head h2{font-size:17px}
.hl-modal .ap-grid{gap:14px 12px}
.hl-modal .ap-field label{font-size:12.5px}
.hl-modal .ap-field input{height:32px;font-size:13px;padding:0 11px}
.hl-note{margin-top:14px}
.hl-exc{margin-top:14px}
.hl-list{height:150px;overflow-y:auto;padding:2px 10px;border:1px solid var(--line,#dedcd5);border-radius:6px;background:#fff}
.hl-list .hl-row{display:flex;align-items:center;gap:9px;height:29px;font-size:13px;color:var(--text,#1c1c1a);cursor:pointer}
.hl-list .hl-row input[type=checkbox]{width:15px;height:15px;margin:0;padding:0;border:0;border-radius:3px;box-shadow:none;accent-color:var(--green,#1a6b2f);cursor:pointer;flex:none}
.hl-code{letter-spacing:.2px}
.hl-apply{margin-top:14px;height:34px;font-size:13px}
`;

/* ---------- "Correct all as worked" modal (Needs review card) ---------- */
function CorrectModal({ item, onClose, onConfirm }: {
  item: ReviewItem;
  onClose: () => void;
  onConfirm: (reason: string) => void;
}): React.JSX.Element {
  const [reason, setReason] = useState("");
  const [touched, setTouched] = useState(false);
  const areaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { setTimeout(() => areaRef.current?.focus(), 0); }, []);

  // Close on Escape + lock page scroll while open
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, [onClose]);

  const missing = touched && !reason.trim();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (!reason.trim()) return;
    onConfirm(reason.trim());
  };

  return createPortal(
    <>
      <style>{modalCss}{correctCss}</style>
      <div className="ap-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
        <form className="ap-modal cm-modal" role="dialog" aria-modal="true" aria-labelledby="cm-title" onSubmit={submit} noValidate>
          <div className="ap-head">
            <h2 id="cm-title">{item.worker}</h2>
            <button type="button" className="ap-close" aria-label="Close" onClick={onClose}>
              <X size={20} strokeWidth={1.5} />
            </button>
          </div>

          <div className="ap-field">
            <label htmlFor="cm-reason">
              Reason for the corrections * (applied to each record and logged separately)
            </label>
            <textarea
              id="cm-reason"
              ref={areaRef}
              className={missing ? "is-error" : ""}
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              aria-invalid={missing}
            />
            {missing && <span className="ap-err">Enter a reason for the corrections.</span>}
          </div>

          <button type="submit" className="ap-save">
            Correct {item.days} record{item.days === 1 ? "" : "s"} as worked
          </button>
        </form>
      </div>
    </>,
    document.body,
  );
}

const correctCss = `
.ap-modal.cm-modal{max-width:640px}
.cm-modal .ap-field textarea{width:100%;min-height:70px;padding:10px 12px;border:1px solid var(--line,#dedcd5);border-radius:6px;background:#fff;font:inherit;font-size:13px;line-height:1.45;color:var(--text,#1c1c1a);outline:none;resize:vertical;box-sizing:border-box}
.cm-modal .ap-field textarea:focus{border-color:var(--green,#1a6b2f);box-shadow:0 0 0 3px rgba(26,107,47,.12)}
.cm-modal .ap-field textarea.is-error{border-color:#b42318}
.cm-modal .ap-save{margin-top:16px}
`;

/* ---------- Daily work status tab ---------- */
function DailyWorkStatus({ holidayRef }: { holidayRef: React.MutableRefObject<(() => void) | null> }): React.JSX.Element {
  const projectNames = PROJECTS.filter((p) => p.status !== "Completed").map((p) => p.name);
  const [project, setProject] = useState("AutoParts Slovakia");
  const [day, setDay] = useState(DEFAULT_DAY);
  const [marks, setMarks] = useState<Record<string, Mark>>(() => freshMarks(workersFor("AutoParts Slovakia")));
  const [confirmations, setConfirmations] = useState<Record<string, Confirmation>>(SEED_CONFIRMATIONS);
  const [state, setState] = useState<DayState>(
    SEED_CONFIRMATIONS[keyOf("AutoParts Slovakia", DEFAULT_DAY)] ? "confirmed" : "not_started",
  );
  const [reviews, setReviews] = useState<ReviewItem[]>(INITIAL_REVIEWS);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [holidayOpen, setHolidayOpen] = useState(false);
  // "Correct all as worked" dialog + the confirmation message shown after it
  const [correcting, setCorrecting] = useState<ReviewItem | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Build the marks for a project/day, applying any saved holiday ranges that cover it.
  const load = (proj: string, iso: string, list: Holiday[], conf: Record<string, Confirmation> = confirmations) => {
    const matches = list.filter((h) => h.project === proj && iso >= h.from && iso <= h.to);
    const roster = workersFor(proj);
    const next = freshMarks(roster);
    matches.forEach((h) => {
      roster.filter((w) => !w.notEligible && !h.exceptions.includes(w.id)).forEach((w) => {
        next[w.id] = { didNotWork: true, reason: HOLIDAY_REASON, note: h.note };
      });
    });
    setMarks(next);
    setState(conf[keyOf(proj, iso)] ? "confirmed" : matches.length ? "draft" : "not_started");
  };

  const changeDay = (iso: string) => { if (iso) { setDay(iso); load(project, iso, holidays); } };
  const changeProject = (name: string) => { setProject(name); load(name, day, holidays); };

  const dropConfirmation = () =>
    setConfirmations((c) => { const n = { ...c }; delete n[keyOf(project, day)]; return n; });

  const update = (id: string, patch: Partial<Mark>) => {
    setMarks((m) => ({ ...m, [id]: { ...m[id], ...patch } }));
    if (state === "confirmed") { // editing a confirmed day reopens it
      setState("draft");
      dropConfirmation();
    }
  };

  const saveDraft = () => {
    setState("draft");
    dropConfirmation();
  };

  const confirmDay = () => {
    setConfirmations((c) => ({ ...c, [keyOf(project, day)]: { by: CONFIRMER, at: stamp() } }));
    setState("confirmed");
  };

  const confirmation = confirmations[keyOf(project, day)];
  const workers = workersFor(project);

  // Called by the "Factory holiday / shutdown" button in the page header.
  holidayRef.current = () => setHolidayOpen(true);

  const applyHoliday = (h: Holiday) => {
    const list = [...holidays, h];
    setHolidays(list);
    setHolidayOpen(false);
    load(project, day, list); // refresh the visible day if it falls in the range
  };

  const eligible = workers.filter((w) => !w.notEligible);
  const notEligibleCount = workers.length - eligible.length;
  const didNotWork = eligible.filter((w) => marks[w.id].didNotWork).length;
  const willWork = eligible.length - didNotWork;

  const stats = [
    { label: "On the list", value: workers.length, caption: `Assigned to ${project} on ${fmtDate(day)}` },
    { label: "Will be recorded as worked", value: willWork, caption: "Only after you confirm" },
    { label: "Did not work", value: didNotWork, caption: "With a reason each" },
    { label: "Not eligible (Social Insurance)", value: notEligibleCount, caption: "Never counted as worked", danger: true },
  ];

  return (
    <>
      <section className="sm-card dw-top">
        <div className="dw-left">
          <div className="dw-field">
            <label htmlFor="dw-project">Project</label>
            <div className="dw-select dw-select-lg">
              <select id="dw-project" value={project} onChange={(e) => changeProject(e.target.value)}>
                {projectNames.map((n) => <option key={n}>{n}</option>)}
              </select>
              <ChevronDown size={18} />
            </div>
          </div>

          <div className="dw-field">
            <label htmlFor="dw-date">Date (previous day by default)</label>
            <div className="dw-date">
              <button type="button" className="dw-step" aria-label="Previous day" onClick={() => changeDay(addDays(day, -1))}>
                <ChevronLeft size={16} />
              </button>
              <input id="dw-date" type="date" value={day} onChange={(e) => changeDay(e.target.value)} />
              <button type="button" className="dw-step" aria-label="Next day" onClick={() => changeDay(addDays(day, 1))}>
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>

        <div className={`dw-pills${state === "confirmed" ? " is-inline" : ""}`}>
          {state === "confirmed" ? (
            <span className="sm-pill ok">
              
              Confirmed{confirmation ? ` by ${confirmation.by} · ${confirmation.at}` : ""}
            </span>
          ) : (
            <>
              <span className="sm-pill bad">
                {state === "draft" ? "Draft — incomplete" : "Not started — incomplete"}
              </span>
              <span className="sm-pill bad">
                Overdue — due by 9:30 on {fmtDate(addDays(day, 1))} (Slovak time)
              </span>
            </>
          )}
        </div>
      </section>

      <section className="sm-card sm-stat-group pj-compact" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
        {stats.map((s) => (
          <div key={s.label} className="sm-stat">
            <div className="sm-stat-title">{s.label}</div>
            <div className={`sm-stat-value${s.danger ? " is-danger" : ""}`}>{s.value}</div>
            <div className="sm-stat-caption">{s.caption}</div>
          </div>
        ))}
      </section>

      <section className="sm-card dw-panel">
        {state === "confirmed" ? (
          <>
        <div className="sm-table-wrap">
          <table className="sm-table dw-table dw-table-ro">
            <thead>
              <tr>
                <th>Worker</th><th>Role</th><th>Recorded outcome</th><th>Note</th><th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {workers.map((w) => {
                const m = marks[w.id];
                return (
                  <tr key={w.id}>
                    <td>
                      <div className="dw-name">
                        <strong>{w.name}</strong>
                        {w.notEligible && <span className="dw-sp">SP</span>}
                      </div>
                      <small>{w.code}</small>
                    </td>
                    <td>{w.role}</td>
                    <td>
                      {w.notEligible ? (
                        <span className="sm-pill bad">Not eligible — Social Insurance not verified</span>
                      ) : m.didNotWork ? (
                        <span className="sm-pill warn">Did not work — {m.reason}</span>
                      ) : (
                        <span className="sm-pill ok">Worked</span>
                      )}
                    </td>
                    <td className="dw-note-ro">{m.note}</td>
                    <td className="dw-act">
                      <button type="button" className="dw-correct" onClick={saveDraft}>Correct</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
          </>
        ) : (
          <>
        <div className="sm-table-wrap">
          <table className="sm-table dw-table">
            <thead>
              <tr>
                <th>Worker</th><th>Role</th><th>Did not work?</th><th>Reason</th><th>Note</th>
              </tr>
            </thead>
            <tbody>
              {workers.map((w) => {
                const m = marks[w.id];
                return (
                  <tr key={w.id}>
                    <td>
                      <div className="dw-name">
                        <strong>{w.name}</strong>
                        {w.notEligible && <span className="dw-sp">SP</span>}
                      </div>
                      <small>
                        {w.code}
                        {w.notEligible && (
                          <> · <span className="dw-warn">Not eligible — Social Insurance not verified; will not count as worked</span></>
                        )}
                      </small>
                    </td>
                    <td>{w.role}</td>
                    <td>
                      <label className="dw-check">
                        <input
                          type="checkbox"
                          checked={m.didNotWork}
                          onChange={(e) => update(w.id, { didNotWork: e.target.checked })}
                        />
                        <span>{m.didNotWork ? "Did not work" : "Worked"}</span>
                      </label>
                    </td>
                    <td>
                      <div className="dw-select">
                        <select
                          aria-label={`Reason for ${w.name}`}
                          value={m.reason}
                          onChange={(e) => update(w.id, { reason: e.target.value })}
                        >
                          {REASONS.map((r) => <option key={r}>{r}</option>)}
                        </select>
                        <ChevronDown size={16} />
                      </div>
                    </td>
                    <td>
                      <input
                        className="dw-note"
                        placeholder="Optional"
                        aria-label={`Note for ${w.name}`}
                        value={m.note}
                        onChange={(e) => update(w.id, { note: e.target.value })}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>


       
          </>
        )}
      </section>

      {notice && (
        <div className="dw-notice" role="status">
          <span>{notice}</span>
          <button type="button" aria-label="Dismiss" onClick={() => setNotice(null)}><X size={16} /></button>
        </div>
      )}

      {reviews.length > 0 && (
        <section className="sm-card dw-review">
          <h3><ListX size={16} strokeWidth={1.6} /> Needs review after later Social Insurance verification</h3>
          <p>
            Social Insurance evidence was verified for an earlier date. Nothing has changed automatically — an
            authorised user corrects each record with a reason.
          </p>
          {reviews.map((r) => (
            <div key={r.id} className="dw-review-row">
              <div>
                <strong>{r.worker} — {r.days} day(s) on {r.project}</strong>
                <small>{r.from} to {r.to} · recorded as not eligible, registration now effective</small>
              </div>
              <div className="dw-review-btns">
                <button type="button" className="sm-btn sm-btn-outline sm-btn-sm"
                  onClick={() => {
                    const iso = "2026-08-20";
                    setProject(r.project);
                    setDay(iso);
                    load(r.project, iso, holidays);
                  }}>
                  Open first day
                </button>
                <button type="button" className="sm-btn sm-btn-primary sm-btn-sm"
                  onClick={() => setCorrecting(r)}>
                  Correct all as worked
                </button>
              </div>
            </div>
          ))}
        </section>
      )}

      <p className="dw-foot">
        Scheduled days off are selected manually — there is no shift planner. An unconfirmed day is shown as
        incomplete and is never treated as “everyone worked”.
      </p>

      <HolidayModal
        open={holidayOpen}
        project={project}
        defaultDate={day}
        workers={workers.filter((w) => !w.notEligible)}
        onClose={() => setHolidayOpen(false)}
        onApply={applyHoliday}
      />

      {correcting && (
        <CorrectModal
          item={correcting}
          onClose={() => setCorrecting(null)}
          onConfirm={() => {
            setReviews((list) => list.filter((x) => x.id !== correcting.id));
            setNotice(
              `${correcting.days} record${correcting.days === 1 ? "" : "s"} for ${correcting.worker} corrected as worked. The reason was logged for each record.`,
            );
            setCorrecting(null);
          }}
        />
      )}
    </>
  );
}

/* ---------- Statistics tab ---------- */
const RANGES = ["Yesterday", "Last 7 days", "Month"] as const;
type Range = (typeof RANGES)[number];

interface Counts { assigned: number; worked: number; dnw: number; ne: number; incomplete: number }

// Worker-days from confirmed daily records, 02 Sep – 08 Sep 2026 (demo data).
const COMPANY_7D: Counts = { assigned: 277, worked: 221, dnw: 41, ne: 15, incomplete: 3 };
const PROJECT_7D: Record<string, Counts> = {
  "AutoParts Slovakia": { assigned: 79, worked: 62, dnw: 9, ne: 8, incomplete: 0 },
  "Line 3 Assembly": { assigned: 61, worked: 48, dnw: 12, ne: 1, incomplete: 1 },
  "Warehouse Ops": { assigned: 69, worked: 57, dnw: 10, ne: 2, incomplete: 1 },
  "Packaging Line B": { assigned: 0, worked: 0, dnw: 0, ne: 0, incomplete: 0 },
  "CNC Machining Hall": { assigned: 68, worked: 54, dnw: 10, ne: 4, incomplete: 1 },
  "Cold Storage Facility": { assigned: 0, worked: 0, dnw: 0, ne: 0, incomplete: 0 },
};

interface DayBar { label: string; worked: number; dnw: number; ne: number; unconfirmed: number }
// The last 7 entries (02–08 Sep) add up to COMPANY_7D.
const DAY_BARS: DayBar[] = [
  { label: "01 Sep", worked: 34, dnw: 4, ne: 2, unconfirmed: 0 },
  { label: "02 Sep", worked: 34, dnw: 5, ne: 2, unconfirmed: 0 },
  { label: "03 Sep", worked: 35, dnw: 2, ne: 4, unconfirmed: 0 },
  { label: "04 Sep", worked: 37, dnw: 1, ne: 3, unconfirmed: 0 },
  { label: "05 Sep", worked: 26, dnw: 13, ne: 2, unconfirmed: 0 },
  { label: "06 Sep", worked: 27, dnw: 13, ne: 1, unconfirmed: 0 },
  { label: "07 Sep", worked: 30, dnw: 4, ne: 2, unconfirmed: 5 },
  { label: "08 Sep", worked: 32, dnw: 3, ne: 1, unconfirmed: 6 },
];

const RANGE_DAYS: Record<Range, number> = { Yesterday: 1, "Last 7 days": 7, Month: 8 };
const REASON_WEIGHTS: [string, number][] = [
  [DEFAULT_REASON, 34], ["Annual leave", 4], ["Sickness / sick leave", 1], ["Medical appointment", 1], ["Other", 1],
];
const HEADCOUNT: Record<Range, { from: string; fromN: number; toN: number; joiners: number; leavers: number }> = {
  Yesterday: { from: "07 Sep 2026", fromN: 42, toN: 41, joiners: 0, leavers: 1 },
  "Last 7 days": { from: "02 Sep 2026", fromN: 44, toN: 41, joiners: 3, leavers: 1 },
  Month: { from: "01 Sep 2026", fromN: 46, toN: 41, joiners: 3, leavers: 8 },
};

const sumDay = (b: DayBar) => b.worked + b.dnw + b.ne;

const scaleCounts = (c: Counts, f: number, range: Range): Counts => {
  const assigned = Math.round(c.assigned * f);
  const dnw = Math.round(c.dnw * f);
  const ne = Math.round(c.ne * f);
  return {
    assigned, dnw, ne,
    worked: Math.max(0, assigned - dnw - ne),
    incomplete: range === "Yesterday" ? (c.incomplete > 0 ? 1 : 0) : c.incomplete,
  };
};

/** Split `total` across weights so the parts add up exactly (largest remainder). */
const apportion = (total: number, weights: number[]): number[] => {
  const sum = weights.reduce((a, b) => a + b, 0);
  const raw = weights.map((w) => (total * w) / sum);
  const out = raw.map(Math.floor);
  let rest = total - out.reduce((a, b) => a + b, 0);
  raw
    .map((r, i) => ({ i, frac: r - Math.floor(r) }))
    .sort((a, b) => b.frac - a.frac)
    .forEach(({ i }) => { if (rest > 0) { out[i]++; rest--; } });
  return out;
};

const pct = (n: number, d: number) => (d > 0 ? `${((n / d) * 100).toFixed(1)}%` : "—");

function StatisticsTab({ exportRef, onSeeWhich }: {
  exportRef: React.MutableRefObject<(() => void) | null>;
  onSeeWhich: () => void;
}): React.JSX.Element {
  const [scope, setScope] = useState("Whole company");
  const [range, setRange] = useState<Range>("Last 7 days");

  const bars = DAY_BARS.slice(-RANGE_DAYS[range]);
  const factor = bars.reduce((a, b) => a + sumDay(b), 0) / COMPANY_7D.assigned;
  const share = scope === "Whole company" ? 1 : PROJECT_7D[scope].assigned / COMPANY_7D.assigned;

  const company = scaleCounts(COMPANY_7D, factor, range);
  const rows = PROJECTS.map((p) => ({ name: p.name, c: scaleCounts(PROJECT_7D[p.name], factor, range) }));
  const view = scope === "Whole company" ? company : rows.find((r) => r.name === scope)!.c;

  const scaledBars = bars.map((b) => ({
    label: b.label,
    worked: Math.round(b.worked * share),
    dnw: Math.round(b.dnw * share),
    ne: Math.round(b.ne * share),
    unconfirmed: Math.round(b.unconfirmed * share),
  }));
  const maxTotal = Math.max(1, ...scaledBars.map((b) => sumDay(b) + b.unconfirmed));

  const reasons = view.dnw > 0
    ? apportion(view.dnw, REASON_WEIGHTS.map(([, w]) => w)).map((n, i) => [REASON_WEIGHTS[i][0], n] as [string, number])
    : REASON_WEIGHTS.map(([r]) => [r, 0] as [string, number]);

  const hc = HEADCOUNT[range];
  const joiners = Math.round(hc.joiners * share);
  const leavers = Math.round(hc.leavers * share);
  const net = joiners - leavers;

  const period = range === "Yesterday"
    ? "08 Sep 2026"
    : `${bars[0].label} 2026 to 08 Sep 2026`;

  exportRef.current = () => {
    const header = ["Scope", "Assigned", "Worked", "Did not work", "Not eligible", "Worked share", "Incomplete days"];
    const line = (name: string, c: Counts) =>
      [name, c.assigned, c.worked, c.dnw, c.ne, pct(c.worked, c.assigned), c.incomplete].join(",");
    const csv = [header.join(","), line("Whole company", company), ...rows.map((r) => line(`"${r.name}"`, r.c))].join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `statistics-${range.toLowerCase().replace(/\s+/g, "-")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const cards = [
    { label: "Assigned worker-days", value: view.assigned, caption: "On confirmed records" },
    { label: "Worked", value: view.worked, caption: `${pct(view.worked, view.assigned)} of assigned` },
    { label: "Did not work", value: view.dnw, caption: `${pct(view.dnw, view.assigned)} of assigned` },
    { label: "Not eligible (SP)", value: view.ne, caption: "Never counted as worked", danger: true },
    { label: "Incomplete project-days", value: view.incomplete, caption: "Unconfirmed records", danger: true },
  ];

  return (
    <>
      <section className="sm-card st-top">
        <div className="dw-field">
          <label htmlFor="st-scope">Scope</label>
          <div className="dw-select st-scope">
            <select id="st-scope" value={scope} onChange={(e) => setScope(e.target.value)}>
              <option>Whole company</option>
              {PROJECTS.map((p) => <option key={p.name}>{p.name}</option>)}
            </select>
            <ChevronDown size={18} />
          </div>
        </div>
        <div className="st-ctl" role="group" aria-label="Period">
          {RANGES.map((r) => (
            <button key={r} type="button" className={range === r ? "is-active" : ""} onClick={() => setRange(r)}>{r}</button>
          ))}
        </div>
        <div className="st-summary">{scope} · {range} — {period}</div>
      </section>

      {view.incomplete > 0 && (
        <div className="st-banner" role="status">
          <TriangleAlert size={20} />
          <span>
            {view.incomplete} project-day record(s) in this period are not confirmed and are shown as incomplete — they
            are not treated as “everyone worked”.
          </span>
          <button type="button" onClick={onSeeWhich}>See which</button>
        </div>
      )}

      <section className="sm-card sm-stat-group pj-compact" style={{ gridTemplateColumns: "repeat(5, 1fr)" }}>
        {cards.map((s) => (
          <div key={s.label} className="sm-stat">
            <div className="sm-stat-title">{s.label}</div>
            <div className={`sm-stat-value${s.danger ? " is-danger" : ""}`}>{s.value}</div>
            <div className="sm-stat-caption">{s.caption}</div>
          </div>
        ))}
      </section>

      <div className="st-grid">
        <section className="sm-card st-panel">
          <h3><BarChart3 size={16} strokeWidth={1.6} /> Worker-days by day</h3>
          <div className="st-chart">
            {scaledBars.map((b) => {
              const h = (v: number) => `${(v / maxTotal) * 100}%`;
              return (
                <div key={b.label} className="st-col">
                  <div className="st-bar" title={`${b.label}: ${b.worked} worked, ${b.dnw} did not work, ${b.ne} not eligible, ${b.unconfirmed} unconfirmed`}>
                    <div className="st-unc" style={{ height: h(b.unconfirmed) }} />
                    <div className="st-ne" style={{ height: h(b.ne) }} />
                    <div className="st-dnw" style={{ height: h(b.dnw) }} />
                    <div className="st-w" style={{ height: h(b.worked) }} />
                  </div>
                  <span>{b.label}</span>
                </div>
              );
            })}
          </div>
          <div className="st-legend">
            <span><i className="st-w" />Worked</span>
            <span><i className="st-dnw" />Did not work</span>
            <span><i className="st-ne" />Not eligible (SP)</span>
            <span>Hatched = unconfirmed</span>
          </div>
        </section>

        <section className="sm-card st-panel">
          <h3><CalendarX2 size={16} strokeWidth={1.6} /> Did not work — by reason</h3>
          <div className="sm-table-wrap">
            <table className="sm-table st-reasons">
              <thead><tr><th>Reason</th><th>Worker-days</th></tr></thead>
              <tbody>
                {reasons.map(([reason, n]) => (
                  <tr key={reason}><td>{reason}</td><td>{n}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <section className="sm-card st-panel st-wide">
        <h3><Minimize2 size={16} strokeWidth={1.6} /> Projects compared with the company</h3>
        <div className="sm-table-wrap">
          <table className="sm-table st-table">
            <thead>
              <tr>
                <th />
                <th>Assigned</th><th>Worked</th><th>Did not work</th><th>Not eligible</th><th>Worked share</th><th>Incomplete days</th>
              </tr>
            </thead>
            <tbody>
              {[{ name: "Whole company", c: company }, ...rows].map((r, i) => (
                <tr key={r.name} className={i === 0 ? "st-total" : ""}>
                  <td><strong>{r.name}</strong></td>
                  <td>{r.c.assigned}</td>
                  <td>{r.c.worked}</td>
                  <td>{r.c.dnw}</td>
                  <td>{r.c.ne}</td>
                  <td>{pct(r.c.worked, r.c.assigned)}</td>
                  <td>{r.c.incomplete}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="st-grid st-grid-even">
        <section className="sm-card st-panel">
          <h3><Users size={16} strokeWidth={1.6} /> Headcount</h3>
          <dl className="st-kv">
            <dt>Working on 08 Sep 2026</dt><dd>{Math.round(hc.toN * share)}</dd>
            <dt>Working on {hc.from}</dt><dd>{Math.round(hc.fromN * share)}</dd>
          </dl>
          <p className="st-note">
            Headcount counts workers assigned with verified Social Insurance. Workers waiting for verification are not
            counted.
          </p>
        </section>

        <section className="sm-card st-panel">
          <h3><ArrowRightLeft size={16} strokeWidth={1.6} /> Joiners and leavers</h3>
          <dl className="st-kv">
            <dt>Joiners (employment start)</dt><dd>{joiners}</dd>
            <dt>Leavers (effective termination date)</dt><dd>{leavers}</dd>
            <dt>Net change</dt><dd>{net > 0 ? `+${net}` : net}</dd>
          </dl>
        </section>
      </div>
    </>
  );
}

/* ---------- Add Project modal ---------- */
interface NewProjectInput {
  client: string;
  name: string;
  industry: string;
  location: string;
  coordinator: string;
  startDate: string; // ISO yyyy-mm-dd
}

interface Props {
  open: boolean;
  onClose: () => void;
  onSave: (p: NewProjectInput) => void;
  clients: string[];
  coordinators: string[];
}

const todayIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

function AddProjectModal({ open, onClose, onSave, clients, coordinators }: Props): React.JSX.Element | null {
  const blank = (): NewProjectInput => ({
    client: clients[0] ?? "",
    name: "",
    industry: "",
    location: "",
    coordinator: coordinators[0] ?? "",
    startDate: todayIso(),
  });

  const [form, setForm] = useState<NewProjectInput>(blank);
  const [touched, setTouched] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);

  // Reset the form and focus the name field each time the modal opens
  useEffect(() => {
    if (open) {
      setForm(blank());
      setTouched(false);
      setTimeout(() => nameRef.current?.focus(), 0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Close on Escape + lock page scroll while open
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  const set = <K extends keyof NewProjectInput>(k: K, v: NewProjectInput[K]) => setForm((f) => ({ ...f, [k]: v }));
  const nameMissing = touched && !form.name.trim();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (!form.name.trim() || !form.client || !form.coordinator) return;
    onSave({ ...form, name: form.name.trim(), industry: form.industry.trim(), location: form.location.trim() });
  };

  return createPortal(
    <>
      <style>{modalCss}</style>
      <div className="ap-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
        <form className="ap-modal" role="dialog" aria-modal="true" aria-labelledby="ap-title" onSubmit={submit} noValidate>
          <div className="ap-head">
            <h2 id="ap-title">Add Project</h2>
            <button type="button" className="ap-close" aria-label="Close" onClick={onClose}>
              <X size={20} strokeWidth={1.5} />
            </button>
          </div>

          <div className="ap-grid">
            <div className="ap-field">
              <label htmlFor="ap-client">Client Company *</label>
              <div className="ap-select">
                <select id="ap-client" value={form.client} onChange={(e) => set("client", e.target.value)}>
                  {clients.map((c) => <option key={c}>{c}</option>)}
                </select>
                <ChevronDown size={18} />
              </div>
            </div>

            <div className="ap-field">
              <label htmlFor="ap-name">Factory / Project Name *</label>
              <input
                id="ap-name"
                ref={nameRef}
                className={nameMissing ? "is-error" : ""}
                placeholder="e.g. Packaging Line C"
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                aria-invalid={nameMissing}
              />
              {nameMissing && <span className="ap-err">Enter a project name.</span>}
            </div>

            <div className="ap-field">
              <label htmlFor="ap-industry">Industry</label>
              <input id="ap-industry" placeholder="e.g. Automotive" value={form.industry} onChange={(e) => set("industry", e.target.value)} />
            </div>

            <div className="ap-field">
              <label htmlFor="ap-location">Location</label>
              <input id="ap-location" placeholder="City" value={form.location} onChange={(e) => set("location", e.target.value)} />
            </div>

            <div className="ap-field">
              <label htmlFor="ap-coord">Coordinator *</label>
              <div className="ap-select">
                <select id="ap-coord" value={form.coordinator} onChange={(e) => set("coordinator", e.target.value)}>
                  {coordinators.map((c) => <option key={c}>{c}</option>)}
                </select>
                <ChevronDown size={18} />
              </div>
            </div>

            <div className="ap-field">
              <label htmlFor="ap-start">Engagement Start Date</label>
              <input id="ap-start" type="date" value={form.startDate} onChange={(e) => set("startDate", e.target.value)} />
            </div>
          </div>

          <p className="ap-hint">A draft project only needs a name, client company and location — everything else can be completed later.</p>

          <button type="submit" className="ap-save">Save Project</button>
        </form>
      </div>
    </>,
    document.body,
  );
}

/* ---------- Edit Project modal ---------- */
interface ProjectPatch {
  name: string;
  coordinator: string;
  status: ProjectStatus;
  endDate: string; // ISO yyyy-mm-dd, or "" when there is no end date
}

const STATUS_OPTIONS: ProjectStatus[] = ["Active", "In preparation", "Completed"];

function EditProjectModal({ project, coordinators, onClose, onSave }: {
  project: Project;
  coordinators: string[];
  onClose: () => void;
  onSave: (patch: ProjectPatch) => void;
}): React.JSX.Element {
  const [name, setName] = useState(project.name);
  const [coordinator, setCoordinator] = useState(project.coordinator);
  const [status, setStatus] = useState<ProjectStatus>(project.status);
  const [endDate, setEndDate] = useState(project.endDate ?? "");
  const [touched, setTouched] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setTimeout(() => nameRef.current?.focus(), 0); }, []);

  // Close on Escape + lock page scroll while open
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  const nameMissing = touched && !name.trim();
  const options = coordinators.includes(coordinator) ? coordinators : [coordinator, ...coordinators];

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (!name.trim()) return;
    onSave({ name: name.trim(), coordinator, status, endDate });
  };

  return createPortal(
    <>
      <style>{modalCss}{editCss}</style>
      <div className="ap-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
        <form className="ap-modal ep-modal" role="dialog" aria-modal="true" aria-labelledby="ep-title" onSubmit={submit} noValidate>
          <div className="ap-head">
            <h2 id="ep-title">Edit Project</h2>
            <button type="button" className="ap-close" aria-label="Close" onClick={onClose}>
              <X size={20} strokeWidth={1.5} />
            </button>
          </div>

          <div className="ap-grid">
            <div className="ap-field">
              <label htmlFor="ep-name">Factory / Project Name</label>
              <input
                id="ep-name"
                ref={nameRef}
                className={nameMissing ? "is-error" : ""}
                value={name}
                onChange={(e) => setName(e.target.value)}
                aria-invalid={nameMissing}
              />
              {nameMissing && <span className="ap-err">Enter a project name.</span>}
            </div>

            <div className="ap-field">
              <label htmlFor="ep-coord">Coordinator</label>
              <div className="ap-select">
                <select id="ep-coord" value={coordinator} onChange={(e) => setCoordinator(e.target.value)}>
                  {options.map((c) => <option key={c}>{c}</option>)}
                </select>
                <ChevronDown size={18} />
              </div>
            </div>

            <div className="ap-field">
              <label htmlFor="ep-status">Status</label>
              <div className="ap-select">
                <select id="ep-status" value={status} onChange={(e) => setStatus(e.target.value as ProjectStatus)}>
                  {STATUS_OPTIONS.map((s) => <option key={s}>{s}</option>)}
                </select>
                <ChevronDown size={18} />
              </div>
            </div>

            <div className="ap-field">
              <label htmlFor="ep-end">Engagement End</label>
              <input id="ep-end" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </div>

          <button type="submit" className="ap-save">Save Changes</button>
        </form>
      </div>
    </>,
    document.body,
  );
}

const editCss = `
.ep-modal .ap-save{margin-top:18px}
`;

const modalCss = `
.ap-backdrop{position:fixed;inset:0;z-index:99999;display:grid;place-items:center;padding:16px;background:rgba(30,32,30,.38);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);overflow-y:auto}
.ap-modal{width:100%;max-width:735px;background:#fff;border-radius:16px;padding:27px 28px 26px;box-shadow:0 20px 56px rgba(0,0,0,.22);animation:ap-in .16s ease-out}
@keyframes ap-in{from{opacity:0;transform:translateY(8px) scale(.985)}to{opacity:1;transform:none}}
@media (prefers-reduced-motion:reduce){.ap-modal{animation:none}}
.ap-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:26px}
.ap-head h2{margin:0;font-size:19px;line-height:1.2;font-weight:600;color:var(--text,#1c1c1a)}
.ap-close{display:grid;place-items:center;width:26px;height:26px;margin-right:5px;border-radius:6px;color:#6b6f73;background:transparent;border:0;cursor:pointer}
.ap-close svg{width:20px;height:20px}
.ap-close:hover{background:#f1f1ee;color:var(--text,#1c1c1a)}
.ap-grid{display:grid;grid-template-columns:1fr 1fr;gap:18px 15px}
.ap-field{display:flex;flex-direction:column;gap:6px;min-width:0}
.ap-field label{font-size:13px;color:var(--text,#1c1c1a)}
.ap-field input,.ap-select select{width:100%;height:37px;padding:0 13px;border:1px solid var(--line,#dedcd5);border-radius:6px;background:#fff;font:inherit;font-size:13.5px;color:var(--text,#1c1c1a);outline:none;box-sizing:border-box}
.ap-field input::placeholder{color:#8a8a85}
.ap-field input:focus,.ap-select select:focus{border-color:var(--green,#1a6b2f);box-shadow:0 0 0 3px rgba(26,107,47,.12)}
.ap-field input.is-error{border-color:#b42318}
.ap-err{font-size:12px;color:#b42318}
.ap-select{position:relative}
.ap-select select{appearance:none;-webkit-appearance:none;padding-right:36px;cursor:pointer}
.ap-select svg{position:absolute;right:11px;top:50%;transform:translateY(-50%);width:15px;height:15px;pointer-events:none;color:var(--text,#1c1c1a)}
.ap-hint{margin:18px 0 14px;font-size:13px;color:var(--muted,#6b6b66)}
.ap-save{height:38px;padding:0 16px;border-radius:6px;background:var(--green,#1a6b2f);color:#fff;font-size:13.5px;font-weight:600;cursor:pointer}
.ap-save:hover{filter:brightness(1.08)}
.ap-save:focus-visible,.ap-close:focus-visible{outline:2px solid var(--green,#1a6b2f);outline-offset:2px}
@media (max-width:640px){
  .ap-modal{padding:22px 18px}
  .ap-grid{grid-template-columns:1fr}
}
`;

/* ---------- Project detail page ---------- */
const DETAIL_TABS = ["General", "Workers", "Workforce Req.", "Contacts", "Accommodation", "Documents", "Tasks & Notes", "History"] as const;
type DetailTab = (typeof DETAIL_TABS)[number];
type WorkerTab = "Current" | "Planned" | "History";
type Tone = "ok" | "info" | "warn" | "bad" | "muted";

interface DetailWorker { name: string; sp: "registered" | "none" | "pending"; role: string; start: string; end: string; accommodation: string }
interface DetailData {
  address: string;
  endDate: string;
  mainContact: string;
  potentialNote: string;
  notes: string;
  contacts: { name: string; role: string; phone: string; email: string }[];
  current: DetailWorker[];
  planned: DetailWorker[];
  past: DetailWorker[];
  requirements: { role: string; requested: number; filled: number; from: string; responsible: string; status: string; tone: Tone }[];
  accommodation: { facility: string; location: string; residents: number; availability: string }[];
  documents: { title: string; note: string }[];
  tasks: string[];
  events: { title: string; note: string }[];
}

const OPEN = "Open-ended";
const NOT_ACC = "Not Accommodated";
const AUTOPARTS_DETAIL: DetailData = {
  address: "Priemyselná 12, 917 01 Trnava",
  endDate: "Ongoing",
  mainContact: "Tomáš Beňo",
  potentialNote: "20 — est. by Jana Kollárová, 15 Aug 2026",
  notes: "Based on the client Q4 volume forecast call",
  contacts: [{ name: "Tomáš Beňo", role: "Site Manager", phone: "+421 900 333 444", email: "t.beno@bosch.sk" }],
  current: [
    { name: "Ivan Petrenko", sp: "none", role: "Production Operator", start: "03 Feb 2025", end: OPEN, accommodation: "Villa Rezidencia Trnava" },
    { name: "Viorel Moldovan", sp: "registered", role: "Packer", start: "19 Mar 2024", end: OPEN, accommodation: NOT_ACC },
    { name: "Nikola Nguyen", sp: "registered", role: "Machine Operator", start: "12 Feb 2024", end: OPEN, accommodation: NOT_ACC },
    { name: "Marko Nguyen", sp: "registered", role: "Production Operator", start: "14 Jul 2025", end: OPEN, accommodation: NOT_ACC },
    { name: "Dragan Pavlović", sp: "registered", role: "Machine Operator", start: "21 Jul 2024", end: OPEN, accommodation: NOT_ACC },
    { name: "Ion Pavlović", sp: "registered", role: "Packer", start: "17 Mar 2025", end: OPEN, accommodation: NOT_ACC },
    { name: "Tomislav Marković", sp: "registered", role: "Production Operator", start: "20 Jun 2025", end: OPEN, accommodation: NOT_ACC },
    { name: "Vlad Vasilev", sp: "registered", role: "Forklift Operator", start: "14 Jun 2024", end: OPEN, accommodation: NOT_ACC },
    { name: "Vlad Bratu", sp: "registered", role: "Assembler", start: "22 Sep 2024", end: OPEN, accommodation: NOT_ACC },
    { name: "Ion Kravets", sp: "registered", role: "Machine Operator", start: "18 Sep 2025", end: OPEN, accommodation: NOT_ACC },
    { name: "Maksym Koval", sp: "registered", role: "Packer", start: "03 Aug 2026", end: OPEN, accommodation: NOT_ACC },
  ],
  planned: [{ name: "Anton Novák", sp: "pending", role: "Production Operator", start: "20 Sep 2026", end: OPEN, accommodation: NOT_ACC }],
  past: [],
  requirements: [
    { role: "Production Operator", requested: 12, filled: 8, from: "20 Sep 2026", responsible: "Jana Kollárová", status: "Partially Filled", tone: "warn" },
    { role: "Forklift Operator", requested: 3, filled: 0, from: "25 Sep 2026", responsible: "Jana Kollárová", status: "Open", tone: "info" },
  ],
  accommodation: [{ facility: "Villa Rezidencia Trnava", location: "Trnava", residents: 1, availability: "38 available of 40" }],
  documents: [
    { title: "Framework Agreement", note: "Signed 03 Feb 2025" },
    { title: "Site Rules & Safety Instructions", note: "Updated 03 Sep 2026" },
  ],
  tasks: [],
  events: [{ title: "Project created", note: "15 Jan 2025 · by Jana Kollárová" }],
};

const detailFor = (p: Project): DetailData => {
  if (p.name === "AutoParts Slovakia" || p.pid === "p1") return AUTOPARTS_DETAIL;
  return {
    address: p.location,
    endDate: p.status === "Completed" ? "Ended" : "Ongoing",
    mainContact: "—",
    potentialNote: p.potential ? String(p.potential) : "—",
    notes: "—",
    contacts: [], current: [], planned: [], past: [], requirements: [],
    accommodation: [], documents: [], tasks: [],
    events: [{ title: "Project created", note: `${p.startDate} · by ${p.coordinator}` }],
  };
};

function Pill({ tone = "muted", dot = true, children }: { tone?: Tone; dot?: boolean; children: React.ReactNode }): React.JSX.Element {
  return <span className={`pd-pill is-${tone}${dot ? "" : " no-dot"}`}>{children}</span>;
}

function ProjectDetail({ project, id, coordinators, onBack, onStats, onDaily, onSave }: {
  project: Project;
  id: string;
  coordinators: string[];
  onBack: () => void;
  onStats: () => void;
  onDaily: () => void;
  onSave: (patch: ProjectPatch) => void;
}): React.JSX.Element {
  const d = detailFor(project);
  const [tab, setTab] = useState<DetailTab>("General");
  const [wTab, setWTab] = useState<WorkerTab>("Current");
  const [editOpen, setEditOpen] = useState(false);

  const statusTone: Tone = project.status === "Active" ? "ok" : project.status === "In preparation" ? "warn" : "muted";
  const endLabel = project.endDate ? fmtDate(project.endDate) : d.endDate;
  const workerRows = wTab === "Current" ? d.current : wTab === "Planned" ? d.planned : d.past;
  const spPill = (sp: DetailWorker["sp"]) =>
    sp === "registered" ? <Pill tone="ok">SP – Registered</Pill>
      : sp === "none" ? <Pill tone="bad">SP – No evidence</Pill>
      : <Pill tone="warn">SP – Pending</Pill>;

  const general: [string, string][] = [
    ["Project ID", id],
    ["Client Company", project.client],
    ["Industry", project.industry],
    ["Full Address", d.address],
    ["Engagement Start", project.startDate],
    ["Engagement End", endLabel],
    ["Coordinator", project.coordinator],
    ["Main Contact", d.mainContact],
    ["Potential Additional Headcount", d.potentialNote],
    ["Notes", d.notes],
  ];

  return (
    <>
      <nav className="pj-crumb pd-crumb" aria-label="Breadcrumb">
        <Link to="/admin">Home</Link>
        <ChevronRight size={14} />
        <a href="/admin/projects" onClick={(e) => { e.preventDefault(); onBack(); }}>Projects</a>
        <ChevronRight size={14} />
        <b>{project.name}</b>
      </nav>

      <section className="sm-card pd-head">
        <div className="pd-icon"><Factory size={26} strokeWidth={1.6} /></div>
        <div className="pd-main">
          <h1>{project.name}</h1>
          <p className="pd-sub">
            {project.client} · {project.location} · {project.startDate} – {project.endDate ? fmtDate(project.endDate) : project.status === "Completed" ? "ended" : "ongoing"}
          </p>
          <div className="pd-pills">
            <Pill tone={statusTone}>{project.status}</Pill>
            <Pill>Coordinator: {project.coordinator}</Pill>
            <Pill tone="info">{project.assigned} assigned</Pill>
            <Pill>{project.confirmed} additional required</Pill>
          </div>
        </div>
        <div className="pd-actions">
          <button type="button" className="sm-btn sm-btn-outline" onClick={onStats}><TrendingUp size={16} /> Statistics</button>
          <button type="button" className="sm-btn sm-btn-outline" onClick={onDaily}><ClipboardCheck size={16} /> Daily work status</button>
          <button type="button" className="sm-btn sm-btn-outline" onClick={() => setEditOpen(true)}><Pencil size={16} /> Edit</button>
        </div>
      </section>

      <div className="pj-tabs pd-tabs" role="tablist">
        {DETAIL_TABS.map((t) => (
          <button key={t} role="tab" aria-selected={tab === t} className={tab === t ? "is-active" : ""} onClick={() => setTab(t)}>{t}</button>
        ))}
      </div>

      {tab === "General" && (
        <section className="sm-card pd-panel">
          <dl className="pd-kv">
            {general.map(([k, v]) => (
              <React.Fragment key={k}>
                <dt>{k}</dt>
                <dd className={k === "Notes" ? "is-muted" : ""}>{v}</dd>
              </React.Fragment>
            ))}
          </dl>
        </section>
      )}

      {tab === "Workers" && (
        <section className="sm-card pd-panel">
          <div className="pj-tabs pd-tabs pd-subtabs" role="tablist">
            {(["Current", "Planned", "History"] as WorkerTab[]).map((t) => {
              const n = t === "Current" ? ` (${d.current.length})` : t === "Planned" ? ` (${d.planned.length})` : "";
              return (
                <button key={t} role="tab" aria-selected={wTab === t} className={wTab === t ? "is-active" : ""} onClick={() => setWTab(t)}>
                  {t}{n}
                </button>
              );
            })}
          </div>
          {workerRows.length === 0 ? (
            <p className="pd-empty">No {wTab.toLowerCase()} workers on this project.</p>
          ) : (
            <div className="sm-table-wrap">
              <table className="sm-table pd-table">
                <thead>
                  <tr><th>Worker</th><th>SP</th><th>Role</th><th>Start</th><th>Planned/Actual End</th><th>Accommodation</th></tr>
                </thead>
                <tbody>
                  {workerRows.map((w) => (
                    <tr key={w.name}>
                      <td><strong>{w.name}</strong></td>
                      <td>{spPill(w.sp)}</td>
                      <td>{w.role}</td>
                      <td>{w.start}</td>
                      <td>{w.end}</td>
                      <td>{w.accommodation}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {tab === "Workforce Req." && (
        <section className="sm-card pd-panel">
          <div className="pd-panel-head">
            <h3>Workforce Requirements</h3>
            <button type="button" className="sm-btn sm-btn-outline"><Plus size={16} /> Add Requirement</button>
          </div>
          {d.requirements.length === 0 ? (
            <p className="pd-empty">No requirements added yet.</p>
          ) : (
            <div className="sm-table-wrap">
              <table className="sm-table pd-table">
                <thead>
                  <tr><th>Role</th><th>Requested</th><th>Filled</th><th>Remaining</th><th>Required From</th><th>Responsible</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {d.requirements.map((r) => (
                    <tr key={r.role}>
                      <td>{r.role}</td>
                      <td>{r.requested}</td>
                      <td>{r.filled}</td>
                      <td>{r.requested - r.filled}</td>
                      <td>{r.from}</td>
                      <td>{r.responsible}</td>
                      <td><Pill tone={r.tone}>{r.status}</Pill></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {tab === "Contacts" && (
        <section className="sm-card pd-panel">
          {d.contacts.length === 0 ? <p className="pd-empty">No contacts added yet.</p> : d.contacts.map((c) => (
            <div key={c.email} className="pd-item">
              <strong>{c.name}</strong>
              <span>{c.role} · {c.phone} · {c.email}</span>
            </div>
          ))}
        </section>
      )}

      {tab === "Accommodation" && (
        <section className="sm-card pd-panel">
          {d.accommodation.length === 0 ? <p className="pd-empty">No accommodation linked to this project.</p> : (
            <div className="sm-table-wrap">
              <table className="sm-table pd-table">
                <thead><tr><th>Facility</th><th>Location</th><th>This Project's Residents</th><th>Facility Availability</th></tr></thead>
                <tbody>
                  {d.accommodation.map((a) => (
                    <tr key={a.facility}>
                      <td><strong>{a.facility}</strong></td>
                      <td>{a.location}</td>
                      <td>{a.residents}</td>
                      <td>{a.availability}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {tab === "Documents" && (
        <section className="sm-card pd-panel">
          {d.documents.length === 0 ? <p className="pd-empty">No documents uploaded yet.</p> : d.documents.map((x) => (
            <div key={x.title} className="pd-item">
              <strong>{x.title}</strong>
              <span>{x.note}</span>
            </div>
          ))}
        </section>
      )}

      {tab === "Tasks & Notes" && (
        <section className="sm-card pd-panel">
          {d.tasks.length === 0 ? <p className="pd-empty pd-flat">No open tasks linked to this project.</p> : d.tasks.map((t) => (
            <div key={t} className="pd-item"><strong>{t}</strong></div>
          ))}
        </section>
      )}

      {tab === "History" && (
        <section className="sm-card pd-panel">
          {d.events.map((e) => (
            <div key={e.title + e.note} className="pd-item">
              <strong>{e.title}</strong>
              <span>{e.note}</span>
            </div>
          ))}
        </section>
      )}

      {editOpen && (
        <EditProjectModal
          project={project}
          coordinators={coordinators}
          onClose={() => setEditOpen(false)}
          onSave={(patch) => { onSave(patch); setEditOpen(false); }}
        />
      )}
    </>
  );
}

/* ---------- Page ---------- */
export default function ProjectsPage(): React.JSX.Element {
  const [searchParams, setSearchParams] = useSearchParams();
  // /admin/projects?tab=daily opens the Daily work status tab directly
  const initialTab = searchParams.get("tab");
  const [tab, setTab] = useState<Tab>(
    initialTab === "daily" ? "Daily work status" : initialTab === "stats" ? "Statistics" : "Projects",
  );
  const [query, setQuery] = useState("");
  const holidayRef = React.useRef<(() => void) | null>(null);
  const exportRef = React.useRef<(() => void) | null>(null);

  // Projects list is state so newly added projects show up in the table
  const [projects, setProjects] = useState<Project[]>(PROJECTS);
  const [addOpen, setAddOpen] = useState(false);
  // /admin/projects?detail=AutoParts%20Slovakia opens that project's detail page directly
  const [selected, setSelected] = useState<Project | null>(() => {
    const d = searchParams.get("detail");
    return d ? PROJECTS.find((p) => p.name === d || p.pid === d) ?? null : null;
  });
  useEffect(() => {
    const d = searchParams.get("detail");
    if (!d) return;
    const hit = projects.find((p) => p.name === d || p.pid === d);
    if (hit) setSelected(hit);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({ industry: "Any", location: "Any", coordinator: "Any", status: "Any" });
  const setFilter = (k: keyof typeof filters, v: string) => setFilters((f) => ({ ...f, [k]: v }));
  const clearFilters = () => setFilters({ industry: "Any", location: "Any", coordinator: "Any", status: "Any" });
  const filtersActive = Object.values(filters).some((v) => v !== "Any");
  const uniq = (key: "industry" | "location" | "coordinator") =>
    Array.from(new Set(projects.map((p) => p[key]).filter((v) => v && v !== "—"))).sort((a, b) => a.localeCompare(b));

  const handleAdd = (p: NewProjectInput) => {
    setProjects((list) => [
      {
        name: p.name,
        client: p.client,
        industry: p.industry || "—",
        location: p.location || "—",
        coordinator: p.coordinator,
        startDate: fmtDate(p.startDate),
        assigned: 0,
        confirmed: 0,
        potential: null,
        status: "In preparation",
      },
      ...list,
    ]);
    setAddOpen(false);
  };

  // Called by the Edit Project dialog on Save Changes
  const handleEdit = (patch: ProjectPatch) => {
    if (!selected) return;
    const updated: Project = {
      ...selected,
      name: patch.name,
      coordinator: patch.coordinator,
      status: patch.status,
      endDate: patch.endDate || undefined,
    };
    setProjects((list) => list.map((p) => (p === selected ? updated : p)));
    setSelected(updated);
  };

  // Leave the detail page (and drop ?detail= from the URL so a refresh doesn't reopen it)
  const closeDetail = () => {
    setSelected(null);
    if (searchParams.get("detail")) setSearchParams({}, { replace: true });
  };

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return projects.filter((p) =>
      (!q || p.name.toLowerCase().includes(q) || p.client.toLowerCase().includes(q)) &&
      (filters.industry === "Any" || p.industry === filters.industry) &&
      (filters.location === "Any" || p.location === filters.location) &&
      (filters.coordinator === "Any" || p.coordinator === filters.coordinator) &&
      (filters.status === "Any" || p.status === filters.status),
    );
  }, [query, projects, filters]);

  const stats = [
    { label: "Active Projects", value: projects.filter((p) => p.status === "Active").length },
    { label: "In Preparation", value: projects.filter((p) => p.status === "In preparation").length },
    { label: "Unique Workers Active", value: 44 },
    { label: "Confirmed Additional Req.", value: projects.reduce((a, p) => a + p.confirmed, 0) },
  ];

  if (selected) {
    return (
      <>
        <style>{css}</style>
        <ProjectDetail
          project={selected}
          id={selected.pid ?? "—"}
          coordinators={Array.from(new Set(projects.map((p) => p.coordinator)))}
          onBack={closeDetail}
          onStats={() => { closeDetail(); setTab("Statistics"); }}
          onDaily={() => { closeDetail(); setTab("Daily work status"); }}
          onSave={handleEdit}
        />
      </>
    );
  }

  const isDaily = tab === "Daily work status";
  const isStats = tab === "Statistics";

  return (
    <>
      <style>{css}</style>

      <nav className="pj-crumb" aria-label="Breadcrumb">
        <Link to="/admin">Home</Link>
        <ChevronRight size={14} />
        {isDaily || isStats ? (
          <>
            <a href="/admin/projects" onClick={(e) => { e.preventDefault(); setTab("Projects"); }}>Projects</a>
            <ChevronRight size={14} />
            <b>{isDaily ? "Daily work status" : "Statistics"}</b>
          </>
        ) : (
          <b>Projects</b>
        )}
      </nav>

      <div className={`sm-title-row${isDaily ? " dw-title-row" : ""}`}>
        {isStats ? (
          <>
            <div>
              <h1>Statistics</h1>
              <p className="pj-desc">
                Counted in worker-days from confirmed daily records. Hours, overtime and pay are not part of this system.
              </p>
            </div>
            <button className="sm-btn sm-btn-outline" onClick={() => exportRef.current?.()}>
              <Download size={16} /> Export
            </button>
          </>
        ) : isDaily ? (
          <>
            <div>
              <h1>Daily work status</h1>
              <p className="pj-desc">
                A retrospective record of who worked and who did not. Mark only the workers who did not work, then
                review and confirm. No hours, overtime or payroll are recorded. Night shifts count on the day the
                shift starts.
              </p>
            </div>
            <button className="sm-btn sm-btn-outline" onClick={() => holidayRef.current?.()}>
              <Umbrella size={16} /> Factory holiday / shutdown
            </button>
          </>
        ) : (
          <>
            <div>
              <h1>Projects</h1>
              <p className="pj-desc">
                Factory-site staffing engagements — one row per site, linked to the client company. A company may
                have several sites; the client record is reused, not duplicated.
              </p>
            </div>
            <button className="sm-btn sm-btn-primary" onClick={() => setAddOpen(true)}><Plus size={16} /> Add Project</button>
          </>
        )}
      </div>

      <div className="pj-tabs" role="tablist">
        {TABS.map((t) => (
          <button key={t} role="tab" aria-selected={tab === t} className={tab === t ? "is-active" : ""} onClick={() => setTab(t)}>
            {t}
          </button>
        ))}
      </div>

      {isStats && <StatisticsTab exportRef={exportRef} onSeeWhich={() => setTab("Daily work status")} />}

      {isDaily && <DailyWorkStatus holidayRef={holidayRef} />}

      {tab === "Projects" && (
        <>
          <section className="sm-card sm-stat-group pj-compact" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
            {stats.map((s) => (
              <div key={s.label} className="sm-stat pj-stat">
                <div className="sm-stat-title">{s.label}</div>
                <div className="sm-stat-value">{s.value}</div>
              </div>
            ))}
          </section>

          <section className="sm-card pj-panel">
            <div className="pj-toolbar">
              <label className="pj-search">
                <Search size={16} />
                <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Project or client name" />
              </label>
              <button type="button" className={`sm-btn sm-btn-outline${showFilters || filtersActive ? " is-open" : ""}`} aria-expanded={showFilters} onClick={() => setShowFilters((v) => !v)}><SlidersHorizontal size={16} /> Filters</button>
              <button className="sm-btn sm-btn-outline"><Columns3 size={16} /> Columns</button>
              <button className="sm-btn sm-btn-outline"><Download size={16} /> Export</button>
            </div>

            {showFilters && (
              <div className="pf-panel">
                <div className="pf-grid">
                  {([
                    ["industry", "Industry", uniq("industry")],
                    ["location", "Location", uniq("location")],
                    ["coordinator", "Coordinator", uniq("coordinator")],
                    ["status", "Engagement Status", ["Active", "In preparation", "Completed"]],
                  ] as [keyof typeof filters, string, string[]][]).map(([key, label, options]) => (
                    <div key={key} className="pf-field">
                      <label htmlFor={`pf-${key}`}>{label}</label>
                      <div className="pf-select">
                        <select id={`pf-${key}`} value={filters[key]} onChange={(e) => setFilter(key, e.target.value)}>
                          <option>Any</option>
                          {options.map((o) => <option key={o}>{o}</option>)}
                        </select>
                        <ChevronDown size={16} />
                      </div>
                    </div>
                  ))}
                </div>
                <button type="button" className="pf-clear" onClick={clearFilters}>Clear filters</button>
              </div>
            )}

            <div className="sm-table-wrap">
              <table className="sm-table pj-table">
                <thead>
                  <tr>
                    <th>Project / Factory</th><th>Industry</th><th>Location</th><th>Coordinator</th>
                    <th>Start Date</th><th>Assigned</th><th>Confirmed Add'l Req.</th><th>Potential</th><th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((p) => (
                    <tr key={p.pid ?? p.name}>
                      <td><button type="button" className="pj-link" onClick={() => setSelected(p)}><strong>{p.name}</strong></button><small>{p.client}</small></td>
                      <td>{p.industry}</td>
                      <td>{p.location}</td>
                      <td>{p.coordinator}</td>
                      <td>{p.startDate}</td>
                      <td>{p.assigned}</td>
                      <td>{p.confirmed}</td>
                      <td>{p.potential ?? "—"}</td>
                      <td><span className={`sm-pill ${STATUS_CLASS[p.status]}`}>{p.status}</span></td>
                    </tr>
                  ))}
                  {rows.length === 0 && (
                    <tr><td colSpan={9} className="pj-none">No projects match the current search or filters.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

      <AddProjectModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSave={handleAdd}
        clients={Array.from(new Set(PROJECTS.map((p) => p.client)))}
        coordinators={Array.from(new Set(PROJECTS.map((p) => p.coordinator)))}
      />
    </>
  );
}

const css = `
.pj-crumb{display:flex;align-items:center;gap:8px;font-size:16px;color:var(--muted);margin-bottom:11px}
.pj-crumb a:hover{color:var(--text)} .pj-crumb b{color:var(--text);font-weight:600}
.pj-desc{max-width:760px}
.pj-tabs{display:flex;gap:6px;border-bottom:1px solid var(--line);margin-bottom:19px}
.pj-tabs button{padding:10px 18px 12px;font-size:17px;color:var(--muted);border-bottom:2px solid transparent;margin-bottom:-1px}
.pj-tabs button.is-active{color:var(--green);font-weight:600;border-bottom-color:var(--green)}
.pj-stat{min-height:0;padding:16px 22px}
.pj-stat .sm-stat-value{margin-top:6px}
.pj-panel{padding:0 0 12px;margin-bottom:19px}
.pj-toolbar{display:flex;align-items:center;justify-content:space-between;gap:14px;padding:20px 22px 14px}
.pj-search{display:flex;align-items:center;gap:10px;width:320px;max-width:100%;height:42px;padding:0 14px;border:1px solid var(--line);border-radius:8px;background:#faf9f6;color:var(--muted)}
.pj-search input{flex:1;border:0;background:transparent;outline:none;font-size:16px;color:var(--text)}
.pj-table{min-width:1000px}
.pj-table th,.pj-table td{white-space:nowrap;padding-left:18px}
.pj-table th{font-size:15px}
.pj-table td{padding-top:14px;padding-bottom:14px}
.pj-none{text-align:center;color:var(--muted);padding:28px 0!important}
.pj-empty{padding:40px;text-align:center;color:var(--muted);font-size:16px}
.sm-pill.muted{background:#eeede8;color:var(--muted)}

/* ---- Daily work status ---- */
.dw-top{display:flex;flex-wrap:wrap;justify-content:space-between;align-items:flex-start;gap:14px 24px;padding:22px 28px 26px;margin-bottom:19px}
.dw-field{display:flex;flex-direction:column;gap:8px}
.dw-field label{font-size:16px;color:var(--muted)}
.dw-field-right{align-items:flex-end}
.dw-select{position:relative;display:block}
.dw-select select{appearance:none;-webkit-appearance:none;width:100%;height:44px;padding:0 40px 0 18px;border:1px solid var(--line);border-radius:8px;background:#fff;font-size:17px;color:var(--text);outline:none;cursor:pointer}
.dw-select select:focus{border-color:var(--green)}
.dw-select svg{position:absolute;right:14px;top:50%;transform:translateY(-50%);pointer-events:none;color:var(--text)}
.dw-select-lg{width:345px;max-width:100%}
.dw-select-lg select{height:50px}
.dw-date{display:flex;align-items:center;gap:8px}
.dw-date input{height:52px;padding:0 14px;border:1px solid var(--line);border-radius:8px;background:#fff;font-size:18px;color:var(--text);outline:none}
.dw-date input:focus{border-color:var(--green)}
.dw-step{display:grid;place-items:center;width:38px;height:38px;border:1px solid var(--line);border-radius:8px;background:#fff;color:var(--text)}
.dw-step:hover{background:#f1f1f1}
.dw-pills{flex-basis:100%;display:flex;flex-wrap:wrap;justify-content:flex-end;gap:10px}
.sm-pill .dw-dot{display:inline-block;width:8px;height:8px;border-radius:50%;background:currentColor;margin-right:8px;vertical-align:middle}
.dw-panel{padding:8px 0 22px;margin-bottom:19px}
.dw-table{min-width:1080px}
.dw-table th,.dw-table td{white-space:nowrap;padding-left:18px;vertical-align:middle}
.dw-table td{padding-top:12px;padding-bottom:12px}
.dw-name{display:flex;align-items:center;gap:8px}
.dw-sp{display:inline-block;padding:1px 8px;border-radius:5px;background:#b42318;color:#fff;font-size:13px;font-weight:700}
.dw-warn{color:#b42318;font-weight:600}
.dw-check{display:inline-flex;align-items:center;gap:10px;cursor:pointer}
.dw-check input{width:22px;height:22px;accent-color:var(--green);cursor:pointer}
.dw-table .dw-select{width:460px}
.dw-note{width:200px;height:36px;padding:0 10px;border:1px solid var(--line);border-radius:6px;background:#faf9f6;font-size:16px;color:var(--text);outline:none}
.dw-note:focus{border-color:var(--green);background:#fff}
.dw-actions{display:flex;justify-content:flex-end;gap:12px;padding:18px 28px 0}
.dw-review{padding:22px 28px;margin-bottom:16px}
.dw-review h3{display:flex;align-items:center;gap:10px;font-size:19px;margin:0 0 14px}
.dw-review p{color:var(--muted);margin:0 0 20px}
.dw-review-row{display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap}
.dw-review-row small{display:block;color:var(--muted);margin-top:4px}
.dw-review-btns{display:flex;gap:10px}
.dw-foot{color:var(--muted);margin:0 0 24px}

/* ---- Statistics ---- */
.st-top{display:flex;flex-wrap:wrap;align-items:flex-end;gap:16px 18px;padding:22px 28px 26px;margin-bottom:19px}
.st-scope{width:330px;max-width:100%}
.st-scope select{height:50px}
.st-ctl{display:inline-flex;gap:4px;padding:5px;border-radius:10px;background:#eeede8;margin-bottom:0}
.st-ctl button{padding:9px 14px;border-radius:7px;font-size:17px;color:var(--muted)}
.st-ctl button.is-active{background:#fff;color:var(--text);font-weight:600;box-shadow:0 1px 2px rgba(0,0,0,.08)}
.st-summary{margin-left:auto;color:var(--muted);font-size:18px;padding-bottom:12px}
.st-banner{display:flex;align-items:center;gap:14px;padding:14px 22px;margin-bottom:19px;border-radius:12px;background:#fde4bd;color:#4a3410;font-size:18px;line-height:1.4}
.st-banner svg{flex:none}
.st-banner span{flex:1}
.st-banner button{flex:none;max-width:90px;text-align:left;font-weight:600;color:#33260c}
.st-grid{display:grid;grid-template-columns:1.3fr 1fr;gap:24px;margin-bottom:19px}
.st-grid-even{grid-template-columns:1fr 1fr}
.st-panel{padding:22px 28px 26px}
.st-wide{margin-bottom:19px}
.st-panel h3{display:flex;align-items:center;gap:10px;font-size:19px;margin:0 0 18px}
.st-chart{display:flex;align-items:flex-end;gap:3px;margin-top:6px}
.st-col{flex:1 1 0;max-width:140px;min-width:0;display:flex;flex-direction:column;align-items:center;gap:8px}
.st-col>span{font-size:15px;color:var(--muted);white-space:nowrap}
.st-bar{width:100%;height:170px;display:flex;flex-direction:column;justify-content:flex-end}
.st-w{background:#1a6b2f}
.st-dnw{background:#3a6275}
.st-ne{background:#b42318}
.st-unc{background:repeating-linear-gradient(135deg,#d9d6cd 0,#d9d6cd 2px,#fff 2px,#fff 6px)}
.st-legend{display:flex;flex-wrap:wrap;align-items:center;gap:6px 18px;margin-top:16px;font-size:17px;color:var(--muted)}
.st-legend span{display:inline-flex;align-items:center;gap:6px}
.st-legend i{display:inline-block;width:14px;height:14px}
.st-reasons th:last-child,.st-reasons td:last-child{text-align:right}
.st-reasons td{padding-top:12px;padding-bottom:12px}
.st-table th:not(:first-child),.st-table td:not(:first-child){text-align:right}
.st-table th,.st-table td{white-space:nowrap}
.st-table td{padding-top:12px;padding-bottom:12px}
.st-total td{font-weight:700}
.st-kv{display:grid;grid-template-columns:auto 1fr;gap:12px 28px;margin:0 0 14px;font-size:18px;color:var(--muted)}
.st-kv dd{margin:0;color:var(--text);font-weight:700}
.st-note{margin:0;color:var(--muted);font-size:17px;line-height:1.5}
@media (max-width:1100px){.st-grid,.st-grid-even{grid-template-columns:1fr}}

/* ---- Compact sizing: Daily work status + Statistics (smaller cards and fonts) ---- */
.pj-crumb{font-size:13px}
.pj-desc{font-size:14px;line-height:1.45}
.pj-tabs button{font-size:14px;padding:8px 14px 9px}

/* stat cards */
.pj-compact .sm-stat{padding:9px 14px;min-height:0}
.pj-compact .sm-stat-title{font-size:12.5px}
.pj-compact .sm-stat-value{font-size:22px;line-height:1.1;margin-top:3px}
.pj-compact .sm-stat-caption{font-size:12px;margin-top:2px;line-height:1.3}

/* tables */
.pj-table,.dw-table,.st-table,.st-reasons{font-size:13.5px}
.pj-table th,.dw-table th,.st-table th,.st-reasons th{font-size:12.5px}
.pj-table td,.dw-table td,.st-table td,.st-reasons td{padding-top:7px;padding-bottom:7px}
.pj-table small,.dw-table small{font-size:12px;margin-top:1px}
.pj-toolbar{padding:12px 16px 8px}
.pj-search{height:34px;font-size:13px}
.pj-search input{font-size:13px}

/* daily work status */
.dw-top,.st-top{padding:12px 16px 12px;margin-bottom:12px;gap:10px 18px}
.dw-field{gap:5px}
.dw-field label{font-size:12.5px}
.dw-select select{height:34px;font-size:13.5px;padding:0 34px 0 12px}
.dw-select svg{right:10px;width:15px;height:15px}
.dw-select-lg{width:250px}
.dw-select-lg select{height:36px}
.dw-date input{height:36px;font-size:13.5px;padding:0 10px}
.dw-step{width:28px;height:28px}
.dw-pills{gap:8px}
.dw-pills .sm-pill{font-size:12px;padding:3px 10px}
.sm-pill .dw-dot{width:6px;height:6px;margin-right:6px}
.dw-panel{padding:2px 0 12px;margin-bottom:12px}
.dw-table .dw-select{width:310px}
.dw-note{width:150px;height:30px;font-size:13px}
.dw-check{gap:8px;font-size:13.5px}
.dw-check input{width:16px;height:16px}
.dw-sp{font-size:11px;padding:0 6px}
.dw-actions{padding:12px 16px 0;gap:10px}
.dw-review{padding:12px 16px;margin-bottom:12px}
.dw-review h3{font-size:14.5px;margin-bottom:8px}
.dw-review p{font-size:13px;margin-bottom:12px}
.dw-review-row small{font-size:12px}
.dw-foot{font-size:12.5px;margin-bottom:16px}

/* statistics */
.st-scope{width:240px}
.st-scope select{height:36px}
.st-ctl{padding:3px}
.st-ctl button{font-size:13px;padding:6px 11px}
.st-summary{font-size:13.5px;padding-bottom:6px}
.st-banner{font-size:13.5px;padding:8px 14px;margin-bottom:12px;gap:10px}
.st-banner svg{width:17px;height:17px}
.st-banner button{font-size:13.5px}
.st-grid{gap:12px;margin-bottom:12px}
.st-panel{padding:12px 16px 14px}
.st-wide{margin-bottom:12px}
.st-panel h3{font-size:14.5px;margin-bottom:10px;gap:8px}
.st-bar{height:105px}
.st-col{gap:5px}
.st-col>span{font-size:12px}
.st-legend{font-size:12.5px;margin-top:10px;gap:4px 14px}
.st-legend i{width:11px;height:11px}
.st-kv{font-size:13.5px;gap:6px 18px;margin-bottom:10px}
.st-note{font-size:12.5px}

/* ---- Daily work status header: button aligned like the design ---- */
.dw-title-row{display:flex;align-items:flex-end;justify-content:space-between;gap:46px}
.dw-title-row>div{flex:1;min-width:0}
.dw-title-row .pj-desc{max-width:none;margin-bottom:0}
.dw-title-row .sm-btn{flex:none;white-space:nowrap;align-self:flex-end;margin-bottom:0}
@media (max-width:900px){
  .dw-title-row{flex-direction:column;align-items:flex-start;gap:12px}
}

/* ---- Statistics: "Worker-days by day" + "Did not work — by reason" cards (match design) ---- */
.st-grid:not(.st-grid-even){align-items:stretch;gap:24px}
.st-grid:not(.st-grid-even)>.st-panel{display:flex;flex-direction:column;padding:20px 20px 22px}
.st-grid:not(.st-grid-even)>.st-panel h3{font-size:14.5px;font-weight:600;gap:10px;margin:0 0 14px}
.st-grid:not(.st-grid-even)>.st-panel h3 svg{flex:none;color:var(--muted)}

/* chart */
.st-chart{display:flex;align-items:flex-end;gap:3px;margin-top:8px}
.st-col{flex:1 1 0;max-width:140px;min-width:0;gap:6px}
.st-bar{height:165px}
.st-col>span{font-size:12px;color:var(--muted)}
.st-legend{display:flex;flex-wrap:wrap;align-items:center;gap:6px 14px;margin-top:12px;font-size:12.5px;color:var(--muted)}
.st-legend span{display:inline-flex;align-items:center;gap:6px}
.st-legend i{width:11px;height:11px}

/* reasons table: full-width rows with dividers, right-aligned count */
.st-grid:not(.st-grid-even)>.st-panel .sm-table-wrap{margin:0 -4px;overflow-x:auto}
.st-reasons{width:100%;border-collapse:collapse}
.st-reasons th{font-size:12.5px;font-weight:500;color:var(--muted);text-align:left;padding:8px 12px 10px;border-bottom:1px solid var(--line)}
.st-reasons td{font-size:13.5px;color:var(--text);padding:7px 12px;border-bottom:1px solid var(--line)}
.st-reasons tbody tr:last-child td{border-bottom:0}
.st-reasons th:last-child,.st-reasons td:last-child{text-align:right}
.st-reasons td:last-child{font-weight:500}

/* Worker-days by day card: chart grows to fill the card height */
.st-grid:not(.st-grid-even)>.st-panel:first-child .st-chart{flex:1;align-items:stretch}
.st-grid:not(.st-grid-even)>.st-panel:first-child .st-bar{flex:1;height:auto;min-height:165px}

/* ---- Project detail page (sizes matched to the design screenshot at 125% scale) ---- */
.pj-link{display:block;padding:0;text-align:left;color:var(--text);cursor:pointer}
.pj-link:hover strong{color:var(--green);text-decoration:none}
.pd-head{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;padding:24px;margin-bottom:16px}
.pd-icon{flex:none;display:grid;place-items:center;width:67px;height:67px;border-radius:14px;background:#d4efd7;color:#14401f}
.pd-icon svg{width:32px;height:32px}
.pd-main{flex:1;min-width:0}
.pd-main h1{margin:0;font-size:20px;line-height:1.2;padding-bottom:4px;font-weight:600;color:var(--text)}
.pd-sub{margin:7px 0 10px;font-size:14px;line-height:1.3;color:var(--muted)}
.pd-pills{display:flex;flex-wrap:wrap;padding-top:10px;gap:9px 8px}
.pd-pill{display:inline-flex;align-items:center;gap:7px;height:22px;padding:0 10px;border-radius:14px;font-size:12px;font-weight:500;line-height:1;background:#eeede8;color:#3d3d3a;white-space:nowrap}
.pd-pill::before{content:"";width:7px;height:7px;border-radius:50%;background:currentColor;flex:none}
.pd-pill.no-dot::before{display:none}
.pd-pill.is-ok{background:#e1f0e4;color:#1a6b2f}
.pd-pill.is-info{background:#e2ecf8;color:#1f5fa8}
.pd-pill.is-warn{background:#fdebc8;color:#7a4b00}
.pd-pill.is-bad{background:#fde3e0;color:#b42318}
.pd-pill.is-muted{background:#eeede8;color:#3d3d3a}
.pd-actions{display:flex;align-items:flex-start;gap:10px;flex:none;align-self:flex-start}
.pd-actions .sm-btn,.pd-panel-head .sm-btn{display:inline-flex;align-items:center;justify-content:center;gap:9px;height:38px;padding:0 17px;border-radius:8px;font-size:14px;line-height:1;white-space:nowrap}
.pd-actions .sm-btn svg,.pd-panel-head .sm-btn svg{width:16px;height:16px;flex:none}
.pd-tabs button{font-size:15.5px;padding:10px 14px 11px}
.pd-panel{padding:20px 24px 22px;margin-bottom:16px}
.pd-panel-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:14px}
.pd-panel-head h3{margin:0;font-size:16px;font-weight:600}
.pd-subtabs{margin-bottom:6px}
.pd-kv{display:grid;grid-template-columns:205px 1fr;gap:11px 18px;margin:0;font-size:15px;line-height:1.35}
.pd-kv dt{color:var(--muted)}
.pd-kv dd{margin:0;color:var(--text)}
.pd-kv dd.is-muted{color:var(--muted)}
.pd-table{width:100%;font-size:14.8px}
.pd-table th{font-size:13.5px;font-weight:500;color:var(--muted);white-space:nowrap}
.pd-table td{white-space:nowrap;padding-top:12px;padding-bottom:12px}
.pd-table .pd-pill{height:25px;font-size:13.5px}
.pd-item{display:flex;flex-direction:column;gap:3px;padding:2px 0 16px;font-size:15px}
.pd-item:last-child{padding-bottom:2px}
.pd-item strong{font-size:15.5px}
.pd-item span{color:var(--muted)}
.pd-empty{margin:6px 0;color:var(--muted);font-size:15px}
@media (max-width:1100px){
  .pd-head{flex-wrap:wrap}
  .pd-actions{flex-basis:100%}
}
@media (max-width:700px){
  .pd-kv{grid-template-columns:1fr;gap:2px 0}
  .pd-kv dd{margin-bottom:10px}
}

/* ---- Projects: filters panel ---- */
.sm-btn.is-open{border-color:var(--green);color:var(--green)}
.pf-panel{margin:0 16px 14px;padding:16px 20px 12px;border:1px solid var(--line);border-radius:12px;background:#faf9f6}
.pf-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px}
.pf-field{display:flex;flex-direction:column;gap:7px;min-width:0}
.pf-field label{font-size:13.5px;color:var(--muted)}
.pf-select{position:relative}
.pf-select select{appearance:none;-webkit-appearance:none;width:100%;height:40px;padding:0 38px 0 14px;border:1px solid var(--line);border-radius:8px;background:#fff;font:inherit;font-size:14.5px;color:var(--text);outline:none;cursor:pointer;box-sizing:border-box}
.pf-select select:focus{border-color:var(--green);box-shadow:0 0 0 3px rgba(26,107,47,.12)}
.pf-select svg{position:absolute;right:12px;top:50%;transform:translateY(-50%);width:16px;height:16px;pointer-events:none;color:var(--text)}
.pf-clear{margin-top:12px;padding:8px 14px;font-size:14.5px;font-weight:500;color:var(--green);cursor:pointer;border-radius:6px}
.pf-clear:hover{background:rgba(26,107,47,.08)}
@media (max-width:1000px){.pf-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media (max-width:560px){.pf-grid{grid-template-columns:1fr}}

/* ---- Project detail page: compact sizes (matched to the reference screenshot) ---- */
.pd-crumb{font-size:14px;margin-bottom:12px}

/* header card */
.pd-head{gap:18px;padding:20px 20px 21px;margin-bottom:18px}
.pd-icon{width:56px;height:56px;border-radius:12px}
.pd-icon svg{width:28px;height:28px}
.pd-main h1{padding-bottom:6px}
.pd-sub{font-size:14.5px}
.pd-pills{gap:8px}
.pd-actions{gap:9px}
.pd-actions .sm-btn,.pd-panel-head .sm-btn{height:32px;padding:0 14px;gap:7px;font-size:14.5px;border-radius:7px}
.pd-actions .sm-btn svg,.pd-panel-head .sm-btn svg{width:16px;height:16px}

/* tabs */
.pd-tabs{gap:2px;margin-bottom:17px}
.pd-tabs button{font-size:14.5px;padding:7px 12px 8px}
.pd-subtabs{margin-bottom:4px}

/* content panels */
.pd-panel{padding:18px 20px 20px;margin-bottom:14px}
.pd-panel:has(> .pd-item){padding-top:27px;padding-bottom:27px}
.pd-panel-head{margin-bottom:12px}
.pd-panel-head h3{font-size:15px}
.pd-kv{grid-template-columns:168px 1fr;gap:8px 18px;font-size:14.3px}
.pd-table{font-size:14px}
.pd-table th{font-size:13px}
.pd-table td{padding-top:7px;padding-bottom:7px}
.pd-table .pd-pill{height:21px;font-size:12px}
.pd-item{gap:3px;padding:0 0 20px;font-size:13px}
.pd-item strong{font-size:14.5px}
.pd-empty{margin:0;font-size:14px}

@media (max-width:700px){
  .pd-kv{grid-template-columns:1fr;gap:2px 0}
}

/* ---- Daily work status: confirmed (read-only) table + review card ---- */
.dw-table-ro{min-width:0;width:100%}
.dw-table-ro th:nth-child(1){width:26%}
.dw-table-ro th:nth-child(2){width:26%}
.dw-table-ro tbody tr{border-top:1px solid var(--line)}
.dw-table-ro .sm-pill{font-size:13px;padding:3px 11px}
.dw-note-ro{color:var(--muted)}
.dw-table-ro td.dw-act{text-align:right;padding-right:56px}
.dw-correct{background:none;border:0;padding:0;color:var(--green);font-size:13.5px;font-weight:500;cursor:pointer}
.dw-correct:hover{text-decoration:none}
.dw-review .sm-btn-primary{background:#5fd68a;color:#073b1a;border-color:transparent}

/* ---- Daily work status: top card (matches design) ---- */
.dw-top{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:12px 24px}
.dw-left{display:flex;flex-wrap:wrap;align-items:flex-end;gap:12px 14px}
.dw-pills{flex-basis:100%;display:flex;flex-wrap:wrap;justify-content:flex-end;gap:8px}
.dw-pills.is-inline{flex-basis:auto;margin-left:auto;align-self:center}
.dw-pills .sm-pill.ok{display:inline-flex;align-items:center;white-space:nowrap}

/* dark-theme safe controls: no hardcoded white */
.dw-select select,
.dw-date input,
.dw-step{background:transparent;color:var(--text);border-color:var(--line)}
.dw-step:hover{background:rgba(128,128,128,.14)}
.dw-select select option{background:var(--card,#fff);color:var(--text)}
.dw-date{align-items:center;gap:8px}
.dw-date input{height:36px}
.dw-step{width:32px;height:32px;border-radius:8px}

/* ---- Project detail: theme-aware icon tile + pills (no hardcoded light colours) ---- */
.pd-icon{background:color-mix(in srgb,var(--green) 20%,var(--card,#fff));color:var(--green)}
.pd-pill{background:color-mix(in srgb,var(--muted) 16%,transparent);color:var(--text)}
.pd-pill.is-muted{background:color-mix(in srgb,var(--muted) 16%,transparent);color:var(--muted)}
.pd-pill.is-ok{background:color-mix(in srgb,var(--green) 16%,transparent);color:var(--green)}
.pd-pill.is-info{background:color-mix(in srgb,#5b9cf0 18%,transparent);color:#5b9cf0}
.pd-pill.is-warn{background:color-mix(in srgb,#d99a1b 18%,transparent);color:#d99a1b}
.pd-pill.is-bad{background:color-mix(in srgb,#e5594b 18%,transparent);color:#e5594b}

/* ---- Daily work status: message shown after "Correct all as worked" ---- */
.dw-notice{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:9px 14px;margin-bottom:12px;border-radius:10px;background:color-mix(in srgb,var(--green) 16%,transparent);color:var(--green);font-size:13px}
.dw-notice button{display:grid;place-items:center;width:24px;height:24px;border-radius:6px;color:inherit;cursor:pointer}
.dw-notice button:hover{background:rgba(128,128,128,.16)}
`;
