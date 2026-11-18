import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
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

/** Identifies a worker when opening the worker profile page. */
interface WorkerRef { name: string; code?: string; role?: string; project: string }

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

// Warehouse Ops roster (alphabetical, as shown in the reference screenshot)
const WAREHOUSE_WORKERS: DayWorker[] = [
  { id: "h1", name: "Andrei Rusu", code: "SM-0432", role: "Warehouse Associate" },
  { id: "h2", name: "Elena Popescu", code: "SM-0876", role: "Quality Control Inspector" },
  { id: "h3", name: "Georgi Bondar", code: "SM-1132", role: "Machine Operator" },
  { id: "h4", name: "Maksym Bratu", code: "SM-1128", role: "Packer" },
  { id: "h5", name: "Maksym Nguyen", code: "SM-1155", role: "Forklift Operator" },
  { id: "h6", name: "Petar Marković", code: "SM-1147", role: "Assembler", notEligible: true },
  { id: "h7", name: "Stefan Nguyen", code: "SM-1152", role: "Production Operator" },
  { id: "h8", name: "Taras Ionescu", code: "SM-1130", role: "Packer" },
  { id: "h9", name: "Viktor Dimitrov", code: "SM-1134", role: "Forklift Operator" },
  { id: "h10", name: "Vlad Stoica", code: "SM-1138", role: "Warehouse Associate" },
  { id: "h11", name: "Zoran Ilić", code: "SM-1141", role: "Machine Operator" },
];

const workersFor = (project: string): DayWorker[] =>
  project === "AutoParts Slovakia" ? AUTOPARTS_WORKERS
    : project === "Warehouse Ops" ? WAREHOUSE_WORKERS
    : DAY_WORKERS;

const DEFAULT_REASON = "Scheduled day off / not scheduled to work";
const HOLIDAY_REASON = "Factory holiday / shutdown";
const SICK_REASON = "Sickness / sick leave";
const REASONS = [DEFAULT_REASON, SICK_REASON, "Approved leave", "Absent — no notice", HOLIDAY_REASON];

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

/** Opens the Accommodation page directly on one facility's detail page (AccommodationPage reads ?facility=<name>). */
const facilityLink = (name: string) => `/admin/accommodation?facility=${encodeURIComponent(name)}`;

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
  [keyOf("Warehouse Ops", DEFAULT_DAY)]: { by: CONFIRMER, at: "2026-09-09 08:41" },
};

// Demo recorded outcomes for seeded confirmed days (workerId -> mark)
const SEED_MARKS: Record<string, Record<string, Mark>> = {
  [keyOf("Warehouse Ops", DEFAULT_DAY)]: {
    h7: { didNotWork: true, reason: SICK_REASON, note: "" }, // Stefan Nguyen
  },
};

/** Marks for a project/day: fresh defaults, seeded outcomes (if confirmed), and any holiday ranges covering the day. */
const buildMarks = (proj: string, iso: string, list: Holiday[], conf: Record<string, Confirmation>): Record<string, Mark> => {
  const roster = workersFor(proj);
  const next = freshMarks(roster);
  const seeded = conf[keyOf(proj, iso)] ? SEED_MARKS[keyOf(proj, iso)] : undefined;
  if (seeded) Object.entries(seeded).forEach(([id, m]) => { if (next[id]) next[id] = { ...m }; });
  list.filter((h) => h.project === proj && iso >= h.from && iso <= h.to).forEach((h) => {
    roster.filter((w) => !w.notEligible && !h.exceptions.includes(w.id)).forEach((w) => {
      next[w.id] = { didNotWork: true, reason: HOLIDAY_REASON, note: h.note };
    });
  });
  return next;
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

/* ---------- Single-record correction modal (Correct button on a confirmed day) ---------- */
const OUTCOME_WORKED = "Worked";
const DNW_PREFIX = "Did not work — ";
const OUTCOMES = [OUTCOME_WORKED, ...REASONS.map((r) => DNW_PREFIX + r)];
const NE_OUTCOME = "Not eligible — Social Insurance not verified";
const outcomeOf = (m: Mark) => (m.didNotWork ? DNW_PREFIX + m.reason : OUTCOME_WORKED);

interface AuditEntry {
  project: string;
  day: string;
  worker: string;
  from: string;
  to: string;
  reason: string;
  by: string;
  at: string;
}

function FixModal({ worker, day, current, notEligible, onClose, onSave }: {
  worker: DayWorker;
  day: string;
  current: Mark;
  notEligible: boolean;
  onClose: () => void;
  onSave: (outcome: string, reason: string) => void;
}): React.JSX.Element {
  const currentLabel = notEligible ? NE_OUTCOME : outcomeOf(current);
  const outcomeOptions = notEligible ? [NE_OUTCOME, ...OUTCOMES] : OUTCOMES;
  const [outcome, setOutcome] = useState(currentLabel);
  const [reason, setReason] = useState("");
  const [touched, setTouched] = useState(false);
  const areaRef = useRef<HTMLTextAreaElement>(null);

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
    if (!reason.trim()) { areaRef.current?.focus(); return; }
    onSave(outcome, reason.trim());
  };

  return createPortal(
    <>
      <style>{modalCss}{fixCss}</style>
      <div className="ap-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
        <form className="ap-modal fx-modal" role="dialog" aria-modal="true" aria-labelledby="fx-title" onSubmit={submit} noValidate>
          <div className="ap-head">
            <h2 id="fx-title">{worker.name} · {fmtDate(day)}</h2>
            <button type="button" className="ap-close" aria-label="Close" onClick={onClose}>
              <X size={20} strokeWidth={1.5} />
            </button>
          </div>

          <div className="ap-field fx-current">
            <span className="fx-label">Currently recorded</span>
            <span className="fx-value">{currentLabel}</span>
          </div>

          <div className="ap-field">
            <label htmlFor="fx-outcome">New outcome *</label>
            <div className="ap-select">
              <select id="fx-outcome" value={outcome} onChange={(e) => setOutcome(e.target.value)}>
                {outcomeOptions.map((o) => <option key={o}>{o}</option>)}
              </select>
              <ChevronDown size={18} />
            </div>
          </div>

          <div className="ap-field">
            <label htmlFor="fx-reason">Reason for the correction * (kept in the audit trail)</label>
            <textarea
              id="fx-reason"
              ref={areaRef}
              className={missing ? "is-error" : ""}
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              aria-invalid={missing}
            />
            {missing && <span className="ap-err">Enter a reason for the correction.</span>}
          </div>

          <button type="submit" className="ap-save">Save correction</button>
        </form>
      </div>
    </>,
    document.body,
  );
}

const fixCss = `
.ap-modal.fx-modal{max-width:735px}
.fx-modal .ap-field{margin-bottom:18px}
.fx-label{font-size:13px;color:var(--muted,#6b6b66)}
.fx-value{font-size:15px;color:var(--text,#1c1c1a)}
.fx-current{gap:8px}
.fx-modal .ap-field textarea{width:100%;min-height:80px;padding:10px 12px;border:1px solid var(--line,#dedcd5);border-radius:6px;background:#fff;font:inherit;font-size:13.5px;line-height:1.45;color:var(--text,#1c1c1a);outline:none;resize:vertical;box-sizing:border-box}
.fx-modal .ap-field textarea:focus{border-color:var(--green,#1a6b2f);box-shadow:0 0 0 3px rgba(26,107,47,.12)}
.fx-modal .ap-field textarea.is-error{border-color:#b42318}
.fx-modal .ap-save{margin-top:4px}
`;

