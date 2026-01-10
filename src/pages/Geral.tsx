import { useEffect, useMemo, useState } from "react";
import { getRankingGeral } from "../api/endpoints";
import type { RankingRow } from "../types";
import { RankingTable } from "../components/RankingTable";
import { formatPct } from "../utils/aggregate";

function safeDiv(a: number, b: number): number {
  if (!b) return 0;
  return a / b;
}

export function Geral() {
  const [rows, setRows] = useState<RankingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const r = await getRankingGeral();
        setRows(r);
      } catch (e: any) {
        setError(e?.message ?? "Erro ao carregar");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const top5 = useMemo(() => rows.slice(0, 5), [rows]);

  const stats = useMemo(() => {
    const byMax = (f: (r: RankingRow) => number) => {
      let best: RankingRow | null = null;
      let bestV = -Infinity;
      for (const r of rows) {
        const v = f(r);
        if (v > bestV) { bestV = v; best = r; }
      }
      return best;
    };

    const maisRebuys = byMax(r => r.rebuy_total + r.addon_total);
    const maisPart = byMax(r => r.participacoes);
    const maisPodios = byMax(r => r.podios);
    const maisTitulos = byMax(r => r.p1);
    const maisMelhorMao = byMax(r => r.melhor_mao);
    const melhorTaxaVitoria = byMax(r => safeDiv(r.p1, r.participacoes));
    const melhorTaxaPodio = byMax(r => safeDiv(r.podios, r.participacoes));

    return { maisRebuys, maisPart, maisPodios, maisTitulos, maisMelhorMao, melhorTaxaVitoria, melhorTaxaPodio };
  }, [rows]);

  return (
    <div className="container">
      {error && <div className="card" style={{borderColor:"rgba(255,77,77,.35)"}}><b>Erro:</b> {error}</div>}

      {loading ? (
        <div className="card">Carregando…</div>
      ) : (
        <>
          <div className="card">
            <h3 className="cardTitle">Pódio geral</h3>
            <div className="podiumGrid">
              {top5.map((r, i) => {
                const cls = i === 0 ? "podiumCard gold" : i === 1 ? "podiumCard silver" : i === 2 ? "podiumCard bronze" : "podiumCard";
                return (
                  <div className={cls} key={r.id_jogador}>
                    <div className="podiumPos">{i+1}º lugar</div>
                    <div className="podiumName">{r.nome}</div>
                    <div className="podiumPts">{r.pontos} pontos • {r.participacoes} participações</div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="row" style={{marginTop:12}}>
            <div className="card" style={{flex:"1 1 260px"}}>
              <div className="small">Mais rebuy/add-on</div>
              <div className="kpi">{stats.maisRebuys?.nome ?? "-"}</div>
              <div className="small">{(stats.maisRebuys?.rebuy_total ?? 0) + (stats.maisRebuys?.addon_total ?? 0)} ações</div>
            </div>
            <div className="card" style={{flex:"1 1 260px"}}>
              <div className="small">Mais participações</div>
              <div className="kpi">{stats.maisPart?.nome ?? "-"}</div>
              <div className="small">{stats.maisPart?.participacoes ?? 0} participações</div>
            </div>
            <div className="card" style={{flex:"1 1 260px"}}>
              <div className="small">Mais pódios</div>
              <div className="kpi">{stats.maisPodios?.nome ?? "-"}</div>
              <div className="small">{stats.maisPodios?.podios ?? 0} pódios</div>
            </div>
            <div className="card" style={{flex:"1 1 260px"}}>
              <div className="small">Mais títulos (P1)</div>
              <div className="kpi">{stats.maisTitulos?.nome ?? "-"}</div>
              <div className="small">{stats.maisTitulos?.p1 ?? 0} títulos</div>
            </div>
            <div className="card" style={{flex:"1 1 260px"}}>
              <div className="small">Mais melhor-mão</div>
              <div className="kpi">{stats.maisMelhorMao?.nome ?? "-"}</div>
              <div className="small">{stats.maisMelhorMao?.melhor_mao ?? 0} vezes</div>
            </div>
            <div className="card" style={{flex:"1 1 260px"}}>
              <div className="small">Maior taxa de vitória</div>
              <div className="kpi">{stats.melhorTaxaVitoria?.nome ?? "-"}</div>
              <div className="small">{formatPct((stats.melhorTaxaVitoria ? (stats.melhorTaxaVitoria.p1 / Math.max(1, stats.melhorTaxaVitoria.participacoes)) : 0))}</div>
            </div>
            <div className="card" style={{flex:"1 1 260px"}}>
              <div className="small">Maior taxa de pódio</div>
              <div className="kpi">{stats.melhorTaxaPodio?.nome ?? "-"}</div>
              <div className="small">{formatPct((stats.melhorTaxaPodio ? (stats.melhorTaxaPodio.podios / Math.max(1, stats.melhorTaxaPodio.participacoes)) : 0))}</div>
            </div>
          </div>

          <div style={{marginTop:12}}>
            <RankingTable rows={rows} hideEliminado={true} />
          </div>
        </>
      )}
    </div>
  );
}
