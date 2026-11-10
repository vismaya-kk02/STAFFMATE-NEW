import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronRight, Columns3, Download, Plus, Search, SlidersHorizontal } from "lucide-react";

/* ---------- Types & data ---------- */
interface Facility {
  name: string;
  subtitle?: string;
  location: string;
  contracted: number;
  residents: number;
  since: string;
  projects: string[];
  status: "Active" | "Illustrative";
}

const FACILITIES: Facility[] = [
  { name: "Villa Rezidencia Trnava", location: "Trnava", contracted: 40, residents: 2, since: "01 Mar 2023", projects: ["AutoParts Slovakia", "CNC Machining Hall"], status: "Active" },
  { name: "Hostel Nitra Central", location: "Nitra", contracted: 28, residents: 2, since: "15 Jun 2024", projects: ["Line 3 Assembly"], status: "Active" },
  { name: "Ubytovňa Sereď", location: "Sereď", contracted: 60, residents: 0, since: "09 Aug 2022", projects: ["Cold Storage Facility"], status: "Active" },
  { name: "Penzión Žilina Sever", location: "Žilina", contracted: 50, residents: 0, since: "18 Jun 2024", projects: ["Line 3 Assembly"], status: "Active" },
  { name: "Bratislava Workers Lodge", location: "Bratislava", contracted: 44, residents: 0, since: "11 Nov 2024", projects: ["Warehouse Ops"], status: "Active" },
  { name: "Demo Facility — Capacity Example", subtitle: "Illustrative capacity example", location: "Illustrative", contracted: 20, residents: 15, since: "01 Jan 2026", projects: [], status: "Illustrative" },
];

const available = (f: Facility) => f.contracted - f.residents;
const utilisation = (f: Facility) => (f.contracted ? Math.round((f.residents / f.contracted) * 100) : 0);

