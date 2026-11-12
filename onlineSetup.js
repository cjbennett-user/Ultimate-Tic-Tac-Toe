const createRoomButton = document.querySelector("#create-room");
const joinRoomForm = document.querySelector("#join-room-form");
const roomCodeInput = document.querySelector("#room-code-input");
const onlineError = document.querySelector("#online-error");
const onlineProgress = document.querySelector("#online-progress");
const routingInput = document.querySelector("#online-routing");
const enableHandicapInput = document.querySelector("#enable-handicap");
const handicapEditor = document.querySelector("#handicap-editor");
const handicapBoard = document.querySelector("#handicap-board");
const roomCodeCharacters = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const handicapMarks = Array.from({ length: 9 }, () => Array(9).fill(""));

let requestInProgress = false;

function renderHandicapBoard() {
  handicapBoard.replaceChildren();
  for (let boardIndex = 0; boardIndex < 9; boardIndex += 1) {
    const board = document.createElement("div");
    board.className = "challenge-mini-board";
    board.setAttribute("role", "group");
    board.setAttribute("aria-label", `Starting board ${boardIndex + 1}`);

    for (let cellIndex = 0; cellIndex < 9; cellIndex += 1) {
      const button = document.createElement("button");
      button.className = "challenge-cell";
      button.type = "button";
      button.dataset.board = String(boardIndex);
      button.dataset.cell = String(cellIndex);
      button.setAttribute("aria-label", `Board ${boardIndex + 1}, square ${cellIndex + 1}, empty`);
      button.addEventListener("click", () => {
        const current = handicapMarks[boardIndex][cellIndex];
        const next = current === "" ? "X" : current === "X" ? "O" : "";
        handicapMarks[boardIndex][cellIndex] = next;
        button.textContent = next;
        button.classList.toggle("mark-x", next === "X");
        button.classList.toggle("mark-o", next === "O");
        button.setAttribute(
          "aria-label",
          `Board ${boardIndex + 1}, square ${cellIndex + 1}, ${next || "empty"}`
        );
      });
      board.append(button);
    }

    handicapBoard.append(board);
  }
}

function getHandicapSetup() {
  const setup = [];
  handicapMarks.forEach((board, boardIndex) => {
    board.forEach((mark, cellIndex) => {
      if (mark) setup.push({ board: boardIndex, cell: cellIndex, mark });
    });
  });
  return setup;
}

function hasWinningStartingLine(setup) {
  const lines = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8],
    [0, 3, 6], [1, 4, 7], [2, 5, 8],
    [0, 4, 8], [2, 4, 6]
  ];
  return ["X", "O"].some((mark) => {
    const boards = Array.from({ length: 9 }, () => Array(9).fill(""));
    setup.forEach((cell) => {
      if (cell.mark === mark) boards[cell.board][cell.cell] = mark;
    });
    return boards.some((board) =>
      lines.some(([a, b, c]) => board[a] === mark && board[b] === mark && board[c] === mark)
    );
  });
}

function makeRoomCode() {
  const randomValues = new Uint32Array(8);
  window.crypto.getRandomValues(randomValues);
  return Array.from(randomValues, (value) =>
    roomCodeCharacters[value % roomCodeCharacters.length]
  ).join("");
}

function setBusy(isBusy, message = "") {
  requestInProgress = isBusy;
  createRoomButton.disabled = isBusy;
  joinRoomForm.querySelector("button[type='submit']").disabled = isBusy;
  onlineProgress.textContent = message;
}

function showError(error) {
  onlineError.hidden = false;
  onlineError.textContent = error.message || "Could not connect to Firebase. Please try again.";
}

function newGameState(setup) {
  const cells = Array.from({ length: 9 }, () => Array(9).fill(""));
  setup.forEach(({ board, cell, mark }) => {
    cells[board][cell] = mark;
  });
  return {
    cells,
    boardResults: cells.map((board) => {
      for (const [a, b, c] of [
        [0, 1, 2], [3, 4, 5], [6, 7, 8],
        [0, 3, 6], [1, 4, 7], [2, 5, 8],
        [0, 4, 8], [2, 4, 6]
      ]) {
        if (board[a] && board[a] === board[b] && board[b] === board[c]) return board[a];
      }
      return "";
    }),
    currentPlayer: "X",
    nextBoard: -1,
    result: "",
    updatedAt: Date.now()
  };
}

