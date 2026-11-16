window.CAMPAIGN_STAGES = [
  {
    id: "first-steps",
    name: "First Steps",
    rating: 400,
    description: "A gentle introduction. Learn to read the little boards.",
    setup: [],
    rules: {}
  },
  {
    id: "center-spark",
    name: "Center Spark",
    rating: 450,
    description: "The AI starts with the center of the center board. Find a way to turn that foothold around.",
    setup: [{ board: 4, cell: 4 }],
    rules: {}
  },
  {
    id: "reverse-dispatch",
    name: "Reverse Dispatch",
    rating: 450,
    description: "Your move sends the AI to the mirrored square on the opposite side of the board.",
    setup: [],
    rules: { routing: "mirror" }
  },
  {
    id: "corner-kickoff",
    name: "Corner Kickoff",
    rating: 500,
    description: "Two distant boards each begin with an AI mark. Make your moves count across the board.",
    setup: [{ board: 0, cell: 4 }, { board: 8, cell: 4 }],
    rules: {}
  },
  {
    id: "open-doors",
    name: "Open Doors",
    rating: 500,
    description: "Forget the usual routing: after every move, either player may choose any open board.",
    setup: [],
    rules: { routing: "free" }
  },
  {
    id: "open-doors-strong",
    name: "Open Doors: Quick Thinker",
    rating: 750,
    description: "The free-choice boards are back, but this sharper AI is ready to use every route.",
    setup: [],
    rules: { routing: "free" }
  },
  {
    id: "two-board-start",
    name: "Two-Board Start",
    rating: 550,
    description: "The AI has a center-board foothold and a corner-board opening.",
    setup: [{ board: 4, cell: 4 }, { board: 0, cell: 0 }],
    rules: {}
  },
  {
    id: "center-gravity",
    name: "Center Gravity",
    rating: 550,
    description: "Every move pulls the next player toward the center board, if it is still open.",
    setup: [],
    rules: { routing: "center" }
  },
  {
    id: "center-gravity-strong",
    name: "Center Gravity: Heavy Pull",
    rating: 800,
    description: "The center-board tug returns with a stronger AI that knows how to turn it into a trap.",
    setup: [],
    rules: { routing: "center" }
  },
  {
    id: "corner-ban",
    name: "Corner Ban",
    rating: 600,
    description: "The four corners of every small board are off limits. Win with the squares in between.",
    setup: [],
    rules: { blocked: "corners" }
  },
  {
    id: "corner-practice",
    name: "Corner Practice",
    rating: 600,
    description: "The AI is getting sharper. Plan where your move sends it.",
    setup: [],
    rules: {}
  },
  {
    id: "forked-opening",
    name: "Forked Opening",
    rating: 600,
    description: "Three small boards start with AI marks. Choose moves that keep more than one plan open.",
    setup: [{ board: 1, cell: 4 }, { board: 4, cell: 0 }, { board: 7, cell: 4 }],
    rules: {}
  },
  {
    id: "center-ban",
    name: "Center Ban",
    rating: 650,
    description: "Center squares are closed in every small board. Find a winning line along the edges.",
    setup: [],
    rules: { blocked: "centers" }
  },
  {
    id: "diagonal-drill",
    name: "Diagonal Drill",
    rating: 700,
    description: "AI marks appear across a diagonal of small boards. Try to take control of the big-board center.",
    setup: [{ board: 0, cell: 0 }, { board: 4, cell: 4 }, { board: 8, cell: 8 }],
    rules: {}
  },
  {
    id: "mirror-maze",
    name: "Mirror Maze",
    rating: 700,
    description: "Mirrored routing and three AI opening marks make every destination a puzzle.",
    setup: [{ board: 0, cell: 4 }, { board: 4, cell: 0 }, { board: 8, cell: 4 }],
    rules: { routing: "mirror" }
  },
  {
    id: "free-range",
    name: "Free Range",
    rating: 750,
    description: "Play anywhere, but the AI opens in the center board and has a small head start.",
    setup: [{ board: 4, cell: 0 }, { board: 4, cell: 8 }],
    rules: { routing: "free", startBoard: 4 }
  },
  {
    id: "board-tactician",
    name: "Board Tactician",
    rating: 800,
    description: "Watch for chances to win small boards and build a big-board line.",
    setup: [],
    rules: {}
  },
  {
    id: "four-mark-frenzy",
    name: "Four-Mark Frenzy",
    rating: 800,
    description: "The AI has four scattered marks on the board. Break up its plans before they connect.",
    setup: [
      { board: 0, cell: 0 },
      { board: 2, cell: 2 },
      { board: 4, cell: 6 },
      { board: 8, cell: 8 }
    ],
    rules: {}
  },
  {
    id: "center-board-conquered",
    name: "Center Board Conquered",
    rating: 800,
    description: "The AI already owns a completely filled center mini-board. Claim other boards before it builds a big-board line.",
    setup: [
      { board: 4, cell: 0, mark: "O" },
      { board: 4, cell: 1, mark: "O" },
      { board: 4, cell: 2, mark: "O" },
      { board: 4, cell: 3, mark: "X" },
      { board: 4, cell: 4, mark: "X" },
      { board: 4, cell: 5, mark: "X" },
      { board: 4, cell: 6, mark: "X" },
      { board: 4, cell: 7, mark: "X" },
      { board: 4, cell: 8, mark: "X" }
    ],
    rules: {}
  },
  {
    id: "center-lock",
    name: "Center Lock",
    rating: 850,
    description: "The AI begins in the center board, which is also the only board you can play first.",
    setup: [{ board: 4, cell: 0 }, { board: 4, cell: 8 }],
    rules: { startBoard: 4 }
  },
  {
    id: "head-start",
    name: "Head Start",
    rating: 900,
    description: "The AI is weaker than its rating suggests, but starts with an O in the center square of the center board.",
    setup: [{ board: 4, cell: 4 }],
    rules: {}
  },
  {
    id: "looking-glass",
    name: "Looking Glass",
    rating: 900,
    description: "A stronger AI starts with a pair of marks, and your moves send it to the reflected board.",
    setup: [{ board: 2, cell: 0 }, { board: 6, cell: 8 }],
    rules: { routing: "mirror" }
  },
  {
    id: "the-climber",
    name: "The Climber",
    rating: 1000,
    description: "A stronger opponent with no special advantages.",
    setup: [],
    rules: {}
  },
  {
    id: "two-corner-trap",
    name: "Two-Corner Trap",
    rating: 1100,
    description: "The AI is a little weaker, but already owns two opposite corners in the upper-left board.",
    setup: [{ board: 0, cell: 0 }, { board: 0, cell: 8 }],
    rules: {}
  },
  {
    id: "sharp-counterplay",
    name: "Sharp Counterplay",
    rating: 1200,
    description: "A tough opponent that looks ahead and punishes careless moves.",
    setup: [],
    rules: {}
  },
  {
    id: "final-test",
    name: "Final Test",
    rating: 1500,
    description: "The strongest opponent in the campaign. Bring everything you have learned.",
    setup: [],
    rules: {}
  },
  {
    id: "loose-leash",
    name: "Loose Leash",
    rating: 450,
    description: "After your move, the AI may choose any open board. After its move, your destination is routed normally.",
    setup: [{ board: 4, cell: 4, mark: "O" }],
    rules: { routing: "ai_free" }
  },
  {
    id: "echo-play",
    name: "Echo Play",
    rating: 500,
    description: "Each of your moves echoes onto the opposite mini-board and opposite square when that spot is open.",
    setup: [{ board: 4, cell: 0, mark: "O" }],
    rules: { routing: "player_mirror" }
  },
  {
    id: "crossroads-closed",
    name: "Crossroads Closed",
    rating: 500,
    description: "The center squares are closed only in the five boards that form a cross.",
    setup: [],
    rules: {
      blockedCells: [
        { board: 1, cell: 4 }, { board: 3, cell: 4 }, { board: 4, cell: 4 },
        { board: 5, cell: 4 }, { board: 7, cell: 4 }
      ]
    }
  },
  {
    id: "tight-turn",
    name: "Tight Turn",
    rating: 550,
    description: "Start in the center board, where the corner squares are closed. Find a route through the middle.",
    setup: [{ board: 4, cell: 1, mark: "O" }],
    rules: {
      startBoard: 4,
      blockedCells: [
        { board: 4, cell: 0 }, { board: 4, cell: 2 },
        { board: 4, cell: 6 }, { board: 4, cell: 8 }
      ]
    }
  },
  {
    id: "reflected-detour",
    name: "Reflected Detour",
    rating: 600,
    description: "Mirrored routing is on, and one square in the center board is closed. Plan your destination carefully.",
    setup: [{ board: 4, cell: 0, mark: "O" }],
    rules: { routing: "mirror", blockedCells: [{ board: 4, cell: 8 }] }
  },
  {
    id: "random-dispatch",
    name: "Random Dispatch",
    rating: 600,
    description: "Every move sends the next player to a randomly chosen open board. Adapt to the surprise.",
    setup: [{ board: 0, cell: 4, mark: "O" }],
    rules: { routing: "random" }
  },
  {
    id: "row-runner",
    name: "Row Runner",
    rating: 650,
    description: "The next player chooses an open board from the row matching the square just played.",
    setup: [{ board: 4, cell: 0, mark: "O" }],
    rules: { routing: "same_row", startBoard: 4 }
  },
  {
    id: "column-climb",
    name: "Column Climb",
    rating: 650,
    description: "Keep an eye on the columns: each move limits the next player to that column of boards.",
    setup: [{ board: 2, cell: 4, mark: "O" }],
    rules: { routing: "same_column", startBoard: 2 }
  },
  {
    id: "clockwork-corner",
    name: "Clockwork Corner",
    rating: 700,
    description: "Routing moves clockwise around the outer ring. The center square sends play to the first open ring board.",
    setup: [{ board: 0, cell: 4, mark: "O" }],
    rules: { routing: "clockwise", startBoard: 0 }
  },
  {
    id: "echo-alley",
    name: "Echo Alley",
    rating: 700,
    description: "Your marks echo across the big board, but a closed destination can block the echo.",
    setup: [{ board: 0, cell: 0, mark: "O" }],
    rules: {
      routing: "player_mirror",
      blockedCells: [{ board: 8, cell: 8 }, { board: 4, cell: 4 }]
    }
  },
  {
    id: "ai-open-season",
    name: "AI Open Season",
    rating: 750,
    description: "The AI can roam after your move, but its own move sends you to the matching board.",
    setup: [
      { board: 4, cell: 0, mark: "O" },
      { board: 4, cell: 8, mark: "X" }
    ],
    rules: { routing: "ai_free" }
  },
  {
    id: "broken-compass",
    name: "Broken Compass",
    rating: 800,
    description: "Random routing returns, with the center square closed in two busy boards.",
    setup: [{ board: 4, cell: 0, mark: "O" }, { board: 4, cell: 8, mark: "X" }],
    rules: {
      routing: "random",
      blockedCells: [{ board: 1, cell: 4 }, { board: 7, cell: 4 }]
    }
  },
  {
    id: "four-locks",
    name: "Four Locks",
    rating: 850,
    description: "Four carefully placed squares are unavailable. Find a way to win around the gaps.",
    setup: [
      { board: 4, cell: 0, mark: "O" },
      { board: 0, cell: 4, mark: "X" },
      { board: 8, cell: 4, mark: "O" }
    ],
    rules: {
      blockedCells: [
        { board: 0, cell: 0 }, { board: 2, cell: 4 },
        { board: 6, cell: 4 }, { board: 8, cell: 8 }
      ]
    }
  },
  {
    id: "players-pick",
    name: "Player's Pick",
    rating: 1400,
    description: "After the AI moves you may choose any board. Your move routes the AI normally, so set a trap.",
    setup: [{ board: 4, cell: 4, mark: "O" }],
    rules: { routing: "human_free" }
  },
  {
    id: "More open doors",
    name: "More Open Doors",
    rating: 1000,
    description: "Move to any board you want but dont get locked out of your win.",
    setup: [],
    rules: { routing: "free" }
  },
];

