const boardEditor = document.querySelector("#starting-board");
const marks = Array.from({ length: 9 }, () => Array(9).fill(""));
const unavailableCells = Array.from({ length: 9 }, () => Array(9).fill(false));
const winningLines = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6]
];

function renderBoardEditor() {
  boardEditor.replaceChildren();
  for (let boardIndex = 0; boardIndex < 9; boardIndex += 1) {
    const board = document.createElement("div");
    board.className = "challenge-mini-board";
    board.setAttribute("role", "group");
    board.setAttribute("aria-label", `Starting board ${boardIndex + 1}`);

    for (let cellIndex = 0; cellIndex < 9; cellIndex += 1) {
      const button = document.createElement("button");
      button.className = "challenge-cell";
      button.type = "button";
      const update = () => {
        const mark = marks[boardIndex][cellIndex];
        const unavailable = unavailableCells[boardIndex][cellIndex];
        button.textContent = unavailable ? "×" : mark;
        button.classList.toggle("mark-x", mark === "X");
        button.classList.toggle("mark-o", mark === "O");
        button.classList.toggle("rule-blocked", unavailable);
        button.setAttribute(
          "aria-label",
          `Board ${boardIndex + 1}, square ${cellIndex + 1}, ${unavailable ? "unavailable" : mark || "empty"}`
        );
      };
      button.addEventListener("click", () => {
        const mark = marks[boardIndex][cellIndex];
        const unavailable = unavailableCells[boardIndex][cellIndex];
        if (unavailable) {
          unavailableCells[boardIndex][cellIndex] = false;
          marks[boardIndex][cellIndex] = "";
        } else if (mark === "") {
          marks[boardIndex][cellIndex] = "X";
        } else if (mark === "X") {
          marks[boardIndex][cellIndex] = "O";
        } else {
          marks[boardIndex][cellIndex] = "";
          unavailableCells[boardIndex][cellIndex] = true;
        }
        update();
      });
      update();
      board.append(button);
    }

    boardEditor.append(board);
  }
}

function getStartingPosition() {
  const setup = [];
  const blocked = [];
  marks.forEach((board, boardIndex) => {
    board.forEach((mark, cellIndex) => {
      if (mark) setup.push({ board: boardIndex, cell: cellIndex, mark });
      if (unavailableCells[boardIndex][cellIndex]) blocked.push({ board: boardIndex, cell: cellIndex });
    });
  });
  return { setup, blocked };
}

function hasWinningBoard(setup) {
  const boards = Array.from({ length: 9 }, () => Array(9).fill(""));
  setup.forEach(({ board, cell, mark }) => { boards[board][cell] = mark; });
  return boards.some((board) =>
    winningLines.some(([a, b, c]) => board[a] && board[a] === board[b] && board[b] === board[c])
  );
}

function startMatch() {
  const { setup, blocked } = getStartingPosition();
  const error = document.querySelector("#local-error");
  if (setup.length + blocked.length > 40) {
    error.textContent = "Please use 40 or fewer starting marks and unavailable squares.";
    error.hidden = false;
    return;
  }
  if (hasWinningBoard(setup)) {
    error.textContent = "Remove a starting mark so no small board has already been won.";
    error.hidden = false;
    return;
  }

  const query = new URLSearchParams({
    mode: "local",
    routing: document.querySelector("#local-routing").value,
    firstPlayer: document.querySelector("#first-player").value,
    startBoard: document.querySelector("#start-board").value,
    setup: JSON.stringify(setup),
    blocked: JSON.stringify(blocked)
  });
  window.location.href = `index.html?${query.toString()}`;
}

document.querySelector("#clear-starting-board").addEventListener("click", () => {
  marks.forEach((board) => board.fill(""));
  unavailableCells.forEach((board) => board.fill(false));
  renderBoardEditor();
});
document.querySelector("#start-local-match").addEventListener("click", startMatch);

renderBoardEditor();
