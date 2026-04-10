import Navbar from "../components/Navbar.jsx";
import "../stylesheets/Landing.css";
import { Link } from "react-router-dom";

function Landing() {
  return (
    <div>
      <Navbar />

      <div className="landing-container">
        <h1>Bienvenido a Talento BCP</h1>
        <p>Descubre talento o impulsa tu carrera dentro del banco</p>

        <div className="botones">
            <Link to="/auth">
                Soy practicante
            </Link>
            
            <Link to="/catalogo" className="btn btn-warning">
                Soy líder
            </Link>

        </div>
      </div>
    </div>
  );
}

export default Landing;