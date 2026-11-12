import React, { useEffect } from "react";
import { Outlet } from "react-router-dom";
import { useAppTheme } from "../theme/ThemeContext";
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

/* ---------- Dark-mode surface fixer ----------
 * Some pages still hard-code light backgrounds (white chips, file buttons,
 * segmented toggles, neutral status pills ...). In dark mode their text turns
 * light, so it becomes unreadable on those light boxes.
 * While dark mode is on, this finds elements whose computed background is
 * near-white / light-grey and tags them with data-dm-surface, which the CSS
 * below turns into the dark surface colour. Coloured pills (green, red, blue,
 * amber) are left alone. Nothing runs in light mode.
 * Remove this once those pages use var(--card) / var(--surface-2).
 */
type SurfaceKind = "neutral" | "danger" | "warn";
type Rgba = [number, number, number, number];

/** Any CSS colour string -> [r, g, b, a]. Handles rgb(), color(srgb ...), oklch(), lab() ... via a canvas. */
const colourCache = new Map<string, Rgba | null>();
let colourCtx: CanvasRenderingContext2D | null = null;

const toRgba = (css: string): Rgba | null => {
  const cached = colourCache.get(css);
  if (cached !== undefined) return cached;

  let out: Rgba | null = null;
  const m = css.match(/^rgba?\(([^)]+)\)$/);
  if (m) {
    const [r, g, b, a = 1] = m[1].split(/[\s,/]+/).filter(Boolean).map(Number);
    if (![r, g, b, a].some((v) => Number.isNaN(v))) out = [r, g, b, a];
  } else {
    try {
      if (!colourCtx) {
        const canvas = document.createElement("canvas");
        canvas.width = canvas.height = 1;
        colourCtx = canvas.getContext("2d", { willReadFrequently: true });
      }
      if (colourCtx) {
        colourCtx.clearRect(0, 0, 1, 1);
        colourCtx.fillStyle = "rgba(0,0,0,0)";
        colourCtx.fillStyle = css;
        colourCtx.fillRect(0, 0, 1, 1);
        const d = colourCtx.getImageData(0, 0, 1, 1).data;
        out = [d[0], d[1], d[2], d[3] / 255];
      }
    } catch {
      out = null;
    }
  }
  colourCache.set(css, out);
  return out;
};

const luminance = ([r, g, b]: Rgba) => (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;

/** Returns the kind of light surface this element is, or null if it is fine in dark mode. */
const classifyElement = (el: HTMLElement): SurfaceKind | null => {
  const cs = getComputedStyle(el);
  const bg = toRgba(cs.backgroundColor);
  if (!bg || bg[3] < 0.5) return null;
  const [r, g, b] = bg;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);

  // light pink / red banner (e.g. #fbe4e4)
  if (r >= 235 && g >= 200 && g <= 240 && Math.abs(g - b) <= 14 && r - g >= 12) return "danger";
  // light amber banner (e.g. #fdeccf)
  if (r >= 240 && g >= 222 && b >= 185 && b <= 228 && r - b >= 24 && g - b >= 8) return "warn";
  // white / light grey
  if (min >= 205 && max - min <= 24) return "neutral";
  // any other light pastel box whose text is pale too (unreadable): make it a dark surface
  if (luminance(bg) > 0.72) {
    const text = toRgba(cs.color);
    if (text && luminance(text) > 0.6) return "neutral";
  }
  return null;
};

const SKIP_TAGS = new Set(["HTML", "BODY", "STYLE", "SCRIPT", "IMG", "IFRAME", "CANVAS", "VIDEO"]);

const markLightSurfaces = (root: HTMLElement) => {
  const nodes: HTMLElement[] = [root, ...Array.from(root.querySelectorAll<HTMLElement>("*"))];
  for (const el of nodes) {
    if (el instanceof SVGElement || SKIP_TAGS.has(el.tagName)) continue;
    if (el.hasAttribute("data-dm-surface")) continue;
    if (el instanceof HTMLInputElement && (el.type === "checkbox" || el.type === "radio")) continue;
    const kind = classifyElement(el);
    if (kind) el.setAttribute("data-dm-surface", kind);
  }
};

