import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  addDoc, collection, query, where, getDocs,
} from "firebase/firestore";
import { 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword
} from "firebase/auth";
import { db, auth } from "../firebase/firebase";
import "../stylesheets/Auth.css";
import { FiUser, FiMail, FiLock, FiArrowLeft, FiAlertCircle } from "react-icons/fi";

/*
  REGLAS DE ACCESO
 ─────────────────────────────────────────────────────────
  · Registro    - SOLO crea cuenta de practicante.
                  Los líderes NUNCA se auto-registran.
                  Administración los inserta en Firestore.

  · Login     - El sistema consulta Firestore:
                    uid en "lideres"      → /dashboard-lider
                    uid en "practicantes" → /perfil

    El rol se detecta automáticamente al iniciar sesión.
*/

/* ── Consulta Firestore y redirige según rol ── */
async function detectarRolYRedirigir(uid, navigate) {
  /* ¿Es líder? */
  const lSnap = await getDocs(
    query(collection(db, "lideres"), where("uid", "==", uid))
  );
  if (!lSnap.empty) {
    navigate("/dashboard-lider");
    return;
  }
  /* Por defecto → practicante */
  navigate("/perfil");
}

/* ── Garantizar doc en "practicantes" ── */
async function asegurarDocPracticante(u, nombreOverride = "") {
  const snap = await getDocs(
    query(collection(db, "practicantes"), where("uid", "==", u.uid))
  );
  if (snap.empty) {
    await addDoc(collection(db, "practicantes"), {
      uid:            u.uid,
      nombre:         nombreOverride || u.displayName || "",
      email:          u.email,
      foto:           u.photoURL || "",
      perfilCompleto: false,
      skills:         [],
      area:           "",
      experiencia:    [],
    });
  }
}

function Auth() {
  const navigate = useNavigate();

  const [modo,     setModo]     = useState("login");   // "login" | "registro"
  const [nombre,   setNombre]   = useState("");
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [error,    setError]    = useState("");
  const [cargando, setCargando] = useState(false);

  const reset = (nuevoModo) => {
    setModo(nuevoModo); setError("");
    setNombre(""); setEmail(""); setPassword("");
  };

  /* ──────────── REGISTRO (solo practicantes) ──────────── */
  const handleRegistro = async () => {
    setError("");
    if (!nombre.trim())      { setError("Ingresa tu nombre completo."); return; }
    if (!email.trim())       { setError("Ingresa tu correo."); return; }
    if (password.length < 6) { setError("La contraseña debe tener al menos 6 caracteres."); return; }

    setCargando(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
      await asegurarDocPracticante(cred.user, nombre.trim());
      navigate("/perfil");
    } catch (e) {
      if (e.code === "auth/email-already-in-use")
        setError("Este correo ya está registrado. Prueba con 'Iniciar sesión'.");
      else if (e.code === "auth/weak-password")
        setError("Contraseña muy débil. Usa al menos 6 caracteres.");
      else if (e.code === "auth/invalid-email")
        setError("Correo inválido. Verifica el formato.");
      else
        setError("Error al registrarse. Intenta de nuevo.");
    } finally { setCargando(false); }
  };

  /* ──────────── LOGIN (detecta rol automáticamente) ──────────── */
  const handleLogin = async () => {
    setError("");
    if (!email.trim() || !password) { setError("Completa todos los campos."); return; }
    setCargando(true);
    try {
      const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
      await detectarRolYRedirigir(cred.user.uid, navigate);
    } catch (e) {
      if (
        e.code === "auth/user-not-found"    ||
        e.code === "auth/wrong-password"    ||
        e.code === "auth/invalid-credential"
      ) {
        setError("Correo o contraseña incorrectos.");
      } else {
        setError("Error al iniciar sesión. Intenta de nuevo.");
      }
    } finally { setCargando(false); }
  };

 

  const handleSubmit = () => modo === "registro" ? handleRegistro() : handleLogin();
  const onKey = (e) => { if (e.key === "Enter") handleSubmit(); };

  return (
    <div className="auth-container">

      {/* ── IZQUIERDA ── */}
      <div className="auth-left">
        <div className="auth-left-content">
          <div className="auth-left-logo">B</div>
          <h2>Talento BCP</h2>
          <p>
            {modo === "registro"
              ? "Crea tu perfil como practicante y hazte visible para los líderes del banco."
              : "Accede a la plataforma de gestión de talento interno del BCP."}
          </p>

          {/* <div className="auth-left-cards">
            <div className="auth-left-card">
              <span className="auth-left-card-icon">👤</span>
              <div>
                <strong>Practicantes</strong>
                <p>Regístrate o inicia sesión con tus credenciales BCP.</p>
              </div>
            </div>
            <div className="auth-left-card">
              <span className="auth-left-card-icon">🏦</span>
              <div>
                <strong>Líderes BCP</strong>
                <p>
                  Inicia sesión con las credenciales asignadas por tu equipo.
                  Serás redirigido automáticamente a tu panel de gestión.
                </p>
              </div>
            </div>
          </div> */}
        </div>
      </div>

      {/* ── DERECHA ── */}
      <div className="auth-right">
        <button className="auth-volver-btn" onClick={() => navigate("/")}>
          <FiArrowLeft size={14}/> Volver
        </button>

        <div className="auth-box">

          {/* TABS */}
          <div className="auth-tabs">
            <button
              className={`auth-tab ${modo === "login" ? "auth-tab-activo" : ""}`}
              onClick={() => reset("login")}
            >
              Iniciar sesión
            </button>
            <button
              className={`auth-tab ${modo === "registro" ? "auth-tab-activo" : ""}`}
              onClick={() => reset("registro")}
            >
              Registrarse
            </button>
          </div>

          {/* ERROR */}
          {error && (
            <div className="auth-error">
              <FiAlertCircle size={13} style={{flexShrink:0}}/> {error}
            </div>
          )}

          {/* NOMBRE — solo registro */}
          {modo === "registro" && (
            <div className="auth-field">
              <FiUser className="auth-field-icon" size={15}/>
              <input
                type="text"
                placeholder="Nombre completo"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                onKeyDown={onKey}
              />
            </div>
          )}

          <div className="auth-field">
            <FiMail className="auth-field-icon" size={15}/>
            <input
              type="email"
              placeholder="Correo electrónico"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={onKey}
            />
          </div>

          <div className="auth-field">
            <FiLock className="auth-field-icon" size={15}/>
            <input
              type="password"
              placeholder={modo === "registro" ? "Mínimo 6 caracteres" : "Contraseña"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={onKey}
            />
          </div>

          <button
            className="auth-btn-primary"
            onClick={handleSubmit}
            disabled={cargando}
          >
            {cargando
              ? "Cargando..."
              : modo === "registro" ? "Crear cuenta" : "Ingresar"}
          </button>
          

        </div>
      </div>
    </div>
  );
}

export default Auth;
