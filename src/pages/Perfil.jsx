import { useEffect, useState } from "react";
import { db, auth } from "../firebase/firebase";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  doc,
  arrayUnion,
} from "firebase/firestore";
import Swal from "sweetalert2";
import Navbar from "../components/Navbar.jsx";
import "../stylesheets/Perfil.css";

/* ─── CONSTANTES ─── */
const MESES = [
  "Enero","Febrero","Marzo","Abril","Mayo","Junio",
  "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre",
];
const ANIOS = Array.from({ length: 2026 - 1990 + 1 }, (_, i) => 2026 - i);
const NIVELES_IDIOMA = ["Muy básico","Básico","Intermedio","Avanzado","Nativo"];
const IDIOMAS_LISTA = [
  "Español","Inglés","Portugués","Francés","Alemán","Chino","Japonés",
  "Italiano","Ruso","Árabe","Coreano","Hindi","Neerlandés","Polaco",
  "Turco","Sueco","Noruego","Danés","Finés","Griego","Hebreo",
  "Tailandés","Vietnamita","Indonesio","Malayo","Ucraniano","Catalán",
  "Quechua","Aymara","Otro",
];
const NIVELES_EDUCACION = [
  "Técnico","Universitario (en curso)","Universitario (egresado)",
  "Postgrado","Maestría","Doctorado","Curso / Bootcamp","Intercambio",
];

