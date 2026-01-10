import type { RankingRow } from "../types";
import { Link } from "react-router-dom";
import { useMemo, useState } from "react";

type Props = {
  rows: RankingRow[];
  onPlayerClickTo?: (id: string) => string; // path
  hideEliminado?: boolean;
  mobileDetails?: boolean; // <- novo: habilita "..." + popup no mobile
};

function formatLabel(key: string) {
  const map: Record<string, string> = {
    p1: "P1", p2: "P2", p3: "P3", p4: "P4", p5: "P5", p6: "P6", p7: "P7", p8: "P8", p9: "P9",
    serie_b: "CSB",
    fora_mesa_final: "P10+",
    podios: "Pódios",
    melhor_mao: "Melhor Mão",
    rebuy_total: "Rebuy",
    addon_total: "Add-on",
    participacoes: "Participações",
  };
  return map[key] ?? key;
}

export function RankingTable({ rows, onPlayerClickTo, hideEliminado, mobileDetails = false }: Props) {
  const [openId, setOpenId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const base = hideEliminado ? rows.filter(r => r.id_jogador !== "J055") : rows;
    return base;
  }, [rows, hideEliminado]);

  const detailKeys: Array<keyof RankingRow> = [
    "p1","p2","p3","p4","p5","p6","p7","p8","p9",
    "serie_b","fora_mesa_final","podios","melhor_mao","rebuy_total","addon_total","participacoes"
  ];

  return (
    <div className="card">
      <h3 className="cardTitle">Ranking</h3>
    
      {/* MOBILE: lista de cards (evita barra lateral) */}
      {mobileDetails && (
        <div className="rankMobileList">
          {filtered.map((r, idx) => {
            const pos = idx + 1;
            const rowClass = [
              pos === 1 ? "podiumGold" : "",
              pos === 2 ? "podiumSilver" : "",
              pos === 3 ? "podiumBronze" : "",
              (r.eliminado || r.id_jogador === "J055") ? "eliminado" : ""
            ].filter(Boolean).join(" ");
    
            const name = onPlayerClickTo
              ? (
                <Link to={onPlayerClickTo(r.id_jogador)} className="nm">
                  {r.nome}
                </Link>
              )
              : <span className="nm">{r.nome}</span>;
    
            return (
              <div className={`rankMobileCard ${rowClass}`} key={r.id_jogador}>
                <div className="rankMobileLeft">
                  <div className="rankMobilePos">{pos}</div>
                  <div className="rankMobileName">
                    <div className="small">{r.id_jogador}</div>
                    <div className="nm">{name}</div>
                  </div>
                </div>
    
                <div style={{display:"flex", alignItems:"center", gap:10}}>
                  <div className="rankMobilePts">
                    {r.pontos} <span>pts</span>
                  </div>
                  <button
                    className="moreBtn"
                    aria-label={`Ver detalhes de ${r.nome}`}
                    onClick={() => setOpenId(r.id_jogador)}
                  >
                    …
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    
      {/* DESKTOP: tabela */}
      <div className="tableWrap">

        <table className={mobileDetails ? "rankTableMobileDetails" : ""}>
          <thead>
            <tr>
              <th>Pos</th>
              <th>Jogador</th>
              <th>Pontos</th>

              {/* colunas completas (desktop) */}
              <th className="colFull">P1</th><th className="colFull">P2</th><th className="colFull">P3</th>
              <th className="colFull">P4</th><th className="colFull">P5</th><th className="colFull">P6</th>
              <th className="colFull">P7</th><th className="colFull">P8</th><th className="colFull">P9</th>
              <th className="colFull">CSB</th>
              <th className="colFull">P10+</th>
              <th className="colFull">Pódios</th>
              <th className="colFull">Melhor Mão</th>
              <th className="colFull">Rebuy</th>
              <th className="colFull">Add-on</th>
              <th className="colFull">Part.</th>

              {/* botão "..." (mobile) */}
              {mobileDetails && <th className="colMore"> </th>}
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

                  <td style={{textAlign:"left"}}>
                    <div className="playerCell">
                      <div>{nameCell}</div>

                      {mobileDetails && (
                        <button
                          className="moreBtn"
                          aria-label={`Ver detalhes de ${r.nome}`}
                          onClick={() => setOpenId(r.id_jogador)}
                          title="Detalhes"
                        >
                          …
                        </button>
                      )}
                    </div>
                  </td>

                  <td><b>{r.pontos}</b></td>

                  {/* desktop */}
                  <td className="colFull">{r.p1}</td><td className="colFull">{r.p2}</td><td className="colFull">{r.p3}</td>
                  <td className="colFull">{r.p4}</td><td className="colFull">{r.p5}</td><td className="colFull">{r.p6}</td>
                  <td className="colFull">{r.p7}</td><td className="colFull">{r.p8}</td><td className="colFull">{r.p9}</td>
                  <td className="colFull">{r.serie_b}</td>
                  <td className="colFull">{r.fora_mesa_final}</td>
                  <td className="colFull">{r.podios}</td>
                  <td className="colFull">{r.melhor_mao}</td>
                  <td className="colFull">{r.rebuy_total}</td>
                  <td className="colFull">{r.addon_total}</td>
                  <td className="colFull">{r.participacoes}</td>

                  {mobileDetails && <td className="colMore" />}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {mobileDetails && openId && (
        <>
          <div className="detailsBackdrop" onClick={() => setOpenId(null)} />
          <div className="detailsModal" role="dialog" aria-label="Detalhes do jogador">
            <div className="detailsHeader">
              <div style={{fontWeight: 900}}>Detalhes</div>
              <button className="detailsClose" onClick={() => setOpenId(null)} aria-label="Fechar">×</button>
            </div>

            {(() => {
              const r = filtered.find(x => x.id_jogador === openId);
              if (!r) return null;

              return (
                <div className="detailsGrid">
                  {detailKeys.map((k) => (
                    <div className="detailsCard" key={String(k)}>
                      <div className="small">{formatLabel(String(k))}</div>
                      <div className="kpi" style={{fontSize:18}}>{(r as any)[k]}</div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        </>
      )}

      <div className="small" style={{marginTop:10}}>
        Pódios (para o ranking) = <b>1º ao 5º</b>. Premiação em dinheiro pode variar por rodada (5 / 7 / 9).
      </div>
    </div>
  );
}