function openRoom(roomCode) {
  window.location.href = `index.html?mode=online&room=${encodeURIComponent(roomCode)}`;
}

async function createRoom() {
  const setup = enableHandicapInput.checked ? getHandicapSetup() : [];
  if (setup.length > 24) {
    throw new Error("Please use 24 or fewer starting marks so both players have room to play.");
  }
  if (hasWinningStartingLine(setup)) {
    throw new Error("Remove a starting mark: the handicap cannot begin with a small board already won.");
  }

  const { database, user, profile } = await window.PlayerAccount.initialize();
  const uid = user.uid;
  await window.PlayerAccount.cleanupRooms(database, uid);
  let roomCode;
  let roomCreated = false;

  for (let attempt = 0; attempt < 3 && !roomCreated; attempt += 1) {
    roomCode = makeRoomCode();
    try {
      await database.ref(`rooms/${roomCode}`).set({
        hostUid: uid,
        hostRating: Number(profile.rating) || window.PlayerAccount.startingRating,
        guestUid: null,
        createdAt: Date.now(),
        customRules: {
          routing: ["mirror", "free", "random", "same_row", "same_column", "clockwise"].includes(routingInput.value)
            ? routingInput.value
            : "normal",
          setup
        },
        state: newGameState(setup)
      });
      roomCreated = true;
    } catch (error) {
      if (error.code !== "PERMISSION_DENIED") throw error;
    }
  }

  if (!roomCreated) throw new Error("Could not reserve a unique room code. Please try again.");
  await database.ref(`playerRooms/${uid}/${roomCode}`).set(true);
  openRoom(roomCode);
}

async function joinRoom(roomCode) {
  const { database, user, profile } = await window.PlayerAccount.initialize();
  const uid = user.uid;
  await window.PlayerAccount.cleanupRooms(database, uid);
  const roomRef = database.ref(`rooms/${roomCode}`);
  await roomRef.child("guestUid").set(uid);
  await roomRef.child("guestRating").set(Number(profile.rating) || window.PlayerAccount.startingRating);
  await database.ref(`playerRooms/${uid}/${roomCode}`).set(true);
  openRoom(roomCode);
}

enableHandicapInput.addEventListener("change", () => {
  handicapEditor.hidden = !enableHandicapInput.checked;
});

document.querySelector("#clear-handicap-board").addEventListener("click", () => {
  handicapMarks.forEach((board) => board.fill(""));
  renderHandicapBoard();
});

createRoomButton.addEventListener("click", async () => {
  if (requestInProgress) return;
  onlineError.hidden = true;
  setBusy(true, "Connecting and creating your room…");

  try {
    await createRoom();
  } catch (error) {
    setBusy(false);
    showError(error);
  }
});

roomCodeInput.addEventListener("input", () => {
  roomCodeInput.value = roomCodeInput.value.toUpperCase().replace(/[^A-HJ-NP-Z2-9]/g, "").slice(0, 8);
});

joinRoomForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (requestInProgress) return;

  const roomCode = roomCodeInput.value.trim();
  if (!/^[A-HJ-NP-Z2-9]{8}$/.test(roomCode)) {
    onlineError.hidden = false;
    onlineError.textContent = "Enter the 8-character room code shared by the room creator.";
    return;
  }

  onlineError.hidden = true;
  setBusy(true, "Connecting and joining the room…");
  try {
    await joinRoom(roomCode);
  } catch (error) {
    setBusy(false);
    showError(error.code === "PERMISSION_DENIED"
      ? new Error("That room code is invalid, full, already finished, or belongs to you.")
      : error);
  }
});

renderHandicapBoard();

const invitedRoomCode = new URLSearchParams(window.location.search).get("join");
if (invitedRoomCode) {
  roomCodeInput.value = invitedRoomCode.toUpperCase().replace(/[^A-HJ-NP-Z2-9]/g, "").slice(0, 8);
  joinRoomForm.requestSubmit();
}
