import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { db } from "../firebase/firebase";
import {
    collection, getDocs, doc, getDoc,
    updateDoc, arrayUnion, arrayRemove,
} from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import Filtros from "./Filtros.jsx";
import { useRol } from "../hooks/useRol";
import "../stylesheets/Catalogo.css";

import {
    FiMapPin, FiStar, FiMail, FiPhone, FiArrowLeft,
    FiExternalLink, FiX, FiSliders, FiMic, FiMicOff,
} from "react-icons/fi";
import {
    MdSchool, MdBolt, MdMenuBook,
} from "react-icons/md";
import { HiOutlineBriefcase } from "react-icons/hi";
import { FiCopy, FiCheck } from "react-icons/fi";
import { BsTrophy } from "react-icons/bs";
import { IoSearchOutline } from "react-icons/io5";
import { RiTeamLine } from "react-icons/ri";
import { AiOutlineSafety } from "react-icons/ai";
import { FaLinkedin, FaGithub } from "react-icons/fa";
import { calcCompletitud } from "./Perfil";

/* ── Chip de ID con copia al portapapeles ── */
function IdChip({ id, clase = "tc-id" }) {
    const [copiado, setCopiado] = useState(false);
    const corto = id.length > 10 ? id.slice(0, 10) : id;
    const copiar = (e) => {
        e.stopPropagation();
        navigator.clipboard?.writeText(corto);
        setCopiado(true);
        setTimeout(() => setCopiado(false), 1400);
    };
    return (
        <button
            type="button"
            className={`${clase} ${copiado ? `${clase}-ok` : ""}`}
            onClick={copiar}
            title={copiado ? "¡Copiado!" : `Copiar ID: ${corto}`}
        >
            {copiado ? <FiCheck size={11} /> : <FiCopy size={10} />}
            <span>ID: {corto}</span>
        </button>
    );
}

const MESES_MAP = {
    Enero: 0, Febrero: 1, Marzo: 2, Abril: 3, Mayo: 4, Junio: 5,
    Julio: 6, Agosto: 7, Septiembre: 8, Octubre: 9, Noviembre: 10, Diciembre: 11,
};

const norm = (s) =>
    (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

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
    if (m <= 0) return null;
    if (m <= 3) return "1–3 meses";
    if (m <= 6) return "4–6 meses";
    if (m <= 12) return "6–12 meses";
    return "+12 meses";
};

const FILTROS_INIT = {
    busqueda: "",
    areas: [],
    skills: [],
    idiomas: [],
    nivelEducacion: [],
    generos: [],
    ubicaciones: [],
    rangosExp: [],
    soloFavoritos: false,
    soloConProyectos: false,
};

/* ══════════════════════════════════════════
   CONSTRUIR TEXTO BUSCABLE DE UN PERFIL
══════════════════════════════════════════ */
const buildTextoPerfil = (p) =>
    [
        p.nombre,
        p.apellidos,
        p.titulo,
        p.area,
        p.intereses,
        p.resumen,
        p.distrito,
        p.ciudad,
        p.pais,
        ...(p.skills || []),
        ...(p.habilidadesBlandas || []),
        ...(p.idiomas || []).map((i) => `${i.idioma || i} ${i.nivel || ""}`),
        ...(p.educacion || []).map((e) =>
            `${e.institucion || ""} ${e.carrera || ""} ${e.nivel || ""}`
        ),
        ...(p.experiencia || []).map((e) =>
            `${e.cargo || ""} ${e.empresa || ""} ${e.funciones || ""}`
        ),
        ...(p.rotaciones || []).map((r) =>
            `${r.area || ""} ${r.logros || ""}`
        ),
        ...(p.proyectos || []).map((pr) =>
            `${pr.nombre || ""} ${pr.descripcion || ""} ${pr.rol || ""}`
        ),
        ...(p.cursos || []).map((c) =>
            `${c.nombre || ""} ${c.institucion || ""}`
        ),
    ]
        .filter(Boolean)
        .map(norm)
        .join(" ");

