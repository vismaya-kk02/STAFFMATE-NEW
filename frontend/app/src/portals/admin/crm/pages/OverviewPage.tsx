import React, { useEffect, useState } from "react";
import {
  Factory, Building2, CircleCheck, CalendarDays, UserPlus, Inbox, ChevronRight,
  Clock, ClipboardCheck, TriangleAlert, Ban, FileWarning, Megaphone,
  CalendarClock, BookOpen, ListChecks, X,
} from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import AddWorkerPage from "../../../../features/workers/pages/AddWorkerPage";
import AsOfDateDialog from "../../../../pages/AsOfDateDialog";

/* ---------- Types ---------- */
type Tone = "default" | "danger";

interface Stat {
  title: string;
  value: number;
  caption: string;
  tone?: Tone;
  to?: string;
}

interface QueueItem {
  count: number;
  title: string;
  subtitle: string;
  warn?: boolean;
  to?: string;
}

interface AlertItem {
  icon: React.ReactNode;
  who: string;
  text: string;
  warn: boolean;
  to: string; // where the Review button goes
}

interface Announcement {
  title: string;
  author: string;
  published: string;
  validUntil: string;
  audience: string;
  pinned: boolean;
  body: string;
}

/* ---------- Helpers ---------- */
/** "2026-09-09" -> "09 Sep 2026" */
const formatAsOf = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

const scrollToTop = () => {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const behavior: ScrollBehavior = reduce ? "auto" : "smooth";
  document.querySelectorAll<HTMLElement>("*").forEach((node) => {
    if (node.scrollTop > 0) node.scrollTo({ top: 0, behavior });
  });
  if (window.scrollY > 0) window.scrollTo({ top: 0, behavior });
};

const useGo = () => {
  const navigate = useNavigate();
  return (to: string, _el?: HTMLElement | null) => {
    scrollToTop();
    navigate(to);
    [0, 50, 150, 300, 600].forEach((ms) => setTimeout(scrollToTop, ms));
  };
};

/**
 * Link for the "Daily work status" Open button.
 * Opens the Projects page on the Daily work status tab with the
 * project and date pre-selected (as in the screenshot).
 * Change DAILY_PROJECT / DAILY_DATE to whatever you want it to open with.
 */
const DAILY_PROJECT = "Warehouse Ops";
const DAILY_DATE = "2026-08-20"; // yyyy-mm-dd
const DAILY_STATUS_LINK =
  `/admin/projects?tab=daily&project=${encodeURIComponent(DAILY_PROJECT)}&date=${DAILY_DATE}`;

/* ---------- Data ---------- */
const topStats: Stat[] = [
  { title: "Assigned to a project", value: 41, caption: "Active assignments today", to: "/admin/workers?tab=assigned" },
  { title: "Available", value: 9, caption: "Ready for a project", to: "/admin/workers?tab=avail" },
  { title: "In preparation", value: 3, caption: "Awaiting arrival / docs", to: "/admin/workers?tab=prep" },
  { title: "Accommodated", value: 4, caption: "Active stay today", to: "/admin/workers?tab=accom" },
  { title: "Documents needing action", value: 13, caption: "Items, not people", tone: "danger", to: "/admin/documents" },
];

const bottomStats: Stat[] = [
  { title: "Active Projects", value: 4, caption: "of 6 total engagements", to: "/admin/projects" },
  { title: "Pending action", value: 12, caption: "Calculated from dated records", tone: "danger", to: "/admin/workers?tab=pending" },
  { title: "Available Beds", value: 218, caption: "Across 5 contracted facilities", to: "/admin/accommodation" },
];

