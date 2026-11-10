import React, { useState } from "react";
import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";

/* ---------- Types & data ---------- */
type TabId = "users" | "reference" | "documents" | "company" | "audit";

const TABS: { id: TabId; label: string }[] = [
  { id: "users", label: "Users & Roles" },
  { id: "reference", label: "Reference Lists" },
  { id: "documents", label: "Document Rules" },
  { id: "company", label: "Company Settings" },
  { id: "audit", label: "Audit History" },
];

interface AppUser {
  id: number;
  name: string;
  email: string;
  role: string;
  roleNote?: string;       // e.g. "(Administration permissions)"
  authorisedToVerify?: boolean;
  active: boolean;
  projects: string;
}

const USERS: AppUser[] = [
  { id: 1, name: "Marek Máhr", email: "marek@staffmate.example", role: "Management", active: true, projects: "All" },
  { id: 2, name: "Zuzana Horváthová", email: "zuzana.h@staffmate.example", role: "Administration", authorisedToVerify: true, active: true, projects: "All" },
  { id: 3, name: "Lucia Tóthová", email: "lucia.t@staffmate.example", role: "Accountant", roleNote: "(Administration permissions)", active: true, projects: "All" },
  { id: 4, name: "Jana Kollárová", email: "jana.k@staffmate.example", role: "Coordinator", active: true, projects: "AutoParts Slovakia, Warehouse Ops, CNC Machining Hall" },
  { id: 5, name: "Peter Vrábel", email: "peter.v@staffmate.example", role: "Coordinator", active: true, projects: "Line 3 Assembly, Packaging Line B, Cold Storage Facility" },
];

const ROLES = ["Management", "Administration", "Accountant", "Coordinator"] as const;

/** One row per capability; values are in ROLES order. */
const PERMISSIONS: { capability: string; values: [string, string, string, string] }[] = [
  { capability: "View worker profiles", values: ["All", "All", "All", "Own workers; available pool in limited form"] },
  { capability: "Edit personal and operational information", values: ["Full", "Full", "Full", "Limited (own tasks and notes)"] },
  { capability: "Documents — preview", values: ["All categories", "All categories", "All categories", "Own workers, permitted categories"] },
  { capability: "Documents — download / export", values: ["Full", "Full", "Full", "None"] },
  { capability: "Upload / replace documents", values: ["Full", "Full", "Full", "Own workers only"] },
  { capability: "Verify documents, Social Insurance and deregistration", values: ["Yes", "Authorised staff", "Yes", "No"] },
  { capability: "Internal transfers", values: ["Full", "Full", "Full", "Report / propose only"] },
  { capability: "Begin or complete a termination; mark did-not-start", values: ["Full", "Full", "Full", "Report expected departure only"] },
  { capability: "Register coordinator interest", values: ["Full", "Full", "Full", "Yes — on available workers"] },
  { capability: "Record daily work status", values: ["Yes", "Yes", "Yes", "No"] },
  { capability: "Correct a confirmed daily record", values: ["With reason", "With reason", "With reason", "No"] },
  { capability: "Statistics", values: ["Company and project", "Company and project", "Company and project", "Own projects only"] },
  { capability: "Accommodation agreements", values: ["Full", "Full", "Full", "Preview only"] },
  { capability: "Client contracts and Sales", values: ["Full", "Full", "Full", "Hidden"] },
  { capability: "Manage users, rules and audit history", values: ["Full", "None", "None", "None"] },
];

const REFERENCE_LISTS: { name: string; items: string }[] = [
  { name: "Document Categories", items: "6" },
  { name: "Nationalities", items: "12" },
  { name: "Industries", items: "6" },
  { name: "Job Roles", items: "9" },
  { name: "Task Priorities", items: "3 (High / Medium / Low)" },
  { name: "Task Statuses", items: "5 (New / In Progress / Awaiting Input / Completed / Cancelled)" },
];

