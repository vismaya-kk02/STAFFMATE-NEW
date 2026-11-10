
import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronDown, ChevronRight, Plus, X } from "lucide-react";

type Status = "New" | "In Progress" | "Awaiting Input" | "Completed" | "Cancelled";
type Priority = "High" | "Medium" | "Low";
type Linked = "worker" | "project" | "facility" | null;

interface Task {
  id: number;
  title: string;
  due: string;
  priority: Priority;
  assignee: string;
  status: Status;
  linked: Linked;
  description?: string;
}

interface Announcement {
  id: number;
  title: string;
  body: string;
  author: string;
  published: string;
  audience: string;
  validUntil: string;
  pinned: boolean;
}

interface TaskForm {
  title: string;
  assignee: string;
  due: string;
  priority: Priority;
  status: Status;
  description: string;
}

interface AnnouncementForm {
  title: string;
  body: string;
  audience: string;
  validUntil: string;
  pinned: boolean;
}

const AS_OF = "2026-09-09";

const STATUSES: Status[] = [
  "New",
  "In Progress",
  "Awaiting Input",
  "Completed",
  "Cancelled",
];

const PRIORITIES: Priority[] = ["High", "Medium", "Low"];

const ASSIGNEES = [
  "Marek Máhr",
  "Jana Kollárová",
  "Peter Vrábel",
];

const AUDIENCES = [
  "All users",
  "Admins",
  "Coordinators",
  "Workers",
  "AutoParts coordinators",
];

const DUE_OPTIONS = [
  ["overdue", "Overdue"],
  ["today", "Due today"],
  ["week", "Due this week"],
] as const;

const LINK_OPTIONS = [
  ["worker", "Linked to a worker"],
  ["project", "Linked to a project"],
  ["facility", "Linked to a facility"],
  ["none", "Not linked"],
] as const;

const STATUS_PILL: Record<Status, string> = {
  New: "muted",
  "In Progress": "info",
  "Awaiting Input": "warn",
  Completed: "ok",
  Cancelled: "muted",
};

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

const INITIAL_TASKS: Task[] = [
  {
    id: 1,
    title: "Verify SP registration — Ivan Petrenko",
    due: "2026-09-09",
    priority: "High",
    assignee: "Marek Máhr",
    status: "New",
    linked: "worker",
  },
  {
    id: 2,
    title: "Confirm TRC renewal — Marko Jovanović",
    due: "2026-09-10",
    priority: "Medium",
    assignee: "Marek Máhr",
    status: "In Progress",
    linked: "worker",
  },
  {
    id: 3,
    title: "Prepare Packaging Line B onboarding",
    due: "2026-09-12",
    priority: "Medium",
    assignee: "Peter Vrábel",
    status: "New",
    linked: "project",
  },
  {
    id: 4,
    title: "Update house rules — Ubytovňa Sereď",
    due: "2026-09-15",
    priority: "Low",
    assignee: "Jana Kollárová",
    status: "New",
    linked: "facility",
  },
];

const INITIAL_ANNOUNCEMENTS: Announcement[] = [
  {
    id: 1,
    title: "September salary payment date: 27 Sep",
    body: "Salaries for September will be paid on 27 September as usual. Please direct any payroll queries to your coordinator.",
    author: "Marek Máhr",
    published: "2026-09-01",
    audience: "All users",
    validUntil: "2026-09-27",
    pinned: true,
  },
  {
    id: 2,
    title: "New site rules — AutoParts Slovakia",
    body: "Please review the updated site rules before your next shift.",
    author: "Jana Kollárová",
    published: "2026-09-03",
    audience: "AutoParts coordinators",
    validUntil: "2026-10-03",
    pinned: false,
  },
];

const EMPTY_TASK: TaskForm = {
  title: "",
  assignee: "Marek Máhr",
  due: AS_OF,
  priority: "Low",
  status: "New",
  description: "",
};

