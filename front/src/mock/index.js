/**
 * FATE & GRÂCE — Mock Data
 * Utilisé comme fallback quand le backend est inaccessible (développement / hors-ligne).
 * Toutes les structures correspondent aux serializers Django attendus.
 */

export const MOCK_USERS = [
  { id:1, firstName:"Aimé",    lastName:"Dossou",     login:"aime.d",   role:"serveur",      isActive:true },
  { id:2, firstName:"Chloé",   lastName:"Akpovi",     login:"chloe.a",  role:"serveur",      isActive:true },
  { id:3, firstName:"Marco",   lastName:"Houénou",    login:"marco.h",  role:"cuisinier",    isActive:true },
  { id:4, firstName:"Lucie",   lastName:"Agbayahou",  login:"lucie.a",  role:"cuisinier",    isActive:true },
  { id:5, firstName:"Patrick", lastName:"Zinsou",     login:"patrick.z",role:"gerant",       isActive:true },
  { id:6, firstName:"Sarah",   lastName:"Kpade",      login:"sarah.k",  role:"gestionnaire", isActive:true },
  { id:7, firstName:"Richard", lastName:"Honvou",     login:"richard.h",role:"manager",      isActive:true },
  { id:8, firstName:"Inès",    lastName:"Boni",       login:"ines.b",   role:"auditeur",     isActive:true },
  { id:9, firstName:"Admin",   lastName:"Système",    login:"admin",    role:"admin",        isActive:true },
];

export const MOCK_PLATS = [
  { id:1,  nom:"Brochettes de bœuf",      prix:4500, categorie:"Grillades",           disponible:true },
  { id:2,  nom:"Poulet rôti entier",       prix:8000, categorie:"Volailles",           disponible:true },
  { id:3,  nom:"Riz jollof aux crevettes", prix:5000, categorie:"Plats de résistance", disponible:true },
  { id:4,  nom:"Salade Niçoise",           prix:3500, categorie:"Entrées",             disponible:true },
  { id:5,  nom:"Croissant au beurre",      prix:800,  categorie:"Boulangerie",         disponible:true },
  { id:6,  nom:"Fondant au chocolat",      prix:2500, categorie:"Desserts",            disponible:true },
  { id:7,  nom:"Jus d'ananas frais",       prix:1500, categorie:"Boissons",            disponible:true },
  { id:8,  nom:"Soupe de poisson",         prix:4000, categorie:"Entrées",             disponible:true },
  { id:9,  nom:"Thiéboudienne",            prix:5500, categorie:"Plats de résistance", disponible:false },
  { id:10, nom:"Crème brûlée",             prix:2000, categorie:"Desserts",            disponible:true },
  { id:11, nom:"Cocktail maison",          prix:2500, categorie:"Boissons",            disponible:true },
  { id:12, nom:"Foie gras poêlé",          prix:6500, categorie:"Entrées",             disponible:true },
];

export const MOCK_TABLES = [
  { id:1,  num:"01", capacite:2, status:"DISPONIBLE",          montant:0 },
  { id:2,  num:"02", capacite:4, status:"RÉSERVÉE",            montant:0 },
  { id:3,  num:"03", capacite:4, status:"EN_SERVICE",          montant:15500 },
  { id:4,  num:"04", capacite:6, status:"COMMANDES_PASSÉE",    montant:5000 },
  { id:5,  num:"05", capacite:2, status:"DISPONIBLE",          montant:0 },
  { id:6,  num:"06", capacite:8, status:"EN_ATTENTE_PAIEMENT", montant:28000 },
  { id:7,  num:"07", capacite:4, status:"DISPONIBLE",          montant:0 },
  { id:8,  num:"08", capacite:4, status:"EN_SERVICE",          montant:9000 },
  { id:9,  num:"09", capacite:6, status:"DISPONIBLE",          montant:0 },
  { id:10, num:"10", capacite:4, status:"DISPONIBLE",          montant:0 },
  { id:11, num:"11", capacite:2, status:"RÉSERVÉE",            montant:0 },
  { id:12, num:"12", capacite:6, status:"DISPONIBLE",          montant:0 },
];

