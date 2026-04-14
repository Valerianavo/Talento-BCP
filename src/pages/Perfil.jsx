import { useEffect, useState, useRef } from "react";
import { db, auth } from "../firebase/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { collection, query, where, getDocs, updateDoc, doc } from "firebase/firestore";
import Swal from "sweetalert2";
import Navbar from "../components/Navbar.jsx";
import "../stylesheets/Perfil.css";

// ── react-icons ──
import {
  FiEdit2, FiPlus, FiTrash2, FiArrowUp, FiArrowDown,
  FiX, FiCheck, FiMapPin, FiPhone, FiMail, FiCalendar,
  FiLinkedin, FiGithub, FiExternalLink, FiMove,
} from "react-icons/fi";
import {
  MdWorkOutline, MdSchool, MdLanguage, MdMenuBook,
  MdPerson, MdRocketLaunch, MdBolt, MdStar,
} from "react-icons/md";
import { HiOutlineBriefcase } from "react-icons/hi";
import { BsBuilding, BsTrophy } from "react-icons/bs";
import { TbCertificate } from "react-icons/tb";

/* ─── CONSTANTES ─── */
const MESES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio",
  "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
const ANIOS = Array.from({ length: 2026 - 1990 + 1 }, (_, i) => 2026 - i);
const NIVELES_IDIOMA = ["Muy básico","Básico","Intermedio","Avanzado","Nativo"];
const IDIOMAS_LISTA = [
  "Español","Inglés","Portugués","Francés","Alemán","Chino","Japonés",
  "Italiano","Ruso","Árabe","Coreano","Hindi","Neerlandés","Polaco",
  "Turco","Sueco","Noruego","Danés","Finés","Griego","Hebreo",
  "Tailandés","Vietnamita","Indonesio","Malayo","Ucraniano","Catalán","Quechua","Aymara","Otro",
];
const NIVELES_EDUCACION = [
  "Técnico","Universitario (en curso)","Universitario (egresado)",
  "Postgrado","Maestría","Doctorado","Curso / Bootcamp","Intercambio",
];
const AREAS_BCP = [
  "Analítica & Tecnología","Finanzas & Control","Gestión & Operaciones",
  "Comunicación & Relación","Riesgos & Cumplimiento","Marketing & Experiencia Cliente",
];
const PAISES = ["Perú","Argentina","Chile","Colombia","México","Ecuador","Bolivia","Venezuela","Otro"];
const AVATAR_MOCKS = [
  "/avatars/av1.png","/avatars/av2.png","/avatars/av3.png","/avatars/av4.png",
  "/avatars/av5.png","/avatars/av6.png",
];

/* ── helper completitud ── */
export const calcCompletitud = (p) => {
  if (!p) return 0;
  const campos = [
    p.titulo, p.resumen, p.area, p.intereses,
    p.telefono, p.pais, p.ciudad,
    p.experiencia?.length > 0, p.educacion?.length > 0,
    p.idiomas?.length > 0, p.cursos?.length > 0,
    p.skills?.length > 0, p.habilidadesBlandas?.length > 0,
  ];
  return Math.round(campos.filter(Boolean).length / campos.length * 100);
};

/* ── mover item en array ── */
const moverItem = (arr, idx, dir) => {
  const n = [...arr];
  const to = idx + dir;
  if (to < 0 || to >= n.length) return arr;
  [n[idx], n[to]] = [n[to], n[idx]];
  return n;
};

