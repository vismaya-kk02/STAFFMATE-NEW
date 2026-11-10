
import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ChevronRight,
  Plus,
  Search,
  Star,
  X,
} from "lucide-react";

/* ---------- Types ---------- */

type Category =
  | "Staffmate"
  | "Clients & Factories"
  | "Accommodation"
  | "Partners & Other";

interface Contact {
  id: number;
  name: string;
  role: string;
  organisation: string;
  category: Category;
  phone: string;
  email: string;
  linked: string | null;
  important: boolean;
  notes: string;
}

interface ContactForm {
  name: string;
  role: string;
  organisation: string;
  category: Category;
  phone: string;
  email: string;
  notes: string;
  important: boolean;
}

/* ---------- Initial Data ---------- */

const INITIAL: Contact[] = [
  {
    id: 1,
    name: "Jana Kollárová",
    role: "Coordinator",
    organisation: "Staffmate",
    category: "Staffmate",
    phone: "+421 900 111 222",
    email: "jana.k@staffmate.sk",
    linked: null,
    important: true,
    notes: "",
  },
  {
    id: 2,
    name: "Tomáš Beňo",
    role: "Site Manager",
    organisation: "Bosch Automotive s.r.o.",
    category: "Clients & Factories",
    phone: "+421 900 333 444",
    email: "t.beno@bosch.sk",
    linked: "AutoParts Slovakia",
    important: true,
    notes: "",
  },
  {
    id: 3,
    name: "Silvia Hraško",
    role: "Property Manager",
    organisation: "Rezidencia Partner s.r.o.",
    category: "Accommodation",
    phone: "+421 900 555 666",
    email: "silvia@rezidenciapartner.sk",
    linked: "Villa Rezidencia Trnava",
    important: true,
    notes: "",
  },
  {
    id: 4,
    name: "Peter Vrábel",
    role: "Coordinator",
    organisation: "Staffmate",
    category: "Staffmate",
    phone: "+421 900 777 888",
    email: "peter.v@staffmate.sk",
    linked: null,
    important: false,
    notes: "",
  },
  {
    id: 5,
    name: "Rudolf Baláž",
    role: "HR Manager",
    organisation: "Kia Motors Slovakia",
    category: "Clients & Factories",
    phone: "+421 900 222 111",
    email: "r.balaz@kia.sk",
    linked: "Line 3 Assembly",
    important: false,
    notes: "",
  },
  {
    id: 6,
    name: "Roman Kubiš",
    role: "Owner",
    organisation: "Nitra Hostel s.r.o.",
    category: "Accommodation",
    phone: "+421 900 888 999",
    email: "roman@nitrahostel.sk",
    linked: "Hostel Nitra Central",
    important: false,
    notes: "",
  },
];

const TABS = [
  "All",
  "Staffmate",
  "Clients & Factories",
  "Accommodation",
  "Partners & Other",
] as const;

type Tab = (typeof TABS)[number];

const EMPTY_FORM: ContactForm = {
  name: "",
  role: "",
  organisation: "",
  category: "Staffmate",
  phone: "",
  email: "",
  notes: "",
  important: false,
};

/* ---------- Page ---------- */

