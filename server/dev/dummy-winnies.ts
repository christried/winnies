import type { ChallengeStatus } from "../../shared/constants";

// The dummy set a dev Owner gets from `?seed=reset` (#236): one Winnie per Winnie state, and the edges the
// Workspace has to hold (50 Challenges, none, names at their caps). Pure data, offsets instead of dates, so
// the unit test needs no database; reset-dummy-winnies.ts turns the offsets into timestamps.
// Every row is one the app itself could have written (see dummy-winnies.test.ts).

export interface DummyChallenge {
  game: string; // 1 to 30 characters
  spec: string; // the Win Condition, "" for none, up to 40 characters
  status: ChallengeStatus;
  pinned: boolean;
  target: number; // 0 = no Counter
  count: number; // 0 when target is 0
  accumulatedSeconds: number;
  runningForSeconds: number | null; // null = timer stopped; else it started that long before the reset
}

export interface DummyWinnie {
  name: string; // 1 to 30 characters
  createdHoursAgo: number; // > 24: the Quota counts the last rolling 24 hours, so a reset leaves a full Quota
  totalAccumulatedSeconds: number;
  runningForSeconds: number | null; // the Total Timer, same meaning
  challenges: DummyChallenge[]; // position = index in the array
}

const FIFTY_TITLES = [
  "Portal 2",
  "Celeste",
  "Hades",
  "Spelunky",
  "Hollow Knight",
  "Dark Souls",
  "Tetris",
  "Doom Eternal",
  "Cuphead",
  "Super Meat Boy",
];

// No randomness: every reset writes the same rows.
const fiftyChallenges: DummyChallenge[] = Array.from({ length: 50 }, (_, i) => {
  const won = i % 5 === 0;
  const counter = i % 4 === 1;
  const active = i % 6 === 2 && !won;
  return {
    game: `${FIFTY_TITLES[i % FIFTY_TITLES.length]} #${String(i).padStart(2, "0")}`,
    spec: i % 2 === 0
      ? `Goal ${i}`
      : "",
    status: won
      ? "won"
      : active ? "active" : "todo",
    pinned: i % 7 === 3,
    target: counter ? 3 : 0,
    count: counter
      ? (won ? 3 : 1)
      : 0,
    accumulatedSeconds: active ? 300 : 0,
    runningForSeconds: null,
  };
});

// Newest first, the way the Workspace lists Winnies and opens the first: the Running one is the default landing.
export const DUMMY_WINNIES: DummyWinnie[] = [
  {
    name: "Evening Gauntlet",
    createdHoursAgo: 48,
    totalAccumulatedSeconds: 5400,
    runningForSeconds: 900,
    challenges: [
      {
        game: "Elden Ring",
        spec: "No hits taken",
        status: "active",
        pinned: true,
        target: 0,
        count: 0,
        accumulatedSeconds: 1200,
        runningForSeconds: 600,
      },
      {
        game: "Hades",
        spec: "",
        status: "todo",
        pinned: false,
        target: 0,
        count: 0,
        accumulatedSeconds: 0,
        runningForSeconds: null,
      },
      {
        game: "Celeste",
        spec: "No deaths",
        status: "active",
        pinned: false,
        target: 10,
        count: 4,
        accumulatedSeconds: 900,
        runningForSeconds: null,
      },
      {
        game: "Hollow Knight",
        spec: "",
        status: "won",
        pinned: false,
        target: 0,
        count: 0,
        accumulatedSeconds: 1800,
        runningForSeconds: null,
      },
      {
        game: "Tetris",
        spec: "Clear 40 lines",
        status: "won",
        pinned: false,
        target: 5,
        count: 5,
        accumulatedSeconds: 300,
        runningForSeconds: null,
      },
      {
        game: "Vampire Survivors",
        spec: "Survive 30 minutes",
        status: "won",
        pinned: true,
        target: 0,
        count: 0,
        accumulatedSeconds: 600,
        runningForSeconds: null,
      },
    ],
  },
  {
    name: "Fifty Challenges",
    createdHoursAgo: 72,
    totalAccumulatedSeconds: 14400,
    runningForSeconds: null,
    challenges: fiftyChallenges,
  },
  {
    // Name, a game and a Win Condition each sit at their cap.
    name: "Extremely Long Winnie Name Run",
    createdHoursAgo: 96,
    totalAccumulatedSeconds: 7260,
    runningForSeconds: null,
    challenges: [
      {
        game: "Teenage Mutant Ninja Turtles 2",
        spec: "Beat every boss without taking a hit now",
        status: "won",
        pinned: false,
        target: 0,
        count: 0,
        accumulatedSeconds: 3000,
        runningForSeconds: null,
      },
      {
        game: "Portal 2",
        spec: "",
        status: "won",
        pinned: true,
        target: 4,
        count: 4,
        accumulatedSeconds: 2400,
        runningForSeconds: null,
      },
      {
        game: "Doom Eternal",
        spec: "Ultra-Violence",
        status: "won",
        pinned: false,
        target: 0,
        count: 0,
        accumulatedSeconds: 1500,
        runningForSeconds: null,
      },
    ],
  },
  {
    name: "Nothing Yet",
    createdHoursAgo: 120,
    totalAccumulatedSeconds: 0,
    runningForSeconds: null,
    challenges: [],
  },
];
