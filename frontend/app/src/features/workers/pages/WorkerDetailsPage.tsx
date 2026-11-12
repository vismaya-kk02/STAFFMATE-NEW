import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  ChevronDown, ChevronRight, Download, Search, SlidersHorizontal, UserPlus, AlignJustify, Menu, X,
  UserX, Pencil, Check, Plus, ArrowRightLeft, CalendarX2, LogIn, FileText, CloudUpload, BadgeCheck,
  Ban, TrendingUp, ClipboardList,
} from "lucide-react";
import AddWorkerPage from "./AddWorkerPage"; // <- adjust the path to where your Add Worker dialog lives

/* ---------- Types ---------- */
type WorkerStatus = "Assigned to a project" | "Available" | "In preparation" | "Terminated" | "Did not start";
type SpState = "Registered" | "No evidence" | "Uploaded, awaiting verification";

interface Worker {
  id: string;
  name: string;
  status: WorkerStatus;
  project: string | null;
  coordinator: string;
  accommodation: string | null;
  sp: SpState;
  blocked?: boolean;
  intended?: boolean;
  docsMissing?: number;
  coordinatorInterest?: boolean;
  coordinatorReport?: boolean;
}

/* ---------- Data (57 workers) ---------- */
const JANA = "Jana Kollárová";
const PETER = "Peter Vrábel";
const PROJECT_COORD: Record<string, string> = {
  "Warehouse Ops": JANA, "CNC Machining Hall": JANA, "AutoParts Slovakia": JANA, "Line 3 Assembly": PETER,
};
const PROJECT_LIST = Object.keys(PROJECT_COORD);

const assigned = (id: string, name: string, project: string, extra: Partial<Worker> = {}): Worker => ({
  id, name, status: "Assigned to a project", project, coordinator: PROJECT_COORD[project],
  accommodation: null, sp: "Registered", ...extra,
});
const available = (id: string, name: string, coordinator: string, extra: Partial<Worker> = {}): Worker => ({
  id, name, status: "Available", project: null, coordinator, accommodation: null, sp: "Registered", ...extra,
});

const NAMED: Worker[] = [
  assigned("SM-0432", "Andrei Rusu", "Warehouse Ops"),
  assigned("SM-1136", "Andriy Georgiev", "CNC Machining Hall", { coordinatorInterest: true }),
  assigned("SM-1143", "Andriy Le", "Line 3 Assembly", { coordinatorReport: true }),
  assigned("SM-1148", "Andriy Popa", "Warehouse Ops"),
  assigned("SM-1137", "Bohdan Tran", "CNC Machining Hall", { coordinatorInterest: true }),
  assigned("SM-1124", "Cristian Savchenko", "Line 3 Assembly", { coordinatorReport: true }),
  assigned("SM-1135", "Dejan Marković", "CNC Machining Hall", { coordinatorReport: true }),
  assigned("SM-1138", "Dragan Jovanović", "AutoParts Slovakia"),
  available("SM-1154", "Andriy Ionescu", JANA),
  available("SM-1149", "Anh Popa", PETER, { project: "Line 3 Assembly", blocked: true, sp: "No evidence" }),
  available("SM-0754", "Dmytro Kovalenko", PETER, { sp: "Uploaded, awaiting verification" }),
  available("SM-0876", "Elena Popescu", JANA, { accommodation: "Villa Rezidencia Trnava" }),
  available("SM-1042", "Ivan Petrenko", JANA, { project: "AutoParts Slovakia", blocked: true, sp: "No evidence", accommodation: "Villa Rezidencia Trnava" }),
  available("SM-0922", "Marko Jovanović", PETER),
  available("SM-0934", "Nikola Ionescu", JANA, { sp: "Uploaded, awaiting verification" }),
  available("SM-0947", "Petar Marković", PETER),
  available("SM-0958", "Taras Georgiev", JANA),
  { id: "SM-1158", name: "Dragan Savchenko", status: "In preparation", project: null, coordinator: JANA, accommodation: null, sp: "No evidence", docsMissing: 0 },
  { id: "SM-1157", name: "Minh Koval", status: "In preparation", project: null, coordinator: PETER, accommodation: null, sp: "No evidence", docsMissing: 0 },
  { id: "SM-1103", name: "Nguyen Van An", status: "In preparation", project: "Packaging Line B", intended: true, coordinator: PETER, accommodation: null, sp: "No evidence", docsMissing: 3 },
  { id: "SM-0610", name: "Viorel Koval", status: "Terminated", project: null, coordinator: JANA, accommodation: null, sp: "Registered", docsMissing: 2 },
  { id: "SM-0611", name: "Oleh Bondar", status: "Terminated", project: null, coordinator: PETER, accommodation: null, sp: "Registered" },
  { id: "SM-0612", name: "Ruslan Hrytsenko", status: "Terminated", project: null, coordinator: JANA, accommodation: null, sp: "Registered" },
  { id: "SM-1160", name: "Stefan Moldovan", status: "Did not start", project: null, coordinator: PETER, accommodation: null, sp: "No evidence" },
];

const FIRST = ["Adrian", "Bogdan", "Cătălin", "Daniel", "Emil", "Filip", "Gabriel", "Hanna", "Igor", "Jakub", "Kamil", "Lukáš", "Marian", "Nadiia", "Ondrej", "Pavlo", "Radovan", "Sergiy", "Tibor", "Viktor", "Yuriy", "Zoltán"];
const LAST = ["Horváth", "Kováč", "Novák", "Szabó", "Popov", "Marin", "Bondarenko", "Kovalchuk", "Tkachenko", "Stoica", "Dragomir", "Varga", "Baláž", "Ilić", "Petrov"];

function buildWorkers(): Worker[] {
  const used = new Set(NAMED.map((w) => w.name));
  const list = [...NAMED];
  let n = 0;
  for (let i = 0; list.filter((w) => w.status === "Assigned to a project").length < 41; i++) {
    const name = `${FIRST[i % FIRST.length]} ${LAST[(i * 7 + 3) % LAST.length]}`;
    if (used.has(name)) continue;
    used.add(name);
    const project = PROJECT_LIST[n % PROJECT_LIST.length];
    list.push(assigned(`SM-${1170 + n}`, name, project, n < 3 ? { accommodation: "Hostel Nitra Central" } : {}));
    n++;
  }
  return list.sort((a, b) => a.name.localeCompare(b.name));
}
const INITIAL_WORKERS = buildWorkers();

/* ---------- Tabs ---------- */
const isPending = (w: Worker) => w.status === "Available" || w.status === "In preparation";
const TABS: { key: string; label: string; match: (w: Worker) => boolean }[] = [
  { key: "all", label: "All Workers", match: () => true },
  { key: "prep", label: "In preparation", match: (w) => w.status === "In preparation" },
  { key: "avail", label: "Available", match: (w) => w.status === "Available" },
  { key: "assigned", label: "Assigned to a project", match: (w) => w.status === "Assigned to a project" },
  { key: "pending", label: "Pending action", match: isPending },
  { key: "interest", label: "Coordinator interest", match: (w) => !!w.coordinatorInterest },
  { key: "reports", label: "Coordinator reports", match: (w) => !!w.coordinatorReport },
  { key: "accom", label: "Accommodated", match: (w) => !!w.accommodation },
  { key: "term", label: "Terminated", match: (w) => w.status === "Terminated" },
  { key: "dns", label: "Did not start", match: (w) => w.status === "Did not start" },
];

/** Turn the ?tab= value from the URL into a valid tab key (falls back to "all"). */
const tabFromUrl = (k: string | null) => (TABS.some((t) => t.key === k) ? (k as string) : "all");

const STATUS_PILL: Record<WorkerStatus, string> = {
  "Assigned to a project": "info",
  Available: "warn",
  "In preparation": "muted",
  Terminated: "bad",
  "Did not start": "bad",
};
const PAGE_SIZE = 25;

/* ---------- Filters ---------- */
const ANY = "Any";
interface Filters { project: string; coordinator: string; sp: string; reason: string; nationality: string }
const NO_FILTERS: Filters = { project: ANY, coordinator: ANY, sp: ANY, reason: ANY, nationality: ANY };

const SP_OPTIONS: SpState[] = ["Registered", "No evidence", "Uploaded, awaiting verification"];
const REASON_OPTIONS = ["Awaiting termination documentation", "Did-not-start check", "In preparation", "Available"];

// The single pending-action reason a worker has (null = not in Pending action)
const pendingReason = (w: Worker): string | null =>
  w.status === "Available" ? "Available"
  : w.status === "In preparation" ? "In preparation"
  : w.status === "Did not start" ? "Did-not-start check"
  : null;