/* ══════════════════════════════════════════
   COMPONENTE PRINCIPAL
══════════════════════════════════════════ */
function Perfil() {
  const [perfil, setPerfil]     = useState(null);
  const [docId, setDocId]       = useState("");
  const [cargando, setCargando] = useState(true);

  const [modalAcerca,          setModalAcerca]          = useState(false);
  const [modalExperiencia,     setModalExperiencia]     = useState(false);
  const [modalEducacion,       setModalEducacion]       = useState(false);
  const [modalIdiomas,         setModalIdiomas]         = useState(false);
  const [modalCursos,          setModalCursos]          = useState(false);
  const [modalHabilidades,     setModalHabilidades]     = useState(false);
  const [modalMovilidad,       setModalMovilidad]       = useState(false);
  const [modalDatosPersonales, setModalDatosPersonales] = useState(false);
  const [modalProyecto,        setModalProyecto]        = useState(false); // 🆕

  /* ── CARGA PERFIL ── */
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (usuario) => {
      if (!usuario) { setCargando(false); return; }
      try {
        const snap = await getDocs(
          query(collection(db, "practicantes"), where("uid", "==", usuario.uid))
        );
        snap.forEach((item) => { setPerfil(item.data()); setDocId(item.id); });
      } catch (err) {
        Swal.fire({ icon:"error", title:"Error al cargar perfil", text:err.message, confirmButtonColor:"#003DA5" });
      } finally { setCargando(false); }
    });
    return () => unsub();
  }, []);

  /* ── ACTUALIZAR FIRESTORE ── */
  const actualizarPerfil = async (campos) => {
    try {
      await updateDoc(doc(db, "practicantes", docId), campos);
      const snap = await getDocs(
        query(collection(db, "practicantes"), where("uid", "==", auth.currentUser.uid))
      );
      snap.forEach((item) => setPerfil(item.data()));
      Swal.fire({ icon:"success", title:"¡Guardado!", timer:2000, showConfirmButton:false });
    } catch (err) {
      Swal.fire({ icon:"error", title:"No se pudo guardar", text:err.message, confirmButtonColor:"#003DA5" });
    }
  };

  const calcularCompletitud = () => {
    if (!perfil) return 0;
    const campos = [
      perfil.titulo, perfil.resumen, perfil.area, perfil.intereses,
      perfil.experiencia?.length > 0, perfil.educacion?.length > 0,
      perfil.idiomas?.length > 0, perfil.cursos?.length > 0,
      perfil.skills?.length > 0, perfil.habilidadesBlandas?.length > 0,
    ];
    return Math.round(campos.filter(Boolean).length / campos.length * 100);
  };

  if (cargando) return <PantallaCarga />;
  if (!perfil)  return <SinSesion />;

  const completitud = calcularCompletitud();

  return (
    <div className="perfil-wrapper">
      <Navbar />
      <div className="perfil-container">

        {/* ══ SIDEBAR ══ */}
        <aside className="perfil-sidebar">
          <div className="sidebar-card completitud-card">
            <h6 className="sidebar-titulo">Completitud del perfil</h6>
            <div className="barra-progreso-wrapper">
              <div className="barra-progreso-fill" style={{ width:`${completitud}%` }} />
            </div>
            <span className="completitud-numero">{completitud}%</span>
            {completitud < 100 && (
              <p className="completitud-tip">Completa tu perfil para aparecer primero en el catálogo</p>
            )}
          </div>

          <div className="sidebar-card">
            <div className="sidebar-card-header">
              <h6 className="sidebar-titulo">Datos personales</h6>
              <button className="btn-icono" onClick={() => setModalDatosPersonales(true)}>✏️</button>
            </div>
            <InfoItem icono="📧" valor={perfil.email} />
            <InfoItem icono="📱" valor={perfil.telefono} />
            <InfoItem icono="📍" valor={perfil.distrito} />
            <InfoItem icono="🎂" valor={perfil.fechaNacimiento} />
            {perfil.linkedin && <InfoItem icono="💼" valor="LinkedIn" link={perfil.linkedin} />}
            {perfil.github   && <InfoItem icono="💻" valor="GitHub"   link={perfil.github} />}
          </div>

          <div className="sidebar-card">
            <h6 className="sidebar-titulo">Área actual</h6>
            <span className="area-badge">{perfil.area || "Sin definir"}</span>
          </div>

          <div className="sidebar-card">
            <div className="sidebar-card-header">
              <h6 className="sidebar-titulo">Movilidad</h6>
              <button className="btn-icono" onClick={() => setModalMovilidad(true)}>✏️</button>
            </div>
            <MovilidadBadge label="Disponible a viajar"  valor={perfil.movilidad?.viajar} />
            <MovilidadBadge label="Reubicación"          valor={perfil.movilidad?.reubicacion} />
            <MovilidadBadge label="Vehículo propio"      valor={perfil.movilidad?.vehiculo} />
          </div>

          <div className="sidebar-card tips-card">
            <h6 className="sidebar-titulo">🔥 Tips BCP</h6>
            <ul className="tips-lista">
              <li>Añade proyectos con resultados medibles</li>
              <li>Menciona herramientas digitales que domines</li>
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
              <div className="avatar-wrapper">
                <div className="avatar-circulo">{perfil.nombre?.charAt(0)?.toUpperCase()}</div>
              </div>
              <div className="header-top-row">
                <div>
                  <h2 className="nombre-usuario">{perfil.nombre} {perfil.apellidos}</h2>
                  <p className="titulo-usuario">{perfil.titulo || "Añade tu título profesional"}</p>
                  <p className="area-usuario">📍 {perfil.distrito || perfil.area || ""}</p>
                </div>
                <button className="btn-editar-header" onClick={() => setModalAcerca(true)}>
                  ✏️ Editar perfil
                </button>
              </div>
            </div>
          </section>

          {/* ACERCA DE */}
          <SeccionCard titulo="Acerca de" icono="👤" onEditar={() => setModalAcerca(true)}>
            {perfil.resumen
              ? <p className="texto-seccion">{perfil.resumen}</p>
              : <p className="texto-vacio">Añade un resumen sobre ti y tus objetivos profesionales</p>
            }
            {perfil.intereses && (
              <div className="intereses-wrapper">
                <span className="label-campo">Intereses:</span> {perfil.intereses}
              </div>
            )}
          </SeccionCard>

          {/* EXPERIENCIA */}
          <SeccionCard titulo="Experiencia" icono="💼" onAnadir={() => setModalExperiencia(true)}>
            {perfil.experiencia?.length > 0
              ? perfil.experiencia.map((exp, i) => <ItemExperiencia key={i} exp={exp} />)
              : <p className="texto-vacio">Añade tu experiencia laboral o proyectos académicos</p>
            }
          </SeccionCard>

          {/* 🆕 PROYECTOS */}
          <SeccionCard titulo="Proyectos destacados" icono="🚀" onAnadir={() => setModalProyecto(true)}>
            {perfil.proyectos?.length > 0
              ? <div className="proyectos-grid">
                  {perfil.proyectos.map((p, i) => <ItemProyecto key={i} proyecto={p} />)}
                </div>
              : <p className="texto-vacio">Muestra tus proyectos más importantes a los líderes del BCP</p>
            }
          </SeccionCard>

          {/* EDUCACIÓN */}
          <SeccionCard titulo="Formación académica" icono="🎓" onAnadir={() => setModalEducacion(true)}>
            {perfil.educacion?.length > 0
              ? perfil.educacion.map((edu, i) => <ItemEducacion key={i} edu={edu} />)
              : <p className="texto-vacio">Añade tu formación académica</p>
            }
          </SeccionCard>

          {/* IDIOMAS */}
          <SeccionCard titulo="Idiomas" icono="🌍" onEditar={() => setModalIdiomas(true)}>
            {perfil.idiomas?.length > 0
              ? <div className="idiomas-grid">
                  {perfil.idiomas.map((id, i) => (
                    <div key={i} className="idioma-chip">
                      <span className="idioma-nombre">{id.idioma}</span>
                      <span className={`idioma-nivel nivel-${(id.nivel||"").toLowerCase().replace(/\s+/g,"-")}`}>{id.nivel}</span>
                    </div>
                  ))}
                </div>
              : <p className="texto-vacio">Añade los idiomas que manejas y tu nivel</p>
            }
          </SeccionCard>

          {/* CURSOS Y CERTIFICADOS */}
          <SeccionCard titulo="Cursos y certificados" icono="📚" onAnadir={() => setModalCursos(true)}>
            {perfil.cursos?.length > 0
              ? <div className="cursos-lista">
                  {perfil.cursos.map((c, i) => <ItemCurso key={i} curso={c} />)}
                </div>
              : <p className="texto-vacio">Añade cursos, certificados y programas que hayas completado</p>
            }
          </SeccionCard>

          {/* HABILIDADES */}
          <SeccionCard titulo="Habilidades" icono="⚡" onEditar={() => setModalHabilidades(true)}>
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

      {/* ══ MODALES ══ */}
      <ModalDatosPersonales abierto={modalDatosPersonales} onCerrar={() => setModalDatosPersonales(false)} perfil={perfil} onGuardar={actualizarPerfil} />
      <ModalAcercaDe       abierto={modalAcerca}           onCerrar={() => setModalAcerca(false)}           perfil={perfil} onGuardar={actualizarPerfil} />
      <ModalExperiencia    abierto={modalExperiencia}      onCerrar={() => setModalExperiencia(false)}                     onGuardar={actualizarPerfil} />
      <ModalProyecto       abierto={modalProyecto}         onCerrar={() => setModalProyecto(false)}                        onGuardar={actualizarPerfil} />
      <ModalEducacion      abierto={modalEducacion}        onCerrar={() => setModalEducacion(false)}                       onGuardar={actualizarPerfil} />
      <ModalIdiomas        abierto={modalIdiomas}          onCerrar={() => setModalIdiomas(false)}          perfil={perfil} onGuardar={actualizarPerfil} />
      <ModalCursos         abierto={modalCursos}           onCerrar={() => setModalCursos(false)}                          onGuardar={actualizarPerfil} />
      <ModalHabilidades    abierto={modalHabilidades}      onCerrar={() => setModalHabilidades(false)}      perfil={perfil} onGuardar={actualizarPerfil} />
      <ModalMovilidad      abierto={modalMovilidad}        onCerrar={() => setModalMovilidad(false)}        perfil={perfil} onGuardar={actualizarPerfil} />
    </div>
  );
}

