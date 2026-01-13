import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { getJogador, getRankingGeral } from "../api/endpoints";
import { formatMoneyBRL, formatPct } from "../utils/aggregate";

/**
 * Eficiência de Pontos (opção A):
 * eficiência = pontos / (participações + rebuys)
 *
 * OBS: O endpoint "jogador" em modo ALL/ALL (api_public_jogador_all) não retorna rebuys por temporada.
 * Então, no resumo por temporada, usamos denom = participações (rebuys=0) para não travar a UI.
 * Na tabela rodada-a-rodada (últimas 2 temporadas) usamos o endpoint de temporada específica,
 * que traz rebuy/addon e pontos por rodada.
 */
function calcEficienciaApprox(pontos: number, participacoes: number) {
  const denom = (participacoes || 0);
  return denom > 0 ? (pontos || 0) / denom : 0;
}

function formatDateBR(input: string | null | undefined) {
  if (!input) return "—";
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return String(input);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

function seasonKey(ano: string, temporada: string) {
  return `${ano}-${temporada}`;
}

function parseSeason(temporada: string) {
  const m = String(temporada || "").match(/(\d+)/);
  return m ? Number(m[1]) : 0;
}

function normalizeTemporada(t: string) {
  const s = String(t || "").trim();
  if (!s) return s;
  // Se vier "1" ao invés de "T1", normaliza para "T1"
  if (/^\d+$/.test(s)) return `T${s}`;
  if (/^t\d+$/i.test(s)) return `T${s.replace(/\D/g, "")}`;
  return s;
}

function sortSeasonsDesc(keys: string[]) {
  return [...keys].sort((a, b) => {
    const [ay, at] = a.split("-");
    const [by, bt] = b.split("-");
    const ya = Number(ay);
    const yb = Number(by);
    if (ya !== yb) return yb - ya;
    return parseSeason(bt) - parseSeason(at);
  });
}

// Empate de posição (mesmo critério do RankingTable: todos os campos numéricos iguais)
function isTieRow(a: any, b: any): boolean {
  const keys = [
    "pontos",
    "p1","p2","p3","p4","p5","p6","p7","p8","p9",
    "serie_b",
    "fora_mesa_final",
    "podios",
    "melhor_mao",
    "rebuy_total",
    "addon_total",
    "participacoes",
  ];
  for (const k of keys) {
    if (Number(a?.[k] ?? 0) !== Number(b?.[k] ?? 0)) return false;
  }
  return true;
}

function computeDisplayRanks(rows: any[]): number[] {
  const ranks: number[] = [];
  for (let i = 0; i < rows.length; i++) {
    if (i > 0 && isTieRow(rows[i], rows[i - 1])) ranks.push(ranks[i - 1]);
    else ranks.push(i + 1);
  }
  return ranks;
}


export function Jogador() {
  const { id = "" } = useParams();

  const baseUrl = import.meta.env.BASE_URL || "/";
  const fotoJogador = `${baseUrl}players/${id}.png`;
  const fotoPadrao = `${baseUrl}players/default.png`;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // resposta do ALL/ALL (api_public_jogador_all)
  const [allData, setAllData] = useState<any>(null);

  const [geralPos, setGeralPos] = useState<number | null>(null);
  const [geralPontos, setGeralPontos] = useState<number>(0);

  // histórico das últimas 2 temporadas (api_public_jogador_season)
  const [seasonHists, setSeasonHists] = useState<Record<string, any[]>>({});
  const [roundsLoading, setRoundsLoading] = useState(false);

  // 1) Carrega o "resumo geral" (todos os anos/temporadas) – rápido
  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        setLoading(true);
        setError(null);

        // IMPORTANTÍSSIMO: temporada=ALL aciona api_public_jogador_all (todas as temporadas)
        const r = await getJogador("ALL", "ALL", id);
        const payload = (r && (r.data ?? r)) ?? null;

        setAllData(payload);
      } catch (e: any) {
        setError(e?.message ?? "Erro ao carregar jogador");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  // Ranking geral: posição do jogador no ranking (considera empates)
  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const rows = await getRankingGeral();
        const ranks = computeDisplayRanks(rows);
        const idx = rows.findIndex((r: any) => r.id_jogador === id);
        if (idx >= 0) {
          setGeralPos(ranks[idx]);
          setGeralPontos(Number(rows[idx]?.pontos ?? 0));
        } else {
          setGeralPos(null);
          setGeralPontos(0);
        }
      } catch {
        setGeralPos(null);
        setGeralPontos(0);
      }
    })();
  }, [id]);


  const resumo = useMemo(() => (allData?.resumo_por_temporada ?? []) as any[], [allData]);
  const totalGeral = useMemo(() => allData?.total_geral ?? null, [allData]);

  // Nome / ID
  const jogadorNome = useMemo(() => allData?.jogador?.nome ?? id ?? "Jogador", [allData, id]);

  // Melhor campanha (aprox. no ALL/ALL): maior (pontos/participações) no resumo
  const bestCampaign = useMemo(() => {
    if (!resumo.length) return null;
    let best: { ano: string; temporada: string; eff: number } | null = null;
    for (const s of resumo) {
      const ano = String(s.ano || "").trim();
      const temporada = String(s.temporada || "").trim();
      if (!ano || !temporada) continue;
      const eff = calcEficienciaApprox(Number(s.pontos || 0), Number(s.participacoes || 0));
      if (!best || eff > best.eff) best = { ano, temporada, eff };
    }
    return best;
  }, [resumo]);

  // Joga desde: precisamos do dado por rodada. Como ALL/ALL não traz histórico por rodada,
  // calculamos "joga desde" pegando a menor data nas duas últimas temporadas carregadas;
  // e, se não houver, mostramos "—".
  const jogaDesde = useMemo(() => {
    return allData?.jogador?.joga_desde ?? null;
  }, [allData]);

  // KPIs do topo (ALL/ALL): participações totais, etc.
  const participacoes = Number(allData?.jogador?.participacoes ?? totalGeral?.participacoes ?? 0);

  // Pódios e melhores mãos: no ALL/ALL, o resumo não traz esses totais detalhados.
  // A solução mais correta é somar por temporada usando os campos do resumo (se existirem).
  const podios = useMemo(() => {
    // se tiver podios no resumo, soma. senão fallback 0.
    const has = resumo.some(s => s.podios != null);
    if (!has) return 0;
    return resumo.reduce((acc, s) => acc + Number(s.podios || 0), 0);
  }, [resumo]);

  const melhoresMaos = useMemo(() => {
    const has = resumo.some(s => s.melhor_mao != null);
    if (!has) return 0;
    return resumo.reduce((acc, s) => acc + Number(s.melhor_mao || 0), 0);
  }, [resumo]);

  const vitorias = useMemo(() => {
    const has = resumo.some(s => s.p1 != null);
    if (!has) return 0;
    return resumo.reduce((acc, s) => acc + Number(s.p1 || 0), 0);
  }, [resumo]);

  const taxaVitoria = participacoes ? vitorias / participacoes : 0;


  const totalRebuys = useMemo(() => {
    const has = resumo.some(s => s.rebuy_total != null);
    if (!has) return 0;
    return resumo.reduce((acc, s) => acc + Number(s.rebuy_total || 0), 0);
  }, [resumo]);

  const taxaPodio = participacoes ? (podios / participacoes) : 0;

  const aproveitamento = participacoes ? (geralPontos / participacoes) : 0;

  // Financeiro (ALL/ALL)
  const totalPago = Number(totalGeral?.total_pagar ?? 0);
  const totalRecebido = Number(totalGeral?.total_receber ?? 0);
  const saldo = Number(totalGeral?.saldo ?? (totalRecebido - totalPago));

  // 2) Carrega apenas as ÚLTIMAS 2 temporadas (rodada-a-rodada) – no máximo 2 requests
  const last2 = useMemo(() => {
    if (!resumo.length) return [];
    const keys = resumo
      .map(s => {
        const ano = String(s.ano || "").trim();
        const temporada = String(s.temporada || "").trim();
        return ano && temporada ? seasonKey(ano, temporada) : "";
      })
      .filter(Boolean);

    const unique = Array.from(new Set(keys));
    const sorted = sortSeasonsDesc(unique);
    return sorted.slice(0, 2);
  }, [resumo]);

  useEffect(() => {
    if (!id) return;
    if (!last2.length) {
      setSeasonHists({});
      return;
    }

    (async () => {
      try {
        setRoundsLoading(true);

        const parts = await Promise.all(
  last2.map(async (k) => {
   	const [ano, temporadaRaw] = k.split("-");
    const temporada = normalizeTemporada(temporadaRaw);
    const r = await getJogador(ano, temporada, id); // api_public_jogador_season (inclui historico e financeiro do período)
    const payload = (r && (r.data ?? r)) ?? null;
    const hist = (payload?.historico ?? []) as any[];
    return {
      key: k,
      hist: hist.map((x) => ({ ...x, ano, temporada })),
    };
  })
);

const map: Record<string, any[]> = {};
parts.forEach((p) => (map[p.key] = p.hist));
setSeasonHists(map);
      } catch {
        setSeasonHists({});
      } finally {
        setRoundsLoading(false);
      }
    })();
  }, [id, last2]);

  // 3) Gráfico (últimas temporadas): usa o resumo ALL/ALL (rápido) com posicao + eficiencia aprox
  const chartRows = useMemo(() => {
    if (!resumo.length) return [];
    const keys = resumo
      .map(s => {
        const ano = String(s.ano || "").trim();
        const temporada = String(s.temporada || "").trim();
        return ano && temporada ? seasonKey(ano, temporada) : "";
      })
      .filter(Boolean);

    const unique = Array.from(new Set(keys));
    const sorted = sortSeasonsDesc(unique).slice(0, 8).reverse(); // últimas 8, ordem crescente no gráfico

    const map = new Map<string, any>();
    for (const s of resumo) {
      const k = seasonKey(String(s.ano || "").trim(), String(s.temporada || "").trim());
      map.set(k, s);
    }

    return sorted.map(k => {
      const s = map.get(k);
      const pontos = Number(s?.pontos || 0);
      const part = Number(s?.participacoes || 0);
      const eficiencia = calcEficienciaApprox(pontos, part);
      const pos = (s?.posicao !== "" && s?.posicao != null) ? Number(s.posicao) : null;
      return { key: k, label: k, eficiencia, pos };
    });
  }, [resumo]);

  const chart = useMemo(() => {
    if (!chartRows.length) return null;

    const maxE = Math.max(...chartRows.map((r) => r.eficiencia), 0.0001);

    // Para posição: quanto MENOR melhor (1º é melhor). Vamos inverter a escala no eixo Y.
    const posVals = chartRows
      .map((r) => (r.pos == null ? null : Number(r.pos)))
      .filter((v) => v != null) as number[];
    const maxPos = posVals.length ? Math.max(...posVals, 1) : 1;

    const w = 720;
    const h = 220;
    const padX = 44;
    const padY = 26;

    const ptsE = chartRows.map((r, i) => {
      const x = padX + (i * (w - padX * 2)) / Math.max(1, chartRows.length - 1);
      const y = h - padY - (r.eficiencia / maxE) * (h - padY * 2);
      return { x, y, r };
    });

    const ptsP = chartRows.map((r, i) => {
      const x = padX + (i * (w - padX * 2)) / Math.max(1, chartRows.length - 1);

      // Se não tiver posição nessa temporada, deixa fora do gráfico
      if (r.pos == null) return { x, y: NaN, r };

      // Mapeia posição 1..maxPos para Y (invertido: 1 no topo)
      const norm = (Number(r.pos) - 1) / Math.max(1, maxPos - 1); // 0..1
      const y = padY + norm * (h - padY * 2);
      return { x, y, r };
    });

    const polyE = ptsE.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");

    const polyP = ptsP
      .filter((p) => Number.isFinite(p.y))
      .map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`)
      .join(" ");

    return { w, h, ptsE, ptsP, polyE, polyP, maxPos };
  }, [chartRows]);

  // 4) Gráficos "Rodada a Rodada" (temporada atual e anterior)
  const roundCharts = useMemo(() => {
    const pad = 28;
    const h = 260;

    return last2.map((k) => {
      const hist = (seasonHists[k] ?? [])
        .slice()
        .sort((a: any, b: any) => String(a.id_rodada ?? "").localeCompare(String(b.id_rodada ?? "")));

      const w = Math.max(560, hist.length * 90 + 120);

      const values = hist.map((x: any) => Number(x.pontos_acumulados ?? x.pontos_rodada ?? x.pontos ?? 0));
      const maxVal = Math.max(1, ...values);
      const isCurrent = k === last2[0];  
      const lastPos = (() => {
        if (!hist.length) return null;
        const v = String((hist[hist.length - 1] as any).posicao_ranking ?? "").trim();
        const n = v ? Number(v) : NaN;
        return Number.isFinite(n) ? n : null;
      })();
      const pts = hist.map((x: any, i: number) => {
        const rodadaFull = String(x.rodada ?? x.id_rodada ?? "");
        const rodada = rodadaFull.includes("-") ? rodadaFull.split("-").pop() : rodadaFull;
        const xPos =
          hist.length <= 1
            ? pad
            : pad + (i * (w - pad * 2)) / (hist.length - 1);

        const val = Number(x.pontos_acumulados ?? x.pontos_rodada ?? x.pontos ?? 0);
        const yPos = h - pad - (val / maxVal) * (h - pad * 2);

        const col = String(x.posicao_ranking ?? "").trim();
        const colTxt = col ? `${col}º` : "—";
      
return {
          x: xPos,
          y: yPos,
          rodada: String(rodada ?? "").padStart(2, "0"),
          label: `${val}pts - ${colTxt}`,
        };
      });

      const poly = pts.map((p) => `${p.x},${p.y}`).join(" ");

      return {
        key: k,
        isCurrent,
        lastPos,
        title: (() => { const [ay, at] = k.split('-'); return `Temporada ${ay}-${normalizeTemporada(at)}`; })(),
        w,
        h,
        pad,
        pts,
        poly,
      };
    });
  }, [last2, seasonHists]);
  if (loading) return <div className="card">Carregando…</div>;
  if (error) return <div className="card"><b>Erro:</b> {error}</div>;
  if (!allData?.jogador) return <div className="card">Jogador não encontrado.</div>;

  return (
    <div className="container">
      {/* Cabeçalho do perfil */}
      <div className="card">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
          <div style={{ minWidth: 240, flex: "1 1 320px" }}>
            <div style={{ fontSize: 28, fontWeight: 900, letterSpacing: 0.2 }}>{jogadorNome}</div>

            <div style={{ marginTop: 10, display: "flex", gap: 12, flexWrap: "wrap" }}>
              <div className="chip">
                <b>Joga desde:</b> {formatDateBR(jogaDesde)}
              </div>
              <div className="chip">
                <b>Participações:</b> {participacoes}
              </div>
              <div className="chip">
                <b>Melhor campanha:</b>{" "}
                {bestCampaign ? `${bestCampaign.ano}-${bestCampaign.temporada}` : "—"}
              </div>
            </div>
          </div>

          <div
            style={{
              width: 132,
              height: 132,
              borderRadius: 18,
              overflow: "hidden",
              border: "1px solid rgba(229,230,234,.18)",
              background: "rgba(255,255,255,.04)",
            }}
          >
            <img
              src={fotoJogador}
              alt={jogadorNome}
              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
              onError={(e) => {
                const img = e.currentTarget as HTMLImageElement;
                if (img.src.endsWith("/default.png")) return;
                img.src = fotoPadrao;
              }}
            />
          </div>
        </div>
      </div>

            {/* Bloco 2: desempenho */}
      <div className="row" style={{ marginTop: 12 }}>
        <div className="card" style={{ flex: "1 1 220px" }}>
          <div className="small">Ranking geral</div>
          <div className="kpi">{geralPos != null ? `${geralPos}º` : "—"}</div>
          <div className="small">Posição no ranking geral</div>
        </div>
		<div className="card" style={{ flex: "1 1 220px" }}>
          <div className="small">Aproveitamento</div>
          <div className="kpi">{aproveitamento.toFixed(2)}</div>
          <div className="small">Pontos (geral) ÷ participações</div>
        </div>
        <div className="card" style={{ flex: "1 1 220px" }}>
          <div className="small">Taxa de vitória</div>
          <div className="kpi">{formatPct(taxaVitoria)}</div>
          <div className="small">{vitorias} vitórias</div>
        </div>
		<div className="card" style={{ flex: "1 1 220px" }}>
          <div className="small">Pódios (1º–5º)</div>
          <div className="kpi" style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
            <span>{podios}</span>
            <span className="small" style={{ opacity: 0.9 }}>({formatPct(taxaPodio)})</span>
          </div>
          <div className="small">Em {participacoes} participações</div>
        </div>
        <div className="card" style={{ flex: "1 1 220px" }}>
          <div className="small">Melhores mãos</div>
          <div className="kpi">{melhoresMaos}</div>
          <div className="small">Total histórico</div>
        </div>
        <div className="card" style={{ flex: "1 1 220px" }}>
          <div className="small">Rebuys (total)</div>
          <div className="kpi">{totalRebuys}</div>
          <div className="small">Somando todas as temporadas</div>
        </div>
      </div>
{/* Bloco 3: financeiro (ALL/ALL) */}
      {false && (
        <div className="row" style={{ marginTop: 12 }}>
          <div className="card" style={{ flex: "1 1 220px" }}>
            <div className="small">Total pago</div>
            <div className="kpi">{formatMoneyBRL(totalPago)}</div>
            <div className="small">Buy-in + rebuys/add-ons + rateios</div>
          </div>
          <div className="card" style={{ flex: "1 1 220px" }}>
            <div className="small">Total recebido</div>
            <div className="kpi">{formatMoneyBRL(totalRecebido)}</div>
            <div className="small">Premiações</div>
          </div>
          <div className="card" style={{ flex: "1 1 220px" }}>
            <div className="small">Saldo total</div>
            <div className={"kpi " + (saldo >= 0 ? "moneyPos" : "moneyNeg")}>
              {formatMoneyBRL(saldo)}
            </div>
            <div className="small">Recebeu − Pagou</div>
          </div>
        </div>
      )}
{/* Gráfico */}
      <div className="card" style={{ marginTop: 12 }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontWeight: 900, fontSize: 18 }}>Evolução nas últimas temporadas</div>
            <div className="small">
              Linha laranja: <b>Eficiência</b> (pontos/participações) • Linha azul: <b>Posição final</b> (1º melhor)
            </div>
          </div>
          <div className="chip">
            <b>Eficiência geral:</b>{" "}
            {calcEficienciaApprox(Number(totalGeral?.pontos || 0), Number(totalGeral?.participacoes || 0)).toFixed(2)}
          </div>
        </div>

        {!chart ? (
          <div className="small" style={{ marginTop: 10 }}>Sem dados suficientes para o gráfico.</div>
        ) : (
          <div style={{ marginTop: 10 }}>
            <svg width="100%" height={chart.h} viewBox={`0 0 ${chart.w} ${chart.h}`} style={{ display: "block" }}>
              <line x1="44" y1={chart.h - 26} x2={chart.w - 44} y2={chart.h - 26} stroke="rgba(229,230,234,.25)" />
              <line x1="44" y1="26" x2="44" y2={chart.h - 26} stroke="rgba(229,230,234,.25)" />

              <polyline fill="none" stroke="#f84501" strokeWidth="3" points={chart.polyE} />

              {/* Linha da posição final (escala invertida: 1º é melhor) */}
              <polyline fill="none" stroke="#409fc2" strokeWidth="3" points={chart.polyP} />

              {chart.ptsE.map((p) => {
                const pPos = chart.ptsP.find((pp) => pp.r.key === p.r.key);
                const hasPos = pPos && Number.isFinite(pPos.y);

                return (
                  <g key={p.r.key}>
                    {/* Eficiência */}
                    <circle cx={p.x} cy={p.y} r="5" fill="#ffffff" stroke="#f84501" strokeWidth="3" />
					{/* Valor da eficiência */}
					<text
					  x={p.x}
					  y={p.y + 18}
					  textAnchor="middle"
					  fontSize="11"
					  fill="rgba(229,230,234,.95)"
					  fontWeight="900"
					>
					  {p.r.eficiencia.toFixed(2)}
					</text>
                    {/* Posição (quando existir) */}
                    {hasPos && (
                      <circle cx={p.x} cy={pPos!.y} r="5" fill="#ffffff" stroke="#409fc2" strokeWidth="3" />
                    )}

                    {p.r.pos != null && hasPos && (
                      <text
                        x={p.x}
                        y={pPos!.y - 10}
                        textAnchor="middle"
                        fontSize="12"
                        fill="rgba(229,230,234,.95)"
                        fontWeight="900"
                      >
                        {p.r.pos}º
                      </text>
                    )}

                    <text x={p.x} y={chart.h - 10} textAnchor="middle" fontSize="11" fill="rgba(229,230,234,.75)">
                      {p.r.label}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        )}
      </div>

     {/* Rodada a rodada (gráficos) */}
      {roundsLoading ? (
        <div className="card" style={{ marginTop: 12 }}>
          <div style={{ fontWeight: 900, fontSize: 18 }}>Rodada a Rodada</div>
          <div className="small" style={{ marginTop: 10 }}>Carregando rodadas…</div>
        </div>
      ) : (
        roundCharts.map((rc) => (
          <div key={rc.key} className="card" style={{ marginTop: 12 }}>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
                <div style={{ fontWeight: 900, fontSize: 18 }}>{rc.title}</div>
                <div className="small" style={{ fontWeight: 900, opacity: 0.95 }}>
                  {rc.isCurrent
                    ? `Colocação atual: ${rc.lastPos ? rc.lastPos + "º" : "—"}`
                    : `Colocação final: ${rc.lastPos ? rc.lastPos + "º" : "—"}`}
                </div>
              </div>
            <div className="small">Eixo X: número da rodada. Linha: pontos acumulados. Label: &lt;pontos acumulados&gt;pts - &lt;posição no ranking&gt;.</div>

            {!rc.pts.length ? (
				<div className="small" style={{ marginTop: 10 }}>Sem dados nesta temporada.</div>
            ) : (
              <div style={{ marginTop: 10 }}>
                <svg viewBox={`0 0 ${rc.w} ${rc.h}`} width={rc.w} height={260} style={{ display: "block" }} role="img" aria-label={rc.title}>
                  {/* eixos */}
                  <line x1={rc.pad} y1={rc.h - rc.pad} x2={rc.w - rc.pad} y2={rc.h - rc.pad} stroke="rgba(229,230,234,.35)" />
                  <line x1={rc.pad} y1={rc.pad} x2={rc.pad} y2={rc.h - rc.pad} stroke="rgba(229,230,234,.35)" />

                  {/* linha */}
                  <polyline fill="none" stroke="#f84501" strokeWidth="3" points={rc.poly} />

                  {/* pontos + labels */}
                  {rc.pts.map((p, idx) => (
                    <g key={idx}>
                      <circle cx={p.x} cy={p.y} r="5" fill="#f84501" />
                      <text x={p.x} y={p.y - 10} textAnchor="middle" fontSize="11" fill="rgba(229,230,234,.9)">
                        {p.label}
                      </text>
                      <text x={p.x} y={rc.h - 10} textAnchor="middle" fontSize="11" fill="rgba(229,230,234,.75)">
                        {p.rodada}
                      </text>
                    </g>
                  ))}
                </svg>
				  
              </div>
            )}
          </div>
        ))
      )}

      <div className="small" style={{ marginTop: 10, opacity: 0.85 }}>
        Se quiser remover ou substituir sua foto, entre em contato.
      </div>
    </div>
  );
}
