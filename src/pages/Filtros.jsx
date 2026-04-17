import { useState, useRef, useEffect } from "react";
import { FiSearch, FiChevronDown, FiX } from "react-icons/fi";
import { IoFilterOutline } from "react-icons/io5";

/* ════════════════════════════════════════════════
   CONSTANTES — todas las listas están normalizadas
   en Title Case para evitar duplicados por mayúsculas
════════════════════════════════════════════════ */
export const AREAS_BCP = [
  "Analítica & Tecnología",
  "Finanzas & Control",
  "Gestión & Operaciones",
  "Comunicación & Relación",
  "Riesgos & Cumplimiento",
  "Marketing & Experiencia Cliente",
];

export const NIVELES_EDU = [
  "Técnico",
  "Universitario (en curso)",
  "Universitario (egresado)",
  "Postgrado",
  "Maestría",
  "Doctorado",
];

/* Idiomas en orden ALFABÉTICO */
export const IDIOMAS_OPC = [
  "Alemán","Árabe","Aymara","Catalán","Chino (Mandarín)",
  "Coreano","Danés","Español","Finés","Francés",
  "Griego","Hebreo","Hindi","Indonesio","Inglés",
  "Italiano","Japonés","Malayo","Neerlandés","Noruego",
  "Polaco","Portugués","Quechua","Ruso","Sueco",
  "Tailandés","Turco","Ucraniano","Vietnamita",
];

/* Ubicaciones en orden ALFABÉTICO */
export const UBICACIONES = [
  "Arequipa","Ate","Barranco","Callao","Chiclayo",
  "Chorrillos","Cusco","El Agustino","Huancayo","Independencia",
  "Iquitos","Jesús María","La Molina","Lima","Lince",
  "Los Olivos","Magdalena","Miraflores","Piura","Pueblo Libre",
  "San Borja","San Isidro","San Martín de Porres","San Miguel",
  "Santa Anita","Surco","Trujillo","Villa El Salvador",
].sort();

export const RANGOS_EXP = [
  "Sin experiencia","1–3 meses","4–6 meses","6–12 meses","+12 meses",
];

/* ── helper ── */
const toggle = (arr, val) =>
  arr.includes(val) ? arr.filter((v) => v !== val) : [...arr, val];

/* ════════════════════════════════════════════════
   FILTROS_INIT — exportado para usarlo en Catalogo
════════════════════════════════════════════════ */
export const FILTROS_INIT = {
  busqueda:         "",
  areas:            [],   // busca en área actual Y en rotaciones anteriores
  skills:           [],
  idiomas:          [],
  nivelEducacion:   [],
  ubicaciones:      [],
  rangosExp:        [],
  soloFavoritos:    false,
  soloConProyectos: false,
};

/* ════════════════════════════════════════════════
   SUBCOMPONENTES INTERNOS
════════════════════════════════════════════════ */

/* Chip seleccionable */
function Chip({ label, activo, onClick }) {
  return (
    <button
      type="button"
      className={`fg-chip ${activo ? "fg-chip-activo" : ""}`}
      onClick={onClick}
    >
      {label}
    </button>
  );
}

/* Toggle switch */
function ToggleRow({ label, activo, onChange }) {
  return (
    <div className="fg-toggle-row" onClick={onChange}>
      <span className="fg-toggle-label">{label}</span>
      <div className={`fg-toggle ${activo ? "fg-toggle-on" : ""}`}>
        <div className="fg-toggle-bola" />
      </div>
    </div>
  );
}

/* Grupo colapsable genérico */
function Grupo({ titulo, badge = 0, inicialAbierto = false, children }) {
  const [abierto, setAbierto] = useState(inicialAbierto);
  return (
    <div className="fg-grupo">
      <button
        className="fg-cabecera"
        onClick={() => setAbierto((v) => !v)}
        type="button"
      >
        <span className="fg-cabecera-izq">
          <span className="fg-titulo">{titulo}</span>
          {badge > 0 && <span className="fg-badge-mini">{badge}</span>}
        </span>
        <FiChevronDown
          size={14}
          className={`fg-chevron-icon ${abierto ? "fg-chevron-icon-open" : ""}`}
        />
      </button>
      {abierto && <div className="fg-body">{children}</div>}
    </div>
  );
}