/* ══════════════════════════════════════════
   BÚSQUEDA — STOP WORDS
   ⚠️  NO incluir aquí palabras que también
   sean skills/herramientas (excel, python…)
   ni nombres de universidades o institutos.
══════════════════════════════════════════ */
const STOP_WORDS = new Set([
    // Intención y pedidos
    "quiero", "busco", "necesito", "dame", "muestrame", "muestrame",
    "encuentra", "encontrar", "ver", "mostrar", "pasame", "pasame",
    "listame", "listame", "consigue", "ubica", "identifica",
    // Artículos, preposiciones y conectores
    "un", "una", "unos", "unas", "el", "la", "los", "las",
    "de", "del", "en", "con", "que", "sea", "este", "esta",
    "es", "se", "su", "sus", "por", "para", "al", "lo",
    "y", "o", "e", "ni", "pero", "sino", "aunque", "como",
    "me", "mi", "nos", "tu", "hay", "tambien", "tambien",
    "mas", "muy", "bien", "bueno", "buena", "buen",
    // Modismos y rellenos de búsqueda
    "alguien", "persona", "perfil", "candidato", "candidata",
    "talento", "postulante", "chico", "chica",
    "algun", "alguna",
    "venga", "este", "viviendo", "llamado",
    // Palabras genéricas de RRHH
    // ⚠️  "practicante/s" se mantienen como stop words
    // pero NO "estudiante" porque puede ser útil
    "practicante", "practicantes",
    "conocimiento", "conocimientos",
    "habilidad", "habilidades",
    "manejo", "sabe", "sepa", "tenga",
    "tiene", "domina", "dominio",
    // ⚠️  "nivel", "carrera", "universidad", "facultad" eliminados
    //     porque pueden aparecer en textos de perfiles reales
]);

/* ══════════════════════════════════════════
   ALIAS_FRASES — frases de 2+ palabras primero
══════════════════════════════════════════ */
const ALIAS_FRASES = [
    ["power bi",                "power bi"],
    ["powerbi",                 "power bi"],
    ["san marcos",              "san marcos"],
    ["la molina",               "la molina"],
    ["san pablo",               "san pablo"],
    ["cesar vallejo",           "ucv"],
    ["data science",            "data science"],
    ["machine learning",        "machine learning"],
    ["deep learning",           "deep learning"],
    ["adobe xd",                "adobe xd"],
    ["google analytics",        "google analytics"],
    ["r studio",                "r studio"],
    ["diseño grafico",          "diseño grafico"],
    ["diseño grafico",          "diseño grafico"],
    ["trabajo social",          "trabajo social"],
    ["ciencias politicas",      "ciencias politicas"],
    ["ingenieria de sistemas",  "ingenieria de sistemas"],
    ["ingenieria de software",  "ingenieria de software"],
    ["ingenieria industrial",   "ingenieria industrial"],
    ["ingenieria civil",        "ingenieria civil"],
    ["ingenieria electronica",  "ingenieria electronica"],
    ["ingenieria mecanica",     "ingenieria mecanica"],
    ["mas de 12",               "+12"],
    ["mas de 12",               "+12"],
    ["mas de un ano",           "+12"],
    ["mas de un ano",           "+12"],
    ["un ano",                  "+12"],
    ["muy basico",              "muy basico"],
    ["muy basico",              "muy basico"],
    ["cayetano heredia",        "cayetano"],
    ["santa maria",             "ucsm"],
];