function useDarkSurfaceFix(dark: boolean) {
  useEffect(() => {
    if (!dark) {
      document
        .querySelectorAll("[data-dm-surface]")
        .forEach((el) => el.removeAttribute("data-dm-surface"));
      return;
    }

    let timer: number | undefined;
    const pending = new Set<HTMLElement>();

    const run = () => {
      timer = undefined;
      pending.forEach((n) => n.isConnected && markLightSurfaces(n));
      pending.clear();
    };
    const schedule = (n: Node) => {
      if (!(n instanceof HTMLElement)) return;
      pending.add(n);
      if (timer === undefined) timer = window.setTimeout(run, 60);
    };

    document.documentElement.setAttribute("data-dm-fix", "on");
    schedule(document.body);
    // pages that fetch data render late: scan again a few times after mount
    const rescans = [300, 900, 2000].map((ms) =>
      window.setTimeout(() => schedule(document.body), ms)
    );

    const observer = new MutationObserver((records) => {
      for (const r of records) {
        if (r.type === "childList") r.addedNodes.forEach(schedule);
        else schedule(r.target);
      }
    });
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["class", "style"],
    });

    return () => {
      observer.disconnect();
      rescans.forEach((t) => window.clearTimeout(t));
      document.documentElement.removeAttribute("data-dm-fix");
      if (timer !== undefined) window.clearTimeout(timer);
    };
  }, [dark]);
}

