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

/* ── Gráfico barras horizontales PRO ── */
function HBarChart({ data, color = "#003DA5" }) {
  const [hover, setHover] = useState(null);
  if (!data.length) return <p className="dl-empty-txt">Sin datos aún</p>;
  const max = Math.max(...data.map((d) => d.value), 1);
  const total = data.reduce((s, d) => s + d.value, 0) || 1;

  return (
    <div className="dl-hbar-pro">
      {data.map((d, i) => {
        const pct = (d.value / max) * 100;
        const share = Math.round((d.value / total) * 100);
        const isHover = hover === i;
        return (
          <div
            key={i}
            className={`dl-hbar-pro-row ${isHover ? "dl-hbar-pro-row-hover" : ""}`}
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
          >
            <div className="dl-hbar-pro-top">
              <span className="dl-hbar-pro-label">{d.label}</span>
              <span className="dl-hbar-pro-val">
                <strong>{d.value}</strong>
                <span className="dl-hbar-pro-share">{share}%</span>
              </span>
            </div>
            <div className="dl-hbar-pro-track">
              <div
                className="dl-hbar-pro-fill"
                style={{
                  width: `${pct}%`,
                  background: `linear-gradient(90deg, ${color} 0%, ${color}dd 80%, ${color}aa 100%)`,
                  boxShadow: isHover ? `0 2px 10px ${color}55` : "none",
                }}
              />
            </div>
            {isHover && (
              <div className="dl-hbar-pro-tooltip">
                {d.value} practicante{d.value === 1 ? "" : "s"} · {share}% del total
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ── Dona SVG PRO ── */
function DonutChart({ segments, size = 150 }) {
  const [hover, setHover] = useState(null);
  const r = 56;
  const strokeW = 20;
  const cx = size / 2;
  const cy = size / 2;
  const circ = 2 * Math.PI * r;
  const total = segments.reduce((s, d) => s + d.value, 0) || 1;

  let offset = 0;
  const arcs = segments.map((seg) => {
    const dash = (seg.value / total) * circ;
    const arc = { ...seg, dash, dashoffset: circ - offset };
    offset += dash;
    return arc;
  });

  const activo = hover !== null ? arcs[hover] : null;
  const centroNum = activo ? activo.value : total;
  const centroLab = activo ? activo.label : "Total";

  return (
    <div className="dl-donut-pro-svg-wrap">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="dl-donut-pro-svg">
        <defs>
          <filter id="donutSoft" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="1.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f1f5f9" strokeWidth={strokeW} />
        {arcs.map((arc, i) => {
          const isHover = hover === i;
          return (
            <circle
              key={i}
              cx={cx}
              cy={cy}
              r={r}
              fill="none"
              stroke={arc.color}
              strokeWidth={isHover ? strokeW + 4 : strokeW}
              strokeDasharray={`${arc.dash} ${circ}`}
              strokeDashoffset={arc.dashoffset}
              strokeLinecap="round"
              style={{
                transform: "rotate(-90deg)",
                transformOrigin: "center",
                transition: "stroke-width 0.2s ease, filter 0.2s ease",
                filter: isHover ? "url(#donutSoft)" : "none",
                cursor: "pointer",
              }}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
            />
          );
        })}
        <text x={cx} y={cy - 4} textAnchor="middle" fontSize={24} fontWeight="800" fill="#111827">
          {centroNum}
        </text>
        <text x={cx} y={cy + 14} textAnchor="middle" fontSize={9} fontWeight="600" fill="#64748b" style={{ textTransform: "uppercase", letterSpacing: "0.8px" }}>
          {centroLab}
        </text>
      </svg>
    </div>
  );
}

/* ── Mapa de Perú completo (viewBox 0 0 500 600) ── */
const DEPARTAMENTOS_PERU = [
  {
    name: "Tumbes",
    aliases: ["tumbes", "zarumilla"],
    d: "M38,18 L52,18 L56,28 L50,38 L38,35 L34,25 Z",
  },
  {
    name: "Piura",
    aliases: ["piura", "sullana", "talara", "paita"],
    d: "M34,25 L56,22 L70,20 L80,30 L78,48 L68,60 L55,65 L42,58 L34,45 L30,35 Z",
  },
  {
    name: "Lambayeque",
    aliases: ["lambayeque", "chiclayo", "ferreñafe"],
    d: "M68,60 L82,52 L92,62 L88,75 L74,78 L62,72 Z",
  },
  {
    name: "La Libertad",
    aliases: ["la libertad", "trujillo", "huamachuco"],
    d: "M74,78 L92,68 L106,72 L112,88 L104,102 L88,106 L74,98 L70,88 Z",
  },
  {
    name: "Áncash",
    aliases: ["ancash", "áncash", "huaraz", "chimbote"],
    d: "M82,100 L104,96 L116,108 L118,126 L106,134 L88,130 L78,118 L76,106 Z",
  },
  {
    name: "Cajamarca",
    aliases: ["cajamarca"],
    d: "M92,62 L116,58 L132,68 L136,86 L122,96 L106,92 L92,80 Z",
  },
  {
    name: "Amazonas",
    aliases: ["amazonas", "chachapoyas"],
    d: "M116,48 L140,44 L158,54 L162,74 L148,86 L132,84 L118,72 Z",
  },
  {
    name: "San Martín",
    aliases: ["san martin", "san martín", "tarapoto", "moyobamba"],
    d: "M148,68 L172,62 L188,74 L188,96 L172,108 L152,106 L140,92 L140,78 Z",
  },
  {
    name: "Loreto",
    aliases: ["loreto", "iquitos", "maynas"],
    d: "M158,38 L220,20 L280,24 L310,50 L308,100 L286,130 L256,148 L220,152 L192,140 L172,120 L158,100 L148,80 L148,58 Z",
  },
  {
    name: "Huánuco",
    aliases: ["huanuco", "huánuco"],
    d: "M120,126 L148,118 L162,130 L164,150 L150,164 L130,164 L116,152 L112,138 Z",
  },
  {
    name: "Ucayali",
    aliases: ["ucayali", "pucallpa"],
    d: "M172,118 L210,114 L230,130 L234,162 L226,194 L208,214 L186,220 L166,210 L152,190 L148,162 L152,140 L162,128 Z",
  },
  {
    name: "Pasco",
    aliases: ["pasco", "cerro de pasco"],
    d: "M120,152 L148,146 L158,160 L156,178 L138,184 L120,176 L112,162 Z",
  },
  {
    name: "Lima",
    aliases: ["lima", "callao"],
    d: "M86,132 L110,128 L122,140 L124,158 L114,170 L96,172 L82,160 L80,146 Z",
  },
  {
    name: "Junín",
    aliases: ["junin", "junín", "huancayo"],
    d: "M122,158 L150,152 L166,164 L168,184 L152,196 L132,196 L116,184 L114,168 Z",
  },
  {
    name: "Ica",
    aliases: ["ica", "pisco", "nazca"],
    d: "M86,168 L114,164 L126,178 L124,198 L108,208 L88,206 L74,192 L76,178 Z",
  },
  {
    name: "Huancavelica",
    aliases: ["huancavelica"],
    d: "M116,168 L148,164 L160,178 L158,196 L140,204 L120,200 L108,186 L110,172 Z",
  },
  {
    name: "Ayacucho",
    aliases: ["ayacucho"],
    d: "M120,196 L158,192 L176,204 L178,228 L162,244 L138,246 L118,234 L112,216 Z",
  },
  {
    name: "Apurímac",
    aliases: ["apurimac", "apurímac", "abancay"],
    d: "M152,194 L180,188 L196,200 L198,220 L184,232 L162,232 L148,218 L146,204 Z",
  },
  {
    name: "Cusco",
    aliases: ["cusco", "cuzco"],
    d: "M180,200 L218,196 L240,210 L246,240 L238,266 L214,280 L188,278 L166,262 L160,238 L164,216 Z",
  },
  {
    name: "Madre de Dios",
    aliases: ["madre de dios", "puerto maldonado"],
    d: "M226,200 L278,196 L312,212 L320,250 L310,278 L282,292 L250,290 L226,272 L216,248 L216,222 Z",
  },
  {
    name: "Puno",
    aliases: ["puno"],
    d: "M192,250 L230,244 L256,258 L264,290 L258,316 L234,330 L206,326 L186,308 L180,282 L184,260 Z",
  },
  {
    name: "Arequipa",
    aliases: ["arequipa"],
    d: "M128,242 L164,238 L192,248 L196,280 L188,308 L166,320 L140,316 L118,300 L112,272 L116,252 Z",
  },
  {
    name: "Moquegua",
    aliases: ["moquegua"],
    d: "M166,316 L196,310 L212,322 L216,344 L202,356 L180,354 L162,340 L160,326 Z",
  },
  {
    name: "Tacna",
    aliases: ["tacna"],
    d: "M180,350 L210,344 L226,358 L224,378 L206,386 L184,380 L172,366 L174,354 Z",
  },
];

const normalizar = (s) =>
  (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();

function MapaPeru({ practicantes }) {
  const [hover, setHover] = useState(null);

  const conteos = DEPARTAMENTOS_PERU.map((dep) => {
    const nombres = [normalizar(dep.name), ...dep.aliases.map(normalizar)];
    const count = practicantes.filter((p) => {
      const pais = normalizar(p.pais);
      if (pais && pais !== "peru" && pais !== "perú") return false;
      const ciudad = normalizar(p.ciudad);
      const distrito = normalizar(p.distrito);
      const departamento = normalizar(p.departamento);
      return nombres.some(
        (n) => ciudad.includes(n) || distrito.includes(n) || departamento.includes(n)
      );
    }).length;
    return { ...dep, count };
  });

  const maxCount = Math.max(...conteos.map((c) => c.count), 1);
  const totalUbic = conteos.reduce((s, d) => s + d.count, 0);
  const sinUbic = practicantes.length - totalUbic;

  const fillFor = (count) => {
    if (count === 0) return "#dbeafe";
    if (count === maxCount && maxCount > 0) return "#f97316";
    return "#1d4ed8";
  };

  return (
    <div className="dl-map-wrap">
      <div className="dl-map-svg-wrap">
        <svg
          viewBox="0 0 360 420"
          className="dl-map-svg"
          preserveAspectRatio="xMidYMid meet"
          onMouseLeave={() => setHover(null)}
          style={{ filter: "drop-shadow(0px 4px 6px rgba(0,0,0,0.08))" }}
        >
          {conteos.map((dep, i) => {
            const isHover = hover?.i === i;
            return (
              <path
                key={i}
                d={dep.d}
                fill={isHover ? "#003DA5" : fillFor(dep.count)}
                stroke={isHover ? "#003DA5" : "#93c5fd"}
                strokeWidth={isHover ? 1.5 : 0.8}
                strokeLinejoin="round"
                style={{ cursor: "pointer", transition: "all 0.2s ease" }}
                onMouseEnter={() => setHover({ ...dep, i })}
              />
            );
          })}
        </svg>

        {hover && (
          <div
            className="dl-map-tooltip"
            style={{ left: "50%", top: "12px", transform: "translateX(-50%)" }}
          >
            <div className="dl-map-tt-title">{hover.name}</div>
            <div className="dl-map-tt-body">
              {hover.count === 0 ? (
                <span className="dl-map-tt-none">Sin practicantes</span>
              ) : (
                <>
                  <strong>{hover.count}</strong>
                  <span> practicante{hover.count === 1 ? "" : "s"}</span>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="dl-map-legend">
        <div className="dl-map-legend-item">
          <span className="dl-map-legend-dot dl-map-legend-dot-blue" />
          <span>Con practicantes</span>
        </div>
        <div className="dl-map-legend-item">
          <span className="dl-map-legend-dot dl-map-legend-dot-orange" />
          <span>Región líder</span>
        </div>
        <div className="dl-map-legend-item">
          <span className="dl-map-legend-dot dl-map-legend-dot-gray" />
          <span>Sin registros</span>
        </div>
        {sinUbic > 0 && (
          <div className="dl-map-sin-ubic">
            <span>{sinUbic}</span> sin ubicación registrada
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Sparkline ── */
function SparkLine({ values, color = "#003DA5", width = 100, height = 40 }) {
  if (values.length < 2) return null;
  const max = Math.max(...values, 1);
  const min = Math.min(...values);
  const rng = max - min || 1;
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * width;
    const y = height - ((v - min) / rng) * (height - 8) - 4;
    return `${x},${y}`;
  });
  const area = `M${pts[0]} ${pts.slice(1).map(p => `L${p}`).join(" ")} L${width},${height} L0,${height} Z`;
  const line = `M${pts[0]} ${pts.slice(1).map(p => `L${p}`).join(" ")}`;
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ overflow: "visible" }}>
      <path d={area} fill={color} fillOpacity={0.12} />
      <path d={line} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" />
      {values.map((v, i) => {
        const x = (i / (values.length - 1)) * width;
        const y = height - ((v - min) / rng) * (height - 8) - 4;
        return <circle key={i} cx={x} cy={y} r={2.5} fill={color} />;
      })}
    </svg>
  );
}

/* ════════════════════════════════════════════
   DASHBOARD LÍDER
════════════════════════════════════════════ */
function DashboardLider() {
  const navigate = useNavigate();
  const { user, rol, docId: liderDocId, cargando: cargandoRol } = useRol();

  const [liderData, setLiderData] = useState(null);
  const [practicantes, setPracticantes] = useState([]);
  const [favoritos, setFavoritos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [tabActiva, setTabActiva] = useState("metricas");
  const [busqFav, setBusqFav] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!cargandoRol && (!user || rol !== "lider")) {
      navigate("/auth");
    }
  }, [cargandoRol, user, rol, navigate]);

  useEffect(() => {
    if (!liderDocId) return;
    const cargar = async () => {
      try {
        const lSnap = await getDocs(query(collection(db, "lideres"), where("uid", "==", user.uid)));
        lSnap.forEach((d) => setLiderData({ id: d.id, ...d.data() }));

        const pSnap = await getDocs(collection(db, "practicantes"));
        setPracticantes(pSnap.docs.map((d) => ({ id: d.id, ...d.data() })));

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
  const total = practicantes.length;
  const conExp = practicantes.filter((p) => p.experiencia?.length > 0).length;
  const perfilAlto = practicantes.filter((p) => calcComp(p) >= 70).length;

  const areaTop = Object.entries(
    practicantes.reduce((acc, p) => {
      if (p.area) acc[p.area] = (acc[p.area] || 0) + 1;
      return acc;
    }, {})
  ).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([label, value]) => ({ label, value }));

  const compBuckets = { "< 40%": 0, "40–60%": 0, "60–80%": 0, "80–100%": 0 };
  practicantes.forEach((p) => {
    const c = calcComp(p);
    if (c < 40) compBuckets["< 40%"]++;
    else if (c < 60) compBuckets["40–60%"]++;
    else if (c < 80) compBuckets["60–80%"]++;
    else compBuckets["80–100%"]++;
  });

  const sparkData = [
    Math.max(0, total - 5), Math.max(0, total - 3), Math.max(0, total - 4),
    Math.max(0, total - 1), Math.max(0, total - 2), total
  ];
  const favFiltrados = favoritos.filter(
    (p) => !busqFav || p.nombre?.toLowerCase().includes(busqFav.toLowerCase())
  );

  if (cargandoRol || cargando) return (
    <div className="dl-carga">
      <div className="spinner-bcp" />
      <p>Cargando dashboard...</p>
    </div>
  );

  if (rol !== "lider") return null;

  return (
    <div className="dl-wrapper">
      {sidebarOpen && (
        <div
          className="dl-sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      <main className="dl-main">
        {/* ── TOPBAR ── */}
        <div className="dl-topbar">
          <div>
            <h1 className="dl-topbar-titulo">
              {tabActiva === "metricas" ? "Métricas de Talento"
                : tabActiva === "favoritos" ? "Mis Favoritos"
                  : " "}
            </h1>
            <p className="dl-topbar-sub">
              Bienvenido, <strong>{liderData?.nombre || user?.email?.split("@")[0]}</strong>
            </p>
          </div>
          <div className="dl-final">
            <nav className="dl-nav">
              {[
                { id: "metricas", Icon: FiTrendingUp, label: "Métricas" },
                { id: "favoritos", Icon: FiStar, label: "Favoritos", badge: favoritos.length, badgeColor: "#003DA5" },
              ].map(({ id, Icon, label, badge, badgeColor }) => (
                <button
                  key={id}
                  className={`dl-nav-btn ${tabActiva === id ? "dl-nav-active" : ""}`}
                  onClick={() => setTabActiva(id)}
                >
                  <Icon size={17} /><span>{label}</span>
                  {badge > 0 && (
                    <span className="dl-nav-badge" style={{ background: badgeColor }}>{badge}</span>
                  )}
                </button>
              ))}
            </nav>
          </div>
        </div>

        <div className="dl-content">

          {/* ════ MÉTRICAS ════ */}
          {tabActiva === "metricas" && (
            <div className="dl-metricas">
              {/*
                GRID: 4 cols × 2 filas en desktop
                Orden DOM:
                  1. dl-kpi-card-map   → col 1, row 1-2
                  2. KpiCard total     → col 2, row 1
                  3. KpiCard perfilAlto → col 3, row 1
                  4. KpiCard conExp    → col 4, row 1
                  5. dl-chart-card donut → col 2, row 2
                  6. dl-chart-card barras → col 3-4, row 2
              */}
              <div className="dl-kpi-row">

                {/* 1 — Mapa */}
                <div className="dl-kpi-card-map">
                  <div className="dl-chart-header">
                    <div>
                      <h3 className="dl-chart-titulo"><FiMapPin size={15} /> Distribución geográfica</h3>
                      <p className="dl-chart-sub">Practicantes por departamento en Perú</p>
                    </div>
                    <div className="dl-chart-badge">{total} total</div>
                  </div>
                  <MapaPeru practicantes={practicantes} />
                </div>

                {/* 2 — KPI total */}
                <KpiCard
                  label="Total practicantes"
                  value={total}
                  sub="Registrados en plataforma"
                  color="#003DA5"
                  Icon={RiTeamLine}
                  spark={sparkData}
                />

                {/* 3 — KPI perfil alto */}
                <KpiCard
                  label="Perfil 70%+"
                  value={perfilAlto}
                  sub={`${total > 0 ? Math.round(perfilAlto / total * 100) : 0}% del total`}
                  color="#16a34a"
                  Icon={HiOutlineBriefcase}
                />

                {/* 4 — KPI con experiencia */}
                <KpiCard
                  label="Con experiencia"
                  value={conExp}
                  sub={`${total > 0 ? Math.round(conExp / total * 100) : 0}% del total`}
                  color="#d97706"
                  Icon={HiOutlineBriefcase}
                />

                {/* 5 — Donut completitud */}
                <div className="dl-chart-card">
                  <div className="dl-chart-header">
                    <div>
                      <h3 className="dl-chart-titulo"><FiTrendingUp size={15} /> Completitud de perfiles</h3>
                      <p className="dl-chart-sub">Distribución por rango</p>
                    </div>
                  </div>
                  <div className="dl-donut-pro-wrap">
                    <DonutChart segments={[
                      { label: "80–100%", value: compBuckets["80–100%"], color: "#16a34a" },
                      { label: "60–80%", value: compBuckets["60–80%"], color: "#003DA5" },
                      { label: "40–60%", value: compBuckets["40–60%"], color: "#f97316" },
                      { label: "< 40%", value: compBuckets["< 40%"], color: "#cbd5e1" },
                    ]} />
                    <div className="dl-donut-pro-legend">
                      {[
                        { l: "80–100%", c: "#16a34a", v: compBuckets["80–100%"] },
                        { l: "60–80%", c: "#003DA5", v: compBuckets["60–80%"] },
                        { l: "40–60%", c: "#f97316", v: compBuckets["40–60%"] },
                        { l: "< 40%", c: "#cbd5e1", v: compBuckets["< 40%"] },
                      ].map(s => (
                        <div key={s.l} className="dl-legend-pro-item">
                          <span className="dl-legend-pro-dot" style={{ background: s.c }} />
                          <span className="dl-legend-pro-label">{s.l}</span>
                          <span className="dl-legend-pro-val">{s.v}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* 6 — Barras por área */}
                <div className="dl-chart-card">
                  <div className="dl-chart-header">
                    <div>
                      <h3 className="dl-chart-titulo"><HiOutlineOfficeBuilding size={15} /> Practicantes por área</h3>
                      <p className="dl-chart-sub">Distribución en las áreas del BCP</p>
                    </div>
                  </div>
                  <HBarChart data={areaTop} color="#003DA5" />
                </div>

              </div>
            </div>
          )}

          {/* ════ FAVORITOS ════ */}
          {tabActiva === "favoritos" && (
            <div>
              {favoritos.length === 0 ? (
                <div className="dl-empty-state">
                  <FiStar size={48} color="#d1d5db" />
                  <h5>Aún no tienes favoritos</h5>
                  <p>Guarda perfiles desde el catálogo de talento</p>
                  <button className="dl-btn-ir" onClick={() => navigate("/catalogo")}>
                    Explorar talento
                  </button>
                </div>
              ) : (
                <>
                  <div className="dl-fav-search-wrap">
                    <IoSearchOutline size={15} style={{ color: "#9ca3af", flexShrink: 0 }} />
                    <input
                      className="dl-fav-search"
                      placeholder="Buscar en favoritos..."
                      value={busqFav}
                      onChange={e => setBusqFav(e.target.value)}
                    />
                  </div>
                  <div className="dl-grid-3">
                    {favFiltrados.map(p => (
                      <TarjetaFav
                        key={p.id}
                        p={p}
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
        <div className="dl-kpi-icon-wrap" style={{ background: `${color}18`, color }}>
          <Icon size={18} />
        </div>
        {spark && <SparkLine values={spark} color={color} width={90} height={38} />}
      </div>
      <p className="dl-kpi-value" style={{ color }}>{value}</p>
      <p className="dl-kpi-label">{label}</p>
      {sub && <p className="dl-kpi-sub">{sub}</p>}
    </div>
  );
}

/* ── Tarjeta favorito ── */
function TarjetaFav({ p, onVer, onQuitar }) {
  const ubicacion = [p.ciudad, p.pais].filter(Boolean).join(", ") || p.distrito;
  return (
    <div className="dl-person-card">
      <div className="dl-person-header">
        <div className="dl-person-avatar">
          {p.foto
            ? <img src={p.foto} alt={p.nombre} style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }} />
            : p.nombre?.charAt(0)?.toUpperCase()}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p className="dl-person-nombre">{p.nombre}</p>
          <p className="dl-person-titulo">{p.titulo || "Sin título"}</p>
          {ubicacion && <p className="dl-person-meta"><FiMapPin size={10} /> {ubicacion}</p>}
        </div>
      </div>
      {p.area && <span className="dl-badge-area">{p.area}</span>}
      <div className="dl-person-tags">
        {(p.skills || []).slice(0, 3).map((s, i) => <span key={i} className="dl-tag-tec">{s}</span>)}
      </div>
      <div className="dl-person-actions">
        <button className="dl-btn-ver" onClick={onVer}>Ver perfil</button>
        {p.email && (
          <a href={`mailto:${p.email}?subject=Oportunidad BCP`} className="dl-btn-mail">
            <FiMail size={13} />
          </a>
        )}
        <button className="dl-btn-quitar" onClick={onQuitar} title="Quitar de favoritos">✕</button>
      </div>
    </div>
  );
}

export default DashboardLider;
