import { useEffect, useState, useMemo, useCallback } from "react";
import { db, auth } from "../firebase/firebase";
import {
  collection, getDocs, doc, getDoc,
  updateDoc, arrayUnion, arrayRemove,
  query, where,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import Filtros from "./Filtros.jsx";
import "../stylesheets/Catalogo.css";

import {
  FiMapPin, FiStar, FiMail, FiPhone, FiArrowLeft,
  FiExternalLink, FiX, FiFilter,
} from "react-icons/fi";
import {
  MdSchool, MdLanguage, MdRocketLaunch, MdBolt, MdMenuBook,
} from "react-icons/md";
import { HiOutlineBriefcase, HiOutlineOfficeBuilding } from "react-icons/hi";
import { BsTrophy } from "react-icons/bs";
import { TbCertificate } from "react-icons/tb";
import { IoSearchOutline } from "react-icons/io5";
import { RiTeamLine } from "react-icons/ri";
import { AiOutlineSafety } from "react-icons/ai";
import { FaLinkedin, FaGithub } from "react-icons/fa";

/* ── helpers ── */
const calcComp = (p) => {
  const c = [
    p.titulo, p.resumen, p.area, p.intereses,
    p.telefono, p.distrito || p.ciudad,
    p.experiencia?.length > 0,
    p.educacion?.length   > 0,
    p.idiomas?.length     > 0,
    p.cursos?.length      > 0,
    p.skills?.length      > 0,
    p.habilidadesBlandas?.length > 0,
  ];
  return Math.round(c.filter(Boolean).length / c.length * 100);
};

const MESES_MAP = {
  Enero:0,Febrero:1,Marzo:2,Abril:3,Mayo:4,Junio:5,
  Julio:6,Agosto:7,Septiembre:8,Octubre:9,Noviembre:10,Diciembre:11,
};
const calcMesesExp = (experiencia = []) => {
  let total = 0;
  const ahora = new Date();
  experiencia.forEach((e) => {
    const desde = e.desdeA ? new Date(Number(e.desdeA), MESES_MAP[e.desdeM] ?? 0) : null;
    const hasta = e.actualmente
      ? ahora
      : e.hastaA ? new Date(Number(e.hastaA), MESES_MAP[e.hastaM] ?? 0) : null;
    if (desde && hasta && hasta >= desde)
      total += (hasta.getFullYear() - desde.getFullYear()) * 12 + (hasta.getMonth() - desde.getMonth());
  });
  return total;
};
const rangoExp = (m) => {
  if (m <= 0)  return null;
  if (m <= 3)  return "1–3 meses";
  if (m <= 6)  return "4–6 meses";
  if (m <= 12) return "6–12 meses";
  return "+12 meses";
};

/* ── Estado inicial de filtros ──
   IMPORTANTE: usa "rotaciones" (campo real en Firestore),
   NO "areasRotacion" (nombre incorrecto anterior).           */
const FILTROS_INIT = {
  busqueda:         "",
  areas:            [],   // busca en área actual Y en rotaciones anteriores
  skills:           [],
  idiomas:          [],
  nivelEducacion:   [],
  generos:          [],
  ubicaciones:      [],
  rangosExp:        [],
  soloFavoritos:    false,
  soloConProyectos: false,
};

/* ══════════════════════════════════════════
   CATALOGO
══════════════════════════════════════════ */
function Catalogo() {
  const navigate = useNavigate();

  const [perfiles,     setPerfiles]     = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [filtros,      setFiltros]      = useState(FILTROS_INIT);
  const [panelAbierto, setPanelAbierto] = useState(false);
  const [perfilModal,  setPerfilModal]  = useState(null);
  const [loadingModal, setLoadingModal] = useState(false);
  const [esLider,      setEsLider]      = useState(false);
  const [liderDocId,   setLiderDocId]   = useState(null);
  const [favIds,       setFavIds]       = useState([]);

  /* auth */
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) return;
      const esL = !!u.email?.endsWith("@bcp.com");
      setEsLider(esL);
      if (esL) {
        const snap = await getDocs(query(collection(db, "lideres"), where("uid", "==", u.uid)));
        if (!snap.empty) {
          const d = snap.docs[0];
          setLiderDocId(d.id);
          setFavIds(d.data().favoritos || []);
        }
      }
    });
    return () => unsub();
  }, []);

  /* cargar perfiles */
  useEffect(() => {
    const cargar = async () => {
      try {
        const snap = await getDocs(collection(db, "practicantes"));
        setPerfiles(snap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
          completitud: calcComp(d.data()),
        })));
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    cargar();
  }, []);

  /* skills dinámicos para el panel */
  const skillsDisponibles = useMemo(() => {
    const set = new Set();
    perfiles.forEach((p) => (p.skills || []).forEach((s) => s && set.add(s.trim())));
    return [...set].sort();
  }, [perfiles]);

  /* ── FILTRADO ──
     FIX PRINCIPAL: p.rotaciones (no p.areasRotacion)        */
  const filtrados = useMemo(() => {
    const txt = filtros.busqueda.toLowerCase().trim();
    return perfiles
      .filter((p) => {
        if (p.completitud < 40) return false;

        /* texto libre — incluye logros de rotaciones */
        if (txt) {
          const hay = [
            p.nombre, p.titulo, p.area, p.intereses, p.distrito, p.ciudad, p.pais,
            ...(p.skills || []),
            ...(p.habilidadesBlandas || []),
            /* ← campo correcto */
            ...(p.rotaciones || []).map((r) => `${r.area} ${r.logros || ""}`),
          ].filter(Boolean).join(" ").toLowerCase();
          if (!hay.includes(txt)) return false;
        }

        /* áreas de experiencia — busca en área actual Y en rotaciones anteriores */
        if (filtros.areas?.length > 0) {
          const areaActual  = p.area || "";
          const areasRotac  = (p.rotaciones || []).map((r) => r.area);
          const todasAreas  = [areaActual, ...areasRotac].filter(Boolean);
          if (!filtros.areas.some((a) => todasAreas.includes(a))) return false;
        }

        /* skills — comparación case-insensitive para tolerar variantes de escritura */
        if (filtros.skills.length > 0) {
          const sp = [...(p.skills || []), ...(p.habilidadesBlandas || [])]
            .map((s) => s.trim().toLowerCase());
          if (!filtros.skills.some((s) => sp.includes(s.toLowerCase()))) return false;
        }

        /* idiomas */
        if (filtros.idiomas.length > 0) {
          const ip = (p.idiomas || []).map((i) => (i.idioma || i).toLowerCase());
          if (!filtros.idiomas.some((i) => ip.includes(i.toLowerCase()))) return false;
        }

        /* nivel educación */
        if (filtros.nivelEducacion.length > 0) {
          const np = (p.educacion || []).map((e) => e.nivel);
          if (!filtros.nivelEducacion.some((n) => np.includes(n))) return false;
        }

        /* género */
        if (filtros.generos.length > 0) {
          if (!filtros.generos.includes(p.genero)) return false;
        }

        /* ubicación */
        if (filtros.ubicaciones.length > 0) {
          const ubic = [p.ciudad, p.distrito, p.pais].filter(Boolean).join(" ").toLowerCase();
          if (!filtros.ubicaciones.some((u) => ubic.includes(u.toLowerCase()))) return false;
        }

        /* rango de experiencia */
        if (filtros.rangosExp?.length > 0) {
          const meses = calcMesesExp(p.experiencia);
          const rango = rangoExp(meses) || "Sin experiencia";
          if (!filtros.rangosExp.includes(rango)) return false;
        }

        /* favoritos */
        if (filtros.soloFavoritos && !favIds.includes(p.id)) return false;

        /* proyectos */
        if (filtros.soloConProyectos && !(p.proyectos?.length > 0)) return false;

        return true;
      })
      .sort((a, b) => b.completitud - a.completitud);
  }, [perfiles, filtros, favIds]);

  /* abrir modal rápido */
  const abrirModal = async (p) => {
    setPerfilModal(p);
    setLoadingModal(true);
    try {
      const snap = await getDoc(doc(db, "practicantes", p.id));
      if (snap.exists())
        setPerfilModal({ id: snap.id, ...snap.data(), completitud: p.completitud });
    } catch (e) { console.error(e); }
    finally { setLoadingModal(false); }
  };

  /* toggle favorito */
  const toggleFav = async (e, pid) => {
    e.stopPropagation();
    if (!esLider || !liderDocId) return;
    const ref = doc(db, "lideres", liderDocId);
    if (favIds.includes(pid)) {
      await updateDoc(ref, { favoritos: arrayRemove(pid) });
      setFavIds((prev) => prev.filter((f) => f !== pid));
    } else {
      await updateDoc(ref, { favoritos: arrayUnion(pid) });
      setFavIds((prev) => [...prev, pid]);
    }
  };

  const cantFiltros =
    (filtros.areas?.length          || 0) +
    (filtros.skills?.length         || 0) +
    (filtros.idiomas?.length        || 0) +
    (filtros.nivelEducacion?.length || 0) +
    (filtros.generos?.length        || 0) +
    (filtros.ubicaciones?.length    || 0) +
    (filtros.rangosExp?.length      || 0) +
    (filtros.soloFavoritos    ? 1 : 0) +
    (filtros.soloConProyectos ? 1 : 0);

  if (loading) return (
    <div className="pantalla-carga">
      <div className="spinner-bcp"/>
      <p>Cargando talento...</p>
    </div>
  );

  return (
    <div className="cat-wrapper">

      {/* ─── TOPBAR ─── */}
      <div className="cat-topbar">
        <div className="cat-search-wrap">
          <IoSearchOutline className="cat-search-icon" size={17}/>
          <input
            className="cat-search"
            placeholder="Buscar por nombre, rol, skills, área..."
            value={filtros.busqueda}
            onChange={(e) => setFiltros({ ...filtros, busqueda: e.target.value })}
          />
          {filtros.busqueda && (
            <button className="cat-search-clear" onClick={() => setFiltros({ ...filtros, busqueda: "" })}>
              <FiX size={14}/>
            </button>
          )}
        </div>
      </div>

      {/* ─── BODY ─── */}
      <div className="cat-body">

        {/* PANEL FILTROS */}
        <Filtros
          filtros={filtros}
          onChange={setFiltros}
          skillsDisponibles={skillsDisponibles}
          esLider={esLider}
          abierto={panelAbierto}
          onCerrar={() => setPanelAbierto(false)}
        />

        {/* GRID */}
        <div className="cat-grid-area">
          <div className="cat-section-header">
            <h2 className="cat-section-titulo">Talento BCP</h2>
            <div className="cat-result-info">
              <strong>{filtrados.length}</strong> perfiles encontrados
              {cantFiltros > 0 && (
                <button className="cat-limpiar-link" onClick={() => setFiltros(FILTROS_INIT)}>
                  Limpiar filtros
                </button>
              )}
            </div>
          </div>

          <div className="cat-grid">
            {filtrados.map((p) => (
              <TarjetaPracticante
                key={p.id}
                perfil={p}
                esFav={favIds.includes(p.id)}
                esLider={esLider}
                onToggleFav={(e) => toggleFav(e, p.id)}
                onVerPerfil={() => abrirModal(p)}
              />
            ))}
          </div>

          {filtrados.length === 0 && (
            <div className="cat-empty">
              <IoSearchOutline size={48} color="#ccc"/>
              <h5>Sin resultados</h5>
              <p>Intenta con otros filtros o palabras clave</p>
              <button className="cat-btn-limpiar" onClick={() => setFiltros(FILTROS_INIT)}>
                Limpiar filtros
              </button>
            </div>
          )}
        </div>
      </div>

      {/* MODAL */}
      {perfilModal && (
        <ModalPerfil
          perfil={perfilModal}
          cargando={loadingModal}
          esFav={favIds.includes(perfilModal.id)}
          esLider={esLider}
          onToggleFav={(e) => toggleFav(e, perfilModal.id)}
          onCerrar={() => setPerfilModal(null)}
          onVerCompleto={() => { setPerfilModal(null); navigate(`/perfil/${perfilModal.id}`); }}
        />
      )}
    </div>
  );
}

