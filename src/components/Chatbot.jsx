import { useEffect, useRef, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase/firebase";
import { FiMessageCircle, FiX, FiSend, FiArrowLeft } from "react-icons/fi";
import { HiOutlineSparkles } from "react-icons/hi";
import "../stylesheets/Chatbot.css";

/* ─── Diccionario semántico por área (ampliado) ─── */
const AREA_KEYWORDS = {
  finanzas: [
    "finanzas", "financiero", "financiera", "contabilidad", "contable", "banca", "bancario",
    "inversiones", "inversionista", "tesorería", "tesoreria", "auditoría", "auditoria", "auditor",
    "riesgo", "riesgos", "crédito", "credito", "creditos", "excel", "power bi",
    "análisis financiero", "analisis financiero", "kpi", "presupuesto", "presupuestos",
    "economía", "economia", "economista", "financial", "cfo", "corporate finance",
    "flujo de caja", "cashflow", "impuestos", "tributario", "niif", "ifrs", "bcp",
  ],
  tecnologia: [
    "tecnología", "tecnologia", "tech", "software", "desarrollo", "programación",
    "programacion", "programador", "desarrollador", "developer", "ingeniería de software",
    "javascript", "typescript", "python", "java", "c++", "c#", "kotlin", "swift",
    "react", "angular", "vue", "node", "nodejs", "express", "django", "flask", "spring",
    "aws", "azure", "gcp", "cloud", "devops", "docker", "kubernetes", "k8s", "git", "github",
    "sql", "nosql", "mongodb", "postgresql", "mysql", "base de datos", "database",
    "frontend", "backend", "fullstack", "full stack", "api", "rest", "graphql",
    "mobile", "android", "ios", "flutter", "react native",
  ],
  datos: [
    "datos", "data", "analytics", "analítica", "analitica", "dashboard",
    "power bi", "tableau", "looker", "qlik", "python", "sql", "pandas", "numpy",
    "machine learning", "ml", "ia", "inteligencia artificial", "deep learning",
    "estadística", "estadistica", "estadístico", "estadistico", "r", "modelado",
    "big data", "hadoop", "spark", "airflow", "etl",
    "científico de datos", "cientifico de datos", "data scientist", "data engineer",
    "data analyst", "analista de datos", "visualización", "visualizacion",
  ],
  marketing: [
    "marketing", "mercadeo", "mercadotecnia", "comunicación", "comunicacion",
    "publicidad", "branding", "marca", "digital", "redes sociales", "social media",
    "contenido", "content", "seo", "sem", "ads", "adwords", "facebook ads", "google ads",
    "campañas", "campanas", "campaña", "experiencia cliente", "cx", "community", "community manager",
    "email marketing", "mailing", "copywriting", "storytelling", "growth",
  ],
  rrhh: [
    "recursos humanos", "rrhh", "hr", "human resources", "talento", "gestión de talento",
    "capacitación", "capacitacion", "capacitador", "cultura", "cultura organizacional",
    "selección", "seleccion", "reclutamiento", "reclutador", "people", "personas",
    "clima laboral", "clima organizacional", "onboarding", "offboarding",
    "desarrollo organizacional", "nómina", "nomina", "compensaciones", "bienestar",
  ],
  diseno: [
    "ux", "ui", "ux/ui", "figma", "adobe xd", "sketch", "invision", "illustrator",
    "photoshop", "after effects", "premiere", "diseño", "diseno", "diseñador", "disenador",
    "prototipado", "prototyping", "prototype", "usabilidad", "user research",
    "wireframe", "mockup", "design thinking", "design system", "gráfico", "grafico",
    "multimedia", "audiovisual", "motion",
  ],
  operaciones: [
    "operaciones", "operations", "procesos", "bpm", "logística", "logistica",
    "supply chain", "cadena de suministro", "lean", "six sigma", "mejora continua",
    "calidad", "quality", "iso", "kaizen", "pmo", "project management", "pmp",
    "scrum", "agile", "kanban", "safe", "jira",
  ],
  ventas: [
    "ventas", "sales", "comercial", "negociación", "negociacion", "clientes", "customer",
    "b2b", "b2c", "crm", "salesforce", "hubspot", "account", "account manager",
    "retail", "key account", "kam", "prospección", "prospeccion", "pipeline",
  ],
  legal: [
    "legal", "derecho", "abogado", "abogada", "compliance", "cumplimiento",
    "normativa", "regulatorio", "contratos", "contractual", "corporativo",
    "laboral", "tributario", "penal", "civil", "mercantil",
  ],
  gestion: [
    "gestión", "gestion", "gerencia", "gerente", "management", "administración",
    "administracion", "estrategia", "estratégico", "estrategico", "planeamiento",
    "planificación", "planificacion", "consultoría", "consultoria", "consultor",
    "liderazgo", "leader", "dirección", "direccion",
  ],
  investigacion: [
    "investigación", "investigacion", "research", "estudio", "estudios", "encuesta",
    "antropología", "antropologia", "sociología", "sociologia", "cualitativa",
    "cuantitativa", "metodología", "metodologia", "focus group", "entrevista",
  ],
};

/* ─── Sinónimos y abreviaciones comunes ─── */
const SINONIMOS = {
  "ia": "inteligencia artificial",
  "ml": "machine learning",
  "bd": "base de datos",
  "bbdd": "base de datos",
  "fe": "frontend",
  "be": "backend",
  "rrss": "redes sociales",
  "ppt": "powerpoint",
  "desarrollador": "programador",
  "developer": "programador",
  "programmer": "programador",
  "cientifico": "científico",
  "mkt": "marketing",
  "admin": "administración",
  "gcia": "gerencia",
  "ops": "operaciones",
  "qa": "calidad",
  "ti": "tecnología",
};

/* ─── Normalizar: minúsculas + sin tildes + sin puntuación + sinónimos ─── */
function normalizar(s) {
  let out = String(s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  // expandir sinónimos (solo palabras completas)
  Object.entries(SINONIMOS).forEach(([k, v]) => {
    const re = new RegExp(`\\b${k}\\b`, "g");
    out = out.replace(re, normalizar2(v));
  });
  return out;
}
function normalizar2(s) {
  return String(s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

/* ─── Distancia de Levenshtein (tolerancia a tipos) ─── */
function levenshtein(a, b) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const dp = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for (let i = 0; i <= a.length; i++) dp[i][0] = i;
  for (let j = 0; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      );
    }
  }
  return dp[a.length][b.length];
}

/* ─── Match aproximado: exacto, por prefijo o con 1-2 tipos ─── */
function matchAprox(palabra, blob) {
  if (palabra.length < 3) return false;
  if (blob.includes(palabra)) return true;                      // exacto
  if (palabra.length >= 5 && blob.includes(palabra.slice(0, palabra.length - 1))) return true; // prefijo (plural/singular)
  if (palabra.length >= 4 && blob.includes(palabra.slice(0, 4))) return true;                  // stem corto
  // tipos: buscar alguna palabra del blob con Levenshtein ≤ threshold
  const threshold = palabra.length <= 5 ? 1 : 2;
  const palabras = blob.split(" ");
  for (const w of palabras) {
    if (Math.abs(w.length - palabra.length) > threshold) continue;
    if (levenshtein(w, palabra) <= threshold) return true;
  }
  return false;
}

const STOP_WORDS = new Set([
  "para","con","los","las","que","este","esta","candidato","practicante","practicantes",
  "bueno","buena","buenos","buenas","area","areas","del","una","uno","por","ser","sabe",
  "quien","quienes","cual","cuales","como","donde","dale","dame","esta","muy","mas","menos",
]);

/* ─── Puntúa match entre un practicante y un texto objetivo ─── */
function scorePracticante(p, objetivo) {
  const txt = normalizar(objetivo);
  if (!txt) return { score: 0, matches: [] };

  // Construir texto analizable del perfil (normalizado)
  const blobPartes = [
    p.nombre, p.apellidos, p.titulo, p.area, p.resumen, p.intereses,
    ...(p.skills || []),
    ...(p.habilidadesBlandas || []),
    ...(p.rotaciones || []).map((r) => `${r.area || ""} ${r.logros || ""}`),
    ...(p.experiencia || []).map((e) => `${e.cargo || ""} ${e.empresa || ""} ${e.funciones || ""}`),
    ...(p.proyectos || []).map((pr) => `${pr.nombre || ""} ${pr.rol || ""} ${pr.descripcion || ""}`),
    ...(p.cursos || []).map((c) => `${c.nombre || ""} ${c.institucion || ""}`),
    ...(p.educacion || []).map((e) => `${e.carrera || ""} ${e.institucion || ""}`),
  ].filter(Boolean);
  const blob = normalizar(blobPartes.join(" "));

  // 1. Palabras del texto del usuario (con matching aproximado)
  const tokens = txt.split(/\s+/).filter((w) => w.length > 2);
  const palabrasUsuario = tokens.filter((w) => !STOP_WORDS.has(w));

  const matches = [];
  let score = 0;

  palabrasUsuario.forEach((w) => {
    if (matchAprox(w, blob)) {
      score += 2;
      if (!matches.includes(w)) matches.push(w);
    }
  });

  // 1b. Bigramas (frases de 2 palabras) — match exacto da boost extra
  for (let i = 0; i < tokens.length - 1; i++) {
    const bi = `${tokens[i]} ${tokens[i + 1]}`;
    if (bi.length > 6 && !STOP_WORDS.has(tokens[i]) && blob.includes(bi)) {
      score += 3;
      if (!matches.includes(bi)) matches.push(bi);
    }
  }

  // 2. Keywords semánticas del diccionario (normalizado)
  Object.entries(AREA_KEYWORDS).forEach(([area, kws]) => {
    const areaNorm = normalizar(area);
    const kwsNorm  = kws.map(normalizar);
    const areaMencionada = kwsNorm.some((k) => matchAprox(k, txt)) || txt.includes(areaNorm);
    if (!areaMencionada) return;
    kwsNorm.forEach((k) => {
      if (matchAprox(k, blob)) {
        score += 3;
        if (!matches.includes(k)) matches.push(k);
      }
    });
  });

  // 3. Boost si el área del perfil coincide
  if (p.area && matchAprox(normalizar(p.area), txt)) score += 5;

  return { score, matches };
}

function nivelDeScore(score) {
  if (score >= 15) return "Alto";
  if (score >= 6) return "Medio";
  return "Bajo";
}

const MESES_MAP_CB = {
  Enero:0,Febrero:1,Marzo:2,Abril:3,Mayo:4,Junio:5,
  Julio:6,Agosto:7,Septiembre:8,Octubre:9,Noviembre:10,Diciembre:11,
};
function totalMesesExp(p) {
  const experiencia = p.experiencia || [];
  const ahora = new Date();
  let total = 0;
  experiencia.forEach((e) => {
    const d = e.desdeA ? new Date(Number(e.desdeA), MESES_MAP_CB[e.desdeM] ?? 0) : null;
    const h = e.actualmente ? ahora : e.hastaA ? new Date(Number(e.hastaA), MESES_MAP_CB[e.hastaM] ?? 0) : null;
    if (d && h && h >= d) total += (h.getFullYear() - d.getFullYear()) * 12 + (h.getMonth() - d.getMonth());
  });
  return total;
}
function calcCompletitud(p) {
  const campos = [
    p.nombre, p.apellidos, p.titulo, p.area, p.resumen, p.ciudad, p.email, p.telefono,
    p.skills?.length, p.habilidadesBlandas?.length, p.proyectos?.length,
    p.experiencia?.length, p.educacion?.length, p.idiomas?.length, p.cursos?.length,
  ];
  const llenos = campos.filter(Boolean).length;
  return Math.round((llenos / campos.length) * 100);
}

function nivelCandidato(p) {
  const nSkills = (p.skills?.length || 0) + (p.habilidadesBlandas?.length || 0);
  const nProy = p.proyectos?.length || 0;
  const nExp = p.experiencia?.length || 0;
  const nEdu = p.educacion?.length || 0;
  const puntos = nSkills + nProy * 2 + nExp * 2 + nEdu;
  if (puntos >= 10) return "Alto";
  if (puntos >= 5) return "Medio";
  return "Bajo";
}

/* ═══════════════════════════════════════════
   COMPONENTE CHATBOT
═══════════════════════════════════════════ */
export default function Chatbot() {
  const [abierto, setAbierto] = useState(false);
  const [mensajes, setMensajes] = useState([]);
  const [input, setInput] = useState("");
  const [modo, setModo] = useState(null); // null | "resumen" | "evaluar" | "buscar"
  const [practicantes, setPracticantes] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [candidatoCtx, setCandidatoCtx] = useState(null); // para "evaluar"
  const scrollRef = useRef(null);

  /* cargar practicantes al abrir por primera vez */
  useEffect(() => {
    if (!abierto || practicantes.length > 0) return;
    (async () => {
      try {
        setCargando(true);
        const snap = await getDocs(collection(db, "practicantes"));
        setPracticantes(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      } catch (e) {
        console.error("Chatbot load error", e);
      } finally {
        setCargando(false);
      }
    })();
  }, [abierto, practicantes.length]);

  /* mensaje inicial */
  useEffect(() => {
    if (abierto && mensajes.length === 0) {
      pushBot(
        <>
          <p style={{ margin: 0, fontWeight: 600 }}>¿Qué deseas hacer?</p>
          <div className="cb-opciones">
            <button className="cb-op" onClick={() => iniciarModo("buscar")}>
              <span className="cb-op-num">1</span> Buscar practicantes
            </button>
            <button className="cb-op" onClick={() => iniciarModo("evaluar")}>
              <span className="cb-op-num">2</span> Evaluar candidato
            </button>
            <button className="cb-op" onClick={() => iniciarModo("resumen")}>
              <span className="cb-op-num">3</span> Ver resumen de perfil
            </button>
          </div>
        </>
      );
    }
    // eslint-disable-next-line
  }, [abierto]);

  /* scroll automático */
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [mensajes]);

  const pushBot = (contenido) =>
    setMensajes((m) => [...m, { from: "bot", contenido }]);
  const pushUser = (texto) =>
    setMensajes((m) => [...m, { from: "user", contenido: texto }]);

  const iniciarModo = (m) => {
    setModo(m);
    setCandidatoCtx(null);
    if (m === "buscar") {
      pushBot(
        <>
          <p className="cb-t">🔍 Buscar practicantes</p>
          <p className="cb-muted">
            Escribe un área o habilidad. Ej: <em>"practicantes buenos en finanzas"</em>,
            <em>"datos y Python"</em>.
          </p>
        </>
      );
    } else if (m === "evaluar") {
      pushBot(
        <>
          <p className="cb-t">🎯 Evaluar candidato</p>
          <p className="cb-muted">
            Primero indica el <strong>ID</strong> o <strong>nombre</strong> del practicante.
          </p>
        </>
      );
    } else if (m === "resumen") {
      pushBot(
        <>
          <p className="cb-t">📄 Ver resumen de perfil</p>
          <p className="cb-muted">
            Ingresa el <strong>ID</strong> o <strong>nombre completo</strong> del practicante.
          </p>
        </>
      );
    }
  };

  const volverMenu = () => {
    setModo(null);
    setCandidatoCtx(null);
    pushBot(
      <>
        <p style={{ margin: 0, fontWeight: 600 }}>¿Qué deseas hacer?</p>
        <div className="cb-opciones">
          <button className="cb-op" onClick={() => iniciarModo("buscar")}>
            <span className="cb-op-num">1</span> Buscar practicantes
          </button>
          <button className="cb-op" onClick={() => iniciarModo("evaluar")}>
            <span className="cb-op-num">2</span> Evaluar candidato
          </button>
          <button className="cb-op" onClick={() => iniciarModo("resumen")}>
            <span className="cb-op-num">3</span> Ver resumen de perfil
          </button>
        </div>
      </>
    );
  };

  /* ─── Buscar candidato por ID (completo o prefijo) o nombre (con tolerancia a tipos) ─── */
  const encontrarCandidato = (txt) => {
    const qRaw = txt.toLowerCase().trim();
    const q = normalizar(txt);
    if (!q) return null;
    // por ID exacto
    const porId = practicantes.find((p) => p.id.toLowerCase() === qRaw);
    if (porId) return porId;
    // por ID prefijo
    if (qRaw.length >= 5) {
      const porPrefijo = practicantes.find((p) => p.id.toLowerCase().startsWith(qRaw));
      if (porPrefijo) return porPrefijo;
    }
    // por nombre exacto o parcial (normalizado)
    const porNombre = practicantes.find((p) => {
      const n = normalizar(`${p.nombre || ""} ${p.apellidos || ""}`);
      const solo = normalizar(p.nombre || "");
      return n && (n === q || n.includes(q) || q.includes(n) || solo === q || solo.includes(q));
    });
    if (porNombre) return porNombre;
    // por nombre con tolerancia a tipos (Levenshtein)
    let mejor = null;
    let mejorDist = Infinity;
    practicantes.forEach((p) => {
      const solo = normalizar(p.nombre || "");
      if (!solo) return;
      const d = levenshtein(solo, q);
      const thr = solo.length <= 5 ? 1 : 2;
      if (d <= thr && d < mejorDist) {
        mejorDist = d;
        mejor = p;
      }
    });
    return mejor;
  };

  /* ─── Detectar intención ─── */
  const detectarIntencion = (txt) => {
    const t = txt.toLowerCase();
    // información específica del candidato
    if (/\b(ubicaci|donde vive|en que ciudad|ciudad|pais|país)\b/.test(t))       return "ubicacion";
    if (/\b(disponib|viajar|reubicaci|vehiculo|vehículo|movilidad)\b/.test(t))   return "disponibilidad";
    if (/\b(blanda|soft skill|interpersonal)\b/.test(t))                         return "blandas";
    if (/\b(skill|tecnic|tecnol|habilidad(?!es blandas)|herramient)\b/.test(t))  return "skills";
    if (/\b(proyecto|portafolio|portfolio)\b/.test(t))                           return "proyectos";
    if (/\b(experienc|trabaj|cargo|empresa|empleo|años|meses)\b/.test(t))        return "experiencia";
    if (/\b(educaci|formaci|estudi|universidad|carrera|pucp|upc|ulima)\b/.test(t))return "educacion";
    if (/\b(idioma|language|ingles|english|portugues|frances)\b/.test(t))        return "idiomas";
    if (/\b(contacto|email|correo|telefono|teléfono|linkedin|github|whatsapp)\b/.test(t)) return "contacto";
    if (/\b(certificac|curso|logro)\b/.test(t))                                  return "cursos";
    if (/\b(resumen|bio|perfil|acerca|sobre|quien es)\b/.test(t))                return "resumen";
    if (/\b(nivel|calific|rating|puntuaci|score)\b/.test(t))                     return "nivel";
    // queries globales
    if (/\b(compara|comparar|comparación|vs\.?|versus)\b/.test(t))               return "comparar";
    if (/\b(recomienda|recomendar|sugerencia|sugiere|aleatori|random)\b/.test(t))return "recomendar";
    if (/\b(mejor(?:es)? (?:candidato|practicante|perfil))\b/.test(t))           return "mejores";
    if (/\b(top\s*\d|top\b|ranking)\b/.test(t))                                  return "top";
    if (/\b(cuant|total|numero de|cantidad)\b/.test(t))                          return "estadisticas";
    if (/\b(areas? disponible|lista de areas?|que areas)\b/.test(t))             return "areas_lista";
    if (/\b(skills disponibles|lista de skills|que skills)\b/.test(t))           return "skills_lista";
    if (/\b(lima|arequipa|cusco|trujillo|peru|perú|lugar|región)\b/.test(t))     return "buscar_ubicacion";
    // conversacionales
    if (/\b(adios|adiós|chau|bye|hasta luego|nos vemos)\b/.test(t))              return "despedida";
    if (/\b(quien eres|que eres|como te llamas|tu nombre)\b/.test(t))            return "quien_eres";
    if (/\b(que puedes hacer|para que sirves|funciones)\b/.test(t))              return "ayuda";
    if (/\b(fortaleza|fuerte|punto fuerte|lo mejor)\b/.test(t))                  return "fortalezas";
    if (/\b(debilidad|punto débil|punto debil|carencia|falta)\b/.test(t))        return "debilidades";
    if (/\b(por qu[eé]|porque|justifica|razon|razón)\b/.test(t))                 return "porque";
    if (/\b(contrat(ar|o)|deberia|debería|vale la pena|la recomiendas|lo recomiendas)\b/.test(t)) return "recomendacion_ctx";
    // más info del candidato
    if (/\b(edad|cuantos años|años tiene|cumpleaños|nacimiento)\b/.test(t))      return "edad";
    if (/\b(género|genero|sexo|masculino|femenino)\b/.test(t))                   return "genero";
    if (/\b(nombre completo|apellido|como se llama|se llama)\b/.test(t))         return "nombre_completo";
    if (/\b(cargo actual|puesto|titulo actual|rol actual)\b/.test(t))            return "titulo_actual";
    if (/\b(completitud|completo|perfil completo|porcentaje)\b/.test(t))         return "completitud";
    if (/\b(tiempo total|meses total|cuanta experiencia|años de experiencia)\b/.test(t)) return "tiempo_exp";
    if (/\b(historial|rotaci|paso por|areas? que paso)\b/.test(t))               return "historial_bcp";
    // más queries globales
    if (/\b(quien sabe|quien conoce|quien domina|quien maneja)\b/.test(t))       return "por_skill";
    if (/\b(quien habla|quien sabe ingles|english|quien sabe portugues)\b/.test(t)) return "por_idioma";
    if (/\b(de pucp|de upc|de ulima|de up|universidad de|estudiaron|egresados)\b/.test(t)) return "por_universidad";
    if (/\b(m[aá]s experiencia|con experiencia|el que tiene más|mayor experiencia|senior)\b/.test(t)) return "mas_experiencia";
    if (/\b(menos experiencia|junior|sin experiencia)\b/.test(t))                return "menos_experiencia";
    if (/\b(m[aá]s proyectos|quien tiene más proyectos)\b/.test(t))              return "mas_proyectos";
    if (/\b(m[aá]s skills|quien tiene más skills)\b/.test(t))                    return "mas_skills";
    if (/\b(favorito|guardado|destacados)\b/.test(t))                            return "favoritos";
    if (/\b(vehic|puede viajar|disponible para|movil)\b/.test(t))                return "movilidad_lista";
    if (/\b(siguiente|otro|otra|dame otro)\b/.test(t))                           return "recomendar";
    // conversacional extra
    if (/\b(que tal|como estas|cómo estás|como vas|que onda|que hay)\b/.test(t)) return "que_tal";
    if (/\b(hora|que hora|horario)\b/.test(t))                                   return "hora";
    if (/\b(fecha|que dia|día de hoy|hoy es)\b/.test(t))                         return "fecha";
    if (/\b(cumpleaños|felicidades|feliz)\b/.test(t))                            return "felicidades";
    if (/\b(consejo|tip|recomendacion para entrev|como entrev)\b/.test(t))       return "consejo_entrevista";
    if (/\b(funciona|anda|sirve|todo bien)\b/.test(t))                           return "ok_status";
    if (/\b(si|sí|claro|dale|ok|okay|vale)\b/.test(t) && t.length < 8)           return "afirmacion";
    if (/\b(no|nope|nel)\b/.test(t) && t.length < 6)                             return "negacion";
    // más queries nuevas
    if (/\b(cu[aá]nt(os|as) (de|en) |cu[aá]ntos hay (de|en) )/i.test(t))         return "conteo_area";
    if (/\b(h[aá]blame|cu[eé]ntame|descr[íi]beme) (de|sobre|a)\b/.test(t))       return "hablame";
    if (/\b(primer|primera)\b/.test(t))                                          return "primer";
    if (/\b([uú]ltim(o|a))\b/.test(t))                                           return "ultimo";
    if (/\b(aleatori|al azar|sorprende)\b/.test(t))                              return "recomendar";
    if (/\b(resetea|limpia la conversaci|olvid|borra todo)\b/.test(t))           return "reset";
    if (/\b(exporta|descarga|pdf|imprime|guarda)\b/.test(t))                     return "exportar";
    if (/\b(env[ií]a (un )?(mail|email|correo)|escr[ií]bele)\b/.test(t))         return "enviar_email";
    if (/\b(versi[oó]n|actualiz|update)\b/.test(t))                              return "version";
    if (/\b(autor|creador|qui[eé]n te hizo)\b/.test(t))                          return "autor";
    if (/\b(feliz|emojis?|stickers?)\b/.test(t))                                 return "emoji";
    if (/\b(pensar|pensando|esperar|un momento)\b/.test(t))                      return "esperar";
    if (/\b(hola|buenas|saludos|hi|hey|buen día|buenos dias|buenas tardes|buenas noches)\b/.test(t)) return "saludo";
    if (/\b(gracias|thanks|thank you|genial|perfecto|excelente)\b/.test(t))      return "gracias";
    if (/\b(ayuda|help|comando|opciones|menu|menú)\b/.test(t))                   return "ayuda";
    if (/\b(limpiar|borrar|reset|reiniciar)\b/.test(t))                          return "reset";
    if (/\b(broma|chiste|joke)\b/.test(t))                                       return "broma";
    return null;
  };

  /* ─── Extraer número para "top N" ─── */
  const extraerTopN = (txt) => {
    const m = txt.match(/top\s*(\d+)/i);
    if (m) return Math.min(Math.max(parseInt(m[1], 10), 1), 10);
    return 5;
  };

  /* ─── Responder información específica de un candidato ─── */
  const responderInfo = (p, intencion) => {
    switch (intencion) {
      case "skills": {
        const sk = p.skills || [];
        pushBot(
          <>
            <p className="cb-t">⚡ Habilidades técnicas de {p.nombre}</p>
            {sk.length > 0 ? (
              <div className="cb-tags">
                {sk.map((s, i) => <span key={i} className="cb-tag">{s}</span>)}
              </div>
            ) : <p className="cb-txt">No tiene habilidades técnicas registradas.</p>}
          </>
        );
        return;
      }
      case "blandas": {
        const b = p.habilidadesBlandas || [];
        pushBot(
          <>
            <p className="cb-t">🤝 Habilidades blandas de {p.nombre}</p>
            {b.length > 0 ? (
              <div className="cb-tags">
                {b.map((s, i) => <span key={i} className="cb-tag cb-tag-bla">{s}</span>)}
              </div>
            ) : <p className="cb-txt">No tiene habilidades blandas registradas.</p>}
          </>
        );
        return;
      }
      case "proyectos": {
        const pr = p.proyectos || [];
        pushBot(
          <>
            <p className="cb-t">🚀 Proyectos de {p.nombre}</p>
            {pr.length > 0 ? (
              <ul className="cb-list">
                {pr.map((x, i) => (
                  <li key={i}>
                    <strong>{x.nombre}</strong>{x.rol ? ` — ${x.rol}` : ""}
                    {x.descripcion && <div className="cb-muted">{x.descripcion}</div>}
                  </li>
                ))}
              </ul>
            ) : <p className="cb-txt">No hay proyectos registrados.</p>}
          </>
        );
        return;
      }
      case "experiencia": {
        const ex = p.experiencia || [];
        pushBot(
          <>
            <p className="cb-t">💼 Experiencia de {p.nombre}</p>
            {ex.length > 0 ? (
              <ul className="cb-list">
                {ex.map((e, i) => (
                  <li key={i}>
                    <strong>{e.cargo}</strong>{e.empresa ? ` — ${e.empresa}` : ""}
                    {e.desdeA && (
                      <div className="cb-muted">
                        {e.desdeM} {e.desdeA}{e.actualmente ? " — Actualidad" : e.hastaA ? ` — ${e.hastaM} ${e.hastaA}` : ""}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            ) : <p className="cb-txt">Sin experiencia registrada.</p>}
          </>
        );
        return;
      }
      case "educacion": {
        const ed = p.educacion || [];
        pushBot(
          <>
            <p className="cb-t">🎓 Formación de {p.nombre}</p>
            {ed.length > 0 ? (
              <ul className="cb-list">
                {ed.map((e, i) => (
                  <li key={i}>
                    <strong>{e.institucion}</strong>
                    {e.carrera ? ` — ${e.carrera}` : ""}
                    {e.nivel ? ` (${e.nivel})` : ""}
                  </li>
                ))}
              </ul>
            ) : <p className="cb-txt">Sin educación registrada.</p>}
          </>
        );
        return;
      }
      case "idiomas": {
        const id = p.idiomas || [];
        pushBot(
          <>
            <p className="cb-t">🌐 Idiomas de {p.nombre}</p>
            {id.length > 0 ? (
              <ul className="cb-list">
                {id.map((x, i) => (
                  <li key={i}><strong>{x.idioma}</strong>: {x.nivel}</li>
                ))}
              </ul>
            ) : <p className="cb-txt">No tiene idiomas registrados.</p>}
          </>
        );
        return;
      }
      case "contacto": {
        pushBot(
          <>
            <p className="cb-t">📬 Contacto de {p.nombre}</p>
            <ul className="cb-list">
              {p.email    && <li>Email: {p.email}</li>}
              {p.telefono && <li>Teléfono: {p.telefono}</li>}
              {p.linkedin && <li>LinkedIn: {p.linkedin}</li>}
              {p.github   && <li>GitHub: {p.github}</li>}
              {!(p.email || p.telefono || p.linkedin || p.github) && <li>Sin datos de contacto.</li>}
            </ul>
          </>
        );
        return;
      }
      case "cursos": {
        const c = p.cursos || [];
        pushBot(
          <>
            <p className="cb-t">🏆 Certificaciones y cursos de {p.nombre}</p>
            {c.length > 0 ? (
              <ul className="cb-list">
                {c.map((x, i) => (
                  <li key={i}>
                    <strong>{x.nombre}</strong>
                    {x.institucion ? ` — ${x.institucion}` : ""}
                    {x.anio ? ` (${x.anio})` : ""}
                  </li>
                ))}
              </ul>
            ) : <p className="cb-txt">No tiene certificaciones registradas.</p>}
          </>
        );
        return;
      }
      case "resumen": {
        pushBot(
          <>
            <p className="cb-t">📝 Resumen de {p.nombre}</p>
            <p className="cb-txt">{p.resumen || "Sin resumen registrado."}</p>
            {p.intereses && <p className="cb-muted"><strong>Intereses:</strong> {p.intereses}</p>}
          </>
        );
        return;
      }
      case "nivel": {
        const n = nivelCandidato(p);
        pushBot(
          <>
            <p className="cb-t">📊 Nivel general de {p.nombre}</p>
            <span className={`cb-nivel cb-nivel-${n.toLowerCase()}`}>{n}</span>
            <p className="cb-muted" style={{ marginTop: 6 }}>
              Calculado en base a skills, experiencia, proyectos y formación.
            </p>
          </>
        );
        return;
      }
      case "ubicacion": {
        const ubi = [p.distrito, p.ciudad, p.pais].filter(Boolean).join(", ");
        pushBot(
          <>
            <p className="cb-t">📍 Ubicación de {p.nombre}</p>
            <p className="cb-txt">{ubi || "Sin ubicación registrada."}</p>
          </>
        );
        return;
      }
      case "disponibilidad": {
        const m = p.movilidad || {};
        pushBot(
          <>
            <p className="cb-t">✈️ Disponibilidad de {p.nombre}</p>
            <ul className="cb-list">
              <li>Viajar: <strong>{m.viajar ? "Sí" : "No"}</strong></li>
              <li>Reubicación: <strong>{m.reubicacion ? "Sí" : "No"}</strong></li>
              <li>Vehículo propio: <strong>{m.vehiculo ? "Sí" : "No"}</strong></li>
            </ul>
          </>
        );
        return;
      }
      case "fortalezas": {
        const fuertes = [];
        if ((p.skills?.length || 0) >= 5)           fuertes.push("Amplio set de habilidades técnicas");
        if ((p.proyectos?.length || 0) >= 2)        fuertes.push("Experiencia práctica en proyectos");
        if ((p.experiencia?.length || 0) >= 2)      fuertes.push("Trayectoria laboral diversa");
        if ((p.idiomas?.length || 0) >= 2)          fuertes.push("Dominio de múltiples idiomas");
        if ((p.cursos?.length || 0) >= 1)           fuertes.push("Formación continua acreditada");
        if ((p.habilidadesBlandas?.length || 0) >= 3) fuertes.push("Buenas habilidades blandas");
        if (p.resumen && p.resumen.length > 80)     fuertes.push("Perfil profesional bien documentado");
        pushBot(
          <>
            <p className="cb-t">💪 Fortalezas de {p.nombre}</p>
            {fuertes.length > 0 ? (
              <ul className="cb-list">{fuertes.map((f, i) => <li key={i}>{f}</li>)}</ul>
            ) : <p className="cb-txt">No se identifican fortalezas destacadas por ahora.</p>}
          </>
        );
        return;
      }
      case "debilidades": {
        const debiles = [];
        if ((p.skills?.length || 0) < 3)            debiles.push("Pocas habilidades técnicas registradas");
        if ((p.proyectos?.length || 0) === 0)       debiles.push("Sin proyectos documentados");
        if ((p.experiencia?.length || 0) === 0)     debiles.push("Sin experiencia laboral registrada");
        if ((p.idiomas?.length || 0) === 0)         debiles.push("Sin idiomas declarados");
        if (!p.resumen)                             debiles.push("Falta resumen profesional");
        if ((p.cursos?.length || 0) === 0)          debiles.push("Sin certificaciones registradas");
        pushBot(
          <>
            <p className="cb-t">⚠️ Áreas de mejora de {p.nombre}</p>
            {debiles.length > 0 ? (
              <ul className="cb-list">{debiles.map((d, i) => <li key={i}>{d}</li>)}</ul>
            ) : <p className="cb-txt">El perfil está bastante completo, sin debilidades evidentes.</p>}
          </>
        );
        return;
      }
      case "recomendacion_ctx": {
        const nv = nivelCandidato(p);
        const veredicto =
          nv === "Alto"  ? { t: `✅ Sí, recomendaría a ${p.nombre} para avanzar en el proceso.`, c: "cb-veredicto-si" } :
          nv === "Medio" ? { t: `⚠️ Con reservas. ${p.nombre} podría avanzar con una evaluación más profunda.`, c: "cb-veredicto-par" } :
                           { t: `❌ No recomendaría a ${p.nombre} para avanzar por ahora.`, c: "cb-veredicto-no" };
        pushBot(
          <>
            <p className="cb-t">🗣️ Recomendación</p>
            <div className={`cb-veredicto ${veredicto.c}`}>
              <p className="cb-ver-titulo">{veredicto.t}</p>
              <p className="cb-ver-det">
                Basado en un nivel general <strong>{nv}</strong> considerando skills, experiencia, proyectos y formación.
              </p>
            </div>
          </>
        );
        return;
      }
      case "edad": {
        const val = p.edad || p.fechaNacimiento;
        pushBot(
          <>
            <p className="cb-t">🎂 Edad de {p.nombre}</p>
            <p className="cb-txt">{val ? String(val) : "No registrada."}</p>
          </>
        );
        return;
      }
      case "genero": {
        pushBot(
          <>
            <p className="cb-t">👤 Género de {p.nombre}</p>
            <p className="cb-txt">{p.genero || "No registrado."}</p>
          </>
        );
        return;
      }
      case "nombre_completo": {
        pushBot(
          <>
            <p className="cb-t">🪪 Nombre completo</p>
            <p className="cb-txt"><strong>{p.nombre} {p.apellidos || ""}</strong></p>
          </>
        );
        return;
      }
      case "titulo_actual": {
        pushBot(
          <>
            <p className="cb-t">💼 Cargo / título actual</p>
            <p className="cb-txt">{p.titulo || "Sin título registrado."}</p>
            {p.area && <p className="cb-muted">Área: {p.area}</p>}
          </>
        );
        return;
      }
      case "completitud": {
        const pct = calcCompletitud(p);
        const color = pct >= 80 ? "#16a34a" : pct >= 60 ? "#d97706" : "#dc2626";
        pushBot(
          <>
            <p className="cb-t">📊 Completitud de perfil</p>
            <p className="cb-txt"><strong style={{ color }}>{pct}%</strong> de información registrada.</p>
          </>
        );
        return;
      }
      case "tiempo_exp": {
        const meses = totalMesesExp(p);
        const años = Math.floor(meses / 12);
        const resto = meses % 12;
        pushBot(
          <>
            <p className="cb-t">⏱️ Tiempo total de experiencia</p>
            <p className="cb-txt">
              {meses > 0
                ? `${años > 0 ? `${años} año${años > 1 ? "s" : ""}` : ""}${años > 0 && resto > 0 ? " y " : ""}${resto > 0 ? `${resto} mes${resto > 1 ? "es" : ""}` : ""} (${meses} meses totales).`
                : "Sin experiencia registrada."}
            </p>
          </>
        );
        return;
      }
      case "historial_bcp": {
        const h = (p.rotaciones || []).filter((r) => r.area);
        pushBot(
          <>
            <p className="cb-t">🔄 Historial BCP de {p.nombre}</p>
            {h.length > 0 ? (
              <ul className="cb-list">
                {h.map((r, i) => (
                  <li key={i}>
                    <strong>{r.area}</strong>
                    {r.desdeA && ` (${r.desdeM || ""} ${r.desdeA}${r.actualmente ? " — Actualidad" : r.hastaA ? ` — ${r.hastaM || ""} ${r.hastaA}` : ""})`}
                    {r.logros && <div className="cb-muted">{r.logros}</div>}
                  </li>
                ))}
              </ul>
            ) : <p className="cb-txt">Sin rotaciones registradas.</p>}
          </>
        );
        return;
      }
      case "porque": {
        const nv = nivelCandidato(p);
        const puntos = [];
        if ((p.skills?.length || 0) > 0)       puntos.push(`${p.skills.length} skills técnicas`);
        if ((p.proyectos?.length || 0) > 0)    puntos.push(`${p.proyectos.length} proyectos`);
        if ((p.experiencia?.length || 0) > 0)  puntos.push(`${p.experiencia.length} experiencia(s) laboral(es)`);
        if ((p.educacion?.length || 0) > 0)    puntos.push(`${p.educacion.length} formación académica`);
        pushBot(
          <>
            <p className="cb-t">🧠 Razonamiento</p>
            <p className="cb-txt">
              Nivel <strong>{nv}</strong>, calculado con los siguientes datos del perfil:
            </p>
            <ul className="cb-list">{puntos.map((x, i) => <li key={i}>{x}</li>)}</ul>
            {p.resumen && <p className="cb-muted"><strong>Resumen:</strong> {p.resumen.slice(0, 180)}{p.resumen.length > 180 ? "..." : ""}</p>}
          </>
        );
        return;
      }
      default: return;
    }
  };

  /* ─── Responder queries globales ─── */
  const responderEstadisticas = () => {
    const total = practicantes.length;
    const areas = {};
    practicantes.forEach((p) => {
      if (p.area) areas[p.area] = (areas[p.area] || 0) + 1;
    });
    const topAreas = Object.entries(areas).sort((a, b) => b[1] - a[1]).slice(0, 5);
    pushBot(
      <>
        <p className="cb-t">📊 Estadísticas generales</p>
        <p className="cb-txt"><strong>{total}</strong> practicantes registrados.</p>
        {topAreas.length > 0 && (
          <>
            <p className="cb-sec">Por área</p>
            <ul className="cb-list">
              {topAreas.map(([a, n]) => <li key={a}>{a}: <strong>{n}</strong></li>)}
            </ul>
          </>
        )}
      </>
    );
  };

  const responderAreasLista = () => {
    const set = new Set();
    practicantes.forEach((p) => { if (p.area) set.add(p.area); });
    const lista = [...set].sort();
    pushBot(
      <>
        <p className="cb-t">📋 Áreas disponibles</p>
        {lista.length > 0 ? (
          <div className="cb-tags">
            {lista.map((a, i) => <span key={i} className="cb-tag">{a}</span>)}
          </div>
        ) : <p className="cb-txt">No hay áreas registradas.</p>}
      </>
    );
  };

  const responderSkillsLista = () => {
    const set = new Set();
    practicantes.forEach((p) => (p.skills || []).forEach((s) => s && set.add(s.trim())));
    const lista = [...set].sort().slice(0, 30);
    pushBot(
      <>
        <p className="cb-t">⚡ Skills disponibles (top 30)</p>
        {lista.length > 0 ? (
          <div className="cb-tags">
            {lista.map((s, i) => <span key={i} className="cb-tag">{s}</span>)}
          </div>
        ) : <p className="cb-txt">No hay skills registradas.</p>}
      </>
    );
  };

  const responderMejores = () => {
    const top = [...practicantes]
      .map((p) => ({ p, nivel: nivelCandidato(p) }))
      .filter((x) => x.nivel === "Alto")
      .slice(0, 5);
    pushBot(
      <>
        <p className="cb-t">🏆 Mejores candidatos</p>
        {top.length > 0 ? (
          <div className="cb-resultados">
            {top.map(({ p }, i) => (
              <div key={p.id} className="cb-res">
                <div className="cb-res-head">
                  <span className="cb-res-pos">#{i + 1}</span>
                  <strong>{p.nombre} {p.apellidos}</strong>
                  <span className="cb-nivel cb-nivel-alto">Alto</span>
                </div>
                <p className="cb-res-meta">{p.titulo || "Sin título"} · {p.area || "Sin área"}</p>
              </div>
            ))}
          </div>
        ) : <p className="cb-txt">No hay candidatos con nivel Alto por ahora.</p>}
      </>
    );
  };

  const responderRecomendar = () => {
    if (practicantes.length === 0) return;
    const p = practicantes[Math.floor(Math.random() * practicantes.length)];
    const nivel = nivelCandidato(p);
    pushBot(
      <>
        <p className="cb-t">🎲 Candidato sugerido</p>
        <p className="cb-txt">
          <strong>{p.nombre} {p.apellidos}</strong> — {p.titulo || "Sin título"}
        </p>
        <p className="cb-muted">Área: {p.area || "—"} · Nivel: {nivel}</p>
        <p className="cb-muted">Escribe su nombre para ver más detalles.</p>
      </>
    );
  };

  const responderTop = (txt) => {
    const n = extraerTopN(txt);
    const top = [...practicantes]
      .map((p) => ({ p, ...scorePracticante(p, txt) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, n);
    pushBot(
      <>
        <p className="cb-t">🔝 Top {n} practicantes</p>
        <div className="cb-resultados">
          {top.map(({ p, score }, i) => {
            const nv = score > 0 ? nivelDeScore(score) : nivelCandidato(p);
            return (
              <div key={p.id} className="cb-res">
                <div className="cb-res-head">
                  <span className="cb-res-pos">#{i + 1}</span>
                  <strong>{p.nombre} {p.apellidos}</strong>
                  <span className={`cb-nivel cb-nivel-${nv.toLowerCase()}`}>{nv}</span>
                </div>
                <p className="cb-res-meta">{p.titulo || "Sin título"} · {p.area || "Sin área"}</p>
              </div>
            );
          })}
        </div>
      </>
    );
  };

  const responderBuscarUbicacion = (txt) => {
    const t = txt.toLowerCase();
    const resultados = practicantes.filter((p) => {
      const ubi = [p.ciudad, p.distrito, p.pais].filter(Boolean).join(" ").toLowerCase();
      return ubi && t.split(/\s+/).some((w) => w.length > 3 && ubi.includes(w));
    }).slice(0, 5);
    pushBot(
      <>
        <p className="cb-t">📍 Practicantes por ubicación</p>
        {resultados.length > 0 ? (
          <div className="cb-resultados">
            {resultados.map((p, i) => (
              <div key={p.id} className="cb-res">
                <div className="cb-res-head">
                  <span className="cb-res-pos">#{i + 1}</span>
                  <strong>{p.nombre} {p.apellidos}</strong>
                </div>
                <p className="cb-res-meta">{[p.ciudad, p.pais].filter(Boolean).join(", ")} · {p.area || "Sin área"}</p>
              </div>
            ))}
          </div>
        ) : <p className="cb-txt">No encontré practicantes en esa ubicación.</p>}
      </>
    );
  };

  const responderComparar = (txt) => {
    // intentar extraer dos nombres separados por "vs" / "y" / "con"
    const partes = txt.split(/\s+(?:vs\.?|versus|contra|y|con)\s+/i);
    if (partes.length < 2) {
      pushBot(<p className="cb-txt">Indica dos candidatos. Ej: <em>"compara Elizabeth vs Samantha"</em></p>);
      return;
    }
    const limpio = partes.map((x) => x.replace(/\b(compara|comparar|comparación)\b/gi, "").trim());
    const a = encontrarCandidato(limpio[0]);
    const b = encontrarCandidato(limpio[1]);
    if (!a || !b) {
      pushBot(<p className="cb-txt">No pude identificar a ambos candidatos. Verifica nombres o IDs.</p>);
      return;
    }
    const nvA = nivelCandidato(a), nvB = nivelCandidato(b);
    const row = (label, va, vb) => (
      <tr><td>{label}</td><td>{va}</td><td>{vb}</td></tr>
    );
    pushBot(
      <>
        <p className="cb-t">⚖️ Comparación</p>
        <table className="cb-tabla">
          <thead>
            <tr><th></th><th>{a.nombre}</th><th>{b.nombre}</th></tr>
          </thead>
          <tbody>
            {row("Área", a.area || "—", b.area || "—")}
            {row("Skills", a.skills?.length || 0, b.skills?.length || 0)}
            {row("Proyectos", a.proyectos?.length || 0, b.proyectos?.length || 0)}
            {row("Experiencias", a.experiencia?.length || 0, b.experiencia?.length || 0)}
            {row("Idiomas", a.idiomas?.length || 0, b.idiomas?.length || 0)}
            {row("Nivel", nvA, nvB)}
          </tbody>
        </table>
      </>
    );
  };

  const listarPracticantes = (arr, titulo, limite = 5) => {
    const top = arr.slice(0, limite);
    pushBot(
      <>
        <p className="cb-t">{titulo}</p>
        {top.length > 0 ? (
          <div className="cb-resultados">
            {top.map((p, i) => (
              <div key={p.id} className="cb-res">
                <div className="cb-res-head">
                  <span className="cb-res-pos">#{i + 1}</span>
                  <strong>{p.nombre} {p.apellidos || ""}</strong>
                </div>
                <p className="cb-res-meta">{p.titulo || "Sin título"} · {p.area || "Sin área"}</p>
              </div>
            ))}
          </div>
        ) : <p className="cb-txt">No hay resultados.</p>}
      </>
    );
  };

  const responderGlobal = (intencion, txt) => {
    switch (intencion) {
      case "estadisticas":     responderEstadisticas();          return true;
      case "areas_lista":      responderAreasLista();            return true;
      case "skills_lista":     responderSkillsLista();           return true;
      case "mejores":          responderMejores();               return true;
      case "recomendar":       responderRecomendar();            return true;
      case "top":              responderTop(txt);                return true;
      case "buscar_ubicacion": responderBuscarUbicacion(txt);    return true;
      case "comparar":         responderComparar(txt);           return true;
      case "por_skill": {
        const ord = [...practicantes]
          .map((p) => ({ p, ...scorePracticante(p, txt) }))
          .filter((r) => r.score > 0)
          .sort((a, b) => b.score - a.score)
          .map((r) => r.p);
        listarPracticantes(ord, "🔎 Practicantes con esa skill");
        return true;
      }
      case "por_idioma": {
        const t = txt.toLowerCase();
        const ids = ["ingles","inglés","english","portugues","portugués","frances","francés","aleman","alemán","italiano","chino","japones","japonés"];
        const pedido = ids.find((i) => t.includes(i)) || "ingles";
        const ord = practicantes.filter((p) =>
          (p.idiomas || []).some((id) => (id.idioma || "").toLowerCase().includes(pedido.replace("é","e").replace("á","a")))
        );
        listarPracticantes(ord, `🌐 Practicantes con ${pedido}`);
        return true;
      }
      case "por_universidad": {
        const t = txt.toLowerCase();
        const unis = ["pucp","upc","ulima","up","usil","utp","esan","uni","unmsm","pacifico","pacífico"];
        const pedido = unis.find((u) => t.includes(u)) || "";
        const ord = practicantes.filter((p) =>
          (p.educacion || []).some((e) => (e.institucion || "").toLowerCase().includes(pedido))
        );
        listarPracticantes(ord, `🎓 Egresados de ${pedido.toUpperCase()}`);
        return true;
      }
      case "mas_experiencia": {
        const ord = [...practicantes].sort((a, b) => totalMesesExp(b) - totalMesesExp(a));
        listarPracticantes(ord, "⏱️ Con mayor experiencia");
        return true;
      }
      case "menos_experiencia": {
        const ord = [...practicantes].sort((a, b) => totalMesesExp(a) - totalMesesExp(b));
        listarPracticantes(ord, "🌱 Con menos experiencia (juniors)");
        return true;
      }
      case "mas_proyectos": {
        const ord = [...practicantes].sort((a, b) => (b.proyectos?.length || 0) - (a.proyectos?.length || 0));
        listarPracticantes(ord, "🚀 Con más proyectos");
        return true;
      }
      case "mas_skills": {
        const ord = [...practicantes].sort((a, b) => (b.skills?.length || 0) - (a.skills?.length || 0));
        listarPracticantes(ord, "⚡ Con más skills técnicas");
        return true;
      }
      case "favoritos": {
        pushBot(<p className="cb-txt">⭐ Los favoritos se guardan desde las tarjetas del catálogo. Ve al catálogo y marca los que quieras.</p>);
        return true;
      }
      case "movilidad_lista": {
        const ord = practicantes.filter((p) => p.movilidad?.viajar || p.movilidad?.reubicacion);
        listarPracticantes(ord, "✈️ Disponibles para viajar/reubicarse");
        return true;
      }
      case "que_tal":
        pushBot(<p className="cb-txt">¡Todo bien por aquí! 😊 Listo para ayudarte a encontrar el talento ideal.</p>);
        return true;
      case "hora": {
        const h = new Date().toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" });
        pushBot(<p className="cb-txt">🕐 Son las <strong>{h}</strong>.</p>);
        return true;
      }
      case "fecha": {
        const f = new Date().toLocaleDateString("es-PE", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
        pushBot(<p className="cb-txt">📅 Hoy es <strong>{f}</strong>.</p>);
        return true;
      }
      case "felicidades":
        pushBot(<p className="cb-txt">🎉 ¡Gracias! Que tengas un excelente día.</p>);
        return true;
      case "consejo_entrevista":
        pushBot(
          <>
            <p className="cb-t">💡 Tips para entrevistar practicantes</p>
            <ul className="cb-list">
              <li>Pregunta por un <strong>proyecto real</strong> en el que haya trabajado.</li>
              <li>Evalúa <strong>habilidades blandas</strong> con casos situacionales.</li>
              <li>Profundiza en sus <strong>motivaciones</strong> y plan de carrera.</li>
              <li>Valida skills técnicas con un <strong>mini reto práctico</strong>.</li>
              <li>Dale espacio para que pregunte — mide su curiosidad.</li>
            </ul>
          </>
        );
        return true;
      case "ok_status":
        pushBot(<p className="cb-txt">✅ Todo funcionando. Dime en qué te ayudo.</p>);
        return true;
      case "afirmacion":
        pushBot(<p className="cb-txt">👍 Perfecto. ¿Qué quieres hacer ahora?</p>);
        return true;
      case "negacion":
        pushBot(<p className="cb-txt">Entendido. Si cambias de idea, aquí estaré.</p>);
        return true;
      case "conteo_area": {
        const t = normalizar(txt);
        const area = Object.keys(AREA_KEYWORDS).find((a) =>
          AREA_KEYWORDS[a].some((k) => t.includes(normalizar2(k)))
        );
        const cuenta = area
          ? practicantes.filter((p) => {
              const blob = normalizar([p.area, ...(p.skills || []), ...(p.rotaciones || []).map((r) => r.area)].filter(Boolean).join(" "));
              return AREA_KEYWORDS[area].some((k) => blob.includes(normalizar2(k)));
            }).length
          : 0;
        pushBot(
          <>
            <p className="cb-t">🔢 Conteo</p>
            <p className="cb-txt">
              {area ? (
                <>Hay <strong>{cuenta}</strong> practicante(s) relacionados con <strong>{area}</strong>.</>
              ) : (
                <>No pude identificar el área. Prueba con: finanzas, tecnología, datos, marketing, RRHH, diseño, operaciones, ventas, legal, gestión.</>
              )}
            </p>
          </>
        );
        return true;
      }
      case "hablame": {
        // buscar nombre en el texto y responder con resumen
        const p = encontrarCandidato(txt);
        if (p) { responderResumen(p); return true; }
        pushBot(<p className="cb-txt">¿De quién quieres que te cuente? Dame el nombre o ID.</p>);
        return true;
      }
      case "primer": {
        const p = practicantes[0];
        if (p) {
          pushBot(<p className="cb-txt">🥇 El primer practicante de la lista es <strong>{p.nombre} {p.apellidos || ""}</strong>.</p>);
        }
        return true;
      }
      case "ultimo": {
        const p = practicantes[practicantes.length - 1];
        if (p) {
          pushBot(<p className="cb-txt">🏁 El último practicante registrado es <strong>{p.nombre} {p.apellidos || ""}</strong>.</p>);
        }
        return true;
      }
      case "exportar":
        pushBot(<p className="cb-txt">📥 Por ahora no puedo exportar, pero puedes usar "Ver perfil completo" en cada tarjeta e imprimir desde el navegador (Ctrl+P).</p>);
        return true;
      case "enviar_email": {
        if (candidatoCtx?.email) {
          pushBot(
            <>
              <p className="cb-txt">
                📧 Puedes escribirle a: <strong>{candidatoCtx.email}</strong>
              </p>
              <p className="cb-muted">Abre tu cliente de correo o copia la dirección.</p>
            </>
          );
        } else {
          pushBot(<p className="cb-txt">Primero selecciona un candidato y verifica si tiene email registrado.</p>);
        }
        return true;
      }
      case "version":
        pushBot(<p className="cb-txt">🤖 Asistente Talento BCP v1.0 — integrado con Firebase.</p>);
        return true;
      case "autor":
        pushBot(<p className="cb-txt">Fui creado para ayudar al equipo de líderes del BCP a encontrar talento. 💙</p>);
        return true;
      case "emoji":
        pushBot(<p className="cb-txt">✨🌟💼📈🎯🚀💡🤝🏆🎓</p>);
        return true;
      case "esperar":
        pushBot(<p className="cb-txt">Tómate tu tiempo 😊 Cuando estés listo, dime qué necesitas.</p>);
        return true;
      case "despedida":
        pushBot(<p className="cb-txt">¡Hasta luego! 👋 Estaré aquí cuando me necesites.</p>);
        return true;
      case "quien_eres":
        pushBot(
          <>
            <p className="cb-t">🤖 Asistente Talento BCP</p>
            <p className="cb-txt">
              Soy tu asistente IA para encontrar y evaluar practicantes. Puedo analizar perfiles,
              comparar candidatos, filtrar por área o ubicación y más.
            </p>
          </>
        );
        return true;
      case "reset":
        setMensajes([]);
        setModo(null);
        setCandidatoCtx(null);
        setTimeout(() => {
          pushBot(<p className="cb-txt">🔄 Conversación reiniciada.</p>);
        }, 80);
        return true;
      case "broma":
        pushBot(<p className="cb-txt">😄 ¿Por qué el practicante trajo una escalera al trabajo? ¡Porque quería subir de nivel!</p>);
        return true;
      default: return false;
    }
  };

  /* ─── Render resumen ─── */
  const responderResumen = (p) => {
    const skills = (p.skills || []).slice(0, 8);
    const blandas = (p.habilidadesBlandas || []).slice(0, 5);
    const proyectos = (p.proyectos || []).slice(0, 3);
    const exp = (p.experiencia || []).slice(0, 2);
    const nivel = nivelCandidato(p);

    pushBot(
      <>
        <p className="cb-t">📄 {p.nombre} {p.apellidos}</p>
        <p className="cb-muted" style={{ marginTop: -4 }}>
          {p.titulo || "Sin título"} · {p.area || "Sin área"}
        </p>

        <p className="cb-sec">Resumen</p>
        <p className="cb-txt">{p.resumen || "Sin resumen registrado."}</p>

        <p className="cb-sec">Habilidades clave</p>
        {skills.length > 0 || blandas.length > 0 ? (
          <div className="cb-tags">
            {skills.map((s, i) => <span key={"t" + i} className="cb-tag">{s}</span>)}
            {blandas.map((s, i) => <span key={"b" + i} className="cb-tag cb-tag-bla">{s}</span>)}
          </div>
        ) : <p className="cb-muted">No registradas.</p>}

        <p className="cb-sec">Experiencia relevante</p>
        {exp.length > 0 ? (
          <ul className="cb-list">
            {exp.map((e, i) => (
              <li key={i}>
                <strong>{e.cargo}</strong>{e.empresa ? ` — ${e.empresa}` : ""}
              </li>
            ))}
          </ul>
        ) : <p className="cb-muted">Sin experiencia registrada.</p>}

        <p className="cb-sec">Proyectos destacados</p>
        {proyectos.length > 0 ? (
          <ul className="cb-list">
            {proyectos.map((pr, i) => (
              <li key={i}><strong>{pr.nombre}</strong>{pr.rol ? ` — ${pr.rol}` : ""}</li>
            ))}
          </ul>
        ) : <p className="cb-muted">No registrados.</p>}

        <p className="cb-sec">Nivel general</p>
        <span className={`cb-nivel cb-nivel-${nivel.toLowerCase()}`}>{nivel}</span>
      </>
    );
  };

  /* ─── Veredicto verbal ─── */
  const veredictoDe = (p, consulta, score, nivel, matches) => {
    const esMujer = (p.genero || "").toLowerCase().startsWith("f");
    const articulo = esMujer ? "una buena candidata" : "un buen candidato";
    const articuloPos = esMujer ? "es una candidata adecuada" : "es un candidato adecuado";
    const articuloNeg = esMujer ? "no es la candidata ideal" : "no es el candidato ideal";
    const pronombre = esMujer ? "Ella" : "Él";
    const nombreCorto = p.nombre;

    // Extraer el tópico principal (eliminar frases comunes)
    const topico = consulta
      .toLowerCase()
      .replace(/^(es (un[ao] )?(bueno|buena|bueno[as]?|adecuado[as]?)|sirve|puede|podría|vale|funciona|apto[as]?|recomiendas|deberia|debería)/i, "")
      .replace(/\b(para|en|con|como|trabajar|el area|el área|esta posicion|esta posición)\b/gi, "")
      .replace(/[¿?¡!.,]/g, "")
      .trim() || "esta posición";

    if (nivel === "Alto") {
      return {
        tono: "positivo",
        titulo: `✅ Sí, ${nombreCorto} ${articuloPos} para ${topico}.`,
        detalle: `${pronombre} tiene un perfil fuerte: se detectaron ${matches.length} coincidencias directas con skills, proyectos o experiencia alineadas. Recomendamos avanzar al siguiente paso del proceso.`,
      };
    }
    if (nivel === "Medio") {
      return {
        tono: "parcial",
        titulo: `⚠️ Parcialmente. ${nombreCorto} podría ser ${articulo} para ${topico}, con reservas.`,
        detalle: `Hay ${matches.length} coincidencias relevantes, pero el perfil no cubre completamente lo requerido. Sugerimos validar en entrevista o complementar con capacitación específica.`,
      };
    }
    return {
      tono: "negativo",
      titulo: `❌ No, ${nombreCorto} ${articuloNeg} para ${topico}.`,
      detalle: matches.length > 0
        ? `Aunque hay ${matches.length} coincidencia(s) débil(es), no se observan skills ni experiencia claras para el área. Recomendamos evaluar a otro candidato.`
        : `No se encontraron coincidencias significativas entre el perfil y lo solicitado. No se recomienda para esta posición.`,
    };
  };

  /* ─── Evaluar compatibilidad ─── */
  const responderEvaluacion = (p, consulta) => {
    const { score, matches } = scorePracticante(p, consulta);
    const nivel = nivelDeScore(score);
    const v = veredictoDe(p, consulta, score, nivel, matches);
    const claseTono =
      v.tono === "positivo" ? "cb-veredicto cb-veredicto-si" :
      v.tono === "parcial"  ? "cb-veredicto cb-veredicto-par" :
                              "cb-veredicto cb-veredicto-no";

    pushBot(
      <>
        <p className="cb-t">🎯 Evaluación de {p.nombre}</p>
        <p className="cb-muted" style={{ marginTop: -4 }}>Consulta: "{consulta}"</p>

        <div className={claseTono}>
          <p className="cb-ver-titulo">{v.titulo}</p>
          <p className="cb-ver-det">{v.detalle}</p>
        </div>

        <p className="cb-sec">Nivel de compatibilidad</p>
        <span className={`cb-nivel cb-nivel-${nivel.toLowerCase()}`}>{nivel}</span>

        {matches.length > 0 && (
          <>
            <p className="cb-sec">Puntos a favor</p>
            <div className="cb-tags">
              {matches.slice(0, 10).map((m, i) => (
                <span key={i} className="cb-tag cb-tag-match">{m}</span>
              ))}
            </div>
          </>
        )}
      </>
    );
  };

  /* ─── Buscar lista ─── */
  const responderBusqueda = (consulta) => {
    const resultados = practicantes
      .map((p) => ({ p, ...scorePracticante(p, consulta) }))
      .filter((r) => r.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

    if (resultados.length === 0) {
      pushBot(
        <>
          <p className="cb-t">🔍 Sin resultados</p>
          <p className="cb-txt">
            No se encontraron practicantes que coincidan con "{consulta}".
            Intenta con otra área o habilidad.
          </p>
        </>
      );
      return;
    }

    pushBot(
      <>
        <p className="cb-t">🔍 {resultados.length} practicante{resultados.length > 1 ? "s" : ""} encontrado{resultados.length > 1 ? "s" : ""}</p>
        <p className="cb-muted" style={{ marginTop: -4 }}>Ordenados por relevancia</p>
        <div className="cb-resultados">
          {resultados.map(({ p, score, matches }, i) => {
            const nivel = nivelDeScore(score);
            return (
              <div key={p.id} className="cb-res">
                <div className="cb-res-head">
                  <span className="cb-res-pos">#{i + 1}</span>
                  <strong>{p.nombre} {p.apellidos}</strong>
                  <span className={`cb-nivel cb-nivel-${nivel.toLowerCase()}`}>{nivel}</span>
                </div>
                <p className="cb-res-meta">{p.titulo || "Sin título"} · {p.area || "Sin área"}</p>
                {matches.length > 0 && (
                  <p className="cb-res-just">
                    Coincidencias: {matches.slice(0, 5).join(", ")}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </>
    );
  };

  /* ─── Manejo del envío ─── */
  const enviar = () => {
    const txt = input.trim();
    if (!txt) return;
    pushUser(txt);
    setInput("");

    if (practicantes.length === 0) {
      pushBot(<p className="cb-txt">Aún cargando datos de practicantes. Intenta de nuevo en un momento.</p>);
      return;
    }

    const intencion = detectarIntencion(txt);

    // Respuestas generales de cortesía (en cualquier modo)
    if (intencion === "saludo") {
      pushBot(<p className="cb-txt">¡Hola! 👋 Soy tu asistente de talento. Elige una opción del menú o cuéntame qué necesitas.</p>);
      return;
    }
    if (intencion === "gracias") {
      pushBot(<p className="cb-txt">¡De nada! ¿Algo más en lo que pueda ayudar?</p>);
      return;
    }
    if (intencion === "ayuda") {
      pushBot(
        <>
          <p className="cb-t">💡 ¿Qué puedo hacer?</p>
          <ul className="cb-list">
            <li>Buscar practicantes por área, skill o ubicación</li>
            <li>Evaluar compatibilidad de un candidato con un área</li>
            <li>Mostrar resumen, skills, proyectos, experiencia, formación, idiomas, contacto, disponibilidad</li>
            <li>Comparar dos candidatos lado a lado</li>
            <li>Top N candidatos, mejores candidatos, recomendación aleatoria</li>
            <li>Estadísticas: cuántos practicantes hay, áreas disponibles, skills disponibles</li>
          </ul>
          <p className="cb-muted">
            Ejemplos: <em>"busca practicantes de finanzas"</em>, <em>"compara Elizabeth vs Samantha"</em>,
            <em>"top 3 candidatos"</em>, <em>"practicantes en Lima"</em>, <em>"recomiéndame uno"</em>.
          </p>
        </>
      );
      return;
    }

    // Intenciones globales (estadísticas, comparar, top, recomendar, etc.)
    if (responderGlobal(intencion, txt)) return;

    if (!modo) {
      // intentar detectar intención para navegar
      const t = txt.toLowerCase();
      if (t.includes("buscar") || t.includes("lista")) return iniciarModo("buscar");
      if (t.includes("evaluar") || t.includes("compatib")) return iniciarModo("evaluar");
      if (t.includes("resumen") || t.includes("ver perfil")) return iniciarModo("resumen");
      // ¿escribió directamente un ID o nombre?
      const p = encontrarCandidato(txt);
      if (p) {
        setCandidatoCtx(p);
        setModo("evaluar");
        pushBot(
          <>
            <p className="cb-txt">✅ Candidato reconocido: <strong>{p.nombre} {p.apellidos}</strong>.</p>
            <p className="cb-muted">Pregúntame por sus skills, proyectos, experiencia, o su compatibilidad con un área.</p>
          </>
        );
        return;
      }
      pushBot(<p className="cb-txt">¿Podrías dar más detalles o elegir una opción del menú?</p>);
      return;
    }

    if (modo === "resumen") {
      const p = encontrarCandidato(txt);
      if (!p) {
        pushBot(<p className="cb-txt">No encontré un practicante con ese ID o nombre. ¿Podrías verificar?</p>);
        return;
      }
      responderResumen(p);
      return;
    }

    if (modo === "evaluar") {
      if (!candidatoCtx) {
        const p = encontrarCandidato(txt);
        if (!p) {
          pushBot(<p className="cb-txt">No encontré un practicante con ese ID o nombre. ¿Podrías verificar?</p>);
          return;
        }
        setCandidatoCtx(p);
        pushBot(
          <>
            <p className="cb-txt">
              ✅ Candidato seleccionado: <strong>{p.nombre} {p.apellidos}</strong>.
            </p>
            <p className="cb-muted">
              Ahora puedes preguntar por sus <em>skills, proyectos, experiencia, formación, idiomas, contacto</em>
              {" "}o evaluar su compatibilidad con un área. Ej: <em>"¿es bueno para finanzas?"</em>
            </p>
          </>
        );
        return;
      }
      // Si hay intención informativa, respondemos directo
      if (intencion && ["skills","blandas","proyectos","experiencia","educacion","idiomas","contacto","cursos","resumen","nivel","ubicacion","disponibilidad","fortalezas","debilidades","recomendacion_ctx","porque","edad","genero","nombre_completo","titulo_actual","completitud","tiempo_exp","historial_bcp"].includes(intencion)) {
        responderInfo(candidatoCtx, intencion);
        return;
      }
      // Cambiar de candidato
      const otro = encontrarCandidato(txt);
      if (otro && otro.id !== candidatoCtx.id) {
        setCandidatoCtx(otro);
        pushBot(<p className="cb-txt">🔄 Ahora evaluando a <strong>{otro.nombre} {otro.apellidos}</strong>.</p>);
        return;
      }
      // Por defecto: evaluación de compatibilidad
      responderEvaluacion(candidatoCtx, txt);
      return;
    }

    if (modo === "buscar") {
      responderBusqueda(txt);
      return;
    }
  };

  const onKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      enviar();
    }
  };

  return (
    <>
      {/* Botón flotante */}
      {!abierto && (
        <button
          className="cb-fab"
          onClick={() => setAbierto(true)}
          aria-label="Abrir asistente"
        >
          <HiOutlineSparkles size={18} />
          <span>Asistente IA</span>
        </button>
      )}

      {/* Panel */}
      {abierto && (
        <div className="cb-panel" role="dialog" aria-label="Asistente Talento BCP">
          <div className="cb-header">
            <div className="cb-header-l">
              <div className="cb-bot-ava"><HiOutlineSparkles size={15} /></div>
              <div>
                <p className="cb-header-t">Asistente Talento</p>
                <p className="cb-header-s">Evalúa y encuentra practicantes</p>
              </div>
            </div>
            <div className="cb-header-r">
              {modo && (
                <button className="cb-icon-btn" onClick={volverMenu} title="Menú">
                  <FiArrowLeft size={15} />
                </button>
              )}
              <button className="cb-icon-btn" onClick={() => setAbierto(false)} title="Cerrar">
                <FiX size={16} />
              </button>
            </div>
          </div>

          <div className="cb-body" ref={scrollRef}>
            {mensajes.map((m, i) => (
              <div key={i} className={`cb-msg cb-msg-${m.from}`}>
                {typeof m.contenido === "string" ? m.contenido : m.contenido}
              </div>
            ))}
            {cargando && (
              <div className="cb-msg cb-msg-bot cb-loading-msg">
                <span className="cb-dot" /><span className="cb-dot" /><span className="cb-dot" />
              </div>
            )}
          </div>

          <div className="cb-input-wrap">
            <input
              className="cb-input"
              placeholder={
                modo === "resumen" ? "ID o nombre del practicante..." :
                modo === "evaluar" ? (candidatoCtx ? "¿Es bueno para...?" : "ID o nombre...") :
                modo === "buscar" ? "Ej: practicantes de finanzas" :
                "Escribe tu mensaje..."
              }
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKey}
            />
            <button className="cb-send" onClick={enviar} aria-label="Enviar">
              <FiSend size={15} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
