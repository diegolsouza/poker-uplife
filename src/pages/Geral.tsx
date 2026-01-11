import { useEffect, useMemo, useState } from "react";
import { getRankingGeral } from "../api/endpoints";
import type { RankingRow } from "../types";
import { RankingTable } from "../components/RankingTable";
import { formatPct } from "../utils/aggregate";
import { Carousel } from "../components/Carousel";

function safeDiv(a: number, b: number): number {
  if (!b) return 0;
  return a / b;
}

type TieStat = { winners: RankingRow[]; value: number };

function winnersText(t?: TieStat | null) {
  if (!t || !t.winners || t.winners.length === 0) return "-";
  return t.winners.map(x => x.nome).join(" • ");
}

function winnersStyle(t?: TieStat | null) {
  const n = t?.winners?.length ?? 0;
  if (n <= 1) return undefined;
  return { fontSize: 18, lineHeight: 1.15, fontWeight: 900 as const };
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
    const norm = (x: number) => Math.round(x * 1e6) / 1e6; // evita empate "quebrado" por float

    const byMaxTie = (f: (r: RankingRow) => number): TieStat => {
      let bestV = -Infinity;
      let winners: RankingRow[] = [];
      for (const r of eligible) {
        const v = norm(f(r));
        if (v > bestV) {
          bestV = v;
          winners = [r];
        } else if (v === bestV) {
          winners.push(r);
        }
      }
      return { winners, value: bestV === -Infinity ? 0 : bestV };
    };

    const maisRebuys = byMaxTie(r => r.rebuy_total + r.addon_total);
    const maisPart = byMaxTie(r => r.participacoes);
    const maisPodios = byMaxTie(r => r.podios);
    const maisTitulos = byMaxTie(r => r.p1);
    const maisMelhorMao = byMaxTie(r => r.melhor_mao);

    const melhorTaxaVitoria = byMaxTie(r => safeDiv(r.p1, r.participacoes));
    const melhorTaxaPodio = byMaxTie(r => safeDiv(r.podios, r.participacoes));

    // ✅ aproveitamento = pontos / participações
    const melhorAproveitamento = byMaxTie(r => safeDiv(r.pontos, r.participacoes));

    // ✅ eficiência = pontos / (participações + rebuys)  (addon não conta)
    const maiorEficienciaPontos = byMaxTie(r => safeDiv(r.pontos, r.participacoes + r.rebuy_total));

    return {
      maisRebuys,
      maisPart,
      maisPodios,
      maisTitulos,
      maisMelhorMao,
      melhorTaxaVitoria,
      melhorTaxaPodio,
      maiorEficienciaPontos,
      melhorAproveitamento
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

            {/* Desktop: efeito "imagem" (2º/1º/3º) */}
            <div className="podiumShowcase">
              {top5[1] && (
                <div className="podiumCardWide left podiumSilver">
                  <div className="podiumTrophy">🥈</div>
                  <div className="podiumLine1">2º LUGAR</div>
                  <div className="podiumLine2">{top5[1].nome}</div>
                  <div className="podiumPoints">
                    {top5[1].pontos} <span>pontos</span>
                  </div>
                </div>
              )}

              {top5[0] && (
                <div className="podiumCardWide center podiumGold">
                  <div className="podiumTrophy">🏆</div>
                  <div className="podiumLine1">1º LUGAR</div>
                  <div className="podiumLine2">{top5[0].nome}</div>
                  <div className="podiumPoints">
                    {top5[0].pontos} <span>pontos</span>
                  </div>
                </div>
              )}

              {top5[2] && (
                <div className="podiumCardWide right podiumBronze">
                  <div className="podiumTrophy">🥉</div>
                  <div className="podiumLine1">3º LUGAR</div>
                  <div className="podiumLine2">{top5[2].nome}</div>
                  <div className="podiumPoints">
                    {top5[2].pontos} <span>pontos</span>
                  </div>
                </div>
              )}
            </div>

            {/* Desktop: 4º e 5º */}
            <div className="podiumMinorRow">
              {top5[3] && (
                <div className="podiumMinor">
                  <div className="small">4º lugar</div>
                  <div style={{ fontWeight: 900, marginTop: 6 }}>{top5[3].nome}</div>
                  <div className="small" style={{ marginTop: 6 }}>
                    {top5[3].pontos} pts • {top5[3].participacoes} part.
                  </div>
                </div>
              )}
              {top5[4] && (
                <div className="podiumMinor">
                  <div className="small">5º lugar</div>
                  <div style={{ fontWeight: 900, marginTop: 6 }}>{top5[4].nome}</div>
                  <div className="small" style={{ marginTop: 6 }}>
                    {top5[4].pontos} pts • {top5[4].participacoes} part.
                  </div>
                </div>
              )}
            </div>

            {/* Mobile: carrossel Premium (swipe + bolinhas) */}
            <div className="podiumMobileOnly" style={{ marginTop: 12 }}>
              <Carousel title="" itemWidth="82vw" showArrows={false} showDots={true}>
                {top5.map((r, i) => {
                  const cls =
                    i === 0
                      ? "podiumCardWide podiumGold"
                      : i === 1
                        ? "podiumCardWide podiumSilver"
                        : i === 2
                          ? "podiumCardWide podiumBronze"
                          : "podiumCardWide";

                  return (
                    <div className={cls} key={r.id_jogador} style={{ position: "static" }}>
                      <div className="podiumTrophy">🏆</div>
                      <div className="podiumLine1">{i + 1}º LUGAR</div>
                      <div className="podiumLine2">{r.nome}</div>
                      <div className="podiumPoints">
                        {r.pontos} <span>pontos</span>
                      </div>
                      <div className="podiumLine3">{r.participacoes} participações</div>
                    </div>
                  );
                })}
              </Carousel>
            </div>

            <div className="small" style={{ marginTop: 10 }}>
              *Somente jogadores com <b>5+</b> participações entram no ranking geral e nas estatísticas.
            </div>
          </div>

          <div className="card" style={{ marginTop: 12 }}>
            <h3 className="cardTitle">Destaques</h3>

            <Carousel itemWidth="320px" showArrows={true} showDots={true}>
              {[
                <div className="card" key="rebuy">
                  <div className="small">Mais rebuy/add-on</div>
                  <div className="kpi" style={winnersStyle(stats.maisRebuys)}>
                    {winnersText(stats.maisRebuys)}
                  </div>
                  <div className="small">{(stats.maisRebuys?.value ?? 0)} ações</div>
                </div>,

                <div className="card" key="part">
                  <div className="small">Mais participações</div>
                  <div className="kpi" style={winnersStyle(stats.maisPart)}>
                    {winnersText(stats.maisPart)}
                  </div>
                  <div className="small">{stats.maisPart?.value ?? 0} participações</div>
                </div>,

                <div className="card" key="podios">
                  <div className="small">Mais pódios</div>
                  <div className="kpi" style={winnersStyle(stats.maisPodios)}>
                    {winnersText(stats.maisPodios)}
                  </div>
                  <div className="small">{stats.maisPodios?.value ?? 0} pódios</div>
                </div>,

                <div className="card" key="titulos">
                  <div className="small">Mais títulos (P1)</div>
                  <div className="kpi" style={winnersStyle(stats.maisTitulos)}>
                    {winnersText(stats.maisTitulos)}
                  </div>
                  <div className="small">{stats.maisTitulos?.value ?? 0} títulos</div>
                </div>,

                <div className="card" key="melhormao">
                  <div className="small">Mais melhor-mão</div>
                  <div className="kpi" style={winnersStyle(stats.maisMelhorMao)}>
                    {winnersText(stats.maisMelhorMao)}
                  </div>
                  <div className="small">{stats.maisMelhorMao?.value ?? 0} vezes</div>
                </div>,

                <div className="card" key="txvitoria">
                  <div className="small">Maior taxa de vitória</div>
                  <div className="kpi" style={winnersStyle(stats.melhorTaxaVitoria)}>
                    {winnersText(stats.melhorTaxaVitoria)}
                  </div>
                  <div className="small">{formatPct(stats.melhorTaxaVitoria?.value ?? 0)}</div>
                </div>,

                <div className="card" key="txpodio">
                  <div className="small">Maior taxa de pódio</div>
                  <div className="kpi" style={winnersStyle(stats.melhorTaxaPodio)}>
                    {winnersText(stats.melhorTaxaPodio)}
                  </div>
                  <div className="small">{formatPct(stats.melhorTaxaPodio?.value ?? 0)}</div>
                </div>,

                <div className="card" key="eficiencia">
                  <div className="small">Maior Eficiência de Pontos</div>
                  <div className="kpi" style={winnersStyle(stats.maiorEficienciaPontos)}>
                    {winnersText(stats.maiorEficienciaPontos)}
                  </div>
                  <div className="small">{(stats.maiorEficienciaPontos?.value ?? 0).toFixed(2)}</div>
                </div>,

                <div className="card" key="aprov">
                  <div className="small">Melhor aproveitamento (pontos/part.)</div>
                  <div className="kpi" style={winnersStyle(stats.melhorAproveitamento)}>
                    {winnersText(stats.melhorAproveitamento)}
                  </div>
                  <div className="small">{(stats.melhorAproveitamento?.value ?? 0).toFixed(2)}</div>
                </div>,
              ]}
            </Carousel>
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
