import { useState, useEffect, useRef, useCallback } from "react";
import { C, timeAgo } from "../styles/tokens";
import { notificationsService } from "../api/services";

/* ── Icône & couleur par type de notif ─────────────────── */
const TYPE_META = {
  new_order:         { icon:"🍽️",  color:C.info,    label:"Nouvelle commande"   },
  order_accepted:    { icon:"✅",  color:C.success, label:"Commande acceptée"   },
  order_rejected:    { icon:"❌",  color:C.danger,  label:"Commande refusée"    },
  order_ready:       { icon:"🔔",  color:C.gold,    label:"Commande prête"      },
  order_cancelled:   { icon:"🚫",  color:C.danger,  label:"Commande annulée"    },
  order_delivered:   { icon:"🚀",  color:C.success, label:"Commande livrée"     },
  stock_alert:       { icon:"⚠️",  color:C.warning, label:"Alerte stock"        },
  peremption_alert:  { icon:"📅",  color:C.warning, label:"Alerte péremption"   },
  mvt_validated:     { icon:"✓",   color:C.success, label:"Mouvement validé"    },
  mvt_rejected:      { icon:"✕",   color:C.danger,  label:"Mouvement rejeté"    },
  default:           { icon:"🔔",  color:C.mutedL,  label:"Notification"        },
};

const getMeta = (type) => TYPE_META[type] || TYPE_META.default;

