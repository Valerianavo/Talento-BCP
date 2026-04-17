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
        <FaHome className="icon-btn" /> Inicio
      </Link>

      <Link to="/catalogo" className="nav-link" onClick={cerrar}>
        <FaUsers className="icon-btn" /> Buscar Talento
      </Link>

      {!cargando && (
        <>
          {user ? (
            <>
              {rol === "lider" ? (
                <Link to="/dashboard-lider" className="nav-link nav-highlight" onClick={cerrar}>
                  <FaChartBar className="icon-btn" /> Dashboard
                </Link>
              ) : (
                <Link to="/perfil" className="nav-link" onClick={cerrar}>
                  <FaUser className="icon-btn" /> Mi perfil
                </Link>
              )}
              <button className="nav-link nav-logout" onClick={cerrarSesion}>
                <FaSignOutAlt className="icon-btn" /> Salir
              </button>
            </>
          ) : (
            <Link to="/auth" className="nav-link" onClick={cerrar}>
              <FaUser className="icon-btn" /> Iniciar sesión
            </Link>
          )}
        </>
      )}
    </>
  );

  return (
    <nav className="navbar-custom">
      <div className="logo-container" onClick={() => { cerrar(); navigate("/"); }}>
        <img src={logoBCP} alt="BCP" className="logo-img" />
        <span className="logo-text">| Talento BCP</span>
      </div>

      {/* Desktop */}
      <div className="nav-actions">{links}</div>

      {/* Mobile hamburger */}
      <button
        className={`nav-hamburger ${menuAbierto ? "open" : ""}`}
        onClick={() => setMenuAbierto((v) => !v)}
        aria-label="Menú"
      >
        <span /><span /><span />
      </button>

      {menuAbierto && (
        <>
          <div className="nav-mobile-overlay" onClick={cerrar} />
          <div className="nav-mobile-menu">{links}</div>
        </>
      )}
    </nav>
  );
}

export default Navbar;