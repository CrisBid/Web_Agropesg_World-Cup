export type Phase =
  | "grupos"
  | "fase32"
  | "oitavas"
  | "quartas"
  | "semis"
  | "terceiro"
  | "final";

export interface Game {
  id: number;
  num: number;
  date: string;
  stadium: string;
  group?: string;
  phase: Phase;
  teamA: string;
  teamB: string;
}

export const GROUPS: Record<string, string[]> = {
  A: ["México", "Coreia do Sul", "República Tcheca", "África do Sul"],
  B: ["Canadá", "Catar", "Suíça", "Bósnia e Herzegovina"],
  C: ["Brasil", "Marrocos", "Haiti", "Escócia"],
  D: ["Estados Unidos", "Paraguai", "Austrália", "Turquia"],
  E: ["Alemanha", "Costa do Marfim", "Equador", "Curaçao"],
  F: ["Holanda", "Japão", "Suécia", "Tunísia"],
  G: ["Bélgica", "Egito", "Irã", "Nova Zelândia"],
  H: ["Espanha", "Arábia Saudita", "Uruguai", "Cabo Verde"],
  I: ["França", "Senegal", "Iraque", "Noruega"],
  J: ["Argentina", "Argélia", "Áustria", "Jordânia"],
  K: ["Portugal", "RD Congo", "Uzbequistão", "Colômbia"],
  L: ["Inglaterra", "Croácia", "Gana", "Panamá"],
};

export const ALL_TEAMS = Object.values(GROUPS).flat().sort();

