const CAMPAIGN_PROGRESS_KEY = "ultimate-tic-tac-toe-campaign";
const PLAYER_PROGRESS_KEY = "ultimate-tic-tac-toe-player-campaign-progress";
const PLAYER_VERIFIED_KEY = "ultimate-tic-tac-toe-player-campaign-verified";
const PLAYER_STAGES_KEY = "ultimate-tic-tac-toe-player-campaigns";
const COMMUNITY_STAGES_PATH = "communityCampaigns";
const BANNED_WORDS = [
  "anal", "anus", "arse", "arsehole", "ass", "asshat", "asshole", "ballsack",
  "bastard", "bimbo", "bitch", "blowjob", "boner", "bullshit", "cock",
  "cocksucker", "coon", "crap", "cunt", "damn", "dick", "dildo", "dipshit",
  "douche", "dyke", "fag", "faggot", "fart", "fuck", "goddamn", "hell",
  "jackass", "jerkoff", "jizz", "kike", "motherfucker", "nazi", "nigger",
  "nigga", "nutsack", "penis", "piss", "prick", "pussy", "queef", "retard",
  "scrotum", "shit", "shite", "shithead", "slut", "spic", "tit", "tits",
  "twat", "vagina", "wank", "wanker", "wetback", "whore", "wop", "cum",
  "rape", "rapist", "pedophile", "pedo"
];
const stageList = document.querySelector("#stage-list");
const playerStageList = document.querySelector("#player-stage-list");
const playerStageEmpty = document.querySelector("#player-stage-empty");
const communityStageList = document.querySelector("#community-stage-list");
const communityStageEmpty = document.querySelector("#community-stage-empty");
const communityStatus = document.querySelector("#community-status");
const progressCopy = document.querySelector("#progress-copy");
const progressFill = document.querySelector("#progress-fill");
const progressBar = document.querySelector(".progress-track");
const challengeForm = document.querySelector("#challenge-form");
const challengeBoard = document.querySelector("#challenge-board");
const challengeFormStatus = document.querySelector("#challenge-form-status");
const challengeRating = document.querySelector("#challenge-rating");
const challengeRatingValue = document.querySelector("#challenge-rating-value");
const challengeCells = Array.from({ length: 9 }, () => Array(9).fill(""));
let communityStages = [];
let communityStageIds = new Set();
let communityDatabase;

function readIdSet(key) {
  try {
    const saved = JSON.parse(localStorage.getItem(key) || "[]");
    return new Set(Array.isArray(saved) ? saved.filter((id) => typeof id === "string") : []);
  } catch (error) {
    console.error("Could not read saved challenge progress.", error);
    return new Set();
  }
}

function readCampaignProgress() {
  const saved = localStorage.getItem(CAMPAIGN_PROGRESS_KEY);
  if (!saved) return new Set();
  try {
    const parsed = JSON.parse(saved);
    if (Array.isArray(parsed)) {
      return new Set(parsed.filter((id) => typeof id === "string"));
    }
    if (Number.isInteger(parsed) && parsed > 0) {
      localStorage.setItem(CAMPAIGN_PROGRESS_KEY, "[]");
    }
  } catch (error) {
    console.error("Could not read saved campaign progress.", error);
    return new Set();
  }
  return new Set();
}

function readPlayerStages() {
  try {
    const saved = JSON.parse(localStorage.getItem(PLAYER_STAGES_KEY) || "[]");
    return Array.isArray(saved) ? saved.filter((stage) =>
      stage && typeof stage.id === "string" &&
      typeof stage.name === "string" && Array.isArray(stage.setup)
    ) : [];
  } catch (error) {
    console.error("Could not read player-made challenges.", error);
    return [];
  }
}