export default function AdminWorkspace(): React.JSX.Element {
  const { mode } = useAppTheme();
  useDarkSurfaceFix(mode === "dark");
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
 * THEME TOKENS live here. Every page/component should use these variables
 * instead of hard-coded colours, so light and dark themes stay in sync:
 *
 *   --bg          page background          --card        cards, panels, bars
 *   --surface-2   inputs, search box       --line        borders, dividers
 *   --text        main text                --muted       secondary text, icons
 *   --green       links, accents           --green-soft  success / active bg
 *   --on-green    text on green buttons    --danger(+bg) errors
 *   --warn-text / --warn-bg   warnings     --hover / --hover-soft  hover fills
 *   --shadow, --overlay       popups
 *
 * Sizing is fluid so the page looks the same at any browser zoom.
 */
const css = `
:root{
  --green:#1b6b2f; --green-soft:#e3f0e0; --on-green:#ffffff;
  --bg:#f5f4f0; --card:#ffffff; --surface-2:#faf9f6;
  --line:#e4e2dc; --text:#1c1c1a; --muted:#5f5e58;
  --danger:#b81d1d; --danger-bg:#fbe4e4;
  --warn-text:#9a5b00; --warn-bg:#fdeccf; --warn-pill-bg:#f6ecdb; --warn-pill-text:#8a5a00;
  --hover:#ecebe6; --hover-soft:#f6f6f4;
  --shadow:0 16px 40px rgba(20,30,20,.16); --overlay:rgba(25,31,26,.34);
}
.sm-app{
  /* ---- light theme tokens ---- */
  --green:#1b6b2f; --green-soft:#e3f0e0; --on-green:#ffffff;
  --bg:#f5f4f0; --card:#ffffff; --surface-2:#faf9f6;
  --line:#e4e2dc; --text:#1c1c1a; --muted:#5f5e58;
  --danger:#b81d1d; --danger-bg:#fbe4e4;
  --warn-text:#9a5b00; --warn-bg:#fdeccf; --warn-pill-bg:#f6ecdb; --warn-pill-text:#8a5a00;
  --hover:#ecebe6; --hover-soft:#f6f6f4;
  --shadow:0 16px 40px rgba(20,30,20,.16); --overlay:rgba(25,31,26,.34);

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
.sm-content{flex:1;min-height:0;overflow-y:auto;padding:19px var(--pad-x);scrollbar-color:var(--line) transparent}
.sm-crumb{font-size:var(--fs-base);font-weight:600;margin-bottom:11px}
.sm-title-row{display:flex;flex-wrap:wrap;justify-content:space-between;align-items:flex-end;gap:14px 20px;margin-bottom:21px}
.sm-title-text{flex:1 1 380px;min-width:0}
.sm-title-row h1{font-size:clamp(24px,1.6vw + .5rem,24px);font-weight:600;letter-spacing:-.4px}
.sm-title-row p{margin-top:5px;font-size:var(--fs-base);color:var(--muted)}
.sm-title-row p b{color:var(--muted);white-space:nowrap}
.sm-title-actions{display:flex;gap:11px;flex:none}
.sm-btn{display:inline-flex;align-items:center;gap:8px;height:32px;padding:0 12px;border-radius:8px;font-size:var(--fs-base);font-weight:500;flex:none;white-space:nowrap}
.sm-btn-outline{background:var(--card)!important;color:var(--text)!important;border:1px solid var(--line)!important}
.sm-btn-primary{background:var(--green)!important;color:var(--on-green)!important;font-weight:600}

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
.sm-queue-row svg{flex:none;color:var(--muted)}
.sm-count{flex:none;width:42px;height:42px;border-radius:8px;background:var(--danger-bg);color:var(--danger);font-weight:700;font-size:19px;display:grid;place-items:center}
.sm-count.is-warn{background:var(--warn-bg);color:var(--warn-text)}
.sm-queue-text{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px}
.sm-queue-text strong{font-size:clamp(15px,.9vw + .25rem,18px);font-weight:600;color:var(--text)}
.sm-queue-text small{font-size:var(--fs-base);color:var(--muted)}

/* footer: never cut off, wraps gracefully if space runs out */
.sm-footer{display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:6px 16px;padding:8px var(--pad-x);min-height:54px;border-top:1px solid var(--line);background:var(--card);font-size:var(--fs-sm);color:var(--muted);flex:none}
.sm-footer b{color:var(--text)}
.sm-footer-left{display:inline-flex;flex-wrap:wrap;align-items:center;gap:0 18px;min-width:0}
.sm-dev{margin-left:0}
.sm-footer-right{display:flex;flex-wrap:wrap;align-items:center;gap:6px 18px;min-width:0}
.sm-app .sm-footer a{white-space:nowrap;color:var(--muted)}
.sm-app .sm-footer a:hover{color:var(--text)}
.sm-version{border:1px solid var(--line);background:var(--surface-2);color:var(--muted);border-radius:999px;padding:6px 14px;white-space:nowrap}

/* ---- overview sections ---- */
.sm-pad{padding:0 22px 14px;margin-bottom:19px}
.sm-grid2{display:grid;grid-template-columns:1.3fr 1fr;gap:19px;align-items:stretch;margin-bottom:19px}
.sm-grid2 > .sm-card{margin-bottom:0;min-width:0}
.sm-ch{display:flex;justify-content:space-between;align-items:center;height:62px;gap:12px}
.sm-ch h3{display:flex;align-items:center;gap:11px;font-size:clamp(16px,.9vw + .3rem,18px);font-weight:600;color:var(--text)}
.sm-link{color:var(--green);font-weight:600;font-size:var(--fs-sm);white-space:nowrap}
.sm-banner{display:flex;align-items:center;gap:11px;background:var(--danger-bg);color:var(--danger);border-radius:8px;padding:12px 16px;font-size:var(--fs-base);margin-bottom:8px}
.sm-banner svg{flex:none}
.sm-row{display:flex;justify-content:space-between;align-items:center;gap:14px;padding:12px 8px}
.sm-row > div:first-child{min-width:0}
.sm-row strong,.sm-table strong,.sm-contacts strong{display:block;font-size:var(--fs-base);font-weight:600;color:var(--text)}
.sm-row small,.sm-table small,.sm-contacts small{display:block;font-size:var(--fs-sm);color:var(--muted)}
.sm-row-right{display:flex;align-items:center;gap:10px;flex:none}
.sm-pill{display:inline-flex;align-items:center;gap:7px;padding:5px 12px;border-radius:999px;font-size:14px;font-weight:600;white-space:nowrap}
.sm-pill::before{content:"";width:7px;height:7px;border-radius:50%;background:currentColor}
.sm-pill.ok{background:var(--green-soft);color:var(--green)}
.sm-pill.bad{background:var(--danger-bg);color:var(--danger)}
.sm-pill.warn{background:var(--warn-pill-bg);color:var(--warn-pill-text)}
.sm-btn-sm{height:34px;padding:0 14px;font-size:var(--fs-sm)}
.sm-table-wrap{overflow-x:auto}
.sm-table{width:100%;min-width:520px;border-collapse:collapse;text-align:left}
.sm-table th{font-size:14px;font-weight:500;color:var(--muted);padding:10px 8px;border-bottom:1px solid var(--line)}
.sm-table td{padding:12px 8px;font-size:var(--fs-base);color:var(--text);border-bottom:1px solid var(--line);vertical-align:middle}
.sm-table tr:last-child td{border-bottom:0}
.sm-alert{display:flex;align-items:center;gap:12px;padding:12px 16px;border-radius:10px;background:var(--danger-bg);color:var(--text);margin-bottom:10px}
.sm-alert svg{flex:none;color:var(--danger)}
.sm-alert.is-warn{background:var(--warn-bg)}
.sm-alert.is-warn svg{color:var(--warn-text)}
.sm-alert-text{flex:1;min-width:0;font-size:var(--fs-sm);line-height:1.45}
.sm-kv{display:grid;grid-template-columns:minmax(120px,280px) 1fr;row-gap:10px;margin:0 0 12px 8px;font-size:var(--fs-base)}
.sm-kv dt{color:var(--muted)} .sm-kv dd{margin:0;color:var(--text)}
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

/* =====================================================================
   DARK THEME: only the tokens change; components above read the tokens.
   ===================================================================== */
html[data-theme="dark"],
html[data-theme="dark"] .sm-app{
  --green:#79c995; --green-soft:#263d2d; --on-green:#0f2416;
  --bg:#0f1511; --card:#131a15; --surface-2:#18211b;
  --line:#2b382f; --text:#edf2ee; --muted:#b2bdb5;
  --danger:#ff8585; --danger-bg:#482727;
  --warn-text:#ffd98a; --warn-bg:#66480a; --warn-pill-bg:#4f3a0a; --warn-pill-text:#ffd98a;
  --hover:#222e26; --hover-soft:#1a241d;
  --shadow:0 16px 40px rgba(0,0,0,.55); --overlay:rgba(0,0,0,.6);
}

/* Bars and panels that other pages may still hard-code as white */
html[data-theme="dark"] .sm-app .sm-sidebar,
html[data-theme="dark"] .sm-app .sm-topbar,
html[data-theme="dark"] .sm-app .sm-footer{
  background:var(--card)!important;
  color:var(--text);
}
html[data-theme="dark"] .sm-app .sm-card,
html[data-theme="dark"] .sm-app .nb-panel{
  background:var(--card)!important;
  color:var(--text);
  border-color:var(--line);
}

/* Form elements (search boxes keep their transparent inner input) */
html[data-theme="dark"] .sm-app input,
html[data-theme="dark"] .sm-app select,
html[data-theme="dark"] .sm-app textarea{
  background-color:var(--surface-2);
  color:var(--text);
  border-color:var(--line);
}
html[data-theme="dark"] .sm-app .sm-search input,
html[data-theme="dark"] .sm-app .sm-nav-search-head input{
  background-color:transparent;
}
html[data-theme="dark"] .sm-app input::placeholder,
html[data-theme="dark"] .sm-app textarea::placeholder{
  color:var(--muted);
  opacity:1;
}

/* Table header and row hover */
html[data-theme="dark"] .sm-app .sm-table th{background:var(--surface-2);color:var(--muted)}
html[data-theme="dark"] .sm-app .sm-table tr:hover{background:var(--surface-2)}

/* ---------------------------------------------------------------------
   DARK SAFETY NET
   Pages (Projects, Workers, Accommodation, Sales ...) that hard-code
   "background:#fff" on their own cards / panels / modals / search boxes
   would show pale text on white in dark mode. These rules re-colour any
   element whose class name looks like a surface. Remove them once those
   pages use var(--card) etc. directly.
   --------------------------------------------------------------------- */
html[data-theme="dark"] :is(
  [class*="card"], [class*="panel"], [class*="modal"], [class*="dialog"],
  [class*="popup"], [class*="popover"], [class*="drawer"], [class*="sheet"], [class*="box"]
):not([class*="overlay"]):not([class*="backdrop"]):not([class*="pill"]):not([class*="badge"]):not([class*="checkbox"]):not(svg):not(img){
  background-color:var(--card);
  color:var(--text);
  border-color:var(--line);
}
html[data-theme="dark"] :is(
  [class*="search"], [class*="toggle"], [class*="segment"], [class*="toolbar"], [class*="filter"]
):not(input):not(svg):not(img):not(.sm-nav-search-head):not(.sm-search){
  background-color:var(--surface-2);
  color:var(--text);
  border-color:var(--line);
}
html[data-theme="dark"] :is(h1,h2,h3,h4,h5,h6,strong,b,th,td,label,dt,dd,legend){
  color:inherit;
}
html[data-theme="dark"] textarea,
html[data-theme="dark"] select,
html[data-theme="dark"] input:not([type="checkbox"]):not([type="radio"]){
  background-color:var(--surface-2);
  color:var(--text);
  border-color:var(--line);
}
html[data-theme="dark"] :is(.sm-search, [class*="search"]) input{
  background-color:transparent;
}
html[data-theme="dark"] input::placeholder,
html[data-theme="dark"] textarea::placeholder{color:var(--muted);opacity:1}
html[data-theme="dark"] .sm-app .sm-sidebar a img,
html[data-theme="dark"] .sm-app .sm-sidebar button img{filter:brightness(0) invert(1);opacity:.8}

/* Light surfaces found by useDarkSurfaceFix */
html[data-theme="dark"] [data-dm-surface="neutral"]{
  background-color:var(--surface-2)!important;
  color:var(--text);
}
/* red alert banners: solid dark red with white text, like the original site */
html[data-theme="dark"] [data-dm-surface="danger"]{
  background-color:#9f1c1c!important;
  border-color:#b92a2a!important;
}
html[data-theme="dark"] [data-dm-surface="danger"],
html[data-theme="dark"] [data-dm-surface="danger"] *{color:#fff!important}
/* amber warning banners: dark amber with light amber text */
html[data-theme="dark"] [data-dm-surface="warn"]{
  background-color:var(--warn-bg)!important;
}
html[data-theme="dark"] [data-dm-surface="warn"],
html[data-theme="dark"] [data-dm-surface="warn"] *{color:var(--warn-text)!important}

/* Hover states that are hard-coded light (table rows, list rows, task rows) */
html[data-theme="dark"] :is(tr, li, [role="row"], [role="option"], [class*="row"], [class*="item"], [class*="task"]):hover,
html[data-theme="dark"] tr:hover > :is(td, th){
  background-color:var(--hover-soft)!important;
  color:var(--text);
}

/* Outline / edit style buttons that are hard-coded white */
html[data-theme="dark"] :is(button, a)[class*="outline"],
html[data-theme="dark"] :is(button, a)[class*="edit"],
html[data-theme="dark"] :is(button, a)[class*="ghost"],
html[data-theme="dark"] :is(button, a)[class*="secondary"]{
  background-color:var(--card);
  color:var(--text);
  border-color:var(--line);
}
`;
