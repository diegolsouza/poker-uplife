import { apiGet } from "./client";
import { sortRankingRows } from "../utils/aggregate";
import type { AnoTemporada, RankingRow, Rodada, JogadorResponse } from "../types";

export async function getAnosTemporadas(): Promise<AnoTemporada[]> {
  const r = await apiGet({ action: "anos_temporadas" });
  return r.data ?? r ?? [];
}

export async function getRodadas(): Promise<Rodada[]> {
  const r = await apiGet({ action: "rodadas" });
  return r.data ?? r ?? [];
}

export async function getRankingTemporada(ano: string, temporada: string): Promise<RankingRow[]> {
  const r = await apiGet({ action: "ranking", ano, temporada });
  return sortRankingRows((r.data ?? r ?? []) as RankingRow[]);
}

export async function getRankingGeral(): Promise<RankingRow[]> {
  const r = await apiGet({ action: "ranking_geral" });
  return sortRankingRows((r.data ?? r ?? []) as RankingRow[]);
}

export async function getJogador(ano: string, temporada: string, id_jogador: string): Promise<JogadorResponse> {
  return await apiGet({ action: "jogador", ano, temporada, id_jogador });
}
