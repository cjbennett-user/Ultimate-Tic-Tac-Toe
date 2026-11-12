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
  }
];

window.CAMPAIGN_STAGES.sort((a, b) => a.rating - b.rating || a.name.localeCompare(b.name));
