import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronRight, Plus, X } from "lucide-react";

/* ---------- Types & Data ---------- */

type Stage = "New" | "In Discussion" | "Won" | "Lost";

interface Opportunity {
  id: number;
  name: string;
  location: string;
  contact: string;
  owner: string;
  stage: Stage;
  potentialWorkers: number;
  nextAction: string;
  deadline: string | null;
  wonOn?: string;
  notes?: string;
}

interface OpportunityForm {
  name: string;
  location: string;
  contact: string;
  owner: string;
  stage: Stage;
  potentialWorkers: string;
  nextAction: string;
  deadline: string;
}

const AS_OF = "2026-09-09";

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

const fmt = (iso: string) => {
  const [y, m, d] = iso.split("-");
  return `${d} ${MONTHS[+m - 1]} ${y}`;
};

const quarter = (iso: string) =>
  `${iso.slice(0, 4)}-Q${Math.floor(
    (+iso.slice(5, 7) - 1) / 3
  ) + 1}`;

const OPPORTUNITIES: Opportunity[] = [
  {
    id: 1,
    name: "Nestlé Slovensko — 2nd line",
    location: "Prievidza",
    contact: "Michal Sýkora",
    owner: "Jana Kollárová",
    stage: "In Discussion",
    potentialWorkers: 25,
    nextAction: "Send proposal",
    deadline: "2026-09-12",
    notes: "Client wants pricing by mid-September.",
  },
  {
    id: 2,
    name: "Continental Zvolen",
    location: "Zvolen",
    contact: "Robert Fico Jr.",
    owner: "Peter Vrábel",
    stage: "New",
    potentialWorkers: 40,
    nextAction: "Initial call",
    deadline: "2026-09-05",
    notes: "",
  },
  {
    id: 3,
    name: "Volkswagen Slovakia — seasonal",
    location: "Bratislava",
    contact: "Eva Krajčová",
    owner: "Jana Kollárová",
    stage: "Won",
    potentialWorkers: 60,
    nextAction: "Create project",
    deadline: null,
    wonOn: "2026-08-20",
    notes: "",
  },
];

const STAGE_PILL: Record<Stage, string> = {
  New: "muted",
  "In Discussion": "info",
  Won: "ok",
  Lost: "bad",
};

const isOpen = (o: Opportunity) =>
  o.stage !== "Won" && o.stage !== "Lost";

const isOverdue = (o: Opportunity) =>
  isOpen(o) && !!o.deadline && o.deadline < AS_OF;

const initialForm: OpportunityForm = {
  name: "",
  location: "",
  contact: "",
  owner: "Jana Kollárová",
  stage: "New",
  potentialWorkers: "",
  nextAction: "",
  deadline: "",
};

/* ---------- Sales Page ---------- */

