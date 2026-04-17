import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { db } from "../firebase/firebase";
import { doc, getDoc, updateDoc, arrayUnion, arrayRemove } from "firebase/firestore";
import Navbar from "../components/Navbar.jsx";
import { useRol } from "../hooks/useRol";
import "../stylesheets/Perfil.css";

import {
  FiMapPin, FiPhone, FiMail, FiCalendar,
  FiLinkedin, FiGithub, FiExternalLink,
  FiStar, FiArrowLeft, FiLock,
} from "react-icons/fi";
import {
  MdWorkOutline, MdSchool, MdLanguage, MdMenuBook,
  MdRocketLaunch, MdBolt,
} from "react-icons/md";
import { HiOutlineBriefcase, HiOutlineOfficeBuilding } from "react-icons/hi";
import { BsBuilding, BsTrophy, BsPersonVcard } from "react-icons/bs";
import { TbCertificate } from "react-icons/tb";
import { RiTeamLine } from "react-icons/ri";

function PerfilPublico() {
  const { id }   = useParams();
  const navigate = useNavigate();

  /* ── Rol desde Firestore (NO por dominio de correo) ── */
  const { user: usuario, rol, docId: liderDocId, favIds } = useRol();
  const esLider = rol === "lider";

  const [perfil,   setPerfil]   = useState(null);
  const [cargando, setCargando] = useState(true);
  const [favorito, setFavorito] = useState(false);

  /* Inicializar favorito cuando cambie favIds */
  useEffect(() => {
    setFavorito(favIds.includes(id));
  }, [favIds, id]);

  /* ── Cargar perfil ── */
  useEffect(() => {
    const cargar = async () => {
      try {
        const snap = await getDoc(doc(db, "practicantes", id));
        if (snap.exists()) setPerfil(snap.data());
      } catch (e) { console.error(e); }
      finally { setCargando(false); }
    };
    cargar();
  }, [id]);

  /* ── Toggle favorito — solo líderes ── */
  const toggleFav = async () => {
    if (!esLider || !liderDocId) return;
    const ref = doc(db, "lideres", liderDocId);
    await updateDoc(ref, { favoritos: favorito ? arrayRemove(id) : arrayUnion(id) });
    setFavorito(!favorito);
  };

  const contactar = () => {
    if (perfil?.email)
      window.location.href = `mailto:${perfil.email}?subject=Oportunidad BCP – Hola ${perfil.nombre}`;
  };

  /* volver: si hay historia del browser, usa -1; sino va al catálogo */
  const handleVolver = () => {
    if (window.history.length > 1) navigate(-1);
    else navigate("/catalogo");
  };

  if (cargando) return (
    <div className="pantalla-carga"><div className="spinner-bcp"/><p>Cargando perfil...</p></div>
  );
  if (!perfil) return (
    <div className="pantalla-carga"><p>No se encontró el perfil.</p></div>
  );

  /* áreas anteriores en BCP (excluye la actual) */
  const areasAnteriores = (perfil.areasRotacion || [])
    .filter((r) => r.area && r.area !== perfil.area);

  return (
    <div className="perfil-wrapper">
      <div className="publico-container">

        {/* BOTÓN VOLVER */}
        <button className="pub-btn-volver" onClick={handleVolver}>
          <FiArrowLeft size={15} style={{marginRight:6}}/>Volver
        </button>

        {/* ══ HEADER ══ */}
        <div className="pub-header-card">
          <div className="pub-banner" />
          <div className="pub-header-body">
            <div className="pub-avatar">
              {perfil.foto
                ? <img src={perfil.foto} alt={perfil.nombre} />
                : <span>{perfil.nombre?.charAt(0)?.toUpperCase()}</span>
              }
            </div>
            <div className="pub-header-info">
              <div className="pub-nombre-row">
                <div>
                  <h2 className="pub-nombre">{perfil.nombre} {perfil.apellidos}</h2>
                  <p className="pub-titulo">{perfil.titulo || "Sin título"}</p>
                  <div className="pub-badges">
                    {perfil.area && <span className="pub-badge-area">{perfil.area}</span>}
                    {/* áreas anteriores como badges sutiles */}
                    {areasAnteriores.map((r, i) => (
                      <span key={i} className="pub-badge-area-anterior" title={`${r.desdeM} ${r.desdeA} – ${r.actualmente ? "Actualidad" : `${r.hastaM} ${r.hastaA}`}`}>
                        {r.area}
                      </span>
                    ))}
                    {(perfil.ciudad || perfil.pais) && (
                      <span className="pub-badge-loc">
                        <FiMapPin size={11}/> {[perfil.ciudad, perfil.pais].filter(Boolean).join(", ")}
                      </span>
                    )}
                    {perfil.movilidad?.viajar && (
                      <span className="pub-badge-viaje">Disponible a viajar</span>
                    )}
                  </div>
                  <div className="pub-links">
                    {perfil.linkedin && (
                      <a href={perfil.linkedin} target="_blank" rel="noopener noreferrer" className="pub-link">
                        <FiLinkedin size={13}/> LinkedIn
                      </a>
                    )}
                    {perfil.github && (
                      <a href={perfil.github} target="_blank" rel="noopener noreferrer" className="pub-link">
                        <FiGithub size={13}/> GitHub
                      </a>
                    )}
                  </div>
                </div>

                {/* acciones líder */}
                {esLider && (
                  <div className="pub-acciones">
                    <button
                      className={`pub-btn-fav ${favorito ? "pub-btn-fav-on" : ""}`}
                      onClick={toggleFav}
                    >
                      <FiStar size={14}/> {favorito ? "Guardado" : "Guardar"}
                    </button>
                    <button className="pub-btn-contactar" onClick={contactar}>
                      <FiMail size={14}/> Contactar
                    </button>
                  </div>
                )}
                {!usuario && (
                  <button className="pub-btn-lider" onClick={() => navigate("/auth")}>
                    Acceso líder
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ══ BODY: 2 columnas ══ */}
        <div className="pub-body">

          {/* ── COLUMNA IZQUIERDA ── */}
          <aside className="pub-sidebar">

            {/* Datos personales */}
            <PubSeccion titulo="Datos personales" Icono={BsPersonVcard}>
              {perfil.email     && <PubDato Icon={FiMail}     val={perfil.email}/>}
              {perfil.telefono  && <PubDato Icon={FiPhone}    val={perfil.telefono}/>}
              {(perfil.ciudad || perfil.pais) && (
                <PubDato Icon={FiMapPin} val={[perfil.ciudad, perfil.distrito, perfil.pais].filter(Boolean).join(", ")}/>
              )}
              {perfil.fechaNacimiento && <PubDato Icon={FiCalendar} val={perfil.fechaNacimiento}/>}
            </PubSeccion>

            {/* Historial en BCP — área actual + anteriores */}
            {(perfil.area || areasAnteriores.length > 0) && (
              <PubSeccion titulo="Historial en BCP" Icono={HiOutlineOfficeBuilding}>
                {/* área actual */}
                {perfil.area && (
                  <div className="pub-item pub-bcp-item pub-bcp-actual">
                    <div className="pub-bcp-dot pub-bcp-dot-actual"/>
                    <div>
                      <p className="pub-item-t">{perfil.area}</p>
                      <span className="pub-bcp-badge-actual">Área actual</span>
                    </div>
                  </div>
                )}
                {/* áreas anteriores */}
                {areasAnteriores.map((r, i) => (
                  <div key={i} className="pub-item pub-bcp-item">
                    <div className="pub-bcp-dot"/>
                    <div>
                      <p className="pub-item-t">{r.area}</p>
                      <p className="pub-item-d">
                        {r.desdeM} {r.desdeA} – {r.actualmente ? "Actualidad" : `${r.hastaM} ${r.hastaA}`}
                      </p>
                      {r.logros && <p className="pub-item-desc">{r.logros}</p>}
                    </div>
                  </div>
                ))}
              </PubSeccion>
            )}

            {/* Formación */}
            {perfil.educacion?.length > 0 && (
              <PubSeccion titulo="Formación Académica" Icono={MdSchool}>
                {perfil.educacion.map((e, i) => (
                  <div key={i} className="pub-item">
                    <p className="pub-item-t">{e.institucion}</p>
                    {e.carrera && <p className="pub-item-s">Carrera: {e.carrera}</p>}
                    {e.nivel   && <p className="pub-item-s">{e.nivel}</p>}
                    <p className="pub-item-d">
                      {e.actualmente
                        ? `${e.desdeM} ${e.desdeA} — Actualidad`
                        : `${e.desdeM||""} ${e.desdeA||""}${e.hastaA?` — ${e.hastaM} ${e.hastaA}`:""}`}
                    </p>
                  </div>
                ))}
              </PubSeccion>
            )}

            {/* Idiomas */}
            {perfil.idiomas?.length > 0 && (
              <PubSeccion titulo="Idiomas" Icono={MdLanguage}>
                <div className="pub-idiomas">
                  {perfil.idiomas.map((id, i) => (
                    <div key={i} className="idioma-chip">
                      <span className="idioma-nombre">{id.idioma}</span>
                      <span className={`idioma-nivel nivel-${(id.nivel||"").toLowerCase().replace(/\s+/g,"-")}`}>{id.nivel}</span>
                    </div>
                  ))}
                </div>
              </PubSeccion>
            )}

            {/* Movilidad */}
            {perfil.movilidad && (
              <PubSeccion titulo="Disponibilidad" Icono={null}>
                {perfil.jornadaDisponible && (
                  <p className="pub-jornada">{perfil.jornadaDisponible}</p>
                )}
                <div className="pub-movilidad">
                  <span className={`pub-mov ${perfil.movilidad.viajar?"pub-mov-si":"pub-mov-no"}`}>
                    {perfil.movilidad.viajar?"✓":"✗"} Viajar
                  </span>
                  <span className={`pub-mov ${perfil.movilidad.reubicacion?"pub-mov-si":"pub-mov-no"}`}>
                    {perfil.movilidad.reubicacion?"✓":"✗"} Reubicación
                  </span>
                  <span className={`pub-mov ${perfil.movilidad.vehiculo?"pub-mov-si":"pub-mov-no"}`}>
                    {perfil.movilidad.vehiculo?"✓":"✗"} Vehículo
                  </span>
                </div>
              </PubSeccion>
            )}
          </aside>

          {/* ── COLUMNA DERECHA ── */}
          <div className="pub-main">

            {/* Resumen */}
            {(perfil.resumen || perfil.intereses) && (
              <PubSeccion titulo="Perfil Profesional" Icono={null}>
                {perfil.resumen && <p className="pub-resumen">{perfil.resumen}</p>}
                {perfil.intereses && <p className="pub-intereses"><strong>Intereses:</strong> {perfil.intereses}</p>}
              </PubSeccion>
            )}

            {/* Experiencia */}
            {perfil.experiencia?.length > 0 && (
              <PubSeccion titulo="Experiencia / Prácticas" Icono={HiOutlineBriefcase}>
                {perfil.experiencia.map((exp, i) => (
                  <div key={i} className="pub-item pub-item-row">
                    <div className="pub-item-icono"><BsBuilding size={16}/></div>
                    <div>
                      <p className="pub-item-t">{exp.cargo}</p>
                      {exp.empresa && <p className="pub-item-s">{exp.empresa}</p>}
                      <p className="pub-item-d">
                        {exp.actualmente
                          ? `${exp.desdeM} ${exp.desdeA} — Actualidad`
                          : `${exp.desdeM} ${exp.desdeA} — ${exp.hastaM} ${exp.hastaA}`}
                      </p>
                      {exp.funciones && <p className="pub-item-desc">{exp.funciones}</p>}
                    </div>
                  </div>
                ))}
              </PubSeccion>
            )}

            {/* Proyectos */}
            {perfil.proyectos?.length > 0 && (
              <PubSeccion titulo="Proyectos destacados" Icono={MdRocketLaunch}>
                <div className="proyectos-grid">
                  {perfil.proyectos.map((p, i) => (
                    <div key={i} className="proyecto-card">
                      <div className="proyecto-header">
                        <MdRocketLaunch size={18} className="proyecto-icono"/>
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
                            <FiExternalLink size={11}/> Ver proyecto
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </PubSeccion>
            )}

            {/* Habilidades */}
            {(perfil.skills?.length > 0 || perfil.habilidadesBlandas?.length > 0) && (
              <PubSeccion titulo="Habilidades y Competencias" Icono={MdBolt}>
                {perfil.skills?.length > 0 && (
                  <div className="skills-grupo">
                    <p className="pub-skills-cat pub-skills-tec">Habilidades Técnicas:</p>
                    <div className="skills-tags">
                      {perfil.skills.map((s, i) => <span key={i} className="tag tag-tecnico">{s}</span>)}
                    </div>
                  </div>
                )}
                {perfil.habilidadesBlandas?.length > 0 && (
                  <div className="skills-grupo" style={{marginTop:12}}>
                    <p className="pub-skills-cat pub-skills-bla">Habilidades Blandas:</p>
                    <div className="skills-tags">
                      {perfil.habilidadesBlandas.map((s, i) => <span key={i} className="tag tag-blando">{s}</span>)}
                    </div>
                  </div>
                )}
              </PubSeccion>
            )}

            {/* Cursos */}
            {perfil.cursos?.length > 0 && (
              <PubSeccion titulo="Logros y Participaciones" Icono={TbCertificate}>
                <div className="cursos-lista">
                  {perfil.cursos.map((c, i) => (
                    <div key={i} className="curso-item">
                      <div className="curso-icono">
                        {c.tipo === "Certificado" ? <BsTrophy size={15}/> : <MdMenuBook size={15}/>}
                      </div>
                      <div className="curso-contenido">
                        <p className="curso-nombre">{c.nombre}</p>
                        {c.institucion && <p className="curso-inst">{c.institucion}{c.anio ? ` · ${c.anio}` : ""}</p>}
                        {c.tipo && <span className="tag-curso">{c.tipo}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </PubSeccion>
            )}

            <div className="pub-confidencial">
              <FiLock size={12} style={{marginRight:5}}/>
              Uso exclusivo para gestión interna del BCP
            </div>
          </div>
        </div>

        {/* banner para no logueados */}
        {!usuario && (
          <div className="pub-banner-lider">
            <p>¿Eres líder BCP? Inicia sesión para guardar favoritos y contactar talento</p>
            <button onClick={() => navigate("/auth")}>Acceso para líderes</button>
          </div>
        )}
      </div>
    </div>
  );
}

/* helpers */
function PubSeccion({ titulo, Icono, children }) {
  return (
    <div className="pub-seccion">
      <h6 className="pub-seccion-t">
        {Icono && <Icono size={14} style={{marginRight:6}}/>}{titulo}
      </h6>
      {children}
    </div>
  );
}
function PubDato({ Icon, val }) {
  return (
    <div className="pub-dato">
      <Icon size={13} style={{flexShrink:0, color:"#003DA5"}}/>
      <span>{val}</span>
    </div>
  );
}

export default PerfilPublico;
