import { C, ROLE_COLORS } from "../styles/tokens";
import { Logo } from "./ui";
import { ROLES } from "../mock";

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
    { id:"orders",       icon:"≡",   label:"Commandes" },
    { id: "menu",        icon:"✦", label: "Menu & Plats" },
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
    { id: "menu",        icon:"✦", label: "Menu & Plats" },
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
  admin:  [
    { id:"dashboard",    icon:"▦",  label:"Tableau de bord" },
    { id:"tables",       icon:"⬚",  label:"Tables" },
    { id:"kitchen",      icon:"◈",  label:"Cuisine" },
    { id:"orders",       icon:"≡",  label:"Commandes" },
    { id: "menu",        icon:"✦", label: "Menu & Plats" },
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
  
  const roleKey = (role || "")
  .toLowerCase()
  .replace("gestionnaire de stock", "gestionnaire")
  // .replace("administrateur", "admin")
  // .replace("gérant", "gerant")
  .split(" ")[0]; 

  const items = NAV[roleKey] || NAV.admin;

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
          <div style={{ width:34, height:34, borderRadius:10,background: `linear-gradient(135deg,${ROLE_COLORS[roleKey]||C.gold}55,${C.bg4})`,
            border: `1px solid ${ROLE_COLORS[roleKey]||C.gold}40`, flexShrink:0, display:"flex",
            alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:700, color:"#fff" }}>
            {user.first_name?.[0]}{user.last_name?.[0]}
          </div>
          {!collapsed && (
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:12, fontWeight:600, color:C.cream }} className="truncate">{user.first_name} {user.last_name}</div>
              <div style={{ fontSize:10, color:C.muted }}>{ROLES[roleKey] || role}</div>
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


export default Sidebar;
