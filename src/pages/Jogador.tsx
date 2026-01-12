import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { getAnosTemporadas, getJogador, getRankingTemporada } from "../api/endpoints";
import type { AnoTemporada, RankingRow } from "../types";
import { formatMoneyBRL, formatPct } from "../utils/aggregate";

/**
 * Critério de "Eficiência de Pontos" (opção A combinada):
 * eficiência = pontos / (participações + rebuys)
 * - addon NÃO entra no denominador
 * - cada rebuy equivale a 1 participação (no denominador)
 */
function calcEficiencia(pontos: number, participacoes: number, rebuys: number) {
  const denom = (participacoes || 0) + (rebuys || 0);
  return denom > 0 ? (pontos || 0) / denom : 0;
}

function minDateISO(dates: string[]): string | null {
  const valid = dates.filter(Boolean).sort();
  return valid.length ? valid[0] : null;
}

function seasonKey(ano: string, temporada: string) {
  return `${ano}-${temporada}`;
}

function parseSeason(temporada: string) {
  const m = temporada.match(/(\d+)/);
  return m ? Number(m[1]) : 0;
}

function sortSeasonKeys(keys: string[]) {
  return [...keys].sort((a, b) => {
    const [ay, at] = a.split("-");
    const [by, bt] = b.split("-");
    const ya = Number(ay);
    const yb = Number(by);
    if (ya !== yb) return ya - yb;
    return parseSeason(at) - parseSeason(bt);
  });
}

// Empate de posição no ranking (mesmo critério usado no RankingTable)
function isTieRow(a: RankingRow, b: RankingRow): boolean {
  const keys: (keyof RankingRow)[] = [
    "pontos",
    "p1",
    "p2",
    "p3",
    "p4",
    "p5",
    "p6",
    "p7",
    "p8",
    "p9",
    "serie_b",
    "fora_mesa_final",
    "podios",
    "melhor_mao",
    "rebuy_total",
    "addon_total",
    "participacoes",
  ];
  for (const k of keys) {
    // @ts-expect-error numeric compare
    if ((a[k] || 0) !== (b[k] || 0)) return false;
  }
  return true;
}

function computeDisplayRanks(rows: RankingRow[]): number[] {
  const ranks: number[] = [];
  for (let i = 0; i < rows.length; i++) {
    if (i > 0 && isTieRow(rows[i], rows[i - 1])) ranks.push(ranks[i - 1]);
    else ranks.push(i + 1);
  }
  return ranks;
}

