import type { SelectChallenge } from "../../server/db/schema/challenge";
import type { SelectWinnie } from "../../server/db/schema/winnie";

// What JSON does to a row: every Date arrives as an ISO string. Derived, so a schema change breaks
// the typecheck here instead of leaving ten hand-written copies to drift.
type Json<T> = { [K in keyof T]: T[K] extends Date ? string : T[K] extends Date | null ? string | null : T[K] };

/** A Challenge as the API sends it */
export type ChallengeRow = Json<SelectChallenge>;

/** A Winnie as the Owner's read sends it, with its Challenges in position order */
export type WinnieRow = Json<SelectWinnie> & { challenges: ChallengeRow[] };

/** What a timer endpoint answers */
export interface TimerResponse {
  changed: boolean;
  winnie: WinnieRow;
  serverNow: string;
}
