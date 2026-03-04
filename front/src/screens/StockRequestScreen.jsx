import { useState } from "react";
import { C, now } from "../styles/tokens";
import { movementsService } from "../api/stock";
import { Card, Badge, Btn, Modal, Input, Select, Empty } from "../components/ui";

const StockRequestScreen = ({ products, movements, setMovements, toast }) => {
  const [sel, setSel]       = useState("");
  const [qte, setQte]       = useState("1");
  const [justif, setJustif] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!sel || !justif) { toast.warning("","Sélectionnez un produit et justifiez la demande"); return; }
    setLoading(true);
    try {
      const prod = products.find(p=>String(p.id)===String(sel));
      const mvt = await movementsService.create({ produit_id:sel, type:"SORTIE", qte:Number(qte), justification:justif });
      setMovements(p=>[{ ...mvt, produitId:sel, produit:prod?.nom||"?", type:"SORTIE", qte:Number(qte), statut:"EN_ATTENTE", justification:justif, auteur:"Marco Houénou", date:now() },...p]);
      setSel(""); setQte("1"); setJustif("");
      toast.success("Demande soumise","Le gérant ou le gestionnaire va traiter votre demande");
    } catch(err) { handleApiError(err,toast); } finally { setLoading(false); }
  };

  const myReqs = movements.filter(m=>m.type==="SORTIE"&&m.auteur==="Marco Houénou");

  return (
    <div style={{ padding:28, overflowY:"auto", flex:1 }}>
      <Card style={{ padding:24, maxWidth:500, marginBottom:24 }}>
        <h3 className="serif" style={{ fontSize:17, color:C.goldL, marginBottom:18 }}>Demande de sortie de stock</h3>
        <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
          <Select label="Produit" value={sel} onChange={setSel} required
            options={[{value:"",label:"-- Sélectionner un produit --"},...products.map(p=>({value:String(p.id),label:`${p.nom} — ${p.qte} ${p.unite} dispo.`}))]}/>
          <Input label="Quantité demandée" type="number" value={qte} onChange={setQte} min="0.1" step="0.1"/>
          <Input label="Justification" value={justif} onChange={setJustif} placeholder="Ex: Pour la commande CMD-004…" required textarea/>
          <Btn loading={loading} onClick={submit} disabled={!sel||!justif}>Envoyer la demande</Btn>
        </div>
      </Card>

      <h4 style={{ color:C.muted, fontSize:11, letterSpacing:1.5, textTransform:"uppercase", marginBottom:12 }}>Mes demandes récentes</h4>
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        {myReqs.map(m => {
          const stMeta = MVT_STATUS_META[m.statut];
          return (
            <Card key={m.id} style={{ padding:"12px 16px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <div>
                <span style={{ fontSize:13, fontWeight:600, color:C.cream }}>{m.produit}</span>
                <span style={{ fontSize:12, color:C.muted }}> — {m.qte} unités</span>
                <div style={{ fontSize:11, color:C.muted, marginTop:2 }}>{m.justification}</div>
              </div>
              <Badge color={stMeta?.color}>{stMeta?.label}</Badge>
            </Card>
          );
        })}
        {myReqs.length === 0 && <Empty icon="📦" text="Aucune demande de stock"/>}
      </div>
    </div>
  );
};

/* ══════════════════════════════════════════════════════════
   ORDERS LIST SCREEN (general view)
   ══════════════════════════════════════════════════════════ */

export default StockRequestScreen;
