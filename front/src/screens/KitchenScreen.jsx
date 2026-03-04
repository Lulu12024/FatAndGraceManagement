import { useState } from "react";
import { C, ORDER_STATUS, MVT_TYPE_META, fmt, now, timeAgo } from "../styles/tokens";
import { ordersService } from "../api/orders";
import { movementsService } from "../api/stock";
import { Card, Badge, Btn, Modal, Input, Empty } from "../components/ui";

const KitchenScreen = ({ orders, setOrders, products, movements, setMovements, role, toast }) => {
  const [filter, setFilter] = useState("EN_ATTENTE_ACCEPTATION");
  const [rejectId, setRejectId]   = useState(null);
  const [motifRefus, setMotifRefus] = useState("");
  const [stockReqId, setStockReqId] = useState(null);
  const [stockItems, setStockItems] = useState([]);
  const [loading, setLoading] = useState(false);

  const visible = orders.filter(o=>filter==="ALL" ? !["ANNULÉE","REFUSÉE"].includes(o.status) : o.status===filter);

  const countFor = (s) => orders.filter(o=>o.status===s).length;

  const doAccept = async (id) => {
    setLoading(true);
    try {
      await ordersService.accept(id, null);
      setOrders(p=>p.map(o=>o.id===id?{...o,status:"EN_PRÉPARATION",cuisinier:"Marco Houénou"}:o));
      toast.success("Commande acceptée","En préparation");
    } catch(err) { handleApiError(err,toast); } finally { setLoading(false); }
  };

  const doReject = async () => {
    if (!motifRefus) { toast.warning("","Motif obligatoire"); return; }
    setLoading(true);
    try {
      await ordersService.reject(rejectId, motifRefus);
      setOrders(p=>p.map(o=>o.id===rejectId?{...o,status:"REFUSÉE",motif:motifRefus}:o));
      setRejectId(null); setMotifRefus("");
      toast.error("Commande refusée","Serveur notifié");
    } catch(err) { handleApiError(err,toast); } finally { setLoading(false); }
  };

  const doReady = async (id) => {
    setLoading(true);
    try {
      await ordersService.markReady(id);
      setOrders(p=>p.map(o=>o.id===id?{...o,status:"EN_ATTENTE_LIVRAISON"}:o));
      toast.gold("Commande prête","Serveur notifié");
    } catch(err) { handleApiError(err,toast); } finally { setLoading(false); }
  };

  const submitStockReq = async () => {
    if (!stockItems.length) { toast.warning("","Sélectionnez des produits"); return; }
    setLoading(true);
    try {
      for (const si of stockItems) {
        const mvt = await movementsService.create({ produit_id:si.id, type:"SORTIE", qte:si.qte, justification:`Commande ${stockReqId}` });
        setMovements(p=>[{...mvt, produitId:si.id, produit:si.nom, type:"SORTIE", qte:si.qte, statut:"EN_ATTENTE", justification:`Commande ${stockReqId}`, date:now() },...p]);
      }
      setStockReqId(null); setStockItems([]);
      toast.success("Demande de stock soumise","Gestionnaire notifié");
    } catch(err) { handleApiError(err,toast); } finally { setLoading(false); }
  };

  return (
    <div style={{ padding:28, overflowY:"auto", flex:1 }}>
      {/* Tabs */}
      <div style={{ display:"flex", gap:8, marginBottom:24, flexWrap:"wrap" }}>
        {[
          { v:"EN_ATTENTE_ACCEPTATION", l:"À accepter" },
          { v:"EN_PRÉPARATION",         l:"En préparation" },
          { v:"EN_ATTENTE_LIVRAISON",   l:"Prêtes" },
          { v:"ALL",                    l:"Toutes" },
        ].map(f => (
          <button key={f.v} onClick={()=>setFilter(f.v)}
            style={{ padding:"6px 14px", borderRadius:20, border:`1px solid ${filter===f.v?C.gold:C.goldBorder}`,
              background:filter===f.v?C.goldFaint:"transparent", color:filter===f.v?C.goldL:C.muted,
              fontSize:12, fontFamily:"'Raleway',sans-serif", cursor:"pointer", transition:"all .2s",
              display:"flex", alignItems:"center", gap:6 }}>
            {f.l}
            {f.v!=="ALL" && countFor(f.v)>0 && (
              <span style={{ background:f.v==="EN_ATTENTE_ACCEPTATION"?C.warning:f.v==="EN_ATTENTE_LIVRAISON"?C.gold:C.info, color:"#000", borderRadius:10, padding:"0 6px", fontSize:10, fontWeight:700, lineHeight:"16px" }}>
                {countFor(f.v)}
              </span>
            )}
          </button>
        ))}
      </div>

      {visible.length === 0 ? <Empty icon="👨‍🍳" text="Aucune commande"/> : (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))", gap:14 }}>
          {visible.map((o,i) => {
            const ost = ORDER_STATUS[o.status];
            return (
              <Card key={o.id} className="anim-fadeUp" style={{ padding:0, overflow:"hidden", animationDelay:`${i*45}ms` }}>
                <div style={{ height:3, background:ost?.color||C.gold }}/>
                <div style={{ padding:18 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", marginBottom:12 }}>
                    <div>
                      <div className="serif" style={{ fontSize:17, color:C.cream }}>{o.id}</div>
                      <div style={{ fontSize:12, color:C.muted, marginTop:2 }}>Table {o.tableNum} · {timeAgo(o.createdAt)}</div>
                    </div>
                    <Badge color={ost?.color}>{ost?.label}</Badge>
                  </div>
                  <div style={{ display:"flex", flexDirection:"column", gap:5, marginBottom:14 }}>
                    {o.items?.map((item,j) => (
                      <div key={j} style={{ display:"flex", justifyContent:"space-between", background:C.bg3, borderRadius:7, padding:"7px 10px" }}>
                        <span style={{ fontSize:13, color:C.cream }}>{item.nom}</span>
                        <span style={{ fontSize:12, color:C.gold, fontWeight:700 }}>×{item.qte}</span>
                      </div>
                    ))}
                  </div>
                  {o.obs && <div style={{ fontSize:11, color:C.mutedL, fontStyle:"italic", marginBottom:10, padding:"6px 10px", background:C.bg3, borderRadius:7 }}>📝 {o.obs}</div>}
                  <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                    {o.status==="EN_ATTENTE_ACCEPTATION" && (
                      <>
                        <Btn small variant="success" loading={loading} onClick={()=>doAccept(o.id)}>✓ Accepter</Btn>
                        <Btn small variant="danger"  onClick={()=>setRejectId(o.id)}>✕ Refuser</Btn>
                      </>
                    )}
                    {o.status==="EN_PRÉPARATION" && (
                      <>
                        <Btn small variant="gold"  loading={loading} onClick={()=>doReady(o.id)} style={{ background:C.goldFaint, color:C.goldL, border:`1px solid ${C.goldBorder}` }}>Marquer prête</Btn>
                        <Btn small variant="ghost" onClick={()=>setStockReqId(o.id)}>📦 Demander stock</Btn>
                      </>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Modal open={!!rejectId} onClose={()=>{setRejectId(null);setMotifRefus("");}} title="Refuser la commande">
        <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
          <Input label="Motif de refus" value={motifRefus} onChange={setMotifRefus} placeholder="Ex: Ingrédient manquant…" required textarea/>
          <div style={{ display:"flex", gap:10, justifyContent:"flex-end" }}>
            <Btn variant="ghost" onClick={()=>setRejectId(null)}>Annuler</Btn>
            <Btn variant="danger" loading={loading} onClick={doReject} disabled={!motifRefus}>Confirmer le refus</Btn>
          </div>
        </div>
      </Modal>

      <Modal open={!!stockReqId} onClose={()=>{setStockReqId(null);setStockItems([]);}} title="Demande de sortie de stock" width={520}>
        <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
          <p style={{ fontSize:12, color:C.muted }}>Sélectionnez les produits nécessaires pour cette commande.</p>
          <div style={{ maxHeight:220, overflowY:"auto", display:"flex", flexDirection:"column", gap:6 }}>
            {products.map(p => {
              const sel = stockItems.find(s=>s.id===p.id);
              return (
                <div key={p.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", background:C.bg3, borderRadius:8, padding:"8px 12px" }}>
                  <div>
                    <div style={{ fontSize:12, color:C.cream }}>{p.nom}</div>
                    <div style={{ fontSize:10, color:C.muted }}>{p.qte} {p.unite} disponible</div>
                  </div>
                  {sel ? (
                    <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                      <input type="number" value={sel.qte} min="0.1" step="0.1" max={p.qte}
                        onChange={e=>setStockItems(p=>p.map(s=>s.id===sel.id?{...s,qte:Number(e.target.value)}:s))}
                        style={{ width:60,background:C.bg4,border:`1px solid ${C.goldBorder}`,borderRadius:6,padding:"3px 7px",color:C.cream,fontSize:12 }}/>
                      <span style={{ fontSize:10, color:C.muted }}>{p.unite}</span>
                      <Btn small variant="danger" onClick={()=>setStockItems(p=>p.filter(s=>s.id!==sel.id))}>✕</Btn>
                    </div>
                  ) : (
                    <Btn small variant="outline" onClick={()=>setStockItems(p=>[...p,{id:p.id,nom:p.nom,unite:p.unite,qte:1}])}>+ Ajouter</Btn>
                  )}
                </div>
              );
            })}
          </div>
          <div style={{ display:"flex", gap:10, justifyContent:"flex-end" }}>
            <Btn variant="ghost" onClick={()=>setStockReqId(null)}>Annuler</Btn>
            <Btn loading={loading} onClick={submitStockReq} disabled={!stockItems.length}>Envoyer la demande</Btn>
          </div>
        </div>
      </Modal>
    </div>
  );
};

/* ══════════════════════════════════════════════════════════
   STOCK SCREEN
   ══════════════════════════════════════════════════════════ */

export default KitchenScreen;