export const GAMES: Game[] = [
  // ─── FASE DE GRUPOS ───────────────────────────────────────────────────────
  { id: 1, num: 1, date: "2026-06-11T16:00", stadium: "Estádio Cidade do México (Azteca), Cidade do México", group: "A", phase: "grupos", teamA: "México", teamB: "África do Sul" },
  { id: 2, num: 2, date: "2026-06-11T23:00", stadium: "Estádio Akron, Guadalajara", group: "A", phase: "grupos", teamA: "Coreia do Sul", teamB: "República Tcheca" },
  { id: 3, num: 3, date: "2026-06-12T16:00", stadium: "BMO Field, Toronto", group: "B", phase: "grupos", teamA: "Canadá", teamB: "Bósnia e Herzegovina" },
  { id: 4, num: 4, date: "2026-06-12T22:00", stadium: "SoFi Stadium, Los Angeles", group: "D", phase: "grupos", teamA: "Estados Unidos", teamB: "Paraguai" },
  { id: 5, num: 5, date: "2026-06-13T16:00", stadium: "Levi's Stadium, São Francisco", group: "B", phase: "grupos", teamA: "Catar", teamB: "Suíça" },
  { id: 6, num: 6, date: "2026-06-13T19:00", stadium: "MetLife Stadium, Nova York/Nova Jersey", group: "C", phase: "grupos", teamA: "Brasil", teamB: "Marrocos" },
  { id: 7, num: 7, date: "2026-06-13T22:00", stadium: "Gillette Stadium, Boston", group: "C", phase: "grupos", teamA: "Haiti", teamB: "Escócia" },
  { id: 8, num: 8, date: "2026-06-14T01:00", stadium: "BC Place, Vancouver", group: "D", phase: "grupos", teamA: "Austrália", teamB: "Turquia" },
  { id: 9, num: 9, date: "2026-06-14T14:00", stadium: "NRG Stadium, Houston", group: "E", phase: "grupos", teamA: "Alemanha", teamB: "Curaçao" },
  { id: 10, num: 10, date: "2026-06-14T17:00", stadium: "AT&T Stadium, Dallas", group: "F", phase: "grupos", teamA: "Holanda", teamB: "Japão" },
  { id: 11, num: 11, date: "2026-06-14T20:00", stadium: "Lincoln Financial Field, Filadélfia", group: "E", phase: "grupos", teamA: "Costa do Marfim", teamB: "Equador" },
  { id: 12, num: 12, date: "2026-06-14T23:00", stadium: "Estádio BBVA, Monterrey", group: "F", phase: "grupos", teamA: "Suécia", teamB: "Tunísia" },
  { id: 13, num: 13, date: "2026-06-15T13:00", stadium: "Mercedes-Benz Stadium, Atlanta", group: "H", phase: "grupos", teamA: "Espanha", teamB: "Cabo Verde" },
  { id: 14, num: 14, date: "2026-06-15T16:00", stadium: "Lumen Field, Seattle", group: "G", phase: "grupos", teamA: "Bélgica", teamB: "Egito" },
  { id: 15, num: 15, date: "2026-06-15T19:00", stadium: "Hard Rock Stadium, Miami", group: "H", phase: "grupos", teamA: "Arábia Saudita", teamB: "Uruguai" },
  { id: 16, num: 16, date: "2026-06-15T22:00", stadium: "SoFi Stadium, Los Angeles", group: "G", phase: "grupos", teamA: "Irã", teamB: "Nova Zelândia" },
  { id: 17, num: 17, date: "2026-06-16T16:00", stadium: "MetLife Stadium, Nova York/Nova Jersey", group: "I", phase: "grupos", teamA: "França", teamB: "Senegal" },
  { id: 18, num: 18, date: "2026-06-16T19:00", stadium: "Gillette Stadium, Boston", group: "I", phase: "grupos", teamA: "Iraque", teamB: "Noruega" },
  { id: 19, num: 19, date: "2026-06-16T22:00", stadium: "Arrowhead Stadium, Kansas City", group: "J", phase: "grupos", teamA: "Argentina", teamB: "Argélia" },
  { id: 20, num: 20, date: "2026-06-17T01:00", stadium: "Levi's Stadium, São Francisco", group: "J", phase: "grupos", teamA: "Áustria", teamB: "Jordânia" },
  { id: 21, num: 21, date: "2026-06-17T14:00", stadium: "NRG Stadium, Houston", group: "K", phase: "grupos", teamA: "Portugal", teamB: "RD Congo" },
  { id: 22, num: 22, date: "2026-06-17T17:00", stadium: "AT&T Stadium, Dallas", group: "L", phase: "grupos", teamA: "Inglaterra", teamB: "Croácia" },
  { id: 23, num: 23, date: "2026-06-17T20:00", stadium: "BMO Field, Toronto", group: "L", phase: "grupos", teamA: "Gana", teamB: "Panamá" },
  { id: 24, num: 24, date: "2026-06-17T21:00", stadium: "Estádio Cidade do México (Azteca), Cidade do México", group: "K", phase: "grupos", teamA: "Uzbequistão", teamB: "Colômbia" },
  { id: 25, num: 25, date: "2026-06-18T13:00", stadium: "Mercedes-Benz Stadium, Atlanta", group: "A", phase: "grupos", teamA: "República Tcheca", teamB: "África do Sul" },
  { id: 26, num: 26, date: "2026-06-18T16:00", stadium: "SoFi Stadium, Los Angeles", group: "B", phase: "grupos", teamA: "Suíça", teamB: "Bósnia e Herzegovina" },
  { id: 27, num: 27, date: "2026-06-18T19:00", stadium: "BC Place, Vancouver", group: "B", phase: "grupos", teamA: "Canadá", teamB: "Catar" },
  { id: 28, num: 28, date: "2026-06-18T22:00", stadium: "Estádio Akron, Guadalajara", group: "A", phase: "grupos", teamA: "México", teamB: "Coreia do Sul" },
  { id: 29, num: 29, date: "2026-06-19T16:00", stadium: "Lumen Field, Seattle", group: "D", phase: "grupos", teamA: "Estados Unidos", teamB: "Austrália" },
  { id: 30, num: 30, date: "2026-06-19T16:00", stadium: "Gillette Stadium, Boston", group: "C", phase: "grupos", teamA: "Escócia", teamB: "Marrocos" },
  { id: 31, num: 31, date: "2026-06-19T21:30", stadium: "Lincoln Financial Field, Filadélfia", group: "C", phase: "grupos", teamA: "Brasil", teamB: "Haiti" },
  { id: 32, num: 32, date: "2026-06-20T01:00", stadium: "Levi's Stadium, São Francisco", group: "D", phase: "grupos", teamA: "Turquia", teamB: "Paraguai" },
  { id: 33, num: 33, date: "2026-06-20T14:00", stadium: "NRG Stadium, Houston", group: "F", phase: "grupos", teamA: "Holanda", teamB: "Suécia" },
  { id: 34, num: 34, date: "2026-06-20T17:00", stadium: "BMO Field, Toronto", group: "E", phase: "grupos", teamA: "Alemanha", teamB: "Costa do Marfim" },
  { id: 35, num: 35, date: "2026-06-20T21:00", stadium: "Arrowhead Stadium, Kansas City", group: "E", phase: "grupos", teamA: "Equador", teamB: "Curaçao" },
  { id: 36, num: 36, date: "2026-06-20T23:00", stadium: "Estádio BBVA, Monterrey", group: "F", phase: "grupos", teamA: "Tunísia", teamB: "Japão" },
  { id: 37, num: 37, date: "2026-06-21T13:00", stadium: "Mercedes-Benz Stadium, Atlanta", group: "H", phase: "grupos", teamA: "Espanha", teamB: "Arábia Saudita" },
  { id: 38, num: 38, date: "2026-06-21T16:00", stadium: "SoFi Stadium, Los Angeles", group: "G", phase: "grupos", teamA: "Bélgica", teamB: "Irã" },
  { id: 39, num: 39, date: "2026-06-21T19:00", stadium: "Hard Rock Stadium, Miami", group: "H", phase: "grupos", teamA: "Uruguai", teamB: "Cabo Verde" },
  { id: 40, num: 40, date: "2026-06-21T22:00", stadium: "BC Place, Vancouver", group: "G", phase: "grupos", teamA: "Nova Zelândia", teamB: "Egito" },
  { id: 41, num: 41, date: "2026-06-22T14:00", stadium: "AT&T Stadium, Dallas", group: "J", phase: "grupos", teamA: "Argentina", teamB: "Áustria" },
  { id: 42, num: 42, date: "2026-06-22T18:00", stadium: "Lincoln Financial Field, Filadélfia", group: "I", phase: "grupos", teamA: "França", teamB: "Iraque" },
  { id: 43, num: 43, date: "2026-06-22T21:00", stadium: "MetLife Stadium, Nova York/Nova Jersey", group: "I", phase: "grupos", teamA: "Noruega", teamB: "Senegal" },
  { id: 44, num: 44, date: "2026-06-23T00:00", stadium: "Levi's Stadium, São Francisco", group: "J", phase: "grupos", teamA: "Jordânia", teamB: "Argélia" },
  { id: 45, num: 45, date: "2026-06-23T14:00", stadium: "NRG Stadium, Houston", group: "K", phase: "grupos", teamA: "Portugal", teamB: "Uzbequistão" },
  { id: 46, num: 46, date: "2026-06-23T17:00", stadium: "Gillette Stadium, Boston", group: "L", phase: "grupos", teamA: "Inglaterra", teamB: "Gana" },
  { id: 47, num: 47, date: "2026-06-23T20:00", stadium: "BMO Field, Toronto", group: "L", phase: "grupos", teamA: "Panamá", teamB: "Croácia" },
  { id: 48, num: 48, date: "2026-06-23T23:00", stadium: "Estádio Akron, Guadalajara", group: "K", phase: "grupos", teamA: "Colômbia", teamB: "RD Congo" },
  { id: 49, num: 49, date: "2026-06-24T16:00", stadium: "BC Place, Vancouver", group: "B", phase: "grupos", teamA: "Suíça", teamB: "Canadá" },
  { id: 50, num: 50, date: "2026-06-24T16:00", stadium: "Lumen Field, Seattle", group: "B", phase: "grupos", teamA: "Bósnia e Herzegovina", teamB: "Catar" },
  { id: 51, num: 51, date: "2026-06-24T19:00", stadium: "Hard Rock Stadium, Miami", group: "C", phase: "grupos", teamA: "Escócia", teamB: "Brasil" },
  { id: 52, num: 52, date: "2026-06-24T19:00", stadium: "Mercedes-Benz Stadium, Atlanta", group: "C", phase: "grupos", teamA: "Marrocos", teamB: "Haiti" },
  { id: 53, num: 53, date: "2026-06-24T22:00", stadium: "Estádio Cidade do México (Azteca), Cidade do México", group: "A", phase: "grupos", teamA: "República Tcheca", teamB: "México" },
  { id: 54, num: 54, date: "2026-06-24T22:00", stadium: "Estádio BBVA, Monterrey", group: "A", phase: "grupos", teamA: "África do Sul", teamB: "Coreia do Sul" },
  { id: 55, num: 55, date: "2026-06-25T17:00", stadium: "MetLife Stadium, Nova York/Nova Jersey", group: "E", phase: "grupos", teamA: "Equador", teamB: "Alemanha" },
  { id: 56, num: 56, date: "2026-06-25T17:00", stadium: "Lincoln Financial Field, Filadélfia", group: "E", phase: "grupos", teamA: "Curaçao", teamB: "Costa do Marfim" },
  { id: 57, num: 57, date: "2026-06-25T20:00", stadium: "Arrowhead Stadium, Kansas City", group: "F", phase: "grupos", teamA: "Tunísia", teamB: "Holanda" },
  { id: 58, num: 58, date: "2026-06-25T20:00", stadium: "AT&T Stadium, Dallas", group: "F", phase: "grupos", teamA: "Japão", teamB: "Suécia" },
  { id: 59, num: 59, date: "2026-06-25T23:00", stadium: "SoFi Stadium, Los Angeles", group: "D", phase: "grupos", teamA: "Turquia", teamB: "Estados Unidos" },
  { id: 60, num: 60, date: "2026-06-25T23:00", stadium: "Levi's Stadium, São Francisco", group: "D", phase: "grupos", teamA: "Paraguai", teamB: "Austrália" },
  { id: 61, num: 61, date: "2026-06-26T16:00", stadium: "Gillette Stadium, Boston", group: "I", phase: "grupos", teamA: "Noruega", teamB: "França" },
  { id: 62, num: 62, date: "2026-06-26T16:00", stadium: "BMO Field, Toronto", group: "I", phase: "grupos", teamA: "Senegal", teamB: "Iraque" },
  { id: 63, num: 63, date: "2026-06-26T21:00", stadium: "Estádio Akron, Guadalajara", group: "H", phase: "grupos", teamA: "Uruguai", teamB: "Espanha" },
  { id: 64, num: 64, date: "2026-06-26T21:00", stadium: "NRG Stadium, Houston", group: "H", phase: "grupos", teamA: "Cabo Verde", teamB: "Arábia Saudita" },
  { id: 65, num: 65, date: "2026-06-27T00:00", stadium: "BC Place, Vancouver", group: "G", phase: "grupos", teamA: "Nova Zelândia", teamB: "Bélgica" },
  { id: 66, num: 66, date: "2026-06-27T00:00", stadium: "Lumen Field, Seattle", group: "G", phase: "grupos", teamA: "Egito", teamB: "Irã" },
  { id: 67, num: 67, date: "2026-06-27T18:00", stadium: "MetLife Stadium, Nova York/Nova Jersey", group: "L", phase: "grupos", teamA: "Panamá", teamB: "Inglaterra" },
  { id: 68, num: 68, date: "2026-06-27T18:00", stadium: "Lincoln Financial Field, Filadélfia", group: "L", phase: "grupos", teamA: "Croácia", teamB: "Gana" },
  { id: 69, num: 69, date: "2026-06-27T20:30", stadium: "Hard Rock Stadium, Miami", group: "K", phase: "grupos", teamA: "Colômbia", teamB: "Portugal" },
  { id: 70, num: 70, date: "2026-06-27T20:30", stadium: "Mercedes-Benz Stadium, Atlanta", group: "K", phase: "grupos", teamA: "RD Congo", teamB: "Uzbequistão" },
  { id: 71, num: 71, date: "2026-06-27T23:00", stadium: "AT&T Stadium, Dallas", group: "J", phase: "grupos", teamA: "Jordânia", teamB: "Argentina" },
  { id: 72, num: 72, date: "2026-06-27T23:00", stadium: "Arrowhead Stadium, Kansas City", group: "J", phase: "grupos", teamA: "Argélia", teamB: "Áustria" },

  // ─── FASE DE 32 (Round of 32) ─────────────────────────────────────────────
  { id: 73, num: 73, date: "2026-06-28T16:00", stadium: "SoFi Stadium, Los Angeles", phase: "fase32", teamA: "TBD", teamB: "TBD" },
  { id: 74, num: 74, date: "2026-06-29T17:30", stadium: "Gillette Stadium, Boston", phase: "fase32", teamA: "TBD", teamB: "TBD" },
  { id: 75, num: 75, date: "2026-06-29T22:00", stadium: "Estádio BBVA, Monterrey", phase: "fase32", teamA: "TBD", teamB: "TBD" },
  { id: 76, num: 76, date: "2026-06-29T14:00", stadium: "NRG Stadium, Houston", phase: "fase32", teamA: "TBD", teamB: "TBD" },
  { id: 77, num: 77, date: "2026-06-30T18:00", stadium: "MetLife Stadium, Nova York/Nova Jersey", phase: "fase32", teamA: "TBD", teamB: "TBD" },
  { id: 78, num: 78, date: "2026-06-30T14:00", stadium: "AT&T Stadium, Dallas", phase: "fase32", teamA: "TBD", teamB: "TBD" },
  { id: 79, num: 79, date: "2026-06-30T22:00", stadium: "Estádio Cidade do México (Azteca), Cidade do México", phase: "fase32", teamA: "TBD", teamB: "TBD" },
  { id: 80, num: 80, date: "2026-07-01T13:00", stadium: "Mercedes-Benz Stadium, Atlanta", phase: "fase32", teamA: "TBD", teamB: "TBD" },
  { id: 81, num: 81, date: "2026-07-01T21:00", stadium: "Levi's Stadium, São Francisco", phase: "fase32", teamA: "TBD", teamB: "TBD" },
  { id: 82, num: 82, date: "2026-07-01T17:00", stadium: "Lumen Field, Seattle", phase: "fase32", teamA: "TBD", teamB: "TBD" },
  { id: 83, num: 83, date: "2026-07-02T20:00", stadium: "BMO Field, Toronto", phase: "fase32", teamA: "TBD", teamB: "TBD" },
  { id: 84, num: 84, date: "2026-07-02T16:00", stadium: "SoFi Stadium, Los Angeles", phase: "fase32", teamA: "TBD", teamB: "TBD" },
  { id: 85, num: 85, date: "2026-07-03T00:00", stadium: "BC Place, Vancouver", phase: "fase32", teamA: "TBD", teamB: "TBD" },
  { id: 86, num: 86, date: "2026-07-03T19:00", stadium: "Hard Rock Stadium, Miami", phase: "fase32", teamA: "TBD", teamB: "TBD" },
  { id: 87, num: 87, date: "2026-07-03T22:30", stadium: "Arrowhead Stadium, Kansas City", phase: "fase32", teamA: "TBD", teamB: "TBD" },
  { id: 88, num: 88, date: "2026-07-03T15:00", stadium: "AT&T Stadium, Dallas", phase: "fase32", teamA: "TBD", teamB: "TBD" },

  // ─── OITAVAS DE FINAL ─────────────────────────────────────────────────────
  { id: 89, num: 89, date: "2026-07-04T18:00", stadium: "Lincoln Financial Field, Filadélfia", phase: "oitavas", teamA: "TBD", teamB: "TBD" },
  { id: 90, num: 90, date: "2026-07-04T14:00", stadium: "NRG Stadium, Houston", phase: "oitavas", teamA: "TBD", teamB: "TBD" },
  { id: 91, num: 91, date: "2026-07-05T17:00", stadium: "MetLife Stadium, Nova York/Nova Jersey", phase: "oitavas", teamA: "TBD", teamB: "TBD" },
  { id: 92, num: 92, date: "2026-07-05T21:00", stadium: "Estádio Cidade do México (Azteca), Cidade do México", phase: "oitavas", teamA: "TBD", teamB: "TBD" },
  { id: 93, num: 93, date: "2026-07-06T16:00", stadium: "AT&T Stadium, Dallas", phase: "oitavas", teamA: "TBD", teamB: "TBD" },
  { id: 94, num: 94, date: "2026-07-06T21:00", stadium: "Lumen Field, Seattle", phase: "oitavas", teamA: "TBD", teamB: "TBD" },
  { id: 95, num: 95, date: "2026-07-07T13:00", stadium: "Mercedes-Benz Stadium, Atlanta", phase: "oitavas", teamA: "TBD", teamB: "TBD" },
  { id: 96, num: 96, date: "2026-07-07T17:00", stadium: "BC Place, Vancouver", phase: "oitavas", teamA: "TBD", teamB: "TBD" },

  // ─── QUARTAS DE FINAL ─────────────────────────────────────────────────────
  { id: 97, num: 97, date: "2026-07-09T17:00", stadium: "Gillette Stadium, Boston", phase: "quartas", teamA: "TBD", teamB: "TBD" },
  { id: 98, num: 98, date: "2026-07-10T16:00", stadium: "SoFi Stadium, Los Angeles", phase: "quartas", teamA: "TBD", teamB: "TBD" },
  { id: 99, num: 99, date: "2026-07-11T18:00", stadium: "Hard Rock Stadium, Miami", phase: "quartas", teamA: "TBD", teamB: "TBD" },
  { id: 100, num: 100, date: "2026-07-11T22:00", stadium: "Arrowhead Stadium, Kansas City", phase: "quartas", teamA: "TBD", teamB: "TBD" },

  // ─── SEMIFINAIS ───────────────────────────────────────────────────────────
  { id: 101, num: 101, date: "2026-07-14T16:00", stadium: "AT&T Stadium, Dallas", phase: "semis", teamA: "TBD", teamB: "TBD" },
  { id: 102, num: 102, date: "2026-07-15T16:00", stadium: "Mercedes-Benz Stadium, Atlanta", phase: "semis", teamA: "TBD", teamB: "TBD" },

  // ─── TERCEIRO LUGAR ───────────────────────────────────────────────────────
  { id: 103, num: 103, date: "2026-07-18T18:00", stadium: "Hard Rock Stadium, Miami", phase: "terceiro", teamA: "TBD", teamB: "TBD" },

  // ─── FINAL ────────────────────────────────────────────────────────────────
  { id: 104, num: 104, date: "2026-07-19T16:00", stadium: "MetLife Stadium, Nova York/Nova Jersey", phase: "final", teamA: "TBD", teamB: "TBD" },
];

