import { useState } from "react";
import { C } from "../styles/tokens";
import { authService } from "../api/auth";
import { MOCK_USERS } from "../mock";
// import { Logo, Btn, Input, Spinner } from "../components/ui";
import { Logo, Btn, Input, Spinner, Card, Divider } from "../components/ui";

const LoginScreen = ({ onLogin, toast }) => {
  const [login, setLogin]       = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);

  const handleSubmit = async () => {
    if (!login) { setError("Veuillez saisir votre identifiant"); return; }
    setError(""); setLoading(true);
    try {
      const { user } = await authService.login(login, password || "demo");
      toast.success("Bienvenue !", user.firstName || user.login);
      onLogin(user);
    } catch (err) {
      setError(err.message || "Identifiants incorrects");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight:"100vh", background:C.bg0, display:"flex", alignItems:"center", justifyContent:"center", position:"relative", overflow:"hidden" }}>
      {/* Ambient glow */}
      <div style={{ position:"absolute", width:700, height:700, borderRadius:"50%", background:`radial-gradient(circle,${C.gold}07 0%,transparent 70%)`, top:-150, left:-150, pointerEvents:"none" }}/>
      <div style={{ position:"absolute", width:500, height:500, borderRadius:"50%", background:`radial-gradient(circle,${C.gold}05 0%,transparent 70%)`, bottom:0, right:0, pointerEvents:"none" }}/>

      <div className="anim-fadeUp" style={{ width:"100%", maxWidth:420, padding:20 }}>
        {/* Logo */}
        <div style={{ textAlign:"center", marginBottom:36 }}>
          <div style={{ display:"flex", justifyContent:"center", marginBottom:18 }}><Logo size={88}/></div>
          <h1 className="serif" style={{ fontSize:26, fontWeight:600, color:C.goldL, letterSpacing:4 }}>FATE & GRÂCE</h1>
          <p style={{ fontSize:10, color:C.muted, letterSpacing:4, textTransform:"uppercase", marginTop:5 }}>Plateforme de Gestion</p>
        </div>

        <Card style={{ padding:32, border:`1px solid ${C.goldBorder}` }}>
          <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
            <Input label="Identifiant" value={login} onChange={setLogin} placeholder="votre.login" required/>
            <Input label="Mot de passe" type="password" value={password} onChange={setPassword}
              placeholder="••••••••" required style={{ letterSpacing:2 }}/>

            {error && (
              <div style={{ background:C.dangerBg, border:`1px solid ${C.dangerBdr}`, borderRadius:8, padding:"9px 13px", fontSize:12, color:C.danger }}>
                ⚠ {error}
              </div>
            )}

            <Btn onClick={handleSubmit} loading={loading} disabled={!login}
              style={{ width:"100%", justifyContent:"center", padding:"13px 20px", fontSize:14, letterSpacing:1 }}>
              Se connecter
            </Btn>

            {/* <Divider label="Comptes de démonstration"/> */}

            {/* <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:6 }}>
              {Object.entries({ admin:"Admin", gérant:"Gérant", manager:"Manager", serveur:"Serveur", cuisinier:"Cuisinier", gestionnaire:"Gest. Stock" }).map(([role, label]) => (
                <button key={role} onClick={()=>{ const u = MOCK_USERS.find(x=>x.role===role); if(u){ setLogin(u.login); setPassword("demo"); }}}
                  style={{ background:C.bg3, border:`1px solid rgba(255,255,255,0.08)`, color:C.mutedL,
                    borderRadius:7, padding:"6px 8px", fontSize:11, fontFamily:"'Raleway',sans-serif",
                    cursor:"pointer", transition:"all .2s" }} className="hover-bg">
                  {label}
                </button>
              ))}
            </div> */}
          </div>
        </Card>

        <p style={{ textAlign:"center", fontSize:10, color:C.mutedD, marginTop:20, letterSpacing:.8 }}>
          FATE & GRÂCE · v1.0 · 2026 &copy; Tous droits réservés
        </p>
      </div>
    </div>
  );
};

/* ══════════════════════════════════════════════════════════
   DASHBOARD SCREEN
   ══════════════════════════════════════════════════════════ */

export default LoginScreen;
