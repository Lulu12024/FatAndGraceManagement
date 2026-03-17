/**
 * FATE & GRÂCE — Design Tokens & Global CSS injection
 * Palette : Or raffiné sur fond Nuit profonde
 */

/**
 * FATE & GRÂCE — Design Tokens & Global CSS injection
 * Palette : Or raffiné sur fond Nuit profonde
 */

export const C = {
  /* Backgrounds */
  bg0:  "#07060A",
  bg1:  "#0E0C10",
  bg2:  "#16141A",
  bg3:  "#1E1C23",
  bg4:  "#26232D",
  bg5:  "#2E2B37",

  /* Brand gold */
  gold:     "#C9A84C",
  goldL:    "#E2C478",
  goldD:    "#8A7030",
  goldXL:   "#F0D898",
  goldFaint:"rgba(201,168,76,0.08)",
  goldBorder:"rgba(201,168,76,0.22)",

  /* Text */
  cream:    "#EDE4D0",
  muted:    "#7A7060",
  mutedL:   "#A09080",
  mutedD:   "#504840",

  /* Semantic */
  success:    "#4E9E72",
  successBg:  "rgba(78,158,114,0.12)",
  successBdr: "rgba(78,158,114,0.30)",

  danger:     "#C95040",
  dangerBg:   "rgba(201,80,64,0.12)",
  dangerBdr:  "rgba(201,80,64,0.30)",

  warning:    "#C98C40",
  warningBg:  "rgba(201,140,64,0.12)",
  warningBdr: "rgba(201,140,64,0.30)",

  info:       "#4A80C9",
  infoBg:     "rgba(74,128,201,0.12)",
  infoBdr:    "rgba(74,128,201,0.30)",

  purple:     "#8A60C9",
  purpleBg:   "rgba(138,96,201,0.12)",
  purpleBdr:  "rgba(138,96,201,0.30)",
};

export const ROLE_COLORS = {
  serveur:      C.info,
  cuisinier:    C.warning,
  gerant:       C.gold,
  gestionnaire: C.success,
  manager:      C.purple,
  auditeur:     C.mutedL,
  admin:        C.danger,
};

export const TABLE_STATUS = {
  DISPONIBLE:          { label:"Disponible",         color:C.success,  bg:C.successBg  },
  RÉSERVÉE:            { label:"Réservée",            color:C.gold,     bg:C.goldFaint  },
  COMMANDES_PASSÉE:    { label:"Commandes passées",   color:C.info,     bg:C.infoBg     },
  EN_SERVICE:          { label:"En service",          color:C.warning,  bg:C.warningBg  },
  EN_ATTENTE_PAIEMENT: { label:"Attente paiement",    color:C.purple,   bg:C.purpleBg   },
  PAYÉE:               { label:"Payée",               color:C.mutedL,   bg:C.bg3        },
};

export const ORDER_STATUS = {
  STOCKÉE:               { label:"Stockée",              color:C.mutedL   },
  EN_ATTENTE_ACCEPTATION:{ label:"En attente",            color:C.warning  },
  EN_PRÉPARATION:        { label:"En préparation",        color:C.info     },
  EN_ATTENTE_LIVRAISON:  { label:"Prête à servir",        color:C.gold     },
  // ── Nouveaux statuts paiement ──────────────────────────────
  EN_ATTENTE_PAIEMENT:   { label:"Attente paiement",      color:C.purple   },
  PAYÉE:                 { label:"Payée",                 color:C.success  },
  // ── Statuts terminaux ──────────────────────────────────────
  LIVRÉE:                { label:"Livrée",                color:C.success  },
  ANNULÉE:               { label:"Annulée",               color:C.muted    },
  REFUSÉE:               { label:"Refusée",               color:C.danger   },
};

export const MVT_TYPE_META = {
  ENTRÉE:     { label:"Entrée",     color:C.success, icon:"📥" },
  SORTIE:     { label:"Sortie",     color:C.warning, icon:"📤" },
  SUPPRESSION:{ label:"Suppression",color:C.danger,  icon:"🗑️" },
};

export const MVT_STATUS_META = {
  EN_ATTENTE:{ label:"En attente", color:C.warning },
  VALIDÉE:   { label:"Validée",    color:C.success },
  REJETÉE:   { label:"Rejetée",    color:C.danger  },
};

/* ── Helpers ─────────────────────────────────────────────── */
export const fmt = (n) =>
  (n ?? 0).toLocaleString("fr-FR", { minimumFractionDigits: 0 }) + " FCFA";

export const now = () => new Date().toISOString();

