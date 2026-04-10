import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db, provider } from "../firebase/firebase";
import {
  signInWithEmailAndPassword,
  signInWithPopup,
} from "firebase/auth";
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
} from "firebase/firestore";
import Navbar from "../components/Navbar.jsx";
import "../stylesheets/Auth.css";

function AuthLider() {
  const navigate = useNavigate();
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [error,    setError]    = useState("");

  /* Verifica que el correo sea BCP */
  const verificarAcceso = (correo) => {
    if (!correo.endsWith("@bcp.com")) {
      setError("Solo correos @bcp.com tienen acceso al panel de líderes.");
      return false;
    }
    return true;
  };

  /* Asegurar documento en colección "lideres" */
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

  const handleLogin = async () => {
    setError("");
    if (!verificarAcceso(email)) return;
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      await asegurarDocLider(result.user);
      navigate("/dashboard-lider");
    } catch {
      setError("Credenciales incorrectas. Verifica tu correo y contraseña.");
    }
  };

  const handleGoogle = async () => {
    setError("");
    try {
      const result = await signInWithPopup(auth, provider);
      if (!verificarAcceso(result.user.email)) {
        await auth.signOut();
        return;
      }
      await asegurarDocLider(result.user);
      navigate("/dashboard-lider");
    } catch {
      setError("Error al iniciar sesión con Google.");
    }
  };

  return (
    <div>
      <Navbar />
      <div className="auth-container">

        {/* IZQUIERDA */}
        <div className="auth-left">
          <h2>Panel de Líderes</h2>
          <p>Accede al catálogo completo, guarda favoritos y gestiona tu shortlist de talento BCP.</p>
          <ul style={{ marginTop: 20, paddingLeft: 16, color: "#cce0ff" }}>
            <li>⭐ Guarda perfiles favoritos</li>
            <li>📊 Visualiza métricas del talento</li>
            <li>📩 Contacta directamente</li>
            <li>🎯 Recibe recomendaciones de match</li>
          </ul>
        </div>

        {/* DERECHA */}
        <div className="auth-right">
          <h4>Acceso para líderes BCP</h4>
          <p className="text-muted mb-3" style={{ fontSize: 13 }}>
            Solo disponible para correos <strong>@bcp.com</strong>
          </p>

          {error && (
            <div className="alert alert-danger py-2 mb-3" style={{ fontSize: 13 }}>
              {error}
            </div>
          )}

          <input
            type="email"
            placeholder="usuario@bcp.com"
            className="form-control mb-2"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            type="password"
            placeholder="Contraseña"
            className="form-control mb-2"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <button className="btn btn-primary w-100 mb-2" onClick={handleLogin}>
            Ingresar
          </button>
          <button className="btn btn-outline-dark w-100 mb-3" onClick={handleGoogle}>
            Ingresar con Google (@bcp.com)
          </button>

          <div className="text-center" style={{ fontSize: 12, color: "#888" }}>
            ¿Eres practicante?{" "}
            <span
              style={{ color: "#003DA5", cursor: "pointer", fontWeight: 600 }}
              onClick={() => navigate("/auth")}
            >
              Accede aquí
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AuthLider;
