/**
 * FATE & GRÂCE — Invoices API Service
 *
 * GET    /api/invoices/             ?table_id=&date_from=&date_to= → Invoice[]
 * GET    /api/invoices/{id}/        → Invoice
 * GET    /api/invoices/{id}/pdf/    → PDF (download)
 * POST   /api/invoices/{id}/reprint/ → 200
 */
import { api, downloadFile, unwrap } from "./client";
import { MOCK_INVOICES } from "../mock";
import { MOCK_USERS } from "../mock";   // ← déplacer depuis ligne ~55
import { MOCK_AUDIT } from "../mock";  

export const invoicesService = {
  async list(params = {}) {
    try {
      const qs = new URLSearchParams(
        Object.fromEntries(Object.entries(params).filter(([, v]) => v))
      ).toString();
      const data = await api.get(`/invoices/${qs ? "?" + qs : ""}`);
      return unwrap(data);
    } catch (err) {
      if (err.isNetwork) return [...MOCK_INVOICES];
      throw err;
    }
  },

  async get(id) {
    try {
      return await api.get(`/invoices/${id}/`);
    } catch (err) {
      if (err.isNetwork) return MOCK_INVOICES.find((i) => i.id === id);
      throw err;
    }
  },

  async downloadPdf(id, filename) {
    try {
      await downloadFile(`/invoices/${id}/pdf/`, filename || `facture-${id}.pdf`);
    } catch (err) {
      if (err.isNetwork) throw new Error("PDF indisponible en mode hors-ligne.");
      throw err;
    }
  },
};

/* ══════════════════════════════════════════════════════════
   USERS API Service
   ──────────────────────────────────────────────────────────
   GET    /api/users/               → User[]
   POST   /api/users/               { first_name, last_name, login, role } → User
   PUT    /api/users/{id}/          → User
   DELETE /api/users/{id}/          → 204
   POST   /api/users/{id}/toggle/   → User  (activer/désactiver)
   POST   /api/users/{id}/reset-password/ { new_password } → 200
   ══════════════════════════════════════════════════════════ */

export const usersService = {
  async list() {
    try {
      const data = await api.get("/users/");
      return unwrap(data);
    } catch (err) {
      if (err.isNetwork) return [...MOCK_USERS];
      throw err;
    }
  },

  async create(payload) {
    try {
      return await api.post("/users/", payload);
    } catch (err) {
      if (err.isNetwork) return { id: Date.now(), ...payload, isActive: true };
      throw err;
    }
  },

  async update(id, payload) {
    try {
      return await api.put(`/users/${id}/`, payload);
    } catch (err) {
      if (err.isNetwork) return { id, ...payload };
      throw err;
    }
  },

  async remove(id) {
    try {
      return await api.delete(`/users/${id}/`);
    } catch (err) {
      if (err.isNetwork) return null;
      throw err;
    }
  },

  async toggle(id) {
    try {
      return await api.post(`/users/${id}/toggle/`);
    } catch (err) {
      if (err.isNetwork) return { id, toggled: true };
      throw err;
    }
  },

  async resetPassword(id, newPassword) {
    try {
      return await api.post(`/users/${id}/reset-password/`, { new_password: newPassword });
    } catch (err) {
      if (err.isNetwork) return { success: true };
      throw err;
    }
  },
};

/* ══════════════════════════════════════════════════════════
   AUDIT API Service
   ──────────────────────────────────────────────────────────
   GET    /api/audit-logs/          ?user=&action=&date_from=&date_to= → Log[]
   GET    /api/audit-logs/export/   ?format=csv|excel|txt              → file
   ══════════════════════════════════════════════════════════ */


export const auditService = {
  async list(params = {}) {
    try {
      const qs = new URLSearchParams(
        Object.fromEntries(Object.entries(params).filter(([, v]) => v))
      ).toString();
      const data = await api.get(`/audit-logs/${qs ? "?" + qs : ""}`);
      return unwrap(data);
    } catch (err) {
      if (err.isNetwork) return [...MOCK_AUDIT];
      throw err;
    }
  },

  async export(format = "csv") {
    try {
      await downloadFile(`/audit-logs/export/?format=${format}`, `audit-logs.${format}`);
    } catch (err) {
      if (err.isNetwork) throw new Error("Export indisponible en mode hors-ligne.");
      throw err;
    }
  },
};

/* ══════════════════════════════════════════════════════════
   REPORTS API Service
   ──────────────────────────────────────────────────────────
   GET    /api/reports/dashboard/   → DashboardStats
   GET    /api/reports/orders/      ?period=day|week|month → OrderStats
   GET    /api/reports/stock/       → StockStats
   GET    /api/reports/kpi/         ?period= → KPIData
   GET    /api/reports/export/      ?type=orders|stock&format=csv|excel|pdf → file
   ══════════════════════════════════════════════════════════ */

