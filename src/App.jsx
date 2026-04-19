import { HashRouter, Routes, Route, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { getDocs, collection, query, where } from "firebase/firestore";
import { auth, db } from "./firebase/firebase";

import Landing        from "./pages/Landing";
import Catalogo       from "./pages/Catalogo";
import Auth           from "./pages/Auth";
import Perfil         from "./pages/Perfil";
import PerfilPublico  from "./pages/PerfilPublico";
import DashboardLider from "./pages/DashboardLider";


import Navbar from "./components/Navbar";
import Chatbot from "./components/Chatbot";

function Layout() {
  const location = useLocation();
  const [esLider, setEsLider] = useState(false);
  const hideLayout = location.pathname === "/auth";

  useEffect(() => {
    // Escuchamos cuando el usuario entra o sale
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // Si hay usuario, verificamos si es líder en Firestore
        const q = query(collection(db, "lideres"), where("uid", "==", user.uid));
        const snap = await getDocs(q);
        setEsLider(!snap.empty); // true si está en la colección "lideres"
      } else {
        setEsLider(false);
      }
    });
    return () => unsub();
  }, []);

  return (
    <>
      {!hideLayout && <Navbar />}

      <Routes>
        <Route path="/"                element={<Landing />} />
        <Route path="/catalogo"        element={<Catalogo />} />
        <Route path="/auth"            element={<Auth />} />
        <Route path="/perfil"          element={<Perfil />} />
        <Route path="/perfil/:id"      element={<PerfilPublico />} />
        <Route path="/dashboard-lider" element={<DashboardLider />} />
      </Routes>

      {/* CONDICIONAL: Solo si no es /auth Y es líder comprobado en Firestore */}
      {!hideLayout && esLider && <Chatbot />}
    </>
  );
}

function App() {
  return (
    <HashRouter>
      <Layout />
    </HashRouter>
  );
}

export default App;