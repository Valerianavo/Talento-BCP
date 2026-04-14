import { useState } from "react";

const AREAS_BCP = [
  "Analítica & Tecnología","Finanzas & Control","Gestión & Operaciones",
  "Comunicación & Relación","Riesgos & Cumplimiento","Marketing & Experiencia Cliente",
];
const NIVELES_EDU   = ["Técnico","Universitario (en curso)","Universitario (egresado)","Postgrado","Maestría","Doctorado"];
const IDIOMAS_OPC   = ["Español","Inglés","Portugués","Francés","Alemán"];

const toggle = (arr, val) => arr.includes(val) ? arr.filter(v=>v!==val) : [...arr, val];

/* ── grupo colapsable ── */
function Grupo({ titulo, icono, inicialAbierto=false, badge=0, children }) {
  const [abierto, setAbierto] = useState(inicialAbierto);
  return (
    <div className="fg-grupo">
      <button className="fg-cabecera" onClick={()=>setAbierto(v=>!v)} type="button">
        <span className="fg-cabecera-izq">
          <span className="fg-icono">{icono}</span>
          <span className="fg-titulo">{titulo}</span>
          {badge > 0 && <span className="fg-badge-mini">{badge}</span>}
        </span>
        <span className={`fg-chevron ${abierto?"fg-chevron-open":""}`}>❯</span>
      </button>
      {abierto && <div className="fg-body">{children}</div>}
    </div>
  );
}

function Chip({ label, activo, onClick }) {
  return (
    <button type="button" className={`fg-chip ${activo?"fg-chip-activo":""}`} onClick={onClick}>
      {label}
    </button>
  );
}

