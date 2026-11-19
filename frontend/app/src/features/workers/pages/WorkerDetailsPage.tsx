import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link, useSearchParams } from "react-router-dom";
import {
  ChevronDown, ChevronRight, Download, Search, SlidersHorizontal, AlignJustify, Menu, X,
  Check, Plus, LogIn, LogOut, ArrowRightLeft, FileText, CloudUpload, Ban, BadgeCheck,
} from "lucide-react";
import AddWorkerPage from "./AddWorkerPage"; // <- adjust the path to where your Add Worker dialog lives
import WorkerTable, { STATUS_PILL, AS_OF } from "../components/WorkerTable";
import WorkerFilters, { NO_FILTERS, hasActiveFilters, matchesFilters } from "../components/WorkerFilters";
import type { Filters } from "../components/WorkerFilters";

/* ---------- Types (exported: the table and filter components import them) ---------- */
export type WorkerStatus = "Assigned to a project" | "Available" | "In preparation" | "Terminated" | "Did not start";
export type SpState = "Registered" | "No evidence" | "Uploaded, awaiting verification" | "Deregistered";

/** A coordinator asked for this (available) worker: shown on the "Coordinator interest" tab. */
export interface InterestInfo {
  coordinator: string;
  date: string;
  project: string;
  reason: string;
  next: string;
}

/** A report sent by a coordinator: shown on the "Coordinator reports" tab. */
export interface ReportInfo {
  kind: string;
  from: string;
  date: string;
  details: string;
  /** "Expected departure" reports get Begin termination / Acknowledge instead of Open. */
  departure?: boolean;
}

export interface Worker {
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
  /** Documents uploaded but not verified yet ("N pending" in the Documentation column). */
  docsPending?: number;
  /** Termination was started; waiting for the SP deregistration document ("Awaiting termination documentation"). */
  terminating?: boolean;
  /** Documents that have expired ("N expired" in the Documentation column). */
  docsExpired?: number;
  /** The assignment was ended, so the next step is to reassign or terminate. */
  ended?: boolean;
  /** Date the pending action started ("01 Sep 2026"); the list shows it with the number of days. */
  pendingSince?: string;
  coordinatorInterest?: boolean;
  coordinatorReport?: boolean;
  /** Details for the Coordinator interest tab. */
  interest?: InterestInfo;
  /** Details for the Coordinator reports tab. */
  report?: ReportInfo;
  /** Terminated tab: effective termination date, date it was confirmed, Labour Office record date (empty = "Not recorded"). */
  termEffective?: string;
  termConfirmed?: string;
  labourOffice?: string;
  /** Did not start tab: date the case was closed and the start date that was expected. */
  closedOn?: string;
  expectedStart?: string;
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

// Coordinator interest (the report text on the reports tab is built from the same data, so they never differ)
const DMYTRO_INTEREST: InterestInfo = {
  coordinator: PETER, date: "01 Sep 2026", project: "Line 3 Assembly",
  reason: "Client requested a reserve candidate for the November ramp-up", next: "Confirm with client by 20 Sep",
};
const ELENA_INTEREST: InterestInfo = {
  coordinator: PETER, date: "07 Sep 2026", project: "Line 3 Assembly",
  reason: "Needs two more operators from 21 Sep", next: "Administration to confirm start date",
};
const interestReport = (i: InterestInfo): ReportInfo => ({
  kind: "Interest in available worker", from: i.coordinator, date: i.date, details: `${i.project} — ${i.reason}`,
});

const NAMED: Worker[] = [
  assigned("SM-0432", "Andrei Rusu", "Warehouse Ops"),
  assigned("SM-1136", "Andriy Georgiev", "CNC Machining Hall"),
  assigned("SM-1144", "Andriy Shevchuk", "CNC Machining Hall"),
  assigned("SM-1139", "Bohdan Georgiev", "CNC Machining Hall"),
  assigned("SM-0981", "Marko Jovanović", "Line 3 Assembly", { accommodation: "Hostel Nitra Central", docsExpired: 1 }),
  assigned("SM-1143", "Andriy Le", "Line 3 Assembly"),
  assigned("SM-1148", "Andriy Popa", "Warehouse Ops"),
  assigned("SM-1137", "Bohdan Tran", "CNC Machining Hall"),
  assigned("SM-1124", "Cristian Savchenko", "Line 3 Assembly"),
  assigned("SM-1135", "Dejan Marković", "CNC Machining Hall"),
  assigned("SM-1138", "Dragan Jovanović", "AutoParts Slovakia"),
  // AutoParts Slovakia roster (so clicking a name on the Projects page opens the right profile)
  assigned("SM-1113", "Dragan Pavlović", "AutoParts Slovakia"),
  assigned("SM-1118", "Ion Kravets", "AutoParts Slovakia"),
  assigned("SM-1114", "Ion Pavlović", "AutoParts Slovakia"),
  assigned("SM-1142", "Maksym Koval", "AutoParts Slovakia"),
  assigned("SM-1112", "Marko Nguyen", "AutoParts Slovakia"),
  assigned("SM-1111", "Nikola Nguyen", "AutoParts Slovakia"),
  assigned("SM-1115", "Tomislav Marković", "AutoParts Slovakia"),
  assigned("SM-1110", "Viorel Moldovan", "AutoParts Slovakia"),
  assigned("SM-1117", "Vlad Bratu", "AutoParts Slovakia"),
  assigned("SM-1116", "Vlad Vasilev", "AutoParts Slovakia"),
  // Other workers listed on the Projects → Daily work status page
  assigned("SM-1122", "Petar Stoyanov", "Warehouse Ops"),
  assigned("SM-1123", "Vasile Jovanović", "Warehouse Ops"),
  assigned("SM-1126", "Vasile Kravets", "Warehouse Ops"),
  assigned("SM-1121", "Vlad Moldovan", "Warehouse Ops"),
  available("SM-1154", "Andriy Ionescu", JANA, { terminating: true, pendingSince: "01 Sep 2026", termEffective: "01 Sep 2026" }),
  available("SM-1149", "Anh Popa", PETER, { project: "Line 3 Assembly", blocked: true, sp: "No evidence", pendingSince: "07 Sep 2026" }),
  available("SM-0754", "Dmytro Kovalenko", PETER, {
    sp: "Uploaded, awaiting verification", docsPending: 1, ended: true, pendingSince: "31 Aug 2026",
    coordinatorInterest: true, interest: DMYTRO_INTEREST,
    coordinatorReport: true, report: interestReport(DMYTRO_INTEREST),
  }),
  available("SM-0876", "Elena Popescu", JANA, {
    accommodation: "Villa Rezidencia Trnava", ended: true, pendingSince: "28 Aug 2026",
    coordinatorInterest: true, interest: ELENA_INTEREST,
    coordinatorReport: true, report: interestReport(ELENA_INTEREST),
  }),
  available("SM-1042", "Ivan Petrenko", JANA, { project: "AutoParts Slovakia", blocked: true, sp: "No evidence", accommodation: "Villa Rezidencia Trnava", pendingSince: "05 Sep 2026" }),
  available("SM-1150", "Nikola Ionescu", JANA, { project: "CNC Machining Hall", blocked: true, sp: "Uploaded, awaiting verification", docsPending: 1, pendingSince: "03 Sep 2026" }),
  available("SM-0947", "Petar Marković", JANA, { ended: true, pendingSince: "21 Aug 2026" }),
  available("SM-0958", "Taras Georgiev", JANA, {
    ended: true, pendingSince: "04 Sep 2026",
    coordinatorReport: true,
    report: { kind: "Expected departure", from: PETER, date: "30 Sep 2026", details: "Contract with factory ends; proposed by coordinator", departure: true },
  }),
  available("SM-1153", "Viorel Koval", JANA, { terminating: true, pendingSince: "04 Sep 2026", termEffective: "04 Sep 2026" }),
  { id: "SM-1158", name: "Dragan Savchenko", status: "In preparation", project: null, coordinator: JANA, accommodation: null, sp: "No evidence", docsMissing: 0, pendingSince: "01 Sep 2026" },
  { id: "SM-1157", name: "Minh Koval", status: "In preparation", project: null, coordinator: PETER, accommodation: null, sp: "No evidence", docsMissing: 0, pendingSince: "20 Sep 2026" },
  { id: "SM-1103", name: "Nguyen Van An", status: "In preparation", project: "Packaging Line B", intended: true, coordinator: PETER, accommodation: null, sp: "No evidence", docsMissing: 3, pendingSince: "11 Sep 2026" },
  // Terminated
  { id: "SM-1155", name: "Maksym Nguyen", status: "Terminated", project: null, coordinator: JANA, accommodation: null, sp: "Deregistered", termEffective: "28 Aug 2026", termConfirmed: "05 Sep 2026" },
  { id: "SM-0119", name: "Pavlo Shevchenko", status: "Terminated", project: null, coordinator: "—", accommodation: null, sp: "Deregistered", termEffective: "31 Jul 2026", termConfirmed: "04 Aug 2026", labourOffice: "06 Aug 2026" },
  { id: "SM-1156", name: "Viorel Dimitrov", status: "Terminated", project: null, coordinator: JANA, accommodation: "Hostel Nitra Central", sp: "Deregistered", termEffective: "03 Sep 2026", termConfirmed: "04 Sep 2026", labourOffice: "08 Sep 2026" },
  // Did not start
  { id: "SM-1159", name: "Yuriy Nguyen", status: "Did not start", project: null, coordinator: PETER, accommodation: null, sp: "No evidence", closedOn: "25 Aug 2026", expectedStart: "20 Aug 2026" },
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
    // only the four workers named above are accommodated, so the Accommodated tab shows 4
    list.push(assigned(`SM-${1170 + n}`, name, project));
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

/* ---------- Views (the "View:" dropdown above the table) ---------- */
// A view narrows the rows of whichever tab is open (the two filters combine).
const VIEWS: { key: string; label: string; match: (w: Worker) => boolean }[] = [
  { key: "all", label: "View: All workers", match: () => true },
  { key: "pending", label: "View: Pending action", match: isPending },
  {
    key: "sp",
    label: "View: Social insurance not verified",
    match: (w) => w.sp === "No evidence" || w.sp === "Uploaded, awaiting verification",
  },
  { key: "placement", label: "View: Available for placement", match: (w) => w.status === "Available" },
  { key: "termdocs", label: "View: Awaiting termination documents", match: (w) => !!w.terminating },
];

/** Resets the window and any scrolled container (the app shell may scroll inside <main>, not the window). */
const resetScroll = () => {
  window.scrollTo(0, 0);
  document.querySelectorAll<HTMLElement>("*").forEach((el) => { if (el.scrollTop > 0) el.scrollTop = 0; });
};

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
  accommodationStart?: string;
  /** Confirmation file of the Labour Office record (set by the "Record Labour Office notification" dialog). */
  labourFile?: string;
  /** Set when an assignment was ended: the day the worker became Available again ("09 Sep 2026"). */
  pendingSince?: string;
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
  "SM-1153": {
    dob: "14 Sep 2000", nationality: "Vietnam", role: "Assembler", telephone: "+421 900 305 552",
    country: "Vietnam", empStart: "01 Oct 2024",
  },
  // Accommodated workers: stay start dates shown on the Accommodated tab (and the worker's Accommodation tab)
  "SM-0876": { accommodationStart: "15 Mar 2025" },
  "SM-1042": {
    dob: "14 Mar 1991", nationality: "Ukraine", role: "Production Operator", telephone: "+421 900 111 001",
    country: "Ukraine", empStart: "03 Feb 2025", accommodationStart: "03 Feb 2025",
  },
  "SM-0981": { empStart: "05 Mar 2022", assignStart: "05 Mar 2022", accommodationStart: "15 Jan 2025" },
  "SM-1156": { accommodationStart: "15 Feb 2024" },
  // Did not start
  "SM-1159": { workStart: "20 Aug 2026" },
  // AutoParts Slovakia roster (matches Projects → project detail → Workers)
  "SM-1113": {
    role: "Machine Operator", nationality: "Bulgaria", country: "Bulgaria",
    empStart: "21 Jul 2024", assignStart: "21 Jul 2024",
  },
  "SM-1118": { role: "Machine Operator", empStart: "18 Sep 2025", assignStart: "18 Sep 2025" },
  "SM-1114": { role: "Packer", empStart: "17 Mar 2025", assignStart: "17 Mar 2025" },
  "SM-1142": { role: "Packer", empStart: "03 Aug 2026", assignStart: "03 Aug 2026" },
  "SM-1112": { role: "Production Operator", empStart: "14 Jul 2025", assignStart: "14 Jul 2025" },
  "SM-1111": { role: "Machine Operator", empStart: "12 Feb 2024", assignStart: "12 Feb 2024" },
  "SM-1115": { role: "Production Operator", empStart: "20 Jun 2025", assignStart: "20 Jun 2025" },
  "SM-1110": { role: "Packer", empStart: "19 Mar 2024", assignStart: "19 Mar 2024" },
  "SM-1117": { role: "Assembler", empStart: "22 Sep 2024", assignStart: "22 Sep 2024" },
  "SM-1116": { role: "Forklift Operator", empStart: "14 Jun 2024", assignStart: "14 Jun 2024" },
  // Other workers from Projects → Daily work status
  "SM-1122": { role: "Forklift Operator" },
  "SM-1123": { role: "Forklift Operator" },
  "SM-1126": { role: "Packer" },
  "SM-1121": { role: "Machine Operator" },
  // Assignment start dates shown on the list (Assigned tab)
  "SM-1136": { empStart: "10 Apr 2025", assignStart: "10 Apr 2025" },
  "SM-1143": { empStart: "10 Aug 2026", assignStart: "10 Aug 2026" },
  "SM-1148": { empStart: "01 Sep 2026", assignStart: "01 Sep 2026" },
  "SM-1144": { empStart: "17 Aug 2026", assignStart: "17 Aug 2026" },
  // Planned dates shown on the list (In preparation tab)
  "SM-1158": { arrival: "30 Aug 2026", workStart: "01 Sep 2026" },
  "SM-1157": { arrival: "20 Sep 2026", workStart: "24 Sep 2026" },
  "SM-1103": { arrival: "11 Sep 2026", workStart: "15 Sep 2026" },
};

const ROLES = ["Warehouse Associate", "Forklift Operator", "CNC Operator", "Line Assembler", "Packer", "Quality Inspector"];
const COUNTRIES = ["Moldova", "Ukraine", "Serbia", "Romania", "Vietnam", "Georgia"];
const START_DATES = ["12 Feb 2024", "19 Mar 2024", "14 Jun 2024", "22 Sep 2024", "17 Mar 2025", "20 Jul 2025", "18 Sep 2025", "02 Sep 2026"];

// Stable pick based on the worker ID, so the same worker always gets the same values
const pick = <T,>(list: T[], id: string, salt = 0): T => {
  const n = id.split("").reduce((a, c) => a + c.charCodeAt(0), salt);
  return list[n % list.length];
};

const detailFor = (w: Worker): WorkerDetailInfo => {
  const missing = w.docsMissing ?? 0;
  // assigned workers without a recorded date get a stable sample start date
  const startFallback = w.status === "Assigned to a project" ? pick(START_DATES, w.id) : "—";
  const base: WorkerDetailInfo = {
    dob: "—", nationality: pick(COUNTRIES, w.id, 7), role: pick(ROLES, w.id), telephone: "—", email: "—", address: "—",
    country: pick(COUNTRIES, w.id, 7), prepStage: w.status === "In preparation" ? "In progress" : "Complete", arrival: "—", workStart: "—",
    empStart: startFallback, employer: "Staffmate s.r.o.", spFrom: "—", deregFrom: w.status === "Terminated" ? (w.termEffective ?? "—") : "—", verifiedBy: "—",
    spFile: w.sp === "Registered" || w.sp === "Deregistered" ? "sp_confirmation.pdf" : "—",
    createdOn: "—", createdBy: w.coordinator, assignStart: startFallback,
    docs: DOC_TEMPLATE.map((d, i) => (i < missing ? { ...d, files: [], verified: false } : { ...d, verified: true })),
  };
  return { ...base, ...(DETAIL_OVERRIDES[w.id] ?? {}) };
};

/* ---------- Pending action (status card on the detail page) ---------- */
const daysSince = (iso: string) => Math.round((Date.parse(AS_OF) - Date.parse(iso)) / 86400000);

const pendingLabel = (w: Worker): string =>
  w.terminating ? "Awaiting termination documentation" : w.status === "Did not start" ? "Did-not-start check" : w.status;
/** `ended` = the worker's assignment was just ended, so the next step is to reassign or terminate. */
const pendingHint = (w: Worker, ended = false): string | null =>
  w.terminating ? "Upload and verify the Social Insurance deregistration document."
  : w.status === "Available"
    ? (ended
        ? "Reassign to a project, or begin termination."
        : w.sp !== "Registered" ? "Verify Social Insurance evidence to activate the assignment." : "Assign the worker to a project.")
    : w.status === "In preparation" ? "Complete the preparation checklist and required documents."
    : w.status === "Did not start" ? "Complete the did-not-start check."
    : null;

const SP_TONE: Record<SpState, string> = {
  Registered: "ok", "No evidence": "bad", "Uploaded, awaiting verification": "warn", Deregistered: "muted",
};

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

