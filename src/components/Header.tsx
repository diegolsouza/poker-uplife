import { NavLink } from "react-router-dom";

export function Header() {
  return (
    <div className="header">
      <div className="headerInner">
        <div className="brand">
          <div className="logo">♠</div>
          <div>
            <div className="brandTitle">Poker Uplife</div>
            <div className="small">Ranking • PIX • Estatísticas</div>
          </div>
        </div>

        <nav className="nav" aria-label="Menu">
          <NavLink to="/" end className={({isActive}) => isActive ? "active" : ""}>Temporada</NavLink>
          <NavLink to="/geral" className={({isActive}) => isActive ? "active" : ""}>Geral</NavLink>
        </nav>
      </div>
    </div>
  );
}
