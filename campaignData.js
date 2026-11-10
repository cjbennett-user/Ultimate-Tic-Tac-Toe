window.CAMPAIGN_STAGES = [
  {
    name: "First Steps",
    rating: 400,
    description: "A gentle introduction. Learn to read the little boards.",
    setup: []
  },
  {
    name: "Corner Practice",
    rating: 600,
    description: "The AI is getting sharper. Plan where your move sends it.",
    setup: []
  },
  {
    name: "Board Tactician",
    rating: 800,
    description: "Watch for chances to win small boards and build a big-board line.",
    setup: []
  },
  {
    name: "The Climber",
    rating: 1000,
    description: "A stronger opponent with no special advantages.",
    setup: []
  },
  {
    name: "Head Start",
    rating: 900,
    description: "The AI is weaker than your previous opponent, but starts with an O in the center square of the center board.",
    setup: [{ board: 4, cell: 4 }]
  },
  {
    name: "Sharp Counterplay",
    rating: 1200,
    description: "A tough opponent that looks ahead and punishes careless moves.",
    setup: []
  },
  {
    name: "Two-Corner Trap",
    rating: 1100,
    description: "The AI is a little weaker, but already owns two opposite corners in the upper-left board.",
    setup: [{ board: 0, cell: 0 }, { board: 0, cell: 8 }]
  },
  {
    name: "Final Test",
    rating: 1500,
    description: "The strongest opponent in the campaign. Bring everything you have learned.",
    setup: []
  }
];
