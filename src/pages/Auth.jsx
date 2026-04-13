import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { addDoc, collection, query, where, getDocs } from "firebase/firestore";
import { db, auth, provider } from "../firebase/firebase";
import { signInWithPopup, createUserWithEmailAndPassword } from "firebase/auth";
import Navbar from "../components/Navbar";
import "../stylesheets/Auth.css";

function Auth() {
    const navigate = useNavigate();

    const [modo, setModo] = useState("login");

    const [nombre, setNombre] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    // 🔥 REGISTRO MANUAL
    const handleRegistro = async () => {
        try {
            const userCredential = await createUserWithEmailAndPassword(
                auth,
                email,
                password
            );

            const user = userCredential.user;

            await addDoc(collection(db, "practicantes"), {
                uid: user.uid, // 🔥 CLAVE
                nombre,
                email,
                perfilCompleto: false,
                skills: [],
                area: "",
                experiencia: [],
            });

            navigate("/perfil");
        } catch (error) {
            console.error(error);
            alert("Error al registrarse");
        }
    };

    const handleLogin = async () => {
        try {
            await signInWithEmailAndPassword(auth, email, password);
            navigate("/perfil");
        } catch (error) {
            alert("Credenciales incorrectas");
        }
    };

    // 🔥 LOGIN GOOGLE (SIN DUPLICADOS)
    const handleGoogle = async () => {
        const result = await signInWithPopup(auth, provider);
        const user = result.user;

        // 🔍 verificar si ya existe
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
        <div>
            <Navbar />

            <div className="auth-container">
                {/* IZQUIERDA */}
                <div className="auth-left">
                    <h2>Talento BCP</h2>
                    <p>
                        Descubre talento o impulsa tu carrera dentro del banco más grande del país.
                    </p>
                </div>

                {/* DERECHA */}
                <div className="auth-right">
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
                                className="form-control mb-2"
                                onChange={(e) => setEmail(e.target.value)}
                            />

                            <input
                                type="password"
                                placeholder="Contraseña"
                                className="form-control mb-2"
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
                                className="form-control mb-2"
                                onChange={(e) => setNombre(e.target.value)}
                            />

                            <input
                                type="email"
                                placeholder="Correo"
                                className="form-control mb-2"
                                onChange={(e) => setEmail(e.target.value)}
                            />

                            <input
                                type="password"
                                placeholder="Contraseña"
                                className="form-control mb-2"
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </>
                    )}

                    {/* BOTÓN PRINCIPAL */}
                    <button
                        className="btn btn-primary w-100 mb-2"
                        onClick={modo === "registro" ? handleRegistro : handleLogin}
                    >
                        {modo === "registro" ? "Registrarse" : "Ingresar"}
                    </button>

                    {/* GOOGLE */}
                    <button
                        className="btn btn-outline-dark w-100 mb-2"
                        onClick={handleGoogle}
                    >
                        Ingresar con Google
                    </button>

                    {/* CAMBIO */}
                    <div className="links">
                        <span onClick={() => setModo("login")}>Login</span>
                        <span onClick={() => setModo("registro")}>Registro</span>
                        <span onClick={() => navigate("/auth-lider")}>Soy líder</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Auth;