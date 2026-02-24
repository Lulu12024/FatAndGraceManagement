/**
 * FATE & GRÂCE — Custom React Hooks
 */
import { useState, useCallback, useEffect, useRef } from "react";
import { NetworkError } from "../api/client";

/* ══════════════════════════════════════════════════════════
   useToast — Système de notifications toast
   ══════════════════════════════════════════════════════════ */
export function useToast() {
  const [toasts, setToasts] = useState([]);

  const push = useCallback((type, title, msg = "", duration = 4000) => {
    const id = Date.now() + Math.random();
    setToasts((p) => [...p, { id, type, title, msg }]);
    setTimeout(() => setToasts((p) => p.filter((t) => t.id !== id)), duration);
    return id;
  }, []);

  const remove = useCallback((id) => {
    setToasts((p) => p.filter((t) => t.id !== id));
  }, []);

  const toast = {
    success: (title, msg, dur)  => push("success", title, msg, dur),
    error:   (title, msg, dur)  => push("error",   title, msg, dur),
    warning: (title, msg, dur)  => push("warning", title, msg, dur),
    info:    (title, msg, dur)  => push("info",    title, msg, dur),
    gold:    (title, msg, dur)  => push("gold",    title, msg, dur),
  };

  return { toasts, toast, removeToast: remove };
}

/* ══════════════════════════════════════════════════════════
   useApi — Generic async API call with loading/error states
   ══════════════════════════════════════════════════════════ */
export function useApi(apiFn, defaultData = null) {
  const [data, setData]       = useState(defaultData);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);

  const execute = useCallback(
    async (...args) => {
      setLoading(true);
      setError(null);
      try {
        const result = await apiFn(...args);
        setData(result);
        return result;
      } catch (err) {
        setError(err);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [apiFn]
  );

  return { data, loading, error, execute, setData };
}

/* ══════════════════════════════════════════════════════════
   useAutoRefresh — Poll an API endpoint every N seconds
   ══════════════════════════════════════════════════════════ */
export function useAutoRefresh(apiFn, interval = 30000, enabled = true) {
  const { data, loading, execute } = useApi(apiFn);
  const timer = useRef(null);

  useEffect(() => {
    if (!enabled) return;
    execute();
    timer.current = setInterval(execute, interval);
    return () => clearInterval(timer.current);
  }, [enabled, interval]); // eslint-disable-line

  return { data, loading, refresh: execute };
}

/* ══════════════════════════════════════════════════════════
   useOfflineDetect — Detect online/offline state
   ══════════════════════════════════════════════════════════ */
export function useOfflineDetect(toast) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const prevOnline = useRef(navigator.onLine);

  useEffect(() => {
    const goOnline  = () => {
      setIsOnline(true);
      if (!prevOnline.current) {
        toast?.success("Connexion rétablie", "Synchronisation en cours…");
      }
      prevOnline.current = true;
    };
    const goOffline = () => {
      setIsOnline(false);
      toast?.warning("Mode hors-ligne", "Les données locales sont utilisées.");
      prevOnline.current = false;
    };

    window.addEventListener("online",  goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online",  goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []); // eslint-disable-line

  return isOnline;
}

/* ══════════════════════════════════════════════════════════
   useLocalState — State that persists to localStorage
   ══════════════════════════════════════════════════════════ */
export function useLocalState(key, defaultValue) {
  const [state, setState] = useState(() => {
    try {
      const saved = localStorage.getItem(key);
      return saved !== null ? JSON.parse(saved) : defaultValue;
    } catch {
      return defaultValue;
    }
  });

  const set = useCallback((value) => {
    setState((prev) => {
      const next = typeof value === "function" ? value(prev) : value;
      try { localStorage.setItem(key, JSON.stringify(next)); } catch (_) {}
      return next;
    });
  }, [key]);

  return [state, set];
}

/* ══════════════════════════════════════════════════════════
   handleApiError — Standard error handling helper
   Retourne un message lisible et détermine s'il faut toaster
   ══════════════════════════════════════════════════════════ */
export function handleApiError(err, toast, fallbackMsg = "Une erreur est survenue") {
  if (!err) return;
  if (err instanceof NetworkError || err.isNetwork) {
    toast?.warning("Mode hors-ligne", "Les données de démonstration sont utilisées.");
    return;
  }
  const msg = err.message || fallbackMsg;
  toast?.error("Erreur", msg);
}
