/**
 * FATE & GRÂCE — Tables API Service
 *
 * Endpoints Django :
 *   GET  /api/tables/               → Table[]
 *   GET  /api/tables/{id}/          → Table
 *   POST /api/tables/{id}/reserve/  → Table
 *   POST /api/tables/{id}/cancel/   → Table
 *   POST /api/tables/{id}/close/    → Table  (→ EN_ATTENTE_PAIEMENT)
 *   POST /api/tables/{id}/pay/      { mode_paiement, montant, pourboire } → { table, invoice }
 *
 * Serializer attendu (Table) :
 *   { id, num, capacite, status, montant, description }
 *
 * Status values (Django choices) :
 *   DISPONIBLE | RÉSERVÉE | COMMANDES_PASSÉE | EN_SERVICE | EN_ATTENTE_PAIEMENT | PAYÉE
 */

import { api } from "./client";
import { MOCK_TABLES } from "../mock";

export const tablesService = {
  async list() {
    try {
      return await api.get("/tables/");
    } catch (err) {
      if (err.isNetwork) return [...MOCK_TABLES];
      throw err;
    }
  },

  async get(id) {
    try {
      return await api.get(`/tables/${id}/`);
    } catch (err) {
      if (err.isNetwork) return MOCK_TABLES.find((t) => t.id === id);
      throw err;
    }
  },

  async reserve(id) {
    try {
      return await api.post(`/tables/${id}/reserve/`);
    } catch (err) {
      if (err.isNetwork) return { id, status: "RÉSERVÉE" };
      throw err;
    }
  },

  async cancelReservation(id) {
    try {
      return await api.post(`/tables/${id}/cancel/`);
    } catch (err) {
      if (err.isNetwork) return { id, status: "DISPONIBLE" };
      throw err;
    }
  },

  /** Clôturer la table (toutes commandes livrées → EN_ATTENTE_PAIEMENT) */
  async close(id) {
    try {
      return await api.post(`/tables/${id}/close/`);
    } catch (err) {
      if (err.isNetwork) return { id, status: "EN_ATTENTE_PAIEMENT" };
      throw err;
    }
  },

  /** Enregistrer le paiement et générer la facture */
  async pay(id, payload) {
    // payload: { mode_paiement, montant, pourboire }
    try {
      return await api.post(`/tables/${id}/pay/`, payload);
      // Retourne { table, invoice }
    } catch (err) {
      if (err.isNetwork) {
        return {
          table: { id, status: "DISPONIBLE", montant: 0 },
          invoice: {
            id: `FAC-${Date.now()}`,
            montant: payload.montant,
            mode: payload.mode_paiement,
            date: new Date().toISOString(),
          },
        };
      }
      throw err;
    }
  },
};