export const MOCK_ORDERS = [
  {
    id:"CMD-001", tableId:3, tableNum:"03", serveur:"Aimé Dossou",
    items:[
      { platId:1, nom:"Brochettes de bœuf",  qte:2, prix:4500 },
      { platId:7, nom:"Jus d'ananas frais",   qte:2, prix:1500 },
    ],
    status:"EN_ATTENTE_LIVRAISON", cuisinier:"Marco Houénou",
    montant:12000, motif:"", obs:"", createdAt:"2025-12-18T20:10:00",
  },
  {
    id:"CMD-002", tableId:3, tableNum:"03", serveur:"Aimé Dossou",
    items:[{ platId:4, nom:"Salade Niçoise", qte:1, prix:3500 }],
    status:"LIVRÉE", cuisinier:"Lucie Agbayahou",
    montant:3500, motif:"", obs:"sans anchois", createdAt:"2025-12-18T19:55:00",
  },
  {
    id:"CMD-003", tableId:4, tableNum:"04", serveur:"Chloé Akpovi",
    items:[{ platId:3, nom:"Riz jollof aux crevettes", qte:1, prix:5000 }],
    status:"EN_ATTENTE_ACCEPTATION", cuisinier:"",
    montant:5000, motif:"", obs:"", createdAt:"2025-12-18T20:15:00",
  },
  {
    id:"CMD-004", tableId:8, tableNum:"08", serveur:"Chloé Akpovi",
    items:[
      { platId:2, nom:"Poulet rôti entier", qte:1, prix:8000 },
      { platId:10,nom:"Crème brûlée",       qte:1, prix:2000 },
    ],
    status:"EN_PRÉPARATION", cuisinier:"Marco Houénou",
    montant:10000, motif:"", obs:"cuisson bien dorée", createdAt:"2025-12-18T20:05:00",
  },
  {
    id:"CMD-005", tableId:8, tableNum:"08", serveur:"Chloé Akpovi",
    items:[{ platId:7, nom:"Jus d'ananas frais", qte:2, prix:1500 }],
    status:"EN_ATTENTE_ACCEPTATION", cuisinier:"",
    montant:3000, motif:"", obs:"", createdAt:"2025-12-18T20:20:00",
  },
];

export const MOCK_PRODUCTS = [
  { id:1,  nom:"Bœuf (kg)",          categorie:"Viandes",         qte:15.5, unite:"kg",  seuil:5,  peremption:"2025-12-28", description:"Bœuf frais local" },
  { id:2,  nom:"Poulet (kg)",         categorie:"Volailles",       qte:22,   unite:"kg",  seuil:8,  peremption:"2025-12-26", description:"Poulet de ferme" },
  { id:3,  nom:"Riz basmati (kg)",    categorie:"Céréales",        qte:80,   unite:"kg",  seuil:20, peremption:"2026-06-30", description:"Import" },
  { id:4,  nom:"Tomates (kg)",        categorie:"Légumes",         qte:3.5,  unite:"kg",  seuil:5,  peremption:"2025-12-24", description:"Tomates locales" },
  { id:5,  nom:"Huile de palme (L)",  categorie:"Condiments",      qte:18,   unite:"L",   seuil:5,  peremption:"2026-03-15", description:"" },
  { id:6,  nom:"Farine de blé (kg)",  categorie:"Boulangerie",     qte:45,   unite:"kg",  seuil:15, peremption:"2026-04-01", description:"Farine T55" },
  { id:7,  nom:"Crevettes (kg)",      categorie:"Poissons",        qte:2,    unite:"kg",  seuil:3,  peremption:"2025-12-25", description:"Crevettes congelées" },
  { id:8,  nom:"Ananas (pcs)",        categorie:"Fruits",          qte:12,   unite:"pcs", seuil:5,  peremption:"2025-12-27", description:"Ananas Victoria" },
  { id:9,  nom:"Chocolat noir (kg)",  categorie:"Pâtisserie",      qte:4.2,  unite:"kg",  seuil:2,  peremption:"2026-08-30", description:"70% cacao" },
  { id:10, nom:"Lait entier (L)",     categorie:"Produits laitiers",qte:20,  unite:"L",   seuil:10, peremption:"2025-12-26", description:"Lait frais" },
  { id:11, nom:"Œufs (pcs)",          categorie:"Produits laitiers",qte:60,  unite:"pcs", seuil:24, peremption:"2025-12-30", description:"Œufs de ferme" },
  { id:12, nom:"Poivre noir (kg)",    categorie:"Épices",          qte:0.8,  unite:"kg",  seuil:0.5,peremption:"2026-12-31", description:"" },
];

