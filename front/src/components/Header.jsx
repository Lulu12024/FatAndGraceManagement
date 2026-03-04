import { C } from "../styles/tokens";

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

export default Header;
