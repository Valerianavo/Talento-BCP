import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  addDoc, collection, query, where, getDocs,
} from "firebase/firestore";
import {
  signInWithPopup,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { db, auth, provider } from "../firebase/firebase";
import "../stylesheets/Auth.css";

// modo: "login" | "registro" | "lider"
function Auth() {
  const navigate = useNavigate();

  const [modo,     setModo]     = useState("login");
  const [nombre,   setNombre]   = useState("");
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [error,    setError]    = useState("");

  const resetCampos = (nuevoModo) => {
    setModo(nuevoModo);
    setError("");
    setNombre("");
    setEmail("");
    setPassword("");
  };

  /* ── Helpers lider ── */
  const esCorreoBCP = (correo) => correo.endsWith("@bcp.com");

  const asegurarDocLider = async (u) => {
    const snap = await getDocs(
      query(collection(db, "lideres"), where("uid", "==", u.uid))
    );
    if (snap.empty) {
      await addDoc(collection(db, "lideres"), {
        uid:       u.uid,
        nombre:    u.displayName || "",
        email:     u.email,
        foto:      u.photoURL || "",
        favoritos: [],
        creadoEn:  new Date(),
      });
    }
  };

  /* ── Registro practicante ── */
  const handleRegistro = async () => {
    setError("");
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      await addDoc(collection(db, "practicantes"), {
        uid: user.uid,
        nombre,
        email,
        perfilCompleto: false,
        skills: [],
        area: "",
        experiencia: [],
      });
      navigate("/perfil");
    } catch {
      setError("Error al registrarse. Verifica los datos e inténtalo de nuevo.");
    }
  };

  /* ── Login practicante ── */
  const handleLogin = async () => {
    setError("");
    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate("/perfil");
    } catch {
      setError("Credenciales incorrectas.");
    }
  };

  /* ── Login líder ── */
  const handleLoginLider = async () => {
    setError("");
    if (!esCorreoBCP(email)) {
      setError("Solo correos @bcp.com tienen acceso al panel de líderes.");
      return;
    }
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      await asegurarDocLider(result.user);
      navigate("/dashboard-lider");
    } catch {
      setError("Credenciales incorrectas. Verifica tu correo y contraseña.");
    }
  };

  /* ── Google (practicante o líder según correo) ── */
  const handleGoogle = async () => {
    setError("");
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      if (modo === "lider") {
        if (!esCorreoBCP(user.email)) {
          await auth.signOut();
          setError("Solo correos @bcp.com tienen acceso al panel de líderes.");
          return;
        }
        await asegurarDocLider(user);
        navigate("/dashboard-lider");
      } else {
        // practicante
        const q = query(collection(db, "practicantes"), where("uid", "==", user.uid));
        const snapshot = await getDocs(q);
        if (snapshot.empty) {
          await addDoc(collection(db, "practicantes"), {
            uid: user.uid,
            nombre: user.displayName,
            email: user.email,
            foto: user.photoURL,
            perfilCompleto: false,
            skills: [],
            area: "",
          });
        }
        navigate("/perfil");
      }
    } catch {
      setError("Error al iniciar sesión con Google.");
    }
  };

  /* ── Acción principal según modo ── */
  const handleSubmit = () => {
    if (modo === "registro") handleRegistro();
    else if (modo === "lider") handleLoginLider();
    else handleLogin();
  };

  /* ── Textos dinámicos ── */
  const titulos = {
    login:    "Iniciar Sesión",
    registro: "Registrarse",
    lider:    "Acceso Líder",
  };

  const subtitulosIzq = {
    login:    "Descubre talento o impulsa tu carrera dentro del banco más grande del país.",
    registro: "Crea tu perfil y hazte visible para los líderes del BCP.",
    lider:    "Accede al catálogo completo, guarda favoritos y gestiona tu shortlist de talento BCP.",
  };

  return (
    <div className="auth-container">
      {/* IZQUIERDA */}
      <div className="auth-left">
        <div className="auth-left-content">
          <h2>{modo === "lider" ? "Panel de Líderes" : "Talento BCP"}</h2>
          <p>{subtitulosIzq[modo]}</p>
          {modo === "lider" && (
            <ul style={{ marginTop: 20, paddingLeft: 16, color: "#cce0ff" }}>
              <li>Guarda perfiles favoritos</li>
              <li>Visualiza métricas del talento</li>
              <li>Contacta directamente</li>
              <li>Recibe recomendaciones de match</li>
            </ul>
          )}
        </div>
      </div>

      {/* DERECHA */}
      <div className="auth-right">
        <span className="volver-link" onClick={() => navigate("/")}>← Volver</span>

        <div className="auth-box">
          <h4>{titulos[modo]}</h4>

          {modo === "lider" && (
            <p style={{ fontSize: 13, color: "#888", marginBottom: 12 }}>
              Solo disponible para correos <strong>@bcp.com</strong>
            </p>
          )}

          {/* ERROR */}
          {error && (
            <div className="auth-error">
              {error}
            </div>
          )}

          {/* NOMBRE — solo registro */}
          {modo === "registro" && (
            <input
              type="text"
              placeholder="Nombre completo"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
            />
          )}

          <input
            type="email"
            placeholder={modo === "lider" ? "usuario@bcp.com" : "Correo"}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <input
            type="password"
            placeholder="Contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          {/* BOTÓN PRINCIPAL */}
          <button className="btn-primary" onClick={handleSubmit}>
            {modo === "registro" ? "Registrarse" : "Ingresar"}
          </button>

          {/* GOOGLE */}
          <button className="btn-outline-dark" onClick={handleGoogle}>
            {modo === "lider"
              ? "Ingresar con Google (@bcp.com)"
              : "Ingresar con Google"}
          </button>

          {/* TABS de modo */}
          <div className="links">
            <span
              className={modo === "login"    ? "link-activo" : ""}
              onClick={() => resetCampos("login")}
            >
              Login
            </span>
            <span
              className={modo === "registro" ? "link-activo" : ""}
              onClick={() => resetCampos("registro")}
            >
              Registro
            </span>
            <span
              className={modo === "lider"    ? "link-activo" : ""}
              onClick={() => resetCampos("lider")}
            >
              Soy líder
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Auth;
