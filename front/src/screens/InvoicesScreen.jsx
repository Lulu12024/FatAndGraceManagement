import { useState, useEffect } from "react";
import { C, fmt } from "../styles/tokens";
import { invoicesService } from "../api/services";
import { Card, Badge, Btn, Empty, Spinner } from "../components/ui";

const InvoicesScreen = ({ toast }) => {
  const [invoices, setInvoices] = useState(null);   // null = chargement en cours
  const [search,   setSearch]   = useState("");
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    setLoading(true);
    invoicesService.list()
      .then(data => { setInvoices(data ? (data.results ?? data) : []); })
      .catch(() => { setInvoices([]); })
      .finally(() => setLoading(false));
  }, []);

  const filtered = (invoices ?? []).filter(inv =>
    (inv.id ?? "").toLowerCase().includes(search.toLowerCase()) ||
    String(inv.tableNum ?? "").includes(search)
  );

  const dlPDF = async (inv) => {
    try { await invoicesService.downloadPdf(inv.num_id, `${inv.id}.pdf`); }
    catch (err) { toast.warning("PDF", err.message); }
  };

  return (
    <div style={{ padding: 28, overflowY: "auto", flex: 1 }}>
      <div style={{ marginBottom: 20 }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="🔍 Référence ou numéro de table…"
          style={{
            background: C.bg2, border: `1px solid rgba(255,255,255,0.08)`, borderRadius: 8,
            padding: "8px 14px", color: C.cream, fontSize: 13, width: 320,
            fontFamily: "'Raleway',sans-serif",
          }}
        />
      </div>

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", paddingTop: 80 }}>
          <Spinner />
        </div>
      ) : filtered.length === 0 ? (
        <Empty icon="🧾" text="Aucune facture trouvée" />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {filtered.map((inv, i) => (
            <Card key={inv.id} className="anim-fadeUp hover-lift" style={{ padding: "18px 22px", animationDelay: `${i * 45}ms` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 6 }}>
                    <span className="serif" style={{ fontSize: 15, color: C.goldL }}>{inv.id}</span>
                    <Badge color={C.success}>Réglée</Badge>
                  </div>
                  <div style={{ fontSize: 12, color: C.muted }}>
                    Table {inv.tableNum} · {new Date(inv.date).toLocaleString("fr-FR")}
                  </div>
                  <div style={{ fontSize: 12, color: C.muted, marginTop: 3 }}>
                    {inv.mode}{inv.pourboire > 0 && ` · Pourboire: ${fmt(inv.pourboire)}`}
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div className="serif" style={{ fontSize: 24, fontWeight: 700, color: C.goldL }}>
                    {fmt(inv.montant)}
                  </div>
                  <div style={{ display: "flex", gap: 6, marginTop: 10, justifyContent: "flex-end" }}>
                    <Btn small variant="ghost" onClick={() => dlPDF(inv)}>PDF ↓</Btn>
                    {/* <Btn small variant="outline">Réimprimer</Btn> */}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default InvoicesScreen;