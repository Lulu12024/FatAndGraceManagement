/**
 * FATE & GRÂCE — API Client
 * Central HTTP client avec gestion token JWT, intercepteurs, et logs.
 * Base URL configurée via variable d'environnement React.
 */

// export const BASE_URL = process.env.REACT_APP_API_URL || "http://10.64.10.53:8001/api";

export const BASE_URL = process.env.REACT_APP_API_URL || "https://fatandgracemanagement.onrender.com/api";

/* ─── Token helpers ─────────────────────────────────── */
export const getToken = () => localStorage.getItem("fg_token");
export const setToken = (t) => localStorage.setItem("fg_token", t);
export const clearToken = () => localStorage.removeItem("fg_token");

export const getUser  = () => { try { return JSON.parse(localStorage.getItem("fg_user")); } catch { return null; } };
export const setUser  = (u) => localStorage.setItem("fg_user", JSON.stringify(u));
export const clearUser = () => localStorage.removeItem("fg_user");

/* ─── Core request ──────────────────────────────────── */
async function request(method, path, body = null, options = {}) {
  const token = getToken();
  const headers = {
    "Content-Type": "application/json",
    Accept: "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const config = {
    method,
    headers,
    ...(body ? { body: JSON.stringify(body) } : {}),
  };

  const url = `${BASE_URL}${path}`;

  try {
    const res = await fetch(url, config);

    // Token expiré → déconnexion automatique
    if (res.status === 401) {
      clearToken();
      window.dispatchEvent(new CustomEvent("fg:unauthorized"));
      throw new ApiError(401, "Session expirée. Veuillez vous reconnecter.");
    }

    if (res.status === 403) {
      throw new ApiError(403, "Accès refusé. Permission insuffisante.");
    }

    if (res.status === 404) {
      throw new ApiError(404, "Ressource introuvable.");
    }

    if (res.status === 204) {
      return null; // No content
    }

    let data;
    const ct = res.headers.get("content-type") || "";
    if (ct.includes("application/json")) {
      data = await res.json();
    } else {
      data = await res.text();
    }

    if (!res.ok) {
      const msg =
        (typeof data === "object" && (data.detail || data.message || data.error)) ||
        `Erreur ${res.status}`;
      throw new ApiError(res.status, msg, data);
    }

    return data;
  } catch (err) {
    if (err instanceof ApiError) throw err;
    // Réseau indisponible (CORS, serveur off…)
    throw new NetworkError(err.message);
  }
}

/* ─── Error classes ─────────────────────────────────── */
export class ApiError extends Error {
  constructor(status, message, data = null) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

export class NetworkError extends Error {
  constructor(message = "Serveur inaccessible. Mode hors-ligne activé.") {
    super(message);
    this.name = "NetworkError";
    this.isNetwork = true;
  }
}

/* ─── Public helpers ────────────────────────────────── */
export const api = {
  get:    (path, opts)       => request("GET",    path, null, opts),
  post:   (path, body, opts) => request("POST",   path, body, opts),
  put:    (path, body, opts) => request("PUT",    path, body, opts),
  patch:  (path, body, opts) => request("PATCH",  path, body, opts),
  delete: (path, opts)       => request("DELETE", path, null, opts),
};

/* ─── File download helper ──────────────────────────── */
export async function downloadFile(path, filename) {
  const token = getToken();
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new ApiError(res.status, "Erreur téléchargement");
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/* ─── Pagination unwrap ─────────────────────────────── */
// Django REST Framework retourne { count, next, previous, results: [...] }
// Cette fonction extrait le tableau automatiquement
export const unwrap = (data) => {
  if (data && Array.isArray(data.results)) return data.results;
  if (Array.isArray(data)) return data;
  return [];
};
