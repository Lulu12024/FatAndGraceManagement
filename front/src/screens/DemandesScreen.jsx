import { useState, useEffect } from "react";
import { C } from "../styles/tokens";
import { Card, Badge, Btn, Empty } from "../components/ui";
import { handleApiError } from "../hooks/index";
import { demandesService } from "../api/stock";

const STATUS_META = {
  "EN_ATTENTE": { label: "En attente", color: "#F59E0B" },
  "VALIDEE":    { label: "Validée",    color: "#10B981" },
  "REJETEE":    { label: "Rejetée",    color: "#EF4444" },
};

const DemandesScreen = ({ role, toast }) => {
  const [demandes, setDemandes] = useState([]);
  const [loading,  setLoading]  = useState(false);
  const [fetching, setFetching] = useState(true);

  /* ── Charger toutes les demandes (gestionnaire voit tout) ── */
  useEffect(() => {
    setFetching(true);
    demandesService.list()
      .then(d => setDemandes(Array.isArray(d) ? d : (d.results ?? [])))
      .catch(() => {})
      .finally(() => setFetching(false));
  }, []);

  const pending = demandes.filter(d => d.statut === "EN_ATTENTE");
  const others  = demandes.filter(d => d.statut !== "EN_ATTENTE");

  /* ── Valider ── */
  const validate = async (id) => {
    setLoading(true);
    try {
      const updated = await demandesService.validate(id);
      setDemandes(prev => prev.map(d => d.id === id ? { ...d, statut: "VALIDEE" } : d));
      toast.success("Demande validée", "Mouvement de sortie créé");
    } catch(err) { handleApiError(err, toast); }
    finally { setLoading(false); }
  };

  /* ── Rejeter ── */
  const reject = async (id) => {
    const motif = prompt("Motif du rejet :");
    if (!motif) return;
    setLoading(true);
    try {
      await demandesService.reject(id, motif);
      setDemandes(prev => prev.map(d => d.id === id ? { ...d, statut: "REJETEE" } : d));
      toast.error("Demande rejetée", "");
    } catch(err) { handleApiError(err, toast); }
    finally { setLoading(false); }
  };

  if (fetching) return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", flex: 1, color: C.muted, fontSize: 13 }}>
      Chargement…
    </div>
  );

  return (
    <div style={{ padding: 28, overflowY: "auto", flex: 1 }}>

      {/* ── En attente ── */}
      <div style={{ fontSize: 11, color: C.muted, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 12 }}>
        En attente de validation ({pending.length})
      </div>

      {pending.length === 0 ? (
        <div style={{ textAlign: "center", color: C.success, fontSize: 13, padding: 20, marginBottom: 28 }}>
          ✓ Aucune demande en attente
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 28 }}>
          {pending.map((d, i) => (
            <Card key={d.id} className="anim-fadeUp"
              style={{ padding: "14px 18px", animationDelay: `${i * 30}ms`,
                display: "flex", justifyContent: "space-between", alignItems: "center",
                border: "1px solid rgba(245,158,11,0.2)" }}>
              <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
                <div style={{ width: 42, height: 42, borderRadius: 10,
                  background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.3)",
                  display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>
                  📦
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: C.cream, marginBottom: 3 }}>
                    {d.produit_nom}
                    <span style={{ fontWeight: 400, color: C.muted }}> — {d.quantite} unités</span>
                  </div>
                  <div style={{ fontSize: 11, color: C.muted }}>
                    {d.motif}
                  </div>
                  <div style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>
                    Demandé par <span style={{ color: C.goldL }}>{d.demandeur}</span>
                    {d.date_demande ? ` · ${new Date(d.date_demande).toLocaleDateString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}` : ""}
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                <Btn small variant="success" loading={loading} onClick={() => validate(d.id)}>
                  ✓ Valider
                </Btn>
                <Btn small variant="danger" loading={loading} onClick={() => reject(d.id)}>
                  Rejeter
                </Btn>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* ── Historique ── */}
      {others.length > 0 && (
        <>
          <div style={{ fontSize: 11, color: C.muted, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 12 }}>
            Historique ({others.length})
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {others.map(d => {
              const st = STATUS_META[d.statut] ?? { label: d.statut, color: C.muted };
              return (
                <Card key={d.id} style={{ padding: "12px 18px",
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  opacity: 0.7 }}>
                  <div>
                    <span style={{ fontSize: 13, fontWeight: 600, color: C.cream }}>{d.produit_nom}</span>
                    <span style={{ fontSize: 12, color: C.muted }}> — {d.quantite} unités</span>
                    <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>
                      {d.motif} · <span style={{ color: C.goldL }}>{d.demandeur}</span>
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <Badge color={st.color}>{st.label}</Badge>
                    <div style={{ fontSize: 10, color: C.muted, marginTop: 4 }}>
                      {d.date_demande ? new Date(d.date_demande).toLocaleDateString("fr-FR") : ""}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </>
      )}

      {demandes.length === 0 && <Empty icon="📋" text="Aucune demande de stock"/>}
    </div>
  );
};

export default DemandesScreen;