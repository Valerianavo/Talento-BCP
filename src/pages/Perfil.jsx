import { useEffect, useState, useRef } from "react";
import { db, auth } from "../firebase/firebase.js";
import { onAuthStateChanged } from "firebase/auth";
import { collection, query, where, getDocs, updateDoc, doc } from "firebase/firestore";
import Swal from "sweetalert2";
import Navbar from "../components/Navbar.jsx";
import "../stylesheets/Perfil.css";

import {
  FiEdit2, FiPlus, FiTrash2, FiArrowUp, FiArrowDown, FiX, FiCheck,
  FiMapPin, FiPhone, FiMail, FiCalendar, FiLinkedin, FiGithub, FiExternalLink,
  FiSearch
} from "react-icons/fi";
import { MdWorkOutline, MdSchool, MdLanguage, MdMenuBook, MdRocketLaunch, MdBolt, MdPsychology } from "react-icons/md";
import { HiOutlineBriefcase } from "react-icons/hi";
import { BsBuilding, BsTrophy, BsBank2 } from "react-icons/bs";
import { TbCertificate, TbArrowsTransferDown } from "react-icons/tb";
import { FiArrowRight } from "react-icons/fi";
import TestPsicometrico from "../components/TestPsicometrico.jsx";

/* ─── CONSTANTES ─── */
const MESES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
const ANIOS = Array.from({ length: 2026 - 1990 + 1 }, (_, i) => 2026 - i);
const NIVELES_IDIOMA = ["Muy básico", "Básico", "Intermedio", "Avanzado", "Nativo"];
const IDIOMAS_LISTA = ["Español", "Inglés", "Portugués", "Francés", "Alemán", "Chino", "Japonés",
  "Italiano", "Ruso", "Árabe", "Coreano", "Hindi", "Neerlandés", "Polaco", "Turco", "Sueco", "Noruego",
  "Danés", "Finés", "Griego", "Hebreo", "Tailandés", "Vietnamita", "Indonesio", "Malayo", "Ucraniano",
  "Catalán", "Quechua", "Aymara", "Otro"];
const NIVELES_EDUCACION = ["Técnico", "Universitario (en curso)", "Universitario (egresado)",
  "Postgrado", "Maestría", "Doctorado", "Curso / Bootcamp", "Intercambio"];
const AREAS_BCP = ["Analítica & Tecnología", "Finanzas & Control", "Gestión & Operaciones",
  "Comunicación & Relación", "Riesgos & Cumplimiento", "Marketing & Experiencia Cliente"];
const PAISES = ["Perú", "Argentina", "Chile", "Colombia", "México", "Ecuador", "Bolivia", "Venezuela", "Otro"];
const AVATAR_MOCKS = ["/avatars/av1.png", "/avatars/av2.png", "/avatars/av3.png",
  "/avatars/av4.png", "/avatars/av5.png", "/avatars/av6.png"];

/* ── helper completitud ── */
export const calcCompletitud = (p) => {
  if (!p) return 0;
  const c = [
    p.titulo, p.resumen, p.area, p.intereses,
    p.telefono, p.pais, p.ciudad,
    p.experiencia?.length > 0,
    p.educacion?.length > 0,
    p.idiomas?.length > 0,
    p.cursos?.length > 0,
    p.skills?.length > 0,
    p.habilidadesBlandas?.length > 0,
  ];
  return Math.round(c.filter(Boolean).length / c.length * 100);
};

const moverItem = (arr, idx, dir) => {
  const n = [...arr]; const to = idx + dir;
  if (to < 0 || to >= n.length) return arr;
  [n[idx], n[to]] = [n[to], n[idx]]; return n;
};

