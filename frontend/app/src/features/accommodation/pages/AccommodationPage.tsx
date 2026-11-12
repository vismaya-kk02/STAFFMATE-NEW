import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Building2, ChevronDown, ChevronRight, Columns3, Download, Pencil, Plus, Search, SlidersHorizontal, X,
} from "lucide-react";

/* ---------- Types & data ---------- */
interface Resident {
  name: string;
  sp: "Registered" | "No evidence";
  status: string;
  project?: string;
  coordinator: string;
  checkIn: string;
  plannedDeparture?: string;
}

interface FacilityDetail {
  address: string;
  mainContact: string;
  contractEnd: string;
  residentsList: Resident[];
  history: { date: string; event: string; by?: string }[];
  contacts: { name: string; role: string; phone: string; email: string }[];
  documents: { title: string; meta: string }[];
  projectCoordinators: Record<string, string>;
  tasks: { title: string; due?: string }[];
}

interface Facility {
  name: string;
  subtitle?: string;
  location: string;
  operator?: string;
  responsible?: string;
  contracted: number;
  residents: number;
  since: string;
  projects: string[];
  status: "Active" | "Illustrative";
}

const INITIAL_FACILITIES: Facility[] = [
  { name: "Villa Rezidencia Trnava", location: "Trnava", operator: "Rezidencia Partner s.r.o.", responsible: "Jana Kollárová", contracted: 40, residents: 2, since: "01 Mar 2023", projects: ["AutoParts Slovakia", "CNC Machining Hall"], status: "Active" },
  { name: "Hostel Nitra Central", location: "Nitra", contracted: 28, residents: 2, since: "15 Jun 2024", projects: ["Line 3 Assembly"], status: "Active" },
  { name: "Ubytovňa Sereď", location: "Sereď", contracted: 60, residents: 0, since: "09 Aug 2022", projects: ["Cold Storage Facility"], status: "Active" },
  { name: "Penzión Žilina Sever", location: "Žilina", contracted: 50, residents: 0, since: "18 Jun 2024", projects: ["Line 3 Assembly"], status: "Active" },
  { name: "Bratislava Workers Lodge", location: "Bratislava", contracted: 44, residents: 0, since: "11 Nov 2024", projects: ["Warehouse Ops"], status: "Active" },
  { name: "Demo Facility — Capacity Example", subtitle: "Illustrative capacity example", location: "Illustrative", contracted: 20, residents: 15, since: "01 Jan 2026", projects: [], status: "Illustrative" },
];

/** Rich detail records keyed by facility name. Others fall back to defaults. */
const FACILITY_DETAILS: Record<string, FacilityDetail> = {
  "Villa Rezidencia Trnava": {
    address: "Kollárova 8, 917 01 Trnava",
    mainContact: "Silvia Hraško",
    contractEnd: "Ongoing",
    residentsList: [
      { name: "Ivan Petrenko", sp: "No evidence", status: "Available", project: "AutoParts Slovakia", coordinator: "Jana Kollárová", checkIn: "03 Feb 2025" },
      { name: "Elena Popescu", sp: "Registered", status: "Available", coordinator: "Jana Kollárová", checkIn: "15 Mar 2025" },
    ],
    history: [{ date: "01 Mar 2023", event: "Contract started — 40 beds", by: "Jana Kollárová" }],
    contacts: [{ name: "Silvia Hraško", role: "Property Manager", phone: "+421 900 555 666", email: "silvia@rezidenciapartner.sk" }],
    documents: [
      { title: "Accommodation Agreement", meta: "Signed 01 Mar 2023" },
      { title: "House Rules", meta: "Updated 12 Aug 2026" },
    ],
    projectCoordinators: { "AutoParts Slovakia": "Jana Kollárová", "CNC Machining Hall": "Jana Kollárová" },
    tasks: [],
  },
};

const defaultDetail = (f: Facility): FacilityDetail => ({
  address: f.location,
  mainContact: "—",
  contractEnd: "Ongoing",
  residentsList: [],
  history: [{ date: f.since, event: `Contract started — ${f.contracted} beds`, by: f.responsible }],
  contacts: [],
  documents: [],
  projectCoordinators: {},
  tasks: [],
});

const RESPONSIBLE_PEOPLE = ["Jana Kollárová", "Peter Novák", "Marek Horváth", "Lucia Veselá"];

