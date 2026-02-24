/**
 * FATE & GRÂCE — Stock API Service
 *
 * ── Produits ──────────────────────────────────────────────
 *   GET    /api/products/           ?categorie=&search=  → Product[]
 *   POST   /api/products/           { nom, categorie, qte, unite, seuil, peremption, description } → Product
 *   PUT    /api/products/{id}/      (same fields)        → Product
 *   DELETE /api/products/{id}/                           → 204
 *
 * ── Mouvements ────────────────────────────────────────────
 *   GET    /api/movements/          ?type=&statut=&produit_id= → Movement[]
 *   POST   /api/movements/          { produit_id, type, qte, justification } → Movement
 *   POST   /api/movements/{id}/validate/ {}              → Movement
 *   POST   /api/movements/{id}/reject/   { motif }       → Movement
 *
 * Serializer attendu (Product) :
 *   { id, nom, categorie, qte, unite, seuil, peremption, description, created_at }
 *
 * Serializer attendu (Movement) :
 *   { id, produit_id, produit_nom, type, qte, statut, justification, auteur, date }
 *
 * type    : ENTRÉE | SORTIE | SUPPRESSION
 * statut  : EN_ATTENTE | VALIDÉE | REJETÉE
 */

import { api } from "./client";
import { MOCK_PRODUCTS, MOCK_MOVEMENTS } from "../mock";

/* ═══ PRODUCTS ══════════════════════════════════════════ */
export const productsService = {
  async list(params = {}) {
    try {
      const qs = new URLSearchParams(
        Object.fromEntries(Object.entries(params).filter(([, v]) => v))
      ).toString();
      return await api.get(`/products/${qs ? "?" + qs : ""}`);
    } catch (err) {
      if (err.isNetwork) {
        let result = [...MOCK_PRODUCTS];
        if (params.categorie) result = result.filter((p) => p.categorie === params.categorie);
        if (params.search) result = result.filter((p) => p.nom.toLowerCase().includes(params.search.toLowerCase()));
        return result;
      }
      throw err;
    }
  },

  async create(payload) {
    try {
      return await api.post("/products/", payload);
    } catch (err) {
      if (err.isNetwork) {
        return { id: Date.now(), ...payload };
      }
      throw err;
    }
  },

  async update(id, payload) {
    try {
      return await api.put(`/products/${id}/`, payload);
    } catch (err) {
      if (err.isNetwork) return { id, ...payload };
      throw err;
    }
  },

  async remove(id) {
    try {
      return await api.delete(`/products/${id}/`);
    } catch (err) {
      if (err.isNetwork) return null;
      throw err;
    }
  },

  /** Catégories distinctes */
  async categories() {
    try {
      return await api.get("/products/categories/");
    } catch (err) {
      if (err.isNetwork) {
        return [...new Set(MOCK_PRODUCTS.map((p) => p.categorie))];
      }
      throw err;
    }
  },
};

/* ═══ MOVEMENTS ═════════════════════════════════════════ */
export const movementsService = {
  async list(params = {}) {
    try {
      const qs = new URLSearchParams(
        Object.fromEntries(Object.entries(params).filter(([, v]) => v))
      ).toString();
      return await api.get(`/movements/${qs ? "?" + qs : ""}`);
    } catch (err) {
      if (err.isNetwork) {
        let result = [...MOCK_MOVEMENTS];
        if (params.type) result = result.filter((m) => m.type === params.type);
        if (params.statut) result = result.filter((m) => m.statut === params.statut);
        return result;
      }
      throw err;
    }
  },

  /**
   * Créer un mouvement de stock
   * @param {{ produit_id, type, qte, justification, commande_id? }} payload
   */
  async create(payload) {
    try {
      return await api.post("/movements/", payload);
    } catch (err) {
      if (err.isNetwork) {
        return {
          id: `MVT-${Date.now()}`,
          produitId: payload.produit_id,
          type: payload.type,
          qte: payload.qte,
          statut: "EN_ATTENTE",
          justification: payload.justification,
          auteur: "Utilisateur courant",
          date: new Date().toISOString(),
        };
      }
      throw err;
    }
  },

  async validate(id) {
    try {
      return await api.post(`/movements/${id}/validate/`);
    } catch (err) {
      if (err.isNetwork) return { id, statut: "VALIDÉE" };
      throw err;
    }
  },

  async reject(id, motif) {
    try {
      return await api.post(`/movements/${id}/reject/`, { motif });
    } catch (err) {
      if (err.isNetwork) return { id, statut: "REJETÉE" };
      throw err;
    }
  },
};