/* ══════════════════════════════════════════ PERFIL ══ */
function Perfil() {
  const [perfil, setPerfil] = useState(null);
  const [docId, setDocId] = useState("");
  const [cargando, setCargando] = useState(true);
  const prevComp = useRef(0);

  /* modales */
  const [mHeader, setMHeader] = useState(false);
  const [mDatos, setMDatos] = useState(false);
  const [mExp, setMExp] = useState(false);
  const [mProy, setMProy] = useState(false);
  const [mEdu, setMEdu] = useState(false);
  const [mIdiomas, setMIdiomas] = useState(false);
  const [mCurso, setMCurso] = useState(false);
  const [mHab, setMHab] = useState(false);
  const [mRotacion, setMRotacion] = useState(false); // 🆕
  const [mPsico, setMPsico] = useState(false);
  const [psicoLocal, setPsicoLocal] = useState(null);

  /* modales editar */
  const [editExp, setEditExp] = useState(null);
  const [editProy, setEditProy] = useState(null);
  const [editEdu, setEditEdu] = useState(null);
  const [editCurso, setEditCurso] = useState(null);
  const [editRotacion, setEditRotacion] = useState(null); // 🆕

  /* ── CARGA ── */
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) { setCargando(false); return; }
      try {
        const snap = await getDocs(query(collection(db, "practicantes"), where("uid", "==", u.uid)));
        snap.forEach((d) => { setPerfil(d.data()); setDocId(d.id); });
        const raw = localStorage.getItem(`estiloTrabajo_${u.uid}`);
        if (raw) {
          try { setPsicoLocal(JSON.parse(raw)); } catch { /* ignore */ }
        }
      } catch (err) {
        Swal.fire({ icon: "error", title: "Error al cargar", text: err.message, confirmButtonColor: "#003DA5" });
      } finally { setCargando(false); }
    });
    return () => unsub();
  }, []);

  /* ── GUARDAR ── */
  const guardar = async (campos, silencioso = false) => {
    try {
      await updateDoc(doc(db, "practicantes", docId), campos);
      const snap = await getDocs(query(collection(db, "practicantes"), where("uid", "==", auth.currentUser.uid)));
      let nuevoPerfil = null;
      snap.forEach((d) => { nuevoPerfil = d.data(); setPerfil(d.data()); });

      if (!silencioso) {
        const ant = prevComp.current;
        const nvo = calcCompletitud(nuevoPerfil);
        prevComp.current = nvo;
        if (nvo === 100 && ant < 100) {
          Swal.fire({ icon: "success", title: "¡Perfil al 100%!", text: "Tienes máxima visibilidad en el catálogo.", confirmButtonColor: "#003DA5" });
        } else if (nvo >= 70 && ant < 70) {
          Swal.fire({ icon: "info", title: "¡Ya apareces en el catálogo!", text: "Tu perfil llegó al 70%. Los líderes ya pueden encontrarte.", confirmButtonColor: "#003DA5", timer: 4000 });
        } else {
          Swal.fire({ icon: "success", title: "¡Guardado!", timer: 1600, showConfirmButton: false });
        }
      }
    } catch (err) {
      Swal.fire({ icon: "error", title: "No se pudo guardar", text: err.message, confirmButtonColor: "#003DA5" });
    }
  };

  const eliminar = async (campo, idx) => {
    const res = await Swal.fire({
      title: "¿Eliminar?", icon: "warning", showCancelButton: true,
      confirmButtonColor: "rgb(221, 99, 51)", cancelButtonColor: "#6c757d",
      confirmButtonText: "Sí, eliminar", cancelButtonText: "Cancelar"
    });
    if (!res.isConfirmed) return;
    const n = [...(perfil[campo] || [])]; n.splice(idx, 1);
    await guardar({ [campo]: n });
  };

  const editarEnArray = async (campo, idx, item) => {
    const n = [...(perfil[campo] || [])]; n[idx] = item;
    await guardar({ [campo]: n });
  };

  const reordenar = async (campo, idx, dir) => {
    const n = moverItem(perfil[campo] || [], idx, dir);
    await guardar({ [campo]: n }, true);
  };

  if (cargando) return <PantallaCarga />;
  if (!perfil) return <SinSesion />;
  if (prevComp.current === 0) prevComp.current = calcCompletitud(perfil);

  const comp = calcCompletitud(perfil);

  return (
    <div className="perfil-wrapper">
      <div className="perfil-container">

        {/* ══ SIDEBAR ══ */}
        <aside className="perfil-sidebar">
          {/* completitud card legacy — oculta via CSS */}
          <div className="sidebar-card completitud-cad">
            <h6 className="sidebar-titulo">COMPLETITUD DEL PERFIL</h6>
            <div className="barra-progreso-wrapper">
              <div className="barra-progreso-fill" style={{ width: `${comp}%` }} />
            </div>
            <span className="completitud-numero">{comp}%</span>
            {comp < 70 ? (
              <p className="completitud-fab-tip">
                Completa tu perfil al 70% para aparecer en el catálogo
              </p>
            ) : comp < 100 ? (
              <p className="completitud-fab-tip" style={{ color: '#ff9307' }}>
                ¡Ya eres visible en el catálogo! Sigue así hasta el 100%
              </p>
            ) : (
              <p className="completitud-fab-tip completitud-fab-ok">
                ¡Perfil al 100% · Máxima visibilidad!
              </p>
            )}
          </div>


          <div className="sidebar-card">
            <div className="sidebar-card-header">
              <h6 className="sidebar-titulo">DATOS PERSONALES</h6>
              <button className="btn-icono" onClick={() => setMDatos(true)}><FiEdit2 size={13} /></button>
            </div>
            <SideInfo Icon={FiMail} val={perfil.email} />
            <SideInfo Icon={FiPhone} val={perfil.telefono} />
            <SideInfo Icon={FiMapPin} val={[perfil.ciudad, perfil.pais].filter(Boolean).join(", ")} />
            <SideInfo Icon={FiCalendar} val={perfil.fechaNacimiento} />
            {perfil.linkedin && <SideLink Icon={FiLinkedin} label="LinkedIn" href={perfil.linkedin} />}
            {perfil.github && <SideLink Icon={FiGithub} label="GitHub" href={perfil.github} />}
          </div>

          {/* Área actual + rotaciones en sidebar */}
          <div className="sidebar-card">
            <h6 className="sidebar-titulo">ÁREA ACTUAL</h6>
            <span className="area-badge">{perfil.area || "Sin definir"}</span>
            {perfil.rotaciones?.length > 0 && (
              <>
                <p className="sidebar-subtitulo">ÁREAS ANTERIORES EN BCP</p>
                <div className="rotaciones-sidebar">
                  {perfil.rotaciones.map((r, i) => (
                    <span key={i} className="rotacion-chip-small">{r.area}</span>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* ══ ESTILO DE TRABAJO (privado, solo localStorage) ══ */}
          <button
            className="psi-launcher"
            onClick={() => setMPsico(true)}
            title="Conoce tu estilo de trabajo"
          >
            <div className="psi-launcher-icon">
              <MdPsychology size={22} />
            </div>
            <div className="psi-launcher-body">
              <p className="psi-launcher-title">
                {psicoLocal ? "Ver mi estilo de trabajo" : "Conoce tu estilo de trabajo"}
              </p>
              <p className="psi-launcher-sub">
                {psicoLocal
                  ? "Revisa tus resultados (privados)"
                  : "Herramienta personal de autoconocimiento"}
              </p>
            </div>
            {!psicoLocal
              ? <span className="psi-launcher-badge">3 min</span>
              : <FiArrowRight size={18} />
            }
          </button>

          {psicoLocal && (
            <div className="psi-mini">
              <h6 className="psi-mini-titulo"><MdPsychology size={14} /> Mi estilo</h6>
              <div className="psi-mini-habs">
                <div className="psi-mini-hab">
                  <span>Comunicación</span>
                  <span className="psi-mini-hab-v">{psicoLocal.habilidades?.comunicacion}%</span>
                </div>
                <div className="psi-mini-hab">
                  <span>Resolución</span>
                  <span className="psi-mini-hab-v">{psicoLocal.habilidades?.resolucion}%</span>
                </div>
                <div className="psi-mini-hab">
                  <span>Trabajo en equipo</span>
                  <span className="psi-mini-hab-v">{psicoLocal.habilidades?.trabajoEquipo}%</span>
                </div>
                <div className="psi-mini-hab">
                  <span>Analítico</span>
                  <span className="psi-mini-hab-v">{psicoLocal.habilidades?.analitico}%</span>
                </div>
              </div>
              <button className="psi-mini-reabrir" onClick={() => setMPsico(true)}>
                Ver resultados completos
              </button>
              <button
                className="psi-mini-reabrir"
                style={{ marginTop: 6, color: "#dc2626" }}
                onClick={async () => {
                  const r = await Swal.fire({
                    title: "¿Borrar resultados?",
                    text: "Se eliminarán solo de este dispositivo.",
                    icon: "warning",
                    showCancelButton: true,
                    confirmButtonColor: "#dc2626",
                    confirmButtonText: "Borrar",
                    cancelButtonText: "Cancelar",
                  });
                  if (!r.isConfirmed) return;
                  localStorage.removeItem(`estiloTrabajo_${auth.currentUser?.uid}`);
                  setPsicoLocal(null);
                }}
              >
                Borrar mis resultados
              </button>
            </div>
          )}

          <div className="sidebar-card tips-card">
            <h6 className="sidebar-titulo">🔥 TIPS BCP</h6>
            <ul className="tips-lista">
              <li>Añade tus rotaciones por áreas del BCP</li>
              <li>Incluye logros medibles por cada área</li>
              <li>Actualiza tu disponibilidad cada mes</li>
            </ul>
          </div>
        </aside>

        {/* ══ MAIN ══ */}
        <main className="perfil-main">

          {/* HEADER */}
          <section className="card-perfil header-perfil">
            <div className="header-banner" />
            <div className="header-body">
              <AvatarSelector perfil={perfil} onSelect={(foto) => guardar({ foto }, true)} />
              <div className="header-content">
                <div className="header-top-row">
                  <div>
                    <h2 className="nombre-usuario">{perfil.nombre} {perfil.apellidos || ""}</h2>
                    <p className="titulo-usuario">{perfil.titulo || <em className="texto-vacio-inline">Añade tu título profesional</em>}</p>
                    {(perfil.ciudad || perfil.pais) && (
                      <p className="area-usuario"><FiMapPin size={12} style={{ marginRight: 4 }} />{[perfil.ciudad, perfil.pais].filter(Boolean).join(", ")}</p>
                    )}
                  </div>
                  <button className="btn-editar-header" onClick={() => setMHeader(true)}>
                    <FiEdit2 size={13} /> Editar perfil
                  </button>
                </div>
                {perfil.resumen
                  ? <p className="header-resumen">{perfil.resumen}</p>
                  : <p className="texto-vacio header-resumen-vacio" onClick={() => setMHeader(true)}>+ Añade un resumen profesional...</p>
                }
                {perfil.intereses && <p className="header-intereses"><strong>Intereses:</strong> {perfil.intereses}</p>}
              </div>
            </div>
          </section>

          {/* ─── ROTACIONES BCP (sección estrella) ─── */}
          <SeccionCard titulo="Trayectoria en el BCP" Icono={BsBank2} onAnadir={() => setMRotacion(true)}>
            {perfil.rotaciones?.length > 0 ? (
              <div className="rotaciones-timeline">
                {/* Área actual al inicio */}
                {perfil.area && (
                  <div className="rot-item rot-actual">
                    <div className="rot-linea-wrap">
                      <div className="rot-dot rot-dot-actual" />
                      <div className="rot-linea" />
                    </div>
                    <div className="rot-contenido">
                      <span className="rot-badge-actual">Área actual</span>
                      <p className="rot-area">{perfil.area}</p>
                    </div>
                  </div>
                )}
                {perfil.rotaciones.map((r, i) => (
                  <ItemAcciones key={i} idx={i} total={perfil.rotaciones.length}
                    onEditar={() => setEditRotacion({ item: r, idx: i })}
                    onEliminar={() => eliminar("rotaciones", i)}
                    onSubir={() => reordenar("rotaciones", i, -1)}
                    onBajar={() => reordenar("rotaciones", i, 1)}
                  >
                    <div className="rot-item">
                      <div className="rot-linea-wrap">
                        <div className="rot-dot" />
                        {i < perfil.rotaciones.length - 1 && <div className="rot-linea" />}
                      </div>
                      <div className="rot-contenido">
                        <div className="rot-header-row">
                          <p className="rot-area">{r.area}</p>
                          <span className="rot-periodo">{r.desdeM} {r.desdeA}{r.hastaA ? ` — ${r.hastaM} ${r.hastaA}` : r.actualmente ? " — Actualidad" : ""}</span>
                        </div>
                        {r.logros && <p className="rot-logros">{r.logros}</p>}
                      </div>
                    </div>
                  </ItemAcciones>
                ))}
              </div>
            ) : (
              <div className="rot-vacio">
                <TbArrowsTransferDown size={32} className="rot-vacio-icon" />
                <p>Registra las áreas del BCP por las que has pasado</p>
                <p className="rot-vacio-hint">Los líderes valoran mucho la experiencia interna y los logros en cada área</p>
              </div>
            )}
          </SeccionCard>

          {/* EXPERIENCIA */}
          <SeccionCard titulo="Experiencia" Icono={HiOutlineBriefcase} onAnadir={() => setMExp(true)}>
            {perfil.experiencia?.length > 0
              ? perfil.experiencia.map((exp, i) => (
                <ItemAcciones key={i} idx={i} total={perfil.experiencia.length}
                  onEditar={() => setEditExp({ item: exp, idx: i })}
                  onEliminar={() => eliminar("experiencia", i)}
                  onSubir={() => reordenar("experiencia", i, -1)}
                  onBajar={() => reordenar("experiencia", i, 1)}
                >
                  <ItemExp exp={exp} />
                </ItemAcciones>
              ))
              : <p className="texto-vacio">Añade tu experiencia laboral o proyectos académicos</p>
            }
          </SeccionCard>

          {/* PROYECTOS */}
          <SeccionCard titulo="Proyectos destacados" Icono={MdRocketLaunch} onAnadir={() => setMProy(true)}>
            {perfil.proyectos?.length > 0
              ? <div className="proyectos-grid">
                {perfil.proyectos.map((p, i) => (
                  <ItemAcciones key={i} idx={i} total={perfil.proyectos.length} modo="tarjeta"
                    onEditar={() => setEditProy({ item: p, idx: i })}
                    onEliminar={() => eliminar("proyectos", i)}
                    onSubir={() => reordenar("proyectos", i, -1)}
                    onBajar={() => reordenar("proyectos", i, 1)}
                  >
                    <ItemProy proyecto={p} />
                  </ItemAcciones>
                ))}
              </div>
              : <p className="texto-vacio">Muestra tus proyectos más importantes a los líderes del BCP</p>
            }
          </SeccionCard>

          {/* EDUCACIÓN */}
          <SeccionCard titulo="Formación académica" Icono={MdSchool} onAnadir={() => setMEdu(true)}>
            {perfil.educacion?.length > 0
              ? perfil.educacion.map((edu, i) => (
                <ItemAcciones key={i} idx={i} total={perfil.educacion.length}
                  onEditar={() => setEditEdu({ item: edu, idx: i })}
                  onEliminar={() => eliminar("educacion", i)}
                  onSubir={() => reordenar("educacion", i, -1)}
                  onBajar={() => reordenar("educacion", i, 1)}
                >
                  <ItemEdu edu={edu} />
                </ItemAcciones>
              ))
              : <p className="texto-vacio">Añade tu formación académica</p>
            }
          </SeccionCard>

          {/* IDIOMAS */}
          <SeccionCard titulo="Idiomas" Icono={MdLanguage} onEditar={() => setMIdiomas(true)}>
            {perfil.idiomas?.length > 0
              ? <div className="idiomas-grid">
                {perfil.idiomas.map((id, i) => (
                  <div key={i} className="idioma-chip">
                    <span className="idioma-nombre">{id.idioma}</span>
                    <span className={`idioma-nivel nivel-${(id.nivel || "").toLowerCase().replace(/\s+/g, "-")}`}>{id.nivel}</span>
                  </div>
                ))}
              </div>
              : <p className="texto-vacio">Añade los idiomas que manejas y tu nivel</p>
            }
          </SeccionCard>

          {/* CURSOS */}
          <SeccionCard titulo="Cursos y certificados" Icono={TbCertificate} onAnadir={() => setMCurso(true)}>
            {perfil.cursos?.length > 0
              ? <div className="cursos-lista">
                {perfil.cursos.map((c, i) => (
                  <ItemAcciones key={i} idx={i} total={perfil.cursos.length}
                    onEditar={() => setEditCurso({ item: c, idx: i })}
                    onEliminar={() => eliminar("cursos", i)}
                    onSubir={() => reordenar("cursos", i, -1)}
                    onBajar={() => reordenar("cursos", i, 1)}
                  >
                    <ItemCurso curso={c} />
                  </ItemAcciones>
                ))}
              </div>
              : <p className="texto-vacio">Añade cursos, certificados y programas completados</p>
            }
          </SeccionCard>

          {/* HABILIDADES */}
          <SeccionCard titulo="Habilidades" Icono={MdBolt} onEditar={() => setMHab(true)}>
            {perfil.skills?.length > 0 && (
              <div className="skills-grupo">
                <p className="skills-subtitulo">Habilidades técnicas</p>
                <div className="skills-tags">
                  {perfil.skills.map((s, i) => <span key={i} className="tag tag-tecnico">{s.trim()}</span>)}
                </div>
              </div>
            )}
            {perfil.habilidadesBlandas?.length > 0 && (
              <div className="skills-grupo">
                <p className="skills-subtitulo">Habilidades blandas</p>
                <div className="skills-tags">
                  {perfil.habilidadesBlandas.map((s, i) => <span key={i} className="tag tag-blando">{s.trim()}</span>)}
                </div>
              </div>
            )}
            {!perfil.skills?.length && !perfil.habilidadesBlandas?.length && (
              <p className="texto-vacio">Añade tus habilidades técnicas y blandas</p>
            )}
          </SeccionCard>
        </main>
      </div>

      {/* ══ COMPLETITUD FAB ══ */}
      <div
        className="completitud-fab"
        role="status"
        aria-label={`Completitud del perfil: ${comp}%`}
        aria-live="polite"
      >
        <div className="completitud-fab-header">
          <span className="completitud-fab-label">Perfil completado</span>
          <span className="completitud-fab-num">{comp}%</span>
        </div>
        <div className="completitud-fab-bar" aria-hidden="true">
          <div className="completitud-fab-fill" style={{ width: `${comp}%` }} />
        </div>

        {comp < 70 ? (
          <p className="completitud-fab-tip">
            Completa tu perfil al 70% para aparecer en el catálogo
          </p>
        ) : comp < 100 ? (
          <p className="completitud-fab-tip" style={{ color: '#ffc107' }}>
            ¡Ya eres visible en el catálogo! Sigue así hasta el 100%
          </p>
        ) : (
          <p className="completitud-fab-tip completitud-fab-ok">
            ¡Perfil al 100% · Máxima visibilidad!
          </p>
        )}
      </div>


      {/* ══ MODALES ══ */}
      <ModalHeader abierto={mHeader} onCerrar={() => setMHeader(false)} perfil={perfil} onGuardar={guardar} />
      <ModalDatos abierto={mDatos} onCerrar={() => setMDatos(false)} perfil={perfil} onGuardar={guardar} />
      <ModalExp abierto={mExp} onCerrar={() => setMExp(false)} perfil={perfil} onGuardar={guardar} />
      <ModalProy abierto={mProy} onCerrar={() => setMProy(false)} perfil={perfil} onGuardar={guardar} />
      <ModalEdu abierto={mEdu} onCerrar={() => setMEdu(false)} perfil={perfil} onGuardar={guardar} />
      <ModalIdiomas abierto={mIdiomas} onCerrar={() => setMIdiomas(false)} perfil={perfil} onGuardar={guardar} />
      <ModalCurso abierto={mCurso} onCerrar={() => setMCurso(false)} perfil={perfil} onGuardar={guardar} />
      <ModalHab abierto={mHab} onCerrar={() => setMHab(false)} perfil={perfil} onGuardar={guardar} />
      <ModalRotacion abierto={mRotacion} onCerrar={() => setMRotacion(false)} perfil={perfil} onGuardar={guardar} />

      {editExp && <ModalExp abierto modoEdicion itemEdicion={editExp.item} onCerrar={() => setEditExp(null)} perfil={perfil}
        onGuardarEdicion={async (it) => { await editarEnArray("experiencia", editExp.idx, it); setEditExp(null); }} />}
      {editProy && <ModalProy abierto modoEdicion itemEdicion={editProy.item} onCerrar={() => setEditProy(null)} perfil={perfil}
        onGuardarEdicion={async (it) => { await editarEnArray("proyectos", editProy.idx, it); setEditProy(null); }} />}
      {editEdu && <ModalEdu abierto modoEdicion itemEdicion={editEdu.item} onCerrar={() => setEditEdu(null)} perfil={perfil}
        onGuardarEdicion={async (it) => { await editarEnArray("educacion", editEdu.idx, it); setEditEdu(null); }} />}
      {editCurso && <ModalCurso abierto modoEdicion itemEdicion={editCurso.item} onCerrar={() => setEditCurso(null)} perfil={perfil}
        onGuardarEdicion={async (it) => { await editarEnArray("cursos", editCurso.idx, it); setEditCurso(null); }} />}
      {editRotacion && <ModalRotacion abierto modoEdicion itemEdicion={editRotacion.item} onCerrar={() => setEditRotacion(null)} perfil={perfil}
        onGuardarEdicion={async (it) => { await editarEnArray("rotaciones", editRotacion.idx, it); setEditRotacion(null); }} />}

      {/* ══ TEST: ESTILO DE TRABAJO (privado, solo localStorage) ══ */}
      <TestPsicometrico
        abierto={mPsico}
        onCerrar={() => setMPsico(false)}
        resultadoPrevio={psicoLocal}
        onGuardar={async (resultado) => {
          const uid = auth.currentUser?.uid;
          if (uid) {
            localStorage.setItem(`estiloTrabajo_${uid}`, JSON.stringify(resultado));
          }
          setPsicoLocal(resultado);
          Swal.fire({
            icon: "success",
            title: "¡Resultados guardados!",
            text: "Solo tú puedes verlos. Se guardaron en este dispositivo.",
            confirmButtonColor: "#003DA5",
            timer: 2500,
            showConfirmButton: false,
          });
        }}
      />
    </div>
  );
}

/* ══ AVATAR ══ */
function AvatarSelector({ perfil, onSelect }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="avatar-wrapper" style={{ position: "relative" }}>
      <div className="avatar-circulo" onClick={() => setOpen(v => !v)} title="Cambiar foto">
        {perfil.foto
          ? <img src={perfil.foto} alt="avatar" style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }} />
          : <span>{perfil.nombre?.charAt(0)?.toUpperCase()}</span>
        }
        <div className="avatar-overlay"><FiEdit2 size={14} /></div>
      </div>
      {open && (
        <div className="avatar-picker">
          <p className="avatar-picker-titulo">Selecciona un avatar</p>
          <div className="avatar-picker-grid">
            {AVATAR_MOCKS.map((src, i) => (
              <img key={i} src={src} alt={`av${i}`} className="avatar-option"
                onClick={() => { onSelect(src); setOpen(false); }}
                onError={e => { e.target.style.display = "none"; }} />
            ))}
          </div>
          <button className="avatar-picker-cerrar" onClick={() => setOpen(false)}><FiX /> Cerrar</button>
        </div>
      )}
    </div>
  );
}

