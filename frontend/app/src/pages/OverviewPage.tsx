import React, { useState } from "react";
import {
  Factory, Building2, CircleCheck, CalendarDays, UserPlus, Inbox, ChevronRight,
  Clock, ClipboardCheck, TriangleAlert, Ban, FileWarning, Megaphone,
  CalendarClock, BookOpen, ListChecks,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import AddWorkerPage from "./AddWorkerPage";
import AsOfDateDialog from "./AsOfDateDialog";

/* ---------- Types ---------- */
type Tone = "default" | "danger";

interface Stat {
  title: string;
  value: number;
  caption: string;
  tone?: Tone;
  to?: string; // where the card navigates when clicked
}

interface QueueItem {
  count: number;
  title: string;
  subtitle: string;
  warn?: boolean;
}

/* ---------- Helpers ---------- */
/** "2026-09-09" -> "09 Sep 2026" */
const formatAsOf = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

/* ---------- Data ---------- */
const topStats: Stat[] = [
  { title: "Assigned to a project", value: 41, caption: "Active assignments today", to: "/admin/workers?tab=assigned" },
  { title: "Available", value: 9, caption: "Ready for a project", to: "/admin/workers?tab=avail" },
  { title: "In preparation", value: 3, caption: "Awaiting arrival / docs", to: "/admin/workers?tab=prep" },
  { title: "Accommodated", value: 4, caption: "Active stay today", to: "/admin/workers?tab=accom" },
  { title: "Documents needing action", value: 13, caption: "Items, not people", tone: "danger", to: "/admin/documents" },
];

const bottomStats: Stat[] = [
  // Clicking this card opens the Projects page (Projects tab)
  { title: "Active Projects", value: 4, caption: "of 6 total engagements", to: "/admin/projects" },
  // Clicking this card opens the Workers page with the "Pending action" tab selected
  { title: "Pending action", value: 12, caption: "Calculated from dated records", tone: "danger", to: "/admin/workers?tab=pending" },
  // Clicking this card opens the Accommodation page
  { title: "Available Beds", value: 218, caption: "Across 5 contracted facilities", to: "/admin/accommodation" },
];

const queue: QueueItem[] = [
  { count: 2, title: "Daily records overdue", subtitle: "Line 3 Assembly, CNC Machining Hall" },
  { count: 1, title: "Deregistration documents to verify", subtitle: "Andriy Ionescu", warn: true },
  { count: 2, title: "Social Insurance evidence to verify", subtitle: "Dmytro Kovalenko, Nikola Ionescu", warn: true },
  { count: 1, title: "Terminations missing documentation", subtitle: "Viorel Koval" },
  { count: 1, title: "Expected departures reported by coordinators", subtitle: "Taras Georgiev", warn: true },
  { count: 1, title: "Daily records to review after late verification", subtitle: "Petar Marković", warn: true },
];

const dailyStatus = [
  { project: "AutoParts Slovakia", state: "Confirmed", ok: true },
  { project: "Line 3 Assembly", state: "Not started · overdue", ok: false },
  { project: "Warehouse Ops", state: "Confirmed", ok: true },
  { project: "CNC Machining Hall", state: "Draft · overdue", ok: false },
];

const projects = [
  { name: "AutoParts Slovakia", client: "Bosch Automotive s.r.o.", location: "Trnava", coordinator: "Jana Kollárová", assigned: 11, additional: 7 },
  { name: "Line 3 Assembly", client: "Kia Motors Slovakia", location: "Žilina", coordinator: "Peter Vrábel", assigned: 11, additional: 0 },
  { name: "Warehouse Ops", client: "DHL Logistics SK", location: "Bratislava", coordinator: "Jana Kollárová", assigned: 11, additional: 2 },
];

const alerts = [
  { icon: <Ban size={18} />, who: "Ivan Petrenko", text: "— Blocked: SP not verified for 03 Feb 2025 start (AutoParts Slovakia)", warn: false },
  { icon: <FileWarning size={18} />, who: "Marko Jovanović", text: "— TRC / Residence Card expired 3 days ago", warn: false },
  { icon: <Ban size={18} />, who: "Anh Popa", text: "— Blocked: SP not verified for 07 Sep 2026 start (Line 3 Assembly)", warn: false },
  { icon: <ListChecks size={18} />, who: "1", text: "worker(s) have daily records to review after later Social Insurance verification", warn: true },
];

const beds = [
  { name: "Villa Rezidencia Trnava", detail: "40 contracted · 38 available", pct: "5%" },
  { name: "Hostel Nitra Central", detail: "28 contracted · 26 available", pct: "7%" },
];

const tasks = [
  { title: "Verify SP registration — Ivan Petrenko", meta: "Due 09 Sep 2026 · High priority" },
  { title: "Confirm TRC renewal — Marko Jovanović", meta: "Due 10 Sep 2026 · Medium priority" },
];

const events = [
  { title: "Arrival: Nguyen Van An", meta: "Planned 11 Sep 2026" },
  { title: "Arrival: Minh Koval", meta: "Planned 20 Sep 2026" },
  { title: "Arrival: Dragan Savchenko", meta: "Planned 30 Aug 2026" },
  { title: "Project start: Packaging Line B", meta: "15 Sep 2026" },
];

const contacts = [
  { name: "Jana Kollárová", detail: "Coordinator · Staffmate · +421 900 111 222" },
  { name: "Tomáš Beňo", detail: "Site Manager · Bosch Automotive s.r.o. · +421 900 333 444" },
  { name: "Silvia Hraško", detail: "Property Manager · Rezidencia Partner s.r.o. · +421 900 555 666" },
];

/* ---------- Components ---------- */
const StatCell: React.FC<{ stat: Stat; onClick?: () => void }> = ({ stat, onClick }) => (
  <div
    className={`sm-stat${onClick ? " is-clickable" : ""}`}
    role={onClick ? "button" : undefined}
    tabIndex={onClick ? 0 : undefined}
    style={onClick ? { cursor: "pointer" } : undefined}
    onClick={onClick}
    onKeyDown={(e: React.KeyboardEvent) => {
      if (onClick && (e.key === "Enter" || e.key === " ")) {
        e.preventDefault();
        onClick();
      }
    }}
  >
    <div className="sm-stat-title">{stat.title}</div>
    <div className={`sm-stat-value${stat.tone === "danger" ? " is-danger" : ""}`}>
      {stat.value}
    </div>
    <div className="sm-stat-caption">{stat.caption}</div>
  </div>
);

const StatGroup: React.FC<{ stats: Stat[]; cols: number }> = ({ stats, cols }) => {
  const navigate = useNavigate();
  return (
    <section
      className="sm-card sm-stat-group"
      style={{ "--cols": cols } as React.CSSProperties}
    >
      {stats.map((s) => (
        <StatCell key={s.title} stat={s} onClick={s.to ? () => navigate(s.to!) : undefined} />
      ))}
    </section>
  );
};

const WorkQueue: React.FC = () => (
  <section className="sm-card sm-queue">
    <div className="sm-queue-head">
      <h3><Inbox size={16} strokeWidth={1.6} /> My work queue</h3>
      <span>8 items in 6 groups</span>
    </div>
    {queue.map((q) => (
      <button key={q.title} className="sm-queue-row">
        <span className={`sm-count${q.warn ? " is-warn" : ""}`}>{q.count}</span>
        <span className="sm-queue-text">
          <strong>{q.title}</strong>
          <small>{q.subtitle}</small>
        </span>
        <ChevronRight size={16} />
      </button>
    ))}
  </section>
);

const CardHead: React.FC<{ icon: React.ReactNode; title: string; link?: string; to?: string }> = ({ icon, title, link, to }) => {
  const navigate = useNavigate();
  return (
    <div className="sm-ch">
      <h3>{icon} {title}</h3>
      {link && (
        <a
          href={to ?? "#"}
          className="sm-link"
          onClick={(e) => {
            e.preventDefault();
            if (to) navigate(to);
          }}
        >
          {link}
        </a>
      )}
    </div>
  );
};

const DailyStatus: React.FC = () => (
  <section className="sm-card sm-pad">
    <CardHead icon={<ClipboardCheck size={16} strokeWidth={1.6} />} title="Daily work status — 08 Sep 2026" link="Open" />
    <div className="sm-banner"><Clock size={16} /> 2 record(s) were due by 9:30 today (Slovak time) and are not confirmed.</div>
    {dailyStatus.map((d) => (
      <div key={d.project} className="sm-row">
        <div>
          <strong>{d.project}</strong>
          <small>11 workers on the list for 08 Sep 2026</small>
        </div>
        <div className="sm-row-right">
          <span className={`sm-pill ${d.ok ? "ok" : "bad"}`}>{d.state}</span>
          {!d.ok && <button className="sm-btn sm-btn-primary sm-btn-sm">Record</button>}
        </div>
      </div>
    ))}
  </section>
);

const ProjectsTable: React.FC = () => (
  <section className="sm-card sm-pad">
    <CardHead icon={<Factory size={16} strokeWidth={1.6} />} title="Projects & Assignments" link="View all" to="/admin/projects" />
    <div className="sm-table-wrap">
      <table className="sm-table">
        <thead>
          <tr><th>Project / Factory</th><th>Location</th><th>Coordinator</th><th>Assigned</th><th>Additional</th></tr>
        </thead>
        <tbody>
          {projects.map((p) => (
            <tr key={p.name}>
              <td><strong>{p.name}</strong><small>{p.client}</small></td>
              <td>{p.location}</td>
              <td>{p.coordinator}</td>
              <td>{p.assigned}</td>
              <td>{p.additional}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </section>
);

const CriticalAlerts: React.FC = () => (
  <section className="sm-card sm-pad">
    <CardHead icon={<TriangleAlert size={16} strokeWidth={1.6} />} title="Critical Alerts" link="View all" to="/admin/documents" />
    {alerts.map((a) => (
      <div key={a.who + a.text} className={`sm-alert${a.warn ? " is-warn" : ""}`}>
        {a.icon}
        <span className="sm-alert-text"><b>{a.who}</b> {a.text}</span>
        <a href="#" className="sm-link">Review</a>
      </div>
    ))}
  </section>
);

const AccommodationCard: React.FC = () => (
  <section className="sm-card sm-pad">
    <CardHead icon={<Building2 size={16} strokeWidth={1.6} />} title="Accommodation" link="View all" to="/admin/accommodation" />
    <dl className="sm-kv">
      <dt>Contracted</dt><dd>222 beds</dd>
      <dt>Occupied</dt><dd>4 beds</dd>
      <dt>Available</dt><dd className="good">218 beds</dd>
    </dl>
    {beds.map((b) => (
      <div key={b.name} className="sm-row">
        <div><strong>{b.name}</strong><small>{b.detail}</small></div>
        <span className="sm-pill ok">{b.pct}</span>
      </div>
    ))}
  </section>
);

const TasksCard: React.FC = () => (
  <section className="sm-card sm-pad">
    <CardHead icon={<CircleCheck size={16} strokeWidth={1.6} />} title="My Tasks" link="View all" to="/admin/tasks" />
    {tasks.map((t) => (
      <div key={t.title} className="sm-row">
        <div><strong>{t.title}</strong><small>{t.meta}</small></div>
        <span className="sm-pill warn">Due soon</span>
      </div>
    ))}
  </section>
);

const AnnouncementsCard: React.FC = () => (
  <section className="sm-card sm-pad">
    <CardHead icon={<Megaphone size={16} strokeWidth={1.6} />} title="Company Announcements" />
    <div className="sm-row">
      <div><strong>📌 September salary payment date: 27 Sep</strong><small>All users · Pinned</small></div>
    </div>
  </section>
);

const EventsCard: React.FC = () => (
  <section className="sm-card sm-pad">
    <CardHead icon={<CalendarClock size={16} strokeWidth={1.6} />} title="Upcoming Events" />
    {events.map((e) => (
      <div key={e.title} className="sm-row">
        <div><strong>{e.title}</strong><small>{e.meta}</small></div>
      </div>
    ))}
  </section>
);

const ContactsCard: React.FC = () => (
  <section className="sm-card sm-pad">
    <CardHead icon={<BookOpen size={16} strokeWidth={1.6} />} title="Important Contacts" link="View all" to="/admin/contacts" />
    <div className="sm-contacts">
      {contacts.map((c) => (
        <div key={c.name}><strong>{c.name}</strong><small>{c.detail}</small></div>
      ))}
    </div>
  </section>
);

/** The overview (home) page body. Render it as the index route of /admin. */
export function OverviewContent(): React.JSX.Element {
  const [asOf, setAsOf] = useState("2026-09-09"); // yyyy-mm-dd
  const [asOfOpen, setAsOfOpen] = useState(false);
  const [addWorkerOpen, setAddWorkerOpen] = useState(false);
  return (
    <>
      <style>{`
        .sm-stat.is-clickable { transition: background-color 0.15s ease; }
        .sm-stat.is-clickable:hover { background-color: #f1f1f1; }
        .sm-stat.is-clickable:focus-visible { outline: 2px solid #14632c; outline-offset: -2px; }
        .sm-ch .sm-link { color: #14632c; font-weight: 500; text-decoration: none; }
        .sm-ch .sm-link:hover { color: #0f4d22; text-decoration: underline; }
      `}</style>

      <div className="sm-crumb">Home</div>
      <div className="sm-title-row">
        <div className="sm-title-text">
          <h1>Overview</h1>
          <p>
            A live picture of who is working, where, and what needs attention today — as of{" "}
            <b>{formatAsOf(asOf)}</b>.
          </p>
        </div>
        <div className="sm-title-actions">
          <button type="button" className="sm-btn sm-btn-outline" onClick={() => setAsOfOpen(true)}>
            <CalendarDays size={16} strokeWidth={1.6} /> As of date
          </button>
          <button type="button" className="sm-btn sm-btn-primary" onClick={() => setAddWorkerOpen(true)}>
            <UserPlus size={16} strokeWidth={1.8} /> Add Worker
          </button>
        </div>
      </div>

      <StatGroup stats={topStats} cols={5} />
      <StatGroup stats={bottomStats} cols={3} />
      <WorkQueue />
      <DailyStatus />
      <div className="sm-grid2"><ProjectsTable /><CriticalAlerts /></div>
      <div className="sm-grid2"><AccommodationCard /><TasksCard /></div>
      <div className="sm-grid2"><AnnouncementsCard /><EventsCard /></div>
      <ContactsCard />

      <AddWorkerPage open={addWorkerOpen} onClose={() => setAddWorkerOpen(false)} />
      <AsOfDateDialog
        open={asOfOpen}
        onClose={() => setAsOfOpen(false)}
        value={asOf}
        onApply={setAsOf}
      />
    </>
  );
}

export default OverviewContent;