function containsBannedWords(value) {
  const normalized = value.normalize("NFKC").toLowerCase()
    .replace(/[0]/g, "o")
    .replace(/[1!|]/g, "i")
    .replace(/[2]/g, "z")
    .replace(/[3]/g, "e")
    .replace(/[4@]/g, "a")
    .replace(/[5$]/g, "s")
    .replace(/[7]/g, "t")
    .replace(/[8]/g, "b")
    .replace(/[9]/g, "g")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(/\s+/);
  return BANNED_WORDS.some((word) => normalized.includes(word));
}

function isValidStage(stage) {
  const rules = stage?.rules && typeof stage.rules === "object" ? stage.rules : {};
  const validRouting = [
    "normal", "mirror", "free", "center", "random",
    "same_row", "same_column", "clockwise"
  ];
  if (!stage || typeof stage.id !== "string" ||
    typeof stage.name !== "string" || stage.name.length > 40 ||
    typeof stage.description !== "string" || stage.description.length > 120 ||
    containsBannedWords(stage.name) || containsBannedWords(stage.description) ||
    !Number.isFinite(Number(stage.rating)) || Number(stage.rating) < 400 ||
    Number(stage.rating) > 1500 ||
    stage.firstPlayer !== undefined && !["X", "O"].includes(stage.firstPlayer) ||
    stage.rules !== undefined && stage.rules !== null &&
      (typeof stage.rules !== "object" || Array.isArray(stage.rules)) ||
    !Array.isArray(stage.setup) || stage.setup.length > 24 ||
    !stage.setup.every((mark) => mark && Number.isInteger(mark.board) && mark.board >= 0 && mark.board < 9 &&
      Number.isInteger(mark.cell) && mark.cell >= 0 && mark.cell < 9 &&
      ["X", "O"].includes(mark.mark)) ||
    !validRouting.includes(rules.routing || "normal")) {
    return false;
  }
  const blockedCells = rules.blockedCells || [];
  return Array.isArray(blockedCells) && blockedCells.length <= 40 &&
    blockedCells.every((cell) => cell && Number.isInteger(cell.board) && cell.board >= 0 && cell.board < 9 &&
      Number.isInteger(cell.cell) && cell.cell >= 0 && cell.cell < 9 &&
      !stage.setup.some((mark) => mark.board === cell.board && mark.cell === cell.cell));
}

function getFirebaseApp() {
  if (!window.firebase || !window.FIREBASE_CONFIG) {
    throw new Error("Firebase could not load. Check your internet connection and reload.");
  }
  return window.firebase.apps.length
    ? window.firebase.app()
    : window.firebase.initializeApp(window.FIREBASE_CONFIG);
}

function getCommunityDatabase() {
  if (!communityDatabase) {
    communityDatabase = window.firebase.database(getFirebaseApp());
  }
  return communityDatabase;
}

function getAnonymousUser(auth) {
  if (auth.currentUser) return Promise.resolve(auth.currentUser);
  return new Promise((resolve, reject) => {
    let unsubscribe = () => {};
    unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        unsubscribe();
        resolve(user);
      } else {
        unsubscribe();
        auth.signInAnonymously().then(({ user: newUser }) => resolve(newUser), reject);
      }
    }, (error) => {
      unsubscribe();
      reject(error);
    });
  });
}

function createStageCard(stage, number, isComplete, mode = "campaign") {
  const card = document.createElement("a");
  card.className = "stage-card";
  if (isComplete) card.classList.add("complete");
  card.href = mode === "playerCampaignTest"
    ? `index.html?mode=playerCampaignTest&id=${encodeURIComponent(stage.id)}`
    : mode === "playerCampaign"
      ? `index.html?mode=playerCampaign&id=${encodeURIComponent(stage.id)}`
      : `index.html?mode=campaign&stage=${number}`;
  card.setAttribute("aria-label", `Start challenge: ${stage.name}, AI rating ${stage.rating}`);

  const stageNumber = document.createElement("span");
  stageNumber.className = "stage-number";
  stageNumber.textContent = isComplete ? "✓" : String(number);

  const copy = document.createElement("span");
  copy.className = "stage-copy";
  const name = document.createElement("span");
  name.className = "stage-name";
  name.textContent = stage.name;
  const description = document.createElement("span");
  description.className = "stage-description";
  description.textContent = stage.description;
  copy.append(name, description);

  const details = document.createElement("span");
  details.className = "stage-copy";
  const rating = document.createElement("span");
  rating.className = "stage-rating";
  rating.textContent = `${stage.rating} Elo`;
  const state = document.createElement("span");
  state.className = "stage-status";
  state.textContent = isComplete ? "Verified · Play again" : "Play ›";
  details.append(rating, state);

  card.append(stageNumber, copy, details);
  return card;
}

