import { NavLink, useLocation } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";

function pageLabel(pathname: string): string {
  if (pathname.startsWith("/geral")) return "Geral";
  if (pathname.startsWith("/jogador")) return "Jogador";
  return "Temporada";
}

export function Header() {
  const location = useLocation();
  const current = useMemo(() => pageLabel(location.pathname), [location.pathname]);

  const [open, setOpen] = useState(false);

  // fecha o menu ao mudar de rota
  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  // fecha com ESC
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <div className="header">
      <div className="headerInner">
        <div className="brand">
          <img className="brandLogo" src="./logo.png" alt="Poker Uplife" />
          <div>
            <div className="brandTitle">Poker Uplife</div>
            {/* removido: Ranking • PIX • Estatísticas */}
          </div>
        </div>

        {/* Desktop */}
        <nav className="nav navDesktop" aria-label="Menu">
          <NavLink to="/" end className={({ isActive }) => (isActive ? "active" : "")}>
            Temporada
          </NavLink>
          <NavLink to="/geral" className={({ isActive }) => (isActive ? "active" : "")}>
            Geral
          </NavLink>
        </nav>

        {/* Mobile: mostra página atual + hamburger */}
        <div className="navMobile">
          <div className="currentPage" aria-label="Página atual">
            {current}
          </div>

          <button
            className="hamburgerBtn"
            aria-label={open ? "Fechar menu" : "Abrir menu"}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            <span className="hamburgerLines" />
          </button>

          {open && (
            <>
              <div className="menuBackdrop" onClick={() => setOpen(false)} />
              <div className="menuDropdown" role="menu" aria-label="Menu de navegação">
                <NavLink to="/" end className={({ isActive }) => (isActive ? "active" : "")}>
                  Temporada
                </NavLink>
                <NavLink to="/geral" className={({ isActive }) => (isActive ? "active" : "")}>
                  Geral
                </NavLink>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
