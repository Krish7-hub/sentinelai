import { useState, useEffect, useCallback, useRef } from "react";

const API = (import.meta.env.VITE_API_URL ?? "http://localhost:8000") + "/api";
const WS_URL = (import.meta.env.VITE_API_URL ?? "http://localhost:8000").replace("https://","wss://").replace("http://","ws://") + "/ws/events";

/* ─── GLOBAL STYLES ─── */
const STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=IBM+Plex+Mono:wght@300;400;500;600&family=DM+Sans:wght@300;400;500;600&display=swap');

*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{
  --void:#03050a;
  --abyss:#070c14;
  --surface:#0c1220;
  --surface2:#111827;
  --edge:rgba(255,255,255,0.06);
  --edge2:rgba(255,255,255,0.10);
  --plasma:#00f0ff;
  --plasma2:#0080ff;
  --plasma-dim:rgba(0,240,255,0.08);
  --nova:#ff2d6b;
  --nova-dim:rgba(255,45,107,0.1);
  --pulse:#00ffa3;
  --pulse-dim:rgba(0,255,163,0.1);
  --amber:#ffb800;
  --amber-dim:rgba(255,184,0,0.1);
  --t1:#eef2ff;
  --t2:#94a3b8;
  --t3:#4b5563;
  --t4:#1f2937;
  --font-display:'Syne',sans-serif;
  --font-body:'DM Sans',sans-serif;
  --font-mono:'IBM Plex Mono',monospace;
  --r:10px;
  --r2:16px;
  --r3:24px;
}
html{scroll-behavior:smooth}
body{background:var(--void);color:var(--t1);font-family:var(--font-body);font-size:14px;line-height:1.5;overflow-x:hidden;-webkit-font-smoothing:antialiased}
::-webkit-scrollbar{width:4px;height:4px}
::-webkit-scrollbar-track{background:transparent}
::-webkit-scrollbar-thumb{background:rgba(0,240,255,0.15);border-radius:99px}
::-webkit-scrollbar-thumb:hover{background:rgba(0,240,255,0.3)}

/* ANIMATIONS */
@keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
@keyframes slideLeft{from{opacity:0;transform:translateX(-16px)}to{opacity:1;transform:translateX(0)}}
@keyframes slideRight{from{opacity:0;transform:translateX(16px)}to{opacity:1;transform:translateX(0)}}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
@keyframes spinAnim{to{transform:rotate(360deg)}}
@keyframes scandown{0%{transform:translateY(-100%);opacity:0}10%{opacity:1}90%{opacity:1}100%{transform:translateY(100vh);opacity:0}}
@keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}
@keyframes glow{0%,100%{box-shadow:0 0 8px rgba(0,240,255,0.3)}50%{box-shadow:0 0 24px rgba(0,240,255,0.6)}}
@keyframes countUp{from{opacity:0;transform:scale(.7) translateY(4px)}to{opacity:1;transform:scale(1) translateY(0)}}
@keyframes borderSpin{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}
@keyframes flicker{0%,100%{opacity:1}91%{opacity:1}92%{opacity:.8}94%{opacity:1}96%{opacity:.6}98%{opacity:1}}
@keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
@keyframes barGrow{from{transform:scaleY(0)}to{transform:scaleY(1)}}
@keyframes ripple{0%{transform:scale(0);opacity:.4}100%{transform:scale(2.5);opacity:0}}
@keyframes dashDraw{from{stroke-dashoffset:300}to{stroke-dashoffset:0}}
@keyframes blink{0%,100%{opacity:1}50%{opacity:0}}

.page-anim{animation:fadeUp .45s cubic-bezier(.22,1,.36,1) both}
.stagger-1{animation-delay:.05s}
.stagger-2{animation-delay:.10s}
.stagger-3{animation-delay:.15s}
.stagger-4{animation-delay:.20s}

/* GLASS */
.glass{
  background:rgba(12,18,32,0.7);
  backdrop-filter:blur(24px);
  -webkit-backdrop-filter:blur(24px);
  border:1px solid var(--edge);
  border-radius:var(--r2);
  position:relative;
  overflow:hidden;
}
.glass::before{
  content:'';position:absolute;inset:0;pointer-events:none;
  background:linear-gradient(135deg,rgba(255,255,255,.03) 0%,transparent 60%);
  border-radius:inherit;
}
.glass:hover{border-color:rgba(255,255,255,0.1);transition:border-color .3s}

/* GLOW CARDS */
.gcard{
  border-radius:var(--r2);border:1px solid var(--edge);
  background:var(--surface);
  position:relative;overflow:hidden;
  transition:transform .25s,border-color .25s,box-shadow .25s;
  animation:fadeUp .5s cubic-bezier(.22,1,.36,1) both;
}
.gcard::after{
  content:'';position:absolute;top:0;left:0;right:0;height:1px;
  background:linear-gradient(90deg,transparent 0%,rgba(0,240,255,.4) 50%,transparent 100%);
  opacity:0;transition:opacity .3s;
}
.gcard:hover{transform:translateY(-3px);border-color:rgba(0,240,255,.2);box-shadow:0 20px 60px rgba(0,0,0,.5),0 0 30px rgba(0,240,255,.05)}
.gcard:hover::after{opacity:1}

/* BUTTONS */
.btn{
  display:inline-flex;align-items:center;justify-content:center;gap:7px;
  padding:9px 18px;border-radius:var(--r);cursor:pointer;
  font-family:var(--font-body);font-size:13px;font-weight:600;
  transition:all .2s;border:1px solid transparent;outline:none;
  position:relative;overflow:hidden;white-space:nowrap;
}
.btn::after{content:'';position:absolute;inset:0;background:rgba(255,255,255,0);transition:background .2s}
.btn:hover::after{background:rgba(255,255,255,.04)}
.btn:active{transform:scale(.97)}

.btn-plasma{background:rgba(0,240,255,.08);border-color:rgba(0,240,255,.3);color:var(--plasma)}
.btn-plasma:hover{background:rgba(0,240,255,.14);border-color:rgba(0,240,255,.5);box-shadow:0 0 20px rgba(0,240,255,.15)}

.btn-nova{background:rgba(255,45,107,.08);border-color:rgba(255,45,107,.3);color:var(--nova)}
.btn-nova:hover{background:rgba(255,45,107,.14);border-color:rgba(255,45,107,.5);box-shadow:0 0 20px rgba(255,45,107,.15)}

.btn-pulse{background:rgba(0,255,163,.08);border-color:rgba(0,255,163,.3);color:var(--pulse)}
.btn-pulse:hover{background:rgba(0,255,163,.14);border-color:rgba(0,255,163,.5);box-shadow:0 0 20px rgba(0,255,163,.15)}

.btn-amber{background:rgba(255,184,0,.08);border-color:rgba(255,184,0,.3);color:var(--amber)}
.btn-amber:hover{background:rgba(255,184,0,.14);border-color:rgba(255,184,0,.5);box-shadow:0 0 20px rgba(255,184,0,.15)}

.btn-ghost{background:rgba(255,255,255,.03);border-color:var(--edge2);color:var(--t2)}
.btn-ghost:hover{background:rgba(255,255,255,.06);color:var(--t1)}

.btn-danger-outline{background:transparent;border:1px dashed rgba(255,45,107,.35);color:rgba(255,45,107,.7)}
.btn-danger-outline:hover{background:rgba(255,45,107,.08);border-color:rgba(255,45,107,.6);color:var(--nova)}

/* INPUT */
.inp{
  width:100%;background:rgba(255,255,255,.03);
  border:1px solid var(--edge2);border-radius:var(--r);
  padding:10px 14px;color:var(--t1);
  font-family:var(--font-body);font-size:13px;outline:none;
  transition:border-color .2s,box-shadow .2s;
}
.inp:focus{border-color:rgba(0,240,255,.4);box-shadow:0 0 0 3px rgba(0,240,255,.07)}
.inp::placeholder{color:var(--t3)}
select.inp option{background:var(--surface2);color:var(--t1)}

/* NAV */
.nav-link{
  display:flex;align-items:center;gap:11px;
  padding:11px 14px;border-radius:var(--r);cursor:pointer;
  color:var(--t2);font-size:14px;font-weight:500;
  transition:all .2s;border:1px solid transparent;
  background:none;width:100%;text-align:left;font-family:var(--font-body);
  position:relative;overflow:hidden;
}
.nav-link:hover{color:var(--t2);background:rgba(255,255,255,.03)}
.nav-link.active{
  color:var(--plasma);
  background:linear-gradient(90deg,rgba(0,240,255,.08),rgba(0,240,255,.03));
  border-color:rgba(0,240,255,.15);
}
.nav-link.active .nav-icon{color:var(--plasma);filter:drop-shadow(0 0 6px var(--plasma))}
.nav-link::before{
  content:'';position:absolute;left:0;top:50%;transform:translateY(-50%);
  width:3px;height:0;background:var(--plasma);border-radius:0 3px 3px 0;
  transition:height .2s;box-shadow:0 0 8px var(--plasma);
}
.nav-link.active::before{height:60%}