export default function SalesPage(): React.JSX.Element {
  const [opportunities, setOpportunities] =
    useState<Opportunity[]>(OPPORTUNITIES);

  const [showModal, setShowModal] = useState(false);

  const [selectedOpportunity, setSelectedOpportunity] =
    useState<Opportunity | null>(null);

  const [form, setForm] =
    useState<OpportunityForm>(initialForm);

  const [notes, setNotes] = useState("");

  /* ---------- Statistics ---------- */

  const stats = [
    {
      label: "Open Opportunities",
      value: opportunities.filter(isOpen).length,
      danger: false,
    },
    {
      label: "Overdue Next Actions",
      value: opportunities.filter(isOverdue).length,
      danger: true,
    },
    {
      label: "Won This Quarter",
      value: opportunities.filter(
        (o) =>
          o.stage === "Won" &&
          o.wonOn &&
          quarter(o.wonOn) === quarter(AS_OF)
      ).length,
      danger: false,
    },
  ];

  /* ---------- Escape Key ---------- */

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setShowModal(false);
        setSelectedOpportunity(null);
        setForm(initialForm);
      }
    };

    window.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener("keydown", handleEscape);
    };
  }, []);

  /* ---------- Form Handlers ---------- */

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const closeModal = () => {
    setShowModal(false);
    setForm(initialForm);
  };

  /* ---------- Opportunity Details ---------- */

  const openDetails = (opportunity: Opportunity) => {
    setSelectedOpportunity(opportunity);
    setNotes(opportunity.notes || "");
  };

  const closeDetails = () => {
    setSelectedOpportunity(null);
    setNotes("");
  };

  /* ---------- Save Notes ---------- */

  const handleSaveNotes = () => {
    if (!selectedOpportunity) return;

    const updatedOpportunity = {
      ...selectedOpportunity,
      notes: notes,
    };

    setOpportunities((prev) =>
      prev.map((o) =>
        o.id === selectedOpportunity.id
          ? updatedOpportunity
          : o
      )
    );

    setSelectedOpportunity(updatedOpportunity);
  };

  /* ---------- Save Opportunity ---------- */

  const handleSave = (
    e: React.FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();

    if (!form.name.trim()) return;

    const newOpportunity: Opportunity = {
      id: Date.now(),
      name: form.name.trim(),
      location: form.location.trim(),
      contact: form.contact.trim(),
      owner: form.owner,
      stage: form.stage,
      potentialWorkers:
        Number(form.potentialWorkers) || 0,
      nextAction: form.nextAction.trim(),
      deadline: form.deadline || null,
      wonOn: form.stage === "Won" ? AS_OF : undefined,
      notes: "",
    };

    setOpportunities((prev) => [
      ...prev,
      newOpportunity,
    ]);

    closeModal();
  };

  /* ---------- UI ---------- */

  return (
    <>
      <style>{css}</style>

      {/* Breadcrumb */}

      <nav className="sl-crumb" aria-label="Breadcrumb">
        <Link to="/admin">Home</Link>
        <ChevronRight size={14} />
        <b>Sales</b>
      </nav>

      {/* Page Header */}

      <div className="sm-title-row">
        <div>
          <h1>Sales</h1>

          <p className="sl-desc">
            Basic opportunity tracking for new factory engagements.
            No pricing, quotations or product catalogue.
          </p>
        </div>

        <button
          type="button"
          className="sm-btn sm-btn-primary"
          onClick={() => setShowModal(true)}
        >
          <Plus size={16} />
          Add Opportunity
        </button>
      </div>

      {/* Statistics */}

      <section
        className="sm-card sm-stat-group"
        style={{ gridTemplateColumns: "repeat(3, 1fr)" }}
      >
        {stats.map((s) => (
          <div key={s.label} className="sm-stat sl-stat">
            <div className="sm-stat-title">
              {s.label}
            </div>

            <div
              className={`sm-stat-value${
                s.danger ? " is-danger" : ""
              }`}
            >
              {s.value}
            </div>
          </div>
        ))}
      </section>

      {/* Opportunities Table */}

      <section className="sm-card sl-panel">
        <div className="sm-table-wrap">
          <table className="sm-table sl-table">
            <thead>
              <tr>
                <th>Company / Opportunity</th>
                <th>Location</th>
                <th>Contact</th>
                <th>Owner</th>
                <th>Stage</th>
                <th>Potential Workers</th>
                <th>Next Action</th>
                <th>Deadline</th>
              </tr>
            </thead>

            <tbody>
              {opportunities.map((o) => (
                <tr
                  key={o.id}
                  className="sl-clickable-row"
                  onClick={() => openDetails(o)}
                  title="View opportunity details"
                >
                  <td>
                    <strong>{o.name}</strong>
                  </td>

                  <td>{o.location || "—"}</td>

                  <td>{o.contact || "—"}</td>

                  <td>{o.owner}</td>

                  <td>
                    <span
                      className={`sm-pill ${STAGE_PILL[o.stage]}`}
                    >
                      {o.stage}
                    </span>
                  </td>

                  <td>{o.potentialWorkers}</td>

                  <td>
                    <span className="sl-next">
                      {o.nextAction || "—"}

                      {o.stage === "Won" && (
                        <Link
                          to="/admin/projects"
                          className="sm-link"
                          onClick={(e) => e.stopPropagation()}
                        >
                          Create Project
                        </Link>
                      )}
                    </span>
                  </td>

                  <td
                    className={
                      isOverdue(o)
                        ? "sl-overdue"
                        : undefined
                    }
                  >
                    {o.deadline
                      ? `${fmt(o.deadline)}${
                          isOverdue(o) ? " (overdue)" : ""
                        }`
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ---------- Add Opportunity Modal ---------- */}

      {showModal && (
        <div
          className="sl-modal-overlay"
          onClick={closeModal}
        >
          <div
            className="sl-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="sl-modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sl-modal-header">
              <h2 id="sl-modal-title">
                Add Opportunity
              </h2>

              <button
                type="button"
                className="sl-modal-close"
                onClick={closeModal}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSave}>
              <div className="sl-form-grid">

                <div className="sl-field full-width">
                  <label>
                    Company / Opportunity <span>*</span>
                  </label>

                  <input
                    type="text"
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="sl-field">
                  <label>Location</label>

                  <input
                    type="text"
                    name="location"
                    value={form.location}
                    onChange={handleChange}
                  />
                </div>

                <div className="sl-field">
                  <label>Contact</label>

                  <input
                    type="text"
                    name="contact"
                    value={form.contact}
                    onChange={handleChange}
                  />
                </div>

                <div className="sl-field">
                  <label>
                    Owner <span>*</span>
                  </label>

                  <select
                    name="owner"
                    value={form.owner}
                    onChange={handleChange}
                    required
                  >
                    <option value="Jana Kollárová">
                      Jana Kollárová
                    </option>

                    <option value="Peter Vrábel">
                      Peter Vrábel
                    </option>
                  </select>
                </div>

                <div className="sl-field">
                  <label>Stage</label>

                  <select
                    name="stage"
                    value={form.stage}
                    onChange={handleChange}
                  >
                    <option value="New">New</option>
                    <option value="In Discussion">
                      In Discussion
                    </option>
                    <option value="Won">Won</option>
                    <option value="Lost">Lost</option>
                  </select>
                </div>

                <div className="sl-field">
                  <label>Potential Worker Count</label>

                  <input
                    type="number"
                    name="potentialWorkers"
                    min="0"
                    value={form.potentialWorkers}
                    onChange={handleChange}
                  />
                </div>

                <div className="sl-field">
                  <label>Next Action</label>

                  <input
                    type="text"
                    name="nextAction"
                    value={form.nextAction}
                    onChange={handleChange}
                  />
                </div>

                <div className="sl-field">
                  <label>Deadline</label>

                  <input
                    type="date"
                    name="deadline"
                    value={form.deadline}
                    onChange={handleChange}
                  />
                </div>

              </div>

              <div className="sl-modal-actions">
                <button
                  type="submit"
                  className="sl-save-btn"
                >
                  Save Opportunity
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---------- Opportunity Details Modal ---------- */}

      {selectedOpportunity && (
        <div
          className="sl-modal-overlay"
          onClick={closeDetails}
        >
          <div
            className="sl-details-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="sl-details-title"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}

            <div className="sl-details-header">
              <h2 id="sl-details-title">
                {selectedOpportunity.name}
              </h2>

              <button
                type="button"
                className="sl-modal-close"
                onClick={closeDetails}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            {/* Opportunity Information */}

            <div className="sl-details-list">

              <div className="sl-details-row">
                <span>Location</span>
                <strong>
                  {selectedOpportunity.location || "—"}
                </strong>
              </div>

              <div className="sl-details-row">
                <span>Contact</span>
                <strong>
                  {selectedOpportunity.contact || "—"}
                </strong>
              </div>

              <div className="sl-details-row">
                <span>Owner</span>
                <strong>
                  {selectedOpportunity.owner}
                </strong>
              </div>

              <div className="sl-details-row">
                <span>Stage</span>
                <strong>
                  {selectedOpportunity.stage}
                </strong>
              </div>

              <div className="sl-details-row">
                <span>Potential Workers</span>
                <strong>
                  {selectedOpportunity.potentialWorkers}
                </strong>
              </div>

              <div className="sl-details-row">
                <span>Next Action</span>
                <strong>
                  {selectedOpportunity.nextAction || "—"}
                </strong>
              </div>

              <div className="sl-details-row">
                <span>Deadline</span>
                <strong>
                  {selectedOpportunity.deadline
                    ? fmt(selectedOpportunity.deadline)
                    : "—"}
                </strong>
              </div>

            </div>

            {/* Notes */}

            <div className="sl-notes-section">
              <label htmlFor="sl-opportunity-notes">
                Notes
              </label>

              <textarea
                id="sl-opportunity-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add notes about this opportunity..."
                rows={3}
              />
            </div>

            {/* Save Notes */}

            <div className="sl-details-actions">
              <button
                type="button"
                className="sl-save-notes-btn"
                onClick={handleSaveNotes}
              >
                Save Notes
              </button>
            </div>

          </div>
        </div>
      )}

    </>
  );
}

/* ---------- CSS ---------- */

const css = `

/* Breadcrumb */

.sl-crumb {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--muted);
  margin-bottom: 8px;
}

.sl-crumb b {
  color: var(--text);
  font-weight: 600;
}

.sl-desc {
  font-size: 14px;
  line-height: 1.45;
}

/* Statistics */

.sl-stat {
  min-height: 0;
  padding: 9px 14px;
}

.sl-stat .sm-stat-title {
  font-size: 12.5px;
}

.sl-stat .sm-stat-value {
  font-size: 22px;
  line-height: 1.1;
  margin-top: 3px;
}

/* Table */

.sl-panel {
  padding: 6px 0 8px;
  margin-bottom: 12px;
}

.sl-table {
  min-width: 1150px;
  font-size: 13.5px;
}

.sl-table th,
.sl-table td {
  white-space: nowrap;
  padding-left: 18px;
}

.sl-table th {
  font-size: 12.5px;
  padding-top: 8px;
  padding-bottom: 8px;
}

.sl-table td {
  padding-top: 9px;
  padding-bottom: 9px;
}

/* Row hover */

.sl-clickable-row {
  cursor: pointer;
  transition: background-color 0.15s ease;
}

.sl-clickable-row:hover {
  background-color: #f0f1f0 !important;
}

.sl-clickable-row:hover td {
  background-color: #f0f1f0 !important;
}

.sl-table .sm-pill {
  font-size: 12.5px;
  padding: 2px 10px;
}

.sl-next {
  display: inline-flex;
  align-items: center;
  gap: 12px;
}

.sl-overdue {
  color: var(--danger);
  font-weight: 500;
}

.sm-pill.muted {
  background: #eeede8;
  color: var(--muted);
}

.sm-pill.info {
  background: #e3ecfb;
  color: #2c55b8;
}

.sm-link {
  color: var(--green);
  font-weight: 600;
  font-size: 13px;
}

/* ---------- Modal Overlay ---------- */

.sl-modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;

  display: flex;
  align-items: center;
  justify-content: center;

  padding: 15px;

  background: rgba(35, 45, 39, 0.38);

  backdrop-filter: blur(5px);
  -webkit-backdrop-filter: blur(5px);
}

/* ---------- Add Opportunity Modal ---------- */

.sl-modal {
  width: 100%;
  max-width: 600px;
  max-height: calc(100vh - 50px);

  box-sizing: border-box;
  overflow-y: auto;

  background: #ffffff;
  border-radius: 14px;

  padding: 17px 20px 18px;

  box-shadow: 0 12px 35px rgba(0, 0, 0, 0.15);

  animation: sl-modal-appear 0.2s ease-out;
}

/* ---------- Details Modal ---------- */

.sl-details-modal {
  width: 100%;
  max-width: 790px;
  max-height: calc(100vh - 50px);

  box-sizing: border-box;
  overflow-y: auto;

  background: #ffffff;
  border-radius: 18px;

  padding: 28px 30px 27px;

  box-shadow: 0 18px 45px rgba(0, 0, 0, 0.16);

  animation: sl-modal-appear 0.2s ease-out;
}

@keyframes sl-modal-appear {
  from {
    opacity: 0;
    transform: translateY(8px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* ---------- Add Modal Header ---------- */

.sl-modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
}

.sl-modal-header h2 {
  margin: 0;
  font-size: 17px;
  font-weight: 650;
  color: #202722;
}

/* ---------- Details Header ---------- */

.sl-details-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 15px;
  margin-bottom: 25px;
}

.sl-details-header h2 {
  margin: 0;
  font-size: 21px;
  line-height: 1.35;
  font-weight: 650;
  color: #202722;
}

/* Close Button */

.sl-modal-close {
  display: flex;
  align-items: center;
  justify-content: center;

  flex-shrink: 0;
  width: 25px;
  height: 25px;

  padding: 0;
  border: none;

  background: transparent;
  color: #68736c;

  cursor: pointer;
}

.sl-modal-close:hover {
  color: #202722;
}

/* ---------- Form Grid ---------- */

.sl-form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));

  column-gap: 12px;
  row-gap: 9px;
}

.sl-field {
  display: flex;
  flex-direction: column;

  min-width: 0;
  gap: 4px;
}

.sl-field.full-width {
  grid-column: 1 / -1;
}

/* Form Labels */

.sl-field label {
  font-size: 12px;
  font-weight: 500;
  color: #606b64;
}

.sl-field label span {
  color: #202722;
}

/* Form Inputs */

.sl-field input,
.sl-field select {
  width: 100%;
  height: 34px;

  box-sizing: border-box;
  padding: 0 10px;

  border: 1px solid #d1d9d1;
  border-radius: 7px;

  background: #ffffff;
  color: #252b27;

  font-family: inherit;
  font-size: 12.5px;

  outline: none;

  transition: border-color 0.2s, box-shadow 0.2s;
}

.sl-field input:focus,
.sl-field select:focus {
  border-color: #16a34a;
  box-shadow: 0 0 0 2px rgba(22, 163, 74, 0.12);
}

.sl-field input::placeholder {
  color: #9ba49d;
}

.sl-field select {
  cursor: pointer;
}

/* Add Modal Save Button (brighter green) */

.sl-modal-actions {
  display: flex;
  justify-content: flex-start;
  margin-top: 12px;
}

.sl-save-btn {
  min-width: 164px;
  height: 42px;

  padding: 0 18px;

  border: none;
  border-radius: 9px;

  background: #16a34a;
  color: #ffffff;

  font-family: inherit;
  font-size: 14px;
  font-weight: 600;

  cursor: pointer;
  transition: background 0.2s ease;
}

.sl-save-btn:hover {
  background: #15803d;
}

.sl-save-btn:active {
  background: #166534;
  color: #ffffff;
}

/* Higher specificity so global button styles can't override the green */
.sl-modal .sl-modal-actions button.sl-save-btn {
  background:#166534 !important;
  color: #ffffff !important;
  border: none !important;
  border-radius: 9px;
  height: 34px;
  width: 14px;
}

.sl-modal .sl-modal-actions button.sl-save-btn:hover {
  background: #15803d !important;
}

.sl-modal .sl-modal-actions button.sl-save-btn:active {
  background: #166534 !important;
}

/* ---------- Opportunity Details ---------- */

.sl-details-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.sl-details-row {
  display: grid;
  grid-template-columns: 200px minmax(0, 1fr);
  align-items: center;
  min-height: 22px;
  gap: 16px;
}

.sl-details-row span {
  font-size: 15px;
  font-weight: 400;
  color: #606b64;
}

.sl-details-row strong {
  font-size: 15px;
  font-weight: 400;
  color: #252b27;
}

/* ---------- Notes Section ---------- */

.sl-notes-section {
  display: flex;
  flex-direction: column;
  gap: 7px;
  margin-top: 17px;
}

.sl-notes-section label {
  font-size: 14px;
  font-weight: 500;
  color: #606b64;
}

.sl-notes-section textarea {
  width: 100%;
  min-height: 84px;
  box-sizing: border-box;

  padding: 11px 13px;

  border: 1px solid #d1d9d1;
  border-radius: 10px;

  background: #ffffff;
  color: #252b27;

  font-family: inherit;
  font-size: 14px;
  line-height: 1.5;

  resize: vertical;
  outline: none;

  transition: border-color 0.2s, box-shadow 0.2s;
}

.sl-notes-section textarea:focus {
  border-color: #16a34a;
  box-shadow: 0 0 0 2px rgba(22, 163, 74, 0.12);
}

.sl-notes-section textarea::placeholder {
  color: #9ba49d;
}

/* ---------- Save Notes Button (brighter green) ---------- */

.sl-details-actions {
  display: flex;
  justify-content: flex-start;
  margin-top: 17px;
}

.sl-save-notes-btn {
  height: 37px;
  padding: 0 16px;

  border: none;
  border-radius: 9px;

  background: #16a34a;
  color: #ffffff;

  font-family: inherit;
  font-size: 14px;
  font-weight: 600;

  cursor: pointer;
  transition: background 0.2s ease;
}

.sl-save-notes-btn:hover {
  background: #15803d;
}

.sl-save-notes-btn:active {
  background: #166534;
}

/* Higher specificity so global button styles can't override the green */
.sl-details-modal .sl-details-actions button.sl-save-notes-btn {
  background: #16a34a !important;
  color: #ffffff !important;
  border: none !important;
  border-radius: 9px;
}

.sl-details-modal .sl-details-actions button.sl-save-notes-btn:hover {
  background: #15803d !important;
}

.sl-details-modal .sl-details-actions button.sl-save-notes-btn:active {
  background: #166534 !important;
}

/* ---------- Mobile Responsive ---------- */

@media (max-width: 600px) {

  .sl-modal {
    max-width: 100%;
    padding: 17px 16px;
    border-radius: 12px;
  }

  .sl-details-modal {
    max-width: 100%;
    padding: 20px 17px;
    border-radius: 14px;
  }

  .sl-details-header {
    margin-bottom: 20px;
  }

  .sl-details-header h2 {
    font-size: 17px;
  }

  .sl-details-row {
    grid-template-columns: 125px minmax(0, 1fr);
    gap: 10px;
  }

  .sl-details-row span,
  .sl-details-row strong {
    font-size: 13px;
  }

  .sl-form-grid {
    grid-template-columns: 1fr;
    row-gap: 11px;
  }

  .sl-field.full-width {
    grid-column: auto;
  }
}

`;