/* ══ ITEM CON ACCIONES ══ */
function ItemAcciones({ children, idx, total, onEditar, onEliminar, onSubir, onBajar, modo = "lista" }) {
  const [hover, setHover] = useState(false);
  return (
    <div className={`ia-wrapper ${modo === "tarjeta" ? "ia-tarjeta" : ""}`}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
      {children}
      {hover && (
        <div className="ia-botones">
          {idx > 0 && <button className="ia-btn ia-up" onClick={onSubir} title="Subir"><FiArrowUp size={12} /></button>}
          {idx < total - 1 && <button className="ia-btn ia-down" onClick={onBajar} title="Bajar"><FiArrowDown size={12} /></button>}
          <button className="ia-btn ia-edit" onClick={onEditar} title="Editar"><FiEdit2 size={12} /></button>
          <button className="ia-btn ia-del" onClick={onEliminar} title="Eliminar"><FiTrash2 size={12} /></button>
        </div>
      )}
    </div>
  );
}

/* ══ DISPLAY ITEMS ══ */
function SideInfo({ Icon, val }) {
  if (!val) return null;
  return <div className="info-item"><Icon size={13} className="info-icon" /><span className="info-valor">{val}</span></div>;
}
function SideLink({ Icon, label, href }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="info-item info-link">
      <Icon size={13} className="info-icon" /><span>{label}</span><FiExternalLink size={11} style={{ marginLeft: "auto" }} />
    </a>
  );
}

