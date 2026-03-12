import { useEffect, useState } from "react";
import { C } from "../styles/tokens";
import NotificationsPanel from "./NotificationsPanel";

const Header = ({ title, subtitle, actions, onMenuToggle, user }) => {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  return (
    <div style={{
      background: C.bg1,
      borderBottom: `1px solid rgba(255,255,255,0.05)`,
      padding: isMobile ? "10px 16px" : "13px 28px",
      display: "flex", alignItems: "center",
      justifyContent: "space-between",
      flexShrink: 0, gap: 8,
    }}>
      {/* Gauche : hamburger (mobile) + titre */}
      <div style={{ display: "flex", alignItems: "center", gap: isMobile ? 10 : 0, minWidth: 0 }}>
        {isMobile && (
          <button
            onClick={onMenuToggle}
            style={{
              background: "rgba(255,255,255,0.05)",
              border: `1px solid rgba(255,255,255,0.08)`,
              color: C.mutedL, borderRadius: 8,
              width: 36, height: 36, fontSize: 16,
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", flexShrink: 0,
            }}>
            ☰
          </button>
        )}
        <div style={{ minWidth: 0 }}>
          <h1
            className="serif"
            style={{
              fontSize: isMobile ? 15 : 20,
              fontWeight: 600, color: C.cream,
              letterSpacing: .4,
              whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
            }}>
            {title}
          </h1>
          {subtitle && (
            <p style={{
              fontSize: isMobile ? 10 : 12,
              color: C.muted, marginTop: 2,
              whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
            }}>
              {subtitle}
            </p>
          )}
        </div>
      </div>

      {/* Droite : actions + notifications */}
      <div style={{ display: "flex", alignItems: "center", gap: isMobile ? 8 : 12, flexShrink: 0 }}>
        {actions}
        <NotificationsPanel user={user} />
      </div>
    </div>
  );
};

export default Header;