import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { db, auth } from "../firebase/firebase.js";
import { signOut } from "firebase/auth";
import {
  collection, query, where, getDocs,
  doc, getDoc, updateDoc, arrayRemove,
  addDoc, serverTimestamp, deleteDoc,
} from "firebase/firestore";
import { useRol } from "../hooks/useRol.js";
import Navbar from "../components/Navbar.jsx";
import "../stylesheets/DashboardLider.css";

import {
  FiStar, FiMail, FiMapPin, FiUsers,
  FiTrendingUp, FiLogOut, FiBriefcase,
  FiPlusCircle, FiTrash2, FiEdit2, FiEye,
} from "react-icons/fi";
import { MdBolt } from "react-icons/md";
import { HiOutlineBriefcase, HiOutlineOfficeBuilding } from "react-icons/hi";
import { RiTeamLine } from "react-icons/ri";
import { IoSearchOutline } from "react-icons/io5";
import logo from "../images/LogoBCP.png";
/* ── helpers ── */
const calcComp = (p) => {
  const c = [
    p.titulo, p.resumen, p.area, p.intereses,
    p.experiencia?.length > 0, p.educacion?.length > 0,
    p.idiomas?.length > 0, p.cursos?.length > 0,
  ];
  return Math.round(c.filter(Boolean).length / c.length * 100);
};

/* ── Gráfico barras horizontales ── */
function HBarChart({ data, color = "#003DA5" }) {
  if (!data.length) return <p className="dl-empty-txt">Sin datos aún</p>;
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="dl-hbar-list">
      {data.map((d, i) => (
        <div key={i} className="dl-hbar-row">
          <span className="dl-hbar-label" title={d.label}>{d.label}</span>
          <div className="dl-hbar-track">
            <div className="dl-hbar-fill" style={{ width:`${(d.value/max)*100}%`, background:color }}/>
          </div>
          <span className="dl-hbar-val">{d.value}</span>
        </div>
      ))}
    </div>
  );
}

/* ── Dona SVG ── */
function DonutChart({ segments, size = 120 }) {
  const r = 42; const cx = size/2; const cy = size/2;
  const circ = 2*Math.PI*r;
  const total = segments.reduce((s,d) => s+d.value, 0) || 1;
  let offset = 0;
  const arcs = segments.map((seg) => {
    const dash = (seg.value/total)*circ;
    const arc  = { ...seg, dash, offset: circ-offset };
    offset += dash;
    return arc;
  });
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f3f4f6" strokeWidth={18}/>
      {arcs.map((arc,i) => (
        <circle key={i} cx={cx} cy={cy} r={r} fill="none" stroke={arc.color} strokeWidth={18}
          strokeDasharray={`${arc.dash} ${circ}`} strokeDashoffset={arc.offset}
          style={{transform:"rotate(-90deg)", transformOrigin:"center"}}/>
      ))}
      <text x={cx} y={cy+6} textAnchor="middle" fontSize={20} fontWeight="800" fill="#111827">{total}</text>
    </svg>
  );
}

/* ── Sparkline ── */
function SparkLine({ values, color="#003DA5", width=100, height=40 }) {
  if (values.length < 2) return null;
  const max=Math.max(...values,1); const min=Math.min(...values); const rng=max-min||1;
  const pts=values.map((v,i) => {
    const x=(i/(values.length-1))*width;
    const y=height-((v-min)/rng)*(height-8)-4;
    return `${x},${y}`;
  });
  const area=`M${pts[0]} ${pts.slice(1).map(p=>`L${p}`).join(" ")} L${width},${height} L0,${height} Z`;
  const line=`M${pts[0]} ${pts.slice(1).map(p=>`L${p}`).join(" ")}`;
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{overflow:"visible"}}>
      <path d={area} fill={color} fillOpacity={0.12}/>
      <path d={line} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round"/>
      {values.map((v,i) => {
        const x=(i/(values.length-1))*width;
        const y=height-((v-min)/rng)*(height-8)-4;
        return <circle key={i} cx={x} cy={y} r={2.5} fill={color}/>;
      })}
    </svg>
  );
}