const uniqSorted = (list: (string | null | undefined)[]) =>
  Array.from(new Set(list.filter((v): v is string => !!v && v !== "—"))).sort((a, b) => a.localeCompare(b));

/* ---------- Adapter for the existing Add Worker dialog ---------- */
// Only the fields of your dialog's WorkerForm that this page needs.
interface SavedWorker {
  firstName: string;
  surname: string;
  internalId: string;
  coordinator: string;
  intendedProject: string;
  project: string;
  facility: string;
  spEvidence: File | null;
  spVerified: boolean;
}

const toWorker = (f: SavedWorker): Worker => {
  const project = f.project || f.intendedProject || null;
  return {
    id: f.internalId,
    name: `${f.firstName.trim()} ${f.surname.trim()}`,
    status: "In preparation", // drafts and "Pending Review" both start here; the status is calculated, not chosen
    project,
    intended: !!project,
    coordinator: f.coordinator,
    accommodation: f.facility || null,
    sp: !f.spEvidence ? "No evidence" : f.spVerified ? "Registered" : "Uploaded, awaiting verification",
  };
};

/* ---------- Worker detail page ---------- */
const DETAIL_TABS = ["Personal", "Preparation", "Documents", "Employment & SP", "Assignments", "Accommodation", "Tasks & Notes", "History"] as const;
type DetailTab = (typeof DETAIL_TABS)[number];

const LIFECYCLE = ["In preparation", "Available", "Assigned to a project", "Terminated"] as const;
const STAGE_OF: Record<WorkerStatus, number> = {
  "In preparation": 0, Available: 1, "Assigned to a project": 2, Terminated: 3, "Did not start": 0,
};

interface DocItem { category: string; expiry: string; files: string[]; verified: boolean }

interface WorkerDetailInfo {
  dob: string; nationality: string; role: string; telephone: string; email: string; address: string;
  country: string; prepStage: string; arrival: string; workStart: string;
  empStart: string; employer: string; spFrom: string; deregFrom: string; verifiedBy: string; spFile: string;
  createdOn: string; createdBy: string; assignStart: string;
  docs: DocItem[];
}

const DOC_TEMPLATE: Omit<DocItem, "verified">[] = [
  { category: "Employment Contract", expiry: "No expiry", files: ["contract_v1.pdf"] },
  { category: "Passport", expiry: "Valid until 01 Nov 2027", files: ["passport_scan.pdf"] },
  { category: "TRC / Residence Card", expiry: "Valid until 01 Jun 2027", files: ["trc_front.pdf", "trc_back.pdf"] },
  { category: "Authority Approval Statement", expiry: "No expiry", files: ["approval_statement.pdf"] },
  { category: "Labour Office Notification", expiry: "No expiry", files: ["notification.pdf"] },
  { category: "SP Registration Evidence", expiry: "No expiry", files: ["sp_confirmation.pdf"] },
];

// Records that exist in the prototype data; every other worker falls back to "—" for the unknown fields.
const DETAIL_OVERRIDES: Record<string, Partial<WorkerDetailInfo>> = {
  "SM-0432": {
    dob: "11 Sep 1987", nationality: "Moldova", role: "Warehouse Associate", telephone: "+421 900 111 006",
    country: "Moldova", prepStage: "Complete", empStart: "05 Jun 2021", spFrom: "01 Jun 2021",
    verifiedBy: "Marek Máhr, 02 Jun 2021", createdOn: "15 May 2021", createdBy: "Jana Kollárová", assignStart: "05 Jun 2021",
  },
  "SM-0754": { role: "Forklift Operator", nationality: "Ukraine", country: "Ukraine", empStart: "20 Apr 2025" },
  "SM-1042": {
    dob: "14 Mar 1991", nationality: "Ukraine", role: "Production Operator", telephone: "+421 900 111 001",
    country: "Ukraine", empStart: "03 Feb 2025",
  },
};

const ROLES = ["Warehouse Associate", "Forklift Operator", "CNC Operator", "Line Assembler", "Packer", "Quality Inspector"];
const COUNTRIES = ["Moldova", "Ukraine", "Serbia", "Romania", "Vietnam", "Georgia"];

// Stable pick based on the worker ID, so the same worker always gets the same values
const pick = <T,>(list: T[], id: string, salt = 0): T => {
  const n = id.split("").reduce((a, c) => a + c.charCodeAt(0), salt);
  return list[n % list.length];
};

const detailFor = (w: Worker): WorkerDetailInfo => {
  const missing = w.docsMissing ?? 0;
  const base: WorkerDetailInfo = {
    dob: "—", nationality: pick(COUNTRIES, w.id, 7), role: pick(ROLES, w.id), telephone: "—", email: "—", address: "—",
    country: pick(COUNTRIES, w.id, 7), prepStage: w.status === "In preparation" ? "In progress" : "Complete", arrival: "—", workStart: "—",
    empStart: "—", employer: "Staffmate s.r.o.", spFrom: "—", deregFrom: "—", verifiedBy: "—",
    spFile: w.sp === "Registered" ? "sp_confirmation.pdf" : "—",
    createdOn: "—", createdBy: w.coordinator, assignStart: "—",
    docs: DOC_TEMPLATE.map((d, i) => (i < missing ? { ...d, files: [], verified: false } : { ...d, verified: true })),
  };
  return { ...base, ...(DETAIL_OVERRIDES[w.id] ?? {}) };
};

/* ---------- Pending action (status card on the detail page) ---------- */
const AS_OF = "2026-09-09"; // same "as of" date as the other pages
const daysSince = (iso: string) => Math.round((Date.parse(AS_OF) - Date.parse(iso)) / 86400000);

const pendingLabel = (w: Worker): string => (w.status === "Did not start" ? "Did-not-start check" : w.status);
const pendingHint = (w: Worker): string | null =>
  w.status === "Available"
    ? (w.sp !== "Registered" ? "Verify Social Insurance evidence to activate the assignment." : "Assign the worker to a project.")
    : w.status === "In preparation" ? "Complete the preparation checklist and required documents."
    : w.status === "Did not start" ? "Complete the did-not-start check."
    : null;

const SP_TONE: Record<SpState, string> = { Registered: "ok", "No evidence": "bad", "Uploaded, awaiting verification": "warn" };

function WPill({ tone, children }: { tone: string; children: React.ReactNode }): React.JSX.Element {
  return <span className={`sm-pill ${tone} wd-pill`}>{children}</span>;
}

/* ---------- Begin termination dialog ---------- */
const TERMINATION_REASONS = [
  "Employment ended by agreement",
  "Resignation by worker",
  "Dismissal by employer",
  "Contract expired",
  "Did not start work",
  "Other",
];

const todayIso = () => {
  const n = new Date();
  const p = (v: number) => String(v).padStart(2, "0");
  return `${n.getFullYear()}-${p(n.getMonth() + 1)}-${p(n.getDate())}`;
};

function TerminationDialog({ worker, onClose, onConfirm }: {
  worker: Worker;
  onClose: () => void;
  onConfirm: (date: string, reason: string) => void;
}): React.JSX.Element {
  const [date, setDate] = useState(todayIso());
  const [reason, setReason] = useState(TERMINATION_REASONS[0]);

  // Esc closes the dialog
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="tm-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="tm-dialog" role="dialog" aria-modal="true" aria-labelledby="tm-title">
        <div className="tm-head">
          <h2 id="tm-title">{worker.name}</h2>
          <button type="button" className="tm-close" aria-label="Close" onClick={onClose}><X size={18} /></button>
        </div>

        <div className="tm-grid">
          <label className="tm-field">
            <span>Effective termination date <b>*</b></span>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
          </label>
          <label className="tm-field">
            <span>Reason</span>
            <span className="tm-select">
              <select value={reason} onChange={(e) => setReason(e.target.value)}>
                {TERMINATION_REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
              <ChevronDown size={16} />
            </span>
          </label>
        </div>

        <p className="tm-note">
          The worker stays <strong>{worker.status}</strong> and appears in Pending action until the Social Insurance
          deregistration document is uploaded and verified. Only then does the status become <strong>Terminated</strong>.
          {worker.project && <><br />The current assignment ends on the effective date.</>}
        </p>

        <button type="button" className="sm-btn sm-btn-primary tm-submit" disabled={!date} onClick={() => onConfirm(date, reason)}>
          Begin termination
        </button>
      </div>
    </div>
  );
}