function SeccionCard({ titulo, Icono, onEditar, onAnadir, children }) {
  return (
    <section className="card-perfil seccion-card">
      <div className="seccion-header">
        <h3 className="seccion-titulo">{Icono && <Icono size={17} className="seccion-icon" />} {titulo}</h3>
        <div className="seccion-acciones">
          {onAnadir && <button className="btn-accion btn-anadir" onClick={onAnadir}><FiPlus size={13} /> Añadir</button>}
          {onEditar && <button className="btn-accion btn-editar" onClick={onEditar}><FiEdit2 size={13} /> Editar</button>}
        </div>
      </div>
      <div className="seccion-body">{children}</div>
    </section>
  );
}
function ItemExp({ exp }) {
  const p = exp.actualmente ? `${exp.desdeM} ${exp.desdeA} — Actualidad` : `${exp.desdeM} ${exp.desdeA} — ${exp.hastaM} ${exp.hastaA}`;
  return (
    <div className="item-lista">
      <div className="item-icono"><BsBuilding size={17} /></div>
      <div className="item-contenido">
        <p className="item-titulo">{exp.cargo}</p>
        {exp.empresa && <p className="item-subtitulo">{exp.empresa}</p>}
        <p className="item-fecha">{p}</p>
        {exp.funciones && <p className="item-descripcion">{exp.funciones}</p>}
      </div>
    </div>
  );
}
function ItemProy({ proyecto }) {
  return (
    <div className="proyecto-card">
      <div className="proyecto-header">
        <MdRocketLaunch size={19} className="proyecto-icono" />
        <div><p className="proyecto-nombre">{proyecto.nombre}</p>{proyecto.rol && <p className="proyecto-rol">{proyecto.rol}</p>}</div>
      </div>
      {proyecto.descripcion && <p className="proyecto-desc">{proyecto.descripcion}</p>}
      <div className="proyecto-meta">
        {proyecto.tecnologias && <div className="proyecto-tags">{proyecto.tecnologias.split(",").map((t, i) => <span key={i} className="tag tag-tecnico tag-sm">{t.trim()}</span>)}</div>}
        {proyecto.url && <a href={proyecto.url} target="_blank" rel="noopener noreferrer" className="proyecto-link"><FiExternalLink size={11} /> Ver proyecto</a>}
      </div>
    </div>
  );
}
function ItemEdu({ edu }) {
  const p = edu.actualmente ? `${edu.desdeM} ${edu.desdeA} — Actualidad` : `${edu.desdeM} ${edu.desdeA}${edu.hastaA ? ` — ${edu.hastaM} ${edu.hastaA}` : ""}`;
  return (
    <div className="item-lista">
      <div className="item-icono"><MdSchool size={18} /></div>
      <div className="item-contenido">
        <p className="item-titulo">{edu.institucion}</p>
        {edu.carrera && <p className="item-subtitulo">{edu.carrera}</p>}
        <p className="item-fecha">{edu.nivel} · {p}</p>
      </div>
    </div>
  );
}
function ItemCurso({ curso }) {
  return (
    <div className="curso-item">
      <div className="curso-icono">{curso.tipo === "Certificado" ? <BsTrophy size={15} /> : <MdMenuBook size={15} />}</div>
      <div className="curso-contenido">
        <p className="curso-nombre">{curso.nombre}</p>
        {curso.institucion && <p className="curso-inst">{curso.institucion}</p>}
        <div className="curso-meta">
          {curso.tipo && <span className="tag-curso">{curso.tipo}</span>}
          {curso.anio && <span className="curso-fecha">{curso.anio}</span>}
        </div>
      </div>
    </div>
  );
}
function PantallaCarga() {
  return <div className="pantalla-carga"><div className="spinner-bcp" /><p>Cargando tu perfil...</p></div>;
}
function SinSesion() {
  return <div className="pantalla-carga"><p>No has iniciado sesión.</p></div>;
}

/* ══ MODAL BASE ══ */
function Modal({ abierto, onCerrar, titulo, children }) {
  if (!abierto) return null;
  return (
    <div className="modal-overlay" onClick={onCerrar}>
      <div className="modal-caja" onClick={e => e.stopPropagation()}>
        <div className="modal-cabecera">
          <h4 className="modal-titulo">{titulo}</h4>
          <button className="modal-cerrar" onClick={onCerrar}><FiX size={14} /></button>
        </div>
        <div className="modal-cuerpo">{children}</div>
      </div>
    </div>
  );
}

/* helpers form */
const FG = ({ label, children, hint }) => (<div className="form-grupo">{label && <label className="form-label">{label}</label>}{children}{hint && <span className="form-hint">{hint}</span>}</div>);
const FRow = ({ children }) => <div className="form-fila">{children}</div>;
const Inp = (props) => <input className="form-input" {...props} />;
const Sel = ({ children, ...props }) => <select className="form-input" {...props}>{children}</select>;
const Txt = (props) => <textarea className="form-input form-textarea" {...props} />;
const MFooter = ({ onCerrar, onGuardar, label = "Guardar cambios", loading }) => (
  <div className="modal-footer">
    <button className="btn-cancelar" onClick={onCerrar}>Cancelar</button>
    <button className="btn-guardar" onClick={onGuardar} disabled={loading}>{loading ? "Guardando..." : label}</button>
  </div>
);
const Chk = ({ checked, onChange, label }) => (
  <div className="form-check-row" onClick={() => onChange(!checked)}>
    <div className={`check-box ${checked ? "check-on" : ""}`}>{checked && <FiCheck size={10} />}</div>
    <label className="form-label" style={{ cursor: "pointer", margin: 0 }}>{label}</label>
  </div>
);

/* ══════════════════════════════════════════
   MODAL: ROTACIÓN BCP  ← NUEVO
══════════════════════════════════════════ */
function ModalRotacion({ abierto, onCerrar, perfil, onGuardar, modoEdicion = false, itemEdicion = null, onGuardarEdicion }) {
  const init = itemEdicion || {};
  const [area, setArea] = useState(init.area || "");
  const [desdeM, setDesdeM] = useState(init.desdeM || "");
  const [desdeA, setDesdeA] = useState(init.desdeA || "");
  const [hastaM, setHastaM] = useState(init.hastaM || "");
  const [hastaA, setHastaA] = useState(init.hastaA || "");
  const [actual, setActual] = useState(init.actualmente || false);
  const [logros, setLogros] = useState(init.logros || "");
  const [loading, setLoading] = useState(false);

  useEffect(() => { if (itemEdicion) { setArea(itemEdicion.area || ""); setDesdeM(itemEdicion.desdeM || ""); setDesdeA(itemEdicion.desdeA || ""); setHastaM(itemEdicion.hastaM || ""); setHastaA(itemEdicion.hastaA || ""); setActual(itemEdicion.actualmente || false); setLogros(itemEdicion.logros || ""); } }, [itemEdicion]);
  const limpiar = () => { setArea(""); setDesdeM(""); setDesdeA(""); setHastaM(""); setHastaA(""); setActual(false); setLogros(""); };

  const guardar = async () => {
    if (!area) { Swal.fire({ icon: "warning", title: "Selecciona un área", confirmButtonColor: "#003DA5" }); return; }
    if (!desdeA) { Swal.fire({ icon: "warning", title: "Indica el año de inicio", confirmButtonColor: "#003DA5" }); return; }
    if (!actual && !hastaA) { Swal.fire({ icon: "warning", title: "Indica hasta cuándo o marca 'Actualmente'", confirmButtonColor: "#003DA5" }); return; }
    const item = { area, desdeM, desdeA, hastaM: actual ? "" : hastaM, hastaA: actual ? "" : hastaA, actualmente: actual, logros };
    setLoading(true);
    if (modoEdicion) { await onGuardarEdicion(item); }
    else { await onGuardar({ rotaciones: [...(perfil?.rotaciones || []), item] }); limpiar(); }
    setLoading(false); onCerrar();
  };

  return (
    <Modal abierto={abierto} onCerrar={onCerrar} titulo={modoEdicion ? "Editar rotación" : "Añadir área del BCP"}>
      <div className="rot-modal-info">
        Registra las áreas del banco por las que has rotado. Esta sección es exclusiva para tu trayectoria interna en el BCP.
      </div>

      <FG label="Área del BCP *">
        <Sel value={area} onChange={e => setArea(e.target.value)}>
          <option value="">Selecciona un área</option>
          {AREAS_BCP.map(a => <option key={a}>{a}</option>)}
        </Sel>
      </FG>

      <Chk checked={actual} onChange={setActual} label="Es mi área actual" />

      <p className="form-sublabel">Desde *</p>
      <FRow>
        <FG label="Mes"><Sel value={desdeM} onChange={e => setDesdeM(e.target.value)}><option value="">Mes</option>{MESES.map(m => <option key={m}>{m}</option>)}</Sel></FG>
        <FG label="Año *"><Sel value={desdeA} onChange={e => setDesdeA(e.target.value)}><option value="">Año</option>{ANIOS.map(a => <option key={a}>{a}</option>)}</Sel></FG>
      </FRow>

      {!actual && (
        <>
          <p className="form-sublabel">Hasta *</p>
          <FRow>
            <FG label="Mes"><Sel value={hastaM} onChange={e => setHastaM(e.target.value)}><option value="">Mes</option>{MESES.map(m => <option key={m}>{m}</option>)}</Sel></FG>
            <FG label="Año"><Sel value={hastaA} onChange={e => setHastaA(e.target.value)}><option value="">Año</option>{ANIOS.map(a => <option key={a}>{a}</option>)}</Sel></FG>
          </FRow>
        </>
      )}

      <FG label="Logros y aprendizajes en esta área (máx. 400 caracteres)">
        <Txt rows={4} maxLength={400} placeholder={`Ej: Lideré el análisis de datos de 3 campañas con un impacto de +15% en conversión. Aprendí a utilizar Power BI y mejoré mis habilidades en SQL...`} value={logros} onChange={e => setLogros(e.target.value)} />
        <span className="form-contador">{logros.length}/400</span>
      </FG>

      <MFooter onCerrar={onCerrar} onGuardar={guardar} loading={loading} label={modoEdicion ? "Guardar cambios" : "Añadir área"} />
    </Modal>
  );
}