const DOCUMENT_RULES: { category: string; requiredFor: string; expiry: string; verification: string }[] = [
  { category: "Employment Contract", requiredFor: "All workers", expiry: "No expiry", verification: "Yes" },
  { category: "Passport", requiredFor: "All workers", expiry: "60 / 30 / 14 / 7 days", verification: "Yes" },
  { category: "TRC / Residence Card", requiredFor: "Non-EU nationals", expiry: "60 / 30 / 14 / 7 days", verification: "Yes" },
  { category: "Authority Approval Statement", requiredFor: "Where applicable by nationality", expiry: "No expiry", verification: "Yes" },
  { category: "Labour Office Notification", requiredFor: "Where applicable by nationality", expiry: "No expiry", verification: "Yes" },
  { category: "SP Registration Evidence", requiredFor: "All workers", expiry: "Effective-dated (no fixed expiry)", verification: "Yes — authorised verifiers only" },
];

const COMPANY: [string, string][] = [
  ["Company Name", "Staffmate s.r.o."],
  ["Interface Language", "English (Slovak planned — to be confirmed)"],
  ["Date Format", "DD Mon YYYY"],
  ["Time Zone", "Europe/Bratislava"],
  ["Default Alert Thresholds", "60 / 30 / 14 / 7 days before expiry"],
];

const AUDIT: { when: string; user: string; action: string; entity: string }[] = [
  { when: "2026-09-08 14:22", user: "Marek Máhr", action: "Verified SP registration", entity: "Marko Jovanović (SM-0981)" },
  { when: "2026-09-05 09:10", user: "Jana Kollárová", action: "Uploaded document", entity: "Ivan Petrenko (SM-1042) — Employment Contract" },
  { when: "2026-09-01 11:00", user: "Peter Vrábel", action: "Placed On Hold", entity: "Dmytro Kovalenko (SM-0754)" },
  { when: "2026-08-31 16:40", user: "Peter Vrábel", action: "Changed status to Suspended", entity: "Cold Storage Facility (project)" },
];