/* ---------- Daily work status tab ---------- */
function DailyWorkStatus({ holidayRef, onOpenWorker, initial, onConsumed }: {
  holidayRef: React.MutableRefObject<(() => void) | null>;
  onOpenWorker: (w: WorkerRef) => void;
  initial?: { project: string; day: string } | null;
  onConsumed?: () => void;
}): React.JSX.Element {
  const projectNames = PROJECTS.filter((p) => p.status !== "Completed").map((p) => p.name);
  const [project, setProject] = useState(initial?.project ?? "AutoParts Slovakia");
  const [day, setDay] = useState(initial?.day ?? DEFAULT_DAY);
  const [marks, setMarks] = useState<Record<string, Mark>>(() =>
    buildMarks(initial?.project ?? "AutoParts Slovakia", initial?.day ?? DEFAULT_DAY, [], SEED_CONFIRMATIONS),
  );
  const [confirmations, setConfirmations] = useState<Record<string, Confirmation>>(SEED_CONFIRMATIONS);
  const [state, setState] = useState<DayState>(
    SEED_CONFIRMATIONS[keyOf(initial?.project ?? "AutoParts Slovakia", initial?.day ?? DEFAULT_DAY)]
      ? "confirmed"
      : "not_started",
  );
  // The initial project/day is only used on the first render
  useEffect(() => { onConsumed?.(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const [reviews, setReviews] = useState<ReviewItem[]>(INITIAL_REVIEWS);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [holidayOpen, setHolidayOpen] = useState(false);
  // "Correct all as worked" dialog + the confirmation message shown after it
  const [correcting, setCorrecting] = useState<ReviewItem | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  // Single-record "Correct" dialog on a confirmed day + audit trail of corrections
  const [fixing, setFixing] = useState<DayWorker | null>(null);
  const [auditLog, setAuditLog] = useState<AuditEntry[]>([]);
  // Workers whose "not eligible" record was corrected for a given project-day ("project|day|workerId")
  const [eligibleFix, setEligibleFix] = useState<string[]>([]);

  // Build the marks for a project/day, applying seeded outcomes and any saved holiday ranges that cover it.
  const load = (proj: string, iso: string, list: Holiday[], conf: Record<string, Confirmation> = confirmations) => {
    const hasHoliday = list.some((h) => h.project === proj && iso >= h.from && iso <= h.to);
    setMarks(buildMarks(proj, iso, list, conf));
    setState(conf[keyOf(proj, iso)] ? "confirmed" : hasHoliday ? "draft" : "not_started");
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

  const confirmDay = () => {
    setConfirmations((c) => ({ ...c, [keyOf(project, day)]: { by: CONFIRMER, at: stamp() } }));
    setState("confirmed");
  };

  // Single-record correction from the confirmed table: the day stays confirmed, the change is logged.
  const saveCorrection = (w: DayWorker, outcome: string, reason: string) => {
    const before = isNE(w) ? NE_OUTCOME : outcomeOf(marks[w.id]);
    if (outcome === before) { setFixing(null); return; } // nothing changed
    if (isNE(w)) setEligibleFix((l) => [...l, `${keyOf(project, day)}|${w.id}`]);
    const worked = outcome === OUTCOME_WORKED;
    setMarks((m) => ({
      ...m,
      [w.id]: {
        ...m[w.id],
        didNotWork: !worked,
        reason: worked ? DEFAULT_REASON : outcome.slice(DNW_PREFIX.length),
      },
    }));
    setAuditLog((l) => [
      ...l,
      { project, day, worker: w.name, from: before, to: outcome, reason, by: CONFIRMER, at: stamp() },
    ]);
    setNotice(`Correction saved for ${w.name} on ${fmtDate(day)}. The reason was added to the audit trail.`);
    setFixing(null);
  };

  const confirmation = confirmations[keyOf(project, day)];
  const workers = workersFor(project);
  const isNE = (w: DayWorker) => !!w.notEligible && !eligibleFix.includes(`${keyOf(project, day)}|${w.id}`);

  // Called by the "Factory holiday / shutdown" button in the page header.
  holidayRef.current = () => setHolidayOpen(true);

  const applyHoliday = (h: Holiday) => {
    const list = [...holidays, h];
    setHolidays(list);
    setHolidayOpen(false);
    load(project, day, list); // refresh the visible day if it falls in the range
  };

  const eligible = workers.filter((w) => !isNE(w));
  const notEligibleCount = workers.length - eligible.length;
  const didNotWork = eligible.filter((w) => marks[w.id]?.didNotWork).length;
  const willWork = eligible.length - didNotWork;

  const stats = [
    { label: "On the list", value: workers.length, caption: `Assigned to ${project} on ${fmtDate(day)}` },
    { label: "Will be recorded as worked", value: willWork, caption: "Only after you confirm" },
    { label: "Did not work", value: didNotWork, caption: "With a reason each" },
    { label: "Not eligible (Social Insurance)", value: notEligibleCount, caption: "Never counted as worked", danger: true },
  ];

  // Opens the worker profile page for a roster row
  const openWorker = (w: DayWorker) => onOpenWorker({ name: w.name, code: w.code, role: w.role, project });

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
                        <button type="button" className="pj-link" onClick={() => openWorker(w)}>
                          <strong>{w.name}</strong>
                        </button>
                        {isNE(w) && <span className="dw-sp">SP</span>}
                      </div>
                      <small>{w.code}</small>
                    </td>
                    <td>{w.role}</td>
                    <td>
                      {isNE(w) ? (
                        <span className="sm-pill bad">Not eligible — Social Insurance not verified</span>
                      ) : m.didNotWork ? (
                        <span className="sm-pill warn">Did not work — {m.reason}</span>
                      ) : (
                        <span className="sm-pill ok">Worked</span>
                      )}
                    </td>
                    <td className="dw-note-ro">{m.note}</td>
                    <td className="dw-act">
                      <button type="button" className="dw-correct" onClick={() => setFixing(w)}>Correct</button>
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
                        <button type="button" className="pj-link" onClick={() => openWorker(w)}>
                          <strong>{w.name}</strong>
                        </button>
                        {isNE(w) && <span className="dw-sp">SP</span>}
                      </div>
                      <small>
                        {w.code}
                        {isNE(w) && (
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
         <h3>
          <img
            src="/images/review.svg"
            alt=""
            width="16"
            height="16"
            className="heading-icon"
          />
          Needs review after later Social Insurance verification
        </h3>
          <p>
            Social Insurance evidence was verified for an earlier date. Nothing has changed automatically — an
            authorised user corrects each record with a reason.
          </p>
          {reviews.map((r) => (
            <div key={r.id} className="dw-review-row">
              <div>
                <h3>
                  <button
                    type="button"
                    className="dw-review-link"
                    onClick={() => {
                      const w = workersFor(r.project).find((x) => x.name === r.worker);
                      onOpenWorker({ name: r.worker, code: w?.code, role: w?.role, project: r.project });
                    }}
                  >
                    {r.worker}
                  </button>
                  <span>— {r.days} day(s) on {r.project}</span>
                </h3>
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

      {fixing && (
        <FixModal
          worker={fixing}
          day={day}
          current={marks[fixing.id]}
          notEligible={isNE(fixing)}
          onClose={() => setFixing(null)}
          onSave={(outcome, reason) => saveCorrection(fixing, outcome, reason)}
        />
      )}

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
interface DayBar { label: string; worked: number; dnw: number; ne: number; unconfirmed: number }
interface Headcount { toLabel: string; toN: number; fromLabel: string; fromN: number; joiners: number; leavers: number }
interface MonthData {
  key: string;
  label: string;
  year: number;
  month: number;            // 0-based (Jan = 0)
  incDay: number | null;    // day of month that still has an unconfirmed project-day
  projects: Record<string, Counts>;
  hc: Headcount;
}

const ZERO: Counts = { assigned: 0, worked: 0, dnw: 0, ne: 0, incomplete: 0 };
const sumCounts = (list: Counts[]): Counts =>
  list.reduce(
    (a, c) => ({
      assigned: a.assigned + c.assigned,
      worked: a.worked + c.worked,
      dnw: a.dnw + c.dnw,
      ne: a.ne + c.ne,
      incomplete: a.incomplete + c.incomplete,
    }),
    ZERO,
  );

/* Yesterday — 08 Sep 2026 (confirmed daily records only; unconfirmed projects count as incomplete) */
const PROJECT_YDAY: Record<string, Counts> = {
  "AutoParts Slovakia": { assigned: 11, worked: 10, dnw: 0, ne: 1, incomplete: 0 },
  "Line 3 Assembly": { assigned: 0, worked: 0, dnw: 0, ne: 0, incomplete: 1 },
  "Warehouse Ops": { assigned: 11, worked: 11, dnw: 0, ne: 0, incomplete: 0 },
  "Packaging Line B": { assigned: 0, worked: 0, dnw: 0, ne: 0, incomplete: 0 },
  "CNC Machining Hall": { assigned: 0, worked: 0, dnw: 0, ne: 0, incomplete: 1 },
  "Cold Storage Facility": { assigned: 0, worked: 0, dnw: 0, ne: 0, incomplete: 0 },
};
const HC_YDAY: Headcount = { toLabel: "08 Sep 2026", toN: 41, fromLabel: "08 Sep 2026", fromN: 41, joiners: 0, leavers: 0 };

/* Last 7 days — 02 Sep to 08 Sep 2026 */
const PROJECT_7D: Record<string, Counts> = {
  "AutoParts Slovakia": { assigned: 79, worked: 62, dnw: 9, ne: 8, incomplete: 0 },
  "Line 3 Assembly": { assigned: 61, worked: 48, dnw: 12, ne: 1, incomplete: 1 },
  "Warehouse Ops": { assigned: 69, worked: 57, dnw: 10, ne: 2, incomplete: 1 },
  "Packaging Line B": { assigned: 0, worked: 0, dnw: 0, ne: 0, incomplete: 0 },
  "CNC Machining Hall": { assigned: 68, worked: 54, dnw: 10, ne: 4, incomplete: 1 },
  "Cold Storage Facility": { assigned: 0, worked: 0, dnw: 0, ne: 0, incomplete: 0 },
};
const HC_7D: Headcount = { toLabel: "08 Sep 2026", toN: 41, fromLabel: "02 Sep 2026", fromN: 44, joiners: 3, leavers: 1 };
const WEEK_BARS: DayBar[] = [
  { label: "02 Sep", worked: 35, dnw: 4, ne: 2, unconfirmed: 0 },
  { label: "03 Sep", worked: 37, dnw: 2, ne: 4, unconfirmed: 0 },
  { label: "04 Sep", worked: 39, dnw: 1, ne: 2, unconfirmed: 0 },
  { label: "05 Sep", worked: 24, dnw: 15, ne: 2, unconfirmed: 0 },
  { label: "06 Sep", worked: 25, dnw: 14, ne: 1, unconfirmed: 0 },
  { label: "07 Sep", worked: 27, dnw: 0, ne: 3, unconfirmed: 7 },
  { label: "08 Sep", worked: 21, dnw: 0, ne: 1, unconfirmed: 7 },
];
const WEEK_REASONS: [string, number][] = [
  [DEFAULT_REASON, 34], ["Annual leave", 4], ["Sickness / sick leave", 1], ["Medical appointment", 1], ["Other", 1],
];

/* Month — full calendar months */
const MONTH_REASONS: [string, number][] = [
  [DEFAULT_REASON, 209],
  ["Factory-wide holiday or shutdown", 55],
  ["Medical appointment", 10],
  ["Sickness / sick leave", 10],
  ["Annual leave", 4],
  ["Unexcused absence", 4],
  ["Other", 2],
];

const PROJECT_AUG: Record<string, Counts> = {
  "AutoParts Slovakia": { assigned: 391, worked: 255, dnw: 113, ne: 23, incomplete: 0 },
  "Line 3 Assembly": { assigned: 394, worked: 298, dnw: 69, ne: 27, incomplete: 0 },
  "Warehouse Ops": { assigned: 347, worked: 276, dnw: 61, ne: 10, incomplete: 0 },
  "Packaging Line B": { assigned: 0, worked: 0, dnw: 0, ne: 0, incomplete: 0 },
  "CNC Machining Hall": { assigned: 284, worked: 233, dnw: 51, ne: 0, incomplete: 1 },
  "Cold Storage Facility": { assigned: 0, worked: 0, dnw: 0, ne: 0, incomplete: 0 },
};

/** Demo data for earlier months: August scaled by a factor, with every day confirmed. */
const scaleProjects = (base: Record<string, Counts>, f: number): Record<string, Counts> =>
  Object.fromEntries(
    Object.entries(base).map(([k, c]) => {
      const assigned = Math.round(c.assigned * f);
      const dnw = Math.round(c.dnw * f);
      const ne = Math.round(c.ne * f);
      return [k, { assigned, dnw, ne, worked: Math.max(0, assigned - dnw - ne), incomplete: 0 }];
    }),
  );

const MONTHS: MonthData[] = [
  {
    key: "2026-08", label: "August 2026", year: 2026, month: 7, incDay: 24, projects: PROJECT_AUG,
    hc: { toLabel: "31 Aug 2026", toN: 43, fromLabel: "01 Aug 2026", fromN: 42, joiners: 4, leavers: 1 },
  },
  {
    key: "2026-07", label: "July 2026", year: 2026, month: 6, incDay: null, projects: scaleProjects(PROJECT_AUG, 1.02),
    hc: { toLabel: "31 Jul 2026", toN: 42, fromLabel: "01 Jul 2026", fromN: 40, joiners: 3, leavers: 1 },
  },
  {
    key: "2026-06", label: "June 2026", year: 2026, month: 5, incDay: null, projects: scaleProjects(PROJECT_AUG, 0.94),
    hc: { toLabel: "30 Jun 2026", toN: 40, fromLabel: "01 Jun 2026", fromN: 39, joiners: 2, leavers: 1 },
  },
];

const sumDay = (b: DayBar) => b.worked + b.dnw + b.ne;

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

/** One bar per day of the month; the day bars add up exactly to the month's company totals. */
const buildMonthBars = (m: MonthData): DayBar[] => {
  const c = sumCounts(Object.values(m.projects));
  const days = new Date(m.year, m.month + 1, 0).getDate();
  const idx = Array.from({ length: days }, (_, i) => i + 1);
  const weekend = (d: number) => {
    const w = new Date(m.year, m.month, d).getDay();
    return w === 0 || w === 6;
  };
  const part = (d: number) => (d === m.incDay ? 0.75 : 1);
  const assigned = apportion(c.assigned, idx.map(part));
  const dnw = apportion(c.dnw, idx.map((d) => (weekend(d) ? 3 : 1) * part(d)));
  const ne = apportion(c.ne, idx.map(part));
  return idx.map((d, i) => ({
    label: String(d).padStart(2, "0"),
    worked: Math.max(0, assigned[i] - dnw[i] - ne[i]),
    dnw: dnw[i],
    ne: ne[i],
    unconfirmed: d === m.incDay ? 4 : 0,
  }));
};

/** 21/22 -> "95.5%", 75.0 -> "75%", 100.0 -> "100%" */
const pct = (n: number, d: number) => (d > 0 ? `${parseFloat(((n / d) * 100).toFixed(1))}%` : "—");

/* ---------- "All assigned worker-days" modal (Statistics tab) ---------- */
type StatKind = "assigned" | "worked" | "dnw" | "ne";
interface AssignedRow { worker: string; project: string; days: number; dates: string; sp?: boolean; code?: string; role?: string }

function AssignedModal({ title, rows, onClose, onOpenWorker }: {
  title: string;
  rows: AssignedRow[];
  onClose: () => void;
  onOpenWorker?: (r: AssignedRow) => void;
}): React.JSX.Element {
  // Close on Escape + lock page scroll while open
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, [onClose]);

  return createPortal(
    <>
      <style>{modalCss}{assignedCss}</style>
      <div className="ap-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
        <div className="ap-modal as-modal" role="dialog" aria-modal="true" aria-labelledby="as-title">
          <div className="ap-head">
            <h2 id="as-title">{title}</h2>
            <button type="button" className="ap-close" aria-label="Close" onClick={onClose}>
              <X size={20} strokeWidth={1.5} />
            </button>
          </div>

          {rows.length === 0 ? (
            <p className="as-empty">No workers.</p>
          ) : (
          <div className="as-scroll">
            <table className="as-table">
              <thead>
                <tr><th>Worker</th><th>Project</th><th>Worker-days</th><th>Dates</th></tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={`${r.project}|${r.worker}|${i}`}>
                    <td>
                      {onOpenWorker ? (
                        <button type="button" className="as-worker" onClick={() => onOpenWorker(r)}>
                          <strong>{r.worker}</strong>
                        </button>
                      ) : (
                        <strong>{r.worker}</strong>
                      )}
                      {r.sp && <span className="dw-sp as-sp">SP</span>}
                    </td>
                    <td>{r.project}</td>
                    <td>{r.days}</td>
                    <td>{r.dates}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          )}
        </div>
      </div>
    </>,
    document.body,
  );
}

const assignedCss = `
.ap-modal.as-modal{max-width:650px;padding:28px 20px 22px;border-radius:20px}
.as-modal .ap-head{margin-bottom:22px;padding:0 12px}
.as-modal .ap-head h2{font-size:18px}
.as-scroll{max-height:min(55vh,560px);overflow-y:auto;padding-right:2px}
.as-scroll::-webkit-scrollbar{width:6px}
.as-scroll::-webkit-scrollbar-track{background:transparent}
.as-scroll::-webkit-scrollbar-thumb{background:#cfcdc6;border-radius:6px}
.as-scroll::-webkit-scrollbar-thumb:hover{background:#b5b3ab}
.as-scroll::-webkit-scrollbar-button{display:none;width:0;height:0}
@supports not selector(::-webkit-scrollbar){.as-scroll{scrollbar-width:thin;scrollbar-color:#cfcdc6 transparent}}
.as-table{width:100%;border-collapse:collapse;font-size:16px;color:var(--text,#1c1c1a)}
.as-table th{position:sticky;top:0;background:#fff;text-align:left;font-weight:600;font-size:12px;color:var(--muted,#6b6b66);padding:14px 16px 12px;border-bottom:1px solid var(--line,#dedcd5);white-space:nowrap}
.as-table td{padding:8px 16px;border-bottom:1px solid var(--line,#dedcd5);font-size:13px;white-space:nowrap}
.as-table tbody tr:last-child td{border-bottom:0}
.as-table td strong{font-weight:600}
.as-table th:nth-child(1),.as-table td:nth-child(1){width:30%}
.as-table th:nth-child(2),.as-table td:nth-child(2){width:30%}
.as-table th:nth-child(3),.as-table td:nth-child(3){width:20%}
.as-empty{margin:0 12px 6px;color:var(--muted,#6b6b66);font-size:14px}
.as-sp{margin-left:8px;vertical-align:middle;font-size:10px;padding:1px 7px}
.as-worker{display:inline;padding:0;border:0;background:none;font:inherit;color:inherit;text-align:left;cursor:pointer}
.as-worker:hover strong{color:var(--green,#1a6b2f)}
.as-worker:focus-visible{outline:2px solid var(--green,#1a6b2f);outline-offset:3px;border-radius:4px}
@media (max-width:640px){.as-table{font-size:12px}.as-scroll{overflow-x:auto}}
`;

/* ---------- "Unconfirmed project-days" modal (See which button) ---------- */
interface UnconfirmedRow { project: string; iso: string }

function UnconfirmedModal({ rows, onClose, onOpenRecord }: {
  rows: UnconfirmedRow[];
  onClose: () => void;
  onOpenRecord: (project: string, iso: string) => void;
}): React.JSX.Element {
  // Close on Escape + lock page scroll while open
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, [onClose]);

  return createPortal(
    <>
      <style>{modalCss}{unconfirmedCss}</style>
      <div className="ap-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
        <div className="ap-modal uc-modal" role="dialog" aria-modal="true" aria-labelledby="uc-title">
          <div className="ap-head">
            <h2 id="uc-title">Unconfirmed project-days</h2>
            <button type="button" className="ap-close" aria-label="Close" onClick={onClose}>
              <X size={20} strokeWidth={1.5} />
            </button>
          </div>

          {rows.length === 0 ? (
            <p className="uc-empty">No unconfirmed project-days.</p>
          ) : (
            <table className="uc-table">
              <thead>
                <tr><th>Project</th><th>Date</th><th aria-label="Actions" /></tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={`${r.project}|${r.iso}`}>
                    <td>{r.project}</td>
                    <td>{fmtDate(r.iso)}</td>
                    <td className="uc-act">
                      <button type="button" className="uc-open" onClick={() => onOpenRecord(r.project, r.iso)}>
                        Open record
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>,
    document.body,
  );
}

const unconfirmedCss = `
.ap-modal.uc-modal{max-width:680px;padding:26px 34px 30px;border-radius:20px}
.uc-modal .ap-head{margin-bottom:26px}
.uc-modal .ap-head h2{font-size:16px;font-weight:600}
.uc-table{width:100%;border-collapse:collapse;color:var(--text,#1c1c1a)}
.uc-table th{text-align:left;font-weight:500;font-size:14px;color:var(--muted,#6b6b66);padding:4px 18px;border-bottom:1px solid var(--line,#dedcd5)}
.uc-table td{padding:10px 18px;font-size:14px;border-bottom:1px solid var(--line,#dedcd5)}
.uc-table tbody tr:last-child td{border-bottom:0}
.uc-table th:nth-child(1),.uc-table td:nth-child(1){width:40%}
.uc-table th:nth-child(2),.uc-table td:nth-child(2){width:36%}
.uc-act{text-align:left}
.uc-open{background:none;border:0;padding:0;font-size:14px;font-weight:500;color:var(--green,#1a6b2f);cursor:pointer}
.uc-open:hover{text-decoration:none}
.uc-open:focus-visible{outline:2px solid var(--green,#1a6b2f);outline-offset:3px;border-radius:4px}
.uc-empty{margin:0 0 6px;color:var(--muted,#6b6b66);font-size:15px}
@media (max-width:640px){.ap-modal.uc-modal{padding:22px 16px}.uc-table td{font-size:15px}.uc-open{font-size:14px}}
`;

/* ---------- "Joiners" / "Leavers" modal (Joiners and leavers card) ---------- */
type MoveKind = "joiners" | "leavers";
interface MovementRow { worker: string; iso: string; project: string; note?: string; sp?: boolean; code?: string; role?: string }

const PINNED_JOINERS_7D: MovementRow[] = [
  { worker: "Maksym Ionescu", iso: "2026-09-02", project: "Line 3 Assembly" },
  { worker: "Nikola Ionescu", iso: "2026-09-03", project: "AutoParts Slovakia", sp: true },
  { worker: "Anh Popa", iso: "2026-09-07", project: "Line 3 Assembly", sp: true, code: "SM-1149", role: "Packer" },
];
const PINNED_LEAVERS_7D: MovementRow[] = [
  { worker: "Viorel Dimitrov", iso: "2026-09-03", project: "Warehouse Ops" },
];

function MovementModal({ title, rows, onClose, onOpenWorker }: {
  title: string;
  rows: MovementRow[];
  onClose: () => void;
  onOpenWorker: (r: MovementRow) => void;
}): React.JSX.Element {
  // Close on Escape + lock page scroll while open
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, [onClose]);

  return createPortal(
    <>
      <style>{modalCss}{assignedCss}</style>
      <div className="ap-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
        <div className="ap-modal as-modal" role="dialog" aria-modal="true" aria-labelledby="mv-title">
          <div className="ap-head">
            <h2 id="mv-title">{title}</h2>
            <button type="button" className="ap-close" aria-label="Close" onClick={onClose}>
              <X size={20} strokeWidth={1.5} />
            </button>
          </div>

          {rows.length === 0 ? (
            <p className="as-empty">No workers.</p>
          ) : (
            <div className="as-scroll">
              <table className="as-table">
                <thead>
                  <tr><th>Worker</th><th>Date</th><th>Note</th></tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={`${r.worker}|${r.iso}|${i}`}>
                      <td>
                        <button type="button" className="as-worker" onClick={() => onOpenWorker(r)}>
                          <strong>{r.worker}</strong>
                        </button>
                        {r.sp && <span className="dw-sp as-sp">SP</span>}
                      </td>
                      <td>{fmtDate(r.iso)}</td>
                      <td>{r.note || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>,
    document.body,
  );
}

/* Sample workers behind the small "Did not work — by reason" counts (Last 7 days, whole company) */
const PINNED_7D: Record<string, AssignedRow[]> = {
  "Annual leave": [
    { worker: "Cristian Savchenko", project: "Line 3 Assembly", days: 1, dates: "02 Sep" },
    { worker: "Ion Kravets", project: "AutoParts Slovakia", days: 1, dates: "03 Sep" },
    { worker: "Nikola Nguyen", project: "AutoParts Slovakia", days: 1, dates: "03 Sep" },
    { worker: "Andriy Le", project: "Line 3 Assembly", days: 1, dates: "07 Sep" },
  ],
  "Sickness / sick leave": [
    { worker: "Andrei Rusu", project: "Warehouse Ops", days: 1, dates: "02 Sep" },
  ],
  "Medical appointment": [
    { worker: "Maksym Bratu", project: "Warehouse Ops", days: 1, dates: "02 Sep" },
  ],
  "Other": [
    { worker: "Petar Stoyanov", project: "Line 3 Assembly", days: 1, dates: "04 Sep" },
  ],
};

function StatisticsTab({ exportRef, onOpenRecord, onOpenWorker }: {
  exportRef: React.MutableRefObject<(() => void) | null>;
  onOpenRecord: (project: string, iso: string) => void;
  onOpenWorker: (w: WorkerRef) => void;
}): React.JSX.Element {
  const [scope, setScope] = useState("Whole company");
  const [range, setRange] = useState<Range>("Last 7 days");
  const [monthKey, setMonthKey] = useState(MONTHS[0].key);
  const [openKind, setOpenKind] = useState<StatKind | null>(null);
  const [showUnc, setShowUnc] = useState(false);
  const [openReason, setOpenReason] = useState<string | null>(null);
  const [openMove, setOpenMove] = useState<MoveKind | null>(null);

  // Clicking a worker name in a worker-days dialog opens that worker's profile page
  const openWorkerFromRow = (r: AssignedRow) => {
    setOpenKind(null);
    setOpenReason(null);
    onOpenWorker({ name: r.worker, code: r.code, role: r.role, project: r.project });
  };

  // Clicking a project name in "Projects compared with the company" switches the scope and jumps to the top
  const selectScope = (name: string) => {
    setScope(name);
    const top = () => {
      window.scrollTo({ top: 0, behavior: "smooth" });
      // the app shell may scroll inside a container instead of the window
      document.querySelectorAll<HTMLElement>("*").forEach((el) => {
        if (el.scrollTop > 0) el.scrollTo({ top: 0, behavior: "smooth" });
      });
    };
    requestAnimationFrame(top);
  };

  const month = MONTHS.find((m) => m.key === monthKey) ?? MONTHS[0];
  const monthBars = useMemo(() => buildMonthBars(month), [month]);

  // Per-project counts for the selected period
  const byProject = range === "Yesterday" ? PROJECT_YDAY : range === "Last 7 days" ? PROJECT_7D : month.projects;
  const rows = PROJECTS.map((p) => ({ name: p.name, c: byProject[p.name] ?? ZERO }));
  const company = sumCounts(rows.map((r) => r.c));
  const view = scope === "Whole company" ? company : (rows.find((r) => r.name === scope)?.c ?? ZERO);
  const share = company.assigned > 0 ? view.assigned / company.assigned : 0;

  // Unconfirmed project-days behind the "See which" button (follows scope + period)
  const uncRows: UnconfirmedRow[] = rows
    .filter((r) => (scope === "Whole company" || r.name === scope) && r.c.incomplete > 0)
    .flatMap((r): UnconfirmedRow[] => {
      if (range === "Yesterday") return [{ project: r.name, iso: DEFAULT_DAY }];
      if (range === "Last 7 days") {
        return [{ project: r.name, iso: r.name === "Warehouse Ops" ? "2026-09-07" : DEFAULT_DAY }];
      }
      if (month.incDay == null) return [];
      const p2 = (n: number) => String(n).padStart(2, "0");
      return [{ project: r.name, iso: `${month.year}-${p2(month.month + 1)}-${p2(month.incDay)}` }];
    })
    .sort((a, b) => a.iso.localeCompare(b.iso));

  // Rows for the "All assigned worker-days" dialog (follows the selected scope and period)
  const periodDates =
    range === "Yesterday"
      ? "08 Sep"
      : range === "Last 7 days"
        ? "02 Sep – 08 Sep"
        : (() => {
            const mon = new Date(month.year, month.month, 1).toLocaleDateString("en-GB", { month: "short" });
            const last = new Date(month.year, month.month + 1, 0).getDate();
            return `01 ${mon} – ${String(last).padStart(2, "0")} ${mon}`;
          })();

  // Rows for the detail dialogs (follow the selected scope and period, and add up to the card numbers)
  const rowsFor = (kind: StatKind): AssignedRow[] =>
    rows
      .filter((r) => (scope === "Whole company" || r.name === scope) && r.c.assigned > 0)
      .flatMap((r): AssignedRow[] => {
        const roster = workersFor(r.name);
        const flagged = roster.filter((w) => w.notEligible);
        const mk = (w: DayWorker, days: number): AssignedRow =>
          ({ worker: w.name, project: r.name, days, dates: periodDates, sp: kind === "ne", code: w.code, role: w.role });

        if (kind === "assigned") {
          if (range === "Yesterday") return roster.map((w) => mk(w, 1));
          const parts = apportion(r.c.assigned, roster.map(() => 1));
          return roster.map((w, i) => mk(w, parts[i]));
        }
        if (range === "Yesterday") {
          // not-eligible workers first, then the did-not-work ones; everybody else worked
          const neW = [...flagged, ...roster.filter((w) => !w.notEligible)].slice(0, r.c.ne);
          const rest = roster.filter((w) => !neW.includes(w));
          const list = kind === "ne" ? neW : kind === "dnw" ? rest.slice(0, r.c.dnw) : rest.slice(r.c.dnw);
          return list.map((w) => mk(w, 1));
        }
        const pool = kind === "ne" ? (flagged.length ? flagged : roster) : roster.filter((w) => !w.notEligible);
        const total = kind === "ne" ? r.c.ne : kind === "dnw" ? r.c.dnw : r.c.worked;
        const parts = apportion(total, pool.map(() => 1));
        return pool.map((w, i) => mk(w, parts[i])).filter((x) => x.days > 0);
      })
      .sort((x, y) => x.project.localeCompare(y.project) || x.worker.localeCompare(y.worker));

  const periodTitle =
    range === "Yesterday"
      ? "Yesterday — 08 Sep 2026"
      : range === "Last 7 days"
        ? "Last 7 days — 02 Sep to 08 Sep 2026"
        : month.label;
  const kindLabel: Record<StatKind, string> = {
    assigned: "All assigned worker-days",
    worked: "Worked",
    dnw: "Did not work",
    ne: "Not eligible — Social Insurance not verified",
  };

  // Chart bars
  const scaledBars: DayBar[] = (() => {
    if (range === "Yesterday") {
      // single bar built straight from the selected scope; each unconfirmed project-day shows as a small hatched cap
      return [{ label: "08 Sep", worked: view.worked, dnw: view.dnw, ne: view.ne, unconfirmed: view.incomplete * 2 }];
    }
    const base = range === "Last 7 days" ? WEEK_BARS : monthBars;
    return base.map((b) => ({
      label: b.label,
      worked: Math.round(b.worked * share),
      dnw: Math.round(b.dnw * share),
      ne: Math.round(b.ne * share),
      unconfirmed:
        scope === "Whole company"
          ? b.unconfirmed
          : b.unconfirmed > 0 && view.incomplete > 0
            ? Math.max(1, Math.round(b.unconfirmed * share))
            : 0,
    }));
  })();
  const maxTotal = Math.max(1, ...scaledBars.map((b) => sumDay(b) + b.unconfirmed));

  // Did-not-work reasons
  const weights = range === "Month" ? MONTH_REASONS : WEEK_REASONS;
  const reasons: [string, number][] = view.dnw > 0
    ? apportion(view.dnw, weights.map(([, w]) => w)).map((n, i) => [weights[i][0], n] as [string, number])
    : [];

  // Workers behind each count in "Did not work — by reason" (follows scope + period, adds up to the count)
  const dateLabels: string[] = (() => {
    if (range === "Yesterday") return ["08 Sep"];
    if (range === "Last 7 days") return WEEK_BARS.map((b) => b.label);
    const mon = new Date(month.year, month.month, 1).toLocaleDateString("en-GB", { month: "short" });
    const last = new Date(month.year, month.month + 1, 0).getDate();
    return Array.from({ length: last }, (_, i) => `${String(i + 1).padStart(2, "0")} ${mon}`);
  })();

  const reasonRows = (reason: string): AssignedRow[] => {
    const pinned = range === "Last 7 days" && scope === "Whole company" ? PINNED_7D : null;
    if (pinned && pinned[reason]) return pinned[reason];
    const pinnedAll = pinned ? Object.values(pinned).flat() : [];

    // one slot per did-not-work worker-day of the project(s) in scope
    const slots: AssignedRow[] = rows
      .filter((r) => scope === "Whole company" || r.name === scope)
      .flatMap((r) => {
        const pool = workersFor(r.name).filter((w) => !w.notEligible);
        const n = Math.max(0, r.c.dnw - pinnedAll.filter((x) => x.project === r.name).length);
        return Array.from({ length: n }, (_, k): AssignedRow => ({
          worker: pool[k % pool.length].name,
          project: r.name,
          days: 1,
          dates: dateLabels[(k * 7 + Math.floor(k / pool.length) * 3) % dateLabels.length],
        }));
      });

    let list = slots;
    if (!pinned) {
      // hand the slots to the reasons in order so every list matches its count
      const idx = reasons.findIndex(([name]) => name === reason);
      const start = reasons.slice(0, Math.max(0, idx)).reduce((a, [, n]) => a + n, 0);
      list = slots.slice(start, start + (reasons[idx]?.[1] ?? 0));
    }
    return [...list].sort(
      (a, b) => a.dates.localeCompare(b.dates) || a.project.localeCompare(b.project) || a.worker.localeCompare(b.worker),
    );
  };

  // Headcount + joiners/leavers
  const hc = range === "Yesterday" ? HC_YDAY : range === "Last 7 days" ? HC_7D : month.hc;
  const joiners = Math.round(hc.joiners * share);
  const leavers = Math.round(hc.leavers * share);
  const net = joiners - leavers;

  // Workers behind the Joiners / Leavers counts (follows scope + period, adds up to the count)
  const movementRows = (kind: MoveKind): MovementRow[] => {
    const n = kind === "joiners" ? joiners : leavers;
    if (n <= 0) return [];
    if (range === "Last 7 days" && scope === "Whole company") {
      return (kind === "joiners" ? PINNED_JOINERS_7D : PINNED_LEAVERS_7D).slice(0, n);
    }
    const dates: string[] =
      range === "Yesterday"
        ? [DEFAULT_DAY]
        : range === "Last 7 days"
          ? Array.from({ length: 7 }, (_, i) => addDays("2026-09-02", i))
          : Array.from({ length: new Date(month.year, month.month + 1, 0).getDate() }, (_, i) =>
              toIso(new Date(month.year, month.month, i + 1)));

    const inScope = rows.filter((r) => scope === "Whole company" || r.name === scope);
    const active = inScope.filter((r) => r.c.assigned > 0);
    const seen = new Set<string>();
    const pool = (active.length ? active : inScope)
      .flatMap((r) => workersFor(r.name).map((w) => ({ w, project: r.name })))
      .filter(({ w }) => (seen.has(w.name) ? false : (seen.add(w.name), true)));

    return Array.from({ length: n }, (_, i): MovementRow => {
      const { w, project } = pool[(kind === "joiners" ? i : pool.length - 1 - i) % pool.length];
      const iso = dates[Math.min(dates.length - 1, Math.floor(((i + 0.5) * dates.length) / n))];
      return { worker: w.name, iso, project, sp: !!w.notEligible, code: w.code, role: w.role };
    }).sort((a, b) => a.iso.localeCompare(b.iso) || a.worker.localeCompare(b.worker));
  };

  const openWorkerFromMove = (r: MovementRow) => {
    setOpenMove(null);
    onOpenWorker({ name: r.worker, code: r.code, role: r.role, project: r.project });
  };

  const summary =
    range === "Yesterday"
      ? `${scope} · Yesterday — 08 Sep 2026`
      : range === "Last 7 days"
        ? `${scope} · Last 7 days — 02 Sep 2026 to 08 Sep 2026`
        : `${scope} · ${month.label}`;

  exportRef.current = () => {
    const header = ["Scope", "Assigned", "Worked", "Did not work", "Not eligible", "Worked share", "Incomplete days"];
    const line = (name: string, c: Counts) =>
      [name, c.assigned, c.worked, c.dnw, c.ne, pct(c.worked, c.assigned), c.incomplete].join(",");
    const csv = [header.join(","), line("Whole company", company), ...rows.map((r) => line(`"${r.name}"`, r.c))].join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = range === "Month" ? `statistics-${month.key}.csv` : `statistics-${range.toLowerCase().replace(/\s+/g, "-")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const cards: { label: string; value: number; caption: string; danger?: boolean; kind?: StatKind }[] = [
    { label: "Assigned worker-days", value: view.assigned, caption: "On confirmed records", kind: "assigned" },
    { label: "Worked", value: view.worked, caption: `${pct(view.worked, view.assigned)} of assigned`, kind: "worked" },
    { label: "Did not work", value: view.dnw, caption: `${pct(view.dnw, view.assigned)} of assigned`, kind: "dnw" },
    { label: "Not eligible (SP)", value: view.ne, caption: "Never counted as worked", danger: true, kind: "ne" },
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
        {range === "Month" && (
          <div className="dw-field">
            <label htmlFor="st-month">Month</label>
            <div className="dw-select st-month">
              <select id="st-month" value={monthKey} onChange={(e) => setMonthKey(e.target.value)}>
                {MONTHS.map((m) => <option key={m.key} value={m.key}>{m.label}</option>)}
              </select>
              <ChevronDown size={18} />
            </div>
          </div>
        )}
        <div className="st-summary">{summary}</div>
      </section>

      {view.incomplete > 0 && (
        <div className="st-banner" role="status">
          <TriangleAlert size={20} />
          <span>
            {view.incomplete} project-day record(s) in this period are not confirmed and are shown as incomplete — they
            are not treated as “everyone worked”.
          </span>
          <button type="button" onClick={() => setShowUnc(true)}>See which</button>
        </div>
      )}

      <section className="sm-card sm-stat-group pj-compact" style={{ gridTemplateColumns: "repeat(5, 1fr)" }}>
        {cards.map((s) => (
          <div key={s.label} className="sm-stat">
            <div className="sm-stat-title">{s.label}</div>
            {s.kind ? (
              <button
                type="button"
                className={`sm-stat-value st-link${s.danger ? " is-danger" : ""}`}
                title="Show the workers behind this number"
                onClick={() => setOpenKind(s.kind!)}
              >
                {s.value}
              </button>
            ) : (
              <div className={`sm-stat-value${s.danger ? " is-danger" : ""}`}>{s.value}</div>
            )}
            <div className="sm-stat-caption">{s.caption}</div>
          </div>
        ))}
      </section>

      <div className="st-grid">
        <section className="sm-card st-panel">
          <h3><BarChart3 size={16} strokeWidth={1.6} /> Worker-days by day</h3>
          <div className={`st-chart${scaledBars.length > 10 ? " is-dense" : ""}`}>
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
        <h3>
          <img src="/images/not_work.svg" alt="" aria-hidden="true" width={16} height={16} />
          Did not work — by reason
        </h3>
          {reasons.length === 0 ? (
            <p className="st-empty">No absences recorded in this period.</p>
          ) : (
            <div className="sm-table-wrap">
              <table className="sm-table st-reasons">
                <thead><tr><th>Reason</th><th>Worker-days</th></tr></thead>
                <tbody>
                  {reasons.map(([reason, n]) => (
                    <tr key={reason}>
                      <td>{reason}</td>
                      <td>
                        <button
                          type="button"
                          className="st-count"
                          title="Show the workers behind this number"
                          onClick={() => setOpenReason(reason)}
                        >
                          {n}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      <section className="sm-card st-panel st-wide">
        <h3>
          <img src="/images/compare.svg" alt="" aria-hidden="true" width={16} height={16} />
          Projects compared with the company
        </h3>
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
                  <td>
                    <button
                      type="button"
                      className={`st-proj-link${scope === r.name ? " is-current" : ""}`}
                      title={`Show ${r.name} statistics`}
                      onClick={() => selectScope(r.name)}
                    >
                      <strong>{r.name}</strong>
                    </button>
                  </td>
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
         <h3>
            <img src="/images/headcounts.svg" alt="" aria-hidden="true" width={16} height={16} />
            Headcount
          </h3>
          <dl className="st-kv">
            <dt>Working on {hc.toLabel}</dt><dd>{Math.round(hc.toN * share)}</dd>
            <dt>Working on {hc.fromLabel}</dt><dd>{Math.round(hc.fromN * share)}</dd>
          </dl>
          <p className="st-note">
            Headcount counts workers assigned with verified Social Insurance. Workers waiting for verification are not
            counted.
          </p>
        </section>

        <section className="sm-card st-panel">
          <h3>
            <img src="/images/compare (1).svg" alt="" aria-hidden="true" width={16} height={16} />
            Joiners and leavers
          </h3>
          <dl className="st-kv">
            <dt>Joiners (employment start)</dt>
            <dd><button type="button" className="st-count" title="Show the workers behind this number" onClick={() => setOpenMove("joiners")}>{joiners}</button></dd>
            <dt>Leavers (effective termination date)</dt>
            <dd><button type="button" className="st-count" title="Show the workers behind this number" onClick={() => setOpenMove("leavers")}>{leavers}</button></dd>
            <dt>Net change</dt><dd>{net >= 0 ? `+${net}` : net}</dd>
          </dl>
          {range === "Month" && (
            <p className="st-note">
              A termination confirmed after the month ended is counted in the month of its effective date, so earlier
              figures can change.
            </p>
          )}
        </section>
      </div>

      {openKind && (
        <AssignedModal
          title={`${kindLabel[openKind]} · ${periodTitle}`}
          rows={rowsFor(openKind)}
          onClose={() => setOpenKind(null)}
          onOpenWorker={openWorkerFromRow}
        />
      )}

      {showUnc && (
        <UnconfirmedModal
          rows={uncRows}
          onClose={() => setShowUnc(false)}
          onOpenRecord={(project, iso) => { setShowUnc(false); onOpenRecord(project, iso); }}
        />
      )}

      {openReason && (
        <AssignedModal
          title={`${openReason} · ${periodTitle}`}
          rows={reasonRows(openReason)}
          onClose={() => setOpenReason(null)}
          onOpenWorker={openWorkerFromRow}
        />
      )}

      {openMove && (
        <MovementModal
          title={`${openMove === "joiners" ? "Joiners" : "Leavers"} · ${periodTitle}`}
          rows={movementRows(openMove)}
          onClose={() => setOpenMove(null)}
          onOpenWorker={openWorkerFromMove}
        />
      )}
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
.ap-save{height:38px;padding:0 16px;border-radius:6px;background:var(--green,#1a6b2f);color:#fff;font-size:13.5px;font-weight:600;cursor:pointer;border:none}
.ap-save:hover{filter:brightness(1.08)}
.ap-save:focus-visible,.ap-close:focus-visible{outline:2px solid var(--green,#1a6b2f);outline-offset:2px}
@media (max-width:640px){
  .ap-modal{padding:22px 18px}
  .ap-grid{grid-template-columns:1fr}
}
`;

/* ---------- Add Requirement modal ---------- */
interface NewRequirementInput {
  role: string;
  requested: number;
  from: string; // ISO yyyy-mm-dd, or "" when not set
  responsible: string;
  notes: string;
}

function AddRequirementModal({ coordinators, defaultResponsible, onClose, onSave }: {
  coordinators: string[];
  defaultResponsible: string;
  onClose: () => void;
  onSave: (r: NewRequirementInput) => void;
}): React.JSX.Element {
  const [role, setRole] = useState("");
  const [requested, setRequested] = useState("1");
  const [from, setFrom] = useState("");
  const [responsible, setResponsible] = useState(defaultResponsible);
  const [notes, setNotes] = useState("");
  const [touched, setTouched] = useState(false);
  const roleRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setTimeout(() => roleRef.current?.focus(), 0); }, []);

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

  const count = parseInt(requested, 10);
  const roleMissing = touched && !role.trim();
  const countInvalid = touched && !(count >= 1);
  const options = coordinators.includes(responsible) ? coordinators : [responsible, ...coordinators];

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (!role.trim() || !(count >= 1)) return;
    onSave({ role: role.trim(), requested: count, from, responsible, notes: notes.trim() });
  };

  return createPortal(
    <>
      <style>{modalCss}{requirementCss}</style>
      <div className="ap-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
        <form className="ap-modal ar-modal" role="dialog" aria-modal="true" aria-labelledby="ar-title" onSubmit={submit} noValidate>
          <div className="ap-head">
            <h2 id="ar-title">Add Requirement</h2>
            <button type="button" className="ap-close" aria-label="Close" onClick={onClose}>
              <X size={20} strokeWidth={1.5} />
            </button>
          </div>

          <div className="ap-grid">
            <div className="ap-field">
              <label htmlFor="ar-role">Role *</label>
              <input
                id="ar-role"
                ref={roleRef}
                className={roleMissing ? "is-error" : ""}
                placeholder="e.g. Quality Control Inspector"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                aria-invalid={roleMissing}
              />
              {roleMissing && <span className="ap-err">Enter a role.</span>}
            </div>

            <div className="ap-field">
              <label htmlFor="ar-count">Requested Headcount *</label>
              <input
                id="ar-count"
                type="number"
                min={1}
                className={countInvalid ? "is-error" : ""}
                value={requested}
                onChange={(e) => setRequested(e.target.value)}
                aria-invalid={countInvalid}
              />
              {countInvalid && <span className="ap-err">Enter at least 1.</span>}
            </div>

            <div className="ap-field">
              <label htmlFor="ar-from">Required From</label>
              <input id="ar-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            </div>

            <div className="ap-field">
              <label htmlFor="ar-resp">Responsible</label>
              <div className="ap-select">
                <select id="ar-resp" value={responsible} onChange={(e) => setResponsible(e.target.value)}>
                  {options.map((c) => <option key={c}>{c}</option>)}
                </select>
                <ChevronDown size={18} />
              </div>
            </div>
          </div>

          <div className="ap-field ar-notes">
            <label htmlFor="ar-notes">Notes</label>
            <textarea id="ar-notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>

          <button type="submit" className="ap-save">Add Requirement</button>
        </form>
      </div>
    </>,
    document.body,
  );
}

const requirementCss = `
.ap-modal.ar-modal{max-width:560px;padding:20px 22px 20px;border-radius:14px}
.ar-modal .ap-head{margin-bottom:16px}
.ar-modal .ap-head h2{font-size:17px}
.ar-modal .ap-close{width:24px;height:24px;margin-right:0}
.ar-modal .ap-close svg{width:18px;height:18px}
.ar-modal .ap-grid{gap:14px 12px}
.ar-modal .ap-field{gap:5px}
.ar-modal .ap-field label{font-size:12.5px}
.ar-modal .ap-field input,.ar-modal .ap-select select{height:32px;font-size:13px;padding:0 11px}
.ar-modal .ap-select select{padding-right:32px}
.ar-modal .ap-select svg{width:14px;height:14px;right:10px}
.ar-notes{margin-top:14px}
.ar-modal .ap-field textarea{width:100%;min-height:56px;padding:8px 11px;border:1px solid var(--line,#dedcd5);border-radius:6px;background:#fff;font:inherit;font-size:13px;line-height:1.45;color:var(--text,#1c1c1a);outline:none;resize:vertical;box-sizing:border-box}
.ar-modal .ap-field textarea:focus{border-color:var(--green,#1a6b2f);box-shadow:0 0 0 3px rgba(26,107,47,.12)}
.ar-modal .ap-save{margin-top:16px;height:34px;font-size:13px}
`;

/* ---------- Project detail page ---------- */
const DETAIL_TABS = ["General", "Workers", "Workforce Req.", "Contacts", "Accommodation", "Documents", "Tasks & Notes", "History"] as const;
type DetailTab = (typeof DETAIL_TABS)[number];
type WorkerTab = "Current" | "Planned" | "History";
type Tone = "ok" | "info" | "warn" | "bad" | "muted";

interface DetailWorker { name: string; sp: "registered" | "none" | "pending"; role: string; start: string; end: string; accommodation: string }
interface TaskComment { by: string; at: string; text: string }
interface Task {
  title: string;
  description: string;
  linked: string;
  assignee: string;
  creator: string;
  due: string;
  priority: string;
  status: string;
  comments: TaskComment[];
}

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
  requirements: { role: string; requested: number; filled: number; from: string; responsible: string; status: string; tone: Tone; notes?: string }[];
  accommodation: { facility: string; location: string; residents: number; availability: string }[];
  documents: { title: string; note: string }[];
  tasks: Task[];
  workerHistory: { date: string; event: string }[];
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
  workerHistory: [{ date: "15 Jan 2025", event: "Project created (Active)" }],
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

const PACKAGING_DETAIL: DetailData = {
  address: "Prievidza",
  endDate: "Ongoing",
  mainContact: "—",
  potentialNote: "25",
  notes: "—",
  contacts: [],
  current: [],
  planned: [{ name: "Nguyen Van An", sp: "none", role: "Assembly Line Worker", start: "15 Sep 2026", end: OPEN, accommodation: NOT_ACC }],
  past: [],
  workerHistory: [{ date: "01 Aug 2026", event: "Project created (In Preparation)" }],
  requirements: [
    { role: "Assembly Line Worker", requested: 18, filled: 0, from: "15 Sep 2026", responsible: "Peter Vrábel", status: "Open", tone: "info" },
  ],
  accommodation: [],
  documents: [
    { title: "Framework Agreement", note: "Signed 15 Sep 2026" },
    { title: "Site Rules & Safety Instructions", note: "Updated 03 Sep 2026" },
  ],
  tasks: [
    {
      title: "Prepare Packaging Line B onboarding",
      description: "Coordinate arrival logistics and induction schedule for the first cohort.",
      linked: "Packaging Line B",
      assignee: "Peter Vrábel",
      creator: "Peter Vrábel",
      due: "12 Sep 2026",
      priority: "Medium",
      status: "New",
      comments: [],
    },
  ],
  events: [{ title: "Project created (In Preparation)", note: "01 Aug 2026 · by Peter Vrábel" }],
};

const detailFor = (p: Project): DetailData => {
  if (p.name === "AutoParts Slovakia" || p.pid === "p1") return AUTOPARTS_DETAIL;
  if (p.name === "Packaging Line B" || p.pid === "p4") return PACKAGING_DETAIL;
  return {
    address: p.location,
    endDate: p.status === "Completed" ? "Ended" : "Ongoing",
    mainContact: "—",
    potentialNote: p.potential ? String(p.potential) : "—",
    notes: "—",
    contacts: [], current: [], planned: [], past: [], requirements: [],
    accommodation: [], documents: [], tasks: [],
    workerHistory: [{ date: p.startDate, event: `Project created (${p.status})` }],
    events: [{ title: `Project created (${p.status})`, note: `${p.startDate} · by ${p.coordinator}` }],
  };
};

/* ---------- Task detail modal (Tasks & Notes tab) ---------- */
const TASK_STATUSES = ["New", "In progress", "Done"];
const taskTone = (s: string): Tone => (s === "Done" ? "ok" : s === "In progress" ? "info" : "muted");

function TaskModal({ task, onClose, onStatus, onComment }: {
  task: Task;
  onClose: () => void;
  onStatus: (status: string) => void;
  onComment: (text: string) => void;
}): React.JSX.Element {
  const [text, setText] = useState("");

  // Close on Escape + lock page scroll while open
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, [onClose]);

  const post = () => {
    if (!text.trim()) return;
    onComment(text.trim());
    setText("");
  };

  const rows: [string, string][] = [
    ["Description", task.description],
    ["Linked", task.linked],
    ["Assignee", task.assignee],
    ["Creator", task.creator],
    ["Due Date", task.due],
    ["Priority", task.priority],
  ];

  return createPortal(
    <>
      <style>{modalCss}{taskCss}</style>
      <div className="ap-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
        <div className="ap-modal tk-modal" role="dialog" aria-modal="true" aria-labelledby="tk-title">
          <div className="ap-head">
            <h2 id="tk-title">{task.title}</h2>
            <button type="button" className="ap-close" aria-label="Close" onClick={onClose}>
              <X size={20} strokeWidth={1.5} />
            </button>
          </div>

          <dl className="tk-kv">
            {rows.map(([k, v]) => (
              <React.Fragment key={k}>
                <dt>{k}</dt>
                <dd>{v}</dd>
              </React.Fragment>
            ))}
          </dl>

          <div className="ap-field tk-status">
            <label htmlFor="tk-status">Status</label>
            <div className="ap-select">
              <select id="tk-status" value={task.status} onChange={(e) => onStatus(e.target.value)}>
                {TASK_STATUSES.map((s) => <option key={s}>{s}</option>)}
              </select>
              <ChevronDown size={18} />
            </div>
          </div>

          <h3 className="tk-h">Comments</h3>
          {task.comments.length === 0 ? (
            <p className="tk-empty">No comments yet.</p>
          ) : (
            <ul className="tk-comments">
              {task.comments.map((c, i) => (
                <li key={i}>
                  <strong>{c.by}</strong> <small>{c.at}</small>
                  <p>{c.text}</p>
                </li>
              ))}
            </ul>
          )}

          <div className="tk-add">
            <input
              placeholder="Add a comment..."
              aria-label="Add a comment"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); post(); } }}
            />
            <button type="button" onClick={post}>Post</button>
          </div>
        </div>
      </div>
    </>,
    document.body,
  );
}

const taskCss = `
.ap-modal.tk-modal{max-width:600px;padding:26px 28px 28px}
.tk-modal .ap-head{margin-bottom:22px}
.tk-modal .ap-head h2{font-size:16px}
.tk-kv{display:grid;grid-template-columns:168px 1fr;gap:10px 18px;margin:0 0 20px;font-size:13px;line-height:1.35}
.tk-kv dt{color:var(--muted,#6b6b66)}
.tk-kv dd{margin:0;color:var(--text,#1c1c1a)}
.tk-status{margin-bottom:20px}
.tk-modal .ap-field label{font-size:13px;color:var(--muted,#6b6b66)}
.tk-h{margin:0 0 8px;font-size:14px;font-weight:600;color:var(--text,#1c1c1a)}
.tk-empty{margin:0 0 14px;font-size:13px;color:var(--muted,#6b6b66)}
.tk-comments{list-style:none;margin:0 0 12px;padding:0;display:flex;flex-direction:column;gap:10px}
.tk-comments li{font-size:13px}
.tk-comments small{margin-left:6px;color:var(--muted,#6b6b66)}
.tk-comments p{margin:2px 0 0}
.tk-add{display:flex;align-items:center;gap:12px;height:42px;padding:0 18px;border:1px solid var(--line,#dedcd5);border-radius:8px;background:#faf9f6}
.tk-add input{flex:1;min-width:0;border:0;background:transparent;outline:none;font:inherit;font-size:14px;color:var(--text,#1c1c1a)}
.tk-add button{border:0;background:none;font:inherit;font-size:14px;font-weight:500;color:var(--green,#1a6b2f);cursor:pointer}
.tk-add:focus-within{border-color:var(--green,#1a6b2f)}
@media (max-width:640px){.tk-kv{grid-template-columns:1fr;gap:2px 0}.tk-kv dd{margin-bottom:8px}}
`;

function Pill({ tone = "muted", dot = true, children }: { tone?: Tone; dot?: boolean; children: React.ReactNode }): React.JSX.Element {
  return <span className={`pd-pill is-${tone}${dot ? "" : " no-dot"}`}>{children}</span>;
}

function ProjectDetail({ project, id, coordinators, onBack, onStats, onDaily, onSave, onOpenWorker }: {
  project: Project;
  id: string;
  coordinators: string[];
  onBack: () => void;
  onStats: () => void;
  onDaily: () => void;
  onSave: (patch: ProjectPatch) => void;
  onOpenWorker: (w: WorkerRef) => void;
}): React.JSX.Element {
  const d = detailFor(project);
  const [tab, setTab] = useState<DetailTab>("General");
  const [wTab, setWTab] = useState<WorkerTab>("Current");
  const [editOpen, setEditOpen] = useState(false);

  // Workforce requirements: seeded from the project data, then extended by the Add Requirement dialog
  const [reqs, setReqs] = useState<DetailData["requirements"]>(d.requirements);
  const [reqOpen, setReqOpen] = useState(false);

  // Tasks: seeded from the project data; the Task dialog changes status and adds comments
  const [tasks, setTasks] = useState<Task[]>(d.tasks);
  const [taskIdx, setTaskIdx] = useState<number | null>(null);
  const patchTask = (i: number, fn: (t: Task) => Task) => setTasks((l) => l.map((t, j) => (j === i ? fn(t) : t)));

  const addRequirement = (r: NewRequirementInput) => {
    setReqs((list) => [
      ...list,
      {
        role: r.role,
        requested: r.requested,
        filled: 0,
        from: r.from ? fmtDate(r.from) : "—",
        responsible: r.responsible,
        status: "Open",
        tone: "info",
        notes: r.notes || undefined,
      },
    ]);
    setReqOpen(false);
  };

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
        <div className="pd-icon">
          <img
            src="/images/project.svg"
            alt=""
            aria-hidden="true"
            width={56}
            height={56}
            style={{ display: "block" }}
          />
        </div>
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
          <button type="button" className="sm-btn sm-btn-outline" onClick={onStats}>
            <img
              src="/images/statistics.svg"
              alt=""
              aria-hidden="true"
              width={16}
              height={16}
              style={{ display: "block", flex: "none" }}
            />{" "}
            Statistics
          </button>
          <button type="button" className="sm-btn sm-btn-outline" onClick={onDaily}>
            <img
              src="/images/status.svg"
              alt=""
              aria-hidden="true"
              width={16}
              height={16}
              style={{ display: "block", flex: "none" }}
            />{" "}
            Daily work status
          </button>
          <button type="button" className="sm-btn sm-btn-outline" onClick={() => setEditOpen(true)}>
            <img
              src="/images/edit.svg"
              alt=""
              aria-hidden="true"
              width={16}
              height={16}
              style={{ display: "block", flex: "none" }}
            />{" "}
            Edit
          </button>
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
          {wTab === "History" ? (
            <div className="sm-table-wrap">
              <table className="sm-table pd-table">
                <thead><tr><th>Date</th><th>Event</th></tr></thead>
                <tbody>
                  {d.workerHistory.length === 0 ? (
                    <tr><td colSpan={2} className="pd-none">No history yet.</td></tr>
                  ) : d.workerHistory.map((h) => (
                    <tr key={h.date + h.event}><td>{h.date}</td><td>{h.event}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="sm-table-wrap">
              <table className="sm-table pd-table">
                <thead>
                  <tr><th>Worker</th><th>SP</th><th>Role</th><th>Start</th><th>Planned/Actual End</th><th>Accommodation</th></tr>
                </thead>
                <tbody>
                  {workerRows.length === 0 && (
                    <tr><td colSpan={6} className="pd-none">No workers in this view.</td></tr>
                  )}
                  {workerRows.map((w) => (
                    <tr key={w.name}>
                      <td>
                        <button
                          type="button"
                          className="pj-link"
                          onClick={() => onOpenWorker({ name: w.name, role: w.role, project: project.name })}
                        >
                          <strong>{w.name}</strong>
                        </button>
                      </td>
                      <td>{spPill(w.sp)}</td>
                      <td>{w.role}</td>
                      <td>{w.start}</td>
                      <td>{w.end}</td>
                      <td>
                        {w.accommodation === NOT_ACC ? (
                          w.accommodation
                        ) : (
                          <Link className="pd-facility" to={facilityLink(w.accommodation)}>
                            {w.accommodation}
                          </Link>
                        )}
                      </td>
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
            <button type="button" className="sm-btn sm-btn-outline" onClick={() => setReqOpen(true)}>
              <Plus size={16} /> Add Requirement
            </button>
          </div>
          {reqs.length === 0 ? (
            <p className="pd-empty">No requirements added yet.</p>
          ) : (
            <div className="sm-table-wrap">
              <table className="sm-table pd-table">
                <thead>
                  <tr><th>Role</th><th>Requested</th><th>Filled</th><th>Remaining</th><th>Required From</th><th>Responsible</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {reqs.map((r, i) => (
                    <tr key={r.role + i}>
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
          {d.contacts.length === 0 ? <p className="pd-empty">No linked contacts yet.</p> : d.contacts.map((c) => (
            <div key={c.email} className="pd-item">
              <strong>{c.name}</strong>
              <span>{c.role} · {c.phone} · {c.email}</span>
            </div>
          ))}
        </section>
      )}

      {tab === "Accommodation" && (
        <section className="sm-card pd-panel">
          <div className="sm-table-wrap">
              <table className="sm-table pd-table">
                <thead><tr><th>Facility</th><th>Location</th><th>This Project's Residents</th><th>Facility Availability</th></tr></thead>
                <tbody>
                  {d.accommodation.length === 0 && (
                    <tr><td colSpan={4} className="pd-none">No linked facilities.</td></tr>
                  )}
                  {d.accommodation.map((a) => (
                    <tr key={a.facility}>
                      <td>
                        <Link className="pd-facility" to={facilityLink(a.facility)}>
                          {a.facility}
                        </Link>
                      </td>
                      <td>{a.location}</td>
                      <td>{a.residents}</td>
                      <td>{a.availability}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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
          {tasks.length === 0 ? <p className="pd-empty pd-flat">No open tasks linked to this project.</p> : tasks.map((t, i) => (
            <button key={t.title} type="button" className="pd-item pd-task pd-task-btn" onClick={() => setTaskIdx(i)}>
              <div className="pd-task-main">
                <strong>{t.title} — {t.linked}</strong>
                <span>Due {t.due} · {t.priority} priority · Assignee: {t.assignee}</span>
              </div>
              <Pill tone={taskTone(t.status)}>{t.status}</Pill>
            </button>
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

      {taskIdx !== null && tasks[taskIdx] && (
        <TaskModal
          task={tasks[taskIdx]}
          onClose={() => setTaskIdx(null)}
          onStatus={(status) => patchTask(taskIdx, (t) => ({ ...t, status }))}
          onComment={(text) =>
            patchTask(taskIdx, (t) => ({ ...t, comments: [...t.comments, { by: CONFIRMER, at: stamp(), text }] }))
          }
        />
      )}

      {reqOpen && (
        <AddRequirementModal
          coordinators={coordinators}
          defaultResponsible={project.coordinator}
          onClose={() => setReqOpen(false)}
          onSave={addRequirement}
        />
      )}
    </>
  );
}

/** Opens the existing Workers page on one worker (WorkersPage reads ?worker=<name>). */
const workerLink = (w: WorkerRef) => `/admin/workers?worker=${encodeURIComponent(w.name)}`;

/* ---------- Page ---------- */
function ProjectsPageInner({ onOpenWorker }: { onOpenWorker: (w: WorkerRef) => void }): React.JSX.Element {
  const [searchParams, setSearchParams] = useSearchParams();
  // /admin/projects?tab=daily opens the Daily work status tab directly
  const initialTab = searchParams.get("tab");
  const [tab, setTab] = useState<Tab>(
    initialTab === "daily" ? "Daily work status" : initialTab === "stats" ? "Statistics" : "Projects",
  );
  // Project + date chosen in the "Unconfirmed project-days" dialog
  const [pendingDaily, setPendingDaily] = useState<{ project: string; day: string } | null>(null);
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
          onOpenWorker={onOpenWorker}
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
            <button
              className="sm-btn sm-btn-outline"
              onClick={() => holidayRef.current?.()}
            >
              <img
                src="/images/factory_holiday.svg"
                alt=""
                width="12"
                height="12"
                className="btn-icon"
              />
              Factory holiday / shutdown
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

      {isStats && (
        <StatisticsTab
          exportRef={exportRef}
          onOpenRecord={(project, day) => { setPendingDaily({ project, day }); setTab("Daily work status"); }}
          onOpenWorker={onOpenWorker}
        />
      )}

      {isDaily && (
        <DailyWorkStatus
          holidayRef={holidayRef}
          onOpenWorker={onOpenWorker}
          initial={pendingDaily}
          onConsumed={() => setPendingDaily(null)}
        />
      )}

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
.dw-date {
  display: flex;
  align-items: center;
  gap: 8px;
}

.dw-date input {
  height: 44px;
  padding: 0 14px;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: #fff;
  font-family: inherit;
  font-size: 14px;
  font-weight: 400;
  line-height: 1.2;
  color: var(--text);
  font-variant-numeric: tabular-nums;
  outline: none;
}

.dw-date input::-webkit-datetime-edit {
  font-family: inherit;
  font-size: 14px;
  font-weight: 400;
  color: var(--text);
}

.dw-date input:focus {
  border-color: var(--green);
}
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
.dw-review h3{display:flex;align-items:center;gap:10px;font-size:16px;margin:0 0 14px;font-weight:600}
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
.st-col{flex:1 1 0;min-width:0;display:flex;flex-direction:column;align-items:center;gap:8px}
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
.pj-table small,.dw-table small{font-size:13px;margin-top:1px}
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
.sm-pill .dw-dot {
  display: inline-block;
  width: 2px;
  height: 2px;
  border-radius: 50%;
  background: currentColor;
  margin-right: 5px;
  vertical-align: middle;
}
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
.st-month{width:220px;max-width:100%}
.st-month select{height:36px}
.st-ctl{padding:3px}
.st-ctl button{font-size:13px;padding:6px 11px}
.st-summary{font-size:13.5px;padding-bottom:6px}
.st-banner{font-size:13.5px;padding:8px 14px;margin-bottom:12px;gap:10px}
.st-banner svg{width:17px;height:17px}
.st-banner button{font-size:13.5px}
.st-grid{gap:12px;margin-bottom:12px}
.st-panel{padding:12px 16px 14px}
.st-wide{margin-bottom:12px}
.st-panel h3{font-size:14px;margin-bottom:10px;gap:8px;font-weight:600}
.st-bar{height:105px}
.st-col{gap:5px}
.st-col>span{font-size:12px}
.st-legend{font-size:12.5px;margin-top:10px;gap:4px 14px}
.st-legend i{width:11px;height:11px}
.st-kv{font-size:13.5px;gap:6px 18px;margin-bottom:10px}
.st-note{font-size:12.5px}
.st-empty{margin:0;color:var(--muted);font-size:13.5px}

/* ---- Daily work status header: button aligned like the design ---- */
.dw-title-row{display:flex;align-items:flex-end;justify-content:space-between;gap:46px}
.dw-title-row>div{flex:1;min-width:0}
.dw-title-row .pj-desc{max-width:none;margin-bottom:0}
.dw-title-row .sm-btn{flex:none;white-space:nowrap;align-self:flex-end;margin-bottom:0}
@media (max-width:900px){
  .dw-title-row{flex-direction:column;align-items:flex-start;gap:12px}
}

/* ---- Statistics: "Worker-days by day" + "Did not work — by reason" cards (match design) ---- */
.st-grid:not(.st-grid-even){align-items:stretch;gap:12px!important;column-gap:12px!important;grid-template-columns:1fr 1fr}
.st-grid:not(.st-grid-even)>.st-panel{display:flex;flex-direction:column;padding:20px 20px 22px;width:auto;min-width:0}
.st-grid:not(.st-grid-even)>.st-panel h3{font-size:14px;font-weight:600;gap:10px;margin:0 0 14px}
.st-grid:not(.st-grid-even)>.st-panel h3 svg{flex:none;color:var(--muted)}

/* chart */
.st-chart{display:flex;align-items:flex-end;gap:3px;margin-top:8px}
.st-col{flex:1 1 0;min-width:0;gap:6px}
.st-bar{height:165px}
.st-col>span{font-size:12px;color:var(--muted)}
.st-chart.is-dense{gap:2px}
.st-chart.is-dense .st-col>span{font-size:11px}
.st-legend{display:flex;flex-wrap:wrap;align-items:center;gap:6px 14px;margin-top:12px;font-size:12.5px;color:var(--muted)}
.st-legend span{display:inline-flex;align-items:center;gap:6px}
.st-legend i{width:11px;height:11px}

/* reasons table: full-width rows with dividers, right-aligned count */
.st-grid:not(.st-grid-even)>.st-panel .sm-table-wrap{margin:0 -4px}
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

/* Reduce Active, In preparation and Completed badges
   on the Projects listing page */

.pj-table td .sm-pill {
  display: inline-flex !important;
  align-items: center;
  justify-content: center;
  min-height: 22px !important;
  height: 22px !important;
  padding: 0 9px !important;
  font-size: 13px !important;
  line-height: 1 !important;
  border-radius: 20px !important;
  gap: 5px !important;
  white-space: nowrap;
}

.pj-table td .sm-pill::before {
  width: 6px;
  height: 6px;
}

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
.pd-item strong{font-size:14px;font-weight:600}
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
.dw-table-ro 
.sm-pill {
  font-size: 11px;
  padding: 2px 8px;
  line-height: 1.3;
}
.dw-note-ro{color:var(--muted)}
.dw-table-ro td.dw-act{text-align:right;padding-right:56px}
.dw-.dw-correct,.dw-table-ro .dw-correct,.dw-table-ro td.dw-act .dw-correct{background:none;border:0;padding:0;color:var(--green,#1a6b2f)!important;font-size:13px;font-weight:500;cursor:pointer}
.dw-correct:hover,.dw-table-ro .dw-correct:hover{text-decoration:none;color:var(--green,#1a6b2f)!important}
.dw-review .sm-btn-primary{background:#5fd68a;color:#073b1a;border-color:transparent}
.dw-review-row h3{gap:6px}
.dw-review-link{padding:0;border:0;background:none;font:inherit;font-weight:inherit;color:var(--green,#1a6b2f);cursor:pointer}
.dw-review-link:hover{text-decoration:underline}
.dw-review-link:focus-visible{outline:2px solid var(--green,#1a6b2f);outline-offset:3px;border-radius:4px}

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
.pd-icon{background:none}
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

/* ---- Facility links inside project tables ---- */
.pd-facility{font-weight:600;color:var(--text);cursor:pointer}
.pd-facility:hover{color:var(--green)}

/* ---- Statistics: clickable "Assigned worker-days" number ---- */
.sm-stat-value.st-link{display:block;padding:0;border:0;background:none;text-align:left;font:inherit;font-size:26px;font-weight:600;line-height:1.1;color:inherit;cursor:pointer}
.sm-stat-value.st-link.is-danger{color:#b42318}
.sm-stat-value.st-link:hover{color:var(--green,#1a6b2f);text-decoration:none}
.sm-stat-value.st-link:focus-visible{outline:2px solid var(--green,#1a6b2f);outline-offset:3px;border-radius:4px}

/* ---- Statistics: clickable counts in "Did not work — by reason" ---- */
.st-count{padding:0;border:0;background:none;font:inherit;font-weight:500;color:inherit;cursor:pointer}
.st-count:hover{color:var(--green,#1a6b2f)}
.st-kv .st-count{font-weight:inherit}
.st-count:focus-visible{outline:2px solid var(--green,#1a6b2f);outline-offset:3px;border-radius:4px}

/* ---- Project detail: empty rows + task rows ---- */
.pd-table td.pd-none{color:var(--text);padding-top:12px;padding-bottom:12px}
.pd-task{flex-direction:row;align-items:center;justify-content:space-between;gap:16px}
.pd-task-main{display:flex;flex-direction:column;gap:3px;min-width:0}
.pd-task-main span{color:var(--muted)}
.pd-task-btn{width:100%;padding:0 0 20px;border:0;background:none;font:inherit;text-align:left;color:inherit;cursor:pointer}
.pd-task-btn:last-child{padding-bottom:2px}
.pd-task-btn:hover strong{color:var(--green)}
.pd-task-btn:focus-visible{outline:2px solid var(--green);outline-offset:3px;border-radius:6px}

/* ---- Statistics: clickable project names in "Projects compared with the company" ---- */
.st-proj-link{padding:0;border:0;background:none;font:inherit;color:inherit;text-align:left;cursor:pointer}
.st-proj-link:hover strong{color:var(--green,#1a6b2f)}
.st-proj-link.is-current strong{color:var(--green,#1a6b2f)}
.st-proj-link:focus-visible{outline:2px solid var(--green,#1a6b2f);outline-offset:3px;border-radius:4px}
`;

/* ---------- Exported page: clicking a worker name opens the Workers page at the top ---------- */
/** Resets the window and any scrolled container (the app shell may scroll inside <main>, not the window). */
const resetScroll = () => {
  window.scrollTo(0, 0);
  document.querySelectorAll<HTMLElement>("*").forEach((el) => { if (el.scrollTop > 0) el.scrollTop = 0; });
};

export default function ProjectsPage(): React.JSX.Element {
  const navigate = useNavigate();
  const [leaving, setLeaving] = useState(false);

  // Fade the Projects page out, then open the Workers page at the top (which fades in).
  const openWorker = (w: WorkerRef) => {
    if (leaving) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setLeaving(true);
    setTimeout(() => {
      navigate(workerLink(w));
      // run after the Workers page has rendered
      setTimeout(resetScroll, 0);
      requestAnimationFrame(() => requestAnimationFrame(resetScroll));
    }, reduce ? 0 : 180);
  };

  return (
    <>
      <style>{pageFadeCss}</style>
      <div className={`pg-fade${leaving ? " is-leaving" : ""}`}>
        <ProjectsPageInner onOpenWorker={openWorker} />
      </div>
    </>
  );
}

const pageFadeCss = `
.pg-fade{animation:pg-in .22s ease-out both;transition:opacity .18s ease,transform .18s ease}
.pg-fade.is-leaving{opacity:0;transform:translateY(6px);pointer-events:none}
@keyframes pg-in{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
@media (prefers-reduced-motion:reduce){.pg-fade{animation:none;transition:none}}
`;
