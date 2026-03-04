import { useState } from "react";
import { C, ORDER_STATUS, fmt, timeAgo } from "../styles/tokens";
import { ordersService } from "../api/orders";
import { Card, Badge, Btn, Empty } from "../components/ui";

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

export default OrdersListScreen;
