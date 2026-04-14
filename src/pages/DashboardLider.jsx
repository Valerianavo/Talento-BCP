import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { db, auth } from "../firebase/firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import {
  collection, query, where, getDocs,
  doc, getDoc, updateDoc, arrayRemove,
} from "firebase/firestore";
import Navbar from "../components/Navbar.jsx";
import "../stylesheets/Catalogo.css";

function DashboardLider() {
  const navigate = useNavigate();

  const [usuario,      setUsuario]      = useState(null);
  const [liderData,    setLiderData]    = useState(null);
  const [liderDocId,   setLiderDocId]   = useState(null);
  const [practicantes, setPracticantes] = useState([]);
  const [favoritos,    setFavoritos]    = useState([]);
  const [cargando,     setCargando]     = useState(true);
  const [tabActiva,    setTabActiva]    = useState("metricas");

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u || !u.email?.endsWith("@bcp.com")) {
        navigate("/auth-lider");
        return;
      }
      setUsuario(u);
      try {
        const lSnap = await getDocs(query(collection(db, "lideres"), where("uid", "==", u.uid)));
        let liderDoc = null;
        lSnap.forEach((d) => { liderDoc = { id: d.id, ...d.data() }; });
        if (liderDoc) { setLiderData(liderDoc); setLiderDocId(liderDoc.id); }

        const pSnap = await getDocs(collection(db, "practicantes"));
        setPracticantes(pSnap.docs.map((d) => ({ id: d.id, ...d.data() })));

        if (liderDoc?.favoritos?.length) {
          const favs = await Promise.all(
            liderDoc.favoritos.map(async (favId) => {
              const snap = await getDoc(doc(db, "practicantes", favId));
              return snap.exists() ? { id: favId, ...snap.data() } : null;
            })
          );
          setFavoritos(favs.filter(Boolean));
        }
      } catch (err) {
        console.error(err);
      } finally {
        setCargando(false);
      }
    });
    return () => unsub();
  }, [navigate]);

  const quitarFavorito = async (favId) => {
    await updateDoc(doc(db, "lideres", liderDocId), { favoritos: arrayRemove(favId) });
    setFavoritos((prev) => prev.filter((f) => f.id !== favId));
  };

  /* Métricas */
  const totalPracticantes = practicantes.length;
  const areaCount = practicantes.reduce((acc, p) => {
    if (p.area) acc[p.area] = (acc[p.area] || 0) + 1;
    return acc;
  }, {});
  const areaTop = Object.entries(areaCount).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const skillCount = practicantes.reduce((acc, p) => {
    (p.skills || []).forEach((s) => { acc[s] = (acc[s] || 0) + 1; });
    return acc;
  }, {});
  const skillTop = Object.entries(skillCount).sort((a, b) => b[1] - a[1]).slice(0, 8);

  const calcCompletitud = (p) => {
    const campos = [p.titulo, p.resumen, p.area, p.intereses,
      p.experiencia?.length > 0, p.educacion?.length > 0,
      p.idiomas?.length > 0, p.cursos?.length > 0,
      p.skills?.length > 0, p.habilidadesBlandas?.length > 0];
    return Math.round(campos.filter(Boolean).length / campos.length * 100);
  };
  const topMatch = [...practicantes]
    .map((p) => ({ ...p, completitud: calcCompletitud(p) }))
    .filter((p) => p.completitud >= 70)
    .sort((a, b) => b.completitud - a.completitud)
    .slice(0, 6);

  if (cargando) return (
    <div className="pantalla-carga"><div className="spinner-bcp" /><p>Cargando dashboard...</p></div>
  );

  /* ── Helper: navegar a perfil y poder volver ── */
  const irAPerfil = (pid) => navigate(`/perfil/${pid}`);

  return (
    <div>
      <Navbar />

      <div className="container mt-4" style={{ maxWidth: 1100 }}>

        {/* HEADER */}
        <div className="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-2">
          <div>
            <h3 style={{ color:"#003DA5", fontWeight:700 }}>
              👋 Hola, {liderData?.nombre || usuario?.email}
            </h3>
            <p className="text-muted mb-0">Panel exclusivo para líderes BCP</p>
          </div>
          <div className="d-flex gap-2">
            <button className="btn btn-outline-primary btn-sm" onClick={() => navigate("/catalogo")}>
              Ver catálogo
            </button>
            <button className="btn btn-outline-danger btn-sm" onClick={async () => { await signOut(auth); navigate("/"); }}>
              Cerrar sesión
            </button>
          </div>
        </div>

        {/* TABS */}
        <div className="d-flex gap-2 mb-4 flex-wrap">
          {[
            { id:"metricas",  label:"📊 Métricas" },
            { id:"favoritos", label:`⭐ Favoritos (${favoritos.length})` },
            { id:"match",     label:"🎯 Top Match" },
          ].map((tab) => (
            <button
              key={tab.id}
              className={`btn btn-sm ${tabActiva === tab.id ? "btn-primary" : "btn-outline-secondary"}`}
              onClick={() => setTabActiva(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── TAB MÉTRICAS ── */}
        {tabActiva === "metricas" && (
          <div>
            <div className="row g-3 mb-4">
              <div className="col-md-4">
                <div className="card text-center p-4 shadow-sm" style={{ borderTop:"4px solid #003DA5" }}>
                  <h1 style={{ fontSize:48, color:"#003DA5", fontWeight:800 }}>{totalPracticantes}</h1>
                  <p className="text-muted mb-0">Practicantes registrados</p>
                </div>
              </div>
              <div className="col-md-4">
                <div className="card text-center p-4 shadow-sm" style={{ borderTop:"4px solid #f5a623" }}>
                  <h1 style={{ fontSize:48, color:"#f5a623", fontWeight:800 }}>{favoritos.length}</h1>
                  <p className="text-muted mb-0">Perfiles guardados</p>
                </div>
              </div>
              <div className="col-md-4">
                <div className="card text-center p-4 shadow-sm" style={{ borderTop:"4px solid #28a745" }}>
                  <h1 style={{ fontSize:48, color:"#28a745", fontWeight:800 }}>{topMatch.length}</h1>
                  <p className="text-muted mb-0">Perfiles 70%+ completitud</p>
                </div>
              </div>
            </div>

            <div className="row g-3">
              <div className="col-md-6">
                <div className="card p-3 shadow-sm h-100">
                  <h6 style={{ color:"#003DA5", fontWeight:700 }}>📂 Áreas más populares</h6>
                  {areaTop.map(([area, count]) => (
                    <div key={area} className="mb-2">
                      <div className="d-flex justify-content-between mb-1">
                        <small>{area}</small>
                        <small><strong>{count}</strong></small>
                      </div>
                      <div className="progress" style={{ height:6 }}>
                        <div className="progress-bar" style={{ width:`${Math.round((count/totalPracticantes)*100)}%`, background:"#003DA5" }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="col-md-6">
                <div className="card p-3 shadow-sm h-100">
                  <h6 style={{ color:"#003DA5", fontWeight:700 }}>⚡ Skills más frecuentes</h6>
                  <div className="d-flex flex-wrap gap-2 mt-2">
                    {skillTop.map(([skill, count]) => (
                      <span key={skill} className="badge" style={{ background:"#003DA5", fontSize:12 }}>
                        {skill} <span style={{ background:"rgba(255,255,255,0.3)", borderRadius:4, padding:"0 4px" }}>{count}</span>
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── TAB FAVORITOS ── */}
        {tabActiva === "favoritos" && (
          <div>
            {favoritos.length === 0 ? (
              <div className="text-center mt-5">
                <p style={{ fontSize:48 }}>☆</p>
                <h5>Aún no tienes favoritos</h5>
                <p className="text-muted">Guarda perfiles desde el catálogo o el perfil de cada practicante</p>
                <button className="btn btn-primary mt-2" onClick={() => navigate("/catalogo")}>
                  Explorar talento
                </button>
              </div>
            ) : (
              <div className="row g-3">
                {favoritos.map((p) => (
                  <div key={p.id} className="col-md-4">
                    <div className="card catalogo-card shadow-sm p-3">
                      <div className="d-flex align-items-center">
                        <div className="avatar-catalogo">{p.nombre?.charAt(0)?.toUpperCase()}</div>
                        <div className="ms-3">
                          <h5 className="mb-0">{p.nombre}</h5>
                          <small className="text-muted">{p.titulo || "Sin título"}</small>
                        </div>
                      </div>
                      {/* Ubicación */}
                      {(p.ciudad || p.distrito) && (
                        <p className="text-muted mt-1 mb-0" style={{ fontSize:12 }}>
                          📍 {[p.ciudad, p.pais].filter(Boolean).join(", ") || p.distrito}
                        </p>
                      )}
                      <div className="mt-2">
                        <span className="badge bg-primary">{p.area || "Sin área"}</span>
                      </div>
                      <div className="mt-2">
                        {(p.skills || []).slice(0, 3).map((s, i) => (
                          <span key={i} className="badge bg-secondary me-1">{s}</span>
                        ))}
                        {(p.habilidadesBlandas || []).slice(0, 2).map((s, i) => (
                          <span key={i} className="badge me-1" style={{ background:"#5c7d3e" }}>{s}</span>
                        ))}
                      </div>
                      <div className="d-flex gap-2 mt-3">
                        {/* Ver perfil — con navigate para poder volver */}
                        <button
                          className="btn btn-outline-primary btn-sm flex-fill"
                          onClick={() => irAPerfil(p.id)}
                        >
                          Ver perfil
                        </button>
                        <button
                          className="btn btn-outline-warning btn-sm"
                          onClick={() => quitarFavorito(p.id)}
                          title="Quitar de favoritos"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── TAB MATCH ── */}
        {tabActiva === "match" && (
          <div>
            <div className="alert alert-primary mb-3" style={{ fontSize:13 }}>
              🎯 <strong>Top candidatos:</strong> perfiles con mayor completitud y más habilidades cargadas
            </div>
            <div className="row g-3">
              {topMatch.map((p) => (
                <div key={p.id} className="col-md-4">
                  <div className="card catalogo-card shadow-sm p-3" style={{ border:"2px solid #003DA5", position:"relative" }}>
                    <span style={{
                      position:"absolute", top:10, right:10,
                      background:"#003DA5", color:"#fff",
                      borderRadius:20, padding:"2px 10px", fontSize:12, fontWeight:700,
                    }}>
                      {p.completitud}% ✓
                    </span>

                    <div className="d-flex align-items-center">
                      <div className="avatar-catalogo">{p.nombre?.charAt(0)?.toUpperCase()}</div>
                      <div className="ms-3">
                        <h5 className="mb-0">{p.nombre}</h5>
                        <small className="text-muted">{p.titulo || "Sin título"}</small>
                      </div>
                    </div>

                    {(p.ciudad || p.distrito) && (
                      <p className="text-muted mt-1 mb-0" style={{ fontSize:12 }}>
                        📍 {[p.ciudad, p.pais].filter(Boolean).join(", ") || p.distrito}
                      </p>
                    )}

                    <div className="mt-2">
                      <span className="badge bg-primary">{p.area || "Sin área"}</span>
                    </div>

                    {/* Skills técnicas */}
                    <div className="mt-2">
                      {(p.skills || []).slice(0, 3).map((s, i) => (
                        <span key={i} className="badge bg-secondary me-1">{s}</span>
                      ))}
                    </div>
                    {/* Skills blandas */}
                    {(p.habilidadesBlandas || []).length > 0 && (
                      <div className="mt-1">
                        {(p.habilidadesBlandas || []).slice(0, 2).map((s, i) => (
                          <span key={i} className="badge me-1" style={{ background:"#5c7d3e" }}>{s}</span>
                        ))}
                      </div>
                    )}

                    <div className="mt-3 d-flex gap-2">
                      {/* Ver perfil — usa navigate para que history.back() funcione */}
                      <button
                        className="btn btn-primary btn-sm flex-fill"
                        onClick={() => irAPerfil(p.id)}
                      >
                        Ver perfil
                      </button>
                      {p.email && (
                        <a href={`mailto:${p.email}?subject=Oportunidad BCP`} className="btn btn-outline-primary btn-sm">
                          📩
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{ height:60 }} />
      </div>
    </div>
  );
}

export default DashboardLider;