  return createPortal(
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

        <button type="button" className="sm-btn sm-btn-primary tm-submit"  onClick={() => onConfirm(date, reason)}>
          Begin termination
        </button>
      </div>
    </div>,
    document.body,
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

interface ProfilePatch {
  name: string;
  coordinator: string;
  sp?: SpState;
  project?: string | null;
  accommodation?: string | null;
  status?: WorkerStatus;
  terminating?: boolean;
  ended?: boolean;
  pendingSince?: string;
  termEffective?: string;
  termConfirmed?: string;
  labourOffice?: string;
}

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

  return createPortal(
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
    </div>,
    document.body,
  );
}


/* ---------- Update Social Insurance record dialog ---------- */
function UpdateSPRecordModal({
  worker,
  details,
  onClose,
  onSave,
}: {
  worker: Worker;
  details: WorkerDetailInfo;
  onClose: () => void;
  onSave: (patch: ProfilePatch, extra: Partial<WorkerDetailInfo>) => void;
}): React.JSX.Element {
  const [employer, setEmployer] = useState(details.employer === "—" ? "Staffmate s.r.o." : details.employer);
  const [effectiveFrom, setEffectiveFrom] = useState(dispToIso(details.spFrom));
  const [deregistration, setDeregistration] = useState(dispToIso(details.deregFrom));
  const [evidence, setEvidence] = useState<File | null>(null);
  const [verified, setVerified] = useState(worker.sp === "Registered" || worker.sp === "Deregistered");

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  const save = () => {
    const fileName = evidence?.name || details.spFile;
    const hasEvidence = fileName !== "—" && fileName.trim() !== "";
    const deregistered = !!deregistration && deregistration <= AS_OF;
    const effectiveNow = !!effectiveFrom && effectiveFrom <= AS_OF;

    let nextSp: SpState;
    if (!hasEvidence) nextSp = "No evidence";
    else if (deregistered) nextSp = "Deregistered";
    else if (verified && effectiveNow) nextSp = "Registered";
    else nextSp = "Uploaded, awaiting verification";

    onSave(
      { name: worker.name, coordinator: worker.coordinator, sp: nextSp },
      {
        employer: employer.trim() || "—",
        spFrom: effectiveFrom ? isoToDisp(effectiveFrom) : "—",
        deregFrom: deregistration ? isoToDisp(deregistration) : "—",
        spFile: fileName,
        verifiedBy: hasEvidence && verified ? (details.verifiedBy !== "—" ? details.verifiedBy : "Verified") : "—",
      },
    );
    onClose();
  };

  return createPortal(
    <div
      className="sp-modal-overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="sp-modal" role="dialog" aria-modal="true" aria-labelledby="sp-modal-title">
        <div className="sp-modal-header">
          <h2 id="sp-modal-title">Update SP Record</h2>
          <button type="button" className="sp-modal-close" onClick={onClose} aria-label="Close">
            <X size={19} />
          </button>
        </div>

        <div className="sp-modal-body">
          <div className="sp-form-grid">
            <label className="sp-field">
              <span>Employing Entity</span>
              <input
                type="text"
                value={employer}
                onChange={(event) => setEmployer(event.target.value)}
              />
            </label>

            <label className="sp-field">
              <span>Registration Effective From</span>
              <input
                type="date"
                value={effectiveFrom}
                onChange={(event) => setEffectiveFrom(event.target.value)}
              />
            </label>

            <label className="sp-field">
              <span>Deregistration Effective From (if applicable)</span>
              <input
                type="date"
                value={deregistration}
                onChange={(event) => setDeregistration(event.target.value)}
              />
            </label>
          </div>

          <label className="sp-field sp-evidence">
            <span>Supporting Evidence</span>
            <input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={(event) => setEvidence(event.target.files?.[0] ?? null)}
            />
            <small>Current evidence on file: {evidence?.name || details.spFile}</small>
          </label>

          <label className="sp-verify">
            <input
              type="checkbox"
              checked={verified}
              onChange={(event) => setVerified(event.target.checked)}
            />
            <span>
              I confirm this evidence has been reviewed and is valid (verification — authorised users only)
            </span>
          </label>

          <p className="sp-help-text">
            The SP badge is not set directly — it is derived from these facts: no evidence on file shows red
            (Not Registered); evidence without verification shows amber (Pending Verification); verified evidence
            effective on or before today shows green (Registered); a verified but future-effective date stays amber
            until that date arrives; a deregistration date on or before today shows grey (Deregistered).
          </p>
        </div>

        <div className="sp-modal-footer">
          <button type="button" className="sp-save-btn" onClick={save}>Save SP Record</button>
        </div>
      </div>
    </div>,
    document.body,
  );
}


/* ---------- Accommodation check-in dialog ---------- */
const CHECK_IN_FACILITIES = [
  { name: "Villa Rezidencia Trnava", available: 38 },
  { name: "Hostel Nitra Central", available: 26 },
];

function CheckInDialog({
  worker,
  onClose,
  onConfirm,
}: {
  worker: Worker;
  onClose: () => void;
  onConfirm: (facility: string, date: string) => void;
}): React.JSX.Element {
  const [facility, setFacility] = useState(
    worker.accommodation && CHECK_IN_FACILITIES.some((f) => f.name === worker.accommodation)
      ? worker.accommodation
      : CHECK_IN_FACILITIES[0].name,
  );
  const [date, setDate] = useState(AS_OF);

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  const selectedFacility = CHECK_IN_FACILITIES.find((item) => item.name === facility);
  const canCheckIn = !!facility && !!date && !!selectedFacility && selectedFacility.available > 0;

  return createPortal(
    <div
      className="ci-overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="ci-modal" role="dialog" aria-modal="true" aria-labelledby="ci-title">
        <div className="ci-header">
          <h2 id="ci-title">Check in {worker.name}</h2>
          <button type="button" className="ci-close" onClick={onClose} aria-label="Close">
            <X size={19} />
          </button>
        </div>

        <div className="ci-body">
          <label className="ci-field ci-facility">
            <span>Facility <b>*</b></span>
            <span className="ci-select">
              <select value={facility} onChange={(event) => setFacility(event.target.value)} required>
                {CHECK_IN_FACILITIES.map((item) => (
                  <option key={item.name} value={item.name} disabled={item.available <= 0}>
                    {item.name} ({item.available} available)
                  </option>
                ))}
              </select>
              <ChevronDown size={17} />
            </span>
          </label>

          <label className="ci-field ci-date">
            <span>Actual Check-in Date</span>
            <input
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              required
            />
          </label>

          <p className="ci-note">
            Occupancy is calculated from actual check-ins, not planned arrivals — this stay counts against
            capacity immediately. A facility at full capacity cannot be selected.
          </p>

          <button
            type="button"
            className="ci-submit"
            disabled={!canCheckIn}
            onClick={() => onConfirm(facility, date)}
          >
            Check In
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

/* ---------- Transfer facility dialog (worker is already accommodated) ---------- */
function TransferFacilityDialog({ worker, onClose, onConfirm }: {
  worker: Worker;
  onClose: () => void;
  onConfirm: (facility: string, dateIso: string) => void;
}): React.JSX.Element {
  // the worker's current facility is not offered as a target
  const options = CHECK_IN_FACILITIES.filter((f) => f.name !== worker.accommodation);
  const [facility, setFacility] = useState(options.find((f) => f.available > 0)?.name ?? options[0]?.name ?? "");
  const [date, setDate] = useState(AS_OF);

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  const selected = options.find((f) => f.name === facility);
  const canTransfer = !!selected && selected.available > 0 && !!date;

  return createPortal(
    <div
      className="ci-overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="ci-modal ci-transfer" role="dialog" aria-modal="true" aria-labelledby="tf-title">
        <div className="ci-header">
          <h2 id="tf-title">Transfer {worker.name} to another facility</h2>
          <button type="button" className="ci-close" onClick={onClose} aria-label="Close">
            <X size={19} />
          </button>
        </div>

        <div className="ci-body">
          <label className="ci-field ci-facility">
            <span>Facility <b>*</b></span>
            <span className="ci-select">
              <select value={facility} onChange={(event) => setFacility(event.target.value)} required>
                {options.map((item) => (
                  <option key={item.name} value={item.name} disabled={item.available <= 0}>
                    {item.name} ({item.available} available)
                  </option>
                ))}
              </select>
              <ChevronDown size={17} />
            </span>
          </label>

          <label className="ci-field ci-date">
            <span>Actual Check-in Date</span>
            <input
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              required
            />
          </label>

          <p className="ci-note">
            Occupancy is calculated from actual check-ins, not planned arrivals — this stay counts against
            capacity immediately. A facility at full capacity cannot be selected.
          </p>

          <button
            type="button"
            className="ci-submit"
            disabled={!canTransfer}
            onClick={() => onConfirm(facility, date)}
          >
            Transfer
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

/* ---------- Transfer to another project dialog ---------- */
const TRANSFER_PROJECTS = ["AutoParts Slovakia", "CNC Machining Hall", "Line 3 Assembly", "Warehouse Ops"];

function TransferDialog({ worker, role: currentRole, onClose, onConfirm }: {
  worker: Worker;
  role: string;
  onClose: () => void;
  onConfirm: (project: string, role: string, startIso: string) => void;
}): React.JSX.Element {
  const options = TRANSFER_PROJECTS.filter((p) => p !== worker.project);
  const [project, setProject] = useState(options[0] ?? "");
  const [role, setRole] = useState(currentRole === "—" ? "" : currentRole);
  const [start, setStart] = useState(AS_OF);

  // Esc closes the dialog
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return createPortal(
    <div className="tm-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="tm-dialog tr-dialog" role="dialog" aria-modal="true" aria-labelledby="tr-title">
        <div className="tm-head">
          <h2 id="tr-title">Transfer {worker.name} to another project</h2>
          <button type="button" className="tm-close" aria-label="Close" onClick={onClose}><X size={18} /></button>
        </div>

        <div className="tm-grid">
          <label className="tm-field tm-wide">
            <span>Project <b>*</b></span>
            <span className="tm-select">
              <select value={project} onChange={(e) => setProject(e.target.value)}>
                {options.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
              <ChevronDown size={16} />
            </span>
          </label>

          <label className="tm-field">
            <span>Role</span>
            <input value={role} onChange={(e) => setRole(e.target.value)} />
          </label>
          <label className="tm-field">
            <span>Start Date</span>
            <input type="date" value={start} onChange={(e) => setStart(e.target.value)} />
          </label>
        </div>

        <button
          type="button"
          className="sm-btn sm-btn-primary tm-submit"
          disabled={!project || !start}
          onClick={() => onConfirm(project, role.trim() || "—", start)}
        >
          Transfer
        </button>
      </div>
    </div>,
    document.body,
  );
}

/* ---------- Assign to a project dialog (shown after an assignment was ended) ---------- */
function AssignDialog({ worker, role: currentRole, onClose, onConfirm }: {
  worker: Worker;
  role: string;
  onClose: () => void;
  onConfirm: (project: string, role: string, startIso: string) => void;
}): React.JSX.Element {
  const [project, setProject] = useState(TRANSFER_PROJECTS[0]);
  const [role, setRole] = useState(currentRole === "—" ? "" : currentRole);
  const [start, setStart] = useState(AS_OF);

  // Esc closes the dialog
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return createPortal(
    <div className="tm-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="tm-dialog tr-dialog" role="dialog" aria-modal="true" aria-labelledby="as-title">
        <div className="tm-head">
          <h2 id="as-title">Assign {worker.name} to a project</h2>
          <button type="button" className="tm-close" aria-label="Close" onClick={onClose}><X size={18} /></button>
        </div>

        <div className="tm-grid">
          <label className="tm-field tm-wide">
            <span>Project <b>*</b></span>
            <span className="tm-select">
              <select value={project} onChange={(e) => setProject(e.target.value)}>
                {TRANSFER_PROJECTS.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
              <ChevronDown size={16} />
            </span>
          </label>

          <label className="tm-field">
            <span>Role</span>
            <input value={role} onChange={(e) => setRole(e.target.value)} />
          </label>
          <label className="tm-field">
            <span>Start Date</span>
            <input type="date" value={start} onChange={(e) => setStart(e.target.value)} />
          </label>
        </div>

        <button
          type="button"
          className="sm-btn sm-btn-primary tm-submit"
          disabled={!project || !start}
          onClick={() => onConfirm(project, role.trim() || "—", start)}
        >
          Assign
        </button>
      </div>
    </div>,
    document.body,
  );
}

/* ---------- Record Labour Office notification dialog ---------- */
function LabourOfficeDialog({ worker, onClose, onSave }: {
  worker: Worker;
  onClose: () => void;
  onSave: (dateIso: string, file: string) => void;
}): React.JSX.Element {
  const [date, setDate] = useState(AS_OF);
  const [file, setFile] = useState("labour_office_notice.pdf");

  // Esc closes the dialog
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return createPortal(
    <div className="tm-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="tm-dialog tr-dialog" role="dialog" aria-modal="true" aria-labelledby="lo-title">
        <div className="tm-head">
          <h2 id="lo-title">{worker.name}</h2>
          <button type="button" className="tm-close" aria-label="Close" onClick={onClose}><X size={18} /></button>
        </div>

        <div className="tm-grid">
          <label className="tm-field">
            <span>Date notified <b>*</b></span>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
          </label>
          <label className="tm-field">
            <span>Confirmation file</span>
            <input value={file} onChange={(e) => setFile(e.target.value)} />
          </label>
        </div>

        <p className="tm-note">A record only — it does not change the worker status.</p>

        <button type="button" className="sm-btn sm-btn-primary tm-submit" disabled={!date} onClick={() => onSave(date, file)}>
          Save record
        </button>
      </div>
    </div>,
    document.body,
  );
}

/* ---------- Tasks & Notes (worker profile tab) ---------- */
type TaskStatus = "Open" | "In Progress" | "Done";
interface TaskComment { author: string; text: string }
interface WorkerTask {
  id: string;
  title: string;
  description: string;
  assignee: string;
  creator: string;
  due: string;
  priority: "Low" | "Medium" | "High";
  status: TaskStatus;
  comments: TaskComment[];
}

const TASK_STATUSES: TaskStatus[] = ["Open", "In Progress", "Done"];
const TASK_TONE: Record<TaskStatus, string> = { Open: "muted", "In Progress": "info", Done: "ok" };
const CURRENT_USER = "Marek Máhr"; // "Viewing as" user, author of new comments

// Tasks linked to a worker (the list shows "<title> — <worker name>")
const TASKS_BY_WORKER: Record<string, WorkerTask[]> = {
  "SM-0981": [
    {
      id: "T-TRC-0981",
      title: "Confirm TRC renewal",
      description: "Follow up with Marko on the renewal appointment and get the updated TRC uploaded.",
      assignee: "Marek Máhr",
      creator: PETER,
      due: "10 Sep 2026",
      priority: "Medium",
      status: "In Progress",
      comments: [],
    },
  ],
};

function TaskDialog({ task, worker, onClose, onStatus, onComment }: {
  task: WorkerTask;
  worker: Worker;
  onClose: () => void;
  onStatus: (status: TaskStatus) => void;
  onComment: (text: string) => void;
}): React.JSX.Element {
  const [draft, setDraft] = useState("");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  const post = () => {
    const text = draft.trim();
    if (!text) return;
    onComment(text);
    setDraft("");
  };

  return createPortal(
    <div className="tk-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="tk-modal" role="dialog" aria-modal="true" aria-labelledby="tk-title">
        <div className="tk-head">
          <h2 id="tk-title">{task.title}</h2>
          <button type="button" className="tk-close" aria-label="Close" onClick={onClose}><X size={20} /></button>
        </div>

        <dl className="tk-kv">
          <dt>Description</dt><dd>{task.description}</dd>
          <dt>Linked</dt><dd>{worker.name}</dd>
          <dt>Assignee</dt><dd>{task.assignee}</dd>
          <dt>Creator</dt><dd>{task.creator}</dd>
          <dt>Due Date</dt><dd>{task.due}</dd>
          <dt>Priority</dt><dd>{task.priority}</dd>
        </dl>

        <label className="tk-label" htmlFor="tk-status">Status</label>
        <span className="tk-select">
          <select id="tk-status" value={task.status} onChange={(e) => onStatus(e.target.value as TaskStatus)}>
            {TASK_STATUSES.map((st) => <option key={st} value={st}>{st}</option>)}
          </select>
          <ChevronDown size={18} />
        </span>

        <h3 className="tk-sub">Comments</h3>
        {task.comments.length === 0 ? (
          <p className="tk-muted">No comments yet.</p>
        ) : (
          <ul className="tk-comments">
            {task.comments.map((c, i) => (
              <li key={i}><strong>{c.author}</strong><span>{c.text}</span></li>
            ))}
          </ul>
        )}

        <div className="tk-compose">
          <input
            value={draft}
            placeholder="Add a comment..."
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") post(); }}
          />
          <button type="button" onClick={post} disabled={!draft.trim()}>Post</button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function WorkerDetail({ worker, extra, startWithTermination = false, onBack, onSave }: {
  worker: Worker;
  extra?: Partial<WorkerDetailInfo>;
  /** Open the Begin termination dialog right away (used by the Begin termination button on the reports tab). */
  startWithTermination?: boolean;
  onBack: () => void;
  onSave: (patch: ProfilePatch, extra: Partial<WorkerDetailInfo>) => void;
}): React.JSX.Element {
  const d = useMemo(() => ({ ...detailFor(worker), ...(extra ?? {}) }), [worker, extra]);
  const [tab, setTab] = useState<DetailTab>("Personal");
  const [docs, setDocs] = useState<DocItem[]>(d.docs);
  const fileRef = useRef<HTMLInputElement>(null);
  const [termOpen, setTermOpen] = useState(startWithTermination && !worker.terminating);
  const [termNote, setTermNote] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [spOpen, setSpOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [checkInOpen, setCheckInOpen] = useState(false);
  const [transferFacOpen, setTransferFacOpen] = useState(false); // "Transfer Facility" dialog
  const [labourOpen, setLabourOpen] = useState(false); // "Record Labour Office notification" dialog
  const [deregFile, setDeregFile] = useState<string | null>(null); // set once the deregistration document is uploaded
  const [tasks, setTasks] = useState<WorkerTask[]>(() => TASKS_BY_WORKER[worker.id] ?? []);
  const [openTaskId, setOpenTaskId] = useState<string | null>(null);
  const openTask = tasks.find((t) => t.id === openTaskId);
  const patchTask = (id: string, patch: (t: WorkerTask) => WorkerTask) =>
    setTasks((list) => list.map((t) => (t.id === id ? patch(t) : t)));

  // Upload the deregistration document (prototype: simulated upload), then wait for verification
  const uploadDeregistration = () => {
    setDeregFile("sp_deregistration.pdf");
  };

  // Verify the document: the worker becomes Terminated and the SP record is deregistered.
  // Then the "Record Labour Office notification" dialog opens straight away.
  const completeTermination = () => {
    onSave(
      {
        name: worker.name,
        coordinator: worker.coordinator,
        status: "Terminated",
        sp: "Deregistered",
        project: null,
        terminating: false,
        ended: false,
        pendingSince: undefined,
        termConfirmed: isoToDisp(AS_OF),
      },
      {
        pendingSince: undefined,
        spFile: deregFile ?? "sp_deregistration.pdf",
      },
    );
    setDeregFile(null);
    setTermNote(`Termination completed for ${worker.name} (${worker.id}). The deregistration document was verified and the status is now Terminated.`);
    setLabourOpen(true);
  };

  // Check Out ends the stay straight away (no dialog): the worker becomes "not accommodated",
  // so the Accommodation tab shows the Check In button again. Status, project and SP are untouched.
  const checkOut = () => {
    const facility = worker.accommodation;
    onSave(
      { name: worker.name, coordinator: worker.coordinator, accommodation: null },
      { accommodationStart: undefined },
    );
    setTermNote(`${worker.name} (${worker.id}) checked out of ${facility} on ${isoToDisp(AS_OF)}.`);
  };

  // The "Record Labour Office notification" button opens the dialog
  const recordLabourOffice = () => setLabourOpen(true);

  // Save the Labour Office record (a record only — the worker status does not change)
  const saveLabourOffice = (dateIso: string, file: string) => {
    const recordedDate = isoToDisp(dateIso);
    onSave(
      { name: worker.name, coordinator: worker.coordinator, labourOffice: recordedDate },
      { labourFile: file.trim() || "—" },
    );
    setLabourOpen(false);
    setTermNote(`Labour Office notification recorded for ${worker.name} (${worker.id}) on ${recordedDate}.`);
  };

  // Open at the top (the app shell may have been scrolled down on the list / Projects page)
  useEffect(() => {
    resetScroll();
    const t = setTimeout(resetScroll, 0);
    const raf = requestAnimationFrame(() => requestAnimationFrame(resetScroll));
    return () => { clearTimeout(t); cancelAnimationFrame(raf); };
  }, [worker.id]);

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

  // End the current assignment: the worker becomes Available again and waits for a new project (or termination).
  const endAssignment = () => {
    const endedOn = isoToDisp(AS_OF);
    onSave(
      { name: worker.name, coordinator: worker.coordinator, project: null, status: "Available", ended: true, pendingSince: endedOn },
      { pendingSince: endedOn },
    );
    setTermNote(
      `Assignment ended for ${worker.name} (${worker.id}) on ${endedOn}${worker.project ? ` — ${worker.project}` : ""}. The worker is now Available; assign a new project or begin termination.`,
    );
  };

  // The worker just came off a project (set by End Assignment)
  const ended = !!(d.pendingSince || worker.ended);
  const hint = pendingHint(worker, ended);
  const sinceLabel = d.pendingSince ?? worker.pendingSince ?? d.empStart;
  const sinceIso = dispToIso(sinceLabel);
  const pendingDays = sinceIso ? daysSince(sinceIso) : null;
  const sinceText =
    pendingDays === null ? "" : pendingDays <= 0 ? ` Since ${sinceLabel}.` : ` Since ${sinceLabel} · ${pendingDays} days.`;

  return (
    <div className="wk-enter">
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

      <section className="sm-card wd-head">
        <div className="wd-avatar">{initials}</div>
        <div className="wd-who">
          <h1>{worker.name} <span>· {worker.id}</span></h1>
          {subtitle && <p>{subtitle}</p>}
        </div>
        <div className="wd-head-btns">
          {!worker.terminating && (
          <button type="button" className="sm-btn sm-btn-outline" onClick={() => setTermOpen(true)}>
            <img
              src="/images/termination.svg"
              alt=""
              aria-hidden="true"
              width={16}
              height={16}
              style={{ display: "block", flex: "none" }}
            />{" "}
            Begin termination
          </button>
          )}
          <button type="button" className="sm-btn sm-btn-outline" onClick={() => setEditOpen(true)}>
            <img
              src="/images/edit.svg"
              alt=""
              aria-hidden="true"
              width={16}
              height={16}
              style={{ display: "block", flex: "none" }}
            />{" "}
            Edit Profile
          </button>
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
            {worker.docsMissing
              ? <WPill tone="bad">{worker.docsMissing} missing</WPill>
              : worker.docsExpired
                ? <WPill tone="bad">{worker.docsExpired} expired</WPill>
                : worker.docsPending
                  ? <WPill tone="warn">{worker.docsPending} pending</WPill>
                  : <WPill tone="ok">Complete</WPill>}
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

      {/* Keep this section visible after termination so the Labour Office step is available. */}
      {(hint || worker.terminating || worker.status === "Terminated") && (
        <section className="sm-card wd-status">
          <h3 className="wd-status-title">
            <img src="/images/worker_status.svg" alt="" className="wd-status-icon" />
            Worker status and pending action
          </h3>
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
            <div className={`wd-pending${worker.terminating ? " is-danger" : ""}`}>
              <img
                src="/images/pending_actions.svg"
                alt=""
                aria-hidden="true"
                width={16}
                height={16}
                style={{ display: "block", flex: "none" }}
              />
              <span>
                <b>Pending action: {pendingLabel(worker)}</b> — {hint}
                {sinceText}
              </span>
            </div>
          )}

          {(worker.terminating || worker.status === "Terminated") && (
            <div className="wd-term">
              <h4>Termination</h4>
              {kv([
                ["Effective date", worker.termEffective ?? "—"],
                ["Deregistration document", worker.status === "Terminated" ? (
                  <span key="verified">
                    <WPill tone="ok">Verified by Marek Máhr on {worker.termConfirmed ?? isoToDisp(AS_OF)}</WPill>
                    <span className="wd-dereg-file">· {d.spFile && d.spFile !== "—" ? d.spFile : "sp_deregistration.pdf"}</span>
                  </span>
                ) : deregFile ? (
                  <span key="uploaded">
                    <WPill tone="warn">Uploaded — awaiting verification</WPill>
                    <span className="wd-dereg-file">· {deregFile}</span>
                  </span>
                ) : (
                  <WPill key="missing" tone="bad">Deregistration document missing</WPill>
                )],
                ["Labour Office record", worker.labourOffice ? (
                  <span key="recorded">
                    <WPill tone="ok">Recorded on {worker.labourOffice}</WPill>
                    {d.labourFile && d.labourFile !== "—" && <span className="wd-dereg-file">· {d.labourFile}</span>}
                  </span>
                ) : (
                  <span key="not-recorded" className="wd-muted">Not recorded</span>
                )],
                ["Accommodation", worker.accommodation ?? "Not accommodated"],
              ])}

              {worker.terminating && (deregFile ? (
                <button type="button" className="sm-btn sm-btn-primary" onClick={completeTermination}>
                  <img src="/images/verifying_complete.svg" alt="" width={16} height={16} aria-hidden="true" />
                  Verify and complete termination
                </button>
              ) : (
                <button type="button" className="sm-btn sm-btn-outline" onClick={uploadDeregistration}>
                  <img src="/images/upload_deregistration.svg" alt="" className="sm-btn-icon" width={16} height={16} />
                  Upload deregistration document
                </button>
              ))}

              {worker.status === "Terminated" && !worker.labourOffice && (
                <button type="button" className="sm-btn sm-btn-outline wd-labour-btn" onClick={recordLabourOffice}>
                  <img src="/images/record_labour.svg" alt="" width={16} height={16} aria-hidden="true" />
                  Record Labour Office notification
                </button>
              )}

              {worker.status === "Terminated" && worker.labourOffice && (
                <WPill tone="ok">Labour Office notification recorded on {worker.labourOffice}</WPill>
              )}
            </div>
          )}
        </section>
      )}

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
                ) : worker.sp === "Deregistered" ? (
                  <tr><td>{d.spFrom}</td><td>{d.deregFrom}</td><td>Deregistered</td></tr>
                ) : (
                  <tr><td colSpan={3} className="wd-muted">No registration periods yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <button
            type="button"
            className="sm-btn sm-btn-outline wd-btn"
            onClick={() => setSpOpen(true)}
          >
            <img
              src="/images/verified.svg"
              alt=""
              className="wd-verified-icon"
              width={16}
              height={16}
            />
            Update SP Record
          </button>
        </section>
      )}

      {tab === "Assignments" && (
        <section className="sm-card wd-panel">
          <div className="wd-panel-head">
            <h3>Current &amp; Planned Assignment</h3>
            {worker.project ? (
              <div className="wd-head-btns">
                <button type="button" className="sm-btn sm-btn-outline" onClick={() => setTransferOpen(true)}>
                  <img
                    src="/images/transfer_assignment.svg"
                    alt=""
                    aria-hidden="true"
                    width={16}
                    height={16}
                    style={{ display: "block", flex: "none" }}
                  />{" "}
                  Transfer
                </button>
                <button type="button" className="sm-btn sm-btn-outline" onClick={endAssignment}>
                  <img
                    src="/images/end.svg"
                    alt=""
                    aria-hidden="true"
                    width={16}
                    height={16}
                    style={{ display: "block", flex: "none" }}
                  />{" "}
                  End Assignment
                </button>
              </div>
            ) : (
              worker.status !== "Terminated" && worker.status !== "Did not start" && (
                <button
                  type="button"
                  className="sm-btn sm-btn-outline"
                  onClick={() => setAssignOpen(true)}
                >
                  <img src="/images/assign.svg" alt="" className="wd-assign-icon" width={16} height={16} />
                  Assign to Project
                </button>
              )
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
                  <tr><td colSpan={6} className="wd-muted">No current assignment</td></tr>
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
            {worker.accommodation ? (
              <div className="wd-head-btns">
                <button type="button" className="sm-btn sm-btn-outline" onClick={() => setTransferFacOpen(true)}>
                  <ArrowRightLeft size={16} /> Transfer Facility
                </button>
                <button type="button" className="sm-btn sm-btn-outline" onClick={checkOut}>
                  <LogOut size={16} /> Check Out
                </button>
              </div>
            ) : (
              <button type="button" className="sm-btn sm-btn-outline" onClick={() => setCheckInOpen(true)}>
                <LogIn size={16} /> Check In
              </button>
            )}
          </div>
          <div className="sm-table-wrap">
            <table className="sm-table wd-table">
              <thead><tr><th>Facility</th><th>Stay Start</th><th>Planned/Actual End</th><th>Related Project</th></tr></thead>
              <tbody>
                {worker.accommodation ? (
                  <tr>
                    <td><strong>{worker.accommodation}</strong></td>
                    <td>{d.accommodationStart ?? "—"}</td>
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
        tasks.length === 0 ? (
          <section className="sm-card wd-panel"><p className="wd-empty">No tasks linked to this worker.</p></section>
        ) : (
          <section className="sm-card wd-tasks">
            {tasks.map((t) => (
              <button key={t.id} type="button" className="wd-task" onClick={() => setOpenTaskId(t.id)}>
                <span className="wd-task-main">
                  <strong>{t.title} — {worker.name}</strong>
                  <span>Due {t.due} · {t.priority} priority · Assignee: {t.assignee}</span>
                </span>
                <WPill tone={TASK_TONE[t.status]}>{t.status}</WPill>
              </button>
            ))}
          </section>
        )
      )}

      {tab === "History" && (
        <section className="sm-card wd-panel">
          <div className="wd-event">
            <strong>Profile created</strong>
            <span>{d.createdOn} · by {d.createdBy}</span>
          </div>
        </section>
      )}

      {openTask && (
        <TaskDialog
          task={openTask}
          worker={worker}
          onClose={() => setOpenTaskId(null)}
          onStatus={(status) => patchTask(openTask.id, (t) => ({ ...t, status }))}
          onComment={(text) => patchTask(openTask.id, (t) => ({ ...t, comments: [...t.comments, { author: CURRENT_USER, text }] }))}
        />
      )}

      {checkInOpen && (
        <CheckInDialog
          worker={worker}
          onClose={() => setCheckInOpen(false)}
          onConfirm={(facility, date) => {
            onSave(
              {
                name: worker.name,
                coordinator: worker.coordinator,
                accommodation: facility,
              },
              { accommodationStart: isoToDisp(date) },
            );
            setCheckInOpen(false);
            setTermNote(`${worker.name} checked in at ${facility} on ${isoToDisp(date)}.`);
          }}
        />
      )}

      {transferFacOpen && (
        <TransferFacilityDialog
          worker={worker}
          onClose={() => setTransferFacOpen(false)}
          onConfirm={(facility, dateIso) => {
            onSave(
              { name: worker.name, coordinator: worker.coordinator, accommodation: facility },
              { accommodationStart: isoToDisp(dateIso) },
            );
            setTransferFacOpen(false);
            setTermNote(`${worker.name} (${worker.id}) transferred from ${worker.accommodation} to ${facility} on ${isoToDisp(dateIso)}.`);
          }}
        />
      )}

      {spOpen && (
        <UpdateSPRecordModal
          worker={worker}
          details={d}
          onClose={() => setSpOpen(false)}
          onSave={(patch, ex) => {
            onSave(patch, ex);
            setTermNote("SP record updated successfully.");
          }}
        />
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

      {transferOpen && (
        <TransferDialog
          worker={worker}
          role={d.role}
          onClose={() => setTransferOpen(false)}
          onConfirm={(project, role, startIso) => {
            onSave(
              { name: worker.name, coordinator: PROJECT_COORD[project] ?? worker.coordinator, project },
              { role, assignStart: isoToDisp(startIso) },
            );
            setTransferOpen(false);
            setTermNote(`${worker.name} (${worker.id}) transferred to ${project} — starting ${isoToDisp(startIso)}.`);
          }}
        />
      )}

      {assignOpen && (
        <AssignDialog
          worker={worker}
          role={d.role}
          onClose={() => setAssignOpen(false)}
          onConfirm={(project, role, startIso) => {
            onSave(
              {
                name: worker.name,
                coordinator: PROJECT_COORD[project] ?? worker.coordinator,
                project,
                status: "Assigned to a project",
                ended: false,
                pendingSince: undefined,
              },
              { role, assignStart: isoToDisp(startIso), pendingSince: undefined },
            );
            setAssignOpen(false);
            setTermNote(`${worker.name} (${worker.id}) assigned to ${project} — starting ${isoToDisp(startIso)}.`);
          }}
        />
      )}

      {labourOpen && (
        <LabourOfficeDialog
          worker={worker}
          onClose={() => setLabourOpen(false)}
          onSave={saveLabourOffice}
        />
      )}

      {termOpen && (
        <TerminationDialog
          worker={worker}
          onClose={() => setTermOpen(false)}
          onConfirm={(date, reason) => {
            // flag the worker so the list shows "Awaiting termination documentation"
            onSave({ name: worker.name, coordinator: worker.coordinator, terminating: true, pendingSince: isoToDisp(AS_OF), termEffective: isoToDisp(date) }, {});
            setTermOpen(false);
            setTermNote(`Termination started for ${worker.name} (${worker.id}) — effective ${date}, reason: ${reason}. Status changes to Terminated once the SP deregistration document is verified.`);
          }}
        />
      )}
    </div>
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
  const [viewKey, setViewKey] = useState("all"); // the "View:" dropdown
  const [page, setPage] = useState(1);
  const [compact, setCompact] = useState(false);
  // Opens straight on the worker named in ?worker= (so Documents / Projects -> worker profile works)
  const [openId, setOpenId] = useState<string | null>(
    () => INITIAL_WORKERS.find((w) => w.id === urlWorker || w.name === urlWorker)?.id ?? null,
  );
  // true when the profile was opened with "Begin termination" from the Coordinator reports tab
  const [termOnOpen, setTermOnOpen] = useState(false);

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
  const filtersActive = hasActiveFilters(filters);

  const saveProfile = (id: string, patch: ProfilePatch, extra: Partial<WorkerDetailInfo>) => {
    setWorkers((list) => list.map((w) => (w.id === id ? { ...w, ...patch } : w)).sort((x, y) => x.name.localeCompare(y.name)));
    setExtras((e) => ({ ...e, [id]: { ...e[id], ...extra } }));
  };

  const openProfile = (id: string) => { setTermOnOpen(false); setOpenId(id); };
  const beginTermination = (id: string) => { setTermOnOpen(true); setOpenId(id); };

  // Acknowledge an "Expected departure" report: it leaves the Coordinator reports tab and changes nothing else.
  const acknowledgeReport = (id: string) => {
    const w = workers.find((x) => x.id === id);
    setWorkers((list) => list.map((x) => (x.id === id ? { ...x, coordinatorReport: false, report: undefined } : x)));
    if (w) setNotice(`Report about ${w.name} (${w.id}) acknowledged.`);
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
    const view = VIEWS.find((v) => v.key === viewKey) ?? VIEWS[0];
    return workers
      .filter(tab.match)
      .filter(view.match)
      .filter((w) => !q || w.name.toLowerCase().includes(q) || w.id.toLowerCase().includes(q))
      .filter((w) => matchesFilters(w, filters, nationalityOf));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, viewKey, query, workers, filters, extras]);

  useEffect(() => setPage(1), [tabKey, viewKey, query, filters]);

  const showPending = tabKey === "pending";

  // Dated fields the list shows (same values as the worker profile, including edits)
  const infoOf = (w: Worker) => {
    const d = { ...detailFor(w), ...(extras[w.id] ?? {}) };
    return {
      assignStart: d.assignStart,
      arrival: d.arrival,
      workStart: d.workStart,
      stayStart: d.accommodationStart ?? "—",
    };
  };

  const openWorker = openId ? workers.find((w) => w.id === openId) : undefined;
  if (openWorker) {
    return (
      <>
        <style>{css}</style>
        <WorkerDetail
          worker={openWorker}
          extra={extras[openWorker.id]}
          startWithTermination={termOnOpen}
          onBack={() => {
            setOpenId(null);
            setTermOnOpen(false);
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

  return (
    <div className="wk-enter">
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
          <img src="/images/worker_add.svg" alt="" aria-hidden="true" width={16} height={16} style={{ display: "block" }} />{" "}
          Add Worker
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
            <select value={viewKey} onChange={(e) => setViewKey(e.target.value)} aria-label="View">
              {VIEWS.map((v) => <option key={v.key} value={v.key}>{v.label}</option>)}
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
          <WorkerFilters
            workers={workers}
            filters={filters}
            nationalityOf={nationalityOf}
            onChange={setFilter}
            onClear={clearFilters}
          />
        )}

        {showPending && (
          <p className="wk-note">
            Each worker shows one reason, in this order: awaiting termination documentation, did-not-start check,
            in preparation, available. The list is calculated from dated records and cannot be edited.
          </p>
        )}

        {tabKey === "reports" && (
          <p className="wk-note">
            Reports sent by coordinators. They are information for Administration and never change a worker's status by themselves.
          </p>
        )}

        <WorkerTable
          rows={rows}
          page={page}
          onPageChange={setPage}
          compact={compact}
          showPending={showPending}
          tabKey={tabKey}
          infoOf={infoOf}
          onOpenWorker={openProfile}
          onBeginTermination={beginTermination}
          onAcknowledge={acknowledgeReport}
        />
      </section>

      {addOpen && (
        <AddWorkerPage open onClose={() => setAddOpen(false)} onSaved={handleSaved} />
      )}
    </div>
  );
}

/* ---------- Styles ----------
 * Table styles live in components/WorkerTable.tsx and filter-panel styles in
 * components/WorkerFilters.tsx. Colours use the theme variables from AdminWorkspace.
 */
const css = `
/* smooth page-in (list and worker profile) */
.wk-enter{animation:wk-in .22s ease-out both}
@keyframes wk-in{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
@media (prefers-reduced-motion:reduce){.wk-enter{animation:none}}

.wk-crumb{display:flex;align-items:center;gap:8px;font-size:13px;color:var(--muted);margin-bottom:8px}
.wk-crumb b{color:var(--text);font-weight:600}
.wk-crumb a:hover{color:var(--text)}
.wk-desc{max-width:780px;font-size:14px;line-height:1.45}
.wk-stat{min-height:0;padding:9px 14px}
.wk-stat .sm-stat-title{font-size:12.5px}
.wk-stat .sm-stat-value{font-size:22px;line-height:1.1;margin-top:3px}
.wk-stat .sm-stat-caption{font-size:12px;margin-top:2px;line-height:1.3}
.wk-tabs{display:flex;gap:4px;overflow-x:auto;border-bottom:1px solid var(--line);margin-bottom:12px;scrollbar-width:none}
.wk-tabs::-webkit-scrollbar{display:none}
.wk-tabs button{flex:none;padding:8px 14px;font-size:14px;color:var(--muted);white-space:nowrap;border-bottom:2px solid transparent;margin-bottom:-1px}
.wk-tabs button.is-active{color:var(--green);font-weight:600;border-bottom-color:var(--green)}
.wk-panel{padding:0 0 10px;margin-bottom:12px}
.wk-toolbar{display:flex;align-items:center;gap:10px;padding:12px 16px 10px}
.wk-select{position:relative;width:260px;flex:none;color:var(--muted)}
.wk-select select{appearance:none;width:100%;height:34px;padding:0 32px 0 12px;border:1px solid var(--line);border-radius:8px;background:var(--card);font:inherit;font-size:13.5px;color:var(--text)}
.wk-select svg{position:absolute;right:10px;top:9px;width:15px;height:15px;pointer-events:none}
.wk-search{display:flex;align-items:center;gap:8px;flex:1;height:34px;padding:0 10px;border:1px solid var(--line);border-radius:8px;background:var(--surface-2);color:var(--muted);font-size:13.5px}
.wk-search input{flex:1;border:0;background:transparent;outline:none;font-size:13.5px;color:var(--text)}
.wk-toolbar .sm-btn{height:34px;padding:0 12px;font-size:13.5px}
.wk-toolbar .sm-btn.is-open{border-color:var(--green);color:var(--green)}

.wk-density{margin-left:auto;display:flex;padding:3px;border:1px solid var(--line);border-radius:8px;background:var(--hover)}
.wk-density button{width:34px;height:30px;display:grid;place-items:center;border-radius:6px}
.wk-density button.is-on{background:var(--green-soft);color:var(--green)}
.wk-note{margin:2px 16px 8px;font-size:13px;color:var(--muted);line-height:1.5}

/* status pills used by the table and the detail page */
.sm-pill.info{background:#e3ecfb;color:#2c55b8}
.sm-pill.muted{background:var(--hover);color:var(--muted)}
html[data-theme="dark"] .sm-pill.info{background:#1f3350;color:#9db8ff}

.wk-notice{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:9px 14px;margin-bottom:12px;border-radius:10px;background:var(--green-soft);color:var(--green);font-size:13.5px}
.wk-notice button{display:grid;place-items:center;width:24px;height:24px;border-radius:6px;color:var(--green)}
.wk-notice button:hover{background:var(--hover)}

/* ---- Worker detail page ---- */
.wd-head{display:flex;align-items:center;gap:12px;padding:22px 18px;margin-bottom:10px}
.wd-avatar{flex:none;display:grid;place-items:center;width:56px;height:56px;border-radius:10px;background: #cdefcb;color: #04210b; font-size:16px;font-weight:700}
.wd-who{flex:1;min-width:0}
.wd-who h1{margin:0;font-size:20px;line-height:1.2;font-weight:600;color:var(--text)}
.wd-who h1 span{font-size:14px;font-weight:500;color:var(--muted)}
.wd-who p{margin:3px 0 0;font-size:14px;color:var(--muted)}
.wd-head-btns{display:flex;gap:8px;flex:none}
.wd-head .sm-btn,.wd-panel-head .sm-btn,.wd-btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;height:32px;padding:0 12px;border-radius:8px;font-size:13px;line-height:1;white-space:nowrap}
.wd-head .sm-btn svg,.wd-panel-head .sm-btn svg,.wd-btn svg{width:14px;height:14px;flex:none}


.wd-sum{display:grid;grid-template-columns:1.55fr 1fr 1.1fr 1fr 1.2fr 1fr 1fr;padding:0;margin-bottom:10px;overflow:hidden}
.wd-sum>div{padding:10px 12px 11px;border-left:1px solid var(--line);min-width:0}
.wd-sum>div:first-child{border-left:0}
.wd-k{font-size:13px;color:var(--muted);line-height:1.3}
.wd-v{margin-top:5px;font-size:12.5px}
.wd-strong{font-size:14px;font-weight:600;line-height:1.3;color:var(--text)}
.wd-pill::before{content:"";display:inline-block;width:6px;height:6px;border-radius:50%;background:currentColor;margin-right:6px;vertical-align:middle}
.wd-pill{font-size:13px;font-weight:600;padding:2px 9px}

.wd-life{padding:10px 16px 12px;margin-bottom:10px}
.wd-life-title{font-size:14px;color:var(--muted);margin-bottom:8px}
.wd-steps{display:flex}
.wd-step{display:inline-flex;align-items:center;gap:6px;height:32px;padding:0 20px 0 26px;margin-left:-6px;font-size:14px;font-weight:500;white-space:nowrap;background:var(--hover);color:var(--muted);clip-path:polygon(0 0,calc(100% - 12px) 0,100% 50%,calc(100% - 12px) 100%,0 100%,12px 50%)}
.wd-step:first-child{margin-left:0;padding-left:14px;clip-path:polygon(0 0,calc(100% - 12px) 0,100% 50%,calc(100% - 12px) 100%,0 100%)}
.wd-step.is-done{background:var(--green-soft);color:var(--green)}
.wd-step.is-current{background:var(--green);color:var(--on-green);font-weight:600}
.wd-step.is-current.is-bad{background:#b42318;color:#fff}

.wd-tabs{display:flex;gap:4px;overflow-x:auto;border-bottom:1px solid var(--line);margin-bottom:10px;scrollbar-width:none}
.wd-tabs::-webkit-scrollbar{display:none}
.wd-tabs button{flex:none;padding:7px 13px 8px;font-size:14px;color:var(--muted);white-space:nowrap;border-bottom:2px solid transparent;margin-bottom:-1px}
.wd-tabs button.is-active{color:var(--green);font-weight:600;border-bottom-color:var(--green)}

.wd-panel{padding:14px 18px 16px;margin-bottom:12px}
.wd-panel-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:10px}
.wd-panel-head h3,.wd-sub{margin:0;font-size:14px;font-weight:600;color:var(--text)}
.wd-sub{margin:16px 0 6px}
.wd-kv{display:grid;grid-template-columns:190px 1fr;gap:9px 14px;margin-bottom:14px;font-size:14px;line-height:1.35}
.wd-kv dt{color:var(--muted)}
.wd-kv dd{margin:0;color:var(--text)}
.wd-muted{color:var(--muted)}
.wd-green{color:var(--green);font-weight:500}
.wd-table{width:100%;font-size:13px}
.wd-table th{font-size:13px;font-weight:500;color:var(--muted);white-space:nowrap}
.wd-table td{white-space:nowrap;padding-top:8px;padding-bottom:8px}
.wd-btn{margin-top:10px}
.wd-foot{margin:8px 0 0;font-size:12.5px}
.wd-empty{margin:4px 0;color:var(--muted);font-size:13.5px}

.wd-drop{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;min-height:60px;padding:12px;border:1.5px dashed var(--line);border-radius:10px;color:var(--text);font-size:13px;text-align:center;cursor:pointer}
.wd-drop svg{width:18px;height:18px;color:var(--text)}
.wd-drop:hover,.wd-drop:focus-visible{background:var(--hover-soft);border-color:var(--green);outline:none}
.wd-docs{margin-top:8px}
.wd-doc{display:grid;grid-template-columns:minmax(200px,1.3fr) minmax(200px,1.7fr) 170px 80px;align-items:center;gap:10px;padding:10px 12px;border-bottom:1px solid var(--line)}
.wd-doc strong{display:block;font-size:13.5px;font-weight:600}
.wd-doc small{display:block;margin-top:2px;font-size:12px;color:var(--muted)}
.wd-files{display:flex;flex-wrap:wrap;gap:8px}
.wd-file{display:inline-flex;align-items:center;gap:6px;padding:3px 9px;border-radius:7px;background:var(--hover);font-size:12.5px;color:var(--text)}
.wd-doc-act{text-align:right}
.wd-link{padding:0;color:var(--green);font-size:13px;font-weight:500;cursor:pointer;background:none}
.wd-add{display:inline-flex;align-items:center;gap:8px;margin:6px 0 6px 28px;padding:0;color:var(--green);font-size:13px;font-weight:500;cursor:pointer;background:none}
.wd-event{display:flex;flex-direction:column;gap:6px;padding:4px}
.wd-event strong{font-size:14px;font-weight:600}
.wd-event span{color:var(--muted);font-size:13px}

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

/* ---- Blocked banner + status / pending action card ---- */
.wd-blocked{display:flex;align-items:center;gap:10px;padding:9px 14px;margin-bottom:12px;border-radius:10px;background:var(--danger-bg);color:var(--danger);font-size:13.5px;font-weight:500}
.wd-blocked svg{flex:none}
.wd-status{padding:14px 18px 16px;margin-bottom:10px}
.wd-status-title{display:flex;align-items:center;gap:8px;margin:0 0 10px;font-size:14px;font-weight:600;color:var(--text)}
.wd-status .wd-kv{grid-template-columns:190px 1fr;align-items:center}
.wd-status-note{margin-left:8px;color:var(--muted)}
.wd-pending{display:flex;align-items:center;gap:10px;margin-top:12px;padding:9px 14px;border-radius:8px;background:var(--warn-bg);color:var(--warn-text);font-size:14px;line-height:1.4}
.wd-pending svg{flex:none}
.wd-pending b{font-weight:600}
.wd-pending.is-danger{background:var(--danger-bg);color:var(--danger)}

/* Termination card (inside the status card) */
.wd-term{margin-top:12px;padding:14px 18px 16px;border:1px solid var(--line);border-radius:10px;background: #f8f9f7;}
.wd-term h4{margin:0 0 10px;font-size:15px;font-weight:600;color:var(--text)}
.wd-term .wd-kv{margin-bottom:12px;align-items:center}
.wd-term .sm-btn{display:inline-flex;align-items:center;gap:8px;height:36px;padding:0 14px;font-size:14px;font-weight:600;border-radius:8px}
.wd-dereg-file{margin-left:8px;color:var(--text)}
.wd-labour-btn{margin-top:4px;transition:background-color .2s ease,border-color .2s ease,color .2s ease,transform .2s ease}
.wd-labour-btn:hover{background:var(--green-soft);border-color:var(--green);color:var(--green);transform:translateY(-1px)}
.wd-labour-btn:focus-visible{outline:2px solid var(--green);outline-offset:2px}
.wd-toast{position:fixed;left:50%;bottom:72px;transform:translateX(-50%);z-index:1100;display:flex;align-items:center;gap:28px;padding:14px 24px;border-radius:12px;background:#2b312d;color:#fff;font-size:15px;box-shadow:0 8px 28px rgba(0,0,0,.25)}
.wd-toast button{padding:0;background:none;color:#9be3b0;font-size:15px;font-weight:600;cursor:pointer}

/* ---- Begin termination / Edit profile dialogs ---- */
.tm-overlay{position:fixed;inset:0;z-index:200;display:grid;place-items:center;padding:20px;background:var(--overlay);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px)}
.tm-dialog{width:100%;max-width:620px;padding:18px 22px 18px;border-radius:14px;background:var(--card);color:var(--text);border:1px solid var(--line);box-shadow:var(--shadow);max-height:calc(100vh - 56px);overflow-y:auto}
.tm-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:12px}
.tm-head h2{margin:0;font-size:16px;font-weight:600;color:var(--text)}
.tm-close{display:grid;place-items:center;width:26px;height:26px;border-radius:8px;color:var(--muted);cursor:pointer}
.tm-close:hover{background:var(--hover);color:var(--text)}
.tm-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px 12px;margin-bottom:10px}
.tm-wide{grid-column:1/-1}
.tm-field{display:flex;flex-direction:column;gap:4px;font-size:12px;color:var(--muted)}
.tm-field b{font-weight:500}
.tm-field input,.tm-select select{width:100%;height:32px;padding:0 10px;border:1px solid var(--line);border-radius:7px;background:var(--card);font:inherit;font-size:13px;color:var(--text)}
.tm-field input:focus,.tm-select select:focus{outline:2px solid var(--green);outline-offset:-1px}
.tm-select{position:relative;display:block}
.tm-select select{appearance:none;padding-right:30px}
.tm-select svg{position:absolute;right:9px;top:8px;width:15px;height:15px;pointer-events:none;color:var(--muted)}
.tm-note{margin:0 0 12px;font-size:12px;line-height:1.5;color:var(--muted)}
.tm-note strong{color:var(--text);font-weight:600}
.tm-submit{height:32px;padding:0 14px;font-size:14px;font-weight:500;border-radius:8px;border:none}
.tm-submit:disabled{opacity:.5;cursor:default}
@media (max-width:640px){
  .tm-grid{grid-template-columns:1fr}
}

/* ---- Transfer to another project dialog ---- */
.tm-dialog.tr-dialog{max-width:640px;padding:24px 28px 26px;border-radius:19px}
.tr-dialog .tm-head{margin-bottom:20px}
.tr-dialog .tm-head h2{font-size:18px}
.tr-dialog .tm-field{font-size:13px;gap:7px}
.tr-dialog .tm-field input,.tr-dialog .tm-select select{height:38px;font-size:13px;padding:0 12px;border-radius:9px}
.tr-dialog .tm-select svg{top:12px}
.tr-dialog .tm-grid{gap:16px 18px;margin-bottom:18px}
.tr-dialog .tm-submit{height:36px;padding:0 18px;font-size:14px;border-radius:9px;border:none}

/* slim rounded scrollbar inside the dialogs */
.tm-dialog::-webkit-scrollbar{width:10px}
.tm-dialog::-webkit-scrollbar-track{background:transparent;margin:14px 0}
.tm-dialog::-webkit-scrollbar-thumb{background:var(--line);border-radius:999px;border:2px solid transparent;background-clip:padding-box}



/* ---- Accommodation Check In modal ---- */
.ci-overlay{position:fixed;inset:0;z-index:1000;display:flex;align-items:center;justify-content:center;padding:20px;background:rgba(30,38,32,.38);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px)}
.ci-modal{width:680px;max-width:100%;max-height:calc(100vh - 40px);overflow-y:auto;padding:30px;background:#fff;color:#202820;border-radius:19px;box-shadow:0 20px 60px rgba(0,0,0,.18)}
.ci-header{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-bottom:24px}
.ci-header h2{margin:0;font-size:16px;line-height:1.3;font-weight:600;color:#202820}
.ci-transfer .ci-header h2{font-size:18px}
.ci-close{display:grid;place-items:center;width:28px;height:28px;padding:0;border:0;border-radius:8px;background:transparent;color:#68736c;cursor:pointer}
.ci-close:hover{background:#f2f2f2;color:#202820}
.ci-field{display:flex;flex-direction:column;gap:8px;min-width:0;color:#626c65;font-size:13px;font-weight:500}
.ci-field b{font-weight:600}
.ci-field input,.ci-select select{height:39px;box-sizing:border-box;border:1px solid #d5dcd5;border-radius:10px;padding:0 14px;background:#fff;color:#252b26;font:inherit;font-size:14px;outline:none}
.ci-field input:focus,.ci-select select:focus{border-color:#278348;box-shadow:0 0 0 2px rgba(39,131,72,.1)}
.ci-select{position:relative;display:block;width:100%}
.ci-select select{width:100%;appearance:none;padding-right:38px}
.ci-select svg{position:absolute;right:12px;top:11px;color:#68736c;pointer-events:none}
.ci-date{width:356px;max-width:100%;margin-top:18px}
.ci-note{margin:20px 0 16px;color:#68736c;font-size:13px;line-height:1.55}
.ci-submit{height:40px;padding:0 18px;border:0;border-radius:10px;background:#167538;color:#fff;font-size:14px;font-weight:600;cursor:pointer;transition:background-color .18s ease}
.ci-submit:hover{background:#125f2d}
.ci-submit:disabled{opacity:.5;cursor:not-allowed}
.ci-modal::-webkit-scrollbar{width:10px}
.ci-modal::-webkit-scrollbar-track{background:transparent;margin:14px 0}
.ci-modal::-webkit-scrollbar-thumb{background:#d5dcd5;border-radius:999px;border:2px solid transparent;background-clip:padding-box}
@media(max-width:650px){.ci-modal{padding:22px}.ci-header{margin-bottom:22px}.ci-date{width:100%}}

/* ---- Tasks & Notes tab + task details modal ---- */
.wd-tasks{padding:4px;margin-bottom:12px}
.wd-task{display:flex;align-items:center;justify-content:space-between;gap:16px;width:100%;padding:10px 14px;margin:10px 1px;border-radius:10px;text-align:left;cursor:pointer;background:transparent;color:var(--text);transition:background-color .15s ease}
.wd-task:hover,.wd-task:focus-visible{background:var(--hover-soft);outline:none}
.wd-task-main{display:flex;flex-direction:column;gap:6px;min-width:0}
.wd-task-main strong{font-size:14px;font-weight:600;line-height:1.3}
.wd-task-main span{font-size:13px;color:var(--muted);line-height:1.3}

.tk-overlay{position:fixed;inset:0;z-index:1000;display:flex;align-items:center;justify-content:center;padding:20px;background:rgba(30,38,32,.38);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px)}
.tk-modal{width:700px;max-width:100%;max-height:calc(100vh - 40px);overflow-y:auto;padding:30px 32px 32px;background:var(--card);color:var(--text);border-radius:19px;box-shadow:0 20px 60px rgba(0,0,0,.18)}
.tk-head{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-bottom:22px}
.tk-head h2{margin:0;font-size:18px;line-height:1.3;font-weight:600;color:var(--text)}
.tk-close{display:grid;place-items:center;width:30px;height:30px;padding:0;border:0;border-radius:8px;background:transparent;color:var(--muted);cursor:pointer}
.tk-close:hover{background:var(--hover);color:var(--text)}
.tk-kv{display:grid;grid-template-columns:220px 1fr;gap:10px 16px;margin:0 0 20px;font-size:13px;line-height:1.45}
.tk-kv dt{color:var(--muted)}
.tk-kv dd{margin:0;color:var(--text)}
.tk-label{display:block;margin-bottom:6px;font-size:13px;color:var(--muted)}
.tk-select{position:relative;display:block}
.tk-select select{appearance:none;width:100%;height:38px;padding:0 40px 0 16px;border:1px solid var(--line);border-radius:10px;background:var(--card);font:inherit;font-size:13px;color:var(--text);cursor:pointer}
.tk-select select:focus{outline:2px solid var(--green);outline-offset:-1px}
.tk-select svg{position:absolute;right:14px;top:12px;color:var(--text);pointer-events:none}
.tk-sub{margin:18px 0 4px;font-size:13px;font-weight:600;color:var(--text)}
.tk-muted{margin:0 0 14px;font-size:13px;color:var(--muted)}
.tk-comments{list-style:none;margin:0 0 14px;padding:0;display:flex;flex-direction:column;gap:10px;font-size:14px}
.tk-comments li{display:flex;flex-direction:column;gap:2px}
.tk-comments strong{font-weight:600}
.tk-comments span{color:var(--text)}
.tk-compose {
    display: flex;
    align-items: center;
    gap: 12px;
    height: 40px;
    padding: 0 6px 0 20px;
    border: 1px solid var(--line);
    border-radius: 10px;
    background: var(--surface-2);
    transition: border-color .2s ease, box-shadow .2s ease;
}



.tk-compose input {
    flex: 1;
    min-width: 0;
    border: 0;
    outline: none;
    background: transparent;
    font: inherit;
    font-size: 14.5px;
    color: var(--text);
}

.tk-compose button {
    height: 34px;
    padding: 0 15px;
    border: 0;
    border-radius: 8px;
    background: transparent;
    color: var(--green);
    font-size: 14.5px;
    font-weight: 600;
    cursor: pointer;
}

.tk-compose button:hover {
    background: var(--green-soft);
    color: var(--green);
}

.tk-compose button:focus-visible {
    background: var(--green-soft);
    outline-offset: 2px;
}

@media(max-width:650px){.tk-modal{padding:22px}.tk-kv{grid-template-columns:1fr;gap:2px 0}.tk-kv dd{margin-bottom:10px}}

/* ---- Update SP Record modal ---- */
.sp-modal-overlay{position:fixed;inset:0;z-index:1000;display:flex;align-items:center;justify-content:center;padding:20px;background:rgba(30,38,32,.38);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px)}
.sp-modal{width:680px;max-width:100%;max-height:calc(100vh - 40px);overflow-y:auto;padding:30px;background:#fff;color:#202820;border-radius:19px;box-shadow:0 20px 60px rgba(0,0,0,.18)}
.sp-modal-header{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-bottom:24px}
.sp-modal-header h2{margin:0;font-size:18px;line-height:1.3;font-weight:650;color:#202820}
.tm-close{display:grid;place-items:center;width:28px;height:28px;padding:0;border:0;border-radius:8px;background:transparent;box-shadow:none;outline:none;color:var(--muted);cursor:pointer}
.tm-close:hover{background: #f2f2f2;color:var(--text)}
.tm-close:focus,.tm-close:focus-visible,.tm-close:active{background:transparent;box-shadow:none;outline:none}
.sp-form-grid{display:grid;grid-template-columns:1fr 1fr;gap:18px 16px}
.sp-field{display:flex;flex-direction:column;gap:8px;min-width:0;color:#626c65;font-size:12px;font-weight:500}
.sp-field input{width:100%;min-height:38px;box-sizing:border-box;border:1px solid #d5dcd5;border-radius:10px;padding:9px 13px;background:#fff;color:#252b26;font:inherit;font-size:13px;outline:none}
.sp-field input:focus{border-color:#278348;box-shadow:0 0 0 2px rgba(39,131,72,.1)}
.sp-evidence{margin-top:18px}
.sp-evidence input[type=file]{padding:6px 12px}
.sp-evidence small{color:#68736c;font-size:12px;font-weight:400}
.sp-verify{display:flex;align-items:flex-start;gap:12px;margin-top:20px;color:#303730;font-size:13px;line-height:1.5;cursor:pointer}
.sp-verify input{width:18px;height:18px;margin:1px 0 0;accent-color:#167538;flex:none}
.sp-help-text{margin:12px 0 17px;color:#68736c;font-size:12px;line-height:1.55}
.sp-modal-footer{display:flex;justify-content:flex-start}
.sp-save-btn{min-height:36px;padding:0 16px;border:0;border-radius:10px;background:#167538;color:#fff;font-size:13px;font-weight:600;cursor:pointer;transition:background-color .2s ease}
.sp-save-btn:hover{background:#125f2d}
.sp-modal::-webkit-scrollbar{width:10px}
.sp-modal::-webkit-scrollbar-track{background:transparent;margin:14px 0}
.sp-modal::-webkit-scrollbar-thumb{background:#d5dcd5;border-radius:999px;border:2px solid transparent;background-clip:padding-box}
@media(max-width:650px){.sp-modal{padding:22px}.sp-form-grid{grid-template-columns:1fr}}
`;
