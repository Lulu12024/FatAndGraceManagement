import { useState } from "react";
import { C } from "../styles/tokens";


const Logo = ({ size = 48, withText = false }) => (
  <div style={{ display:"flex", alignItems:"center", gap:12, flexShrink:0 }}>
    <img
      src="/logo.png"
      alt="Fate & Grâce"
      width={size}
      height={size}
      style={{
        borderRadius: "50%",
        objectFit: "cover",
        flexShrink: 0,
        filter: "drop-shadow(0 0 8px rgba(201,168,76,0.4))",
      }}
    />
    {withText && (
      <div style={{ minWidth:0 }}>
        <div className="serif" style={{ fontSize:17, fontWeight:600, color:C.goldL, letterSpacing:3, lineHeight:1 }}>
          FATE & GRÂCE
        </div>
        <div style={{ fontSize:9, color:C.muted, letterSpacing:3.5, textTransform:"uppercase", marginTop:3 }}>
          {/* Bakery · Restaurant · Bar */}
        </div>
      </div>
    )}
  </div>
);

const Badge = ({ children, color=C.gold, style:s={} }) => (
  <span style={{ display:"inline-flex", alignItems:"center", gap:4, padding:"2px 9px", borderRadius:20,
    fontSize:11, fontWeight:600, color, background:`${color}18`, border:`1px solid ${color}35`,
    letterSpacing:.4, whiteSpace:"nowrap", ...s }}>
    {children}
  </span>
);

const Dot = ({ color, size=7 }) => (
  <span style={{ display:"inline-block", width:size, height:size, borderRadius:"50%", background:color, flexShrink:0 }}/>
);

const Btn = ({ children, variant="primary", onClick, style:s={}, disabled=false, small=false, loading=false }) => {
  const base = {
    primary: { background:`linear-gradient(135deg,${C.gold},${C.goldD})`, color:"#07050A", border:"none", fontWeight:700 },
    outline: { background:"transparent", color:C.gold,   border:`1px solid ${C.goldBorder}` },
    ghost:   { background:"transparent", color:C.cream,  border:`1px solid rgba(255,255,255,0.09)` },
    danger:  { background:C.dangerBg,   color:C.danger,  border:`1px solid ${C.dangerBdr}` },
    success: { background:C.successBg,  color:C.success, border:`1px solid ${C.successBdr}` },
    info:    { background:C.infoBg,     color:C.info,    border:`1px solid ${C.infoBdr}` },
    purple:  { background:C.purpleBg,   color:C.purple,  border:`1px solid ${C.purpleBdr}` },
    warning: { background:C.warningBg,  color:C.warning, border:`1px solid ${C.warningBdr}` },
  };
  return (
    <button onClick={onClick} disabled={disabled || loading} className="hover-lift"
      style={{ ...base[variant], padding:small?"5px 12px":"9px 20px", borderRadius:8,
        fontSize:small?11:13, fontFamily:"'Raleway',sans-serif", transition:"all .2s",
        opacity:disabled?0.4:1, cursor:disabled?"not-allowed":"pointer",
        display:"inline-flex", alignItems:"center", gap:6, whiteSpace:"nowrap", ...s }}>
      {loading ? <span className="spin" style={{ fontSize:14, lineHeight:1 }}>↺</span> : children}
    </button>
  );
};

const Card = ({ children, style:s={}, className="" }) => (
  <div className={className}
    style={{ background:C.bg2, border:`1px solid rgba(255,255,255,0.06)`, borderRadius:13, ...s }}>
    {children}
  </div>
);

const Input = ({ label, value, onChange, type="text", placeholder="", style:s={}, textarea=false, required=false, min, step }) => (
  <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
    {label && (
      <label style={{ fontSize:11, fontWeight:600, color:C.muted, letterSpacing:1.2, textTransform:"uppercase" }}>
        {label}{required && <span style={{ color:C.gold }}> *</span>}
      </label>
    )}
    {textarea
      ? <textarea value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} rows={3}
          style={{ background:C.bg3, border:`1px solid rgba(255,255,255,0.1)`, borderRadius:8,
            padding:"9px 12px", color:C.cream, fontSize:13, resize:"vertical", transition:"border-color .2s", ...s }}/>
      : <input type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder}
          min={min} step={step}
          style={{ background:C.bg3, border:`1px solid rgba(255,255,255,0.1)`, borderRadius:8,
            padding:"9px 12px", color:C.cream, fontSize:13, transition:"border-color .2s", ...s }}/>
    }
  </div>
);

const Select = ({ label, value, onChange, options, style:s={}, required=false }) => (
  <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
    {label && (
      <label style={{ fontSize:11, fontWeight:600, color:C.muted, letterSpacing:1.2, textTransform:"uppercase" }}>
        {label}{required && <span style={{ color:C.gold }}> *</span>}
      </label>
    )}
    <select value={value} onChange={e=>onChange(e.target.value)}
      style={{ background:C.bg3, border:`1px solid rgba(255,255,255,0.1)`, borderRadius:8,
        padding:"9px 12px", color:C.cream, fontSize:13, ...s }}>
      {options.map(o => <option key={o.value} value={o.value} style={{ background:C.bg3 }}>{o.label}</option>)}
    </select>
  </div>
);

