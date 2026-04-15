import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { db, auth } from "../firebase/firebase";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection, query, where, getDocs,
  doc, getDoc, updateDoc, arrayRemove,
  addDoc, deleteDoc, serverTimestamp,
} from "firebase/firestore";
import "../stylesheets/DashboardLider.css";

import {
  FiStar, FiMail, FiMapPin, FiUsers, FiTrendingUp,
  FiAward, FiPlus, FiEdit2, FiTrash2,
  FiCheck, FiX, FiEye, FiBriefcase, FiClock,
} from "react-icons/fi";
import { MdBolt } from "react-icons/md";
import { HiOutlineBriefcase, HiOutlineOfficeBuilding } from "react-icons/hi";
import { RiTeamLine } from "react-icons/ri";
import { IoSearchOutline } from "react-icons/io5";
import { AiOutlineBarChart } from "react-icons/ai";

/* ════════════════════════════════════════
   HELPERS
════════════════════════════════════════ */
const calcComp = (p) => {
  const c = [
    p.titulo, p.resumen, p.area, p.intereses,
    p.experiencia?.length > 0, p.educacion?.length > 0,
    p.idiomas?.length > 0,     p.cursos?.length > 0,
    p.skills?.length > 0,      p.habilidadesBlandas?.length > 0,
  ];
  return Math.round(c.filter(Boolean).length / c.length * 100);
};

const AREAS_BCP = [
  "Analítica & Tecnología",   "Finanzas & Control",
  "Gestión & Operaciones",    "Comunicación & Relación",
  "Riesgos & Cumplimiento",   "Marketing & Experiencia Cliente",
];
const MODALIDAD_OPC = ["Presencial", "Remoto", "Híbrido"];
const JORNADA_OPC   = ["Tiempo completo", "Medio tiempo", "Por proyecto"];
const ESTADO_OPC    = ["Abierta", "En revisión", "Cerrada"];

const ESTADO_META = {
  "Abierta":     { bg:"#d1fae5", color:"#065f46", dot:"#10b981" },
  "En revisión": { bg:"#fef3c7", color:"#92400e", dot:"#f59e0b" },
  "Cerrada":     { bg:"#f1f5f9", color:"#64748b", dot:"#94a3b8" },
};

const vacFormInit = () => ({
  titulo:"", area:"", descripcion:"", requisitos:"",
  modalidad:"Presencial", jornada:"Tiempo completo",
  estado:"Abierta", ubicacion:"Lima",
});

/* ════════════════════════════════════════
   GRÁFICOS SVG PROPIOS (sin dependencias)
════════════════════════════════════════ */
function HBarChart({ data, color = "#003DA5" }) {
  if (!data.length) return <p className="dl-empty-txt">Sin datos aún</p>;
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="dl-hbar-list">
      {data.map((d, i) => (
        <div key={i} className="dl-hbar-row">
          <span className="dl-hbar-label" title={d.label}>{d.label}</span>
          <div className="dl-hbar-track">
            <div
              className="dl-hbar-fill"
              style={{ width:`${(d.value / max) * 100}%`, background: color }}
            />
          </div>
          <span className="dl-hbar-val">{d.value}</span>
        </div>
      ))}
    </div>
  );
}

function DonutChart({ segments, size = 130 }) {
  const r = 46; const cx = size / 2; const cy = size / 2;
  const circ = 2 * Math.PI * r;
  const total = segments.reduce((s, d) => s + d.value, 0) || 1;
  let offset = 0;
  const arcs = segments.map((seg) => {
    const dash = (seg.value / total) * circ;
    const arc = { ...seg, dash, offset: circ - offset };
    offset += dash;
    return arc;
  });
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f1f5f9" strokeWidth={20}/>
      {arcs.map((arc, i) => (
        <circle key={i} cx={cx} cy={cy} r={r}
          fill="none" stroke={arc.color} strokeWidth={20}
          strokeDasharray={`${arc.dash} ${circ}`} strokeDashoffset={arc.offset}
          style={{ transform:"rotate(-90deg)", transformOrigin:"center" }}
        />
      ))}
      <text x={cx} y={cy - 6} textAnchor="middle" fontSize={22} fontWeight="800" fill="#0f172a">{total}</text>
      <text x={cx} y={cy + 14} textAnchor="middle" fontSize={9} fill="#94a3b8">practicantes</text>
    </svg>
  );
}