// ─── BRACKET TREE ─────────────────────────────────────────────────────────────
// Official Copa 2026 bracket. Maps each knockout game to its two feeder games.
// Game 103 (3rd place) uses losers — handled separately in PalpitesForm.
export const BRACKET: Record<number, [number, number]> = {
  // Oitavas (Round of 16) ← Fase de 32 — official Copa 2026 draw
   89: [74, 77],  90: [73, 75],  91: [76, 78],  92: [79, 80],
   93: [83, 84],  94: [81, 82],  95: [86, 88],  96: [85, 87],
  // Quartas ← Oitavas
   97: [89, 90],  98: [93, 94],  99: [91, 92], 100: [95, 96],
  // Semis ← Quartas
  101: [97, 98], 102: [99, 100],
  // Final ← Semis
  104: [101, 102],
};

// Fase de 32 slot codes per game — official Copa 2026 bracket.
// "1X" = 1st place Group X, "2X" = 2nd place Group X, "3rd" = best 3rd-place qualifier.
export const FASE32_GROUPS: Record<number, [string, string]> = {
  73: ["2A", "2B"],
  74: ["1E", "3rd"],
  75: ["1F", "2C"],
  76: ["1C", "2F"],
  77: ["1I", "3rd"],
  78: ["2E", "2I"],
  79: ["1A", "3rd"],
  80: ["1L", "3rd"],
  81: ["1D", "3rd"],
  82: ["1G", "3rd"],
  83: ["2K", "2L"],
  84: ["1H", "2J"],
  85: ["1B", "3rd"],
  86: ["1J", "2H"],
  87: ["1K", "3rd"],
  88: ["2D", "2G"],
};