/* ══════════════════════════════════════════
   COMPONENTE PRINCIPAL
══════════════════════════════════════════ */
function Perfil() {
  const [perfil,  setPerfil]  = useState(null);
  const [docId,   setDocId]   = useState("");
  const [cargando,setCargando]= useState(true);
  const completitudPrev = useRef(0);

  /* modales añadir */
  const [mHeader,    setMHeader]    = useState(false); // nombre+titulo+area+resumen+intereses
  const [mDatos,     setMDatos]     = useState(false);
  const [mMovilidad, setMMovilidad] = useState(false);
  const [mExp,       setMExp]       = useState(false);
  const [mProy,      setMProy]      = useState(false);
  const [mEdu,       setMEdu]       = useState(false);
  const [mIdiomas,   setMIdiomas]   = useState(false);
  const [mCurso,     setMCurso]     = useState(false);
  const [mHab,       setMHab]       = useState(false);

  /* modales editar (ítem seleccionado) */
  const [editExp,   setEditExp]   = useState(null); // {item, idx}
  const [editProy,  setEditProy]  = useState(null);
  const [editEdu,   setEditEdu]   = useState(null);
  const [editCurso, setEditCurso] = useState(null);

  /* ── CARGA ── */
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) { setCargando(false); return; }
      try {
        const snap = await getDocs(query(collection(db,"practicantes"), where("uid","==",u.uid)));
        snap.forEach((d) => { setPerfil(d.data()); setDocId(d.id); });
      } catch (err) {
        Swal.fire({ icon:"error", title:"Error al cargar", text:err.message, confirmButtonColor:"#003DA5" });
      } finally { setCargando(false); }
    });
    return () => unsub();
  }, []);

  /* ── GUARDAR + alertas de completitud ── */
  const guardar = async (campos, silencioso = false) => {
    try {
      await updateDoc(doc(db,"practicantes",docId), campos);
      const snap = await getDocs(query(collection(db,"practicantes"), where("uid","==",auth.currentUser.uid)));
      let nuevoPerfil = null;
      snap.forEach((d) => { nuevoPerfil = d.data(); setPerfil(d.data()); });

      if (!silencioso) {
        const anterior = completitudPrev.current;
        const nuevo    = calcCompletitud(nuevoPerfil);
        completitudPrev.current = nuevo;

        if (nuevo === 100 && anterior < 100) {
          Swal.fire({ icon:"success", title:"🎉 ¡Perfil completo!", text:"Tu perfil está al 100%. ¡Ahora tienes máxima visibilidad en el catálogo!", confirmButtonColor:"#003DA5" });
        } else if (nuevo >= 70 && anterior < 70) {
          Swal.fire({ icon:"info", title:"✅ ¡Ya apareces en el catálogo!", text:"Tu perfil llegó al 70%. Los líderes del BCP ya pueden encontrarte.", confirmButtonColor:"#003DA5", timer:4000 });
        } else {
          Swal.fire({ icon:"success", title:"¡Guardado!", timer:1600, showConfirmButton:false });
        }
      }
    } catch (err) {
      Swal.fire({ icon:"error", title:"No se pudo guardar", text:err.message, confirmButtonColor:"#003DA5" });
    }
  };

  /* ── ELIMINAR de array ── */
  const eliminar = async (campo, idx) => {
    const res = await Swal.fire({
      title:"¿Eliminar este registro?", icon:"warning",
      showCancelButton:true, confirmButtonColor:"#d33", cancelButtonColor:"#6c757d",
      confirmButtonText:"Sí, eliminar", cancelButtonText:"Cancelar",
    });
    if (!res.isConfirmed) return;
    const nuevo = [...(perfil[campo]||[])];
    nuevo.splice(idx,1);
    await guardar({ [campo]: nuevo });
  };

  /* ── EDITAR un ítem de array ── */
  const editarEnArray = async (campo, idx, item) => {
    const nuevo = [...(perfil[campo]||[])];
    nuevo[idx] = item;
    await guardar({ [campo]: nuevo });
  };

  /* ── REORDENAR ── */
  const reordenar = async (campo, idx, dir) => {
    const nuevo = moverItem(perfil[campo]||[], idx, dir);
    await guardar({ [campo]: nuevo }, true);
  };

  if (cargando) return <PantallaCarga />;
  if (!perfil)  return <SinSesion />;

  // actualizar referencia de completitud al cargar
  if (completitudPrev.current === 0 && perfil) {
    completitudPrev.current = calcCompletitud(perfil);
  }

  const comp = calcCompletitud(perfil);

  return (
    <div className="perfil-wrapper">
      <Navbar />
      <div className="perfil-container">

        {/* ══ SIDEBAR ══ */}
        <aside className="perfil-sidebar">

          {/* completitud */}
          <div className="sidebar-card completitud-card">
            <h6 className="sidebar-titulo">COMPLETITUD DEL PERFIL</h6>
            <div className="barra-progreso-wrapper">
              <div className="barra-progreso-fill" style={{ width:`${comp}%` }} />
            </div>
            <span className="completitud-numero">{comp}%</span>
            {comp < 100 && <p className="completitud-tip">Completa tu perfil para aparecer primero en el catálogo</p>}
            {comp === 100 && <p className="completitud-tip completitud-ok">🎉 ¡Perfil al 100%!</p>}
          </div>

          {/* datos personales */}
          <div className="sidebar-card">
            <div className="sidebar-card-header">
              <h6 className="sidebar-titulo">DATOS PERSONALES</h6>
              <button className="btn-icono" onClick={() => setMDatos(true)} title="Editar"><FiEdit2 size={14}/></button>
            </div>
            <SideInfo Icon={FiMail}     val={perfil.email} />
            <SideInfo Icon={FiPhone}    val={perfil.telefono} />
            <SideInfo Icon={FiMapPin}   val={[perfil.ciudad, perfil.pais].filter(Boolean).join(", ")} />
            <SideInfo Icon={FiCalendar} val={perfil.fechaNacimiento} />
            {perfil.linkedin && <SideLink Icon={FiLinkedin}  label="LinkedIn" href={perfil.linkedin} />}
            {perfil.github   && <SideLink Icon={FiGithub}    label="GitHub"   href={perfil.github} />}
          </div>

          {/* área */}
          <div className="sidebar-card">
            <h6 className="sidebar-titulo">ÁREA ACTUAL</h6>
            <span className="area-badge">{perfil.area || "Sin definir"}</span>
          </div>

          {/* movilidad */}
          <div className="sidebar-card">
            <div className="sidebar-card-header">
              <h6 className="sidebar-titulo">MOVILIDAD</h6>
              <button className="btn-icono" onClick={() => setMMovilidad(true)}><FiEdit2 size={14}/></button>
            </div>
            <MovBadge label="Disponible a viajar" val={perfil.movilidad?.viajar} />
            <MovBadge label="Reubicación"         val={perfil.movilidad?.reubicacion} />
            <MovBadge label="Vehículo propio"     val={perfil.movilidad?.vehiculo} />
          </div>

          {/* tips */}
          <div className="sidebar-card tips-card">
            <h6 className="sidebar-titulo">🔥 TIPS BCP</h6>
            <ul className="tips-lista">
              <li>Añade proyectos con resultados medibles</li>
              <li>Menciona herramientas digitales que domines</li>
              <li>Actualiza tu disponibilidad cada mes</li>
            </ul>
          </div>
        </aside>

        {/* ══ MAIN ══ */}
        <main className="perfil-main">

          {/* ─── HEADER (avatar + nombre + título + área + resumen) ─── */}
          <section className="card-perfil header-perfil">
            <div className="header-banner" />
            <div className="header-body">

              {/* AVATAR con selector de mock */}
              <AvatarSelector
                perfil={perfil}
                onSelect={(foto) => guardar({ foto }, true)}
              />

              <div className="header-content">
                <div className="header-top-row">
                  <div>
                    <h2 className="nombre-usuario">{perfil.nombre} {perfil.apellidos || ""}</h2>
                    <p className="titulo-usuario">{perfil.titulo || <em className="texto-vacio-inline">Añade tu título profesional</em>}</p>
                    {(perfil.ciudad || perfil.pais) && (
                      <p className="area-usuario">
                        <FiMapPin size={12} style={{marginRight:4}}/>
                        {[perfil.ciudad, perfil.pais].filter(Boolean).join(", ")}
                      </p>
                    )}
                  </div>
                  <button className="btn-editar-header" onClick={() => setMHeader(true)}>
                    <FiEdit2 size={13}/> Editar perfil
                  </button>
                </div>

                {/* RESUMEN + INTERESES inline bajo el nombre */}
                {perfil.resumen ? (
                  <p className="header-resumen">{perfil.resumen}</p>
                ) : (
                  <p className="texto-vacio header-resumen-vacio" onClick={() => setMHeader(true)}>
                    + Añade un resumen profesional...
                  </p>
                )}
                {perfil.intereses && (
                  <p className="header-intereses"><strong>Intereses:</strong> {perfil.intereses}</p>
                )}
              </div>
            </div>
          </section>

          {/* ─── EXPERIENCIA ─── */}
          <SeccionCard titulo="Experiencia" Icono={HiOutlineBriefcase} onAnadir={() => setMExp(true)}>
            {perfil.experiencia?.length > 0
              ? perfil.experiencia.map((exp, i) => (
                  <ItemAcciones key={i} idx={i} total={perfil.experiencia.length}
                    onEditar={() => setEditExp({item:exp, idx:i})}
                    onEliminar={() => eliminar("experiencia",i)}
                    onSubir={() => reordenar("experiencia",i,-1)}
                    onBajar={() => reordenar("experiencia",i,1)}
                  >
                    <ItemExp exp={exp} />
                  </ItemAcciones>
                ))
              : <p className="texto-vacio">Añade tu experiencia laboral o proyectos académicos</p>
            }
          </SeccionCard>

          {/* ─── PROYECTOS ─── */}
          <SeccionCard titulo="Proyectos destacados" Icono={MdRocketLaunch} onAnadir={() => setMProy(true)}>
            {perfil.proyectos?.length > 0
              ? <div className="proyectos-grid">
                  {perfil.proyectos.map((p, i) => (
                    <ItemAcciones key={i} idx={i} total={perfil.proyectos.length} modo="tarjeta"
                      onEditar={() => setEditProy({item:p, idx:i})}
                      onEliminar={() => eliminar("proyectos",i)}
                      onSubir={() => reordenar("proyectos",i,-1)}
                      onBajar={() => reordenar("proyectos",i,1)}
                    >
                      <ItemProy proyecto={p} />
                    </ItemAcciones>
                  ))}
                </div>
              : <p className="texto-vacio">Muestra tus proyectos más importantes a los líderes del BCP</p>
            }
          </SeccionCard>

          {/* ─── FORMACIÓN ─── */}
          <SeccionCard titulo="Formación académica" Icono={MdSchool} onAnadir={() => setMEdu(true)}>
            {perfil.educacion?.length > 0
              ? perfil.educacion.map((edu, i) => (
                  <ItemAcciones key={i} idx={i} total={perfil.educacion.length}
                    onEditar={() => setEditEdu({item:edu, idx:i})}
                    onEliminar={() => eliminar("educacion",i)}
                    onSubir={() => reordenar("educacion",i,-1)}
                    onBajar={() => reordenar("educacion",i,1)}
                  >
                    <ItemEdu edu={edu} />
                  </ItemAcciones>
                ))
              : <p className="texto-vacio">Añade tu formación académica</p>
            }
          </SeccionCard>

          {/* ─── IDIOMAS ─── */}
          <SeccionCard titulo="Idiomas" Icono={MdLanguage} onEditar={() => setMIdiomas(true)}>
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

          {/* ─── CURSOS ─── */}
          <SeccionCard titulo="Cursos y certificados" Icono={TbCertificate} onAnadir={() => setMCurso(true)}>
            {perfil.cursos?.length > 0
              ? <div className="cursos-lista">
                  {perfil.cursos.map((c, i) => (
                    <ItemAcciones key={i} idx={i} total={perfil.cursos.length}
                      onEditar={() => setEditCurso({item:c, idx:i})}
                      onEliminar={() => eliminar("cursos",i)}
                      onSubir={() => reordenar("cursos",i,-1)}
                      onBajar={() => reordenar("cursos",i,1)}
                    >
                      <ItemCurso curso={c} />
                    </ItemAcciones>
                  ))}
                </div>
              : <p className="texto-vacio">Añade cursos, certificados y programas completados</p>
            }
          </SeccionCard>

          {/* ─── HABILIDADES ─── */}
          <SeccionCard titulo="Habilidades" Icono={MdBolt} onEditar={() => setMHab(true)}>
            {perfil.skills?.length > 0 && (
              <div className="skills-grupo">
                <p className="skills-subtitulo">Habilidades técnicas</p>
                <div className="skills-tags">
                  {perfil.skills.map((s,i) => <span key={i} className="tag tag-tecnico">{s.trim()}</span>)}
                </div>
              </div>
            )}
            {perfil.habilidadesBlandas?.length > 0 && (
              <div className="skills-grupo">
                <p className="skills-subtitulo">Habilidades blandas</p>
                <div className="skills-tags">
                  {perfil.habilidadesBlandas.map((s,i) => <span key={i} className="tag tag-blando">{s.trim()}</span>)}
                </div>
              </div>
            )}
            {!perfil.skills?.length && !perfil.habilidadesBlandas?.length && (
              <p className="texto-vacio">Añade tus habilidades técnicas y blandas</p>
            )}
          </SeccionCard>

        </main>
      </div>

      {/* ══ MODALES AÑADIR ══ */}
      <ModalHeader    abierto={mHeader}    onCerrar={()=>setMHeader(false)}    perfil={perfil} onGuardar={guardar} />
      <ModalDatos     abierto={mDatos}     onCerrar={()=>setMDatos(false)}     perfil={perfil} onGuardar={guardar} />
      <ModalMovilidad abierto={mMovilidad} onCerrar={()=>setMMovilidad(false)} perfil={perfil} onGuardar={guardar} />
      <ModalExp       abierto={mExp}       onCerrar={()=>setMExp(false)}       perfil={perfil} onGuardar={guardar} />
      <ModalProy      abierto={mProy}      onCerrar={()=>setMProy(false)}      perfil={perfil} onGuardar={guardar} />
      <ModalEdu       abierto={mEdu}       onCerrar={()=>setMEdu(false)}       perfil={perfil} onGuardar={guardar} />
      <ModalIdiomas   abierto={mIdiomas}   onCerrar={()=>setMIdiomas(false)}   perfil={perfil} onGuardar={guardar} />
      <ModalCurso     abierto={mCurso}     onCerrar={()=>setMCurso(false)}     perfil={perfil} onGuardar={guardar} />
      <ModalHab       abierto={mHab}       onCerrar={()=>setMHab(false)}       perfil={perfil} onGuardar={guardar} />

      {/* ══ MODALES EDITAR ══ */}
      {editExp && (
        <ModalExp abierto modoEdicion itemEdicion={editExp.item}
          onCerrar={()=>setEditExp(null)} perfil={perfil}
          onGuardarEdicion={async(item)=>{ await editarEnArray("experiencia",editExp.idx,item); setEditExp(null); }}
        />
      )}
      {editProy && (
        <ModalProy abierto modoEdicion itemEdicion={editProy.item}
          onCerrar={()=>setEditProy(null)} perfil={perfil}
          onGuardarEdicion={async(item)=>{ await editarEnArray("proyectos",editProy.idx,item); setEditProy(null); }}
        />
      )}
      {editEdu && (
        <ModalEdu abierto modoEdicion itemEdicion={editEdu.item}
          onCerrar={()=>setEditEdu(null)} perfil={perfil}
          onGuardarEdicion={async(item)=>{ await editarEnArray("educacion",editEdu.idx,item); setEditEdu(null); }}
        />
      )}
      {editCurso && (
        <ModalCurso abierto modoEdicion itemEdicion={editCurso.item}
          onCerrar={()=>setEditCurso(null)} perfil={perfil}
          onGuardarEdicion={async(item)=>{ await editarEnArray("cursos",editCurso.idx,item); setEditCurso(null); }}
        />
      )}
    </div>
  );
}

