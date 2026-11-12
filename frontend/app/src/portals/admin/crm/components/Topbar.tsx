import React, { useEffect, useRef, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAppTheme } from "../../../../theme/ThemeContext";
import {
  Search,
  Moon,
  Sun,
  Bell,
  LogOut,
  Clock,
  BadgeCheck,
  ClipboardCheck,
  FileText,
  CalendarClock,
  BedDouble,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useAuth } from "../../../../auth/useAuth";
import { paths } from "../../../../routing/paths";
import { mainNav, secondaryNav } from "./Sidebar";
import type { NavItem } from "./Sidebar";

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

/* ---------- Navigation Search Modal ---------- */

const NavigationSearch: React.FC<{
  open: boolean;
  onClose: () => void;
}> = ({ open, onClose }) => {
  const [query, setQuery] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);

  // Convert search text to lowercase
  const normalizedQuery = query.trim().toLowerCase();

  // Filter main sidebar items
  const filteredMain = mainNav.filter((item: NavItem) =>
    item.label.toLowerCase().includes(normalizedQuery)
  );

  // Filter secondary sidebar items
  const filteredSecondary = secondaryNav.filter((item: NavItem) =>
    item.label.toLowerCase().includes(normalizedQuery)
  );

  // Automatically focus the search input when modal opens
  useEffect(() => {
    if (!open) {
      setQuery("");
      return;
    }

    const frame = window.requestAnimationFrame(() => searchRef.current?.focus());

    return () => window.cancelAnimationFrame(frame);
  }, [open]);

  // Don't show anything when modal is closed
  if (!open) return null;

  return (
    <div
      className="sm-nav-overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <section
        className="sm-nav-dialog"
        role="dialog"
        aria-modal="true"
        aria-label="Search modules and records"
      >
        {/* Search input section */}
        <div className="sm-nav-search-head">
          <Search size={17} strokeWidth={1.8} />

          <input
            ref={searchRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search modules and records..."
            aria-label="Search modules and records"
          />

          <button type="button" className="sm-nav-esc" onClick={onClose}>
            Esc
          </button>
        </div>

        {/* Navigation menu */}
        <div className="sm-nav-results">
          <div className="sm-nav-caption">Go to</div>

          {filteredMain.map((item: NavItem) => (
            <NavLink
              key={item.label}
              to={item.to || "/admin"}
              end={item.to === "/admin"}
              className={({ isActive }) => `sm-nav-result${isActive ? " is-active" : ""}`}
              onClick={onClose}
            >
              <span className="sm-nav-result-icon">{item.icon}</span>

              <span className="sm-nav-result-label">{item.label}</span>

              {item.badge !== undefined && <span className="sm-badge">{item.badge}</span>}
            </NavLink>
          ))}

          {filteredSecondary.length > 0 && filteredMain.length > 0 && (
            <div className="sm-nav-result-divider" />
          )}

          {filteredSecondary.map((item: NavItem) => (
            <NavLink
              key={item.label}
              to={item.to || "/admin"}
              className={({ isActive }) => `sm-nav-result${isActive ? " is-active" : ""}`}
              onClick={onClose}
            >
              <span className="sm-nav-result-icon">{item.icon}</span>

              <span className="sm-nav-result-label">{item.label}</span>
            </NavLink>
          ))}

          {/* Show message when nothing matches */}
          {filteredMain.length === 0 && filteredSecondary.length === 0 && (
            <div className="sm-nav-empty">No matching modules found</div>
          )}
        </div>
      </section>
    </div>
  );
};

