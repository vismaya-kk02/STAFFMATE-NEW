import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search, Moon, Bell, LogOut, Clock, BadgeCheck, ClipboardCheck, FileText,
  CalendarClock, BedDouble,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useAuth } from "../auth/useAuth";
import { paths } from "../routing/paths";

/* ---------- Types ---------- */
type NotifTone = "danger" | "warn";

interface NotificationItem {
  id: number;
  count: number;
  title: string;
  detail: string;
  tone: NotifTone;
  icon: LucideIcon;
  to: string; // route opened when the row is clicked
  read: boolean;
}

/* ---------- Data ---------- */
const initialNotifications: NotificationItem[] = [
  { id: 1, count: 2, title: "Daily records overdue", detail: "Line 3 Assembly, CNC Machining Hall", tone: "danger", icon: Clock, to: "/admin/projects", read: false },
  { id: 2, count: 1, title: "Deregistration documents to verify", detail: "Andriy Ionescu", tone: "warn", icon: BadgeCheck, to: "/admin/documents", read: false },
  { id: 3, count: 2, title: "Social Insurance evidence to verify", detail: "Dmytro Kovalenko, Nikola Ionescu", tone: "warn", icon: ClipboardCheck, to: "/admin/documents", read: false },
  { id: 4, count: 1, title: "Terminations missing documentation", detail: "Viorel Koval", tone: "danger", icon: FileText, to: "/admin/workers", read: false },
  { id: 5, count: 1, title: "Expected departures reported by coordinators", detail: "Taras Georgiev", tone: "warn", icon: CalendarClock, to: "/admin/workers", read: false },
  { id: 6, count: 1, title: "Daily records to review after late verification", detail: "Petar Marković", tone: "warn", icon: BedDouble, to: "/admin/projects", read: false },
];

