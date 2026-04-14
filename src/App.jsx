import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";

import Landing from "./pages/Landing";
import Catalogo from "./pages/Catalogo";
import Auth from "./pages/Auth";
import Perfil from "./pages/Perfil";
import PerfilPublico from "./pages/PerfilPublico";
import DashboardLider from "./pages/DashboardLider";

import Topbar from "./components/Topbar";
import Navbar from "./components/Navbar";

function Layout() {
  const location = useLocation();

  // 👇 aquí defines dónde NO quieres navbar/topbar
  const hideLayout =
    location.pathname === "/auth" ||
    location.pathname === "/auth-lider";

  return (
    <>
      {!hideLayout && <Topbar />}
      {!hideLayout && <Navbar />}

      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/catalogo" element={<Catalogo />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/perfil" element={<Perfil />} />
        <Route path="/perfil/:id" element={<PerfilPublico />} />
        <Route path="/dashboard-lider" element={<DashboardLider />} />
      </Routes>
    </>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Layout />
    </BrowserRouter>
  );
}

export default App;