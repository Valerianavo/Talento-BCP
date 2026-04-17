import { useState, useEffect } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase/firebase";
import CardPerfil from "../components/CardPerfil";
import FiltrosPanel from "../components/FiltrosPanel";
import "../stylesheets/Catalogo.css";

function Catalogo() {
    const [perfiles, setPerfiles] = useState([]);
    const [busqueda, setBusqueda] = useState("");
    const [filtros, setFiltros] = useState({
        area: "", skills: [], idiomas: [],
        experiencia: "", formacion: "", proyectos: false,
    });
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

    // ← ESTADO DEL DRAWER AQUÍ, no dentro de FiltrosPanel
    const [filtrosAbierto, setFiltrosAbierto] = useState(false);

<<<<<<< HEAD
    useEffect(() => {
        const fetchPerfiles = async () => {
            const snapshot = await getDocs(collection(db, "perfiles"));
            const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
            setPerfiles(data);
        };
        fetchPerfiles();
    }, []);

    const perfilesFiltrados = perfiles.filter((p) => {
        const texto = busqueda.toLowerCase();
        const coincideTexto =
            !texto ||
            p.nombre?.toLowerCase().includes(texto) ||
            p.rol?.toLowerCase().includes(texto) ||
            (p.skills || []).some((s) => s.toLowerCase().includes(texto)) ||
            p.area?.toLowerCase().includes(texto);

        const coincideArea = !filtros.area || p.area === filtros.area;
        const coincideSkills =
            (filtros.skills || []).length === 0 ||
            filtros.skills.every((s) => (p.skills || []).includes(s));
        const coincideIdiomas =
            (filtros.idiomas || []).length === 0 ||
            filtros.idiomas.every((i) => (p.idiomas || []).includes(i));
        const coincideExp = !filtros.experiencia || p.experiencia === filtros.experiencia;
        const coincideForm = !filtros.formacion || p.formacion === filtros.formacion;
        const coincideProyectos = !filtros.proyectos || (p.proyectos || []).length > 0;

        return coincideTexto && coincideArea && coincideSkills &&
               coincideIdiomas && coincideExp && coincideForm && coincideProyectos;
    });

    const hayFiltrosActivos =
        filtros.area ||
        (filtros.skills || []).length > 0 ||
        (filtros.idiomas || []).length > 0 ||
        filtros.experiencia ||
        filtros.formacion ||
        filtros.proyectos;

    const contadorFiltros =
        (filtros.skills?.length || 0) +
        (filtros.idiomas?.length || 0) +
        (filtros.area ? 1 : 0) +
        (filtros.experiencia ? 1 : 0) +
        (filtros.formacion ? 1 : 0) +
        (filtros.proyectos ? 1 : 0);

    return (
        <div className="catalogo-wrapper">

            {/* ── HEADER ── */}
            <div className="catalogo-header">
                {/* BOTÓN HAMBURGUESA — visible solo en mobile, en el header */}
                <button
                    className="filtros-btn-mobile"
                    onClick={() => setFiltrosAbierto(true)}
                    aria-label="Abrir filtros"
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                         stroke="currentColor" strokeWidth="2">
                        <line x1="3" y1="6" x2="21" y2="6"/>
                        <line x1="3" y1="12" x2="21" y2="12"/>
                        <line x1="3" y1="18" x2="21" y2="18"/>
                    </svg>
                    Filtros
                    {hayFiltrosActivos && (
                        <span className="filtros-badge-count">{contadorFiltros}</span>
                    )}
                </button>

                <h2 className="catalogo-header-titulo">Talento BCP</h2>

                <input
                    className="catalogo-buscador"
                    type="text"
                    placeholder="Buscar por nombre, rol, skills, área..."
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                />
            </div>

            {/* ── BODY: filtros + cards ── */}
            <div className="catalogo-body">

                {/* FiltrosPanel recibe abierto/setAbierto como props */}
                <FiltrosPanel
                    filtros={filtros}
                    onChange={setFiltros}
                    totalResultados={perfilesFiltrados.length}
                    abierto={filtrosAbierto}
                    setAbierto={setFiltrosAbierto}
                />

                {/* ── CARDS ── */}
                <main className="catalogo-main">
                    <p className="catalogo-resultados">
                        <strong>{perfilesFiltrados.length}</strong> perfiles encontrados
                    </p>

                    {perfilesFiltrados.length === 0 ? (
                        <div className="catalogo-vacio">
                            <p>No se encontraron perfiles con esos criterios.</p>
                        </div>
                    ) : (
                        <div className="catalogo-grid">
                            {perfilesFiltrados.map((perfil) => (
                                <CardPerfil key={perfil.id} perfil={perfil} />
                            ))}
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
=======
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
          <FaHome className="icon-btn" /> Inicio
        </Link>

        {/* El catálogo es visible para todos */}
        <Link to="/catalogo" className="nav-link">
          <FaUsers className="icon-btn" /> Buscar Talento
        </Link>

        {!cargando && (
          <>
            {user ? (
              <>
                {rol === "lider" ? (
                  /* LÍDER → Dashboard*/
                  <>
                    <Link to="/dashboard-lider" className="nav-link nav-highlight">
                      <FaChartBar className="icon-btn" /> Dashboard
                    </Link>
                  </>
                ) : (
                  /* PRACTICANTE → Mi perfil (solo ver) */
                  <>
                    <Link to="/perfil" className="nav-link">
                      <FaUser className="icon-btn" /> Mi perfil
                    </Link>
                  </>
                )}

                <button className="nav-link nav-logout" onClick={cerrarSesion}>
                  <FaSignOutAlt className="icon-btn" /> Salir
                </button>
              </>
            ) : (
              <Link to="/auth" className="nav-link">
                <FaUser className="icon-btn" /> Iniciar sesión
              </Link>
            )}
          </>
        )}
      </div>
    </nav>
  );
>>>>>>> master
}

export default Catalogo;