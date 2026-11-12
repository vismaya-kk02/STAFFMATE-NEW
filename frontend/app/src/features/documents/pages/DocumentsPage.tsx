import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronDown, ChevronRight, Search, SlidersHorizontal } from "lucide-react";

/* ---------- Types ---------- */
type DocStatus = "Verified" | "Missing" | "Held — Not Uploaded" | "Pending Verification" | "Expired";
type RecordType = "Worker" | "Project" | "Facility";

interface DocItem {
  recordType: RecordType;
  profile: string;
  category: string;
  file: string | null;
  status: DocStatus;
  validUntil: string | null; // ISO date, null = no expiry
  uploadedBy: string | null;
  uploadDate: string | null; // ISO date
  responsible: string;
}

const AS_OF = "2026-09-09"; // same "as of" date as the other pages
const EXPIRING_DAYS = 60;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const fmt = (iso: string | null) => { if (!iso) return "—"; const [y, m, d] = iso.split("-"); return `${d} ${MONTHS[+m - 1]} ${y}`; };
const daysBetween = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / 86400000);

/* ---------- Data ---------- */
const CATEGORIES = ["Employment Contract", "Passport", "TRC / Residence Card", "Authority Approval Statement", "Labour Office Notification", "SP Registration Evidence"];
const FILES = ["contract_v1.pdf", "passport_scan.pdf", "trc_front.pdf", "approval_statement.pdf", "notification.pdf", "sp_confirmation.pdf"];
const JANA = "Jana Kollárová";
const PETER = "Peter Vrábel";

type Spec = [status: DocStatus, validUntil?: string | null, by?: string | null, date?: string | null, file?: string | null];
const build = (profile: string, specs: Spec[]): DocItem[] =>
  specs.map(([status, validUntil = null, by = null, date = null, file], i) => ({
    recordType: "Worker" as RecordType,
    profile, category: CATEGORIES[i], status, validUntil, uploadedBy: by, uploadDate: date,
    file: file === undefined ? (status === "Missing" || status === "Held — Not Uploaded" ? null : FILES[i]) : file,
    responsible: "Marek Máhr",
  }));

const DOCS: DocItem[] = [
  ...build("Ivan Petrenko", [
    ["Verified", null, JANA, "2025-02-01"], ["Verified", "2029-06-10", JANA, "2025-01-28"], ["Verified", "2027-02-01", JANA, "2025-02-01"],
    ["Verified", null, JANA, "2025-02-01"], ["Verified", null, JANA, "2025-02-01"], ["Expired", null, null, null, null],
  ]),
  ...build("Marko Jovanović", [
    ["Verified", null, PETER, "2022-03-01"], ["Verified", "2028-04-20", PETER, "2022-02-20"], ["Expired", "2026-09-06", PETER, "2024-09-01", "trc_back.pdf"],
    ["Verified", null, PETER, "2022-03-01"], ["Verified", null, PETER, "2022-03-01"], ["Verified", null, PETER, "2024-07-01", "sp_confirmation_2024.pdf"],
  ]),
  ...build("Nguyen Van An", [
    ["Pending Verification", null, PETER, "2026-09-01"], ["Pending Verification", "2026-09-23", PETER, "2026-09-01"], ["Missing"],
    ["Missing"], ["Held — Not Uploaded"], ["Missing"],
  ]),
  ...build("Elena Popescu", [
    ["Verified", null, JANA, "2025-03-10"], ["Verified", "2030-01-15", JANA, "2025-03-10"], ["Verified", "2027-03-01", JANA, "2025-03-10"],
    ["Verified", null, JANA, "2025-03-10"], ["Verified", null, JANA, "2025-03-10"], ["Verified", null, JANA, "2025-03-01"],
  ]),
  ...build("Taras Georgiev", [
    ["Verified", null, PETER, "2025-05-01"], ["Verified", "2029-08-12", PETER, "2025-05-01"], ["Verified", "2027-05-01", PETER, "2025-05-01"],
    ["Verified", null, PETER, "2025-05-01"], ["Verified", null, PETER, "2025-05-01"], ["Verified", null, PETER, "2025-05-01"],
  ]),
  ...build("Petar Marković", [
    ["Pending Verification", null, JANA, "2026-09-02"], ["Pending Verification", "2031-02-18", JANA, "2026-09-02"], ["Verified", "2027-11-30", JANA, "2025-11-12"],
    ["Verified", null, JANA, "2025-11-12"], ["Verified", null, JANA, "2025-11-12"], ["Pending Verification", null, JANA, "2026-09-02"],
  ]),
];