/* ---------- Edit profile dialog ---------- */
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const COORDINATORS = [JANA, PETER];

// "11 Sep 1987" -> "1987-09-11" (for the date input); anything else -> ""
const dispToIso = (s: string) => {
  const m = /^(\d{1,2}) (\w{3}) (\d{4})$/.exec(s);
  const mi = m ? MONTHS.indexOf(m[2]) : -1;
  return m && mi >= 0 ? `${m[3]}-${String(mi + 1).padStart(2, "0")}-${m[1].padStart(2, "0")}` : "";
};
// "1987-09-11" -> "11 Sep 1987"; empty -> "—"
const isoToDisp = (s: string) => {
  if (!s) return "—";
  const [y, mo, da] = s.split("-");
  return `${da} ${MONTHS[+mo - 1]} ${y}`;
};
const dashBlank = (v: string) => (v === "—" ? "" : v);
const blankDash = (v: string) => v.trim() || "—";

interface ProfilePatch { name: string; coordinator: string }

function EditProfileDialog({ worker, d, onClose, onSave }: {
  worker: Worker;
  d: WorkerDetailInfo;
  onClose: () => void;
  onSave: (patch: ProfilePatch, extra: Partial<WorkerDetailInfo>) => void;
}): React.JSX.Element {
  const [first, setFirst] = useState(() => worker.name.split(" ")[0] ?? "");
  const [surname, setSurname] = useState(() => worker.name.split(" ").slice(1).join(" "));
  const [dob, setDob] = useState(() => dispToIso(d.dob));
  const [nationality, setNationality] = useState(() => dashBlank(d.nationality));
  const [telephone, setTelephone] = useState(() => dashBlank(d.telephone));
  const [email, setEmail] = useState(() => dashBlank(d.email));
  const [address, setAddress] = useState(() => dashBlank(d.address));
  const [role, setRole] = useState(() => dashBlank(d.role));
  const [coordinator, setCoordinator] = useState(worker.coordinator);

  // Esc closes the dialog
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const canSave = first.trim() !== "" && surname.trim() !== "";
  const save = () => {
    if (!canSave) return;
    onSave(
      { name: `${first.trim()} ${surname.trim()}`, coordinator },
      {
        dob: isoToDisp(dob), nationality: blankDash(nationality), telephone: blankDash(telephone),
        email: blankDash(email), address: blankDash(address), role: blankDash(role),
      },
    );
  };

  return (
    <div className="tm-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="tm-dialog" role="dialog" aria-modal="true" aria-labelledby="ep-title">
        <div className="tm-head">
          <h2 id="ep-title">Edit Profile — {worker.name}</h2>
          <button type="button" className="tm-close" aria-label="Close" onClick={onClose}><X size={18} /></button>
        </div>

        <div className="tm-grid">
          <label className="tm-field"><span>First Name</span>
            <input value={first} onChange={(e) => setFirst(e.target.value)} />
          </label>
          <label className="tm-field"><span>Surname</span>
            <input value={surname} onChange={(e) => setSurname(e.target.value)} />
          </label>

          <label className="tm-field"><span>Date of Birth</span>
            <input type="date" value={dob} onChange={(e) => setDob(e.target.value)} />
          </label>
          <label className="tm-field"><span>Nationality</span>
            <input value={nationality} onChange={(e) => setNationality(e.target.value)} />
          </label>

          <label className="tm-field"><span>Telephone</span>
            <input type="tel" value={telephone} onChange={(e) => setTelephone(e.target.value)} />
          </label>
          <label className="tm-field"><span>Email</span>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>

          <label className="tm-field tm-wide"><span>Address</span>
            <input value={address} onChange={(e) => setAddress(e.target.value)} />
          </label>

          <label className="tm-field"><span>Job Role</span>
            <input value={role} onChange={(e) => setRole(e.target.value)} />
          </label>
          <label className="tm-field"><span>Coordinator</span>
            <span className="tm-select">
              <select value={coordinator} onChange={(e) => setCoordinator(e.target.value)}>
                {(COORDINATORS.includes(coordinator) ? COORDINATORS : [coordinator, ...COORDINATORS]).map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <ChevronDown size={16} />
            </span>
          </label>
        </div>

        <p className="tm-note">
          Workforce status is not editable directly here — it follows the assignment workflow (Assign / End / Transfer)
          so a manual edit can never create a Working status without a valid assignment.
        </p>

        <button type="button" className="sm-btn sm-btn-primary tm-submit" disabled={!canSave} onClick={save}>
          Save Changes
        </button>
      </div>
    </div>
  );
}

function WorkerDetail({ worker, extra, onBack, onSave }: {
  worker: Worker;
  extra?: Partial<WorkerDetailInfo>;
  onBack: () => void;
  onSave: (patch: ProfilePatch, extra: Partial<WorkerDetailInfo>) => void;
}): React.JSX.Element {
  const d = useMemo(() => ({ ...detailFor(worker), ...(extra ?? {}) }), [worker, extra]);
  const [tab, setTab] = useState<DetailTab>("Personal");
  const [docs, setDocs] = useState<DocItem[]>(d.docs);
  const fileRef = useRef<HTMLInputElement>(null);
  const [termOpen, setTermOpen] = useState(false);
  const [termNote, setTermNote] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);

  const stage = STAGE_OF[worker.status];
  const initials = worker.name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
  const subtitle = [d.role, d.nationality].filter((v) => v && v !== "—").join(" · ");
  const verifiedCount = docs.filter((x) => x.files.length > 0 && x.verified).length;

  // Dropped / picked files fill the first categories that are still missing (pending verification).
  const addFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const picked = Array.from(files);
    setDocs((list) => list.map((item) => {
      if (item.files.length > 0 || picked.length === 0) return item;
      const f = picked.shift()!;
      return { ...item, files: [f.name], verified: false };
    }));
  };

  const kv = (rows: [string, React.ReactNode][]) => (
    <dl className="wd-kv">
      {rows.map(([k, v]) => (<React.Fragment key={k}><dt>{k}</dt><dd>{v}</dd></React.Fragment>))}
    </dl>
  );

  const assignmentStatus = worker.status === "Assigned to a project" ? "Active" : "Planned";

  const hint = pendingHint(worker);
  const sinceIso = dispToIso(d.empStart);
  const pendingDays = sinceIso ? daysSince(sinceIso) : null;

  return (
    <>
      <nav className="wk-crumb" aria-label="Breadcrumb">
        <Link to="/admin">Home</Link>
        <ChevronRight size={14} />
        <a href="/admin/workers" onClick={(e) => { e.preventDefault(); onBack(); }}>Workers</a>
        <ChevronRight size={14} />
        <b>{worker.name}</b>
      </nav>

      {worker.blocked && worker.project && (
        <div className="wd-blocked" role="alert">
          <Ban size={16} />
          <span>Assignment is BLOCKED — SP registration is not verified for the planned start date at {worker.project}.</span>
        </div>
      )}

      {termNote && (
        <div className="wk-notice" role="status">
          <span>{termNote}</span>
          <button type="button" aria-label="Dismiss" onClick={() => setTermNote(null)}><X size={16} /></button>
        </div>
      )}

      <section className="sm-card wd-head">
        <div className="wd-avatar">{initials}</div>
        <div className="wd-who">
          <h1>{worker.name} <span>· {worker.id}</span></h1>
          {subtitle && <p>{subtitle}</p>}
        </div>
        <div className="wd-head-btns">
          <button type="button" className="sm-btn sm-btn-outline" onClick={() => setTermOpen(true)}><UserX size={16} /> Begin termination</button>
          <button type="button" className="sm-btn sm-btn-outline" onClick={() => setEditOpen(true)}><Pencil size={16} /> Edit Profile</button>
        </div>
      </section>

      <section className="sm-card wd-sum">
        <div>
          <div className="wd-k">Worker status</div>
          <div className="wd-v"><WPill tone={STATUS_PILL[worker.status]}>{worker.status}</WPill></div>
        </div>
        <div><div className="wd-k">Project</div><div className="wd-v wd-strong">{worker.project ?? "—"}</div></div>
        <div><div className="wd-k">Coordinator</div><div className="wd-v wd-strong">{worker.coordinator}</div></div>
        <div><div className="wd-k">Employment start</div><div className="wd-v wd-strong">{d.empStart}</div></div>
        <div>
          <div className="wd-k">Social Insurance</div>
          <div className="wd-v"><WPill tone={SP_TONE[worker.sp]}>{worker.sp === "Uploaded, awaiting verification" ? "Awaiting verification" : worker.sp}</WPill></div>
        </div>
        <div>
          <div className="wd-k">Documents</div>
          <div className="wd-v">
            {worker.docsMissing ? <WPill tone="bad">{worker.docsMissing} missing</WPill> : <WPill tone="ok">Complete</WPill>}
          </div>
        </div>
        <div><div className="wd-k">Accommodation</div><div className="wd-v wd-strong">{worker.accommodation ?? "None"}</div></div>
      </section>

      <section className="sm-card wd-life">
        <div className="wd-life-title">Worker lifecycle</div>
        <div className="wd-steps">
          {LIFECYCLE.map((label, i) => {
            const cls = i < stage ? "is-done" : i === stage ? (label === "Terminated" ? "is-current is-bad" : "is-current") : "";
            return (
              <div key={label} className={`wd-step ${cls}`}>
                {i < stage && <Check size={15} strokeWidth={2} />}
                {label}
              </div>
            );
          })}
        </div>
      </section>

      <section className="sm-card wd-status">
        <h3 className="wd-status-title"><TrendingUp size={16} /> Worker status and pending action</h3>
        {kv([
          ["Worker status", (
            <span key="s">
              <WPill tone={STATUS_PILL[worker.status]}>{worker.status}</WPill>
              <span className="wd-status-note">calculated from dated records</span>
            </span>
          )],
          ["Employment start", d.empStart],
        ])}
        {hint && (
          <div className="wd-pending">
            <ClipboardList size={16} />
            <span>
              <b>Pending action: {pendingLabel(worker)}</b> — {hint}
              {pendingDays !== null ? ` Since ${d.empStart} · ${pendingDays} days.` : ""}
            </span>
          </div>
        )}
      </section>

      <div className="wd-tabs" role="tablist">
        {DETAIL_TABS.map((t) => (
          <button key={t} role="tab" aria-selected={tab === t} className={tab === t ? "is-active" : ""} onClick={() => setTab(t)}>{t}</button>
        ))}
      </div>

      {tab === "Personal" && (
        <section className="sm-card wd-panel">
          {kv([
            ["First / Surname", worker.name],
            ["Date of Birth", d.dob],
            ["Nationality", d.nationality],
            ["Internal ID", worker.id],
            ["Job Role", d.role],
            ["Telephone", d.telephone],
            ["Email", d.email],
            ["Address", d.address],
            ["Coordinator", worker.coordinator],
          ])}
        </section>
      )}

      {tab === "Preparation" && (
        <section className="sm-card wd-panel">
          {kv([
            ["Current Country", d.country],
            ["Preparation Stage", d.prepStage],
            ["Planned Arrival", d.arrival],
            ["Planned Work Start", d.workStart],
            ["Intended Project", worker.project ? `${worker.project} (Planned)` : "—"],
          ])}
        </section>
      )}

      {tab === "Documents" && (
        <section className="sm-card wd-panel">
          <div className="wd-panel-head">
            <h3>Document Checklist</h3>
            <span className="wd-muted">{verifiedCount} of {docs.length} required items verified</span>
          </div>
          <div
            className="wd-drop"
            role="button"
            tabIndex={0}
            onClick={() => fileRef.current?.click()}
            onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && fileRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); addFiles(e.dataTransfer.files); }}
          >
            <CloudUpload size={20} strokeWidth={1.5} />
            <span>Drag files here or click to upload — PDF, JPG, PNG. Assign a category to each file.</span>
            <input ref={fileRef} type="file" hidden multiple accept=".pdf,.jpg,.jpeg,.png"
              onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }} />
          </div>
          <div className="wd-docs">
            {docs.map((x) => {
              const missing = x.files.length === 0;
              return (
                <React.Fragment key={x.category}>
                  <div className="wd-doc">
                    <div>
                      <strong>{x.category}</strong>
                      <small>{x.expiry}</small>
                    </div>
                    <div className="wd-files">
                      {missing ? <span className="wd-muted">— not uploaded</span> : x.files.map((f) => (
                        <span key={f} className="wd-file"><FileText size={14} strokeWidth={1.6} />{f}</span>
                      ))}
                    </div>
                    <div>
                      <WPill tone={missing ? "bad" : x.verified ? "ok" : "warn"}>
                        {missing ? "Missing" : x.verified ? "Verified" : "Pending verification"}
                      </WPill>
                    </div>
                    <div className="wd-doc-act">
                      {!missing && <button type="button" className="wd-link">Preview</button>}
                    </div>
                  </div>
                  {x.category === "Employment Contract" && !missing && (
                    <button type="button" className="wd-add"><Plus size={14} /> Add Amendment</button>
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </section>
      )}

      {tab === "Employment & SP" && (
        <section className="sm-card wd-panel">
          {kv([
            ["Current Badge", <WPill key="b" tone={SP_TONE[worker.sp]}>SP – {worker.sp}</WPill>],
            ["Employing Entity", d.employer],
            ["Registration Effective From", d.spFrom],
            ["Deregistered From", d.deregFrom],
            ["Verified By", d.verifiedBy],
            ["Supporting Evidence", d.spFile !== "—" ? <span key="f" className="wd-green">{d.spFile}</span> : "—"],
          ])}
          <h3 className="wd-sub">Registration Periods</h3>
          <div className="sm-table-wrap">
            <table className="sm-table wd-table">
              <thead><tr><th>From</th><th>To</th><th>Status</th></tr></thead>
              <tbody>
                {worker.sp === "Registered" ? (
                  <tr><td>{d.spFrom}</td><td>Current</td><td>Registered (current)</td></tr>
                ) : (
                  <tr><td colSpan={3} className="wd-muted">No registration periods yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <button type="button" className="sm-btn sm-btn-outline wd-btn"><BadgeCheck size={16} /> Update SP Record</button>
        </section>
      )}

      {tab === "Assignments" && (
        <section className="sm-card wd-panel">
          <div className="wd-panel-head">
            <h3>Current &amp; Planned Assignment</h3>
            {worker.project && (
              <div className="wd-head-btns">
                <button type="button" className="sm-btn sm-btn-outline"><ArrowRightLeft size={16} /> Transfer</button>
                <button type="button" className="sm-btn sm-btn-outline"><CalendarX2 size={16} /> End Assignment</button>
              </div>
            )}
          </div>
          <div className="sm-table-wrap">
            <table className="sm-table wd-table">
              <thead>
                <tr><th>Project</th><th>Role</th><th>Coordinator</th><th>Start</th><th>Planned/Actual End</th><th>Status</th></tr>
              </thead>
              <tbody>
                {worker.project ? (
                  <tr>
                    <td><strong>{worker.project}</strong></td>
                    <td>{d.role}</td>
                    <td>{worker.coordinator}</td>
                    <td>{d.assignStart}</td>
                    <td>Open-ended</td>
                    <td><WPill tone={assignmentStatus === "Active" ? "ok" : "muted"}>{assignmentStatus}</WPill></td>
                  </tr>
                ) : (
                  <tr><td colSpan={6} className="wd-muted">No current or planned assignment.</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <p className="wd-muted wd-foot">
            Ending an assignment does not automatically end accommodation or change SP registration — each is tracked independently.
          </p>
        </section>
      )}

      {tab === "Accommodation" && (
        <section className="sm-card wd-panel">
          <div className="wd-panel-head">
            <h3>Accommodation</h3>
            <button type="button" className="sm-btn sm-btn-outline"><LogIn size={16} /> Check In</button>
          </div>
          <div className="sm-table-wrap">
            <table className="sm-table wd-table">
              <thead><tr><th>Facility</th><th>Stay Start</th><th>Planned/Actual End</th><th>Related Project</th></tr></thead>
              <tbody>
                {worker.accommodation ? (
                  <tr>
                    <td><strong>{worker.accommodation}</strong></td>
                    <td>—</td>
                    <td>Open-ended</td>
                    <td>{worker.project ?? "—"}</td>
                  </tr>
                ) : (
                  <tr><td colSpan={4}>Not currently accommodated</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {tab === "Tasks & Notes" && (
        <section className="sm-card wd-panel"><p className="wd-empty">No tasks linked to this worker.</p></section>
      )}

      {tab === "History" && (
        <section className="sm-card wd-panel">
          <div className="wd-event">
            <strong>Profile created</strong>
            <span>{d.createdOn} · by {d.createdBy}</span>
          </div>
        </section>
      )}

      {editOpen && (
        <EditProfileDialog
          worker={worker}
          d={d}
          onClose={() => setEditOpen(false)}
          onSave={(patch, ex) => {
            onSave(patch, ex);
            setEditOpen(false);
            setTermNote(`Profile updated for ${patch.name} (${worker.id}).`);
          }}
        />
      )}

      {termOpen && (
        <TerminationDialog
          worker={worker}
          onClose={() => setTermOpen(false)}
          onConfirm={(date, reason) => {
            setTermOpen(false);
            setTermNote(`Termination started for ${worker.name} (${worker.id}) — effective ${date}, reason: ${reason}. Status changes to Terminated once the SP deregistration document is verified.`);
          }}
        />
      )}
    </>
  );
}

/* ---------- Page ---------- */
export default function WorkersPage(): React.JSX.Element {
  // open on the tab named in the URL, e.g. /admin/workers?tab=avail
  // open a worker profile named in the URL, e.g. /admin/workers?worker=Ivan%20Petrenko (name or ID)
  const [searchParams, setSearchParams] = useSearchParams();
  const urlTab = searchParams.get("tab");
  const urlWorker = searchParams.get("worker");
  const [tabKey, setTabKey] = useState(tabFromUrl(urlTab));

  // if the URL tab changes while the page is already open, follow it
  useEffect(() => { setTabKey(tabFromUrl(urlTab)); }, [urlTab]);

  const [workers, setWorkers] = useState<Worker[]>(INITIAL_WORKERS);
  const [addOpen, setAddOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [compact, setCompact] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  // Opens straight on the worker named in ?worker= (so Documents -> worker profile works)
  const [openId, setOpenId] = useState<string | null>(
    () => INITIAL_WORKERS.find((w) => w.id === urlWorker || w.name === urlWorker)?.id ?? null,
  );

  // if ?worker= changes while the page is already open, follow it
  useEffect(() => {
    if (!urlWorker) return;
    const w = workers.find((x) => x.id === urlWorker || x.name === urlWorker);
    if (w) setOpenId(w.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlWorker]);

  // Profile fields edited through the Edit Profile dialog (kept per worker ID)
  const [extras, setExtras] = useState<Record<string, Partial<WorkerDetailInfo>>>({});
  // Filters panel
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<Filters>(NO_FILTERS);
  const setFilter = (k: keyof Filters, v: string) => setFilters((f) => ({ ...f, [k]: v }));
  const clearFilters = () => setFilters(NO_FILTERS);
  const filtersActive = Object.values(filters).some((v) => v !== ANY);

  const saveProfile = (id: string, patch: ProfilePatch, extra: Partial<WorkerDetailInfo>) => {
    setWorkers((list) => list.map((w) => (w.id === id ? { ...w, ...patch } : w)).sort((x, y) => x.name.localeCompare(y.name)));
    setExtras((e) => ({ ...e, [id]: { ...e[id], ...extra } }));
  };

  const tab = TABS.find((t) => t.key === tabKey)!;
  const count = (key: string) => workers.filter(TABS.find((t) => t.key === key)!.match).length;

  // Same nationality the detail page shows (includes edits made in Edit Profile)
  const nationalityOf = (w: Worker) => extras[w.id]?.nationality ?? detailFor(w).nationality;

  // Called by the Add Worker dialog on Save Draft / Submit for Review.
  // Saving the same profile again (same internal ID) updates it instead of adding a duplicate.
  const handleSaved = (f: SavedWorker, status: "Draft" | "Pending Review") => {
    const worker = toWorker(f);
    setWorkers((list) => [...list.filter((w) => w.id !== worker.id), worker].sort((x, y) => x.name.localeCompare(y.name)));
    setNotice(`${worker.name} (${worker.id}) saved — ${status === "Draft" ? "draft" : "submitted for review"}, status: In preparation.`);
  };

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const nat = (w: Worker) => extras[w.id]?.nationality ?? detailFor(w).nationality;
    return workers
      .filter(tab.match)
      .filter((w) => !q || w.name.toLowerCase().includes(q) || w.id.toLowerCase().includes(q))
      .filter((w) =>
        (filters.project === ANY || w.project === filters.project) &&
        (filters.coordinator === ANY || w.coordinator === filters.coordinator) &&
        (filters.sp === ANY || w.sp === filters.sp) &&
        (filters.reason === ANY || pendingReason(w) === filters.reason) &&
        (filters.nationality === ANY || nat(w) === filters.nationality),
      );
  }, [tab, query, workers, filters, extras]);

  useEffect(() => setPage(1), [tabKey, query, filters]);

  const pages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const start = (page - 1) * PAGE_SIZE;
  const pageRows = rows.slice(start, start + PAGE_SIZE);
  const allChecked = pageRows.length > 0 && pageRows.every((w) => selected.has(w.id));
  const showPending = tabKey === "pending";

  const openWorker = openId ? workers.find((w) => w.id === openId) : undefined;
  if (openWorker) {
    return (
      <>
        <style>{css}</style>
        <WorkerDetail
          worker={openWorker}
          extra={extras[openWorker.id]}
          onBack={() => {
            setOpenId(null);
            // clear ?worker= so the Workers breadcrumb returns to the normal list
            if (urlWorker) {
              const next = new URLSearchParams(searchParams);
              next.delete("worker");
              setSearchParams(next, { replace: true });
            }
          }}
          onSave={(patch, ex) => saveProfile(openWorker.id, patch, ex)}
        />
      </>
    );
  }

  const toggle = (id: string) =>
    setSelected((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleAll = () =>
    setSelected((s) => { const n = new Set(s); pageRows.forEach((w) => (allChecked ? n.delete(w.id) : n.add(w.id))); return n; });

  const exportCsv = () => {
    const head = "ID,Name,Status,Project,Coordinator,Accommodation";
    const body = rows.map((w) => [w.id, w.name, w.status, w.project ?? "", w.coordinator, w.accommodation ?? ""].map((v) => `"${v}"`).join(","));
    const url = URL.createObjectURL(new Blob([[head, ...body].join("\n")], { type: "text/csv" }));
    Object.assign(document.createElement("a"), { href: url, download: "workers.csv" }).click();
    URL.revokeObjectURL(url);
  };

  const stats = [
    { label: "Assigned to a project", value: count("assigned") },
    { label: "Available", value: count("avail") },
    { label: "In preparation", value: count("prep") },
    { label: "Pending action", value: count("pending"), danger: true, caption: "Calculated, not stored" },
    { label: "Accommodated", value: count("accom") },
  ];

  const filterFields: [keyof Filters, string, string[]][] = [
    ["project", "Project", uniqSorted(workers.map((w) => w.project))],
    ["coordinator", "Coordinator", uniqSorted(workers.map((w) => w.coordinator))],
    ["sp", "Social Insurance", SP_OPTIONS],
    ["reason", "Pending action reason", REASON_OPTIONS],
    ["nationality", "Nationality", uniqSorted(workers.map(nationalityOf))],
  ];

  return (
    <>
      <style>{css}</style>

      <nav className="wk-crumb" aria-label="Breadcrumb">
        <Link to="/admin">Home</Link><ChevronRight size={14} /><b>Workers</b>
      </nav>

      <div className="sm-title-row">
        <div>
          <h1>Workers</h1>
          <p className="wk-desc">
            One profile per person. The worker status is calculated from dated records — nobody sets it by hand.
            Creating a profile does not create an employment relationship.
          </p>
        </div>
        <button type="button" className="sm-btn sm-btn-primary" onClick={() => setAddOpen(true)}>
          <UserPlus size={16} /> Add Worker
        </button>
      </div>

      {notice && (
        <div className="wk-notice" role="status">
          <span>{notice}</span>
          <button type="button" aria-label="Dismiss" onClick={() => setNotice(null)}><X size={16} /></button>
        </div>
      )}

      <section className="sm-card sm-stat-group" style={{ gridTemplateColumns: "repeat(5, 1fr)" }}>
        {stats.map((s) => (
          <div key={s.label} className="sm-stat wk-stat">
            <div className="sm-stat-title">{s.label}</div>
            <div className={`sm-stat-value${s.danger ? " is-danger" : ""}`}>{s.value}</div>
            {s.caption && <div className="sm-stat-caption">{s.caption}</div>}
          </div>
        ))}
      </section>

      <div className="wk-tabs" role="tablist">
        {TABS.map((t) => (
          <button key={t.key} role="tab" aria-selected={tabKey === t.key} className={tabKey === t.key ? "is-active" : ""} onClick={() => setTabKey(t.key)}>
            {t.label} ({count(t.key)})
          </button>
        ))}
      </div>

      <section className="sm-card wk-panel">
        <div className="wk-toolbar">
          <label className="wk-select">
            <select defaultValue="all" aria-label="View">
              <option value="all">View: All workers</option>
              <option value="mine">View: My workers</option>
            </select>
            <ChevronDown size={16} />
          </label>
          <label className="wk-search">
            <Search size={16} />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Name or ID" />
          </label>
          <button
            type="button"
            className={`sm-btn sm-btn-outline${showFilters || filtersActive ? " is-open" : ""}`}
            aria-expanded={showFilters}
            onClick={() => setShowFilters((v) => !v)}
          >
            <SlidersHorizontal size={16} /> Filters
          </button>
          <button className="sm-btn sm-btn-outline" onClick={exportCsv}><Download size={16} /> Export</button>
          <div className="wk-density" role="group" aria-label="Row density">
            <button className={!compact ? "is-on" : ""} onClick={() => setCompact(false)} aria-label="Comfortable"><AlignJustify size={18} /></button>
            <button className={compact ? "is-on" : ""} onClick={() => setCompact(true)} aria-label="Compact"><Menu size={18} /></button>
          </div>
        </div>

        {showFilters && (
          <div className="wf-panel">
            <div className="wf-grid">
              {filterFields.map(([key, label, options]) => (
                <div key={key} className="wf-field">
                  <label htmlFor={`wf-${key}`}>{label}</label>
                  <div className="wf-select">
                    <select id={`wf-${key}`} value={filters[key]} onChange={(e) => setFilter(key, e.target.value)}>
                      <option>{ANY}</option>
                      {options.map((o) => <option key={o}>{o}</option>)}
                    </select>
                    <ChevronDown size={16} />
                  </div>
                </div>
              ))}
            </div>
            <button type="button" className="wf-clear" onClick={clearFilters}>Clear filters</button>
          </div>
        )}

        {showPending && (
          <p className="wk-note">
            Each worker shows one reason, in this order: awaiting termination documentation, did-not-start check,
            in preparation, available. The list is calculated from dated records and cannot be edited.
          </p>
        )}

        <div className={`wk-scroll${compact ? " is-compact" : ""}`}>
          <table className="sm-table wk-table">
            <thead>
              <tr>
                <th className="wk-check"><input type="checkbox" checked={allChecked} onChange={toggleAll} aria-label="Select all" /></th>
                <th>Worker</th><th>Worker status</th><th>Project</th><th>Coordinator</th>
                {showPending && <th>Pending reason</th>}
                <th>Accommodation</th><th>Documentation</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map((w) => (
                <tr key={w.id}>
                  <td className="wk-check"><input type="checkbox" checked={selected.has(w.id)} onChange={() => toggle(w.id)} aria-label={`Select ${w.name}`} /></td>
                  <td>
                    <strong><button type="button" className="wk-link" onClick={() => setOpenId(w.id)}>{w.name}</button>{w.sp !== "Registered" && <span className="wk-sp">SP</span>}</strong>
                    <small>{w.id} · <span className={`sm-pill ${w.sp === "Registered" ? "ok" : "bad"}`}>SP – {w.sp}</span></small>
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
                    {w.docsMissing ? <span className="sm-pill bad">{w.docsMissing} missing</span> : <span className="sm-pill ok">Complete</span>}
                  </td>
                </tr>
              ))}
              {pageRows.length === 0 && <tr><td colSpan={8} className="wk-none">No workers found.</td></tr>}
            </tbody>
          </table>
        </div>

        <div className="wk-foot">
          <span>
            Showing {rows.length === 0 ? 0 : start + 1}–{Math.min(start + PAGE_SIZE, rows.length)} of {rows.length} workers
          </span>
          <span className="wk-pager">
            <button className="sm-btn sm-btn-outline" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button>
            Page {page} of {pages}
            <button className="sm-btn sm-btn-outline" disabled={page >= pages} onClick={() => setPage(page + 1)}>Next</button>
          </span>
        </div>
      </section>

      {addOpen && (
        <AddWorkerPage open onClose={() => setAddOpen(false)} onSaved={handleSaved} />
      )}
    </>
  );
}

const css = `
.wk-crumb{display:flex;align-items:center;gap:8px;font-size:16px;color:var(--muted);margin-bottom:11px}
.wk-crumb b{color:var(--text);font-weight:600}
.wk-desc{max-width:780px}
.wk-stat{min-height:0;padding:16px 22px}
.wk-stat .sm-stat-value{margin-top:6px}
.wk-tabs{display:flex;gap:4px;overflow-x:auto;border-bottom:1px solid var(--line);margin-bottom:19px;scrollbar-width:none}
.wk-tabs::-webkit-scrollbar{display:none}
.wk-tabs button{flex:none;padding:12px 18px;font-size:17px;color:var(--muted);white-space:nowrap;border-bottom:2px solid transparent;margin-bottom:-1px}
.wk-tabs button.is-active{color:var(--green);font-weight:600;border-bottom-color:var(--green)}
.wk-panel{padding:0 0 16px;margin-bottom:19px}
.wk-toolbar{display:flex;align-items:center;gap:14px;padding:20px 22px 14px}
.wk-select{position:relative;width:340px;flex:none;color:var(--muted)}
.wk-select select{appearance:none;width:100%;height:42px;padding:0 40px 0 18px;border:1px solid var(--line);border-radius:8px;background:#fff;font:inherit;font-size:16px;color:var(--text)}
.wk-select svg{position:absolute;right:14px;top:13px;pointer-events:none}
.wk-search{display:flex;align-items:center;gap:10px;flex:1;height:42px;padding:0 14px;border:1px solid var(--line);border-radius:8px;background:#faf9f6;color:var(--muted)}
.wk-search input{flex:1;border:0;background:transparent;outline:none;font-size:16px;color:var(--text)}
.wk-density{margin-left:auto;display:flex;padding:3px;border:1px solid var(--line);border-radius:8px;background:#f1f0ea}
.wk-density button{width:42px;height:38px;display:grid;place-items:center;border-radius:6px}
.wk-density button.is-on{background:var(--green-soft);color:var(--green)}
.wk-note{margin:2px 22px 10px;font-size:15px;color:var(--muted);line-height:1.5}
.wk-scroll{max-height:560px;overflow:auto;margin:0 12px}
.wk-table{min-width:1050px}
.wk-table thead th{position:sticky;top:0;background:#fff;z-index:1;white-space:nowrap;padding-left:12px}
.wk-table td{padding:14px 12px;white-space:nowrap}
.wk-scroll.is-compact .wk-table td{padding-top:6px;padding-bottom:6px}
.wk-table small{display:flex;align-items:center;gap:6px;margin-top:3px}
.wk-table small .sm-pill{padding:2px 10px;font-size:14px}
.wk-check{width:46px;padding-left:12px!important}
.wk-check input{width:18px;height:18px;accent-color:var(--green)}
.wk-sp{display:inline-block;margin-left:8px;padding:1px 7px;border-radius:5px;background:var(--danger);color:#fff;font-size:12px;font-weight:700;vertical-align:middle}
.wk-gap{margin-left:6px}
.wk-none{text-align:center;color:var(--muted);padding:32px 0!important}
.wk-foot{display:flex;justify-content:space-between;align-items:center;padding:14px 22px 0;font-size:16px;color:var(--muted)}
.wk-pager{display:flex;align-items:center;gap:10px}
.wk-pager .sm-btn{height:36px;padding:0 14px}
.wk-pager .sm-btn:disabled{opacity:.5;cursor:default}
.sm-pill.info{background:#e3ecfb;color:#2c55b8}
.sm-pill.muted{background:#eeede8;color:var(--muted)}
.wk-notice{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:9px 14px;margin-bottom:12px;border-radius:10px;background:#e1f0e4;color:#14401f;font-size:13.5px}
.wk-notice button{display:grid;place-items:center;width:24px;height:24px;border-radius:6px;color:#14401f}
.wk-notice button:hover{background:rgba(0,0,0,.06)}

/* ---- Compact sizing (smaller cards and fonts) ---- */
.wk-crumb{font-size:13px;margin-bottom:8px}
.wk-desc{font-size:14px;line-height:1.45}
.wk-stat{padding:9px 14px}
.wk-stat .sm-stat-title{font-size:12.5px}
.wk-stat .sm-stat-value{font-size:22px;line-height:1.1;margin-top:3px}
.wk-stat .sm-stat-caption{font-size:12px;margin-top:2px;line-height:1.3}
.wk-tabs{margin-bottom:12px}
.wk-tabs button{padding:8px 14px;font-size:14px}
.wk-panel{padding:0 0 10px;margin-bottom:12px}
.wk-toolbar{gap:10px;padding:12px 16px 10px}
.wk-select{width:260px}
.wk-select select{height:34px;padding:0 32px 0 12px;font-size:13.5px}
.wk-select svg{right:10px;top:9px;width:15px;height:15px}
.wk-search{height:34px;padding:0 10px;gap:8px;font-size:13.5px}
.wk-search input{font-size:13.5px}
.wk-toolbar .sm-btn{height:34px;padding:0 12px;font-size:13.5px}
.wk-density button{width:34px;height:30px}
.wk-note{margin:2px 16px 8px;font-size:13px}
.wk-table{font-size:13.5px}
.wk-table thead th{font-size:12.5px;padding-top:8px;padding-bottom:8px}
.wk-table td{padding:8px 12px}
.wk-scroll.is-compact .wk-table td{padding-top:4px;padding-bottom:4px}
.wk-table small{font-size:12px;margin-top:2px}
.wk-table small .sm-pill{padding:1px 8px;font-size:12px}
.wk-table .sm-pill{font-size:12.5px;padding:2px 10px}
.wk-check{width:40px}
.wk-check input{width:16px;height:16px}
.wk-sp{font-size:11px;padding:0 6px}
.wk-foot{padding:10px 16px 0;font-size:13.5px}
.wk-pager{gap:8px}
.wk-pager .sm-btn{height:30px;padding:0 12px;font-size:13px}

/* ---- Filters panel ---- */
.wk-toolbar .sm-btn.is-open{border-color:var(--green);color:var(--green)}
.wf-panel{margin:0 16px 12px;padding:16px 18px 10px;border:1px solid var(--line);border-radius:10px;background:#faf9f6}
.wf-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:18px 13px}
.wf-field{display:flex;flex-direction:column;gap:6px;min-width:0}
.wf-field label{font-size:12.5px;color:#4a4a46}
.wf-select{position:relative}
.wf-select select{appearance:none;-webkit-appearance:none;width:100%;height:37px;padding:0 36px 0 14px;border:1px solid var(--line);border-radius:8px;background:#fff;font:inherit;font-size:14px;color:var(--text);outline:none;cursor:pointer;box-sizing:border-box}
.wf-select select:focus{border-color:var(--green);box-shadow:0 0 0 3px rgba(26,107,47,.12)}
.wf-select svg{position:absolute;right:12px;top:50%;transform:translateY(-50%);width:16px;height:16px;pointer-events:none;color:var(--text)}
.wf-clear{margin-top:10px;padding:7px 14px;font-size:14px;font-weight:500;color:var(--green);cursor:pointer;border-radius:6px}
.wf-clear:hover{background:rgba(26,107,47,.08)}
@media (max-width:1000px){.wf-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media (max-width:560px){.wf-grid{grid-template-columns:1fr}}

/* ---- Worker name link ---- */
.wk-link{padding:0;text-align:left;color:var(--text);font:inherit;font-weight:inherit;cursor:pointer}
.wk-link:hover{color:var(--green);text-decoration:underline}

/* ---- Worker detail page ---- */
.wk-crumb a:hover{color:var(--text)}
.wd-head{display:flex;align-items:center;gap:16px;padding:22px 24px;margin-bottom:14px}
.wd-avatar{flex:none;display:grid;place-items:center;width:67px;height:67px;border-radius:14px;background:#d4efd7;color:#14401f;font-size:22px;font-weight:700}
.wd-who{flex:1;min-width:0}
.wd-who h1{margin:0;font-size:23px;line-height:1.2;font-weight:600;color:var(--text)}
.wd-who h1 span{font-size:17px;font-weight:500;color:var(--muted)}
.wd-who p{margin:7px 0 0;font-size:15.5px;color:var(--muted)}
.wd-head-btns{display:flex;gap:10px;flex:none}
.wd-head .sm-btn,.wd-panel-head .sm-btn,.wd-btn{display:inline-flex;align-items:center;justify-content:center;gap:9px;height:38px;padding:0 17px;border-radius:8px;font-size:14px;line-height:1;white-space:nowrap}
.wd-head .sm-btn svg,.wd-panel-head .sm-btn svg,.wd-btn svg{width:16px;height:16px;flex:none}
.wd-sum{display:grid;grid-template-columns:1.55fr 1fr 1.1fr 1fr 1.2fr 1fr 1fr;padding:0;margin-bottom:14px;overflow:hidden}
.wd-sum>div{padding:16px 18px 18px;border-left:1px solid var(--line);min-width:0}
.wd-sum>div:first-child{border-left:0}
.wd-k{font-size:13.5px;color:var(--muted);line-height:1.3}
.wd-v{margin-top:9px;font-size:14px}
.wd-strong{font-size:16px;font-weight:600;line-height:1.35;color:var(--text)}
.wd-pill::before{content:"";display:inline-block;width:7px;height:7px;border-radius:50%;background:currentColor;margin-right:8px;vertical-align:middle}
.wd-life{padding:16px 22px 18px;margin-bottom:14px}
.wd-life-title{font-size:15.5px;color:var(--muted);margin-bottom:12px}
.wd-steps{display:flex}
.wd-step{display:inline-flex;align-items:center;gap:8px;height:42px;padding:0 28px 0 34px;margin-left:-6px;font-size:15.5px;font-weight:500;white-space:nowrap;background:#eeede8;color:var(--muted);clip-path:polygon(0 0,calc(100% - 16px) 0,100% 50%,calc(100% - 16px) 100%,0 100%,16px 50%)}
.wd-step:first-child{margin-left:0;padding-left:20px;clip-path:polygon(0 0,calc(100% - 16px) 0,100% 50%,calc(100% - 16px) 100%,0 100%)}
.wd-step.is-done{background:#c8ebcf;color:#14401f}
.wd-step.is-current{background:#14632c;color:#fff;font-weight:600}
.wd-step.is-current.is-bad{background:#b42318}
.wd-tabs{display:flex;gap:6px;overflow-x:auto;border-bottom:1px solid var(--line);margin-bottom:14px;scrollbar-width:none}
.wd-tabs::-webkit-scrollbar{display:none}
.wd-tabs button{flex:none;padding:10px 16px 11px;font-size:15.5px;color:var(--muted);white-space:nowrap;border-bottom:2px solid transparent;margin-bottom:-1px}
.wd-tabs button.is-active{color:var(--green);font-weight:600;border-bottom-color:var(--green)}
.wd-panel{padding:20px 24px 22px;margin-bottom:16px}
.wd-panel-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:16px}
.wd-panel-head h3,.wd-sub{margin:0;font-size:16px;font-weight:600;color:var(--text)}
.wd-sub{margin:22px 0 8px}
.wd-kv{display:grid;grid-template-columns:224px 1fr;gap:13px 18px;margin:0;font-size:15.5px;line-height:1.35}
.wd-kv dt{color:var(--muted)}
.wd-kv dd{margin:0;color:var(--text)}
.wd-muted{color:var(--muted)}
.wd-green{color:var(--green);font-weight:500}
.wd-table{width:100%;font-size:15px}
.wd-table th{font-size:14px;font-weight:500;color:var(--muted);white-space:nowrap}
.wd-table td{white-space:nowrap;padding-top:13px;padding-bottom:13px}
.wd-btn{margin-top:14px}
.wd-foot{margin:12px 0 0;font-size:14.5px}
.wd-empty{margin:4px 0;color:var(--muted);font-size:15.5px}
.wd-drop{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;min-height:88px;padding:18px;border:1.5px dashed #b9b8b0;border-radius:12px;color:var(--text);font-size:15.5px;text-align:center;cursor:pointer}
.wd-drop svg{color:var(--text)}
.wd-drop:hover,.wd-drop:focus-visible{background:#f6f9f6;border-color:var(--green);outline:none}
.wd-docs{margin-top:8px}
.wd-doc{display:grid;grid-template-columns:minmax(220px,1.3fr) minmax(220px,1.7fr) 190px 90px;align-items:center;gap:12px;padding:16px 14px;border-bottom:1px solid var(--line)}
.wd-doc strong{display:block;font-size:16px;font-weight:600}
.wd-doc small{display:block;margin-top:3px;font-size:14.5px;color:var(--muted)}
.wd-files{display:flex;flex-wrap:wrap;gap:8px}
.wd-file{display:inline-flex;align-items:center;gap:8px;padding:5px 11px;border-radius:7px;background:#f1f0ea;font-size:14.5px;color:var(--text)}
.wd-doc-act{text-align:right}
.wd-link{padding:0;color:var(--green);font-size:15px;font-weight:500;cursor:pointer;background:none}
.wd-link:hover{text-decoration:underline}
.wd-add{display:inline-flex;align-items:center;gap:8px;margin:8px 0 8px 32px;padding:0;color:var(--green);font-size:15px;font-weight:500;cursor:pointer;background:none}
.wd-add:hover{text-decoration:underline}
.wd-event{display:flex;flex-direction:column;gap:6px;padding:8px 4px}
.wd-event strong{font-size:16.5px}
.wd-event span{color:var(--muted);font-size:15px}
@media (max-width:1100px){
  .wd-sum{grid-template-columns:repeat(3,1fr)}
  .wd-sum>div{border-top:1px solid var(--line)}
  .wd-head{flex-wrap:wrap}
  .wd-doc{grid-template-columns:1fr 1fr}
}
@media (max-width:700px){
  .wd-kv{grid-template-columns:1fr;gap:2px 0}
  .wd-kv dd{margin-bottom:10px}
}

/* ---- Worker detail page: compact sizing (matches the list page) ---- */
.wd-head{gap:12px;padding:22px 18px;margin-bottom:10px}
.wd-avatar{width:44px;height:44px;border-radius:10px;font-size:16px}
.wd-who h1{font-size:20px}
.wd-who h1 span{font-size:14px}
.wd-who p{margin-top:3px;font-size:14px}
.wd-head-btns{gap:8px}
.wd-head .sm-btn,.wd-panel-head .sm-btn,.wd-btn{height:32px;padding:0 12px;gap:6px;font-size:13px}
.wd-head .sm-btn svg,.wd-panel-head .sm-btn svg,.wd-btn svg{width:14px;height:14px}

.wd-sum{margin-bottom:10px}
.wd-sum>div{padding:10px 12px 11px}
.wd-k{font-size:12px}
.wd-v{margin-top:5px;font-size:12.5px}
.wd-strong{font-size:13.5px;line-height:1.3}
.wd-pill::before{width:6px;height:6px;margin-right:6px}
.wd-pill{font-size:12px;padding:2px 9px}

.wd-life{padding:10px 16px 12px;margin-bottom:10px}
.wd-life-title{font-size:13px;margin-bottom:8px}
.wd-step{height:32px;padding:0 20px 0 26px;font-size:13px;gap:6px;
  clip-path:polygon(0 0,calc(100% - 12px) 0,100% 50%,calc(100% - 12px) 100%,0 100%,12px 50%)}
.wd-step:first-child{padding-left:14px;
  clip-path:polygon(0 0,calc(100% - 12px) 0,100% 50%,calc(100% - 12px) 100%,0 100%)}

.wd-tabs{margin-bottom:10px;gap:4px}
.wd-tabs button{padding:7px 13px 8px;font-size:13.5px}

.wd-panel{padding:14px 18px 16px;margin-bottom:12px}
.wd-panel-head{margin-bottom:10px}
.wd-panel-head h3,.wd-sub{font-size:14px}
.wd-sub{margin:16px 0 6px}
.wd-kv{grid-template-columns:190px 1fr;gap:9px 14px;font-size:13.5px}
.wd-table{font-size:13px}
.wd-table th{font-size:12px}
.wd-table td{padding-top:8px;padding-bottom:8px}
.wd-btn{margin-top:10px}
.wd-foot{margin-top:8px;font-size:12.5px}
.wd-empty{font-size:13.5px}

.wd-drop{min-height:60px;padding:12px;gap:6px;font-size:13px;border-radius:10px}
.wd-drop svg{width:18px;height:18px}
.wd-doc{grid-template-columns:minmax(200px,1.3fr) minmax(200px,1.7fr) 170px 80px;gap:10px;padding:10px 12px}
.wd-doc strong{font-size:13.5px}
.wd-doc small{font-size:12px;margin-top:2px}
.wd-file{padding:3px 9px;font-size:12.5px;gap:6px}
.wd-link,.wd-add{font-size:13px}
.wd-add{margin:6px 0 6px 28px}
.wd-event{padding:4px}
.wd-event strong{font-size:14px}
.wd-event span{font-size:13px}

/* ---- Blocked banner + status / pending action card ---- */
.wd-blocked{display:flex;align-items:center;gap:10px;padding:9px 14px;margin-bottom:12px;border-radius:10px;background:#fadadb;color:#8a1c14;font-size:13.5px;font-weight:500}
.wd-blocked svg{flex:none}
.wd-status{padding:14px 18px 16px;margin-bottom:10px}
.wd-status-title{display:flex;align-items:center;gap:8px;margin:0 0 10px;font-size:14px;font-weight:600;color:var(--text)}
.wd-status .wd-kv{grid-template-columns:190px 1fr;align-items:center}
.wd-status-note{margin-left:8px;color:var(--muted)}
.wd-pending{display:flex;align-items:center;gap:10px;margin-top:12px;padding:9px 14px;border-radius:8px;background:#fcebc4;color:#5c4000;font-size:13px;line-height:1.4}
.wd-pending svg{flex:none}
.wd-pending b{font-weight:600}

/* ---- Begin termination dialog ---- */
.tm-overlay{position:fixed;inset:0;z-index:200;display:grid;place-items:center;padding:20px;background:rgba(20,24,22,.32);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px)}
.tm-dialog{width:100%;max-width:620px;padding:22px 24px 24px;border-radius:16px;background:#fff;box-shadow:0 20px 60px rgba(0,0,0,.2)}
.tm-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:18px}
.tm-head h2{margin:0;font-size:18px;font-weight:600;color:var(--text)}
.tm-close{display:grid;place-items:center;width:30px;height:30px;border-radius:8px;color:var(--muted);cursor:pointer}
.tm-close:hover{background:#f1f0ea;color:var(--text)}
.tm-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:14px}
.tm-field{display:flex;flex-direction:column;gap:6px;font-size:13px;color:var(--muted)}
.tm-field b{font-weight:500}
.tm-field input,.tm-select select{width:100%;height:36px;padding:0 12px;border:1px solid var(--line);border-radius:8px;background:#fff;font:inherit;font-size:13.5px;color:var(--text)}
.tm-field input:focus,.tm-select select:focus{outline:2px solid var(--green);outline-offset:-1px}
.tm-select{position:relative;display:block}
.tm-select select{appearance:none;padding-right:34px}
.tm-select svg{position:absolute;right:11px;top:10px;pointer-events:none;color:var(--text)}
.tm-note{margin:0 0 16px;font-size:13px;line-height:1.55;color:var(--muted)}
.tm-note strong{color:var(--text);font-weight:600}
.tm-submit{height:36px;padding:0 16px;font-size:13.5px;font-weight:600;border-radius:8px}
.tm-submit:disabled{opacity:.5;cursor:default}
.tm-dialog{max-height:calc(100vh - 40px);overflow-y:auto}
.tm-wide{grid-column:1/-1}
.tm-grid{row-gap:14px}

/* ---- Dialog: slim rounded scrollbar (inset from the rounded corners) ---- */
.tm-dialog::-webkit-scrollbar{width:10px}
.tm-dialog::-webkit-scrollbar-track{background:transparent;margin:14px 0}
.tm-dialog::-webkit-scrollbar-thumb{background:#c9c8c1;border-radius:999px;border:2px solid transparent;background-clip:padding-box}
.tm-dialog::-webkit-scrollbar-thumb:hover{background:#a9a8a0;background-clip:padding-box;border:2px solid transparent}

/* ---- Dialog: smaller card ---- */
.tm-dialog{max-width:520px;padding:16px 20px 18px;border-radius:14px;max-height:calc(100vh - 56px)}
.tm-head{margin-bottom:12px}
.tm-head h2{font-size:16px}
.tm-close{width:26px;height:26px}
.tm-grid{gap:10px 12px;margin-bottom:10px}
.tm-field{gap:4px;font-size:12px}
.tm-field input,.tm-select select{height:32px;padding:0 10px;font-size:13px;border-radius:7px}
.tm-select select{padding-right:30px}
.tm-select svg{top:8px;right:9px;width:15px;height:15px}
.tm-note{margin:0 0 12px;font-size:12px;line-height:1.5}
.tm-submit{height:32px;padding:0 14px;font-size:13px}
@media (max-width:640px){
  .tm-grid{grid-template-columns:1fr}
}
`;
