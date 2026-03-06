import { useState, useEffect, useMemo } from "react";
import { C, MVT_TYPE_META, fmt } from "../styles/tokens";
import { Card, Badge, Btn, Modal, Input, Empty } from "../components/ui";
import { handleApiError } from "../hooks/index";
import { productsService, movementsService, unitesService } from "../api/stock";

const EMPTY_FORM = {
  nom: "", categorie: "", qte_initiale: "",
  unite_id: "", seuil_alerte: "", date_peremption: "", description: "",
};

const StockScreen = ({ products, setProducts, movements, setMovements, role, toast }) => {
  const [search,   setSearch]   = useState("");
  const [filter,   setFilter]   = useState("ALL");
  const [showAdd,  setShowAdd]  = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [form,     setForm]     = useState(EMPTY_FORM);
  const [unites,   setUnites]   = useState([]);

  const f = (v) => setForm(prev => ({ ...prev, ...v }));

  /* ── Chargement des unités ── */
  useEffect(() => {
    unitesService.list()
      .then(d => setUnites(Array.isArray(d) ? d : (d.results ?? [])))
      .catch(() => {});
  }, []);

  const categories = useMemo(() =>
    ["ALL", ...new Set(products.map(p => p.categorie).filter(Boolean))],
    [products]
  );

  const filtered = products.filter(p =>
    (filter === "ALL" || p.categorie === filter) &&
    p.nom.toLowerCase().includes(search.toLowerCase())
  );

  /* ── Créer un produit ── */
  const addProduct = async () => {
    if (!form.nom || !form.qte_initiale || !form.unite_id) {
      toast.warning("", "Nom, quantité et unité requis"); return;
    }
    setLoading(true);
    try {
      const newP = await productsService.create({
        nom:             form.nom,
        categorie:       form.categorie || "Divers",
        seuil_alerte:    Number(form.seuil_alerte) || 0,
        unite_id:        Number(form.unite_id),
        qte_initiale:    Number(form.qte_initiale),
        date_peremption: form.date_peremption || null,
        description:     form.description || "",
      });
      setProducts(p => [...p, newP]);
      setForm(EMPTY_FORM);
      setShowAdd(false);
      toast.success("Produit ajouté", newP.nom);
    } catch(err) { handleApiError(err, toast); }
    finally { setLoading(false); }
  };

  /* ── Valider un mouvement ── */
  const validateMvt = async (mvtId) => {
    setLoading(true);
    try {
      await movementsService.validate(mvtId);
      setMovements(p => p.filter(m => m.id !== mvtId)); // ← retire de la liste
      toast.success("Mouvement validé", "Stock mis à jour");
    } catch(err) { handleApiError(err, toast); }
    finally { setLoading(false); }
  };

  /* ── Rejeter un mouvement ── */
  const rejectMvt = async (mvtId) => {
    setLoading(true);
    try {
      await movementsService.reject(mvtId, "Rejeté par le manager");
      setMovements(p => p.filter(m => m.id !== mvtId)); // ← retire de la liste
      toast.error("Mouvement rejeté", "");
    } catch(err) { handleApiError(err, toast); }
    finally { setLoading(false); }
  };

  const pendingMvts = movements.filter(m => m.statut === "EN_ATTENTE");

  return (
    <div style={{ padding: 28, overflowY: "auto", flex: 1 }}>

      {/* ── Barre de contrôle ── */}
      <div style={{ display: "flex", gap: 10, marginBottom: 22, flexWrap: "wrap", alignItems: "center" }}>
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="🔍 Rechercher un produit…"
          style={{ background: C.bg2, border: `1px solid rgba(255,255,255,0.08)`,
            borderRadius: 8, padding: "8px 14px", color: C.cream,
            fontSize: 13, width: 240, fontFamily: "'Raleway',sans-serif" }}/>

        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {categories.map(cat => (
            <button key={cat} onClick={() => setFilter(cat)}
              style={{ padding: "5px 12px", borderRadius: 20,
                border: `1px solid ${filter === cat ? C.gold : C.goldBorder}`,
                background: filter === cat ? C.goldFaint : "transparent",
                color: filter === cat ? C.goldL : C.muted,
                fontSize: 11, fontFamily: "'Raleway',sans-serif", cursor: "pointer" }}>
              {cat === "ALL" ? "Toutes catégories" : cat}
            </button>
          ))}
        </div>

        {["gestionnaire", "gérant", "admin", "administrateur", "gestionnaire de stock"].includes(role) && (
          <div style={{ marginLeft: "auto" }}>
            <Btn onClick={() => setShowAdd(true)}>+ Nouveau produit</Btn>
          </div>
        )}
      </div>

      {/* ── Grille des produits ── */}
      {filtered.length === 0 ? (
        <Empty icon="📦" text="Aucun produit trouvé"/>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(240px,1fr))", gap: 12, marginBottom: 28 }}>
          {filtered.map((p, i) => {
            const low = p.qte < p.seuil;
            const exp = p.peremption && new Date(p.peremption) < new Date(Date.now() + 4 * 86400000);
            const pct = Math.min(100, p.seuil > 0 ? (p.qte / (p.seuil * 3)) * 100 : 80);
            return (
              <Card key={p.id} className="anim-fadeUp"
                style={{ padding: 16, animationDelay: `${i * 25}ms`,
                  border: `1px solid ${low ? C.dangerBdr : exp ? C.warningBdr : "rgba(255,255,255,0.06)"}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: C.cream }} className="truncate">{p.nom}</div>
                    <div style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>{p.categorie}</div>
                  </div>
                  {(low || exp) && (
                    <Badge color={low ? C.danger : C.warning} style={{ fontSize: 9, marginLeft: 8 }}>
                      {low ? "⚠ Faible" : "⏰ Expiration"}
                    </Badge>
                  )}
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, alignItems: "baseline" }}>
                  <span className="serif" style={{ fontSize: 20, fontWeight: 700, color: low ? C.danger : C.cream }}>
                    {p.qte}
                    <span style={{ fontSize: 11, color: C.muted, fontFamily: "'Raleway',sans-serif", fontWeight: 400 }}> {p.unite}</span>
                  </span>
                  <span style={{ fontSize: 10, color: C.muted }}>seuil: {p.seuil}</span>
                </div>
                <div style={{ height: 4, background: C.bg4, borderRadius: 3, marginBottom: 8, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${pct}%`,
                    background: low ? C.danger : exp ? C.warning : C.success,
                    borderRadius: 3, transition: "width .5s" }}/>
                </div>
                {p.peremption && (
                  <div style={{ fontSize: 10, color: exp ? C.danger : C.muted }}>
                    Péremption: {new Date(p.peremption).toLocaleDateString("fr-FR")}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* ── Mouvements en attente (manager / admin) ── */}
      {["manager", "admin", "administrateur"].includes(role) && (
        <>
          <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "8px 0 14px" }}>
            <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.06)" }}/>
            <span style={{ fontSize: 11, color: C.muted, textTransform: "uppercase", letterSpacing: 1 }}>
              Mouvements en attente de validation
            </span>
            <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.06)" }}/>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {pendingMvts.map((m, i) => {
              const meta = MVT_TYPE_META[m.type];
              return (
                <Card key={m.id} className="anim-fadeUp"
                  style={{ padding: "14px 18px", animationDelay: `${i * 30}ms`,
                    display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                    <div style={{ width: 38, height: 38, borderRadius: 9,
                      background: `${meta?.color}18`, border: `1px solid ${meta?.color}40`,
                      display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>
                      {meta?.icon}
                    </div>
                    <div>
                      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 3 }}>
                        <Badge color={meta?.color}>{m.type}</Badge>
                        <span style={{ fontSize: 13, fontWeight: 600, color: C.cream }}>{m.produit ?? m.produit_nom}</span>
                        <span style={{ fontSize: 12, color: C.muted }}>— {m.qte ?? m.quantite} unités</span>
                      </div>
                      <div style={{ fontSize: 11, color: C.muted }}>{m.justification} · {m.auteur ?? m.demandeur}</div>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                    <Btn small variant="success" loading={loading} onClick={() => validateMvt(m.num_id)}>✓ Valider</Btn>
                    <Btn small variant="danger"  loading={loading} onClick={() => rejectMvt(m.num_id)}>Rejeter</Btn>
                  </div>
                </Card>
              );
            })}
            {pendingMvts.length === 0 && (
              <div style={{ textAlign: "center", color: C.success, fontSize: 13, padding: 20 }}>
                ✓ Aucun mouvement en attente
              </div>
            )}
          </div>
        </>
      )}

      {/* ── Modal création produit ── */}
      <Modal open={showAdd} onClose={() => { setShowAdd(false); setForm(EMPTY_FORM); }}
        title="Nouveau produit en stock">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>

          <div style={{ gridColumn: "1/-1" }}>
            <Input label="Nom du produit *" value={form.nom}
              onChange={v => f({ nom: v })} required/>
          </div>

          <Input label="Catégorie" value={form.categorie}
            onChange={v => f({ categorie: v })} placeholder="Ex: Viandes"/>

          {/* Select unités dynamique */}
          <div>
            <div style={{ fontSize: 11, color: C.muted, marginBottom: 6,
              textTransform: "uppercase", letterSpacing: 1 }}>Unité *</div>
            <select value={form.unite_id} onChange={e => f({ unite_id: e.target.value })}
              style={{ width: "100%", background: C.bg2,
                border: `1px solid rgba(255,255,255,0.08)`, borderRadius: 8,
                padding: "9px 12px",
                color: form.unite_id ? C.cream : C.muted,
                fontSize: 13, fontFamily: "'Raleway',sans-serif",
                outline: "none", cursor: "pointer" }}>
              <option value="">-- Sélectionner une unité --</option>
              {unites.map(u => (
                <option key={u.id} value={u.id}>{u.nom} ({u.abreviation})</option>
              ))}
            </select>
          </div>

          <Input label="Quantité initiale *" type="number" value={form.qte_initiale}
            onChange={v => f({ qte_initiale: v })} min="0" required/>

          <Input label="Seuil d'alerte" type="number" value={form.seuil_alerte}
            onChange={v => f({ seuil_alerte: v })} min="0"/>

          <div style={{ gridColumn: "1/-1" }}>
            <Input label="Date de péremption" type="date" value={form.date_peremption}
              onChange={v => f({ date_peremption: v })}/>
          </div>

          <div style={{ gridColumn: "1/-1" }}>
            <Input label="Description" value={form.description}
              onChange={v => f({ description: v })} placeholder="Optionnel…"/>
          </div>

          <div style={{ gridColumn: "1/-1", display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <Btn variant="ghost" onClick={() => { setShowAdd(false); setForm(EMPTY_FORM); }}>Annuler</Btn>
            <Btn loading={loading} onClick={addProduct}
              disabled={!form.nom || !form.qte_initiale || !form.unite_id}>
              Ajouter au stock
            </Btn>
          </div>

        </div>
      </Modal>

    </div>
  );
};

export default StockScreen;