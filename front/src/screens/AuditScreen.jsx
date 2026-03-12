import { useState, useEffect } from "react";
import { C, timeAgo } from "../styles/tokens";
import { auditService } from "../api/services";
import { Card, Badge, Btn, Empty, Spinner } from "../components/ui";

const AuditScreen = ({ toast }) => {
  const [logs,    setLogs]    = useState(null);   // null = chargement en cours
  const [search,  setSearch]  = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    auditService.list()
      .then(data => { setLogs(data ? (data.results ?? data) : []); })
      .catch(() => { setLogs([]); })
      .finally(() => setLoading(false));
  }, []);

  const doExport = async (format) => {
    try { await auditService.export(format); }
    catch (err) { toast.warning("Export", err.message); }
  };

  const filtered = (logs ?? []).filter(l =>
    (l.user  ?? "").toLowerCase().includes(search.toLowerCase()) ||
    (l.action ?? "").toLowerCase().includes(search.toLowerCase()) ||
    (l.details ?? "").toLowerCase().includes(search.toLowerCase())
  );

  const actionColors = {
    CONNEXION: C.info, VALIDATION_ENTRÉE: C.success, ACCEPTATION_COMMANDE: C.success,
    ENREGISTREMENT_PAIEMENT: C.gold, NOUVELLE_COMMANDE: C.info, ALERTE_STOCK: C.danger,
    REJET_ENTRÉE: C.danger, CRÉATION_UTILISATEUR: C.purple, ANNULATION_COMMANDE: C.warning,
    GÉNÉRATION_FACTURE: C.success,
  };

  return (
    <div style={{ padding: 28, overflowY: "auto", flex: 1 }}>
      <div style={{ display: "flex", gap: 12, marginBottom: 20, alignItems: "center" }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="🔍 Rechercher dans les logs…"
          style={{
            background: C.bg2, border: `1px solid rgba(255,255,255,0.08)`, borderRadius: 8,
            padding: "8px 14px", color: C.cream, fontSize: 13, width: 300,
            fontFamily: "'Raleway',sans-serif",
          }}
        />
        <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
          {["CSV", "Excel", "TXT"].map(f => (
            <Btn key={f} small variant="ghost" onClick={() => doExport(f.toLowerCase())}>{f}</Btn>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", paddingTop: 80 }}>
          <Spinner />
        </div>
      ) : filtered.length === 0 ? (
        <Empty icon="📋" text="Aucun log trouvé" />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {filtered.map((log, i) => (
            <Card key={log.id ?? i} className="anim-fadeUp" style={{ padding: "12px 18px", animationDelay: `${i * 25}ms` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 4 }}>
                    <Badge color={actionColors[log.action] ?? C.muted}>{log.action}</Badge>
                    <span style={{ fontSize: 12, color: C.mutedL, fontWeight: 600 }}>{log.user}</span>
                  </div>
                  <div style={{ fontSize: 12, color: C.muted }}>{log.details}</div>
                </div>
                <div style={{ fontSize: 11, color: C.muted, textAlign: "right", flexShrink: 0, marginLeft: 16 }}>
                  <div>{log.date}</div>
                  <div>{log.heure}</div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default AuditScreen;