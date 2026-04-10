import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { auth } from "../firebase/firebase";
import { signOut, onAuthStateChanged } from "firebase/auth";
import "../stylesheets/Navbar.css";

function Navbar() {
  const [user,     setUser]     = useState(null);
  const [esLider,  setEsLider]  = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setEsLider(!!u?.email?.endsWith("@bcp.com"));
    });
    return () => unsub();
  }, []);

  const cerrarSesion = async () => {
    await signOut(auth);
    navigate("/");
  };

  return (
    <nav className="navbar-custom">
      <h2 onClick={() => navigate("/")} style={{ cursor: "pointer" }}>
        Talento BCP
      </h2>

      <div>
        <Link to="/" className="btn btn-light btn-sm me-2">
          Inicio
        </Link>

        <Link to="/catalogo" className="btn btn-warning btn-sm me-2">
          Ver talento
        </Link>

        {user ? (
          <>
            {/* Líder */}
            {esLider ? (
              <Link to="/dashboard-lider" className="btn btn-primary btn-sm me-2">
                📊 Dashboard
              </Link>
            ) : (
              /* Practicante */
              <Link to="/perfil" className="btn btn-light btn-sm me-2">
                Mi perfil
              </Link>
            )}

            <button className="btn btn-danger btn-sm" onClick={cerrarSesion}>
              Cerrar sesión
            </button>
          </>
        ) : (
          <>
            <Link to="/auth" className="btn btn-light btn-sm me-2">
              Soy practicante
            </Link>
            <Link to="/auth-lider" className="btn btn-warning btn-sm">
              Soy líder
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}

export default Navbar;
