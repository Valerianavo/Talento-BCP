import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  addDoc,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import {
  signInWithPopup,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { db, auth, provider } from "../firebase/firebase";
import "../stylesheets/Auth.css";

function Auth() {
  const navigate = useNavigate();

  const [modo, setModo] = useState("login");

  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // REGISTRO
  const handleRegistro = async () => {
    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );

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
    } catch (error) {
      alert("Error al registrarse");
    }
  };
  
  

  // LOGIN
  const handleLogin = async () => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate("/perfil");
    } catch (error) {
      alert("Credenciales incorrectas");
    }
  };

  // GOOGLE
  const handleGoogle = async () => {
    const result = await signInWithPopup(auth, provider);
    const user = result.user;

    const q = query(
      collection(db, "practicantes"),
      where("uid", "==", user.uid)
    );

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
  };

  return (
    <div className="auth-container">
      {/* IZQUIERDA */}
      <div className="auth-left">
        <div className="auth-left-content">
          <h2>Talento BCP</h2>
          <p>
            Descubre talento o impulsa tu carrera dentro del banco más grande
            del país.
          </p>
        </div>
      </div>

      {/* DERECHA */}
      <div className="auth-right">
            <span className="volver-link" onClick={() => navigate("/")}>
             ← Volver
            </span>
        <div className="auth-box">

          <h4>
            {modo === "login" && "Iniciar Sesión"}
            {modo === "registro" && "Registrarse"}
            {modo === "lider" && "Acceso Líder"}
          </h4>
 
          {/* LOGIN */}
          {modo !== "registro" && (
            <>
              <input
                type="email"
                placeholder="Correo"
                onChange={(e) => setEmail(e.target.value)}
              />

              <input
                type="password"
                placeholder="Contraseña"
                onChange={(e) => setPassword(e.target.value)}
              />
            </>
          )}

          {/* REGISTRO */}
          {modo === "registro" && (
            <>
              <input
                type="text"
                placeholder="Nombre completo"
                onChange={(e) => setNombre(e.target.value)}
              />

              <input
                type="email"
                placeholder="Correo"
                onChange={(e) => setEmail(e.target.value)}
              />

              <input
                type="password"
                placeholder="Contraseña"
                onChange={(e) => setPassword(e.target.value)}
              />
            </>
          )}

          {/* BOTÓN */}
          <button
            className="btn-primary"
            onClick={modo === "registro" ? handleRegistro : handleLogin}
          >
            {modo === "registro" ? "Registrarse" : "Ingresar"}
          </button>

          {/* GOOGLE */}
          <button className="btn-outline-dark" onClick={handleGoogle}>
            Ingresar con Google
          </button>

          {/* LINKS */}
          <div className="links">
            <span onClick={() => setModo("login")}>Login</span>
            <span onClick={() => setModo("registro")}>Registro</span>
            <span onClick={() => setModo("lider")}>Soy líder</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Auth;