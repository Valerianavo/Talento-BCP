import { BrowserRouter, Routes, Route } from "react-router-dom";
import Landing from "./pages/Landing";
import Catalogo from "./pages/Catalogo";
import Auth from "./pages/Auth";
import AuthLider from "./pages/AuthLider";
import Perfil from "./pages/Perfil";
import PerfilPublico from "./pages/PerfilPublico";
import DashboardLider from "./pages/DashboardLider";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/"                element={<Landing />} />
        <Route path="/catalogo"        element={<Catalogo />} />
        <Route path="/auth"            element={<Auth />} />
        <Route path="/auth-lider"      element={<AuthLider />} />
        <Route path="/perfil"          element={<Perfil />} />
        <Route path="/perfil/:id"      element={<PerfilPublico />} />
        <Route path="/dashboard-lider" element={<DashboardLider />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
