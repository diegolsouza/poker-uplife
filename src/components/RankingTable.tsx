import type { RankingRow } from "../types";
import { Link } from "react-router-dom";

type Props = {
  rows: RankingRow[];
  onPlayerClickTo?: (id: string) => string; // path
  hideEliminado?: boolean;
};

export function RankingTable({ rows, onPlayerClickTo, hideEliminado }: Props) {
  const filtered = hideEliminado ? rows.filter(r => r.id_jogador !== "J055") : rows;
  return (
    <div className="card">
      <h3 className="cardTitle">Ranking</h3>
      <div className="tableWrap">
        <table>
          <thead>
            <tr>
              <th>Pos</th>
              <th>Jogador</th>
              <th>Pontos</th>
              <th>P1</th><th>P2</th><th>P3</th><th>P4</th><th>P5</th><th>P6</th><th>P7</th><th>P8</th><th>P9</th>
              <th>CSB</th>
              <th>P10+</th>
              <th>Pódios</th>
              <th>Melhor Mão</th>
              <th>Rebuy</th>
              <th>Add-on</th>
              <th>Part.</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r, idx) => {
              const pos = idx + 1;
              const cls = [
                pos === 1 ? "rankTop1" : "",
                pos === 2 ? "rankTop2" : "",
                pos === 3 ? "rankTop3" : "",
                (r.eliminado || r.id_jogador === "J055") ? "eliminado" : ""
              ].filter(Boolean).join(" ");

              const nameCell = onPlayerClickTo
                ? <Link to={onPlayerClickTo(r.id_jogador)}><span className="badge">{r.id_jogador}</span>{" "}{r.nome}</Link>
                : <span><span className="badge">{r.id_jogador}</span>{" "}{r.nome}</span>;

              return (
                <tr key={r.id_jogador} className={cls}>
                  <td>{pos}</td>
                  <td style={{textAlign:"left"}}>{nameCell}</td>
                  <td><b>{r.pontos}</b></td>
                  <td>{r.p1}</td><td>{r.p2}</td><td>{r.p3}</td><td>{r.p4}</td><td>{r.p5}</td><td>{r.p6}</td><td>{r.p7}</td><td>{r.p8}</td><td>{r.p9}</td>
                  <td>{r.serie_b}</td>
                  <td>{r.fora_mesa_final}</td>
                  <td>{r.podios}</td>
                  <td>{r.melhor_mao}</td>
                  <td>{r.rebuy_total}</td>
                  <td>{r.addon_total}</td>
                  <td>{r.participacoes}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="small" style={{marginTop:10}}>
        Pódios (para o ranking) = <b>1º ao 5º</b>. Premiação em dinheiro pode variar por rodada (5 / 7 / 9).
      </div>
    </div>
  );
}
