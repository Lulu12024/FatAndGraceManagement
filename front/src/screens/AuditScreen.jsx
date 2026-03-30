import { useState, useEffect, useCallback } from "react";
import { C } from "../styles/tokens";
import { auditService } from "../api/services";
import { Card, Badge, Btn, Empty, Spinner } from "../components/ui";

const PAGE_SIZE = 20;

const AuditScreen = ({ toast }) => {
  const [logs,       setLogs]       = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page,       setPage]       = useState(1);
  const [search,     setSearch]     = useState("");
  const [loading,    setLoading]    = useState(true);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  /* ── Fetch logs from backend with pagination ──────────── */
  const fetchLogs = useCallback(async (pageNum, searchTerm) => {
    setLoading(true);
    try {
      const params = { page: pageNum };
      if (searchTerm) params.search = searchTerm;

      const data = await auditService.list(params);
      setLogs(data.results || []);
      setTotalCount(data.count || 0);
    } catch {
      setLogs([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  }, []);

  /* ── Initial load + whenever page changes ─────────────── */
  useEffect(() => {
    fetchLogs(page, search);
  }, [page, fetchLogs]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Search with debounce reset to page 1 ─────────────── */
  useEffect(() => {
    const timeout = setTimeout(() => {
      setPage(1);
      fetchLogs(1, search);
    }, 400);
    return () => clearTimeout(timeout);
  }, [search, fetchLogs]);

  /* ── Export handler ────────────────────────────────────── */
  const doExport = async (format) => {
    try { await auditService.export(format); }
    catch (err) { toast.warning("Export", err.message); }
  };

  /* ── Action color mapping ─────────────────────────────── */
  const actionColors = {
    CREATE: C.success,   UPDATE: C.info,       DELETE: C.danger,
    LOGIN: C.info,       LOGOUT: C.muted,      VALIDATE: C.success,
    REJECT: C.danger,    APPROVE: C.success,    CANCEL: C.warning,
    // Legacy action names
    CONNEXION: C.info, VALIDATION_ENTRÉE: C.success, ACCEPTATION_COMMANDE: C.success,
    ENREGISTREMENT_PAIEMENT: C.gold, NOUVELLE_COMMANDE: C.info, ALERTE_STOCK: C.danger,
    REJET_ENTRÉE: C.danger, CRÉATION_UTILISATEUR: C.purple, ANNULATION_COMMANDE: C.warning,
    GÉNÉRATION_FACTURE: C.success,
  };

  /* ── Pagination range builder ─────────────────────────── */
  const getPageRange = () => {
    const range = [];
    const delta = 2;
    const left  = Math.max(2, page - delta);
    const right = Math.min(totalPages - 1, page + delta);

    range.push(1);
    if (left > 2) range.push("...");
    for (let i = left; i <= right; i++) range.push(i);
    if (right < totalPages - 1) range.push("...");
    if (totalPages > 1) range.push(totalPages);

    return range;
  };

  /* ── Pagination button style helper ───────────────────── */
  const pgBtn = (p, isActive) => ({
    background: isActive ? `linear-gradient(135deg,${C.gold},${C.goldD})` : C.bg3,
    color:      isActive ? "#07050A" : C.cream,
    border:     isActive ? "none" : `1px solid rgba(255,255,255,0.08)`,
    borderRadius: 8,
    width: 36, height: 36,
    display: "inline-flex", alignItems: "center", justifyContent: "center",
    fontSize: 13, fontWeight: isActive ? 700 : 500,
    cursor: p === "..." ? "default" : "pointer",
    transition: "all .2s",
    fontFamily: "'Raleway',sans-serif",
  });

  const navBtn = (disabled) => ({
    background: disabled ? C.bg2 : C.bg3,
    color:      disabled ? C.mutedD : C.cream,
    border:     `1px solid rgba(255,255,255,${disabled ? 0.04 : 0.08})`,
    borderRadius: 8,
    padding: "0 14px", height: 36,
    display: "inline-flex", alignItems: "center", justifyContent: "center",
    fontSize: 12, fontWeight: 600,
    cursor: disabled ? "not-allowed" : "pointer",
    transition: "all .2s",
    fontFamily: "'Raleway',sans-serif",
    letterSpacing: 0.3,
  });

  return (
    <div style={{ padding: 28, overflowY: "auto", flex: 1, display: "flex", flexDirection: "column" }}>
      {/* ── Header: search + export ────────────────────── */}
      <div style={{ display: "flex", gap: 12, marginBottom: 20, alignItems: "center", flexWrap: "wrap" }}>
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

        {/* Count badge */}
        {!loading && (
          <span style={{ fontSize: 12, color: C.muted, fontWeight: 500, letterSpacing: 0.3 }}>
            {totalCount} log{totalCount !== 1 ? "s" : ""} trouvé{totalCount !== 1 ? "s" : ""}
          </span>
        )}

        <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
          {["CSV", "Excel", "TXT"].map(f => (
            <Btn key={f} small variant="ghost" onClick={() => doExport(f.toLowerCase())}>{f}</Btn>
          ))}
        </div>
      </div>

      {/* ── Log list ───────────────────────────────────── */}
      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", paddingTop: 80, flex: 1 }}>
          <Spinner />
        </div>
      ) : logs.length === 0 ? (
        <Empty icon="📋" text="Aucun log trouvé" />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, flex: 1 }}>
          {logs.map((log, i) => (
            <Card key={log.id ?? i} className="anim-fadeUp" style={{ padding: "12px 18px", animationDelay: `${i * 25}ms` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 4, flexWrap: "wrap" }}>
                    <Badge color={actionColors[log.action] ?? C.muted}>{log.action}</Badge>
                    {log.type_action && (
                      <span style={{
                        fontSize: 10, color: C.mutedL, fontWeight: 600,
                        padding: "1px 7px", borderRadius: 4,
                        background: "rgba(255,255,255,0.04)",
                        letterSpacing: 0.3,
                      }}>
                        {log.type_action}
                      </span>
                    )}
                    <span style={{ fontSize: 12, color: C.mutedL, fontWeight: 600 }}>{log.user}</span>
                  </div>
                  <div style={{ fontSize: 12, color: C.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {log.details || log.description}
                  </div>
                </div>
                <div style={{ fontSize: 11, color: C.muted, textAlign: "right", flexShrink: 0, marginLeft: 16, lineHeight: 1.6 }}>
                  <div>{log.date}</div>
                  <div>{log.heure}</div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* ── Pagination controls ────────────────────────── */}
      {!loading && totalPages > 1 && (
        <div style={{
          display: "flex", justifyContent: "center", alignItems: "center",
          gap: 6, paddingTop: 24, paddingBottom: 8,
          borderTop: `1px solid rgba(255,255,255,0.06)`, marginTop: 16,
        }}>
          {/* Previous */}
          <button
            disabled={page === 1}
            onClick={() => setPage(p => Math.max(1, p - 1))}
            style={navBtn(page === 1)}
          >
            ← Précédent
          </button>

          {/* Page numbers */}
          <div style={{ display: "flex", gap: 4 }}>
            {getPageRange().map((p, idx) => (
              <button
                key={idx}
                disabled={p === "..."}
                onClick={() => p !== "..." && setPage(p)}
                style={pgBtn(p, p === page)}
                className={p !== "..." && p !== page ? "hover-bg" : ""}
              >
                {p}
              </button>
            ))}
          </div>

          {/* Next */}
          <button
            disabled={page === totalPages}
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            style={navBtn(page === totalPages)}
          >
            Suivant →
          </button>
        </div>
      )}
    </div>
  );
};

export default AuditScreen;