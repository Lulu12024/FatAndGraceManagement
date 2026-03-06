import { C, ORDER_STATUS, fmt } from "../styles/tokens";
import { Card, StatCard, Badge, Empty } from "../components/ui";

const StatsScreen = ({ orders, user }) => {
  /* Filtre sur les commandes du cuisinier connecté */
  const fullName = user ? `${user.firstName} ${user.lastName}` : "";
  const mine = orders.filter(o =>
    o.cuisinier && (
      o.cuisinier === fullName ||
      o.cuisinier?.toLowerCase().includes(user?.firstName?.toLowerCase() ?? "")
    )
  );

  const done  = mine.filter(o => ["LIVREE", "LIVRÉE"].includes(o.status)).length;
  const rate  = mine.length ? Math.round((done / mine.length) * 100) : 0;

  return (
    <div style={{ padding: 28, overflowY: "auto", flex: 1 }}>

      {/* ── KPIs ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 14, marginBottom: 24 }}>
        <StatCard label="Commandes traitées"  value={mine.length}  icon="📋" color={C.info}    delay={0}/>
        <StatCard label="Livrées avec succès" value={done}         icon="✓"  color={C.success}  delay={60}/>
        <StatCard label="Taux de réussite"    value={`${rate}%`}  icon="📈" color={rate > 80 ? C.gold : C.warning} delay={120}/>
      </div>

      {/* ── Liste des commandes récentes ── */}
      <Card style={{ padding: 22 }}>
        <h3 className="serif" style={{ fontSize: 16, color: C.cream, marginBottom: 14 }}>
          Mes commandes récentes
        </h3>
        {mine.length === 0 ? (
          <Empty icon="👨‍🍳" text="Aucune commande traitée"/>
        ) : (
          mine.map(o => {
            const st = ORDER_STATUS[o.status];
            return (
              <div key={o.id} style={{
                display: "flex", justifyContent: "space-between",
                padding: "10px 0", borderBottom: `1px solid rgba(255,255,255,0.05)`,
              }}>
                <div>
                  <span style={{ fontSize: 13, fontWeight: 600, color: C.cream }}>{o.id}</span>
                  <span style={{ fontSize: 12, color: C.muted }}> · Table {o.table_num ?? o.tableNum}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <Badge color={st?.color}>{st?.label ?? o.status}</Badge>
                  <span style={{ fontSize: 12, color: C.goldL }}>{fmt(o.montant)}</span>
                </div>
              </div>
            );
          })
        )}
      </Card>
    </div>
  );
};

export default StatsScreen;