/**
 * FATE & GRÂCE — Plats API Service
 *
 * Endpoints Django :
 *   GET    /api/plats/          → Plat[]
 *   POST   /api/plats/          → Plat  (Gérant, Admin)
 *   PUT    /api/plats/{id}/     → Plat  (Gérant, Admin)
 *   DELETE /api/plats/{id}/     →  204  (Admin)
 *
 * Serializer retourné :
 *   { id, nom, prix, categorie, disponible, description, image_url }
 */

import { api } from "./client";
import { MOCK_PLATS } from "../mock";

export const platsService = {
  async list(params = {}) {
    try {
      const qs = new URLSearchParams(
        Object.fromEntries(Object.entries(params).filter(([, v]) => v != null))
      ).toString();
      return await api.get(`/plats/${qs ? "?" + qs : ""}`);
    } catch (err) {
      if (err.isNetwork) return [...MOCK_PLATS];
      throw err;
    }
  },

  async get(id) {
    try {
      return await api.get(`/plats/${id}/`);
    } catch (err) {
      if (err.isNetwork) return MOCK_PLATS.find(p => p.id === id);
      throw err;
    }
  },

  async create(payload) {
    // payload: { nom, prix, categorie, disponible, description, image_url }
    try {
      return await api.post("/plats/", payload);
    } catch (err) {
      if (err.isNetwork) return { id: Date.now(), disponible: true, ...payload };
      throw err;
    }
  },

  async update(id, payload) {
    try {
      return await api.put(`/plats/${id}/`, payload);
    } catch (err) {
      if (err.isNetwork) return { id, ...payload };
      throw err;
    }
  },

  async remove(id) {
    try {
      return await api.delete(`/plats/${id}/`);
    } catch (err) {
      if (err.isNetwork) return null;
      throw err;
    }
  },
};