/* ══════════════════════════════════════════
   TARJETA PRACTICANTE
══════════════════════════════════════════ */
function TarjetaPracticante({ perfil, esFav, esLider, onToggleFav, onVerPerfil }) {
  const ubicacion = [perfil.ciudad, perfil.pais].filter(Boolean).join(", ") || perfil.distrito || null;
  const nivelEdu  = perfil.educacion?.[0]
    ? `${perfil.educacion[0].institucion}${perfil.educacion[0].nivel ? " · " + perfil.educacion[0].nivel : ""}`
    : null;
  const meses = calcMesesExp(perfil.experiencia);
  const rango = rangoExp(meses);
  const tecnicas = (perfil.skills || []).slice(0, 4);
  const blandas  = (perfil.habilidadesBlandas || []).slice(0, 2);

  /* ← campo correcto: rotaciones (no areasRotacion) */
  const areasAnteriores = (perfil.rotaciones || [])
    .map((r) => r.area)
    .filter((a) => a && a !== perfil.area);

  const compColor =
    perfil.completitud >= 80 ? "#16a34a" :
    perfil.completitud >= 60 ? "#d97706" : "#dc2626";

  return (
    <div className="tc-card" onClick={onVerPerfil}>
      <div className="tc-comp-bar">
        <div className="tc-comp-fill" style={{ width:`${perfil.completitud}%`, background:compColor }}/>
      </div>

      {esLider && (
        <button
          className={`tc-fav ${esFav ? "tc-fav-on" : ""}`}
          onClick={(e) => { e.stopPropagation(); onToggleFav(e); }}
          title={esFav ? "Quitar favorito" : "Guardar favorito"}
        >
          <FiStar size={14}/>
        </button>
      )}

      <div className="tc-header">
        <div className="tc-avatar">
          {perfil.foto
            ? <img src={perfil.foto} alt={perfil.nombre}/>
            : <span>{perfil.nombre?.charAt(0)?.toUpperCase()}</span>
          }
        </div>
        <div className="tc-info">
          <h5 className="tc-nombre">{perfil.nombre}</h5>
          <p className="tc-titulo">{perfil.titulo || "Sin título"}</p>
          {ubicacion && <p className="tc-meta"><FiMapPin size={11}/> {ubicacion}</p>}
          {nivelEdu  && <p className="tc-meta"><MdSchool size={12}/> {nivelEdu}</p>}
          {rango     && <p className="tc-meta tc-exp"><HiOutlineBriefcase size={12}/> {rango} de exp.</p>}
        </div>
      </div>

      {perfil.area && (
        <div className="tc-areas">
          <span className="tc-area-chip tc-area-actual">{perfil.area}</span>
          {areasAnteriores.slice(0, 1).map((a, i) => (
            <span key={i} className="tc-area-chip tc-area-anterior" title="Área anterior">{a}</span>
          ))}
          {areasAnteriores.length > 1 && (
            <span className="tc-area-mas">+{areasAnteriores.length - 1}</span>
          )}
        </div>
      )}

      {tecnicas.length > 0 && (
        <div className="tc-tags-row">
          <MdBolt size={12} className="tc-tags-icon"/>
          <div className="tc-tags">
            {tecnicas.map((s, i) => <span key={i} className="tc-tag tc-tag-tec">{s.trim()}</span>)}
            {(perfil.skills || []).length > 4 && (
              <span className="tc-tag-mas">+{perfil.skills.length - 4}</span>
            )}
          </div>
        </div>
      )}

      {blandas.length > 0 && (
        <div className="tc-tags-row">
          <RiTeamLine size={12} className="tc-tags-icon" style={{color:"#5c7d3e"}}/>
          <div className="tc-tags">
            {blandas.map((s, i) => <span key={i} className="tc-tag tc-tag-bla">{s.trim()}</span>)}
          </div>
        </div>
      )}

      <div className="tc-footer">
        <span className="tc-comp-label" style={{ color: compColor }}>
          {perfil.completitud}% completado
        </span>
        <span className="tc-ver-link">Ver perfil →</span>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════
   MODAL PERFIL RÁPIDO
══════════════════════════════════════════ */
function ModalPerfil({ perfil, cargando, esFav, esLider, onToggleFav, onCerrar, onVerCompleto }) {
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  const ubicacion = [perfil.ciudad, perfil.pais].filter(Boolean).join(", ") || perfil.distrito || null;
  const meses     = calcMesesExp(perfil.experiencia);
  const rango     = rangoExp(meses);

  /* ← campo correcto: rotaciones */
  const areasAnteriores = (perfil.rotaciones || []).filter(
    (r) => r.area && r.area !== perfil.area
  );

  return (
    <div className="mp-overlay" onClick={onCerrar}>
      <div className="mp-caja" onClick={(e) => e.stopPropagation()}>

        <button className="mp-close-btn" onClick={onCerrar}><FiX size={18}/></button>

        {cargando ? (
          <div className="mp-loading"><div className="spinner-bcp"/></div>
        ) : (
          <>
            {/* HEADER */}
            <div className="mp-header">
              <div className="mp-banner"/>
              <div className="mp-avatar-wrap">
                <div className="mp-avatar">
                  {perfil.foto
                    ? <img src={perfil.foto} alt={perfil.nombre}/>
                    : <span>{perfil.nombre?.charAt(0)?.toUpperCase()}</span>
                  }
                </div>
              </div>
              <div className="mp-header-info">
                <div className="mp-nombre-row">
                  <h3 className="mp-nombre">{perfil.nombre} {perfil.apellidos}</h3>
                  {esLider && (
                    <button
                      className={`mp-fav-btn ${esFav ? "mp-fav-on" : ""}`}
                      onClick={onToggleFav}
                    >
                      <FiStar size={13} style={{marginRight:4}}/>
                      {esFav ? "Guardado" : "Guardar"}
                    </button>
                  )}
                </div>
                <p className="mp-titulo">{perfil.titulo || "Sin título"}</p>
                {ubicacion && <p className="mp-ubic"><FiMapPin size={12} style={{marginRight:4}}/>{ubicacion}</p>}
                {rango     && <p className="mp-rango-exp"><HiOutlineBriefcase size={13} style={{marginRight:4}}/>{rango} de experiencia total</p>}
                <div className="mp-areas">
                  {perfil.area && <span className="tc-area-chip tc-area-actual">{perfil.area}</span>}
                  {areasAnteriores.map((r, i) => (
                    <span
                      key={i}
                      className="tc-area-chip tc-area-anterior"
                      title={`${r.desdeM} ${r.desdeA} – ${r.actualmente ? "Actualidad" : `${r.hastaM} ${r.hastaA}`}`}
                    >
                      {r.area}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* BODY */}
            <div className="mp-body">

              {/* COL IZQUIERDA */}
              <div className="mp-col-izq">
                <MpSeccion titulo="Contacto">
                  {ubicacion       && <MpDato Icon={FiMapPin}  val={ubicacion}/>}
                  {perfil.telefono && <MpDato Icon={FiPhone}    val={perfil.telefono}/>}
                  {perfil.email    && <MpDato Icon={FiMail}     val={perfil.email}/>}
                  {perfil.linkedin && (
                    <a href={perfil.linkedin} target="_blank" rel="noopener noreferrer" className="mp-link">
                      <FaLinkedin size={13}/> LinkedIn
                    </a>
                  )}
                  {perfil.github && (
                    <a href={perfil.github} target="_blank" rel="noopener noreferrer" className="mp-link">
                      <FaGithub size={13}/> GitHub
                    </a>
                  )}
                </MpSeccion>

                {/* HISTORIAL BCP ← campo correcto */}
                {areasAnteriores.length > 0 && (
                  <MpSeccion titulo="Historial BCP">
                    {areasAnteriores.map((r, i) => (
                      <div key={i} className="mp-item">
                        <p className="mp-item-t" style={{color:"#003DA5"}}>{r.area}</p>
                        <p className="mp-item-d">
                          {r.desdeM} {r.desdeA} — {r.actualmente ? "Actualidad" : `${r.hastaM} ${r.hastaA}`}
                        </p>
                        {r.logros && <p className="mp-item-desc">{r.logros}</p>}
                      </div>
                    ))}
                  </MpSeccion>
                )}

                {perfil.educacion?.length > 0 && (
                  <MpSeccion titulo="Formación">
                    {perfil.educacion.map((e, i) => (
                      <div key={i} className="mp-item">
                        <p className="mp-item-t">{e.institucion}</p>
                        {e.carrera && <p className="mp-item-s">{e.carrera}</p>}
                        {e.nivel   && <span className="mp-edu-nivel">{e.nivel}</span>}
                        <p className="mp-item-d">
                          {e.actualmente
                            ? `${e.desdeM} ${e.desdeA} — Actualidad`
                            : `${e.desdeM||""} ${e.desdeA||""}${e.hastaA ? ` — ${e.hastaM} ${e.hastaA}` : ""}`}
                        </p>
                      </div>
                    ))}
                  </MpSeccion>
                )}

                {perfil.idiomas?.length > 0 && (
                  <MpSeccion titulo="Idiomas">
                    {perfil.idiomas.map((id, i) => (
                      <p key={i} className="mp-idioma">
                        <strong>{id.idioma}:</strong> {id.nivel}
                      </p>
                    ))}
                  </MpSeccion>
                )}

                {perfil.movilidad && (
                  <MpSeccion titulo="Disponibilidad">
                    <div className="mp-movilidad">
                      <span className={`mp-mov ${perfil.movilidad.viajar ? "mp-mov-si":"mp-mov-no"}`}>{perfil.movilidad.viajar?"✓":"✗"} Viajar</span>
                      <span className={`mp-mov ${perfil.movilidad.reubicacion ? "mp-mov-si":"mp-mov-no"}`}>{perfil.movilidad.reubicacion?"✓":"✗"} Reubicación</span>
                      <span className={`mp-mov ${perfil.movilidad.vehiculo ? "mp-mov-si":"mp-mov-no"}`}>{perfil.movilidad.vehiculo?"✓":"✗"} Vehículo</span>
                    </div>
                  </MpSeccion>
                )}
              </div>

              {/* COL DERECHA */}
              <div className="mp-col-der">
                {perfil.resumen && (
                  <MpSeccion titulo="Perfil Profesional">
                    <p className="mp-resumen">{perfil.resumen}</p>
                    {perfil.intereses && (
                      <p className="mp-intereses"><strong>Intereses:</strong> {perfil.intereses}</p>
                    )}
                  </MpSeccion>
                )}

                {perfil.experiencia?.length > 0 && (
                  <MpSeccion titulo="Experiencia">
                    {perfil.experiencia.map((exp, i) => (
                      <div key={i} className="mp-item">
                        <p className="mp-item-t">{exp.cargo}</p>
                        {exp.empresa && <p className="mp-item-s">{exp.empresa}</p>}
                        <p className="mp-item-d">
                          {exp.actualmente
                            ? `${exp.desdeM} ${exp.desdeA} — Actualidad`
                            : `${exp.desdeM} ${exp.desdeA} — ${exp.hastaM} ${exp.hastaA}`}
                        </p>
                        {exp.funciones && <p className="mp-item-desc">{exp.funciones}</p>}
                      </div>
                    ))}
                  </MpSeccion>
                )}

                {(perfil.skills?.length > 0 || perfil.habilidadesBlandas?.length > 0) && (
                  <MpSeccion titulo="Habilidades">
                    {perfil.skills?.length > 0 && (
                      <>
                        <p className="mp-skills-cat mp-skills-tec">Técnicas</p>
                        <div className="mp-tags">
                          {perfil.skills.map((s, i) => <span key={i} className="mp-tag mp-tag-tec">{s.trim()}</span>)}
                        </div>
                      </>
                    )}
                    {perfil.habilidadesBlandas?.length > 0 && (
                      <>
                        <p className="mp-skills-cat mp-skills-bla" style={{marginTop:8}}>Blandas</p>
                        <div className="mp-tags">
                          {perfil.habilidadesBlandas.map((s, i) => <span key={i} className="mp-tag mp-tag-bla">{s.trim()}</span>)}
                        </div>
                      </>
                    )}
                  </MpSeccion>
                )}

                {perfil.proyectos?.length > 0 && (
                  <MpSeccion titulo="Proyectos">
                    {perfil.proyectos.map((pr, i) => (
                      <div key={i} className="mp-item">
                        <p className="mp-item-t">{pr.nombre}</p>
                        {pr.rol && <p className="mp-item-s">{pr.rol}</p>}
                        {pr.descripcion && <p className="mp-item-desc">{pr.descripcion}</p>}
                        {pr.url && (
                          <a href={pr.url} target="_blank" rel="noopener noreferrer" className="mp-link">
                            <FiExternalLink size={11}/> Ver proyecto
                          </a>
                        )}
                      </div>
                    ))}
                  </MpSeccion>
                )}

                {perfil.cursos?.length > 0 && (
                  <MpSeccion titulo="Logros y Certificaciones">
                    {perfil.cursos.map((c, i) => (
                      <div key={i} className="mp-curso">
                        {c.tipo === "Certificado" ? <BsTrophy size={14}/> : <MdMenuBook size={14}/>}
                        <div>
                          <p className="mp-item-t">{c.nombre}</p>
                          {c.institucion && <p className="mp-item-s">{c.institucion}{c.anio ? ` · ${c.anio}` : ""}</p>}
                        </div>
                      </div>
                    ))}
                  </MpSeccion>
                )}

                <div className="mp-confidencial">
                  <AiOutlineSafety size={13} style={{marginRight:5}}/>
                  Uso exclusivo para gestión interna del BCP
                </div>
              </div>
            </div>

            {/* FOOTER */}
            <div className="mp-footer">
              <button className="mp-btn-volver-footer" onClick={onCerrar}>
                <FiArrowLeft size={14} style={{marginRight:5}}/>Volver
              </button>
              {esLider && perfil.email && (
                <a href={`mailto:${perfil.email}?subject=Oportunidad BCP`} className="mp-btn-contactar">
                  <FiMail size={13} style={{marginRight:5}}/>Contactar
                </a>
              )}
              <button className="mp-btn-completo" onClick={onVerCompleto}>
                Ver perfil completo →
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function MpSeccion({ titulo, children }) {
  return (
    <div className="mp-seccion">
      <h6 className="mp-seccion-t">{titulo}</h6>
      {children}
    </div>
  );
}
function MpDato({ Icon, val }) {
  return (
    <p className="mp-dato">
      <Icon size={13} style={{flexShrink:0, color:"#003DA5"}}/>
      <span>{val}</span>
    </p>
  );
}


export default Catalogo;