function Toggle({ label, activo, onChange }) {
  return (
    <div className="fg-toggle-row" onClick={onChange}>
      <span className="fg-toggle-label">{label}</span>
      <div className={`fg-toggle ${activo?"fg-toggle-on":""}`}>
        <div className="fg-toggle-bola"/>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════
   FILTROS
   Props:
     filtros            → estado actual
     onChange           → fn(nuevosFiltros)
     skillsDisponibles  → string[] de Firebase
     esLider            → bool
     abierto            → bool (mobile drawer)
     onCerrar           → fn()
══════════════════════════════════════════ */
function Filtros({ filtros, onChange, skillsDisponibles=[], esLider=false, abierto=false, onCerrar }) {
  const upd = (campo, valor) => onChange({ ...filtros, [campo]: valor });
  const tgl = (campo, val)   => onChange({ ...filtros, [campo]: toggle(filtros[campo]||[], val) });

  /* contadores para badges */
  const cntArea = filtros.areasActuales.length + filtros.areasAnteriores.length;
  const total =
    cntArea + filtros.skills.length + filtros.idiomas.length +
    filtros.nivelEducacion.length +
    (filtros.soloFavoritos    ? 1 : 0) +
    (filtros.soloConProyectos ? 1 : 0) +
    (filtros.soloConRotaciones? 1 : 0);

  const limpiar = () => onChange({
    ...filtros,
    areasActuales: [], areasAnteriores: [], skills: [],
    idiomas: [], nivelEducacion: [],
    soloFavoritos: false, soloConProyectos: false, soloConRotaciones: false,
  });

  return (
    <>
      {abierto && <div className="filtros-overlay" onClick={onCerrar}/>}

      <aside className={`filtros-panel ${abierto?"filtros-panel-open":""}`}>

        {/* HEADER */}
        <div className="filtros-header">
          <div className="filtros-header-left">
            <span className="filtros-header-titulo">Filtros</span>
            {total > 0 && <span className="filtros-badge">{total}</span>}
          </div>
          <div className="filtros-header-right">
            {total > 0 && <button className="filtros-limpiar-btn" onClick={limpiar}>Limpiar</button>}
            <button className="filtros-x-btn" onClick={onCerrar}>✕</button>
          </div>
        </div>

        <div className="filtros-scroll">

          {/* FAVORITOS — solo líderes */}
          {esLider && (
            <div className="fg-grupo">
              <div className="fg-cabecera fg-cabecera-flat">
                <span className="fg-cabecera-izq">
                  <span className="fg-icono">☆</span>
                  <span className="fg-titulo">Talentos favoritos</span>
                </span>
                <input type="checkbox" className="fg-checkbox"
                  checked={filtros.soloFavoritos}
                  onChange={()=>upd("soloFavoritos",!filtros.soloFavoritos)}
                  onClick={e=>e.stopPropagation()}/>
              </div>
            </div>
          )}

          {/* SKILLS */}
          <Grupo titulo="Skills / Tags" inicialAbierto={true} badge={filtros.skills.length}>
            <p className="fg-hint">Filtra por tecnologías y herramientas</p>
            {skillsDisponibles.length > 0 ? (
              <div className="fg-chips-wrap">
                {skillsDisponibles.slice(0,30).map(s=>(
                  <Chip key={s} label={s} activo={filtros.skills.includes(s)} onClick={()=>tgl("skills",s)}/>
                ))}
              </div>
            ) : <p className="fg-empty">Cargando skills...</p>}
          </Grupo>

          {/* ÁREA BCP — diferenciado actual vs anterior */}
          <Grupo titulo="Área de vacantes"  badge={cntArea}>
            {/* área ACTUAL */}
            <p className="fg-subgrupo-label">
              <span className="fg-subgrupo-dot fg-dot-actual"/>
              Área actual
            </p>
            <p className="fg-hint">El área en la que trabaja actualmente</p>
            <div className="fg-chips-wrap">
              {AREAS_BCP.map(a=>(
                <Chip key={`act-${a}`} label={a}
                  activo={filtros.areasActuales.includes(a)}
                  onClick={()=>tgl("areasActuales",a)}/>
              ))}
            </div>

            {/* área ANTERIOR */}
            <p className="fg-subgrupo-label" style={{marginTop:14}}>
              <span className="fg-subgrupo-dot fg-dot-anterior"/>
              Áreas anteriores en BCP
            </p>
            <p className="fg-hint">Áreas por las que ha rotado anteriormente</p>
            <div className="fg-chips-wrap">
              {AREAS_BCP.map(a=>(
                <Chip key={`ant-${a}`} label={a}
                  activo={filtros.areasAnteriores.includes(a)}
                  onClick={()=>tgl("areasAnteriores",a)}/>
              ))}
            </div>

            {/* toggle: con historial BCP */}
            <div style={{marginTop:12}}>
              <Toggle
                label="Solo con historial en BCP"
                activo={filtros.soloConRotaciones}
                onChange={()=>upd("soloConRotaciones",!filtros.soloConRotaciones)}
              />
            </div>
          </Grupo>

          {/* IDIOMAS */}
          <Grupo titulo="Idiomas"  badge={filtros.idiomas.length}>
            <div className="fg-chips-wrap">
              {IDIOMAS_OPC.map(id=>(
                <Chip key={id} label={id} activo={filtros.idiomas.includes(id)} onClick={()=>tgl("idiomas",id)}/>
              ))}
            </div>
          </Grupo>

          {/* FORMACIÓN */}
          <Grupo titulo="Formación"  badge={filtros.nivelEducacion.length}>
            <div className="fg-chips-wrap">
              {NIVELES_EDU.map(n=>(
                <Chip key={n} label={n} activo={filtros.nivelEducacion.includes(n)} onClick={()=>tgl("nivelEducacion",n)}/>
              ))}
            </div>
          </Grupo>

          {/* PROYECTOS */}
          <Grupo titulo="Proyectos">
            <Toggle
              label="Con proyectos destacados"
              activo={filtros.soloConProyectos}
              onChange={()=>upd("soloConProyectos",!filtros.soloConProyectos)}
            />
          </Grupo>

        </div>

        {/* APLICAR mobile */}
        <div className="filtros-footer-mobile">
          <button className="filtros-aplicar-btn" onClick={onCerrar}>Ver resultados →</button>
        </div>
      </aside>
    </>
  );
}

export default Filtros;
