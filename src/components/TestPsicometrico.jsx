import { useState, useEffect } from "react";
import { FiX, FiCheck, FiArrowRight, FiArrowLeft, FiAward } from "react-icons/fi";
import "../stylesheets/TestPsicometrico.css";

/* ═══════════════════════════════════════════
   Banco de preguntas (12) — 3 por dimensión MBTI
   dim: EI, SN, TF, JP
   dir: +1 suma al segundo polo, -1 al primero
        EI: -1 = Introvertido, +1 = Extrovertido
        SN: -1 = Intuición,    +1 = Sensible
        TF: -1 = Sentimental,  +1 = Pensante
        JP: -1 = Juzgador,     +1 = Perceptivo
═══════════════════════════════════════════ */
const PREGUNTAS = [
    { id: 1, dim: "EI", dir: +1, texto: "Me siento cómodo iniciando conversaciones con personas que no conozco." },
    { id: 2, dim: "EI", dir: -1, texto: "Prefiero trabajar en silencio y de forma individual antes que en reuniones grupales." },
    { id: 3, dim: "EI", dir: +1, texto: "Disfruto exponer mis ideas frente a un grupo." },

    { id: 4, dim: "SN", dir: +1, texto: "Me enfoco en los hechos concretos más que en las posibilidades futuras." },
    { id: 5, dim: "SN", dir: -1, texto: "Me atraen las ideas abstractas y los conceptos teóricos." },
    { id: 6, dim: "SN", dir: +1, texto: "Confío más en los datos observables que en la intuición." },

    { id: 7, dim: "TF", dir: +1, texto: "Tomo decisiones basándome en lógica y análisis antes que en emociones." },
    { id: 8, dim: "TF", dir: -1, texto: "Considero mucho cómo mis decisiones afectan a las personas del equipo." },
    { id: 9, dim: "TF", dir: +1, texto: "Prefiero la crítica objetiva aunque resulte incómoda." },

    { id: 10, dim: "JP", dir: -1, texto: "Planifico mis tareas con anticipación y sigo una estructura clara." },
    { id: 11, dim: "JP", dir: +1, texto: "Me adapto con facilidad a cambios de planes de último momento." },
    { id: 12, dim: "JP", dir: +1, texto: "Prefiero mantener opciones abiertas antes que comprometerme rápido a una decisión." },
];

const OPCIONES = [
    { v: 1, t: "Totalmente en desacuerdo" },
    { v: 2, t: "En desacuerdo" },
    { v: 3, t: "Neutral" },
    { v: 4, t: "De acuerdo" },
    { v: 5, t: "Totalmente de acuerdo" },
];

/* Calcula porcentajes por eje a partir de respuestas (1-5) */
export function calcularResultados(respuestas) {
    const ejes = { EI: [], SN: [], TF: [], JP: [] };
    PREGUNTAS.forEach((p) => {
        const r = respuestas[p.id];
        if (!r) return;
        const norm = ((r - 3) / 2) * p.dir; // -1..+1
        ejes[p.dim].push(norm);
    });
    const pctPolo2 = (arr) => {
        if (!arr.length) return 50;
        const avg = arr.reduce((a, b) => a + b, 0) / arr.length;
        return Math.round(((avg + 1) / 2) * 100);
    };

    const extrovertido = pctPolo2(ejes.EI);
    const sensible = pctPolo2(ejes.SN);
    const pensante = pctPolo2(ejes.TF);
    const perceptivo = pctPolo2(ejes.JP);

    const introvertido = 100 - extrovertido;
    const intuicion = 100 - sensible;
    const sentimental = 100 - pensante;
    const juzgador = 100 - perceptivo;

    /* Habilidades derivadas (0-100) */
    const comunicacion = Math.round((extrovertido * 0.6 + sentimental * 0.4));
    const resolucion = Math.round((pensante * 0.5 + intuicion * 0.5));
    const trabajoEquipo = Math.round((sentimental * 0.55 + extrovertido * 0.45));
    const analitico = Math.round((pensante * 0.55 + sensible * 0.45));

    return {
        ejes: {
            perceptivo, juzgador,
            sentimental, pensante,
            intuicion, sensible,
            introvertido, extrovertido,
        },
        habilidades: {
            comunicacion,
            resolucion,
            trabajoEquipo,
            analitico,
        },
        completadoEn: new Date().toISOString(),
    };
}

