import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronRight, Plus, Search, Star, X } from "lucide-react";

/* ---------- Types ---------- */

type PersonCategory =
  | "Staffmate"
  | "Clients & Factories"
  | "Accommodation"
  | "Partners & Other";

type CompanyType =
  | "Client / Factory"
  | "Accommodation partner"
  | "Staffmate"
  | "Partner / Other";

interface Contact {
  id: number;
  name: string;
  role: string;
  organisation: string;
  category: PersonCategory;
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
  category: PersonCategory;
  phone: string;
  email: string;
  notes: string;
  important: boolean;
}

interface Company {
  id: number;
  name: string;
  type: CompanyType;
  companyId: string;
  taxId: string;
  vatId: string;
  address: string;
  website: string;
  notes: string;
  people: number;
  projects: number;
  facilities: number;
}

interface CompanyForm {
  name: string;
  type: CompanyType;
  companyId: string;
  taxId: string;
  vatId: string;
  address: string;
  website: string;
  notes: string;
}

type View = "people" | "companies";

/* ---------- Data ---------- */

const INITIAL_CONTACTS: Contact[] = [
  { id: 1, name: "Jana Kollárová", role: "Coordinator", organisation: "Staffmate s. r. o.", category: "Staffmate", phone: "+421 900 111 222", email: "jana.k@staffmate.sk", linked: null, important: true, notes: "" },
  { id: 2, name: "Peter Vrábel", role: "Coordinator", organisation: "Staffmate s. r. o.", category: "Staffmate", phone: "+421 900 777 888", email: "peter.v@staffmate.sk", linked: null, important: false, notes: "" },
];

const company = (
  id: number,
  name: string,
  type: CompanyType,
  address: string,
  people: number,
  projects: number,
  facilities: number,
  companyId = "",
  vatId = ""
): Company => ({
  id, name, type, companyId, taxId: "", vatId, address, website: "", notes: "", people, projects, facilities,
});

const INITIAL_COMPANIES: Company[] = [
  company(1, "Staffmate s. r. o.", "Staffmate", "Kúpeľná 2247/2, 927 01 Šaľa", 2, 0, 0, "56887744", "SK2122484936"),
  company(2, "Bosch Automotive s.r.o.", "Client / Factory", "Priemyselná 12, 917 01 Trnava", 1, 1, 0),
  company(3, "Kia Motors Slovakia", "Client / Factory", "Sv. Cyrila a Metoda 1, 010 01 Žilina", 1, 1, 0),
  company(4, "DHL Logistics SK", "Client / Factory", "Diaľničná 5, 903 01 Bratislava", 0, 1, 0),
  company(5, "Nestlé Slovensko", "Client / Factory", "Bojnická cesta 3, 971 01 Prievidza", 0, 1, 0),
  company(6, "ZF Slovakia", "Client / Factory", "Nitrianska 15, 917 02 Trnava", 0, 1, 0),
  company(7, "Lidl Distribučné centrum", "Client / Factory", "Diaľničná 2, 926 01 Sereď", 0, 1, 0),
  company(8, "Rezidencia Partner s.r.o.", "Accommodation partner", "Kollárova 8, 917 01 Trnava", 1, 0, 1),
  company(9, "Nitra Hostel s.r.o.", "Accommodation partner", "Štefánikova 21, 949 01 Nitra", 1, 0, 1),
  company(10, "Sereď Ubytovanie s.r.o.", "Accommodation partner", "Priemyselná 4, 926 01 Sereď", 0, 0, 1),
  company(11, "Žilina Penzión s.r.o.", "Accommodation partner", "Bratislavská 44, 010 01 Žilina", 0, 0, 1),
  company(12, "BA Lodge s.r.o.", "Accommodation partner", "Trnavská cesta 100, 821 01 Bratislava", 0, 0, 1),
  company(13, "", "Accommodation partner", "", 0, 0, 1),
];

const PEOPLE_TABS = ["All", "Staffmate", "Clients & Factories", "Accommodation", "Partners & Other"] as const;
const COMPANY_TABS = ["All", "Clients & Factories", "Accommodation", "Partners & Other", "Staffmate"] as const;

