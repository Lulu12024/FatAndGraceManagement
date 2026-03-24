import { useState } from "react";
import { C, TABLE_STATUS, ORDER_STATUS, fmt, now, timeAgo } from "../styles/tokens";
import { tablesService } from "../api/tables";
import { ordersService } from "../api/orders";
import { Card, Badge, Btn, Modal, Input, Select, Divider, Empty } from "../components/ui";
import { handleApiError } from "../hooks/index";

const TableDetailScreen = ({ table, orders, setOrders, setTables, role, toast, plats }) => {
  const [showOrderForm,    setShowOrderForm]    = useState(false);
  const [showPayModal,     setShowPayModal]     = useState(false);
  const [showOrderPayM,    setShowOrderPayM]    = useState(null);
  const [showCancelM,      setShowCancelM]      = useState(null);
  const [newItems,         setNewItems]         = useState([]);
  const [obs,              setObs]              = useState("");
  const [motifCanc,        setMotifCanc]        = useState("");
  const [payMode,          setPayMode]          = useState("Espèces");
  const [pourboire,        setPourboire]        = useState("0");
  const [loading,          setLoading]          = useState(false);

  const ORDER_NORM = {
    "LIVREE":              "LIVRÉE",
    "ANNULEE":             "ANNULÉE",
    "REFUSEE":             "REFUSÉE",
    "EN_PREPARATION":      "EN_PRÉPARATION",
    "STOCKEE":             "STOCKÉE",
    "PAYEE":               "PAYÉE",
  };
  const TABLE_NORM = {
    "RESERVEE":            "RÉSERVÉE",
    "COMMANDES_PASSEE":    "COMMANDES_PASSÉE",
    "EN_ATTENTE_PAIEMENT": "EN_ATTENTE_PAIEMENT",
    "EN_SERVICE":          "EN_SERVICE",
    "DISPONIBLE":          "DISPONIBLE",
    "PAYEE":               "PAYÉE",
  };
  const normOrder = (s) => ORDER_NORM[s] ?? s;
  const normTable = (s) => TABLE_NORM[s] ?? s;

  const IS_DELIVERED = (s) =>
    s === "EN_ATTENTE_PAIEMENT" || s === "PAYEE" || s === "PAYÉE" ||
    s === "LIVREE" || s === "LIVRÉE";

  const IS_PAID = (s) => s === "PAYEE" || s === "PAYÉE";

  const tStatus = normTable(table.status);

  const allTableOrders = orders.filter(o =>
    (o.tableId === table.id) || (o.table_id === table.id)
  );

  const sessionStart = table.date_ouverture ? new Date(table.date_ouverture) : null;

  const tableOrders = sessionStart
    ? allTableOrders.filter(o => new Date(o.created_at ?? o.createdAt) >= sessionStart)
    : allTableOrders;

  const pastOrders = sessionStart
    ? allTableOrders.filter(o => new Date(o.created_at ?? o.createdAt) < sessionStart)
    : [];

  const activeOrders = tableOrders.filter(o =>
    !["ANNULÉE","ANNULEE","REFUSÉE","REFUSEE"].includes(o.status)
  );

  const totalAmount = activeOrders.reduce((s, o) => s + Number(o.montant || 0), 0);

  const montantDejaPayé = activeOrders
    .filter(o => IS_PAID(o.status))
    .reduce((s, o) => s + Number(o.montant || 0), 0);

  const resteAPayer = totalAmount - montantDejaPayé;

  const allDelivered =
    activeOrders.length > 0 &&
    activeOrders.every(o => IS_DELIVERED(o.status));

  const ordersEnAttentePaiement = activeOrders.filter(
    o => o.status === "EN_ATTENTE_PAIEMENT"
  );

  const tableNum = table.num ?? (table.numero ?? "").replace(/\D+/g, "") ?? "?";

  // ── Ajouter / incrémenter un plat ───────────────────────────────────────
  const addItem = (plat) => setNewItems(p => {
    const ex = p.find(i => i.platId === plat.id);
    return ex
      ? p.map(i => i.platId === plat.id ? { ...i, qte: i.qte + 1 } : i)
      : [...p, { platId: plat.id, nom: plat.nom, qte: 1, prix: plat.prix }];
  });

  // ── Modifier la quantité directement ────────────────────────────────────
  const setQte = (platId, val) => {
    const v = Math.max(1, parseInt(val) || 1);
    setNewItems(p => p.map(i => i.platId === platId ? { ...i, qte: v } : i));
  };

  const incrQte = (platId) =>
    setNewItems(p => p.map(i => i.platId === platId ? { ...i, qte: i.qte + 1 } : i));

  const decrQte = (platId) =>
    setNewItems(p => p.map(i => i.platId === platId ? { ...i, qte: Math.max(1, i.qte - 1) } : i));

  const removeItem = (platId) =>
    setNewItems(p => p.filter(i => i.platId !== platId));

  /* ── Créer une commande ────────────────────────────────────────────────── */
  const submitOrder = async () => {
    if (!newItems.length) { toast.warning("", "Ajoutez au moins un plat"); return; }
    setLoading(true);
    try {
      const payload = {
        table_id: table.id,
        items: newItems.map(i => ({ plat_id: i.platId, qte: i.qte })),
        obs,
      };
      const order = await ordersService.create(payload);
      setOrders(p => [...p, {
        ...order,
        tableId: table.id,
        items: newItems,
        montant: newItems.reduce((s, i) => s + i.prix * i.qte, 0),
        status: "EN_ATTENTE_ACCEPTATION",
        obs,
        createdAt: now(),
        created_at: new Date().toISOString(),
      }]);
      setTables(p => p.map(t => t.id === table.id
        ? { ...t, status: ["DISPONIBLE","RESERVEE","RÉSERVÉE"].includes(t.status) ? "EN_SERVICE" : t.status }
        : t
      ));
      setNewItems([]); setObs(""); setShowOrderForm(false);
      toast.success("Commande envoyée", "Cuisiniers notifiés");
    } catch(err) { handleApiError(err, toast); }
    finally { setLoading(false); }
  };

  /* ── Annuler une commande ──────────────────────────────────────────────── */
  const cancelOrder = async () => {
    if (!motifCanc || !showCancelM) { toast.warning("", "Motif obligatoire"); return; }
    const order = showCancelM;
    setLoading(true);
    try {
      const updated = await ordersService.cancel(order.num_id, motifCanc);
      setOrders(p => p.map(o =>
        o.id === order.id
          ? { ...o, status: normOrder(updated.status ?? "ANNULEE"), motif: motifCanc }
          : o
      ));
      setShowCancelM(null); setMotifCanc("");
      toast.info("Commande annulée", "");
    } catch(err) { handleApiError(err, toast); }
    finally { setLoading(false); }
  };

  /* ── Confirmer livraison ────────────────────────────────────────────────── */
  const deliverOrder = async (order) => {
    setLoading(true);
    try {
      const updated = await ordersService.deliver(order.num_id);
      setOrders(p => p.map(o =>
        o.id === order.id
          ? { ...o, status: normOrder(updated.status ?? "EN_ATTENTE_PAIEMENT") }
          : o
      ));
      toast.success("Livraison confirmée", "En attente de paiement");
    } catch(err) { handleApiError(err, toast); }
    finally { setLoading(false); }
  };

  /* ── Clôturer la table ─────────────────────────────────────────────────── */
  const closeTable = async () => {
    setLoading(true);
    try {
      await tablesService.close(table.id);
      setTables(p => p.map(t =>
        t.id === table.id ? { ...t, status: "EN_ATTENTE_PAIEMENT" } : t
      ));
      toast.info("Table clôturée", "En attente de paiement");
    } catch(err) { handleApiError(err, toast); }
    finally { setLoading(false); }
  };

  /* ── Paiement table entière ─────────────────────────────────────────────── */
  const processPayment = async () => {
    setLoading(true);
    try {
      const { table: updatedTable } = await tablesService.pay(table.id, {
        mode_paiement: payMode,
        montant: resteAPayer,
        pourboire: Number(pourboire),
      });
      setOrders(p => p.map(o =>
        (o.tableId === table.id || o.table_id === table.id) &&
        o.status === "EN_ATTENTE_PAIEMENT"
          ? { ...o, status: "PAYÉE", is_paid: true }
          : o
      ));
      setTables(p => p.map(t =>
        t.id === table.id
          ? { ...t, ...(updatedTable || {}), status: "DISPONIBLE", montant: 0 }
          : t
      ));
      setShowPayModal(false);
      setPourboire("0");
      toast.success("Paiement enregistré", `${fmt(resteAPayer + Number(pourboire))} — ${payMode}`);
    } catch(err) { handleApiError(err, toast); }
    finally { setLoading(false); }
  };

  /* ── Paiement commande individuelle ─────────────────────────────────────── */
  const processOrderPayment = async () => {
    const order = showOrderPayM;
    if (!order) return;
    setLoading(true);
    try {
      const { order: updatedOrder } = await ordersService.pay(order.num_id, {
        mode_paiement: payMode,
        montant: Number(order.montant || 0),
        pourboire: Number(pourboire),
      });
      setOrders(p => p.map(o =>
        o.id === order.id
          ? { ...o, status: normOrder(updatedOrder.status ?? "PAYEE"), is_paid: true }
          : o
      ));
      try {
        const freshTable = await tablesService.get(table.id);
        if (freshTable) {
          setTables(p => p.map(t => t.id === table.id ? { ...t, ...freshTable } : t));
        }
      } catch (_) {}
      setShowOrderPayM(null);
      setPayMode("Espèces");
      setPourboire("0");
      toast.success("Commande payée", `${fmt(Number(order.montant || 0))} — ${payMode}`);
    } catch(err) { handleApiError(err, toast); }
    finally { setLoading(false); }
  };

  const st = TABLE_STATUS[tStatus] || TABLE_STATUS.DISPONIBLE;
  const isGerant = ["gérant","admin"].includes(role);

  // ── Rendu d'une commande ─────────────────────────────────────────────────
  const renderOrder = (o) => {
    const normStatus = normOrder(o.status);
    const ost = ORDER_STATUS[normStatus] ?? { label: o.status, color: C.muted };
    const isPaid       = IS_PAID(o.status);
    const isEnAttPaiem = o.status === "EN_ATTENTE_PAIEMENT";
    const isLivrable   = o.status === "EN_ATTENTE_LIVRAISON";
    const isCancellable = ["STOCKEE","STOCKÉE","EN_ATTENTE_ACCEPTATION"].includes(o.status);

    return (
      <Card key={o.id} style={{ padding: 0, overflow: "hidden", opacity: isPaid ? 0.75 : 1 }}>
        <div style={{ height: 2, background: ost.color }}/>
        <div style={{ padding: "14px 18px" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom: 10 }}>
            <div>
              <div style={{ display:"flex", alignItems:"center", gap: 8 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: C.cream }}>{o.id}</div>
                {isPaid && (
                  <span style={{
                    fontSize: 10, padding:"2px 7px", borderRadius: 10,
                    background: C.successBg, color: C.success,
                    border: `1px solid ${C.successBdr}`, fontWeight: 600,
                  }}>✓ Payée</span>
                )}
              </div>
              <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>
                {o.serveur && `Serveur : ${o.serveur}`}
                {(o.created_at || o.createdAt) && ` · ${timeAgo(o.created_at ?? o.createdAt)}`}
              </div>
            </div>
            <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap: 4 }}>
              <Badge color={ost.color}>{ost.label}</Badge>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.goldL }}>
                {fmt(Number(o.montant || 0))}
              </div>
            </div>
          </div>

          {o.items && o.items.length > 0 && (
            <div style={{ marginBottom: 10 }}>
              {o.items.map((it, i) => (
                <div key={i} style={{
                  display:"flex", justifyContent:"space-between",
                  fontSize: 12, color: C.mutedL, padding:"2px 0",
                }}>
                  <span>{it.qte}× {it.nom ?? it.name}</span>
                  <span>{fmt((it.prix_unitaire ?? it.prix ?? 0) * it.qte)}</span>
                </div>
              ))}
            </div>
          )}

          {o.obs && (
            <div style={{ fontSize: 11, color: C.muted, fontStyle:"italic", marginBottom: 8 }}>
              📝 {o.obs}
            </div>
          )}

          <div style={{ display:"flex", gap: 8, flexWrap:"wrap", marginTop: 6 }}>
            {isLivrable && ["serveur","gérant","admin"].includes(role) && (
              <Btn variant="success" size="sm" loading={loading} onClick={() => deliverOrder(o)}>
                ✓ Livrer
              </Btn>
            )}
            {isEnAttPaiem && isGerant && (
              <Btn variant="outline" size="sm"
                onClick={() => { setShowOrderPayM(o); setPayMode("Espèces"); setPourboire("0"); }}
                style={{ borderColor: C.purple, color: C.purple }}>
                💳 Payer cette commande
              </Btn>
            )}
            {isCancellable && ["serveur","gérant","admin"].includes(role) && (
              <Btn variant="danger" size="sm" onClick={() => setShowCancelM(o)}>
                Annuler
              </Btn>
            )}
          </div>
        </div>
      </Card>
    );
  };

  // ── Rendu principal ──────────────────────────────────────────────────────
  return (
    <div style={{ maxWidth: 700, margin:"0 auto", padding:"0 0 60px" }}>

      {/* ── En-tête table ── */}
      <div style={{
        display:"flex", justifyContent:"space-between", alignItems:"flex-start",
        marginBottom: 24, flexWrap:"wrap", gap: 12,
      }}>
        <div>
          <h2 className="serif" style={{ fontSize: 26, color: C.cream, margin: 0 }}>
            {table.description || `Table ${tableNum}`}
          </h2>
          <div style={{ display:"flex", gap: 8, marginTop: 4 }}>
            <Badge color={st.color}>{st.label}</Badge>
            <Badge color={C.muted} style={{ fontSize: 10 }}>{table.capacite} couverts</Badge>
          </div>
        </div>

        <div style={{ display:"flex", gap: 8, flexWrap:"wrap" }}>
          {["serveur","gérant","admin"].includes(role) &&
           ["RÉSERVÉE","EN_SERVICE","COMMANDES_PASSÉE"].includes(tStatus) && (
            <Btn variant="outline" onClick={() => setShowOrderForm(true)}>+ Nouvelle commande</Btn>
          )}
          {allDelivered && ["serveur","gérant","admin"].includes(role) && tStatus === "EN_SERVICE" && (
            <Btn variant="info" loading={loading} onClick={closeTable}>Clôturer la table</Btn>
          )}
          {tStatus === "EN_ATTENTE_PAIEMENT" && isGerant && (
            <Btn variant="success" onClick={() => { setShowPayModal(true); setPourboire("0"); }}>
              💳 Régler la table
            </Btn>
          )}
        </div>
      </div>

      {/* ── Résumé session courante ── */}
      {totalAmount > 0 && (
        <div style={{
          background: `linear-gradient(135deg,${C.bg2},${C.bg3})`,
          border: `1px solid ${C.goldBorder}`, borderRadius: 13,
          padding: 20, marginBottom: 20,
          display:"grid",
          gridTemplateColumns: montantDejaPayé > 0 ? "1fr 1fr 1fr 1fr" : "1fr 1fr 1fr",
          gap: 16,
        }}>
          <div>
            <div style={{ fontSize: 10, color: C.muted, textTransform:"uppercase", letterSpacing: 1.5 }}>
              Total session
            </div>
            <div className="serif" style={{ fontSize: 24, fontWeight: 700, color: C.goldL, marginTop: 4 }}>
              {fmt(totalAmount)}
            </div>
          </div>
          {montantDejaPayé > 0 && (
            <div>
              <div style={{ fontSize: 10, color: C.muted, textTransform:"uppercase", letterSpacing: 1.5 }}>
                Déjà encaissé
              </div>
              <div className="serif" style={{ fontSize: 24, fontWeight: 700, color: C.success, marginTop: 4 }}>
                {fmt(montantDejaPayé)}
              </div>
            </div>
          )}
          <div>
            <div style={{ fontSize: 10, color: C.muted, textTransform:"uppercase", letterSpacing: 1.5 }}>
              Commandes actives
            </div>
            <div style={{ fontSize: 24, fontWeight: 700, color: C.cream, marginTop: 4 }}>
              {activeOrders.length}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 10, color: C.muted, textTransform:"uppercase", letterSpacing: 1.5 }}>
              En attente paiement
            </div>
            <div style={{ fontSize: 24, fontWeight: 700, color: C.purple, marginTop: 4 }}>
              {ordersEnAttentePaiement.length}
            </div>
          </div>
        </div>
      )}

      {/* ── Commandes session courante ── */}
      <div style={{ display:"flex", flexDirection:"column", gap: 12 }}>
        {tableOrders.length === 0
          ? <Empty icon="📋" text="Aucune commande sur cette table"/>
          : tableOrders.map(o => renderOrder(o))
        }
      </div>

      {/* ── Historique sessions précédentes ── */}
      {pastOrders.length > 0 && (
        <details style={{ marginTop: 28 }}>
          <summary style={{
            fontSize: 11, color: C.muted, cursor:"pointer",
            textTransform:"uppercase", letterSpacing: 1.5, marginBottom: 12,
            userSelect:"none", listStyle:"none", display:"flex", alignItems:"center", gap: 8,
          }}>
            <span style={{ width: 1, flex: 1, height: 1, background:"rgba(255,255,255,0.06)", display:"inline-block" }}/>
            📜 {pastOrders.length} commande(s) de sessions précédentes
            <span style={{ width: 1, flex: 1, height: 1, background:"rgba(255,255,255,0.06)", display:"inline-block" }}/>
          </summary>
          <div style={{ display:"flex", flexDirection:"column", gap: 8, marginTop: 12, opacity: 0.55 }}>
            {pastOrders.map(o => {
              const ost = ORDER_STATUS[normOrder(o.status)] ?? { label: o.status, color: C.muted };
              return (
                <Card key={o.id} style={{ padding:"10px 16px",
                  display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <div>
                    <span style={{ fontSize: 12, fontWeight: 600, color: C.cream }}>{o.id}</span>
                    <span style={{ fontSize: 11, color: C.muted }}> · {o.items?.length ?? 0} plat(s)</span>
                    {(o.created_at || o.createdAt) && (
                      <div style={{ fontSize: 10, color: C.muted }}>
                        {new Date(o.created_at ?? o.createdAt).toLocaleDateString("fr-FR")}
                      </div>
                    )}
                  </div>
                  <div style={{ display:"flex", gap: 10, alignItems:"center" }}>
                    <Badge color={ost.color}>{ost.label}</Badge>
                    <span style={{ fontSize: 12, color: C.muted }}>{fmt(Number(o.montant || 0))}</span>
                  </div>
                </Card>
              );
            })}
          </div>
        </details>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          MODAL — Nouvelle commande
      ══════════════════════════════════════════════════════════════════ */}
      <Modal open={showOrderForm}
        onClose={() => { setShowOrderForm(false); setNewItems([]); setObs(""); }}
        title="Nouvelle commande" width={560}>
        <div style={{ display:"flex", flexDirection:"column", gap: 18 }}>

          {/* Menu disponible */}
          <div>
            <div style={{ fontSize: 11, color: C.muted, letterSpacing: 1.2, textTransform:"uppercase", marginBottom: 10 }}>
              Menu disponible
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap: 8, maxHeight: 260, overflowY:"auto" }}>
              {(plats || []).filter(p => p.disponible).map(p => {
                const inCart = newItems.find(i => i.platId === p.id);
                return (
                  <button key={p.id}
                    onClick={() => addItem(p)}
                    style={{
                      background: inCart ? `${C.goldFaint}` : C.bg3,
                      border: `1px solid ${inCart ? C.gold : C.bg5}`,
                      borderRadius: 8, padding:"10px 12px", cursor:"pointer",
                      textAlign:"left", color: C.cream,
                      position: "relative", transition: "border-color .15s, background .15s",
                    }}>
                    {/* Badge quantité si déjà dans la sélection */}
                    {inCart && (
                      <span style={{
                        position:"absolute", top: 6, right: 8,
                        background: C.gold, color: "#07050A",
                        fontSize: 10, fontWeight: 700,
                        borderRadius: 10, padding:"1px 6px",
                      }}>
                        ×{inCart.qte}
                      </span>
                    )}
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{p.nom}</div>
                    <div style={{ fontSize: 11, color: C.goldL, marginTop: 2 }}>{fmt(p.prix)}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Sélection avec contrôles de quantité */}
          {newItems.length > 0 && (
            <>
              <Divider/>
              <div>
                <div style={{ fontSize: 11, color: C.muted, textTransform:"uppercase", letterSpacing: 1.2, marginBottom: 8 }}>
                  Sélection
                </div>
                {newItems.map((it) => (
                  <div key={it.platId} style={{
                    display:"flex", justifyContent:"space-between",
                    alignItems:"center", padding:"8px 0",
                    borderBottom: `1px solid rgba(255,255,255,0.04)`,
                    fontSize: 13, gap: 10,
                  }}>
                    <span style={{ color: C.cream, flex: 1, minWidth: 0 }}>{it.nom}</span>
                    <div style={{ display:"flex", alignItems:"center", gap: 6, flexShrink: 0 }}>
                      {/* Bouton − */}
                      <button
                        onClick={() => decrQte(it.platId)}
                        style={{
                          width: 26, height: 26, borderRadius: 6,
                          border: `1px solid rgba(255,255,255,0.12)`,
                          background: "transparent", color: C.cream,
                          cursor:"pointer", fontSize: 16, lineHeight: 1,
                          display:"flex", alignItems:"center", justifyContent:"center",
                          flexShrink: 0,
                        }}>−</button>

                      {/* Input quantité */}
                      <input
                        type="number"
                        min={1}
                        value={it.qte}
                        onChange={e => setQte(it.platId, e.target.value)}
                        style={{
                          width: 46, textAlign:"center",
                          background: C.bg2,
                          border: `1px solid rgba(255,255,255,0.12)`,
                          borderRadius: 6, color: C.cream,
                          fontSize: 13, padding:"3px 0",
                          fontFamily:"'Raleway',sans-serif",
                          outline: "none",
                        }}
                      />

                      {/* Bouton + */}
                      <button
                        onClick={() => incrQte(it.platId)}
                        style={{
                          width: 26, height: 26, borderRadius: 6,
                          border: `1px solid rgba(255,255,255,0.12)`,
                          background: "transparent", color: C.goldL,
                          cursor:"pointer", fontSize: 16, lineHeight: 1,
                          display:"flex", alignItems:"center", justifyContent:"center",
                          flexShrink: 0,
                        }}>+</button>

                      {/* Prix */}
                      <span style={{ color: C.goldL, minWidth: 80, textAlign:"right", fontSize: 13 }}>
                        {fmt(it.prix * it.qte)}
                      </span>

                      {/* Supprimer */}
                      <button
                        onClick={() => removeItem(it.platId)}
                        style={{
                          background:"none", border:"none", color: C.danger,
                          cursor:"pointer", fontSize: 18, lineHeight: 1,
                          padding: "0 2px", flexShrink: 0,
                        }}>×</button>
                    </div>
                  </div>
                ))}

                {/* Total */}
                <div style={{
                  marginTop: 10, paddingTop: 10,
                  display:"flex", justifyContent:"space-between",
                  fontWeight: 700, color: C.cream, fontSize: 14,
                }}>
                  <span>Total</span>
                  <span style={{ color: C.goldL }}>
                    {fmt(newItems.reduce((s, i) => s + i.prix * i.qte, 0))}
                  </span>
                </div>
              </div>
            </>
          )}

          <Input label="Observations (optionnel)" value={obs} onChange={setObs}
            placeholder="Allergies, cuisson, sans sauce…" textarea/>

          <div style={{ display:"flex", gap: 10, justifyContent:"flex-end" }}>
            <Btn variant="ghost" onClick={() => { setShowOrderForm(false); setNewItems([]); setObs(""); }}>
              Annuler
            </Btn>
            <Btn variant="primary" loading={loading} onClick={submitOrder} disabled={!newItems.length}>
              Envoyer aux cuisiniers →
            </Btn>
          </div>
        </div>
      </Modal>

      {/* ══════════════════════════════════════════════════════════════════
          MODAL — Annulation commande
      ══════════════════════════════════════════════════════════════════ */}
      <Modal open={!!showCancelM}
        onClose={() => { setShowCancelM(null); setMotifCanc(""); }}
        title="Annuler la commande">
        <div style={{ display:"flex", flexDirection:"column", gap: 16 }}>
          <p style={{ fontSize: 13, color: C.mutedL }}>Le motif d'annulation est obligatoire.</p>
          <Input label="Motif d'annulation" value={motifCanc} onChange={setMotifCanc}
            placeholder="Raison de l'annulation…" required textarea/>
          <div style={{ display:"flex", gap: 10, justifyContent:"flex-end" }}>
            <Btn variant="ghost" onClick={() => setShowCancelM(null)}>Retour</Btn>
            <Btn variant="danger" loading={loading} onClick={cancelOrder} disabled={!motifCanc}>
              Confirmer annulation
            </Btn>
          </div>
        </div>
      </Modal>

      {/* ══════════════════════════════════════════════════════════════════
          MODAL — Paiement commande individuelle
      ══════════════════════════════════════════════════════════════════ */}
      <Modal
        open={!!showOrderPayM}
        onClose={() => { setShowOrderPayM(null); setPayMode("Espèces"); setPourboire("0"); }}
        title="Payer cette commande">
        {showOrderPayM && (
          <div style={{ display:"flex", flexDirection:"column", gap: 18 }}>
            <div style={{
              background: C.bg3, border:`1px solid ${C.bg5}`,
              borderRadius: 10, padding: 14,
            }}>
              <div style={{ fontSize: 11, color: C.muted, marginBottom: 8 }}>
                Commande {showOrderPayM.id}
              </div>
              {showOrderPayM.items?.map((it, i) => (
                <div key={i} style={{ display:"flex", justifyContent:"space-between",
                  fontSize: 12, color: C.mutedL, padding:"2px 0" }}>
                  <span>{it.qte}× {it.nom ?? it.name}</span>
                  <span>{fmt((it.prix_unitaire ?? it.prix ?? 0) * it.qte)}</span>
                </div>
              ))}
            </div>

            <div style={{
              background: C.purpleBg, border:`1px solid ${C.purpleBdr}`,
              borderRadius: 11, padding: 18, textAlign:"center",
            }}>
              <div style={{ fontSize: 11, color: C.muted }}>Montant à encaisser</div>
              <div className="serif" style={{ fontSize: 32, fontWeight: 700, color: C.purple, marginTop: 4 }}>
                {fmt(Number(showOrderPayM.montant || 0))}
              </div>
            </div>

            <Select label="Mode de paiement" value={payMode} onChange={setPayMode}
              options={["Espèces","Carte bancaire","Mobile Money","Autre"].map(v => ({ value: v, label: v }))}/>

            <Input label="Pourboire (FCFA)" type="number" value={pourboire}
              onChange={setPourboire} placeholder="0" min="0"/>

            {Number(pourboire) > 0 && (
              <div style={{
                background: C.successBg, border:`1px solid ${C.successBdr}`,
                borderRadius: 8, padding:"8px 12px", fontSize: 12, color: C.success,
              }}>
                Total encaissé : {fmt(Number(showOrderPayM.montant || 0) + Number(pourboire))}
              </div>
            )}

            <div style={{ display:"flex", gap: 10, justifyContent:"flex-end" }}>
              <Btn variant="ghost" onClick={() => { setShowOrderPayM(null); setPayMode("Espèces"); setPourboire("0"); }}>
                Annuler
              </Btn>
              <Btn variant="success" loading={loading} onClick={processOrderPayment}>
                ✓ Valider le paiement
              </Btn>
            </div>
          </div>
        )}
      </Modal>

      {/* ══════════════════════════════════════════════════════════════════
          MODAL — Paiement table entière
      ══════════════════════════════════════════════════════════════════ */}
      <Modal open={showPayModal} onClose={() => setShowPayModal(false)} title="Régler la table">
        <div style={{ display:"flex", flexDirection:"column", gap: 18 }}>

          {montantDejaPayé > 0 && (
            <div style={{
              background: C.bg3, border:`1px solid ${C.bg5}`,
              borderRadius: 10, padding: 14, fontSize: 13,
            }}>
              <div style={{ display:"flex", justifyContent:"space-between", color: C.mutedL, marginBottom: 6 }}>
                <span>Total session</span>
                <span>{fmt(totalAmount)}</span>
              </div>
              <div style={{ display:"flex", justifyContent:"space-between", color: C.success, marginBottom: 6 }}>
                <span>Déjà encaissé ({activeOrders.filter(o => IS_PAID(o.status)).length} commande{activeOrders.filter(o => IS_PAID(o.status)).length > 1 ? "s" : ""})</span>
                <span>− {fmt(montantDejaPayé)}</span>
              </div>
              <div style={{
                borderTop:`1px solid ${C.bg5}`, paddingTop: 8, marginTop: 4,
                display:"flex", justifyContent:"space-between", fontWeight: 700, color: C.cream,
              }}>
                <span>Reste à payer</span>
                <span style={{ color: C.goldL }}>{fmt(resteAPayer)}</span>
              </div>
            </div>
          )}

          <div style={{
            background: C.goldFaint, border:`1px solid ${C.goldBorder}`,
            borderRadius: 11, padding: 18, textAlign:"center",
          }}>
            <div style={{ fontSize: 11, color: C.muted }}>Montant à encaisser</div>
            <div className="serif" style={{ fontSize: 32, fontWeight: 700, color: C.goldL, marginTop: 4 }}>
              {fmt(resteAPayer)}
            </div>
          </div>

          <Select label="Mode de paiement" value={payMode} onChange={setPayMode}
            options={["Espèces","Carte bancaire","Mobile Money","Autre"].map(v => ({ value: v, label: v }))}/>

          <Input label="Pourboire (FCFA)" type="number" value={pourboire}
            onChange={setPourboire} placeholder="0" min="0"/>

          {Number(pourboire) > 0 && (
            <div style={{
              background: C.successBg, border:`1px solid ${C.successBdr}`,
              borderRadius: 8, padding:"8px 12px", fontSize: 12, color: C.success,
            }}>
              Total encaissé : {fmt(resteAPayer + Number(pourboire))}
            </div>
          )}

          <div style={{ display:"flex", gap: 10, justifyContent:"flex-end" }}>
            <Btn variant="ghost" onClick={() => setShowPayModal(false)}>Annuler</Btn>
            <Btn variant="success" loading={loading} onClick={processPayment}>
              ✓ Valider le paiement
            </Btn>
          </div>
        </div>
      </Modal>

    </div>
  );
};

export default TableDetailScreen;