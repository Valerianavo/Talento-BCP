import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { db, auth } from "../firebase/firebase";
import { doc, getDoc, updateDoc, arrayUnion, arrayRemove } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import Navbar from "../components/Navbar.jsx";
import "../stylesheets/Perfil.css";

function PerfilPublico() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [perfil,   setPerfil]   = useState(null);
  const [cargando, setCargando] = useState(true);
  const [usuario,  setUsuario]  = useState(null);
  const [esLider,  setEsLider]  = useState(false);
  const [favorito, setFavorito] = useState(false);
  const [liderDocId, setLiderDocId] = useState(null);

  /* ── Auth listener ── */
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUsuario(u);
      if (u) {
        // Determinar si es líder (correo @bcp.com o guardado en colección lideres)
        const esCorreoBCP = u.email?.endsWith("@bcp.com");
        setEsLider(esCorreoBCP);

        if (esCorreoBCP) {
          // Buscar documento del líder para favoritos
          const { collection, query, where, getDocs } = await import("firebase/firestore");
          const snap = await getDocs(
            query(collection(db, "lideres"), where("uid", "==", u.uid))
          );
          if (!snap.empty) {
            const liderDoc = snap.docs[0];
            setLiderDocId(liderDoc.id);
            const favs = liderDoc.data().favoritos || [];
            setFavorito(favs.includes(id));
          }
        }
      }
    });
    return () => unsub();
  }, [id]);

  /* ── Cargar perfil ── */
  useEffect(() => {
    const obtenerPerfil = async () => {
      try {
        const ref  = doc(db, "practicantes", id);
        const snap = await getDoc(ref);
        if (snap.exists()) setPerfil(snap.data());
      } catch (error) {
        console.error(error);
      } finally {
        setCargando(false);
      }
    };
    obtenerPerfil();
  }, [id]);

  /* ── Guardar / quitar favorito ── */
  const toggleFavorito = async () => {
    if (!esLider || !liderDocId) return;
    const ref = doc(db, "lideres", liderDocId);
    if (favorito) {
      await updateDoc(ref, { favoritos: arrayRemove(id) });
    } else {
      await updateDoc(ref, { favoritos: arrayUnion(id) });
    }
    setFavorito(!favorito);
  };

  /* ── Contactar (abre mailto) ── */
  const contactar = () => {
    if (!perfil?.email) return;
    window.location.href = `mailto:${perfil.email}?subject=Oportunidad BCP – Hola ${perfil.nombre}`;
  };

  if (cargando) return (
    <div className="pantalla-carga">
      <div className="spinner-bcp" />
      <p>Cargando perfil...</p>
    </div>
  );
  if (!perfil)  return <p className="text-center mt-5">No se encontró el perfil.</p>;

  return (
    <div>
      <Navbar />

      <div className="container mt-4" style={{ maxWidth: 820 }}>

        {/* ══ HEADER CARD ══ */}
        <div className="card p-0 mb-3 overflow-hidden shadow-sm">
          <div style={{ height: 80, background: "linear-gradient(135deg, #003DA5 0%, #0055CC 100%)" }} />
          <div className="p-4 pt-0">
            <div className="d-flex align-items-end justify-content-between" style={{ marginTop: -36 }}>
              <div className="avatar-publico">
                {perfil.foto
                  ? <img src={perfil.foto} alt={perfil.nombre} className="avatar-img" />
                  : <span>{perfil.nombre?.charAt(0)?.toUpperCase()}</span>
                }
              </div>

              {/* Acciones líder */}
              {esLider && (
                <div className="d-flex gap-2 mt-4">
                  <button
                    className={`btn btn-sm ${favorito ? "btn-warning" : "btn-outline-warning"}`}
                    onClick={toggleFavorito}
                  >
                    {favorito ? "⭐ Guardado" : "☆ Guardar"}
                  </button>
                  <button className="btn btn-sm btn-primary" onClick={contactar}>
                    📩 Contactar
                  </button>
                </div>
              )}

              {/* Si no está logueado, prompt de login */}
              {!usuario && (
                <button className="btn btn-sm btn-outline-primary mt-4" onClick={() => navigate("/auth-lider")}>
                  🔑 Acceso líder para más acciones
                </button>
              )}
            </div>

            <h4 className="mt-2 mb-0">{perfil.nombre} {perfil.apellidos}</h4>
            <p className="text-muted mb-1">{perfil.titulo || "Sin título"}</p>
            <div className="d-flex gap-2 flex-wrap">
              {perfil.area && <span className="badge bg-primary">{perfil.area}</span>}
              {perfil.distrito && <span className="badge bg-secondary">📍 {perfil.distrito}</span>}
              {perfil.movilidad?.viajar && <span className="badge bg-success">✈️ Disponible a viajar</span>}
            </div>
            {perfil.linkedin && (
              <a href={perfil.linkedin} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-outline-secondary mt-2 me-2">
                💼 LinkedIn
              </a>
            )}
            {perfil.github && (
              <a href={perfil.github} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-outline-dark mt-2">
                💻 GitHub
              </a>
            )}
          </div>
        </div>

        {/* ══ ACERCA DE ══ */}
        {(perfil.resumen || perfil.intereses) && (
          <SeccionPublica titulo="Acerca de" icono="👤">
            {perfil.resumen && <p>{perfil.resumen}</p>}
            {perfil.intereses && (
              <p><strong>Intereses:</strong> {perfil.intereses}</p>
            )}
          </SeccionPublica>
        )}

        {/* ══ EXPERIENCIA ══ */}
        {perfil.experiencia?.length > 0 && (
          <SeccionPublica titulo="Experiencia" icono="💼">
            {perfil.experiencia.map((exp, i) => (
              <div key={i} className="item-lista">
                <div className="item-icono">🏢</div>
                <div className="item-contenido">
                  <p className="item-titulo">{exp.cargo}</p>
                  {exp.empresa && <p className="item-subtitulo">{exp.empresa}</p>}
                  <p className="item-fecha">
                    {exp.actualmente
                      ? `${exp.desdeM} ${exp.desdeA} — Actualidad`
                      : `${exp.desdeM} ${exp.desdeA} — ${exp.hastaM} ${exp.hastaA}`}
                  </p>
                  {exp.funciones && <p className="item-descripcion">{exp.funciones}</p>}
                </div>
              </div>
            ))}
          </SeccionPublica>
        )}

        {/* ══ PROYECTOS ══ */}
        {perfil.proyectos?.length > 0 && (
          <SeccionPublica titulo="Proyectos destacados" icono="🚀">
            <div className="proyectos-grid">
              {perfil.proyectos.map((p, i) => (
                <div key={i} className="proyecto-card">
                  <div className="proyecto-header">
                    <span className="proyecto-icono">🚀</span>
                    <div>
                      <p className="proyecto-nombre">{p.nombre}</p>
                      {p.rol && <p className="proyecto-rol">{p.rol}</p>}
                    </div>
                  </div>
                  {p.descripcion && <p className="proyecto-desc">{p.descripcion}</p>}
                  <div className="proyecto-meta">
                    {p.tecnologias && (
                      <div className="proyecto-tags">
                        {p.tecnologias.split(",").map((t, j) => (
                          <span key={j} className="tag tag-tecnico tag-sm">{t.trim()}</span>
                        ))}
                      </div>
                    )}
                    {p.url && (
                      <a href={p.url} target="_blank" rel="noopener noreferrer" className="proyecto-link">
                        🔗 Ver proyecto
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </SeccionPublica>
        )}

        {/* ══ EDUCACIÓN ══ */}
        {perfil.educacion?.length > 0 && (
          <SeccionPublica titulo="Formación académica" icono="🎓">
            {perfil.educacion.map((edu, i) => (
              <div key={i} className="item-lista">
                <div className="item-icono">🏫</div>
                <div className="item-contenido">
                  <p className="item-titulo">{edu.institucion}</p>
                  {edu.carrera && <p className="item-subtitulo">{edu.carrera}</p>}
                  <p className="item-fecha">
                    {edu.nivel} · {edu.actualmente
                      ? `${edu.desdeM} ${edu.desdeA} — Actualidad`
                      : `${edu.desdeM} ${edu.desdeA}${edu.hastaA ? ` — ${edu.hastaM} ${edu.hastaA}` : ""}`}
                  </p>
                </div>
              </div>
            ))}
          </SeccionPublica>
        )}

        {/* ══ IDIOMAS ══ */}
        {perfil.idiomas?.length > 0 && (
          <SeccionPublica titulo="Idiomas" icono="🌍">
            <div className="idiomas-grid">
              {perfil.idiomas.map((id, i) => (
                <div key={i} className="idioma-chip">
                  <span className="idioma-nombre">{id.idioma}</span>
                  <span className={`idioma-nivel nivel-${(id.nivel||"").toLowerCase().replace(/\s+/g,"-")}`}>{id.nivel}</span>
                </div>
              ))}
            </div>
          </SeccionPublica>
        )}

        {/* ══ CURSOS ══ */}
        {perfil.cursos?.length > 0 && (
          <SeccionPublica titulo="Cursos y certificados" icono="📚">
            <div className="cursos-lista">
              {perfil.cursos.map((c, i) => (
                <div key={i} className="curso-item">
                  <div className="curso-icono">{c.tipo === "Certificado" ? "🏅" : "📖"}</div>
                  <div className="curso-contenido">
                    <p className="curso-nombre">{c.nombre}</p>
                    {c.institucion && <p className="curso-inst">{c.institucion}</p>}
                    <div className="curso-meta">
                      {c.tipo && <span className="tag-curso">{c.tipo}</span>}
                      {c.anio && <span className="curso-fecha">{c.anio}</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </SeccionPublica>
        )}

        {/* ══ HABILIDADES ══ */}
        {(perfil.skills?.length > 0 || perfil.habilidadesBlandas?.length > 0) && (
          <SeccionPublica titulo="Habilidades" icono="⚡">
            {perfil.skills?.length > 0 && (
              <div className="skills-grupo">
                <p className="skills-subtitulo">Técnicas</p>
                <div className="skills-tags">
                  {perfil.skills.map((s, i) => <span key={i} className="tag tag-tecnico">{s}</span>)}
                </div>
              </div>
            )}
            {perfil.habilidadesBlandas?.length > 0 && (
              <div className="skills-grupo mt-2">
                <p className="skills-subtitulo">Blandas</p>
                <div className="skills-tags">
                  {perfil.habilidadesBlandas.map((s, i) => <span key={i} className="tag tag-blando">{s}</span>)}
                </div>
              </div>
            )}
          </SeccionPublica>
        )}

        {/* ══ MOVILIDAD ══ */}
        {perfil.movilidad && (
          <SeccionPublica titulo="Disponibilidad" icono="🗺️">
            <div className="d-flex gap-2 flex-wrap">
              <span className={`badge ${perfil.movilidad.viajar ? "bg-success" : "bg-secondary"}`}>
                {perfil.movilidad.viajar ? "✓" : "✗"} Disponible a viajar
              </span>
              <span className={`badge ${perfil.movilidad.reubicacion ? "bg-success" : "bg-secondary"}`}>
                {perfil.movilidad.reubicacion ? "✓" : "✗"} Reubicación
              </span>
              <span className={`badge ${perfil.movilidad.vehiculo ? "bg-success" : "bg-secondary"}`}>
                {perfil.movilidad.vehiculo ? "✓" : "✗"} Vehículo propio
              </span>
            </div>
          </SeccionPublica>
        )}

        {/* ══ BANNER LÍDER NO LOGUEADO ══ */}
        {!usuario && (
          <div className="card p-3 mb-4 text-center" style={{ background:"#f0f4ff", border:"1px solid #003DA5" }}>
            <p className="mb-2" style={{ color:"#003DA5", fontWeight:600 }}>
              ¿Eres líder BCP? Inicia sesión para guardar favoritos y contactar talento
            </p>
            <button className="btn btn-primary btn-sm" onClick={() => navigate("/auth-lider")}>
              Acceso para líderes
            </button>
          </div>
        )}

        <div style={{ height: 40 }} />
      </div>
    </div>
  );
}

function SeccionPublica({ titulo, icono, children }) {
  return (
    <div className="card p-3 mb-3 shadow-sm">
      <h5 style={{ color:"#003DA5", fontWeight:700, marginBottom:12 }}>
        {icono} {titulo}
      </h5>
      {children}
    </div>
  );
}

export default PerfilPublico;
