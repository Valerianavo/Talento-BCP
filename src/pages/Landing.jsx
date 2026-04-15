
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
            <Link to="/auth" className="btn-primary">
              Soy practicante
            </Link>

            <Link to="/catalogo" className="btn-secondary">
              Soy líder
            </Link>
          </div>
        </div>
      </div>

      {/* TALENTO */}
      <section className="section">
        <h2>Desarrollo de talento</h2>

        <div className="cards">
          <div className="info-card">
            <FaUserTie className="icon" />
            <h3>Perfil profesional</h3>
            <p>
              Registra tu formación académica, experiencia y habilidades clave
              para visibilizar tu perfil dentro del banco.
            </p>
          </div>

          <div className="info-card">
            <FaChartLine className="icon" />
            <h3>Gestión de habilidades</h3>
            <p>
              Organiza tus competencias técnicas, idiomas y conocimientos para
              mejorar tu posicionamiento.
            </p>
          </div>

          <div className="info-card">
            <FaStar className="icon" />
            <h3>Posicionamiento interno</h3>
            <p>
              Mejora tu visibilidad mediante un sistema de scoring basado en tu
              perfil profesional.
            </p>
          </div>
        </div>
      </section>

      {/* LÍDER */}
      <section className="section alt">
        <h2>Gestión para líderes</h2>

        <div className="cards">
          <div className="info-card">
            <FaSearch className="icon" />
            <h3>Filtrado avanzado</h3>
            <p>
              Encuentra talento mediante filtros por área, experiencia,
              habilidades e idiomas.
            </p>
          </div>

          <div className="info-card">
            <FaStar className="icon" />
            <h3>Ranking automatizado</h3>
            <p>
              Identifica rápidamente a los perfiles mejor posicionados según su
              score.
            </p>
          </div>

          <div className="info-card">
            <FaFileAlt className="icon" />
            <h3>Evaluación de perfiles</h3>
            <p>
              Accede a información estructurada para tomar decisiones más
              eficientes.
            </p>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="footer">
        <p>BCP – Plataforma de Talento © 2026</p>
      </footer>
    </div>
  );
}

export default Landing;