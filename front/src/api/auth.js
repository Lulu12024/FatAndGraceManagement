/**
 * FATE & GRÂCE — Auth API Service
 *
 * Endpoints Django attendus :
 *   POST /api/auth/login/         { login, password }  → { token, user }
 *   POST /api/auth/logout/        {}                   → 200
 *   GET  /api/auth/me/            (bearer)             → User
 *   POST /api/auth/change-password/ { old_password, new_password } → 200
 */

import { api, setToken, clearToken } from "./client";
import { MOCK_USERS } from "../mock";

export const authService = {
  /**
   * Connexion utilisateur
   * @param {string} login
   * @param {string} password
   * @returns {Promise<{ token: string, user: object }>}
   */
  async login(login, password) {
    try {
      const data = await api.post("/auth/login/", { login, password });
      setToken(data.token);
      return data; // { token, user }
    } catch (err) {
      if (err.isNetwork) {
        // ── FALLBACK MOCK ──────────────────────────────────
        const user = MOCK_USERS.find((u) => u.login === login);
        if (!user) throw new Error("Identifiant introuvable");
        setToken("mock-token-" + Date.now());
        return { token: "mock", user };
      }
      throw err;
    }
  },

  /**
   * Déconnexion (invalide le token côté serveur)
   */
  async logout() {
    try {
      await api.post("/auth/logout/", {});
    } catch (_) {
      // On déconnecte localement même si le serveur est off
    } finally {
      clearToken();
    }
  },

  /**
   * Récupérer le profil de l'utilisateur courant
   */
  async me() {
    return api.get("/auth/me/");
  },

  /**
   * Changer le mot de passe
   */
  async changePassword(oldPassword, newPassword) {
    return api.post("/auth/change-password/", {
      old_password: oldPassword,
      new_password: newPassword,
    });
  },
};
