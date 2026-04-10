import { useEffect, useState } from "react";
import { db } from "../firebase/firebase";
import { collection, getDocs } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar.jsx";
import "../stylesheets/Catalogo.css";

function Catalogo() {
  const [perfiles, setPerfiles] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [areaFiltro, setAreaFiltro] = useState("");
  const [loading, setLoading] = useState(true);

  const navigate = useNavigate();

  // 🔥 CALCULAR COMPLETITUD (MISMO QUE PERFIL)
  const calcularCompletitud = (p) => {
    const campos = [
      p.titulo,
      p.resumen,
      p.area,
      p.intereses,
      p.experiencia?.length > 0,
      p.educacion?.length > 0,
      p.cursos,
      p.idiomas,
      p.skills?.length > 0,
      p.habilidadesBlandas?.length > 0,
    ];

    const completos = campos.filter(Boolean).length;
    return Math.round((completos / campos.length) * 100);
  };

  // 🔥 CARGAR PERFILES
  useEffect(() => {
    const obtenerDatos = async () => {
      try {
        const snap = await getDocs(collection(db, "practicantes"));

        const lista = snap.docs.map((doc) => {
          const data = doc.data();

          return {
            id: doc.id,
            ...data,
            completitud: calcularCompletitud(data),
          };
        });

        setPerfiles(lista);
      } catch (error) {
        console.error("Error cargando catálogo:", error);
      } finally {
        setLoading(false);
      }
    };

    obtenerDatos();
  }, []);

  // 🔥 FILTRO INTELIGENTE
  const filtrados = perfiles
    .filter((p) => {
      // SOLO PERFILES BUENOS
      if (p.completitud < 70) return false;

      const texto = busqueda.toLowerCase();

      const matchBusqueda =
        (p.nombre || "").toLowerCase().includes(texto) ||
        (p.titulo || "").toLowerCase().includes(texto) ||
        (p.area || "").toLowerCase().includes(texto) ||
        (p.intereses || "").toLowerCase().includes(texto) ||
        (p.skills || []).join(" ").toLowerCase().includes(texto) ||
        (p.programas || "").toLowerCase().includes(texto) ||
        (p.cursos || "").toLowerCase().includes(texto);

      const matchArea = areaFiltro ? p.area === areaFiltro : true;

      return matchBusqueda && matchArea;
    })
    // 🔥 ORDEN PRO: MEJOR PERFIL PRIMERO
    .sort((a, b) => b.completitud - a.completitud);

  if (loading) {
    return (
      <div className="pantalla-carga">
        <div className="spinner-bcp"></div>
        <p>Cargando talento...</p>
      </div>
    );
  }

  return (
    <div>
      <Navbar />

      <div className="container mt-4">

        {/* 🔥 HEADER */}
        <div className="catalogo-header mb-4">
          <h2>Explora talento interno</h2>
          <p>Encuentra practicantes según habilidades, área e intereses</p>
        </div>

        {/* 🔍 BUSCADOR */}
        <input
          type="text"
          className="form-control mb-3"
          placeholder="Buscar por nombre, skills, intereses, tecnologías..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />

        {/* 🎯 FILTROS */}
        <div className="row mb-3">
          <div className="col-md-6">
            <select
              className="form-select"
              value={areaFiltro}
              onChange={(e) => setAreaFiltro(e.target.value)}
            >
              <option value="">Todas las áreas</option>
              <option>Analítica & Tecnología</option>
              <option>Finanzas & Control</option>
              <option>Gestión & Operaciones</option>
              <option>Comunicación & Relación</option>
            </select>
          </div>

          <div className="col-md-6 text-end">
            <span className="badge bg-dark">
              {filtrados.length} talentos encontrados
            </span>
          </div>
        </div>

        {/* 🔥 GRID */}
        <div className="row">
          {filtrados.map((p) => (
            <div className="col-md-4" key={p.id}>
              <div className="card catalogo-card shadow-sm p-3 mb-4">

                {/* HEADER CARD */}
                <div className="d-flex align-items-center">
                  <div className="avatar-catalogo">
                    {p.nombre?.charAt(0)?.toUpperCase()}
                  </div>

                  <div className="ms-3">
                    <h5 className="mb-0">{p.nombre}</h5>
                    <small className="text-muted">
                      {p.titulo || "Sin título"}
                    </small>
                  </div>
                </div>

                {/* AREA */}
                <div className="mt-2">
                  <span className="badge bg-primary">
                    {p.area || "Sin área"}
                  </span>
                </div>

                {/* SKILLS */}
                <div className="mt-2">
                  {(p.skills || []).slice(0, 4).map((skill, i) => (
                    <span key={i} className="badge bg-secondary me-1">
                      {skill}
                    </span>
                  ))}
                </div>

                {/* COMPLETITUD */}
                <div className="mt-3">
                  <small>Perfil completo:</small>
                  <div className="progress">
                    <div
                      className="progress-bar bg-success"
                      style={{ width: `${p.completitud}%` }}
                    />
                  </div>
                  <small>{p.completitud}%</small>
                </div>

                {/* BOTÓN */}
                <button 
                  className="btn btn-outline-primary btn-sm mt-3"
                  onClick={() => navigate(`/perfil/${p.id}`)}
                >
                  Ver perfil
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* VACÍO */}
        {filtrados.length === 0 && (
          <div className="text-center mt-5">
            <h5>No se encontraron perfiles</h5>
            <p>Intenta con otros filtros o palabras clave</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default Catalogo;