/* ══════════════════════════════════════════
   ALIAS_PALABRAS — token único
══════════════════════════════════════════ */
const ALIAS_PALABRAS = {
    // ── Universidades nacionales ──
    "unmsm":        "san marcos",
    "marcos":       "san marcos",
    "uni":          "uni",
    "unalm":        "la molina",
    "molina":       "la molina",
    "unfv":         "villarreal",
    "villarreal":   "villarreal",
    "unjfsc":       "unjfsc",
    "uncp":         "uncp",
    "unh":          "unh",
    "unsa":         "unsa",
    "unap":         "unap",
    "unsaac":       "unsaac",
    "untrm":        "untrm",
    "unc":          "unc",
    "unj":          "unj",

    // ── Universidades privadas ──
    "upc":          "upc",
    "pucp":         "pucp",
    "pontificia":   "pucp",
    "ulima":        "ulima",
    "pacifico":     "pacifico",
    "continental":  "continental",
    "cayetano":     "cayetano",
    "heredia":      "cayetano",
    "upch":         "cayetano",
    "usil":         "usil",
    "utec":         "utec",
    "udep":         "udep",
    "esan":         "esan",
    "utp":          "utp",
    "upn":          "upn",
    "upeu":         "upeu",
    "upt":          "upt",
    "ucsp":         "ucsp",
    "uancv":        "uancv",
    "uladech":      "uladech",
    "upao":         "upao",
    "usat":         "usat",
    "uss":          "uss",
    "ucv":          "ucv",
    "vallejo":      "ucv",
    "ucsm":         "ucsm",
    "udh":          "udh",
    "udc":          "udc",
    "uack":         "uack",
    "scipade":      "scipade",

    // ── Institutos técnicos ──
    "tecsup":       "tecsup",
    "senati":       "senati",
    "cibertec":     "cibertec",
    "idat":         "idat",
    "certus":       "certus",
    "toulouse":     "toulouse",
    "sise":         "sise",
    "khipu":        "khipu",
    "franklin":     "franklin",
    "britanico":    "britanico",
    "iestp":        "iestp",
    "iberotec":     "iberotec",
    "isc":          "isc",

    // ── Niveles educativos ──
    "egresado":         "egresado",
    "egresada":         "egresado",
    "bachiller":        "bachiller",
    "titulado":         "titulado",
    "titulada":         "titulado",
    "universitario":    "universitario",
    "postgrado":        "postgrado",
    "maestria":         "postgrado",
    "magister":         "postgrado",
    "doctorado":        "doctorado",
    "tecnico":          "tecnico",
    "instituto":        "instituto",
    "cursando":         "curso",

    // ── Idiomas ──
    "ingles":       "ingles",
    "english":      "ingles",
    "portugues":    "portugues",
    "frances":      "frances",
    "aleman":       "aleman",
    "mandarin":     "mandarin",
    "chino":        "mandarin",
    "italiano":     "italiano",
    "japones":      "japones",

    // ── Niveles de idioma ──
    "nativo":       "nativo",
    "avanzado":     "avanzado",
    "intermedio":   "intermedio",
    "basico":       "basico",

    // ── Skills técnicos ──
    // (Se mapean a sí mismos para pasar el filtro de longitud mínima
    //  y confirmar que no son stop words)
    "excel":            "excel",
    "python":           "python",
    "sql":              "sql",
    "javascript":       "javascript",
    "typescript":       "typescript",
    "react":            "react",
    "nodejs":           "nodejs",
    "tableau":          "tableau",
    "figma":            "figma",
    "photoshop":        "photoshop",
    "illustrator":      "illustrator",
    "aws":              "aws",
    "azure":            "azure",
    "gcp":              "gcp",
    "scrum":            "scrum",
    "agile":            "agile",
    "git":              "git",
    "java":             "java",
    "kotlin":           "kotlin",
    "swift":            "swift",
    "flutter":          "flutter",
    "django":           "django",
    "flask":            "flask",
    "mongodb":          "mongodb",
    "postgresql":       "postgresql",
    "mysql":            "mysql",
    "spark":            "spark",
    "hadoop":           "hadoop",
    "sap":              "sap",
    "salesforce":       "salesforce",
    "jira":             "jira",
    "confluence":       "confluence",

    // ── Experiencia ──
    "junior":       "junior",
    "senior":       "senior",
    "trainee":      "trainee",

    // ── Áreas BCP ──
    "tecnologia":   "tecnologia",
    "riesgos":      "riesgos",
    "operaciones":  "operaciones",
    "digital":      "digital",
    "datos":        "datos",
    "data":         "data",
    "analitica":    "analitica",
    "analytics":    "analytics",
    "innovacion":   "innovacion",
    "legal":        "legal",
    "auditoria":    "auditoria",
    "marketing":    "marketing",
    "cumplimiento": "cumplimiento",
    "banca":        "banca",
    "seguros":      "seguros",
    "creditos":     "creditos",

    // ── Carreras genéricas ──
    "antropologia":     "antropologia",
    "sistemas":         "sistemas",
    "software":         "software",
    "industrial":       "industrial",
    "administracion":   "administracion",
    "contabilidad":     "contabilidad",
    "economia":         "economia",
    "comunicacion":     "comunicacion",
    "comunicaciones":   "comunicacion",
    "psicologia":       "psicologia",
    "derecho":          "derecho",
    "finanzas":         "finanzas",
    "negocios":         "negocios",
    "estadistica":      "estadistica",
    "diseno":           "diseño",
    "gastronomia":      "gastronomia",
    "arquitectura":     "arquitectura",
    "medicina":         "medicina",
    "enfermeria":       "enfermeria",
    "marketing":        "marketing",
    "publicidad":       "publicidad",
    "relaciones":       "relaciones",
    "internacionales":  "internacionales",
    "sociologia":       "sociologia",
    "biologia":         "biologia",
    "quimica":          "quimica",
    "fisica":           "fisica",
    "matematica":       "matematica",
    "matematicas":      "matematica",
};

