import type { AnoTemporada } from "../types";

type Props = {
  options: AnoTemporada[];
  ano: string;
  temporada: string;
  onChange: (next: { ano: string; temporada: string }) => void;
  allowAllSeason?: boolean;
  allowAllYear?: boolean;
};

export function SeasonFilter({
  options, ano, temporada, onChange,
  allowAllSeason = true,
  allowAllYear = true
}: Props) {
  const years = Array.from(new Set(options.map(o => o.ano))).sort();
  const seasonsByYear = new Map<string, string[]>();
  for (const o of options) {
    const cur = seasonsByYear.get(o.ano) ?? [];
    if (!cur.includes(o.temporada)) cur.push(o.temporada);
    seasonsByYear.set(o.ano, cur);
  }
  for (const [y, arr] of seasonsByYear) arr.sort();

  const seasons = ano === "ALL"
    ? Array.from(new Set(options.map(o => o.temporada))).sort()
    : (seasonsByYear.get(ano) ?? []).sort();

  const yearOptions = allowAllYear ? ["ALL", ...years] : years;
  const seasonOptions = allowAllSeason ? ["ALL", ...seasons] : seasons;

  return (
    <div className="card">
      <h3 className="cardTitle">Filtro</h3>
      <div className="controls">
        <div className="control">
          <label>Ano</label>
          <select
            value={ano}
            onChange={(e) => {
              const nextAno = e.target.value;
              // se mudar ano, reset temporada para ALL
              onChange({ ano: nextAno, temporada: "ALL" });
            }}
          >
            {yearOptions.map(y => <option key={y} value={y}>{y === "ALL" ? "Todos" : y}</option>)}
          </select>
        </div>

        <div className="control">
          <label>Temporada</label>
          <select
            value={temporada}
            onChange={(e) => onChange({ ano, temporada: e.target.value })}
          >
            {seasonOptions.map(s => <option key={s} value={s}>{s === "ALL" ? "Todas" : s}</option>)}
          </select>
        </div>
      </div>
      <div className="small" style={{marginTop:10}}>
        Dica: selecione <b>Temporada = Todas</b> para somar as temporadas do ano (ou de todos os anos).
      </div>
    </div>
  );
}
