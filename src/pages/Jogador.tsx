import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams, Link } from "react-router-dom";
import { getAnosTemporadas, getJogador } from "../api/endpoints";
import type { AnoTemporada, JogadorResponse } from "../types";
import { SeasonFilter } from "../components/SeasonFilter";
import { formatMoneyBRL, formatPct } from "../utils/aggregate";

function minDateISO(dates: string[]): string | null {
  const valid = dates.filter(Boolean).sort();
  return valid.length ? valid[0] : null;
}

export function Jogador() {
  const { id } = useParams();
  const [sp] = useSearchParams();
  const [options, setOptions] = useState<AnoTemporada[]>([]);
  const [ano, setAno] = useState<string>(sp.get("ano") ?? "ALL");
  const [temporada, setTemporada] = useState<string>(sp.get("temporada") ?? "ALL");
  const [data, setData] = useState<JogadorResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const opts = await getAnosTemporadas();
        setOptions(opts);
      } catch {}
    })();
  }, []);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        setLoading(true);
        setError(null);

        // Backend suporta ALL/ALL diretamente.
        if (ano === "ALL" && temporada === "ALL") {
          const r = await getJogador("ALL", "ALL", id);
          setData(r);
          return;
        }

        // Ano específico + Temporada específica
        if (ano !== "ALL" && temporada !== "ALL") {
          const r = await getJogador(ano, temporada, id);
          setData(r);
          return;
        }

        // Ano específico + Temporada ALL
        // Estratégia: pedir ALL/ALL e filtrar o histórico por ano (e recalcular os cards no frontend)
        const r = await getJogador("ALL", "ALL", id);
        setData(r);
      } catch (e:any) {
        setError(e?.message ?? "Erro ao carregar jogador");
      } finally {
        setLoading(false);
      }
    })();
  }, [id, ano, temporada]);

  const computed = useMemo(() => {
    if (!data?.jogador) return null;

    const hist = data.historico ?? [];
    const filteredHist = hist.filter(h => {
      if (ano !== "ALL" && h.ano !== ano) return false;
      if (temporada !== "ALL" && h.temporada !== temporada) return false;
      return true;
    });

    const participou = filteredHist.filter(h => h.participou);
    const jogadorDesde = minDateISO(participou.map(h => h.data));

    // somatórios filtrados
    const totals = participou.reduce((acc, h) => {
      acc.participacoes += 1;
      acc.p1 += (h.colocacao === 1 ? 1 : 0);
      acc.podios += (h.colocacao >= 1 && h.colocacao <= 5 ? 1 : 0); // regra do seu pódio
      acc.rebuy += (h.rebuy || 0);
      acc.addon += (h.addon || 0);
      acc.pagou += (h.pagou || 0);
      acc.recebeu += (h.recebeu || 0);
      acc.melhorMao += (h.melhor_mao ? 1 : 0);
      return acc;
    }, { participacoes:0, p1:0, podios:0, rebuy:0, addon:0, pagou:0, recebeu:0, melhorMao:0 });

    const saldo = totals.recebeu - totals.pagou;
    const taxaPodio = totals.participacoes ? totals.podios / totals.participacoes : 0;
    const taxaVitoria = totals.participacoes ? totals.p1 / totals.participacoes : 0;

    return { jogadorDesde, totals, saldo, taxaPodio, taxaVitoria, filteredHist };
  }, [data, ano, temporada]);

  return (
    <div className="container">
      <div className="card" style={{marginBottom:12}}>
        <Link to="/">← Voltar para o ranking</Link>
      </div>

      {error && <div className="card" style={{borderColor:"rgba(255,77,77,.35)"}}><b>Erro:</b> {error}</div>}

      <SeasonFilter
        options={options}
        ano={ano}
        temporada={temporada}
        onChange={(n) => { setAno(n.ano); setTemporada(n.temporada); }}
      />

      {loading || !computed || !data?.jogador ? (
        <div className="card" style={{marginTop:12}}>Carregando…</div>
      ) : (
        <>
          <div className="row" style={{marginTop:12}}>
            <div className="card" style={{flex:"1 1 260px"}}>
              <div className="small">Jogador</div>
              <div className="kpi">{data.jogador.nome}</div>
              <div className="small">{id}</div>
            </div>
            <div className="card" style={{flex:"1 1 260px"}}>
              <div className="small">Jogador desde</div>
              <div className="kpi">{computed.jogadorDesde ?? "—"}</div>
              <div className="small">Primeira rodada com participação</div>
            </div>
            <div className="card" style={{flex:"1 1 260px"}}>
              <div className="small">Taxa de pódio (1º–5º)</div>
              <div className="kpi">{formatPct(computed.taxaPodio)}</div>
              <div className="small">{computed.totals.podios} pódios / {computed.totals.participacoes} part.</div>
            </div>
            <div className="card" style={{flex:"1 1 260px"}}>
              <div className="small">Taxa de vitória</div>
              <div className="kpi">{formatPct(computed.taxaVitoria)}</div>
              <div className="small">{computed.totals.p1} vitórias / {computed.totals.participacoes} part.</div>
            </div>
            <div className="card" style={{flex:"1 1 260px"}}>
              <div className="small">Rebuys</div>
              <div className="kpi">{computed.totals.rebuy}</div>
              <div className="small">No filtro selecionado</div>
            </div>
            <div className="card" style={{flex:"1 1 260px"}}>
              <div className="small">Add-ons</div>
              <div className="kpi">{computed.totals.addon}</div>
              <div className="small">No filtro selecionado</div>
            </div>
          </div>

          <div className="row" style={{marginTop:12}}>
            <div className="card" style={{flex:"1 1 260px"}}>
              <div className="small">Pagou</div>
              <div className="kpi">{formatMoneyBRL(computed.totals.pagou)}</div>
              <div className="small">Buy-in + rebuy + add-on + custos</div>
            </div>
            <div className="card" style={{flex:"1 1 260px"}}>
              <div className="small">Recebeu</div>
              <div className="kpi">{formatMoneyBRL(computed.totals.recebeu)}</div>
              <div className="small">Premiações recebidas</div>
            </div>
            <div className="card" style={{flex:"1 1 260px"}}>
              <div className="small">Saldo</div>
              <div className={"kpi " + (computed.saldo >= 0 ? "moneyPos" : "moneyNeg")}>
                {formatMoneyBRL(computed.saldo)}
              </div>
              <div className="small">Recebeu − Pagou</div>
            </div>
          </div>

          <div className="card" style={{marginTop:12}}>
            <h3 className="cardTitle">Histórico (no filtro)</h3>
            <div className="tableWrap">
              <table style={{minWidth:980}}>
                <thead>
                  <tr>
                    <th>Data</th>
                    <th style={{textAlign:"left"}}>Rodada</th>
                    <th>Col.</th>
                    <th>Pontos</th>
                    <th>CSB</th>
                    <th>Melhor Mão</th>
                    <th>Rebuy</th>
                    <th>Add-on</th>
                    <th>Pagou</th>
                    <th>Recebeu</th>
                    <th>Saldo</th>
                  </tr>
                </thead>
                <tbody>
                  {computed.filteredHist
                    .filter(h => h.participou)
                    .sort((a,b) => a.data.localeCompare(b.data))
                    .map(h => (
                      <tr key={h.id_rodada}>
                        <td style={{textAlign:"center"}}>{h.data}</td>
                        <td style={{textAlign:"left"}}>{h.ano}-{h.temporada}-{h.rodada}</td>
                        <td>{h.colocacao}</td>
                        <td><b>{h.pontos}</b></td>
                        <td>{h.foi_csb ? "✓" : ""}</td>
                        <td>{h.melhor_mao ? "✓" : ""}</td>
                        <td>{h.rebuy}</td>
                        <td>{h.addon}</td>
                        <td>{formatMoneyBRL(h.pagou)}</td>
                        <td>{formatMoneyBRL(h.recebeu)}</td>
                        <td className={h.saldo >= 0 ? "moneyPos" : "moneyNeg"}>{formatMoneyBRL(h.saldo)}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
