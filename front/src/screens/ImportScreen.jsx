import { useState, useRef } from "react";
import * as XLSX from "xlsx";
import { C } from "../styles/tokens";
import { platsService } from "../api/plats";
import { productsService, unitesService } from "../api/stock";
import { unwrap } from "../api/client";
import { Card, Btn, Badge, Divider } from "../components/ui";
import { handleApiError } from "../hooks/index";

// ─── Colonnes attendues ───────────────────────────────────────────
const PLAT_COLS   = ["nom", "prix", "categorie", "description", "ingredients", "image_url", "disponible"];
const PRODUIT_COLS= ["nom", "categorie", "description", "unite", "qte_initiale", "seuil_alerte", "date_peremption", "fournisseur"];

// ─── Validation ───────────────────────────────────────────────────
function validatePlat(row, idx) {
  const errors = [];
  if (!row.nom?.toString().trim())           errors.push("Nom obligatoire");
  if (!row.prix || isNaN(Number(row.prix)))  errors.push("Prix invalide");
  if (Number(row.prix) <= 0)                 errors.push("Prix doit être > 0");
  const dispo = (row.disponible ?? "oui").toString().toLowerCase().trim();
  if (!["oui","non","true","false","1","0"].includes(dispo)) errors.push('disponible doit être "oui" ou "non"');
  return errors;
}

function validateProduit(row, idx) {
  const errors = [];
  if (!row.nom?.toString().trim())                       errors.push("Nom obligatoire");
  if (!row.unite?.toString().trim())                     errors.push("Unité obligatoire");
  if (row.qte_initiale === undefined || row.qte_initiale === "") errors.push("Quantité initiale obligatoire");
  if (isNaN(Number(row.qte_initiale)))                   errors.push("Quantité initiale invalide");
  if (row.seuil_alerte === undefined || row.seuil_alerte === "") errors.push("Seuil d'alerte obligatoire");
  if (isNaN(Number(row.seuil_alerte)))                   errors.push("Seuil d'alerte invalide");
  return errors;
}

// ─── Normalisation ────────────────────────────────────────────────
function normalizePlat(row) {
  const dispo = (row.disponible ?? "oui").toString().toLowerCase().trim();
  return {
    nom:         row.nom.toString().trim(),
    prix:        Number(row.prix),
    categorie:   row.categorie?.toString().trim() || "Autre",
    description: row.description?.toString().trim() || "",
    ingredients: row.ingredients?.toString().trim() || "",
    image_url:   row.image_url?.toString().trim() || "",
    disponible:  ["oui","true","1"].includes(dispo),
  };
}

function normalizeProduit(row) {
  // Gestion date péremption (Excel serial ou string)
  let date_peremption = null;
  if (row.date_peremption) {
    const raw = row.date_peremption;
    if (typeof raw === "number") {
      // Date sérialisée Excel → JS Date
      const d = XLSX.SSF.parse_date_code(raw);
      date_peremption = `${d.y}-${String(d.m).padStart(2,"0")}-${String(d.d).padStart(2,"0")}`;
    } else {
      const parts = raw.toString().split("/");
      if (parts.length === 3) {
        date_peremption = `${parts[2]}-${parts[1].padStart(2,"0")}-${parts[0].padStart(2,"0")}`;
      }
    }
  }

  return {
    nom:              row.nom.toString().trim(),
    categorie:        row.categorie?.toString().trim() || "Autre",
    description:      row.description?.toString().trim() || "",
    unite:            row.unite?.toString().trim(),
    qte_initiale:     Number(row.qte_initiale),
    seuil_alerte:     Number(row.seuil_alerte),
    date_peremption,
    fournisseur:      row.fournisseur?.toString().trim() || "",
  };
}

