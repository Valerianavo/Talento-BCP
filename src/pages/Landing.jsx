
import "../stylesheets/Landing.css";
import { Link } from "react-router-dom";

// ICONOS
import {
  FaUserTie,
  FaChartLine,
  FaSearch,
  FaStar,
  FaFileAlt,
} from "react-icons/fa";

function Landing() {
  return (
    <div className="landing">
      

      {/* HERO */}
      <div className="landing-container">
        <div className="overlay-hero">
          <h1>Plataforma de Gestión de Talento</h1>

          <p>
            Identifica, gestiona y potencia el talento interno mediante
            herramientas de filtrado y análisis estratégico.
          </p>


          <div className="hero-buttons">

            <button
              className="btn-secondary"
              onClick={() => {
                document.getElementById("info").scrollIntoView({ behavior: "smooth" });
              }}
            >
              Saber más
            </button>
        </div>

        </div>
      </div>

      <section id="info">
        <div className="container text-center">
          <h2>Impulsa tu talento</h2>
          <p>
            Tus habilidades merecen ser vistas. Aquí podrás mostrarlas, explorar nuevas oportunidades y crecer dentro del banco en solo 3 simples pasos.
          </p>
        </div>
      </section>
      {/* TALENTO */}
      <section className="section">
        <h2 className="titulo-talento">Desarrollo de talento</h2>

      <div className="cards">
        <div className="info-card">
          <FaUserTie className="icon" />
          <h3 className="card-title">Perfil profesional</h3>
          <p className="card-text">
            Registra tu formación académica, experiencia y habilidades clave para visibilizar tu perfil dentro del banco.
          </p>
        </div>

        <div className="info-card">
          <FaChartLine className="icon" />
          <h3 className="card-title">Gestión de habilidades</h3>
          <p className="card-text">
            Organiza tus competencias técnicas, idiomas y conocimientos para
            mejorar tu posicionamiento.
          </p>
        </div>

        <div className="info-card">
          <FaStar className="icon" />
          <h3 className="card-title">Posicionamiento interno</h3>
          <p className="card-text">
            Mejora tu visibilidad mediante un sistema de scoring basado en tu
            perfil profesional.
          </p>
        </div>
      </div>
      </section>

{/* LÍDER */}
<section className="section alt">
  <h2>Gestión para líderes</h2>

  <p className="subtitulo-lider">
    Encuentra al practicante ideal en 3 simples pasos
  </p>

  <div className="cards">
    <div className="info-card">
      <FaSearch className="icon" />
      <h3 className="card-title">Filtrado avanzado</h3>
      <p className="card-text">
        Encuentra talento mediante filtros por área, experiencia,
        habilidades e idiomas.
      </p>
    </div>

    <div className="info-card">
      <FaStar className="icon" />
      <h3 className="card-title">Ranking automatizado</h3>
      <p className="card-text">
        Identifica rápidamente a los perfiles mejor posicionados según su
        score.
      </p>
    </div>

    <div className="info-card">
      <FaFileAlt className="icon" />
      <h3 className="card-title">Evaluación de perfiles</h3>
      <p className="card-text">
        Accede a información estructurada para tomar decisiones más
        eficientes.
      </p>
    </div>
  </div>
</section>

{/* BENEFICIOS */}
<section className="section">
  <h2 className="titulo-beneficios">¿Por qué usar esta plataforma?</h2>

  <div className="cards">
    <div className="info-card">
      <FaChartLine className="icon" />
      <h3 className="card-title">Decisiones basadas en datos</h3>
      <p className="card-text">
        Identifica talento con métricas claras y objetivas.
      </p>
    </div>

    <div className="info-card">
      <FaUserTie className="icon" />
      <h3 className="card-title">Visibilidad del talento</h3>
      <p className="card-text">
        Potencia el crecimiento interno y descubre nuevos perfiles.
      </p>
    </div>

    <div className="info-card">
      <FaSearch className="icon" />
      <h3 className="card-title">Búsqueda eficiente</h3>
      <p className="card-text">
        Encuentra rápidamente al candidato ideal sin procesos largos.
      </p>
    </div>
  </div>
</section>



              
      {/* FOOTER */}
      <footer className="footer">
        <p className="footer-text">
          BCP – Plataforma de Talento © 2026
        </p>
      </footer>
    </div>
  );
}

export default Landing;