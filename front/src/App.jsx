/**
 * FATE & GRÂCE — Application Principale
 * React PWA · Design Luxe Raffiné · Connectée API Django
 *
 * Tous les écrans sont branchés aux services API avec fallback mock.
 * WebSocket intégré pour les notifications temps réel.
 */
import { useState, useEffect, useCallback, useMemo } from "react";
import { injectGlobalCSS, C, ROLE_COLORS, TABLE_STATUS, ORDER_STATUS, MVT_TYPE_META, MVT_STATUS_META, fmt, now, timeAgo } from "./styles/tokens";
import { useToast, useOfflineDetect, handleApiError } from "./hooks";
import { authService } from "./api/auth";
import { tablesService } from "./api/tables";
import { ordersService } from "./api/orders";
import { productsService, movementsService } from "./api/stock";
import { invoicesService, usersService, auditService, reportsService, notificationsService } from "./api/services";
import { MOCK_TABLES, MOCK_ORDERS, MOCK_PRODUCTS, MOCK_MOVEMENTS, MOCK_INVOICES, MOCK_AUDIT, MOCK_USERS, MOCK_PLATS, ROLES } from "./mock";

/* ══════════════════════════════════════════════════════════
   SHARED MICRO-COMPONENTS
   ══════════════════════════════════════════════════════════ */

const Logo = ({ size = 48, withText = false }) => (
  <div style={{ display:"flex", alignItems:"center", gap:12, flexShrink:0 }}>
    <svg width={size} height={size} viewBox="0 0 120 120" style={{ flexShrink:0 }}>
      <defs>
        <radialGradient id="gBg" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#2A2218"/>
          <stop offset="100%" stopColor="#0E0C08"/>
        </radialGradient>
        <linearGradient id="gGold" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#E2C478"/>
          <stop offset="50%" stopColor="#C9A84C"/>
          <stop offset="100%" stopColor="#8A7030"/>
        </linearGradient>
        <linearGradient id="gGold2" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#F0D898"/>
          <stop offset="100%" stopColor="#C9A84C"/>
        </linearGradient>
      </defs>
      {/* Circle */}
      <circle cx="60" cy="60" r="57" fill="url(#gBg)" stroke="url(#gGold)" strokeWidth="1.5"/>
      {/* Inner ring */}
      <circle cx="60" cy="60" r="50" fill="none" stroke="url(#gGold)" strokeWidth="0.5" opacity="0.35"/>
      {/* Laurel branches */}
      {[...Array(8)].map((_, i) => {
        const a = (-80 + i * 18) * Math.PI / 180;
        const r = 40; const x = 60 + r * Math.cos(a); const y = 60 + r * Math.sin(a);
        return <ellipse key={`l${i}`} cx={x} cy={y} rx="5.5" ry="2.8" fill="url(#gGold)" opacity="0.8"
          transform={`rotate(${(-80 + i * 18) + 90} ${x} ${y})`}/>;
      })}
      {[...Array(8)].map((_, i) => {
        const a = (-100 - i * 18) * Math.PI / 180;
        const r = 40; const x = 60 + r * Math.cos(a); const y = 60 + r * Math.sin(a);
        return <ellipse key={`r${i}`} cx={x} cy={y} rx="5.5" ry="2.8" fill="url(#gGold)" opacity="0.8"
          transform={`rotate(${(-100 - i * 18) - 90} ${x} ${y})`}/>;
      })}
      {/* Stems */}
      <path d="M 42 78 Q 60 74 78 78" stroke="url(#gGold)" strokeWidth="1" fill="none" opacity="0.6"/>
      {/* FG letters */}
      <text x="41" y="68" fontFamily="'Playfair Display',serif" fontSize="26" fontWeight="700"
        fill="url(#gGold2)" textAnchor="middle">F</text>
      <text x="79" y="68" fontFamily="'Playfair Display',serif" fontSize="26" fontWeight="700"
        fill="url(#gGold2)" textAnchor="middle">G</text>
      {/* Vertical divider */}
      <line x1="60" y1="46" x2="60" y2="72" stroke="url(#gGold)" strokeWidth="0.8" opacity="0.4"/>
    </svg>
    {withText && (
      <div style={{ minWidth:0 }}>
        <div className="serif" style={{ fontSize:17, fontWeight:600, color:C.goldL, letterSpacing:3, lineHeight:1 }}>FATE & GRÂCE</div>
        <div style={{ fontSize:9, color:C.muted, letterSpacing:3.5, textTransform:"uppercase", marginTop:3 }}>Bakery · Restaurant · Bar</div>
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

/* ══════════════════════════════════════════════════════════
   NAVIGATION
   ══════════════════════════════════════════════════════════ */
const NAV = {
  serveur:      [
    { id:"dashboard",    icon:"▦",  label:"Tableau de bord" },
    { id:"tables",       icon:"⬚",  label:"Tables" },
    { id:"orders",       icon:"≡",  label:"Commandes" },
    { id:"invoices",     icon:"◻",  label:"Factures" },
  ],
  cuisinier:    [
    { id:"dashboard",    icon:"▦",  label:"Tableau de bord" },
    { id:"kitchen",      icon:"◈",  label:"Cuisine" },
    { id:"stock-request",icon:"◉",  label:"Demande stock" },
    { id:"stats",        icon:"◎",  label:"Mes statistiques" },
  ],
  gerant:       [
    { id:"dashboard",    icon:"▦",  label:"Tableau de bord" },
    { id:"tables",       icon:"⬚",  label:"Tables" },
    { id:"orders",       icon:"≡",  label:"Commandes" },
    { id:"invoices",     icon:"◻",  label:"Factures" },
    { id:"stock",        icon:"◉",  label:"Stock" },
    { id:"stock-exits",  icon:"◈",  label:"Sorties stock" },
    { id:"reports",      icon:"◎",  label:"Rapports" },
  ],
  gestionnaire: [
    { id:"dashboard",    icon:"▦",  label:"Tableau de bord" },
    { id:"stock",        icon:"◉",  label:"Stock" },
    { id:"stock-entries",icon:"⊕",  label:"Entrées" },
    { id:"stock-exits",  icon:"⊖",  label:"Sorties" },
    { id:"stock-history",icon:"≡",  label:"Historique" },
    { id:"reports",      icon:"◎",  label:"Rapports" },
  ],
  manager:      [
    { id:"dashboard",    icon:"▦",  label:"Tableau de bord" },
    { id:"stock-validate",icon:"✓", label:"Validation stock" },
    { id:"stock",        icon:"◉",  label:"Stock" },
    { id:"reports",      icon:"◎",  label:"Rapports KPI" },
    { id:"team",         icon:"◐",  label:"Équipe" },
    { id:"audit",        icon:"◑",  label:"Audit" },
  ],
  auditeur:     [
    { id:"dashboard",    icon:"▦",  label:"Tableau de bord" },
    { id:"tables",       icon:"⬚",  label:"Tables" },
    { id:"orders",       icon:"≡",  label:"Commandes" },
    { id:"stock",        icon:"◉",  label:"Stock" },
    { id:"invoices",     icon:"◻",  label:"Factures" },
    { id:"audit",        icon:"◑",  label:"Audit" },
  ],
  admin:        [
    { id:"dashboard",    icon:"▦",  label:"Tableau de bord" },
    { id:"tables",       icon:"⬚",  label:"Tables" },
    { id:"kitchen",      icon:"◈",  label:"Cuisine" },
    { id:"orders",       icon:"≡",  label:"Commandes" },
    { id:"stock",        icon:"◉",  label:"Stock" },
    { id:"stock-entries",icon:"⊕",  label:"Entrées" },
    { id:"stock-exits",  icon:"⊖",  label:"Sorties" },
    { id:"stock-history",icon:"≡",  label:"Historique" },
    { id:"invoices",     icon:"◻",  label:"Factures" },
    { id:"reports",      icon:"◎",  label:"Rapports" },
    { id:"team",         icon:"◐",  label:"Utilisateurs" },
    { id:"audit",        icon:"◑",  label:"Audit" },
  ],
};

const Sidebar = ({ role, screen, onNav, user, onLogout, collapsed, setCollapsed, notifCount }) => {
  const items = NAV[role] || NAV.admin;
  return (
    <div style={{ width:collapsed?66:226, minHeight:"100vh", background:C.bg1,
      borderRight:`1px solid rgba(255,255,255,0.05)`, display:"flex", flexDirection:"column",
      transition:"width .3s cubic-bezier(.2,.8,.2,1)", overflow:"hidden", flexShrink:0 }}>
      {/* Logo area */}
      <div style={{ padding:collapsed?"16px 0":"20px 16px", borderBottom:`1px solid rgba(255,255,255,0.05)`,
        display:"flex", alignItems:"center", justifyContent:collapsed?"center":"flex-start", minHeight:72 }}>
        <Logo size={collapsed?36:42} withText={!collapsed}/>
      </div>

      {/* Collapse toggle */}
      <button onClick={()=>setCollapsed(!collapsed)}
        style={{ margin:"8px auto 4px", background:"rgba(255,255,255,0.04)", border:`1px solid rgba(255,255,255,0.07)`,
          color:C.muted, width:28, height:28, borderRadius:6, fontSize:11, display:"flex",
          alignItems:"center", justifyContent:"center", transition:"all .2s" }}>
        {collapsed?"›":"‹"}
      </button>

      {/* Nav items */}
      <nav style={{ flex:1, padding:"4px 8px", overflowY:"auto", overflowX:"hidden" }}>
        {items.map(item => {
          const active = screen === item.id;
          return (
            <button key={item.id} onClick={()=>onNav(item.id)} title={collapsed?item.label:""}
              style={{ width:"100%", display:"flex", alignItems:"center", gap:10,
                padding:collapsed?"10px 0":"9px 12px", justifyContent:collapsed?"center":"flex-start",
                borderRadius:8, border:"none", margin:"2px 0",
                background:active?C.goldFaint:"transparent",
                color:active?C.goldL:C.muted,
                borderLeft:active?`2px solid ${C.gold}`:"2px solid transparent",
                fontSize:13, fontWeight:active?600:400, fontFamily:"'Raleway',sans-serif",
                transition:"all .15s", whiteSpace:"nowrap", overflow:"hidden" }}>
              <span style={{ fontSize:14, flexShrink:0, opacity:active?1:.7 }}>{item.icon}</span>
              {!collapsed && <span>{item.label}</span>}
            </button>
          );
        })}
      </nav>

      {/* Notification badge */}
      {!collapsed && notifCount > 0 && (
        <div style={{ margin:"0 16px 12px", background:`${C.gold}15`, border:`1px solid ${C.goldBorder}`,
          borderRadius:8, padding:"8px 12px", display:"flex", alignItems:"center", gap:8 }}>
          <div className="pulse" style={{ width:8, height:8, borderRadius:"50%", background:C.gold, flexShrink:0 }}/>
          <span style={{ fontSize:11, color:C.goldL }}>{notifCount} notification{notifCount>1?"s":""}</span>
        </div>
      )}

      {/* User footer */}
      <div style={{ padding:collapsed?"12px 0":"12px 14px", borderTop:`1px solid rgba(255,255,255,0.05)` }}>
        <div style={{ display:"flex", alignItems:"center", gap:10, justifyContent:collapsed?"center":"flex-start" }}>
          <div style={{ width:34, height:34, borderRadius:10, background:`linear-gradient(135deg,${ROLE_COLORS[role]||C.gold}55,${C.bg4})`,
            border:`1px solid ${ROLE_COLORS[role]||C.gold}40`, flexShrink:0, display:"flex",
            alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:700, color:"#fff" }}>
            {user.firstName?.[0]}{user.lastName?.[0]}
          </div>
          {!collapsed && (
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:12, fontWeight:600, color:C.cream }} className="truncate">{user.firstName} {user.lastName}</div>
              <div style={{ fontSize:10, color:C.muted }}>{ROLES[role]||role}</div>
            </div>
          )}
          {!collapsed && (
            <button onClick={onLogout} title="Déconnexion"
              style={{ background:"none",border:"none",color:C.muted,fontSize:16,padding:3,cursor:"pointer",transition:"color .2s" }}>⏻</button>
          )}
        </div>
        {collapsed && (
          <button onClick={onLogout} style={{ background:"none",border:"none",color:C.muted,fontSize:14,display:"block",margin:"8px auto 0",cursor:"pointer" }}>⏻</button>
        )}
      </div>
    </div>
  );
};

const Header = ({ title, subtitle, actions, notifCount }) => (
  <div style={{ background:C.bg1, borderBottom:`1px solid rgba(255,255,255,0.05)`,
    padding:"13px 28px", display:"flex", alignItems:"center", justifyContent:"space-between", flexShrink:0 }}>
    <div>
      <h1 className="serif" style={{ fontSize:20, fontWeight:600, color:C.cream, letterSpacing:.4 }}>{title}</h1>
      {subtitle && <p style={{ fontSize:12, color:C.muted, marginTop:2 }}>{subtitle}</p>}
    </div>
    <div style={{ display:"flex", alignItems:"center", gap:12 }}>
      {actions}
      {notifCount > 0 && (
        <div style={{ position:"relative" }}>
          <div className="pulse" style={{ width:9,height:9,borderRadius:"50%",background:C.gold,
            position:"absolute",top:-2,right:-2,zIndex:1,border:`1px solid ${C.bg1}` }}/>
          <button style={{ background:C.bg3,border:`1px solid rgba(255,255,255,0.08)`,
            color:C.mutedL,borderRadius:8,padding:"7px 11px",fontSize:14,cursor:"pointer" }}>🔔</button>
        </div>
      )}
    </div>
  </div>
);

/* ══════════════════════════════════════════════════════════
   LOGIN SCREEN
   ══════════════════════════════════════════════════════════ */
const LoginScreen = ({ onLogin, toast }) => {
  const [login, setLogin]       = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);

  const handleSubmit = async () => {
    if (!login) { setError("Veuillez saisir votre identifiant"); return; }
    setError(""); setLoading(true);
    try {
      const { user } = await authService.login(login, password || "demo");
      toast.success("Bienvenue !", `Connecté en tant que ${ROLES[user.role]}`);
      onLogin(user);
    } catch (err) {
      setError(err.message || "Identifiants incorrects");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight:"100vh", background:C.bg0, display:"flex", alignItems:"center", justifyContent:"center", position:"relative", overflow:"hidden" }}>
      {/* Ambient glow */}
      <div style={{ position:"absolute", width:700, height:700, borderRadius:"50%", background:`radial-gradient(circle,${C.gold}07 0%,transparent 70%)`, top:-150, left:-150, pointerEvents:"none" }}/>
      <div style={{ position:"absolute", width:500, height:500, borderRadius:"50%", background:`radial-gradient(circle,${C.gold}05 0%,transparent 70%)`, bottom:0, right:0, pointerEvents:"none" }}/>

      <div className="anim-fadeUp" style={{ width:"100%", maxWidth:420, padding:20 }}>
        {/* Logo */}
        <div style={{ textAlign:"center", marginBottom:36 }}>
          <div style={{ display:"flex", justifyContent:"center", marginBottom:18 }}><Logo size={88}/></div>
          <h1 className="serif" style={{ fontSize:26, fontWeight:600, color:C.goldL, letterSpacing:4 }}>FATE & GRÂCE</h1>
          <p style={{ fontSize:10, color:C.muted, letterSpacing:4, textTransform:"uppercase", marginTop:5 }}>Plateforme de Gestion</p>
        </div>

        <Card style={{ padding:32, border:`1px solid ${C.goldBorder}` }}>
          <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
            <Input label="Identifiant" value={login} onChange={setLogin} placeholder="votre.login" required/>
            <Input label="Mot de passe" type="password" value={password} onChange={setPassword}
              placeholder="••••••••" required style={{ letterSpacing:2 }}/>

            {error && (
              <div style={{ background:C.dangerBg, border:`1px solid ${C.dangerBdr}`, borderRadius:8, padding:"9px 13px", fontSize:12, color:C.danger }}>
                ⚠ {error}
              </div>
            )}

            <Btn onClick={handleSubmit} loading={loading} disabled={!login}
              style={{ width:"100%", justifyContent:"center", padding:"13px 20px", fontSize:14, letterSpacing:1 }}>
              Se connecter
            </Btn>

            <Divider label="Comptes de démonstration"/>

            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:6 }}>
              {Object.entries({ admin:"Admin", gerant:"Gérant", manager:"Manager", serveur:"Serveur", cuisinier:"Cuisinier", gestionnaire:"Gest. Stock" }).map(([role, label]) => (
                <button key={role} onClick={()=>{ const u = MOCK_USERS.find(x=>x.role===role); if(u){ setLogin(u.login); setPassword("demo"); }}}
                  style={{ background:C.bg3, border:`1px solid rgba(255,255,255,0.08)`, color:C.mutedL,
                    borderRadius:7, padding:"6px 8px", fontSize:11, fontFamily:"'Raleway',sans-serif",
                    cursor:"pointer", transition:"all .2s" }} className="hover-bg">
                  {label}
                </button>
              ))}
            </div>
          </div>
        </Card>

        <p style={{ textAlign:"center", fontSize:10, color:C.mutedD, marginTop:20, letterSpacing:.8 }}>
          FATE & GRÂCE · DSI Africa Global Logistics Bénin · v1.0 · 2025
        </p>
      </div>
    </div>
  );
};