/* ══════════════════════════════════════════
   AVATAR CON SELECTOR DE MOCK
══════════════════════════════════════════ */
function AvatarSelector({ perfil, onSelect }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="avatar-wrapper" style={{position:"relative"}}>
      <div className="avatar-circulo" onClick={() => setOpen(v=>!v)} title="Cambiar foto">
        {perfil.foto
          ? <img src={perfil.foto} alt="avatar" style={{width:"100%",height:"100%",borderRadius:"50%",objectFit:"cover"}}/>
          : <span>{perfil.nombre?.charAt(0)?.toUpperCase()}</span>
        }
        <div className="avatar-overlay"><FiEdit2 size={14}/></div>
      </div>
      {open && (
        <div className="avatar-picker">
          <p className="avatar-picker-titulo">Selecciona un avatar</p>
          <div className="avatar-picker-grid">
            {AVATAR_MOCKS.map((src,i) => (
              <img key={i} src={src} alt={`av${i}`} className="avatar-option"
                onClick={() => { onSelect(src); setOpen(false); }}
                onError={(e)=>{ e.target.style.display="none"; }}
              />
            ))}
          </div>
          <button className="avatar-picker-cerrar" onClick={()=>setOpen(false)}><FiX/> Cerrar</button>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════
   ITEM CON ACCIONES (editar/eliminar/reordenar)
══════════════════════════════════════════ */
function ItemAcciones({ children, idx, total, onEditar, onEliminar, onSubir, onBajar, modo="lista" }) {
  const [hover, setHover] = useState(false);
  return (
    <div
      className={`ia-wrapper ${modo==="tarjeta"?"ia-tarjeta":""}`}
      onMouseEnter={()=>setHover(true)}
      onMouseLeave={()=>setHover(false)}
    >
      {children}
      {hover && (
        <div className="ia-botones">
          {idx > 0 && (
            <button className="ia-btn ia-up" onClick={onSubir} title="Subir"><FiArrowUp size={13}/></button>
          )}
          {idx < total - 1 && (
            <button className="ia-btn ia-down" onClick={onBajar} title="Bajar"><FiArrowDown size={13}/></button>
          )}
          <button className="ia-btn ia-edit" onClick={onEditar} title="Editar"><FiEdit2 size={13}/></button>
          <button className="ia-btn ia-del"  onClick={onEliminar} title="Eliminar"><FiTrash2 size={13}/></button>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════
   DISPLAY ITEMS
══════════════════════════════════════════ */
function SideInfo({ Icon, val }) {
  if (!val) return null;
  return (
    <div className="info-item">
      <Icon size={13} className="info-icon"/>
      <span className="info-valor">{val}</span>
    </div>
  );
}
function SideLink({ Icon, label, href }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="info-item info-link">
      <Icon size={13} className="info-icon"/>
      <span>{label}</span>
      <FiExternalLink size={11} style={{marginLeft:"auto"}}/>
    </a>
  );
}
function MovBadge({ label, val }) {
  return (
    <div className="movilidad-item">
      <span>{label}</span>
      <span className={`movilidad-badge ${val?"badge-si":"badge-no"}`}>{val?"Sí":"No"}</span>
    </div>
  );
}
function SeccionCard({ titulo, Icono, onEditar, onAnadir, children }) {
  return (
    <section className="card-perfil seccion-card">
      <div className="seccion-header">
        <h3 className="seccion-titulo">
          {Icono && <Icono size={17} className="seccion-icon"/>} {titulo}
        </h3>
        <div className="seccion-acciones">
          {onAnadir && <button className="btn-accion btn-anadir" onClick={onAnadir}><FiPlus size={13}/> Añadir</button>}
          {onEditar && <button className="btn-accion btn-editar" onClick={onEditar}><FiEdit2 size={13}/> Editar</button>}
        </div>
      </div>
      <div className="seccion-body">{children}</div>
    </section>
  );
}
function ItemExp({ exp }) {
  const p = exp.actualmente
    ? `${exp.desdeM} ${exp.desdeA} — Actualidad`
    : `${exp.desdeM} ${exp.desdeA} — ${exp.hastaM} ${exp.hastaA}`;
  return (
    <div className="item-lista">
      <div className="item-icono"><BsBuilding size={18}/></div>
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
        <MdRocketLaunch size={20} className="proyecto-icono"/>
        <div>
          <p className="proyecto-nombre">{proyecto.nombre}</p>
          {proyecto.rol && <p className="proyecto-rol">{proyecto.rol}</p>}
        </div>
      </div>
      {proyecto.descripcion && <p className="proyecto-desc">{proyecto.descripcion}</p>}
      <div className="proyecto-meta">
        {proyecto.tecnologias && (
          <div className="proyecto-tags">
            {proyecto.tecnologias.split(",").map((t,i) => (
              <span key={i} className="tag tag-tecnico tag-sm">{t.trim()}</span>
            ))}
          </div>
        )}
        {proyecto.url && (
          <a href={proyecto.url} target="_blank" rel="noopener noreferrer" className="proyecto-link">
            <FiExternalLink size={12}/> Ver proyecto
          </a>
        )}
      </div>
    </div>
  );
}
function ItemEdu({ edu }) {
  const p = edu.actualmente
    ? `${edu.desdeM} ${edu.desdeA} — Actualidad`
    : `${edu.desdeM} ${edu.desdeA}${edu.hastaA?` — ${edu.hastaM} ${edu.hastaA}`:""}`;
  return (
    <div className="item-lista">
      <div className="item-icono"><MdSchool size={18}/></div>
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
      <div className="curso-icono">
        {curso.tipo==="Certificado" ? <BsTrophy size={16}/> : <MdMenuBook size={16}/>}
      </div>
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
  return <div className="pantalla-carga"><div className="spinner-bcp"/><p>Cargando tu perfil...</p></div>;
}
function SinSesion() {
  return <div className="pantalla-carga"><p>No has iniciado sesión.</p></div>;
}

/* ══════════════════════════════════════════
   MODAL BASE
══════════════════════════════════════════ */
function Modal({ abierto, onCerrar, titulo, children }) {
  if (!abierto) return null;
  return (
    <div className="modal-overlay" onClick={onCerrar}>
      <div className="modal-caja" onClick={e=>e.stopPropagation()}>
        <div className="modal-cabecera">
          <h4 className="modal-titulo">{titulo}</h4>
          <button className="modal-cerrar" onClick={onCerrar}><FiX size={15}/></button>
        </div>
        <div className="modal-cuerpo">{children}</div>
      </div>
    </div>
  );
}

/* helpers de formulario */
const FG = ({label, children, hint}) => (
  <div className="form-grupo">
    {label && <label className="form-label">{label}</label>}
    {children}
    {hint && <span className="form-hint">{hint}</span>}
  </div>
);
const FRow = ({children}) => <div className="form-fila">{children}</div>;
const Inp = (props) => <input className="form-input" {...props}/>;
const Sel = ({children, ...props}) => <select className="form-input" {...props}>{children}</select>;
const Txt = (props) => <textarea className="form-input form-textarea" {...props}/>;
const MFooter = ({onCerrar, onGuardar, label="Guardar cambios", loading}) => (
  <div className="modal-footer">
    <button className="btn-cancelar" onClick={onCerrar}>Cancelar</button>
    <button className="btn-guardar" onClick={onGuardar} disabled={loading}>
      {loading ? "Guardando..." : label}
    </button>
  </div>
);
const Chk = ({checked, onChange, label}) => (
  <div className="form-check-row" onClick={()=>onChange(!checked)}>
    <div className={`check-box ${checked?"check-on":""}`}>{checked&&<FiCheck size={11}/>}</div>
    <label className="form-label" style={{cursor:"pointer",margin:0}}>{label}</label>
  </div>
);

/* ══════════════════════════════════════════
   MODAL: HEADER (nombre+título+area+resumen+intereses)
══════════════════════════════════════════ */
function ModalHeader({ abierto, onCerrar, perfil, onGuardar }) {
  const [nombre,    setNombre]    = useState(perfil?.nombre||"");
  const [apellidos, setApellidos] = useState(perfil?.apellidos||"");
  const [titulo,    setTitulo]    = useState(perfil?.titulo||"");
  const [area,      setArea]      = useState(perfil?.area||"");
  const [resumen,   setResumen]   = useState(perfil?.resumen||"");
  const [intereses, setIntereses] = useState(perfil?.intereses||"");
  useEffect(()=>{
    setNombre(perfil?.nombre||""); setApellidos(perfil?.apellidos||"");
    setTitulo(perfil?.titulo||""); setArea(perfil?.area||"");
    setResumen(perfil?.resumen||""); setIntereses(perfil?.intereses||"");
  },[perfil]);
  const guardar = async () => {
    if (!titulo.trim()) { Swal.fire({icon:"warning",title:"El título es obligatorio",confirmButtonColor:"#003DA5"}); return; }
    await onGuardar({ nombre, apellidos, titulo, area, resumen, intereses, perfilCompleto:true });
    onCerrar();
  };
  return (
    <Modal abierto={abierto} onCerrar={onCerrar} titulo="✏️ Editar información principal">
      <FRow>
        <FG label="Nombre *"><Inp placeholder="Tu nombre" value={nombre} onChange={e=>setNombre(e.target.value)}/></FG>
        <FG label="Apellidos"><Inp placeholder="Tus apellidos" value={apellidos} onChange={e=>setApellidos(e.target.value)}/></FG>
      </FRow>
      <FG label="Título profesional *">
        <Inp placeholder="Ej: Desarrolladora Web Junior | Analista de Datos" value={titulo} onChange={e=>setTitulo(e.target.value)}/>
      </FG>
      <FG label="Área de trabajo">
        <Sel value={area} onChange={e=>setArea(e.target.value)}>
          <option value="">Selecciona un área</option>
          {AREAS_BCP.map(a=><option key={a}>{a}</option>)}
        </Sel>
      </FG>
      <FG label="Resumen profesional">
        <Txt rows={4} maxLength={500} placeholder="Cuéntale a los líderes del BCP quién eres..." value={resumen} onChange={e=>setResumen(e.target.value)}/>
        <span className="form-contador">{resumen.length}/500</span>
      </FG>
      <FG label="Intereses profesionales">
        <Inp placeholder="Ej: Data Science, Innovación, Fintech, UX..." value={intereses} onChange={e=>setIntereses(e.target.value)}/>
      </FG>
      <MFooter onCerrar={onCerrar} onGuardar={guardar}/>
    </Modal>
  );
}

/* ══════════════════════════════════════════
   MODAL: DATOS PERSONALES (con País + Ciudad + Distrito)
══════════════════════════════════════════ */
function ModalDatos({ abierto, onCerrar, perfil, onGuardar }) {
  const [telefono,  setTelefono]  = useState(perfil?.telefono||"");
  const [pais,      setPais]      = useState(perfil?.pais||"Perú");
  const [ciudad,    setCiudad]    = useState(perfil?.ciudad||"");
  const [distrito,  setDistrito]  = useState(perfil?.distrito||"");
  const [fechaNac,  setFechaNac]  = useState(perfil?.fechaNacimiento||"");
  const [genero,    setGenero]    = useState(perfil?.genero||"");
  const [linkedin,  setLinkedin]  = useState(perfil?.linkedin||"");
  const [github,    setGithub]    = useState(perfil?.github||"");
  useEffect(()=>{
    setTelefono(perfil?.telefono||""); setPais(perfil?.pais||"Perú");
    setCiudad(perfil?.ciudad||""); setDistrito(perfil?.distrito||"");
    setFechaNac(perfil?.fechaNacimiento||""); setGenero(perfil?.genero||"");
    setLinkedin(perfil?.linkedin||""); setGithub(perfil?.github||"");
  },[perfil]);
  const guardar = async () => {
    await onGuardar({ telefono, pais, ciudad, distrito, fechaNacimiento:fechaNac, genero, linkedin, github });
    onCerrar();
  };
  return (
    <Modal abierto={abierto} onCerrar={onCerrar} titulo="👤 Datos personales">
      <FRow>
        <FG label="Teléfono"><Inp placeholder="+51 999 999 999" value={telefono} onChange={e=>setTelefono(e.target.value)}/></FG>
        <FG label="Género">
          <Sel value={genero} onChange={e=>setGenero(e.target.value)}>
            <option value="">Selecciona</option>
            <option>Hombre</option><option>Mujer</option>
            <option>Prefiero no decir</option><option>Otro</option>
          </Sel>
        </FG>
      </FRow>
      <FG label="Fecha de nacimiento"><input type="date" className="form-input" value={fechaNac} onChange={e=>setFechaNac(e.target.value)}/></FG>
      <FG label="País">
        <Sel value={pais} onChange={e=>setPais(e.target.value)}>
          {PAISES.map(p=><option key={p}>{p}</option>)}
        </Sel>
      </FG>
      <FRow>
        <FG label="Ciudad / Región"><Inp placeholder="Ej: Lima" value={ciudad} onChange={e=>setCiudad(e.target.value)}/></FG>
        <FG label="Distrito"><Inp placeholder="Ej: San Martín de Porres" value={distrito} onChange={e=>setDistrito(e.target.value)}/></FG>
      </FRow>
      <FG label="LinkedIn (opcional)"><Inp placeholder="https://linkedin.com/in/tu-perfil" value={linkedin} onChange={e=>setLinkedin(e.target.value)}/></FG>
      <FG label="GitHub (opcional)"><Inp placeholder="https://github.com/tu-usuario" value={github} onChange={e=>setGithub(e.target.value)}/></FG>
      <MFooter onCerrar={onCerrar} onGuardar={guardar}/>
    </Modal>
  );
}

/* ══════════════════════════════════════════
   MODAL: MOVILIDAD
══════════════════════════════════════════ */
function ModalMovilidad({ abierto, onCerrar, perfil, onGuardar }) {
  const [viajar,  setViajar]  = useState(perfil?.movilidad?.viajar||false);
  const [reubic,  setReubic]  = useState(perfil?.movilidad?.reubicacion||false);
  const [vehiculo,setVehiculo]= useState(perfil?.movilidad?.vehiculo||false);
  useEffect(()=>{
    setViajar(perfil?.movilidad?.viajar||false);
    setReubic(perfil?.movilidad?.reubicacion||false);
    setVehiculo(perfil?.movilidad?.vehiculo||false);
  },[perfil]);
  return (
    <Modal abierto={abierto} onCerrar={onCerrar} titulo="🚗 Editar movilidad">
      <div className="movilidad-opciones">
        <Toggle label="Disponible para viajar" desc="Puedo desplazarme a otras ciudades" val={viajar} onChange={setViajar}/>
        <Toggle label="Disponible para reubicación" desc="Dispuesto/a a cambiar de ciudad" val={reubic} onChange={setReubic}/>
        <Toggle label="Vehículo propio" desc="Cuento con vehículo para movilizarme" val={vehiculo} onChange={setVehiculo}/>
      </div>
      <MFooter onCerrar={onCerrar} onGuardar={async()=>{ await onGuardar({movilidad:{viajar,reubicacion:reubic,vehiculo}}); onCerrar(); }}/>
    </Modal>
  );
}
function Toggle({ label, desc, val, onChange }) {
  return (
    <div className="toggle-opcion" onClick={()=>onChange(!val)}>
      <div>
        <p className="toggle-label">{label}</p>
        <p className="toggle-desc">{desc}</p>
      </div>
      <div className={`toggle-switch ${val?"toggle-on":"toggle-off"}`}>
        <div className="toggle-bola"/>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════
   MODAL: EXPERIENCIA (añadir + editar)
══════════════════════════════════════════ */
function ModalExp({ abierto, onCerrar, perfil, onGuardar, modoEdicion=false, itemEdicion=null, onGuardarEdicion }) {
  const init = itemEdicion||{};
  const [cargo,   setCargo]   = useState(init.cargo||"");
  const [empresa, setEmpresa] = useState(init.empresa||"");
  const [funcs,   setFuncs]   = useState(init.funciones||"");
  const [desdeM,  setDesdeM]  = useState(init.desdeM||"");
  const [desdeA,  setDesdeA]  = useState(init.desdeA||"");
  const [hastaM,  setHastaM]  = useState(init.hastaM||"");
  const [hastaA,  setHastaA]  = useState(init.hastaA||"");
  const [actual,  setActual]  = useState(init.actualmente||false);
  const [loading, setLoading] = useState(false);
  useEffect(()=>{ if(itemEdicion){ setCargo(itemEdicion.cargo||""); setEmpresa(itemEdicion.empresa||""); setFuncs(itemEdicion.funciones||""); setDesdeM(itemEdicion.desdeM||""); setDesdeA(itemEdicion.desdeA||""); setHastaM(itemEdicion.hastaM||""); setHastaA(itemEdicion.hastaA||""); setActual(itemEdicion.actualmente||false); } },[itemEdicion]);
  const limpiar=()=>{ setCargo("");setEmpresa("");setFuncs("");setDesdeM("");setDesdeA("");setHastaM("");setHastaA("");setActual(false); };
  const guardar = async () => {
    if(!cargo.trim()){ Swal.fire({icon:"warning",title:"El cargo es obligatorio",confirmButtonColor:"#003DA5"}); return; }
    if(!desdeM||!desdeA){ Swal.fire({icon:"warning",title:"Indica la fecha de inicio",confirmButtonColor:"#003DA5"}); return; }
    if(!actual&&(!hastaM||!hastaA)){ Swal.fire({icon:"warning",title:"Indica la fecha de fin",confirmButtonColor:"#003DA5"}); return; }
    const item={cargo,empresa,funciones:funcs,desdeM,desdeA,hastaM:actual?"":hastaM,hastaA:actual?"":hastaA,actualmente:actual};
    setLoading(true);
    if(modoEdicion){ await onGuardarEdicion(item); }
    else{ await onGuardar({experiencia:[...(perfil?.experiencia||[]),item]}); limpiar(); }
    setLoading(false); onCerrar();
  };
  return (
    <Modal abierto={abierto} onCerrar={onCerrar} titulo={modoEdicion?"✏️ Editar experiencia":"💼 Añadir experiencia"}>
      <FG label="Cargo *"><Inp placeholder="Ej: Practicante de Desarrollo Web" value={cargo} onChange={e=>setCargo(e.target.value)}/></FG>
      <FG label="Empresa u organización"><Inp placeholder="Ej: BCP, UNICEF, Proyecto académico" value={empresa} onChange={e=>setEmpresa(e.target.value)}/></FG>
      <Chk checked={actual} onChange={setActual} label="Trabajo aquí actualmente"/>
      <p className="form-sublabel">Desde *</p>
      <FRow>
        <FG label="Mes"><Sel value={desdeM} onChange={e=>setDesdeM(e.target.value)}><option value="">Mes</option>{MESES.map(m=><option key={m}>{m}</option>)}</Sel></FG>
        <FG label="Año"><Sel value={desdeA} onChange={e=>setDesdeA(e.target.value)}><option value="">Año</option>{ANIOS.map(a=><option key={a}>{a}</option>)}</Sel></FG>
      </FRow>
      {!actual && (<><p className="form-sublabel">Hasta *</p><FRow>
        <FG label="Mes"><Sel value={hastaM} onChange={e=>setHastaM(e.target.value)}><option value="">Mes</option>{MESES.map(m=><option key={m}>{m}</option>)}</Sel></FG>
        <FG label="Año"><Sel value={hastaA} onChange={e=>setHastaA(e.target.value)}><option value="">Año</option>{ANIOS.map(a=><option key={a}>{a}</option>)}</Sel></FG>
      </FRow></>)}
      <FG label="Funciones y logros (máx. 500 caracteres)">
        <Txt rows={4} maxLength={500} placeholder="Describe tus responsabilidades y logros..." value={funcs} onChange={e=>setFuncs(e.target.value)}/>
        <span className="form-contador">{funcs.length}/500</span>
      </FG>
      <MFooter onCerrar={onCerrar} onGuardar={guardar} loading={loading} label={modoEdicion?"Guardar cambios":"Añadir experiencia"}/>
    </Modal>
  );
}

/* ══════════════════════════════════════════
   MODAL: PROYECTO (añadir + editar)
══════════════════════════════════════════ */
function ModalProy({ abierto, onCerrar, perfil, onGuardar, modoEdicion=false, itemEdicion=null, onGuardarEdicion }) {
  const init = itemEdicion||{};
  const [nombre,  setNombre]  = useState(init.nombre||"");
  const [rol,     setRol]     = useState(init.rol||"");
  const [desc,    setDesc]    = useState(init.descripcion||"");
  const [tecno,   setTecno]   = useState(init.tecnologias||"");
  const [url,     setUrl]     = useState(init.url||"");
  const [loading, setLoading] = useState(false);
  useEffect(()=>{ if(itemEdicion){ setNombre(itemEdicion.nombre||""); setRol(itemEdicion.rol||""); setDesc(itemEdicion.descripcion||""); setTecno(itemEdicion.tecnologias||""); setUrl(itemEdicion.url||""); } },[itemEdicion]);
  const limpiar=()=>{ setNombre("");setRol("");setDesc("");setTecno("");setUrl(""); };
  const guardar = async () => {
    if(!nombre.trim()){ Swal.fire({icon:"warning",title:"El nombre del proyecto es obligatorio",confirmButtonColor:"#003DA5"}); return; }
    const item={nombre,rol,descripcion:desc,tecnologias:tecno,url};
    setLoading(true);
    if(modoEdicion){ await onGuardarEdicion(item); }
    else{ await onGuardar({proyectos:[...(perfil?.proyectos||[]),item]}); limpiar(); }
    setLoading(false); onCerrar();
  };
  return (
    <Modal abierto={abierto} onCerrar={onCerrar} titulo={modoEdicion?"✏️ Editar proyecto":"🚀 Añadir proyecto destacado"}>
      <FG label="Nombre del proyecto *"><Inp placeholder="Ej: TalentoBCP, App de Trivia..." value={nombre} onChange={e=>setNombre(e.target.value)}/></FG>
      <FG label="Tu rol en el proyecto"><Inp placeholder="Ej: Desarrolladora Frontend" value={rol} onChange={e=>setRol(e.target.value)}/></FG>
      <FG label="Descripción">
        <Txt rows={3} maxLength={300} placeholder="¿Qué resolviste? ¿Cuál fue el impacto?" value={desc} onChange={e=>setDesc(e.target.value)}/>
        <span className="form-contador">{desc.length}/300</span>
      </FG>
      <FG label="Tecnologías (separa con comas)"><Inp placeholder="React, Firebase, Bootstrap..." value={tecno} onChange={e=>setTecno(e.target.value)}/></FG>
      <FG label="URL del proyecto (opcional)"><Inp placeholder="https://mi-proyecto.vercel.app" value={url} onChange={e=>setUrl(e.target.value)}/></FG>
      <MFooter onCerrar={onCerrar} onGuardar={guardar} loading={loading} label={modoEdicion?"Guardar cambios":"Añadir proyecto"}/>
    </Modal>
  );
}

/* ══════════════════════════════════════════
   MODAL: EDUCACIÓN (añadir + editar)
══════════════════════════════════════════ */
function ModalEdu({ abierto, onCerrar, perfil, onGuardar, modoEdicion=false, itemEdicion=null, onGuardarEdicion }) {
  const init = itemEdicion||{};
  const [inst,    setInst]    = useState(init.institucion||"");
  const [carrera, setCarrera] = useState(init.carrera||"");
  const [nivel,   setNivel]   = useState(init.nivel||"");
  const [desdeM,  setDesdeM]  = useState(init.desdeM||"");
  const [desdeA,  setDesdeA]  = useState(init.desdeA||"");
  const [hastaM,  setHastaM]  = useState(init.hastaM||"");
  const [hastaA,  setHastaA]  = useState(init.hastaA||"");
  const [actual,  setActual]  = useState(init.actualmente||false);
  const [loading, setLoading] = useState(false);
  useEffect(()=>{ if(itemEdicion){ setInst(itemEdicion.institucion||""); setCarrera(itemEdicion.carrera||""); setNivel(itemEdicion.nivel||""); setDesdeM(itemEdicion.desdeM||""); setDesdeA(itemEdicion.desdeA||""); setHastaM(itemEdicion.hastaM||""); setHastaA(itemEdicion.hastaA||""); setActual(itemEdicion.actualmente||false); } },[itemEdicion]);
  const limpiar=()=>{ setInst("");setCarrera("");setNivel("");setDesdeM("");setDesdeA("");setHastaM("");setHastaA("");setActual(false); };
  const guardar = async () => {
    if(!inst.trim()){ Swal.fire({icon:"warning",title:"La institución es obligatoria",confirmButtonColor:"#003DA5"}); return; }
    if(!desdeA){ Swal.fire({icon:"warning",title:"Indica el año de inicio",confirmButtonColor:"#003DA5"}); return; }
    const item={institucion:inst,carrera,nivel,desdeM,desdeA,hastaM:actual?"":hastaM,hastaA:actual?"":hastaA,actualmente:actual};
    setLoading(true);
    if(modoEdicion){ await onGuardarEdicion(item); }
    else{ await onGuardar({educacion:[...(perfil?.educacion||[]),item]}); limpiar(); }
    setLoading(false); onCerrar();
  };
  return (
    <Modal abierto={abierto} onCerrar={onCerrar} titulo={modoEdicion?"✏️ Editar formación":"🎓 Añadir formación académica"}>
      <FG label="Institución *"><Inp placeholder="Ej: CIBERTEC, PUCP, UPC..." value={inst} onChange={e=>setInst(e.target.value)}/></FG>
      <FG label="Carrera / Programa"><Inp placeholder="Ej: Computación e Informática" value={carrera} onChange={e=>setCarrera(e.target.value)}/></FG>
      <FG label="Nivel de estudios">
        <Sel value={nivel} onChange={e=>setNivel(e.target.value)}>
          <option value="">Selecciona nivel</option>
          {NIVELES_EDUCACION.map(n=><option key={n}>{n}</option>)}
        </Sel>
      </FG>
      <Chk checked={actual} onChange={setActual} label="Estudio aquí actualmente"/>
      <p className="form-sublabel">Desde *</p>
      <FRow>
        <FG label="Mes"><Sel value={desdeM} onChange={e=>setDesdeM(e.target.value)}><option value="">Mes</option>{MESES.map(m=><option key={m}>{m}</option>)}</Sel></FG>
        <FG label="Año *"><Sel value={desdeA} onChange={e=>setDesdeA(e.target.value)}><option value="">Año</option>{ANIOS.map(a=><option key={a}>{a}</option>)}</Sel></FG>
      </FRow>
      {!actual && (<><p className="form-sublabel">Hasta</p><FRow>
        <FG label="Mes"><Sel value={hastaM} onChange={e=>setHastaM(e.target.value)}><option value="">Mes</option>{MESES.map(m=><option key={m}>{m}</option>)}</Sel></FG>
        <FG label="Año"><Sel value={hastaA} onChange={e=>setHastaA(e.target.value)}><option value="">Año</option>{ANIOS.map(a=><option key={a}>{a}</option>)}</Sel></FG>
      </FRow></>)}
      <MFooter onCerrar={onCerrar} onGuardar={guardar} loading={loading} label={modoEdicion?"Guardar cambios":"Añadir formación"}/>
    </Modal>
  );
}

/* ══════════════════════════════════════════
   MODAL: IDIOMAS (lista editable in-place)
══════════════════════════════════════════ */
function ModalIdiomas({ abierto, onCerrar, perfil, onGuardar }) {
  const [lista,   setLista]   = useState(perfil?.idiomas||[]);
  const [nuevoId, setNuevoId] = useState("");
  const [nuevoNv, setNuevoNv] = useState("");
  useEffect(()=>setLista(perfil?.idiomas||[]),[perfil]);
  const agregar=()=>{
    if(!nuevoId||!nuevoNv){ Swal.fire({icon:"warning",title:"Selecciona idioma y nivel",confirmButtonColor:"#003DA5"}); return; }
    if(lista.find(l=>l.idioma===nuevoId)){ Swal.fire({icon:"warning",title:"Ese idioma ya está añadido",confirmButtonColor:"#003DA5"}); return; }
    setLista([...lista,{idioma:nuevoId,nivel:nuevoNv}]);
    setNuevoId("");setNuevoNv("");
  };
  const eliminar=(i)=>setLista(lista.filter((_,j)=>j!==i));
  const cambiarNivel=(i,v)=>{ const n=[...lista]; n[i]={...n[i],nivel:v}; setLista(n); };
  return (
    <Modal abierto={abierto} onCerrar={onCerrar} titulo="🌍 Idiomas">
      {lista.length>0 && (
        <div className="idiomas-editar-lista">
          {lista.map((l,i)=>(
            <div key={i} className="idioma-editar-row">
              <span className="idioma-nombre">{l.idioma}</span>
              <select className="form-input idioma-nivel-select" value={l.nivel} onChange={e=>cambiarNivel(i,e.target.value)}>
                {NIVELES_IDIOMA.map(n=><option key={n}>{n}</option>)}
              </select>
              <button className="btn-eliminar" onClick={()=>eliminar(i)}><FiTrash2 size={13}/></button>
            </div>
          ))}
        </div>
      )}
      <p className="form-sublabel" style={{marginTop:lista.length>0?16:0}}>Agregar idioma</p>
      <FRow>
        <FG label="Idioma">
          <Sel value={nuevoId} onChange={e=>setNuevoId(e.target.value)}>
            <option value="">Selecciona</option>
            {IDIOMAS_LISTA.map(id=><option key={id}>{id}</option>)}
          </Sel>
        </FG>
        <FG label="Nivel">
          <Sel value={nuevoNv} onChange={e=>setNuevoNv(e.target.value)}>
            <option value="">Nivel</option>
            {NIVELES_IDIOMA.map(n=><option key={n}>{n}</option>)}
          </Sel>
        </FG>
      </FRow>
      <button className="btn-agregar-row" onClick={agregar}><FiPlus size={13}/> Agregar idioma</button>
      <MFooter onCerrar={onCerrar} onGuardar={async()=>{ await onGuardar({idiomas:lista}); onCerrar(); }}/>
    </Modal>
  );
}

/* ══════════════════════════════════════════
   MODAL: CURSO (añadir + editar)
══════════════════════════════════════════ */
function ModalCurso({ abierto, onCerrar, perfil, onGuardar, modoEdicion=false, itemEdicion=null, onGuardarEdicion }) {
  const init=itemEdicion||{};
  const [nombre,  setNombre]  = useState(init.nombre||"");
  const [inst,    setInst]    = useState(init.institucion||"");
  const [tipo,    setTipo]    = useState(init.tipo||"Curso");
  const [anio,    setAnio]    = useState(init.anio||"");
  const [loading, setLoading] = useState(false);
  useEffect(()=>{ if(itemEdicion){ setNombre(itemEdicion.nombre||""); setInst(itemEdicion.institucion||""); setTipo(itemEdicion.tipo||"Curso"); setAnio(itemEdicion.anio||""); } },[itemEdicion]);
  const limpiar=()=>{ setNombre("");setInst("");setTipo("Curso");setAnio(""); };
  const guardar = async () => {
    if(!nombre.trim()){ Swal.fire({icon:"warning",title:"El nombre es obligatorio",confirmButtonColor:"#003DA5"}); return; }
    const item={nombre,institucion:inst,tipo,anio};
    setLoading(true);
    if(modoEdicion){ await onGuardarEdicion(item); }
    else{ await onGuardar({cursos:[...(perfil?.cursos||[]),item]}); limpiar(); }
    setLoading(false); onCerrar();
  };
  return (
    <Modal abierto={abierto} onCerrar={onCerrar} titulo={modoEdicion?"✏️ Editar curso":"📚 Añadir curso o certificado"}>
      <FG label="Tipo">
        <div className="tipo-tabs">
          {["Curso","Certificado","Programa","Diplomado","Bootcamp"].map(t=>(
            <button key={t} className={`tipo-tab ${tipo===t?"tipo-tab-activo":""}`} onClick={()=>setTipo(t)}>{t}</button>
          ))}
        </div>
      </FG>
      <FG label="Nombre *"><Inp placeholder="Ej: Google Data Analytics, AWS..." value={nombre} onChange={e=>setNombre(e.target.value)}/></FG>
      <FG label="Institución / Plataforma"><Inp placeholder="Ej: Coursera, Udemy, BCP..." value={inst} onChange={e=>setInst(e.target.value)}/></FG>
      <FG label="Año de obtención">
        <Sel value={anio} onChange={e=>setAnio(e.target.value)}>
          <option value="">Selecciona año</option>
          {ANIOS.slice(0,10).map(a=><option key={a}>{a}</option>)}
        </Sel>
      </FG>
      <MFooter onCerrar={onCerrar} onGuardar={guardar} loading={loading} label={modoEdicion?"Guardar cambios":"Añadir"}/>
    </Modal>
  );
}

/* ══════════════════════════════════════════
   MODAL: HABILIDADES
══════════════════════════════════════════ */
function ModalHab({ abierto, onCerrar, perfil, onGuardar }) {
  const [skills,  setSkills]  = useState((perfil?.skills||[]).join(", "));
  const [blandas, setBlandas] = useState((perfil?.habilidadesBlandas||[]).join(", "));
  useEffect(()=>{ setSkills((perfil?.skills||[]).join(", ")); setBlandas((perfil?.habilidadesBlandas||[]).join(", ")); },[perfil]);
  const guardar = async () => {
    const s = skills.split(",").map(x=>x.trim()).filter(Boolean);
    const b = blandas.split(",").map(x=>x.trim()).filter(Boolean);
    if(!s.length&&!b.length){ Swal.fire({icon:"warning",title:"Añade al menos una habilidad",confirmButtonColor:"#003DA5"}); return; }
    await onGuardar({skills:s,habilidadesBlandas:b}); onCerrar();
  };
  return (
    <Modal abierto={abierto} onCerrar={onCerrar} titulo="⚡ Editar habilidades">
      <FG label="Habilidades técnicas" hint="Separa con comas">
        <Txt rows={3} placeholder="React, Firebase, Python, SQL, Figma..." value={skills} onChange={e=>setSkills(e.target.value)}/>
      </FG>
      {skills.length>0 && (
        <div className="preview-tags">{skills.split(",").filter(Boolean).map((s,i)=><span key={i} className="tag tag-tecnico">{s.trim()}</span>)}</div>
      )}
      <FG label="Habilidades blandas" hint="Separa con comas" style={{marginTop:16}}>
        <Txt rows={3} placeholder="Liderazgo, Trabajo en equipo, Comunicación..." value={blandas} onChange={e=>setBlandas(e.target.value)}/>
      </FG>
      {blandas.length>0 && (
        <div className="preview-tags">{blandas.split(",").filter(Boolean).map((s,i)=><span key={i} className="tag tag-blando">{s.trim()}</span>)}</div>
      )}
      <MFooter onCerrar={onCerrar} onGuardar={guardar}/>
    </Modal>
  );
}

export default Perfil;
