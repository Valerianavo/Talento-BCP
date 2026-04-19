import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "../firebase/firebase";
import { useRol } from "../hooks/useRol";
import "../stylesheets/Navbar.css";
import logoBCP from "../images/LogoBCP.png";
import { FaHome, FaUsers, FaChartBar, FaUser, FaSignOutAlt } from "react-icons/fa";

function Navbar() {
  const navigate = useNavigate();
  const { user, rol, cargando } = useRol();
  const [menuAbierto, setMenuAbierto] = useState(false);

  const cerrarSesion = async () => {
    await signOut(auth);
    setMenuAbierto(false);
    navigate("/");
  };

  const cerrar = () => setMenuAbierto(false);

    const links = (
    <>
      <Link to="/" className="nav-link" onClick={cerrar}>
        <FaHome className="icon-btn" />
        <span>Inicio</span>
      </Link>

      {user && (
        <Link to="/catalogo" className="nav-link" onClick={cerrar}>
          <FaUsers className="icon-btn" />
          <span>Buscar Talento</span>
        </Link>
      )}

      {!cargando && (
        <>
          {user ? (
            <>
              {rol === "lider" ? (
                <Link
                  to="/dashboard-lider"
                  className="nav-link nav-highlight"
                  onClick={cerrar}
                >
                  <FaChartBar className="icon-btn" />
                  <span>Dashboard</span>
                </Link>
              ) : (
                <Link to="/perfil" className="nav-link" onClick={cerrar}>
                  <FaUser className="icon-btn" />
                  <span>Mi perfil</span>
                </Link>
              )}

              <button className="nav-link nav-logout" onClick={cerrarSesion}>
                <FaSignOutAlt className="icon-btn" />
                <span>Salir</span>
              </button>
            </>
          ) : (
            <Link to="/auth" className="nav-link" onClick={cerrar}>
              <FaUser className="icon-btn" />
              <span>Iniciar sesión o Registrarse</span>
            </Link>
          )}
        </>
      )}
    </>
  );


 return (
    <nav className="navbar-custom">

      {/* LOGO */}
      <div
        className="logo-container"
        onClick={() => { cerrar(); navigate("/"); }}
      >
        <img src={logoBCP} alt="BCP" className="logo-img" />
        <span className="logo-text">| Talento BCP</span>
      </div>

      {/* DESKTOP MENU */}
      <div className="nav-actions">{links}</div>

      {/* HAMBURGER (SOLO MOBILE/TABLET) */}
      <button
        className={`nav-hamburger ${menuAbierto ? "open" : ""}`}
        onClick={() => setMenuAbierto(v => !v)}
        aria-label="Menú"
      >
        <span /><span /><span />
      </button>

      {/* MOBILE MENU */}
      {menuAbierto && (
        <>
          <div className="nav-mobile-overlay" onClick={cerrar} />

          <div className="nav-mobile-menu">
            <button className="nav-close" onClick={cerrar}>✕</button>
            {links}
          </div>
        </>
      )}

    </nav>
  );

}

export default Navbar;