/* ══════════════════════════════════════════
   EXTRAER TOKENS
   Lógica: frases primero → luego palabras sueltas.
   Una palabra que esté en ALIAS_PALABRAS siempre
   se incluye; si no está, pasa si tiene ≥ 3 chars
   y NO es stop word.
══════════════════════════════════════════ */
const extraerTokens = (texto) => {
    if (!texto.trim()) return [];
    let t = norm(texto);
    const tokens = [];

    // 1) Detectar frases de 2+ palabras primero
    for (const [frase, alias] of ALIAS_FRASES) {
        const fraseNorm = norm(frase);
        if (t.includes(fraseNorm)) {
            tokens.push(alias);
            t = t.replace(fraseNorm, " ");
        }
    }

    // 2) Palabras sueltas restantes
    t.split(/\s+/).forEach((w) => {
        if (!w || w.length < 2) return;

        const aliased = ALIAS_PALABRAS[w];
        if (aliased) {
            // Está en alias → siempre incluir (aunque sea stop word genérica)
            tokens.push(aliased);
            return;
        }

        // No está en alias → filtrar stop words y exigir ≥ 3 chars
        if (STOP_WORDS.has(w)) return;
        if (w.length >= 3) tokens.push(w);
    });

    return [...new Set(tokens)];
};