/* TABLE */
.tbl{width:100%;border-collapse:collapse;font-size:13px}
.tbl th{
  padding:10px 14px;text-align:left;
  font-size:10px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;
  color:var(--t3);border-bottom:1px solid var(--edge);
  font-family:var(--font-mono);
}
.tbl td{padding:12px 14px;border-bottom:1px solid rgba(255,255,255,.03)}
.tbl tr{transition:background .15s;cursor:pointer}
.tbl tr:hover td{background:rgba(0,240,255,.03)}

/* BADGES */
.badge{display:inline-flex;align-items:center;gap:4px;padding:3px 9px;border-radius:99px;font-size:10px;font-weight:700;letter-spacing:.8px;text-transform:uppercase}
.badge-HIGH{color:var(--nova);background:rgba(255,45,107,.12);border:1px solid rgba(255,45,107,.25)}
.badge-MEDIUM{color:var(--amber);background:rgba(255,184,0,.12);border:1px solid rgba(255,184,0,.25)}
.badge-LOW{color:var(--pulse);background:rgba(0,255,163,.12);border:1px solid rgba(0,255,163,.25)}

/* MISC */
.mono{font-family:var(--font-mono)}
.label{font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:var(--t3)}
.dot-online{width:6px;height:6px;border-radius:50%;background:var(--pulse);display:inline-block;box-shadow:0 0 6px var(--pulse);animation:pulse 2s infinite}
.dot-offline{width:6px;height:6px;border-radius:50%;background:var(--t3);display:inline-block}
.dot-suspended{width:6px;height:6px;border-radius:50%;background:var(--nova);display:inline-block;box-shadow:0 0 6px var(--nova);animation:pulse 1.5s infinite}
.ticker-line{height:3px;background:var(--edge);border-radius:99px;overflow:hidden}
.ticker-fill{height:100%;border-radius:99px;transition:width .7s cubic-bezier(.22,1,.36,1)}
.section-tag{
  display:inline-flex;align-items:center;gap:6px;
  padding:4px 12px;border-radius:99px;font-size:10px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;
  border:1px solid var(--edge2);color:var(--t3);
}

/* ── RESPONSIVE LAYOUT CLASSES ── */
.layout-root{display:flex;min-height:100vh}
.sidebar{width:232px;background:rgba(7,12,20,.96);backdrop-filter:blur(24px);border-right:1px solid var(--edge);display:flex;flex-direction:column;flex-shrink:0;position:sticky;top:0;height:100vh;z-index:10;transition:transform .3s cubic-bezier(.22,1,.36,1)}
.main-area{flex:1;display:flex;flex-direction:column;min-height:100vh;overflow:hidden;min-width:0}
.page-pad{flex:1;padding:30px;overflow-y:auto}

.grid-4{display:grid;grid-template-columns:repeat(4,1fr);gap:14px}
.grid-3{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}
.grid-2{display:grid;grid-template-columns:1fr 1fr;gap:16px}
.grid-trend{display:grid;grid-template-columns:3fr 2fr;gap:14px}
.grid-detail{display:grid;grid-template-columns:2fr 1fr;gap:16px}
.grid-viols{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}
.grid-bottom{display:grid;grid-template-columns:1fr 1fr;gap:16px}

.mob-menu-btn{display:none;align-items:center;justify-content:center;width:38px;height:38px;border-radius:8px;background:rgba(0,240,255,.08);border:1px solid rgba(0,240,255,.25);color:var(--plasma);cursor:pointer;font-size:20px;flex-shrink:0;transition:all .2s}.mob-menu-btn:hover{background:rgba(0,240,255,.15)}
.sidebar-overlay{display:none;position:fixed;top:0;left:260px;right:0;bottom:0;background:rgba(0,0,0,.5);z-index:15}.sidebar-overlay.open{display:block}

.emp-hero-inner{display:flex;gap:22px;align-items:flex-start}
.topbar-inner{padding:12px 28px;border-bottom:1px solid var(--edge);display:flex;justify-content:space-between;align-items:center;background:rgba(7,12,20,.6);backdrop-filter:blur(12px);flex-shrink:0}
.emp-page-header{display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:24px}
.logs-header{display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:24px}
.logs-filters{display:flex;gap:10px;flex-wrap:wrap}
.alerts-header{display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:24px}

/* ── TABLET (≤1024px) ── */
@media(max-width:1024px){
  .sidebar{
    position:fixed;top:0;left:0;height:100vh;z-index:30;
    transform:translateX(-100%);width:260px;
    background:rgba(7,12,20,1)!important;
  }
  .sidebar.open{transform:translateX(0);box-shadow:4px 0 40px rgba(0,0,0,.9)}
  .grid-4{grid-template-columns:repeat(2,1fr)}
  .grid-trend{grid-template-columns:1fr}
  .grid-detail{grid-template-columns:1fr}
  .grid-bottom{grid-template-columns:1fr}
  .grid-3{grid-template-columns:repeat(2,1fr)}
  .page-pad{padding:22px}
}

/* ── MOBILE (≤768px) ── */
@media(max-width:1024px){
  .mob-menu-btn{display:flex}
}
@media(max-width:768px){
  .sidebar{
    position:fixed;top:0;left:0;height:100vh;z-index:30;
    transform:translateX(-100%);width:260px;
    background:rgba(7,12,20,1)!important;
  }
  .sidebar.open{transform:translateX(0);box-shadow:4px 0 40px rgba(0,0,0,.9),20px 0 60px rgba(0,0,0,.8)}
  .mob-menu-btn{display:flex}
  .main-area{width:100%}
  .page-pad{padding:16px}
  .topbar-inner{padding:10px 16px;gap:10px}
  .grid-4{grid-template-columns:1fr 1fr;gap:10px}
  .grid-2{grid-template-columns:1fr}
  .grid-detail{grid-template-columns:1fr}
  .grid-bottom{grid-template-columns:1fr}
  .grid-trend{grid-template-columns:1fr}
  .grid-3{grid-template-columns:repeat(2,1fr);gap:8px}
  .grid-viols{grid-template-columns:repeat(2,1fr);gap:8px}
  .emp-hero-inner{flex-direction:column;gap:14px}
  .emp-page-header{flex-direction:column;align-items:flex-start;gap:12px}
  .logs-header{flex-direction:column;align-items:flex-start;gap:12px}
  .alerts-header{flex-direction:column;align-items:flex-start;gap:12px}
  .tbl th:nth-child(n+5),.tbl td:nth-child(n+5){display:none}
  .topbar-date{display:none}
  h1.page-title{font-size:22px!important}
}