function renderCampaign() {
  const completed = readCampaignProgress();
  const completedCount = CAMPAIGN_STAGES.filter((stage) => completed.has(stage.id)).length;
  progressCopy.textContent = `${completedCount} of ${CAMPAIGN_STAGES.length} challenges complete`;
  progressFill.style.width = `${(completedCount / CAMPAIGN_STAGES.length) * 100}%`;
  progressBar.setAttribute("aria-valuemax", String(CAMPAIGN_STAGES.length));
  progressBar.setAttribute("aria-valuenow", String(completedCount));
  stageList.replaceChildren();

  CAMPAIGN_STAGES.forEach((stage, index) => {
    stageList.append(createStageCard(stage, index + 1, completed.has(stage.id)));
  });
}

function renderPlayerStages() {
  const stages = readPlayerStages();
  const verified = readIdSet(PLAYER_VERIFIED_KEY);
  playerStageList.replaceChildren();
  playerStageEmpty.hidden = stages.length > 0;

  stages.forEach((stage, index) => {
    const row = document.createElement("div");
    row.className = "player-stage-row";
    row.append(createStageCard(stage, index + 1, verified.has(stage.id), "playerCampaignTest"));

    const actions = document.createElement("div");
    actions.className = "player-stage-actions";
    const publish = document.createElement("button");
    publish.className = "publish-stage";
    publish.type = "button";
    publish.textContent = communityStageIds.has(stage.id)
      ? "Published"
      : verified.has(stage.id) ? "Publish" : "Beat to publish";
    publish.disabled = !verified.has(stage.id) || communityStageIds.has(stage.id);
    publish.dataset.stageId = stage.id;
    actions.append(publish);

    const remove = document.createElement("button");
    remove.className = "delete-stage";
    remove.type = "button";
    remove.textContent = "Delete";
    remove.setAttribute("aria-label", `Delete ${stage.name}`);
    remove.dataset.stageId = stage.id;
    actions.append(remove);
    row.append(actions);
    playerStageList.append(row);
  });
}

function renderCommunityStages() {
  communityStageList.replaceChildren();
  communityStageEmpty.hidden = communityStages.length > 0;
  communityStageEmpty.textContent = communityStages.length
    ? ""
    : "No published community challenges yet.";
  communityStages.forEach((stage, index) => {
    communityStageList.append(createStageCard(stage, index + 1, false, "playerCampaign"));
  });
}

function watchCommunityStages() {
  try {
    getCommunityDatabase().ref(COMMUNITY_STAGES_PATH).on("value", (snapshot) => {
      const saved = snapshot.val() || {};
      communityStages = Object.values(saved).filter((stage) => {
        if (isValidStage(stage)) return true;
        console.warn("A community challenge was hidden because its content or format is invalid.");
        return false;
      }).sort((a, b) => a.name.localeCompare(b.name));
      communityStageIds = new Set(communityStages.map((stage) => stage.id));
      communityStatus.textContent = "";
      renderCommunityStages();
      renderPlayerStages();
    }, (error) => {
      console.error("Could not load community challenges.", error);
      communityStatus.textContent =
        "Community challenges are unavailable. Check Firebase Realtime Database read rules.";
      communityStageEmpty.hidden = true;
    });
  } catch (error) {
    console.error("Could not connect to community challenges.", error);
    communityStatus.textContent = error.message || "Could not connect to Firebase.";
    communityStageEmpty.textContent = "Community challenges could not be loaded.";
  }
}