export default function ContactsPage(): React.JSX.Element {
  const [contacts, setContacts] = useState<Contact[]>(INITIAL);

  const [tab, setTab] = useState<Tab>("All");
  const [query, setQuery] = useState("");
  const [importantOnly, setImportantOnly] = useState(false);

  // Add modal
  const [showAddModal, setShowAddModal] = useState(false);

  // Edit modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedContactId, setSelectedContactId] = useState<number | null>(null);

  // Shared form
  const [form, setForm] = useState<ContactForm>(EMPTY_FORM);

  /* ---------- Filter Contacts ---------- */

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();

    return contacts
      .filter((c) => tab === "All" || c.category === tab)
      .filter((c) => !importantOnly || c.important)
      .filter(
        (c) =>
          !q ||
          c.name.toLowerCase().includes(q) ||
          c.organisation.toLowerCase().includes(q)
      );
  }, [contacts, tab, query, importantOnly]);

  /* ---------- Form Change ---------- */

  const handleFormChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  /* ---------- Toggle Important ---------- */

  const toggleImportant = (id: number) => {
    setContacts((prev) =>
      prev.map((c) =>
        c.id === id ? { ...c, important: !c.important } : c
      )
    );
  };

  /* ---------- Open Add Modal ---------- */

  const openAddModal = () => {
    setForm(EMPTY_FORM);
    setShowAddModal(true);
  };

  /* ---------- Open Edit Modal ---------- */

  const openEditModal = (contact: Contact) => {
    setSelectedContactId(contact.id);

    setForm({
      name: contact.name,
      role: contact.role,
      organisation: contact.organisation,
      category: contact.category,
      phone: contact.phone,
      email: contact.email,
      notes: contact.notes || "",
      important: contact.important,
    });

    setShowEditModal(true);
  };

  /* ---------- Close Modals ---------- */

  const closeModal = () => {
    setShowAddModal(false);
    setShowEditModal(false);
    setSelectedContactId(null);
    setForm(EMPTY_FORM);
  };

  /* ---------- Save New Contact ---------- */

  const handleSaveContact = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const newContact: Contact = {
      id: Math.max(0, ...contacts.map((c) => c.id)) + 1,
      name: form.name.trim(),
      role: form.role.trim(),
      organisation: form.organisation.trim(),
      category: form.category,
      phone: form.phone.trim(),
      email: form.email.trim(),
      linked: null,
      important: false,
      notes: form.notes.trim(),
    };

    setContacts((prev) => [...prev, newContact]);

    setTab("All");
    setQuery("");
    setImportantOnly(false);

    closeModal();
  };

  /* ---------- Save Edited Contact ---------- */

  const handleSaveChanges = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (selectedContactId === null) return;

    setContacts((prev) =>
      prev.map((contact) =>
        contact.id === selectedContactId
          ? {
              ...contact,
              name: form.name.trim(),
              role: form.role.trim(),
              organisation: form.organisation.trim(),
              category: form.category,
              phone: form.phone.trim(),
              email: form.email.trim(),
              notes: form.notes.trim(),
              important: form.important,
            }
          : contact
      )
    );

    closeModal();
  };

  /* ---------- Modal Overlay Close ---------- */

  const handleOverlayMouseDown = (
    e: React.MouseEvent<HTMLDivElement>
  ) => {
    if (e.target === e.currentTarget) {
      closeModal();
    }
  };

  return (
    <>
      <style>{css}</style>

      {/* Breadcrumb */}

      <nav className="ct-crumb" aria-label="Breadcrumb">
        <Link to="/admin">Home</Link>
        <ChevronRight size={14} />
        <b>Contacts</b>
      </nav>

      {/* Page Heading */}

      <div className="sm-title-row">
        <div>
          <h1>Contacts</h1>

          <p className="ct-desc">
            One shared directory across Staffmate, clients,
            accommodation partners and other organisations.
            Updating a contact here updates it everywhere it's linked.
          </p>
        </div>

        <button
          type="button"
          className="sm-btn sm-btn-primary"
          onClick={openAddModal}
        >
          <Plus size={16} />
          Add Contact
        </button>
      </div>

      {/* Category Tabs */}

      <div className="ct-tabs" role="tablist">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            className={tab === t ? "is-active" : ""}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Contacts Table */}

      <section className="sm-card ct-panel">
        <div className="ct-toolbar">

          <label className="ct-search">
            <Search size={16} />

            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search name or organisation"
            />
          </label>

          <label className="ct-check">
            <input
              type="checkbox"
              checked={importantOnly}
              onChange={(e) => setImportantOnly(e.target.checked)}
            />

            Important contacts only
          </label>

        </div>

        <div className="sm-table-wrap">
          <table className="sm-table ct-table">

            <thead>
              <tr>
                <th>Name</th>
                <th>Role</th>
                <th>Organisation</th>
                <th>Category</th>
                <th>Phone</th>
                <th>Email</th>
                <th>Linked</th>
                <th>Important</th>
              </tr>
            </thead>

            <tbody>
              {rows.map((c) => (
                <tr key={c.id}>

                  <td>
                    <button
                      type="button"
                      className="ct-name-button"
                      onClick={() => openEditModal(c)}
                      aria-label={`Edit contact ${c.name}`}
                    >
                      {c.name}
                    </button>
                  </td>

                  <td>{c.role || "—"}</td>
                  <td>{c.organisation || "—"}</td>
                  <td>{c.category}</td>
                  <td>{c.phone || "—"}</td>
                  <td>{c.email || "—"}</td>

                  <td>
                    {c.linked ? (
                      <strong>{c.linked}</strong>
                    ) : (
                      "—"
                    )}
                  </td>

                  <td>
                    <button
                      type="button"
                      className={`ct-star${c.important ? " is-on" : ""}`}
                      onClick={() => toggleImportant(c.id)}
                      aria-label={
                        c.important
                          ? `Unmark ${c.name} as important`
                          : `Mark ${c.name} as important`
                      }
                      aria-pressed={c.important}
                    >
                      {c.important ? (
                        <Star size={17} fill="currentColor" />
                      ) : (
                        "—"
                      )}
                    </button>
                  </td>

                </tr>
              ))}

              {rows.length === 0 && (
                <tr>
                  <td colSpan={8} className="ct-none">
                    No contacts match.
                  </td>
                </tr>
              )}

            </tbody>
          </table>
        </div>
      </section>

      {/* ADD CONTACT MODAL */}

      {showAddModal && (
        <div
          className="ct-modal-overlay"
          onMouseDown={handleOverlayMouseDown}
        >
          <div
            className="ct-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="ct-add-title"
          >

            <div className="ct-modal-header">
              <h2 id="ct-add-title">Add Contact</h2>

              <button
                type="button"
                className="ct-modal-close"
                onClick={closeModal}
                aria-label="Close modal"
              >
                <X size={19} />
              </button>
            </div>

            <form onSubmit={handleSaveContact}>

              <div className="ct-form-grid">

                <div className="ct-field">
                  <label htmlFor="add-name">
                    Name <span>*</span>
                  </label>
                  <input
                    id="add-name"
                    name="name"
                    value={form.name}
                    onChange={handleFormChange}
                    required
                  />
                </div>

                <div className="ct-field">
                  <label htmlFor="add-role">Role</label>
                  <input
                    id="add-role"
                    name="role"
                    value={form.role}
                    onChange={handleFormChange}
                  />
                </div>

                <div className="ct-field">
                  <label htmlFor="add-organisation">Organisation</label>
                  <input
                    id="add-organisation"
                    name="organisation"
                    value={form.organisation}
                    onChange={handleFormChange}
                  />
                </div>

                <div className="ct-field">
                  <label htmlFor="add-category">Category</label>
                  <select
                    id="add-category"
                    name="category"
                    value={form.category}
                    onChange={handleFormChange}
                  >
                    {TABS.slice(1).map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="ct-field">
                  <label htmlFor="add-phone">Telephone</label>
                  <input
                    id="add-phone"
                    name="phone"
                    type="tel"
                    value={form.phone}
                    onChange={handleFormChange}
                  />
                </div>

                <div className="ct-field">
                  <label htmlFor="add-email">Email</label>
                  <input
                    id="add-email"
                    name="email"
                    type="email"
                    value={form.email}
                    onChange={handleFormChange}
                  />
                </div>

              </div>

              <div className="ct-modal-actions">
                <button type="submit" className="ct-save-btn">
                  Save Contact
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* EDIT CONTACT MODAL */}

      {showEditModal && (
        <div
          className="ct-modal-overlay"
          onMouseDown={handleOverlayMouseDown}
        >
          <div
            className="ct-modal ct-edit-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="ct-edit-title"
          >

            {/* Header */}

            <div className="ct-modal-header">
              <h2 id="ct-edit-title">
                {form.name || "Edit Contact"}
              </h2>

              <button
                type="button"
                className="ct-modal-close"
                onClick={closeModal}
                aria-label="Close modal"
              >
                <X size={19} />
              </button>
            </div>

            {/* Edit Form */}

            <form onSubmit={handleSaveChanges}>

              <div className="ct-form-grid">

                {/* Name */}

                <div className="ct-field">
                  <label htmlFor="edit-name">Name</label>

                  <input
                    id="edit-name"
                    name="name"
                    value={form.name}
                    onChange={handleFormChange}
                    required
                  />
                </div>

                {/* Role */}

                <div className="ct-field">
                  <label htmlFor="edit-role">Role</label>

                  <input
                    id="edit-role"
                    name="role"
                    value={form.role}
                    onChange={handleFormChange}
                  />
                </div>

                {/* Organisation */}

                <div className="ct-field">
                  <label htmlFor="edit-organisation">
                    Organisation
                  </label>

                  <input
                    id="edit-organisation"
                    name="organisation"
                    value={form.organisation}
                    onChange={handleFormChange}
                  />
                </div>

                {/* Phone */}

                <div className="ct-field">
                  <label htmlFor="edit-phone">Phone</label>

                  <input
                    id="edit-phone"
                    name="phone"
                    type="tel"
                    value={form.phone}
                    onChange={handleFormChange}
                  />
                </div>

                {/* Email - Full Width */}

                <div className="ct-field ct-full-width">
                  <label htmlFor="edit-email">Email</label>

                  <input
                    id="edit-email"
                    name="email"
                    type="email"
                    value={form.email}
                    onChange={handleFormChange}
                  />
                </div>

                {/* Notes - Full Width */}

                <div className="ct-field ct-full-width">
                  <label htmlFor="edit-notes">Notes</label>

                  <textarea
                    id="edit-notes"
                    name="notes"
                    value={form.notes}
                    onChange={handleFormChange}
                    rows={3}
                  />
                </div>

              </div>

              {/* Important Contact Checkbox */}

              <label className="ct-important-option">
                <input
                  type="checkbox"
                  checked={form.important}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      important: e.target.checked,
                    }))
                  }
                />

                <span>
                  Show as Important Contact (appears on Overview)
                </span>
              </label>

              {/* Save Changes */}

              <div className="ct-modal-actions">
                <button type="submit" className="ct-save-btn">
                  Save Changes
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </>
  );
}

