import { HashRouter, Routes, Route, useLocation } from "react-router-dom";

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
  const hideLayout = location.pathname === "/auth";

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

      {!hideLayout && <Chatbot />}
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