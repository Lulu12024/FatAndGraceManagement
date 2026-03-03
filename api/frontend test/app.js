// ============================================================
//  API Tester — app.js
//  Fully updated for restructured flat /api/ endpoints
// ============================================================

const BASE_URL = 'http://localhost:8000/api';

// ======================== API SERVICE ========================
const Api = {
  accessToken: null,
  refreshToken: null,

  headers(extra = {}) {
    const h = { 'Content-Type': 'application/json', ...extra };
    if (this.accessToken) h['Authorization'] = `Bearer ${this.accessToken}`;
    return h;
  },

  async request(method, path, body = null, responseEl = null, statusEl = null) {
    const url = path.startsWith('http') ? path : `${BASE_URL}${path}`;
    const opts = { method, headers: this.headers() };
    if (body && method !== 'GET') opts.body = JSON.stringify(body);

    try {
      const res = await fetch(url, opts);
      const contentType = res.headers.get('content-type') || '';

      let data;
      if (contentType.includes('application/json')) {
        data = await res.json();
      } else if (
        contentType.includes('text/csv') ||
        contentType.includes('spreadsheet') ||
        contentType.includes('application/pdf')
      ) {
        const blob = await res.blob();
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        const disp = res.headers.get('content-disposition') || '';
        const match = disp.match(/filename="?(.+?)"?$/);
        a.download = match ? match[1] : 'export';
        document.body.appendChild(a);
        a.click();
        a.remove();
        data = { message: 'Fichier téléchargé avec succès' };
      } else {
        data = await res.text();
      }

      if (statusEl) this.setStatus(statusEl, res.status);
      if (responseEl) this.setResponse(responseEl, data);

      if (res.ok) {
        Toast.success(`${method} ${res.status} OK`);
      } else {
        Toast.error(`${method} ${res.status} — Erreur`);
      }

      return { ok: res.ok, status: res.status, data };
    } catch (err) {
      const msg = `Erreur réseau : ${err.message}`;
      if (statusEl) { statusEl.textContent = 'ERR'; statusEl.className = 'response-status s5xx'; }
      if (responseEl) responseEl.textContent = msg;
      Toast.error(msg);
      return { ok: false, status: 0, data: null };
    }
  },

  get(path, rEl, sEl)          { return this.request('GET',    path, null, rEl, sEl); },
  post(path, body, rEl, sEl)   { return this.request('POST',   path, body, rEl, sEl); },
  put(path, body, rEl, sEl)    { return this.request('PUT',    path, body, rEl, sEl); },
  patch(path, body, rEl, sEl)  { return this.request('PATCH',  path, body, rEl, sEl); },
  del(path, rEl, sEl)          { return this.request('DELETE', path, null, rEl, sEl); },

  setStatus(el, code) {
    el.textContent = code;
    el.className = 'response-status ' + (code < 300 ? 's2xx' : code < 500 ? 's4xx' : 's5xx');
  },

  setResponse(el, data) {
    if (typeof data === 'string') {
      el.textContent = data;
    } else {
      el.innerHTML = syntaxHighlight(JSON.stringify(data, null, 2));
    }
  }
};

