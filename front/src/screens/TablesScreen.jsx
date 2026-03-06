import { useState } from "react";
import { C, TABLE_STATUS, fmt } from "../styles/tokens";
import { tablesService } from "../api/tables";
import { Card, Badge, Btn, Dot, Empty, Modal, Input } from "../components/ui";
import { handleApiError } from "../hooks/index";

const STATUS_MAP = {
  "DISPONIBLE":          "DISPONIBLE",
  "RESERVEE":            "RÉSERVÉE",
  "COMMANDES_PASSEE":    "COMMANDES_PASSÉE",
  "EN_SERVICE":          "EN_SERVICE",
  "EN_ATTENTE_PAIEMENT": "EN_ATTENTE_PAIEMENT",
  "PAYEE":               "PAYÉE",
};
const ADMIN_ROLES = ["admin", "administrateur", "manager", "gérant"];

const TablesScreen = ({ tables, setTables, orders, role, onSelectTable, toast }) => {
  const [filter, setFilter]     = useState("ALL");
  const [busy, setBusy]         = useState(null);
  const [showAdd, setShowAdd]   = useState(false);
  const [loadingAdd, setLoadingAdd] = useState(false);
  const [form, setForm]         = useState({ numero: "", capacite: "", description: "" });

  // const filtered = filter === "ALL" ? tables : tables.filter(t => t.status === filter);
  const filtered = filter === "ALL"
    ? tables
    : tables.filter(t => (STATUS_MAP[t.status] ?? t.status) === filter);
    
  const isAdmin  = ADMIN_ROLES.includes(role);

  /* ── Réserver / Annuler ── */
  const doAction = async (t, action) => {
    setBusy(t.id);
    try {
      if (action === "reserve") {
        await tablesService.reserve(t.id);
        setTables(p => p.map(x => x.id === t.id ? { ...x, status: "RESERVEE" } : x));
        toast.success("Table réservée", `Table ${t.numero} réservée`);
      } else if (action === "cancel") {
        await tablesService.cancelReservation(t.id);
        setTables(p => p.map(x => x.id === t.id ? { ...x, status: "DISPONIBLE" } : x));
        toast.info("Réservation annulée", `Table ${t.numero} disponible`);
      }
    } catch (err) {
      handleApiError(err, toast);
    } finally {
      setBusy(null);
    }
  };

  /* ── Créer une table ── */
  const createTable = async () => {
    if (!form.numero || !form.capacite) { toast.warning("", "Numéro et capacité requis"); return; }
    setLoadingAdd(true);
    try {
      const newT = await tablesService.create({
        numero:      form.numero,
        capacite:    Number(form.capacite),
        description: form.description || undefined,
      });
      setTables(p => [...p, { ...newT, status: newT.status ?? "DISPONIBLE" }]);
      setForm({ numero: "", capacite: "", description: "" });
      setShowAdd(false);
      toast.success("Table créée", `Table ${form.numero} ajoutée`);
    } catch (err) {
      handleApiError(err, toast);
    } finally {
      setLoadingAdd(false);
    }
  };

  /* ── Supprimer une table ── */
  const deleteTable = async (t, e) => {
    e.stopPropagation();
    if (!window.confirm(`Supprimer la table ${t.numero} ?`)) return;
    setBusy(t.id);
    try {
      await tablesService.remove(t.id);
      setTables(p => p.filter(x => x.id !== t.id));
      toast.info("Table supprimée", `Table ${t.numero} supprimée`);
    } catch (err) {
      handleApiError(err, toast);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div style={{ padding: 28, overflowY: "auto", flex: 1 }}>

      {/* Barre filtre + bouton Ajouter */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, flexWrap: "wrap", gap: 10 }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {[{ v: "ALL", l: "Toutes (" + tables.length + ")" },
            ...Object.entries(TABLE_STATUS).map(([v, d]) => ({
              v, l: d.label + " (" + tables.filter(t => t.status === v).length + ")"
            }))]
            .map(f => (
              <button key={f.v} onClick={() => setFilter(f.v)}
                style={{
                  padding: "6px 14px", borderRadius: 20,
                  border: `1px solid ${filter === f.v ? C.gold : C.goldBorder}`,
                  background: filter === f.v ? C.goldFaint : "transparent",
                  color: filter === f.v ? C.goldL : C.muted,
                  fontSize: 12, fontFamily: "'Raleway',sans-serif", cursor: "pointer", transition: "all .2s"
                }}>
                {f.l}
              </button>
            ))}
        </div>

        {/* Bouton visible uniquement pour Admin / Manager / Gérant */}
        {isAdmin && (
          <Btn onClick={() => setShowAdd(true)}>+ Nouvelle table</Btn>
        )}
      </div>

      {/* Grille des tables */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(210px,1fr))", gap: 14 }}>
        {filtered.map((t, i) => {
          const stKey = STATUS_MAP[t.status] ?? t.status;
          const st    = TABLE_STATUS[stKey] || TABLE_STATUS.DISPONIBLE;

          const tOrders = orders.filter(o => o.tableId === t.id && !["LIVRÉE", "ANNULÉE", "REFUSÉE"].includes(o.status));
          return (
            <Card key={t.id} className="hover-lift anim-fadeUp"
              style={{ padding: 0, overflow: "hidden", cursor: "pointer", animationDelay: `${i * 35}ms`, border: `1px solid ${st.color}35` }}
              onClick={() => onSelectTable(t)}>
              <div style={{ height: 3, background: `linear-gradient(90deg,${st.color},${st.color}30)` }} />
              <div style={{ padding: "16px 18px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
                  <div>
                    <div className="serif" style={{ fontSize: 26, fontWeight: 700, color: C.cream }}>{t.numero}</div>
                    <div style={{ fontSize: 11, color: C.muted, marginTop: 1 }}>{t.capacite} couverts</div>
                    {t.description && (
                      <div style={{ fontSize: 10, color: C.muted, marginTop: 2, fontStyle: "italic" }}>{t.description}</div>
                    )}
                  </div>
                  <Badge color={st.color} style={{ fontSize: 10 }}>{st.label}</Badge>
                </div>

                {t.montant > 0 && (
                  <div style={{ marginBottom: 12, padding: "8px 11px", background: C.goldFaint, borderRadius: 8, border: `1px solid ${C.goldBorder}` }}>
                    <div style={{ fontSize: 10, color: C.muted }}>Total en cours</div>
                    <div className="serif" style={{ fontSize: 16, fontWeight: 700, color: C.goldL, marginTop: 1 }}>{fmt(t.montant)}</div>
                  </div>
                )}

                {tOrders.length > 0 && (
                  <div style={{ fontSize: 11, color: C.mutedL, marginBottom: 12 }}>
                    {tOrders.length} commande{tOrders.length > 1 ? "s" : ""} active{tOrders.length > 1 ? "s" : ""}
                  </div>
                )}

                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }} onClick={e => e.stopPropagation()}>
                  {t.status === "DISPONIBLE" && ["serveur", "gérant", "admin"].includes(role) && (
                    <Btn small variant="outline" loading={busy === t.id} onClick={() => doAction(t, "reserve")}>Réserver</Btn>
                  )}
                  {t.status === "RESERVEE" && ["serveur", "gérant", "admin"].includes(role) && (
                    <Btn small variant="danger" loading={busy === t.id} onClick={() => doAction(t, "cancel")}>Annuler</Btn>
                  )}
                  <Btn small variant="ghost" onClick={() => onSelectTable(t)}>Détail →</Btn>
                  {/* Supprimer — admin/manager/gérant uniquement, table DISPONIBLE uniquement */}
                  {isAdmin && t.status === "DISPONIBLE" && (
                    <Btn small variant="danger" loading={busy === t.id} onClick={(e) => deleteTable(t, e)}>🗑</Btn>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Modal création de table */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Nouvelle table">
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Input
              label="Numéro *"
              value={form.numero}
              onChange={v => setForm(f => ({ ...f, numero: v }))}
              placeholder="ex: 5"
              required
            />
            <Input
              label="Capacité *"
              type="number"
              value={form.capacite}
              onChange={v => setForm(f => ({ ...f, capacite: v }))}
              placeholder="ex: 4"
              required
            />
          </div>
          <Input
            label="Description"
            value={form.description}
            onChange={v => setForm(f => ({ ...f, description: v }))}
            placeholder="ex: Terrasse, Fenêtre, VIP..."
          />
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <Btn variant="ghost" onClick={() => setShowAdd(false)}>Annuler</Btn>
            <Btn loading={loadingAdd} onClick={createTable} disabled={!form.numero || !form.capacite}>
              Créer la table
            </Btn>
          </div>
        </div>
      </Modal>

    </div>
  );
};

export default TablesScreen;