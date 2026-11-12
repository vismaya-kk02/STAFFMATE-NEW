import React from "react";
import { NavLink as RouterLink } from "react-router-dom";

/* ---------- Types ---------- */
export interface NavItem {
  label: string;
  icon: React.ReactNode;
  badge?: number;
  to?: string;
}
/* ---------- Data ---------- */
export const mainNav: NavItem[] = [
  {
    label: "Overview",
    icon: <img src="/images/overview.svg" alt="Overview" width={16} height={16} />,
    to: "/admin",
  },
  {
    label: "Projects",
    icon: <img src="/images/projects.svg" alt="Projects" width={16} height={16} />,
    to: "/admin/projects",
  },
  {
    label: "Workers",
    icon: <img src="/images/workers.svg" alt="Workers" width={20} height={20} />,
    to: "/admin/workers",
  },
  {
    label: "Accommodation",
    icon: <img src="/images/accommodation_menu.svg" alt="Accommodation" width={16} height={16} />,
    to: "/admin/accommodation",
  },
  {
    label: "Tasks & Announcements",
    icon: <img src="/images/task.svg" alt="Tasks & Announcements" width={16} height={16} />,
    to: "/admin/tasks",
  },
  {
    label: "Documents & Alerts",
    icon: <img src="/images/documents_alerts.svg" alt="Documents & Alerts" width={16} height={16} />,
    to: "/admin/documents",
    badge: 13,
  },
  {
    label: "Contacts",
    icon: <img src="/images/contacts.svg" alt="Contacts" width={16} height={16} />,
    to: "/admin/contacts",
  },
];

export const secondaryNav: NavItem[] = [
  {
    label: "Sales",
    icon: <img src="/images/sales.svg" alt="Sales" width={20} height={20} />,
    to: "/admin/sales",
  },
  {
    label: "Settings",
    icon: <img src="/images/settings.svg" alt="Settings" width={20} height={20} />,
    to: "/admin/settings",
  },
];

/* ---------- Components ---------- */
const SideLink: React.FC<{ item: NavItem }> = ({ item }) => {
  const inner = (
    <>
      {item.icon}
      <span className="sm-nav-label">{item.label}</span>
      {item.badge !== undefined && <span className="sm-badge">{item.badge}</span>}
    </>
  );
  return item.to ? (
    <RouterLink
      to={item.to}
      end={item.to === "/admin"}
      className={({ isActive }) => `sm-nav-item${isActive ? " is-active" : ""}`}
    >
      {inner}
    </RouterLink>
  ) : (
    <a href="#" className="sm-nav-item">{inner}</a>
  );
};

export default function Sidebar(): React.JSX.Element {
  return (
    <aside className="sm-sidebar">
      <style>{css}</style>

      <div className="sm-logo">
        <img src="/staffmate-logo.png" alt="Staffmate - Your Workforce" className="sm-logo-img" />
      </div>

      <nav className="sm-nav">
        {mainNav.map((n) => (
          <SideLink key={n.label} item={n} />
        ))}
        <hr className="sm-divider" />
        {secondaryNav.map((n) => (
          <SideLink key={n.label} item={n} />
        ))}
      </nav>

      <div className="sm-user">
        <div className="sm-avatar sm-avatar-lg">MM</div>
        <div>
          <div className="sm-user-name">Marek Máhr</div>
          <div className="sm-user-role">Managing Director</div>
        </div>
      </div>
    </aside>
  );
}

/* ---------- Styles (sidebar only) ---------- */
const css = `
.sm-sidebar{width:var(--sb-w);flex:none;background:#fff;border-right:1px solid var(--line);display:flex;flex-direction:column;min-height:0}
.sm-logo{padding:21px 19px 16px}
.sm-logo-img{display:block;height:30px;width:auto;max-width:100%;object-fit:contain}
.sm-nav{padding:11px 12px;flex:1;min-height:0;overflow-y:auto}
.sm-nav-item{display:flex;align-items:center;gap:12px;padding:0 14px;height:clamp(38px,3.6vh + 14px,43px);border-radius:8px;font-size:var(--fs-base);margin-bottom:2px}
.sm-nav-item svg{flex:none}
.sm-nav-label{min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.sm-nav-item.is-active{background:var(--green-soft);color:var(--green);font-weight:600}
.sm-badge{margin-left:auto;flex:none;background:var(--danger-bg);color:var(--danger);font-weight:700;font-size:13px;padding:2px 9px;border-radius:999px}
.sm-app .sm-divider{border:0;border-top:1px solid var(--line);margin:14px 5px 12px}
.sm-user{display:flex;align-items:center;gap:11px;padding:13px 14px;border-top:1px solid var(--line)}
.sm-user-name{font-weight:600;font-size:var(--fs-sm)}
.sm-user-role{color:var(--muted);font-size:var(--fs-sm)}
.sm-avatar-lg{width:38px;height:38px}
`;