/* ══════════════════════════════════════════
   CATALOGO
══════════════════════════════════════════ */
function Catalogo() {
    const navigate = useNavigate();

    const { user, rol, docId: liderDocId, favIds, setFavIds, cargando: cargandoRol } = useRol();
    const esLider = rol === "lider";

    const [perfiles, setPerfiles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filtros, setFiltros] = useState(FILTROS_INIT);
    const [panelAbierto, setPanelAbierto] = useState(false);
    const [perfilModal, setPerfilModal] = useState(null);
    const [loadingModal, setLoadingModal] = useState(false);

    // ── VOZ ──
    const [escuchando, setEscuchando] = useState(false);
    const reconocimientoRef = useRef(null);
    const silencioTimerRef = useRef(null);
    const transcFinalRef = useRef("");
    // ✅ FIX: usamos ref mutable para evitar stale closure en onend
    const activoRef = useRef(false);

    /* cargar perfiles */
    useEffect(() => {
        const cargar = async () => {
            try {
                const snap = await getDocs(collection(db, "practicantes"));
                setPerfiles(snap.docs.map((d) => ({
                    id: d.id, ...d.data(), completitud: calcCompletitud(d.data()),
                })));
            } catch (err) { console.error(err); }
            finally { setLoading(false); }
        };
        cargar();
    }, []);

    /* skills dinámicos */
    const skillsDisponibles = useMemo(() => {
        const set = new Set();
        perfiles.forEach((p) => (p.skills || []).forEach((s) => s && set.add(s.trim())));
        return [...set].sort();
    }, [perfiles]);

    /* ciudades dinámicas */
    const ciudadesDisponibles = useMemo(() => {
        const set = new Set();
        perfiles.forEach((p) => { if (p.ciudad) set.add(p.ciudad.trim()); });
        return [...set].sort();
    }, [perfiles]);

    /* FILTRADO */
    const filtrados = useMemo(() => {
        const tokens = extraerTokens(filtros.busqueda);
        return perfiles
            .filter((p) => {
                if (p.completitud < 70) return false;

                if (tokens.length > 0) {
                    const texto = buildTextoPerfil(p);
                    const todasPresentes = tokens.every((token) => texto.includes(token));
                    if (!todasPresentes) return false;
                }

                if (filtros.areas?.length > 0) {
                    const todasAreas = [p.area, ...(p.rotaciones || []).map((r) => r.area)].filter(Boolean);
                    if (!filtros.areas.some((a) => todasAreas.includes(a))) return false;
                }

                if (filtros.skills?.length > 0) {
                    const sp = [...(p.skills || []), ...(p.habilidadesBlandas || [])].map(norm);
                    if (!filtros.skills.some((s) => sp.includes(norm(s)))) return false;
                }

                if (filtros.idiomas?.length > 0) {
                    const ip = (p.idiomas || []).map((i) => norm(i.idioma || i));
                    if (!filtros.idiomas.some((i) => ip.includes(norm(i)))) return false;
                }

                if (filtros.nivelEducacion?.length > 0) {
                    const np = (p.educacion || []).map((e) => e.nivel);
                    if (!filtros.nivelEducacion.some((n) => np.includes(n))) return false;
                }

                if (filtros.ubicaciones?.length > 0) {
                    const ubic = norm([p.ciudad, p.distrito, p.pais].filter(Boolean).join(" "));
                    if (!filtros.ubicaciones.some((u) => ubic.includes(norm(u)))) return false;
                }

                if (filtros.rangosExp?.length > 0) {
                    const rango = rangoExp(calcMesesExp(p.experiencia)) || "Sin experiencia";
                    if (!filtros.rangosExp.includes(rango)) return false;
                }

                if (filtros.soloFavoritos && !favIds.includes(p.id)) return false;
                if (filtros.soloConProyectos && !(p.proyectos?.length > 0)) return false;

                return true;
            })
            .sort((a, b) => b.completitud - a.completitud);
    }, [perfiles, filtros, favIds]);

    /* modal */
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

    /* toggle favorito — solo líderes */
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

    /* ── VOZ ──────────────────────────────────────────────────
       ✅ FIX PRINCIPAL: activoRef evita el stale closure en onend.
       El evento onend se crea una sola vez y captura el ref,
       que siempre tiene el valor actualizado (true/false).
    ──────────────────────────────────────────────────────────── */
    const detenerVoz = useCallback(() => {
        clearTimeout(silencioTimerRef.current);
        activoRef.current = false;          // ✅ apagar flag antes de stop()
        try { reconocimientoRef.current?.stop(); } catch (_) { }
        reconocimientoRef.current = null;
        transcFinalRef.current = "";
        setEscuchando(false);
    }, []);

    const toggleVoz = useCallback(() => {
        const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SR) {
            alert("Tu navegador no soporta reconocimiento de voz. Usa Chrome o Edge.");
            return;
        }

        if (escuchando) { detenerVoz(); return; }

        transcFinalRef.current = "";
        setFiltros((prev) => ({ ...prev, busqueda: "" }));

        const iniciarRec = () => {
            const rec = new SR();
            rec.lang = "es-PE";
            rec.interimResults = true;
            rec.continuous = true;
            rec.maxAlternatives = 1;

            rec.onresult = (e) => {
                clearTimeout(silencioTimerRef.current);

                let interim = "";
                for (let i = e.resultIndex; i < e.results.length; i++) {
                    const t = e.results[i][0].transcript;
                    if (e.results[i].isFinal) {
                        transcFinalRef.current += t + " ";
                    } else {
                        interim += t;
                    }
                }

                const textoVivo = (transcFinalRef.current + interim).trim();
                setFiltros((prev) => ({ ...prev, busqueda: textoVivo }));

                // 2.5 s de silencio → detener
                silencioTimerRef.current = setTimeout(() => {
                    const textoFinal = transcFinalRef.current.trim() || textoVivo;
                    setFiltros((prev) => ({ ...prev, busqueda: textoFinal }));
                    detenerVoz();
                }, 2500);
            };

            rec.onerror = (e) => {
                if (e.error !== "no-speech") console.error("Voz error:", e.error);
                detenerVoz();
            };

            // ✅ FIX: usa activoRef.current en lugar de la variable 'escuchando'
            // que quedaría congelada en el closure con valor false.
            rec.onend = () => {
                if (activoRef.current && reconocimientoRef.current === rec) {
                    try { rec.start(); } catch (_) { }
                }
            };

            activoRef.current = true;       // ✅ marcar activo ANTES de start()
            reconocimientoRef.current = rec;
            rec.start();
        };

        iniciarRec();
        setEscuchando(true);
    }, [escuchando, detenerVoz]);

    /* limpiar al desmontar */
    useEffect(() => () => {
        clearTimeout(silencioTimerRef.current);
        activoRef.current = false;
        try { reconocimientoRef.current?.stop(); } catch (_) { }
    }, []);

    /* limpiar TODO */
    const limpiarTodo = useCallback(() => {
        detenerVoz();
        setFiltros(FILTROS_INIT);
    }, [detenerVoz]);

    const hayAlgoActivo =
        filtros.busqueda.trim() ||
        filtros.areas?.length > 0 ||
        filtros.skills?.length > 0 ||
        filtros.idiomas?.length > 0 ||
        filtros.nivelEducacion?.length > 0 ||
        filtros.generos?.length > 0 ||
        filtros.ubicaciones?.length > 0 ||
        filtros.rangosExp?.length > 0 ||
        filtros.soloFavoritos ||
        filtros.soloConProyectos;

    const cantFiltros =
        (filtros.areas?.length || 0) +
        (filtros.skills?.length || 0) +
        (filtros.idiomas?.length || 0) +
        (filtros.nivelEducacion?.length || 0) +
        (filtros.generos?.length || 0) +
        (filtros.ubicaciones?.length || 0) +
        (filtros.rangosExp?.length || 0) +
        (filtros.soloFavoritos ? 1 : 0) +
        (filtros.soloConProyectos ? 1 : 0);

    if (loading || cargandoRol) return (
        <div className="pantalla-carga"><div className="spinner-bcp" /><p>Cargando talento...</p></div>
    );

    return (
        <div className="cat-wrapper">

            {/* TOPBAR */}
            <div className="cat-topbar">
                <div className="cat-search-wrap">
                    <IoSearchOutline className="cat-search-icon" size={17} />
                    <input
                        className="cat-search"
                        placeholder={
                            escuchando
                                ? "Escuchando... habla con naturalidad"
                                : window.innerWidth < 768
                                    ? "Buscar por nombre, carrera, skills..."
                                    : "Buscar por nombre, rol, skills, universidad, área..."
                        }
                        value={filtros.busqueda}
                        onChange={(e) => setFiltros((prev) => ({ ...prev, busqueda: e.target.value }))}
                    />
                    {hayAlgoActivo && (
                        <button
                            className="cat-search-clear"
                            onClick={limpiarTodo}
                            title="Limpiar todo"
                        >
                            <FiX size={14} />
                        </button>
                    )}
                    <button
                        className={`cat-voz-btn ${escuchando ? "cat-voz-btn-on" : ""}`}
                        onClick={toggleVoz}
                        title={escuchando ? "Detener" : "Buscar por voz"}
                    >
                        {escuchando ? <FiMicOff size={15} /> : <FiMic size={15} />}
                    </button>
                </div>
                <button
                    className={`cat-btn-filtrar ${panelAbierto ? "cat-btn-filtrar-abierto" : ""} ${cantFiltros > 0 ? "cat-btn-filtrar-on" : ""}`}
                    onClick={() => setPanelAbierto((v) => !v)}
                >
                    <FiSliders size={15} />
                    {cantFiltros > 0 && (
                        <span className="cat-filtro-count">{cantFiltros}</span>
                    )}
                </button>
            </div>

            {/* BODY */}
            <div className="cat-body">
                <Filtros
                    filtros={filtros}
                    onChange={setFiltros}
                    skillsDisponibles={skillsDisponibles}
                    ciudadesDisponibles={ciudadesDisponibles}
                    esLider={esLider}
                    abierto={panelAbierto}
                    onCerrar={() => setPanelAbierto(false)}
                />

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
                            <IoSearchOutline size={48} color="#ccc" />
                            <h5>Sin resultados</h5>
                            <p>Intenta con otros filtros o palabras clave</p>
                            <button className="cat-btn-limpiar" onClick={() => setFiltros(FILTROS_INIT)}>
                                Limpiar filtros
                            </button>
                        </div>
                    )}
                </div>
            </div>

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

