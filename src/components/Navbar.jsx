import { Link, useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "../firebase/firebase";
import { useRol } from "../hooks/useRol";
import "../stylesheets/Navbar.css";
import logoBCP from "../images/LogoBCP.png";
import { FaHome, FaUsers, FaChartBar, FaUser, FaSignOutAlt, FaBriefcase } from "react-icons/fa";

function Navbar() {
  const navigate = useNavigate();
  const { user, rol, cargando } = useRol();

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
          <span className="link-text">Inicio</span>
        </Link>

        {/* El catálogo es visible para todos */}
        <Link to="/catalogo" className="nav-link">
          <FaUsers className="icon-btn" />
          <span className="link-text">Buscar Talento</span>
        </Link>

        {!cargando && (
          <>
            {user ? (
              <>
                {rol === "lider" ? (
                  <Link to="/dashboard-lider" className="nav-link nav-highlight">
                    <FaChartBar className="icon-btn" />
                    <span className="link-text">Dashboard</span>
                  </Link>
                ) : (
                  <Link to="/perfil" className="nav-link">
                    <FaUser className="icon-btn" />
                    <span className="link-text">Mi perfil</span>
                  </Link>
                )}

                <button className="nav-link nav-logout" onClick={cerrarSesion}>
                  <FaSignOutAlt className="icon-btn" />
                  <span className="link-text">Salir</span>
                </button>
              </>
            ) : (
              <Link to="/auth" className="nav-link">
                <FaUser className="icon-btn" />
                <span className="link-text">Iniciar sesión</span>
              </Link>
            )}
          </>
        )}
      </div>
    </nav>
  );
}

export default Navbar;