export function Jogador() {
  const params = useParams();
  const [sp] = useSearchParams();

  // ✅ robusto: funciona mesmo se a rota usar outro nome de param
  const id = (params as any).id ?? (params as any).id_jogador ?? (params as any).playerId ?? "";

  // (Opcional) se chegar com ?ano=...&temporada=..., usa para a chamada do backend
  // Isso evita "Jogador não encontrado" caso a API não suporte ALL/ALL em algumas versões.
  const urlAno = sp.get("ano") ?? "ALL";
  const urlTemporada = sp.get("temporada") ?? "ALL";

  const [options, setOptions] = useState<AnoTemporada[]>([]);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Base URL do GitHub Pages (ex.: /poker-uplife/)
  const baseUrl = import.meta.env.BASE_URL || "/";

  // ✅ Foto do jogador e fallback padrão
  const fotoJogador = `${baseUrl}players/${id}.png`;
  const fotoPadrao = `${baseUrl}players/default.png`;

  useEffect(() => {
    (async () => {
      try {
        const opts = await getAnosTemporadas();
        setOptions(opts);
      } catch {
        // ok
      }
    })();
  }, []);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        setLoading(true);
        setError(null);

        // tenta com os params da URL (se existirem), senão ALL/ALL
        const r = await getJogador(urlAno, urlTemporada, id);

        // alguns backends retornam { data: ... }
        const payload = (r && (r.data ?? r)) ?? null;

        setData(payload);
      } catch (e: any) {
        setError(e?.message ?? "Erro ao carregar jogador");
      } finally {
        setLoading(false);
      }
    })();
  }, [id, urlAno, urlTemporada]);

  const historico = useMemo(() => (data?.historico ?? []).filter((h: any) => h?.participou), [data]);

  const jogadorNome = data?.jogador?.nome ?? data?.nome ?? id ?? "Jogador";

  const profile = useMemo(() => {
    const participou = historico;
    const jogadorDesde = minDateISO(participou.map((h: any) => h.data));

    const totals = participou.reduce(
      (acc: any, h: any) => {
        acc.participacoes += 1;
        acc.podios += h.colocacao >= 1 && h.colocacao <= 5 ? 1 : 0;
        acc.vitorias += h.colocacao === 1 ? 1 : 0;
        acc.melhorMao += h.melhor_mao ? 1 : 0;
        acc.rebuy += h.rebuy || 0;
        acc.addon += h.addon || 0;
        acc.pagou += h.pagou || 0;
        acc.recebeu += h.recebeu || 0;
        acc.pontos += h.pontos || 0;
        return acc;
      },
      { participacoes: 0, podios: 0, vitorias: 0, melhorMao: 0, rebuy: 0, addon: 0, pagou: 0, recebeu: 0, pontos: 0 }
    );

    const saldo = totals.recebeu - totals.pagou;
    const taxaVitoria = totals.participacoes ? totals.vitorias / totals.participacoes : 0;
    const eficienciaGeral = calcEficiencia(totals.pontos, totals.participacoes, totals.rebuy);

    return { jogadorDesde, totals, saldo, taxaVitoria, eficienciaGeral };
  }, [historico]);

  // Melhor campanha: temporada com maior eficiência
  const bestCampaign = useMemo(() => {
    const bySeason = new Map<string, { ano: string; temporada: string; pontos: number; part: number; rebuys: number }>();

    for (const h of historico as any[]) {
      const key = seasonKey(h.ano, h.temporada);
      const cur = bySeason.get(key) ?? { ano: h.ano, temporada: h.temporada, pontos: 0, part: 0, rebuys: 0 };
      cur.pontos += h.pontos || 0;
      cur.part += 1;
      cur.rebuys += h.rebuy || 0;
      bySeason.set(key, cur);
    }

    let best: { ano: string; temporada: string; eficiencia: number } | null = null;
    for (const v of bySeason.values()) {
      const e = calcEficiencia(v.pontos, v.part, v.rebuys);
      if (!best || e > best.eficiencia) best = { ano: v.ano, temporada: v.temporada, eficiencia: e };
    }
    return best;
  }, [historico]);

  const seasonsPlayed = useMemo(() => {
    const set = new Set<string>();
    for (const h of historico as any[]) set.add(seasonKey(h.ano, h.temporada));
    return sortSeasonKeys(Array.from(set));
  }, [historico]);

  const last2Seasons = useMemo(() => seasonsPlayed.slice(-2), [seasonsPlayed]);
  const lastSeasonsForChart = useMemo(() => seasonsPlayed.slice(-6), [seasonsPlayed]);

  // Gráfico: eficiência + posição final
  const [chartRows, setChartRows] = useState<Array<{ key: string; label: string; eficiencia: number; pos: number | null }>>([]);

  useEffect(() => {
    if (!id) return;

    (async () => {
      try {
        const effBySeason = new Map<string, number>();
        for (const key of lastSeasonsForChart) {
          const [ano, temporada] = key.split("-");
          const hs = (historico as any[]).filter(h => h.ano === ano && h.temporada === temporada);
          const pontos = hs.reduce((s, r) => s + (r.pontos || 0), 0);
          const part = hs.length;
          const rebuys = hs.reduce((s, r) => s + (r.rebuy || 0), 0);
          effBySeason.set(key, calcEficiencia(pontos, part, rebuys));
        }

        const out: Array<{ key: string; label: string; eficiencia: number; pos: number | null }> = [];
        for (const key of lastSeasonsForChart) {
          const [ano, temporada] = key.split("-");
          const label = `${ano}-${temporada}`;
          const eficiencia = effBySeason.get(key) ?? 0;

          let pos: number | null = null;
          try {
            const rows = await getRankingTemporada(ano, temporada);
            const ranks = computeDisplayRanks(rows);
            const idx = rows.findIndex(r => r.id_jogador === id);
            if (idx >= 0) pos = ranks[idx];
          } catch {}

          out.push({ key, label, eficiencia, pos });
        }

        setChartRows(out);
      } catch {
        setChartRows([]);
      }
    })();
  }, [id, historico, lastSeasonsForChart]);

  const chart = useMemo(() => {
    if (!chartRows.length) return null;

    const maxE = Math.max(...chartRows.map(r => r.eficiencia), 0.0001);
    const w = 720;
    const h = 220;
    const padX = 44;
    const padY = 26;

    const pts = chartRows.map((r, i) => {
      const x = padX + (i * (w - padX * 2)) / Math.max(1, chartRows.length - 1);
      const y = h - padY - (r.eficiencia / maxE) * (h - padY * 2);
      return { x, y, r };
    });

    const poly = pts.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
    return { w, h, pts, poly };
  }, [chartRows]);

  // Rodada a rodada (últimas 2 temporadas)
  const lastRounds = useMemo(() => {
    const keys = new Set(last2Seasons);
    return (historico as any[])
      .filter(h => keys.has(seasonKey(h.ano, h.temporada)))
      .sort((a, b) => (b.data || "").localeCompare(a.data || ""));
  }, [historico, last2Seasons]);

  if (loading) return <div className="card">Carregando…</div>;
  if (error) return <div className="card"><b>Erro:</b> {error}</div>;

  // ✅ Agora consideramos "encontrado" se houver histórico OU nome no payload
  const hasPlayer = Boolean(id) && (Boolean(data?.jogador) || Boolean(data?.nome) || historico.length > 0);
  if (!hasPlayer) return <div className="card">Jogador não encontrado.</div>;

  return (
    <div className="container">
      {/* Cabeçalho do perfil */}
      <div className="card">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
          <div style={{ minWidth: 240, flex: "1 1 320px" }}>
            <div style={{ fontSize: 28, fontWeight: 900, letterSpacing: 0.2 }}>{jogadorNome}</div>

            <div style={{ marginTop: 10, display: "flex", gap: 12, flexWrap: "wrap" }}>
              <div className="chip">
                <b>Joga desde:</b> {profile.jogadorDesde ?? "—"}
              </div>
              <div className="chip">
                <b>Participações:</b> {profile.totals.participacoes}
              </div>
              <div className="chip">
                <b>Melhor campanha:</b> {bestCampaign ? `${bestCampaign.ano}-${bestCampaign.temporada}` : "—"}
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
                if (img.src.endsWith("/default.png")) return; // evita loop
                img.src = fotoPadrao;
              }}
            />
          </div>
        </div>
      </div>

      {/* Bloco 2: desempenho */}
      <div className="row" style={{ marginTop: 12 }}>
        <div className="card" style={{ flex: "1 1 220px" }}>
          <div className="small">Pódios (1º–5º)</div>
          <div className="kpi">{profile.totals.podios}</div>
          <div className="small">Em {profile.totals.participacoes} participações</div>
        </div>
        <div className="card" style={{ flex: "1 1 220px" }}>
          <div className="small">Melhores mãos</div>
          <div className="kpi">{profile.totals.melhorMao}</div>
          <div className="small">Total histórico</div>
        </div>
        <div className="card" style={{ flex: "1 1 220px" }}>
          <div className="small">Taxa de vitória</div>
          <div className="kpi">{formatPct(profile.taxaVitoria)}</div>
          <div className="small">{profile.totals.vitorias} vitórias</div>
        </div>
      </div>

      {/* Bloco 3: financeiro */}
      <div className="row" style={{ marginTop: 12 }}>
        <div className="card" style={{ flex: "1 1 220px" }}>
          <div className="small">Total pago</div>
          <div className="kpi">{formatMoneyBRL(profile.totals.pagou)}</div>
          <div className="small">Buy-in + rebuys/add-ons + rateios</div>
        </div>
        <div className="card" style={{ flex: "1 1 220px" }}>
          <div className="small">Total recebido</div>
          <div className="kpi">{formatMoneyBRL(profile.totals.recebeu)}</div>
          <div className="small">Premiações</div>
        </div>
        <div className="card" style={{ flex: "1 1 220px" }}>
          <div className="small">Saldo total</div>
          <div className={"kpi " + (profile.saldo >= 0 ? "moneyPos" : "moneyNeg")}>
            {formatMoneyBRL(profile.saldo)}
          </div>
          <div className="small">Recebeu − Pagou</div>
        </div>
      </div>

      {/* Gráfico: evolução */}
      <div className="card" style={{ marginTop: 12 }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontWeight: 900, fontSize: 18 }}>Evolução nas últimas temporadas</div>
            <div className="small">
              Linha: <b>Eficiência de Pontos</b> (pontos / (participações + rebuys)) • Marcador: <b>posição final</b>
            </div>
          </div>
          <div className="chip">
            <b>Eficiência geral:</b> {profile.eficienciaGeral.toFixed(2)}
          </div>
        </div>

        {!chart ? (
          <div className="small" style={{ marginTop: 10 }}>Sem dados suficientes para o gráfico.</div>
        ) : (
          <div style={{ marginTop: 10, overflowX: "auto" }}>
            <svg width={chart.w} height={chart.h} viewBox={`0 0 ${chart.w} ${chart.h}`} style={{ display: "block" }}>
              <line x1="44" y1={chart.h - 26} x2={chart.w - 44} y2={chart.h - 26} stroke="rgba(229,230,234,.25)" />
              <line x1="44" y1="26" x2="44" y2={chart.h - 26} stroke="rgba(229,230,234,.25)" />

              <polyline fill="none" stroke="#f84501" strokeWidth="3" points={chart.poly} />

              {chart.pts.map((p) => (
                <g key={p.r.key}>
                  <circle cx={p.x} cy={p.y} r="5" fill="#ffffff" stroke="#f84501" strokeWidth="3" />
                  {p.r.pos != null && (
                    <text x={p.x} y={p.y - 10} textAnchor="middle" fontSize="12" fill="rgba(229,230,234,.95)" fontWeight="900">
                      {p.r.pos}º
                    </text>
                  )}
                  <text x={p.x} y={chart.h - 10} textAnchor="middle" fontSize="11" fill="rgba(229,230,234,.75)">
                    {p.r.label}
                  </text>
                </g>
              ))}
            </svg>
          </div>
        )}
      </div>

      {/* Rodada a rodada */}
      <div className="card" style={{ marginTop: 12 }}>
        <div style={{ fontWeight: 900, fontSize: 18 }}>Rodada a rodada (últimas 2 temporadas)</div>
        <div className="small">Mostra: rodada, colocação, pontos e rebuys.</div>

        <div style={{ marginTop: 10, overflowX: "auto" }}>
          <table style={{ minWidth: 760 }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left" }}>Rodada</th>
                <th>Col.</th>
                <th>Pontos</th>
                <th>Rebuy</th>
                <th>Add-on</th>
              </tr>
            </thead>
            <tbody>
              {lastRounds.map((h: any) => (
                <tr key={h.id_rodada ?? `${h.ano}-${h.temporada}-${h.rodada}`}>
                  <td style={{ textAlign: "left" }}>{h.ano}-{h.temporada}-{h.rodada}</td>
                  <td style={{ textAlign: "center" }}>{h.colocacao}</td>
                  <td style={{ textAlign: "center" }}><b>{h.pontos}</b></td>
                  <td style={{ textAlign: "center" }}>{h.rebuy ?? 0}</td>
                  <td style={{ textAlign: "center" }}>{h.addon ?? 0}</td>
                </tr>
              ))}
              {!lastRounds.length && (
                <tr>
                  <td colSpan={5} className="small" style={{ padding: 12, textAlign: "center" }}>
                    Sem dados nas últimas 2 temporadas.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="small" style={{ marginTop: 10, opacity: 0.85 }}>
        Fotos: coloque em <b>public/players/</b> (ex.: <b>public/players/{id}.png</b>). Se não existir, usa <b>default.png</b>.
      </div>
    </div>
  );
}