/* ── TARJETA ── */
function TarjetaPracticante({ perfil, esFav, esLider, onToggleFav, onVerPerfil }) {
    const ubicacion = [perfil.ciudad, perfil.pais].filter(Boolean).join(", ") || perfil.distrito || null;
    const nivelEdu = perfil.educacion?.[0]
        ? `${perfil.educacion[0].institucion}${perfil.educacion[0].nivel ? " · " + perfil.educacion[0].nivel : ""}`
        : null;
    const meses = calcMesesExp(perfil.experiencia);
    const rango = rangoExp(meses);
    const tecnicas = (perfil.skills || []).slice(0, 4);
    const blandas = (perfil.habilidadesBlandas || []).slice(0, 2);
    const areasAnteriores = (perfil.rotaciones || []).map((r) => r.area).filter((a) => a && a !== perfil.area);
    const compColor = perfil.completitud >= 80 ? "#16a34a" : perfil.completitud >= 60 ? "#d97706" : "#dc2626";

    return (
        <div className="tc-card" onClick={onVerPerfil}>
            <div className="tc-comp-bar">
                <div className="tc-comp-fill" style={{ width: `${perfil.completitud}%`, background: compColor }} />
            </div>

            {esLider && (
                <button
                    className={`tc-fav ${esFav ? "tc-fav-on" : ""}`}
                    onClick={(e) => { e.stopPropagation(); onToggleFav(e); }}
                    title={esFav ? "Quitar favorito" : "Guardar favorito"}
                >
                    <FiStar size={14} />
                </button>
            )}

            <div className="tc-header">
                <div className="tc-avatar">
                    {perfil.foto
                        ? <img src={perfil.foto} alt={perfil.nombre} />
                        : <span>{perfil.nombre?.charAt(0)?.toUpperCase()}</span>
                    }
                </div>
                <div className="tc-info">
                    <div className="tc-nombre-row">
                        <h5 className="tc-nombre">{perfil.nombre}</h5>
                        {esLider && <IdChip id={perfil.id} clase="tc-id" />}
                    </div>
                    <p className="tc-titulo">{perfil.titulo || "Sin título"}</p>
                    {ubicacion && <p className="tc-meta"><FiMapPin size={11} /> {ubicacion}</p>}
                    {nivelEdu && <p className="tc-meta"><MdSchool size={12} /> {nivelEdu}</p>}
                    {rango && <p className="tc-meta tc-exp"><HiOutlineBriefcase size={12} /> {rango} de exp.</p>}
                </div>
            </div>

            {perfil.area && (
                <div className="tc-areas">
                    <span className="tc-area-chip tc-area-actual">{perfil.area}</span>
                    {areasAnteriores.slice(0, 1).map((a, i) => (
                        <span key={i} className="tc-area-chip tc-area-anterior">{a}</span>
                    ))}
                    {areasAnteriores.length > 1 && <span className="tc-area-mas">+{areasAnteriores.length - 1}</span>}
                </div>
            )}

            {tecnicas.length > 0 && (
                <div className="tc-tags-row">
                    <MdBolt size={12} className="tc-tags-icon" />
                    <div className="tc-tags">
                        {tecnicas.map((s, i) => <span key={i} className="tc-tag tc-tag-tec">{s.trim()}</span>)}
                        {(perfil.skills || []).length > 4 && <span className="tc-tag-mas">+{perfil.skills.length - 4}</span>}
                    </div>
                </div>
            )}

            {blandas.length > 0 && (
                <div className="tc-tags-row">
                    <RiTeamLine size={12} className="tc-tags-icon" style={{ color: "#5c7d3e" }} />
                    <div className="tc-tags">
                        {blandas.map((s, i) => <span key={i} className="tc-tag tc-tag-bla">{s.trim()}</span>)}
                    </div>
                </div>
            )}

            <div className="tc-footer">
                <span className="tc-comp-label" style={{ color: compColor }}>{perfil.completitud}% completado</span>
                <span className="tc-ver-link">Ver perfil →</span>
            </div>
        </div>
    );
}