export const MOCK_MOVEMENTS = [
  { id:"MVT-001", produitId:4, produit:"Tomates (kg)",     type:"ENTRÉE",     qte:10,  statut:"VALIDÉE",    justification:"Livraison Fournisseur Hossou",  auteur:"Sarah Kpade",    date:"2025-12-18T08:30:00" },
  { id:"MVT-002", produitId:2, produit:"Poulet (kg)",      type:"ENTRÉE",     qte:15,  statut:"EN_ATTENTE", justification:"Livraison Ferme Avicole",       auteur:"Patrick Zinsou", date:"2025-12-18T09:00:00" },
  { id:"MVT-003", produitId:1, produit:"Bœuf (kg)",        type:"SORTIE",     qte:2.5, statut:"VALIDÉE",    justification:"Commande CMD-001",              auteur:"Marco Houénou",  date:"2025-12-18T20:10:00" },
  { id:"MVT-004", produitId:7, produit:"Crevettes (kg)",   type:"SORTIE",     qte:0.5, statut:"EN_ATTENTE", justification:"Commande CMD-003",              auteur:"Marco Houénou",  date:"2025-12-18T20:15:00" },
  { id:"MVT-005", produitId:4, produit:"Tomates (kg)",     type:"SUPPRESSION",qte:2,   statut:"VALIDÉE",    justification:"Produits abîmés",               auteur:"Sarah Kpade",    date:"2025-12-17T17:00:00" },
  { id:"MVT-006", produitId:6, produit:"Farine de blé (kg)",type:"ENTRÉE",   qte:20,  statut:"EN_ATTENTE", justification:"Réapprovisionnement CFAO Foods", auteur:"Patrick Zinsou", date:"2025-12-18T10:30:00" },
];

export const MOCK_INVOICES = [
  {
    id:"FAC-2025-0042", tableId:6, tableNum:"06",
    montant:28000, pourboire:2000, mode:"Espèces",
    date:"2025-12-18T18:30:00",
    items:[
      { nom:"Poulet rôti entier",  qte:2, prix:8000 },
      { nom:"Crème brûlée",        qte:2, prix:2000 },
      { nom:"Jus d'ananas frais",  qte:4, prix:1500 },
    ],
  },
  {
    id:"FAC-2025-0041", tableId:null, tableNum:"05",
    montant:15500, pourboire:0, mode:"Mobile Money",
    date:"2025-12-18T16:00:00", items:[],
  },
  {
    id:"FAC-2025-0040", tableId:null, tableNum:"02",
    montant:9000, pourboire:500, mode:"Carte bancaire",
    date:"2025-12-18T13:30:00", items:[],
  },
  {
    id:"FAC-2025-0039", tableId:null, tableNum:"09",
    montant:22500, pourboire:1500, mode:"Espèces",
    date:"2025-12-17T21:00:00", items:[],
  },
];

export const MOCK_AUDIT = [
  { id:1, user:"Richard Honvou",  action:"VALIDATION_ENTRÉE",     details:"Entrée MVT-001 validée (Tomates 10kg)",       date:"2025-12-18", heure:"08:45" },
  { id:2, user:"Marco Houénou",   action:"ACCEPTATION_COMMANDE",  details:"Commande CMD-001 acceptée — Table 03",        date:"2025-12-18", heure:"20:11" },
  { id:3, user:"Aimé Dossou",     action:"CONNEXION",             details:"Connexion réussie depuis 192.168.1.14",       date:"2025-12-18", heure:"19:45" },
  { id:4, user:"Patrick Zinsou",  action:"ENREGISTREMENT_PAIEMENT",details:"Paiement Table 06 — 28000 FCFA Espèces",    date:"2025-12-18", heure:"18:32" },
  { id:5, user:"Chloé Akpovi",    action:"NOUVELLE_COMMANDE",     details:"CMD-003 créée — Table 04",                    date:"2025-12-18", heure:"20:15" },
  { id:6, user:"Sarah Kpade",     action:"ALERTE_STOCK",          details:"Stock faible: Crevettes (2kg < seuil 3kg)",   date:"2025-12-18", heure:"20:00" },
  { id:7, user:"Richard Honvou",  action:"REJET_ENTRÉE",          details:"Entrée rejetée : quantité non conforme",      date:"2025-12-18", heure:"09:30" },
  { id:8, user:"Admin Système",   action:"CRÉATION_UTILISATEUR",  details:"Nouveau compte créé : lucie.a (Cuisinière)", date:"2025-12-15", heure:"10:00" },
  { id:9, user:"Aimé Dossou",     action:"ANNULATION_COMMANDE",   details:"CMD-000 annulée — Motif: Erreur client",      date:"2025-12-18", heure:"20:02" },
  { id:10,user:"Patrick Zinsou",  action:"GÉNÉRATION_FACTURE",    details:"FAC-2025-0042 générée — Table 06",            date:"2025-12-18", heure:"18:33" },
];

export const ROLES = {
  serveur:       "Serveur",
  cuisinier:     "Cuisinier",
  gerant:        "Gérant",
  gestionnaire:  "Gestionnaire de Stock",
  manager:       "Manager",
  auditeur:      "Auditeur",
  admin:         "Administrateur",
};
