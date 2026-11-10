/**
 * Tipagens e Modelos de Dados — Pokéidle.io (Antigravity IDE)
 */

export type PotencyTier = 'P1' | 'P2' | 'P3' | 'P4' | 'P5';

export interface PokemonIVs {
  hp: number;        // 1 a 32
  attack: number;    // 1 a 32
  defense: number;   // 1 a 32
  spAtk: number;     // 1 a 32
  spDef: number;     // 1 a 32
  speed: number;     // 1 a 32 (Rei do CDR)
  total: number;     // Soma total (Inicial >= 140; Shiny >= 110)
}

export interface PokemonEntity {
  id: string;
  species: string;
  name?: string;
  level: number;
  quality: number;          // Multiplicador por nível (Inicial >= 1.3)
  potency: PotencyTier;     // P1 (+0%) a P5 (+100%)
  isShiny: boolean;         // 3x multiplicador em todos os status
  ivs: PokemonIVs;
  currentHp: number;
  maxHp: number;
  moves: string[];
  activeMoveIndex: number;
}

export interface HuntZoneTelemetry {
  zoneId: string;
  zoneName: string;
  region: 'Kanto' | 'Johto' | 'Hoenn' | 'Outland' | 'Alola' | 'Galar' | 'Paldea';
  recommendedLevel: number;
  xpHour: number;
  goldHour: number;
  deathsPerHour: number;
  isSafe: boolean;          // 0 mortes esperadas com Auto-Poção
}

export interface AccountTelemetry {
  trainerName: string;
  level: number;
  coins: number;
  diamonds: number;
  gemsSolana: number;
  vipDaysRemaining: number;
  currentZone: HuntZoneTelemetry;
  activePokemon: PokemonEntity;
  depotCount: number;
  potionsCount: number;
  revivesCount: number;
  ballsCount: {
    pokeBall: number;
    greatBall: number;
    ultraBall: number;
    beastBall: number;
  };
}