function renderChallengeBoard() {
  challengeBoard.replaceChildren();
  for (let boardIndex = 0; boardIndex < 9; boardIndex += 1) {
    const board = document.createElement("div");
    board.className = "challenge-mini-board";
    board.setAttribute("role", "group");
    board.setAttribute("aria-label", `Starting board ${boardIndex + 1}`);
    for (let cellIndex = 0; cellIndex < 9; cellIndex += 1) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "challenge-cell";
      button.dataset.board = String(boardIndex);
      button.dataset.cell = String(cellIndex);
      button.setAttribute("aria-label", `Board ${boardIndex + 1}, square ${cellIndex + 1}, empty`);
      button.addEventListener("click", () => {
        const cycle = ["", "X", "O", "blocked"];
        const next = cycle[(cycle.indexOf(challengeCells[boardIndex][cellIndex]) + 1) % cycle.length];
        challengeCells[boardIndex][cellIndex] = next;
        button.textContent = next === "blocked" ? "×" : next;
        button.classList.toggle("mark-x", next === "X");
        button.classList.toggle("mark-o", next === "O");
        button.classList.toggle("cell-blocked", next === "blocked");
        button.setAttribute(
          "aria-label",
          `Board ${boardIndex + 1}, square ${cellIndex + 1}, ${next || "empty"}`
        );
      });
      board.append(button);
    }
    challengeBoard.append(board);
  }
}

async function publishPlayerStage(stageId, button) {
  const sourceStage = readPlayerStages().find((item) => item.id === stageId);
  if (!sourceStage || !readIdSet(PLAYER_VERIFIED_KEY).has(stageId)) {
    challengeFormStatus.textContent = "Beat this challenge once before publishing it.";
    return;
  }
  const stage = {
    ...sourceStage,
    firstPlayer: sourceStage.firstPlayer || "X",
    rules: {
      ...sourceStage.rules,
      routing: sourceStage.rules?.routing || "normal",
      blockedCells: sourceStage.rules?.blockedCells || []
    }
  };
  if (!isValidStage(stage)) {
    challengeFormStatus.textContent = "This challenge has invalid settings or title/description wording.";
    return;
  }

  button.disabled = true;
  button.textContent = "Publishing…";
  try {
    const app = getFirebaseApp();
    const user = await getAnonymousUser(window.firebase.auth(app));
    const published = {
      ...stage,
      authorUid: user.uid,
      verifiedBy: user.uid,
      verifiedAt: Date.now(),
      submittedAt: Date.now()
    };
    await getCommunityDatabase().ref(`${COMMUNITY_STAGES_PATH}/${stage.id}`).set(published);
    communityStatus.textContent = "Challenge published for everyone!";
    challengeFormStatus.textContent = "";
  } catch (error) {
    console.error("Could not publish the community challenge.", error);
    button.disabled = false;
    button.textContent = "Publish";
    communityStatus.textContent = error.code === "PERMISSION_DENIED"
      ? "Firebase blocked publishing. Add authenticated read/write rules for communityCampaigns in Realtime Database."
      : `Could not publish: ${error.message || "check your Firebase connection."}`;
  }
}

challengeRating.addEventListener("input", () => {
  challengeRatingValue.value = challengeRating.value;
  challengeRatingValue.textContent = challengeRating.value;
});

document.querySelector("#clear-challenge-board").addEventListener("click", () => {
  challengeCells.forEach((board) => board.fill(""));
  renderChallengeBoard();
});

challengeForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const name = document.querySelector("#challenge-name").value.trim();
  const description = document.querySelector("#challenge-description").value.trim();
  if (!name || !description) {
    challengeFormStatus.textContent = "Enter a name and description for your challenge.";
    return;
  }
  if (containsBannedWords(name) || containsBannedWords(description)) {
    challengeFormStatus.textContent = "Please remove profanity or abusive wording from the title and description.";
    return;
  }

  const setup = [];
  const blockedCells = [];
  challengeCells.forEach((board, boardIndex) => {
    board.forEach((mark, cellIndex) => {
      if (mark === "X" || mark === "O") setup.push({ board: boardIndex, cell: cellIndex, mark });
      if (mark === "blocked") blockedCells.push({ board: boardIndex, cell: cellIndex });
    });
  });
  const selectedStartBoard = Number(document.querySelector("#challenge-start-board").value);
  const routing = document.querySelector("#challenge-routing").value;
  const occupiedCells = new Set(setup.map((mark) => `${mark.board}:${mark.cell}`));
  const closedCells = new Set(blockedCells.map((cell) => `${cell.board}:${cell.cell}`));
  const winningLines = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8],
    [0, 3, 6], [1, 4, 7], [2, 5, 8],
    [0, 4, 8], [2, 4, 6]
  ];
  const hasStartingWin = challengeCells.some((board) =>
    winningLines.some(([a, b, c]) => board[a] && board[a] !== "blocked" &&
      board[a] === board[b] && board[a] === board[c])
  );
  const startBoardFull = selectedStartBoard >= 0 &&
    challengeCells[selectedStartBoard].every((mark) => mark !== "");
  if (setup.length > 24 || blockedCells.length > 40 || setup.length + blockedCells.length > 40) {
    challengeFormStatus.textContent = "Use at most 40 starting marks and closed squares combined.";
    return;
  }
  if (hasStartingWin) {
    challengeFormStatus.textContent = "Remove a starting mark: no small board can already have a winner.";
    return;
  }
  if (startBoardFull) {
    challengeFormStatus.textContent = "Choose a starting board with at least one playable square.";
    return;
  }
  if (occupiedCells.size !== setup.length || closedCells.size !== blockedCells.length) {
    challengeFormStatus.textContent = "The starting position has duplicate squares.";
    return;
  }

  const stage = {
    id: window.crypto.randomUUID ? window.crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    name,
    description,
    rating: Number(challengeRating.value),
    firstPlayer: document.querySelector("#challenge-first-player").value,
    setup,
    rules: {
      routing,
      blockedCells,
      ...(selectedStartBoard >= 0 ? { startBoard: selectedStartBoard } : {})
    }
  };

  try {
    const stages = readPlayerStages();
    stages.push(stage);
    localStorage.setItem(PLAYER_STAGES_KEY, JSON.stringify(stages));
    challengeForm.reset();
    challengeRating.value = "600";
    challengeRatingValue.value = "600";
    challengeRatingValue.textContent = "600";
    challengeCells.forEach((board) => board.fill(""));
    renderChallengeBoard();
    challengeFormStatus.textContent = "Challenge saved. Beat it once to unlock publishing.";
    renderPlayerStages();
  } catch (error) {
    challengeFormStatus.textContent = `Could not save your challenge: ${error.message}`;
  }
});

playerStageList.addEventListener("click", (event) => {
  const publishButton = event.target.closest(".publish-stage");
  if (publishButton && !publishButton.disabled) {
    publishPlayerStage(publishButton.dataset.stageId, publishButton);
    return;
  }
  const deleteButton = event.target.closest(".delete-stage");
  if (!deleteButton) return;
  const stages = readPlayerStages().filter((stage) => stage.id !== deleteButton.dataset.stageId);
  try {
    localStorage.setItem(PLAYER_STAGES_KEY, JSON.stringify(stages));
    const verified = readIdSet(PLAYER_VERIFIED_KEY);
    verified.delete(deleteButton.dataset.stageId);
    localStorage.setItem(PLAYER_VERIFIED_KEY, JSON.stringify([...verified]));
    renderPlayerStages();
  } catch (error) {
    challengeFormStatus.textContent = `Could not delete the challenge: ${error.message}`;
  }
});

renderChallengeBoard();
renderCampaign();
renderPlayerStages();
watchCommunityStages();