// The 8 Fase-de-32 games that receive a 3rd-place qualifier, in ranking order
// (best predicted 3rd-place team → index 0 → game 74, etc.)
export const THIRD_PLACE_SLOTS = [74, 77, 79, 80, 81, 82, 85, 87];

export const PHASE_LABELS: Record<Phase, string> = {
  grupos: "Fase de Grupos",
  fase32: "Fase de 32",
  oitavas: "Oitavas de Final",
  quartas: "Quartas de Final",
  semis: "Semifinais",
  terceiro: "Disputa do 3º Lugar",
  final: "Final",
};

export const PHASE_POINTS: Record<Phase, number> = {
  grupos: 0,
  fase32: 3,
  oitavas: 4,
  quartas: 5,
  semis: 6,
  terceiro: 7,
  final: 8,
};

// Points earned for correctly predicting the winner of a knockout game.
// Convention: acertar quem avança DA fase X PARA a fase Y vale PHASE_POINTS[Y].
export const KNOCKOUT_GAME_PTS: Record<Phase, number> = {
  grupos: 0,
  fase32: PHASE_POINTS.oitavas,   // acertar quem vai às oitavas: 4 pts
  oitavas: PHASE_POINTS.quartas,  // acertar quem vai às quartas: 5 pts
  quartas: PHASE_POINTS.semis,    // acertar quem vai às semis: 6 pts
  semis: PHASE_POINTS.final,      // acertar quem vai à final: 8 pts
  terceiro: PHASE_POINTS.terceiro, // acertar o 3º lugar: 7 pts
  final: PHASE_POINTS.final,      // acertar o campeão: 8 pts
};
