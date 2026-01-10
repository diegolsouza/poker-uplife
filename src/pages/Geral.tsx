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

  // ✅ filtro 5+ participações
  const eligible = useMemo(
    () => rows.filter(r => r.participacoes >= 5),
    [rows]
  );

  const top5 = useMemo(() => eligible.slice(0, 5), [eligible]);

  const stats = useMemo(() => {
    const byMax = (f: (r: RankingRow) => number) => {
      let best: RankingRow | null = null;
      let bestV = -Infinity;
      for (const r of eligible) {
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

    // ✅ novo: aproveitamento = pontos / participações
    const melhorAproveitamento = byMax(r => safeDiv(r.pontos, r.participacoes));

    return {
      maisRebuys, maisPart, maisPodios, maisTitulos, maisMelhorMao,
      melhorTaxaVitoria, melhorTaxaPodio, melhorAproveitamento
    };
  }, [eligible]);

  return (
    <div className="container">
      {error && (
        <div className="card" style={{ borderColor: "rgba(255,77,77,.35)" }}>
          <b>Erro:</b> {error}
        </div>
      )}

      {loading ? (
        <div className="card">Carregando…</div>
      ) : (
        <>
          <div className="card">
            <h3 className="cardTitle">Pódio geral (Top 5)</h3>

            <div className="podiumStage">
              {top5.map((r, i) => (
                <div
                  key={r.id_jogador}
                  className={[
                    "podiumStep",
                    i === 0 ? "gold" : "",
                    i === 1 ? "silver" : "",
                    i === 2 ? "bronze" : "",
                    `p${i + 1}`,
                  ].join(" ")}
                >
                  <div className="podiumRank">{i + 1}º</div>
                  <div className="podiumName2">{r.nome}</div>
                  <div className="podiumMeta">{r.pontos} pts • {r.participacoes} part.</div>
                </div>
              ))}
            </div>

            <div className="small" style={{ marginTop: 10 }}>
              *Somente jogadores com <b>5+</b> participações entram no ranking geral e nas estatísticas.
            </div>
          </div>

          <div className="row" style={{ marginTop: 12 }}>
            <div className="card" style={{ flex: "1 1 260px" }}>
              <div className="small">Mais rebuy/add-on</div>
              <div className="kpi">{stats.maisRebuys?.nome ?? "-"}</div>
              <div className="small">{(stats.maisRebuys?.rebuy_total ?? 0) + (stats.maisRebuys?.addon_total ?? 0)} ações</div>
            </div>

            <div className="card" style={{ flex: "1 1 260px" }}>
              <div className="small">Mais participações</div>
              <div className="kpi">{stats.maisPart?.nome ?? "-"}</div>
              <div className="small">{stats.maisPart?.participacoes ?? 0} participações</div>
            </div>

            <div className="card" style={{ flex: "1 1 260px" }}>
              <div className="small">Mais pódios</div>
              <div className="kpi">{stats.maisPodios?.nome ?? "-"}</div>
              <div className="small">{stats.maisPodios?.podios ?? 0} pódios</div>
            </div>

            <div className="card" style={{ flex: "1 1 260px" }}>
              <div className="small">Mais títulos (P1)</div>
              <div className="kpi">{stats.maisTitulos?.nome ?? "-"}</div>
              <div className="small">{stats.maisTitulos?.p1 ?? 0} títulos</div>
            </div>

            <div className="card" style={{ flex: "1 1 260px" }}>
              <div className="small">Mais melhor-mão</div>
              <div className="kpi">{stats.maisMelhorMao?.nome ?? "-"}</div>
              <div className="small">{stats.maisMelhorMao?.melhor_mao ?? 0} vezes</div>
            </div>

            <div className="card" style={{ flex: "1 1 260px" }}>
              <div className="small">Maior taxa de vitória</div>
              <div className="kpi">{stats.melhorTaxaVitoria?.nome ?? "-"}</div>
              <div className="small">
                {formatPct(stats.melhorTaxaVitoria ? (stats.melhorTaxaVitoria.p1 / Math.max(1, stats.melhorTaxaVitoria.participacoes)) : 0)}
              </div>
            </div>

            <div className="card" style={{ flex: "1 1 260px" }}>
              <div className="small">Maior taxa de pódio</div>
              <div className="kpi">{stats.melhorTaxaPodio?.nome ?? "-"}</div>
              <div className="small">
                {formatPct(stats.melhorTaxaPodio ? (stats.melhorTaxaPodio.podios / Math.max(1, stats.melhorTaxaPodio.participacoes)) : 0)}
              </div>
            </div>

            {/* ✅ novo card */}
            <div className="card" style={{ flex: "1 1 260px" }}>
              <div className="small">Melhor aproveitamento (pontos/part.)</div>
              <div className="kpi">{stats.melhorAproveitamento?.nome ?? "-"}</div>
              <div className="small">
                {stats.melhorAproveitamento
                  ? (stats.melhorAproveitamento.pontos / Math.max(1, stats.melhorAproveitamento.participacoes)).toFixed(2)
                  : "0.00"}
              </div>
            </div>
          </div>

          <div style={{ marginTop: 12 }}>
            {/* ✅ tabela geral com modo mobile-details */}
            <RankingTable rows={eligible} hideEliminado={true} mobileDetails={true} />
          </div>
        </>
      )}
    </div>
  );
}
