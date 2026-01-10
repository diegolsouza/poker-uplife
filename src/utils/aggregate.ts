import type { RankingRow, Rodada } from "../types";

export function sum<T>(arr: T[], f: (x:T)=>number): number {
  return arr.reduce((acc, x) => acc + (f(x) || 0), 0);
}

export function formatMoneyBRL(v: number): string {
  return (v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function formatPct(v: number): string {
  return (v || 0).toLocaleString("pt-BR", { style: "percent", maximumFractionDigits: 1 });
}

export function aggregateRankings(rankings: RankingRow[][]): RankingRow[] {
  const map = new Map<string, RankingRow>();

  for (const rows of rankings) {
    for (const r of rows) {
      const key = r.id_jogador;
      const cur = map.get(key);
      if (!cur) {
        map.set(key, { ...r });
      } else {
        ([
          "pontos","p1","p2","p3","p4","p5","p6","p7","p8","p9",
          "serie_b","fora_mesa_final","podios","melhor_mao","rebuy_total","addon_total","participacoes"
        ] as const).forEach((k) => {
          // @ts-expect-error numeric
          cur[k] = (cur[k] || 0) + (r[k] || 0);
        });
        // manter flags/nome
        cur.nome = r.nome || cur.nome;
        cur.eliminado = r.eliminado || cur.eliminado;
      }
    }
  }

  // ordenar por pontos desc, desempate por p1, p2...
  const rows = Array.from(map.values());
  rows.sort((a,b) => {
    const keys: (keyof RankingRow)[] = ["pontos","p1","p2","p3","p4","p5","p6","p7","p8","p9","podios","participacoes"];
    for (const k of keys) {
      const dv = (b[k] as unknown as number) - (a[k] as unknown as number);
      if (dv !== 0) return dv;
    }
    return a.nome.localeCompare(b.nome);
  });
  return rows;
}

export function aggregateRodadas(rodadas: Rodada[], ano: string, temporada: string): Rodada[] {
  return rodadas.filter(r => {
    if (ano !== "ALL" && r.ano !== ano) return false;
    if (temporada !== "ALL" && r.temporada !== temporada) return false;
    return true;
  });
}