const daysRemaining = (d: DocItem) =>
  d.status === "Verified" && d.validUntil && d.validUntil >= AS_OF ? daysBetween(AS_OF, d.validUntil) : null;
const isExpiring = (d: DocItem) => { const n = daysRemaining(d); return n !== null && n <= EXPIRING_DAYS; };

const TABS: { label: string; match: (d: DocItem) => boolean }[] = [
  { label: "All", match: () => true },
  { label: "Missing", match: (d) => d.status === "Missing" },
  { label: "Held — Not Uploaded", match: (d) => d.status === "Held — Not Uploaded" },
  { label: "Pending Verification", match: (d) => d.status === "Pending Verification" },
  { label: "Expiring Soon", match: isExpiring },
  { label: "Expired", match: (d) => d.status === "Expired" },
  { label: "Verified", match: (d) => d.status === "Verified" },
];

const PILL: Record<DocStatus, string> = {
  Verified: "ok", Missing: "bad", Expired: "bad", "Pending Verification": "warn", "Held — Not Uploaded": "warn",
};

/* ---------- Filter options ---------- */
const RECORD_TYPES: RecordType[] = ["Worker", "Project", "Facility"];
const EXPIRY_OPTIONS: { label: string; days: number }[] = [
  { label: "30 days", days: 30 },
  { label: "60 days", days: 60 },
  { label: "90 days", days: 90 },
  { label: "180 days", days: 180 },
];
const COORDINATORS = Array.from(new Set(DOCS.map((d) => d.uploadedBy).filter(Boolean) as string[]));

