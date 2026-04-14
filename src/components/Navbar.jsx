import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { auth } from "../firebase/firebase";
import { signOut, onAuthStateChanged } from "firebase/auth";
import "../stylesheets/Navbar.css";
import logoBCP from "../images/LogoBCP.png";

// ICONOS
import {
  FaHome,
  FaUsers,
  FaChartBar,
  FaUser,
  FaSignOutAlt,
} from "react-icons/fa";

function Navbar() {
  const [user, setUser] = useState(null);
  const [esLider, setEsLider] = useState(false);
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
      {/* LOGO */}
      <div className="logo-container" onClick={() => navigate("/")}>
        <img src={logoBCP} alt="BCP" className="logo-img" />
        <span className="logo-text">| Talento BCP</span>
      </div>

      {/* NAV LINKS */}
      <div className="nav-actions">
        <Link to="/" className="nav-link">
          <FaHome className="icon-btn" />
          Inicio
        </Link>

        <Link to="/catalogo" className="nav-link">
          <FaUsers className="icon-btn" />
          Talento
        </Link>

        {user ? (
          <>
            {esLider ? (
              <Link
                to="/dashboard-lider"
                className="nav-link nav-highlight"
              >
                <FaChartBar className="icon-btn" />
                Dashboard
              </Link>
            ) : (
              <Link to="/perfil" className="nav-link">
                <FaUser className="icon-btn" />
                Mi perfil
              </Link>
            )}

            <button
              className="nav-link nav-logout"
              onClick={cerrarSesion}
            >
              <FaSignOutAlt className="icon-btn" />
              Salir
            </button>
          </>
        ) : (
          <>
            <Link to="/auth" className="nav-link">
              <FaUser className="icon-btn" />
              Iniciar Sesion
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}

export default Navbar;