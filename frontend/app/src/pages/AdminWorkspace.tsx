import React from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "../portals/admin/crm/components/Sidebar";
import TopBar from "../portals/admin/crm/components/Topbar";

// Keeps `import AdminWorkspace, { OverviewContent } from '../pages/AdminWorkspace'`
// in AppRoutes.tsx working even though the home page now lives in OverviewPage.tsx.
export { OverviewContent } from "../portals/admin/crm/pages/OverviewPage";

const Footer: React.FC = () => (
  <footer className="sm-footer">
    <span className="sm-footer-left">
      © 2026 <b>Staffmate s.r.o.</b> All rights reserved.
      <span className="sm-dev">Developed by <b>Kiwisoft</b> for Staffmate</span>
    </span>
    <span className="sm-footer-right">
      <a href="#">Privacy</a>
      <a href="#">Terms</a>
      <span className="sm-version">Staffmate Workforce CRM · Version 1.0.0 · Prototype 4.0</span>
    </span>
  </footer>
);

export default function AdminWorkspace(): React.JSX.Element {
  return (
    <div className="sm-app">
      <style>{css}</style>
      <Sidebar />
      <div className="sm-main">
        <TopBar />
        <main className="sm-content">
          <Outlet />
        </main>
        <Footer />
      </div>
    </div>
  );
}

/* ---------- Shared styles ----------
 * Variables, resets, page chrome and the shared sm-* classes (cards, buttons,
 * pills, tables, stats ...). Sales, Settings and the other admin pages reuse
 * these, so they live here with the layout. Sidebar and top bar styles live in
 * their own component files.
 *
 * Sizing is fluid so the page looks the same at any browser zoom:
 * the sidebar, paddings and type scale with the viewport using clamp().
 */
