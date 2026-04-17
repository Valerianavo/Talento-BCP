import { useState } from "react";
import "../stylesheets/Topbar.css";

function Topbar() {
  const [lang, setLang] = useState("es");

  const labels = {
    es: "Idioma:",
    en: "Language:",
    que: "Runa simi:",
  };

  return (
    <div className="topbar">
      <div className="topbar-content">
        <span className="lang-label">{labels[lang]}</span>

        <button
          className={`lang-btn ${lang === "es" ? "active" : ""}`}
          onClick={() => setLang("es")}
        >
          ES
        </button>

        <button
          className={`lang-btn ${lang === "en" ? "active" : ""}`}
          onClick={() => setLang("en")}
        >
          EN
        </button>

        <button
          className={`lang-btn ${lang === "que" ? "active" : ""}`}
          onClick={() => setLang("que")}
        >
          QUE
        </button>
      </div>
    </div>
  );
}

export default Topbar;