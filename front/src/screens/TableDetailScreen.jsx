import { useState } from "react";
import { C, TABLE_STATUS, ORDER_STATUS, fmt, now, timeAgo } from "../styles/tokens";
import { tablesService } from "../api/tables";
import { ordersService } from "../api/orders";
import { Card, Badge, Btn, Modal, Input, Select, Divider, Empty } from "../components/ui";
import { handleApiError } from "../hooks/index";

const TableDetailScreen = ({ table, orders, setOrders, setTables, role, toast, plats }) => {
  const [showOrderForm, setShowOrderForm] = useState(false);
  const [showPayModal,  setShowPayModal]  = useState(false);
  const [showCancelM,   setShowCancelM]   = useState(null);
  const [newItems,  setNewItems]  = useState([]);
  const [obs,       setObs]       = useState("");
  const [motifCanc, setMotifCanc] = useState("");
  const [payMode,   setPayMode]   = useState("Espèces");
  const [pourboire, setPourboire] = useState("0");
  const [loading,   setLoading]   = useState(false);

  // ── Normalisation statuts API (sans accent) → clés tokens (avec accent) ──
  const ORDER_NORM = {
    "LIVREE":              "LIVRÉE",
    "ANNULEE":             "ANNULÉE",
    "REFUSEE":             "REFUSÉE",
    "EN_PREPARATION":      "EN_PRÉPARATION",
    "STOCKEE":             "STOCKÉE",
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
  const LIVREE    = (s) => s === "LIVREE" || s === "LIVRÉE";

  const tStatus = normTable(table.status);

  // ── Séparation session courante vs historique ──
  const allTableOrders = orders.filter(o =>
    (o.tableId === table.id) || (o.table_id === table.id)
  );

  const sessionStart = table.date_ouverture ? new Date(table.date_ouverture) : null;
  console.log("Session start:", sessionStart);
  // Commandes de la session courante uniquement
  const tableOrders = sessionStart
    ? allTableOrders.filter(o => new Date(o.created_at ?? o.createdAt) >= sessionStart)
    : allTableOrders;

  // Commandes des sessions précédentes
  const pastOrders = sessionStart
    ? allTableOrders.filter(o => new Date(o.created_at ?? o.createdAt) < sessionStart)
    : [];

  // Totaux basés sur la session courante uniquement
  const activeOrders = tableOrders.filter(o =>
    !["ANNULÉE","ANNULEE","REFUSÉE","REFUSEE"].includes(o.status)
  );
  const totalAmount  = activeOrders.reduce((s, o) => s + Number(o.montant || 0), 0);
  const allDelivered = activeOrders.length > 0 && activeOrders.every(o => LIVREE(o.status));

  const tableNum = table.num ?? (table.numero ?? "").replace(/\D+/g, "") ?? "?";

  const addItem = (plat) => setNewItems(p => {
    const ex = p.find(i => i.platId === plat.id);
    return ex
      ? p.map(i => i.platId === plat.id ? { ...i, qte: i.qte + 1 } : i)
      : [...p, { platId: plat.id, nom: plat.nom, qte: 1, prix: plat.prix }];
  });

  /* ── Créer une commande ── */
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

  /* ── Annuler une commande ── */
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

  /* ── Confirmer livraison ── */
  const deliverOrder = async (order) => {
    setLoading(true);
    try {
      const updated = await ordersService.deliver(order.num_id);
      setOrders(p => p.map(o =>
        o.id === order.id
          ? { ...o, status: normOrder(updated.status ?? "LIVREE") }
          : o
      ));
      toast.success("Livraison confirmée", "");
    } catch(err) { handleApiError(err, toast); }
    finally { setLoading(false); }
  };

  /* ── Clôturer la table ── */
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

  /* ── Paiement ── */
  const processPayment = async () => {
    setLoading(true);
    try {
      const { table: updatedTable } = await tablesService.pay(table.id, {
        mode_paiement: payMode,
        montant: totalAmount,
        pourboire: Number(pourboire),
      });
      setTables(p => p.map(t =>
        t.id === table.id
          ? { ...t, ...(updatedTable || {}), status: "DISPONIBLE", montant: 0 }
          : t
      ));
      setShowPayModal(false);
      toast.success("Paiement enregistré", `${fmt(totalAmount + Number(pourboire))} — ${payMode}`);
    } catch(err) { handleApiError(err, toast); }
    finally { setLoading(false); }
  };

  const st = TABLE_STATUS[tStatus] || TABLE_STATUS.DISPONIBLE;

  // ── Rendu d'une commande (réutilisé pour session courante) ──
  const renderOrder = (o) => {
    const ost = ORDER_STATUS[normOrder(o.status)] ?? { label: o.status, color: C.muted };
    return (
      <Card key={o.id} style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ height: 2, background: ost.color }}/>
        <div style={{ padding: "14px 18px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.cream }}>{o.id}</div>
              <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>
                {o.serveur && `Serveur: ${o.serveur}`}
                {(o.created_at || o.createdAt) && ` · ${timeAgo(o.created_at ?? o.createdAt)}`}
              </div>
              {o.cuisinier && (
                <div style={{ fontSize: 11, color: C.muted }}>Cuisinier: {o.cuisinier}</div>
              )}
            </div>
            <div style={{ textAlign: "right" }}>
              <Badge color={ost.color}>{ost.label}</Badge>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.goldL, marginTop: 4 }}>
                {fmt(Number(o.montant || 0))}
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
            {o.items?.map((item, j) => (
              <div key={j} style={{
                background: C.bg3, borderRadius: 6,
                padding: "3px 9px", fontSize: 11, color: C.mutedL,
              }}>
                {item.qte}× {item.nom}
              </div>
            ))}
          </div>

          {o.obs && (
            <div style={{
              fontSize: 11, color: C.mutedL, fontStyle: "italic",
              marginBottom: 6, padding: "5px 10px",
              background: C.bg3, borderRadius: 6,
            }}>
              📝 {o.obs}
            </div>
          )}
          {o.motif && (
            <div style={{ fontSize: 11, color: C.danger, marginBottom: 8 }}>
              ⚠ Motif: {o.motif}
            </div>
          )}

          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {o.status === "EN_ATTENTE_LIVRAISON" && ["serveur","gérant","admin"].includes(role) && (
              <Btn small variant="success" loading={loading} onClick={() => deliverOrder(o)}>
                ✓ Confirmer livraison
              </Btn>
            )}
            {["EN_ATTENTE_ACCEPTATION","STOCKÉE","STOCKEE"].includes(o.status) && ["serveur","admin"].includes(role) && (
              <Btn small variant="danger" onClick={() => { setShowCancelM(o); setMotifCanc(""); }}>
                Annuler
              </Btn>
            )}
            {["EN_ATTENTE_ACCEPTATION","EN_PRÉPARATION","EN_PREPARATION","EN_ATTENTE_LIVRAISON"].includes(o.status) && ["gérant","admin"].includes(role) && (
              <Btn small variant="danger" onClick={() => { setShowCancelM(o); setMotifCanc(""); }}>
                Annuler (Gérant)
              </Btn>
            )}
          </div>
        </div>
      </Card>
    );
  };

  return (
    <div style={{ padding: 28, overflowY: "auto", flex: 1 }}>

      {/* ── Header ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 22 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{
            width: 52, height: 52, borderRadius: 12,
            background: `linear-gradient(135deg,${C.bg3},${C.bg4})`,
            border: `1px solid ${st.color}50`,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <span className="serif" style={{ fontSize: 20, fontWeight: 700, color: C.goldL }}>
              {tableNum}
            </span>
          </div>
          <div>
            <h2 className="serif" style={{ fontSize: 20, color: C.cream }}>
              {table.numero ?? `Table ${table.num}`}
            </h2>
            <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
              <Badge color={st.color}>{st.label}</Badge>
              <Badge color={C.muted} style={{ fontSize: 10 }}>{table.capacite} couverts</Badge>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {["serveur","gérant","admin"].includes(role) &&
           ["RÉSERVÉE","EN_SERVICE","COMMANDES_PASSÉE"].includes(tStatus) && (
            <Btn variant="outline" onClick={() => setShowOrderForm(true)}>+ Nouvelle commande</Btn>
          )}
          {allDelivered && ["serveur","gérant","admin"].includes(role) && tStatus === "EN_SERVICE" && (
            <Btn variant="info" loading={loading} onClick={closeTable}>Clôturer la table</Btn>
          )}
          {tStatus === "EN_ATTENTE_PAIEMENT" && ["gérant","admin"].includes(role) && (
            <Btn variant="success" onClick={() => setShowPayModal(true)}>💳 Enregistrer paiement</Btn>
          )}
        </div>
      </div>

      {/* ── Résumé session courante ── */}
      {totalAmount > 0 && (
        <div style={{
          background: `linear-gradient(135deg,${C.bg2},${C.bg3})`,
          border: `1px solid ${C.goldBorder}`, borderRadius: 13,
          padding: 20, marginBottom: 20,
          display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16,
        }}>
          <div>
            <div style={{ fontSize: 10, color: C.muted, textTransform: "uppercase", letterSpacing: 1.5 }}>
              Montant total
            </div>
            <div className="serif" style={{ fontSize: 28, fontWeight: 700, color: C.goldL, marginTop: 4 }}>
              {fmt(totalAmount)}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 10, color: C.muted, textTransform: "uppercase", letterSpacing: 1.5 }}>
              Commandes actives
            </div>
            <div style={{ fontSize: 26, fontWeight: 700, color: C.cream, marginTop: 4 }}>
              {activeOrders.length}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 10, color: C.muted, textTransform: "uppercase", letterSpacing: 1.5 }}>
              Livrées
            </div>
            <div style={{ fontSize: 26, fontWeight: 700, color: C.success, marginTop: 4 }}>
              {activeOrders.filter(o => LIVREE(o.status)).length}
            </div>
          </div>
        </div>
      )}

      {/* ── Commandes session courante ── */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {tableOrders.length === 0
          ? <Empty icon="📋" text="Aucune commande sur cette table"/>
          : tableOrders.map(o => renderOrder(o))
        }
      </div>

      {/* ── Historique sessions précédentes ── */}
      {pastOrders.length > 0 && (
        <details style={{ marginTop: 28 }}>
          <summary style={{
            fontSize: 11, color: C.muted, cursor: "pointer",
            textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 12,
            userSelect: "none", listStyle: "none", display: "flex",
            alignItems: "center", gap: 8,
          }}>
            <span style={{
              width: 1, flex: 1, height: 1,
              background: "rgba(255,255,255,0.06)", display: "inline-block",
            }}/>
            📜 {pastOrders.length} commande(s) de sessions précédentes
            <span style={{
              width: 1, flex: 1, height: 1,
              background: "rgba(255,255,255,0.06)", display: "inline-block",
            }}/>
          </summary>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12, opacity: 0.55 }}>
            {pastOrders.map(o => {
              const ost = ORDER_STATUS[normOrder(o.status)] ?? { label: o.status, color: C.muted };
              return (
                <Card key={o.id} style={{ padding: "10px 16px",
                  display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <span style={{ fontSize: 12, fontWeight: 600, color: C.cream }}>{o.id}</span>
                    <span style={{ fontSize: 11, color: C.muted }}> · {o.items?.length ?? 0} plat(s)</span>
                    {(o.created_at || o.createdAt) && (
                      <div style={{ fontSize: 10, color: C.muted }}>
                        {new Date(o.created_at ?? o.createdAt).toLocaleDateString("fr-FR")}
                      </div>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    <Badge color={ost.color}>{ost.label}</Badge>
                    <span style={{ fontSize: 12, color: C.muted }}>{fmt(Number(o.montant || 0))}</span>
                  </div>
                </Card>
              );
            })}
          </div>
        </details>
      )}

      {/* ── Modal nouvelle commande ── */}
      <Modal open={showOrderForm}
        onClose={() => { setShowOrderForm(false); setNewItems([]); setObs(""); }}
        title="Nouvelle commande" width={560}>
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div>
            <div style={{ fontSize: 11, color: C.muted, letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 10 }}>
              Menu disponible
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, maxHeight: 260, overflowY: "auto" }}>
              {(plats || []).filter(p => p.disponible).map(p => (
                <button key={p.id} onClick={() => addItem(p)} className="hover-bg"
                  style={{
                    background: C.bg3, border: `1px solid rgba(255,255,255,0.08)`,
                    borderRadius: 9, padding: "10px 13px", textAlign: "left", cursor: "pointer",
                  }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: C.cream }}>{p.nom}</div>
                  <div style={{ fontSize: 12, color: C.gold, marginTop: 2 }}>{fmt(p.prix)}</div>
                </button>
              ))}
            </div>
          </div>

          {newItems.length > 0 && (
            <div>
              <Divider label={`Sélection — Total: ${fmt(newItems.reduce((s,i) => s+i.prix*i.qte, 0))}`}/>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 10 }}>
                {newItems.map(item => (
                  <div key={item.platId} style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    background: C.bg3, borderRadius: 8, padding: "8px 12px",
                  }}>
                    <span style={{ fontSize: 12, color: C.cream }}>{item.nom}</span>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 12, color: C.gold }}>{item.qte}× {fmt(item.prix)}</span>
                      <button onClick={() => setNewItems(p => p.filter(i => i.platId !== item.platId))}
                        style={{
                          background: C.dangerBg, border: "none", color: C.danger,
                          borderRadius: 4, padding: "2px 6px", fontSize: 10, cursor: "pointer",
                        }}>✕</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <Input label="Observations" value={obs} onChange={setObs}
            placeholder="Instructions spéciales…" textarea/>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <Btn variant="ghost" onClick={() => setShowOrderForm(false)}>Annuler</Btn>
            <Btn loading={loading} onClick={submitOrder} disabled={!newItems.length}>
              Envoyer aux cuisiniers →
            </Btn>
          </div>
        </div>
      </Modal>

      {/* ── Modal annulation ── */}
      <Modal open={!!showCancelM}
        onClose={() => { setShowCancelM(null); setMotifCanc(""); }}
        title="Annuler la commande">
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <p style={{ fontSize: 13, color: C.mutedL }}>Le motif d'annulation est obligatoire.</p>
          <Input label="Motif d'annulation" value={motifCanc} onChange={setMotifCanc}
            placeholder="Raison de l'annulation…" required textarea/>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <Btn variant="ghost" onClick={() => setShowCancelM(null)}>Retour</Btn>
            <Btn variant="danger" loading={loading} onClick={cancelOrder} disabled={!motifCanc}>
              Confirmer annulation
            </Btn>
          </div>
        </div>
      </Modal>

      {/* ── Modal paiement ── */}
      <Modal open={showPayModal} onClose={() => setShowPayModal(false)} title="Enregistrer le paiement">
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{
            background: C.goldFaint, border: `1px solid ${C.goldBorder}`,
            borderRadius: 11, padding: 18, textAlign: "center",
          }}>
            <div style={{ fontSize: 11, color: C.muted }}>Montant à encaisser</div>
            <div className="serif" style={{ fontSize: 32, fontWeight: 700, color: C.goldL, marginTop: 4 }}>
              {fmt(totalAmount)}
            </div>
          </div>
          <Select label="Mode de paiement" value={payMode} onChange={setPayMode}
            options={["Espèces","Carte bancaire","Mobile Money","Autre"].map(v => ({ value: v, label: v }))}/>
          <Input label="Pourboire (FCFA)" type="number" value={pourboire}
            onChange={setPourboire} placeholder="0" min="0"/>
          {Number(pourboire) > 0 && (
            <div style={{
              background: C.successBg, border: `1px solid ${C.successBdr}`,
              borderRadius: 8, padding: "8px 12px", fontSize: 12, color: C.success,
            }}>
              Total encaissé : {fmt(totalAmount + Number(pourboire))}
            </div>
          )}
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
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