/* ══════════════════════════════════════════
   MODAL: HEADER
══════════════════════════════════════════ */
function ModalHeader({ abierto, onCerrar, perfil, onGuardar }) {
  const [nombre, setNombre] = useState(perfil?.nombre || "");
  const [apellidos, setApellidos] = useState(perfil?.apellidos || "");
  const [titulo, setTitulo] = useState(perfil?.titulo || "");
  const [area, setArea] = useState(perfil?.area || "");
  const [resumen, setResumen] = useState(perfil?.resumen || "");
  const [intereses, setIntereses] = useState(perfil?.intereses || "");
  useEffect(() => { setNombre(perfil?.nombre || ""); setApellidos(perfil?.apellidos || ""); setTitulo(perfil?.titulo || ""); setArea(perfil?.area || ""); setResumen(perfil?.resumen || ""); setIntereses(perfil?.intereses || ""); }, [perfil]);
  const guardar = async () => {
    if (!titulo.trim()) { Swal.fire({ icon: "warning", title: "El título es obligatorio", confirmButtonColor: "#003DA5" }); return; }
    await onGuardar({ nombre, apellidos, titulo, area, resumen, intereses, perfilCompleto: true }); onCerrar();
  };
  return (
    <Modal abierto={abierto} onCerrar={onCerrar} titulo="Editar información principal">
      <FRow><FG label="Nombre *"><Inp placeholder="Tu nombre" value={nombre} onChange={e => setNombre(e.target.value)} /></FG>
        <FG label="Apellidos"><Inp placeholder="Tus apellidos" value={apellidos} onChange={e => setApellidos(e.target.value)} /></FG></FRow>
      <FG label="Título profesional *"><Inp placeholder="Ej: Desarrolladora Web Junior | Analista de Datos" value={titulo} onChange={e => setTitulo(e.target.value)} /></FG>
      <FG label="Área de trabajo">
        <Sel value={area} onChange={e => setArea(e.target.value)}>
          <option value="">Selecciona un área</option>
          {AREAS_BCP.map(a => <option key={a}>{a}</option>)}
        </Sel>
      </FG>
      <FG label="Resumen profesional">
        <Txt rows={4} maxLength={500} placeholder="Cuéntale a los líderes del BCP quién eres..." value={resumen} onChange={e => setResumen(e.target.value)} />
        <span className="form-contador">{resumen.length}/500</span>
      </FG>
      <FG label="Intereses profesionales"><Inp placeholder="Ej: Data Science, Innovación, Fintech, UX..." value={intereses} onChange={e => setIntereses(e.target.value)} /></FG>
      <MFooter onCerrar={onCerrar} onGuardar={guardar} />
    </Modal>
  );
}

/* ══════════════════════════════════════════
   MODAL: DATOS PERSONALES
══════════════════════════════════════════ */
function ModalDatos({ abierto, onCerrar, perfil, onGuardar }) {
  const [telefono, setTelefono] = useState(perfil?.telefono || "");
  const [pais, setPais] = useState(perfil?.pais || "Perú");
  const [ciudad, setCiudad] = useState(perfil?.ciudad || "");
  const [distrito, setDistrito] = useState(perfil?.distrito || "");
  const [fechaNac, setFechaNac] = useState(perfil?.fechaNacimiento || "");
  const [genero, setGenero] = useState(perfil?.genero || "");
  const [linkedin, setLinkedin] = useState(perfil?.linkedin || "");
  const [github, setGithub] = useState(perfil?.github || "");
  useEffect(() => { setTelefono(perfil?.telefono || ""); setPais(perfil?.pais || "Perú"); setCiudad(perfil?.ciudad || ""); setDistrito(perfil?.distrito || ""); setFechaNac(perfil?.fechaNacimiento || ""); setGenero(perfil?.genero || ""); setLinkedin(perfil?.linkedin || ""); setGithub(perfil?.github || ""); }, [perfil]);
  return (
    <Modal abierto={abierto} onCerrar={onCerrar} titulo="Datos personales">
      <FRow><FG label="Teléfono"><Inp placeholder="+51 999 999 999" value={telefono} onChange={e => setTelefono(e.target.value)} /></FG>
        <FG label="Género"><Sel value={genero} onChange={e => setGenero(e.target.value)}><option value="">Selecciona</option><option>Hombre</option><option>Mujer</option><option>Prefiero no decir</option><option>Otro</option></Sel></FG></FRow>
      <FG label="Fecha de nacimiento"><input type="date" className="form-input" value={fechaNac} onChange={e => setFechaNac(e.target.value)} /></FG>
      <FG label="País"><Sel value={pais} onChange={e => setPais(e.target.value)}>{PAISES.map(p => <option key={p}>{p}</option>)}</Sel></FG>
      <FRow><FG label="Ciudad / Región"><Inp placeholder="Ej: Lima" value={ciudad} onChange={e => setCiudad(e.target.value)} /></FG>
        <FG label="Distrito"><Inp placeholder="Ej: San Martín de Porres" value={distrito} onChange={e => setDistrito(e.target.value)} /></FG></FRow>
      <FG label="LinkedIn (opcional)"><Inp placeholder="https://linkedin.com/in/tu-perfil" value={linkedin} onChange={e => setLinkedin(e.target.value)} /></FG>
      <FG label="GitHub (opcional)"><Inp placeholder="https://github.com/tu-usuario" value={github} onChange={e => setGithub(e.target.value)} /></FG>
      <MFooter onCerrar={onCerrar} onGuardar={async () => { await onGuardar({ telefono, pais, ciudad, distrito, fechaNacimiento: fechaNac, genero, linkedin, github }); onCerrar(); }} />
    </Modal>
  );
}

function Toggle({ label, desc, val, onChange }) {
  return (
    <div className="toggle-opcion" onClick={() => onChange(!val)}>
      <div><p className="toggle-label">{label}</p><p className="toggle-desc">{desc}</p></div>
      <div className={`toggle-switch ${val ? "toggle-on" : "toggle-off"}`}><div className="toggle-bola" /></div>
    </div>
  );
}

