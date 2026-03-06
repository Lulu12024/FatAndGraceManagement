import { useState } from "react";
import { C, MVT_TYPE_META, MVT_STATUS_META, fmt, now, timeAgo} from "../styles/tokens";
import { movementsService } from "../api/stock";
import {  handleApiError } from "../hooks";
import { Card, Badge, Btn, Modal, Input, Select, Empty, Spinner } from "../components/ui";

const MovementsScreen = ({ movements, setMovements, products, role, toast, typeFilter: defaultType="ALL" }) => {
  const [showForm, setShowForm] = useState(false);
  const [typeF, setTypeF] = useState(defaultType);
  const [exitItem, setExitItem] = useState("");
  const [motif, setMotif] = useState("");
  const [qte, setQte] = useState("1");
  const [loading, setLoading] = useState(false);

  const visible = typeF==="ALL" ? movements : movements.filter(m=>m.type===typeF);

  const submit = async () => {
    if (!exitItem || !motif) { toast.warning("","Produit et motif requis"); return; }
    setLoading(true);
    try {
      const prod = products.find(p=>String(p.id)===String(exitItem));
      const mvt = await movementsService.create({ produit_id:exitItem, type:"SUPPRESSION", qte:Number(qte), justification:motif });
      setMovements(p=>[{ ...mvt, produitId:exitItem, produit:prod?.nom||"?", type:"SUPPRESSION", qte:Number(qte), statut:"EN_ATTENTE", justification:motif, auteur:"Utilisateur courant", date:now() },...p]);
      setExitItem(""); setMotif(""); setQte("1"); setShowForm(false);
      toast.success("Sortie soumise","Manager notifié pour validation");
    } catch(err) { handleApiError(err,toast); } finally { setLoading(false); }
  };

  return (
    <div style={{ padding:28, overflowY:"auto", flex:1 }}>
      <div style={{ display:"flex", gap:8, marginBottom:20, flexWrap:"wrap", alignItems:"center" }}>
        {["ALL","ENTRÉE","SORTIE","SUPPRESSION"].map(t => (
          <button key={t} onClick={()=>setTypeF(t)}
            style={{ padding:"5px 13px", borderRadius:20, border:`1px solid ${typeF===t?C.gold:C.goldBorder}`,
              background:typeF===t?C.goldFaint:"transparent", color:typeF===t?C.goldL:C.muted,
              fontSize:12, fontFamily:"'Raleway',sans-serif", cursor:"pointer" }}>
            {t==="ALL"?"Tous les mouvements":t}
          </button>
        ))}
        {["gestionnaire","gérant","admin"].includes(role) && (
          <Btn variant="outline" small onClick={()=>setShowForm(true)} style={{ marginLeft:"auto" }}>+ Initier une sortie</Btn>
        )}
      </div>

      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        {visible.map((m,i) => {
          const meta   = MVT_TYPE_META[m.type];
          const stMeta = MVT_STATUS_META[m.statut] ?? { label: m.statut, color: C.muted };
          return (
            <Card key={m.id} className="anim-fadeUp" style={{ padding:"12px 18px", animationDelay:`${i*25}ms`, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <div style={{ display:"flex", gap:12, alignItems:"center" }}>
                <div style={{ width:38, height:38, borderRadius:9, background:`${meta?.color}15`, border:`1px solid ${meta?.color}35`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:16 }}>{meta?.icon}</div>
                <div>
                  <div style={{ fontSize:13, fontWeight:600, color:C.cream }}>
                    {m.produit_nom ?? m.produit} 
                    <span style={{ color:C.muted }}>— {m.quantite ?? m.qte} unités</span>
                  </div>
                  <div style={{ fontSize:11, color:C.muted }}>
                    {m.justification} · {m.demandeur ?? m.auteur}
                  </div>
                </div>
              </div>
              <div style={{ textAlign:"right", flexShrink:0 }}>
                <Badge color={stMeta?.color}>{stMeta?.label}</Badge>
                <div style={{ fontSize:10, color:C.muted, marginTop:4 }}>{m.date ? `${m.date}${m.heure ? " " + m.heure.slice(0,5) : ""}` : "—"}</div>
              </div>
            </Card>
          );
        })}
        {visible.length === 0 && <Empty icon="📜" text="Aucun mouvement"/>}
      </div>

      <Modal open={showForm} onClose={()=>setShowForm(false)} title="Initier une sortie de stock">
        <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
          <Select label="Produit" value={exitItem} onChange={setExitItem} required
            options={[{value:"",label:"-- Sélectionner un produit --"}, ...products.map(p=>({value:String(p.id),label:`${p.nom} (${p.qte} ${p.unite} dispo.)`}))]}/>
          <Input label="Quantité" type="number" value={qte} onChange={setQte} min="0.1" step="0.1"/>
          <Select label="Motif de sortie" value={motif} onChange={setMotif} required
            options={[{value:"",label:"-- Sélectionner un motif --"},{value:"Périmé",label:"Périmé"},{value:"Détérioré",label:"Détérioré"},{value:"Cassé",label:"Cassé"},{value:"Contaminé",label:"Contaminé"},{value:"Autre",label:"Autre"}]}/>
          <div style={{ display:"flex", gap:10, justifyContent:"flex-end" }}>
            <Btn variant="ghost" onClick={()=>setShowForm(false)}>Annuler</Btn>
            <Btn variant="danger" loading={loading} onClick={submit} disabled={!exitItem||!motif}>Soumettre la sortie</Btn>
          </div>
        </div>
      </Modal>
    </div>
  );
};

/* ══════════════════════════════════════════════════════════
   INVOICES SCREEN
   ══════════════════════════════════════════════════════════ */

export default MovementsScreen;
