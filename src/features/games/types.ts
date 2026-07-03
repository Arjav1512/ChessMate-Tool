/** Game Library + Import view-models (Phase 7). Derived from the `games` table
 *  + PGN headers + analysis presence; no schema expansion (decision: derive v1). */

export type GameOutcome = 'win' | 'loss' | 'draw' | 'unknown';
export type GameStatus = 'analyzed' | 'pending';

export interface GameRowVM {
  id: string;
  opponent: string;
  userColor: 'white' | 'black' | null;
  whitePlayer: string;
  blackPlayer: string;
  result: string;            // raw "1-0" / "0-1" / "1/2-1/2" / "*"
  outcome: GameOutcome;      // from result + userColor
  opening: string;           // derived (Opening || ECO)
  timeControl: string;       // derived + formatted ("10+0")
  date: string;              // display
  event: string;
  status: GameStatus;        // derived from analysis presence
  improvements?: number;     // optional (mistakes worth review)
}

export type ResultFilter = 'all' | 'win' | 'loss' | 'draw';
export type ColorFilter = 'all' | 'white' | 'black';
export type SortKey = 'newest' | 'oldest';

export interface GameFilter {
  search: string;
  result: ResultFilter;
  color: ColorFilter;
  timeControl: string;       // 'all' | a derived bucket
  sort: SortKey;
}

export const DEFAULT_FILTER: GameFilter = {
  search: '', result: 'all', color: 'all', timeControl: 'all', sort: 'newest',
};

/** A saved smart-filter (localStorage v1). Built-ins are virtual (not stored). */
export interface Collection {
  id: string;
  name: string;
  filter: Partial<GameFilter>;
}

export type ImportItemStatus = 'new' | 'duplicate' | 'invalid';

export interface ImportPreviewItem {
  index: number;
  white: string;
  black: string;
  result: string;
  date: string;        // from PGN headers; persisted on import
  event: string;       // from PGN headers; persisted on import
  opening: string;
  status: ImportItemStatus;
  error?: string;
  pgnText: string;
}

export interface ImportResult {
  imported: number;
  duplicates: number;
  skipped: number;           // invalid + failed
  errors: { index: number; reason: string }[];
}