/* ---------- Page ---------- */
export default function DocumentsPage(): React.JSX.Element {
  const [tab, setTab] = useState("All");
  const [query, setQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [fType, setFType] = useState("Any");
  const [fCategory, setFCategory] = useState("Any");
  const [fCoordinator, setFCoordinator] = useState("Any");
  const [fExpiry, setFExpiry] = useState("Any");

  const filtersActive = [fType, fCategory, fCoordinator, fExpiry].some((v) => v !== "Any");

  const rows = useMemo(() => {
    const t = TABS.find((x) => x.label === tab)!;
    const q = query.trim().toLowerCase();
    const expiryDays = EXPIRY_OPTIONS.find((o) => o.label === fExpiry)?.days;
    return DOCS.filter(t.match)
      .filter((d) => !q || [d.profile, d.category, d.file ?? "", d.uploadedBy ?? ""].some((v) => v.toLowerCase().includes(q)))
      .filter((d) => fType === "Any" || d.recordType === fType)
      .filter((d) => fCategory === "Any" || d.category === fCategory)
      .filter((d) => fCoordinator === "Any" || d.uploadedBy === fCoordinator)
      .filter((d) => {
        if (expiryDays === undefined) return true;
        const n = daysRemaining(d);
        return n !== null && n <= expiryDays;
      });
  }, [tab, query, fType, fCategory, fCoordinator, fExpiry]);

  const count = (label: string) => DOCS.filter(TABS.find((x) => x.label === label)!.match).length;
  const stats = [
    { label: "Missing Required Items", value: count("Missing"), color: "var(--danger)" },
    { label: "Held — Not Uploaded", value: count("Held — Not Uploaded"), color: "#8a5a00" },
    { label: "Pending Verification", value: count("Pending Verification"), color: "#8a5a00" },
    { label: "Expiring Soon", value: count("Expiring Soon"), color: "#8a5a00" },
  ];

  const filterFields: [string, string, (v: string) => void, string[]][] = [
    ["Record Type", fType, setFType, RECORD_TYPES],
    ["Category", fCategory, setFCategory, CATEGORIES],
    ["Coordinator", fCoordinator, setFCoordinator, COORDINATORS],
    ["Expiry Within", fExpiry, setFExpiry, EXPIRY_OPTIONS.map((o) => o.label)],
  ];

  return (
    <>
      <style>{css}</style>

      <nav className="dc-crumb" aria-label="Breadcrumb">
        <Link to="/admin">Home</Link><ChevronRight size={14} /><b>Documents &amp; Alerts</b>
      </nav>

      <div className="sm-title-row">
        <div>
          <h1>Documents &amp; Alerts</h1>
          <p className="dc-desc">Every required document item across workers, projects and facilities — including items still missing.</p>
        </div>
      </div>

      <div className="dc-tabs" role="tablist">
        {TABS.map((t) => (
          <button key={t.label} role="tab" aria-selected={tab === t.label} className={tab === t.label ? "is-active" : ""} onClick={() => setTab(t.label)}>
            {t.label}
          </button>
        ))}
      </div>

      <section className="sm-card sm-stat-group" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
        {stats.map((s) => (
          <div key={s.label} className="sm-stat dc-stat">
            <div className="sm-stat-title">{s.label}</div>
            <div className="sm-stat-value" style={{ color: s.color }}>{s.value}</div>
          </div>
        ))}
      </section>

      <section className="sm-card dc-panel">
        <div className="dc-toolbar">
          <label className="dc-search">
            <Search size={16} />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Filter items" />
          </label>
          <button
            type="button"
            className={`sm-btn sm-btn-outline${showFilters || filtersActive ? " dc-btn-on" : ""}`}
            aria-expanded={showFilters}
            onClick={() => setShowFilters((v) => !v)}
          >
            <SlidersHorizontal size={16} /> Filters
          </button>
        </div>

        {showFilters && (
          <div className="dc-filters">
            <div className="dc-filters-grid">
              {filterFields.map(([label, value, setValue, options]) => (
                <label className="dc-field" key={label}>
                  <span>{label}</span>
                  <div className="dc-select">
                    <select value={value} onChange={(e) => setValue(e.target.value)}>
                      <option value="Any">Any</option>
                      {options.map((o) => (
                        <option key={o} value={o}>{o}</option>
                      ))}
                    </select>
                    <ChevronDown size={18} />
                  </div>
                </label>
              ))}
            </div>
          </div>
        )}

        <div className="sm-table-wrap">
          <table className="sm-table dc-table">
            <thead>
              <tr>
                <th>Linked Profile</th><th>Category</th><th>Document</th><th>Status</th><th>Valid Until</th>
                <th>Days Remaining</th><th>Uploaded By</th><th>Upload Date</th><th>Responsible</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((d) => {
                const left = daysRemaining(d);
                return (
                  <tr key={`${d.profile}-${d.category}`}>
                    <td>
                      {/* Opens the Workers page directly on this worker's profile */}
                      <Link
                        to={`/admin/workers?worker=${encodeURIComponent(d.profile)}`}
                        className="dc-profile"
                      >
                        {d.profile}
                      </Link>
                    </td>
                    <td>{d.category}</td>
                    <td>{d.file ?? "— (not uploaded)"}</td>
                    <td><span className={`sm-pill ${PILL[d.status]}`}>{d.status}</span></td>
                    <td>{d.validUntil ? fmt(d.validUntil) : "No expiry"}</td>
                    <td>{left === null ? "—" : `${left} days`}</td>
                    <td>{d.uploadedBy ?? "—"}</td>
                    <td>{fmt(d.uploadDate)}</td>
                    <td>{d.responsible}</td>
                  </tr>
                );
              })}
              {rows.length === 0 && (
                <tr><td colSpan={9} className="dc-none">No items match the current filters.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

const css = `
.dc-crumb{display:flex;align-items:center;gap:8px;font-size:16px;color:var(--muted);margin-bottom:11px}
.dc-crumb b{color:var(--text);font-weight:600}
.dc-tabs{display:flex;gap:4px;overflow-x:auto;border-bottom:1px solid var(--line);margin-bottom:19px;scrollbar-width:none}
.dc-tabs::-webkit-scrollbar{display:none}
.dc-tabs button{flex:none;padding:12px 18px;font-size:17px;color:var(--muted);white-space:nowrap;border-bottom:2px solid transparent;margin-bottom:-1px}
.dc-tabs button.is-active{color:var(--green);font-weight:600;border-bottom-color:var(--green)}
.dc-stat{min-height:0;padding:16px 22px}
.dc-stat .sm-stat-value{margin-top:6px}
.dc-panel{padding:0 0 10px;margin-bottom:19px}
.dc-toolbar{display:flex;align-items:center;justify-content:space-between;gap:14px;padding:20px 22px 14px}
.dc-search{display:flex;align-items:center;gap:10px;width:320px;max-width:100%;height:42px;padding:0 14px;border:1px solid var(--line);border-radius:8px;background:#faf9f6;color:var(--muted)}
.dc-search input{flex:1;border:0;background:transparent;outline:none;font-size:16px;color:var(--text)}
.dc-table{min-width:1300px}
.dc-table th,.dc-table td{white-space:nowrap;padding-left:18px}
.dc-table td{padding-top:12px;padding-bottom:12px}
.dc-profile{font-weight:600}
.dc-profile:hover{color:var(--green);}
.dc-table tbody tr:hover{background: #faf9f6}
.dc-none{padding:34px 18px!important;color:var(--muted)}

/* ---- Compact sizing (smaller cards and fonts) ---- */
.dc-crumb{font-size:13px;margin-bottom:8px}
.dc-desc{font-size:14px;line-height:1.45}
.dc-tabs{margin-bottom:12px}
.dc-tabs button{padding:8px 14px;font-size:14px}
.dc-stat{padding:9px 14px}
.dc-stat .sm-stat-title{font-size:12.5px}
.dc-stat .sm-stat-value{font-size:22px;line-height:1.1;margin-top:3px}
.dc-panel{padding:0 0 8px;margin-bottom:12px}
.dc-toolbar{gap:10px;padding:12px 16px 10px}
.dc-search{width:260px;height:34px;padding:0 10px;gap:8px;font-size:13.5px}
.dc-search input{font-size:13.5px}
.dc-toolbar .sm-btn{height:34px;padding:0 12px;font-size:13.5px}
.dc-table{font-size:13.5px}
.dc-table th{font-size:12.5px;padding-top:8px;padding-bottom:8px}
.dc-table td{padding-top:8px;padding-bottom:8px}
.dc-table .sm-pill{font-size:12.5px;padding:2px 10px}
.dc-none{padding:22px 18px!important;font-size:13.5px}

/* ---- Filters panel ---- */
.dc-btn-on{background: #f1f0eb !important}
.dc-filters{margin:4px 16px 12px;padding:12px 14px 14px;border:1px solid var(--line);border-radius:10px;background:#faf9f6}
.dc-filters-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px 14px}
.dc-field{display:flex;flex-direction:column;gap:5px}
.dc-field>span{color: #4a4a45;font-weight:500;font-size:12.5px}
.dc-select{position:relative;height:36px}
.dc-select select{width:100%;height:36px;padding:0 34px 0 12px;border:1px solid var(--line);border-radius:7px;background: #fff;font:inherit;font-size:13.5px;color:var(--text);outline:none;box-sizing:border-box;appearance:none;-webkit-appearance:none;cursor:pointer}
.dc-select select:focus{border-color: #166534;box-shadow:0 0 0 3px rgba(22,101,52,.15)}
.dc-select svg{position:absolute;right:11px;top:50%;transform:translateY(-50%);pointer-events:none;color:var(--text)}
@media (max-width:900px){.dc-filters-grid{grid-template-columns:1fr 1fr}}
@media (max-width:560px){.dc-filters-grid{grid-template-columns:1fr}}
`;
