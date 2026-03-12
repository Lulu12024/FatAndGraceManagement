import { useState, useEffect } from "react";
import { C, ROLE_COLORS } from "../styles/tokens";
import { usersService } from "../api/services";
import { Card, Badge, Btn, Modal, Input, Select, Dot, Spinner, Empty } from "../components/ui";
import { handleApiError } from "../hooks/index";
import { api } from "../api/client";

const EMPTY_FORM = {
  firstName: "", lastName: "", login: "",
  role_id: "",
  password: "", password_confirm: "",
};

const TeamScreen = ({ role, toast }) => {
  const [users,    setUsers]    = useState(null);   // null = chargement en cours
  const [roles,    setRoles]    = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [showAdd,  setShowAdd]  = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [form,     setForm]     = useState(EMPTY_FORM);
  const [saving,   setSaving]   = useState(false);

  const isAdmin = ["admin", "administrateur", "manager"].includes(role);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      usersService.list()
        .then(data => setUsers(Array.isArray(data) ? data : (data?.results ?? [])))
        .catch(() => setUsers([])),
      api.get("/roles/")
        .then(data => {
          const list = Array.isArray(data) ? data : (data?.results ?? []);
          setRoles(list);
          if (list.length) setForm(f => ({ ...f, role_id: list[0].id }));
        })
        .catch(() => {}),
    ]).finally(() => setLoading(false));
  }, []);

  const openEdit = (u) => {
    setEditUser(u);
    setEditForm({
      firstName: u.first_name ?? "", lastName: u.last_name ?? "",
      login: u.login ?? "", role_id: u.role?.id ?? u.role_id ?? (roles[0]?.id ?? ""),
      newPassword: "", newPassword_confirm: "",
    });
  };

  const saveEdit = async () => {
    if (!editForm.firstName || !editForm.login) { toast.warning("", "Prénom et login requis"); return; }
    if (editForm.newPassword && editForm.newPassword !== editForm.newPassword_confirm) {
      toast.warning("", "Les mots de passe ne correspondent pas"); return;
    }
    setSaving(true);
    try {
      const payload = { first_name: editForm.firstName, last_name: editForm.lastName, login: editForm.login, role_id: Number(editForm.role_id) };
      if (editForm.newPassword) { payload.password = editForm.newPassword; payload.password_confirm = editForm.newPassword_confirm; }
      const updated = await usersService.update(editUser.id, payload);
      setUsers(prev => prev.map(u => u.id === editUser.id
        ? { ...u, ...updated, first_name: editForm.firstName, last_name: editForm.lastName,
            login: editForm.login, role: roles.find(r => r.id === Number(editForm.role_id)) ?? u.role }
        : u
      ));
      setEditUser(null);
      toast.success("Utilisateur mis à jour", `${editForm.firstName} ${editForm.lastName}`);
    } catch (err) { handleApiError(err, toast); }
    finally { setSaving(false); }
  };

  const addUser = async () => {
    if (!form.firstName || !form.login)          { toast.warning("", "Prénom et login requis"); return; }
    if (!form.password)                          { toast.warning("", "Mot de passe requis"); return; }
    if (form.password !== form.password_confirm) { toast.warning("", "Les mots de passe ne correspondent pas"); return; }
    setSaving(true);
    try {
      const newU = await usersService.create({
        first_name: form.firstName, last_name: form.lastName, login: form.login,
        role_id: form.role_id, password: form.password, password_confirm: form.password_confirm,
      });
      const roleName = roles.find(r => r.id === form.role_id)?.nom ?? form.role_id;
      setUsers(p => [...p, { ...newU, first_name: form.firstName, last_name: form.lastName, is_activite: true }]);
      setForm({ ...EMPTY_FORM, role_id: roles[0]?.id ?? "" });
      setShowAdd(false);
      toast.success("Utilisateur créé", `${form.firstName} ${form.lastName} — ${roleName}`);
    } catch (err) { handleApiError(err, toast); }
    finally { setSaving(false); }
  };

  const toggleUser = async (id) => {
    try {
      await usersService.toggle(id);
      setUsers(p => p.map(u => u.id === id ? { ...u, is_activite: !u.is_activite } : u));
    } catch (err) { handleApiError(err, toast); }
  };

  return (
    <div style={{ padding: 28, overflowY: "auto", flex: 1 }}>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 20 }}>
        <Btn onClick={() => setShowAdd(true)}>+ Ajouter un utilisateur</Btn>
      </div>

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", paddingTop: 80 }}>
          <Spinner />
        </div>
      ) : !users?.length ? (
        <Empty icon="👥" text="Aucun utilisateur trouvé" />
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: 12 }}>
          {users.map((u, i) => {
            const color = ROLE_COLORS[u.role?.nom ?? u.role] || C.gold;
            return (
              <Card key={u.id} className="anim-fadeUp" style={{ padding: 18, animationDelay: `${i * 35}ms` }}>
                <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
                  <div style={{ width: 46, height: 46, borderRadius: 12, background: `${color}22`, border: `1px solid ${color}45`,
                    display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 700, color, flexShrink: 0 }}>
                    {u.first_name?.[0]}{u.last_name?.[0]}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: C.cream }} className="truncate">{u.first_name} {u.last_name}</div>
                    <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{u.login}</div>
                    <div style={{ marginTop: 5 }}><Badge color={color}>{u.role?.nom ?? u.role}</Badge></div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
                    <Dot color={u.is_activite ? C.success : C.danger} />
                    {isAdmin && (
                      <div style={{ display: "flex", gap: 8 }}>
                        <button onClick={() => openEdit(u)} style={{ background: "none", border: "none", color: C.gold, fontSize: 11, cursor: "pointer" }} title="Modifier">✏️</button>
                        <button onClick={() => toggleUser(u.id)} style={{ background: "none", border: "none", color: C.muted, fontSize: 11, cursor: "pointer" }} className="hover-gold">
                          {u.is_activite ? "Désactiver" : "Activer"}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Nouvel utilisateur">
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Input label="Prénom *" value={form.firstName} onChange={v => setForm(f => ({ ...f, firstName: v }))} required />
            <Input label="Nom"      value={form.lastName}  onChange={v => setForm(f => ({ ...f, lastName: v }))} />
          </div>
          <Input label="Identifiant de connexion *" value={form.login} onChange={v => setForm(f => ({ ...f, login: v }))} placeholder="prenom.nom" required />
          <Select label="Rôle" value={form.role_id} onChange={v => setForm(f => ({ ...f, role_id: Number(v) }))} options={roles.map(r => ({ value: r.id, label: r.nom }))} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Input label="Mot de passe *"           type="password" value={form.password}         onChange={v => setForm(f => ({ ...f, password: v }))} required />
            <Input label="Confirmer mot de passe *"  type="password" value={form.password_confirm} onChange={v => setForm(f => ({ ...f, password_confirm: v }))} required />
          </div>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <Btn variant="ghost" onClick={() => setShowAdd(false)}>Annuler</Btn>
            <Btn loading={saving} onClick={addUser} disabled={!form.firstName || !form.login || !form.password}>Créer le compte</Btn>
          </div>
        </div>
      </Modal>

      <Modal open={!!editUser} onClose={() => setEditUser(null)} title={`Modifier — ${editUser?.first_name ?? ""} ${editUser?.last_name ?? ""}`}>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Input label="Prénom *" value={editForm.firstName ?? ""} onChange={v => setEditForm(f => ({ ...f, firstName: v }))} required />
            <Input label="Nom"      value={editForm.lastName  ?? ""} onChange={v => setEditForm(f => ({ ...f, lastName: v }))} />
          </div>
          <Input label="Identifiant de connexion *" value={editForm.login ?? ""} onChange={v => setEditForm(f => ({ ...f, login: v }))} required />
          <Select label="Rôle" value={editForm.role_id ?? ""} onChange={v => setEditForm(f => ({ ...f, role_id: Number(v) }))} options={roles.map(r => ({ value: r.id, label: r.nom }))} />
          <div style={{ borderTop: `1px solid rgba(255,255,255,0.08)`, paddingTop: 12, display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ fontSize: 11, color: C.muted }}>Nouveau mot de passe (laisser vide pour ne pas changer)</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Input label="Nouveau mot de passe"   type="password" value={editForm.newPassword         ?? ""} onChange={v => setEditForm(f => ({ ...f, newPassword: v }))} />
              <Input label="Confirmer mot de passe" type="password" value={editForm.newPassword_confirm ?? ""} onChange={v => setEditForm(f => ({ ...f, newPassword_confirm: v }))} />
            </div>
          </div>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <Btn variant="ghost" onClick={() => setEditUser(null)}>Annuler</Btn>
            <Btn loading={saving} onClick={saveEdit} disabled={!editForm.firstName || !editForm.login}>Enregistrer</Btn>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default TeamScreen;