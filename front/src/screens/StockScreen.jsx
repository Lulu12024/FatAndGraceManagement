import { useState, useEffect,useMemo } from "react";
import { C, MVT_TYPE_META, MVT_STATUS_META, fmt, timeAgo } from "../styles/tokens";
import { productsService } from "../api/stock";
import { Card, Badge, Btn, Modal, Input, Select, Empty, Spinner } from "../components/ui";


const StockScreen = ({ products, setProducts, movements, setMovements, role, toast }) => {
  const [search, setSearch]   = useState("");
  const [filter, setFilter]   = useState("ALL");
  const [showAdd, setShowAdd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ nom:"", categorie:"", qte:"", unite:"kg", seuil:"", peremption:"", description:"" });

  const categories = useMemo(() => ["ALL", ...new Set(products.map(p=>p.categorie))], [products]);
  const filtered   = products.filter(p =>
    (filter==="ALL" || p.categorie===filter) &&
    p.nom.toLowerCase().includes(search.toLowerCase())
  );

  const addProduct = async () => {
    if (!form.nom || !form.qte) { toast.warning("","Nom et quantité requis"); return; }
    setLoading(true);
    try {
      const newP = await productsService.create({ nom:form.nom, categorie:form.categorie||"Divers", qte:Number(form.qte), unite:form.unite, seuil:Number(form.seuil)||0, peremption:form.peremption||"2026-12-31", description:form.description });
      setProducts(p=>[...p, newP]);
      setForm({ nom:"", categorie:"", qte:"", unite:"kg", seuil:"", peremption:"", description:"" });
      setShowAdd(false);
      toast.success("Produit ajouté",newP.nom);
    } catch(err) { handleApiError(err,toast); } finally { setLoading(false); }
  };

  const validateMvt = async (mvtId) => {
    const mvt = movements.find(m=>m.id===mvtId);
    if (!mvt) return;
    setLoading(true);
    try {
      await movementsService.validate(mvtId);
      setMovements(p=>p.map(m=>m.id===mvtId?{...m,statut:"VALIDÉE"}:m));
      setProducts(p=>p.map(prod=>{
        if (prod.id!==mvt.produitId) return prod;
        return { ...prod, qte: mvt.type==="ENTRÉE" ? prod.qte+mvt.qte : Math.max(0,prod.qte-mvt.qte) };
      }));
      toast.success("Mouvement validé","Stock mis à jour");
    } catch(err) { handleApiError(err,toast); } finally { setLoading(false); }
  };

  const rejectMvt = async (mvtId) => {
    setLoading(true);
    try {
      await movementsService.reject(mvtId,"Rejeté par le manager");
      setMovements(p=>p.map(m=>m.id===mvtId?{...m,statut:"REJETÉE"}:m));
      toast.error("Mouvement rejeté","");
    } catch(err) { handleApiError(err,toast); } finally { setLoading(false); }
  };

  return (
    <div style={{ padding:28, overflowY:"auto", flex:1 }}>
      {/* Controls */}
      <div style={{ display:"flex", gap:10, marginBottom:22, flexWrap:"wrap", alignItems:"center" }}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍 Rechercher un produit…"
          style={{ background:C.bg2, border:`1px solid rgba(255,255,255,0.08)`, borderRadius:8,
            padding:"8px 14px", color:C.cream, fontSize:13, width:240, fontFamily:"'Raleway',sans-serif" }}/>
        <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
          {categories.map(cat => (
            <button key={cat} onClick={()=>setFilter(cat)}
              style={{ padding:"5px 12px", borderRadius:20, border:`1px solid ${filter===cat?C.gold:C.goldBorder}`,
                background:filter===cat?C.goldFaint:"transparent", color:filter===cat?C.goldL:C.muted,
                fontSize:11, fontFamily:"'Raleway',sans-serif", cursor:"pointer" }}>
              {cat==="ALL"?"Toutes catégories":cat}
            </button>
          ))}
        </div>
        {["gestionnaire","gerant","admin"].includes(role) && (
          <div style={{ marginLeft:"auto" }}>
            <Btn variant="outline" onClick={()=>setShowAdd(true)}>+ Nouveau produit</Btn>
          </div>
        )}
      </div>

      {/* Products grid */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(240px,1fr))", gap:12, marginBottom:28 }}>
        {filtered.map((p,i) => {
          const low = p.qte < p.seuil;
          const exp = new Date(p.peremption) < new Date(Date.now()+4*86400000);
          const pct = Math.min(100, p.seuil > 0 ? (p.qte / (p.seuil * 3)) * 100 : 80);
          return (
            <Card key={p.id} className="anim-fadeUp"
              style={{ padding:16, animationDelay:`${i*25}ms`, border:`1px solid ${low?C.dangerBdr:exp?C.warningBdr:"rgba(255,255,255,0.06)"}` }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:10 }}>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:13, fontWeight:700, color:C.cream }} className="truncate">{p.nom}</div>
                  <div style={{ fontSize:10, color:C.muted, marginTop:2 }}>{p.categorie}</div>
                </div>
                {(low||exp) && <Badge color={low?C.danger:C.warning} style={{ fontSize:9, marginLeft:8 }}>{low?"⚠ Faible":"⏰ Expiration"}</Badge>}
              </div>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6, alignItems:"baseline" }}>
                <span className="serif" style={{ fontSize:20, fontWeight:700, color:low?C.danger:C.cream }}>{p.qte}<span style={{ fontSize:11, color:C.muted, fontFamily:"'Raleway',sans-serif", fontWeight:400 }}> {p.unite}</span></span>
                <span style={{ fontSize:10, color:C.muted }}>seuil: {p.seuil}</span>
              </div>
              <div style={{ height:4, background:C.bg4, borderRadius:3, marginBottom:8, overflow:"hidden" }}>
                <div style={{ height:"100%", width:`${pct}%`, background:low?C.danger:exp?C.warning:C.success, borderRadius:3, transition:"width .5s" }}/>
              </div>
              <div style={{ fontSize:10, color:exp?C.danger:C.muted }}>
                Péremption: {new Date(p.peremption).toLocaleDateString("fr-FR")}
              </div>
            </Card>
          );
        })}
      </div>

      {/* Pending validations (manager/admin) */}
      {["manager","admin"].includes(role) && (
        <>
          <Divider label="Mouvements en attente de validation" style={{ marginBottom:14 }}/>
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            {movements.filter(m=>m.statut==="EN_ATTENTE").map((m,i) => {
              const meta = MVT_TYPE_META[m.type];
              return (
                <Card key={m.id} className="anim-fadeUp" style={{ padding:"14px 18px", animationDelay:`${i*30}ms`, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <div style={{ display:"flex", gap:12, alignItems:"center" }}>
                    <div style={{ width:38, height:38, borderRadius:9, background:`${meta?.color}18`, border:`1px solid ${meta?.color}40`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:16 }}>{meta?.icon}</div>
                    <div>
                      <div style={{ display:"flex", gap:8, alignItems:"center", marginBottom:3 }}>
                        <Badge color={meta?.color}>{m.type}</Badge>
                        <span style={{ fontSize:13, fontWeight:600, color:C.cream }}>{m.produit}</span>
                        <span style={{ fontSize:12, color:C.muted }}>— {m.qte} unités</span>
                      </div>
                      <div style={{ fontSize:11, color:C.muted }}>{m.justification} · {m.auteur}</div>
                    </div>
                  </div>
                  <div style={{ display:"flex", gap:8, flexShrink:0 }}>
                    <Btn small variant="success" loading={loading} onClick={()=>validateMvt(m.id)}>✓ Valider</Btn>
                    <Btn small variant="danger"  loading={loading} onClick={()=>rejectMvt(m.id)}>Rejeter</Btn>
                  </div>
                </Card>
              );
            })}
            {movements.filter(m=>m.statut==="EN_ATTENTE").length===0 && (
              <div style={{ textAlign:"center", color:C.success, fontSize:13, padding:20 }}>✓ Aucun mouvement en attente</div>
            )}
          </div>
        </>
      )}

      <Modal open={showAdd} onClose={()=>setShowAdd(false)} title="Nouveau produit en stock">
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
          <div style={{ gridColumn:"1/-1" }}>
            <Input label="Nom du produit" value={form.nom} onChange={v=>setForm(f=>({...f,nom:v}))} required/>
          </div>
          <Input label="Catégorie" value={form.categorie} onChange={v=>setForm(f=>({...f,categorie:v}))} placeholder="Ex: Viandes"/>
          <Select label="Unité" value={form.unite} onChange={v=>setForm(f=>({...f,unite:v}))}
            options={["kg","g","L","ml","pcs","boîte","sachet"].map(u=>({value:u,label:u}))}/>
          <Input label="Quantité initiale" type="number" value={form.qte} onChange={v=>setForm(f=>({...f,qte:v}))} required min="0"/>
          <Input label="Seuil d'alerte" type="number" value={form.seuil} onChange={v=>setForm(f=>({...f,seuil:v}))} min="0"/>
          <div style={{ gridColumn:"1/-1" }}>
            <Input label="Date de péremption" type="date" value={form.peremption} onChange={v=>setForm(f=>({...f,peremption:v}))}/>
          </div>
          <div style={{ gridColumn:"1/-1", display:"flex", gap:10, justifyContent:"flex-end" }}>
            <Btn variant="ghost" onClick={()=>setShowAdd(false)}>Annuler</Btn>
            <Btn loading={loading} onClick={addProduct}>Ajouter au stock</Btn>
          </div>
        </div>
      </Modal>
    </div>
  );
};

/* ══════════════════════════════════════════════════════════
   STOCK ENTRIES SCREEN
   ══════════════════════════════════════════════════════════ */

export default StockScreen;