/* ── MODAL PERFIL RÁPIDO ── */
function ModalPerfil({ perfil, cargando, esFav, esLider, onToggleFav, onCerrar, onVerCompleto }) {
    useEffect(() => {
        document.body.style.overflow = "hidden";
        return () => { document.body.style.overflow = ""; };
    }, []);

    const ubicacion = [perfil.ciudad, perfil.pais].filter(Boolean).join(", ") || perfil.distrito || null;
    const meses = calcMesesExp(perfil.experiencia);
    const rango = rangoExp(meses);
    const areasAnteriores = (perfil.rotaciones || []).filter((r) => r.area && r.area !== perfil.area);

    return (
        <div className="mp-overlay" onClick={onCerrar}>
            <div className="mp-caja" onClick={(e) => e.stopPropagation()}>

                <button className="mp-close-btn" onClick={onCerrar}><FiX size={18} /></button>

                {cargando ? (
                    <div className="mp-loading"><div className="spinner-bcp" /></div>
                ) : (
                    <>
                        <div className="mp-header">
                            <div className="mp-banner" />
                            <div className="mp-avatar-wrap">
                                <div className="mp-avatar">
                                    {perfil.foto
                                        ? <img src={perfil.foto} alt={perfil.nombre} />
                                        : <span>{perfil.nombre?.charAt(0)?.toUpperCase()}</span>
                                    }
                                </div>
                            </div>
                            <div className="mp-header-info">
                                <div className="mp-nombre-row">
                                    <h3 className="mp-nombre">{perfil.nombre} {perfil.apellidos}</h3>
                                    {esLider && <IdChip id={perfil.id} clase="mp-id" />}
                                    {esLider && (
                                        <button className={`mp-fav-btn ${esFav ? "mp-fav-on" : ""}`} onClick={onToggleFav}>
                                            <FiStar size={13} style={{ marginRight: 4 }} />
                                            {esFav ? "Guardado" : "Guardar"}
                                        </button>
                                    )}
                                </div>
                                <p className="mp-titulo">{perfil.titulo || "Sin título"}</p>
                                {ubicacion && <p className="mp-ubic"><FiMapPin size={12} style={{ marginRight: 4 }} />{ubicacion}</p>}
                                {rango && <p className="mp-rango-exp"><HiOutlineBriefcase size={13} style={{ marginRight: 4 }} />{rango} de experiencia total</p>}
                                <div className="mp-areas">
                                    {perfil.area && <span className="tc-area-chip tc-area-actual">{perfil.area}</span>}
                                    {areasAnteriores.map((r, i) => (
                                        <span key={i} className="tc-area-chip tc-area-anterior"
                                            title={`${r.desdeM} ${r.desdeA} – ${r.actualmente ? "Actualidad" : `${r.hastaM} ${r.hastaA}`}`}>
                                            {r.area}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="mp-body">
                            <div className="mp-col-izq">
                                <MpSeccion titulo="Contacto">
                                    {ubicacion && <MpDato Icon={FiMapPin} val={ubicacion} />}
                                    {perfil.telefono && <MpDato Icon={FiPhone} val={perfil.telefono} />}
                                    {esLider && perfil.email && <MpDato Icon={FiMail} val={perfil.email} />}
                                    {perfil.linkedin && (
                                        <a href={perfil.linkedin} target="_blank" rel="noopener noreferrer" className="mp-link">
                                            <FaLinkedin size={13} /> LinkedIn
                                        </a>
                                    )}
                                    {perfil.github && (
                                        <a href={perfil.github} target="_blank" rel="noopener noreferrer" className="mp-link">
                                            <FaGithub size={13} /> GitHub
                                        </a>
                                    )}
                                </MpSeccion>

                                {areasAnteriores.length > 0 && (
                                    <MpSeccion titulo="Historial BCP">
                                        {areasAnteriores.map((r, i) => (
                                            <div key={i} className="mp-item">
                                                <p className="mp-item-t" style={{ color: "#003DA5" }}>{r.area}</p>
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
                                                {e.nivel && <span className="mp-edu-nivel">{e.nivel}</span>}
                                                <p className="mp-item-d">
                                                    {e.actualmente
                                                        ? `${e.desdeM} ${e.desdeA} — Actualidad`
                                                        : `${e.desdeM || ""} ${e.desdeA || ""}${e.hastaA ? ` — ${e.hastaM} ${e.hastaA}` : ""}`}
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

                                {esLider && perfil.documentos?.length > 0 && (
                                    <MpSeccion titulo="Documentos">
                                        {perfil.documentos.map((d, i) => (
                                            <a key={i} href={d.url} target="_blank" rel="noopener noreferrer" className="mp-link" style={{ display: "block", marginBottom: 4 }}>
                                                📎 {d.nombre}
                                            </a>
                                        ))}
                                    </MpSeccion>
                                )}

                                {perfil.movilidad && (
                                    <MpSeccion titulo="Disponibilidad">
                                        <div className="mp-movilidad">
                                            <span className={`mp-mov ${perfil.movilidad.viajar ? "mp-mov-si" : "mp-mov-no"}`}>{perfil.movilidad.viajar ? "✓" : "✗"} Viajar</span>
                                            <span className={`mp-mov ${perfil.movilidad.reubicacion ? "mp-mov-si" : "mp-mov-no"}`}>{perfil.movilidad.reubicacion ? "✓" : "✗"} Reubicación</span>
                                            <span className={`mp-mov ${perfil.movilidad.vehiculo ? "mp-mov-si" : "mp-mov-no"}`}>{perfil.movilidad.vehiculo ? "✓" : "✗"} Vehículo</span>
                                        </div>
                                    </MpSeccion>
                                )}
                            </div>

                            <div className="mp-col-der">
                                {perfil.resumen && (
                                    <MpSeccion titulo="Perfil Profesional">
                                        <p className="mp-resumen">{perfil.resumen}</p>
                                        {perfil.intereses && <p className="mp-intereses"><strong>Intereses:</strong> {perfil.intereses}</p>}
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
                                                <p className="mp-skills-cat mp-skills-bla" style={{ marginTop: 8 }}>Blandas</p>
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
                                                        <FiExternalLink size={11} /> Ver proyecto
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
                                                {c.tipo === "Certificado" ? <BsTrophy size={14} /> : <MdMenuBook size={14} />}
                                                <div>
                                                    <p className="mp-item-t">{c.nombre}</p>
                                                    {c.institucion && <p className="mp-item-s">{c.institucion}{c.anio ? ` · ${c.anio}` : ""}</p>}
                                                </div>
                                            </div>
                                        ))}
                                    </MpSeccion>
                                )}

                                <div className="mp-confidencial">
                                    <AiOutlineSafety size={13} style={{ marginRight: 5 }} />
                                    Uso exclusivo para gestión interna del BCP
                                </div>
                            </div>
                        </div>

                        <div className="mp-footer">
                            <button className="mp-btn-volver-footer" onClick={onCerrar}>
                                <FiArrowLeft size={14} style={{ marginRight: 5 }} />Volver
                            </button>
                            {esLider && perfil.email && (
                                <a href={`mailto:${perfil.email}?subject=Oportunidad BCP`} className="mp-btn-contactar">
                                    <FiMail size={13} style={{ marginRight: 5 }} />Contactar
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
    return <div className="mp-seccion"><h6 className="mp-seccion-t">{titulo}</h6>{children}</div>;
}
function MpDato({ Icon, val }) {
    return (
        <p className="mp-dato">
            <Icon size={13} style={{ flexShrink: 0, color: "#003DA5" }} />
            <span>{val}</span>
        </p>
    );
}

export default Catalogo;