// This list controls campaign progression independently of each challenge's AI strength.
const CAMPAIGN_STAGE_ORDER = [
  "first-steps",
  "center-spark",
  "loose-leash",
  "reverse-dispatch",
  "corner-kickoff",
  "crossroads-closed",
  "echo-play",
  "open-doors",
  "players-pick",
  "center-gravity",
  "tight-turn",
  "two-board-start",
  "corner-ban",
  "corner-practice",
  "forked-opening",
  "random-dispatch",
  "reflected-detour",
  "center-ban",
  "column-climb",
  "row-runner",
  "clockwork-corner",
  "diagonal-drill",
  "echo-alley",
  "mirror-maze",
  "ai-open-season",
  "free-range",
  "open-doors-strong",
  "board-tactician",
  "broken-compass",
  "center-board-conquered",
  "center-gravity-strong",
  "four-mark-frenzy",
  "center-lock",
  "four-locks",
  "head-start",
  "looking-glass",
  "More open doors",
  "the-climber",
  "two-corner-trap",
  "sharp-counterplay",
  "final-test"
];
const campaignStageOrder = new Map(CAMPAIGN_STAGE_ORDER.map((id, index) => [id, index]));

window.CAMPAIGN_STAGES.sort((a, b) => {
  const aOrder = campaignStageOrder.get(a.id);
  const bOrder = campaignStageOrder.get(b.id);
  if (aOrder !== undefined || bOrder !== undefined) {
    if (aOrder === undefined) return 1;
    if (bOrder === undefined) return -1;
    return aOrder - bOrder;
  }
  return a.rating - b.rating || a.name.localeCompare(b.name);
});