type PeopleTab = (typeof PEOPLE_TABS)[number];
type CompanyTab = (typeof COMPANY_TABS)[number];

const TAB_TO_TYPE: Record<string, CompanyType> = {
  "Clients & Factories": "Client / Factory",
  Accommodation: "Accommodation partner",
  "Partners & Other": "Partner / Other",
  Staffmate: "Staffmate",
};

const COMPANY_TYPES: CompanyType[] = ["Client / Factory", "Accommodation partner", "Staffmate", "Partner / Other"];

const EMPTY_CONTACT: ContactForm = {
  name: "", role: "", organisation: "", category: "Staffmate", phone: "", email: "", notes: "", important: false,
};

const EMPTY_COMPANY: CompanyForm = {
  name: "", type: "Client / Factory", companyId: "", taxId: "", vatId: "", address: "", website: "", notes: "",
};

const typeClass = (t: CompanyType) =>
  t === "Client / Factory" ? "t-client" : t === "Accommodation partner" ? "t-accom" : t === "Staffmate" ? "t-staff" : "t-other";

/* ---------- Page ---------- */

export default function ContactsPage(): React.JSX.Element {
  const [view, setView] = useState<View>("people");

  /* people */
  const [contacts, setContacts] = useState<Contact[]>(INITIAL_CONTACTS);
  const [peopleTab, setPeopleTab] = useState<PeopleTab>("All");
  const [peopleQuery, setPeopleQuery] = useState("");
  const [importantOnly, setImportantOnly] = useState(false);
  const [contactModal, setContactModal] = useState<"add" | "edit" | null>(null);
  const [selectedContactId, setSelectedContactId] = useState<number | null>(null);
  const [contactForm, setContactForm] = useState<ContactForm>(EMPTY_CONTACT);

  /* companies */
  const [companies, setCompanies] = useState<Company[]>(INITIAL_COMPANIES);
  const [companyTab, setCompanyTab] = useState<CompanyTab>("All");
  const [companyQuery, setCompanyQuery] = useState("");
  const [companyModal, setCompanyModal] = useState(false);
  const [companyForm, setCompanyForm] = useState<CompanyForm>(EMPTY_COMPANY);

  const modalOpen = contactModal !== null || companyModal;

  const closeModals = () => {
    setContactModal(null);
    setCompanyModal(false);
    setSelectedContactId(null);
    setContactForm(EMPTY_CONTACT);
    setCompanyForm(EMPTY_COMPANY);
  };

  useEffect(() => {
    if (!modalOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && closeModals();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [modalOpen]);

  /* ---------- filters ---------- */

  const peopleRows = useMemo(() => {
    const q = peopleQuery.trim().toLowerCase();
    return contacts
      .filter((c) => peopleTab === "All" || c.category === peopleTab)
      .filter((c) => !importantOnly || c.important)
      .filter((c) => !q || c.name.toLowerCase().includes(q) || c.organisation.toLowerCase().includes(q));
  }, [contacts, peopleTab, peopleQuery, importantOnly]);

  const companyRows = useMemo(() => {
    const q = companyQuery.trim().toLowerCase();
    return companies
      .filter((c) => companyTab === "All" || c.type === TAB_TO_TYPE[companyTab])
      .filter((c) => !q || c.name.toLowerCase().includes(q) || c.vatId.toLowerCase().includes(q) || c.companyId.includes(q));
  }, [companies, companyTab, companyQuery]);

  /* ---------- people actions ---------- */

  const onContactChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => setContactForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const toggleImportant = (id: number) =>
    setContacts((prev) => prev.map((c) => (c.id === id ? { ...c, important: !c.important } : c)));

  const openAddContact = () => {
    setContactForm(EMPTY_CONTACT);
    setContactModal("add");
  };

  const openEditContact = (c: Contact) => {
    setSelectedContactId(c.id);
    setContactForm({
      name: c.name, role: c.role, organisation: c.organisation, category: c.category,
      phone: c.phone, email: c.email, notes: c.notes || "", important: c.important,
    });
    setContactModal("edit");
  };

  const saveNewContact = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = contactForm;
    setContacts((prev) => [
      ...prev,
      {
        id: Math.max(0, ...prev.map((c) => c.id)) + 1,
        name: f.name.trim(), role: f.role.trim(), organisation: f.organisation.trim(),
        category: f.category, phone: f.phone.trim(), email: f.email.trim(),
        linked: null, important: false, notes: f.notes.trim(),
      },
    ]);
    setPeopleTab("All");
    setPeopleQuery("");
    setImportantOnly(false);
    closeModals();
  };

  const saveEditedContact = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (selectedContactId === null) return;
    const f = contactForm;
    setContacts((prev) =>
      prev.map((c) =>
        c.id === selectedContactId
          ? {
              ...c,
              name: f.name.trim(), role: f.role.trim(), organisation: f.organisation.trim(),
              category: f.category, phone: f.phone.trim(), email: f.email.trim(),
              notes: f.notes.trim(), important: f.important,
            }
          : c
      )
    );
    closeModals();
  };

  /* ---------- company actions ---------- */

  const onCompanyChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => setCompanyForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const openAddCompany = () => {
    setCompanyForm(EMPTY_COMPANY);
    setCompanyModal(true);
  };

  const saveCompany = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = companyForm;
    setCompanies((prev) => [
      ...prev,
      {
        id: Math.max(0, ...prev.map((c) => c.id)) + 1,
        name: f.name.trim(), type: f.type, companyId: f.companyId.trim(), taxId: f.taxId.trim(),
        vatId: f.vatId.trim(), address: f.address.trim(), website: f.website.trim(), notes: f.notes.trim(),
        people: 0, projects: 0, facilities: 0,
      },
    ]);
    setCompanyTab("All");
    setCompanyQuery("");
    closeModals();
  };

  const onOverlayDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) closeModals();
  };

  const dash = (v: string) => (v ? v : "—");

  return (
    <>
      <style>{css}</style>

      <nav className="ct-crumb" aria-label="Breadcrumb">
        <Link to="/admin">Home</Link>
        <ChevronRight size={14} />
        <b>Contacts</b>
      </nav>

      <div className="sm-title-row">
        <div className="sm-title-text">
          <h1>Contacts</h1>
          <p className="ct-desc">
            {view === "people"
              ? "One shared directory across Staffmate, clients, accommodation partners and other organisations. Updating a contact here updates it everywhere it's linked."
              : "One record per company, reused across projects, accommodation facilities and contacts. Contracts are not kept here."}
          </p>
        </div>

        <button
          type="button"
          className="sm-btn sm-btn-primary"
          onClick={view === "people" ? openAddContact : openAddCompany}
        >
          <Plus size={16} />
          {view === "people" ? "Add Contact" : "Add Company"}
        </button>
      </div>

      {/* People / Companies */}
      <div className="ct-tabs ct-tabs-main" role="tablist" aria-label="Contact type">
        {(["people", "companies"] as View[]).map((v) => (
          <button
            key={v}
            type="button"
            role="tab"
            aria-selected={view === v}
            className={view === v ? "is-active" : ""}
            onClick={() => setView(v)}
          >
            {v === "people" ? "People" : "Companies"}
          </button>
        ))}
      </div>

      {/* Category tabs */}
      <div className="ct-tabs ct-tabs-sub" role="tablist" aria-label="Category">
        {view === "people"
          ? PEOPLE_TABS.map((t) => (
              <button key={t} type="button" role="tab" aria-selected={peopleTab === t}
                className={peopleTab === t ? "is-active" : ""} onClick={() => setPeopleTab(t)}>
                {t}
              </button>
            ))
          : COMPANY_TABS.map((t) => (
              <button key={t} type="button" role="tab" aria-selected={companyTab === t}
                className={companyTab === t ? "is-active" : ""} onClick={() => setCompanyTab(t)}>
                {t}
              </button>
            ))}
      </div>

      {/* PEOPLE TABLE */}
      {view === "people" && (
        <section className="sm-card ct-panel">
          <div className="ct-toolbar">
            <label className="ct-search ct-search-people">
              <Search size={16} />
              <input
                value={peopleQuery}
                onChange={(e) => setPeopleQuery(e.target.value)}
                placeholder="Search name or organisation"
              />
            </label>

            <label className="ct-check">
              <input type="checkbox" checked={importantOnly} onChange={(e) => setImportantOnly(e.target.checked)} />
              Important contacts only
            </label>
          </div>

          <div className="sm-table-wrap">
            <table className="sm-table ct-table ct-table-people">
              <thead>
                <tr>
                  <th>Name</th><th>Role</th><th>Organisation</th><th>Category</th>
                  <th>Phone</th><th>Email</th><th>Linked</th><th>Important</th>
                </tr>
              </thead>
              <tbody>
                {peopleRows.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <button type="button" className="ct-name-button" onClick={() => openEditContact(c)}
                        aria-label={`Edit contact ${c.name}`}>
                        {c.name}
                      </button>
                    </td>
                    <td>{dash(c.role)}</td>
                    <td><strong>{dash(c.organisation)}</strong></td>
                    <td>{c.category}</td>
                    <td>{dash(c.phone)}</td>
                    <td>{dash(c.email)}</td>
                    <td>{c.linked ? <strong>{c.linked}</strong> : "—"}</td>
                    <td>
                      <button
                        type="button"
                        className={`ct-star${c.important ? " is-on" : ""}`}
                        onClick={() => toggleImportant(c.id)}
                        aria-pressed={c.important}
                        aria-label={c.important ? `Unmark ${c.name} as important` : `Mark ${c.name} as important`}
                      >
                        {c.important ? <Star size={18} /> : "—"}
                      </button>
                    </td>
                  </tr>
                ))}
                {peopleRows.length === 0 && (
                  <tr><td colSpan={8} className="ct-none">No contacts match.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* COMPANIES TABLE */}
      {view === "companies" && (
        <section className="sm-card ct-panel">
          <div className="ct-toolbar">
            <label className="ct-search ct-search-company">
              <Search size={16} />
              <input
                value={companyQuery}
                onChange={(e) => setCompanyQuery(e.target.value)}
                placeholder="Search company name or Co"
              />
            </label>
          </div>

          <div className="sm-table-wrap">
            <table className="sm-table ct-table">
              <thead>
                <tr>
                  <th>Company</th><th>Type</th><th>Company ID</th><th>VAT ID</th>
                  <th>Address</th><th>People</th><th>Projects</th><th>Facilities</th>
                </tr>
              </thead>
              <tbody>
                {companyRows.map((c) => (
                  <tr key={c.id}>
                    <td><strong className="ct-company-name">{dash(c.name)}</strong></td>
                    <td><span className={`ct-type ${typeClass(c.type)}`}>{c.type}</span></td>
                    <td>{dash(c.companyId)}</td>
                    <td>{dash(c.vatId)}</td>
                    <td>{dash(c.address)}</td>
                    <td>{c.people}</td>
                    <td>{c.projects}</td>
                    <td>{c.facilities}</td>
                  </tr>
                ))}
                {companyRows.length === 0 && (
                  <tr><td colSpan={8} className="ct-none">No companies match.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* ADD COMPANY MODAL */}
      {companyModal && (
        <div className="ct-modal-overlay" onMouseDown={onOverlayDown}>
          <div className="ct-modal" role="dialog" aria-modal="true" aria-labelledby="ct-company-title">
            <div className="ct-modal-header">
              <h2 id="ct-company-title">Add Company</h2>
              <button type="button" className="ct-modal-close" onClick={closeModals} aria-label="Close">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={saveCompany}>
              <div className="ct-form-grid">
                <div className="ct-field ct-full">
                  <label htmlFor="co-name">Company name <span>*</span></label>
                  <input id="co-name" name="name" value={companyForm.name} onChange={onCompanyChange} required />
                </div>

                <div className="ct-field">
                  <label htmlFor="co-type">Type <span>*</span></label>
                  <select id="co-type" name="type" value={companyForm.type} onChange={onCompanyChange}>
                    {COMPANY_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>

                <div className="ct-field">
                  <label htmlFor="co-id">Company ID</label>
                  <input id="co-id" name="companyId" value={companyForm.companyId} onChange={onCompanyChange} />
                </div>

                <div className="ct-field">
                  <label htmlFor="co-tax">Tax ID</label>
                  <input id="co-tax" name="taxId" value={companyForm.taxId} onChange={onCompanyChange} />
                </div>

                <div className="ct-field">
                  <label htmlFor="co-vat">VAT ID</label>
                  <input id="co-vat" name="vatId" value={companyForm.vatId} onChange={onCompanyChange} />
                </div>

                <div className="ct-field ct-full">
                  <label htmlFor="co-address">Registered address</label>
                  <input id="co-address" name="address" value={companyForm.address} onChange={onCompanyChange} />
                </div>

                <div className="ct-field ct-full">
                  <label htmlFor="co-web">Website</label>
                  <input id="co-web" name="website" value={companyForm.website} onChange={onCompanyChange} />
                </div>

                <div className="ct-field ct-full">
                  <label htmlFor="co-notes">Notes</label>
                  <textarea id="co-notes" name="notes" rows={2} value={companyForm.notes} onChange={onCompanyChange} />
                </div>
              </div>

              <p className="ct-hint">
                A draft only needs a name and type. Contracts are managed under the project or facility, not here.
              </p>

              <div className="ct-modal-actions">
                <button type="submit" className="ct-save-btn">Save Company</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD / EDIT CONTACT MODAL */}
      {contactModal && (
        <div className="ct-modal-overlay" onMouseDown={onOverlayDown}>
          <div className="ct-modal" role="dialog" aria-modal="true" aria-labelledby="ct-contact-title">
            <div className="ct-modal-header">
              <h2 id="ct-contact-title">
                {contactModal === "add" ? "Add Contact" : contactForm.name || "Edit Contact"}
              </h2>
              <button type="button" className="ct-modal-close" onClick={closeModals} aria-label="Close">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={contactModal === "add" ? saveNewContact : saveEditedContact}>
              <div className="ct-form-grid">
                <div className="ct-field">
                  <label htmlFor="ctc-name">Name <span>*</span></label>
                  <input id="ctc-name" name="name" value={contactForm.name} onChange={onContactChange} required />
                </div>

                <div className="ct-field">
                  <label htmlFor="ctc-role">Role</label>
                  <input id="ctc-role" name="role" value={contactForm.role} onChange={onContactChange} />
                </div>

                <div className="ct-field">
                  <label htmlFor="ctc-org">Organisation</label>
                  <input id="ctc-org" name="organisation" value={contactForm.organisation} onChange={onContactChange} />
                </div>

                <div className="ct-field">
                  <label htmlFor="ctc-cat">Category</label>
                  <select id="ctc-cat" name="category" value={contactForm.category} onChange={onContactChange}>
                    {PEOPLE_TABS.slice(1).map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                <div className="ct-field">
                  <label htmlFor="ctc-phone">Telephone</label>
                  <input id="ctc-phone" name="phone" type="tel" value={contactForm.phone} onChange={onContactChange} />
                </div>

                <div className="ct-field">
                  <label htmlFor="ctc-email">Email</label>
                  <input id="ctc-email" name="email" type="email" value={contactForm.email} onChange={onContactChange} />
                </div>

                {contactModal === "edit" && (
                  <div className="ct-field ct-full">
                    <label htmlFor="ctc-notes">Notes</label>
                    <textarea id="ctc-notes" name="notes" rows={2} value={contactForm.notes} onChange={onContactChange} />
                  </div>
                )}
              </div>

              {contactModal === "edit" && (
                <label className="ct-important-option">
                  <input
                    type="checkbox"
                    checked={contactForm.important}
                    onChange={(e) => setContactForm((p) => ({ ...p, important: e.target.checked }))}
                  />
                  <span>Show as Important Contact (appears on Overview)</span>
                </label>
              )}

              <div className="ct-modal-actions">
                <button type="submit" className="ct-save-btn">
                  {contactModal === "add" ? "Save Contact" : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

/* ---------- CSS (all colours come from the theme variables, so light + dark both work) ---------- */

const css = `
.ct-crumb{display:flex;align-items:center;gap:8px;font-size:var(--fs-sm);color:var(--muted);margin-bottom:12px}
.ct-crumb a:hover{text-decoration:underline}
.ct-crumb b{color:var(--text);font-weight:600}
.ct-desc{max-width:960px;font-size:var(--fs-base);line-height:1.5;color:var(--muted)}

/* tabs */
.sm-app .ct-tabs{display:flex;gap:6px;overflow-x:auto;border-bottom:1px solid var(--line);scrollbar-width:none}
.sm-app .ct-tabs::-webkit-scrollbar{display:none}
.sm-app .ct-tabs button{flex:none;padding:12px 16px;font-size:var(--fs-base);color:var(--muted);white-space:nowrap;background:transparent;border:0;border-bottom:2px solid transparent;margin-bottom:-1px;cursor:pointer;transition:color .2s ease,border-color .2s ease}
.sm-app .ct-tabs button:hover{color:var(--text)}
.sm-app .ct-tabs button.is-active{color:var(--green);font-weight:600;border-bottom-color:var(--green)}
.sm-app .ct-tabs-main{margin-bottom:12px;margin-top:6px}
.sm-app .ct-tabs-main button{font-size:calc(var(--fs-base) + 1px)}
.sm-app .ct-tabs-sub{margin-bottom:18px}

/* panel + toolbar */
.ct-panel{padding:0 0 10px;margin-bottom:16px}
.ct-toolbar{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:26px 26px 12px}
.ct-search{display:flex;align-items:center;gap:10px;height:46px;padding:0 14px;border:1px solid var(--line);border-radius:8px;background:var(--surface-2);color:var(--muted);max-width:100%}
.ct-search-people{width:320px}
.ct-search-company{width:460px}
.ct-search input{flex:1;min-width:0;border:0;background:transparent;outline:none;font-size:var(--fs-base);color:var(--text)}
.ct-search input::placeholder{color:var(--muted)}
.ct-check{display:flex;align-items:center;gap:10px;font-size:var(--fs-base);cursor:pointer;color:var(--text)}
.ct-check input{width:20px;height:20px;accent-color:var(--green)}

/* tables */
.ct-table{min-width:1000px}
.ct-table th{font-size:var(--fs-sm);font-weight:500;color:var(--muted);padding:16px 16px 14px;white-space:nowrap;text-align:left}
.ct-table td{padding:13px 16px;font-size:var(--fs-base);white-space:nowrap;color:var(--text);border-top:1px solid var(--line)}
.ct-table td strong{font-weight:700}
.ct-table tbody tr{transition:background-color .15s ease}
.ct-table tbody tr:hover{background-color:var(--hover-soft)}
.ct-company-name{font-weight:700}
.ct-none{padding:30px 26px!important;color:var(--muted)!important}

/* People table: column widths matched to the design (Name … Important) */
.ct-table-people{width:100%;table-layout:auto}
.ct-table-people th:nth-child(1){width:13.5%}
.ct-table-people th:nth-child(2){width:11%}
.ct-table-people th:nth-child(3){width:14.5%}
.ct-table-people th:nth-child(4){width:10%}
.ct-table-people th:nth-child(5){width:16.5%}
.ct-table-people th:nth-child(6){width:18%}
.ct-table-people th:nth-child(7){width:7%}
.ct-table-people th:nth-child(8){width:9.5%}

.sm-app .ct-name-button{border:0;padding:0;background:transparent;color:var(--text);font:inherit;font-weight:700;text-align:left;cursor:pointer;transition:color .15s ease}
.sm-app .ct-name-button:hover{color:var(--green)}

.sm-app .ct-star{display:inline-grid;place-items:center;min-width:22px;border:0;background:transparent;color:var(--muted);cursor:pointer;transition:transform .15s ease,color .15s ease}
.sm-app .ct-star:hover{transform:scale(1.12)}
.sm-app .ct-star.is-on{color:#a16207}
.sm-app .ct-star.is-on svg{fill:#fbbf24}

/* type dot */
.ct-type{display:inline-flex;align-items:center;gap:8px}
.ct-type::before{content:"";width:9px;height:9px;border-radius:50%;background:#6b6b66}
.ct-type.t-client::before{background:#1b6b2f}
.ct-type.t-accom::before{background:#2f5fd0}
.ct-type.t-staff::before{background:#6b6b66}
.ct-type.t-other::before{background:#b87b12}
html[data-theme="dark"] .ct-type.t-client::before{background:#79c995}
html[data-theme="dark"] .ct-type.t-accom::before{background:#8fb0ff}
html[data-theme="dark"] .ct-type.t-staff::before{background:#b2bdb5}
html[data-theme="dark"] .ct-type.t-other::before{background:#e8b04a}

/* modal */
.ct-modal-overlay{position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px;background:var(--overlay);backdrop-filter:blur(5px);-webkit-backdrop-filter:blur(5px)}
.ct-modal{width:100%;max-width:450px;max-height:calc(100vh - 40px);overflow-y:auto;box-sizing:border-box;padding:14px 18px 16px;background:var(--card);color:var(--text);border:1px solid var(--line);border-radius:12px;box-shadow:var(--shadow)}
.ct-modal-header{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:9px}
.ct-modal-header h2{margin:0;font-size:16px;font-weight:700;line-height:1.3;color:var(--text)}
.sm-app .ct-modal-close{display:flex;align-items:center;justify-content:center;width:24px;height:24px;padding:0;border:0;border-radius:6px;background:transparent;color:var(--muted);cursor:pointer}
.sm-app .ct-modal-close:hover{background:var(--hover);color:var(--text)}

.ct-form-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));column-gap:9px;row-gap:7px}
.ct-full{grid-column:1 / -1}
.ct-field{display:flex;flex-direction:column;gap:3px;min-width:0}
.ct-field label{font-size:12px;font-weight:500;color:var(--text)}
.ct-field label span{color:var(--text)}
.ct-field input,.ct-field select,.ct-field textarea{width:100%;box-sizing:border-box;padding:0 10px;border:1px solid var(--line);border-radius:7px;background:var(--card);color:var(--text);font:inherit;font-size:13px;outline:none;transition:border-color .15s,box-shadow .15s}
.ct-field input,.ct-field select{height:33px}
.ct-field textarea{min-height:48px;padding:6px 10px;resize:vertical;line-height:1.45}
.ct-field select{appearance:none;-webkit-appearance:none;padding-right:28px;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 10px center}
.ct-field input:focus,.ct-field select:focus,.ct-field textarea:focus{border-color:var(--green);box-shadow:0 0 0 3px color-mix(in srgb,var(--green) 18%,transparent)}

.ct-hint{margin:8px 0 0;font-size:11.5px;line-height:1.4;color:var(--muted)}
.ct-important-option{display:flex;align-items:center;gap:8px;margin-top:10px;font-size:12.5px;color:var(--text);cursor:pointer}
.ct-important-option input{width:18px;height:18px;margin:0;accent-color:var(--green)}

.ct-modal-actions{display:flex;justify-content:flex-start;margin-top:10px}
.sm-app .ct-save-btn{display:inline-flex;align-items:center;justify-content:center;height:34px;padding:0 15px;border:0;border-radius:7px;background:var(--green);color:var(--on-green);font:inherit;font-size:13px;font-weight:600;cursor:pointer;transition:filter .15s}
.sm-app .ct-save-btn:hover{filter:brightness(1.1)}
.sm-app .ct-save-btn:active{filter:brightness(.92)}

@media (max-width:600px){
  .ct-toolbar{flex-direction:column;align-items:flex-start;padding:18px 16px 10px}
  .ct-search-people,.ct-search-company{width:100%}
  .ct-modal{padding:14px 14px 16px}
  .ct-form-grid{grid-template-columns:1fr}
  .ct-full{grid-column:auto}
}
`;
