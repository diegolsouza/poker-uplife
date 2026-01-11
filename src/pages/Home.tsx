import { useEffect, useMemo, useState } from "react";
import { getAnosTemporadas, getRankingTemporada, getRodadas } from "../api/endpoints";
import type { AnoTemporada, RankingRow, Rodada } from "../types";
import { SeasonFilter } from "../components/SeasonFilter";
import { RankingTable } from "../components/RankingTable";
import { aggregateRankings, aggregateRodadas, formatMoneyBRL, sum } from "../utils/aggregate";

export function Home() {
  const [options, setOptions] = useState<AnoTemporada[]>([]);
  const [rodadas, setRodadas] = useState<Rodada[]>([]);
  const [ano, setAno] = useState<string>("ALL");
  const [temporada, setTemporada] = useState<string>("ALL");
  const [rows, setRows] = useState<RankingRow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // ✅ novo: filtro minimizado/expandido
  const [filterOpen, setFilterOpen] = useState<boolean>(false);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const [opts, rods] = await Promise.all([getAnosTemporadas(), getRodadas()]);
        setOptions(opts);
        setRodadas(rods);
        // default: mais recente (maior ano, depois maior temporada)
        if (opts.length) {
          const sorted = [...opts].sort((a,b) => (a.ano === b.ano ? a.temporada.localeCompare(b.temporada) : a.ano.localeCompare(b.ano)));
          const last = sorted[sorted.length - 1];
          setAno(last.ano);
          setTemporada(last.temporada);
        }
      } catch (e: any) {
        setError(e?.message ?? "Erro ao carregar");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!options.length) return;

    (async () => {
      try {
        setLoading(true);
        setError(null);

        // Temporada única
        if (temporada !== "ALL") {
          const r = await getRankingTemporada(ano === "ALL" ? options[0].ano : ano, temporada);
          // se ano=ALL e temporada específica: soma a temporada em todos os anos (raro, mas suportado)
          if (ano === "ALL") {
            const years = Array.from(new Set(options.filter(o => o.temporada === temporada).map(o => o.ano)));
            const all = await Promise.all(years.map(y => getRankingTemporada(y, temporada)));
            setRows(aggregateRankings(all));
          } else {
            setRows(r);
          }
          return;
        }

        // Temporada = ALL -> somar temporadas do ano (ou de todos os anos)
        const pairs = options.filter(o => (ano === "ALL" ? true : o.ano === ano));
        const all = await Promise.all(pairs.map(p => getRankingTemporada(p.ano, p.temporada)));
        setRows(aggregateRankings(all));
      } catch (e: any) {
        setError(e?.message ?? "Erro ao carregar ranking");
      } finally {
        setLoading(false);
      }
    })();
  }, [ano, temporada, options]);

  const rodadasFiltradas = useMemo(() => aggregateRodadas(rodadas, ano, temporada), [rodadas, ano, temporada]);

  const kpis = useMemo(() => {
    const qtdRodadas = rodadasFiltradas.length;
    const totalDistribuido = sum(rodadasFiltradas, r => r.prizepool);
    const jogadores = rows.length;
    return { qtdRodadas, totalDistribuido, jogadores };
  }, [rodadasFiltradas, rows]);

  return (
    <div className="container">
      {error && <div className="card" style={{borderColor:"rgba(255,77,77,.35)"}}><b>Erro:</b> {error}</div>}

      {/* ✅ Filtro minimizado/expandido */}
      <div
        className="card"
        style={{ cursor: "pointer" }}
        role="button"
        tabIndex={0}
        aria-expanded={filterOpen}
        onClick={() => setFilterOpen(v => !v)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") setFilterOpen(v => !v);
        }}
      >
        <div style={{display:"flex", alignItems:"center", justifyContent:"space-between", gap:12}}>
          <div style={{fontWeight: 900}}>Filtrar por temporada</div>
          <div style={{opacity:.8, fontSize: 18, fontWeight: 900}} aria-hidden="true">
            {filterOpen ? "▲" : "▼"}
          </div>
        </div>

        {filterOpen && (
          <div style={{marginTop:12}}>
            <SeasonFilter
              options={options}
              ano={ano}
              temporada={temporada}
              onChange={(n) => { setAno(n.ano); setTemporada(n.temporada); }}
            />
          </div>
        )}
      </div>

      <div className="row" style={{marginTop:12}}>
        <div className="card" style={{flex:"1 1 220px"}}>
          <div className="small">Jogadores (no ranking)</div>
          <div className="kpi">{kpis.jogadores}</div>
          <div className="small">Considera o filtro selecionado</div>
        </div>
        <div className="card" style={{flex:"1 1 220px"}}>
          <div className="small">Rodadas</div>
          <div className="kpi">{kpis.qtdRodadas}</div>
          <div className="small">Rodadas registradas no período</div>
        </div>
        <div className="card" style={{flex:"1 1 220px"}}>
          <div className="small">Distribuído em premiações</div>
          <div className="kpi">{formatMoneyBRL(kpis.totalDistribuido)}</div>
          <div className="small">Soma do prizepool da temporada</div>
        </div>
      </div>

      <div style={{marginTop:12}}>
        {loading ? (
          <div className="card">Carregando…</div>
        ) : (
          <RankingTable
            rows={rows}
            onPlayerClickTo={(id) => `/jogador/${id}?ano=${encodeURIComponent(ano)}&temporada=${encodeURIComponent(temporada)}`}
            mobileDetails={true}
            hideEliminado={false}
          />
        )}
      </div>
    </div>
  );
}
