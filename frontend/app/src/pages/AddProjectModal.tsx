import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X, ChevronDown } from "lucide-react";

export interface NewProjectInput {
  client: string;
  name: string;
  industry: string;
  location: string;
  coordinator: string;
  startDate: string; // ISO yyyy-mm-dd
}

interface Props {
  open: boolean;
  onClose: () => void;
  onSave: (p: NewProjectInput) => void;
  clients: string[];
  coordinators: string[];
}

const todayIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export default function AddProjectModal({ open, onClose, onSave, clients, coordinators }: Props): React.JSX.Element | null {
  const blank = (): NewProjectInput => ({
    client: clients[0] ?? "",
    name: "",
    industry: "",
    location: "",
    coordinator: coordinators[0] ?? "",
    startDate: todayIso(),
  });

  const [form, setForm] = useState<NewProjectInput>(blank);
  const [touched, setTouched] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);

  // Reset the form and focus the name field each time the modal opens
  useEffect(() => {
    if (open) {
      setForm(blank());
      setTouched(false);
      setTimeout(() => nameRef.current?.focus(), 0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Close on Escape + lock page scroll while open
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  const set = <K extends keyof NewProjectInput>(k: K, v: NewProjectInput[K]) => setForm((f) => ({ ...f, [k]: v }));
  const nameMissing = touched && !form.name.trim();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (!form.name.trim() || !form.client || !form.coordinator) return;
    onSave({ ...form, name: form.name.trim(), industry: form.industry.trim(), location: form.location.trim() });
  };

  return createPortal(
    <>
      <style>{css}</style>
      <div className="ap-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
        <form className="ap-modal" role="dialog" aria-modal="true" aria-labelledby="ap-title" onSubmit={submit} noValidate>
          <div className="ap-head">
            <h2 id="ap-title">Add Project</h2>
            <button type="button" className="ap-close" aria-label="Close" onClick={onClose}>
              <X size={20} strokeWidth={1.5} />
            </button>
          </div>

          <div className="ap-grid">
            <div className="ap-field">
              <label htmlFor="ap-client">Client Company *</label>
              <div className="ap-select">
                <select id="ap-client" value={form.client} onChange={(e) => set("client", e.target.value)}>
                  {clients.map((c) => <option key={c}>{c}</option>)}
                </select>
                <ChevronDown size={18} />
              </div>
            </div>

            <div className="ap-field">
              <label htmlFor="ap-name">Factory / Project Name *</label>
              <input
                id="ap-name"
                ref={nameRef}
                className={nameMissing ? "is-error" : ""}
                placeholder="e.g. Packaging Line C"
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                aria-invalid={nameMissing}
              />
              {nameMissing && <span className="ap-err">Enter a project name.</span>}
            </div>

            <div className="ap-field">
              <label htmlFor="ap-industry">Industry</label>
              <input id="ap-industry" placeholder="e.g. Automotive" value={form.industry} onChange={(e) => set("industry", e.target.value)} />
            </div>

            <div className="ap-field">
              <label htmlFor="ap-location">Location</label>
              <input id="ap-location" placeholder="City" value={form.location} onChange={(e) => set("location", e.target.value)} />
            </div>

            <div className="ap-field">
              <label htmlFor="ap-coord">Coordinator *</label>
              <div className="ap-select">
                <select id="ap-coord" value={form.coordinator} onChange={(e) => set("coordinator", e.target.value)}>
                  {coordinators.map((c) => <option key={c}>{c}</option>)}
                </select>
                <ChevronDown size={18} />
              </div>
            </div>

            <div className="ap-field">
              <label htmlFor="ap-start">Engagement Start Date</label>
              <input id="ap-start" type="date" value={form.startDate} onChange={(e) => set("startDate", e.target.value)} />
            </div>
          </div>

          <p className="ap-hint">A draft project only needs a name, client company and location — everything else can be completed later.</p>

          <button type="submit" className="ap-save">Save Project</button>
        </form>
      </div>
    </>,
    document.body,
  );
}

const css = `
.ap-backdrop{position:fixed;inset:0;z-index:99999;display:grid;place-items:center;padding:16px;background:rgba(30,32,30,.38);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);overflow-y:auto}
.ap-modal{width:100%;max-width:735px;background:#fff;border-radius:16px;padding:27px 28px 26px;box-shadow:0 20px 56px rgba(0,0,0,.22);animation:ap-in .16s ease-out}
@keyframes ap-in{from{opacity:0;transform:translateY(8px) scale(.985)}to{opacity:1;transform:none}}
@media (prefers-reduced-motion:reduce){.ap-modal{animation:none}}
.ap-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:26px}
.ap-head h2{margin:0;font-size:19px;line-height:1.2;font-weight:600;color:var(--text,#1c1c1a)}
.ap-close{display:grid;place-items:center;width:26px;height:26px;margin-right:5px;border-radius:6px;color:#6b6f73;background:transparent;border:0;cursor:pointer}
.ap-close svg{width:20px;height:20px}
.ap-close:hover{background:#f1f1ee;color:var(--text,#1c1c1a)}
.ap-grid{display:grid;grid-template-columns:1fr 1fr;gap:18px 15px}
.ap-field{display:flex;flex-direction:column;gap:6px;min-width:0}
.ap-field label{font-size:13px;color:var(--text,#1c1c1a)}
.ap-field input,.ap-select select{width:100%;height:37px;padding:0 13px;border:1px solid var(--line,#dedcd5);border-radius:6px;background:#fff;font:inherit;font-size:13.5px;color:var(--text,#1c1c1a);outline:none;box-sizing:border-box}
.ap-field input::placeholder{color:#8a8a85}
.ap-field input:focus,.ap-select select:focus{border-color:var(--green,#1a6b2f);box-shadow:0 0 0 3px rgba(26,107,47,.12)}
.ap-field input.is-error{border-color:#b42318}
.ap-err{font-size:12px;color:#b42318}
.ap-select{position:relative}
.ap-select select{appearance:none;-webkit-appearance:none;padding-right:36px;cursor:pointer}
.ap-select svg{position:absolute;right:11px;top:50%;transform:translateY(-50%);width:15px;height:15px;pointer-events:none;color:var(--text,#1c1c1a)}
.ap-hint{margin:18px 0 14px;font-size:13px;color:var(--muted,#6b6b66)}
.ap-save{height:38px;padding:0 16px;border-radius:6px;background:var(--green,#1a6b2f);color:#fff;font-size:13.5px;font-weight:600;cursor:pointer}
.ap-save:hover{filter:brightness(1.08)}
.ap-save:focus-visible,.ap-close:focus-visible{outline:2px solid var(--green,#1a6b2f);outline-offset:2px}
@media (max-width:640px){
  .ap-modal{padding:22px 18px}
  .ap-grid{grid-template-columns:1fr}
}
`;