const EMPTY_ANNOUNCEMENT: AnnouncementForm = {
  title: "",
  body: "",
  audience: "All users",
  validUntil: "",
  pinned: false,
};

const fmt = (iso: string) => {
  if (!iso) return "—";

  const [year, month, day] = iso.split("-");

  return `${day} ${MONTHS[Number(month) - 1]} ${year}`;
};

const isOpen = (task: Task) =>
  task.status !== "Completed" && task.status !== "Cancelled";

const endOfWeek = (iso: string) => {
  const date = new Date(`${iso}T00:00:00Z`);

  date.setUTCDate(
    date.getUTCDate() + ((7 - date.getUTCDay()) % 7)
  );

  return date.toISOString().slice(0, 10);
};

const WEEK_END = endOfWeek(AS_OF);

const same = (items: readonly string[]) =>
  items.map((item) => [item, item] as const);

const Filter: React.FC<{
  value: string;
  onChange: (value: string) => void;
  label: string;
  options: readonly (readonly [string, string])[];
}> = ({ value, onChange, label, options }) => (
  <label className="tk-select">
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      aria-label={label}
    >
      <option value="">{label}</option>

      {options.map(([optionValue, text]) => (
        <option key={optionValue} value={optionValue}>
          {text}
        </option>
      ))}
    </select>

    <ChevronDown size={16} />
  </label>
);