/* ── SMALL MOBILE (≤480px) ── */
@media(max-width:480px){
  .grid-4{grid-template-columns:1fr 1fr;gap:8px}
  .grid-3{grid-template-columns:1fr 1fr}
  .grid-viols{grid-template-columns:1fr 1fr}
  .page-pad{padding:12px}
  .glass{padding:14px!important}
  .gcard{padding:16px 18px!important}
  h1.page-title{font-size:20px!important}
  .stat-val{font-size:32px!important}
  .login-card{padding:24px!important}
  .login-logo{width:60px!important;height:60px!important}
  .login-title{font-size:24px!important}
}
`;

/* ─── HELPERS ─── */
const RC = { HIGH: "#ff2d6b", MEDIUM: "#ffb800", LOW: "#00ffa3" };
const EVMAP = {
  usb_insertion:      { label: "USB Insertion",    color: "#ff2d6b" },
  usb_removal:        { label: "USB Removal",       color: "#4b5563" },
  bulk_copy:          { label: "Bulk Copy",          color: "#ffb800" },
  late_login:         { label: "Late Login",         color: "#00f0ff" },
  unauthorized_app:   { label: "Unauth App",         color: "#a855f7" },
  keylogger_detected: { label: "Keylogger",          color: "#ff2d6b" },
  suspicious_port:    { label: "Suspicious Port",    color: "#06b6d4" },
  heartbeat:          { label: "Heartbeat",          color: "#1f2937" },
};

const fmtDt = ts => ts ? new Date(ts).toLocaleString("en-US",{month:"short",day:"2-digit",hour:"2-digit",minute:"2-digit",second:"2-digit"}) : "—";
const fmtTm = ts => ts ? new Date(ts).toLocaleTimeString("en-US",{hour:"2-digit",minute:"2-digit",second:"2-digit"}) : "—";

function useApi(token) {
  const get  = useCallback(async p => { const r = await fetch(`${API}${p}`,{headers:{Authorization:`Bearer ${token}`}}); if(!r.ok) throw new Error(await r.text()); return r.json(); }, [token]);
  const post = useCallback(async (p,b={}) => { const r = await fetch(`${API}${p}`,{method:"POST",headers:{Authorization:`Bearer ${token}`,"Content-Type":"application/json"},body:JSON.stringify(b)}); if(!r.ok) throw new Error(await r.text()); return r.json(); }, [token]);
  return { get, post };
}

/* ─── UI ATOMS ─── */
function Badge({ level }) {
  const dot = { HIGH: "●", MEDIUM: "◆", LOW: "▲" };
  return <span className={`badge badge-${level}`}>{dot[level] || "●"} {level}</span>;
}

function Spinner({ size = 18 }) {
  return <div style={{ width: size, height: size, border: `2px solid rgba(0,240,255,.15)`, borderTop: `2px solid var(--plasma)`, borderRadius: "50%", animation: "spinAnim .8s linear infinite" }} />;
}

function Empty({ msg = "No data" }) {
  return (
    <div style={{ textAlign: "center", padding: "48px 24px" }}>
      <div style={{ fontSize: 32, marginBottom: 12, opacity: .3 }}>◉</div>
      <div style={{ color: "var(--t3)", fontSize: 13 }}>{msg}</div>
    </div>
  );
}

function Toast({ msg, type = "info", onClose }) {
  const pal = { info: "var(--plasma)", success: "var(--pulse)", error: "var(--nova)", warning: "var(--amber)" };
  const c = pal[type];
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t); }, []);
  return (
    <div style={{ position:"fixed", bottom:28, right:28, zIndex:9999, display:"flex", alignItems:"center", gap:12, padding:"14px 20px", borderRadius:12, background:"rgba(7,12,20,.95)", backdropFilter:"blur(20px)", border:`1px solid ${c}33`, color:c, fontSize:13, fontWeight:500, boxShadow:`0 20px 60px rgba(0,0,0,.7), 0 0 20px ${c}15`, animation:"slideRight .3s cubic-bezier(.22,1,.36,1)" }}>
      <span style={{ width:6, height:6, borderRadius:"50%", background:c, boxShadow:`0 0 8px ${c}` }} />
      {msg}
      <span onClick={onClose} style={{ marginLeft:8, cursor:"pointer", opacity:.5, fontSize:16 }}>×</span>
    </div>
  );
}

function Panel({ title, children, action, style = {} }) {
  return (
    <div className="glass" style={{ padding:"22px", ...style }}>
      {title && (
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:18 }}>
          <span className="label">{title}</span>
          {action}
        </div>
      )}
      {children}
    </div>
  );
}

function Gauge({ score, level }) {
  const pct = Math.min(100, score / 5);
  const c = RC[level] || "#00ffa3";
  const r = 48, cx = 56, cy = 56;
  const arc = Math.PI * r;
  const offset = arc - (pct / 100) * arc;
  return (
    <div style={{ textAlign:"center" }}>
      <svg width={112} height={72} viewBox="0 0 112 72">
        <defs>
          <linearGradient id="gg" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={c} stopOpacity=".4" />
            <stop offset="100%" stopColor={c} />
          </linearGradient>
          <filter id="blur2"><feGaussianBlur stdDeviation="2" /></filter>
        </defs>
        <path d={`M${cx-r},${cy} A${r},${r} 0 0 1 ${cx+r},${cy}`} fill="none" stroke="rgba(255,255,255,.04)" strokeWidth={7} strokeLinecap="round"/>
        <path d={`M${cx-r},${cy} A${r},${r} 0 0 1 ${cx+r},${cy}`} fill="none" stroke={c} strokeWidth={3} strokeLinecap="round" filter="url(#blur2)" opacity=".4" strokeDasharray={`${(pct/100)*arc} ${arc}`}/>
        <path d={`M${cx-r},${cy} A${r},${r} 0 0 1 ${cx+r},${cy}`} fill="none" stroke="url(#gg)" strokeWidth={7} strokeLinecap="round" strokeDasharray={`${(pct/100)*arc} ${arc}`} style={{transition:"stroke-dasharray 1s cubic-bezier(.22,1,.36,1)"}}/>
        <text x={cx} y={cy-6} textAnchor="middle" fill={c} fontSize={20} fontWeight={700} fontFamily="'IBM Plex Mono',monospace">{score.toFixed(0)}</text>
        <text x={cx} y={cy+8} textAnchor="middle" fill="rgba(255,255,255,.25)" fontSize={8} fontFamily="'IBM Plex Mono',monospace">RISK SCORE</text>
      </svg>
    </div>
  );
}

function BarChart({ data = [] }) {
  if (!data.length) return <Empty msg="No trend data yet" />;
  const max = Math.max(...data.map(d => d.events || 0), 1);
  const cols = ["#00f0ff","#a855f7","#00ffa3","#ffb800","#ff2d6b","#06b6d4","#f97316"];
  return (
    <div style={{ display:"flex", alignItems:"flex-end", gap:8, height:110 }}>
      {data.map((d,i) => {
        const h = Math.max(4, ((d.events || 0) / max) * 96);
        const c = cols[i % cols.length];
        return (
          <div key={i} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:6 }}>
            <div style={{ fontSize:10, color:c, fontFamily:"var(--font-mono)", fontWeight:600, opacity: d.events ? 1 : 0 }}>{d.events || ""}</div>
            <div style={{ width:"100%", display:"flex", flexDirection:"column", justifyContent:"flex-end", height:80 }}>
              <div style={{ height:h, background:`linear-gradient(180deg,${c},${c}33)`, borderRadius:"4px 4px 0 0", boxShadow:`0 0 12px ${c}33`, transformOrigin:"bottom", animation:"barGrow .7s cubic-bezier(.22,1,.36,1) both", animationDelay:`${i*60}ms` }} />
            </div>
            <span style={{ fontSize:9, color:"var(--t3)", fontFamily:"var(--font-mono)" }}>{d.date?.slice(-5)}</span>
          </div>
        );
      })}
    </div>
  );
}

function Sparkline({ data = [], color = "#00f0ff", h = 48 }) {
  if (data.length < 2) return null;
  const vals = data.map(d => d.score || d.events || 0);
  const mn = Math.min(...vals), mx = Math.max(...vals) || 1;
  const W = 220;
  const pts = vals.map((v,i) => `${(i/(vals.length-1))*W},${h-4-((v-mn)/(mx-mn))*(h-8)}`).join(" ");
  return (
    <svg width="100%" height={h} viewBox={`0 0 ${W} ${h}`} preserveAspectRatio="none">
      <defs>
        <linearGradient id={`spk${color.replace("#","")}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity=".3"/>
          <stop offset="100%" stopColor={color} stopOpacity="0"/>
        </linearGradient>
      </defs>
      <polygon points={`0,${h} ${pts} ${W},${h}`} fill={`url(#spk${color.replace("#","")})`}/>
      <polyline points={pts} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function ViolBox({ label, value, color, pts }) {
  return (
    <div style={{ background:"rgba(255,255,255,.02)", border:`1px solid ${color}18`, borderRadius:10, padding:"14px 12px", textAlign:"center", transition:"all .25s", cursor:"default" }}
      onMouseEnter={e=>{e.currentTarget.style.background=`${color}0c`;e.currentTarget.style.borderColor=`${color}33`;e.currentTarget.style.transform="scale(1.04)"}}
      onMouseLeave={e=>{e.currentTarget.style.background="rgba(255,255,255,.02)";e.currentTarget.style.borderColor=`${color}18`;e.currentTarget.style.transform="scale(1)"}}>
      <div style={{ fontSize:30,fontWeight:700,color,fontFamily:"var(--font-mono)",lineHeight:1,marginBottom:4,animation:"countUp .4s ease" }}>{value}</div>
      <div style={{ fontSize:9,color:"var(--t3)",textTransform:"uppercase",letterSpacing:1,marginBottom:2 }}>{label}</div>
      <div style={{ fontSize:8,color:`${color}66` }}>+{pts} pts</div>
    </div>
  );
}

function StatCard({ label, value, color, icon, delay = 0, sub }) {
  return (
    <div className="gcard" style={{ padding:"22px 24px", animationDelay:`${delay}ms` }}>
      <div style={{ position:"absolute", top:0, right:0, width:80, height:80, background:`radial-gradient(circle at 70% 30%, ${color}10, transparent 70%)`, pointerEvents:"none" }} />
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
        <div>
          <div className="label" style={{ marginBottom:12 }}>{label}</div>
          <div style={{ fontSize:40,fontWeight:800,color,fontFamily:"var(--font-mono)",lineHeight:1,animation:"countUp .5s cubic-bezier(.22,1,.36,1)" }}>{value}</div>
          {sub && <div style={{ fontSize:11,color:"var(--t3)",marginTop:6 }}>{sub}</div>}
        </div>
        <div style={{ fontSize:28,opacity:.15,userSelect:"none" }}>{icon}</div>
      </div>
    </div>
  );
}