// ======================== SYNTAX HIGHLIGHT ========================
function syntaxHighlight(json) {
  return json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(
      /("(\\u[\da-fA-F]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g,
      (match) => {
        let cls = 'json-number';
        if (/^"/.test(match)) {
          cls = /:$/.test(match) ? 'json-key' : 'json-string';
        } else if (/true|false/.test(match)) {
          cls = 'json-bool';
        } else if (/null/.test(match)) {
          cls = 'json-null';
        }
        return `<span class="${cls}">${match}</span>`;
      }
    );
}

// ======================== TOAST ========================
const Toast = {
  show(msg, type) {
    const c = document.getElementById('toastContainer');
    const t = document.createElement('div');
    t.className = `toast toast-${type}`;
    t.innerHTML = `<span>${type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️'}</span> ${msg}`;
    c.appendChild(t);
    setTimeout(() => t.remove(), 4000);
  },
  success(m) { this.show(m, 'success'); },
  error(m)   { this.show(m, 'error'); },
  info(m)    { this.show(m, 'info'); }
};

// ======================== HEADER AUTH ========================
const Auth = {
  async login() {
    const login = document.getElementById('loginInput').value;
    const password = document.getElementById('passwordInput').value;
    if (!login || !password) return Toast.error('Login et mot de passe requis');

    // POST /api/auth/login/
    const res = await Api.post('/auth/login/', { login, password });
    if (res.ok) {
      Api.accessToken = res.data.token;
      Api.refreshToken = res.data.refresh;
      this.updateIndicator(true, login);
      document.getElementById('logoutBtn').style.display = '';
      Toast.success(`Connecté en tant que ${login}`);
    }
  },

  async logout() {
    if (Api.refreshToken) {
      // POST /api/auth/logout/
      await Api.post('/auth/logout/', { refresh: Api.refreshToken });
    }
    Api.accessToken = null;
    Api.refreshToken = null;
    this.updateIndicator(false);
    document.getElementById('logoutBtn').style.display = 'none';
    Toast.info('Déconnecté');
  },

  updateIndicator(active, user = '') {
    const ind   = document.getElementById('tokenIndicator');
    const label = document.getElementById('tokenLabel');
    if (active) {
      ind.classList.add('active');
      label.textContent = `Connecté (${user})`;
    } else {
      ind.classList.remove('active');
      label.textContent = 'Non connecté';
    }
  }
};

// ======================== UI ========================
const UI = {
  switchTab(name) {
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(`tab-${name}`).classList.add('active');
    document.querySelector(`.tab-btn[data-tab="${name}"]`).classList.add('active');
  },

  toggleCollapsible(header) {
    header.classList.toggle('open');
    header.nextElementSibling.classList.toggle('open');
  },

  $(id)  { return document.getElementById(id); },
  val(id){ return (document.getElementById(id).value || '').trim(); }
};

// ======================== AUTH PANEL ========================
const AuthPanel = {
  async login() {
    const login    = UI.val('authLoginField');
    const password = UI.val('authPasswordField');
    // POST /api/auth/login/
    const res = await Api.post('/auth/login/', { login, password },
      UI.$('authLoginResponse'), UI.$('authLoginStatus'));
    if (res.ok) {
      Api.accessToken  = res.data.token;
      Api.refreshToken = res.data.refresh;
      Auth.updateIndicator(true, login);
      document.getElementById('logoutBtn').style.display = '';
    }
  },

  async me() {
    // GET /api/auth/me/
    await Api.get('/auth/me/', UI.$('authMeResponse'), UI.$('authMeStatus'));
  },

  async changePassword() {
    const body = {
      old_password: UI.val('authOldPwd'),
      new_password: UI.val('authNewPwd'),
    };
    // POST /api/auth/change-password/
    await Api.post('/auth/change-password/', body,
      UI.$('authChangePwdResponse'), UI.$('authChangePwdStatus'));
  }
};

// ======================== USERS ========================
const Users = {
  rEl() { return UI.$('usersResponse'); },
  sEl() { return UI.$('usersStatus'); },

  // GET /api/users/
  async list()            { await Api.get('/users/',       this.rEl(), this.sEl()); },
  // GET /api/roles/
  async listRoles()       { await Api.get('/roles/',       this.rEl(), this.sEl()); },
  // GET /api/permissions/
  async listPermissions() { await Api.get('/permissions/', this.rEl(), this.sEl()); },

  async createOrUpdate() {
    const id   = UI.val('userId');
    const body = {
      login:              UI.val('userLogin')           || undefined,
      first_name:         UI.val('userFirstName')       || undefined,
      last_name:          UI.val('userLastName')        || undefined,
      email:              UI.val('userEmail')           || undefined,
      sexe:               UI.val('userSexe')            || undefined,
      role_id:            parseInt(UI.val('userRole'))  || undefined,
      date_de_naissance:  UI.val('userDateDeNaissance') || undefined,
      telephone:          UI.val('userTelephone')       || undefined,
      password:           UI.val('userPassword')        || undefined,
      password_confirm:   UI.val('userPasswordConfirm') || undefined,
    };
    Object.keys(body).forEach(k => body[k] === undefined && delete body[k]);

    if (id) {
      // PATCH /api/users/{id}/
      await Api.patch(`/users/${id}/`, body, this.rEl(), this.sEl());
    } else {
      // POST /api/users/
      await Api.post('/users/', body, this.rEl(), this.sEl());
    }
  },

  async delete() {
    const id = UI.val('userId');
    if (!id) return Toast.error('ID requis');
    // DELETE /api/users/{id}/
    await Api.del(`/users/${id}/`, this.rEl(), this.sEl());
  },

  async toggle() {
    const id = UI.val('userActionId');
    if (!id) return Toast.error('ID requis');
    // POST /api/users/{id}/toggle/
    await Api.post(`/users/${id}/toggle/`, {}, this.rEl(), this.sEl());
  },

  async resetPassword() {
    const id  = UI.val('userResetId');
    const pwd = UI.val('userResetPwd');
    if (!id)  return Toast.error('ID requis');
    if (!pwd) return Toast.error('Nouveau mot de passe requis');
    // POST /api/users/{id}/reset-password/
    await Api.post(`/users/${id}/reset-password/`, { new_password: pwd }, this.rEl(), this.sEl());
  }
};

// ======================== TABLES ========================
const Tables = {
  rEl() { return UI.$('tablesResponse'); },
  sEl() { return UI.$('tablesStatus'); },

  // GET /api/tables/
  async list() { await Api.get('/tables/', this.rEl(), this.sEl()); },

  async saveTable() {
    const id   = UI.val('tableId');
    const body = {
      numero:      UI.val('tableNumero') || undefined,
      capacite:    parseInt(UI.val('tableCapacite')) || undefined,
      description: UI.val('tableDescription') || undefined,
    };
    Object.keys(body).forEach(k => body[k] === undefined && delete body[k]);
    if (id) {
      // PATCH /api/tables/{id}/
      await Api.patch(`/tables/${id}/`, body, this.rEl(), this.sEl());
    } else {
      // POST /api/tables/
      await Api.post('/tables/', body, this.rEl(), this.sEl());
    }
  },

  async deleteTable() {
    const id = UI.val('tableId');
    if (!id) return Toast.error('ID requis');
    // DELETE /api/tables/{id}/
    await Api.del(`/tables/${id}/`, this.rEl(), this.sEl());
  },

  async action(name) {
    const id = UI.val('tableActionId');
    if (!id) return Toast.error('ID table requis');
    // POST /api/tables/{id}/reserve|cancel|close/
    await Api.post(`/tables/${id}/${name}/`, {}, this.rEl(), this.sEl());
  },

  async pay() {
    const id   = UI.val('tablePayId');
    const mode = UI.val('tablePayMode');
    if (!id) return Toast.error('ID table requis');
    // POST /api/tables/{id}/pay/
    await Api.post(`/tables/${id}/pay/`, { mode_paiement: mode }, this.rEl(), this.sEl());
  }
};

// ======================== PLATS ========================
const Plats = {
  rEl() { return UI.$('platsResponse'); },
  sEl() { return UI.$('platsStatus'); },

  // GET /api/plats/
  async list() { await Api.get('/plats/', this.rEl(), this.sEl()); },

  async save() {
    const id   = UI.val('platId');
    const body = {
      nom:         UI.val('platNom')        || undefined,
      prix:        parseFloat(UI.val('platPrix')) || undefined,
      categorie:   UI.val('platCategorie')  || undefined,
      disponible:  UI.val('platDisponible') === 'true',
      description: UI.val('platDescription') || undefined,
      image_url:   UI.val('platImageUrl')   || undefined,
    };
    Object.keys(body).forEach(k => body[k] === undefined && delete body[k]);
    if (id) {
      // PATCH /api/plats/{id}/
      await Api.patch(`/plats/${id}/`, body, this.rEl(), this.sEl());
    } else {
      // POST /api/plats/
      await Api.post('/plats/', body, this.rEl(), this.sEl());
    }
  },

  async delete() {
    const id = UI.val('platId');
    if (!id) return Toast.error('ID requis');
    // DELETE /api/plats/{id}/
    await Api.del(`/plats/${id}/`, this.rEl(), this.sEl());
  }
};

// ======================== ORDERS ========================
const Orders = {
  rEl()    { return UI.$('commandesResponse'); },
  sEl()    { return UI.$('commandesStatus'); },
  listREl(){ return UI.$('ordersListResponse'); },
  listSEl(){ return UI.$('ordersListStatus'); },

  // GET /api/orders/
  async list() { await Api.get('/orders/', this.listREl(), this.listSEl()); },

  async create() {
    let items;
    try { items = JSON.parse(UI.val('cmdPlats')); }
    catch { return Toast.error('Format JSON invalide pour les items'); }

    const body = {
      table_id:     parseInt(UI.val('cmdTable')),
      serveur_id:   parseInt(UI.val('cmdServeur')) || undefined,
      obs:          UI.val('cmdObservations') || undefined,
      items:        items,
    };
    Object.keys(body).forEach(k => body[k] === undefined && delete body[k]);
    // POST /api/orders/
    await Api.post('/orders/', body, this.listREl(), this.listSEl());
  },

  async action(name) {
    const id = UI.val('cmdActionId');
    if (!id) return Toast.error('ID commande requis');
    // POST /api/orders/{id}/accept|ready|deliver/
    await Api.post(`/orders/${id}/${name}/`, {}, this.rEl(), this.sEl());
  },

  showRejectForm() {
    UI.$('cmdRejectForm').style.display = '';
    UI.$('cmdCancelForm').style.display = 'none';
  },

  showCancelForm() {
    UI.$('cmdCancelForm').style.display = '';
    UI.$('cmdRejectForm').style.display = 'none';
  },

  async reject() {
    const id = UI.val('cmdActionId');
    if (!id) return Toast.error('ID commande requis');
    // POST /api/orders/{id}/reject/
    await Api.post(`/orders/${id}/reject/`, { motif: UI.val('cmdMotifRejet') },
      this.rEl(), this.sEl());
  },

  async cancel() {
    const id = UI.val('cmdActionId');
    if (!id) return Toast.error('ID commande requis');
    // POST /api/orders/{id}/cancel/
    await Api.post(`/orders/${id}/cancel/`, { motif: UI.val('cmdMotifAnnulation') },
      this.rEl(), this.sEl());
  },

  async listFiltered() {
    const params = new URLSearchParams();
    const s  = UI.val('cmdFilterStatut');  if (s)  params.set('statut', s);
    const sv = UI.val('cmdFilterServeur'); if (sv) params.set('serveur', sv);
    // GET /api/orders/?statut=...&serveur=...
    await Api.get(`/orders/?${params}`, this.listREl(), this.listSEl());
  }
};

// ======================== INVOICES ========================
const Invoices = {
  rEl() { return UI.$('invoicesResponse'); },
  sEl() { return UI.$('invoicesStatus'); },

  // GET /api/invoices/
  async list() { await Api.get('/invoices/', this.rEl(), this.sEl()); },

  async listFiltered() {
    const params = new URLSearchParams();
    const t  = UI.val('invFilterTable');    if (t)  params.set('table', t);
    const d1 = UI.val('invFilterDateDebut'); if (d1) params.set('date_from', d1);
    const d2 = UI.val('invFilterDateFin');  if (d2) params.set('date_to', d2);
    await Api.get(`/invoices/?${params}`, this.rEl(), this.sEl());
  },

  async detail() {
    const id = UI.val('invActionId');
    if (!id) return Toast.error('ID requis');
    // GET /api/invoices/{id}/
    await Api.get(`/invoices/${id}/`, this.rEl(), this.sEl());
  },

  async pdf() {
    const id = UI.val('invActionId');
    if (!id) return Toast.error('ID requis');
    // GET /api/invoices/{id}/pdf/  → déclenche téléchargement
    await Api.get(`/invoices/${id}/pdf/`, this.rEl(), this.sEl());
  },

  async reprint() {
    const id = UI.val('invActionId');
    if (!id) return Toast.error('ID requis');
    // POST /api/invoices/{id}/reprint/
    await Api.post(`/invoices/${id}/reprint/`, {}, this.rEl(), this.sEl());
  }
};

// ======================== NOTIFICATIONS ========================
const Notifs = {
  rEl() { return UI.$('notifsResponse'); },
  sEl() { return UI.$('notifsStatus'); },

  // GET /api/notifications/
  async list() { await Api.get('/notifications/', this.rEl(), this.sEl()); },

  async markRead() {
    const id = UI.val('notifActionId');
    if (!id) return Toast.error('ID requis');
    // POST /api/notifications/{id}/read/
    await Api.post(`/notifications/${id}/read/`, {}, this.rEl(), this.sEl());
  },

  async readAll() {
    // POST /api/notifications/read-all/
    await Api.post('/notifications/read-all/', {}, this.rEl(), this.sEl());
  }
};

// ======================== STOCKS ========================
const Stocks = {
  // Produits — GET /api/products/
  async listProduits()   { await Api.get('/products/',            UI.$('produitsResponse'), UI.$('produitsStatus')); },
  // GET /api/products/categories/
  async listCategories() { await Api.get('/products/categories/', UI.$('produitsResponse'), UI.$('produitsStatus')); },
  // GET /api/unites/
  async listUnites()     { await Api.get('/unites/',              UI.$('produitsResponse'), UI.$('produitsStatus')); },

  async saveProduit() {
    const id   = UI.val('produitId');
    const body = {
      nom:             UI.val('produitNom')                  || undefined,
      categorie:       UI.val('produitCategorie')            || undefined,
      seuil_alerte:    parseFloat(UI.val('produitSeuil'))    || undefined,
      unite_id:        parseInt(UI.val('produitUnite'))      || undefined,
      qte_initiale:    parseFloat(UI.val('produitQteInitiale')) || undefined,
      date_peremption: UI.val('produitPeremption')           || undefined,
    };
    Object.keys(body).forEach(k => body[k] === undefined && delete body[k]);
    if (id) {
      // PATCH /api/products/{id}/
      await Api.patch(`/products/${id}/`, body, UI.$('produitsResponse'), UI.$('produitsStatus'));
    } else {
      // POST /api/products/
      await Api.post('/products/', body, UI.$('produitsResponse'), UI.$('produitsStatus'));
    }
  },

  async deleteProduit() {
    const id = UI.val('produitId');
    if (!id) return Toast.error('ID requis');
    // DELETE /api/products/{id}/
    await Api.del(`/products/${id}/`, UI.$('produitsResponse'), UI.$('produitsStatus'));
  },

  // GET /api/stocks/
  async listStocks() { await Api.get('/stocks/', UI.$('stocksResponse'), UI.$('stocksStatus')); },

  // Mouvements
  // GET /api/movements/
  async listMouvements() { await Api.get('/movements/', UI.$('mouvementsResponse'), UI.$('mouvementsStatus')); },

  async createMouvement() {
    const body = {
      type_mouvement_id: parseInt(UI.val('mvtType'))     || undefined,
      produit_id:        parseInt(UI.val('mvtProduit'))  || undefined,
      quantite:          UI.val('mvtQuantite')           || undefined,
      justification:     UI.val('mvtJustification')      || undefined,
      fournisseur:       UI.val('mvtFournisseur')        || undefined,
    };
    Object.keys(body).forEach(k => body[k] === undefined && delete body[k]);
    // POST /api/movements/
    await Api.post('/movements/', body, UI.$('mouvementsResponse'), UI.$('mouvementsStatus'));
  },

  async mvtAction(name) {
    const id = UI.val('mvtActionId');
    if (!id) return Toast.error('ID mouvement requis');
    // POST /api/movements/{id}/validate/
    await Api.post(`/movements/${id}/${name}/`, {}, UI.$('mouvementsResponse'), UI.$('mouvementsStatus'));
  },

  showMvtRejectForm() { UI.$('mvtRejectForm').style.display = ''; },

  async mvtReject() {
    const id = UI.val('mvtActionId');
    if (!id) return Toast.error('ID mouvement requis');
    // POST /api/movements/{id}/reject/
    await Api.post(`/movements/${id}/reject/`, {
      motif_rejet: UI.val('mvtMotifRejet')
    }, UI.$('mouvementsResponse'), UI.$('mouvementsStatus'));
  },

  // Demandes
  // GET /api/demandes/
  async listDemandes() { await Api.get('/demandes/', UI.$('demandesResponse'), UI.$('demandesStatus')); },

  async createDemande() {
    const body = {
      produit_id:    parseInt(UI.val('demProduit'))  || undefined,
      quantite:      UI.val('demQuantite')           || undefined,
      justification: UI.val('demJustification')      || undefined,
    };
    Object.keys(body).forEach(k => body[k] === undefined && delete body[k]);
    // POST /api/demandes/
    await Api.post('/demandes/', body, UI.$('demandesResponse'), UI.$('demandesStatus'));
  },

  async demAction(name) {
    const id = UI.val('demActionId');
    if (!id) return Toast.error('ID demande requis');
    // POST /api/demandes/{id}/validate|reject/
    await Api.post(`/demandes/${id}/${name}/`, {}, UI.$('demandesResponse'), UI.$('demandesStatus'));
  },

  showDemRejectForm() { UI.$('demRejectForm').style.display = ''; },

  async demReject() {
    const id = UI.val('demActionId');
    if (!id) return Toast.error('ID demande requis');
    // POST /api/demandes/{id}/reject/
    await Api.post(`/demandes/${id}/reject/`, {
      motif_rejet: UI.val('demMotifRejet')
    }, UI.$('demandesResponse'), UI.$('demandesStatus'));
  }
};

// ======================== AUDIT ========================
const Audit = {
  // GET /api/audit-logs/
  async listLogs() { await Api.get('/audit-logs/', UI.$('logsResponse'), UI.$('logsStatus')); },

  async listLogsFiltered() {
    const params = new URLSearchParams();
    const u  = UI.val('logFilterUser');     if (u)  params.set('user_id', u);
    const a  = UI.val('logFilterAction');   if (a)  params.set('action', a);
    const t  = UI.val('logFilterTable');    if (t)  params.set('table_name', t);
    const d1 = UI.val('logFilterDateFrom'); if (d1) params.set('date_from', d1);
    const d2 = UI.val('logFilterDateTo');   if (d2) params.set('date_to', d2);
    // GET /api/audit-logs/?...
    await Api.get(`/audit-logs/?${params}`, UI.$('logsResponse'), UI.$('logsStatus'));
  },

  async exportLogs() {
    const fmt = UI.val('exportFormat') || 'csv';
    // GET /api/audit-logs/export/?format=csv|excel  → déclenche téléchargement
    await Api.get(`/audit-logs/export/?format=${fmt}`, UI.$('logsResponse'), UI.$('logsStatus'));
  }
};

// ======================== REPORTS ========================
const Reports = {
  // GET /api/reports/dashboard/
  async dashboard() {
    await Api.get('/reports/dashboard/', UI.$('dashboardResponse'), UI.$('dashboardStatus'));
  },

  // GET /api/reports/kpi/?period=30
  async kpi() {
    const period = UI.val('kpiPeriod') || '30';
    await Api.get(`/reports/kpi/?period=${period}`, UI.$('kpiResponse'), UI.$('kpiStatus'));
  },

  // GET /api/reports/orders/?period=7
  async orders() {
    const period = UI.val('orderStatsPeriod') || '7';
    await Api.get(`/reports/orders/?period=${period}`, UI.$('ordersStatsResponse'), UI.$('ordersStatsStatus'));
  },

  // GET /api/reports/stock/
  async stock() {
    await Api.get('/reports/stock/', UI.$('stockStatsResponse'), UI.$('stockStatsStatus'));
  }
};