export default function TopBar(): React.JSX.Element {
  const navigate = useNavigate();
  // NOTE: confirm the logout function's real name in src/auth/useAuth (logout / signOut / ...)
  const { logout } = useAuth();
  const { mode, toggleMode } = useAppTheme();

  const [navigationOpen, setNavigationOpen] = useState(false);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      // Open popup using Ctrl + K or Cmd + K
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setNavigationOpen(true);
      }

      // Close popup using Escape
      if (event.key === "Escape") {
        setNavigationOpen(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, []);

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

      <label className="sm-search" onClick={() => setNavigationOpen(true)}>
        <Search size={16} />

        <input
          placeholder="Search workers, projects, facilities..."
          readOnly
          aria-haspopup="dialog"
          aria-expanded={navigationOpen}
        />

        <kbd>⌘K</kbd>
      </label>

      <NavigationSearch open={navigationOpen} onClose={() => setNavigationOpen(false)} />

      <div className="sm-topbar-actions">
        <button
          type="button"
          className="sm-icon-btn"
          aria-label={`Switch to ${mode === "light" ? "dark" : "light"} mode`}
          aria-pressed={mode === "dark"}
          title={`Switch to ${mode === "light" ? "dark" : "light"} mode`}
          onClick={toggleMode}
        >
          {mode === "light" ? <Moon size={18} strokeWidth={1.6} /> : <Sun size={18} strokeWidth={1.6} />}
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

/* ---------- Styles (top bar + notifications + search modal) ----------
 * Every colour comes from the theme variables defined in AdminWorkspace.tsx
 * (--card, --line, --text, --muted, --green, --hover ...), so light and dark
 * themes both work without separate overrides.
 */
const css = `
.sm-topbar{display:flex;align-items:center;gap:13px;padding:4px var(--pad-x);background:var(--card);border-bottom:1px solid var(--line);height:58px;flex:none;color:var(--text)}
.sm-search{display:flex;align-items:center;gap:11px;width:480px;max-width:100%;flex:0 1 480px;min-width:0;padding:0 13px;height:36px;border:1px solid var(--line);border-radius:8px;background:var(--surface-2);color:var(--muted);cursor:pointer}
.sm-search svg{flex:none;color:var(--muted)}
.sm-search input{flex:1;min-width:0;border:0;background:transparent;font-size:var(--fs-base);outline:none;color:var(--text);cursor:pointer}
.sm-search input::placeholder{color:var(--muted);opacity:1}
.sm-search kbd{font-family:inherit;font-size:13px;border:1px solid var(--line);border-radius:5px;padding:2px 8px;background:var(--card);color:var(--muted);flex:none}
.sm-topbar-actions{margin-left:auto;display:flex;align-items:center;gap:clamp(8px,1.2vw,18px);color:var(--muted);flex:none}

/* icon buttons: rounded box on hover */
.sm-app .sm-icon-btn{width:40px;height:40px;display:inline-flex;align-items:center;justify-content:center;border-radius:10px;color:var(--muted);transition:background .15s,color .15s}
.sm-app .sm-icon-btn:hover{background:var(--hover);color:var(--text)}
.sm-app .sm-icon-btn:focus-visible{outline:2px solid var(--green);outline-offset:2px}

/* notifications (bell + dropdown) */
.sm-app .nb-wrap{position:relative;display:inline-flex}
.sm-app .nb-btn{position:relative;width:40px;height:40px;display:inline-flex;align-items:center;justify-content:center;border-radius:10px;background:transparent;color:var(--muted)}
.sm-app .nb-btn:hover,.sm-app .nb-btn.is-open{background:var(--hover);color:var(--text)}
.sm-app .nb-btn:focus-visible{outline:2px solid var(--green);outline-offset:2px}
.sm-app .nb-dot{position:absolute;top:9px;right:10px;width:7px;height:7px;border-radius:50%;background:var(--danger)}

.sm-app .nb-panel{position:fixed;top:72px;right:12px;z-index:60;width:min(430px,calc(100vw - 24px));max-height:min(470px,calc(100vh - 100px));display:flex;flex-direction:column;background:var(--card);border:1px solid var(--line);border-radius:14px;box-shadow:var(--shadow);color:var(--text)}
.sm-app .nb-head{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:18px 22px 14px;border-bottom:1px solid var(--line)}
.sm-app .nb-head h2{margin:0;font-size:clamp(18px,1.1vw + .2rem,21px);font-weight:700;color:var(--text)}
.sm-app .nb-mark{padding:4px 0;font-size:var(--fs-sm);font-weight:600;color:var(--green)}
.sm-app .nb-mark:hover:not(:disabled){text-decoration:underline}
.sm-app .nb-mark:disabled{color:var(--muted);cursor:default;font-weight:500}
.sm-app .nb-mark:focus-visible{outline:2px solid var(--green);outline-offset:3px;border-radius:4px}

.sm-app .nb-list{list-style:none;margin:0;padding:0;overflow-y:auto}
.sm-app .nb-list li + li{border-top:1px solid var(--line)}
.sm-app .nb-item{width:100%;display:flex;align-items:center;gap:14px;padding:14px 22px;text-align:left;color:var(--text)}
.sm-app .nb-item:hover{background:var(--hover-soft)}
.sm-app .nb-item:focus-visible{outline:2px solid var(--green);outline-offset:-2px}
.sm-app .nb-icon{flex:none;width:38px;height:38px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center}
.sm-app .nb-icon.danger{background:var(--danger-bg);color:var(--danger)}
.sm-app .nb-icon.warn{background:var(--warn-bg);color:var(--warn-text)}
.sm-app .nb-text{display:flex;flex-direction:column;gap:2px;min-width:0}
.sm-app .nb-title{font-size:clamp(15px,.9vw + .2rem,17px);font-weight:600;line-height:1.3}
.sm-app .nb-detail{font-size:var(--fs-sm);color:var(--muted)}
.sm-app .nb-item.is-read .nb-title{font-weight:500;color:var(--muted)}
.sm-app .nb-item.is-read .nb-icon{opacity:.55}

@media (max-width:1100px){
  .sm-search{flex-basis:340px}
}

/* ---------- Navigation Search Modal ---------- */
.sm-nav-overlay{position:fixed;inset:0;z-index:1000;display:flex;justify-content:center;align-items:flex-start;padding:min(11vh,100px) 18px 24px;background:var(--overlay);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px)}
.sm-nav-dialog{width:min(580px,100%);max-height:min(620px,78vh);display:flex;flex-direction:column;overflow:hidden;background:var(--card);border:1px solid var(--line);border-radius:16px;box-shadow:var(--shadow);color:var(--text)}
.sm-nav-search-head{height:57px;flex:none;display:flex;align-items:center;gap:14px;padding:0 20px;border-bottom:1px solid var(--line);color:var(--muted)}
.sm-nav-search-head input{flex:1;min-width:0;border:0!important;outline:none!important;background:transparent!important;color:var(--text)!important;font:inherit;font-size:14px}
.sm-nav-search-head input::placeholder{color:var(--muted);opacity:1}
.sm-nav-esc{flex:none;padding:3px 8px;border:1px solid var(--line)!important;border-radius:6px;font-size:12px;color:var(--muted);background:var(--surface-2)!important;cursor:pointer}
.sm-nav-results{padding:14px 8px 10px;overflow-y:auto}
.sm-nav-caption{padding:3px 12px 10px;color:var(--muted);font-size:13px}
.sm-nav-result{min-height:45px;display:flex;align-items:center;gap:13px;padding:0 14px;border-radius:9px;color:var(--text);text-decoration:none;font-size:15px;font-weight:550;outline:none}
.sm-nav-result:hover{background:var(--hover-soft)}
.sm-nav-result.is-active{background:var(--green-soft);color:var(--green)}
.sm-nav-result:focus-visible{outline:2px solid var(--green);outline-offset:-2px}
.sm-nav-result-icon{width:18px;height:18px;flex:none;display:grid;place-items:center;color:var(--muted)}
.sm-nav-result.is-active .sm-nav-result-icon{color:var(--green)}
.sm-nav-result-icon img{max-width:20px;max-height:20px;object-fit:contain}
html[data-theme="dark"] .sm-nav-result-icon img{filter:brightness(0) invert(1);opacity:.85}
.sm-nav-result-label{flex:1;min-width:0}
.sm-nav-result .sm-badge{margin-left:auto}
.sm-nav-result-divider{height:1px;background:var(--line);margin:10px}
.sm-nav-empty{padding:22px 14px;color:var(--muted);font-size:14px}

@media (max-width:600px){
  .sm-nav-overlay{padding:65px 12px 12px}
  .sm-nav-dialog{max-height:80vh}
}
`;
