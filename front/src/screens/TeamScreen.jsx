import { useState, useEffect } from "react";
import { C, ROLE_COLORS } from "../styles/tokens";
import { usersService } from "../api/services";
import { MOCK_USERS } from "../mock";
import { Card, Badge, Btn, Modal, Input, Select, Dot } from "../components/ui";
import { unwrap } from "../api/client";
import { handleApiError } from "../hooks/index";
import { api } from "../api/client"; // ← pour appeler /roles/

const TeamScreen = ({ role, toast }) => {
  const [users, setUsers]     = useState(MOCK_USERS);
  const [roles, setRoles]     = useState([]);               // ← rôles depuis API
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm]       = useState({
    firstName: "", lastName: "", login: "",
    role_id: "",                                             // ← ID entier
    password: "", password_confirm: ""                       // ← mots de passe
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Charger les utilisateurs
    usersService.list()
      .then(data => { if (data) setUsers(Array.isArray(data) ? data : (data.results ?? [])); })
      .catch(() => {});

    // Charger les rôles depuis /api/roles/
    api.get("/roles/")
      .then(data => {
        const list = Array.isArray(data) ? data : (data.results ?? []);
        setRoles(list);
        if (list.length) setForm(f => ({ ...f, role_id: list[0].id })); // valeur par défaut
      })
      .catch(() => {});
  }, []);

  const addUser = async () => {
    if (!form.firstName || !form.login)          { toast.warning("", "Prénom et login requis"); return; }
    if (!form.password)                          { toast.warning("", "Mot de passe requis"); return; }
    if (form.password !== form.password_confirm) { toast.warning("", "Les mots de passe ne correspondent pas"); return; }

    setLoading(true);
    try {
      const newU = await usersService.create({
        first_name:       form.firstName,
        last_name:        form.lastName,
        login:            form.login,
        role_id:          form.role_id,           // ← role_id entier
        password:         form.password,
        password_confirm: form.password_confirm,
      });

      const roleName = roles.find(r => r.id === form.role_id)?.nom ?? form.role_id;
      setUsers(p => [...p, { ...newU, firstName: form.firstName, lastName: form.lastName, isActive: true }]);
      setForm({ firstName: "", lastName: "", login: "", role_id: roles[0]?.id ?? "", password: "", password_confirm: "" });
      setShowAdd(false);
      toast.success("Utilisateur créé", `${form.firstName} ${form.lastName} — ${roleName}`);
    } catch (err) { handleApiError(err, toast); }
    finally { setLoading(false); }
  };

  const toggleUser = async (id) => {
    try {
      await usersService.toggle(id);
      setUsers(p => p.map(u => u.id === id ? { ...u, isActive: !u.isActive } : u));
    } catch (err) { handleApiError(err, toast); }
  };

  return (
    <div style={{ padding: 28, overflowY: "auto", flex: 1 }}>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 20 }}>
        <Btn onClick={() => setShowAdd(true)}>+ Ajouter un utilisateur</Btn>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: 12 }}>
        {users.map((u, i) => {
          const color = ROLE_COLORS[u.role] || C.gold;
          return (
            <Card key={u.id} className="anim-fadeUp" style={{ padding: 18, animationDelay: `${i * 35}ms` }}>
              <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
                <div style={{ width: 46, height: 46, borderRadius: 12, background: `${color}22`, border: `1px solid ${color}45`,
                  display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 700, color, flexShrink: 0 }}>
                  {u.firstName?.[0]}{u.lastName?.[0]}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: C.cream }} className="truncate">{u.firstName} {u.lastName}</div>
                  <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{u.login}</div>
                  <div style={{ marginTop: 5 }}>
                    <Badge color={color}>{u.role?.nom ?? u.role}</Badge>
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
                  <Dot color={u.isActive ? C.success : C.danger} />
                  {["admin", "administrateur", "manager"].includes(role) && (
                    <button onClick={() => toggleUser(u.id)}
                      style={{ background: "none", border: "none", color: C.muted, fontSize: 11, cursor: "pointer", transition: "color .2s" }}
                      className="hover-gold">
                      {u.isActive ? "Désactiver" : "Activer"}
                    </button>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Nouvel utilisateur">
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Input label="Prénom *" value={form.firstName} onChange={v => setForm(f => ({ ...f, firstName: v }))} required />
            <Input label="Nom"      value={form.lastName}  onChange={v => setForm(f => ({ ...f, lastName: v }))} />
          </div>
          <Input label="Identifiant de connexion *" value={form.login} onChange={v => setForm(f => ({ ...f, login: v }))} placeholder="prenom.nom" required />
          <Select
            label="Rôle"
            value={form.role_id}
            onChange={v => setForm(f => ({ ...f, role_id: Number(v) }))}
            options={roles.map(r => ({ value: r.id, label: r.nom }))}
          />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Input label="Mot de passe *"          type="password" value={form.password}         onChange={v => setForm(f => ({ ...f, password: v }))} required />
            <Input label="Confirmer mot de passe *" type="password" value={form.password_confirm} onChange={v => setForm(f => ({ ...f, password_confirm: v }))} required />
          </div>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <Btn variant="ghost" onClick={() => setShowAdd(false)}>Annuler</Btn>
            <Btn loading={loading} onClick={addUser} disabled={!form.firstName || !form.login || !form.password}>Créer le compte</Btn>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default TeamScreen;