import { useState } from "react";
import { C, TABLE_STATUS } from "../styles/tokens";
import { tablesService } from "../api/tables";
import { Card, Badge, Btn, Dot, Empty } from "../components/ui";

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

export default TablesScreen;