/* ══ MODAL PRINCIPAL ══ */
export default function TestPsicometrico({ abierto, onCerrar, resultadoPrevio, onGuardar }) {
    const [fase, setFase] = useState("intro"); // intro | preguntas | resultados
    const [idx, setIdx] = useState(0);
    const [respuestas, setRespuestas] = useState({});
    const [resultado, setResultado] = useState(null);
    const [guardando, setGuardando] = useState(false);

    useEffect(() => {
        if (abierto) {
            if (resultadoPrevio) {
                setResultado(resultadoPrevio);
                setFase("resultados");
            } else {
                setFase("intro");
                setIdx(0);
                setRespuestas({});
                setResultado(null);
            }
        }
    }, [abierto, resultadoPrevio]);

    if (!abierto) return null;

    const totalP = PREGUNTAS.length;
    const respondidas = Object.keys(respuestas).length;
    const progreso = fase === "preguntas" ? (respondidas / totalP) * 100 : 0;

    const responder = (val) => {
        const p = PREGUNTAS[idx];
        const nuevas = { ...respuestas, [p.id]: val };
        setRespuestas(nuevas);
        if (idx < totalP - 1) {
            setTimeout(() => setIdx(idx + 1), 180);
        } else {
            const res = calcularResultados(nuevas);
            setResultado(res);
            setTimeout(() => setFase("resultados"), 200);
        }
    };

    const finalizarYGuardar = async () => {
        if (!resultado) return;
        setGuardando(true);
        try {
            await onGuardar?.(resultado);
            onCerrar?.();
        } finally {
            setGuardando(false);
        }
    };

    const reintentar = () => {
        setFase("intro");
        setIdx(0);
        setRespuestas({});
        setResultado(null);
    };

    return (
        <div className="psi-overlay" onClick={onCerrar}>
            <div className="psi-modal" onClick={(e) => e.stopPropagation()}>
                {/* HEADER */}
                <div className="psi-header">
                    <div className="psi-header-icon"><FiAward size={16} /></div>
                    <h3 className="psi-header-title">Conoce tu estilo de trabajo</h3>
                    <button className="psi-close" onClick={onCerrar} aria-label="Cerrar">
                        <FiX size={18} />
                    </button>
                </div>

                {/* CONTENT */}
                <div className="psi-body">
                    {fase === "intro" && (
                        <div className="psi-intro">
                            <h4 className="psi-intro-titulo">Descubre cómo trabajas mejor</h4>
                            <p className="psi-intro-texto">
                                Esta es una herramienta de autoconocimiento pensada para ti.
                                Te ayudará a explorar tu estilo de comunicación, análisis,
                                resolución de problemas y trabajo en equipo. Responde con
                                sinceridad — no hay respuestas correctas ni incorrectas.
                            </p>
                            <div className="psi-intro-aviso">
                                Este test es solo informativo y te ayudará a conocer tu estilo
                                de trabajo. No es una evaluación ni afecta tu postulación.
                            </div>
                            <ul className="psi-intro-lista">
                                <li>12 preguntas breves, toma menos de 3 minutos</li>
                                <li>Tus respuestas son privadas y solo las ves tú</li>
                                <li>No se guardan en ningún sistema del BCP</li>
                                <li>Puedes volver a tomarlo cuando quieras</li>
                            </ul>
                            <button className="psi-btn-primary" onClick={() => setFase("preguntas")}>
                                Empezar <FiArrowRight size={16} />
                            </button>
                        </div>
                    )}

                    {fase === "preguntas" && (
                        <div className="psi-preguntas">
                            <div className="psi-pregunta-num">
                                Pregunta {idx + 1} de {totalP}
                            </div>
                            <p className="psi-pregunta-texto">{PREGUNTAS[idx].texto}</p>

                            <div className="psi-opciones">
                                {OPCIONES.map((op) => {
                                    const activa = respuestas[PREGUNTAS[idx].id] === op.v;
                                    return (
                                        <button
                                            key={op.v}
                                            className={`psi-opcion ${activa ? "psi-opcion-activa" : ""}`}
                                            onClick={() => responder(op.v)}
                                        >
                                            <span className="psi-opcion-num">{op.v}</span>
                                            <span className="psi-opcion-texto">{op.t}</span>
                                            {activa && <FiCheck size={16} className="psi-opcion-check" />}
                                        </button>
                                    );
                                })}
                            </div>

                            <div className="psi-nav">
                                <button
                                    className="psi-btn-ghost"
                                    onClick={() => setIdx((v) => Math.max(0, v - 1))}
                                    disabled={idx === 0}
                                >
                                    <FiArrowLeft size={14} /> Anterior
                                </button>
                                <button
                                    className="psi-btn-ghost"
                                    onClick={() => setIdx((v) => Math.min(totalP - 1, v + 1))}
                                    disabled={!respuestas[PREGUNTAS[idx].id] || idx === totalP - 1}
                                >
                                    Siguiente <FiArrowRight size={14} />
                                </button>
                            </div>
                        </div>
                    )}

                    {fase === "resultados" && resultado && (
                        <ResultadosView resultado={resultado} />
                    )}
                </div>

                {/* FOOTER */}
                <div className="psi-footer">
                    {fase !== "resultados" && (
                        <>
                            <div className="psi-progress-txt">
                                {respondidas} de {totalP} respondidas
                            </div>
                            <div className="psi-progress-track">
                                <div className="psi-progress-fill" style={{ width: `${progreso}%` }} />
                            </div>
                        </>
                    )}
                    {fase === "resultados" && (
                        <div className="psi-footer-actions">
                            {!resultadoPrevio && (
                                <button className="psi-btn-ghost" onClick={reintentar} disabled={guardando}>
                                    Volver a tomar
                                </button>
                            )}
                            <button
                                className="psi-btn-primary"
                                onClick={finalizarYGuardar}
                                disabled={guardando}
                            >
                                {guardando ? "Guardando..." : (
                                    <>{resultadoPrevio ? "Cerrar" : "Guardar resultados"} <FiCheck size={16} /></>
                                )}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

/* ══ VISUALIZACIÓN DE RESULTADOS ══ */
export function ResultadosView({ resultado }) {
    const { ejes, habilidades } = resultado;

    const pares = [
        { izq: "Perceptivo", der: "Juzgador", valDer: ejes.juzgador, valIzq: ejes.perceptivo },
        { izq: "Sentimental", der: "Pensante", valDer: ejes.pensante, valIzq: ejes.sentimental },
        { izq: "Intuición", der: "Sensible", valDer: ejes.sensible, valIzq: ejes.intuicion },
        { izq: "Introvertido", der: "Extrovertido", valDer: ejes.extrovertido, valIzq: ejes.introvertido },
    ];

    const habs = [
        { label: "Comunicación", v: habilidades.comunicacion },
        { label: "Resolución de problemas", v: habilidades.resolucion },
        { label: "Trabajo en equipo", v: habilidades.trabajoEquipo },
        { label: "Perfil analítico", v: habilidades.analitico },
    ];

    return (
        <div className="psi-resultados">
            <h4 className="psi-res-titulo">Tu estilo de trabajo</h4>
            <p className="psi-res-sub">
                Explora tu balance en cuatro dimensiones profesionales clave.
            </p>
            <div className="psi-intro-aviso" style={{ marginBottom: 14 }}>
                Recuerda: este resultado es solo para ti. Es informativo y no afecta tu postulación.
            </div>

            <div className="psi-ejes">
                {pares.map((p, i) => {
                    const dominante = p.valDer >= 50 ? p.der : p.izq;
                    const valDom = Math.max(p.valDer, p.valIzq);
                    return (
                        <div className="psi-eje" key={i}>
                            <div className="psi-eje-labels">
                                <span className={p.valIzq > p.valDer ? "psi-eje-lab-fuerte" : ""}>{p.izq}</span>
                                <span className={p.valDer >= p.valIzq ? "psi-eje-lab-fuerte" : ""}>{p.der}</span>
                            </div>
                            <div className="psi-eje-track">
                                <div className="psi-eje-fill" style={{ width: `${p.valDer}%` }} />
                                <div className="psi-eje-pin" style={{ left: `${p.valDer}%` }} />
                            </div>
                            <div className="psi-eje-dom">
                                <strong>{valDom}%</strong> {dominante}
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="psi-habilidades">
                <h5 className="psi-hab-titulo">Habilidades derivadas</h5>
                {habs.map((h, i) => (
                    <div className="psi-hab" key={i}>
                        <div className="psi-hab-top">
                            <span className="psi-hab-lab">{h.label}</span>
                            <span className="psi-hab-val">{h.v}%</span>
                        </div>
                        <div className="psi-hab-track">
                            <div className="psi-hab-fill" style={{ width: `${h.v}%` }} />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}