function SparkLine({ values, color = "#003DA5", width = 100, height = 36 }) {
  if (values.length < 2) return null;
  const max = Math.max(...values, 1);
  const min = Math.min(...values);
  const rng = max - min || 1;
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * width;
    const y = height - ((v - min) / rng) * (height - 8) - 4;
    return `${x},${y}`;
  });
  const area = `M${pts[0]} ${pts.slice(1).map((p) => `L${p}`).join(" ")} L${width},${height} L0,${height} Z`;
  const line = `M${pts[0]} ${pts.slice(1).map((p) => `L${p}`).join(" ")}`;
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ overflow:"visible" }}>
      <path d={area} fill={color} fillOpacity={0.1}/>
      <path d={line} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round"/>
      {values.map((v, i) => {
        const x = (i / (values.length - 1)) * width;
        const y = height - ((v - min) / rng) * (height - 8) - 4;
        return <circle key={i} cx={x} cy={y} r={2.5} fill={color}/>;
      })}
    </svg>
  );
}

/* ════════════════════════════════════════
   DASHBOARD LÍDER
════════════════════════════════════════ */
function DashboardLider() {
  const navigate = useNavigate();

  const [usuario,      setUsuario]      = useState(null);
  const [liderData,    setLiderData]    = useState(null);
  const [liderDocId,   setLiderDocId]   = useState(null);
  const [practicantes, setPracticantes] = useState([]);
  const [favoritos,    setFavoritos]    = useState([]);
  const [vacantes,     setVacantes]     = useState([]);
  const [cargando,     setCargando]     = useState(true);
  const [tabActiva,    setTabActiva]    = useState("metricas");
  const [busqFav,      setBusqFav]      = useState("");

  const [modalVacante,  setModalVacante]  = useState(false);
  const [vacantEdit,    setVacantEdit]    = useState(null);
  const [vacForm,       setVacForm]       = useState(vacFormInit());
  const [guardandoVac,  setGuardandoVac]  = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);

  /* ── carga inicial ── */
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u || !u.email?.endsWith("@bcp.com")) { navigate("/auth"); return; }
      setUsuario(u);
      try {
        const lSnap = await getDocs(query(collection(db,"lideres"), where("uid","==",u.uid)));
        let liderDoc = null;
        lSnap.forEach((d) => { liderDoc = { id:d.id, ...d.data() }; });
        if (liderDoc) { setLiderData(liderDoc); setLiderDocId(liderDoc.id); }

        const pSnap = await getDocs(collection(db,"practicantes"));
        setPracticantes(pSnap.docs.map((d) => ({ id:d.id, ...d.data() })));

        if (liderDoc?.favoritos?.length) {
          const favs = await Promise.all(
            liderDoc.favoritos.map(async (fid) => {
              const s = await getDoc(doc(db,"practicantes",fid));
              return s.exists() ? { id:fid, ...s.data() } : null;
            })
          );
          setFavoritos(favs.filter(Boolean));
        }

        const vSnap = await getDocs(
          query(collection(db,"vacantes"), where("liderUid","==",u.uid))
        );
        setVacantes(vSnap.docs.map((d) => ({ id:d.id, ...d.data() })));

      } catch(err) { console.error(err); }
      finally { setCargando(false); }
    });
    return () => unsub();
  }, [navigate]);

  /* ── favoritos ── */
  const quitarFavorito = async (fid) => {
    await updateDoc(doc(db,"lideres",liderDocId), { favoritos: arrayRemove(fid) });
    setFavoritos((prev) => prev.filter((f) => f.id !== fid));
  };

  /* ── métricas ── */
  const total          = practicantes.length;
  const conExperiencia = practicantes.filter((p) => p.experiencia?.length > 0).length;
  const conRotaciones  = practicantes.filter((p) => p.rotaciones?.length > 0).length;
  const conProyectos   = practicantes.filter((p) => p.proyectos?.length > 0).length;
  const perfilAlto     = practicantes.filter((p) => calcComp(p) >= 70).length;

  const areaTop = Object.entries(
    practicantes.reduce((acc,p) => { if(p.area) acc[p.area]=(acc[p.area]||0)+1; return acc; },{})
  ).sort((a,b)=>b[1]-a[1]).slice(0,6).map(([label,value])=>({ label:label.split(" ")[0], value }));


  const compBuckets = { "< 40%":0, "40–60%":0, "60–80%":0, "80–100%":0 };
  practicantes.forEach((p) => {
    const c = calcComp(p);
    if(c < 40)      compBuckets["< 40%"]++;
    else if(c < 60) compBuckets["40–60%"]++;
    else if(c < 80) compBuckets["60–80%"]++;
    else            compBuckets["80–100%"]++;
  });

  const sparkData = [
    Math.max(1,total-5), total-3, total-4, total-1, total-2, total,
  ].map((v) => Math.max(0, v));

  const favFiltrados = favoritos.filter(
    (p) => !busqFav || p.nombre?.toLowerCase().includes(busqFav.toLowerCase())
  );

  const irAPerfil = (pid) => navigate(`/perfil/${pid}`);

  /* ── CRUD vacantes ── */
  const abrirCrear = () => {
    setVacantEdit(null);
    setVacForm(vacFormInit());
    setModalVacante(true);
  };

  const abrirEditar = (v) => {
    setVacantEdit(v);
    setVacForm({
      titulo:      v.titulo      || "",
      area:        v.area        || "",
      descripcion: v.descripcion || "",
      requisitos:  v.requisitos  || "",
      modalidad:   v.modalidad   || "Presencial",
      jornada:     v.jornada     || "Tiempo completo",
      estado:      v.estado      || "Abierta",
      ubicacion:   v.ubicacion   || "Lima",
    });
    setModalVacante(true);
  };

  const guardarVacante = async () => {
    if (!vacForm.titulo.trim() || !vacForm.area) {
      alert("El título y el área son obligatorios.");
      return;
    }
    setGuardandoVac(true);
    try {
      const payload = {
        ...vacForm,
        liderUid:    usuario.uid,
        liderNombre: liderData?.nombre || usuario.email,
        liderEmail:  usuario.email,
        updatedAt:   serverTimestamp(),
      };
      if (vacantEdit) {
        await updateDoc(doc(db,"vacantes",vacantEdit.id), payload);
        setVacantes((prev) => prev.map((v) => v.id===vacantEdit.id ? { ...v, ...payload } : v));
      } else {
        payload.createdAt = serverTimestamp();
        const ref = await addDoc(collection(db,"vacantes"), payload);
        setVacantes((prev) => [...prev, { id:ref.id, ...payload }]);
      }
      setModalVacante(false);
    } catch(e) { console.error(e); alert("Error al guardar."); }
    finally { setGuardandoVac(false); }
  };

  const eliminarVacante = async (id) => {
    await deleteDoc(doc(db,"vacantes",id));
    setVacantes((prev) => prev.filter((v) => v.id !== id));
    setConfirmDelete(null);
  };

  const cambiarEstadoVacante = async (v, nuevoEstado) => {
    await updateDoc(doc(db,"vacantes",v.id), { estado: nuevoEstado });
    setVacantes((prev) => prev.map((x) => x.id===v.id ? { ...x, estado:nuevoEstado } : x));
  };

  if (cargando) return (
    <div className="dl-carga">
      <div className="spinner-bcp"/>
      <p>Cargando dashboard...</p>
    </div>
  );

  const tabs = [
    { id:"metricas",  Icon:AiOutlineBarChart, label:"Métricas" },
    { id:"favoritos", Icon:FiStar,            label:"Favoritos",
      badge:favoritos.length,                 badgeColor:"#d97706" },
    { id:"vacantes",  Icon:FiBriefcase,       label:"Vacantes",
      badge:vacantes.filter(v=>v.estado==="Abierta").length, badgeColor:"#10b981" },
  ];

  /* ══════════════ JSX ══════════════ */
  return (
    <div className="dl-wrapper">

      {/* ── SIDEBAR ── */}
      <aside className="dl-sidebar">
        {/* avatar líder */}
        <div className="dl-sidebar-user">
          <div className="dl-user-avatar">
            {liderData?.foto
              ? <img src={liderData.foto} alt="avatar"/>
              : (liderData?.nombre || usuario?.email || "L")[0].toUpperCase()
            }
          </div>
          <div className="dl-user-info">
            <p className="dl-user-nombre">{liderData?.nombre || "Líder BCP"}</p>
            <p className="dl-user-email">{usuario?.email?.split("@")[0]}@bcp.com</p>
          </div>
        </div>

        {/* nav */}
        <nav className="dl-nav">
          {tabs.map(({ id, Icon, label, badge, badgeColor }) => (
            <button
              key={id}
              className={`dl-nav-btn ${tabActiva===id ? "dl-nav-active" : ""}`}
              onClick={() => setTabActiva(id)}
            >
              <Icon size={17}/>
              <span>{label}</span>
              {badge > 0 && (
                <span className="dl-nav-badge" style={{ background:badgeColor }}>{badge}</span>
              )}
            </button>
          ))}
        </nav>
      </aside>

      {/* ── MAIN ── */}
      <main className="dl-main">

        {/* topbar */}
        <div className="dl-topbar">
          <div>
            <h1 className="dl-topbar-titulo">
              {tabActiva==="metricas"   ? "Métricas Clave"
               :tabActiva==="favoritos" ? "Mis Favoritos"
               :                          "Gestión de Vacantes"}
            </h1>
            <p className="dl-topbar-sub">
              Bienvenido, <strong>{liderData?.nombre || usuario?.email?.split("@")[0]}</strong>
            </p>
          </div>
          {tabActiva === "vacantes" && (
            <button className="dl-btn-nueva-vacante" onClick={abrirCrear}>
              <FiPlus size={15}/> Nueva vacante
            </button>
          )}
        </div>

        <div className="dl-content">

          {/* ══════ MÉTRICAS ══════ */}
          {tabActiva === "metricas" && (
            <div className="dl-metricas">

              {/* KPIs */}
              <div className="dl-kpi-row">
                <KpiCard
                  label="Total practicantes" value={total}
                  sub="Registrados en plataforma"
                  color="#003DA5" Icon={RiTeamLine} spark={sparkData}
                />
                <KpiCard
                  label="Perfil 70%+ completo" value={perfilAlto}
                  sub={`${total>0 ? Math.round(perfilAlto/total*100) : 0}% del total`}
                  color="#16a34a" Icon={FiAward}
                />
                <KpiCard
                  label="Con experiencia" value={conExperiencia}
                  sub={`${total>0 ? Math.round(conExperiencia/total*100) : 0}% del total`}
                  color="#f59e0b" Icon={HiOutlineBriefcase}
                />
                <KpiCard
                  label="Mis favoritos" value={favoritos.length}
                  sub="Guardados por ti"
                  color="#7c3aed" Icon={FiStar}
                />
              </div>

              {/* Áreas + dona completitud */}
              <div className="dl-charts-row">
                <div className="dl-chart-card dl-chart-card-lg">
                  <h3 className="dl-chart-titulo">
                    <HiOutlineOfficeBuilding size={15}/> Practicantes por área
                  </h3>
                  <HBarChart data={areaTop} color="#003DA5"/>
                </div>
                <div className="dl-chart-card">
                  <h3 className="dl-chart-titulo">
                    <FiTrendingUp size={15}/> Completitud de perfiles
                  </h3>
                  <div className="dl-donut-wrap">
                    <DonutChart segments={[
                      { label:"80–100%", value:compBuckets["80–100%"], color:"#16a34a" },
                      { label:"60–80%",  value:compBuckets["60–80%"],  color:"#003DA5" },
                      { label:"40–60%",  value:compBuckets["40–60%"],  color:"#f59e0b" },
                      { label:"< 40%",   value:compBuckets["< 40%"],   color:"#e2e8f0" },
                    ]}/>
                    <div className="dl-donut-legend">
                      {[
                        { l:"80–100%", c:"#16a34a", v:compBuckets["80–100%"] },
                        { l:"60–80%",  c:"#003DA5", v:compBuckets["60–80%"]  },
                        { l:"40–60%",  c:"#f59e0b", v:compBuckets["40–60%"]  },
                        { l:"< 40%",   c:"#e2e8f0", v:compBuckets["< 40%"]   },
                      ].map((s) => (
                        <div key={s.l} className="dl-legend-item">
                          <span className="dl-legend-dot" style={{background:s.c}}/>
                          <span className="dl-legend-label">{s.l}</span>
                          <span className="dl-legend-val">{s.v}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>


            </div>
          )}

          {/* ══════ FAVORITOS ══════ */}
          {tabActiva === "favoritos" && (
            <div>
              {favoritos.length === 0 ? (
                <div className="dl-empty-state">
                  <FiStar size={52} color="#cbd5e1"/>
                  <h5>Aún no tienes favoritos</h5>
                  <p>Guarda perfiles desde el catálogo para verlos aquí</p>
                  <button className="dl-btn-ir" onClick={() => navigate("/catalogo")}>
                    Explorar talento
                  </button>
                </div>
              ) : (
                <>
                  <div className="dl-fav-search-wrap">
                    <IoSearchOutline size={15} style={{color:"#94a3b8",flexShrink:0}}/>
                    <input
                      className="dl-fav-search"
                      placeholder="Buscar en favoritos..."
                      value={busqFav}
                      onChange={(e) => setBusqFav(e.target.value)}
                    />
                  </div>
                  <div className="dl-grid-3">
                    {favFiltrados.map((p) => (
                      <TarjetaFav key={p.id} p={p}
                        onVer={() => irAPerfil(p.id)}
                        onQuitar={() => quitarFavorito(p.id)}
                      />
                    ))}
                    {favFiltrados.length === 0 && (
                      <p className="dl-empty-txt">Sin resultados para "{busqFav}"</p>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {/* ══════ VACANTES ══════ */}
          {tabActiva === "vacantes" && (
            <div>

              {/* Pills resumen */}
              <div className="vac-resumen-row">
                {[
                  { label:"Abiertas",    val:vacantes.filter(v=>v.estado==="Abierta").length,     color:"#10b981", bg:"#d1fae5" },
                  { label:"En revisión", val:vacantes.filter(v=>v.estado==="En revisión").length, color:"#f59e0b", bg:"#fef3c7" },
                  { label:"Cerradas",    val:vacantes.filter(v=>v.estado==="Cerrada").length,     color:"#64748b", bg:"#f1f5f9" },
                  { label:"Total",       val:vacantes.length,                                    color:"#003DA5", bg:"#eff6ff" },
                ].map((s) => (
                  <div key={s.label} className="vac-resumen-pill" style={{borderColor:s.color,background:s.bg}}>
                    <span className="vac-resumen-val" style={{color:s.color}}>{s.val}</span>
                    <span className="vac-resumen-label" style={{color:s.color}}>{s.label}</span>
                  </div>
                ))}
              </div>

              {vacantes.length === 0 ? (
                <div className="dl-empty-state">
                  <FiBriefcase size={52} color="#cbd5e1"/>
                  <h5>No tienes vacantes publicadas</h5>
                  <p>Crea una vacante interna para que los practicantes puedan postularse</p>
                  <button className="dl-btn-nueva-vacante" onClick={abrirCrear}>
                    <FiPlus size={14}/> Crear primera vacante
                  </button>
                </div>
              ) : (
                <div className="vac-grid">
                  {vacantes.map((v) => (
                    <TarjetaVacante key={v.id} v={v}
                      onEditar={() => abrirEditar(v)}
                      onEliminar={() => setConfirmDelete(v)}
                      onCambiarEstado={(nuevo) => cambiarEstadoVacante(v, nuevo)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

        </div>
      </main>

      {/* ══════ MODAL VACANTE ══════ */}
      {modalVacante && (
        <div className="vac-modal-overlay" onClick={() => setModalVacante(false)}>
          <div className="vac-modal" onClick={(e) => e.stopPropagation()}>
            <div className="vac-modal-header">
              <div className="vac-modal-header-left">
                <FiBriefcase size={18} color="#003DA5"/>
                <h3>{vacantEdit ? "Editar vacante" : "Publicar vacante"}</h3>
              </div>
              <button className="vac-modal-close" onClick={() => setModalVacante(false)}>
                <FiX size={18}/>
              </button>
            </div>

            <div className="vac-modal-body">

              {/* Fila 1: título + área */}
              <div className="vac-form-row">
                <div className="vac-form-group vac-form-group-lg">
                  <label>Título del puesto <span className="vac-req">*</span></label>
                  <input
                    placeholder="Ej: Practicante de Analítica de Datos"
                    value={vacForm.titulo}
                    onChange={(e) => setVacForm({...vacForm, titulo:e.target.value})}
                  />
                </div>
                <div className="vac-form-group">
                  <label>Área BCP <span className="vac-req">*</span></label>
                  <select value={vacForm.area} onChange={(e) => setVacForm({...vacForm, area:e.target.value})}>
                    <option value="">Seleccionar área...</option>
                    {AREAS_BCP.map((a) => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>
              </div>

              {/* Fila 2: modalidad, jornada, ubicación, estado */}
              <div className="vac-form-row">
                <div className="vac-form-group">
                  <label>Modalidad</label>
                  <select value={vacForm.modalidad} onChange={(e) => setVacForm({...vacForm, modalidad:e.target.value})}>
                    {MODALIDAD_OPC.map((m) => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
                <div className="vac-form-group">
                  <label>Jornada</label>
                  <select value={vacForm.jornada} onChange={(e) => setVacForm({...vacForm, jornada:e.target.value})}>
                    {JORNADA_OPC.map((j) => <option key={j} value={j}>{j}</option>)}
                  </select>
                </div>
                <div className="vac-form-group">
                  <label>Ubicación</label>
                  <input
                    placeholder="Lima"
                    value={vacForm.ubicacion}
                    onChange={(e) => setVacForm({...vacForm, ubicacion:e.target.value})}
                  />
                </div>
                <div className="vac-form-group">
                  <label>Estado</label>
                  <select value={vacForm.estado} onChange={(e) => setVacForm({...vacForm, estado:e.target.value})}>
                    {ESTADO_OPC.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              <div className="vac-form-group">
                <label>Descripción del puesto</label>
                <textarea
                  rows={4}
                  placeholder="Describe las responsabilidades, el equipo y el contexto del puesto..."
                  value={vacForm.descripcion}
                  onChange={(e) => setVacForm({...vacForm, descripcion:e.target.value})}
                />
              </div>

              <div className="vac-form-group">
                <label>Requisitos</label>
                <textarea
                  rows={3}
                  placeholder="Habilidades técnicas, conocimientos y experiencia requerida..."
                  value={vacForm.requisitos}
                  onChange={(e) => setVacForm({...vacForm, requisitos:e.target.value})}
                />
              </div>

            </div>

            <div className="vac-modal-footer">
              <button className="vac-btn-cancel" onClick={() => setModalVacante(false)}>
                Cancelar
              </button>
              <button className="vac-btn-guardar" onClick={guardarVacante} disabled={guardandoVac}>
                <FiCheck size={14}/>
                {guardandoVac ? "Guardando..." : vacantEdit ? "Guardar cambios" : "Publicar vacante"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════ CONFIRM DELETE ══════ */}
      {confirmDelete && (
        <div className="vac-modal-overlay" onClick={() => setConfirmDelete(null)}>
          <div className="vac-confirm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="vac-confirm-icon"><FiTrash2 size={28}/></div>
            <h4>¿Eliminar vacante?</h4>
            <p>"{confirmDelete.titulo}" se eliminará permanentemente y no se podrá recuperar.</p>
            <div className="vac-confirm-actions">
              <button className="vac-btn-cancel" onClick={() => setConfirmDelete(null)}>Cancelar</button>
              <button className="vac-btn-delete" onClick={() => eliminarVacante(confirmDelete.id)}>
                Sí, eliminar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

/* ════════════════════════════════════════
   COMPONENTES AUXILIARES
════════════════════════════════════════ */
function KpiCard({ label, value, sub, color, Icon, spark }) {
  return (
    <div className="dl-kpi-card">
      <div className="dl-kpi-top">
        <div className="dl-kpi-icon-wrap" style={{ background:`${color}15`, color }}>
          <Icon size={20}/>
        </div>
        {spark && <SparkLine values={spark} color={color} width={88} height={36}/>}
      </div>
      <p className="dl-kpi-value" style={{ color }}>{value}</p>
      <p className="dl-kpi-label">{label}</p>
      {sub && <p className="dl-kpi-sub">{sub}</p>}
    </div>
  );
}

function TarjetaFav({ p, onVer, onQuitar }) {
  const ubicacion = [p.ciudad, p.pais].filter(Boolean).join(", ") || p.distrito;
  return (
    <div className="dl-person-card">
      <div className="dl-person-header">
        <div className="dl-person-avatar">
          {p.foto
            ? <img src={p.foto} alt={p.nombre} style={{width:"100%",height:"100%",borderRadius:"50%",objectFit:"cover"}}/>
            : p.nombre?.charAt(0)?.toUpperCase()
          }
        </div>
        <div style={{flex:1,minWidth:0}}>
          <p className="dl-person-nombre">{p.nombre}</p>
          <p className="dl-person-titulo">{p.titulo || "Sin título"}</p>
          {ubicacion && <p className="dl-person-meta"><FiMapPin size={10}/> {ubicacion}</p>}
        </div>
      </div>
      {p.area && <span className="dl-badge-area">{p.area}</span>}
      <div className="dl-person-tags">
        {(p.skills||[]).slice(0,3).map((s,i) => <span key={i} className="dl-tag-tec">{s}</span>)}
      </div>
      <div className="dl-person-actions">
        <button className="dl-btn-ver" onClick={onVer}>Ver perfil</button>
        {p.email && (
          <a href={`mailto:${p.email}?subject=Oportunidad BCP`} className="dl-btn-mail">
            <FiMail size={13}/>
          </a>
        )}
        <button className="dl-btn-quitar" onClick={onQuitar} title="Quitar de favoritos">✕</button>
      </div>
    </div>
  );
}

function TarjetaVacante({ v, onEditar, onEliminar, onCambiarEstado }) {
  const ec = ESTADO_META[v.estado] || ESTADO_META["Cerrada"];
  const [menuEstado, setMenuEstado] = useState(false);

  return (
    <div className={`vac-card ${v.estado === "Cerrada" ? "vac-card-cerrada" : ""}`}>

      {/* Header */}
      <div className="vac-card-header">
        <div style={{flex:1, minWidth:0}}>
          <h4 className="vac-card-titulo">{v.titulo}</h4>
          <p className="vac-card-area">{v.area}</p>
        </div>
        <div
          className="vac-estado-badge"
          style={{ background:ec.bg, color:ec.color }}
          onClick={() => setMenuEstado((x) => !x)}
        >
          <span className="vac-estado-dot" style={{background:ec.dot}}/>
          {v.estado}
          {menuEstado && (
            <div className="vac-estado-menu" onClick={(e) => e.stopPropagation()}>
              {ESTADO_OPC.filter((s) => s !== v.estado).map((s) => {
                const m = ESTADO_META[s];
                return (
                  <button key={s} style={{color:m.color}}
                    onClick={() => { onCambiarEstado(s); setMenuEstado(false); }}>
                    <span style={{width:8,height:8,borderRadius:"50%",background:m.dot,display:"inline-block",marginRight:7}}/>
                    {s}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Meta */}
      <div className="vac-card-meta">
        <span><FiMapPin size={11}/> {v.ubicacion || "Lima"}</span>
        <span><FiClock size={11}/> {v.jornada}</span>
        <span><FiEye size={11}/> {v.modalidad}</span>
      </div>

      {v.descripcion && (
        <p className="vac-card-desc">
          {v.descripcion.length > 130 ? v.descripcion.slice(0,130) + "…" : v.descripcion}
        </p>
      )}

      {v.requisitos && (
        <div className="vac-card-req">
          <strong>Requisitos:</strong>
          <p>{v.requisitos.length > 110 ? v.requisitos.slice(0,110) + "…" : v.requisitos}</p>
        </div>
      )}

      <div className="vac-card-actions">
        <button className="vac-btn-edit" onClick={onEditar}>
          <FiEdit2 size={12}/> Editar
        </button>
        <button className="vac-btn-del" onClick={onEliminar}>
          <FiTrash2 size={12}/> Eliminar
        </button>
      </div>
    </div>
  );
}

export default DashboardLider;