/* ---------- Components ---------- */
/** Bell button + dropdown panel. Click a row to open its page; "Mark all read" clears the dot. */
const NotificationBell: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>(initialNotifications);
  const wrapRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const hasUnread = items.some((n) => !n.read);

  // close on outside click or Escape
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const markAllRead = () => setItems((list) => list.map((n) => ({ ...n, read: true })));

  const openItem = (n: NotificationItem) => {
    setItems((list) => list.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
    setOpen(false);
    navigate(n.to);
  };

  return (
    <div className="nb-wrap" ref={wrapRef}>
      <button
        type="button"
        className={`nb-btn${open ? " is-open" : ""}`}
        aria-label="Notifications"
        aria-haspopup="true"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <Bell size={18} strokeWidth={1.6} />
        {hasUnread && <span className="nb-dot" aria-hidden="true" />}
      </button>

      {open && (
        <section className="nb-panel" aria-label="Notifications">
          <header className="nb-head">
            <h2>Notifications</h2>
            <button type="button" className="nb-mark" onClick={markAllRead} disabled={!hasUnread}>
              Mark all read
            </button>
          </header>

          <ul className="nb-list">
            {items.map((n) => {
              const Icon = n.icon;
              return (
                <li key={n.id}>
                  <button type="button" className={`nb-item${n.read ? " is-read" : ""}`} onClick={() => openItem(n)}>
                    <span className={`nb-icon ${n.tone}`}><Icon size={18} strokeWidth={1.7} /></span>
                    <span className="nb-text">
                      <span className="nb-title">{n.count} · {n.title}</span>
                      <span className="nb-detail">{n.detail}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
};

export default function TopBar(): React.JSX.Element {
  const navigate = useNavigate();
  // NOTE: confirm the logout function's real name in src/auth/useAuth (logout / signOut / ...)
  const { logout } = useAuth();

  const handleLogout = async () => {
    try {
      await logout(); // clears the session so phase becomes "anonymous"
    } finally {
      navigate(paths.login, { replace: true });
    }
  };

  return (
    <header className="sm-topbar">
      <style>{css}</style>

      <label className="sm-search">
        <Search size={16} />
        <input placeholder="Search workers, projects, facilities..." />
        <kbd>⌘K</kbd>
      </label>

      <div className="sm-topbar-actions">
        <button type="button" className="sm-icon-btn" aria-label="Toggle dark mode">
          <Moon size={18} strokeWidth={1.6} />
        </button>
        <NotificationBell />
        <div className="sm-avatar">MM</div>
        <button type="button" className="sm-icon-btn" aria-label="Log out" onClick={handleLogout}>
          <LogOut size={18} strokeWidth={1.6} />
        </button>
      </div>
    </header>
  );
}

/* ---------- Styles (top bar + notifications only) ---------- */
const css = `
.sm-topbar{display:flex;align-items:center;gap:13px;padding:4px var(--pad-x);background:#fff;border-bottom:1px solid var(--line);height:58px;flex:none}
.sm-search{display:flex;align-items:center;gap:11px;width:480px;max-width:100%;flex:0 1 480px;min-width:0;padding:0 13px;height:36px;border:1px solid var(--line);border-radius:8px;background:#faf9f6;color:var(--muted)}
.sm-search svg{flex:none}
.sm-search input{flex:1;min-width:0;border:0;background:transparent;font-size:var(--fs-base);outline:none;color:var(--text)}
.sm-search kbd{font-family:inherit;font-size:13px;border:1px solid var(--line);border-radius:5px;padding:2px 8px;background:#fff;flex:none}
.sm-topbar-actions{margin-left:auto;display:flex;align-items:center;gap:clamp(8px,1.2vw,18px);color:var(--muted);flex:none}

/* icon buttons: grey rounded box on hover */
.sm-app .sm-icon-btn{width:40px;height:40px;display:inline-flex;align-items:center;justify-content:center;border-radius:10px;color:var(--muted);transition:background .15s,color .15s}
.sm-app .sm-icon-btn:hover{background:#ecebe6;color:var(--text)}
.sm-app .sm-icon-btn:focus-visible{outline:2px solid var(--green);outline-offset:2px}

/* notifications (bell + dropdown) */
.sm-app .nb-wrap{position:relative;display:inline-flex}
.sm-app .nb-btn{position:relative;width:40px;height:40px;display:inline-flex;align-items:center;justify-content:center;border-radius:10px;background:transparent;color:var(--muted)}
.sm-app .nb-btn:hover,.sm-app .nb-btn.is-open{background:#ecebe6;color:var(--text)}
.sm-app .nb-btn:focus-visible{outline:2px solid var(--green);outline-offset:2px}
.sm-app .nb-dot{position:absolute;top:9px;right:10px;width:7px;height:7px;border-radius:50%;background:var(--danger)}

.sm-app .nb-panel{position:fixed;top:72px;right:12px;z-index:60;width:min(430px,calc(100vw - 24px));max-height:min(470px,calc(100vh - 100px));display:flex;flex-direction:column;background:#fff;border:1px solid var(--line);border-radius:14px;box-shadow:0 16px 40px rgba(20,30,20,.16);color:var(--text)}
.sm-app .nb-head{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:18px 22px 14px;border-bottom:1px solid var(--line)}
.sm-app .nb-head h2{margin:0;font-size:clamp(18px,1.1vw + .2rem,21px);font-weight:700}
.sm-app .nb-mark{padding:4px 0;font-size:var(--fs-sm);font-weight:600;color:var(--green)}
.sm-app .nb-mark:hover:not(:disabled){text-decoration:underline}
.sm-app .nb-mark:disabled{color:var(--muted);cursor:default;font-weight:500}
.sm-app .nb-mark:focus-visible{outline:2px solid var(--green);outline-offset:3px;border-radius:4px}

.sm-app .nb-list{list-style:none;margin:0;padding:0;overflow-y:auto}
.sm-app .nb-list li + li{border-top:1px solid var(--line)}
.sm-app .nb-item{width:100%;display:flex;align-items:center;gap:14px;padding:14px 22px;text-align:left;color:var(--text)}
.sm-app .nb-item:hover{background:#f6f8f6}
.sm-app .nb-item:focus-visible{outline:2px solid var(--green);outline-offset:-2px}
.sm-app .nb-icon{flex:none;width:38px;height:38px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center}
.sm-app .nb-icon.danger{background:#fbdcdc;color:#c8372d}
.sm-app .nb-icon.warn{background:#fde6c4;color:#c9791a}
.sm-app .nb-text{display:flex;flex-direction:column;gap:2px;min-width:0}
.sm-app .nb-title{font-size:clamp(15px,.9vw + .2rem,17px);font-weight:600;line-height:1.3}
.sm-app .nb-detail{font-size:var(--fs-sm);color:var(--muted)}
.sm-app .nb-item.is-read .nb-title{font-weight:500;color:var(--muted)}
.sm-app .nb-item.is-read .nb-icon{opacity:.55}

@media (max-width:1100px){
  .sm-search{flex-basis:340px}
}
`;