/* ══════════════════════════════════════════
   COMPONENTES DE DISPLAY
══════════════════════════════════════════ */
function InfoItem({ icono, valor, link }) {
  if (!valor) return null;
  return (
    <div className="info-item">
      <span>{icono}</span>
      {link
        ? <a href={link} target="_blank" rel="noopener noreferrer" className="info-link">{valor}</a>
        : <span className="info-valor">{valor}</span>
      }
    </div>
  );
}

function ItemExperiencia({ exp }) {
  const periodo = exp.actualmente
    ? `${exp.desdeM} ${exp.desdeA} — Actualidad`
    : `${exp.desdeM} ${exp.desdeA} — ${exp.hastaM} ${exp.hastaA}`;
  return (
    <div className="item-lista">
      <div className="item-icono">🏢</div>
      <div className="item-contenido">
        <p className="item-titulo">{exp.cargo}</p>
        {exp.empresa && <p className="item-subtitulo">{exp.empresa}</p>}
        <p className="item-fecha">{periodo}</p>
        {exp.funciones && <p className="item-descripcion">{exp.funciones}</p>}
      </div>
    </div>
  );
}

/* 🆕 Item Proyecto */
function ItemProyecto({ proyecto }) {
  return (
    <div className="proyecto-card">
      <div className="proyecto-header">
        <span className="proyecto-icono">🚀</span>
        <div>
          <p className="proyecto-nombre">{proyecto.nombre}</p>
          {proyecto.rol && <p className="proyecto-rol">{proyecto.rol}</p>}
        </div>
      </div>
      {proyecto.descripcion && <p className="proyecto-desc">{proyecto.descripcion}</p>}
      <div className="proyecto-meta">
        {proyecto.tecnologias && (
          <div className="proyecto-tags">
            {proyecto.tecnologias.split(",").map((t, i) => (
              <span key={i} className="tag tag-tecnico tag-sm">{t.trim()}</span>
            ))}
          </div>
        )}
        {proyecto.url && (
          <a href={proyecto.url} target="_blank" rel="noopener noreferrer" className="proyecto-link">
            🔗 Ver proyecto
          </a>
        )}
      </div>
    </div>
  );
}

function ItemEducacion({ edu }) {
  const periodo = edu.actualmente
    ? `${edu.desdeM} ${edu.desdeA} — Actualidad`
    : `${edu.desdeM} ${edu.desdeA}${edu.hastaA ? ` — ${edu.hastaM} ${edu.hastaA}` : ""}`;
  return (
    <div className="item-lista">
      <div className="item-icono">🏫</div>
      <div className="item-contenido">
        <p className="item-titulo">{edu.institucion}</p>
        {edu.carrera && <p className="item-subtitulo">{edu.carrera}</p>}
        <p className="item-fecha">{edu.nivel} · {periodo}</p>
      </div>
    </div>
  );
}