const Divider = ({ label, style:s={} }) => (
  <div style={{ display:"flex", alignItems:"center", gap:12, ...s }}>
    <div style={{ flex:1, height:1, background:"rgba(255,255,255,0.06)" }}/>
    {label && <span style={{ fontSize:10, color:C.muted, letterSpacing:2, textTransform:"uppercase", whiteSpace:"nowrap" }}>{label}</span>}
    <div style={{ flex:1, height:1, background:"rgba(255,255,255,0.06)" }}/>
  </div>
);

const Empty = ({ icon="📋", text="Aucun élément" }) => (
  <div style={{ padding:"56px 20px", textAlign:"center", color:C.muted }}>
    <div style={{ fontSize:38, marginBottom:12, opacity:.35 }}>{icon}</div>
    <div style={{ fontSize:13, letterSpacing:.5 }}>{text}</div>
  </div>
);

const Spinner = () => (
  <div style={{ display:"flex", alignItems:"center", justifyContent:"center", padding:48 }}>
    <div className="spin" style={{ fontSize:28, color:C.gold }}>✦</div>
  </div>
);

const StatCard = ({ label, value, sub, color=C.gold, icon, delay=0 }) => (
  <Card className="anim-fadeUp" style={{ padding:20, animationDelay:`${delay}ms` }}>
    <div style={{ display:"flex", justifyContent:"space-between", marginBottom:12 }}>
      <span style={{ fontSize:10, fontWeight:600, color:C.muted, letterSpacing:1.5, textTransform:"uppercase" }}>{label}</span>
      <span style={{ fontSize:22 }}>{icon}</span>
    </div>
    <div className="serif" style={{ fontSize:30, fontWeight:700, color, lineHeight:1 }}>{value}</div>
    {sub && <div style={{ fontSize:11, color:C.muted, marginTop:6 }}>{sub}</div>}
  </Card>
);

/* ── Toast System ─────────────────────────────────────── */
const ToastContainer = ({ toasts, removeToast }) => (
  <div style={{ position:"fixed", bottom:24, right:24, zIndex:9999, display:"flex", flexDirection:"column", gap:8, pointerEvents:"none" }}>
    {toasts.map(t => {
      const accent = t.type==="success"?C.success:t.type==="error"?C.danger:t.type==="warning"?C.warning:t.type==="gold"?C.gold:C.info;
      return (
        <div key={t.id} style={{ background:C.bg3, border:`1px solid ${accent}35`, borderLeft:`3px solid ${accent}`,
          borderRadius:10, padding:"12px 16px 12px 14px", minWidth:290, maxWidth:370,
          display:"flex", gap:10, alignItems:"flex-start", animation:"toastIn .3s ease",
          boxShadow:"0 8px 36px rgba(0,0,0,.55)", pointerEvents:"all" }}>
          <span style={{ fontSize:15, marginTop:1 }}>{t.type==="success"?"✓":t.type==="error"?"✕":t.type==="warning"?"⚠":t.type==="gold"?"✦":"ℹ"}</span>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:13, fontWeight:600, color:C.cream }}>{t.title}</div>
            {t.msg && <div style={{ fontSize:11, color:C.mutedL, marginTop:2 }}>{t.msg}</div>}
          </div>
          <button onClick={()=>removeToast(t.id)} style={{ background:"none",border:"none",color:C.muted,fontSize:16,lineHeight:1,padding:0,cursor:"pointer",flexShrink:0 }}>×</button>
        </div>
      );
    })}
  </div>
);

/* ── Modal ───────────────────────────────────────────── */
const Modal = ({ open, onClose, title, children, width=480 }) => {
  if (!open) return null;
  return (
    <div onClick={onClose} style={{ position:"fixed",inset:0,background:"rgba(0,0,0,.76)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:20 }}>
      <div onClick={e=>e.stopPropagation()} className="anim-scaleIn"
        style={{ background:C.bg2, border:`1px solid rgba(255,255,255,0.09)`, borderRadius:16,
          width:"100%", maxWidth:width, maxHeight:"92vh", overflow:"auto",
          boxShadow:"0 28px 80px rgba(0,0,0,.75)" }}>
        <div style={{ padding:"20px 24px", borderBottom:`1px solid rgba(255,255,255,0.06)`, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <h3 className="serif" style={{ fontSize:18, fontWeight:600, color:C.goldL }}>{title}</h3>
          <button onClick={onClose} style={{ background:"rgba(255,255,255,.07)",border:"none",color:C.mutedL,width:30,height:30,borderRadius:7,fontSize:16,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center" }}>×</button>
        </div>
        <div style={{ padding:24 }}>{children}</div>
      </div>
    </div>
  );
};

/* ── Offline Banner ──────────────────────────────────── */
const OfflineBanner = ({ isOnline }) => {
  if (isOnline) return null;
  return (
    <div style={{ background:`${C.warning}18`, borderBottom:`1px solid ${C.warningBdr}`, padding:"6px 20px", textAlign:"center", fontSize:11, color:C.warning, letterSpacing:.5 }}>
      ⚡ Mode hors-ligne — Données de démonstration actives. Les modifications ne sont pas synchronisées.
    </div>
  );
};

export { Logo, Badge, Dot, Btn, Card, Input, Select, Divider, Empty, Spinner, StatCard, ToastContainer, Modal, OfflineBanner };