const available = (f: Facility) => f.contracted - f.residents;
const utilisation = (f: Facility) => (f.contracted ? Math.round((f.residents / f.contracted) * 100) : 0);

const todayIso = () => new Date().toISOString().slice(0, 10);
const formatSince = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

/* ---------- Add Facility modal ---------- */
interface FormState {
  name: string;
  location: string;
  operator: string;
  responsible: string;
  capacity: string;
  since: string;
}

const emptyForm = (): FormState => ({
  name: "",
  location: "",
  operator: "",
  responsible: RESPONSIBLE_PEOPLE[0],
  capacity: "",
  since: todayIso(),
});

function AddFacilityModal({ onClose, onSave }: { onClose: () => void; onSave: (f: Facility) => void }) {
  const [form, setForm] = useState<FormState>(emptyForm);
  const [touched, setTouched] = useState(false);

  const set = (key: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value }));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const capacity = Number(form.capacity);
  const invalid = {
    name: !form.name.trim(),
    location: !form.location.trim(),
    capacity: !form.capacity || !Number.isFinite(capacity) || capacity <= 0,
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (invalid.name || invalid.location || invalid.capacity) return;
    onSave({
      name: form.name.trim(),
      location: form.location.trim(),
      operator: form.operator.trim() || undefined,
      responsible: form.responsible,
      contracted: Math.round(capacity),
      residents: 0,
      since: formatSince(form.since || todayIso()),
      projects: [],
      status: "Active",
    });
  };

  return (
    <div className="am-overlay" onMouseDown={onClose}>
      <form
        className="am-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="am-modal-title"
        onMouseDown={(e) => e.stopPropagation()}
        onSubmit={submit}
        noValidate
      >
        <div className="am-modal-head">
          <h2 id="am-modal-title">Add Accommodation Facility</h2>
          <button type="button" className="am-modal-close" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        <div className="am-form-grid">
          <label className="am-field">
            <span>Facility Name <i>*</i></span>
            <input
              className={touched && invalid.name ? "err" : ""}
              value={form.name}
              onChange={set("name")}
              placeholder="e.g. Penzión Nitra East"
              autoFocus
            />
          </label>

          <label className="am-field">
            <span>Location <i>*</i></span>
            <input
              className={touched && invalid.location ? "err" : ""}
              value={form.location}
              onChange={set("location")}
              placeholder="City"
            />
          </label>

          <label className="am-field">
            <span>Operator</span>
            <input value={form.operator} onChange={set("operator")} placeholder="Property partner" />
          </label>

          <label className="am-field">
            <span>Responsible Person</span>
            <div className="am-select">
              <select value={form.responsible} onChange={set("responsible")}>
                {RESPONSIBLE_PEOPLE.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
              <ChevronDown size={18} />
            </div>
          </label>

          <label className="am-field">
            <span>Contracted Bed Capacity <i>*</i></span>
            <input
              className={touched && invalid.capacity ? "err" : ""}
              type="number"
              min={1}
              value={form.capacity}
              onChange={set("capacity")}
              placeholder="e.g. 30"
            />
          </label>

          <label className="am-field">
            <span>Contracted Since</span>
            <input type="date" value={form.since} onChange={set("since")} />
          </label>
        </div>

        {touched && (invalid.name || invalid.location || invalid.capacity) && (
          <p className="am-form-error">Fill in the facility name, location and a bed capacity above 0.</p>
        )}

        <button type="submit" className="am-save">Save Facility</button>
      </form>
    </div>
  );
}