function ItemCurso({ curso }) {
  return (
    <div className="curso-item">
      <div className="curso-icono">{curso.tipo === "Certificado" ? "🏅" : "📖"}</div>
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
  return (
    <div className="pantalla-carga">
      <div className="spinner-bcp" />
      <p>Cargando tu perfil...</p>
    </div>
  );
}

function SinSesion() {
  return <div className="pantalla-carga"><p>No has iniciado sesión.</p></div>;
}

function SeccionCard({ titulo, icono, onEditar, onAnadir, children }) {
  return (
    <section className="card-perfil seccion-card">
      <div className="seccion-header">
        <h3 className="seccion-titulo"><span>{icono}</span> {titulo}</h3>
        <div className="seccion-acciones">
          {onAnadir && <button className="btn-accion btn-anadir" onClick={onAnadir}>+ Añadir</button>}
          {onEditar && <button className="btn-accion btn-editar" onClick={onEditar}>✏️ Editar</button>}
        </div>
      </div>
      <div className="seccion-body">{children}</div>
    </section>
  );
}

function MovilidadBadge({ label, valor }) {
  return (
    <div className="movilidad-item">
      <span>{label}</span>
      <span className={`movilidad-badge ${valor ? "badge-si" : "badge-no"}`}>{valor ? "Sí" : "No"}</span>
    </div>
  );
}

/* ══════════════════════════════════════════
   MODAL BASE
══════════════════════════════════════════ */
function Modal({ abierto, onCerrar, titulo, children }) {
  if (!abierto) return null;
  return (
    <div className="modal-overlay" onClick={onCerrar}>
      <div className="modal-caja" onClick={(e) => e.stopPropagation()}>
        <div className="modal-cabecera">
          <h4 className="modal-titulo">{titulo}</h4>
          <button className="modal-cerrar" onClick={onCerrar}>✕</button>
        </div>
        <div className="modal-cuerpo">{children}</div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════
   MODAL: DATOS PERSONALES
══════════════════════════════════════════ */
function ModalDatosPersonales({ abierto, onCerrar, perfil, onGuardar }) {
  const [telefono,        setTelefono]        = useState(perfil?.telefono || "");
  const [distrito,        setDistrito]        = useState(perfil?.distrito || "");
  const [fechaNacimiento, setFechaNacimiento] = useState(perfil?.fechaNacimiento || "");
  const [genero,          setGenero]          = useState(perfil?.genero || "");
  const [linkedin,        setLinkedin]        = useState(perfil?.linkedin || "");
  const [github,          setGithub]          = useState(perfil?.github || "");

  useEffect(() => {
    setTelefono(perfil?.telefono || "");
    setDistrito(perfil?.distrito || "");
    setFechaNacimiento(perfil?.fechaNacimiento || "");
    setGenero(perfil?.genero || "");
    setLinkedin(perfil?.linkedin || "");
    setGithub(perfil?.github || "");
  }, [perfil]);

  return (
    <Modal abierto={abierto} onCerrar={onCerrar} titulo="👤 Datos personales">
      <div className="form-fila">
        <div className="form-grupo">
          <label className="form-label">Teléfono</label>
          <input className="form-input" placeholder="+51 999 999 999" value={telefono} onChange={(e) => setTelefono(e.target.value)} />
        </div>
        <div className="form-grupo">
          <label className="form-label">Género</label>
          <select className="form-input" value={genero} onChange={(e) => setGenero(e.target.value)}>
            <option value="">Selecciona</option>
            <option>Hombre</option><option>Mujer</option>
            <option>Prefiero no decir</option><option>Otro</option>
          </select>
        </div>
      </div>
      <div className="form-grupo">
        <label className="form-label">Fecha de nacimiento</label>
        <input type="date" className="form-input" value={fechaNacimiento} onChange={(e) => setFechaNacimiento(e.target.value)} />
      </div>
      <div className="form-grupo">
        <label className="form-label">Distrito / Ciudad</label>
        <input className="form-input" placeholder="Ej: San Martín de Porres, Lima" value={distrito} onChange={(e) => setDistrito(e.target.value)} />
      </div>
      <div className="form-grupo">
        <label className="form-label">LinkedIn <span className="form-opcional">(opcional)</span></label>
        <input className="form-input" placeholder="https://linkedin.com/in/tu-perfil" value={linkedin} onChange={(e) => setLinkedin(e.target.value)} />
      </div>
      <div className="form-grupo">
        <label className="form-label">GitHub <span className="form-opcional">(opcional)</span></label>
        <input className="form-input" placeholder="https://github.com/tu-usuario" value={github} onChange={(e) => setGithub(e.target.value)} />
      </div>
      <div className="modal-footer">
        <button className="btn-cancelar" onClick={onCerrar}>Cancelar</button>
        <button className="btn-guardar" onClick={async () => { await onGuardar({ telefono, distrito, fechaNacimiento, genero, linkedin, github }); onCerrar(); }}>
          Guardar cambios
        </button>
      </div>
    </Modal>
  );
}

/* ══════════════════════════════════════════
   MODAL: ACERCA DE
══════════════════════════════════════════ */
function ModalAcercaDe({ abierto, onCerrar, perfil, onGuardar }) {
  const [titulo,    setTitulo]    = useState(perfil?.titulo || "");
  const [resumen,   setResumen]   = useState(perfil?.resumen || "");
  const [area,      setArea]      = useState(perfil?.area || "");
  const [intereses, setIntereses] = useState(perfil?.intereses || "");

  useEffect(() => {
    setTitulo(perfil?.titulo || "");
    setResumen(perfil?.resumen || "");
    setArea(perfil?.area || "");
    setIntereses(perfil?.intereses || "");
  }, [perfil]);

  const manejarGuardar = async () => {
    if (!titulo.trim()) { Swal.fire({ icon:"warning", title:"Campo requerido", text:"El título es obligatorio.", confirmButtonColor:"#003DA5" }); return; }
    if (!resumen.trim()) { Swal.fire({ icon:"warning", title:"Campo requerido", text:"El resumen es obligatorio.", confirmButtonColor:"#003DA5" }); return; }
    await onGuardar({ titulo, resumen, area, intereses, perfilCompleto:true });
    onCerrar();
  };

  return (
    <Modal abierto={abierto} onCerrar={onCerrar} titulo="✏️ Editar perfil general">
      <div className="form-grupo">
        <label className="form-label">Título profesional *</label>
        <input className="form-input" placeholder="Ej: Desarrolladora Web Junior | Analista de Datos" value={titulo} onChange={(e) => setTitulo(e.target.value)} />
      </div>
      <div className="form-grupo">
        <label className="form-label">Resumen *</label>
        <textarea className="form-input form-textarea" rows={4} maxLength={500}
          placeholder="Cuéntale a los líderes del BCP quién eres, qué haces y qué te apasiona..."
          value={resumen} onChange={(e) => setResumen(e.target.value)}
        />
        <span className="form-contador">{resumen.length}/500 caracteres</span>
      </div>
      <div className="form-grupo">
        <label className="form-label">Área de trabajo</label>
        <select className="form-input" value={area} onChange={(e) => setArea(e.target.value)}>
          <option value="">Selecciona un área</option>
          <option>Analítica & Tecnología</option>
          <option>Finanzas & Control</option>
          <option>Gestión & Operaciones</option>
          <option>Comunicación & Relación</option>
          <option>Riesgos & Cumplimiento</option>
          <option>Marketing & Experiencia Cliente</option>
        </select>
      </div>
      <div className="form-grupo">
        <label className="form-label">Intereses profesionales</label>
        <input className="form-input" placeholder="Ej: Data Science, Innovación, Fintech, UX..." value={intereses} onChange={(e) => setIntereses(e.target.value)} />
      </div>
      <div className="modal-footer">
        <button className="btn-cancelar" onClick={onCerrar}>Cancelar</button>
        <button className="btn-guardar" onClick={manejarGuardar}>Guardar cambios</button>
      </div>
    </Modal>
  );
}

/* ══════════════════════════════════════════
   MODAL: EXPERIENCIA
══════════════════════════════════════════ */
function ModalExperiencia({ abierto, onCerrar, onGuardar }) {
  const [cargo,       setCargo]       = useState("");
  const [empresa,     setEmpresa]     = useState("");
  const [funciones,   setFunciones]   = useState("");
  const [desdeM,      setDesdeM]      = useState("");
  const [desdeA,      setDesdeA]      = useState("");
  const [hastaM,      setHastaM]      = useState("");
  const [hastaA,      setHastaA]      = useState("");
  const [actualmente, setActualmente] = useState(false);
  const [guardando,   setGuardando]   = useState(false);

  const limpiar = () => {
    setCargo(""); setEmpresa(""); setFunciones("");
    setDesdeM(""); setDesdeA(""); setHastaM(""); setHastaA(""); setActualmente(false);
  };

  const manejarGuardar = async () => {
    if (!cargo.trim())    { Swal.fire({ icon:"warning", title:"Falta el cargo",         confirmButtonColor:"#003DA5" }); return; }
    if (!desdeM||!desdeA) { Swal.fire({ icon:"warning", title:"Indica fecha de inicio", confirmButtonColor:"#003DA5" }); return; }
    if (!actualmente && (!hastaM||!hastaA)) { Swal.fire({ icon:"warning", title:"Indica fecha de fin o marca 'Actualmente'", confirmButtonColor:"#003DA5" }); return; }
    setGuardando(true);
    await onGuardar({ experiencia: arrayUnion({ cargo, empresa, funciones, desdeM, desdeA, hastaM: actualmente?"":hastaM, hastaA: actualmente?"":hastaA, actualmente }) });
    setGuardando(false); limpiar(); onCerrar();
  };

  return (
    <Modal abierto={abierto} onCerrar={onCerrar} titulo="💼 Añadir experiencia">
      <div className="form-grupo">
        <label className="form-label">Cargo *</label>
        <input className="form-input" placeholder="Ej: Practicante de Desarrollo Web" value={cargo} onChange={(e) => setCargo(e.target.value)} />
      </div>
      <div className="form-grupo">
        <label className="form-label">Empresa u organización</label>
        <input className="form-input" placeholder="Ej: BCP, UNICEF, Proyecto académico" value={empresa} onChange={(e) => setEmpresa(e.target.value)} />
      </div>
      <div className="form-check-row" onClick={() => setActualmente(!actualmente)}>
        <div className={`check-box ${actualmente?"check-on":""}`}>{actualmente && <span>✓</span>}</div>
        <label className="form-label" style={{ cursor:"pointer", margin:0 }}>Trabajo aquí actualmente</label>
      </div>
      <p className="form-sublabel">Desde *</p>
      <div className="form-fila">
        <div className="form-grupo">
          <label className="form-label">Mes</label>
          <select className="form-input" value={desdeM} onChange={(e) => setDesdeM(e.target.value)}>
            <option value="">Mes</option>
            {MESES.map((m) => <option key={m}>{m}</option>)}
          </select>
        </div>
        <div className="form-grupo">
          <label className="form-label">Año</label>
          <select className="form-input" value={desdeA} onChange={(e) => setDesdeA(e.target.value)}>
            <option value="">Año</option>
            {ANIOS.map((a) => <option key={a}>{a}</option>)}
          </select>
        </div>
      </div>
      {!actualmente && (
        <>
          <p className="form-sublabel">Hasta *</p>
          <div className="form-fila">
            <div className="form-grupo">
              <label className="form-label">Mes</label>
              <select className="form-input" value={hastaM} onChange={(e) => setHastaM(e.target.value)}>
                <option value="">Mes</option>
                {MESES.map((m) => <option key={m}>{m}</option>)}
              </select>
            </div>
            <div className="form-grupo">
              <label className="form-label">Año</label>
              <select className="form-input" value={hastaA} onChange={(e) => setHastaA(e.target.value)}>
                <option value="">Año</option>
                {ANIOS.map((a) => <option key={a}>{a}</option>)}
              </select>
            </div>
          </div>
        </>
      )}
      <div className="form-grupo">
        <label className="form-label">Funciones y logros <span className="form-opcional">(opcional · máx. 500 caracteres)</span></label>
        <textarea className="form-input form-textarea" rows={4} maxLength={500}
          placeholder="Describe tus responsabilidades, proyectos y logros concretos..."
          value={funciones} onChange={(e) => setFunciones(e.target.value)}
        />
        <span className="form-contador">{funciones.length}/500</span>
      </div>
      <div className="modal-footer">
        <button className="btn-cancelar" onClick={onCerrar}>Cancelar</button>
        <button className="btn-guardar" onClick={manejarGuardar} disabled={guardando}>
          {guardando ? "Guardando..." : "Añadir experiencia"}
        </button>
      </div>
    </Modal>
  );
}

/* ══════════════════════════════════════════
   🆕 MODAL: PROYECTO
══════════════════════════════════════════ */
function ModalProyecto({ abierto, onCerrar, onGuardar }) {
  const [nombre,       setNombre]       = useState("");
  const [rol,          setRol]          = useState("");
  const [descripcion,  setDescripcion]  = useState("");
  const [tecnologias,  setTecnologias]  = useState("");
  const [url,          setUrl]          = useState("");
  const [guardando,    setGuardando]    = useState(false);

  const limpiar = () => { setNombre(""); setRol(""); setDescripcion(""); setTecnologias(""); setUrl(""); };

  const manejarGuardar = async () => {
    if (!nombre.trim()) { Swal.fire({ icon:"warning", title:"El nombre del proyecto es obligatorio", confirmButtonColor:"#003DA5" }); return; }
    setGuardando(true);
    await onGuardar({ proyectos: arrayUnion({ nombre, rol, descripcion, tecnologias, url }) });
    setGuardando(false); limpiar(); onCerrar();
  };

  return (
    <Modal abierto={abierto} onCerrar={onCerrar} titulo="🚀 Añadir proyecto destacado">
      <div className="form-grupo">
        <label className="form-label">Nombre del proyecto *</label>
        <input className="form-input" placeholder="Ej: Sistema de análisis de créditos, App de pagos..." value={nombre} onChange={(e) => setNombre(e.target.value)} />
      </div>
      <div className="form-grupo">
        <label className="form-label">Tu rol en el proyecto</label>
        <input className="form-input" placeholder="Ej: Desarrolladora Frontend, Analista de datos..." value={rol} onChange={(e) => setRol(e.target.value)} />
      </div>
      <div className="form-grupo">
        <label className="form-label">Descripción <span className="form-opcional">(máx. 400 caracteres)</span></label>
        <textarea className="form-input form-textarea" rows={3} maxLength={400}
          placeholder="¿Qué problema resolviste? ¿Cuál fue el impacto? ¿Qué aprendiste?"
          value={descripcion} onChange={(e) => setDescripcion(e.target.value)}
        />
        <span className="form-contador">{descripcion.length}/400</span>
      </div>
      <div className="form-grupo">
        <label className="form-label">Tecnologías usadas</label>
        <input className="form-input" placeholder="React, Python, Firebase, SQL... (separa con comas)" value={tecnologias} onChange={(e) => setTecnologias(e.target.value)} />
      </div>
      <div className="form-grupo">
        <label className="form-label">URL del proyecto <span className="form-opcional">(opcional)</span></label>
        <input className="form-input" placeholder="https://github.com/... o link al demo" value={url} onChange={(e) => setUrl(e.target.value)} />
      </div>
      <div className="modal-footer">
        <button className="btn-cancelar" onClick={onCerrar}>Cancelar</button>
        <button className="btn-guardar" onClick={manejarGuardar} disabled={guardando}>
          {guardando ? "Guardando..." : "Añadir proyecto"}
        </button>
      </div>
    </Modal>
  );
}

/* ══════════════════════════════════════════
   MODAL: EDUCACIÓN
══════════════════════════════════════════ */
function ModalEducacion({ abierto, onCerrar, onGuardar }) {
  const [institucion,  setInstitucion]  = useState("");
  const [carrera,      setCarrera]      = useState("");
  const [nivel,        setNivel]        = useState("");
  const [desdeM,       setDesdeM]       = useState("");
  const [desdeA,       setDesdeA]       = useState("");
  const [hastaM,       setHastaM]       = useState("");
  const [hastaA,       setHastaA]       = useState("");
  const [actualmente,  setActualmente]  = useState(false);
  const [guardando,    setGuardando]    = useState(false);

  const limpiar = () => {
    setInstitucion(""); setCarrera(""); setNivel("");
    setDesdeM(""); setDesdeA(""); setHastaM(""); setHastaA(""); setActualmente(false);
  };

  const manejarGuardar = async () => {
    if (!institucion.trim()) { Swal.fire({ icon:"warning", title:"La institución es obligatoria", confirmButtonColor:"#003DA5" }); return; }
    if (!desdeA) { Swal.fire({ icon:"warning", title:"Indica el año de inicio", confirmButtonColor:"#003DA5" }); return; }
    setGuardando(true);
    await onGuardar({ educacion: arrayUnion({ institucion, carrera, nivel, desdeM, desdeA, hastaM: actualmente?"":hastaM, hastaA: actualmente?"":hastaA, actualmente }) });
    setGuardando(false); limpiar(); onCerrar();
  };

  return (
    <Modal abierto={abierto} onCerrar={onCerrar} titulo="🎓 Añadir formación académica">
      <div className="form-grupo">
        <label className="form-label">Institución *</label>
        <input className="form-input" placeholder="Ej: CIBERTEC, PUCP, UPC, Platzi..." value={institucion} onChange={(e) => setInstitucion(e.target.value)} />
      </div>
      <div className="form-grupo">
        <label className="form-label">Carrera / Programa</label>
        <input className="form-input" placeholder="Ej: Computación e Informática, Administración..." value={carrera} onChange={(e) => setCarrera(e.target.value)} />
      </div>
      <div className="form-grupo">
        <label className="form-label">Nivel de estudios</label>
        <select className="form-input" value={nivel} onChange={(e) => setNivel(e.target.value)}>
          <option value="">Selecciona nivel</option>
          {NIVELES_EDUCACION.map((n) => <option key={n}>{n}</option>)}
        </select>
      </div>
      <div className="form-check-row" onClick={() => setActualmente(!actualmente)}>
        <div className={`check-box ${actualmente?"check-on":""}`}>{actualmente && <span>✓</span>}</div>
        <label className="form-label" style={{ cursor:"pointer", margin:0 }}>Estudio aquí actualmente</label>
      </div>
      <p className="form-sublabel">Desde *</p>
      <div className="form-fila">
        <div className="form-grupo">
          <label className="form-label">Mes</label>
          <select className="form-input" value={desdeM} onChange={(e) => setDesdeM(e.target.value)}>
            <option value="">Mes</option>
            {MESES.map((m) => <option key={m}>{m}</option>)}
          </select>
        </div>
        <div className="form-grupo">
          <label className="form-label">Año *</label>
          <select className="form-input" value={desdeA} onChange={(e) => setDesdeA(e.target.value)}>
            <option value="">Año</option>
            {ANIOS.map((a) => <option key={a}>{a}</option>)}
          </select>
        </div>
      </div>
      {!actualmente && (
        <>
          <p className="form-sublabel">Hasta</p>
          <div className="form-fila">
            <div className="form-grupo">
              <label className="form-label">Mes</label>
              <select className="form-input" value={hastaM} onChange={(e) => setHastaM(e.target.value)}>
                <option value="">Mes</option>
                {MESES.map((m) => <option key={m}>{m}</option>)}
              </select>
            </div>
            <div className="form-grupo">
              <label className="form-label">Año</label>
              <select className="form-input" value={hastaA} onChange={(e) => setHastaA(e.target.value)}>
                <option value="">Año</option>
                {ANIOS.map((a) => <option key={a}>{a}</option>)}
              </select>
            </div>
          </div>
        </>
      )}
      <div className="modal-footer">
        <button className="btn-cancelar" onClick={onCerrar}>Cancelar</button>
        <button className="btn-guardar" onClick={manejarGuardar} disabled={guardando}>
          {guardando ? "Guardando..." : "Añadir formación"}
        </button>
      </div>
    </Modal>
  );
}

/* ══════════════════════════════════════════
   MODAL: IDIOMAS
══════════════════════════════════════════ */
function ModalIdiomas({ abierto, onCerrar, perfil, onGuardar }) {
  const [lista,       setLista]       = useState(perfil?.idiomas || []);
  const [nuevoIdioma, setNuevoIdioma] = useState("");
  const [nuevoNivel,  setNuevoNivel]  = useState("");

  useEffect(() => { setLista(perfil?.idiomas || []); }, [perfil]);

  const agregar = () => {
    if (!nuevoIdioma||!nuevoNivel) { Swal.fire({ icon:"warning", title:"Selecciona idioma y nivel", confirmButtonColor:"#003DA5" }); return; }
    if (lista.find((l) => l.idioma === nuevoIdioma)) { Swal.fire({ icon:"warning", title:"Ese idioma ya fue añadido", confirmButtonColor:"#003DA5" }); return; }
    setLista([...lista, { idioma:nuevoIdioma, nivel:nuevoNivel }]);
    setNuevoIdioma(""); setNuevoNivel("");
  };

  const eliminar = (idx) => setLista(lista.filter((_, i) => i !== idx));

  return (
    <Modal abierto={abierto} onCerrar={onCerrar} titulo="🌍 Idiomas">
      {lista.length > 0 && (
        <div className="idiomas-editar-lista">
          {lista.map((l, i) => (
            <div key={i} className="idioma-editar-row">
              <span className="idioma-nombre">{l.idioma}</span>
              <span className={`idioma-nivel nivel-${(l.nivel||"").toLowerCase().replace(/\s+/g,"-")}`}>{l.nivel}</span>
              <button className="btn-eliminar" onClick={() => eliminar(i)}>✕</button>
            </div>
          ))}
        </div>
      )}
      <p className="form-sublabel" style={{ marginTop: lista.length>0 ? 16 : 0 }}>Agregar idioma</p>
      <div className="form-fila">
        <div className="form-grupo">
          <label className="form-label">Idioma</label>
          <select className="form-input" value={nuevoIdioma} onChange={(e) => setNuevoIdioma(e.target.value)}>
            <option value="">Selecciona</option>
            {IDIOMAS_LISTA.map((id) => <option key={id}>{id}</option>)}
          </select>
        </div>
        <div className="form-grupo">
          <label className="form-label">Nivel</label>
          <select className="form-input" value={nuevoNivel} onChange={(e) => setNuevoNivel(e.target.value)}>
            <option value="">Nivel</option>
            {NIVELES_IDIOMA.map((n) => <option key={n}>{n}</option>)}
          </select>
        </div>
      </div>
      <button className="btn-agregar-row" onClick={agregar}>+ Agregar idioma</button>
      <div className="modal-footer">
        <button className="btn-cancelar" onClick={onCerrar}>Cancelar</button>
        <button className="btn-guardar" onClick={async () => { await onGuardar({ idiomas:lista }); onCerrar(); }}>
          Guardar cambios
        </button>
      </div>
    </Modal>
  );
}

/* ══════════════════════════════════════════
   MODAL: CURSOS Y CERTIFICADOS
══════════════════════════════════════════ */
function ModalCursos({ abierto, onCerrar, onGuardar }) {
  const [nombre,      setNombre]      = useState("");
  const [institucion, setInstitucion] = useState("");
  const [tipo,        setTipo]        = useState("Curso");
  const [anio,        setAnio]        = useState("");
  const [guardando,   setGuardando]   = useState(false);

  const limpiar = () => { setNombre(""); setInstitucion(""); setTipo("Curso"); setAnio(""); };

  const manejarGuardar = async () => {
    if (!nombre.trim()) { Swal.fire({ icon:"warning", title:"El nombre es obligatorio", confirmButtonColor:"#003DA5" }); return; }
    setGuardando(true);
    await onGuardar({ cursos: arrayUnion({ nombre, institucion, tipo, anio }) });
    setGuardando(false); limpiar(); onCerrar();
  };

  return (
    <Modal abierto={abierto} onCerrar={onCerrar} titulo="📚 Añadir curso o certificado">
      <div className="form-grupo">
        <label className="form-label">Tipo</label>
        <div className="tipo-tabs">
          {["Curso","Certificado","Programa","Diplomado","Bootcamp"].map((t) => (
            <button key={t} className={`tipo-tab ${tipo===t?"tipo-tab-activo":""}`} onClick={() => setTipo(t)}>{t}</button>
          ))}
        </div>
      </div>
      <div className="form-grupo">
        <label className="form-label">Nombre *</label>
        <input className="form-input" placeholder="Ej: Google Data Analytics, AWS Cloud Practitioner..." value={nombre} onChange={(e) => setNombre(e.target.value)} />
      </div>
      <div className="form-grupo">
        <label className="form-label">Institución / Plataforma</label>
        <input className="form-input" placeholder="Ej: Coursera, Udemy, Google, AWS, BCP..." value={institucion} onChange={(e) => setInstitucion(e.target.value)} />
      </div>
      <div className="form-grupo">
        <label className="form-label">Año de obtención</label>
        <select className="form-input" value={anio} onChange={(e) => setAnio(e.target.value)}>
          <option value="">Selecciona año</option>
          {ANIOS.slice(0, 10).map((a) => <option key={a}>{a}</option>)}
        </select>
      </div>
      <div className="modal-footer">
        <button className="btn-cancelar" onClick={onCerrar}>Cancelar</button>
        <button className="btn-guardar" onClick={manejarGuardar} disabled={guardando}>
          {guardando ? "Guardando..." : "Añadir"}
        </button>
      </div>
    </Modal>
  );
}

/* ══════════════════════════════════════════
   MODAL: HABILIDADES
══════════════════════════════════════════ */
function ModalHabilidades({ abierto, onCerrar, perfil, onGuardar }) {
  const [skills,  setSkills]  = useState((perfil?.skills||[]).join(", "));
  const [blandas, setBlandas] = useState((perfil?.habilidadesBlandas||[]).join(", "));

  useEffect(() => {
    setSkills((perfil?.skills||[]).join(", "));
    setBlandas((perfil?.habilidadesBlandas||[]).join(", "));
  }, [perfil]);

  const manejarGuardar = async () => {
    const sArr = skills.split(",").map((s) => s.trim()).filter(Boolean);
    const bArr = blandas.split(",").map((s) => s.trim()).filter(Boolean);
    if (!sArr.length && !bArr.length) { Swal.fire({ icon:"warning", title:"Añade al menos una habilidad", confirmButtonColor:"#003DA5" }); return; }
    await onGuardar({ skills:sArr, habilidadesBlandas:bArr });
    onCerrar();
  };

  return (
    <Modal abierto={abierto} onCerrar={onCerrar} titulo="⚡ Editar habilidades">
      <div className="form-grupo">
        <label className="form-label">Habilidades técnicas</label>
        <textarea className="form-input form-textarea" rows={3} placeholder="React, Firebase, Python, SQL, Figma..." value={skills} onChange={(e) => setSkills(e.target.value)} />
        <span className="form-hint">Separa con comas</span>
      </div>
      {skills.length>0 && (
        <div className="preview-tags">
          {skills.split(",").filter(Boolean).map((s,i) => <span key={i} className="tag tag-tecnico">{s.trim()}</span>)}
        </div>
      )}
      <div className="form-grupo" style={{ marginTop:16 }}>
        <label className="form-label">Habilidades blandas</label>
        <textarea className="form-input form-textarea" rows={3} placeholder="Liderazgo, Trabajo en equipo, Comunicación..." value={blandas} onChange={(e) => setBlandas(e.target.value)} />
        <span className="form-hint">Separa con comas</span>
      </div>
      {blandas.length>0 && (
        <div className="preview-tags">
          {blandas.split(",").filter(Boolean).map((s,i) => <span key={i} className="tag tag-blando">{s.trim()}</span>)}
        </div>
      )}
      <div className="modal-footer">
        <button className="btn-cancelar" onClick={onCerrar}>Cancelar</button>
        <button className="btn-guardar" onClick={manejarGuardar}>Guardar cambios</button>
      </div>
    </Modal>
  );
}

/* ══════════════════════════════════════════
   MODAL: MOVILIDAD
══════════════════════════════════════════ */
function ModalMovilidad({ abierto, onCerrar, perfil, onGuardar }) {
  const [viajar,      setViajar]      = useState(perfil?.movilidad?.viajar||false);
  const [reubicacion, setReubicacion] = useState(perfil?.movilidad?.reubicacion||false);
  const [vehiculo,    setVehiculo]    = useState(perfil?.movilidad?.vehiculo||false);

  useEffect(() => {
    setViajar(perfil?.movilidad?.viajar||false);
    setReubicacion(perfil?.movilidad?.reubicacion||false);
    setVehiculo(perfil?.movilidad?.vehiculo||false);
  }, [perfil]);

  return (
    <Modal abierto={abierto} onCerrar={onCerrar} titulo="🚗 Editar movilidad">
      <div className="movilidad-opciones">
        <ToggleOpcion label="Disponible para viajar"       descripcion="Puedo desplazarme a otras ciudades" valor={viajar}      onChange={setViajar} />
        <ToggleOpcion label="Disponible para reubicación"  descripcion="Dispuesto/a a cambiar de ciudad"    valor={reubicacion} onChange={setReubicacion} />
        <ToggleOpcion label="Vehículo propio"              descripcion="Cuento con vehículo para movilizarme" valor={vehiculo}  onChange={setVehiculo} />
      </div>
      <div className="modal-footer">
        <button className="btn-cancelar" onClick={onCerrar}>Cancelar</button>
        <button className="btn-guardar" onClick={async () => { await onGuardar({ movilidad:{ viajar, reubicacion, vehiculo } }); onCerrar(); }}>
          Guardar cambios
        </button>
      </div>
    </Modal>
  );
}

function ToggleOpcion({ label, descripcion, valor, onChange }) {
  return (
    <div className="toggle-opcion" onClick={() => onChange(!valor)}>
      <div>
        <p className="toggle-label">{label}</p>
        <p className="toggle-desc">{descripcion}</p>
      </div>
      <div className={`toggle-switch ${valor?"toggle-on":"toggle-off"}`}>
        <div className="toggle-bola" />
      </div>
    </div>
  );
}

export default Perfil;
