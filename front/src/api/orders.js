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
 *   POST /api/orders/{id}/deliver/    {}                               → Order
 *   POST /api/orders/{id}/cancel/     { motif }                        → Order
 *
 * Serializer attendu (Order) :
 *   { id, table_id, table_num, serveur, cuisinier, items, status,
 *     montant, obs, motif, created_at, updated_at }
 *
 * items : [{ plat_id, nom, qte, prix_unitaire }]
 *
 * Status values :
 *   STOCKÉE | EN_ATTENTE_ACCEPTATION | EN_PRÉPARATION
 *   EN_ATTENTE_LIVRAISON | LIVRÉE | ANNULÉE | REFUSÉE
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
    // payload: { table_id, items: [{plat_id, nom, qte, prix}], obs }
    try {
      return await api.post("/orders/", payload);
    } catch (err) {
      if (err.isNetwork) {
        const order = {
          id: `CMD-${String(Date.now()).slice(-4)}`,
          tableId: payload.table_id,
          tableNum: payload.table_num || "??",
          serveur: payload.serveur || "Serveur",
          items: payload.items,
          status: "EN_ATTENTE_ACCEPTATION",
          cuisinier: "",
          montant: payload.items.reduce((s, i) => s + i.prix * i.qte, 0),
          obs: payload.obs || "",
          motif: "",
          createdAt: new Date().toISOString(),
        };
        return order;
      }
      throw err;
    }
  },

  async accept(id, cuisinierId) {
    try {
      return await api.post(`/orders/${id}/accept/`, { cuisinier_id: cuisinierId });
    } catch (err) {
      if (err.isNetwork) return { id, status: "EN_PRÉPARATION" };
      throw err;
    }
  },

  async reject(id, motif) {
    try {
      return await api.post(`/orders/${id}/reject/`, { motif });
    } catch (err) {
      if (err.isNetwork) return { id, status: "REFUSÉE", motif };
      throw err;
    }
  },

  async markReady(id) {
    try {
      return await api.post(`/orders/${id}/ready/`);
    } catch (err) {
      if (err.isNetwork) return { id, status: "EN_ATTENTE_LIVRAISON" };
      throw err;
    }
  },

  async deliver(id) {
    try {
      return await api.post(`/orders/${id}/deliver/`);
    } catch (err) {
      if (err.isNetwork) return { id, status: "LIVRÉE" };
      throw err;
    }
  },

  async cancel(id, motif) {
    try {
      return await api.post(`/orders/${id}/cancel/`, { motif });
    } catch (err) {
      if (err.isNetwork) return { id, status: "ANNULÉE", motif };
      throw err;
    }
  },
};