/* ── Dropdown alfabético con búsqueda + checkboxes ── */
function AlphaDropdown({ titulo, opciones, seleccionadas, onChange }) {
  const [abierto,  setAbierto]  = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const ref = useRef(null);

  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setAbierto(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const filtradas = opciones.filter((o) =>
    o.toLowerCase().includes(busqueda.toLowerCase())
  );

  /* agrupar por primera letra */
  const porLetra = filtradas.reduce((acc, o) => {
    const l = o[0].toUpperCase();
    if (!acc[l]) acc[l] = [];
    acc[l].push(o);
    return acc;
  }, {});

  const tgl = (v) => onChange(toggle(seleccionadas, v));
  const count = seleccionadas.length;

  return (
    <div className="alpha-dd" ref={ref}>
      {/* Trigger */}
      <button
        type="button"
        className={`alpha-trigger ${abierto ? "alpha-trigger-open" : ""} ${count > 0 ? "alpha-trigger-activo" : ""}`}
        onClick={() => setAbierto((v) => !v)}
      >
        <span>
          {count === 0
            ? `Seleccionar ${titulo.toLowerCase()}...`
            : count === 1
            ? seleccionadas[0]
            : `${count} ${titulo.toLowerCase()} seleccionados`}
        </span>
        <FiChevronDown
          size={13}
          className={`alpha-chevron ${abierto ? "alpha-chevron-open" : ""}`}
        />
      </button>

      {/* Panel */}
      {abierto && (
        <div className="alpha-panel">
          {/* Buscador */}
          <div className="alpha-search-wrap">
            <FiSearch size={13} color="#94a3b8"/>
            <input
              className="alpha-search"
              placeholder={`Buscar ${titulo.toLowerCase()}...`}
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              autoFocus
            />
            {busqueda && (
              <button className="alpha-clear-btn" onClick={() => setBusqueda("")}>
                <FiX size={12}/>
              </button>
            )}
          </div>

          {/* Lista */}
          <div className="alpha-list">
            {Object.entries(porLetra).map(([letra, items]) => (
              <div key={letra}>
                <div className="alpha-letra">{letra}</div>
                {items.map((o) => (
                  <label key={o} className="alpha-item">
                    <input
                      type="checkbox"
                      checked={seleccionadas.includes(o)}
                      onChange={() => tgl(o)}
                    />
                    <span>{o}</span>
                  </label>
                ))}
              </div>
            ))}
            {filtradas.length === 0 && (
              <p className="alpha-empty">Sin resultados</p>
            )}
          </div>

          {/* Chips seleccionados al pie */}
          {seleccionadas.length > 0 && (
            <div className="alpha-seleccionados">
              {seleccionadas.map((o) => (
                <span key={o} className="alpha-chip-sel" onClick={() => tgl(o)}>
                  {o} <FiX size={10}/>
                </span>
              ))}
              <button
                className="alpha-clear-all"
                onClick={() => onChange([])}
              >
                Limpiar
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════
   FILTROS — componente principal

   Props:
     filtros           → objeto de estado actual
     onChange          → fn(nuevosFiltros)
     skillsDisponibles → string[] dinámicos desde Firebase
     esLider           → bool
     abierto           → bool (mobile drawer)
     onCerrar          → fn()
════════════════════════════════════════════════ */
function Filtros({
  filtros,
  onChange,
  skillsDisponibles = [],
  esLider = false,
  abierto = false,
  onCerrar,
}) {
  const [busqSkill, setBusqSkill] = useState("");

  const upd = (campo, valor) => onChange({ ...filtros, [campo]: valor });
  const tgl = (campo, val)   => onChange({ ...filtros, [campo]: toggle(filtros[campo] || [], val) });

  /* contadores */
  const total =
    (filtros.areas?.length          || 0) +
    (filtros.skills?.length         || 0) +
    (filtros.idiomas?.length        || 0) +
    (filtros.nivelEducacion?.length || 0) +
    (filtros.ubicaciones?.length    || 0) +
    (filtros.rangosExp?.length      || 0) +
    (filtros.soloFavoritos       ? 1 : 0) +
    (filtros.soloConProyectos    ? 1 : 0);

  const limpiar = () => onChange({ ...FILTROS_INIT, busqueda: filtros.busqueda });

  const skillsFiltrados = [...skillsDisponibles]
    .sort()
    .filter((s) => s.toLowerCase().includes(busqSkill.toLowerCase()));

  return (
    <>
      {/* overlay mobile */}
      {abierto && <div className="filtros-overlay" onClick={onCerrar} />}

      <aside className={`filtros-panel ${abierto ? "filtros-panel-open" : ""}`}>

        {/* ── HEADER ── */}
        <div className="filtros-header">
          <div className="filtros-header-left">
            <IoFilterOutline size={15} color="#003DA5"/>
            <span className="filtros-header-titulo">Filtros</span>
            {total > 0 && <span className="filtros-badge">{total}</span>}
          </div>
          <div className="filtros-header-right">
            {total > 0 && (
              <button className="filtros-limpiar-btn" onClick={limpiar}>
                Limpiar todo
              </button>
            )}
          </div>
        </div>

        <div className="filtros-scroll">

          {/* ── FAVORITOS (solo líderes) ── */}
          {esLider && (
            <div className="fg-grupo">
              <div className="fg-cabecera fg-cabecera-flat">
                <span className="fg-cabecera-izq">
                  <span className="fg-titulo">Talentos favoritos</span>
                </span>
                <input
                  type="checkbox"
                  className="fg-checkbox"
                  checked={!!filtros.soloFavoritos}
                  onChange={() => upd("soloFavoritos", !filtros.soloFavoritos)}
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            </div>
          )}

          {/* ── SKILLS / TAGS ── */}
          <Grupo
            titulo="Skills / Tags"
            badge={filtros.skills?.length || 0}
            inicialAbierto
          >
            <p className="fg-hint">Tecnologías y herramientas — selección múltiple</p>
            <div className="fg-search-wrap">
              <FiSearch size={13} color="#94a3b8"/>
              <input
                className="fg-search-input"
                placeholder="Buscar skill..."
                value={busqSkill}
                onChange={(e) => setBusqSkill(e.target.value)}
              />
              {busqSkill && (
                <button className="fg-search-clear" onClick={() => setBusqSkill("")}>
                  <FiX size={12}/>
                </button>
              )}
            </div>
            {skillsFiltrados.length > 0 ? (
              <div className="fg-chips-wrap">
                {skillsFiltrados.slice(0, 50).map((s) => (
                  <Chip
                    key={s}
                    label={s}
                    activo={(filtros.skills || []).includes(s)}
                    onClick={() => tgl("skills", s)}
                  />
                ))}
                {skillsFiltrados.length > 50 && (
                  <span className="fg-mas">+{skillsFiltrados.length - 50} más</span>
                )}
              </div>
            ) : (
              <p className="fg-empty">
                {skillsDisponibles.length === 0 ? "Cargando skills..." : "Sin coincidencias"}
              </p>
            )}
          </Grupo>

          {/* ── UBICACIÓN — dropdown alfabético ── */}
          <Grupo
            titulo="Ubicación"
            badge={filtros.ubicaciones?.length || 0}
          >
            <p className="fg-hint">Ciudad o distrito en orden alfabético</p>
            <AlphaDropdown
              titulo="Ubicaciones"
              opciones={UBICACIONES}
              seleccionadas={filtros.ubicaciones || []}
              onChange={(v) => upd("ubicaciones", v)}
            />
          </Grupo>

          {/* ── ÁREAS DE EXPERIENCIA — actual + anteriores unificadas ── */}
          <Grupo titulo="Áreas de experiencia" badge={filtros.areas?.length || 0}>
            <p className="fg-hint">
              Muestra practicantes que tengan esa área como actual <strong>o</strong> como rotación anterior en BCP.
            </p>
            <div className="fg-chips-wrap">
              {AREAS_BCP.map((a) => (
                <Chip
                  key={a}
                  label={a}
                  activo={(filtros.areas || []).includes(a)}
                  onClick={() => tgl("areas", a)}
                />
              ))}
            </div>
          </Grupo>

          {/* ── IDIOMAS — dropdown alfabético ── */}
          <Grupo titulo="Idiomas" badge={filtros.idiomas?.length || 0}>
            <p className="fg-hint">Idiomas en orden alfabético</p>
            <AlphaDropdown
              titulo="Idiomas"
              opciones={IDIOMAS_OPC}
              seleccionadas={filtros.idiomas || []}
              onChange={(v) => upd("idiomas", v)}
            />
          </Grupo>

          {/* ── EXPERIENCIA ── */}
          <Grupo titulo="Experiencia" badge={filtros.rangosExp?.length || 0}>
            <p className="fg-hint">Rango de meses de experiencia total</p>
            <div className="fg-chips-wrap">
              {RANGOS_EXP.map((r) => (
                <Chip
                  key={r}
                  label={r}
                  activo={(filtros.rangosExp || []).includes(r)}
                  onClick={() => tgl("rangosExp", r)}
                />
              ))}
            </div>
          </Grupo>

          {/* ── FORMACIÓN ── */}
          <Grupo titulo="Formación" badge={filtros.nivelEducacion?.length || 0}>
            <div className="fg-chips-wrap">
              {NIVELES_EDU.map((n) => (
                <Chip
                  key={n}
                  label={n}
                  activo={(filtros.nivelEducacion || []).includes(n)}
                  onClick={() => tgl("nivelEducacion", n)}
                />
              ))}
            </div>
          </Grupo>

          {/* ── PROYECTOS ── */}
          <Grupo titulo="Proyectos">
            <ToggleRow
              label="Con proyectos destacados"
              activo={!!filtros.soloConProyectos}
              onChange={() => upd("soloConProyectos", !filtros.soloConProyectos)}
            />
          </Grupo>

        </div>

        {/* APLICAR mobile */}
        <div className="filtros-footer-mobile">
          <button className="filtros-aplicar-btn" onClick={onCerrar}>
            Ver resultados →
          </button>
        </div>
      </aside>
    </>
  );
}

export default Filtros;