/* ---------- CSS ---------- */

const css = `

/* Breadcrumb */

.ct-crumb {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--muted);
  margin-bottom: 8px;
}

.ct-crumb b {
  color: var(--text);
  font-weight: 600;
}

.ct-desc {
  max-width: 780px;
  font-size: 14px;
  line-height: 1.45;
}

/* Tabs */

.ct-tabs {
  display: flex;
  gap: 4px;
  overflow-x: auto;
  border-bottom: 1px solid var(--line);
  margin-bottom: 12px;
  scrollbar-width: none;
}

.ct-tabs::-webkit-scrollbar {
  display: none;
}

.ct-tabs button {
  flex: none;
  padding: 8px 14px;
  font-size: 14px;
  color: var(--muted);
  white-space: nowrap;
  border: none;
  background: transparent;
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
  cursor: pointer;
}

.ct-tabs button.is-active {
  color: var(--green);
  font-weight: 600;
  border-bottom-color: var(--green);
}

/* Table Panel */

.ct-panel {
  padding: 0 0 8px;
  margin-bottom: 12px;
}

.ct-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 12px 16px 10px;
}

.ct-search {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 270px;
  max-width: 100%;
  height: 34px;
  padding: 0 10px;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: #faf9f6;
  color: var(--muted);
}

.ct-search input {
  flex: 1;
  min-width: 0;
  border: 0;
  background: transparent;
  outline: none;
  font-size: 13.5px;
  color: var(--text);
}

.ct-check {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13.5px;
  cursor: pointer;
}

.ct-check input {
  width: 16px;
  height: 16px;
  accent-color: var(--green);
}

/* Table */

.ct-table {
  min-width: 1100px;
  font-size: 13.5px;
}

.ct-table th,
.ct-table td {
  white-space: nowrap;
  padding-left: 18px;
}

.ct-table th {
  font-size: 12.5px;
  padding-top: 8px;
  padding-bottom: 8px;
}

.ct-table td {
  padding-top: 8px;
  padding-bottom: 8px;
}

/* Grey Row Hover */

.ct-table tbody tr {
  transition: background-color 0.18s ease;
}

.ct-table tbody tr:hover {
  background-color: #f0f1ef;
}

/* Contact Name Button */

.ct-name-button {
  border: none;
  padding: 0;
  background: transparent;
  color: inherit;
  font-family: inherit;
  font-size: inherit;
  font-weight: 600;
  text-align: left;
  cursor: pointer;
}

.ct-name-button:hover {
  color: #147333;
  text-decoration: underline;
}

/* Important Star */

.ct-star {
  display: inline-grid;
  place-items: center;
  min-width: 20px;
  border: none;
  background: transparent;
  color: var(--muted);
  cursor: pointer;
}

.ct-star.is-on {
  color: #e8a817;
}

.ct-none {
  padding: 22px 18px !important;
  font-size: 13.5px;
  color: var(--muted);
}

/* Modal Overlay */

.ct-modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;

  display: flex;
  align-items: center;
  justify-content: center;

  padding: 20px;
  box-sizing: border-box;

  background: rgba(35, 45, 39, 0.38);

  backdrop-filter: blur(5px);
  -webkit-backdrop-filter: blur(5px);
}

/* Modal Card */

.ct-modal {
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

/* Modal Header */

.ct-modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 26px;
}

.ct-modal-header h2 {
  margin: 0;
  font-size: 21px;
  font-weight: 650;
  line-height: 1.3;
  color: #202722;
}

.ct-modal-close {
  display: flex;
  align-items: center;
  justify-content: center;

  width: 28px;
  height: 28px;
  padding: 0;

  border: none;
  border-radius: 5px;

  background: transparent;
  color: #68736c;
  cursor: pointer;
}

.ct-modal-close:hover {
  background: #f1f3f1;
  color: #202722;
}

/* Form Grid */

.ct-form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  column-gap: 15px;
  row-gap: 16px;
}

.ct-field {
  display: flex;
  flex-direction: column;
  min-width: 0;
  gap: 6px;
}

.ct-field label {
  font-size: 14px;
  font-weight: 500;
  color: #606b64;
}

.ct-field label span {
  color: #202722;
}

/* Inputs and Select */

.ct-field input,
.ct-field select,
.ct-field textarea {
  width: 100%;
  box-sizing: border-box;
  padding: 0 13px;

  border: 1px solid #d1d9d1;
  border-radius: 10px;

  background: #fff;
  color: #252b27;

  font-family: inherit;
  font-size: 14px;

  outline: none;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.ct-field input,
.ct-field select {
  height: 42px;
}

.ct-field textarea {
  min-height: 84px;
  padding: 10px 13px;
  resize: vertical;
  line-height: 1.5;
}

.ct-field input:focus,
.ct-field select:focus,
.ct-field textarea:focus {
  border-color: #16733a;
  box-shadow: 0 0 0 3px rgba(22, 115, 58, 0.08);
}

/* Full Width Fields */

.ct-full-width {
  grid-column: 1 / -1;
}

/* Important Contact */

.ct-important-option {
  display: flex;
  align-items: center;
  gap: 11px;
  margin-top: 30px;

  font-size: 14px;
  color: #252b27;
  cursor: pointer;
}

.ct-important-option input {
  width: 18px;
  height: 18px;
  margin: 0;
  accent-color: #147333;
  cursor: pointer;
}

/* Modal Actions */

.ct-modal-actions {
  display: flex;
  justify-content: flex-start;
  margin-top: 16px;
}

.ct-save-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;

  height: 42px;
  padding: 0 18px;

  border: none;
  border-radius: 9px;

  background: #147333;
  color: #fff;

  font-family: inherit;
  font-size: 14px;
  font-weight: 600;

  cursor: pointer;
  transition: background 0.2s;
}

.ct-save-btn:hover {
  background: #105e2a;
}

/* Responsive */

@media (max-width: 600px) {

  .ct-modal-overlay {
    padding: 12px;
  }

  .ct-modal {
    padding: 22px 18px;
    border-radius: 14px;
  }

  .ct-modal-header {
    margin-bottom: 20px;
  }

  .ct-form-grid {
    grid-template-columns: 1fr;
    row-gap: 14px;
  }

  .ct-full-width {
    grid-column: auto;
  }

  .ct-toolbar {
    align-items: flex-start;
    flex-direction: column;
  }

  .ct-search {
    width: 100%;
    box-sizing: border-box;
  }

  .ct-important-option {
    align-items: flex-start;
    line-height: 1.5;
    margin-top: 22px;
  }
}

`;
