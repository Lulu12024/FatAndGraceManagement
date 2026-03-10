import { useState, useEffect } from "react";
import { C, ROLE_COLORS, timeAgo } from "../styles/tokens";
import { auditService } from "../api/services";
import { MOCK_AUDIT } from "../mock";
import { Card, Badge, Btn, Empty, Spinner } from "../components/ui";

const AuditScreen = ({ toast }) => {
  const [logs, setLogs]     = useState(MOCK_AUDIT);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    auditService.list()
      .then(data => { if (data) setLogs(data.results ?? data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const doExport = async (format) => {
    try { await auditService.export(format); }
    catch(err) { toast.warning("Export",err.message); }
  };

  const filtered = logs.filter(l =>
    l.user.toLowerCase().includes(search.toLowerCase()) ||
    l.action.toLowerCase().includes(search.toLowerCase()) ||
    l.details.toLowerCase().includes(search.toLowerCase())
  );

  const actionColors = {
    CONNEXION:C.info, VALIDATION_ENTRÉE:C.success, ACCEPTATION_COMMANDE:C.success,
    ENREGISTREMENT_PAIEMENT:C.gold, NOUVELLE_COMMANDE:C.info, ALERTE_STOCK:C.danger,
    REJET_ENTRÉE:C.danger, CRÉATION_UTILISATEUR:C.purple, ANNULATION_COMMANDE:C.warning,
    GÉNÉRATION_FACTURE:C.success,
  };

  return (
    <div style={{ padding:28, overflowY:"auto", flex:1 }}>
      <div style={{ display:"flex", gap:12, marginBottom:20, alignItems:"center" }}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍 Rechercher dans les logs…"
          style={{ background:C.bg2, border:`1px solid rgba(255,255,255,0.08)`, borderRadius:8,
            padding:"8px 14px", color:C.cream, fontSize:13, width:300, fontFamily:"'Raleway',sans-serif" }}/>
        <div style={{ marginLeft:"auto", display:"flex", gap:6 }}>
          {["CSV","Excel","TXT"].map(f => (
            <Btn key={f} small variant="ghost" onClick={()=>doExport(f.toLowerCase())}>{f}</Btn>
          ))}
        </div>
      </div>

      {loading ? <Spinner/> : (
        <Card style={{ overflow:"hidden" }}>
          <div style={{ overflowX:"auto" }}>
            <table style={{ width:"100%", borderCollapse:"collapse", minWidth:600 }}>
              <thead>
                <tr style={{ borderBottom:`1px solid rgba(255,255,255,0.06)` }}>
                  {["Date","Heure","Utilisateur","Action","Détails"].map(h => (
                    <th key={h} style={{ padding:"12px 16px", textAlign:"left", fontSize:10, fontWeight:700, color:C.muted, letterSpacing:1.5, textTransform:"uppercase", whiteSpace:"nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((l,i) => (
                  <tr key={l.id} className="anim-fadeIn" style={{ borderBottom:`1px solid rgba(255,255,255,0.04)`, animationDelay:`${i*15}ms` }}>
                    <td style={{ padding:"10px 16px", fontSize:12, color:C.muted, whiteSpace:"nowrap" }}>{l.date}</td>
                    <td style={{ padding:"10px 16px", fontSize:12, color:C.muted }}>{l.heure}</td>
                    <td style={{ padding:"10px 16px", fontSize:12, color:C.cream, fontWeight:500 }}>{l.user}</td>
                    <td style={{ padding:"10px 16px" }}>
                      <Badge color={actionColors[l.action]||C.mutedL} style={{ fontSize:10 }}>{l.action}</Badge>
                    </td>
                    <td style={{ padding:"10px 16px", fontSize:12, color:C.mutedL }}>{l.details}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filtered.length === 0 && <Empty icon="🔍" text="Aucun log correspondant"/>}
        </Card>
      )}
    </div>
  );
};

/* ══════════════════════════════════════════════════════════
   STATS SCREEN (Cuisinier)
   ══════════════════════════════════════════════════════════ */

export default AuditScreen;