export default function TasksPage(): React.JSX.Element {
  const [tasks, setTasks] = useState<Task[]>(INITIAL_TASKS);

  const [announcements, setAnnouncements] =
    useState<Announcement[]>(INITIAL_ANNOUNCEMENTS);

  const [tab, setTab] = useState<
    "Tasks" | "Company Announcements"
  >("Tasks");

  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");
  const [assignee, setAssignee] = useState("");
  const [due, setDue] = useState("");
  const [linked, setLinked] = useState("");

  const [showTaskModal, setShowTaskModal] = useState(false);
  const [taskForm, setTaskForm] =
    useState<TaskForm>(EMPTY_TASK);

  const [showAnnouncementModal, setShowAnnouncementModal] =
    useState(false);

  const [announcementForm, setAnnouncementForm] =
    useState<AnnouncementForm>(EMPTY_ANNOUNCEMENT);

  // Selected announcement for details modal
  const [selectedAnnouncement, setSelectedAnnouncement] =
    useState<Announcement | null>(null);

  const rows = useMemo(
    () =>
      tasks.filter(
        (task) =>
          (!status || task.status === status) &&
          (!priority || task.priority === priority) &&
          (!assignee || task.assignee === assignee) &&
          (!due ||
            (due === "overdue"
              ? task.due < AS_OF && isOpen(task)
              : due === "today"
                ? task.due === AS_OF
                : task.due >= AS_OF && task.due <= WEEK_END)) &&
          (!linked ||
            (linked === "none"
              ? task.linked === null
              : task.linked === linked))
      ),
    [tasks, status, priority, assignee, due, linked]
  );

  const openTasks = tasks.filter(isOpen);

  const stats = [
    {
      label: "My Open Tasks",
      value: openTasks.length,
      danger: false,
    },
    {
      label: "Due Today",
      value: openTasks.filter((task) => task.due === AS_OF).length,
      danger: false,
    },
    {
      label: "Overdue",
      value: openTasks.filter((task) => task.due < AS_OF).length,
      danger: true,
    },
  ];

  const closeTaskModal = () => {
    setShowTaskModal(false);
    setTaskForm(EMPTY_TASK);
  };

  const closeAnnouncementModal = () => {
    setShowAnnouncementModal(false);
    setAnnouncementForm(EMPTY_ANNOUNCEMENT);
  };

  const handleTaskChange = (
    event: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value } = event.target;

    setTaskForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleAnnouncementChange = (
    event: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value, type } = event.target;

    const nextValue =
      type === "checkbox"
        ? (event.target as HTMLInputElement).checked
        : value;

    setAnnouncementForm((previous) => ({
      ...previous,
      [name]: nextValue,
    }));
  };

  const handleCreateTask = (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    const newTask: Task = {
      id: Math.max(0, ...tasks.map((task) => task.id)) + 1,
      title: taskForm.title.trim(),
      due: taskForm.due,
      priority: taskForm.priority,
      assignee: taskForm.assignee,
      status: taskForm.status,
      linked: null,
      description: taskForm.description.trim(),
    };

    setTasks((previous) => [...previous, newTask]);

    setTab("Tasks");
    setStatus("");
    setPriority("");
    setAssignee("");
    setDue("");
    setLinked("");

    closeTaskModal();
  };

  const handlePublishAnnouncement = (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    const newAnnouncement: Announcement = {
      id: Math.max(0, ...announcements.map((item) => item.id)) + 1,
      title: announcementForm.title.trim(),
      body: announcementForm.body.trim(),
      author: "Marek Máhr",
      published: AS_OF,
      audience: announcementForm.audience,
      validUntil: announcementForm.validUntil,
      pinned: announcementForm.pinned,
    };

    setAnnouncements((previous) => [
      newAnnouncement,
      ...previous,
    ]);

    closeAnnouncementModal();
  };

  return (
    <>
      <style>{css}</style>

      <nav className="tk-crumb" aria-label="Breadcrumb">
        <Link to="/admin">Home</Link>
        <ChevronRight size={14} />
        <b>Tasks &amp; Announcements</b>
      </nav>

      <div className="sm-title-row">
        <div>
          <h1>Tasks &amp; Announcements</h1>

          <p className="tk-desc">
            Action items for coordinators and staff, plus
            company-wide notices.
          </p>
        </div>

        <button
          type="button"
          className="sm-btn sm-btn-primary"
          onClick={() =>
            tab === "Tasks"
              ? (setTaskForm(EMPTY_TASK), setShowTaskModal(true))
              : (
                  setAnnouncementForm(EMPTY_ANNOUNCEMENT),
                  setShowAnnouncementModal(true)
                )
          }
        >
          <Plus size={16} />
          {tab === "Tasks" ? "New Task" : "New Announcement"}
        </button>
      </div>

      {/* Tabs */}

      <div className="tk-tabs" role="tablist">
        {(["Tasks", "Company Announcements"] as const).map(
          (item) => (
            <button
              key={item}
              type="button"
              role="tab"
              aria-selected={tab === item}
              className={tab === item ? "is-active" : ""}
              onClick={() => setTab(item)}
            >
              {item}
            </button>
          )
        )}
      </div>

      {/* Tasks */}

      {tab === "Tasks" ? (
        <>
          <section
            className="sm-card sm-stat-group"
            style={{ gridTemplateColumns: "repeat(3, 1fr)" }}
          >
            {stats.map((stat) => (
              <div key={stat.label} className="sm-stat tk-stat">
                <div className="sm-stat-title">
                  {stat.label}
                </div>

                <div
                  className={`sm-stat-value${
                    stat.danger ? " is-danger" : ""
                  }`}
                >
                  {stat.value}
                </div>
              </div>
            ))}
          </section>

          <section className="sm-card tk-panel">
            <div className="tk-filters">
              <Filter
                label="Any status"
                value={status}
                onChange={setStatus}
                options={same(STATUSES)}
              />

              <Filter
                label="Any priority"
                value={priority}
                onChange={setPriority}
                options={same(PRIORITIES)}
              />

              <Filter
                label="Any assignee"
                value={assignee}
                onChange={setAssignee}
                options={same(ASSIGNEES)}
              />

              <Filter
                label="Any due date"
                value={due}
                onChange={setDue}
                options={DUE_OPTIONS}
              />

              <Filter
                label="Any linked record"
                value={linked}
                onChange={setLinked}
                options={LINK_OPTIONS}
              />
            </div>

            {rows.map((task) => (
              <div key={task.id} className="tk-row">
                <span>
                  <strong>{task.title}</strong>

                  <small>
                    Due {fmt(task.due)} · {task.priority} priority
                    · Assignee: {task.assignee}
                  </small>

                  {task.description && (
                    <small className="tk-description">
                      {task.description}
                    </small>
                  )}
                </span>

                <span className={`sm-pill ${STATUS_PILL[task.status]}`}>
                  {task.status}
                </span>
              </div>
            ))}

            {rows.length === 0 && (
              <p className="tk-none">
                No tasks match these filters.
              </p>
            )}
          </section>
        </>
      ) : (

        /* Company Announcements */

        <section className="sm-card tk-panel tk-announcements-panel">
          <div className="tk-announcement-table-wrap">
            <table className="tk-announcement-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Author</th>
                  <th>Published</th>
                  <th>Valid Until</th>
                  <th>Audience</th>
                  <th>Pinned</th>
                </tr>
              </thead>

              <tbody>
                {announcements.map((announcement) => (
                  <tr key={announcement.id}>
                    <td className="tk-announcement-title">
                      <button
                        type="button"
                        className="tk-announcement-title-btn"
                        onClick={() =>
                          setSelectedAnnouncement(announcement)
                        }
                      >
                        {announcement.title}
                      </button>
                    </td>

                    <td>{announcement.author}</td>

                    <td>{fmt(announcement.published)}</td>

                    <td>{fmt(announcement.validUntil)}</td>

                    <td>{announcement.audience}</td>

                    <td>
                      {announcement.pinned ? (
                        <span className="tk-pinned">
                          <span className="tk-pin-icon">📌</span>
                          Pinned
                        </span>
                      ) : (
                        <span className="tk-not-pinned">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {announcements.length === 0 && (
            <p className="tk-none">
              No announcements have been published yet.
            </p>
          )}
        </section>
      )}

      {/* New Task Modal */}

      {showTaskModal && (
        <div
          className="tk-modal-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeTaskModal();
            }
          }}
        >
          <div
            className="tk-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="tk-task-modal-title"
          >
            <div className="tk-modal-header">
              <h2 id="tk-task-modal-title">New Task</h2>

              <button
                type="button"
                className="tk-modal-close"
                onClick={closeTaskModal}
                aria-label="Close modal"
              >
                <X size={19} />
              </button>
            </div>

            <form onSubmit={handleCreateTask}>
              <div className="tk-form-grid">
                <div className="tk-field full-width">
                  <label htmlFor="tk-title">
                    Title <span>*</span>
                  </label>

                  <input
                    id="tk-title"
                    name="title"
                    type="text"
                    placeholder="e.g. Verify SP registration"
                    value={taskForm.title}
                    onChange={handleTaskChange}
                    required
                    autoFocus
                  />
                </div>

                <div className="tk-field">
                  <label htmlFor="tk-assignee">
                    Assignee <span>*</span>
                  </label>

                  <select
                    id="tk-assignee"
                    name="assignee"
                    value={taskForm.assignee}
                    onChange={handleTaskChange}
                    required
                  >
                    {ASSIGNEES.map((person) => (
                      <option key={person} value={person}>
                        {person}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="tk-field">
                  <label htmlFor="tk-due">Due Date</label>

                  <input
                    id="tk-due"
                    name="due"
                    type="date"
                    value={taskForm.due}
                    onChange={handleTaskChange}
                    required
                  />
                </div>

                <div className="tk-field">
                  <label htmlFor="tk-priority">Priority</label>

                  <select
                    id="tk-priority"
                    name="priority"
                    value={taskForm.priority}
                    onChange={handleTaskChange}
                  >
                    {PRIORITIES.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="tk-field">
                  <label htmlFor="tk-status">Status</label>

                  <select
                    id="tk-status"
                    name="status"
                    value={taskForm.status}
                    onChange={handleTaskChange}
                  >
                    {STATUSES.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="tk-field full-width">
                  <label htmlFor="tk-description">
                    Description
                  </label>

                  <textarea
                    id="tk-description"
                    name="description"
                    placeholder="What needs to happen?"
                    value={taskForm.description}
                    onChange={handleTaskChange}
                    rows={3}
                  />
                </div>
              </div>

              <div className="tk-modal-actions">
                <button type="submit" className="tk-create-btn">
                  Create Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New Announcement Modal */}

      {showAnnouncementModal && (
        <div
          className="tk-modal-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeAnnouncementModal();
            }
          }}
        >
          <div
            className="tk-modal tk-announcement-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="tk-announcement-modal-title"
          >
            <div className="tk-modal-header">
              <h2 id="tk-announcement-modal-title">
                New Announcement
              </h2>

              <button
                type="button"
                className="tk-modal-close"
                onClick={closeAnnouncementModal}
                aria-label="Close modal"
              >
                <X size={19} />
              </button>
            </div>

            <form onSubmit={handlePublishAnnouncement}>
              <div className="tk-announcement-form">
                <div className="tk-field full-width">
                  <label htmlFor="announcement-title">
                    Title <span>*</span>
                  </label>

                  <input
                    id="announcement-title"
                    name="title"
                    type="text"
                    value={announcementForm.title}
                    onChange={handleAnnouncementChange}
                    required
                    autoFocus
                  />
                </div>

                <div className="tk-field full-width">
                  <label htmlFor="announcement-body">
                    Body <span>*</span>
                  </label>

                  <textarea
                    id="announcement-body"
                    name="body"
                    rows={3}
                    value={announcementForm.body}
                    onChange={handleAnnouncementChange}
                    required
                  />
                </div>

                <div className="tk-announcement-two-col">
                  <div className="tk-field">
                    <label htmlFor="announcement-audience">
                      Audience
                    </label>

                    <select
                      id="announcement-audience"
                      name="audience"
                      value={announcementForm.audience}
                      onChange={handleAnnouncementChange}
                    >
                      {AUDIENCES.map((audience) => (
                        <option key={audience} value={audience}>
                          {audience}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="tk-field">
                    <label htmlFor="announcement-valid-until">
                      Valid Until
                    </label>

                    <input
                      id="announcement-valid-until"
                      name="validUntil"
                      type="date"
                      value={announcementForm.validUntil}
                      onChange={handleAnnouncementChange}
                    />
                  </div>
                </div>

                <label className="tk-checkbox-field">
                  <input
                    type="checkbox"
                    name="pinned"
                    checked={announcementForm.pinned}
                    onChange={handleAnnouncementChange}
                  />

                  <span>Pin to Overview</span>
                </label>
              </div>

              <div className="tk-modal-actions tk-announcement-actions">
                <button type="submit" className="tk-create-btn">
                  Publish Announcement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Announcement Details Modal */}

      {selectedAnnouncement && (
        <div
          className="tk-modal-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setSelectedAnnouncement(null);
            }
          }}
        >
          <div
            className="tk-modal tk-details-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="tk-details-title"
          >
            <div className="tk-details-header">
              <h2 id="tk-details-title">
                {selectedAnnouncement.title}
              </h2>

              <button
                type="button"
                className="tk-modal-close"
                onClick={() => setSelectedAnnouncement(null)}
                aria-label="Close modal"
              >
                <X size={19} />
              </button>
            </div>

            <div className="tk-details-info">
              <div className="tk-details-row">
                <span>Author</span>
                <strong>{selectedAnnouncement.author}</strong>
              </div>

              <div className="tk-details-row">
                <span>Published</span>
                <strong>
                  {fmt(selectedAnnouncement.published)}
                </strong>
              </div>

              <div className="tk-details-row">
                <span>Valid Until</span>
                <strong>
                  {fmt(selectedAnnouncement.validUntil)}
                </strong>
              </div>

              <div className="tk-details-row">
                <span>Audience</span>
                <strong>{selectedAnnouncement.audience}</strong>
              </div>

              <div className="tk-details-row">
                <span>Pinned</span>
                <strong>
                  {selectedAnnouncement.pinned ? "Yes" : "No"}
                </strong>
              </div>
            </div>

            <div className="tk-details-body">
              {selectedAnnouncement.body}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* CSS */

const css = `

/* Breadcrumb */

.tk-crumb {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--muted);
  margin-bottom: 8px;
}

.tk-crumb a {
  color: inherit;
  text-decoration: none;
}

.tk-crumb b {
  color: var(--text);
  font-weight: 600;
}

.tk-desc {
  font-size: 14px;
  line-height: 1.45;
}

/* Tabs */

.tk-tabs {
  display: flex;
  gap: 4px;
  border-bottom: 1px solid var(--line);
  margin-bottom: 12px;
}

.tk-tabs button {
  padding: 8px 14px;
  font-size: 14px;
  color: var(--muted);
  border: 0;
  background: transparent;
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
  cursor: pointer;
  white-space: nowrap;
}

.tk-tabs button.is-active {
  color: var(--green);
  font-weight: 600;
  border-bottom-color: var(--green);
}

/* Statistics */

.tk-stat {
  min-height: 0;
  padding: 9px 14px;
}

.tk-stat .sm-stat-title {
  font-size: 12.5px;
}

.tk-stat .sm-stat-value {
  font-size: 22px;
  line-height: 1.1;
  margin-top: 3px;
}

/* Main panel */

.tk-panel {
  padding: 0;
  margin-bottom: 12px;
  overflow: hidden;
}

/* Filters */

.tk-filters {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 12px 16px;
}

.tk-select {
  position: relative;
  color: var(--muted);
}

.tk-select select {
  appearance: none;
  height: 34px;
  padding: 0 32px 0 12px;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: #fff;
  font: inherit;
  font-size: 13.5px;
  color: var(--text);
  cursor: pointer;
}

.tk-select select:focus {
  outline: 2px solid var(--green);
  outline-offset: -1px;
}

.tk-select svg {
  position: absolute;
  right: 10px;
  top: 9px;
  width: 15px;
  height: 15px;
  pointer-events: none;
}

/* Task rows */

.tk-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  width: 100%;
  text-align: left;
  padding: 11px 16px;
  border: 0;
  border-top: 1px solid var(--line);
  background: #fff;
}

.tk-row strong {
  display: block;
  font-size: 14.5px;
  font-weight: 600;
  color: var(--text);
}

.tk-row small {
  display: block;
  margin-top: 2px;
  font-size: 12.5px;
  color: var(--muted);
}

.tk-row:hover:not(.tk-static) {
  background: #faf9f6;
}

.tk-description {
  margin-top: 5px !important;
}

.tk-none {
  padding: 20px;
  text-align: center;
  color: var(--muted);
  border-top: 1px solid var(--line);
  font-size: 13.5px;
  margin: 0;
}

/* Status pills */

.sm-pill.muted {
  background: #eeede8;
  color: var(--muted);
}

.sm-pill.info {
  background: #e3ecfb;
  color: #2c55b8;
}

/* Company Announcements table */

.tk-announcements-panel {
  width: 100%;
  padding: 0;
  background: #fff;
  border: 1px solid #e1e5e1;
  border-radius: 16px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
  overflow: hidden;
}

.tk-announcement-table-wrap {
  width: 100%;
  overflow-x: auto;
}

.tk-announcement-table {
  width: 100%;
  min-width: 850px;
  border-collapse: collapse;
  table-layout: auto;
  background: #fff;
}

.tk-announcement-table thead th {
  padding: 17px 14px 12px;
  text-align: left;
  font-size: 13.5px;
  font-weight: 500;
  color: #526052;
  white-space: nowrap;
  border-bottom: 1px solid #e2e6e2;
}

.tk-announcement-table tbody td {
  padding: 9px 14px;
  text-align: left;
  font-size: 14px;
  font-weight: 400;
  color: #171d19;
  white-space: nowrap;
  border-bottom: 1px solid #e9ece9;
  height: 41px;
  box-sizing: border-box;
}

.tk-announcement-table tbody tr:last-child td {
  border-bottom: none;
}

/* Full row hover */

.tk-announcement-table tbody tr {
  transition: background 0.2s ease;
}

.tk-announcement-table tbody tr:hover td {
  background: #f0f2f0;
}

.tk-announcement-table .tk-announcement-title {
  font-size: 14.5px;
  font-weight: 650;
  color: #111a14;
  min-width: 300px;
}

/* Clickable title */

.tk-announcement-title-btn {
  display: inline-block;
  padding: 5px 7px;
  margin-left: -7px;
  border: none;
  border-radius: 5px;
  background: transparent;
  color: #111a14;
  font-family: inherit;
  font-size: 14.5px;
  font-weight: 650;
  text-align: left;
  cursor: pointer;
  transition: background 0.2s ease, color 0.2s ease;
}

.tk-announcement-title-btn:hover {
  background: #e7eae7;
  color: #147333;
}

.tk-announcement-title-btn:focus-visible {
  outline: 2px solid #147333;
  outline-offset: 2px;
}

.tk-pinned {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  color: #172019;
  font-size: 13.5px;
  white-space: nowrap;
}

.tk-pin-icon {
  font-size: 16px;
  line-height: 1;
}

.tk-not-pinned {
  color: #333;
  font-size: 16px;
}

/* Modal overlay */

.tk-modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 99999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: rgba(35, 45, 39, 0.38);
  backdrop-filter: blur(5px);
  -webkit-backdrop-filter: blur(5px);
}

/* General modal */

.tk-modal {
  width: 100%;
  max-width: 790px;
  max-height: calc(100vh - 40px);
  box-sizing: border-box;
  overflow-y: auto;
  padding: 28px 30px;
  background: #fff;
  border-radius: 19px;
  box-shadow: 0 18px 45px rgba(0, 0, 0, 0.16);
}

.tk-modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 26px;
}

.tk-modal-header h2 {
  margin: 0;
  font-size: 21px;
  font-weight: 650;
  line-height: 1.3;
  color: #202722;
}

.tk-modal-close {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 28px;
  height: 28px;
  padding: 0;
  border: 0;
  border-radius: 5px;
  background: transparent;
  color: #68736c;
  cursor: pointer;
}

.tk-modal-close:hover {
  background: #f1f3f1;
  color: #202722;
}

/* Task form */

.tk-form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  column-gap: 15px;
  row-gap: 16px;
}

.tk-field {
  display: flex;
  flex-direction: column;
  min-width: 0;
  gap: 6px;
}

.tk-field.full-width {
  grid-column: 1 / -1;
}

.tk-field label {
  font-size: 14px;
  font-weight: 500;
  color: #606b64;
}

.tk-field label span {
  color: #202722;
}

.tk-field input,
.tk-field select,
.tk-field textarea {
  width: 100%;
  box-sizing: border-box;
  border: 1px solid #d1d9d1;
  border-radius: 10px;
  background: #fff;
  color: #252b27;
  font-family: inherit;
  font-size: 14px;
  outline: none;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.tk-field input,
.tk-field select {
  height: 42px;
  padding: 0 13px;
}

.tk-field textarea {
  min-height: 84px;
  padding: 12px 13px;
  resize: vertical;
}

.tk-field input:focus,
.tk-field select:focus,
.tk-field textarea:focus {
  border-color: #16733a;
  box-shadow: 0 0 0 3px rgba(22, 115, 58, 0.08);
}

/* New announcement modal */

.tk-announcement-modal {
  max-width: 790px;
  padding: 31px 30px 27px;
}

.tk-announcement-modal .tk-modal-header {
  margin-bottom: 27px;
}

.tk-announcement-form {
  display: flex;
  flex-direction: column;
  gap: 17px;
}

.tk-announcement-form .tk-field {
  gap: 7px;
}

.tk-announcement-form .tk-field input,
.tk-announcement-form .tk-field select {
  height: 41px;
}

.tk-announcement-form .tk-field textarea {
  height: 84px;
  min-height: 84px;
}

.tk-announcement-two-col {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 15px;
}

.tk-checkbox-field {
  display: inline-flex;
  align-items: center;
  align-self: flex-start;
  gap: 12px;
  margin: 9px 0 0 4px;
  color: #303832;
  font-size: 14px;
  cursor: pointer;
}

.tk-checkbox-field input {
  width: 19px;
  height: 19px;
  margin: 0;
  accent-color: #147333;
  cursor: pointer;
}

/* Modal buttons */

.tk-modal-actions {
  display: flex;
  justify-content: flex-start;
  margin-top: 22px;
}

.tk-announcement-actions {
  margin-top: 24px;
}

.tk-create-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 42px;
  padding: 0 18px;
  border: 0;
  border-radius: 9px;
  background: #147333;
  color: #fff;
  font-family: inherit;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}

.tk-create-btn:hover {
  background: #105e2a;
}

/* Announcement details modal */

.tk-details-modal {
  max-width: 790px;
  padding: 31px 30px 27px;
}

.tk-details-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 26px;
}

.tk-details-header h2 {
  margin: 0;
  color: #202722;
  font-size: 21px;
  font-weight: 650;
  line-height: 1.3;
}

.tk-details-info {
  display: flex;
  flex-direction: column;
  gap: 11px;
  margin-bottom: 15px;
}

.tk-details-row {
  display: grid;
  grid-template-columns: 216px 1fr;
  align-items: center;
  min-height: 21px;
  font-size: 15px;
}

.tk-details-row span {
  color: #657069;
  font-weight: 400;
}

.tk-details-row strong {
  color: #252b27;
  font-weight: 400;
}

.tk-details-body {
  padding: 21px 23px;
  border: 1px solid #e0e5e0;
  border-radius: 15px;
  background: #f8f9f8;
  color: #252b27;
  font-size: 16px;
  font-weight: 400;
  line-height: 1.45;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03);
}

/* Responsive */

@media (max-width: 900px) {
  .tk-announcement-table {
    min-width: 850px;
  }

  .tk-announcement-table thead th,
  .tk-announcement-table tbody td {
    padding-left: 12px;
    padding-right: 12px;
  }
}

@media (max-width: 600px) {
  .tk-modal-overlay {
    padding: 12px;
  }

  .tk-modal {
    padding: 22px 18px;
    border-radius: 14px;
  }

  .tk-modal-header {
    margin-bottom: 20px;
  }

  .tk-form-grid,
  .tk-announcement-two-col {
    grid-template-columns: 1fr;
    row-gap: 14px;
  }

  .tk-field.full-width {
    grid-column: auto;
  }

  .tk-filters {
    gap: 8px;
  }

  .tk-select select {
    max-width: 100%;
  }

  .tk-row {
    align-items: flex-start;
  }

  .tk-announcement-table {
    min-width: 850px;
  }

  .tk-details-modal {
    padding: 23px 18px;
  }

  .tk-details-header h2 {
    font-size: 18px;
  }

  .tk-details-row {
    grid-template-columns: 115px 1fr;
    gap: 8px;
    font-size: 13px;
  }

  .tk-details-body {
    padding: 16px;
    font-size: 14px;
  }
}

`;
