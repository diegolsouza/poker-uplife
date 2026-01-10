export type AnoTemporada = { ano: string; temporada: string };

export type RankingRow = {
  id_jogador: string;
  nome: string;
  pontos: number;
  p1: number; p2: number; p3: number; p4: number; p5: number; p6: number; p7: number; p8: number; p9: number;
  serie_b: number;
  fora_mesa_final: number;
  podios: number;
  melhor_mao: number;
  rebuy_total: number;
  addon_total: number;
  participacoes: number;
  eliminado?: boolean;
};

export type Rodada = {
  id_rodada: string;
  ano: string;
  temporada: string;
  rodada: string;
  data: string; // ISO yyyy-mm-dd
  qtd_jogadores: number;
  prizepool: number; // total distribuído (p/ mesa final)
};

export type JogadorResponse = {
  ok: boolean;
  jogador?: {
    id_jogador: string;
    nome: string;
    participacoes: number;
    p1: number; p2: number; p3: number; p4: number; p5: number; p6: number; p7: number; p8: number; p9: number;
    serie_b: number;
    fora_mesa_final: number;
    podios: number;
    melhor_mao: number;
    rebuy_total: number;
    addon_total: number;
    pontos: number;
  };
  financeiro?: { pagou: number; recebeu: number; saldo: number };
  historico?: Array<{
    id_rodada: string;
    data: string;
    ano: string;
    temporada: string;
    rodada: string;
    colocacao: number;
    participou: boolean;
    foi_csb: boolean;
    melhor_mao: boolean;
    pontos: number;
    rebuy: number;
    addon: number;
    pagou: number;
    recebeu: number;
    saldo: number;
  }>;
  temporadas_resumo?: Record<string, {
    participacoes: number;
    pontos: number;
    p1: number;
    podios: number;
  }>;
  message?: string;
};
