import { useState, useEffect } from "react";
import { C, fmt } from "../styles/tokens";
import { Card, StatCard, Btn, Divider } from "../components/ui";
import { reportsService } from "../api/services";
import { api, unwrap } from "../api/client";

const ReportsScreen = ({ toast }) => {
  const [db, setDb] = useState(null);
  const [ord, setOrd] = useState(null);
  const [stk, setStk] = useState(null);
  const [history, setHistory] = useState([]);
  const [preview, setPreview] = useState(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

  // Fetch tous les rapports dynamiques
  const fetchAll = async () => {
    try {
      const _db = await reportsService.dashboard();
      const _ord = await reportsService.orders("30"); 
      const _stk = await reportsService.stock();
      
      let _hist = [];
      try {
          const h = await api.get('/rapports/');
          _hist = h.results || h || [];
      } catch(e) {}
      
      setDb(_db);
      setOrd(_ord);
      setStk(_stk);
      setHistory(Array.isArray(_hist) ? _hist : []);
    } catch (err) {
      toast.warning("Rapports", "Erreur réseau lors du chargement des statistiques dynamiques");
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const doExport = async (type, format) => {
    try {
      if (format === 'json') {
        setLoadingPreview(true);
        const res = await api.get(`/reports/export/?type=${type}&format=json`);
        setPreview(unwrap(res));
      } else {
        await reportsService.export(type, format);
        toast.success("Succès", `Rapport ${type} exporté avec succès en ${format.toUpperCase()}`);
        
        // Rafraichir l'historique après l'export pour voir la nouvelle ligne d'archive
        setTimeout(async () => {
             const h = await api.get('/rapports/');
             setHistory(h.results || h || []);
        }, 1200);
      }
    } catch(err) { 
        toast.warning("Erreur", err.message); 
    } finally {
        setLoadingPreview(false);
    }
  };

  if (!db || !ord || !stk) return <div style={{padding:28, color:C.muted}}>Connexion au flux des rapports...</div>;

  return (
    <div style={{ padding:28, overflowY:"auto", flex:1, position: "relative" }}>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))", gap:14, marginBottom:28 }}>
        <StatCard label="CA du Jour" value={fmt(db.ca_jour)} icon="💵" color={C.gold} sub={`${db.commandes_jour.livrees} livraisons`}/>
        <StatCard label="CA (30 jours)" value={fmt(ord.ca)} icon="💰" color={C.success} sub={`${ord.total} cmdes globales`} />
        <StatCard label="Taux annulation" value={`${ord.taux_annulation}%`} icon="📉" color={C.danger} sub={`${ord.annulees} commandes`}/>
        <StatCard label="Mvts du mois" value={`${stk.mouvements_mois.entrees} (In) / ${stk.mouvements_mois.sorties} (Out)`} icon="📦" color={C.info} />
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:18, marginBottom:18 }}>
        
        {/* Top Produits */}
        <Card style={{ padding:22 }}>
          <h3 className="serif" style={{ fontSize:16, color:C.cream, marginBottom:18 }}>Top Plats (30 jours)</h3>
          {ord.top_plats.map((p,i) => (
            <div key={i} style={{ display:"flex", justifyContent:"space-between", marginBottom:10, padding:"7px 10px", background:C.bg3, borderRadius:8 }}>
              <div style={{ color:C.cream, fontSize:13 }}>{i+1}. {p.plat__nom}</div>
              <div style={{ fontWeight:700, color:C.success, fontSize:13 }}>{p.total_qte} unités</div>
            </div>
          ))}
          {ord.top_plats.length === 0 && <div style={{color:C.muted, fontSize:13}}>Aucune donnée disponible.</div>}
        </Card>

        {/* Produits en Alerte */}
        <Card style={{ padding:22 }}>
          <h3 className="serif" style={{ fontSize:16, color:C.cream, marginBottom:18 }}>État des Alertes (Stock)</h3>
          {stk.en_alerte.map((p,i) => (
            <div key={i} style={{ display:"flex", justifyContent:"space-between", marginBottom:10, padding:"7px 10px", background:C.bg3, borderRadius:8 }}>
              <div style={{ color:C.cream, fontSize:13 }}>{p.nom} • <span style={{color:C.muted}}>{p.categorie}</span></div>
              <div style={{ fontWeight:700, color:C.danger, fontSize:13 }}>{p.qte} ≤ {p.seuil}</div>
            </div>
          ))}
          {stk.en_alerte.length === 0 && <div style={{color:C.muted, fontSize:13}}>Tous les stocks sont normaux.</div>}
        </Card>
      </div>

      {/* Zone Exporter et Archive */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:18 }}>
        <Card style={{ padding:22 }}>
          <h3 className="serif" style={{ fontSize:16, color:C.cream, marginBottom:16 }}>Console d'Extraction</h3>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))", gap:12 }}>
            {[
              { label:"Commandes",    type:"orders",   icon:"📋" },
              { label:"Stock",        type:"stock",    icon:"📦" },
              { label:"Factures",     type:"invoices", icon:"🧾" },
              { label:"Mouvements",   type:"movements",icon:"📜" },
            ].map(item => (
              <Card key={item.type} style={{ padding:16, background: C.bg2, border: 'none' }}>
                <div style={{ fontSize:20, marginBottom:8 }}>{item.icon}</div>
                <div style={{ fontSize:13, fontWeight:600, color:C.cream, marginBottom:12 }}>Exploitation {item.label}</div>
                <div style={{ display:"flex", gap:6, flexWrap: "wrap" }}>
                  <Btn small variant="ghost" onClick={()=>doExport(item.type, "json")}>{loadingPreview ? "..." : "Voir JSON"}</Btn>
                  <Btn small variant="ghost" onClick={()=>doExport(item.type, "csv")}>CSV</Btn>
                  <Btn small variant="ghost" onClick={()=>doExport(item.type, "excel")}>EXCEL</Btn>
                  <Btn small variant="ghost" onClick={()=>doExport(item.type, "pdf")}>PDF</Btn>
                </div>
              </Card>
            ))}
          </div>
        </Card>
      
        <Card style={{ padding:22 }}>
          <h3 className="serif" style={{ fontSize:16, color:C.cream, marginBottom:16 }}>Archives récentes (Générées)</h3>
          <div style={{maxHeight: "300px", overflowY: "auto"}}>
            {history.slice(0, 10).map((h, i) => (
              <div key={i} style={{ padding:"10px", background:C.bg3, borderRadius:8, marginBottom: 8}}>
                 <div style={{fontSize: 12, color: C.muted, marginBottom: 4}}>{h.date_generation.slice(0,16).replace("T", " ")}</div>
                 <div style={{fontSize: 13, color: C.cream, fontWeight: 600}}>Type : {h.type}</div>
                 <div style={{fontSize: 12, color: C.mutedL}}>{h.contenu}</div>
              </div>
            ))}
            {history.length === 0 && <div style={{fontSize: 13, color: C.muted}}>Aucun historique d'export disponible.</div>}
          </div>
        </Card>
      </div>

      {preview && (
        <div style={{position: "fixed", top:0, left:0, right:0, bottom:0, background:"rgba(0,0,0,0.8)", display:"flex", justifyContent:"center", alignItems:"center", zIndex:9999}}>
          <Card style={{width: "80%", height: "80%", padding: 28, display:"flex", flexDirection:"column", overflow:"hidden"}}>
             <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom: 20}}>
                <h2 style={{color: C.gold, fontSize: 18}} className="serif">Prévisualisation : {preview.filename}</h2>
                <Btn onClick={() => setPreview(null)} variant="ghost" small>Fermer ✕</Btn>
             </div>
             
             <div style={{flex:1, overflow:"auto", border: `1px solid ${C.bg4}`, borderRadius: 8}}>
               <table style={{width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: 13}}>
                 <thead style={{background: C.bg2, position:"sticky", top: 0}}>
                   <tr>
                     {preview.headers.map((h, idx) => (
                       <th key={idx} style={{padding: "12px", borderBottom: `1px solid ${C.bg4}`, color: C.cream}}>{h}</th>
                     ))}
                   </tr>
                 </thead>
                 <tbody>
                   {preview.data.map((row, rIdx) => (
                      <tr key={rIdx} style={{background: rIdx % 2 === 0 ? C.bg3 : C.bg1}}>
                        {row.map((cell, cIdx) => (
                          <td key={cIdx} style={{padding: "10px 12px", borderBottom: `1px solid ${C.bg4}`, color: C.mutedL}}>
                            {cell !== null && cell !== undefined ? cell.toString() : ""}
                          </td>
                        ))}
                      </tr>
                   ))}
                 </tbody>
               </table>
               {preview.data.length === 0 && <div style={{padding: 20, textAlign: "center", color: C.muted}}>Tableau vide</div>}
             </div>
             
             <div style={{display:"flex", gap: 12, marginTop: 20}}>
                <div style={{fontSize: 13, color: C.muted}}>
                   Si ce résultat vous convient, vous pouvez fermer cette fenêtre pour l'exporter en Excel ou PDF.
                </div>
             </div>
          </Card>
        </div>
      )}

    </div>
  );
};

export default ReportsScreen;