export const timeAgo = (iso) => {
  if (!iso) return "";
  const diff = Math.floor((Date.now() - new Date(iso)) / 1000);
  if (diff < 60)  return `${diff}s`;
  if (diff < 3600) return `${Math.floor(diff/60)}min`;
  if (diff < 86400) return `${Math.floor(diff/3600)}h`;
  return `${Math.floor(diff/86400)}j`;
};
/* ── Helpers ─────────────────────────────────────────────── */
// export const fmt  = (n) => (n ?? 0).toLocaleString("fr-FR") + " FCFA";
// export const now  = ()  => new Date().toISOString();
// export const timeAgo = (iso) => {
//   if (!iso) return "";
//   const diff = Date.now() - new Date(iso).getTime();
//   const m = Math.floor(diff / 60000);
//   if (m < 1) return "à l'instant";
//   if (m < 60) return `il y a ${m}mn`;
//   const h = Math.floor(m / 60);
//   if (h < 24) return `il y a ${h}h`;
//   return `il y a ${Math.floor(h / 24)}j`;
// };

/* ── Global CSS ──────────────────────────────────────────── */
export function injectGlobalCSS() {
  if (document.getElementById("fg-global")) return;

  const link = document.createElement("link");
  link.rel  = "stylesheet";
  link.href = "https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;1,400&family=Raleway:wght@300;400;500;600;700&display=swap";
  document.head.appendChild(link);

  const style = document.createElement("style");
  style.id = "fg-global";
  style.textContent = `
    *, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }
    html, body, #root { height:100%; }
    body {
      background:${C.bg0};
      color:${C.cream};
      font-family:'Raleway',sans-serif;
      overflow:hidden;
      -webkit-font-smoothing:antialiased;
    }
    ::-webkit-scrollbar { width:3px; height:3px; }
    ::-webkit-scrollbar-track { background:${C.bg1}; }
    ::-webkit-scrollbar-thumb { background:${C.goldD}; border-radius:2px; }
    input, textarea, select, button { font-family:'Raleway',sans-serif; outline:none; }
    button { cursor:pointer; }
    a { color:${C.gold}; text-decoration:none; }

    /* ── Animations ── */
    @keyframes fadeUp   { from{opacity:0;transform:translateY(18px)} to{opacity:1;transform:translateY(0)} }
    @keyframes fadeIn   { from{opacity:0}                             to{opacity:1} }
    @keyframes slideIn  { from{opacity:0;transform:translateX(-16px)} to{opacity:1;transform:translateX(0)} }
    @keyframes slideRight{from{opacity:0;transform:translateX(16px)}  to{opacity:1;transform:translateX(0)} }
    @keyframes pulse2   { 0%,100%{opacity:1} 50%{opacity:.35} }
    @keyframes spin     { to{transform:rotate(360deg)} }
    @keyframes toastIn  { from{transform:translateX(130%);opacity:0} to{transform:translateX(0);opacity:1} }
    @keyframes shimmer  { 0%{bg-position:-200% 0} 100%{bg-position:200% 0} }
    @keyframes glow     { 0%,100%{box-shadow:0 0 0 0 ${C.gold}30} 50%{box-shadow:0 0 18px 4px ${C.gold}20} }
    @keyframes scaleIn  { from{opacity:0;transform:scale(.94)} to{opacity:1;transform:scale(1)} }

    .anim-fadeUp   { animation:fadeUp   .45s cubic-bezier(.2,.8,.2,1) both; }
    .anim-fadeIn   { animation:fadeIn   .35s ease both; }
    .anim-slideIn  { animation:slideIn  .4s  cubic-bezier(.2,.8,.2,1) both; }
    .anim-scaleIn  { animation:scaleIn  .35s cubic-bezier(.2,.8,.2,1) both; }
    .pulse         { animation:pulse2 2s ease infinite; }
    .spin          { animation:spin .7s linear infinite; }

    .hover-lift    { transition:transform .2s,box-shadow .2s,border-color .2s; }
    .hover-lift:hover { transform:translateY(-2px); box-shadow:0 10px 34px rgba(0,0,0,.45)!important; }
    .hover-gold    { transition:color .18s,background .18s; }
    .hover-gold:hover { color:${C.goldL}!important; }
    .hover-bg      { transition:background .18s; }
    .hover-bg:hover { background:${C.bg3}!important; }

    /* ── Utility ── */
    .text-gold   { color:${C.gold}; }
    .text-goldL  { color:${C.goldL}; }
    .text-muted  { color:${C.muted}; }
    .text-cream  { color:${C.cream}; }
    .serif       { font-family:'Playfair Display',serif; }
    .uppercase   { text-transform:uppercase; letter-spacing:1px; }
    .truncate    { overflow:hidden;text-overflow:ellipsis;white-space:nowrap; }
    .flex-center { display:flex;align-items:center;justify-content:center; }
  `;
  document.head.appendChild(style);
}
