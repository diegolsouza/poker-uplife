import { useEffect, useMemo, useState } from "react";
import { getAnosTemporadas, getRankingTemporada, getRodadas } from "../api/endpoints";
import type { AnoTemporada, RankingRow, Rodada } from "../types";
import { SeasonFilter } from "../components/SeasonFilter";
import { RankingTable } from "../components/RankingTable";
import { aggregateRankings, aggregateRodadas, formatMoneyBRL, sum } from "../utils/aggregate";

function filterLabel(ano: string, temporada: string) {
  if (ano === "ALL" && temporada === "ALL") return "Filtrando por: Todos os anos • Todas as temporadas";
  if (ano === "ALL" && temporada !== "ALL") return `Filtrando por: Todos os anos • ${temporada}`;
  if (ano !== "ALL" && temporada === "ALL") return `Filtrando por: ${ano} • Todas as temporadas`;
  return `Filtrando por: ${ano} • ${temporada}`;
}

function infoDefaultOpen() {
  if (typeof window === "undefined") return true;
  return window.innerWidth > 720; // aberto no desktop, fechado no mobile
}

export function Home() {
  const [options, setOptions] = useState<AnoTemporada[]>([]);
  const [rodadas, setRodadas] = useState<Rodada[]>([]);

  // ✅ filtro aplicado (é este que controla os dados)
  const [ano, setAno] = useState<string>("ALL");
  const [temporada, setTemporada] = useState<string>("ALL");

  // ✅ filtro "rascunho" (o usuário mexe aqui e só aplica no botão)
  const [pendingAno, setPendingAno] = useState<string>("ALL");
  const [pendingTemporada, setPendingTemporada] = useState<string>("ALL");

  const [rows, setRows] = useState<RankingRow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // ✅ filtro minimizado/expandido
  const [filterOpen, setFilterOpen] = useState<boolean>(false);

  // ✅ informações da temporada minimizado/expandido
  const [infoOpen, setInfoOpen] = useState<boolean>(() => infoDefaultOpen());

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const [opts, rods] = await Promise.all([getAnosTemporadas(), getRodadas()]);
        setOptions(opts);
        setRodadas(rods);

        // default: mais recente (maior ano, depois maior temporada)
        if (opts.length) {
          const sorted = [...opts].sort((a, b) =>
            a.ano === b.ano ? a.temporada.localeCompare(b.temporada) : a.ano.localeCompare(b.ano)
          );
          const last = sorted[sorted.length - 1];

          setAno(last.ano);
          setTemporada(last.temporada);

          // mantém rascunho sincronizado com o default
          setPendingAno(last.ano);
          setPendingTemporada(last.temporada);
        }
      } catch (e: any) {
        setError(e?.message ?? "Erro ao carregar");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // sempre que abrir o filtro, inicializa o "rascunho" com o filtro aplicado
  useEffect(() => {
    if (filterOpen) {
      setPendingAno(ano);
      setPendingTemporada(temporada);
    }
  }, [filterOpen, ano, temporada]);

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

  // ✅ enquanto carrega (inclusive ao trocar filtro), mostra apenas animação
  if (loading) {
    return (
      <div className="pageLoader">
        <div className="spinner" aria-label="Carregando" />
        <div className="loaderText">Carregando…</div>
      </div>
    );
  }

  return (
    <div className="container">
      {error && (
        <div className="card" style={{ borderColor: "rgba(255,77,77,.35)" }}>
          <b>Erro:</b> {error}
        </div>
      )}

      {/* ✅ Filtro minimizado/expandido (com animação) */}
      <div className="card">
        <button
          type="button"
          className={"filterToggle " + (filterOpen ? "isOpen" : "")}
          aria-expanded={filterOpen}
          onClick={() => setFilterOpen(v => !v)}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, width: "100%" }}>
            <div style={{ fontWeight: 900 }}>{filterLabel(ano, temporada)}</div>
            <div className="filterChevron" aria-hidden="true">
              ▼
            </div>
          </div>
        </button>

        {/* Mantém montado para animar abertura/fechamento */}
        <div
          className={"filterPanel " + (filterOpen ? "open" : "")}
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <div className="filterPanelInner">
            <SeasonFilter
              options={options}
              ano={pendingAno}
              temporada={pendingTemporada}
              onChange={(n) => {
                setPendingAno(n.ano);
                setPendingTemporada(n.temporada);
              }}
            />

            {/* ✅ Aplicar filtro somente ao clicar */}
            <div className="filterActions">
              <button
                type="button"
                className="applyBtn"
                title="Atualizar"
                aria-label="Atualizar"
                onClick={() => {
                  setAno(pendingAno);
                  setTemporada(pendingTemporada);
                  setFilterOpen(false);
                }}
              >
                ⟳
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ✅ Informações da Temporada (expansível) */}
      <div className="card" style={{ marginTop: 12 }}>
        <button
          type="button"
          className={"filterToggle " + (infoOpen ? "isOpen" : "")}
          aria-expanded={infoOpen}
          onClick={() => setInfoOpen(v => !v)}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, width: "100%" }}>
            <div style={{ fontWeight: 900 }}>Informações da Temporada</div>
            <div className="filterChevron" aria-hidden="true">
              ▼
            </div>
          </div>
        </button>

        <div className={"filterPanel " + (infoOpen ? "open" : "")}>
          <div className="filterPanelInner">
            <div className="row">
              <div className="card" style={{ flex: "1 1 220px" }}>
                <div className="small">Jogadores (no ranking)</div>
                <div className="kpi">{kpis.jogadores}</div>
                <div className="small">Considera o filtro selecionado</div>
              </div>
              <div className="card" style={{ flex: "1 1 220px" }}>
                <div className="small">Rodadas</div>
                <div className="kpi">{kpis.qtdRodadas}</div>
                <div className="small">Rodadas registradas no período</div>
              </div>
              <div className="card" style={{ flex: "1 1 220px" }}>
                <div className="small">Distribuído em premiações</div>
                <div className="kpi">{formatMoneyBRL(kpis.totalDistribuido)}</div>
                <div className="small">Soma do prizepool da temporada</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ marginTop: 12 }}>
        <RankingTable
          rows={rows}
          onPlayerClickTo={(id) =>
            `/jogador/${id}?ano=${encodeURIComponent(ano)}&temporada=${encodeURIComponent(temporada)}`
          }
          mobileDetails={true}
          hideEliminado={false}
        />
      </div>
    </div>
  );
}