/* ══════════════════════════════════════════════════════════
   DASHBOARD SCREEN
   ══════════════════════════════════════════════════════════ */
const DashboardScreen = ({ role, tables, orders, products, movements, toast }) => {
  const tablesDispos    = tables.filter(t=>t.status==="DISPONIBLE").length;
  const tablesEnService = tables.filter(t=>t.status==="EN_SERVICE").length;
  const cmdActives      = orders.filter(o=>!["LIVRÉE","ANNULÉE","REFUSÉE"].includes(o.status)).length;
  const cmdPrêtes       = orders.filter(o=>o.status==="EN_ATTENTE_LIVRAISON").length;
  const cmdEnAttente    = orders.filter(o=>o.status==="EN_ATTENTE_ACCEPTATION").length;
  const stockAlerte     = products.filter(p=>p.qte<p.seuil).length;
  const mvtPending      = movements.filter(m=>m.statut==="EN_ATTENTE").length;

  const today = new Date().toLocaleDateString("fr-FR",{ weekday:"long", day:"numeric", month:"long" });

  return (
    <div style={{ padding:28, overflowY:"auto", flex:1 }}>
      {/* Greeting */}
      <div style={{ marginBottom:24 }}>
        <div style={{ fontSize:11, color:C.muted, letterSpacing:.5, textTransform:"capitalize" }}>{today}</div>
        <h2 className="serif" style={{ fontSize:22, color:C.goldL, marginTop:3 }}>Bonne soirée — service en cours ✦</h2>
      </div>

      {/* KPI Grid */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))", gap:14, marginBottom:26 }}>
        <StatCard label="Tables disponibles" value={tablesDispos} icon="🪑" color={C.success} sub={`/${tables.length} tables`} delay={0}/>
        <StatCard label="En service" value={tablesEnService} icon="🍽️" color={C.warning} delay={60}/>
        <StatCard label="Commandes actives" value={cmdActives} icon="📋" color={C.info} sub={`${cmdPrêtes} prêtes`} delay={120}/>
        {cmdEnAttente > 0 && <StatCard label="En attente cuisine" value={cmdEnAttente} icon="⏳" color={C.gold} delay={180}/>}
        {["gestionnaire","gerant","manager","admin"].includes(role) && (
          <StatCard label="Alertes stock" value={stockAlerte} icon="⚠️" color={stockAlerte>0?C.danger:C.success} delay={240}/>
        )}
        {["manager","admin"].includes(role) && (
          <StatCard label="À valider" value={mvtPending} icon="✅" color={C.purple} delay={300}/>
        )}
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1.2fr 1fr", gap:18 }}>
        {/* Recent orders */}
        <Card style={{ overflow:"hidden" }}>
          <div style={{ padding:"15px 20px", borderBottom:`1px solid rgba(255,255,255,0.05)`, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <span className="serif" style={{ fontSize:15, color:C.cream }}>Commandes récentes</span>
            {cmdEnAttente > 0 && <Badge color={C.warning}>{cmdEnAttente} en attente</Badge>}
          </div>
          <div style={{ maxHeight:296, overflowY:"auto" }}>
            {orders.length === 0 ? <Empty icon="📋" text="Aucune commande"/> : orders.slice(0,8).map(o => {
              const st = ORDER_STATUS[o.status];
              return (
                <div key={o.id} style={{ padding:"11px 20px", borderBottom:`1px solid rgba(255,255,255,0.04)`,
                  display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <div style={{ minWidth:0 }}>
                    <div style={{ fontSize:13, fontWeight:600, color:C.cream }}>{o.id} — <span style={{ color:C.muted }}>Table {o.tableNum}</span></div>
                    <div style={{ fontSize:11, color:C.muted, marginTop:2 }} className="truncate">
                      {o.items?.map(i=>i.nom).join(", ")}
                    </div>
                  </div>
                  <div style={{ textAlign:"right", flexShrink:0, marginLeft:12 }}>
                    <Badge color={st?.color} style={{ fontSize:10 }}>{st?.label}</Badge>
                    <div style={{ fontSize:11, color:C.goldL, marginTop:3, fontWeight:600 }}>{fmt(o.montant)}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Stock alerts */}
        <Card style={{ overflow:"hidden" }}>
          <div style={{ padding:"15px 20px", borderBottom:`1px solid rgba(255,255,255,0.05)`, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <span className="serif" style={{ fontSize:15, color:C.cream }}>Alertes stock</span>
            {stockAlerte > 0 && <Badge color={C.danger}>{stockAlerte} alertes</Badge>}
          </div>
          <div style={{ maxHeight:296, overflowY:"auto" }}>
            {(() => {
              const alerts = products.filter(p => p.qte < p.seuil || new Date(p.peremption) < new Date(Date.now()+4*86400000));
              if (!alerts.length) return <div style={{ padding:"40px 20px", textAlign:"center", color:C.success, fontSize:13 }}>✓ Stock en bonne santé</div>;
              return alerts.map(p => {
                const low = p.qte < p.seuil;
                const exp = new Date(p.peremption) < new Date(Date.now()+4*86400000);
                return (
                  <div key={p.id} style={{ padding:"11px 20px", borderBottom:`1px solid rgba(255,255,255,0.04)`,
                    display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                    <div>
                      <div style={{ fontSize:13, fontWeight:600, color:C.cream }}>{p.nom}</div>
                      <div style={{ fontSize:11, marginTop:2, color:exp?C.danger:C.warning }}>
                        {exp && "⏰ Péremption proche"}{exp&&low&&" · "}{low && `${p.qte}${p.unite} (seuil: ${p.seuil})`}
                      </div>
                    </div>
                    <Badge color={low?C.danger:C.warning}>{low?"Critique":"Attention"}</Badge>
                  </div>
                );
              });
            })()}
          </div>
        </Card>
      </div>

      {/* Tables mini-map */}
      <Card style={{ marginTop:18, overflow:"hidden" }}>
        <div style={{ padding:"15px 20px", borderBottom:`1px solid rgba(255,255,255,0.05)` }}>
          <span className="serif" style={{ fontSize:15, color:C.cream }}>Vue des tables — ce soir</span>
        </div>
        <div style={{ padding:16, display:"flex", gap:8, flexWrap:"wrap" }}>
          {tables.map(t => {
            const st = TABLE_STATUS[t.status] || TABLE_STATUS.DISPONIBLE;
            return (
              <div key={t.id} style={{ width:60, height:60, borderRadius:10, background:st.bg,
                border:`1px solid ${st.color}50`, display:"flex", flexDirection:"column",
                alignItems:"center", justifyContent:"center", gap:4 }}>
                <span style={{ fontSize:11, fontWeight:700, color:st.color }}>T{t.num}</span>
                <Dot color={st.color} size={6}/>
              </div>
            );
          })}
        </div>
        <div style={{ padding:"6px 16px 14px", display:"flex", gap:18, flexWrap:"wrap" }}>
          {Object.values(TABLE_STATUS).map(v => (
            <div key={v.label} style={{ display:"flex", alignItems:"center", gap:5, fontSize:10, color:C.muted }}>
              <Dot color={v.color} size={6}/> {v.label}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};

/* ══════════════════════════════════════════════════════════
   TABLES SCREEN
   ══════════════════════════════════════════════════════════ */
const TablesScreen = ({ tables, setTables, orders, role, onSelectTable, toast }) => {
  const [filter, setFilter] = useState("ALL");
  const [busy, setBusy]     = useState(null);

  const filtered = filter === "ALL" ? tables : tables.filter(t=>t.status===filter);

  const doAction = async (t, action) => {
    setBusy(t.id);
    try {
      if (action === "reserve") {
        await tablesService.reserve(t.id);
        setTables(p=>p.map(x=>x.id===t.id?{...x,status:"RÉSERVÉE"}:x));
        toast.success("Table réservée", `Table ${t.num} réservée`);
      } else if (action === "cancel") {
        await tablesService.cancelReservation(t.id);
        setTables(p=>p.map(x=>x.id===t.id?{...x,status:"DISPONIBLE"}:x));
        toast.info("Réservation annulée", `Table ${t.num} disponible`);
      }
    } catch (err) {
      handleApiError(err, toast);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div style={{ padding:28, overflowY:"auto", flex:1 }}>
      {/* Filter bar */}
      <div style={{ display:"flex", gap:8, marginBottom:24, flexWrap:"wrap" }}>
        {[{v:"ALL",l:"Toutes ("+(tables.length)+")"}, ...Object.entries(TABLE_STATUS).map(([v,d])=>({v,l:d.label+" ("+tables.filter(t=>t.status===v).length+")"}))]
          .map(f => (
            <button key={f.v} onClick={()=>setFilter(f.v)}
              style={{ padding:"6px 14px", borderRadius:20, border:`1px solid ${filter===f.v?C.gold:C.goldBorder}`,
                background:filter===f.v?C.goldFaint:"transparent", color:filter===f.v?C.goldL:C.muted,
                fontSize:12, fontFamily:"'Raleway',sans-serif", cursor:"pointer", transition:"all .2s" }}>
              {f.l}
            </button>
          ))}
      </div>

      {/* Tables grid */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(210px,1fr))", gap:14 }}>
        {filtered.map((t,i) => {
          const st = TABLE_STATUS[t.status] || TABLE_STATUS.DISPONIBLE;
          const tOrders = orders.filter(o=>o.tableId===t.id && !["LIVRÉE","ANNULÉE","REFUSÉE"].includes(o.status));
          return (
            <Card key={t.id} className="hover-lift anim-fadeUp"
              style={{ padding:0, overflow:"hidden", cursor:"pointer", animationDelay:`${i*35}ms`,
                border:`1px solid ${st.color}35` }}
              onClick={()=>onSelectTable(t)}>
              <div style={{ height:3, background:`linear-gradient(90deg,${st.color},${st.color}30)` }}/>
              <div style={{ padding:"16px 18px" }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:14 }}>
                  <div>
                    <div className="serif" style={{ fontSize:26, fontWeight:700, color:C.cream }}>T{t.num}</div>
                    <div style={{ fontSize:11, color:C.muted, marginTop:1 }}>{t.capacite} couverts</div>
                  </div>
                  <Badge color={st.color} style={{ fontSize:10 }}>{st.label}</Badge>
                </div>

                {t.montant > 0 && (
                  <div style={{ marginBottom:12, padding:"8px 11px", background:C.goldFaint, borderRadius:8, border:`1px solid ${C.goldBorder}` }}>
                    <div style={{ fontSize:10, color:C.muted }}>Total en cours</div>
                    <div className="serif" style={{ fontSize:16, fontWeight:700, color:C.goldL, marginTop:1 }}>{fmt(t.montant)}</div>
                  </div>
                )}

                {tOrders.length > 0 && (
                  <div style={{ fontSize:11, color:C.mutedL, marginBottom:12 }}>
                    {tOrders.length} commande{tOrders.length>1?"s":""} active{tOrders.length>1?"s":""}
                  </div>
                )}

                <div style={{ display:"flex", gap:6, flexWrap:"wrap" }} onClick={e=>e.stopPropagation()}>
                  {t.status==="DISPONIBLE" && ["serveur","gerant","admin"].includes(role) && (
                    <Btn small variant="outline" loading={busy===t.id} onClick={()=>doAction(t,"reserve")}>Réserver</Btn>
                  )}
                  {t.status==="RÉSERVÉE" && ["serveur","gerant","admin"].includes(role) && (
                    <Btn small variant="danger" loading={busy===t.id} onClick={()=>doAction(t,"cancel")}>Annuler</Btn>
                  )}
                  <Btn small variant="ghost" onClick={()=>onSelectTable(t)}>Détail →</Btn>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

/* ══════════════════════════════════════════════════════════
   TABLE DETAIL SCREEN
   ══════════════════════════════════════════════════════════ */
const TableDetailScreen = ({ table, orders, setOrders, setTables, role, toast, plats }) => {
  const [showOrderForm, setShowOrderForm] = useState(false);
  const [showPayModal,  setShowPayModal]  = useState(false);
  const [showCancelM,   setShowCancelM]   = useState(null);
  const [newItems,  setNewItems]  = useState([]);
  const [obs,       setObs]       = useState("");
  const [motifCanc, setMotifCanc] = useState("");
  const [payMode,   setPayMode]   = useState("Espèces");
  const [pourboire, setPourboire] = useState("0");
  const [loading,   setLoading]   = useState(false);

  const tableOrders  = orders.filter(o=>o.tableId===table.id);
  const activeOrders = tableOrders.filter(o=>!["ANNULÉE","REFUSÉE"].includes(o.status));
  const totalAmount  = activeOrders.reduce((s,o)=>s+(o.montant||0),0);
  const allDelivered = activeOrders.length>0 && activeOrders.every(o=>o.status==="LIVRÉE");

  const addItem = (plat) => setNewItems(p=>{
    const ex = p.find(i=>i.platId===plat.id);
    return ex ? p.map(i=>i.platId===plat.id?{...i,qte:i.qte+1}:i) : [...p,{platId:plat.id,nom:plat.nom,qte:1,prix:plat.prix}];
  });

  const submitOrder = async () => {
    if (!newItems.length) { toast.warning("","Ajoutez au moins un plat"); return; }
    setLoading(true);
    try {
      const payload = {
        table_id: table.id, table_num: table.num,
        serveur: "Utilisateur courant",
        items: newItems.map(i=>({ plat_id:i.platId, nom:i.nom, qte:i.qte, prix:i.prix })),
        obs,
      };
      const order = await ordersService.create(payload);
      setOrders(p=>[...p, { ...order, tableId:table.id, tableNum:table.num, items:newItems, montant:newItems.reduce((s,i)=>s+i.prix*i.qte,0), status:"EN_ATTENTE_ACCEPTATION", obs, createdAt:now() }]);
      setTables(p=>p.map(t=>t.id===table.id?{...t,status:t.status==="RÉSERVÉE"?"COMMANDES_PASSÉE":t.status,montant:t.montant+newItems.reduce((s,i)=>s+i.prix*i.qte,0)}:t));
      setNewItems([]); setObs(""); setShowOrderForm(false);
      toast.success("Commande envoyée","Cuisiniers notifiés");
    } catch(err) { handleApiError(err,toast); } finally { setLoading(false); }
  };

  const cancelOrder = async (orderId) => {
    if (!motifCanc) { toast.warning("","Motif obligatoire"); return; }
    setLoading(true);
    try {
      await ordersService.cancel(orderId, motifCanc);
      setOrders(p=>p.map(o=>o.id===orderId?{...o,status:"ANNULÉE",motif:motifCanc}:o));
      setShowCancelM(null); setMotifCanc("");
      toast.info("Commande annulée","");
    } catch(err) { handleApiError(err,toast); } finally { setLoading(false); }
  };

  const deliverOrder = async (orderId) => {
    setLoading(true);
    try {
      await ordersService.deliver(orderId);
      setOrders(p=>p.map(o=>o.id===orderId?{...o,status:"LIVRÉE"}:o));
      toast.success("Livraison confirmée","");
    } catch(err) { handleApiError(err,toast); } finally { setLoading(false); }
  };

  const closeTable = async () => {
    setLoading(true);
    try {
      await tablesService.close(table.id);
      setTables(p=>p.map(t=>t.id===table.id?{...t,status:"EN_ATTENTE_PAIEMENT"}:t));
      toast.info("Table clôturée","En attente de paiement");
    } catch(err) { handleApiError(err,toast); } finally { setLoading(false); }
  };

  const processPayment = async () => {
    setLoading(true);
    try {
      const { table: updatedTable } = await tablesService.pay(table.id, {
        mode_paiement: payMode, montant: totalAmount, pourboire: Number(pourboire),
      });
      setTables(p=>p.map(t=>t.id===table.id?{...t,...(updatedTable||{}),status:"DISPONIBLE",montant:0}:t));
      setShowPayModal(false);
      toast.success("Paiement enregistré", `${fmt(totalAmount + Number(pourboire))} — ${payMode}`);
    } catch(err) { handleApiError(err,toast); } finally { setLoading(false); }
  };

  const st = TABLE_STATUS[table.status] || TABLE_STATUS.DISPONIBLE;

  return (
    <div style={{ padding:28, overflowY:"auto", flex:1 }}>
      {/* Header */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:22 }}>
        <div style={{ display:"flex", alignItems:"center", gap:14 }}>
          <div style={{ width:52, height:52, borderRadius:12, background:`linear-gradient(135deg,${C.bg3},${C.bg4})`,
            border:`1px solid ${st.color}50`, display:"flex", alignItems:"center", justifyContent:"center" }}>
            <span className="serif" style={{ fontSize:20, fontWeight:700, color:C.goldL }}>T{table.num}</span>
          </div>
          <div>
            <h2 className="serif" style={{ fontSize:20, color:C.cream }}>Table {table.num}</h2>
            <div style={{ display:"flex", gap:8, marginTop:4 }}>
              <Badge color={st.color}>{st.label}</Badge>
              <Badge color={C.muted} style={{ fontSize:10 }}>{table.capacite} couverts</Badge>
            </div>
          </div>
        </div>
        <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
          {["serveur","admin"].includes(role) && ["RÉSERVÉE","EN_SERVICE","COMMANDES_PASSÉE"].includes(table.status) && (
            <Btn variant="outline" onClick={()=>setShowOrderForm(true)}>+ Nouvelle commande</Btn>
          )}
          {allDelivered && ["serveur","gerant","admin"].includes(role) && table.status==="EN_SERVICE" && (
            <Btn variant="info" loading={loading} onClick={closeTable}>Clôturer la table</Btn>
          )}
          {table.status==="EN_ATTENTE_PAIEMENT" && ["gerant","admin"].includes(role) && (
            <Btn variant="success" onClick={()=>setShowPayModal(true)}>💳 Enregistrer paiement</Btn>
          )}
        </div>
      </div>

      {/* Amount summary */}
      {totalAmount > 0 && (
        <div style={{ background:`linear-gradient(135deg,${C.bg2},${C.bg3})`, border:`1px solid ${C.goldBorder}`, borderRadius:13, padding:20, marginBottom:20, display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:16 }}>
          <div>
            <div style={{ fontSize:10, color:C.muted, textTransform:"uppercase", letterSpacing:1.5 }}>Montant total</div>
            <div className="serif" style={{ fontSize:28, fontWeight:700, color:C.goldL, marginTop:4 }}>{fmt(totalAmount)}</div>
          </div>
          <div>
            <div style={{ fontSize:10, color:C.muted, textTransform:"uppercase", letterSpacing:1.5 }}>Commandes actives</div>
            <div style={{ fontSize:26, fontWeight:700, color:C.cream, marginTop:4 }}>{activeOrders.length}</div>
          </div>
          <div>
            <div style={{ fontSize:10, color:C.muted, textTransform:"uppercase", letterSpacing:1.5 }}>Livrées</div>
            <div style={{ fontSize:26, fontWeight:700, color:C.success, marginTop:4 }}>{activeOrders.filter(o=>o.status==="LIVRÉE").length}</div>
          </div>
        </div>
      )}

      {/* Orders */}
      <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
        {tableOrders.length === 0 ? <Empty icon="📋" text="Aucune commande sur cette table"/> :
          tableOrders.map(o => {
            const ost = ORDER_STATUS[o.status];
            return (
              <Card key={o.id} style={{ padding:0, overflow:"hidden" }}>
                <div style={{ height:2, background:ost?.color||C.gold }}/>
                <div style={{ padding:"14px 18px" }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:10 }}>
                    <div>
                      <div style={{ fontSize:13, fontWeight:700, color:C.cream }}>{o.id}</div>
                      <div style={{ fontSize:11, color:C.muted, marginTop:2 }}>
                        {o.serveur && `Serveur: ${o.serveur} · `}{timeAgo(o.createdAt)}
                      </div>
                      {o.cuisinier && <div style={{ fontSize:11, color:C.muted }}>Cuisinier: {o.cuisinier}</div>}
                    </div>
                    <div style={{ textAlign:"right" }}>
                      <Badge color={ost?.color}>{ost?.label}</Badge>
                      <div style={{ fontSize:13, fontWeight:700, color:C.goldL, marginTop:4 }}>{fmt(o.montant)}</div>
                    </div>
                  </div>
                  <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:10 }}>
                    {o.items?.map((item,j) => (
                      <div key={j} style={{ background:C.bg3, borderRadius:6, padding:"3px 9px", fontSize:11, color:C.mutedL }}>
                        {item.qte}× {item.nom}
                      </div>
                    ))}
                  </div>
                  {o.obs   && <div style={{ fontSize:11, color:C.mutedL, fontStyle:"italic", marginBottom:6, padding:"5px 10px", background:C.bg3, borderRadius:6 }}>📝 {o.obs}</div>}
                  {o.motif && <div style={{ fontSize:11, color:C.danger, marginBottom:8 }}>⚠ Motif: {o.motif}</div>}
                  <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                    {o.status==="EN_ATTENTE_LIVRAISON" && ["serveur","admin"].includes(role) && (
                      <Btn small variant="success" loading={loading} onClick={()=>deliverOrder(o.id)}>✓ Confirmer livraison</Btn>
                    )}
                    {["EN_ATTENTE_ACCEPTATION","STOCKÉE"].includes(o.status) && ["serveur","admin"].includes(role) && (
                      <Btn small variant="danger" onClick={()=>setShowCancelM(o.id)}>Annuler</Btn>
                    )}
                    {["EN_ATTENTE_ACCEPTATION","EN_PRÉPARATION","EN_ATTENTE_LIVRAISON"].includes(o.status) && ["gerant","admin"].includes(role) && (
                      <Btn small variant="danger" onClick={()=>setShowCancelM(o.id)}>Annuler (Gérant)</Btn>
                    )}
                  </div>
                </div>
              </Card>
            );
          })
        }
      </div>

      {/* Order form modal */}
      <Modal open={showOrderForm} onClose={()=>{setShowOrderForm(false);setNewItems([]);setObs("");}} title="Nouvelle commande" width={560}>
        <div style={{ display:"flex", flexDirection:"column", gap:18 }}>
          <div>
            <div style={{ fontSize:11, color:C.muted, letterSpacing:1.2, textTransform:"uppercase", marginBottom:10 }}>Menu disponible</div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, maxHeight:260, overflowY:"auto" }}>
              {plats.filter(p=>p.disponible).map(p => (
                <button key={p.id} onClick={()=>addItem(p)}
                  style={{ background:C.bg3, border:`1px solid rgba(255,255,255,0.08)`, borderRadius:9,
                    padding:"10px 13px", textAlign:"left", cursor:"pointer", transition:"all .15s" }} className="hover-bg">
                  <div style={{ fontSize:12, fontWeight:600, color:C.cream }}>{p.nom}</div>
                  <div style={{ fontSize:12, color:C.gold, marginTop:2 }}>{fmt(p.prix)}</div>
                </button>
              ))}
            </div>
          </div>
          {newItems.length > 0 && (
            <div>
              <Divider label={`Sélection — Total: ${fmt(newItems.reduce((s,i)=>s+i.prix*i.qte,0))}`}/>
              <div style={{ display:"flex", flexDirection:"column", gap:6, marginTop:10 }}>
                {newItems.map(item => (
                  <div key={item.platId} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", background:C.bg3, borderRadius:8, padding:"8px 12px" }}>
                    <span style={{ fontSize:12, color:C.cream }}>{item.nom}</span>
                    <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                      <span style={{ fontSize:12, color:C.gold }}>{item.qte}× {fmt(item.prix)}</span>
                      <button onClick={()=>setNewItems(p=>p.filter(i=>i.platId!==item.platId))}
                        style={{ background:C.dangerBg, border:"none", color:C.danger, borderRadius:4, padding:"2px 6px", fontSize:10, cursor:"pointer" }}>✕</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          <Input label="Observations" value={obs} onChange={setObs} placeholder="Instructions spéciales…" textarea/>
          <div style={{ display:"flex", gap:10, justifyContent:"flex-end" }}>
            <Btn variant="ghost" onClick={()=>setShowOrderForm(false)}>Annuler</Btn>
            <Btn loading={loading} onClick={submitOrder} disabled={!newItems.length}>Envoyer aux cuisiniers →</Btn>
          </div>
        </div>
      </Modal>

      {/* Cancel modal */}
      <Modal open={!!showCancelM} onClose={()=>{setShowCancelM(null);setMotifCanc("");}} title="Annuler la commande">
        <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
          <p style={{ fontSize:13, color:C.mutedL }}>Le motif d'annulation est obligatoire.</p>
          <Input label="Motif d'annulation" value={motifCanc} onChange={setMotifCanc} placeholder="Raison de l'annulation…" required textarea/>
          <div style={{ display:"flex", gap:10, justifyContent:"flex-end" }}>
            <Btn variant="ghost" onClick={()=>setShowCancelM(null)}>Retour</Btn>
            <Btn variant="danger" loading={loading} onClick={()=>cancelOrder(showCancelM)} disabled={!motifCanc}>Confirmer annulation</Btn>
          </div>
        </div>
      </Modal>

      {/* Payment modal */}
      <Modal open={showPayModal} onClose={()=>setShowPayModal(false)} title="Enregistrer le paiement">
        <div style={{ display:"flex", flexDirection:"column", gap:18 }}>
          <div style={{ background:C.goldFaint, border:`1px solid ${C.goldBorder}`, borderRadius:11, padding:18, textAlign:"center" }}>
            <div style={{ fontSize:11, color:C.muted }}>Montant à encaisser</div>
            <div className="serif" style={{ fontSize:32, fontWeight:700, color:C.goldL, marginTop:4 }}>{fmt(totalAmount)}</div>
          </div>
          <Select label="Mode de paiement" value={payMode} onChange={setPayMode}
            options={["Espèces","Carte bancaire","Mobile Money","Autre"].map(v=>({value:v,label:v}))}/>
          <Input label="Pourboire (FCFA)" type="number" value={pourboire} onChange={setPourboire} placeholder="0" min="0"/>
          {Number(pourboire) > 0 && (
            <div style={{ background:C.successBg, border:`1px solid ${C.successBdr}`, borderRadius:8, padding:"8px 12px", fontSize:12, color:C.success }}>
              Total encaissé : {fmt(totalAmount + Number(pourboire))}
            </div>
          )}
          <div style={{ display:"flex", gap:10, justifyContent:"flex-end" }}>
            <Btn variant="ghost" onClick={()=>setShowPayModal(false)}>Annuler</Btn>
            <Btn variant="success" loading={loading} onClick={processPayment}>✓ Valider le paiement</Btn>
          </div>
        </div>
      </Modal>
    </div>
  );
};

/* ══════════════════════════════════════════════════════════
   KITCHEN SCREEN
   ══════════════════════════════════════════════════════════ */
const KitchenScreen = ({ orders, setOrders, products, movements, setMovements, role, toast }) => {
  const [filter, setFilter] = useState("EN_ATTENTE_ACCEPTATION");
  const [rejectId, setRejectId]   = useState(null);
  const [motifRefus, setMotifRefus] = useState("");
  const [stockReqId, setStockReqId] = useState(null);
  const [stockItems, setStockItems] = useState([]);
  const [loading, setLoading] = useState(false);

  const visible = orders.filter(o=>filter==="ALL" ? !["ANNULÉE","REFUSÉE"].includes(o.status) : o.status===filter);

  const countFor = (s) => orders.filter(o=>o.status===s).length;

  const doAccept = async (id) => {
    setLoading(true);
    try {
      await ordersService.accept(id, null);
      setOrders(p=>p.map(o=>o.id===id?{...o,status:"EN_PRÉPARATION",cuisinier:"Marco Houénou"}:o));
      toast.success("Commande acceptée","En préparation");
    } catch(err) { handleApiError(err,toast); } finally { setLoading(false); }
  };

  const doReject = async () => {
    if (!motifRefus) { toast.warning("","Motif obligatoire"); return; }
    setLoading(true);
    try {
      await ordersService.reject(rejectId, motifRefus);
      setOrders(p=>p.map(o=>o.id===rejectId?{...o,status:"REFUSÉE",motif:motifRefus}:o));
      setRejectId(null); setMotifRefus("");
      toast.error("Commande refusée","Serveur notifié");
    } catch(err) { handleApiError(err,toast); } finally { setLoading(false); }
  };

  const doReady = async (id) => {
    setLoading(true);
    try {
      await ordersService.markReady(id);
      setOrders(p=>p.map(o=>o.id===id?{...o,status:"EN_ATTENTE_LIVRAISON"}:o));
      toast.gold("Commande prête","Serveur notifié");
    } catch(err) { handleApiError(err,toast); } finally { setLoading(false); }
  };

  const submitStockReq = async () => {
    if (!stockItems.length) { toast.warning("","Sélectionnez des produits"); return; }
    setLoading(true);
    try {
      for (const si of stockItems) {
        const mvt = await movementsService.create({ produit_id:si.id, type:"SORTIE", qte:si.qte, justification:`Commande ${stockReqId}` });
        setMovements(p=>[{...mvt, produitId:si.id, produit:si.nom, type:"SORTIE", qte:si.qte, statut:"EN_ATTENTE", justification:`Commande ${stockReqId}`, date:now() },...p]);
      }
      setStockReqId(null); setStockItems([]);
      toast.success("Demande de stock soumise","Gestionnaire notifié");
    } catch(err) { handleApiError(err,toast); } finally { setLoading(false); }
  };

  return (
    <div style={{ padding:28, overflowY:"auto", flex:1 }}>
      {/* Tabs */}
      <div style={{ display:"flex", gap:8, marginBottom:24, flexWrap:"wrap" }}>
        {[
          { v:"EN_ATTENTE_ACCEPTATION", l:"À accepter" },
          { v:"EN_PRÉPARATION",         l:"En préparation" },
          { v:"EN_ATTENTE_LIVRAISON",   l:"Prêtes" },
          { v:"ALL",                    l:"Toutes" },
        ].map(f => (
          <button key={f.v} onClick={()=>setFilter(f.v)}
            style={{ padding:"6px 14px", borderRadius:20, border:`1px solid ${filter===f.v?C.gold:C.goldBorder}`,
              background:filter===f.v?C.goldFaint:"transparent", color:filter===f.v?C.goldL:C.muted,
              fontSize:12, fontFamily:"'Raleway',sans-serif", cursor:"pointer", transition:"all .2s",
              display:"flex", alignItems:"center", gap:6 }}>
            {f.l}
            {f.v!=="ALL" && countFor(f.v)>0 && (
              <span style={{ background:f.v==="EN_ATTENTE_ACCEPTATION"?C.warning:f.v==="EN_ATTENTE_LIVRAISON"?C.gold:C.info, color:"#000", borderRadius:10, padding:"0 6px", fontSize:10, fontWeight:700, lineHeight:"16px" }}>
                {countFor(f.v)}
              </span>
            )}
          </button>
        ))}
      </div>

      {visible.length === 0 ? <Empty icon="👨‍🍳" text="Aucune commande"/> : (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))", gap:14 }}>
          {visible.map((o,i) => {
            const ost = ORDER_STATUS[o.status];
            return (
              <Card key={o.id} className="anim-fadeUp" style={{ padding:0, overflow:"hidden", animationDelay:`${i*45}ms` }}>
                <div style={{ height:3, background:ost?.color||C.gold }}/>
                <div style={{ padding:18 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", marginBottom:12 }}>
                    <div>
                      <div className="serif" style={{ fontSize:17, color:C.cream }}>{o.id}</div>
                      <div style={{ fontSize:12, color:C.muted, marginTop:2 }}>Table {o.tableNum} · {timeAgo(o.createdAt)}</div>
                    </div>
                    <Badge color={ost?.color}>{ost?.label}</Badge>
                  </div>
                  <div style={{ display:"flex", flexDirection:"column", gap:5, marginBottom:14 }}>
                    {o.items?.map((item,j) => (
                      <div key={j} style={{ display:"flex", justifyContent:"space-between", background:C.bg3, borderRadius:7, padding:"7px 10px" }}>
                        <span style={{ fontSize:13, color:C.cream }}>{item.nom}</span>
                        <span style={{ fontSize:12, color:C.gold, fontWeight:700 }}>×{item.qte}</span>
                      </div>
                    ))}
                  </div>
                  {o.obs && <div style={{ fontSize:11, color:C.mutedL, fontStyle:"italic", marginBottom:10, padding:"6px 10px", background:C.bg3, borderRadius:7 }}>📝 {o.obs}</div>}
                  <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                    {o.status==="EN_ATTENTE_ACCEPTATION" && (
                      <>
                        <Btn small variant="success" loading={loading} onClick={()=>doAccept(o.id)}>✓ Accepter</Btn>
                        <Btn small variant="danger"  onClick={()=>setRejectId(o.id)}>✕ Refuser</Btn>
                      </>
                    )}
                    {o.status==="EN_PRÉPARATION" && (
                      <>
                        <Btn small variant="gold"  loading={loading} onClick={()=>doReady(o.id)} style={{ background:C.goldFaint, color:C.goldL, border:`1px solid ${C.goldBorder}` }}>Marquer prête</Btn>
                        <Btn small variant="ghost" onClick={()=>setStockReqId(o.id)}>📦 Demander stock</Btn>
                      </>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Modal open={!!rejectId} onClose={()=>{setRejectId(null);setMotifRefus("");}} title="Refuser la commande">
        <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
          <Input label="Motif de refus" value={motifRefus} onChange={setMotifRefus} placeholder="Ex: Ingrédient manquant…" required textarea/>
          <div style={{ display:"flex", gap:10, justifyContent:"flex-end" }}>
            <Btn variant="ghost" onClick={()=>setRejectId(null)}>Annuler</Btn>
            <Btn variant="danger" loading={loading} onClick={doReject} disabled={!motifRefus}>Confirmer le refus</Btn>
          </div>
        </div>
      </Modal>

      <Modal open={!!stockReqId} onClose={()=>{setStockReqId(null);setStockItems([]);}} title="Demande de sortie de stock" width={520}>
        <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
          <p style={{ fontSize:12, color:C.muted }}>Sélectionnez les produits nécessaires pour cette commande.</p>
          <div style={{ maxHeight:220, overflowY:"auto", display:"flex", flexDirection:"column", gap:6 }}>
            {products.map(p => {
              const sel = stockItems.find(s=>s.id===p.id);
              return (
                <div key={p.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", background:C.bg3, borderRadius:8, padding:"8px 12px" }}>
                  <div>
                    <div style={{ fontSize:12, color:C.cream }}>{p.nom}</div>
                    <div style={{ fontSize:10, color:C.muted }}>{p.qte} {p.unite} disponible</div>
                  </div>
                  {sel ? (
                    <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                      <input type="number" value={sel.qte} min="0.1" step="0.1" max={p.qte}
                        onChange={e=>setStockItems(p=>p.map(s=>s.id===sel.id?{...s,qte:Number(e.target.value)}:s))}
                        style={{ width:60,background:C.bg4,border:`1px solid ${C.goldBorder}`,borderRadius:6,padding:"3px 7px",color:C.cream,fontSize:12 }}/>
                      <span style={{ fontSize:10, color:C.muted }}>{p.unite}</span>
                      <Btn small variant="danger" onClick={()=>setStockItems(p=>p.filter(s=>s.id!==sel.id))}>✕</Btn>
                    </div>
                  ) : (
                    <Btn small variant="outline" onClick={()=>setStockItems(p=>[...p,{id:p.id,nom:p.nom,unite:p.unite,qte:1}])}>+ Ajouter</Btn>
                  )}
                </div>
              );
            })}
          </div>
          <div style={{ display:"flex", gap:10, justifyContent:"flex-end" }}>
            <Btn variant="ghost" onClick={()=>setStockReqId(null)}>Annuler</Btn>
            <Btn loading={loading} onClick={submitStockReq} disabled={!stockItems.length}>Envoyer la demande</Btn>
          </div>
        </div>
      </Modal>
    </div>
  );
};

/* ══════════════════════════════════════════════════════════
   STOCK SCREEN
   ══════════════════════════════════════════════════════════ */
const StockScreen = ({ products, setProducts, movements, setMovements, role, toast }) => {
  const [search, setSearch]   = useState("");
  const [filter, setFilter]   = useState("ALL");
  const [showAdd, setShowAdd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ nom:"", categorie:"", qte:"", unite:"kg", seuil:"", peremption:"", description:"" });

  const categories = useMemo(() => ["ALL", ...new Set(products.map(p=>p.categorie))], [products]);
  const filtered   = products.filter(p =>
    (filter==="ALL" || p.categorie===filter) &&
    p.nom.toLowerCase().includes(search.toLowerCase())
  );

  const addProduct = async () => {
    if (!form.nom || !form.qte) { toast.warning("","Nom et quantité requis"); return; }
    setLoading(true);
    try {
      const newP = await productsService.create({ nom:form.nom, categorie:form.categorie||"Divers", qte:Number(form.qte), unite:form.unite, seuil:Number(form.seuil)||0, peremption:form.peremption||"2026-12-31", description:form.description });
      setProducts(p=>[...p, newP]);
      setForm({ nom:"", categorie:"", qte:"", unite:"kg", seuil:"", peremption:"", description:"" });
      setShowAdd(false);
      toast.success("Produit ajouté",newP.nom);
    } catch(err) { handleApiError(err,toast); } finally { setLoading(false); }
  };

  const validateMvt = async (mvtId) => {
    const mvt = movements.find(m=>m.id===mvtId);
    if (!mvt) return;
    setLoading(true);
    try {
      await movementsService.validate(mvtId);
      setMovements(p=>p.map(m=>m.id===mvtId?{...m,statut:"VALIDÉE"}:m));
      setProducts(p=>p.map(prod=>{
        if (prod.id!==mvt.produitId) return prod;
        return { ...prod, qte: mvt.type==="ENTRÉE" ? prod.qte+mvt.qte : Math.max(0,prod.qte-mvt.qte) };
      }));
      toast.success("Mouvement validé","Stock mis à jour");
    } catch(err) { handleApiError(err,toast); } finally { setLoading(false); }
  };

  const rejectMvt = async (mvtId) => {
    setLoading(true);
    try {
      await movementsService.reject(mvtId,"Rejeté par le manager");
      setMovements(p=>p.map(m=>m.id===mvtId?{...m,statut:"REJETÉE"}:m));
      toast.error("Mouvement rejeté","");
    } catch(err) { handleApiError(err,toast); } finally { setLoading(false); }
  };

  return (
    <div style={{ padding:28, overflowY:"auto", flex:1 }}>
      {/* Controls */}
      <div style={{ display:"flex", gap:10, marginBottom:22, flexWrap:"wrap", alignItems:"center" }}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍 Rechercher un produit…"
          style={{ background:C.bg2, border:`1px solid rgba(255,255,255,0.08)`, borderRadius:8,
            padding:"8px 14px", color:C.cream, fontSize:13, width:240, fontFamily:"'Raleway',sans-serif" }}/>
        <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
          {categories.map(cat => (
            <button key={cat} onClick={()=>setFilter(cat)}
              style={{ padding:"5px 12px", borderRadius:20, border:`1px solid ${filter===cat?C.gold:C.goldBorder}`,
                background:filter===cat?C.goldFaint:"transparent", color:filter===cat?C.goldL:C.muted,
                fontSize:11, fontFamily:"'Raleway',sans-serif", cursor:"pointer" }}>
              {cat==="ALL"?"Toutes catégories":cat}
            </button>
          ))}
        </div>
        {["gestionnaire","gerant","admin"].includes(role) && (
          <div style={{ marginLeft:"auto" }}>
            <Btn variant="outline" onClick={()=>setShowAdd(true)}>+ Nouveau produit</Btn>
          </div>
        )}
      </div>

      {/* Products grid */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(240px,1fr))", gap:12, marginBottom:28 }}>
        {filtered.map((p,i) => {
          const low = p.qte < p.seuil;
          const exp = new Date(p.peremption) < new Date(Date.now()+4*86400000);
          const pct = Math.min(100, p.seuil > 0 ? (p.qte / (p.seuil * 3)) * 100 : 80);
          return (
            <Card key={p.id} className="anim-fadeUp"
              style={{ padding:16, animationDelay:`${i*25}ms`, border:`1px solid ${low?C.dangerBdr:exp?C.warningBdr:"rgba(255,255,255,0.06)"}` }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:10 }}>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:13, fontWeight:700, color:C.cream }} className="truncate">{p.nom}</div>
                  <div style={{ fontSize:10, color:C.muted, marginTop:2 }}>{p.categorie}</div>
                </div>
                {(low||exp) && <Badge color={low?C.danger:C.warning} style={{ fontSize:9, marginLeft:8 }}>{low?"⚠ Faible":"⏰ Expiration"}</Badge>}
              </div>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6, alignItems:"baseline" }}>
                <span className="serif" style={{ fontSize:20, fontWeight:700, color:low?C.danger:C.cream }}>{p.qte}<span style={{ fontSize:11, color:C.muted, fontFamily:"'Raleway',sans-serif", fontWeight:400 }}> {p.unite}</span></span>
                <span style={{ fontSize:10, color:C.muted }}>seuil: {p.seuil}</span>
              </div>
              <div style={{ height:4, background:C.bg4, borderRadius:3, marginBottom:8, overflow:"hidden" }}>
                <div style={{ height:"100%", width:`${pct}%`, background:low?C.danger:exp?C.warning:C.success, borderRadius:3, transition:"width .5s" }}/>
              </div>
              <div style={{ fontSize:10, color:exp?C.danger:C.muted }}>
                Péremption: {new Date(p.peremption).toLocaleDateString("fr-FR")}
              </div>
            </Card>
          );
        })}
      </div>

      {/* Pending validations (manager/admin) */}
      {["manager","admin"].includes(role) && (
        <>
          <Divider label="Mouvements en attente de validation" style={{ marginBottom:14 }}/>
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            {movements.filter(m=>m.statut==="EN_ATTENTE").map((m,i) => {
              const meta = MVT_TYPE_META[m.type];
              return (
                <Card key={m.id} className="anim-fadeUp" style={{ padding:"14px 18px", animationDelay:`${i*30}ms`, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <div style={{ display:"flex", gap:12, alignItems:"center" }}>
                    <div style={{ width:38, height:38, borderRadius:9, background:`${meta?.color}18`, border:`1px solid ${meta?.color}40`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:16 }}>{meta?.icon}</div>
                    <div>
                      <div style={{ display:"flex", gap:8, alignItems:"center", marginBottom:3 }}>
                        <Badge color={meta?.color}>{m.type}</Badge>
                        <span style={{ fontSize:13, fontWeight:600, color:C.cream }}>{m.produit}</span>
                        <span style={{ fontSize:12, color:C.muted }}>— {m.qte} unités</span>
                      </div>
                      <div style={{ fontSize:11, color:C.muted }}>{m.justification} · {m.auteur}</div>
                    </div>
                  </div>
                  <div style={{ display:"flex", gap:8, flexShrink:0 }}>
                    <Btn small variant="success" loading={loading} onClick={()=>validateMvt(m.id)}>✓ Valider</Btn>
                    <Btn small variant="danger"  loading={loading} onClick={()=>rejectMvt(m.id)}>Rejeter</Btn>
                  </div>
                </Card>
              );
            })}
            {movements.filter(m=>m.statut==="EN_ATTENTE").length===0 && (
              <div style={{ textAlign:"center", color:C.success, fontSize:13, padding:20 }}>✓ Aucun mouvement en attente</div>
            )}
          </div>
        </>
      )}

      <Modal open={showAdd} onClose={()=>setShowAdd(false)} title="Nouveau produit en stock">
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
          <div style={{ gridColumn:"1/-1" }}>
            <Input label="Nom du produit" value={form.nom} onChange={v=>setForm(f=>({...f,nom:v}))} required/>
          </div>
          <Input label="Catégorie" value={form.categorie} onChange={v=>setForm(f=>({...f,categorie:v}))} placeholder="Ex: Viandes"/>
          <Select label="Unité" value={form.unite} onChange={v=>setForm(f=>({...f,unite:v}))}
            options={["kg","g","L","ml","pcs","boîte","sachet"].map(u=>({value:u,label:u}))}/>
          <Input label="Quantité initiale" type="number" value={form.qte} onChange={v=>setForm(f=>({...f,qte:v}))} required min="0"/>
          <Input label="Seuil d'alerte" type="number" value={form.seuil} onChange={v=>setForm(f=>({...f,seuil:v}))} min="0"/>
          <div style={{ gridColumn:"1/-1" }}>
            <Input label="Date de péremption" type="date" value={form.peremption} onChange={v=>setForm(f=>({...f,peremption:v}))}/>
          </div>
          <div style={{ gridColumn:"1/-1", display:"flex", gap:10, justifyContent:"flex-end" }}>
            <Btn variant="ghost" onClick={()=>setShowAdd(false)}>Annuler</Btn>
            <Btn loading={loading} onClick={addProduct}>Ajouter au stock</Btn>
          </div>
        </div>
      </Modal>
    </div>
  );
};

/* ══════════════════════════════════════════════════════════
   STOCK ENTRIES SCREEN
   ══════════════════════════════════════════════════════════ */
const StockEntriesScreen = ({ products, movements, setMovements, role, toast }) => {
  const [showForm, setShowForm] = useState(false);
  const [fournisseur, setFournisseur] = useState("");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!fournisseur || !items.length) { toast.warning("","Fournisseur et produits requis"); return; }
    setLoading(true);
    try {
      for (const item of items) {
        const mvt = await movementsService.create({ produit_id:item.id, type:"ENTRÉE", qte:item.qte, justification:`Livraison ${fournisseur}` });
        setMovements(p=>[{ ...mvt, produitId:item.id, produit:item.nom, type:"ENTRÉE", qte:item.qte, statut:"EN_ATTENTE", justification:`Livraison ${fournisseur}`, auteur:"Utilisateur courant", date:now() },...p]);
      }
      setFournisseur(""); setItems([]); setShowForm(false);
      toast.success("Entrée enregistrée","Manager notifié pour validation");
    } catch(err) { handleApiError(err,toast); } finally { setLoading(false); }
  };

  const entries = movements.filter(m=>m.type==="ENTRÉE");

  return (
    <div style={{ padding:28, overflowY:"auto", flex:1 }}>
      <div style={{ display:"flex", justifyContent:"flex-end", marginBottom:20 }}>
        <Btn onClick={()=>setShowForm(true)}>+ Enregistrer une entrée</Btn>
      </div>
      <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
        {entries.map((m,i) => {
          const stMeta = MVT_STATUS_META[m.statut];
          return (
            <Card key={m.id} className="anim-fadeUp" style={{ padding:"14px 18px", animationDelay:`${i*35}ms` }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <div>
                  <div style={{ display:"flex", gap:8, alignItems:"center", marginBottom:4 }}>
                    <span style={{ fontSize:12, fontWeight:700, color:C.mutedL }}>{m.id}</span>
                    <Badge color={stMeta?.color}>{stMeta?.label}</Badge>
                  </div>
                  <div style={{ fontSize:14, fontWeight:600, color:C.cream }}>{m.produit} — <span style={{ fontWeight:400, color:C.muted }}>{m.qte} unités</span></div>
                  <div style={{ fontSize:11, color:C.muted, marginTop:2 }}>{m.justification} · {m.auteur} · {new Date(m.date).toLocaleString("fr-FR")}</div>
                </div>
              </div>
            </Card>
          );
        })}
        {entries.length === 0 && <Empty icon="📥" text="Aucune entrée de stock"/>}
      </div>

      <Modal open={showForm} onClose={()=>{setShowForm(false);setItems([]);setFournisseur("");}} title="Enregistrer une entrée de stock" width={540}>
        <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
          <Input label="Fournisseur" value={fournisseur} onChange={setFournisseur} placeholder="Nom du fournisseur" required/>
          <div>
            <div style={{ fontSize:11, color:C.muted, letterSpacing:1.2, textTransform:"uppercase", marginBottom:8 }}>Produits reçus</div>
            <div style={{ maxHeight:210, overflowY:"auto", display:"flex", flexDirection:"column", gap:6 }}>
              {products.map(p => {
                const sel = items.find(i=>i.id===p.id);
                return (
                  <div key={p.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", background:C.bg3, borderRadius:8, padding:"8px 12px" }}>
                    <div>
                      <span style={{ fontSize:12, color:C.cream }}>{p.nom}</span>
                      <span style={{ fontSize:10, color:C.muted, marginLeft:6 }}>stock actuel: {p.qte}{p.unite}</span>
                    </div>
                    {sel ? (
                      <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                        <input type="number" value={sel.qte} min="0.1" step="0.1"
                          onChange={e=>setItems(prev=>prev.map(i=>i.id===p.id?{...i,qte:Number(e.target.value)}:i))}
                          style={{ width:60,background:C.bg4,border:`1px solid ${C.goldBorder}`,borderRadius:6,padding:"3px 7px",color:C.cream,fontSize:12 }}/>
                        <span style={{ fontSize:10, color:C.muted }}>{p.unite}</span>
                        <Btn small variant="danger" onClick={()=>setItems(prev=>prev.filter(i=>i.id!==p.id))}>✕</Btn>
                      </div>
                    ) : <Btn small variant="outline" onClick={()=>setItems(prev=>[...prev,{id:p.id,nom:p.nom,unite:p.unite,qte:1}])}>+ Ajouter</Btn>}
                  </div>
                );
              })}
            </div>
          </div>
          <div style={{ display:"flex", gap:10, justifyContent:"flex-end" }}>
            <Btn variant="ghost" onClick={()=>setShowForm(false)}>Annuler</Btn>
            <Btn loading={loading} onClick={submit} disabled={!fournisseur||!items.length}>Enregistrer</Btn>
          </div>
        </div>
      </Modal>
    </div>
  );
};

/* ══════════════════════════════════════════════════════════
   STOCK EXITS + HISTORY + VALIDATE (shared movements view)
   ══════════════════════════════════════════════════════════ */
const MovementsScreen = ({ movements, setMovements, products, role, toast, typeFilter: defaultType="ALL" }) => {
  const [showForm, setShowForm] = useState(false);
  const [typeF, setTypeF] = useState(defaultType);
  const [exitItem, setExitItem] = useState("");
  const [motif, setMotif] = useState("");
  const [qte, setQte] = useState("1");
  const [loading, setLoading] = useState(false);

  const visible = typeF==="ALL" ? movements : movements.filter(m=>m.type===typeF);

  const submit = async () => {
    if (!exitItem || !motif) { toast.warning("","Produit et motif requis"); return; }
    setLoading(true);
    try {
      const prod = products.find(p=>String(p.id)===String(exitItem));
      const mvt = await movementsService.create({ produit_id:exitItem, type:"SUPPRESSION", qte:Number(qte), justification:motif });
      setMovements(p=>[{ ...mvt, produitId:exitItem, produit:prod?.nom||"?", type:"SUPPRESSION", qte:Number(qte), statut:"EN_ATTENTE", justification:motif, auteur:"Utilisateur courant", date:now() },...p]);
      setExitItem(""); setMotif(""); setQte("1"); setShowForm(false);
      toast.success("Sortie soumise","Manager notifié pour validation");
    } catch(err) { handleApiError(err,toast); } finally { setLoading(false); }
  };

  return (
    <div style={{ padding:28, overflowY:"auto", flex:1 }}>
      <div style={{ display:"flex", gap:8, marginBottom:20, flexWrap:"wrap", alignItems:"center" }}>
        {["ALL","ENTRÉE","SORTIE","SUPPRESSION"].map(t => (
          <button key={t} onClick={()=>setTypeF(t)}
            style={{ padding:"5px 13px", borderRadius:20, border:`1px solid ${typeF===t?C.gold:C.goldBorder}`,
              background:typeF===t?C.goldFaint:"transparent", color:typeF===t?C.goldL:C.muted,
              fontSize:12, fontFamily:"'Raleway',sans-serif", cursor:"pointer" }}>
            {t==="ALL"?"Tous les mouvements":t}
          </button>
        ))}
        {["gestionnaire","gerant","admin"].includes(role) && (
          <Btn variant="outline" small onClick={()=>setShowForm(true)} style={{ marginLeft:"auto" }}>+ Initier une sortie</Btn>
        )}
      </div>

      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        {visible.map((m,i) => {
          const meta   = MVT_TYPE_META[m.type];
          const stMeta = MVT_STATUS_META[m.statut];
          return (
            <Card key={m.id} className="anim-fadeUp" style={{ padding:"12px 18px", animationDelay:`${i*25}ms`, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <div style={{ display:"flex", gap:12, alignItems:"center" }}>
                <div style={{ width:38, height:38, borderRadius:9, background:`${meta?.color}15`, border:`1px solid ${meta?.color}35`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:16 }}>{meta?.icon}</div>
                <div>
                  <div style={{ fontSize:13, fontWeight:600, color:C.cream }}>{m.produit} <span style={{ color:C.muted, fontWeight:400 }}>— {m.qte} unités</span></div>
                  <div style={{ fontSize:11, color:C.muted, marginTop:2 }}>{m.justification} · {m.auteur}</div>
                </div>
              </div>
              <div style={{ textAlign:"right", flexShrink:0 }}>
                <Badge color={stMeta?.color}>{stMeta?.label}</Badge>
                <div style={{ fontSize:10, color:C.muted, marginTop:4 }}>{new Date(m.date).toLocaleString("fr-FR")}</div>
              </div>
            </Card>
          );
        })}
        {visible.length === 0 && <Empty icon="📜" text="Aucun mouvement"/>}
      </div>

      <Modal open={showForm} onClose={()=>setShowForm(false)} title="Initier une sortie de stock">
        <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
          <Select label="Produit" value={exitItem} onChange={setExitItem} required
            options={[{value:"",label:"-- Sélectionner un produit --"}, ...products.map(p=>({value:String(p.id),label:`${p.nom} (${p.qte} ${p.unite} dispo.)`}))]}/>
          <Input label="Quantité" type="number" value={qte} onChange={setQte} min="0.1" step="0.1"/>
          <Select label="Motif de sortie" value={motif} onChange={setMotif} required
            options={[{value:"",label:"-- Sélectionner un motif --"},{value:"Périmé",label:"Périmé"},{value:"Détérioré",label:"Détérioré"},{value:"Cassé",label:"Cassé"},{value:"Contaminé",label:"Contaminé"},{value:"Autre",label:"Autre"}]}/>
          <div style={{ display:"flex", gap:10, justifyContent:"flex-end" }}>
            <Btn variant="ghost" onClick={()=>setShowForm(false)}>Annuler</Btn>
            <Btn variant="danger" loading={loading} onClick={submit} disabled={!exitItem||!motif}>Soumettre la sortie</Btn>
          </div>
        </div>
      </Modal>
    </div>
  );
};

/* ══════════════════════════════════════════════════════════
   INVOICES SCREEN
   ══════════════════════════════════════════════════════════ */
const InvoicesScreen = ({ toast }) => {
  const [invoices, setInvoices] = useState(MOCK_INVOICES);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    invoicesService.list().then(data => { if(data) setInvoices(data); }).catch(()=>{}).finally(()=>setLoading(false));
  }, []);

  const filtered = invoices.filter(inv => inv.id.toLowerCase().includes(search.toLowerCase()) || inv.tableNum.includes(search));

  const dlPDF = async (inv) => {
    try {
      await invoicesService.downloadPdf(inv.id, `facture-${inv.id}.pdf`);
    } catch(err) { toast.warning("PDF", err.message); }
  };

  return (
    <div style={{ padding:28, overflowY:"auto", flex:1 }}>
      <div style={{ marginBottom:20 }}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍 Référence ou numéro de table…"
          style={{ background:C.bg2, border:`1px solid rgba(255,255,255,0.08)`, borderRadius:8,
            padding:"8px 14px", color:C.cream, fontSize:13, width:320, fontFamily:"'Raleway',sans-serif" }}/>
      </div>
      {loading ? <Spinner/> : (
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          {filtered.map((inv,i) => (
            <Card key={inv.id} className="anim-fadeUp hover-lift" style={{ padding:"18px 22px", animationDelay:`${i*45}ms` }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                <div>
                  <div style={{ display:"flex", gap:10, alignItems:"center", marginBottom:6 }}>
                    <span className="serif" style={{ fontSize:15, color:C.goldL }}>{inv.id}</span>
                    <Badge color={C.success}>Réglée</Badge>
                  </div>
                  <div style={{ fontSize:12, color:C.muted }}>Table {inv.tableNum} · {new Date(inv.date).toLocaleString("fr-FR")}</div>
                  <div style={{ fontSize:12, color:C.muted, marginTop:3 }}>
                    {inv.mode}{inv.pourboire>0 && ` · Pourboire: ${fmt(inv.pourboire)}`}
                  </div>
                </div>
                <div style={{ textAlign:"right" }}>
                  <div className="serif" style={{ fontSize:24, fontWeight:700, color:C.goldL }}>{fmt(inv.montant)}</div>
                  <div style={{ display:"flex", gap:6, marginTop:10, justifyContent:"flex-end" }}>
                    <Btn small variant="ghost" onClick={()=>dlPDF(inv)}>PDF ↓</Btn>
                    <Btn small variant="outline">Réimprimer</Btn>
                  </div>
                </div>
              </div>
            </Card>
          ))}
          {filtered.length === 0 && <Empty icon="🧾" text="Aucune facture trouvée"/>}
        </div>
      )}
    </div>
  );
};

/* ══════════════════════════════════════════════════════════
   REPORTS SCREEN
   ══════════════════════════════════════════════════════════ */
const ReportsScreen = ({ orders, products, movements, invoices, toast }) => {
  const totalRevenu = invoices.reduce((s,i)=>s+i.montant,0);
  const avgOrder    = orders.length ? Math.round(orders.reduce((s,o)=>s+(o.montant||0),0)/orders.length) : 0;

  const doExport = async (type, format) => {
    try {
      await reportsService.export(type, format);
    } catch(err) { toast.warning("Export",err.message); }
  };

  return (
    <div style={{ padding:28, overflowY:"auto", flex:1 }}>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))", gap:14, marginBottom:28 }}>
        <StatCard label="Chiffre d'affaires"   value={fmt(totalRevenu)}  icon="💰" color={C.gold}    sub="Factures réglées"/>
        <StatCard label="Commandes traitées"   value={orders.length}    icon="📋" color={C.info}    sub={`Moy: ${fmt(avgOrder)}`}/>
        <StatCard label="Entrées de stock"     value={movements.filter(m=>m.type==="ENTRÉE").length}      icon="📥" color={C.success}/>
        <StatCard label="Sorties de stock"     value={movements.filter(m=>m.type!=="ENTRÉE").length}      icon="📤" color={C.warning}/>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:18, marginBottom:18 }}>
        {/* Orders by status */}
        <Card style={{ padding:22 }}>
          <h3 className="serif" style={{ fontSize:16, color:C.cream, marginBottom:18 }}>Statut des commandes</h3>
          {Object.entries(ORDER_STATUS).map(([k,v]) => {
            const count = orders.filter(o=>o.status===k).length;
            const pct   = orders.length ? Math.round((count/orders.length)*100) : 0;
            return (
              <div key={k} style={{ marginBottom:12 }}>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                  <span style={{ fontSize:12, color:C.mutedL }}>{v.label}</span>
                  <span style={{ fontSize:12, fontWeight:700, color:v.color }}>{count}</span>
                </div>
                <div style={{ height:4, background:C.bg4, borderRadius:3 }}>
                  <div style={{ height:"100%", width:`${pct}%`, background:v.color, borderRadius:3 }}/>
                </div>
              </div>
            );
          })}
        </Card>

        {/* Top products */}
        <Card style={{ padding:22 }}>
          <h3 className="serif" style={{ fontSize:16, color:C.cream, marginBottom:18 }}>État des stocks (Top 6)</h3>
          {[...products].sort((a,b)=>b.qte-a.qte).slice(0,6).map((p,i) => (
            <div key={p.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10, padding:"7px 10px", background:C.bg3, borderRadius:8 }}>
              <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                <span style={{ fontSize:11, color:C.muted, width:16 }}>{i+1}.</span>
                <span style={{ fontSize:12, color:C.cream }} className="truncate">{p.nom}</span>
              </div>
              <span style={{ fontWeight:700, color:p.qte<p.seuil?C.danger:C.cream, fontSize:13, flexShrink:0, marginLeft:8 }}>{p.qte} {p.unite}</span>
            </div>
          ))}
        </Card>
      </div>

      {/* Export panel */}
      <Card style={{ padding:22 }}>
        <h3 className="serif" style={{ fontSize:16, color:C.cream, marginBottom:16 }}>Exporter les données</h3>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))", gap:12 }}>
          {[
            { label:"Commandes",    type:"orders",   icon:"📋" },
            { label:"Stock",        type:"stock",    icon:"📦" },
            { label:"Factures",     type:"invoices", icon:"🧾" },
            { label:"Mouvements",   type:"movements",icon:"📜" },
          ].map(item => (
            <Card key={item.type} style={{ padding:16 }}>
              <div style={{ fontSize:20, marginBottom:8 }}>{item.icon}</div>
              <div style={{ fontSize:13, fontWeight:600, color:C.cream, marginBottom:12 }}>Rapport {item.label}</div>
              <div style={{ display:"flex", gap:6 }}>
                {["CSV","Excel","PDF"].map(fmt2 => (
                  <Btn key={fmt2} small variant="ghost" onClick={()=>doExport(item.type,fmt2.toLowerCase())}>{fmt2}</Btn>
                ))}
              </div>
            </Card>
          ))}
        </div>
      </Card>
    </div>
  );
};

/* ══════════════════════════════════════════════════════════
   TEAM SCREEN
   ══════════════════════════════════════════════════════════ */
const TeamScreen = ({ role, toast }) => {
  const [users, setUsers]     = useState(MOCK_USERS);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ firstName:"", lastName:"", login:"", role:"serveur" });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    usersService.list().then(data => { if(data) setUsers(data); }).catch(()=>{});
  }, []);

  const addUser = async () => {
    if (!form.firstName || !form.login) { toast.warning("","Prénom et login requis"); return; }
    setLoading(true);
    try {
      const newU = await usersService.create({ first_name:form.firstName, last_name:form.lastName, login:form.login, role:form.role });
      setUsers(p=>[...p, { ...newU, firstName:form.firstName, lastName:form.lastName, isActive:true }]);
      setForm({ firstName:"", lastName:"", login:"", role:"serveur" });
      setShowAdd(false);
      toast.success("Utilisateur créé",`${form.firstName} ${form.lastName} — ${ROLES[form.role]}`);
    } catch(err) { handleApiError(err,toast); } finally { setLoading(false); }
  };

  const toggleUser = async (id) => {
    try {
      await usersService.toggle(id);
      setUsers(p=>p.map(u=>u.id===id?{...u,isActive:!u.isActive}:u));
    } catch(err) { handleApiError(err,toast); }
  };

  return (
    <div style={{ padding:28, overflowY:"auto", flex:1 }}>
      {["admin","manager"].includes(role) && (
        <div style={{ display:"flex", justifyContent:"flex-end", marginBottom:20 }}>
          <Btn onClick={()=>setShowAdd(true)}>+ Ajouter un utilisateur</Btn>
        </div>
      )}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))", gap:12 }}>
        {users.map((u,i) => {
          const color = ROLE_COLORS[u.role] || C.gold;
          return (
            <Card key={u.id} className="anim-fadeUp" style={{ padding:18, animationDelay:`${i*35}ms` }}>
              <div style={{ display:"flex", gap:14, alignItems:"center" }}>
                <div style={{ width:46, height:46, borderRadius:12, background:`${color}22`, border:`1px solid ${color}45`,
                  display:"flex", alignItems:"center", justifyContent:"center", fontSize:15, fontWeight:700, color, flexShrink:0 }}>
                  {u.firstName?.[0]}{u.lastName?.[0]}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:14, fontWeight:600, color:C.cream }} className="truncate">{u.firstName} {u.lastName}</div>
                  <div style={{ fontSize:11, color:C.muted, marginTop:2 }}>{u.login}</div>
                  <div style={{ marginTop:5 }}>
                    <Badge color={color}>{ROLES[u.role]||u.role}</Badge>
                  </div>
                </div>
                <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:6 }}>
                  <Dot color={u.isActive?C.success:C.danger}/>
                  {["admin","manager"].includes(role) && (
                    <button onClick={()=>toggleUser(u.id)} style={{ background:"none",border:"none",color:C.muted,fontSize:11,cursor:"pointer",transition:"color .2s" }} className="hover-gold">
                      {u.isActive?"Désactiver":"Activer"}
                    </button>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <Modal open={showAdd} onClose={()=>setShowAdd(false)} title="Nouvel utilisateur">
        <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            <Input label="Prénom" value={form.firstName} onChange={v=>setForm(f=>({...f,firstName:v}))} required/>
            <Input label="Nom"    value={form.lastName}  onChange={v=>setForm(f=>({...f,lastName:v}))}/>
          </div>
          <Input label="Identifiant de connexion" value={form.login} onChange={v=>setForm(f=>({...f,login:v}))} placeholder="prenom.nom" required/>
          <Select label="Rôle" value={form.role} onChange={v=>setForm(f=>({...f,role:v}))}
            options={Object.entries(ROLES).map(([v,l])=>({value:v,label:l}))}/>
          <div style={{ background:C.infoBg, border:`1px solid ${C.infoBdr}`, borderRadius:8, padding:"8px 12px", fontSize:12, color:C.info }}>
            ℹ Le mot de passe par défaut sera envoyé par e-mail à l'utilisateur.
          </div>
          <div style={{ display:"flex", gap:10, justifyContent:"flex-end" }}>
            <Btn variant="ghost" onClick={()=>setShowAdd(false)}>Annuler</Btn>
            <Btn loading={loading} onClick={addUser} disabled={!form.firstName||!form.login}>Créer le compte</Btn>
          </div>
        </div>
      </Modal>
    </div>
  );
};

/* ══════════════════════════════════════════════════════════
   AUDIT SCREEN
   ══════════════════════════════════════════════════════════ */
const AuditScreen = ({ toast }) => {
  const [logs, setLogs]     = useState(MOCK_AUDIT);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    auditService.list().then(data => { if(data) setLogs(data); }).catch(()=>{}).finally(()=>setLoading(false));
  }, []);

  const doExport = async (format) => {
    try { await auditService.export(format); }
    catch(err) { toast.warning("Export",err.message); }
  };

  const filtered = logs.filter(l =>
    l.user.toLowerCase().includes(search.toLowerCase()) ||
    l.action.toLowerCase().includes(search.toLowerCase()) ||
    l.details.toLowerCase().includes(search.toLowerCase())
  );

  const actionColors = {
    CONNEXION:C.info, VALIDATION_ENTRÉE:C.success, ACCEPTATION_COMMANDE:C.success,
    ENREGISTREMENT_PAIEMENT:C.gold, NOUVELLE_COMMANDE:C.info, ALERTE_STOCK:C.danger,
    REJET_ENTRÉE:C.danger, CRÉATION_UTILISATEUR:C.purple, ANNULATION_COMMANDE:C.warning,
    GÉNÉRATION_FACTURE:C.success,
  };

  return (
    <div style={{ padding:28, overflowY:"auto", flex:1 }}>
      <div style={{ display:"flex", gap:12, marginBottom:20, alignItems:"center" }}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍 Rechercher dans les logs…"
          style={{ background:C.bg2, border:`1px solid rgba(255,255,255,0.08)`, borderRadius:8,
            padding:"8px 14px", color:C.cream, fontSize:13, width:300, fontFamily:"'Raleway',sans-serif" }}/>
        <div style={{ marginLeft:"auto", display:"flex", gap:6 }}>
          {["CSV","Excel","TXT"].map(f => (
            <Btn key={f} small variant="ghost" onClick={()=>doExport(f.toLowerCase())}>{f}</Btn>
          ))}
        </div>
      </div>

      {loading ? <Spinner/> : (
        <Card style={{ overflow:"hidden" }}>
          <div style={{ overflowX:"auto" }}>
            <table style={{ width:"100%", borderCollapse:"collapse", minWidth:600 }}>
              <thead>
                <tr style={{ borderBottom:`1px solid rgba(255,255,255,0.06)` }}>
                  {["Date","Heure","Utilisateur","Action","Détails"].map(h => (
                    <th key={h} style={{ padding:"12px 16px", textAlign:"left", fontSize:10, fontWeight:700, color:C.muted, letterSpacing:1.5, textTransform:"uppercase", whiteSpace:"nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((l,i) => (
                  <tr key={l.id} className="anim-fadeIn" style={{ borderBottom:`1px solid rgba(255,255,255,0.04)`, animationDelay:`${i*15}ms` }}>
                    <td style={{ padding:"10px 16px", fontSize:12, color:C.muted, whiteSpace:"nowrap" }}>{l.date}</td>
                    <td style={{ padding:"10px 16px", fontSize:12, color:C.muted }}>{l.heure}</td>
                    <td style={{ padding:"10px 16px", fontSize:12, color:C.cream, fontWeight:500 }}>{l.user}</td>
                    <td style={{ padding:"10px 16px" }}>
                      <Badge color={actionColors[l.action]||C.mutedL} style={{ fontSize:10 }}>{l.action}</Badge>
                    </td>
                    <td style={{ padding:"10px 16px", fontSize:12, color:C.mutedL }}>{l.details}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filtered.length === 0 && <Empty icon="🔍" text="Aucun log correspondant"/>}
        </Card>
      )}
    </div>
  );
};

/* ══════════════════════════════════════════════════════════
   STATS SCREEN (Cuisinier)
   ══════════════════════════════════════════════════════════ */
const StatsScreen = ({ orders }) => {
  const mine  = orders.filter(o=>o.cuisinier==="Marco Houénou");
  const done  = mine.filter(o=>o.status==="LIVRÉE").length;
  const rate  = mine.length ? Math.round((done/mine.length)*100) : 0;
  return (
    <div style={{ padding:28, overflowY:"auto", flex:1 }}>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))", gap:14, marginBottom:24 }}>
        <StatCard label="Commandes traitées"  value={mine.length} icon="📋" color={C.info}    delay={0}/>
        <StatCard label="Livrées avec succès" value={done}        icon="✓"  color={C.success}  delay={60}/>
        <StatCard label="Taux de réussite"    value={`${rate}%`} icon="📈" color={rate>80?C.gold:C.warning} delay={120}/>
      </div>
      <Card style={{ padding:22 }}>
        <h3 className="serif" style={{ fontSize:16, color:C.cream, marginBottom:14 }}>Mes commandes récentes</h3>
        {mine.length === 0 ? <Empty icon="👨‍🍳" text="Aucune commande traitée"/> :
          mine.map(o => {
            const st = ORDER_STATUS[o.status];
            return (
              <div key={o.id} style={{ display:"flex", justifyContent:"space-between", padding:"10px 0", borderBottom:`1px solid rgba(255,255,255,0.05)` }}>
                <div>
                  <span style={{ fontSize:13, fontWeight:600, color:C.cream }}>{o.id}</span>
                  <span style={{ fontSize:12, color:C.muted }}> · Table {o.tableNum}</span>
                </div>
                <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                  <Badge color={st?.color}>{st?.label}</Badge>
                  <span style={{ fontSize:12, color:C.goldL }}>{fmt(o.montant)}</span>
                </div>
              </div>
            );
          })
        }
      </Card>
    </div>
  );
};

/* ══════════════════════════════════════════════════════════
   STOCK REQUEST SCREEN (Cuisinier)
   ══════════════════════════════════════════════════════════ */
const StockRequestScreen = ({ products, movements, setMovements, toast }) => {
  const [sel, setSel]       = useState("");
  const [qte, setQte]       = useState("1");
  const [justif, setJustif] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!sel || !justif) { toast.warning("","Sélectionnez un produit et justifiez la demande"); return; }
    setLoading(true);
    try {
      const prod = products.find(p=>String(p.id)===String(sel));
      const mvt = await movementsService.create({ produit_id:sel, type:"SORTIE", qte:Number(qte), justification:justif });
      setMovements(p=>[{ ...mvt, produitId:sel, produit:prod?.nom||"?", type:"SORTIE", qte:Number(qte), statut:"EN_ATTENTE", justification:justif, auteur:"Marco Houénou", date:now() },...p]);
      setSel(""); setQte("1"); setJustif("");
      toast.success("Demande soumise","Le gérant ou le gestionnaire va traiter votre demande");
    } catch(err) { handleApiError(err,toast); } finally { setLoading(false); }
  };

  const myReqs = movements.filter(m=>m.type==="SORTIE"&&m.auteur==="Marco Houénou");

  return (
    <div style={{ padding:28, overflowY:"auto", flex:1 }}>
      <Card style={{ padding:24, maxWidth:500, marginBottom:24 }}>
        <h3 className="serif" style={{ fontSize:17, color:C.goldL, marginBottom:18 }}>Demande de sortie de stock</h3>
        <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
          <Select label="Produit" value={sel} onChange={setSel} required
            options={[{value:"",label:"-- Sélectionner un produit --"},...products.map(p=>({value:String(p.id),label:`${p.nom} — ${p.qte} ${p.unite} dispo.`}))]}/>
          <Input label="Quantité demandée" type="number" value={qte} onChange={setQte} min="0.1" step="0.1"/>
          <Input label="Justification" value={justif} onChange={setJustif} placeholder="Ex: Pour la commande CMD-004…" required textarea/>
          <Btn loading={loading} onClick={submit} disabled={!sel||!justif}>Envoyer la demande</Btn>
        </div>
      </Card>

      <h4 style={{ color:C.muted, fontSize:11, letterSpacing:1.5, textTransform:"uppercase", marginBottom:12 }}>Mes demandes récentes</h4>
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        {myReqs.map(m => {
          const stMeta = MVT_STATUS_META[m.statut];
          return (
            <Card key={m.id} style={{ padding:"12px 16px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <div>
                <span style={{ fontSize:13, fontWeight:600, color:C.cream }}>{m.produit}</span>
                <span style={{ fontSize:12, color:C.muted }}> — {m.qte} unités</span>
                <div style={{ fontSize:11, color:C.muted, marginTop:2 }}>{m.justification}</div>
              </div>
              <Badge color={stMeta?.color}>{stMeta?.label}</Badge>
            </Card>
          );
        })}
        {myReqs.length === 0 && <Empty icon="📦" text="Aucune demande de stock"/>}
      </div>
    </div>
  );
};

/* ══════════════════════════════════════════════════════════
   ORDERS LIST SCREEN (general view)
   ══════════════════════════════════════════════════════════ */
const OrdersListScreen = ({ orders, setOrders, role, tables, toast }) => {
  const [statusF, setStatusF] = useState("ALL");
  const visible = statusF==="ALL" ? orders : orders.filter(o=>o.status===statusF);

  return (
    <div style={{ padding:28, overflowY:"auto", flex:1 }}>
      <div style={{ display:"flex", gap:8, marginBottom:24, flexWrap:"wrap" }}>
        {["ALL", ...Object.keys(ORDER_STATUS)].map(s => (
          <button key={s} onClick={()=>setStatusF(s)}
            style={{ padding:"5px 13px", borderRadius:20, border:`1px solid ${statusF===s?C.gold:C.goldBorder}`,
              background:statusF===s?C.goldFaint:"transparent", color:statusF===s?C.goldL:C.muted,
              fontSize:12, fontFamily:"'Raleway',sans-serif", cursor:"pointer" }}>
            {s==="ALL"?"Toutes":ORDER_STATUS[s]?.label}
          </button>
        ))}
      </div>
      <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
        {visible.map((o,i) => {
          const st = ORDER_STATUS[o.status];
          return (
            <Card key={o.id} className="anim-fadeUp" style={{ padding:"14px 18px", animationDelay:`${i*30}ms` }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                <div>
                  <div style={{ display:"flex", gap:8, alignItems:"center", marginBottom:6 }}>
                    <span style={{ fontSize:13, fontWeight:700, color:C.cream }}>{o.id}</span>
                    <Badge color={st?.color}>{st?.label}</Badge>
                    <span style={{ fontSize:11, color:C.muted }}>Table {o.tableNum}</span>
                  </div>
                  <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:6 }}>
                    {o.items?.map((item,j) => (
                      <div key={j} style={{ background:C.bg3, borderRadius:6, padding:"2px 8px", fontSize:11, color:C.mutedL }}>
                        {item.qte}× {item.nom}
                      </div>
                    ))}
                  </div>
                  {o.cuisinier && <div style={{ fontSize:11, color:C.muted }}>Cuisinier: {o.cuisinier}</div>}
                  {o.motif && <div style={{ fontSize:11, color:C.danger, marginTop:3 }}>Motif: {o.motif}</div>}
                </div>
                <div style={{ textAlign:"right", flexShrink:0 }}>
                  <div style={{ fontSize:14, fontWeight:700, color:C.goldL }}>{fmt(o.montant)}</div>
                  <div style={{ fontSize:10, color:C.muted, marginTop:4 }}>{timeAgo(o.createdAt)}</div>
                </div>
              </div>
            </Card>
          );
        })}
        {visible.length===0 && <Empty icon="📋" text="Aucune commande"/>}
      </div>
    </div>
  );
};

/* ══════════════════════════════════════════════════════════
   ROOT APP
   ══════════════════════════════════════════════════════════ */
export default function App() {
  useEffect(() => { injectGlobalCSS(); }, []);

  // Auth state
  const [user, setUser]       = useState(null);

  // Navigation
  const [screen, setScreen]   = useState("dashboard");
  const [collapsed, setCollapsed] = useState(false);
  const [selTable, setSelTable]   = useState(null);

  // Toast
  const { toasts, toast, removeToast } = useToast();

  // Offline detection
  const isOnline = useOfflineDetect(toast);

  // Core data state (loaded from API, fallback to mock)
  const [tables,    setTables]    = useState(MOCK_TABLES);
  const [orders,    setOrders]    = useState(MOCK_ORDERS);
  const [products,  setProducts]  = useState(MOCK_PRODUCTS);
  const [movements, setMovements] = useState(MOCK_MOVEMENTS);
  const invoices = MOCK_INVOICES;
  const plats    = MOCK_PLATS;

  // Initial data load from API
  useEffect(() => {
    if (!user) return;
    Promise.all([
      tablesService.list().then(d => { if(d) setTables(d); }),
      ordersService.list().then(d  => { if(d) setOrders(d); }),
      productsService.list().then(d => { if(d) setProducts(d); }),
      movementsService.list().then(d => { if(d) setMovements(d); }),
    ]).catch(() => {
      // Mock data already set — graceful degradation
    });
  }, [user]);

  // WebSocket for real-time notifications
  useEffect(() => {
    if (!user) return;
    const cleanup = notificationsService.connectWebSocket((msg) => {
      if (msg.type === "new_order")     toast.gold("Nouvelle commande",  `Table ${msg.data?.table_num}`);
      if (msg.type === "order_ready")   toast.info("Commande prête",     `${msg.data?.order_id} — serveur notifié`);
      if (msg.type === "stock_alert")   toast.warning("Alerte stock",   msg.data?.message);
      if (msg.type === "mvt_validated") toast.success("Stock validé",   "Mouvement approuvé");
      // Refresh relevant data on WS event
      if (msg.type === "new_order") ordersService.list().then(d=>{ if(d) setOrders(d); }).catch(()=>{});
    });
    return cleanup;
  }, [user]); // eslint-disable-line

  // Unauthorized handler
  useEffect(() => {
    const handler = () => { setUser(null); toast.error("Session expirée","Veuillez vous reconnecter."); };
    window.addEventListener("fg:unauthorized", handler);
    return () => window.removeEventListener("fg:unauthorized", handler);
  }, []); // eslint-disable-line

  const notifCount = useMemo(() =>
    orders.filter(o=>o.status==="EN_ATTENTE_ACCEPTATION").length +
    products.filter(p=>p.qte<p.seuil).length +
    movements.filter(m=>m.statut==="EN_ATTENTE").length
  , [orders, products, movements]);

  const handleLogin  = (u)  => { setUser(u); setScreen("dashboard"); };
  const handleLogout = ()   => { authService.logout(); setUser(null); setScreen("dashboard"); };
  const handleNav    = (s)  => { setScreen(s); setSelTable(null); };
  const handleSelTable = (t) => { setSelTable(t); setScreen("table-detail"); };

  if (!user) return (
    <>
      <LoginScreen onLogin={handleLogin} toast={toast}/>
      <ToastContainer toasts={toasts} removeToast={removeToast}/>
    </>
  );

  const SCREEN_TITLES = {
    dashboard:"Tableau de bord", tables:"Gestion des tables", kitchen:"Cuisine",
    orders:"Commandes", stock:"Stock", "stock-entries":"Entrées de stock",
    "stock-exits":"Sorties de stock", "stock-history":"Historique des mouvements",
    "stock-validate":"Validation stock", "stock-request":"Demande de stock",
    invoices:"Factures", reports:"Rapports & KPI", team:"Équipe & Utilisateurs",
    audit:"Journal d'audit", stats:"Mes statistiques", "table-detail":`Table ${selTable?.num||""}`,
  };

  const renderScreen = () => {
    const role = user.role;
    const sharedProps = { role, toast };
    if (screen==="table-detail" && selTable) {
      return <TableDetailScreen {...sharedProps} table={selTable} orders={orders} setOrders={setOrders} setTables={setTables} plats={plats}/>;
    }
    switch(screen) {
      case "dashboard":     return <DashboardScreen {...sharedProps} tables={tables} orders={orders} products={products} movements={movements}/>;
      case "tables":        return <TablesScreen {...sharedProps} tables={tables} setTables={setTables} orders={orders} onSelectTable={handleSelTable}/>;
      case "kitchen":       return <KitchenScreen {...sharedProps} orders={orders} setOrders={setOrders} products={products} movements={movements} setMovements={setMovements}/>;
      case "orders":        return <OrdersListScreen {...sharedProps} orders={orders} setOrders={setOrders} tables={tables}/>;
      case "stock":         return <StockScreen {...sharedProps} products={products} setProducts={setProducts} movements={movements} setMovements={setMovements}/>;
      case "stock-entries": return <StockEntriesScreen {...sharedProps} products={products} movements={movements} setMovements={setMovements}/>;
      case "stock-exits":   return <MovementsScreen {...sharedProps} movements={movements} setMovements={setMovements} products={products} typeFilter="SUPPRESSION"/>;
      case "stock-history": return <MovementsScreen {...sharedProps} movements={movements} setMovements={setMovements} products={products} typeFilter="ALL"/>;
      case "stock-validate":return <MovementsScreen {...sharedProps} movements={movements} setMovements={setMovements} products={products} typeFilter="ALL"/>;
      case "stock-request": return <StockRequestScreen {...sharedProps} products={products} movements={movements} setMovements={setMovements}/>;
      case "invoices":      return <InvoicesScreen {...sharedProps}/>;
      case "reports":       return <ReportsScreen {...sharedProps} orders={orders} products={products} movements={movements} invoices={invoices}/>;
      case "team":          return <TeamScreen {...sharedProps}/>;
      case "audit":         return <AuditScreen {...sharedProps}/>;
      case "stats":         return <StatsScreen {...sharedProps} orders={orders}/>;
      default:              return <DashboardScreen {...sharedProps} tables={tables} orders={orders} products={products} movements={movements}/>;
    }
  };

  return (
    <div style={{ display:"flex", height:"100vh", overflow:"hidden" }}>
      <Sidebar
        role={user.role} screen={screen} onNav={handleNav}
        user={user} onLogout={handleLogout}
        collapsed={collapsed} setCollapsed={setCollapsed}
        notifCount={notifCount}
      />
      <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>
        <OfflineBanner isOnline={isOnline}/>
        <Header
          title={SCREEN_TITLES[screen]||""}
          subtitle={screen==="table-detail"&&selTable
            ? `${TABLE_STATUS[selTable.status]?.label||""} · ${selTable.capacite} couverts`
            : new Date().toLocaleDateString("fr-FR",{weekday:"long",day:"numeric",month:"long",year:"numeric"})}
          actions={
            screen==="table-detail" &&
            <button onClick={()=>{setScreen("tables");setSelTable(null);}}
              style={{ background:C.bg3, border:`1px solid rgba(255,255,255,0.08)`, color:C.mutedL,
                borderRadius:8, padding:"7px 14px", fontSize:12, fontFamily:"'Raleway',sans-serif", cursor:"pointer" }}>
              ← Retour aux tables
            </button>
          }
          notifCount={notifCount}
        />
        <div style={{ flex:1, overflowY:"auto", background:C.bg0 }}>
          {renderScreen()}
        </div>
      </div>
      <ToastContainer toasts={toasts} removeToast={removeToast}/>
    </div>
  );
}