/* ─── PAGES ─── */
function OverviewPage({ token, feed, wsEvent }) {
  const { get } = useApi(token);
  const [stats, setStats] = useState(null);
  const [emps, setEmps] = useState([]);

  const load = useCallback(async () => {
    try { const [s,e] = await Promise.all([get("/admin/dashboard-stats"),get("/employees/")]); setStats(s); setEmps(e); } catch(_){}
  }, [get]);
  useEffect(() => { load(); const i = setInterval(load,5000); return ()=>clearInterval(i); }, [load]);
  useEffect(() => { if(wsEvent) load(); }, [wsEvent]);

  if (!stats) return <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:300,gap:14,color:"var(--t3)"}}><Spinner/>Loading dashboard...</div>;

  return (
    <div className="page-anim">
      <div style={{ marginBottom:28 }}>
        <div style={{ display:"flex",alignItems:"center",gap:14,marginBottom:6 }}>
          <h1 style={{ fontFamily:"var(--font-display)",fontSize:28,fontWeight:800,letterSpacing:-1 }}>Security Overview</h1>
          <span className="section-tag"><span className="dot-online"/>Live</span>
        </div>
        <p style={{ color:"var(--t3)",fontSize:13 }}>Real-time threat intelligence across all monitored endpoints</p>
      </div>

      <div className="grid-4" style={{ marginBottom:20 }}>
        <StatCard label="Total Agents"   value={stats.total_employees}  color="var(--plasma)" icon="◈" delay={0}   sub="Connected endpoints"/>
        <StatCard label="Online Now"     value={stats.online_employees} color="var(--pulse)"  icon="●" delay={60}  sub="Active right now"/>
        <StatCard label="High Risk"      value={stats.high_risk_count}  color="var(--nova)"   icon="◉" delay={120} sub="Needs attention"/>
        <StatCard label="Open Alerts"    value={stats.open_alerts}      color="var(--amber)"  icon="▲" delay={180} sub="Unresolved"/>
      </div>

      <div className="grid-trend" style={{ marginBottom:14 }}>
        <Panel title="7-Day Threat Trend" style={{ animationDelay:"240ms",animation:"fadeUp .5s ease both" }}>
          <BarChart data={stats.threat_trend}/>
        </Panel>
        <Panel title="Risk Distribution" style={{ animationDelay:"280ms",animation:"fadeUp .5s ease both" }}>
          <div style={{ display:"flex",flexDirection:"column",gap:16 }}>
            {["HIGH","MEDIUM","LOW"].map(l => {
              const count = emps.filter(e=>e.risk?.level===l).length;
              const pct = emps.length ? (count/emps.length)*100 : 0;
              const c = RC[l];
              return (
                <div key={l}>
                  <div style={{ display:"flex",justifyContent:"space-between",marginBottom:7 }}>
                    <span style={{ color:c,fontSize:11,fontWeight:700,letterSpacing:1,fontFamily:"var(--font-mono)" }}>{l}</span>
                    <span style={{ color:"var(--t2)",fontSize:11,fontFamily:"var(--font-mono)" }}>{count}<span style={{color:"var(--t3)"}}> / {emps.length}</span></span>
                  </div>
                  <div className="ticker-line">
                    <div className="ticker-fill" style={{ width:`${pct}%`,background:`linear-gradient(90deg,${c}88,${c})`,boxShadow:`0 0 8px ${c}44` }}/>
                  </div>
                </div>
              );
            })}
            {!emps.length && <Empty msg="No agents connected"/>}
          </div>
        </Panel>
      </div>

      <Panel title="Live Activity Feed" action={<span className="mono" style={{fontSize:10,color:"var(--pulse)",display:"flex",alignItems:"center",gap:5}}><span className="dot-online"/>STREAMING</span>}>
        <div style={{ maxHeight:260,overflowY:"auto" }}>
          {feed.length===0 && <Empty msg="Awaiting live events..."/>}
          {feed.slice(0,30).map((ev,i)=>{
            const e = EVMAP[ev.event_type]||{label:ev.event_type,color:"#4b5563"};
            return(
              <div key={i} style={{ display:"flex",alignItems:"center",gap:12,padding:"11px 0",borderBottom:"1px solid rgba(255,255,255,.04)",animation:"fadeUp .3s ease" }}>
                <div style={{ width:36,height:36,borderRadius:10,background:`${e.color}15`,border:`1px solid ${e.color}30`,display:"flex",alignItems:"center",justifyContent:"center",color:e.color,fontSize:14,flexShrink:0 }}>⬡</div>
                <div style={{ flex:1,minWidth:0 }}>
                  <span style={{ color:"var(--t1)",fontWeight:500 }}>{ev.employee_name||`Employee ${ev.employee_id}`}</span>
                  <span style={{ color:e.color,fontSize:12,marginLeft:10,fontWeight:600 }}>{e.label}</span>
                </div>
                {ev.level && <Badge level={ev.level}/>}
                <span className="mono" style={{ color:"var(--t3)",fontSize:11,flexShrink:0 }}>{fmtTm(ev.timestamp)}</span>
              </div>
            );
          })}
        </div>
      </Panel>
    </div>
  );
}

