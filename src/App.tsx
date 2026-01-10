import { HashRouter, Routes, Route } from "react-router-dom";
import { Header } from "./components/Header";
import { Home } from "./pages/Home";
import { Jogador } from "./pages/Jogador";
import { Geral } from "./pages/Geral";
import "./styles/app.css";

export default function App() {
  return (
    <HashRouter>
      <Header />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/jogador/:id" element={<Jogador />} />
        <Route path="/geral" element={<Geral />} />
      </Routes>
    </HashRouter>
  );
}