/* ── Composant principal ────────────────────────────────── */
const NotificationsPanel = ({ user }) => {
  const [open, setOpen]       = useState(false);
  const [notifs, setNotifs]   = useState([]);
  const [loading, setLoading] = useState(false);
  const panelRef              = useRef(null);

  const unreadCount = notifs.filter(n => !n.is_read && !n.read).length;

  /* ── Chargement initial depuis l'API ── */
  const loadNotifs = useCallback(async () => {
    setLoading(true);
    try {
      const data = await notificationsService.list();
      if (data) setNotifs(Array.isArray(data) ? data : (data.results ?? []));
    } catch (_) {}
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    if (!user) return;
    loadNotifs();
  }, [user, loadNotifs]);

  /* ── WebSocket : nouvelles notifs en temps réel ── */
  useEffect(() => {
    if (!user) return;
    const cleanup = notificationsService.connectWebSocket((msg) => {
      // Ajouter la nouvelle notif en tête de liste
      if (msg.type && msg.type !== "connected") {
        const newNotif = {
          id:         Date.now(),
          type:       msg.type,
          message:    msg.data?.message || getMeta(msg.type).label,
          created_at: new Date().toISOString(),
          is_read:    false,
          read:       false,
          data:       msg.data,
        };
        setNotifs(prev => [newNotif, ...prev]);
      }
      // Sync le count initial
      if (msg.type === "connected" && msg.unread_count !== undefined) {
        loadNotifs();
      }
    });
    return cleanup;
  }, [user, loadNotifs]);

  /* ── Fermer le panel si clic extérieur ── */
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  /* ── Marquer une notif comme lue ── */
  const markRead = async (id) => {
    setNotifs(prev => prev.map(n => n.id === id ? { ...n, is_read: true, read: true } : n));
    try { await notificationsService.markRead(id); } catch (_) {}
  };

  /* ── Tout marquer comme lu ── */
  const markAllRead = async () => {
    setNotifs(prev => prev.map(n => ({ ...n, is_read: true, read: true })));
    try { await notificationsService.markAllRead(); } catch (_) {}
  };

  return (
    <div ref={panelRef} style={{ position:"relative" }}>

      {/* ── Bouton cloche ── */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          position: "relative",
          background: open ? C.goldFaint : "rgba(255,255,255,0.04)",
          border: `1px solid ${open ? C.goldBorder : "rgba(255,255,255,0.08)"}`,
          color: open ? C.goldL : C.mutedL,
          borderRadius: 10, width: 38, height: 38,
          fontSize: 16, display:"flex", alignItems:"center", justifyContent:"center",
          cursor:"pointer", transition:"all .18s", flexShrink:0,
        }}>
        🔔
        {unreadCount > 0 && (
          <span style={{
            position: "absolute", top: -5, right: -5,
            background: C.danger, color:"#fff",
            borderRadius: 10, fontSize: 10, fontWeight:700,
            minWidth: 18, height: 18, padding:"0 4px",
            display:"flex", alignItems:"center", justifyContent:"center",
            border:`2px solid ${C.bg1}`,
            fontFamily:"'Raleway',sans-serif",
          }}>
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* ── Panneau dropdown ── */}
      {open && (
        <div
          className="anim-scaleIn"
          style={{
            position: "fixed",
            top: 64, right: 16,
            width: 360,
            maxWidth: "calc(100vw - 32px)",
            maxHeight: "70vh",
            background: C.bg2,
            border: `1px solid rgba(255,255,255,0.08)`,
            borderRadius: 14,
            boxShadow: "0 20px 60px rgba(0,0,0,.7)",
            zIndex: 2000,
            display:"flex", flexDirection:"column",
            overflow:"hidden",
          }}>

          {/* En-tête */}
          <div style={{
            padding:"14px 16px", display:"flex", alignItems:"center",
            justifyContent:"space-between",
            borderBottom:`1px solid rgba(255,255,255,0.06)`,
            flexShrink:0,
          }}>
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              <span className="serif" style={{ fontSize:14, fontWeight:600, color:C.cream }}>
                Notifications
              </span>
              {unreadCount > 0 && (
                <span style={{
                  background:C.goldFaint, border:`1px solid ${C.goldBorder}`,
                  borderRadius:10, padding:"1px 7px", fontSize:11, color:C.goldL,
                }}>
                  {unreadCount} non lue{unreadCount > 1 ? "s" : ""}
                </span>
              )}
            </div>
            <div style={{ display:"flex", gap:8, alignItems:"center" }}>
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  style={{
                    background:"none", border:"none", color:C.gold,
                    fontSize:11, cursor:"pointer", fontFamily:"'Raleway',sans-serif",
                    padding:"3px 6px", borderRadius:6,
                    transition:"background .15s",
                  }}>
                  ✓ Tout lire
                </button>
              )}
              <button
                onClick={loadNotifs}
                style={{
                  background:"none", border:"none", color:C.muted,
                  fontSize:13, cursor:"pointer", padding:"3px 6px",
                }}
                title="Actualiser">
                ↻
              </button>
            </div>
          </div>

          {/* Corps — liste */}
          <div style={{ overflowY:"auto", flex:1 }}>
            {loading && (
              <div style={{ padding:32, textAlign:"center", color:C.muted, fontSize:12 }}>
                Chargement…
              </div>
            )}

            {!loading && notifs.length === 0 && (
              <div style={{
                padding:40, textAlign:"center",
                color:C.muted, fontSize:13,
                display:"flex", flexDirection:"column", alignItems:"center", gap:10,
              }}>
                <span style={{ fontSize:32 }}>🔕</span>
                <span>Aucune notification</span>
              </div>
            )}

            {!loading && notifs.map((notif) => {
              const meta    = getMeta(notif.type);
              const isRead  = notif.is_read || notif.read;
              return (
                <div
                  key={notif.id}
                  onClick={() => !isRead && markRead(notif.id)}
                  style={{
                    padding:"12px 16px",
                    borderBottom:`1px solid rgba(255,255,255,0.04)`,
                    background: isRead ? "transparent" : `${meta.color}08`,
                    cursor: isRead ? "default" : "pointer",
                    display:"flex", gap:12, alignItems:"flex-start",
                    transition:"background .15s",
                  }}>

                  {/* Icône */}
                  <div style={{
                    width:34, height:34, borderRadius:10, flexShrink:0,
                    background:`${meta.color}18`,
                    border:`1px solid ${meta.color}30`,
                    display:"flex", alignItems:"center", justifyContent:"center",
                    fontSize:15,
                  }}>
                    {meta.icon}
                  </div>

                  {/* Contenu */}
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{
                      fontSize:12, fontWeight: isRead ? 400 : 600,
                      color: isRead ? C.mutedL : C.cream,
                      lineHeight:1.4,
                      overflow:"hidden", textOverflow:"ellipsis",
                      display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical",
                    }}>
                      {notif.message || notif.contenu || meta.label}
                    </div>
                    <div style={{ fontSize:10, color:C.muted, marginTop:4 }}>
                      {timeAgo(notif.created_at || notif.date)}
                    </div>
                  </div>

                  {/* Point non lu */}
                  {!isRead && (
                    <div style={{
                      width:7, height:7, borderRadius:"50%",
                      background:meta.color, flexShrink:0, marginTop:4,
                    }}/>
                  )}
                </div>
              );
            })}
          </div>

          {/* Pied — lien vers toutes les notifs */}
          {notifs.length > 0 && (
            <div style={{
              padding:"10px 16px",
              borderTop:`1px solid rgba(255,255,255,0.06)`,
              textAlign:"center", flexShrink:0,
            }}>
              <button
                onClick={() => { markAllRead(); setOpen(false); }}
                style={{
                  background:"none", border:"none", color:C.muted,
                  fontSize:11, cursor:"pointer", fontFamily:"'Raleway',sans-serif",
                }}>
                Marquer tout comme lu et fermer
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationsPanel;