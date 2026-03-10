import { C, TABLE_STATUS, ORDER_STATUS, fmt } from "../styles/tokens";
import { ROLES } from "../mock";
import { Card, StatCard, Badge, Dot, Empty } from "../components/ui";

const DashboardScreen = ({ role, tables, orders, products, movements, toast }) => {
  const tablesDispos    = tables.filter(t=>t.status==="DISPONIBLE").length;
  const cmdActives      = orders.filter(o=>!["LIVRÉE","ANNULÉE","REFUSÉE"].includes(o.status)).length;
  const cmdEnPrepa      = orders.filter(o=>o.status==="EN_PREPARATION").length;
  const cmdPrêtes       = orders.filter(o=>o.status==="EN_ATTENTE_LIVRAISON").length;
  const cmdNonTraitees  = orders.filter(o=>o.status==="EN_ATTENTE_ACCEPTATION").length;
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
        <StatCard label="Tables disponibles"        value={tablesDispos}   icon="🪑" color={C.success} sub={`/${tables.length} tables`} delay={0}/>
        <StatCard label="Commandes actives"         value={cmdActives}     icon="📋" color={C.info}    sub={`${cmdPrêtes} prêtes`}       delay={60}/>
        <StatCard label="Commandes en préparation"  value={cmdEnPrepa}     icon="🍳" color={C.warning} delay={120}/>
        {cmdNonTraitees > 0 && (
          <StatCard label="Commandes non traitées"  value={cmdNonTraitees} icon="⏳" color={C.gold}    delay={180}/>
        )}
        {["gestionnaire","gérant","manager","admin"].includes(role) && (
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
            {cmdNonTraitees > 0 && <Badge color={C.warning}>{cmdNonTraitees} non traitées</Badge>}
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
                <span style={{ fontSize:11, fontWeight:700, color:st.color }}>{t.numero}</span>
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

export default DashboardScreen;