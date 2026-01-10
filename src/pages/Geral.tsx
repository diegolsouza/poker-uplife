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
          
            {/* Desktop: efeito "imagem" (2º/1º/3º) */}
            <div className="podiumShowcase">
              {top5[1] && (
                <div className="podiumCardWide left podiumSilver">
                  <div className="podiumTrophy">🏆</div>
                  <div className="podiumLine1">2º LUGAR</div>
                  <div className="podiumLine2">{top5[1].nome}</div>
                  <div className="podiumPoints">{top5[1].pontos} <span>pontos</span></div>
                </div>
              )}
          
              {top5[0] && (
                <div className="podiumCardWide center podiumGold">
                  <div className="podiumTrophy">🏆</div>
                  <div className="podiumLine1">1º LUGAR</div>
                  <div className="podiumLine2">{top5[0].nome}</div>
                  <div className="podiumPoints">{top5[0].pontos} <span>pontos</span></div>
                </div>
              )}
          
              {top5[2] && (
                <div className="podiumCardWide right podiumBronze">
                  <div className="podiumTrophy">🏆</div>
                  <div className="podiumLine1">3º LUGAR</div>
                  <div className="podiumLine2">{top5[2].nome}</div>
                  <div className="podiumPoints">{top5[2].pontos} <span>pontos</span></div>
                </div>
              )}
            </div>
          
            {/* Desktop: 4º e 5º */}
            <div className="podiumMinorRow">
              {top5[3] && (
                <div className="podiumMinor">
                  <div className="small">4º lugar</div>
                  <div style={{fontWeight:900, marginTop:6}}>{top5[3].nome}</div>
                  <div className="small" style={{marginTop:6}}>{top5[3].pontos} pts • {top5[3].participacoes} part.</div>
                </div>
              )}
              {top5[4] && (
                <div className="podiumMinor">
                  <div className="small">5º lugar</div>
                  <div style={{fontWeight:900, marginTop:6}}>{top5[4].nome}</div>
                  <div className="small" style={{marginTop:6}}>{top5[4].pontos} pts • {top5[4].participacoes} part.</div>
                </div>
              )}
            </div>
          
            {/* Mobile: carrossel Premium (swipe + bolinhas) */}
            <div className="podiumMobileOnly" style={{ marginTop: 12 }}>
              <Carousel
                title=""
                itemWidth="82vw"
                showArrows={false}
                showDots={true}
              >
                {top5.map((r, i) => {
                  const cls =
                    i === 0 ? "podiumCardWide podiumGold" :
                    i === 1 ? "podiumCardWide podiumSilver" :
                    i === 2 ? "podiumCardWide podiumBronze" :
                    "podiumCardWide";
          
                  return (
                    <div className={cls} key={r.id_jogador} style={{ position: "static" }}>
                      <div className="podiumTrophy">🏆</div>
                      <div className="podiumLine1">{i + 1}º LUGAR</div>
                      <div className="podiumLine2">{r.nome}</div>
                      <div className="podiumPoints">{r.pontos} <span>pontos</span></div>
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
                  <div className="kpi">{stats.maisRebuys?.nome ?? "-"}</div>
                  <div className="small">
                    {(stats.maisRebuys?.rebuy_total ?? 0) + (stats.maisRebuys?.addon_total ?? 0)} ações
                  </div>
                </div>,
          
                <div className="card" key="part">
                  <div className="small">Mais participações</div>
                  <div className="kpi">{stats.maisPart?.nome ?? "-"}</div>
                  <div className="small">{stats.maisPart?.participacoes ?? 0} participações</div>
                </div>,
          
                <div className="card" key="podios">
                  <div className="small">Mais pódios</div>
                  <div className="kpi">{stats.maisPodios?.nome ?? "-"}</div>
                  <div className="small">{stats.maisPodios?.podios ?? 0} pódios</div>
                </div>,
          
                <div className="card" key="titulos">
                  <div className="small">Mais títulos (P1)</div>
                  <div className="kpi">{stats.maisTitulos?.nome ?? "-"}</div>
                  <div className="small">{stats.maisTitulos?.p1 ?? 0} títulos</div>
                </div>,
          
                <div className="card" key="melhormao">
                  <div className="small">Mais melhor-mão</div>
                  <div className="kpi">{stats.maisMelhorMao?.nome ?? "-"}</div>
                  <div className="small">{stats.maisMelhorMao?.melhor_mao ?? 0} vezes</div>
                </div>,
          
                <div className="card" key="txvitoria">
                  <div className="small">Maior taxa de vitória</div>
                  <div className="kpi">{stats.melhorTaxaVitoria?.nome ?? "-"}</div>
                  <div className="small">
                    {formatPct(
                      stats.melhorTaxaVitoria
                        ? stats.melhorTaxaVitoria.p1 / Math.max(1, stats.melhorTaxaVitoria.participacoes)
                        : 0
                    )}
                  </div>
                </div>,
          
                <div className="card" key="txpodio">
                  <div className="small">Maior taxa de pódio</div>
                  <div className="kpi">{stats.melhorTaxaPodio?.nome ?? "-"}</div>
                  <div className="small">
                    {formatPct(
                      stats.melhorTaxaPodio
                        ? stats.melhorTaxaPodio.podios / Math.max(1, stats.melhorTaxaPodio.participacoes)
                        : 0
                    )}
                  </div>
                </div>,
          
                <div className="card" key="aprov">
                  <div className="small">Melhor aproveitamento (pontos/part.)</div>
                  <div className="kpi">{stats.melhorAproveitamento?.nome ?? "-"}</div>
                  <div className="small">
                    {stats.melhorAproveitamento
                      ? (stats.melhorAproveitamento.pontos / Math.max(1, stats.melhorAproveitamento.participacoes)).toFixed(2)
                      : "0.00"}
                  </div>
                </div>,
              ]}
            </Carousel>
          
            <div className="small" style={{ marginTop: 10 }}>
              No mobile, arraste para o lado. No desktop, use as setas.
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