function EmployeesPage({ token, onSelect, wsEvent }) {
  const { get } = useApi(token);
  const [emps, setEmps] = useState([]);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("risk");

  const load = useCallback(async () => { try { setEmps(await get("/employees/")); } catch(_){} }, [get]);
  useEffect(()=>{ load(); const i=setInterval(load,5000); return ()=>clearInterval(i); },[load]);
  useEffect(()=>{ if(wsEvent) load(); },[wsEvent]);

  const filtered = emps
    .filter(e=>e.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a,b)=>sort==="risk"?(b.risk?.score||0)-(a.risk?.score||0):a.name.localeCompare(b.name));

  return (
    <div className="page-anim">
      <div className="emp-page-header">
        <div>
          <h1 className="page-title" style={{ fontFamily:"var(--font-display)",fontSize:28,fontWeight:800,letterSpacing:-1 }}>Employees</h1>
          <p style={{ color:"var(--t3)",fontSize:13,marginTop:4 }}>{emps.length} registered · {emps.filter(e=>e.status==="online").length} online</p>
        </div>
        <div style={{ display:"flex",gap:10,flexWrap:"wrap" }}>
          <input className="inp" style={{ width:200 }} placeholder="Search by name..." value={search} onChange={e=>setSearch(e.target.value)}/>
          <select className="inp" style={{ width:"auto" }} value={sort} onChange={e=>setSort(e.target.value)}>
            <option value="risk">Risk Score</option>
            <option value="name">Name A–Z</option>
          </select>
        </div>
      </div>

      <Panel>
        <div style={{ overflowX:"auto" }}>
          <table className="tbl">
            <thead>
              <tr>
                {["Employee","Status","Risk","USB","Bulk","Apps","Keylog","Net","Last Seen",""].map(h=>(
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((emp,idx)=>(
                <tr key={emp.id} onClick={()=>onSelect(emp)} style={{ animationDelay:`${idx*25}ms` }}>
                  <td>
                    <div style={{ display:"flex",alignItems:"center",gap:11 }}>
                      <div style={{ width:36,height:36,borderRadius:10,background:"linear-gradient(135deg,rgba(0,240,255,.12),rgba(0,128,255,.08))",border:"1px solid rgba(0,240,255,.15)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,fontWeight:700,color:"var(--plasma)",flexShrink:0 }}>{emp.name[0]}</div>
                      <div>
                        <div style={{ fontWeight:500,color:"var(--t1)" }}>{emp.name}</div>
                        <div style={{ fontSize:11,color:"var(--t3)" }}>{emp.department||"—"}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div style={{ display:"flex",alignItems:"center",gap:7 }}>
                      <span className={`dot-${emp.status}`}/>
                      <span style={{ color:"var(--t2)",fontSize:11 }}>{emp.status}</span>
                      {emp.usb_disabled&&<span style={{ fontSize:9,color:"var(--nova)",border:"1px solid rgba(255,45,107,.25)",padding:"1px 5px",borderRadius:4 }}>USB OFF</span>}
                    </div>
                  </td>
                  <td>
                    <div style={{ display:"flex",alignItems:"center",gap:8 }}>
                      <Badge level={emp.risk?.level||"LOW"}/>
                      <span className="mono" style={{ fontSize:12,color:RC[emp.risk?.level]||"var(--t3)" }}>{(emp.risk?.score||0).toFixed(0)}</span>
                    </div>
                  </td>
                  {["usb_count","bulk_count","app_count","keylogger_count","network_count"].map(k=>(
                    <td key={k}>
                      <span className="mono" style={{ color:(emp.violations?.[k]||0)>0?"var(--amber)":"var(--t3)",fontSize:13 }}>{emp.violations?.[k]||0}</span>
                    </td>
                  ))}
                  <td><span className="mono" style={{ fontSize:11,color:"var(--t3)" }}>{fmtTm(emp.last_seen)}</span></td>
                  <td>
                    <button className="btn btn-plasma" onClick={e=>{e.stopPropagation();onSelect(emp);}} style={{ padding:"6px 14px",fontSize:12 }}>View →</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!filtered.length&&<Empty msg="No employees found"/>}
        </div>
      </Panel>
    </div>
  );
}

function EmployeeDetail({ token, emp, onBack, userRole, wsEvent }) {
  const { get, post } = useApi(token);
  const [detail, setDetail] = useState(emp);
  const [events, setEvents] = useState([]);
  const [toast, setToast] = useState(null);

  const load = useCallback(async ()=>{
    try { const [d,ev]=await Promise.all([get(`/employees/${emp.id}`),get(`/events/?employee_id=${emp.id}&limit=50`)]); setDetail(d); setEvents(ev); } catch(_){}
  },[emp.id,get]);
  useEffect(()=>{ load(); const i=setInterval(load,5000); return()=>clearInterval(i); },[emp.id]);
  useEffect(()=>{ if(wsEvent) load(); },[wsEvent]);

  const act = async (fn,msg,type="success") => { try { await fn(); setToast({msg,type}); load(); } catch(e){ setToast({msg:"Error: "+e.message,type:"error"}); } };

  const deleteEmp = async () => {
    if(!window.confirm(`Permanently delete ${detail.name} and ALL their data?\n\nThis cannot be undone.`)) return;
    try {
      const r = await fetch(`${API}/employees/${detail.id}`,{method:"DELETE",headers:{Authorization:`Bearer ${token}`}});
      if(!r.ok) throw new Error(await r.text());
      setToast({msg:detail.name+" permanently deleted",type:"error"});
      setTimeout(onBack,1500);
    } catch(e){ setToast({msg:"Error: "+e.message,type:"error"}); }
  };

  const clearData = async () => {
    if(!window.confirm(`Clear ALL data for ${detail.name}? Employee record will be kept.`)) return;
    try { await post(`/employees/${detail.id}/clear-data`); setToast({msg:"All data cleared",type:"success"}); load(); } catch(e){ setToast({msg:"Error: "+e.message,type:"error"}); }
  };

  const risk = detail.risk||{}, viol = detail.violations||{};
  const c = RC[risk.level]||"#00ffa3";

  return (
    <div className="page-anim">
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={()=>setToast(null)}/>}

      <button className="btn btn-ghost" onClick={onBack} style={{ marginBottom:24,gap:8 }}>← Back</button>

      {/* Hero */}
      <div className="gcard" style={{ padding:"28px 28px",marginBottom:16,background:`linear-gradient(135deg, var(--surface), rgba(${risk.level==="HIGH"?"255,45,107":risk.level==="MEDIUM"?"255,184,0":"0,255,163"},.04))` }}>
        <div style={{ display:"flex",gap:22,alignItems:"flex-start" }}>
          <div style={{ width:72,height:72,borderRadius:18,background:`linear-gradient(135deg,${c}22,${c}0a)`,border:`1px solid ${c}33`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:28,fontWeight:800,color:c,fontFamily:"var(--font-display)",flexShrink:0,boxShadow:`0 0 30px ${c}15` }}>{detail.name?.[0]}</div>
          <div style={{ flex:1 }}>
            <div style={{ fontFamily:"var(--font-display)",fontSize:26,fontWeight:800,letterSpacing:-1,marginBottom:6 }}>{detail.name}</div>
            <div style={{ display:"flex",gap:10,flexWrap:"wrap",alignItems:"center" }}>
              <Badge level={risk.level||"LOW"}/>
              <span style={{ color:"var(--t3)",fontSize:12 }}>{detail.department||"No dept"}</span>
              <span className="mono" style={{ color:"var(--t3)",fontSize:11 }}>{detail.ip}</span>
              <span style={{ display:"flex",alignItems:"center",gap:5,fontSize:11,color:"var(--t2)" }}><span className={`dot-${detail.status}`}/>{detail.status}</span>
              {detail.usb_disabled&&<span style={{ fontSize:10,color:"var(--nova)",border:"1px solid rgba(255,45,107,.3)",padding:"2px 8px",borderRadius:5 }}>USB DISABLED</span>}
            </div>
          </div>
          <Gauge score={risk.score||0} level={risk.level||"LOW"}/>
        </div>
      </div>

      <div className="grid-detail" style={{ marginBottom:16 }}>
        {/* Violations */}
        <Panel title="Violation Counters">
          <div className="grid-viols">
            {[
              {k:"usb_count",l:"USB",c:"#ff2d6b",p:40},
              {k:"bulk_count",l:"Bulk Copy",c:"#ffb800",p:50},
              {k:"late_count",l:"Late Login",c:"#00f0ff",p:20},
              {k:"app_count",l:"Unauth App",c:"#a855f7",p:50},
              {k:"keylogger_count",l:"Keylogger",c:"#ff2d6b",p:80},
              {k:"network_count",l:"Network",c:"#06b6d4",p:60},
            ].map(({k,l,c,p})=>(
              <ViolBox key={k} label={l} value={viol[k]||0} color={c} pts={p}/>
            ))}
          </div>
        </Panel>

        {/* Actions */}
        <Panel title="SOC Actions">
          <div style={{ display:"flex",flexDirection:"column",gap:8 }}>
            {(userRole==="admin"||userRole==="analyst")&&(
              <button className="btn btn-amber" style={{ width:"100%",justifyContent:"center" }} onClick={()=>act(()=>post(`/employees/${detail.id}/send-warning`),"Warning sent to "+detail.name,"warning")}>
                ▲ Send Warning
              </button>
            )}
            {userRole==="admin"&&!detail.usb_disabled&&(
              <button className="btn btn-nova" style={{ width:"100%",justifyContent:"center" }} onClick={()=>act(()=>post(`/employees/${detail.id}/disable-usb`),"USB disabled","error")}>
                ⬡ Disable USB
              </button>
            )}
            {userRole==="admin"&&detail.usb_disabled&&(
              <button className="btn btn-pulse" style={{ width:"100%",justifyContent:"center" }} onClick={()=>act(()=>post(`/employees/${detail.id}/enable-usb`),"USB re-enabled","success")}>
                ◈ Enable USB
              </button>
            )}
            {userRole==="admin"&&(
              <button className="btn btn-plasma" style={{ width:"100%",justifyContent:"center" }} onClick={()=>window.open(`${API}/reports/pdf/${detail.id}`,"_blank")}>
                ▣ Export PDF
              </button>
            )}
            <div style={{ height:1,background:"var(--edge)",margin:"4px 0" }}/>
            {userRole==="admin"&&(
              <button className="btn btn-ghost" style={{ width:"100%",justifyContent:"center" }} onClick={()=>act(()=>post(`/employees/${detail.id}/reset-violations`),"Violations reset","info")}>
                ↺ Reset Violations
              </button>
            )}
            {userRole==="admin"&&(
              <button className="btn btn-amber" style={{ width:"100%",justifyContent:"center" }} onClick={clearData}>
                ◉ Clear All Data
              </button>
            )}
            {userRole==="admin"&&(
              <button className="btn btn-danger-outline" style={{ width:"100%",justifyContent:"center" }} onClick={deleteEmp}>
                ✕ Delete Employee
              </button>
            )}
          </div>
        </Panel>
      </div>

      {/* History + Timeline */}
      <div className="grid-bottom">
        <Panel title="7-Day Risk History">
          {risk.history?.length>1 ? (
            <div>
              <Sparkline data={risk.history} color={c} h={80}/>
              <div style={{ display:"flex",justifyContent:"space-between",marginTop:8 }}>
                {risk.history.slice(-7).map((h,i)=>(
                  <span key={i} className="mono" style={{ fontSize:9,color:"var(--t3)" }}>{h.date?.slice(5)}</span>
                ))}
              </div>
            </div>
          ):<Empty msg="No history yet"/>}
        </Panel>

        <Panel title="Threat Timeline">
          <div style={{ maxHeight:260,overflowY:"auto" }}>
            {events.map((ev,i)=>{
              const e=EVMAP[ev.event_type]||{label:ev.event_type,color:"#4b5563"};
              return(
                <div key={i} style={{ display:"flex",gap:12,padding:"10px 0",borderBottom:"1px solid rgba(255,255,255,.04)" }}>
                  <div style={{ width:8,flexShrink:0,display:"flex",flexDirection:"column",alignItems:"center",paddingTop:4 }}>
                    <div style={{ width:8,height:8,borderRadius:"50%",background:e.color,boxShadow:`0 0 6px ${e.color}` }}/>
                    {i<events.length-1&&<div style={{ flex:1,width:1,background:"rgba(255,255,255,.05)",marginTop:4 }}/>}
                  </div>
                  <div style={{ flex:1,minWidth:0 }}>
                    <span style={{ color:e.color,fontSize:12,fontWeight:600 }}>{e.label}</span>
                    {ev.metadata&&<div className="mono" style={{ color:"var(--t3)",fontSize:10,marginTop:2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{JSON.stringify(ev.metadata).slice(0,55)}</div>}
                    <div className="mono" style={{ color:"var(--t3)",fontSize:10,marginTop:2 }}>{fmtDt(ev.timestamp)}</div>
                  </div>
                </div>
              );
            })}
            {!events.length&&<Empty msg="No events recorded"/>}
          </div>
        </Panel>
      </div>
    </div>
  );
}

function AlertsPage({ token, userRole }) {
  const { get, post } = useApi(token);
  const [alerts, setAlerts] = useState([]);
  const [filter, setFilter] = useState("unresolved");
  const [toast, setToast] = useState(null);

  const load = useCallback(async()=>{ try{setAlerts(await get("/alerts/"));}catch(_){} },[get]);
  useEffect(()=>{ load(); const i=setInterval(load,5000); return()=>clearInterval(i); },[load]);

  const resolve = async id => { try{ await post(`/alerts/${id}/resolve`); load(); setToast({msg:"Alert resolved",type:"success"}); } catch(_){} };

  const spal = { HIGH:"#ff2d6b", MEDIUM:"#ffb800", WARNING:"#a855f7", LOW:"#00f0ff" };
  const shown = filter==="all"?alerts:filter==="unresolved"?alerts.filter(a=>!a.resolved):alerts.filter(a=>a.resolved);

  return (
    <div className="page-anim">
      {toast&&<Toast msg={toast.msg} type={toast.type} onClose={()=>setToast(null)}/>}
      <div className="alerts-header">
        <div>
          <h1 className="page-title" style={{ fontFamily:"var(--font-display)",fontSize:28,fontWeight:800,letterSpacing:-1 }}>Alerts</h1>
          <p style={{ color:"var(--t3)",fontSize:13,marginTop:4 }}>{alerts.filter(a=>!a.resolved).length} unresolved</p>
        </div>
        <div style={{ display:"flex",gap:8 }}>
          {["all","unresolved","resolved"].map(f=>(
            <button key={f} className={`btn ${filter===f?"btn-plasma":"btn-ghost"}`} onClick={()=>setFilter(f)} style={{ textTransform:"capitalize" }}>{f}</button>
          ))}
        </div>
      </div>

      <Panel>
        {shown.map((a,i)=>{
          const c=spal[a.severity]||"#4b5563";
          return(
            <div key={a.id} style={{ padding:"16px 0",borderBottom:"1px solid rgba(255,255,255,.04)",display:"flex",gap:16,alignItems:"flex-start",animation:"fadeUp .3s ease",animationDelay:`${i*30}ms` }}>
              <div style={{ width:4,background:c,borderRadius:99,alignSelf:"stretch",minHeight:40,boxShadow:`0 0 8px ${c}66`,flexShrink:0 }}/>
              <div style={{ flex:1 }}>
                <div style={{ display:"flex",gap:10,alignItems:"center",marginBottom:6 }}>
                  <span className="mono" style={{ fontSize:11,fontWeight:600,color:c,textTransform:"uppercase",letterSpacing:1 }}>{a.severity}</span>
                  <span style={{ color:"var(--t3)",fontSize:11 }}>#{a.id} · Employee {a.employee_id}</span>
                </div>
                <div style={{ color:"var(--t1)",fontSize:13,marginBottom:4 }}>{a.message}</div>
                <div className="mono" style={{ color:"var(--t3)",fontSize:10 }}>{fmtDt(a.timestamp)}</div>
              </div>
              {!a.resolved&&(userRole==="admin"||userRole==="analyst")&&(
                <button className="btn btn-pulse" style={{ flexShrink:0,fontSize:12 }} onClick={()=>resolve(a.id)}>✓ Resolve</button>
              )}
              {a.resolved&&(
                <span style={{ fontSize:11,color:"var(--pulse)",background:"rgba(0,255,163,.08)",padding:"4px 10px",borderRadius:8,border:"1px solid rgba(0,255,163,.2)",flexShrink:0 }}>✓ {a.resolved_by}</span>
              )}
            </div>
          );
        })}
        {!shown.length&&<Empty msg="No alerts in this category"/>}
      </Panel>
    </div>
  );
}

function LogsPage({ token }) {
  const { get } = useApi(token);
  const [events, setEvents] = useState([]);
  const [emps, setEmps] = useState([]);
  const [empF, setEmpF] = useState("");
  const [typeF, setTypeF] = useState("");

  useEffect(()=>{
    const load=async()=>{ try{ const [ev,em]=await Promise.all([get("/events/?limit=200"),get("/employees/")]); setEvents(ev); setEmps(em); }catch(_){} };
    load(); const i=setInterval(load,5000); return()=>clearInterval(i);
  },[]);

  const filtered=events.filter(e=>{
    if(empF&&e.employee_id!==parseInt(empF)) return false;
    if(typeF&&e.event_type!==typeF) return false;
    return true;
  });

  return (
    <div className="page-anim">
      <div className="logs-header">
        <div>
          <h1 className="page-title" style={{ fontFamily:"var(--font-display)",fontSize:28,fontWeight:800,letterSpacing:-1 }}>Event Logs</h1>
          <p style={{ color:"var(--t3)",fontSize:13,marginTop:4 }}>{filtered.length} events</p>
        </div>
        <div className="logs-filters">
          <select className="inp" style={{ width:"auto" }} value={empF} onChange={e=>setEmpF(e.target.value)}>
            <option value="">All Employees</option>
            {emps.map(e=><option key={e.id} value={e.id}>{e.name}</option>)}
          </select>
          <select className="inp" style={{ width:"auto" }} value={typeF} onChange={e=>setTypeF(e.target.value)}>
            <option value="">All Types</option>
            {["usb_insertion","bulk_copy","late_login","unauthorized_app","keylogger_detected","suspicious_port"].map(t=>(
              <option key={t} value={t}>{t.replace(/_/g," ")}</option>
            ))}
          </select>
          <button className="btn btn-plasma" onClick={()=>window.open(`${API}/reports/csv${empF?`?employee_id=${empF}`:""}`)}>↓ CSV</button>
        </div>
      </div>

      <Panel>
        <div style={{ overflowX:"auto" }}>
          <table className="tbl">
            <thead>
              <tr>{["#","Employee","Event","Details","Timestamp","IP"].map(h=><th key={h}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {filtered.slice(0,200).map((ev,i)=>{
                const e=EVMAP[ev.event_type]||{label:ev.event_type,color:"#4b5563"};
                return(
                  <tr key={ev.id}>
                    <td><span className="mono" style={{ color:"var(--t3)",fontSize:11 }}>{ev.id}</span></td>
                    <td style={{ color:"var(--t2)",fontWeight:500 }}>{emps.find(e=>e.id===ev.employee_id)?.name||`#${ev.employee_id}`}</td>
                    <td><span style={{ color:e.color,fontWeight:600,fontSize:12 }}>{e.label}</span></td>
                    <td><span className="mono" style={{ color:"var(--t3)",fontSize:11 }}>{ev.metadata?JSON.stringify(ev.metadata).slice(0,55):"—"}</span></td>
                    <td><span className="mono" style={{ color:"var(--t3)",fontSize:11 }}>{fmtDt(ev.timestamp)}</span></td>
                    <td><span className="mono" style={{ color:"var(--t3)",fontSize:11 }}>{ev.source_ip||"—"}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!filtered.length&&<Empty msg="No events match filters"/>}
        </div>
      </Panel>
    </div>
  );
}

function ViolationsPage({ token }) {
  const { get } = useApi(token);
  const [summary, setSummary] = useState(null);
  const [emps, setEmps] = useState([]);

  useEffect(()=>{
    const load=async()=>{ try{ const [s,e]=await Promise.all([get("/violations/summary"),get("/employees/")]); setSummary(s); setEmps(e); }catch(_){} };
    load(); const i=setInterval(load,5000); return()=>clearInterval(i);
  },[]);

  return (
    <div className="page-anim">
      <div style={{ marginBottom:28 }}>
        <h1 style={{ fontFamily:"var(--font-display)",fontSize:28,fontWeight:800,letterSpacing:-1 }}>Violations</h1>
        <p style={{ color:"var(--t3)",fontSize:13,marginTop:4 }}>Aggregated threat analytics</p>
      </div>
      {summary&&(
        <div className="grid-3" style={{ marginBottom:20 }}>
          {Object.entries(summary.totals||{}).map(([k,v],i)=>(
            <StatCard key={k} label={k.replace(/_/g," ")} value={v} color="var(--plasma)" icon="◉" delay={i*50}/>
          ))}
        </div>
      )}
      <Panel title="Risk Heatmap — All Agents">
        <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(90px,1fr))",gap:10 }}>
          {emps.map(e=>{
            const c=RC[e.risk?.level]||"#00ffa3";
            return(
              <div key={e.id} style={{ borderRadius:10,background:`${c}0a`,border:`1px solid ${c}20`,padding:"12px 8px",textAlign:"center",transition:"all .2s",cursor:"default" }}
                onMouseEnter={ev=>{ev.currentTarget.style.background=`${c}15`;ev.currentTarget.style.transform="scale(1.05)"}}
                onMouseLeave={ev=>{ev.currentTarget.style.background=`${c}0a`;ev.currentTarget.style.transform="scale(1)"}}>
                <div className="mono" style={{ fontSize:16,fontWeight:700,color:c }}>{(e.risk?.score||0).toFixed(0)}</div>
                <div style={{ fontSize:9,color:"var(--t3)",marginTop:3,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{e.name.split(" ")[0]}</div>
              </div>
            );
          })}
          {!emps.length&&<Empty msg="No agents connected"/>}
        </div>
      </Panel>
    </div>
  );
}

function AdminPage({ token }) {
  const { get, post } = useApi(token);
  const [emps, setEmps] = useState([]);
  const [form, setForm] = useState({ username:"",password:"",role:"analyst" });
  const [toast, setToast] = useState(null);

  useEffect(()=>{ const load=async()=>{ try{setEmps(await get("/employees/"));}catch(_){} }; load(); },[]);

  const create = async () => {
    try { await post("/auth/register",form); setToast({msg:"User created: "+form.username,type:"success"}); setForm({username:"",password:"",role:"analyst"}); }
    catch(e) { setToast({msg:"Error: "+e.message,type:"error"}); }
  };

  return (
    <div className="page-anim">
      {toast&&<Toast msg={toast.msg} type={toast.type} onClose={()=>setToast(null)}/>}
      <div style={{ marginBottom:28 }}>
        <h1 style={{ fontFamily:"var(--font-display)",fontSize:28,fontWeight:800,letterSpacing:-1 }}>Admin Panel</h1>
        <p style={{ color:"var(--t3)",fontSize:13,marginTop:4 }}>User management & system configuration</p>
      </div>
      <div className="grid-2">
        <Panel title="Create User Account">
          <div style={{ display:"flex",flexDirection:"column",gap:14 }}>
            {[{label:"Username",key:"username",type:"text"},{label:"Password",key:"password",type:"password"}].map(({label,key,type})=>(
              <div key={key}>
                <div className="label" style={{ marginBottom:7 }}>{label}</div>
                <input type={type} className="inp" value={form[key]} onChange={e=>setForm(p=>({...p,[key]:e.target.value}))}/>
              </div>
            ))}
            <div>
              <div className="label" style={{ marginBottom:7 }}>Role</div>
              <select className="inp" value={form.role} onChange={e=>setForm(p=>({...p,role:e.target.value}))}>
                <option value="admin">Admin</option>
                <option value="analyst">Analyst</option>
                <option value="viewer">Viewer</option>
              </select>
            </div>
            <button className="btn btn-plasma" style={{ width:"100%",justifyContent:"center",padding:"11px" }} onClick={create}>Create Account</button>
          </div>
        </Panel>

        <Panel title="Connected Agents">
          {emps.map(e=>(
            <div key={e.id} style={{ display:"flex",justifyContent:"space-between",alignItems:"center",padding:"11px 0",borderBottom:"1px solid var(--edge)" }}>
              <div style={{ display:"flex",alignItems:"center",gap:10 }}>
                <span className={`dot-${e.status}`}/>
                <div>
                  <div style={{ fontWeight:500,fontSize:13 }}>{e.name}</div>
                  <div className="mono" style={{ fontSize:10,color:"var(--t3)" }}>{e.ip||"No IP"}</div>
                </div>
              </div>
              <div style={{ display:"flex",alignItems:"center",gap:8 }}>
                {e.usb_disabled&&<span style={{ fontSize:9,color:"var(--nova)",border:"1px solid rgba(255,45,107,.25)",padding:"2px 7px",borderRadius:4 }}>USB OFF</span>}
                <Badge level={e.risk?.level||"LOW"}/>
              </div>
            </div>
          ))}
          {!emps.length&&<Empty msg="No agents registered"/>}
        </Panel>
      </div>
    </div>
  );
}

/* ─── LOGIN ─── */
function Login({ onLogin }) {
  const [creds, setCreds] = useState({ username:"",password:"" });
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const login = async () => {
    if(!creds.username||!creds.password) return;
    setLoading(true); setErr("");
    try {
      const r = await fetch(`${API}/auth/login`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(creds)});
      if(!r.ok) throw new Error("Invalid credentials");
      const d = await r.json();
      onLogin(d.access_token, d.user);
    } catch(e) { setErr(e.message); }
    setLoading(false);
  };

  return (
    <div style={{ minHeight:"100vh",background:"var(--void)",display:"flex",alignItems:"center",justifyContent:"center",position:"relative",overflow:"hidden" }}>
      {/* Grid bg */}
      <div style={{ position:"fixed",inset:0,backgroundImage:"linear-gradient(rgba(0,240,255,.025) 1px,transparent 1px),linear-gradient(90deg,rgba(0,240,255,.025) 1px,transparent 1px)",backgroundSize:"60px 60px",pointerEvents:"none",zIndex:0 }}/>
      {/* Glow orbs */}
      <div style={{ position:"fixed",width:600,height:600,borderRadius:"50%",background:"radial-gradient(circle,rgba(0,240,255,.04) 0%,transparent 65%)",top:"-15%",left:"-10%",pointerEvents:"none",zIndex:0 }}/>
      <div style={{ position:"fixed",width:500,height:500,borderRadius:"50%",background:"radial-gradient(circle,rgba(168,85,247,.04) 0%,transparent 65%)",bottom:"-10%",right:"0%",pointerEvents:"none",zIndex:0 }}/>
      {/* Scan line */}
      <div style={{ position:"fixed",top:0,left:0,right:0,height:3,background:"linear-gradient(90deg,transparent,var(--plasma),transparent)",opacity:.3,animation:"scandown 6s linear infinite",zIndex:0 }}/>

      <div style={{ width:420,position:"relative",zIndex:1,animation:"fadeUp .7s cubic-bezier(.22,1,.36,1)" }}>
        {/* Brand */}
        <div style={{ textAlign:"center",marginBottom:44 }}>
          <div style={{ width:76,height:76,borderRadius:22,background:"linear-gradient(135deg,rgba(0,240,255,.14),rgba(0,128,255,.07))",border:"1px solid rgba(0,240,255,.25)",margin:"0 auto 22px",display:"flex",alignItems:"center",justifyContent:"center",fontSize:34,animation:"float 3.5s ease-in-out infinite",boxShadow:"0 0 40px rgba(0,240,255,.12),inset 0 1px 0 rgba(255,255,255,.08)" }}>🛡</div>
          <div style={{ fontFamily:"var(--font-display)",fontSize:30,fontWeight:800,letterSpacing:2,background:"linear-gradient(135deg,#eef2ff 30%,var(--plasma))",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",animation:"flicker 8s infinite" }}>SENTINELAI</div>
          <div className="mono" style={{ fontSize:10,color:"var(--t3)",letterSpacing:4,marginTop:5 }}>ENTERPRISE EDITION</div>
        </div>

        {/* Card */}
        <div style={{ background:"rgba(7,12,20,.9)",backdropFilter:"blur(30px)",border:"1px solid rgba(255,255,255,.07)",borderRadius:20,padding:36,position:"relative",overflow:"hidden",boxShadow:"0 40px 80px rgba(0,0,0,.7)" }}>
          {/* Top shine */}
          <div style={{ position:"absolute",top:0,left:0,right:0,height:1,background:"linear-gradient(90deg,transparent,rgba(0,240,255,.3),transparent)" }}/>

          <div style={{ marginBottom:20 }}>
            <label className="label" style={{ display:"block",marginBottom:8 }}>Username</label>
            <input className="inp" value={creds.username} onChange={e=>setCreds(p=>({...p,username:e.target.value}))} onKeyDown={e=>e.key==="Enter"&&login()} placeholder="Enter username"/>
          </div>
          <div style={{ marginBottom:26 }}>
            <label className="label" style={{ display:"block",marginBottom:8 }}>Password</label>
            <input type="password" className="inp" value={creds.password} onChange={e=>setCreds(p=>({...p,password:e.target.value}))} onKeyDown={e=>e.key==="Enter"&&login()} placeholder="••••••••••"/>
          </div>

          {err&&(
            <div style={{ background:"rgba(255,45,107,.08)",border:"1px solid rgba(255,45,107,.25)",color:"var(--nova)",padding:"11px 16px",borderRadius:10,marginBottom:20,fontSize:13,display:"flex",alignItems:"center",gap:8,animation:"fadeIn .3s ease" }}>
              ⚠ {err}
            </div>
          )}

          <button onClick={login} disabled={loading} style={{ width:"100%",padding:"13px",background:loading?"rgba(0,240,255,.04)":"linear-gradient(135deg,rgba(0,240,255,.12),rgba(0,128,255,.08))",border:"1px solid rgba(0,240,255,.35)",borderRadius:12,color:"var(--plasma)",cursor:loading?"not-allowed":"pointer",fontSize:13,fontWeight:700,letterSpacing:2,textTransform:"uppercase",fontFamily:"var(--font-display)",transition:"all .3s",boxShadow:loading?"none":"0 0 30px rgba(0,240,255,.08)",display:"flex",alignItems:"center",justifyContent:"center",gap:10 }}>
            {loading?<><Spinner size={16}/>Authenticating...</>:"Access System →"}
          </button>

          {/* Hint */}
          <div style={{ marginTop:22,padding:"12px 14px",background:"rgba(255,255,255,.02)",borderRadius:10,border:"1px solid var(--edge)" }}>
            <div className="mono" style={{ fontSize:10,color:"var(--t3)",marginBottom:4 }}>DEFAULT CREDENTIALS</div>
            <div className="mono" style={{ fontSize:12,color:"var(--t2)" }}>admin <span style={{color:"var(--t3)"}}>/ </span>SentinelAdmin2024!</div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── NAV CONFIG ─── */
const NAV = [
  { id:"overview",  label:"Overview",     icon:"⬡" },
  { id:"employees", label:"Employees",    icon:"◈" },
  { id:"violations",label:"Violations",   icon:"◉" },
  { id:"alerts",    label:"Alerts",       icon:"▲" },
  { id:"logs",      label:"Event Logs",   icon:"▦" },
  { id:"reports",   label:"Reports",      icon:"▣" },
  { id:"admin",     label:"Admin",        icon:"⚙" },
];

/* ─── ROOT APP ─── */
export default function App() {
  const [token,   setToken]   = useState(()=>localStorage.getItem("sentinel_token")||null);
  const [user,    setUser]    = useState(()=>{ try{return JSON.parse(localStorage.getItem("sentinel_user"))||null;}catch{return null;} });
  const [page,    setPage]    = useState("overview");
  const [selEmp,  setSelEmp]  = useState(null);
  const [feed,    setFeed]    = useState([]);
  const [wsEvent, setWsEvent] = useState(null);
  const [wsConn,  setWsConn]  = useState(false);
  const [sideOpen,setSideOpen]= useState(false);
  const wsRef    = useRef(null);
  const reconRef = useRef(null);

  const connectWS = useCallback(tok=>{
    if(wsRef.current?.readyState===WebSocket.OPEN) return;
    const ws = new WebSocket(`${WS_URL}?token=${tok}`);
    wsRef.current = ws;
    ws.onopen  = ()=>setWsConn(true);
    ws.onmessage = e=>{ try{ const d=JSON.parse(e.data); if(d.type==="risk_update"||d.type==="warning_sent"){ setFeed(p=>[d,...p.slice(0,49)]); setWsEvent(d); } }catch(_){} };
    ws.onerror = ()=>ws.close();
    let ping;
    ws.onclose = ()=>{ setWsConn(false); clearInterval(ping); reconRef.current=setTimeout(()=>connectWS(tok),5000); };
    ping=setInterval(()=>{ if(ws.readyState===WebSocket.OPEN) ws.send("ping"); },25000);
  },[]);

  const handleLogin=(tok,u)=>{ localStorage.setItem("sentinel_token",tok); localStorage.setItem("sentinel_user",JSON.stringify(u)); setToken(tok); setUser(u); connectWS(tok); };
  const handleLogout=()=>{ localStorage.clear(); setToken(null); setUser(null); wsRef.current?.close(); clearTimeout(reconRef.current); };
  const navTo = id => { setPage(id); setSelEmp(null); setSideOpen(false); };

  useEffect(()=>{ if(token) connectWS(token); return()=>{ wsRef.current?.close(); clearTimeout(reconRef.current); }; },[]);

  if(!token) return <><style>{STYLES}</style><Login onLogin={handleLogin}/></>;

  const role = user?.role||"viewer";

  const renderPage=()=>{
    if(selEmp) return <EmployeeDetail token={token} emp={selEmp} onBack={()=>setSelEmp(null)} userRole={role} wsEvent={wsEvent}/>;
    switch(page){
      case "overview":   return <OverviewPage   token={token} feed={feed} wsEvent={wsEvent}/>;
      case "employees":  return <EmployeesPage  token={token} onSelect={e=>setSelEmp(e)} wsEvent={wsEvent}/>;
      case "violations": return <ViolationsPage token={token}/>;
      case "alerts":     return <AlertsPage     token={token} userRole={role}/>;
      case "logs":       return <LogsPage       token={token}/>;
      case "reports":    return (
        <div className="page-anim">
          <h1 className="page-title" style={{ fontFamily:"var(--font-display)",fontSize:28,fontWeight:800,letterSpacing:-1,marginBottom:16 }}>Reports</h1>
          <Panel>
            <p style={{ color:"var(--t2)",fontSize:13,lineHeight:1.8 }}>Open any <strong style={{color:"var(--plasma)"}}>Employee Detail</strong> page and click <strong style={{color:"var(--plasma)"}}>Export PDF</strong> to generate a full threat report. Use the <strong style={{color:"var(--plasma)"}}>Event Logs</strong> page to export CSV data for all events.</p>
          </Panel>
        </div>
      );
      case "admin": return role==="admin"?<AdminPage token={token}/>:<div style={{color:"var(--nova)",padding:20}}>Access denied</div>;
      default:      return <OverviewPage token={token} feed={feed} wsEvent={wsEvent}/>;
    }
  };

  return (
    <>
      <style>{STYLES}</style>

      {/* BG */}
      <div style={{ position:"fixed",inset:0,backgroundImage:"linear-gradient(rgba(0,240,255,.018) 1px,transparent 1px),linear-gradient(90deg,rgba(0,240,255,.018) 1px,transparent 1px)",backgroundSize:"60px 60px",pointerEvents:"none",zIndex:0 }}/>
      <div style={{ position:"fixed",width:700,height:700,borderRadius:"50%",background:"radial-gradient(circle,rgba(0,240,255,.025) 0%,transparent 65%)",top:"-20%",left:"-5%",pointerEvents:"none",zIndex:0 }}/>
      <div style={{ position:"fixed",width:500,height:500,borderRadius:"50%",background:"radial-gradient(circle,rgba(168,85,247,.025) 0%,transparent 65%)",bottom:"-15%",right:"5%",pointerEvents:"none",zIndex:0 }}/>

      {/* Mobile overlay */}
      <div className={`sidebar-overlay ${sideOpen?"open":""}`} onClick={()=>setSideOpen(false)}/>

      <div className="layout-root" style={{ position:"relative",zIndex:1 }}>

        {/* ── SIDEBAR ── */}
        <aside className={`sidebar ${sideOpen?"open":""}`}>
          <div style={{ padding:"18px 18px 14px",borderBottom:"1px solid var(--edge)" }}>
            <div style={{ display:"flex",alignItems:"center",gap:11,justifyContent:"space-between" }}>
              <div style={{ display:"flex",alignItems:"center",gap:11 }}>
              <div style={{ width:38,height:38,borderRadius:11,background:"linear-gradient(135deg,rgba(0,240,255,.18),rgba(0,128,255,.09))",border:"1px solid rgba(0,240,255,.28)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:17,boxShadow:"0 0 16px rgba(0,240,255,.12)",flexShrink:0 }}>🛡</div>
              <div>
                <div style={{ fontFamily:"var(--font-display)",fontSize:15,fontWeight:800,letterSpacing:1.5,background:"linear-gradient(135deg,#eef2ff,var(--plasma))",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent" }}>SENTINELAI</div>
                <div className="mono" style={{ fontSize:8,color:"var(--t3)",letterSpacing:3 }}>ENTERPRISE</div>
              </div>
              </div>

            </div>
          </div>

          <nav style={{ flex:1,padding:"12px 10px",overflowY:"auto" }}>
            <div className="label" style={{ padding:"0 6px",marginBottom:10 }}>Navigation</div>
            {NAV.filter(n=>n.id!=="admin"||role==="admin").map(n=>(
              <button key={n.id} className={`nav-link ${page===n.id&&!selEmp?"active":""}`} onClick={()=>navTo(n.id)}>
                <span className="nav-icon" style={{ fontSize:15,width:18,textAlign:"center" }}>{n.icon}</span>
                <span>{n.label}</span>
              </button>
            ))}
          </nav>

          <div style={{ padding:"14px 18px",borderTop:"1px solid var(--edge)" }}>
            <div style={{ display:"flex",alignItems:"center",gap:10,marginBottom:12 }}>
              <div style={{ width:32,height:32,borderRadius:9,background:"linear-gradient(135deg,rgba(0,240,255,.14),rgba(0,128,255,.08))",border:"1px solid rgba(0,240,255,.18)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:700,color:"var(--plasma)",flexShrink:0 }}>{user?.username?.[0]?.toUpperCase()}</div>
              <div style={{ minWidth:0 }}>
                <div style={{ fontSize:13,fontWeight:600,color:"var(--t1)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{user?.username}</div>
                <div className="mono" style={{ fontSize:9,color:"var(--t3)",textTransform:"uppercase",letterSpacing:1.5 }}>{role}</div>
              </div>
            </div>
            <button className="btn btn-nova" style={{ width:"100%",justifyContent:"center",fontSize:12,padding:"7px" }} onClick={()=>{setSideOpen(false);handleLogout();}}>Sign Out</button>
          </div>
        </aside>

        {/* ── MAIN ── */}
        <main className="main-area">
          {/* Top bar */}
          <header className="topbar-inner">
            <div style={{ display:"flex",alignItems:"center",gap:12 }}>
              {/* Hamburger — CSS shows only on mobile */}
              <button className="mob-menu-btn" onClick={()=>setSideOpen(o=>!o)}>☰</button>
              <div style={{ display:"flex",alignItems:"center",gap:7 }}>
                <span className="dot-online"/>
                <span className="mono" style={{ fontSize:11,color:"var(--pulse)",fontWeight:600,letterSpacing:.5 }}>OPERATIONAL</span>
              </div>
              <div style={{ width:1,height:14,background:"var(--edge)" }}/>
              <div style={{ display:"flex",alignItems:"center",gap:6 }}>
                <span style={{ width:6,height:6,borderRadius:"50%",background:wsConn?"var(--plasma)":"var(--t3)",display:"inline-block",boxShadow:wsConn?"0 0 6px var(--plasma)":"none" }}/>
                <span className="mono" style={{ fontSize:11,color:wsConn?"var(--plasma)":"var(--t3)" }}>{wsConn?"WS Live":"Reconnecting"}</span>
              </div>
            </div>
            <div className="mono topbar-date" style={{ fontSize:11,color:"var(--t3)" }}>{new Date().toLocaleString()}</div>
          </header>

          {/* Page */}
          <div className="page-pad" key={page+(selEmp?.id||"")}>
            {renderPage()}
          </div>
        </main>
      </div>
    </>
  );
}