const css = `
.sm-app{
  --green:#1b6b2f; --green-soft:#e3f0e0; --bg:#f5f4f0; --card:#fff;
  --line:#e4e2dc; --text:#1c1c1a; --muted:#5f5e58; --danger:#b81d1d; --danger-bg:#fbe4e4;
  --sb-w:clamp(232px, 19vw, 293px);
  --pad-x:clamp(16px, 2.4vw, 38px);
  --fs-base:clamp(14px, 0.84vw + 0.1rem, 16px);
  --fs-sm:clamp(13px, 0.78vw, 15px);
  position:fixed; inset:0; z-index:1; display:flex; width:100%; height:100%;
  margin:0; padding:0; max-width:none; text-align:left; font-size:var(--fs-base); line-height:1.4;
  font-family:Inter,"Segoe UI",system-ui,sans-serif; -webkit-font-smoothing:antialiased;
  color:var(--text); background:var(--bg); overflow:hidden;
}
.sm-app *{box-sizing:border-box}
.sm-app h1,.sm-app h3,.sm-app p{margin:0;padding:0}
.sm-app ul,.sm-app hr{margin:0;padding:0}
.sm-app a{color:inherit;text-decoration:none}
.sm-app button{font:inherit;color:inherit;cursor:pointer;background:none;border:0}

.sm-avatar{width:35px;height:35px;border-radius:50%;background:#bfe8b4;color:#1b4d22;font-weight:700;display:grid;place-items:center;font-size:14px;flex:none}

/* main */
.sm-main{flex:1;display:flex;flex-direction:column;min-width:0;min-height:0}
.sm-content{flex:1;min-height:0;overflow-y:auto;padding:19px var(--pad-x)}
.sm-crumb{font-size:var(--fs-base);font-weight:600;margin-bottom:11px}
.sm-title-row{display:flex;flex-wrap:wrap;justify-content:space-between;align-items:flex-end;gap:14px 20px;margin-bottom:21px}
.sm-title-text{flex:1 1 380px;min-width:0}
.sm-title-row h1{font-size:clamp(24px,1.6vw + .5rem,24px);font-weight:600;letter-spacing:-.4px}
.sm-title-row p{margin-top:5px;font-size:var(--fs-base);color:var(--muted)}
.sm-title-row p b{color:var(--muted);white-space:nowrap}
.sm-title-actions{display:flex;gap:11px;flex:none}
.sm-btn{display:inline-flex;align-items:center;gap:8px;height:32px;padding:0 12px;border-radius:8px;font-size:var(--fs-base);font-weight:500;flex:none;white-space:nowrap}
.sm-btn-outline{background:#fff!important;border:1px solid var(--line)!important}
.sm-btn-primary{background:var(--green)!important;color:#fff!important;font-weight:600}

.sm-card{background:var(--card);border:1px solid var(--line);border-radius:14px}

/* stat groups: always one row on desktop; tighten before ever wrapping */
.sm-stat-group{display:grid;grid-template-columns:repeat(var(--cols,5),minmax(0,1fr));margin-bottom:19px;overflow:hidden}
.sm-stat{padding:18px clamp(14px,1.5vw,22px);border-left:1px solid var(--line);min-height:120px;min-width:0}
.sm-stat:first-child{border-left:0}
.sm-stat-title{font-size:var(--fs-base);color:var(--muted);font-weight:500;min-height:22px;line-height:1.3}
.sm-stat-value{font-size:clamp(26px,1.8vw + .4rem,32px);font-weight:600;line-height:1.15;margin:3px 0}
.sm-stat-value.is-danger{color:var(--danger)}
.sm-stat-caption{font-size:var(--fs-sm);color:var(--muted);line-height:1.35}

.sm-queue{padding:0 22px;margin-bottom:19px}
.sm-queue-head{display:flex;justify-content:space-between;align-items:center;height:67px;color:var(--muted);gap:12px}
.sm-queue-head h3{display:flex;align-items:center;gap:11px;font-size:clamp(16px,.9vw + .3rem,18px);font-weight:600;color:var(--text)}
.sm-queue-head span{font-size:var(--fs-base)}
.sm-queue-row{display:flex;align-items:center;gap:18px;width:100%;text-align:left;padding:11px 0 16px;border-bottom:1px solid var(--line)}
.sm-queue-row:last-child{border-bottom:0}
.sm-queue-row svg{flex:none}
.sm-count{flex:none;width:42px;height:42px;border-radius:8px;background:var(--danger-bg);color:var(--danger);font-weight:700;font-size:19px;display:grid;place-items:center}
.sm-count.is-warn{background:#fdeccf;color:#9a5b00}
.sm-queue-text{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px}
.sm-queue-text strong{font-size:clamp(15px,.9vw + .25rem,18px);font-weight:600}
.sm-queue-text small{font-size:var(--fs-base);color:var(--muted)}

/* footer: never cut off, wraps gracefully if space runs out */
.sm-footer{display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:6px 16px;padding:8px var(--pad-x);min-height:54px;border-top:1px solid var(--line);background:#fff;font-size:var(--fs-sm);color:var(--muted);flex:none}
.sm-footer b{color:var(--text)}
.sm-footer-left{display:inline-flex;flex-wrap:wrap;align-items:center;gap:0 18px;min-width:0}
.sm-dev{margin-left:0}
.sm-footer-right{display:flex;flex-wrap:wrap;align-items:center;gap:6px 18px;min-width:0}
.sm-app .sm-footer a{white-space:nowrap}
.sm-version{border:1px solid var(--line);background:#f4f3ee;border-radius:999px;padding:6px 14px;white-space:nowrap}

/* ---- overview sections ---- */
.sm-pad{padding:0 22px 14px;margin-bottom:19px}
.sm-grid2{display:grid;grid-template-columns:1.3fr 1fr;gap:19px;align-items:stretch;margin-bottom:19px}
.sm-grid2 > .sm-card{margin-bottom:0;min-width:0}
.sm-ch{display:flex;justify-content:space-between;align-items:center;height:62px;gap:12px}
.sm-ch h3{display:flex;align-items:center;gap:11px;font-size:clamp(16px,.9vw + .3rem,18px);font-weight:600}
.sm-link{color:var(--green);font-weight:600;font-size:var(--fs-sm);white-space:nowrap}
.sm-banner{display:flex;align-items:center;gap:11px;background:var(--danger-bg);color:var(--danger);border-radius:8px;padding:12px 16px;font-size:var(--fs-base);margin-bottom:8px}
.sm-banner svg{flex:none}
.sm-row{display:flex;justify-content:space-between;align-items:center;gap:14px;padding:12px 8px}
.sm-row > div:first-child{min-width:0}
.sm-row strong,.sm-table strong,.sm-contacts strong{display:block;font-size:var(--fs-base);font-weight:600}
.sm-row small,.sm-table small,.sm-contacts small{display:block;font-size:var(--fs-sm);color:var(--muted)}
.sm-row-right{display:flex;align-items:center;gap:10px;flex:none}
.sm-pill{display:inline-flex;align-items:center;gap:7px;padding:5px 12px;border-radius:999px;font-size:14px;font-weight:600;white-space:nowrap}
.sm-pill::before{content:"";width:7px;height:7px;border-radius:50%;background:currentColor}
.sm-pill.ok{background:var(--green-soft);color:var(--green)}
.sm-pill.bad{background:var(--danger-bg);color:var(--danger)}
.sm-pill.warn{background:#f6ecdb;color:#8a5a00}
.sm-btn-sm{height:34px;padding:0 14px;font-size:var(--fs-sm)}
.sm-table-wrap{overflow-x:auto}
.sm-table{width:100%;min-width:520px;border-collapse:collapse;text-align:left}
.sm-table th{font-size:14px;font-weight:500;color:var(--muted);padding:10px 8px;border-bottom:1px solid var(--line)}
.sm-table td{padding:12px 8px;font-size:var(--fs-base);border-bottom:1px solid var(--line);vertical-align:middle}
.sm-table tr:last-child td{border-bottom:0}
.sm-alert{display:flex;align-items:center;gap:12px;padding:12px 16px;border-radius:10px;background:var(--danger-bg);margin-bottom:10px}
.sm-alert svg{flex:none}
.sm-alert.is-warn{background:#fdeccf}
.sm-alert-text{flex:1;min-width:0;font-size:var(--fs-sm);line-height:1.45}
.sm-kv{display:grid;grid-template-columns:minmax(120px,280px) 1fr;row-gap:10px;margin:0 0 12px 8px;font-size:var(--fs-base)}
.sm-kv dt{color:var(--muted)} .sm-kv dd{margin:0}
.sm-kv dd.good{color:var(--green);font-weight:700}
.sm-contacts{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:24px;padding:8px 8px 10px}

/* ---- breakpoints (viewport in CSS px; 150% zoom on a 1920 screen ≈ 1280) ---- */
@media (max-width:1400px){
  .sm-dev{display:none}
  .sm-stat{padding:16px 14px;min-height:112px}
}
@media (max-width:1100px){
  .sm-grid2,.sm-contacts{grid-template-columns:1fr}
}
@media (max-width:900px){
  .sm-stat-group{grid-template-columns:repeat(2,minmax(0,1fr))}
  .sm-stat:nth-child(odd){border-left:0}
  .sm-stat:nth-child(n+3){border-top:1px solid var(--line)}
  .sm-version{display:none}
}


/* Application-wide dark theme */
html[data-theme="dark"] .sm-app {
  --green: #79c995;
  --green-soft: #263d2d;
  --bg: #121713;
  --card: #1c241e;
  --line: #354239;
  --text: #edf2ee;
  --muted: #b2bdb5;
  --danger: #ff8585;
  --danger-bg: #482727;
}

/* Sidebar, topbar and footer */
html[data-theme="dark"] .sm-app .sm-footer,
html[data-theme="dark"] .sm-app .sm-sidebar,
html[data-theme="dark"] .sm-app .sm-topbar {
  background: var(--card) !important;
  color: var(--text);
}

/* Cards and notification panels */
html[data-theme="dark"] .sm-app .sm-card,
html[data-theme="dark"] .sm-app .nb-panel {
  background: var(--card) !important;
  color: var(--text);
  border-color: var(--line);
}

/* Form elements */
html[data-theme="dark"] .sm-app input,
html[data-theme="dark"] .sm-app select,
html[data-theme="dark"] .sm-app textarea {
  background-color: #202a23;
  color: var(--text);
  border-color: var(--line);
}

/* Buttons and version label */
html[data-theme="dark"] .sm-app .sm-btn-outline,
html[data-theme="dark"] .sm-app .sm-version {
  background: #202a23 !important;
  color: var(--text);
  border-color: var(--line) !important;
}

/* Borders and tables */
html[data-theme="dark"] .sm-app .sm-stat,
html[data-theme="dark"] .sm-app .sm-queue-row,
html[data-theme="dark"] .sm-app .sm-footer,
html[data-theme="dark"] .sm-app .sm-table th,
html[data-theme="dark"] .sm-app .sm-table td {
  border-color: var(--line);
}

html[data-theme="dark"] .sm-app .sm-table th {
  background: #202a23;
  color: var(--muted);
}

html[data-theme="dark"] .sm-app .sm-table tr:hover {
  background: #202a23;
}

/* Topbar controls */
html[data-theme="dark"] .sm-app .sm-icon-btn:hover,
html[data-theme="dark"] .sm-app .nb-btn:hover,
html[data-theme="dark"] .sm-app .nb-btn.is-open,
html[data-theme="dark"] .sm-app .nb-item:hover {
  background: #2b382f;
  color: var(--text);
}

`;