/* ---------- Edit Facility modal ---------- */
function EditFacilityModal({
  facility,
  takenNames,
  onClose,
  onSave,
}: {
  facility: Facility;
  takenNames: string[];
  onClose: () => void;
  onSave: (f: Facility) => void;
}) {
  const [name, setName] = useState(facility.name);
  const [responsible, setResponsible] = useState(facility.responsible ?? RESPONSIBLE_PEOPLE[0]);
  const [capacity, setCapacity] = useState(String(facility.contracted));
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const cap = Number(capacity);
  const nameBad = !name.trim();
  const nameTaken = takenNames.includes(name.trim().toLowerCase());
  const capBad = !capacity || !Number.isFinite(cap) || cap <= 0;
  const belowResidents = !capBad && cap < facility.residents;
  const hasError = nameBad || nameTaken || capBad || belowResidents;

  // Keep the current responsible person selectable even if they're not in the default list.
  const people = RESPONSIBLE_PEOPLE.includes(responsible) ? RESPONSIBLE_PEOPLE : [responsible, ...RESPONSIBLE_PEOPLE];

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (hasError) return;
    onSave({ ...facility, name: name.trim(), responsible, contracted: Math.round(cap) });
  };

  return (
    <div className="am-overlay" onMouseDown={onClose}>
      <form
        className="am-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="em-modal-title"
        onMouseDown={(e) => e.stopPropagation()}
        onSubmit={submit}
        noValidate
      >
        <div className="am-modal-head">
          <h2 id="em-modal-title">Edit Facility</h2>
          <button type="button" className="am-modal-close" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        <div className="am-form-grid">
          <label className="am-field">
            <span>Facility Name</span>
            <input
              className={touched && (nameBad || nameTaken) ? "err" : ""}
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </label>

          <label className="am-field">
            <span>Responsible Person</span>
            <div className="am-select">
              <select value={responsible} onChange={(e) => setResponsible(e.target.value)}>
                {people.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
              <ChevronDown size={18} />
            </div>
          </label>

          <label className="am-field">
            <span>Contracted Bed Capacity</span>
            <input
              className={touched && (capBad || belowResidents) ? "err" : ""}
              type="number"
              min={1}
              value={capacity}
              onChange={(e) => setCapacity(e.target.value)}
            />
          </label>
        </div>

        {touched && hasError && (
          <p className="am-form-error">
            {nameBad
              ? "Enter a facility name."
              : nameTaken
              ? "Another facility already uses this name."
              : capBad
              ? "Enter a bed capacity above 0."
              : `Capacity can't be lower than the ${facility.residents} current residents.`}
          </p>
        )}

        <p className="am-form-note">
          Capacity changes are recorded with an effective date so historical utilisation stays accurate.
        </p>

        <button type="submit" className="am-save">Save Changes</button>
      </form>
    </div>
  );
}

/* ---------- Facility detail view ---------- */
const TABS = ["General", "Current Residents", "Stay History", "Contacts", "Documents", "Projects", "Tasks & Notes"] as const;
type Tab = (typeof TABS)[number];

