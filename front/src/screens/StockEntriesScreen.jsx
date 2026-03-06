import { useState } from "react";
import { C, MVT_STATUS_META, fmt, now } from "../styles/tokens";
import { movementsService } from "../api/stock";
import { Card, Badge, Btn, Modal, Input, Select, Empty } from "../components/ui";
import { handleApiError } from "../hooks/index";

const StockEntriesScreen = ({ products, movements, setMovements, role, toast }) => {
  const [showForm, setShowForm] = useState(false);
  const [fournisseur, setFournisseur] = useState("");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!fournisseur || !items.length) { toast.warning("","Fournisseur et produits requis"); return; }
    setLoading(true);
    try {
      for (const item of items) {
        const mvt = await movementsService.create({ produit_id:item.id, type:"ENTRÉE", quantite:item.qte, justification:`Livraison ${fournisseur}` });
        setMovements(p=>[{ ...mvt, produitId:item.id, produit:item.nom, type:"ENTRÉE", quantite:item.qte, statut:"EN_ATTENTE", justification:`Livraison ${fournisseur}`, auteur:"Utilisateur courant", date:now() },...p]);
      }
      setFournisseur(""); setItems([]); setShowForm(false);
      toast.success("Entrée enregistrée","Manager notifié pour validation");
    } catch(err) { handleApiError(err,toast); } finally { setLoading(false); }
  };

  const entries = movements.filter(m=>m.type==="ENTRÉE");

  return (
    <div style={{ padding:28, overflowY:"auto", flex:1 }}>
      <div style={{ display:"flex", justifyContent:"flex-end", marginBottom:20 }}>
        <Btn onClick={()=>setShowForm(true)}>+ Enregistrer une entrée</Btn>
      </div>
      <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
        {entries.map((m,i) => {
          const stMeta = MVT_STATUS_META[m.statut];
          return (
            <Card key={m.id} className="anim-fadeUp" style={{ padding:"14px 18px", animationDelay:`${i*35}ms` }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <div>
                  <div style={{ display:"flex", gap:8, alignItems:"center", marginBottom:4 }}>
                    <span style={{ fontSize:12, fontWeight:700, color:C.mutedL }}>{m.id}</span>
                    <Badge color={stMeta?.color}>{stMeta?.label}</Badge>
                  </div>
                  <div style={{ fontSize:14, fontWeight:600, color:C.cream }}>{m.produit} — <span style={{ fontWeight:400, color:C.muted }}>{m.qte} unités</span></div>
                  <div style={{ fontSize:11, color:C.muted, marginTop:2 }}>{m.justification} · {m.auteur} · {new Date(m.date).toLocaleString("fr-FR")}</div>
                </div>
              </div>
            </Card>
          );
        })}
        {entries.length === 0 && <Empty icon="📥" text="Aucune entrée de stock"/>}
      </div>

      <Modal open={showForm} onClose={()=>{setShowForm(false);setItems([]);setFournisseur("");}} title="Enregistrer une entrée de stock" width={540}>
        <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
          <Input label="Fournisseur" value={fournisseur} onChange={setFournisseur} placeholder="Nom du fournisseur" required/>
          <div>
            <div style={{ fontSize:11, color:C.muted, letterSpacing:1.2, textTransform:"uppercase", marginBottom:8 }}>Produits reçus</div>
            <div style={{ maxHeight:210, overflowY:"auto", display:"flex", flexDirection:"column", gap:6 }}>
              {products.map(p => {
                const sel = items.find(i=>i.id===p.id);
                return (
                  <div key={p.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", background:C.bg3, borderRadius:8, padding:"8px 12px" }}>
                    <div>
                      <span style={{ fontSize:12, color:C.cream }}>{p.nom}</span>
                      <span style={{ fontSize:10, color:C.muted, marginLeft:6 }}>stock actuel: {p.qte}{p.unite}</span>
                    </div>
                    {sel ? (
                      <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                        <input type="number" value={sel.qte} min="0.1" step="0.1"
                          onChange={e=>setItems(prev=>prev.map(i=>i.id===p.id?{...i,qte:Number(e.target.value)}:i))}
                          style={{ width:60,background:C.bg4,border:`1px solid ${C.goldBorder}`,borderRadius:6,padding:"3px 7px",color:C.cream,fontSize:12 }}/>
                        <span style={{ fontSize:10, color:C.muted }}>{p.unite}</span>
                        <Btn small variant="danger" onClick={()=>setItems(prev=>prev.filter(i=>i.id!==p.id))}>✕</Btn>
                      </div>
                    ) : <Btn small variant="outline" onClick={()=>setItems(prev=>[...prev,{id:p.id,nom:p.nom,unite:p.unite,qte:1}])}>+ Ajouter</Btn>}
                  </div>
                );
              })}
            </div>
          </div>
          <div style={{ display:"flex", gap:10, justifyContent:"flex-end" }}>
            <Btn variant="ghost" onClick={()=>setShowForm(false)}>Annuler</Btn>
            <Btn loading={loading} onClick={submit} disabled={!fournisseur||!items.length}>Enregistrer</Btn>
          </div>
        </div>
      </Modal>
    </div>
  );
};

/* ══════════════════════════════════════════════════════════
   STOCK EXITS + HISTORY + VALIDATE (shared movements view)
   ══════════════════════════════════════════════════════════ */

export default StockEntriesScreen;