export const reportsService = {
  async dashboard() {
    try {
      return await api.get("/reports/dashboard/");
    } catch (err) {
      if (err.isNetwork) return null;
      throw err;
    }
  },

  async orders(period = "day") {
    try {
      return await api.get(`/reports/orders/?period=${period}`);
    } catch (err) {
      if (err.isNetwork) return null;
      throw err;
    }
  },

  async stock() {
    try {
      return await api.get("/reports/stock/");
    } catch (err) {
      if (err.isNetwork) return null;
      throw err;
    }
  },

  async kpi(period = "month") {
    try {
      return await api.get(`/reports/kpi/?period=${period}`);
    } catch (err) {
      if (err.isNetwork) return null;
      throw err;
    }
  },

  async export(type, format = "pdf") {
    try {
      await downloadFile(`/reports/export/?type=${type}&format=${format}`, `rapport-${type}.${format}`);
    } catch (err) {
      if (err.isNetwork) throw new Error("Export indisponible en mode hors-ligne.");
      throw err;
    }
  },
};

/* ══════════════════════════════════════════════════════════
   NOTIFICATIONS API Service (WebSocket via polling fallback)
   ──────────────────────────────────────────────────────────
   GET    /api/notifications/       → Notification[]
   POST   /api/notifications/{id}/read/ → 200
   POST   /api/notifications/read-all/ → 200
   ══════════════════════════════════════════════════════════ */

export const notificationsService = {
  async list() {
    try {
      const data = await api.get("/notifications/");
      return unwrap(data);
    } catch (err) {
      if (err.isNetwork) return [];
      throw err;
    }
  },

  async markRead(id) {
    try {
      return await api.post(`/notifications/${id}/read/`);
    } catch (err) {
      if (err.isNetwork) return null;
      throw err;
    }
  },

  async markAllRead() {
    try {
      return await api.post("/notifications/read-all/");
    } catch (err) {
      if (err.isNetwork) return null;
      throw err;
    }
  },

  /**
   * WebSocket connection pour notifications temps réel.
   * Retourne une fonction de cleanup.
   * @param {function} onMessage - callback({ type, data })
   */
  connectWebSocket(onMessage) {
    const wsUrl = (process.env.REACT_APP_WS_URL || "ws://localhost:8000/ws") + "/notifications/";
    let ws;
    try {
      ws = new WebSocket(wsUrl);
      ws.onopen = () => console.log("[WS] Connecté aux notifications");
      ws.onmessage = (e) => {
        try { onMessage(JSON.parse(e.data)); } catch (_) {}
      };
      ws.onerror = () => console.warn("[WS] WebSocket indisponible — mode polling");
      ws.onclose = () => console.log("[WS] Déconnecté");
    } catch (_) {
      console.warn("[WS] WebSocket non supporté");
    }
    return () => ws && ws.close();
  },
  /**
   * S'abonner aux Push Notifications (Web Push / VAPID).
   * À appeler après que l'utilisateur a accordé la permission.
   * La clé publique VAPID doit être dans .env :
   *   REACT_APP_VAPID_PUBLIC_KEY=votre_cle_publique
   */
  async subscribePush() {
    console.log("On est dans subscribePush,");
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      console.warn("[Push] Non supporté sur ce navigateur");
      return null;
    }
    const vapidKey = process.env.REACT_APP_VAPID_PUBLIC_KEY;
    
    if (!vapidKey) {
      console.warn("[Push] REACT_APP_VAPID_PUBLIC_KEY manquante dans .env");
      return null;
    }
 
    try {
      // Convertir la clé VAPID base64url → Uint8Array
      const padding  = "=".repeat((4 - (vapidKey.length % 4)) % 4);
      const base64   = (vapidKey + padding).replace(/-/g, "+").replace(/_/g, "/");
      const rawData  = window.atob(base64);
      const appKey   = Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));

      console.log("Clé VAPID convertie:", appKey);
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly:      true,
        applicationServerKey: appKey,
      });
      console.log("Abonnement Push obtenu:", sub);
      // Extraire les clés de l'abonnement
      const p256dh = btoa(String.fromCharCode(...new Uint8Array(sub.getKey("p256dh"))));
      const auth   = btoa(String.fromCharCode(...new Uint8Array(sub.getKey("auth"))));
      
      // Envoyer l'abonnement au backend Django
      await api.post("/notifications/push-subscribe/", {
        endpoint: sub.endpoint,
        p256dh,
        auth,
      });
 
      console.log("[Push] Abonnement enregistré ✅");
      return sub;
    } catch (err) {
      // L'utilisateur a refusé ou une erreur technique — on n'interrompt pas l'app
      console.warn("[Push] Abonnement échoué:", err.message);
      return null;
    }
  },
};

/* ── Central export ─────────────────────────────────────── */
export * from "./auth";
export * from "./tables";
export * from "./orders";
export * from "./stock";
