import { useState, useEffect } from "react";
import { C, MVT_STATUS_META } from "../styles/tokens";
import { demandesService } from "../api/stock";
import { Card, Badge, Btn, Input, Select, Empty } from "../components/ui";
import { handleApiError } from "../hooks/index";

const STATUS_DEMANDE = {
  "EN_ATTENTE": { label: "En attente", color: "#F59E0B" },
  "VALIDEE":    { label: "Validée",    color: "#10B981" },
  "REJETEE":    { label: "Rejetée",    color: "#EF4444" },
};

const StockRequestScreen = ({ products, toast }) => {
  const [sel,      setSel]      = useState("");
  const [qte,      setQte]      = useState("1");
  const [justif,   setJustif]   = useState("");
  const [loading,  setLoading]  = useState(false);
  const [demandes, setDemandes] = useState([]);

  /* ── Charger mes demandes ── */
  useEffect(() => {
    demandesService.list()
      .then(d => setDemandes(Array.isArray(d) ? d : (d.results ?? [])))
      .catch(() => {});
  }, []);

  /* ── Soumettre une demande ── */
  const submit = async () => {
    if (!sel || !justif) {
      toast.warning("", "Sélectionnez un produit et justifiez la demande"); return;
    }
    setLoading(true);
    try {
      const nouvelle = await demandesService.create({
        produit:  Number(sel),
        quantite: Number(qte),
        motif:    justif,
      });
      setDemandes(prev => [nouvelle, ...prev]);
      setSel(""); setQte("1"); setJustif("");
      toast.success("Demande soumise", "Le gestionnaire va traiter votre demande");
    } catch(err) { handleApiError(err, toast); }
    finally { setLoading(false); }
  };

  return (
    <div style={{ padding: 28, overflowY: "auto", flex: 1 }}>

      {/* ── Formulaire ── */}
      <Card style={{ padding: 24, maxWidth: 500, marginBottom: 28 }}>
        <h3 className="serif" style={{ fontSize: 17, color: C.goldL, marginBottom: 18 }}>
          Demande de sortie de stock
        </h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <Select
            label="Produit *"
            value={sel}
            onChange={setSel}
            required
            options={[
              { value: "", label: "-- Sélectionner un produit --" },
              ...products.map(p => ({
                value: String(p.id),
                label: `${p.nom} — ${p.qte} ${p.unite} dispo.`,
              })),
            ]}
          />
          <Input
            label="Quantité demandée"
            type="number"
            value={qte}
            onChange={setQte}
            min="0.1"
            step="0.1"
          />
          <Input
            label="Justification *"
            value={justif}
            onChange={setJustif}
            placeholder="Ex: Pour la commande CMD-004…"
            required
            textarea
          />
          <Btn loading={loading} onClick={submit} disabled={!sel || !justif}>
            Envoyer la demande
          </Btn>
        </div>
      </Card>

      {/* ── Mes demandes récentes ── */}
      <h4 style={{
        color: C.muted, fontSize: 11, letterSpacing: 1.5,
        textTransform: "uppercase", marginBottom: 12,
      }}>
        Mes demandes récentes
      </h4>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {demandes.length === 0 ? (
          <Empty icon="📦" text="Aucune demande de stock"/>
        ) : (
          demandes.map(d => {
            const st = STATUS_DEMANDE[d.statut] ?? { label: d.statut, color: C.muted };
            return (
              <Card key={d.id} style={{
                padding: "12px 16px",
                display: "flex", justifyContent: "space-between", alignItems: "center",
              }}>
                <div>
                  <span style={{ fontSize: 13, fontWeight: 600, color: C.cream }}>
                    {d.produit_nom}
                  </span>
                  <span style={{ fontSize: 12, color: C.muted }}> — {d.quantite} unités</span>
                  <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{d.motif}</div>
                  <div style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>
                    {d.date_demande ? new Date(d.date_demande).toLocaleDateString("fr-FR") : ""}
                  </div>
                </div>
                <Badge color={st.color}>{st.label}</Badge>
              </Card>
            );
          })
        )}
      </div>

    </div>
  );
};

export default StockRequestScreen;