const queue: QueueItem[] = [
  { count: 2, title: "Daily records overdue", subtitle: "Line 3 Assembly, CNC Machining Hall", to: "/admin/projects?tab=daily" },
  { count: 1, title: "Deregistration documents to verify", subtitle: "Andriy Ionescu", warn: true, to: "/admin/workers?tab=pending" },
  { count: 2, title: "Social Insurance evidence to verify", subtitle: "Dmytro Kovalenko, Nikola Ionescu", warn: true, to: "/admin/workers?tab=pending" },
  { count: 1, title: "Terminations missing documentation", subtitle: "Viorel Koval", to: "/admin/workers?tab=pending" },
  { count: 1, title: "Expected departures reported by coordinators", subtitle: "Taras Georgiev", warn: true, to: "/admin/workers?tab=coordinator" },
  { count: 1, title: "Daily records to review after late verification", subtitle: "Petar Marković", warn: true, to: "/admin/projects?tab=daily" },
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

/**
 * Review links. Ivan Petrenko uses his worker ID (SM-1042) as shown on his profile page.
 * The other worker IDs below are placeholders: replace them with the real worker IDs/slugs
 * that your /admin/workers/:id route expects.
 */
const alerts: AlertItem[] = [
  { icon: <Ban size={18} />, who: "Ivan Petrenko", text: "— Blocked: SP not verified for 03 Feb 2025 start (AutoParts Slovakia)", warn: false, to: "/admin/workers/SM-1042" },
  { icon: <FileWarning size={18} />, who: "Marko Jovanović", text: "— TRC / Residence Card expired 3 days ago", warn: false, to: "/admin/workers/marko-jovanovic" },
  { icon: <Ban size={18} />, who: "Anh Popa", text: "— Blocked: SP not verified for 07 Sep 2026 start (Line 3 Assembly)", warn: false, to: "/admin/workers/anh-popa" },
  { icon: <ListChecks size={18} />, who: "1", text: "worker(s) have daily records to review after later Social Insurance verification", warn: true, to: "/admin/workers?tab=pending" },
];

const beds = [
  { name: "Villa Rezidencia Trnava", detail: "40 contracted · 38 available", pct: "5%" },
  { name: "Hostel Nitra Central", detail: "28 contracted · 26 available", pct: "7%" },
];

const tasks = [
  { title: "Verify SP registration — Ivan Petrenko", meta: "Due 09 Sep 2026 · High priority" },
  { title: "Confirm TRC renewal — Marko Jovanović", meta: "Due 10 Sep 2026 · Medium priority" },
];

/** Company announcements. Clicking one opens the detail popup. */
const announcements: Announcement[] = [
  {
    title: "September salary payment date: 27 Sep",
    author: "Marek Máhr",
    published: "01 Sep 2026",
    validUntil: "27 Sep 2026",
    audience: "All users",
    pinned: true,
    body: "Salaries for September will be paid on 27 September as usual. Please direct any payroll queries to your coordinator.",
  },
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
const StatCell: React.FC<{ stat: Stat; onClick?: (el: HTMLElement) => void }> = ({ stat, onClick }) => (
  <div
    className={`sm-stat${onClick ? " is-clickable" : ""}`}
    role={onClick ? "button" : undefined}
    tabIndex={onClick ? 0 : undefined}
    style={onClick ? { cursor: "pointer" } : undefined}
    onClick={onClick ? (e) => onClick(e.currentTarget) : undefined}
    onKeyDown={(e: React.KeyboardEvent) => {
      if (onClick && (e.key === "Enter" || e.key === " ")) {
        e.preventDefault();
        onClick(e.currentTarget as HTMLElement);
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
  const go = useGo();
  return (
    <section
      className="sm-card sm-stat-group"
      style={{ "--cols": cols } as React.CSSProperties}
    >
      {stats.map((s) => (
        <StatCell key={s.title} stat={s} onClick={s.to ? (el) => go(s.to!, el) : undefined} />
      ))}
    </section>
  );
};

const WorkQueue: React.FC = () => {
  const go = useGo();
  return (
    <section className="sm-card sm-queue">
      <div className="sm-queue-head">
        <h3><Inbox size={16} strokeWidth={1.6} /> My work queue</h3>
        <span>8 items in 6 groups</span>
      </div>
      {queue.map((q) => (
        <button
          key={q.title}
          type="button"
          className="sm-queue-row"
          onClick={(e) => q.to && go(q.to, e.currentTarget)}
        >
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
};

const CardHead: React.FC<{ icon: React.ReactNode; title: string; link?: string; to?: string }> = ({ icon, title, link, to }) => {
  const go = useGo();
  return (
    <div className="sm-ch">
      <h3>{icon} {title}</h3>
      {link && (
        <a
          href={to ?? "#"}
          className="sm-link"
          onClick={(e) => {
            e.preventDefault();
            if (to) go(to, e.currentTarget);
          }}
        >
          {link}
        </a>
      )}
    </div>
  );
};

const DailyStatus: React.FC = () => {
  const go = useGo();
  return (
    <section className="sm-card sm-pad">
      <CardHead
        icon={<ClipboardCheck size={16} strokeWidth={1.6} />}
        title="Daily work status — 08 Sep 2026"
        link="Open"
        to={DAILY_STATUS_LINK}
      />
      <div className="sm-banner"><Clock size={16} /> 2 record(s) were due by 9:30 today (Slovak time) and are not confirmed.</div>
      {dailyStatus.map((d) => (
        <div key={d.project} className="sm-row">
          <div>
            <strong>{d.project}</strong>
            <small>11 workers on the list for 08 Sep 2026</small>
          </div>
          <div className="sm-row-right">
            <span className={`sm-pill ${d.ok ? "ok" : "bad"}`}>{d.state}</span>
            {!d.ok && (
              <button
                type="button"
                className="sm-btn sm-btn-primary sm-btn-sm"
                onClick={(e) =>
                  go(
                    `/admin/projects?tab=daily&project=${encodeURIComponent(d.project)}&date=2026-09-08`,
                    e.currentTarget
                  )
                }
              >
                Record
              </button>
            )}
          </div>
        </div>
      ))}
    </section>
  );
};

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

const CriticalAlerts: React.FC = () => {
  const go = useGo();
  return (
    <section className="sm-card sm-pad">
      <CardHead icon={<TriangleAlert size={16} strokeWidth={1.6} />} title="Critical Alerts" link="View all" to="/admin/documents" />
      {alerts.map((a) => (
        <div key={a.who + a.text} className={`sm-alert${a.warn ? " is-warn" : ""}`}>
          {a.icon}
          <span className="sm-alert-text"><b>{a.who}</b> {a.text}</span>
          <a
            href={a.to}
            className="sm-link"
            onClick={(e) => {
              e.preventDefault();
              go(a.to, e.currentTarget);
            }}
          >
            Review
          </a>
        </div>
      ))}
    </section>
  );
};

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

const AnnouncementsCard: React.FC<{ onOpen: (a: Announcement) => void }> = ({ onOpen }) => (
  <section className="sm-card sm-pad">
    <CardHead icon={<Megaphone size={16} strokeWidth={1.6} />} title="Company Announcements" />
    {announcements.map((a) => (
      <button key={a.title} type="button" className="sm-row sm-row-btn" onClick={() => onOpen(a)}>
        <div>
          <strong>{a.pinned ? "📌 " : ""}{a.title}</strong>
          <small>{a.audience}{a.pinned ? " · Pinned" : ""}</small>
        </div>
      </button>
    ))}
  </section>
);

/** Popup showing one announcement: title, details and the message. */
const AnnouncementModal: React.FC<{ item: Announcement; onClose: () => void }> = ({ item, onClose }) => {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const rows: [string, string][] = [
    ["Author", item.author],
    ["Published", item.published],
    ["Valid Until", item.validUntil],
    ["Audience", item.audience],
    ["Pinned", item.pinned ? "Yes" : "No"],
  ];

  return (
    <div className="sm-ann-overlay" onMouseDown={onClose}>
      <div
        className="sm-ann-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="sm-ann-title"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="sm-ann-head">
          <h2 id="sm-ann-title">{item.title}</h2>
          <button type="button" className="sm-ann-close" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <dl className="sm-ann-meta">
          {rows.map(([label, value]) => (
            <React.Fragment key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </React.Fragment>
          ))}
        </dl>

        <div className="sm-ann-body">{item.body}</div>
      </div>
    </div>
  );
};

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

/* ---------- Hook for the Projects page (Daily work status tab) ---------- */
/**
 * Import in the Projects page:
 *   import { useDailyStatusParams } from "<path>/OverviewContent";
 *   const { project, setProject, date, setDate } = useDailyStatusParams(projectNames[0]);
 * Reads ?project=...&date=yyyy-mm-dd from the URL (set by the Overview "Open" button).
 */
const previousDay = () => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
};

export function useDailyStatusParams(defaultProject: string) {
  const [params] = useSearchParams();
  const [project, setProject] = useState(params.get("project") ?? defaultProject);
  const [date, setDate] = useState(params.get("date") ?? previousDay());

  // Re-sync when the URL changes (e.g. clicking Open while already on that page)
  useEffect(() => {
    const p = params.get("project");
    const d = params.get("date");
    if (p) setProject(p);
    if (d) setDate(d);
  }, [params]);

  return { project, setProject, date, setDate };
}

/** The overview (home) page body. Render it as the index route of /admin. */
export function OverviewContent(): React.JSX.Element {
  const [asOf, setAsOf] = useState("2026-09-09");
  const [asOfOpen, setAsOfOpen] = useState(false);
  const [addWorkerOpen, setAddWorkerOpen] = useState(false);
  const [openAnnouncement, setOpenAnnouncement] = useState<Announcement | null>(null);
  return (
    <>
      <style>{`
        .sm-stat.is-clickable { transition: background-color 0.15s ease; }
        .sm-stat.is-clickable:hover { background-color: #f1f1f1; }
        .sm-stat.is-clickable:focus-visible { outline: 2px solid #14632c; outline-offset: -2px; }
        .sm-ch .sm-link { color: #14632c; font-weight: 500; text-decoration: none; }
        .sm-ch .sm-link:hover { color: #0f4d22;  }
        .sm-alert .sm-link { color: #14632c; font-weight: 500; text-decoration: none; cursor: pointer; }
        .sm-alert .sm-link:hover { color: #0f4d22; text-decoration: underline; }

        .sm-queue .sm-queue-row {
          display: flex;
          align-items: center;
          gap: 16px;
          width: 100%;
          padding: 14px 0;
          background: transparent;
          border: 0;
          border-bottom: 1px solid #e5e7eb;
          text-align: left;
          cursor: pointer;
          transition: background-color 0.15s ease;
        }
        .sm-queue .sm-queue-row:last-child { border-bottom: 0; }
        .sm-queue .sm-queue-row:hover { background-color: #f6f6f4; }

        /* Clickable announcement row */
        .sm-row-btn {
          width: 100%;
          background: transparent;
          border: 0;
          text-align: left;
          font: inherit;
          color: inherit;
          cursor: pointer;
          transition: background-color 0.15s ease;
        }
        .sm-row-btn:hover { background-color: #f6f6f4; }
        .sm-row-btn:focus-visible { outline: 2px solid #14632c; outline-offset: -2px; }

        /* Announcement popup */
        .sm-ann-overlay {
          position: fixed; inset: 0; z-index: 1000;
          display: flex; align-items: center; justify-content: center;
          padding: 16px; overflow-y: auto;
          background: rgba(40, 40, 40, 0.38);
          backdrop-filter: blur(4px); -webkit-backdrop-filter: blur(4px);
        }
        .sm-ann-modal {
          width: 100%; max-width: 640px; box-sizing: border-box;
          background: #fff; border-radius: 14px; padding: 22px 24px 24px;
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.22);
        }
        .sm-ann-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; margin-bottom: 14px; }
        .sm-ann-head h2 { margin: 0; font-size: 17px; font-weight: 600; line-height: 1.3; }
        .sm-ann-close {
          flex: none; display: grid; place-items: center; width: 26px; height: 26px;
          border: 0; border-radius: 6px; background: transparent; color: #6b6b66; cursor: pointer;
        }
        .sm-ann-close:hover { background: #f3f2ee; color: #1b1b18; }
        .sm-ann-close:focus-visible { outline: 2px solid #14632c; outline-offset: 2px; }
        .sm-ann-meta { display: grid; grid-template-columns: 170px 1fr; gap: 8px 0; margin: 0 0 16px; font-size: 13.5px; }
        .sm-ann-meta dt { color: #6b6b66; }
        .sm-ann-meta dd { margin: 0; }
        .sm-ann-body {
          padding: 14px 16px; font-size: 13.5px; line-height: 1.5;
          background: #f7f6f2; border: 1px solid #e5e4de; border-radius: 10px;
        }
        @media (max-width: 560px) {
          .sm-ann-meta { grid-template-columns: 1fr; gap: 2px; }
          .sm-ann-meta dd { margin-bottom: 8px; }
        }
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
      <div className="sm-grid2"><AnnouncementsCard onOpen={setOpenAnnouncement} /><EventsCard /></div>
      <ContactsCard />

      {openAnnouncement && (
        <AnnouncementModal item={openAnnouncement} onClose={() => setOpenAnnouncement(null)} />
      )}

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