/* ---------- Page ---------- */
export default function AccommodationPage(): React.JSX.Element {
  const [query, setQuery] = useState("");
  const [onlyAvailable, setOnlyAvailable] = useState(false);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return FACILITIES.filter((f) => !q || f.name.toLowerCase().includes(q) || f.location.toLowerCase().includes(q))
      .filter((f) => !onlyAvailable || available(f) > 0);
  }, [query, onlyAvailable]);

  // Totals cover real facilities only; the demo row is illustrative.
  const real = FACILITIES.filter((f) => f.status === "Active");
  const contracted = real.reduce((a, f) => a + f.contracted, 0);
  const occupied = real.reduce((a, f) => a + f.residents, 0);
  const stats = [
    { label: "Active Facilities", value: real.length },
    { label: "Contracted Beds", value: contracted },
    { label: "Occupied Beds", value: occupied },
    { label: "Available Beds", value: contracted - occupied, good: true },
  ];

  const exportCsv = () => {
    const head = "Facility,Location,Contracted,Current Residents,Available,Utilisation,Contracted Since,Linked Projects,Status";
    const body = rows.map((f) =>
      [f.name, f.location, f.contracted, f.residents, available(f), `${utilisation(f)}%`, f.since, f.projects.join("; "), f.status]
        .map((v) => `"${v}"`).join(","));
    const url = URL.createObjectURL(new Blob([[head, ...body].join("\n")], { type: "text/csv" }));
    Object.assign(document.createElement("a"), { href: url, download: "accommodation.csv" }).click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <style>{css}</style>

      <nav className="am-crumb" aria-label="Breadcrumb">
        <Link to="/admin">Home</Link><ChevronRight size={14} /><b>Accommodation</b>
      </nav>

      <div className="sm-title-row">
        <div>
          <h1>Accommodation</h1>
          <p className="am-desc">
            Contracted beds, current residents and available capacity — calculated from actual check-ins, not a
            manually entered total. Capacity refers to beds contracted by Staffmate, not the building's total capacity.
          </p>
        </div>
        <button className="sm-btn sm-btn-primary"><Plus size={16} /> Add Facility</button>
      </div>

      <section className="sm-card sm-stat-group" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
        {stats.map((s) => (
          <div key={s.label} className="sm-stat am-stat">
            <div className="sm-stat-title">{s.label}</div>
            <div className="sm-stat-value" style={s.good ? { color: "var(--green)" } : undefined}>{s.value}</div>
          </div>
        ))}
      </section>

      <section className="sm-card am-panel">
        <div className="am-toolbar">
          <label className="am-search">
            <Search size={16} />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Facility or location" />
          </label>
          <label className="am-check">
            <input type="checkbox" checked={onlyAvailable} onChange={(e) => setOnlyAvailable(e.target.checked)} />
            Available beds only
          </label>
          <button className="sm-btn sm-btn-outline"><SlidersHorizontal size={16} /> Filters</button>
          <button className="sm-btn sm-btn-outline"><Columns3 size={16} /> Columns</button>
          <button className="sm-btn sm-btn-outline" onClick={exportCsv}><Download size={16} /> Export</button>
        </div>

        <div className="sm-table-wrap">
          <table className="sm-table am-table">
            <thead>
              <tr>
                <th>Facility</th><th>Location</th><th>Contracted</th><th>Current Residents</th>
                <th>Available</th><th>Utilisation</th><th>Contracted Since</th><th>Linked Projects</th><th>Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((f) => (
                <tr key={f.name}>
                  <td><strong>{f.name}</strong>{f.subtitle && <small>{f.subtitle}</small>}</td>
                  <td>{f.location}</td>
                  <td>{f.contracted}</td>
                  <td>{f.residents}</td>
                  <td>{available(f)}</td>
                  <td>{utilisation(f)}%</td>
                  <td>{f.since}</td>
                  <td>{f.projects.length ? f.projects.join(", ") : "—"}</td>
                  <td><span className={`sm-pill ${f.status === "Active" ? "ok" : "muted"}`}>{f.status}</span></td>
                </tr>
              ))}
              {rows.length === 0 && <tr><td colSpan={9} className="am-none">No facilities match your search.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

const css = `
.am-crumb{display:flex;align-items:center;gap:8px;font-size:16px;color:var(--muted);margin-bottom:11px}
.am-crumb b{color:var(--text);font-weight:600}
.am-desc{max-width:780px}
.am-stat{min-height:0;padding:16px 22px}
.am-stat .sm-stat-value{margin-top:6px}
.am-panel{padding:0 0 12px;margin-bottom:19px}
.am-toolbar{display:flex;align-items:center;justify-content:space-between;gap:14px;padding:20px 22px 14px}
.am-search{display:flex;align-items:center;gap:10px;width:320px;max-width:100%;height:42px;padding:0 14px;border:1px solid var(--line);border-radius:8px;background:#faf9f6;color:var(--muted)}
.am-search input{flex:1;border:0;background:transparent;outline:none;font-size:16px;color:var(--text)}
.am-check{display:flex;align-items:center;gap:12px;font-size:17px;cursor:pointer}
.am-check input{width:20px;height:20px;accent-color:var(--green)}
.am-table{min-width:1100px}
.am-table th,.am-table td{white-space:nowrap;padding-left:18px}
.am-table td{padding-top:14px;padding-bottom:14px}
.am-table small{margin-top:2px}
.am-none{text-align:center;color:var(--muted);padding:28px 0!important}
.sm-pill.muted{background:#eeede8;color:var(--muted)}

/* ---- Compact sizing (smaller cards and fonts) ---- */
.am-crumb{font-size:13px;margin-bottom:8px}
.am-desc{font-size:14px;line-height:1.45}
.am-stat{padding:9px 14px}
.am-stat .sm-stat-title{font-size:12.5px}
.am-stat .sm-stat-value{font-size:22px;line-height:1.1;margin-top:3px}
.am-panel{padding:0 0 10px;margin-bottom:12px}
.am-toolbar{gap:10px;padding:12px 16px 10px}
.am-search{width:260px;height:34px;padding:0 10px;gap:8px;font-size:13.5px}
.am-search input{font-size:13.5px}
.am-check{gap:8px;font-size:13.5px}
.am-check input{width:16px;height:16px}
.am-toolbar .sm-btn{height:34px;padding:0 12px;font-size:13.5px}
.am-table{font-size:13.5px}
.am-table th{font-size:12.5px;padding-top:8px;padding-bottom:8px}
.am-table td{padding-top:8px;padding-bottom:8px}
.am-table small{font-size:12px;margin-top:1px}
.am-table .sm-pill{font-size:12.5px;padding:2px 10px}
`;
