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
  demande_stock:     { icon:"📦", color:C.info,    label:"Demande de stock"  },
  demande_validee:   { icon:"✅", color:C.success, label:"Demande validée"   },
  demande_rejetee:   { icon:"❌", color:C.danger,  label:"Demande rejetée"   },
  table_closed:      { icon:"🔒", color:C.gold,    label:"Table clôturée"        },
  order_to_pay:      { icon:"💰", color:C.gold,    label:"Commande à encaisser"  },
};

const getMeta = (type) => TYPE_META[type] || TYPE_META.default;

/* ── Détermine si la notif est navigable et quel label afficher ── */
const ORDER_TYPES = ["new_order","order_ready","order_accepted","order_rejected","order_cancelled","order_delivered"];
const STOCK_TYPES = ["stock_alert","peremption_alert"];
const MVT_TYPES   = ["mvt_validated","mvt_rejected"];

const getNavHint = (type) => {
  if (ORDER_TYPES.includes(type)) return "Voir la table →";
  if (type === "new_order")       return "Voir en cuisine →";
  if (STOCK_TYPES.includes(type)) return "Voir le stock →";
  if (MVT_TYPES.includes(type))   return "Voir les mouvements →";
  return null;
};

/* ── Composant principal ────────────────────────────────── */
const NotificationsPanel = ({ user, onNavigate }) => {
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

  /* ── Clic sur une notification → marquer lue + naviguer ── */
  const handleNotifClick = async (notif) => {
    // Marquer comme lue
    if (!notif.is_read && !notif.read) {
      await markRead(notif.id);
    }
    // Fermer le panel
    setOpen(false);
    // Déclencher la navigation si le callback existe
    if (onNavigate) {
      onNavigate(notif);
    }
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

      {/* ── Dropdown panel ── */}
      {open && (
        <div style={{
          position: "absolute", top: 46, right: 0, zIndex: 999,
          width: 340, maxWidth: "90vw",
          background: C.bg2,
          border: `1px solid rgba(255,255,255,0.08)`,
          borderRadius: 14,
          boxShadow: "0 8px 32px rgba(0,0,0,0.45)",
          display:"flex", flexDirection:"column",
          maxHeight: "80vh",
          overflow:"hidden",
        }}>
          {/* En-tête */}
          <div style={{
            padding:"14px 16px 10px",
            borderBottom:`1px solid rgba(255,255,255,0.06)`,
            display:"flex", alignItems:"center", justifyContent:"space-between",
            flexShrink:0,
          }}>
            <span style={{ fontSize:13, fontWeight:600, color:C.cream, fontFamily:"'Playfair Display',serif" }}>
              Notifications {unreadCount > 0 && <span style={{ color:C.gold }}>({unreadCount})</span>}
            </span>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                style={{
                  background:"none", border:"none", color:C.muted,
                  fontSize:11, cursor:"pointer", fontFamily:"'Raleway',sans-serif",
                  textDecoration:"underline",
                }}>
                Tout lire
              </button>
            )}
          </div>

          {/* Liste */}
          <div style={{ overflowY:"auto", flex:1 }}>
            {loading && (
              <div style={{ padding:24, textAlign:"center", color:C.muted, fontSize:12 }}>
                Chargement…
              </div>
            )}
            {!loading && notifs.length === 0 && (
              <div style={{ padding:24, textAlign:"center", color:C.muted, fontSize:12 }}>
                Aucune nouvelle notification
              </div>
            )}
            {notifs.map(notif => {
              const meta   = getMeta(notif.type);
              const isRead = notif.is_read || notif.read;
              const navHint = getNavHint(notif.type);

              return (
                <div
                  key={notif.id}
                  onClick={() => handleNotifClick(notif)}
                  style={{
                    padding:"11px 16px",
                    borderBottom:`1px solid rgba(255,255,255,0.04)`,
                    display:"flex", gap:10, alignItems:"flex-start",
                    background: isRead ? "transparent" : "rgba(255,255,255,0.02)",
                    cursor: "pointer",
                    transition:"background .15s",
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.05)"}
                  onMouseLeave={e => e.currentTarget.style.background = isRead ? "transparent" : "rgba(255,255,255,0.02)"}
                >
                  {/* Icône type */}
                  <div style={{
                    width:32, height:32, borderRadius:8, flexShrink:0,
                    background:`${meta.color}18`,
                    border:`1px solid ${meta.color}30`,
                    display:"flex", alignItems:"center", justifyContent:"center",
                    fontSize:14, marginTop:1,
                  }}>
                    {meta.icon}
                  </div>

                  {/* Contenu */}
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{
                      fontSize:12,
                      fontWeight: isRead ? 400 : 600,
                      color: isRead ? C.mutedL : C.cream,
                      lineHeight:1.4,
                      overflow:"hidden", textOverflow:"ellipsis",
                      display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical",
                    }}>
                      {notif.message || notif.contenu || meta.label}
                    </div>
                    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginTop:4, gap:6 }}>
                      <span style={{ fontSize:10, color:C.muted }}>
                        {timeAgo(notif.created_at || notif.date)}
                      </span>
                      {/* Lien d'action affiché en hover-like */}
                      {navHint && (
                        <span style={{
                          fontSize:10,
                          color: meta.color,
                          fontWeight:600,
                          fontFamily:"'Raleway',sans-serif",
                          opacity:0.85,
                          whiteSpace:"nowrap",
                        }}>
                          {navHint}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Point non lu */}
                  {!isRead && (
                    <div style={{
                      width:7, height:7, borderRadius:"50%",
                      background:meta.color, flexShrink:0, marginTop:6,
                    }}/>
                  )}
                </div>
              );
            })}
          </div>

          {/* Pied */}
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
