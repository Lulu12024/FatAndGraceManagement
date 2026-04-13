/**
 * FATE & GRÂCE — Orders (Commandes) API Service
 *
 * Endpoints Django :
 *   GET  /api/orders/                 ?table_id=&status=&cuisinier_id= → Order[]
 *   POST /api/orders/                 { table_id, items, obs }         → Order
 *   GET  /api/orders/{id}/            → Order
 *   POST /api/orders/{id}/accept/     { cuisinier_id }                 → Order
 *   POST /api/orders/{id}/reject/     { motif }                        → Order
 *   POST /api/orders/{id}/ready/      {}                               → Order
 *   POST /api/orders/{id}/deliver/    {}                               → Order  (→ EN_ATTENTE_PAIEMENT)
 *   POST /api/orders/{id}/pay/        { mode_paiement, montant, pourboire } → { order, invoice }
 *   POST /api/orders/{id}/cancel/     { motif }                        → Order
 *
 * Serializer attendu (Order) :
 *   { id, table_id, table_num, serveur, cuisinier, items, status,
 *     montant, obs, motif, is_paid, date_paiement, created_at, updated_at }
 *
 * items : [{ plat_id, nom, qte, prix_unitaire }]
 *
 * Status values :
 *   STOCKÉE | EN_ATTENTE_ACCEPTATION | EN_PRÉPARATION
 *   EN_ATTENTE_LIVRAISON | EN_ATTENTE_PAIEMENT | PAYÉE | ANNULÉE | REFUSÉE
 */

import { api, unwrap } from "./client";
import { MOCK_ORDERS } from "../mock";

export const ordersService = {
  async list(params = {}) {
    try {
      const qs = new URLSearchParams(
        Object.fromEntries(Object.entries(params).filter(([, v]) => v != null))
      ).toString();
      const data = await api.get(`/orders/${qs ? "?" + qs : ""}`);
      return unwrap(data);
    } catch (err) {
      if (err.isNetwork) {
        let result = [...MOCK_ORDERS];
        if (params.table_id) result = result.filter((o) => o.tableId === params.table_id);
        if (params.status) result = result.filter((o) => o.status === params.status);
        return result;
      }
      throw err;
    }
  },

  async get(id) {
    try {
      return await api.get(`/orders/${id}/`);
    } catch (err) {
      if (err.isNetwork) return MOCK_ORDERS.find((o) => o.id === id);
      throw err;
    }
  },

  /** Créer une nouvelle commande */
  async create(payload) {
    // payload: { table_id, items: [{plat_id, nom, qte, prix}], obs, pour_cuisinier }
    try {
      return await api.post("/orders/", payload);
    } catch (err) {
      if (err.isNetwork) {
        const order = {
          id: `CMD-${String(Date.now()).slice(-4)}`,
          tableId: payload.table_id,
          tableNum: payload.table_num || "??",
          items: payload.items || [],
          status: payload.pour_cuisinier === false ? "EN_ATTENTE_LIVRAISON" : "EN_ATTENTE_ACCEPTATION",
          montant: 0,
          obs: payload.obs || "",
          createdAt: new Date().toISOString(),
          created_at: new Date().toISOString(),
        };
        return order;
      }
      throw err;
    }
  },

  /** Transmettre aux cuisiniers */
  async transmit(id) {
    try {
      return await api.post(`/orders/${id}/transmettre/`);
    } catch (err) {
      if (err.isNetwork) return { id, status: "EN_ATTENTE_ACCEPTATION" };
      throw err;
    }
  },

  /** Accepter une commande (cuisinier) */
  async accept(id, cuisinierId) {
    try {
      return await api.post(`/orders/${id}/accept/`, { cuisinier_id: cuisinierId });
    } catch (err) {
      if (err.isNetwork) return { id, status: "EN_PREPARATION" };
      throw err;
    }
  },

  /** Rejeter une commande (cuisinier) */
  async reject(id, motif) {
    try {
      return await api.post(`/orders/${id}/reject/`, { motif });
    } catch (err) {
      if (err.isNetwork) return { id, status: "REFUSEE" };
      throw err;
    }
  },

  /** Marquer prête (cuisinier) */
  async markReady(id) {
    try {
      return await api.post(`/orders/${id}/ready/`);
    } catch (err) {
      if (err.isNetwork) return { id, status: "EN_ATTENTE_LIVRAISON" };
      throw err;
    }
  },

  /** Livrer une commande → passe en EN_ATTENTE_PAIEMENT */
  async deliver(id) {
    try {
      return await api.post(`/orders/${id}/deliver/`);
    } catch (err) {
      if (err.isNetwork) return { id, status: "EN_ATTENTE_PAIEMENT" };
      throw err;
    }
  },

  /**
   * Payer une commande individuellement (gérant uniquement).
   * Crée une facture liée à cette commande, passe le statut à PAYEE.
   * La table reste dans son statut actuel.
   * @param {string|number} id — num_id de la commande (ex: "CMD-003")
   * @param {{ mode_paiement: string, montant: number, pourboire?: number }} payload
   * @returns {{ order, invoice }}
   */
  async pay(id, payload) {
    try {
      return await api.post(`/orders/${id}/pay/`, payload);
    } catch (err) {
      if (err.isNetwork) {
        return {
          order: { id, status: "PAYEE", is_paid: true },
          invoice: {
            id: `FAC-${Date.now()}`,
            montant: payload.montant,
            mode_paiement: payload.mode_paiement,
            date: new Date().toISOString(),
          },
        };
      }
      throw err;
    }
  },

  /** Annuler une commande */
  async cancel(id, motif) {
    try {
      return await api.post(`/orders/${id}/cancel/`, { motif });
    } catch (err) {
      if (err.isNetwork) return { id, status: "ANNULEE" };
      throw err;
    }
  },
};