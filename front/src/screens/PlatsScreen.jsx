import { useState, useEffect, useMemo } from "react";
import { C } from "../styles/tokens";
import { platsService } from "../api/plats";
import { Card, Badge, Btn, Modal, Input, Empty, Spinner } from "../components/ui";
import { handleApiError } from "../hooks/index";

const CATEGORIES = ["Entrée", "Plat principal", "Dessert", "Boisson", "Snack", "Autre"];
const ADMIN_ROLES = ["admin", "administrateur", "manager", "gérant"];

const EMPTY_FORM = { nom: "", prix: "", categorie: "", description: "", ingredients: "", image_url: "", disponible: true };

const PlatsScreen = ({ role, toast, plats, setPlats }) => {
  const [loading,    setLoading]    = useState(false);
  const [showModal,  setShowModal]  = useState(false);
  const [editTarget, setEditTarget] = useState(null); // null = création, objet = édition
  const [form,       setForm]       = useState(EMPTY_FORM);
  const [saving,     setSaving]     = useState(false);
  const [search,     setSearch]     = useState("");
  const [catFilter,  setCatFilter]  = useState("ALL");
  const [dispFilter, setDispFilter] = useState("ALL"); // ALL | true | false

  const isAdmin = ADMIN_ROLES.includes(role);

  /* ── Chargement initial ── */
  useEffect(() => {
    setLoading(true);
    platsService.list()
      .then(d => { if (d) setPlats(Array.isArray(d) ? d : (d.results ?? [])); })
      .catch(err => handleApiError(err, toast))
      .finally(() => setLoading(false));
  }, []); // eslint-disable-line

  /* ── Données filtrées ── */
  const categories = useMemo(() => [...new Set(plats.map(p => p.categorie).filter(Boolean))], [plats]);

  const filtered = useMemo(() => plats.filter(p => {
    const matchSearch = !search || p.nom.toLowerCase().includes(search.toLowerCase()) || p.description?.toLowerCase().includes(search.toLowerCase());
    const matchCat    = catFilter  === "ALL" || p.categorie === catFilter;
    const matchDisp   = dispFilter === "ALL" || String(p.disponible) === dispFilter;
    return matchSearch && matchCat && matchDisp;
  }), [plats, search, catFilter, dispFilter]);

  /* ── Ouvrir modal création ── */
  const openCreate = () => {
    setEditTarget(null);
    setForm(EMPTY_FORM);
    setShowModal(true);
  };

  /* ── Ouvrir modal édition ── */
  const openEdit = (plat, e) => {
    e.stopPropagation();
    setEditTarget(plat);
    setForm({
      nom:         plat.nom         ?? "",
      prix:        String(plat.prix ?? ""),
      categorie:   plat.categorie   ?? "",
      description: plat.description ?? "",
      ingredients: plat.ingredients ?? "",
      image_url:   plat.image_url   ?? "",
      disponible:  plat.disponible  ?? true,
    });
    setShowModal(true);
  };

  /* ── Sauvegarder (créer ou modifier) ── */
  const save = async () => {
    if (!form.nom || !form.prix) { toast.warning("", "Nom et prix requis"); return; }
    setSaving(true);
    try {
      const payload = {
        nom:         form.nom,
        prix:        parseFloat(form.prix),
        categorie:   form.categorie   || "",
        description: form.description || "",
        ingredients: form.ingredients || "",
        image_url:   form.image_url   || null,
        disponible:  form.disponible,
      };

      if (editTarget) {
        const updated = await platsService.update(editTarget.id, payload);
        setPlats(p => p.map(x => x.id === editTarget.id ? { ...x, ...updated } : x));
        toast.success("Plat modifié", form.nom);
      } else {
        const created = await platsService.create(payload);
        setPlats(p => [...p, created]);
        toast.success("Plat ajouté", form.nom);
      }
      setShowModal(false);
    } catch (err) { handleApiError(err, toast); }
    finally { setSaving(false); }
  };

  /* ── Basculer disponibilité ── */
  const toggleDisponible = async (plat, e) => {
    e.stopPropagation();
    try {
      const updated = await platsService.update(plat.id, { ...plat, disponible: !plat.disponible });
      setPlats(p => p.map(x => x.id === plat.id ? { ...x, disponible: !x.disponible, ...updated } : x));
      toast.info("Disponibilité", `${plat.nom} — ${!plat.disponible ? "disponible" : "indisponible"}`);
    } catch (err) { handleApiError(err, toast); }
  };

  /* ── Supprimer (admin uniquement) ── */
  const remove = async (plat, e) => {
    e.stopPropagation();
    if (!window.confirm(`Supprimer "${plat.nom}" ?`)) return;
    try {
      await platsService.remove(plat.id);
      setPlats(p => p.filter(x => x.id !== plat.id));
      toast.info("Plat supprimé", plat.nom);
    } catch (err) { handleApiError(err, toast); }
  };

  const f = (v) => setForm(prev => ({ ...prev, ...v }));

  return (
    <div style={{ padding: 28, overflowY: "auto", flex: 1 }}>

      {/* ── Barre d'outils ── */}
      <div style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap", alignItems: "center" }}>
        {/* Recherche */}
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="🔍 Rechercher un plat…"
          style={{ background: C.bg2, border: `1px solid rgba(255,255,255,0.08)`, borderRadius: 8,
            padding: "8px 14px", color: C.cream, fontSize: 13, width: 220, fontFamily: "'Raleway',sans-serif" }}
        />

        {/* Filtre catégorie */}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {["ALL", ...categories].map(cat => (
            <button key={cat} onClick={() => setCatFilter(cat)}
              style={{ padding: "5px 12px", borderRadius: 20, fontSize: 11, cursor: "pointer", transition: "all .2s",
                border: `1px solid ${catFilter === cat ? C.gold : C.goldBorder}`,
                background: catFilter === cat ? C.goldFaint : "transparent",
                color: catFilter === cat ? C.goldL : C.muted, fontFamily: "'Raleway',sans-serif" }}>
              {cat === "ALL" ? `Toutes (${plats.length})` : cat}
            </button>
          ))}
        </div>

        {/* Filtre disponibilité */}
        <div style={{ display: "flex", gap: 6 }}>
          {[["ALL","Tous"], ["true","Disponibles"], ["false","Indisponibles"]].map(([v, l]) => (
            <button key={v} onClick={() => setDispFilter(v)}
              style={{ padding: "5px 12px", borderRadius: 20, fontSize: 11, cursor: "pointer", transition: "all .2s",
                border: `1px solid ${dispFilter === v ? C.gold : C.goldBorder}`,
                background: dispFilter === v ? C.goldFaint : "transparent",
                color: dispFilter === v ? C.goldL : C.muted, fontFamily: "'Raleway',sans-serif" }}>
              {l}
            </button>
          ))}
        </div>

        {/* Bouton ajouter */}
        {isAdmin && (
          <div style={{ marginLeft: "auto" }}>
            <Btn onClick={openCreate}>+ Nouveau plat</Btn>
          </div>
        )}
      </div>

      {/* ── Grille des plats ── */}
      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: 60 }}><Spinner/></div>
      ) : filtered.length === 0 ? (
        <Empty icon="🍽️" text="Aucun plat trouvé"/>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))", gap: 14 }}>
          {filtered.map((plat, i) => (
            <Card key={plat.id} className="hover-lift anim-fadeUp"
              style={{ padding: 0, overflow: "hidden", animationDelay: `${i * 30}ms`,
                border: `1px solid ${plat.disponible ? "rgba(201,168,76,0.2)" : "rgba(255,255,255,0.05)"}`,
                opacity: plat.disponible ? 1 : 0.6 }}>
              {/* Bandeau coloré en haut */}
              <div style={{ height: 3, background: plat.disponible
                ? `linear-gradient(90deg,${C.gold},${C.gold}40)`
                : `linear-gradient(90deg,${C.muted},transparent)` }}/>

              {/* Image si disponible */}
              {plat.image_url && (
                <div style={{ height: 130, overflow: "hidden", background: C.bg2 }}>
                  <img src={plat.image_url} alt={plat.nom}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    onError={e => { e.target.style.display = "none"; }}/>
                </div>
              )}

              <div style={{ padding: "14px 16px" }}>
                {/* Header */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: C.cream }} className="truncate">{plat.nom}</div>
                    {plat.categorie && (
                      <div style={{ fontSize: 10, color: C.muted, marginTop: 2, textTransform: "uppercase", letterSpacing: 1 }}>
                        {plat.categorie}
                      </div>
                    )}
                  </div>
                  <div className="serif" style={{ fontSize: 16, fontWeight: 700, color: C.goldL, flexShrink: 0, marginLeft: 8 }}>
                    {Number(plat.prix).toLocaleString("fr-FR")} FCFA
                  </div>
                </div>

                {/* Description */}
                {plat.description && (
                  <div style={{ fontSize: 11, color: C.muted, marginBottom: 10, lineHeight: 1.5,
                    display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                    {plat.description}
                  </div>
                )}

                {/* Badge disponibilité */}
                <div style={{ marginBottom: 12 }}>
                  <Badge color={plat.disponible ? C.success : C.danger}>
                    {plat.disponible ? "✓ Disponible" : "✗ Indisponible"}
                  </Badge>
                </div>

                {/* Actions */}
                {isAdmin && (
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }} onClick={e => e.stopPropagation()}>
                    <Btn small variant="ghost" onClick={e => openEdit(plat, e)}>✏️ Modifier</Btn>
                    <Btn small variant={plat.disponible ? "danger" : "outline"}
                      onClick={e => toggleDisponible(plat, e)}>
                      {plat.disponible ? "Désactiver" : "Activer"}
                    </Btn>
                    {role === "admin" || role === "administrateur" ? (
                      <Btn small variant="danger" onClick={e => remove(plat, e)}>🗑</Btn>
                    ) : null}
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* ── Modal création / édition ── */}
      <Modal open={showModal} onClose={() => setShowModal(false)}
        title={editTarget ? `Modifier — ${editTarget.nom}` : "Nouveau plat"}>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Input label="Nom du plat *" value={form.nom} onChange={v => f({ nom: v })} required/>
            <Input label="Prix (FCFA) *" type="number" value={form.prix} onChange={v => f({ prix: v })} required/>
          </div>

          {/* Catégorie — select + saisie libre */}
          <div>
            <div style={{ fontSize: 11, color: C.muted, marginBottom: 6, textTransform: "uppercase", letterSpacing: 1 }}>
              Catégorie
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
              {CATEGORIES.map(cat => (
                <button key={cat} onClick={() => f({ categorie: cat })}
                  style={{ padding: "4px 10px", borderRadius: 16, fontSize: 11, cursor: "pointer",
                    border: `1px solid ${form.categorie === cat ? C.gold : C.goldBorder}`,
                    background: form.categorie === cat ? C.goldFaint : "transparent",
                    color: form.categorie === cat ? C.goldL : C.muted, fontFamily: "'Raleway',sans-serif" }}>
                  {cat}
                </button>
              ))}
            </div>
            <Input placeholder="Ou saisir une catégorie personnalisée…" value={form.categorie} onChange={v => f({ categorie: v })}/>
          </div>

          <Input label="Description" value={form.description} onChange={v => f({ description: v })}
            placeholder="Courte description du plat…" textarea/>

          <Input label="Ingrédients" value={form.ingredients} onChange={v => f({ ingredients: v })}
            placeholder="Tomates, mozzarella, basilic…" textarea/>

          <Input label="URL de l'image" value={form.image_url} onChange={v => f({ image_url: v })}
            placeholder="https://…"/>

          {/* Toggle disponible */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px",
            background: C.bg2, borderRadius: 8, border: `1px solid rgba(255,255,255,0.06)` }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, color: C.cream, fontWeight: 600 }}>Disponible au menu</div>
              <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>
                Si désactivé, le plat n'apparaîtra pas lors de la prise de commande
              </div>
            </div>
            <button onClick={() => f({ disponible: !form.disponible })}
              style={{ width: 44, height: 24, borderRadius: 12, border: "none", cursor: "pointer", transition: "background .2s",
                background: form.disponible ? C.success : "rgba(255,255,255,0.1)", position: "relative" }}>
              <div style={{ width: 18, height: 18, borderRadius: "50%", background: "white", position: "absolute",
                top: 3, transition: "left .2s", left: form.disponible ? 23 : 3 }}/>
            </button>
          </div>

          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 4 }}>
            <Btn variant="ghost" onClick={() => setShowModal(false)}>Annuler</Btn>
            <Btn loading={saving} onClick={save} disabled={!form.nom || !form.prix}>
              {editTarget ? "Enregistrer" : "Créer le plat"}
            </Btn>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default PlatsScreen;