/* ══ MODAL EXPERIENCIA ══ */
function ModalExp({ abierto, onCerrar, perfil, onGuardar, modoEdicion = false, itemEdicion = null, onGuardarEdicion }) {
  const init = itemEdicion || {};
  const [cargo, setCargo] = useState(init.cargo || ""); const [empresa, setEmpresa] = useState(init.empresa || "");
  const [funcs, setFuncs] = useState(init.funciones || ""); const [desdeM, setDesdeM] = useState(init.desdeM || "");
  const [desdeA, setDesdeA] = useState(init.desdeA || ""); const [hastaM, setHastaM] = useState(init.hastaM || "");
  const [hastaA, setHastaA] = useState(init.hastaA || ""); const [actual, setActual] = useState(init.actualmente || false);
  const [loading, setLoading] = useState(false);
  useEffect(() => { if (itemEdicion) { setCargo(itemEdicion.cargo || ""); setEmpresa(itemEdicion.empresa || ""); setFuncs(itemEdicion.funciones || ""); setDesdeM(itemEdicion.desdeM || ""); setDesdeA(itemEdicion.desdeA || ""); setHastaM(itemEdicion.hastaM || ""); setHastaA(itemEdicion.hastaA || ""); setActual(itemEdicion.actualmente || false); } }, [itemEdicion]);
  const limpiar = () => { setCargo(""); setEmpresa(""); setFuncs(""); setDesdeM(""); setDesdeA(""); setHastaM(""); setHastaA(""); setActual(false); };
  const guardar = async () => {
    if (!cargo.trim()) { Swal.fire({ icon: "warning", title: "El cargo es obligatorio", confirmButtonColor: "#003DA5" }); return; }
    if (!desdeM || !desdeA) { Swal.fire({ icon: "warning", title: "Indica la fecha de inicio", confirmButtonColor: "#003DA5" }); return; }
    if (!actual && (!hastaM || !hastaA)) { Swal.fire({ icon: "warning", title: "Indica la fecha de fin o marca 'Actualmente'", confirmButtonColor: "#003DA5" }); return; }
    const item = { cargo, empresa, funciones: funcs, desdeM, desdeA, hastaM: actual ? "" : hastaM, hastaA: actual ? "" : hastaA, actualmente: actual };
    setLoading(true);
    if (modoEdicion) { await onGuardarEdicion(item); } else { await onGuardar({ experiencia: [...(perfil?.experiencia || []), item] }); limpiar(); }
    setLoading(false); onCerrar();
  };
  return (
    <Modal abierto={abierto} onCerrar={onCerrar} titulo={modoEdicion ? "Editar experiencia" : "Añadir experiencia"}>
      <FG label="Cargo *"><Inp placeholder="Ej: Practicante de Desarrollo Web" value={cargo} onChange={e => setCargo(e.target.value)} /></FG>
      <FG label="Empresa u organización"><Inp placeholder="Ej: BCP, UNICEF, Proyecto académico" value={empresa} onChange={e => setEmpresa(e.target.value)} /></FG>
      <Chk checked={actual} onChange={setActual} label="Trabajo aquí actualmente" />
      <p className="form-sublabel">Desde *</p>
      <FRow><FG label="Mes"><Sel value={desdeM} onChange={e => setDesdeM(e.target.value)}><option value="">Mes</option>{MESES.map(m => <option key={m}>{m}</option>)}</Sel></FG>
        <FG label="Año"><Sel value={desdeA} onChange={e => setDesdeA(e.target.value)}><option value="">Año</option>{ANIOS.map(a => <option key={a}>{a}</option>)}</Sel></FG></FRow>
      {!actual && (<><p className="form-sublabel">Hasta *</p><FRow><FG label="Mes"><Sel value={hastaM} onChange={e => setHastaM(e.target.value)}><option value="">Mes</option>{MESES.map(m => <option key={m}>{m}</option>)}</Sel></FG><FG label="Año"><Sel value={hastaA} onChange={e => setHastaA(e.target.value)}><option value="">Año</option>{ANIOS.map(a => <option key={a}>{a}</option>)}</Sel></FG></FRow></>)}
      <FG label="Funciones y logros (máx. 500)"><Txt rows={4} maxLength={500} placeholder="Describe tus responsabilidades y logros..." value={funcs} onChange={e => setFuncs(e.target.value)} /><span className="form-contador">{funcs.length}/500</span></FG>
      <MFooter onCerrar={onCerrar} onGuardar={guardar} loading={loading} label={modoEdicion ? "Guardar cambios" : "Añadir experiencia"} />
    </Modal>
  );
}

/* ══ MODAL PROYECTO ══ */
function ModalProy({ abierto, onCerrar, perfil, onGuardar, modoEdicion = false, itemEdicion = null, onGuardarEdicion }) {
  const init = itemEdicion || {};
  const [nombre, setNombre] = useState(init.nombre || ""); const [rol, setRol] = useState(init.rol || "");
  const [desc, setDesc] = useState(init.descripcion || ""); const [tecno, setTecno] = useState(init.tecnologias || "");
  const [url, setUrl] = useState(init.url || ""); const [loading, setLoading] = useState(false);
  useEffect(() => { if (itemEdicion) { setNombre(itemEdicion.nombre || ""); setRol(itemEdicion.rol || ""); setDesc(itemEdicion.descripcion || ""); setTecno(itemEdicion.tecnologias || ""); setUrl(itemEdicion.url || ""); } }, [itemEdicion]);
  const limpiar = () => { setNombre(""); setRol(""); setDesc(""); setTecno(""); setUrl(""); };
  const guardar = async () => {
    if (!nombre.trim()) { Swal.fire({ icon: "warning", title: "El nombre del proyecto es obligatorio", confirmButtonColor: "#003DA5" }); return; }
    const item = { nombre, rol, descripcion: desc, tecnologias: tecno, url }; setLoading(true);
    if (modoEdicion) { await onGuardarEdicion(item); } else { await onGuardar({ proyectos: [...(perfil?.proyectos || []), item] }); limpiar(); }
    setLoading(false); onCerrar();
  };
  return (
    <Modal abierto={abierto} onCerrar={onCerrar} titulo={modoEdicion ? "Editar proyecto" : "Añadir proyecto"}>
      <FG label="Nombre *"><Inp placeholder="Ej: TalentoBCP, App de Trivia..." value={nombre} onChange={e => setNombre(e.target.value)} /></FG>
      <FG label="Tu rol"><Inp placeholder="Ej: Desarrolladora Frontend" value={rol} onChange={e => setRol(e.target.value)} /></FG>
      <FG label="Descripción"><Txt rows={3} maxLength={300} placeholder="¿Qué resolviste? ¿Cuál fue el impacto?" value={desc} onChange={e => setDesc(e.target.value)} /><span className="form-contador">{desc.length}/300</span></FG>
      <FG label="Tecnologías (separa con comas)"><Inp placeholder="React, Firebase, Bootstrap..." value={tecno} onChange={e => setTecno(e.target.value)} /></FG>
      <FG label="URL (opcional)"><Inp placeholder="https://mi-proyecto.vercel.app" value={url} onChange={e => setUrl(e.target.value)} /></FG>
      <MFooter onCerrar={onCerrar} onGuardar={guardar} loading={loading} label={modoEdicion ? "Guardar cambios" : "Añadir proyecto"} />
    </Modal>
  );
}

/* ══ MODAL EDUCACIÓN ══ */
function ModalEdu({ abierto, onCerrar, perfil, onGuardar, modoEdicion = false, itemEdicion = null, onGuardarEdicion }) {
  const init = itemEdicion || {};
  const [inst, setInst] = useState(init.institucion || ""); const [carrera, setCarrera] = useState(init.carrera || "");
  const [nivel, setNivel] = useState(init.nivel || ""); const [desdeM, setDesdeM] = useState(init.desdeM || "");
  const [desdeA, setDesdeA] = useState(init.desdeA || ""); const [hastaM, setHastaM] = useState(init.hastaM || "");
  const [hastaA, setHastaA] = useState(init.hastaA || ""); const [actual, setActual] = useState(init.actualmente || false);
  const [loading, setLoading] = useState(false);
  useEffect(() => { if (itemEdicion) { setInst(itemEdicion.institucion || ""); setCarrera(itemEdicion.carrera || ""); setNivel(itemEdicion.nivel || ""); setDesdeM(itemEdicion.desdeM || ""); setDesdeA(itemEdicion.desdeA || ""); setHastaM(itemEdicion.hastaM || ""); setHastaA(itemEdicion.hastaA || ""); setActual(itemEdicion.actualmente || false); } }, [itemEdicion]);
  const limpiar = () => { setInst(""); setCarrera(""); setNivel(""); setDesdeM(""); setDesdeA(""); setHastaM(""); setHastaA(""); setActual(false); };
  const guardar = async () => {
    if (!inst.trim()) { Swal.fire({ icon: "warning", title: "La institución es obligatoria", confirmButtonColor: "#003DA5" }); return; }
    if (!desdeA) { Swal.fire({ icon: "warning", title: "Indica el año de inicio", confirmButtonColor: "#003DA5" }); return; }
    const item = { institucion: inst, carrera, nivel, desdeM, desdeA, hastaM: actual ? "" : hastaM, hastaA: actual ? "" : hastaA, actualmente: actual };
    setLoading(true);
    if (modoEdicion) { await onGuardarEdicion(item); } else { await onGuardar({ educacion: [...(perfil?.educacion || []), item] }); limpiar(); }
    setLoading(false); onCerrar();
  };
  return (
    <Modal abierto={abierto} onCerrar={onCerrar} titulo={modoEdicion ? "Editar formación" : "Añadir formación"}>
      <FG label="Institución *"><Inp placeholder="Ej: CIBERTEC, PUCP, UPC..." value={inst} onChange={e => setInst(e.target.value)} /></FG>
      <FG label="Carrera / Programa"><Inp placeholder="Ej: Computación e Informática" value={carrera} onChange={e => setCarrera(e.target.value)} /></FG>
      <FG label="Nivel"><Sel value={nivel} onChange={e => setNivel(e.target.value)}><option value="">Selecciona nivel</option>{NIVELES_EDUCACION.map(n => <option key={n}>{n}</option>)}</Sel></FG>
      <Chk checked={actual} onChange={setActual} label="Estudio aquí actualmente" />
      <p className="form-sublabel">Desde *</p>
      <FRow><FG label="Mes"><Sel value={desdeM} onChange={e => setDesdeM(e.target.value)}><option value="">Mes</option>{MESES.map(m => <option key={m}>{m}</option>)}</Sel></FG>
        <FG label="Año *"><Sel value={desdeA} onChange={e => setDesdeA(e.target.value)}><option value="">Año</option>{ANIOS.map(a => <option key={a}>{a}</option>)}</Sel></FG></FRow>
      {!actual && (<><p className="form-sublabel">Hasta</p><FRow><FG label="Mes"><Sel value={hastaM} onChange={e => setHastaM(e.target.value)}><option value="">Mes</option>{MESES.map(m => <option key={m}>{m}</option>)}</Sel></FG><FG label="Año"><Sel value={hastaA} onChange={e => setHastaA(e.target.value)}><option value="">Año</option>{ANIOS.map(a => <option key={a}>{a}</option>)}</Sel></FG></FRow></>)}
      <MFooter onCerrar={onCerrar} onGuardar={guardar} loading={loading} label={modoEdicion ? "Guardar cambios" : "Añadir formación"} />
    </Modal>
  );
}