function FacilityDetailView({
  facility,
  takenNames,
  onBack,
  onUpdate,
}: {
  facility: Facility;
  takenNames: string[];
  onBack: () => void;
  onUpdate: (updated: Facility) => void;
}) {
  const [tab, setTab] = useState<Tab>("General");
  const [showEdit, setShowEdit] = useState(false);
  const d = FACILITY_DETAILS[facility.name] ?? defaultDetail(facility);

  const generalRows: [string, React.ReactNode][] = [
    ["Address", d.address],
    ["Operator", facility.operator || "—"],
    ["Main Contact", d.mainContact],
    ["Responsible Staffmate Person", facility.responsible || "—"],
    ["Contract Start", facility.since],
    ["Contract End", d.contractEnd],
    ["Contracted Capacity", `${facility.contracted} beds`],
    ["Linked Projects", facility.projects.length ? facility.projects.join(", ") : "—"],
  ];

  return (
    <>
      <nav className="am-crumb" aria-label="Breadcrumb">
        <Link to="/admin">Home</Link><ChevronRight size={14} />
        <button type="button" className="fd-crumb-link" onClick={onBack}>Accommodation</button>
        <ChevronRight size={14} />
        <b>{facility.name}</b>
      </nav>

      <header className="fd-card fd-head">
        <div className="fd-icon"><Building2 size={26} /></div>
        <div className="fd-head-main">
          <h1>{facility.name}</h1>
          <p className="fd-addr">{d.address}</p>
          <div className="fd-pills">
            <span className={`fd-pill ${facility.status === "Active" ? "ok" : "muted"}`}>{facility.status}</span>
            <span className="fd-pill info">{facility.contracted} contracted</span>
            <span className="fd-pill ok">{facility.residents} residents</span>
            <span className="fd-pill ok">{available(facility)} available</span>
            <span className="fd-pill muted">{utilisation(facility)}% utilisation</span>
          </div>
        </div>
        <button type="button" className="fd-edit" onClick={() => setShowEdit(true)}><Pencil size={15} /> Edit</button>
      </header>

      {showEdit && (
        <EditFacilityModal
          facility={facility}
          takenNames={takenNames}
          onClose={() => setShowEdit(false)}
          onSave={(updated) => {
            onUpdate(updated);
            setShowEdit(false);
          }}
        />
      )}

      <div className="fd-tabs" role="tablist">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            className={tab === t ? "active" : ""}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </div>

      <div role="tabpanel">
        {tab === "General" && (
          <div className="fd-card fd-kv">
            {generalRows.map(([k, v]) => (
              <div className="fd-kv-row" key={k}>
                <span className="fd-kv-key">{k}</span>
                <span className="fd-kv-val">{v}</span>
              </div>
            ))}
          </div>
        )}

        {tab === "Current Residents" &&
          (d.residentsList.length ? (
            <div className="fd-card fd-table-card">
              <div className="fd-scroll">
                <table className="fd-table">
                  <thead>
                    <tr>
                      <th>Worker</th><th>SP</th><th>Status</th><th>Project</th><th>Coordinator</th><th>Check-in</th><th>Planned Departure</th>
                    </tr>
                  </thead>
                  <tbody>
                    {d.residentsList.map((r) => (
                      <tr key={r.name}>
                        <td><strong>{r.name}</strong></td>
                        <td><span className={`fd-pill ${r.sp === "Registered" ? "ok" : "bad"}`}>SP – {r.sp}</span></td>
                        <td><span className="fd-pill warn">{r.status}</span></td>
                        <td>{r.project ? <strong>{r.project}</strong> : "—"}</td>
                        <td>{r.coordinator}</td>
                        <td>{r.checkIn}</td>
                        <td>{r.plannedDeparture || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="fd-card fd-empty">No current residents.</div>
          ))}

        {tab === "Stay History" &&
          (d.history.length ? (
            <div className="fd-card fd-table-card">
              <div className="fd-scroll">
                <table className="fd-table">
                  <thead>
                    <tr><th style={{ width: "26%" }}>Date</th><th>Event</th></tr>
                  </thead>
                  <tbody>
                    {d.history.map((h, i) => (
                      <tr key={i}>
                        <td>{h.date}</td>
                        <td>{h.event} {h.by && <span className="fd-muted">(by {h.by})</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="fd-card fd-empty">No stay history yet.</div>
          ))}

        {tab === "Contacts" &&
          (d.contacts.length ? (
            <div className="fd-card fd-list">
              {d.contacts.map((c) => (
                <div className="fd-list-item" key={c.email}>
                  <strong>{c.name}</strong>
                  <span className="fd-muted">{c.role} · {c.phone} · {c.email}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="fd-card fd-empty">No contacts added.</div>
          ))}

        {tab === "Documents" && (
          <div className="fd-card fd-list">
            {d.documents.length === 0 && <div className="fd-empty-inline">No documents uploaded.</div>}
            {d.documents.map((doc) => (
              <div className="fd-list-item" key={doc.title}>
                <strong>{doc.title}</strong>
                <span className="fd-muted">{doc.meta}</span>
              </div>
            ))}
            <p className="fd-note">
              Accommodation agreements are shown in preview. Coordinators can preview them but cannot download or export them.
            </p>
          </div>
        )}

        {tab === "Projects" &&
          (facility.projects.length ? (
            <div className="fd-card fd-table-card">
              <div className="fd-scroll">
                <table className="fd-table">
                  <thead>
                    <tr><th>Project</th><th>Coordinator</th><th>Residents from this Project</th></tr>
                  </thead>
                  <tbody>
                    {facility.projects.map((p) => (
                      <tr key={p}>
                        <td><strong>{p}</strong></td>
                        <td>{d.projectCoordinators[p] || facility.responsible || "—"}</td>
                        <td>{d.residentsList.filter((r) => r.project === p).length}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="fd-card fd-empty">No projects linked to this facility.</div>
          ))}

        {tab === "Tasks & Notes" &&
          (d.tasks.length ? (
            <div className="fd-card fd-list">
              {d.tasks.map((t) => (
                <div className="fd-list-item" key={t.title}>
                  <strong>{t.title}</strong>
                  {t.due && <span className="fd-muted">Due {t.due}</span>}
                </div>
              ))}
            </div>
          ) : (
            <div className="fd-card fd-empty">No open tasks linked to this facility.</div>
          ))}
      </div>
    </>
  );
}

/* ---------- Page ---------- */
export default function AccommodationPage(): React.JSX.Element {
  const [facilities, setFacilities] = useState<Facility[]>(INITIAL_FACILITIES);
  const [query, setQuery] = useState("");
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [selected, setSelected] = useState<Facility | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [fProject, setFProject] = useState("Any");
  const [fPerson, setFPerson] = useState("Any");
  const [fStatus, setFStatus] = useState("Any");

  const projectOptions = useMemo(
    () => Array.from(new Set(facilities.flatMap((f) => f.projects))).sort(),
    [facilities],
  );
  const personOptions = useMemo(
    () => Array.from(new Set([...RESPONSIBLE_PEOPLE, ...facilities.map((f) => f.responsible).filter(Boolean) as string[]])),
    [facilities],
  );
  const filtersActive = fProject !== "Any" || fPerson !== "Any" || fStatus !== "Any";
  const clearFilters = () => {
    setFProject("Any");
    setFPerson("Any");
    setFStatus("Any");
  };

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return facilities
      .filter((f) => !q || f.name.toLowerCase().includes(q) || f.location.toLowerCase().includes(q))
      .filter((f) => !onlyAvailable || available(f) > 0)
      .filter((f) => fProject === "Any" || f.projects.includes(fProject))
      .filter((f) => fPerson === "Any" || f.responsible === fPerson)
      .filter((f) => fStatus === "Any" || f.status === fStatus);
  }, [facilities, query, onlyAvailable, fProject, fPerson, fStatus]);

  // Totals cover real facilities only; the demo row is illustrative.
  const real = facilities.filter((f) => f.status === "Active");
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

  const handleSave = (f: Facility) => {
    setFacilities((prev) => [...prev.filter((x) => x.status === "Active"), f, ...prev.filter((x) => x.status !== "Active")]);
    setShowAdd(false);
  };

  const handleUpdate = (updated: Facility) => {
    if (!selected) return;
    // Detail records are keyed by name, so carry them over if the facility is renamed.
    if (updated.name !== selected.name && FACILITY_DETAILS[selected.name]) {
      FACILITY_DETAILS[updated.name] = FACILITY_DETAILS[selected.name];
      delete FACILITY_DETAILS[selected.name];
    }
    setFacilities((prev) => prev.map((x) => (x.name === selected.name ? updated : x)));
    setSelected(updated);
  };

  if (selected) {
    return (
      <>
        <style>{css}</style>
        <FacilityDetailView
          facility={selected}
          takenNames={facilities.filter((x) => x.name !== selected.name).map((x) => x.name.toLowerCase())}
          onBack={() => setSelected(null)}
          onUpdate={handleUpdate}
        />
      </>
    );
  }

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
        <button className="sm-btn sm-btn-primary" onClick={() => setShowAdd(true)}><Plus size={16} /> Add Facility</button>
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
          <button
            type="button"
            className={`sm-btn sm-btn-outline${showFilters || filtersActive ? " am-btn-on" : ""}`}
            aria-expanded={showFilters}
            onClick={() => setShowFilters((v) => !v)}
          >
            <SlidersHorizontal size={16} /> Filters
          </button>
          <button className="sm-btn sm-btn-outline"><Columns3 size={16} /> Columns</button>
          <button className="sm-btn sm-btn-outline" onClick={exportCsv}><Download size={16} /> Export</button>
        </div>

        {showFilters && (
          <div className="am-filters">
            <div className="am-filters-grid">
              {([
                ["Linked Project", fProject, setFProject, projectOptions],
                ["Responsible Person", fPerson, setFPerson, personOptions],
                ["Status", fStatus, setFStatus, ["Active", "Illustrative"]],
              ] as [string, string, (v: string) => void, string[]][]).map(([label, value, setValue, options]) => (
                <label className="am-field" key={label}>
                  <span>{label}</span>
                  <div className="am-select">
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
            <button type="button" className="am-clear" onClick={clearFilters}>Clear filters</button>
          </div>
        )}

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
                <tr
                  key={f.name}
                  className="am-row"
                  tabIndex={0}
                  onClick={() => setSelected(f)}
                  onKeyDown={(e) => e.key === "Enter" && setSelected(f)}
                >
                  <td>
                    <strong>{f.name}</strong>
                    {f.subtitle && <small>{f.subtitle}</small>}
                  </td>
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

      {showAdd && <AddFacilityModal onClose={() => setShowAdd(false)} onSave={handleSave} />}
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

/* ---- Filters panel ---- */
.am-btn-on{background:#f1f0eb !important}
.am-filters{margin:4px 16px 12px;padding:12px 14px 6px;border:1px solid var(--line);border-radius:10px;background:#faf9f6}
.am-filters-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px 14px}
.am-filters .am-field>span{font-size:12.5px}
.am-clear{margin:6px 0 4px;padding:6px 4px;border:0;background:transparent;color: #166534;font:inherit;font-size:13.5px;font-weight:500;cursor:pointer}
.am-clear:hover{border:none;background-color: #e3eae5;border-radius:8px}
.am-clear:focus-visible{outline:2px solid #166534;outline-offset:2px;border-radius:4px}
@media (max-width:900px){.am-filters-grid{grid-template-columns:1fr 1fr}}
@media (max-width:560px){.am-filters-grid{grid-template-columns:1fr}}

/* ---- Clickable rows ---- */
.am-row{cursor:pointer}
.am-row:hover td,.am-row:focus-visible td{background:#f6f5f1}
.am-row:focus-visible{outline:2px solid #166534;outline-offset:-2px}

/* ---- Add Facility modal ---- */
.am-overlay{position:fixed;inset:0;z-index:1000;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(40,40,40,.38);backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px);overflow-y:auto}
.am-modal{width:100%;max-width:640px;background:#fff;border-radius:14px;padding:22px 24px 22px;box-shadow:0 20px 50px rgba(0,0,0,.22);color:var(--text)}
.am-modal-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:16px}
.am-modal-head h2{margin:0;font-size:17px;font-weight:600;line-height:1.2}
.am-modal-close{display:grid;place-items:center;width:26px;height:26px;border:0;border-radius:6px;background:transparent;color:var(--muted);cursor:pointer}
.am-modal-close:hover{background:#f3f2ee;color:var(--text)}
.am-form-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px 14px}
.am-field{display:flex;flex-direction:column;gap:5px}
.am-field>span{color:#4a4a45;font-weight:500;font-size:13px}
.am-field>span i{font-style:normal}
.am-field input,.am-field select{width:100%;height:36px;padding:0 12px;border:1px solid var(--line);border-radius:7px;background:#fff;font:inherit;font-size:13.5px;color:var(--text);outline:none;box-sizing:border-box}
.am-field input::placeholder{color:#8a8a84}
.am-field input:focus,.am-field select:focus{border-color:#166534;box-shadow:0 0 0 3px rgba(22,101,52,.15)}
.am-field input.err{border-color:#d14343}
.am-select{position:relative;height:36px}
.am-select select{height:36px;appearance:none;-webkit-appearance:none;padding-right:34px;cursor:pointer}
.am-select svg{position:absolute;right:11px;top:50%;transform:translateY(-50%);pointer-events:none;color:var(--text)}
.am-form-error{margin:10px 0 0;font-size:12.5px;color:#d14343}
.am-form-note{margin:14px 0 0;font-size:13px;line-height:1.4;color:#4a4a45}
.am-modal .am-save{margin-top:16px;height:36px;padding:0 16px;border:0;border-radius:7px;background:#166534 !important;background-color:#166534 !important;color:#fff !important;font-size:13.5px;font-weight:600;cursor:pointer}
.am-modal .am-save:hover{background:#14532d !important;background-color:#14532d !important}
.am-save:focus-visible,.am-modal-close:focus-visible{outline:2px solid #166534;outline-offset:2px}
@media (max-width:560px){
  .am-modal{padding:18px 16px}
  .am-form-grid{grid-template-columns:1fr}
}

/* ---- Facility detail view ---- */
.am-crumb a{color:var(--muted);text-decoration:none}
.am-crumb a:hover{color:var(--text)}
.fd-crumb-link{padding:0;border:0;background:transparent;font:inherit;color:var(--muted);cursor:pointer}
.fd-crumb-link:hover{color:var(--text)}

.fd-card{background:#fff;border:1px solid var(--line);border-radius:12px}

.fd-head{display:flex;align-items:flex-start;gap:16px;padding:16px 18px;margin-bottom:18px}
.fd-icon{display:grid;place-items:center;flex:none;width:52px;height:52px;border-radius:12px;background:#d9f2dc;color:#166534}
.fd-head-main{flex:1;min-width:0}
.fd-head h1{margin:0;font-size:20px;font-weight:700;line-height:1.2;color:var(--text)}
.fd-addr{margin:3px 0 10px;font-size:14px;color:var(--muted)}
.fd-pills{display:flex;flex-wrap:wrap;gap:8px}
.fd-head .fd-edit{display:inline-flex;align-items:center;justify-content:center;gap:10px;flex:none;height:32px;padding:0 12px;border:1px solid #dcdcd9 !important;border-radius:8px;background:#fff;color:var(--text);font:inherit;font-size:14px;font-weight:500;line-height:1;cursor:pointer;box-sizing:border-box}
.fd-head .fd-edit svg{width:14px;height:14px}
.fd-head .fd-edit:hover{background:#f6f5f1}
.fd-head .fd-edit:focus-visible{outline:2px solid #166534;outline-offset:2px}

.fd-pill{display:inline-flex;align-items:center;gap:7px;padding:3px 12px;border-radius:999px;font-size:12.5px;font-weight:500;white-space:nowrap;background:#eeede8;color:var(--muted)}
.fd-pill::before{content:"";width:6px;height:6px;border-radius:50%;background:currentColor}
.fd-pill.ok{background:#e4f4e6;color:#166534}
.fd-pill.info{background:#e3ecfb;color:#1d4ed8}
.fd-pill.warn{background:#f8efdc;color:#8a5a00}
.fd-pill.bad{background:#fdecec;color:#c0392b}
.fd-pill.muted{background:#eeede8;color:#55554f}

.fd-tabs{display:flex;gap:4px;overflow-x:auto;border-bottom:1px solid var(--line);margin-bottom:14px}
.fd-tabs button{position:relative;flex:none;padding:12px 16px;border:0;background:transparent;font:inherit;font-size:14px;font-weight:500;color:var(--muted);cursor:pointer}
.fd-tabs button:hover{color:var(--text)}
.fd-tabs button.active{color:#166534;font-weight:600}
.fd-tabs button.active::after{content:"";position:absolute;left:0;right:0;bottom:-1px;height:2px;background:#166534}
.fd-tabs button:focus-visible{outline:2px solid #166534;outline-offset:-2px;border-radius:6px}

.fd-kv{padding:14px 22px}
.fd-kv-row{display:grid;grid-template-columns:250px 1fr;gap:16px;padding:8px 0;font-size:14.5px;line-height:1.4}
.fd-kv-key{color:var(--muted)}
.fd-kv-val{color:var(--text)}

.fd-table-card{padding:6px 14px 8px}
.fd-scroll{overflow-x:auto}
.fd-table{width:100%;border-collapse:collapse;font-size:14px;min-width:760px}
.fd-table th{text-align:left;font-weight:500;font-size:13.5px;color:var(--muted);padding:12px 16px;border-bottom:1px solid var(--line);white-space:nowrap}
.fd-table td{padding:11px 16px;color:var(--text);white-space:nowrap}
.fd-table tbody tr+tr td{border-top:1px solid var(--line)}
.fd-table strong{font-weight:600}
.fd-muted{color:var(--muted)}

.fd-list{padding:10px 22px 16px}
.fd-list-item{display:flex;flex-direction:column;gap:3px;padding:12px 0;font-size:14px}
.fd-list-item strong{font-size:14.5px;font-weight:600}
.fd-list-item .fd-muted{font-size:13.5px}
.fd-note{margin:6px 0 0;font-size:13.5px;color:#4a4a45}
.fd-empty{padding:18px 22px;font-size:14px;color:var(--muted)}
.fd-empty-inline{padding:12px 0;font-size:14px;color:var(--muted)}

/* ---- Hide scrollbars (content still scrolls if it overflows) ---- */
.fd-tabs,.fd-scroll,.am-panel .sm-table-wrap{scrollbar-width:none;-ms-overflow-style:none}
.fd-tabs::-webkit-scrollbar,.fd-scroll::-webkit-scrollbar,.am-panel .sm-table-wrap::-webkit-scrollbar{display:none}

@media (max-width:720px){
  .fd-head{flex-wrap:wrap}
  .fd-kv-row{grid-template-columns:1fr;gap:2px}
}
`;