// ─── Composant ────────────────────────────────────────────────────
const ImportScreen = ({ toast, setPlats, setProducts, role }) => {
  const [tab,           setTab]           = useState("plats"); // "plats" | "produits"
  const [file,          setFile]          = useState(null);
  const [rows,          setRows]          = useState([]);      // données parsées
  const [errors,        setErrors]        = useState({});      // { rowIdx: [messages] }
  const [importing,     setImporting]     = useState(false);
  const [results,       setResults]       = useState(null);    // { ok, failed, details }
  const [step,          setStep]          = useState("idle");  // idle | preview | done
  const fileInputRef    = useRef(null);

  const isAdmin = ["admin","administrateur","manager"].includes(role);

  // ── Mapping colonnes par position ──────────────────────────────
  // Template Plats    : col 0=nom 1=prix 2=categorie 3=description 4=ingredients 5=image_url 6=disponible
  // Template Produits : col 0=nom 1=categorie 2=description 3=unite 4=qte_initiale 5=seuil_alerte 6=date_peremption 7=fournisseur
  const COL_MAP = {
    plats:    ["nom","prix","categorie","description","ingredients","image_url","disponible"],
    produits: ["nom","categorie","description","unite","qte_initiale","seuil_alerte","date_peremption","fournisseur"],
  };

  // ── Auto-détection du type depuis le fichier ─────────────────────
  // Lit le nom de la feuille ET la cellule A1 pour deviner "plats" ou "produits"
  const detectType = (wb) => {
    const sheet0 = (wb.SheetNames[0] || "").toLowerCase();
    if (sheet0.includes("produit") || sheet0.includes("stock")) return "produits";
    if (sheet0.includes("plat")    || sheet0.includes("menu"))  return "plats";
    const titre = ((wb.Sheets[wb.SheetNames[0]]?.["A1"])?.v || "").toLowerCase();
    if (titre.includes("produit")  || titre.includes("stock"))  return "produits";
    return "plats";
  };

  // ── Lecture du fichier ──────────────────────────────────────────
  const handleFile = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;

    if (!f.name.match(/\.(xlsx|xls|csv)$/i)) {
      toast.error("Format invalide", "Utilisez un fichier .xlsx, .xls ou .csv");
      return;
    }

    setFile(f);
    setResults(null);
    setStep("idle");

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const wb = XLSX.read(ev.target.result, { type: "binary", cellDates: false });

        // ── Détection automatique du type, indépendant de l'onglet actif ──
        const detectedType = detectType(wb);
        setTab(detectedType); // Switcher l'onglet pour coller au fichier

        const ws      = wb.Sheets[wb.SheetNames[0]];
        const fieldMap = COL_MAP[detectedType];

        // Lire toutes les lignes en tableau brut
        const allRows = XLSX.utils.sheet_to_json(ws, {
          header:    1,
          defval:    "",
          blankrows: false,
        });

        // Structure fixe du template (4 lignes d'en-tête) :
        //   Ligne 1 (idx 0) → Titre
        //   Ligne 2 (idx 1) → Avertissement
        //   Ligne 3 (idx 2) → Noms colonnes
        //   Ligne 4 (idx 3) → Types
        //   Ligne 5+ (idx 4+) → DONNÉES ← on démarre ici
        const dataRows = allRows
          .slice(4)
          .filter(r => r.some(c => c !== null && c !== undefined && c !== ""));

        if (dataRows.length === 0) {
          toast.warning("Fichier vide", "Aucune donnée trouvée à partir de la ligne 5.");
          return;
        }

        // Mapper par position de colonne (robuste quel que soit le texte d'en-tête)
        const mapped = dataRows.map(r => {
          const obj = {};
          fieldMap.forEach((fieldName, colIdx) => { obj[fieldName] = r[colIdx] ?? ""; });
          return obj;
        });

        // Valider selon le type détecté
        const validate = detectedType === "plats" ? validatePlat : validateProduit;
        const errs = {};
        mapped.forEach((row, i) => {
          const e = validate(row, i);
          if (e.length) errs[i] = e;
        });

        setRows(mapped);
        setErrors(errs);
        setStep("preview");
      } catch (err) {
        console.error(err);
        toast.error("Erreur de lecture", "Impossible de lire le fichier. Vérifiez le format.");
      }
    };
    reader.readAsBinaryString(f);
    e.target.value = "";
  };

  // ── Lancement de l'import ───────────────────────────────────────
  const runImport = async () => {
    const validRows = rows.filter((_, i) => !errors[i]);
    if (!validRows.length) {
      toast.warning("", "Aucune ligne valide à importer.");
      return;
    }

    setImporting(true);
    const ok = [], failed = [];

    try {
      if (tab === "plats") {
        // ── Import Plats → POST /api/plats/ ──────────────────────
        for (const row of validRows) {
          try {
            const payload = normalizePlat(row);
            // payload: { nom, prix, categorie, disponible, description, image_url }
            const created = await platsService.create(payload);
            ok.push(created);
          } catch (err) {
            failed.push({ row, error: err?.message || "Erreur serveur" });
          }
        }
        // Mettre à jour le store des plats
        if (ok.length && setPlats) setPlats(prev => [...prev, ...ok]);

      } else {
        // ── Import Produits → POST /api/products/ ─────────────────
        // D'abord récupérer toutes les unités pour résoudre nom → id
        let unites = [];
        try {
          const raw = await unitesService.list();
          // L'API peut retourner un tableau direct ou { results: [...] }
          unites = Array.isArray(raw) ? raw : (raw?.results ?? raw?.data ?? []);
        } catch (_) {
          toast.warning("Unités", "Impossible de charger les unités.");
        }

        // Map nom_unite (lowercase) → id
        const uniteMap = {};
        (Array.isArray(unites) ? unites : []).forEach(u => {
          uniteMap[u.nom.toLowerCase().trim()] = u.id;
        });

        for (const row of validRows) {
          try {
            const base = normalizeProduit(row);
            // Résoudre unite_id depuis le nom d'unité
            const uniteNom = (base.unite || "").toLowerCase().trim();
            const unite_id = uniteMap[uniteNom];
            if (!unite_id) {
              failed.push({ row, error: `Unité "${base.unite}" introuvable — vérifiez la liste des unités` });
              continue;
            }
            // Payload attendu par ProductCreateSerializer :
            // { nom, categorie, description, seuil_alerte, date_peremption, unite_id, qte_initiale }
            const payload = {
              nom:              base.nom,
              categorie:        base.categorie,
              description:      base.description,
              seuil_alerte:     base.seuil_alerte,
              date_peremption:  base.date_peremption || null,
              unite_id,
              qte_initiale:     base.qte_initiale,
            };
            const created = await productsService.create(payload);
            ok.push(created);
          } catch (err) {
            failed.push({ row, error: err?.message || "Erreur serveur" });
          }
        }
      }
    } finally {
      // ── Recharger la liste complète depuis l'API pour avoir le bon format ──
      if (ok.length) {
        try {
          if (tab === "plats") {
            const fresh = await platsService.list();
            if (fresh && setPlats) setPlats(Array.isArray(fresh) ? fresh : (fresh.results ?? []));
          } else {
            const fresh = await productsService.list();
            if (fresh && setProducts) setProducts(unwrap(fresh));
          }
        } catch (_) {
          // En cas d'échec du rechargement, on garde les données importées
        }
      }

      setResults({ ok, failed });
      setStep("done");
      setImporting(false);
      if (ok.length)     toast.success(`${ok.length} importé(s) avec succès`, "Liste mise à jour ✓");
      if (failed.length) toast.error(`${failed.length} échec(s)`, "Voir le rapport ci-dessous");
    }
  };

  // ── Reset ───────────────────────────────────────────────────────
  const reset = () => {
    setFile(null); setRows([]); setErrors({});
    setResults(null); setStep("idle");
  };

  const validCount   = rows.filter((_, i) => !errors[i]).length;
  const invalidCount = Object.keys(errors).length;

  // ── Téléchargement du template ──────────────────────────────────
  // En production, pointez vers les fichiers dans /public
  const templateUrl = tab === "plats"
    ? "/templates/template_menu_plats.xlsx"
    : "/templates/template_produits_stock.xlsx";

  if (!isAdmin) {
    return (
      <div style={{ padding: 40, textAlign: "center", color: C.muted, fontSize: 14 }}>
        🔒 Accès réservé aux administrateurs et managers.
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 820, margin: "0 auto", padding: "0 0 60px" }}>

      {/* ── Titre ── */}
      <div style={{ marginBottom: 28 }}>
        <h2 className="serif" style={{ fontSize: 24, color: C.cream, margin: 0 }}>
          Import en masse
        </h2>
        <p style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>
          Importez des plats ou des produits depuis un fichier Excel (.xlsx)
        </p>
      </div>

      {/* ── Tabs ── */}
      <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
        {[
          { id: "plats",    label: "🍽  Menu & Plats" },
          { id: "produits", label: "📦 Produits Stock" },
        ].map(t => (
          <button key={t.id} onClick={() => { setTab(t.id); reset(); }}
            style={{
              padding: "9px 20px", borderRadius: 8, cursor: "pointer",
              fontSize: 13, fontFamily: "'Raleway',sans-serif",
              fontWeight: tab === t.id ? 700 : 400,
              background: tab === t.id ? C.goldFaint : "transparent",
              border: `1px solid ${tab === t.id ? C.gold : "rgba(255,255,255,0.1)"}`,
              color: tab === t.id ? C.goldL : C.muted,
              transition: "all .2s",
            }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Étape 1 : Upload ── */}
      {step === "idle" && (
        <Card style={{ padding: 32 }}>
          {/* Télécharger template */}
          <div style={{
            background: C.bg3, borderRadius: 10,
            border: `1px solid ${C.goldBorder}`,
            padding: "16px 20px",
            display: "flex", justifyContent: "space-between", alignItems: "center",
            marginBottom: 24,
          }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.cream }}>
                📥 Télécharger le template Excel
              </div>
              <div style={{ fontSize: 11, color: C.muted, marginTop: 3 }}>
                Utilisez ce modèle pour préparer vos données. Il contient les colonnes
                requises, des exemples et la feuille de référence.
              </div>
            </div>
            <a href={templateUrl} download
              style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                padding: "9px 18px", borderRadius: 8,
                background: `linear-gradient(135deg,${C.goldD},${C.gold})`,
                color: "#07050A", fontWeight: 700, fontSize: 12,
                fontFamily: "'Raleway',sans-serif", textDecoration: "none",
                whiteSpace: "nowrap", flexShrink: 0,
              }}>
              ⬇ Template
            </a>
          </div>

          {/* Drop zone */}
          <div
            onClick={() => fileInputRef.current?.click()}
            style={{
              border: `2px dashed ${C.goldBorder}`,
              borderRadius: 12, padding: "48px 24px",
              textAlign: "center", cursor: "pointer",
              background: C.bg2,
              transition: "border-color .2s, background .2s",
            }}
            onDragOver={e => e.preventDefault()}
            onDrop={e => {
              e.preventDefault();
              const f = e.dataTransfer.files?.[0];
              if (f) { const dt = new DataTransfer(); dt.items.add(f); fileInputRef.current.files = dt.files; handleFile({ target: fileInputRef.current }); }
            }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>📂</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: C.cream, marginBottom: 6 }}>
              Glissez votre fichier ici ou cliquez pour parcourir
            </div>
            <div style={{ fontSize: 11, color: C.muted }}>
              Formats acceptés : .xlsx, .xls, .csv · Max 5 Mo
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              style={{ display: "none" }}
              onChange={handleFile}
            />
          </div>
        </Card>
      )}

      {/* ── Étape 2 : Prévisualisation ── */}
      {step === "preview" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Résumé */}
          <div style={{
            display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12,
          }}>
            {[
              { label: "Lignes détectées", value: rows.length,    color: C.cream },
              { label: "Lignes valides",   value: validCount,     color: C.success },
              { label: "Lignes invalides", value: invalidCount,   color: invalidCount ? C.danger : C.muted },
            ].map(s => (
              <Card key={s.label} style={{ padding: "16px 20px", textAlign: "center" }}>
                <div style={{ fontSize: 28, fontWeight: 700, color: s.color }}>{s.value}</div>
                <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>{s.label}</div>
              </Card>
            ))}
          </div>

          {/* Fichier chargé */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            background: C.bg3, borderRadius: 8, padding: "10px 16px",
          }}>
            <span style={{ fontSize: 12, color: C.mutedL }}>📄 {file?.name}</span>
            <Btn small variant="ghost" onClick={reset}>Changer de fichier</Btn>
          </div>

          {/* Table de prévisualisation */}
          <Card style={{ padding: 0, overflow: "hidden" }}>
            <div style={{
              padding: "12px 16px", borderBottom: `1px solid rgba(255,255,255,0.06)`,
              fontSize: 11, color: C.muted, textTransform: "uppercase", letterSpacing: 1.2,
            }}>
              Prévisualisation des données — {rows.length} lignes
            </div>
            <div style={{ overflowX: "auto", maxHeight: 380, overflowY: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr>
                    <th style={thStyle}>#</th>
                    <th style={thStyle}>Statut</th>
                    {(tab === "plats" ? PLAT_COLS : PRODUIT_COLS)
                      .filter(c => c !== "notes_import")
                      .map(c => <th key={c} style={thStyle}>{c}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => {
                    const hasErr = !!errors[i];
                    const rowBg  = hasErr ? "rgba(192,57,43,0.08)" : (i % 2 === 0 ? C.bg2 : C.bg3);
                    return (
                      <tr key={i}>
                        <td style={{ ...tdStyle, background: rowBg, color: C.muted, textAlign: "center" }}>{i + 1}</td>
                        <td style={{ ...tdStyle, background: rowBg, textAlign: "center" }}>
                          {hasErr
                            ? <span title={errors[i].join("\n")} style={{ color: C.danger, fontSize: 11 }}>
                                ✗ {errors[i][0]}
                              </span>
                            : <span style={{ color: C.success }}>✓</span>
                          }
                        </td>
                        {(tab === "plats" ? PLAT_COLS : PRODUIT_COLS)
                          .filter(c => c !== "notes_import")
                          .map(col => (
                            <td key={col} style={{ ...tdStyle, background: rowBg, maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {row[col]?.toString() || <span style={{ color: C.muted, fontStyle: "italic" }}>—</span>}
                            </td>
                          ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Erreurs détaillées */}
          {invalidCount > 0 && (
            <Card style={{ padding: 16, border: `1px solid rgba(192,57,43,0.3)` }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.danger, marginBottom: 10 }}>
                ⚠ {invalidCount} ligne(s) invalide(s) — elles ne seront pas importées
              </div>
              {Object.entries(errors).map(([idx, errs]) => (
                <div key={idx} style={{ fontSize: 11, color: C.mutedL, marginBottom: 4 }}>
                  <span style={{ color: C.danger, fontWeight: 600 }}>Ligne {Number(idx) + 1}</span>
                  {" : "}
                  {errs.join(" · ")}
                </div>
              ))}
            </Card>
          )}

          {/* Actions */}
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <Btn variant="ghost" onClick={reset}>Annuler</Btn>
            <Btn variant="primary" loading={importing} onClick={runImport}
              disabled={validCount === 0}>
              ⬆ Importer {validCount} ligne{validCount > 1 ? "s" : ""} valide{validCount > 1 ? "s" : ""}
            </Btn>
          </div>
        </div>
      )}

      {/* ── Étape 3 : Résultats ── */}
      {step === "done" && results && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Bilan */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Card style={{ padding: "20px", textAlign: "center", border: `1px solid ${C.successBdr}` }}>
              <div style={{ fontSize: 36, fontWeight: 700, color: C.success }}>{results.ok.length}</div>
              <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>✓ Importé(s) avec succès</div>
            </Card>
            <Card style={{ padding: "20px", textAlign: "center", border: `1px solid ${results.failed.length ? C.dangerBdr : C.bg5}` }}>
              <div style={{ fontSize: 36, fontWeight: 700, color: results.failed.length ? C.danger : C.muted }}>
                {results.failed.length}
              </div>
              <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>✗ Échec(s)</div>
            </Card>
          </div>

          {/* Détail des échecs */}
          {results.failed.length > 0 && (
            <Card style={{ padding: 16, border: `1px solid ${C.dangerBdr}` }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.danger, marginBottom: 10 }}>
                Lignes en échec
              </div>
              {results.failed.map((f, i) => (
                <div key={i} style={{ fontSize: 11, color: C.mutedL, marginBottom: 4, padding: "4px 0", borderBottom: `1px solid rgba(255,255,255,0.04)` }}>
                  <span style={{ color: C.cream, fontWeight: 600 }}>{f.row?.nom || `Ligne ${i+1}`}</span>
                  {" → "}
                  <span style={{ color: C.danger }}>{f.error}</span>
                </div>
              ))}
            </Card>
          )}

          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <Btn variant="outline" onClick={reset}>Nouvel import</Btn>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Styles tableau ───────────────────────────────────────────────
const thStyle = {
  padding: "9px 12px",
  textAlign: "left",
  fontSize: 11,
  fontWeight: 600,
  color: C.muted,
  background: C.bg3,
  borderBottom: "1px solid rgba(255,255,255,0.06)",
  whiteSpace: "nowrap",
  textTransform: "uppercase",
  letterSpacing: "0.08em",
};

const tdStyle = {
  padding: "8px 12px",
  borderBottom: "1px solid rgba(255,255,255,0.04)",
  color: C.cream,
  fontSize: 12,
};

export default ImportScreen;