/* ---------- Tab panels ---------- */
const UsersPanel = (): React.JSX.Element => (
  <>
    <section className="sm-card st-panel">
      <h2 className="st-card-title">Users</h2>
      <div className="sm-table-wrap">
        <table className="sm-table st-table">
          <thead>
            <tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Assigned projects</th></tr>
          </thead>
          <tbody>
            {USERS.map((u) => (
              <tr key={u.id}>
                <td>{u.name}</td>
                <td>{u.email}</td>
                <td>
                  <span className="st-role">
                    {u.role}
                    {u.authorisedToVerify && <span className="sm-pill info">Authorised to verify</span>}
                    {u.roleNote && <span className="st-muted">{u.roleNote}</span>}
                  </span>
                </td>
                <td><span className={`sm-pill ${u.active ? "ok" : "muted"}`}>{u.active ? "Active" : "Inactive"}</span></td>
                <td>{u.projects}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>

    <section className="sm-card st-panel">
      <div className="st-card-head">
        <h2 className="st-card-title">Permission matrix — Baseline v3.2</h2>
        <span className="st-muted">Enforced on the server, not only hidden in the screen</span>
      </div>
      <div className="sm-table-wrap">
        <table className="sm-table st-table st-matrix">
          <thead>
            <tr>
              <th>Capability</th>
              {ROLES.map((r) => <th key={r} className="st-center">{r}</th>)}
            </tr>
          </thead>
          <tbody>
            {PERMISSIONS.map((p) => (
              <tr key={p.capability}>
                <td>{p.capability}</td>
                {p.values.map((v, i) => <td key={ROLES[i]} className="st-center">{v}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="st-note">
        The Accountant has the same permissions as Administration. A preview permission never implies download or
        export. Document visibility is set per category (R24).
      </p>
    </section>
  </>
);

const ReferencePanel = (): React.JSX.Element => (
  <section className="sm-card st-panel">
    <div className="sm-table-wrap">
      <table className="sm-table st-table">
        <thead>
          <tr><th>Reference List</th><th>Items</th><th aria-label="Actions" /></tr>
        </thead>
        <tbody>
          {REFERENCE_LISTS.map((r) => (
            <tr key={r.name}>
              <td>{r.name}</td>
              <td>{r.items}</td>
              <td className="st-right"><button type="button" className="st-link">Manage</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </section>
);

const DocumentRulesPanel = (): React.JSX.Element => (
  <section className="sm-card st-panel">
    <div className="sm-table-wrap">
      <table className="sm-table st-table">
        <thead>
          <tr><th>Document Category</th><th>Required For</th><th>Expiry Alert Threshold</th><th>Verification Required</th></tr>
        </thead>
        <tbody>
          {DOCUMENT_RULES.map((d) => (
            <tr key={d.category}>
              <td>{d.category}</td>
              <td>{d.requiredFor}</td>
              <td>{d.expiry}</td>
              <td>{d.verification}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    <p className="st-note">
      Completeness is calculated from the categories applicable to each worker's nationality and role — not a single
      fixed list applied to everyone.
    </p>
  </section>
);

const CompanyPanel = (): React.JSX.Element => (
  <section className="sm-card st-panel st-company">
    <dl className="st-dl">
      {COMPANY.map(([k, v]) => (
        <React.Fragment key={k}>
          <dt>{k}</dt>
          <dd>{v}</dd>
        </React.Fragment>
      ))}
    </dl>
  </section>
);

const AuditPanel = (): React.JSX.Element => (
  <section className="sm-card st-panel">
    <div className="st-card-head">
      <h2 className="st-card-title">Audit History</h2>
      <span className="st-muted">Most recent first — every action you take in this demo is logged here</span>
    </div>
    <div className="sm-table-wrap">
      <table className="sm-table st-table">
        <thead>
          <tr><th>Date/Time</th><th>User</th><th>Action</th><th>Entity</th></tr>
        </thead>
        <tbody>
          {AUDIT.map((a) => (
            <tr key={a.when + a.entity}>
              <td>{a.when}</td>
              <td>{a.user}</td>
              <td>{a.action}</td>
              <td>{a.entity}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </section>
);

const PANELS: Record<TabId, () => React.JSX.Element> = {
  users: UsersPanel,
  reference: ReferencePanel,
  documents: DocumentRulesPanel,
  company: CompanyPanel,
  audit: AuditPanel,
};

/* ---------- Page ---------- */
export default function SettingsPage(): React.JSX.Element {
  const [tab, setTab] = useState<TabId>("users");
  const Panel = PANELS[tab];

  return (
    <>
      <style>{css}</style>

      <nav className="st-crumb" aria-label="Breadcrumb">
        <Link to="/admin">Home</Link><ChevronRight size={14} /><b>Settings</b>
      </nav>

      <div className="sm-title-row">
        <div>
          <h1>Settings</h1>
          <p className="st-desc">Users, permissions, reference data, document rules and audit history.</p>
        </div>
      </div>

      <div className="st-tabs" role="tablist" aria-label="Settings sections">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            id={`st-tab-${t.id}`}
            aria-selected={tab === t.id}
            aria-controls="st-panel"
            className={`st-tab${tab === t.id ? " is-active" : ""}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div id="st-panel" role="tabpanel" aria-labelledby={`st-tab-${tab}`}>
        <Panel />
      </div>
    </>
  );
}

const css = `
.st-crumb{display:flex;align-items:center;gap:8px;font-size:16px;color:var(--muted);margin-bottom:11px}
.st-crumb b{color:var(--text);font-weight:600}

.st-tabs{display:flex;gap:4px;border-bottom:1px solid var(--line,#e4e3dc);margin:18px 0 24px}
.st-tab{background:none;border:0;border-bottom:2px solid transparent;margin-bottom:-1px;padding:12px 18px 14px;font:inherit;font-size:19px;color:var(--text);cursor:pointer}
.st-tab:hover{color:var(--green)}
.st-tab:focus-visible{outline:2px solid var(--green);outline-offset:-2px;border-radius:6px}
.st-tab.is-active{color:var(--green);font-weight:600;border-bottom-color:var(--green)}

.st-panel{padding:22px 18px 18px;margin-bottom:24px}
.st-card-head{display:flex;align-items:baseline;justify-content:space-between;gap:16px;flex-wrap:wrap;padding:0 13px}
.st-card-title{font-size:20px;font-weight:600;margin:0 0 16px;padding:0 13px}
.st-card-head .st-card-title{padding:0}
.st-muted{color:var(--muted);font-size:17px}
.st-card-head .st-muted{margin-bottom:16px}
.st-role{display:inline-flex;align-items:center;gap:8px}
.st-role .st-muted{font-size:inherit}

.st-table th,.st-table td{padding-left:18px;padding-right:18px}
.st-table td{padding-top:17px;padding-bottom:17px}
.st-table th{white-space:nowrap}
.st-table td{white-space:nowrap}
.st-matrix{min-width:1000px}
.st-matrix td:first-child{min-width:300px}
.st-center{text-align:center}
.st-right{text-align:right}

.st-link{background:none;border:0;padding:0;font:inherit;font-weight:600;color:var(--green);cursor:pointer}
.st-link:hover{text-decoration:underline}
.st-link:focus-visible{outline:2px solid var(--green);outline-offset:3px;border-radius:4px}

.st-note{margin:14px 13px 0;color:var(--muted);font-size:17px;line-height:1.5}

.st-company{padding:22px 30px}
.st-dl{display:grid;grid-template-columns:280px 1fr;row-gap:14px;margin:0;font-size:18px}
.st-dl dt{color:var(--muted)}
.st-dl dd{margin:0}

.sm-pill.info{background:#e3ecfb;color:#2c55b8}
.sm-pill.muted{background:#eeede8;color:var(--muted)}

@media (max-width:720px){
  .st-tabs{overflow-x:auto}
  .st-tab{white-space:nowrap;font-size:17px;padding:10px 14px 12px}
  .st-dl{grid-template-columns:1fr;row-gap:4px}
  .st-dl dd{margin-bottom:10px}
}

/* ---- Compact sizing (smaller cards and fonts) ---- */
.st-crumb{font-size:13px;margin-bottom:8px}
.st-desc{font-size:14px;line-height:1.45}
.st-tabs{margin:12px 0 14px}
.st-tab{font-size:14px;padding:8px 14px 10px}
.st-panel{padding:14px 12px 12px;margin-bottom:14px}
.st-card-head{padding:0 8px}
.st-card-title{font-size:15px;margin:0 0 10px;padding:0 8px}
.st-card-head .st-card-title{padding:0}
.st-muted{font-size:13px}
.st-card-head .st-muted{margin-bottom:10px}
.st-role{gap:6px}
.st-table{font-size:13.5px}
.st-table th{font-size:12.5px;padding-top:8px;padding-bottom:8px}
.st-table th,.st-table td{padding-left:14px;padding-right:14px}
.st-table td{padding-top:9px;padding-bottom:9px}
.st-table .sm-pill{font-size:12.5px;padding:2px 10px}
.st-matrix{min-width:900px}
.st-matrix td:first-child{min-width:260px}
.st-note{margin:10px 8px 0;font-size:13px}
.st-company{padding:14px 20px}
.st-dl{grid-template-columns:230px 1fr;row-gap:9px;font-size:14px}
@media (max-width:720px){
  .st-tab{font-size:13.5px;padding:8px 12px 10px}
  .st-dl{grid-template-columns:1fr}
}
`;