const AREAS_BCP = [
  "Analítica & Tecnología","Finanzas & Control","Gestión & Operaciones",
  "Comunicación & Relación","Riesgos & Cumplimiento","Marketing & Experiencia Cliente",
];

/* ════════════════════════════════════════════
   DASHBOARD LÍDER
   Acceso: rol === "lider" (verificado por Firestore, no por correo)
════════════════════════════════════════════ */
function DashboardLider() {
  const navigate = useNavigate();

  /* ── Verificación de rol por Firestore ── */
  const { user, rol, docId: liderDocId, cargando: cargandoRol } = useRol();

  const [liderData,    setLiderData]    = useState(null);
  const [practicantes, setPracticantes] = useState([]);
  const [favoritos,    setFavoritos]    = useState([]);
  const [cargando,     setCargando]     = useState(true);
  const [tabActiva,    setTabActiva]    = useState("metricas");
  const [busqFav,      setBusqFav]      = useState("");
  const [sidebarOpen,  setSidebarOpen]  = useState(false);
  const [modalVacante, setModalVacante] = useState(false);
  const [vacanteEdit,  setVacanteEdit]  = useState(null);

  /* Guard — redirige si no es líder */
  useEffect(() => {
    if (!cargandoRol && (!user || rol !== "lider")) {
      navigate("/auth");
    }
  }, [cargandoRol, user, rol, navigate]);

  /* Cargar datos */
  useEffect(() => {
    if (!liderDocId) return;
    const cargar = async () => {
      try {
        /* Info del líder */
        const lSnap = await getDocs(query(collection(db, "lideres"), where("uid", "==", user.uid)));
        lSnap.forEach((d) => setLiderData({ id: d.id, ...d.data() }));

        /* Practicantes */
        const pSnap = await getDocs(collection(db, "practicantes"));
        setPracticantes(pSnap.docs.map((d) => ({ id: d.id, ...d.data() })));

        /* Favoritos */
        const lDoc = lSnap.docs[0]?.data();
        if (lDoc?.favoritos?.length) {
          const favs = await Promise.all(
            lDoc.favoritos.map(async (fid) => {
              const s = await getDoc(doc(db, "practicantes", fid));
              return s.exists() ? { id: fid, ...s.data() } : null;
            })
          );
          setFavoritos(favs.filter(Boolean));
        }

      } catch (e) { console.error(e); }
      finally { setCargando(false); }
    };
    cargar();
  }, [liderDocId, user]);

  const quitarFavorito = async (favId) => {
    await updateDoc(doc(db, "lideres", liderDocId), { favoritos: arrayRemove(favId) });
    setFavoritos((prev) => prev.filter((f) => f.id !== favId));
  };

  const irAPerfil = (pid) => navigate(`/perfil/${pid}`);

  /* ── Métricas ── */
  const total      = practicantes.length;
  const conExp     = practicantes.filter((p) => p.experiencia?.length > 0).length;
  const conRot     = practicantes.filter((p) => p.rotaciones?.length > 0).length;
  const perfilAlto = practicantes.filter((p) => calcComp(p) >= 70).length;
  const conProy    = practicantes.filter((p) => p.proyectos?.length > 0).length;

  const areaTop = Object.entries(
    practicantes.reduce((acc,p) => { if(p.area) acc[p.area]=(acc[p.area]||0)+1; return acc; }, {})
  ).sort((a,b) => b[1]-a[1]).slice(0,6).map(([label,value]) => ({ label:label.split(" ")[0], value }));


  const compBuckets = { "< 40%":0, "40–60%":0, "60–80%":0, "80–100%":0 };
  practicantes.forEach((p) => {
    const c = calcComp(p);
    if(c<40) compBuckets["< 40%"]++;
    else if(c<60) compBuckets["40–60%"]++;
    else if(c<80) compBuckets["60–80%"]++;
    else compBuckets["80–100%"]++;
  });

  const sparkData = [Math.max(1,total-5),total-3,total-4,total-1,total-2,total].map(v => Math.max(0,v));
  const favFiltrados = favoritos.filter(p => !busqFav || p.nombre?.toLowerCase().includes(busqFav.toLowerCase()));

  if (cargandoRol || cargando) return (
    <div className="dl-carga"><div className="spinner-bcp"/><p>Cargando dashboard...</p></div>
  );

  if (rol !== "lider") return null; // guard extra mientras redirige

  return (
    <div className="dl-wrapper">

      {/* ── Overlay mobile sidebar ── */}
      {sidebarOpen && (
        <div
          className="dl-sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* ── SIDEBAR ── */}
      <aside
        className={`dl-sidebar ${sidebarOpen ? "dl-sidebar-open" : ""}`}
        aria-label="Menú de navegación del dashboard"
      >
        <div className="dl-sidebar-logo">
          <img
            src={logo}
            alt="Talento BCP"
            className="dl-logo-icon"
          />
          <span className="dl-logo-text">Talento BCP</span>
        </div>

        <div className="dl-sidebar-user">
          <div className="dl-user-avatar">
            {(liderData?.nombre||user?.email||"L")[0].toUpperCase()}
          </div>
          <div className="dl-user-info">
            <p className="dl-user-nombre">{liderData?.nombre||"Líder"}</p>
            <p className="dl-user-email">{user?.email?.split("@")[0]}</p>
          </div>
        </div>

        <nav className="dl-nav">
          {[
            { id:"metricas",  Icon:FiTrendingUp, label:"Métricas" },
            { id:"favoritos", Icon:FiStar,       label:"Favoritos",  badge:favoritos.length,                          badgeColor:"#d97706" },
          ].map(({ id, Icon, label, badge, badgeColor }) => (
            <button key={id}
              className={`dl-nav-btn ${tabActiva===id?"dl-nav-active":""}`}
              onClick={() => setTabActiva(id)}
            >
              <Icon size={17}/><span>{label}</span>
              {badge>0 && <span className="dl-nav-badge" style={{background:badgeColor}}>{badge}</span>}
            </button>
          ))}
        </nav>

        <div className="dl-sidebar-footer">
          <button className="dl-nav-btn dl-nav-btn-sec" onClick={() => navigate("/catalogo")}>
            <FiUsers size={17}/><span>Ver catálogo</span>
          </button>
          <button className="dl-nav-btn dl-nav-btn-sec" onClick={async () => { await signOut(auth); navigate("/"); }}>
            <FiLogOut size={17}/><span>Cerrar sesión</span>
          </button>
        </div>
      </aside>

      {/* ── MAIN ── */}
      <main className="dl-main">
        <div className="dl-topbar">
          {/* Hamburger mobile */}
          <button
            className="dl-hamburger"
            onClick={() => setSidebarOpen((v) => !v)}
            aria-label="Abrir menú"
            aria-expanded={sidebarOpen}
          >
            <span/><span/><span/>
          </button>
          <div>
            <h1 className="dl-topbar-titulo">
              {tabActiva==="metricas" ? "Métricas de Talento" : tabActiva==="favoritos" ? "Mis Favoritos" : " "}
            </h1>
            <p className="dl-topbar-sub">
              Bienvenido, <strong>{liderData?.nombre||user?.email?.split("@")[0]}</strong>
            </p>
          </div>
        </div>

        <div className="dl-content">

          {/* ════ MÉTRICAS ════ */}
          {tabActiva==="metricas" && (
            <div className="dl-metricas">
              <div className="dl-kpi-row">
                <KpiCard label="Total practicantes" value={total} sub="Registrados en plataforma"
                  color="#003DA5" Icon={RiTeamLine} spark={sparkData}/>
                <KpiCard label="Perfil 70%+" value={perfilAlto}
                  sub={`${total>0?Math.round(perfilAlto/total*100):0}% del total`}
                  color="#16a34a" Icon={HiOutlineBriefcase}/>
                <KpiCard label="Con experiencia" value={conExp}
                  sub={`${total>0?Math.round(conExp/total*100):0}% del total`}
                  color="#d97706" Icon={HiOutlineBriefcase}/>
                <KpiCard label="Mis favoritos" value={favoritos.length}
                  sub="Guardados por ti" color="#7c3aed" Icon={FiStar}/>
              </div>

              <div className="dl-charts-row">
                <div className="dl-chart-card dl-chart-card-lg">
                  <h3 className="dl-chart-titulo"><HiOutlineOfficeBuilding size={15}/> Practicantes por área</h3>
                  <HBarChart data={areaTop} color="#003DA5"/>
                </div>
                <div className="dl-chart-card">
                  <h3 className="dl-chart-titulo"><FiTrendingUp size={15}/> Completitud de perfiles</h3>
                  <div className="dl-donut-wrap">
                    <DonutChart segments={[
                      { label:"80–100%", value:compBuckets["80–100%"], color:"#16a34a" },
                      { label:"60–80%",  value:compBuckets["60–80%"],  color:"#003DA5" },
                      { label:"40–60%",  value:compBuckets["40–60%"],  color:"#d97706" },
                      { label:"< 40%",   value:compBuckets["< 40%"],   color:"#e5e7eb" },
                    ]}/>
                    <div className="dl-donut-legend">
                      {[
                        { l:"80–100%", c:"#16a34a", v:compBuckets["80–100%"] },
                        { l:"60–80%",  c:"#003DA5", v:compBuckets["60–80%"] },
                        { l:"40–60%",  c:"#d97706", v:compBuckets["40–60%"] },
                        { l:"< 40%",   c:"#e5e7eb", v:compBuckets["< 40%"] },
                      ].map(s => (
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

          {/* ════ FAVORITOS ════ */}
          {tabActiva==="favoritos" && (
            <div>
              {favoritos.length===0 ? (
                <div className="dl-empty-state">
                  <FiStar size={48} color="#d1d5db"/>
                  <h5>Aún no tienes favoritos</h5>
                  <p>Guarda perfiles desde el catálogo de talento</p>
                  <button className="dl-btn-ir" onClick={() => navigate("/catalogo")}>Explorar talento</button>
                </div>
              ) : (
                <>
                  <div className="dl-fav-search-wrap">
                    <IoSearchOutline size={15} style={{color:"#9ca3af",flexShrink:0}}/>
                    <input className="dl-fav-search" placeholder="Buscar en favoritos..." value={busqFav} onChange={e=>setBusqFav(e.target.value)}/>
                  </div>
                  <div className="dl-grid-3">
                    {favFiltrados.map(p => (
                      <TarjetaFav key={p.id} p={p} onVer={() => irAPerfil(p.id)} onQuitar={() => quitarFavorito(p.id)}/>
                    ))}
                    {favFiltrados.length===0 && <p className="dl-empty-txt">Sin resultados para "{busqFav}"</p>}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </main>

    </div>
  );
}

/* ── KPI card ── */
function KpiCard({ label, value, sub, color, Icon, spark }) {
  return (
    <div className="dl-kpi-card">
      <div className="dl-kpi-top">
        <div className="dl-kpi-icon-wrap" style={{background:`${color}18`,color}}><Icon size={18}/></div>
        {spark && <SparkLine values={spark} color={color} width={90} height={38}/>}
      </div>
      <p className="dl-kpi-value" style={{color}}>{value}</p>
      <p className="dl-kpi-label">{label}</p>
      {sub && <p className="dl-kpi-sub">{sub}</p>}
    </div>
  );
}

/* ── Tarjeta favorito ── */
function TarjetaFav({ p, onVer, onQuitar }) {
  const ubicacion = [p.ciudad,p.pais].filter(Boolean).join(", ")||p.distrito;
  return (
    <div className="dl-person-card">
      <div className="dl-person-header">
        <div className="dl-person-avatar">
          {p.foto
            ? <img src={p.foto} alt={p.nombre} style={{width:"100%",height:"100%",borderRadius:"50%",objectFit:"cover"}}/>
            : p.nombre?.charAt(0)?.toUpperCase()}
        </div>
        <div style={{flex:1,minWidth:0}}>
          <p className="dl-person-nombre">{p.nombre}</p>
          <p className="dl-person-titulo">{p.titulo||"Sin título"}</p>
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
          <a href={`mailto:${p.email}?subject=Oportunidad BCP`} className="dl-btn-mail"><FiMail size={13}/></a>
        )}
        <button className="dl-btn-quitar" onClick={onQuitar} title="Quitar de favoritos">✕</button>
      </div>
    </div>
  );
}

export default DashboardLider;
