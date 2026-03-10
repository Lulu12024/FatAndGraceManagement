import { useState } from "react";
import { C, fmt } from "../styles/tokens";
import { Card, StatCard, Badge, Btn, Divider } from "../components/ui";
import { reportsService } from "../api/services";
import { ORDER_STATUS } from "../styles/tokens";

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

export default ReportsScreen;