/* ══ MODAL IDIOMAS ══ */
function ModalIdiomas({ abierto, onCerrar, perfil, onGuardar }) {
  const [lista, setLista] = useState(perfil?.idiomas || []);
  const [nuevoId, setNuevoId] = useState("");
  const [nuevoNv, setNuevoNv] = useState("");

  /* Sincronizar cuando cambia el perfil o se abre el modal */
  useEffect(() => {
    setLista(perfil?.idiomas || []);
    setNuevoId("");
    setNuevoNv("");
  }, [perfil, abierto]);

  /* Agregar a la lista local (sin guardar aún) */
  const agregar = () => {
    if (!nuevoId) {
      Swal.fire({ icon: "warning", title: "Selecciona un idioma", confirmButtonColor: "#003DA5" });
      return;
    }
    if (!nuevoNv) {
      Swal.fire({ icon: "warning", title: "Selecciona el nivel", confirmButtonColor: "#003DA5" });
      return;
    }
    if (lista.find(l => l.idioma === nuevoId)) {
      Swal.fire({ icon: "warning", title: "Ese idioma ya está en tu lista", confirmButtonColor: "#003DA5" });
      return;
    }
    setLista(prev => [...prev, { idioma: nuevoId, nivel: nuevoNv }]);
    setNuevoId("");
    setNuevoNv("");
  };

  /* Eliminar de la lista local */
  const eliminar = (i) => setLista(prev => prev.filter((_, j) => j !== i));

  /* Cambiar nivel de un idioma ya en la lista */
  const cambiarNivel = (i, nuevoNivel) => {
    setLista(prev => prev.map((item, j) => j === i ? { ...item, nivel: nuevoNivel } : item));
  };

  /* Guardar todo a Firestore */
  const guardar = async () => {
    await onGuardar({ idiomas: lista });
    onCerrar();
  };

  return (
    <Modal abierto={abierto} onCerrar={onCerrar} titulo="Idiomas">

      {/* Lista de idiomas ya añadidos */}
      {lista.length > 0 && (
        <div className="idiomas-editar-lista">
          {lista.map((l, i) => (
            <div key={i} className="idioma-editar-row">
              <span className="idioma-nombre">{l.idioma}</span>
              <select
                className="form-input idioma-nivel-select"
                value={l.nivel}
                onChange={e => cambiarNivel(i, e.target.value)}
              >
                {NIVELES_IDIOMA.map(n => <option key={n}>{n}</option>)}
              </select>
              <button className="btn-eliminar" onClick={() => eliminar(i)}>
                <FiTrash2 size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Añadir nuevo idioma */}
      <p className="form-sublabel" style={{ marginTop: lista.length > 0 ? 16 : 0 }}>
        Agregar idioma
      </p>
      <div className="form-fila">
        <div className="form-grupo">
          <label className="form-label">Idioma</label>
          <select
            className="form-input"
            value={nuevoId}
            onChange={e => setNuevoId(e.target.value)}
          >
            <option value="">Selecciona</option>
            {IDIOMAS_LISTA.map(id => <option key={id}>{id}</option>)}
          </select>
        </div>
        <div className="form-grupo">
          <label className="form-label">Nivel</label>
          <select
            className="form-input"
            value={nuevoNv}
            onChange={e => setNuevoNv(e.target.value)}
          >
            <option value="">Nivel</option>
            {NIVELES_IDIOMA.map(n => <option key={n}>{n}</option>)}
          </select>
        </div>
      </div>

      <button className="btn-agregar-row" onClick={agregar}>
        <FiPlus size={12} /> Agregar idioma
      </button>

      <MFooter onCerrar={onCerrar} onGuardar={guardar} />
    </Modal>
  );
}

/* ══ MODAL CURSO ══ */
function ModalCurso({ abierto, onCerrar, perfil, onGuardar, modoEdicion = false, itemEdicion = null, onGuardarEdicion }) {
  const init = itemEdicion || {};
  const [nombre, setNombre] = useState(init.nombre || ""); const [inst, setInst] = useState(init.institucion || "");
  const [tipo, setTipo] = useState(init.tipo || "Curso"); const [anio, setAnio] = useState(init.anio || ""); const [loading, setLoading] = useState(false);
  useEffect(() => { if (itemEdicion) { setNombre(itemEdicion.nombre || ""); setInst(itemEdicion.institucion || ""); setTipo(itemEdicion.tipo || "Curso"); setAnio(itemEdicion.anio || ""); } }, [itemEdicion]);
  const limpiar = () => { setNombre(""); setInst(""); setTipo("Curso"); setAnio(""); };
  const guardar = async () => {
    if (!nombre.trim()) { Swal.fire({ icon: "warning", title: "El nombre es obligatorio", confirmButtonColor: "#003DA5" }); return; }
    const item = { nombre, institucion: inst, tipo, anio }; setLoading(true);
    if (modoEdicion) { await onGuardarEdicion(item); } else { await onGuardar({ cursos: [...(perfil?.cursos || []), item] }); limpiar(); }
    setLoading(false); onCerrar();
  };
  return (
    <Modal abierto={abierto} onCerrar={onCerrar} titulo={modoEdicion ? "Editar curso" : "Añadir curso o certificado"}>
      <FG label="Tipo"><div className="tipo-tabs">{["Curso", "Certificado", "Programa", "Diplomado", "Bootcamp"].map(t => <button key={t} className={`tipo-tab ${tipo === t ? "tipo-tab-activo" : ""}`} onClick={() => setTipo(t)}>{t}</button>)}</div></FG>
      <FG label="Nombre *"><Inp placeholder="Ej: Google Data Analytics, AWS..." value={nombre} onChange={e => setNombre(e.target.value)} /></FG>
      <FG label="Institución / Plataforma"><Inp placeholder="Ej: Coursera, Udemy, BCP..." value={inst} onChange={e => setInst(e.target.value)} /></FG>
      <FG label="Año"><Sel value={anio} onChange={e => setAnio(e.target.value)}><option value="">Selecciona año</option>{ANIOS.slice(0, 10).map(a => <option key={a}>{a}</option>)}</Sel></FG>
      <MFooter onCerrar={onCerrar} onGuardar={guardar} loading={loading} label={modoEdicion ? "Guardar cambios" : "Añadir"} />
    </Modal>
  );
}

/* ═══════════════════════════════════════════════════════════
   CATÁLOGO PREDEFINIDO DE SKILLS — normalizado en Title Case
   Esto garantiza consistencia en Firestore y en los filtros.
═══════════════════════════════════════════════════════════ */
const SKILLS_TECNICAS_PREDEFINIDAS = {
  "Programación": [
    "Python", "JavaScript", "TypeScript", "Java", "C++", "C#", "Kotlin", "Swift",
    "Go", "Rust", "PHP", "Ruby", "R", "Scala", "MATLAB",
  ],
  "Web & Mobile": [
    "React", "React Native", "Angular", "Vue.js", "Next.js", "Node.js",
    "Express", "Django", "FastAPI", "Spring Boot", "Flutter", "Ionic",
  ],
  "Datos & IA": [
    "SQL", "Power BI", "Tableau", "Excel Avanzado", "Machine Learning",
    "Deep Learning", "TensorFlow", "PyTorch", "Pandas", "NumPy",
    "Data Science", "Big Data", "Spark", "ETL", "Looker Studio",
  ],
  "Cloud & DevOps": [
    "AWS", "Azure", "Google Cloud", "Docker", "Kubernetes", "Git",
    "CI/CD", "Linux", "Firebase", "Terraform",
  ],
  "Diseño & UX": [
    "Figma", "Adobe XD", "Photoshop", "Illustrator", "UX Research",
    "UI Design", "Prototyping",
  ],
  "Herramientas": [
    "SAP", "Salesforce", "Jira", "Confluence", "Notion", "Trello",
    "Power Automate", "Postman", "Excel", "Word", "PowerPoint",
  ],
  "Finanzas & Negocios": [
    "Análisis Financiero", "Contabilidad", "Auditoría", "Bloomberg",
    "Gestión de Riesgos", "Finanzas Corporativas", "Mercado de Capitales",
  ],
};

const HABILIDADES_BLANDAS_PREDEFINIDAS = [
  "Liderazgo", "Trabajo en equipo", "Comunicación efectiva", "Pensamiento crítico",
  "Resolución de problemas", "Adaptabilidad", "Gestión del tiempo", "Creatividad",
  "Orientación a resultados", "Inteligencia emocional", "Proactividad", "Empatía",
  "Negociación", "Presentaciones", "Toma de decisiones", "Aprendizaje continuo",
  "Atención al detalle", "Organización", "Colaboración", "Mentoría",
];

/* Normaliza un string: quita espacios, hace Title Case */
const normalizar = (s) =>
  s.trim().replace(/\w+/g, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());

/* ══ MODAL HABILIDADES — con selector predefinido ══ */
function ModalHab({ abierto, onCerrar, perfil, onGuardar }) {
  const [selTec, setSelTec] = useState(perfil?.skills || []);
  const [selBla, setSelBla] = useState(perfil?.habilidadesBlandas || []);
  const [customTec, setCustomTec] = useState("");
  const [customBla, setCustomBla] = useState("");
  const [tabHab, setTabHab] = useState("tecnicas");
  const [busqTec, setBusqTec] = useState("");
  const [busqBla, setBusqBla] = useState("");

  useEffect(() => {
    setSelTec(perfil?.skills || []);
    setSelBla(perfil?.habilidadesBlandas || []);
  }, [perfil, abierto]);

  /* Toggle técnica */
  const tglTec = (skill) =>
    setSelTec((prev) =>
      prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill]
    );

  /* Toggle blanda */
  const tglBla = (skill) =>
    setSelBla((prev) =>
      prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill]
    );

  /* Añadir skill personalizada técnica */
  const addCustomTec = () => {
    const val = normalizar(customTec);
    if (!val) return;
    /* buscar si ya existe con nombre similar (case-insensitive) */
    const yaExiste = selTec.some((s) => s.toLowerCase() === val.toLowerCase());
    if (yaExiste) {
      Swal.fire({ icon: "warning", title: "Esa skill ya está en tu lista", confirmButtonColor: "#003DA5" });
      return;
    }
    /* buscar si hay una versión predefinida */
    const predefinida = Object.values(SKILLS_TECNICAS_PREDEFINIDAS)
      .flat()
      .find((s) => s.toLowerCase() === val.toLowerCase());
    setSelTec((prev) => [...prev, predefinida || val]);
    setCustomTec("");
  };

  /* Añadir habilidad blanda personalizada */
  const addCustomBla = () => {
    const val = normalizar(customBla);
    if (!val) return;
    const yaExiste = selBla.some((s) => s.toLowerCase() === val.toLowerCase());
    if (yaExiste) {
      Swal.fire({ icon: "warning", title: "Esa habilidad ya está en tu lista", confirmButtonColor: "#003DA5" });
      return;
    }
    const predefinida = HABILIDADES_BLANDAS_PREDEFINIDAS
      .find((s) => s.toLowerCase() === val.toLowerCase());
    setSelBla((prev) => [...prev, predefinida || val]);
    setCustomBla("");
  };

  const guardar = async () => {
    if (!selTec.length && !selBla.length) {
      Swal.fire({ icon: "warning", title: "Añade al menos una habilidad", confirmButtonColor: "#003DA5" });
      return;
    }
    await onGuardar({ skills: selTec, habilidadesBlandas: selBla });
    onCerrar();
  };

  /* Filtrar skills predefinidas por búsqueda */
  const categsFiltradas = Object.entries(SKILLS_TECNICAS_PREDEFINIDAS).reduce((acc, [cat, items]) => {
    const filtrados = items.filter((s) => s.toLowerCase().includes(busqTec.toLowerCase()));
    if (filtrados.length > 0) acc[cat] = filtrados;
    return acc;
  }, {});

  const blasFiltradas = HABILIDADES_BLANDAS_PREDEFINIDAS.filter((s) =>
    s.toLowerCase().includes(busqBla.toLowerCase())
  );

  return (
    <Modal abierto={abierto} onCerrar={onCerrar} titulo="Editar habilidades">

      {/* Tabs */}
      <div className="hab-tabs">
        <button
          className={`hab-tab ${tabHab === "tecnicas" ? "hab-tab-activo" : ""}`}
          onClick={() => setTabHab("tecnicas")}
        >
          Técnicas
          {selTec.length > 0 && <span className="hab-tab-badge">{selTec.length}</span>}
        </button>
        <button
          className={`hab-tab ${tabHab === "blandas" ? "hab-tab-activo" : ""}`}
          onClick={() => setTabHab("blandas")}
        >
          Blandas
          {selBla.length > 0 && <span className="hab-tab-badge">{selBla.length}</span>}
        </button>
      </div>

      {/* ── TAB TÉCNICAS ── */}
      {tabHab === "tecnicas" && (
        <div>
          <p className="hab-hint">Selecciona de la lista o añade una personalizada. Las skills se normalizan automáticamente para evitar duplicados.</p>

          {/* Buscador */}
          <div className="hab-search-wrap">
            <FiSearch size={13} color="#94a3b8" />
            <input
              className="hab-search"
              placeholder="Buscar skill..."
              value={busqTec}
              onChange={(e) => setBusqTec(e.target.value)}
            />
            {busqTec && (
              <button className="hab-search-clear" onClick={() => setBusqTec("")}>
                <FiX size={11} />
              </button>
            )}
          </div>

          {/* Categorías */}
          <div className="hab-categorias">
            {Object.entries(categsFiltradas).map(([cat, items]) => (
              <div key={cat} className="hab-categoria">
                <p className="hab-cat-titulo">{cat}</p>
                <div className="hab-chips-wrap">
                  {items.map((s) => (
                    <button
                      key={s}
                      type="button"
                      className={`hab-chip ${selTec.includes(s) ? "hab-chip-activo" : ""}`}
                      onClick={() => tglTec(s)}
                    >
                      {s}
                      {selTec.includes(s) && <FiX size={10} style={{ marginLeft: 4 }} />}
                    </button>
                  ))}
                </div>
              </div>
            ))}
            {Object.keys(categsFiltradas).length === 0 && busqTec && (
              <p className="hab-empty">No se encontró "{busqTec}" en las predefinidas. Puedes añadirla abajo.</p>
            )}
          </div>

          {/* Añadir skill personalizada */}
          <div className="hab-custom-wrap">
            <p className="hab-custom-label">¿No encuentras tu skill? Añádela:</p>
            <div className="hab-custom-row">
              <input
                className="hab-custom-input"
                placeholder="Ej: Looker, Snowflake, Unreal Engine..."
                value={customTec}
                onChange={(e) => setCustomTec(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addCustomTec()}
              />
              <button className="hab-custom-btn" onClick={addCustomTec}>
                <FiPlus size={14} /> Añadir
              </button>
            </div>
          </div>

          {/* Preview seleccionadas */}
          {selTec.length > 0 && (
            <div className="hab-preview">
              <p className="hab-preview-titulo">Seleccionadas ({selTec.length})</p>
              <div className="hab-preview-tags">
                {selTec.map((s) => (
                  <span key={s} className="tag tag-tecnico hab-tag-quitar" onClick={() => tglTec(s)}>
                    {s} <FiX size={10} />
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── TAB BLANDAS ── */}
      {tabHab === "blandas" && (
        <div>
          <p className="hab-hint">Selecciona tus competencias interpersonales más destacadas.</p>

          {/* Buscador */}
          <div className="hab-search-wrap">
            <FiSearch size={13} color="#94a3b8" />
            <input
              className="hab-search"
              placeholder="Buscar habilidad blanda..."
              value={busqBla}
              onChange={(e) => setBusqBla(e.target.value)}
            />
            {busqBla && (
              <button className="hab-search-clear" onClick={() => setBusqBla("")}>
                <FiX size={11} />
              </button>
            )}
          </div>

          {/* Chips */}
          <div className="hab-chips-wrap" style={{ marginTop: 10 }}>
            {blasFiltradas.map((s) => (
              <button
                key={s}
                type="button"
                className={`hab-chip hab-chip-bla ${selBla.includes(s) ? "hab-chip-bla-activo" : ""}`}
                onClick={() => tglBla(s)}
              >
                {s}
                {selBla.includes(s) && <FiX size={10} style={{ marginLeft: 4 }} />}
              </button>
            ))}
            {blasFiltradas.length === 0 && (
              <p className="hab-empty">Sin resultados. Puedes añadirla abajo.</p>
            )}
          </div>

          {/* Añadir personalizada */}
          <div className="hab-custom-wrap">
            <p className="hab-custom-label">¿No la encuentras? Añádela:</p>
            <div className="hab-custom-row">
              <input
                className="hab-custom-input"
                placeholder="Ej: Facilitación, Coaching..."
                value={customBla}
                onChange={(e) => setCustomBla(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addCustomBla()}
              />
              <button className="hab-custom-btn" onClick={addCustomBla}>
                <FiPlus size={14} /> Añadir
              </button>
            </div>
          </div>

          {/* Preview */}
          {selBla.length > 0 && (
            <div className="hab-preview">
              <p className="hab-preview-titulo">Seleccionadas ({selBla.length})</p>
              <div className="hab-preview-tags">
                {selBla.map((s) => (
                  <span key={s} className="tag tag-blando hab-tag-quitar" onClick={() => tglBla(s)}>
                    {s} <FiX size={10} />
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <MFooter onCerrar={onCerrar} onGuardar={guardar} label="Guardar habilidades" />
    </Modal>
  );
}


export default Perfil;


