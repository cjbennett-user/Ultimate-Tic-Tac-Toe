const winningLines = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8],
      [0, 3, 6], [1, 4, 7], [2, 5, 8],
      [0, 4, 8], [2, 4, 6]
    ];

    const boardsElement = document.querySelector("#boards");
    const statusElement = document.querySelector("#status");
    const resetButton = document.querySelector("#reset");
    const secondPlayerElement = document.querySelector("#second-player");
    const difficultyControl = document.querySelector("#difficulty-control");
    const strengthSlider = document.querySelector("#strength");
    const strengthValue = document.querySelector("#strength-value");
    const campaignInfo = document.querySelector("#campaign-info");
    const rulesCopy = document.querySelector("#rules-copy");
    const campaignResult = document.querySelector("#campaign-result");
    const campaignResultTitle = document.querySelector("#campaign-result-title");
    const campaignResultCopy = document.querySelector("#campaign-result-copy");
    const campaignNext = document.querySelector("#campaign-next");
    const campaignRetry = document.querySelector("#campaign-retry");
    const onlineInfo = document.querySelector("#online-info");
    const onlineMessage = document.querySelector("#online-message");
    const onlineRoomCode = document.querySelector("#online-room-code");
    const copyRoomCodeButton = document.querySelector("#copy-room-code");
    const copyRoomLinkButton = document.querySelector("#copy-room-link");
    const onlineCopyStatus = document.querySelector("#online-copy-status");
    const onlineError = document.querySelector("#online-error");
    const ratingNotice = document.querySelector("#rating-notice");
    const campaignProgressKey = "ultimate-tic-tac-toe-campaign";
    const query = new URLSearchParams(window.location.search);
    const requestedMode = query.get("mode");
    const gameMode = ["ai", "campaign", "playerCampaign", "playerCampaignTest", "online"].includes(requestedMode)
      ? requestedMode
      : "local";
    const isCampaignMode = ["campaign", "playerCampaign", "playerCampaignTest"].includes(gameMode);
    const roomCode = (query.get("room") || "").toUpperCase();
    let humanMark = gameMode === "ai" && query.get("player") === "O" ? "O" : "X";
    const aiMark = humanMark === "X" ? "O" : "X";
    const requestedStrength = Number(query.get("elo"));
    const requestedStage = Number(query.get("stage"));
    const campaignStageNumber = requestedStage >= 1 && requestedStage <= window.CAMPAIGN_STAGES.length
      ? requestedStage
      : 1;
    let playerCampaignStage = null;
    if (gameMode === "playerCampaignTest") {
      try {
        const stages = JSON.parse(localStorage.getItem("ultimate-tic-tac-toe-player-campaigns") || "[]");
        playerCampaignStage = Array.isArray(stages)
          ? stages.find((stage) => stage && stage.id === query.get("id")) || null
          : null;
      } catch {
        playerCampaignStage = null;
      }
    }
    let campaignStage = gameMode === "playerCampaignTest"
      ? playerCampaignStage
      : gameMode === "campaign"
      ? window.CAMPAIGN_STAGES[campaignStageNumber - 1] || window.CAMPAIGN_STAGES[0]
      : null;
    const missingPlayerCampaign = gameMode === "playerCampaignTest" && !campaignStage;
    if (requestedStrength >= 400 && requestedStrength <= 2000 && requestedStrength % 100 === 0) {
      strengthSlider.value = String(requestedStrength);
    }
    difficultyControl.hidden = true;
    campaignInfo.hidden = !isCampaignMode;
    onlineInfo.hidden = gameMode !== "online";
    resetButton.hidden = gameMode === "online";

    let cells;
    let boardResults;
    let currentPlayer;
    let nextBoard;
    let gameResult;
    let aiThinking;
    let aiTimer;
    let onlineDatabase;
    let onlineRoomRef;
    let onlineStateRef;
    let onlineUid;
    let onlineHostUid;
    let onlineGuestUid;
    let onlineRules = { routing: "normal" };
    let onlineOpponentRating = 800;
    let onlineReady = false;
    let onlineOpponentReady = false;
    let onlineBusy = false;
    let onlineStatusMessage = "Connecting to online match…";
    let ratedMatchId = gameMode === "online" ? roomCode : makeMatchId();
    let ratedMatchHandled = false;
    onlineRoomCode.textContent = roomCode;
    copyRoomLinkButton.hidden = !/^[A-HJ-NP-Z2-9]{8}$/.test(roomCode);

    function getWinner(squares) {
      for (const [a, b, c] of winningLines) {
        if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) {
          return squares[a];
        }
      }
      return null;
    }

    function makeMatchId() {
      if (window.crypto.randomUUID) return window.crypto.randomUUID();
      const randomValues = new Uint32Array(4);
      window.crypto.getRandomValues(randomValues);
      return Array.from(randomValues, (value) => value.toString(16)).join("");
    }

    function isCellBlocked(boardIndex, cellIndex) {
      const blockedCells = campaignStage?.rules?.blockedCells;
      if (Array.isArray(blockedCells) && blockedCells.some((blockedCell) =>
        blockedCell && blockedCell.board === boardIndex && blockedCell.cell === cellIndex
      )) return true;
      const blocked = campaignStage?.rules?.blocked;
      if (blocked === "corners") return [0, 2, 6, 8].includes(cellIndex);
      if (blocked === "centers") return cellIndex === 4;
      return false;
    }

    function getBoardResult(squares, boardIndex) {
      const winner = getWinner(squares);
      if (winner) return winner;
      return squares.every((mark, cellIndex) => mark || isCellBlocked(boardIndex, cellIndex))
        ? "draw"
        : null;
    }

    function isBoardClosed(boardIndex) {
      return isBoardClosedIn(cells, boardResults, boardIndex);
    }

    function isBoardClosedIn(positionCells, positionResults, boardIndex) {
      return positionResults[boardIndex] !== null ||
        positionCells[boardIndex].every((mark, cellIndex) =>
          mark || isCellBlocked(boardIndex, cellIndex)
        );
    }

    function getNextBoardAfterMove(cellIndex, positionCells = cells, positionResults = boardResults) {
      const routing = gameMode === "online"
        ? onlineRules.routing
        : campaignStage?.rules?.routing;
      if (routing === "free") return null;
      const openBoards = positionCells
        .map((_, index) => index)
        .filter((index) => !isBoardClosedIn(positionCells, positionResults, index));
      if (routing === "random") {
        return openBoards.length
          ? openBoards[Math.floor(Math.random() * openBoards.length)]
          : null;
      }
      if (routing === "same_row") {
        const row = Math.floor(cellIndex / 3);
        const rowBoards = openBoards.filter((boardIndex) => Math.floor(boardIndex / 3) === row);
        return rowBoards.length ? rowBoards : null;
      }
      if (routing === "same_column") {
        const column = cellIndex % 3;
        const columnBoards = openBoards.filter((boardIndex) => boardIndex % 3 === column);
        return columnBoards.length ? columnBoards : null;
      }
      if (routing === "clockwise") {
        const ring = [0, 1, 2, 5, 8, 7, 6, 3];
        const startIndex = ring.indexOf(cellIndex);
        const offset = startIndex === -1 ? 0 : startIndex + 1;
        for (let step = 0; step < ring.length; step += 1) {
          const destination = ring[(offset + step) % ring.length];
          if (openBoards.includes(destination)) return destination;
        }
        return openBoards.length ? openBoards[0] : null;
      }
      const destination = routing === "mirror"
        ? 8 - cellIndex
        : routing === "center" ? 4 : cellIndex;
      return isBoardClosedIn(positionCells, positionResults, destination) ? null : destination;
    }

    function updateStatus() {
      statusElement.className = "turn-status";

      if (isCampaignMode) {
        campaignResult.hidden = !gameResult;
        if (gameResult) updateCampaignResult();
      }

      if (gameResult) {
        statusElement.textContent = gameResult === "draw"
          ? "It's a draw!"
          : gameMode === "online"
            ? `${gameResult} wins the game!`
            : gameMode === "local"
              ? `${gameResult} wins the game!`
              : gameResult === humanMark ? "You win the game!" : "AI wins the game!";
        statusElement.classList.add("won");
        return;
      }

      statusElement.classList.add(currentPlayer.toLowerCase());
      const instruction = nextBoard === null
        ? "Pick any board"
        : Array.isArray(nextBoard)
          ? `Pick a board from ${nextBoard.map((boardIndex) => boardIndex + 1).join(", ")}`
          : `Play in board ${nextBoard + 1}`;
      if (gameMode === "online") {
        if (!onlineReady) {
          statusElement.textContent = onlineStatusMessage;
        } else if (!onlineOpponentReady) {
          statusElement.textContent = humanMark === "X"
            ? "Waiting for a friend to join…"
            : "Waiting for the room creator…";
        } else {
          statusElement.textContent =
            `${currentPlayer === humanMark ? "Your" : "Opponent's"} turn · ${instruction}`;
        }
        return;
      }

      const playerName = gameMode === "local"
        ? currentPlayer
        : currentPlayer === aiMark ? "AI" : "You";
      const turnName = playerName === "You" ? "Your" : `${playerName}'s`;
      statusElement.textContent = aiThinking
        ? "AI is thinking..."
        : `${turnName} turn · ${instruction}`;

    }

    function render() {
      boardsElement.replaceChildren();

      for (let boardIndex = 0; boardIndex < 9; boardIndex += 1) {
        const board = document.createElement("section");
        board.className = "board";
        const closed = isBoardClosed(boardIndex);
        const boardIsAllowed = nextBoard === null ||
          (Array.isArray(nextBoard) ? nextBoard.includes(boardIndex) : nextBoard === boardIndex);
        const isActive = !gameResult && !closed && boardIsAllowed;
        if (isActive) board.classList.add("active");
        if (closed) board.classList.add("closed");

        const miniGrid = document.createElement("div");
        miniGrid.className = "mini-grid";
        miniGrid.setAttribute("aria-label", `Board ${boardIndex + 1}`);

        for (let cellIndex = 0; cellIndex < 9; cellIndex += 1) {
          const button = document.createElement("button");
          const mark = cells[boardIndex][cellIndex];
          const blocked = isCellBlocked(boardIndex, cellIndex);
          button.className = "cell";
          button.type = "button";
          button.textContent = mark || "";
          const onlineTurnBlocked = gameMode === "online" &&
            (!onlineReady || !onlineOpponentReady || onlineBusy || currentPlayer !== humanMark);
          const aiTurnBlocked = (gameMode === "ai" || isCampaignMode) && currentPlayer === aiMark;
          button.disabled = Boolean(gameResult) || aiThinking || onlineTurnBlocked || aiTurnBlocked ||
            closed || Boolean(mark) || blocked || !isActive;
          button.setAttribute(
            "aria-label",
            `Board ${boardIndex + 1}, square ${cellIndex + 1}${mark ? `, ${mark}` : blocked ? ", unavailable" : ""}`
          );
          if (mark) button.classList.add(`mark-${mark.toLowerCase()}`);
          if (blocked) button.classList.add("rule-blocked");
          button.addEventListener("click", () => playMove(boardIndex, cellIndex));
          miniGrid.append(button);
        }

        board.append(miniGrid);

        const result = boardResults[boardIndex];
        if (isBoardClosed(boardIndex)) {
          const overlay = document.createElement("div");
          const displayResult = result || "draw";
          overlay.className = `board-result ${displayResult.toLowerCase()}`;
          overlay.textContent = displayResult === "draw" ? "·" : displayResult;
          overlay.setAttribute(
            "aria-label",
            result ? `Board ${boardIndex + 1} won by ${result}` : `Board ${boardIndex + 1} is a draw`
          );
          board.append(overlay);
        }

        boardsElement.append(board);
      }

      updateStatus();
    }

    function finishMove(boardIndex, cellIndex) {
      boardResults[boardIndex] = getBoardResult(cells[boardIndex], boardIndex);

      const overallWinner = getWinner(boardResults);
      if (overallWinner) {
        gameResult = overallWinner;
      } else if (boardResults.every((result, index) => result !== null || isBoardClosed(index))) {
        gameResult = "draw";
      } else {
        currentPlayer = currentPlayer === "X" ? "O" : "X";
        nextBoard = getNextBoardAfterMove(cellIndex);
      }

      if (gameResult === "X" && isCampaignMode && campaignStage) {
        try {
          if (gameMode === "playerCampaignTest") {
            const verified = JSON.parse(localStorage.getItem("ultimate-tic-tac-toe-player-campaign-verified") || "[]");
            const verifiedStages = Array.isArray(verified) ? verified : [];
            if (!verifiedStages.includes(campaignStage.id)) verifiedStages.push(campaignStage.id);
            localStorage.setItem("ultimate-tic-tac-toe-player-campaign-verified", JSON.stringify(verifiedStages));
          } else if (gameMode === "campaign") {
            const completed = JSON.parse(localStorage.getItem(campaignProgressKey) || "[]");
            const completedStages = Array.isArray(completed) ? completed : [];
            if (!completedStages.includes(campaignStage.id)) completedStages.push(campaignStage.id);
            localStorage.setItem(campaignProgressKey, JSON.stringify(completedStages));
          }
        } catch (error) {
          console.error("Could not save campaign progress.", error);
        }
      }

      render();
      if (!gameResult && (gameMode === "ai" || isCampaignMode) && currentPlayer === aiMark) {
        scheduleAiMove();
      }
      if (gameResult && gameMode === "ai") {
        saveRatedResult(Number(strengthSlider.value));
      }
    }

    function playMove(boardIndex, cellIndex) {
      if (gameResult || isBoardClosed(boardIndex) || cells[boardIndex][cellIndex] ||
        isCellBlocked(boardIndex, cellIndex)) return;
      if (nextBoard !== null && (Array.isArray(nextBoard)
        ? !nextBoard.includes(boardIndex)
        : nextBoard !== boardIndex)) return;
      if (gameMode === "online") {
        playOnlineMove(boardIndex, cellIndex);
        return;
      }
      if (gameMode !== "local" && (currentPlayer !== humanMark || aiThinking)) return;

      cells[boardIndex][cellIndex] = currentPlayer;
      finishMove(boardIndex, cellIndex);
    }

    function showOnlineError(message) {
      onlineError.hidden = false;
      onlineError.textContent = message;
    }

    function clearOnlineError() {
      onlineError.hidden = true;
      onlineError.textContent = "";
    }

    async function saveRatedResult(opponentRating) {
      if (ratedMatchHandled || !gameResult) return;
      ratedMatchHandled = true;
      ratingNotice.hidden = false;
      ratingNotice.textContent = "Saving your rating…";

      try {
        const account = gameMode === "online"
          ? { database: onlineDatabase, user: { uid: onlineUid } }
          : await window.PlayerAccount.initialize();
        const outcome = gameResult === "draw"
          ? "draw"
          : gameResult === humanMark ? "win" : "loss";
        const result = await window.PlayerAccount.recordMatch(
          account.database,
          account.user.uid,
          ratedMatchId,
          outcome,
          opponentRating
        );
        const sign = result.change > 0 ? "+" : "";
        ratingNotice.textContent = result.change === 0
          ? `Rating saved: ${result.rating} (no change).`
          : `Rating saved: ${sign}${result.change} · New rating ${result.rating}.`;
      } catch (error) {
        ratedMatchHandled = false;
        console.error("Could not save the match rating.", error);
        ratingNotice.textContent = "Could not save your rating. Please try again later.";
      }
    }

    function decodeOnlineState(state) {
      const validMark = (mark) => mark === "" || mark === "X" || mark === "O";
      const validNextBoard = state && (
        state.nextBoard === -1 ||
        Number.isInteger(state.nextBoard) && state.nextBoard >= 0 && state.nextBoard < 9 ||
        Array.isArray(state.nextBoard) && state.nextBoard.length > 0 &&
          state.nextBoard.every((board) => Number.isInteger(board) && board >= 0 && board < 9) &&
          new Set(state.nextBoard).size === state.nextBoard.length
      );
      if (!state || !Array.isArray(state.cells) || state.cells.length !== 9 ||
        !state.cells.every((row) => Array.isArray(row) && row.length === 9 && row.every(validMark)) ||
        !Array.isArray(state.boardResults) || state.boardResults.length !== 9 ||
        !state.boardResults.every(validMark) ||
        !["X", "O"].includes(state.currentPlayer) ||
        !validNextBoard ||
        !["", "X", "O", "draw"].includes(state.result)) {
        throw new Error("The room has invalid game data. Please create a new room.");
      }

      return {
        cells: state.cells.map((row) => row.map((mark) => mark || null)),
        boardResults: state.boardResults.map((mark) => mark || null),
        currentPlayer: state.currentPlayer,
        nextBoard: state.nextBoard === -1 ? null : state.nextBoard,
        gameResult: state.result || null
      };
    }

    function encodeOnlineState(position) {
      return {
        cells: position.cells.map((row) => row.map((mark) => mark || "")),
        boardResults: position.boardResults.map((mark) => mark || ""),
        currentPlayer: position.currentPlayer,
        nextBoard: position.nextBoard === null ? -1 : position.nextBoard,
        result: position.gameResult || ""
      };
    }

    function calculateOnlineMove(position, boardIndex, cellIndex) {
      if (position.gameResult || isBoardClosedIn(position.cells, position.boardResults, boardIndex) ||
        position.cells[boardIndex][cellIndex] ||
        position.nextBoard !== null && (Array.isArray(position.nextBoard)
          ? !position.nextBoard.includes(boardIndex)
          : position.nextBoard !== boardIndex)) {
        return null;
      }

      const nextCells = position.cells.map((row) => [...row]);
      const nextResults = [...position.boardResults];
      nextCells[boardIndex][cellIndex] = position.currentPlayer;
      nextResults[boardIndex] = getBoardResult(nextCells[boardIndex], boardIndex);

      const overallWinner = getWinner(nextResults);
      let nextPlayer = position.currentPlayer;
      let nextBoard = position.nextBoard;
      let nextResult = null;
      if (overallWinner) {
        nextResult = overallWinner;
      } else if (nextResults.every((result, index) =>
        result !== null || isBoardClosedIn(nextCells, nextResults, index)
      )) {
        nextResult = "draw";
      } else {
        nextPlayer = position.currentPlayer === "X" ? "O" : "X";
        nextBoard = getNextBoardAfterMove(cellIndex, nextCells, nextResults);
      }

      return {
        cells: nextCells,
        boardResults: nextResults,
        currentPlayer: nextPlayer,
        nextBoard,
        gameResult: nextResult
      };
    }

    async function playOnlineMove(boardIndex, cellIndex) {
      if (!onlineReady || !onlineOpponentReady || onlineBusy || currentPlayer !== humanMark) return;
      onlineBusy = true;
      clearOnlineError();
      render();

      try {
        const transaction = await onlineStateRef.transaction((storedState) => {
          if (!storedState) return;
          const position = decodeOnlineState(storedState);
          const expectedUid = position.currentPlayer === "X" ? onlineHostUid : onlineGuestUid;
          if (position.currentPlayer !== humanMark || expectedUid !== onlineUid) return;
          const updatedPosition = calculateOnlineMove(position, boardIndex, cellIndex);
          return updatedPosition ? encodeOnlineState(updatedPosition) : undefined;
        }, undefined, false);

        if (!transaction.committed) {
          showOnlineError("That move was not accepted. The board may have changed; check whose turn it is.");
        }
      } catch (error) {
        console.error("Could not send the online move.", error);
        showOnlineError("The move could not be sent. Check your connection and try again.");
      } finally {
        onlineBusy = false;
        render();
      }
    }

    function updateOnlinePlayerLabels() {
      const firstPlayerElement = document.querySelector("#first-player");
      firstPlayerElement.lastChild.textContent = humanMark === "X" ? " You (host)" : " Opponent (host)";
      secondPlayerElement.lastChild.textContent = humanMark === "O" ? " You (guest)" : " Opponent (guest)";
    }

    function getOrCreateAnonymousUser(auth) {
      return new Promise((resolve, reject) => {
        let unsubscribe = () => {};
        unsubscribe = auth.onAuthStateChanged((user) => {
          unsubscribe();
          if (user) {
            resolve(user);
          } else {
            auth.signInAnonymously().then(({ user: newUser }) => resolve(newUser), reject);
          }
        }, (error) => {
          unsubscribe();
          reject(error);
        });
      });
    }

    async function connectOnlineGame() {
      if (!/^[A-HJ-NP-Z2-9]{8}$/.test(roomCode)) {
        onlineStatusMessage = "Room code is invalid";
        showOnlineError("This room link is missing a valid room code. Return to the online menu and create or join a room.");
        render();
        return;
      }

      try {
        if (!window.firebase || !window.FIREBASE_CONFIG) {
          throw new Error("The online game could not start.");
        }
        const app = window.firebase.apps.length
          ? window.firebase.app()
          : window.firebase.initializeApp(window.FIREBASE_CONFIG);
        const auth = window.firebase.auth(app);
        const user = await getOrCreateAnonymousUser(auth);
        onlineUid = user.uid;
        onlineDatabase = window.firebase.database(app);
        onlineRoomRef = onlineDatabase.ref(`rooms/${roomCode}`);
        onlineStateRef = onlineRoomRef.child("state");

        onlineRoomRef.on("value", (snapshot) => {
          const room = snapshot.val();
          if (!room) {
            onlineReady = false;
            onlineOpponentReady = false;
            onlineStatusMessage = "Room not found";
            showOnlineError("This room does not exist. Ask the host to create a new one.");
            render();
            return;
          }
          if (typeof room.hostUid !== "string" ||
            room.hostUid !== onlineUid && room.guestUid !== onlineUid) {
            onlineReady = false;
            onlineOpponentReady = false;
            onlineStatusMessage = "You are not in this room";
            showOnlineError("You are not a player in this room. Join it from the online menu.");
            render();
            return;
          }

          onlineHostUid = room.hostUid;
          onlineRules = {
            routing: ["mirror", "free", "random", "same_row", "same_column", "clockwise"].includes(room.customRules?.routing)
              ? room.customRules.routing
              : "normal"
          };
          rulesCopy.textContent = onlineRules.routing === "mirror"
            ? "In this mirrored match, the square you choose sends your opponent to the reflected square's board. If that destination is closed, they may choose any open board. Get three little boards in a row to win!"
            : onlineRules.routing === "free"
              ? "Free-choice match: after every move, either player may choose any open board. Get three little boards in a row to win!"
              : onlineRules.routing === "random"
                ? "Random-routing match: after every move, the game randomly chooses an open board for the next player. Get three little boards in a row to win!"
                : onlineRules.routing === "same_row"
                  ? "Same-row match: the next player may choose any open board in the row matching the square just played."
                  : onlineRules.routing === "same_column"
                    ? "Same-column match: the next player may choose any open board in the column matching the square just played."
                    : onlineRules.routing === "clockwise"
                      ? "Clockwise match: the next player is sent to the next open board around the outer ring."
                      : "The square you choose sends your opponent to the matching little board. If that board is already won or full, they can choose any open board. Get three little boards in a row to win!";
          onlineGuestUid = typeof room.guestUid === "string" ? room.guestUid : null;
          humanMark = room.hostUid === onlineUid ? "X" : "O";
          onlineOpponentRating = humanMark === "X"
            ? Number(room.guestRating) || 800
            : Number(room.hostRating) || 800;
          onlineOpponentReady = Boolean(
            onlineGuestUid &&
            onlineGuestUid !== onlineHostUid
          );
          onlineRoomCode.textContent = roomCode;
          const seatingMessage = humanMark === "X"
            ? onlineOpponentReady
              ? "You are X. Your friend is O."
              : "You are X. Share the invite link and wait for your friend to join."
            : "You are O. The host plays X.";
          const customRuleMessages = {
            mirror: " Mirrored routing is on.",
            free: " Free board choice is on.",
            random: " Random board routing is on.",
            same_row: " Same-row routing is on.",
            same_column: " Same-column routing is on.",
            clockwise: " Clockwise routing is on."
          };
          const customRuleMessage = customRuleMessages[onlineRules.routing] || "";
          const handicapMessage = room.customRules?.setup?.length
            ? ` ${room.customRules.setup.length} handicap marks are on the starting board.`
            : "";
          onlineMessage.textContent = `${seatingMessage}${customRuleMessage}${handicapMessage}`;
          updateOnlinePlayerLabels();

          try {
            const position = decodeOnlineState(room.state);
            cells = position.cells;
            boardResults = position.boardResults;
            currentPlayer = position.currentPlayer;
            nextBoard = position.nextBoard;
            gameResult = position.gameResult;
            onlineReady = true;
            onlineStatusMessage = "";
            clearOnlineError();
            if (gameResult && onlineOpponentReady) saveRatedResult(onlineOpponentRating);
          } catch (error) {
            onlineReady = false;
            onlineStatusMessage = "Room data is invalid";
            console.error("The online room contains invalid game data.", error);
            showOnlineError("The online game data is invalid. Return to the online menu and create a new room.");
          }
          render();
        }, (error) => {
          onlineReady = false;
          onlineOpponentReady = false;
          onlineStatusMessage = "Online connection failed";
          console.error("Could not read the online room.", error);
          showOnlineError("The room could not be opened. Check your connection and try again.");
          render();
        });
      } catch (error) {
        onlineReady = false;
        onlineStatusMessage = "Online sign-in failed";
        console.error("Could not connect to the online game.", error);
        showOnlineError("Could not connect to the online game. Please try again later.");
        render();
      }
    }

    function legalMoves(boardIndices, player, positionCells = cells, positionResults = boardResults) {
      const moves = [];
      for (const boardIndex of boardIndices) {
        for (let cellIndex = 0; cellIndex < 9; cellIndex += 1) {
          if (positionCells[boardIndex][cellIndex] || isCellBlocked(boardIndex, cellIndex)) continue;
          const localBoard = [...positionCells[boardIndex]];
          localBoard[cellIndex] = player;
          const results = [...positionResults];
          results[boardIndex] = getBoardResult(localBoard, boardIndex);
          moves.push({ boardIndex, cellIndex, localBoard, results });
        }
      }
      return moves;
    }

    function availableBoards(forcedBoard, positionCells = cells, positionResults = boardResults) {
      const allowedBoards = forcedBoard === null
        ? null
        : Array.isArray(forcedBoard) ? forcedBoard : [forcedBoard];
      return allowedBoards
        ? allowedBoards.filter((index) => !isBoardClosedIn(positionCells, positionResults, index))
        : positionCells.map((_, index) => index)
          .filter((index) => !isBoardClosedIn(positionCells, positionResults, index));
    }

    function evaluatePosition(position) {
      const opponentMark = aiMark === "X" ? "O" : "X";
      let score = 0;
      const metaWeights = [0, 18, 180, 1000];

      for (const [a, b, c] of winningLines) {
        const line = [a, b, c];
        const aiWins = line.some((board) => position.results[board] === aiMark);
        const opponentWins = line.some((board) => position.results[board] === opponentMark);
        const aiCount = line.filter((board) => position.results[board] === aiMark).length;
        const opponentCount = line.filter((board) => position.results[board] === opponentMark).length;
        const blockedByDraw = line.some((board) =>
          position.results[board] === null && isBoardClosedIn(position.cells, position.results, board)
        );

        if (!opponentWins && !blockedByDraw) score += metaWeights[aiCount];
        if (!aiWins && !blockedByDraw) score -= metaWeights[opponentCount];
      }

      for (let boardIndex = 0; boardIndex < 9; boardIndex += 1) {
        if (isBoardClosedIn(position.cells, position.results, boardIndex)) continue;

        let boardScore = 0;
        for (const [a, b, c] of winningLines) {
          const line = [position.cells[boardIndex][a], position.cells[boardIndex][b], position.cells[boardIndex][c]];
          const aiCount = line.filter((mark) => mark === aiMark).length;
          const opponentCount = line.filter((mark) => mark === opponentMark).length;
          if (opponentCount === 0) boardScore += [0, 2, 14][aiCount];
          if (aiCount === 0) boardScore -= [0, 2, 14][opponentCount];
        }

        const metaThreats = winningLines.filter((line) => line.includes(boardIndex));
        const boardImportance = 1 + metaThreats.filter((line) =>
          line.every((board) => position.results[board] !== opponentMark)
        ).length * 0.15;
        score += boardScore * boardImportance;
      }

      return score;
    }

    function applySearchMove(position, move, player) {
      const nextCells = position.cells.slice();
      nextCells[move.boardIndex] = move.localBoard;
      const nextResults = move.results;
      const nextBoard = getNextBoardAfterMove(move.cellIndex, nextCells, nextResults);

      return {
        cells: nextCells,
        results: nextResults,
        nextBoard,
        player: player === aiMark ? (aiMark === "X" ? "O" : "X") : aiMark
      };
    }

    function terminalScore(position, depth) {
      const winner = getWinner(position.results);
      if (winner === aiMark) return 100000 + depth;
      if (winner && winner !== "draw") return -100000 - depth;
      if (availableBoards(position.nextBoard, position.cells, position.results).length === 0) {
        return 0;
      }

      return null;
    }

    function searchPosition(position, depth, alpha, beta, context) {
      context.nodes += 1;
      if (context.nodes > context.maxNodes) {
        context.aborted = true;
        return evaluatePosition(position);
      }

      const terminal = terminalScore(position, depth);
      if (terminal !== null) return terminal;
      if (depth === 0) return evaluatePosition(position);

      const moves = legalMoves(
        availableBoards(position.nextBoard, position.cells, position.results),
        position.player,
        position.cells,
        position.results
      ).map((move) => ({
        ...move,
        state: applySearchMove(position, move, position.player)
      }));

      const maximizing = position.player === aiMark;
      moves.sort((a, b) => {
        const scoreA = evaluatePosition(a.state);
        const scoreB = evaluatePosition(b.state);
        return maximizing ? scoreB - scoreA : scoreA - scoreB;
      });

      let bestScore = maximizing ? -Infinity : Infinity;
      for (const move of moves) {
        const score = searchPosition(move.state, depth - 1, alpha, beta, context);
        if (maximizing) {
          bestScore = Math.max(bestScore, score);
          alpha = Math.max(alpha, bestScore);
        } else {
          bestScore = Math.min(bestScore, score);
          beta = Math.min(beta, bestScore);
        }
        if (context.aborted || beta <= alpha) break;
      }

      return bestScore;
    }

    function chooseAiMove() {
      const position = { cells, results: boardResults, nextBoard, player: aiMark };
      const moves = legalMoves(availableBoards(nextBoard), aiMark, cells, boardResults);
      if (moves.length === 0) return null;

      const strength = campaignStage ? campaignStage.rating : Number(strengthSlider.value);
      const maxDepth = Math.min(6, 1 + Math.floor((strength - 400) / 300));
      const context = {
        nodes: 0,
        maxNodes: 5000 + strength * 8,
        aborted: false
      };

      moves.sort((a, b) =>
        evaluatePosition(applySearchMove(position, b, aiMark)) -
        evaluatePosition(applySearchMove(position, a, aiMark))
      );
      let bestMove = moves[0];
      let completedDepth = 0;

      for (let depth = 1; depth <= maxDepth; depth += 1) {
        const iteration = { bestMove: null, bestScore: -Infinity };
        let alpha = -Infinity;

        for (const move of moves) {
          const score = searchPosition(
            applySearchMove(position, move, aiMark),
            depth - 1,
            alpha,
            Infinity,
            context
          );
          if (context.aborted) break;
          if (score > iteration.bestScore) {
            iteration.bestScore = score;
            iteration.bestMove = move;
          }
          alpha = Math.max(alpha, iteration.bestScore);
        }

        if (context.aborted || !iteration.bestMove) break;
        bestMove = iteration.bestMove;
        completedDepth = depth;
      }

      if (strength < 800 && completedDepth <= 1) {
        const candidateCount = Math.max(1, Math.ceil(moves.length * (800 - strength) / 400));
        return moves[Math.floor(Math.random() * candidateCount)];
      }

      return bestMove;
    }

    function scheduleAiMove() {
      aiThinking = true;
      render();
      aiTimer = window.setTimeout(() => {
        aiTimer = null;
        const move = chooseAiMove();
        aiThinking = false;
        if (move) {
          cells[move.boardIndex][move.cellIndex] = aiMark;
          finishMove(move.boardIndex, move.cellIndex);
        }
      }, 450);
    }

    function newGame() {
      if (aiTimer !== undefined) {
        window.clearTimeout(aiTimer);
        aiTimer = null;
      }
      cells = Array.from({ length: 9 }, () => Array(9).fill(null));
      boardResults = Array(9).fill(null);
      if (gameMode === "ai") {
        ratedMatchId = makeMatchId();
        ratedMatchHandled = false;
        ratingNotice.hidden = true;
      }
      currentPlayer = isCampaignMode
        ? campaignStage?.firstPlayer === "O" ? aiMark : humanMark
        : gameMode === "ai" && humanMark === "O" ? aiMark : "X";
      nextBoard = null;
      gameResult = null;
      aiThinking = false;
      campaignResult.hidden = true;
      if (gameMode === "online") {
        document.querySelector("#first-player").lastChild.textContent = " Player X";
        secondPlayerElement.lastChild.textContent = " Player O";
      } else {
        document.querySelector("#first-player").lastChild.textContent =
          gameMode === "local"
            ? " Player 1"
            : aiMark === "X" ? ` AI · ${strengthSlider.value}` : " You";
        secondPlayerElement.lastChild.textContent = gameMode === "local"
          ? " Player 2"
          : isCampaignMode
            ? ` AI · ${campaignStage.rating}`
            : aiMark === "O" ? ` AI · ${strengthSlider.value}` : " You";
      }
      strengthValue.value = `AI strength ${strengthSlider.value}`;
      strengthValue.textContent = strengthSlider.value;
      if (campaignStage) {
        document.querySelector("#campaign-stage").textContent =
          gameMode === "playerCampaign" || gameMode === "playerCampaignTest"
            ? "Player-made challenge"
            : `Challenge ${campaignStageNumber} of ${window.CAMPAIGN_STAGES.length}`;
        document.querySelector("#campaign-name").textContent = campaignStage.name;
        document.querySelector("#campaign-rating").textContent = `AI strength ${campaignStage.rating}`;
        document.querySelector("#campaign-description").textContent = campaignStage.description;
        const routing = campaignStage.rules?.routing;
        const routingInstructions = routing === "mirror"
          ? "Moves send the next player to the reflected square's board."
          : routing === "free"
            ? "After every move, either player can choose any open board."
            : routing === "center"
              ? "Moves send the next player to the center board when it is open."
              : routing === "random"
                ? "The game randomly chooses an open board after each move."
                : routing === "same_row"
                  ? "The next player may choose any open board in the row matching the square just played."
                  : routing === "same_column"
                    ? "The next player may choose any open board in the column matching the square just played."
                    : routing === "clockwise"
                      ? "Moves send the next player clockwise to the next open outer board."
                      : "The square you choose sends your opponent to the matching little board.";
        const blockedInstructions = campaignStage.rules?.blocked === "corners"
          ? " The four corners of each small board are closed."
          : campaignStage.rules?.blocked === "centers"
            ? " The center square of each small board is closed."
            : "";
        rulesCopy.textContent =
          `${routingInstructions}${blockedInstructions} If a destination board is closed, choose any open board. Three little boards in a row wins.`;
        for (const mark of campaignStage.setup || []) {
          if (Number.isInteger(mark.board) && mark.board >= 0 && mark.board < 9 &&
            Number.isInteger(mark.cell) && mark.cell >= 0 && mark.cell < 9) {
            cells[mark.board][mark.cell] = mark.mark === "X" ? "X" : "O";
          }
        }
        boardResults = cells.map((board, index) => getBoardResult(board, index));
        const startBoard = campaignStage.rules?.startBoard;
        if (Number.isInteger(startBoard) && startBoard >= 0 && startBoard < 9 &&
          !isBoardClosed(startBoard)) {
          nextBoard = startBoard;
        }
      } else {
        rulesCopy.textContent =
          "The square you choose sends your opponent to the matching little board. If that board is already won or full, they can choose any open board. Get three little boards in a row to win!";
      }
      render();
      if ((gameMode === "ai" || isCampaignMode) && currentPlayer === aiMark) scheduleAiMove();
    }

    function updateCampaignResult() {
      const won = gameResult === "X";
      const nextStage = gameMode === "campaign"
        ? window.CAMPAIGN_STAGES[campaignStageNumber]
        : null;
      campaignResultTitle.textContent = won
        ? "Challenge cleared!"
        : "Challenge not cleared";
      campaignResultCopy.textContent = won
        ? gameMode === "playerCampaignTest"
          ? "Challenge verified! Return to the campaign page to publish it for everyone."
          : gameMode === "playerCampaign"
          ? "You beat this player-made challenge. Try another one or make your own!"
          : nextStage
            ? `${nextStage.name} is ready whenever you want another challenge.`
            : "You defeated every campaign opponent. You are the Ultimate Tic-Tac-Toe champion!"
        : "Study the board, adjust your strategy, and give this challenge another try.";
      campaignNext.hidden = !won || !nextStage;
      if (!campaignNext.hidden) {
        campaignNext.href = `index.html?mode=campaign&stage=${campaignStageNumber + 1}`;
        campaignNext.textContent = "Another challenge";
      }
    }

    function showUnavailablePlayerCampaign(message) {
      document.querySelector("#campaign-stage").textContent = "Player-made challenge";
      document.querySelector("#campaign-name").textContent = "Challenge unavailable";
      document.querySelector("#campaign-rating").textContent = "";
      document.querySelector("#campaign-description").textContent = message;
      statusElement.textContent = "Return to the campaign page to choose another challenge.";
      boardsElement.hidden = true;
      resetButton.hidden = true;
      const menuLink = document.querySelector(".game-actions .home-link");
      menuLink.href = "campaign.html";
      menuLink.textContent = "Back to challenges";
    }

    function normalizeCommunitySetup(setup) {
      if (Array.isArray(setup)) return setup;
      if (setup === undefined || setup === null) return [];
      if (typeof setup !== "object") return null;

      const indexes = Object.keys(setup)
        .filter((key) => /^\d+$/.test(key))
        .sort((a, b) => Number(a) - Number(b));
      if (Number.isInteger(setup.count) && setup.count !== indexes.length) return null;
      return indexes.map((index) => setup[index]);
    }

    async function loadCommunityCampaign() {
      const challengeId = query.get("id");
      if (!challengeId || !window.firebase || !window.FIREBASE_CONFIG) {
        showUnavailablePlayerCampaign("This community challenge could not be loaded.");
        return;
      }

      try {
        const app = window.firebase.apps.length
          ? window.firebase.app()
          : window.firebase.initializeApp(window.FIREBASE_CONFIG);
        const snapshot = await window.firebase.database(app)
          .ref(`communityCampaigns/${challengeId}`).once("value");
        const stage = snapshot.val();
        const setup = normalizeCommunitySetup(stage?.setup);
        const valid = stage && stage.id === challengeId &&
          typeof stage.name === "string" && stage.name.length > 0 && stage.name.length <= 40 &&
          typeof stage.description === "string" && stage.description.length <= 120 &&
          Number.isFinite(Number(stage.rating)) && Number(stage.rating) >= 400 && Number(stage.rating) <= 1500 &&
          (stage.rules === undefined || stage.rules === null ||
            typeof stage.rules === "object" && !Array.isArray(stage.rules)) &&
          Array.isArray(setup) && setup.length <= 24 &&
          setup.every((mark) => mark && Number.isInteger(mark.board) && mark.board >= 0 && mark.board < 9 &&
            Number.isInteger(mark.cell) && mark.cell >= 0 && mark.cell < 9 &&
            ["X", "O"].includes(mark.mark)) &&
          ["X", "O"].includes(stage.firstPlayer || "X") &&
          ["normal", "mirror", "free", "center", "random", "same_row", "same_column", "clockwise"]
            .includes(stage.rules?.routing || "normal") &&
          (!stage.rules?.blockedCells || Array.isArray(stage.rules.blockedCells) &&
            stage.rules.blockedCells.length <= 40 &&
            stage.rules.blockedCells.every((cell) => cell && Number.isInteger(cell.board) && cell.board >= 0 &&
              cell.board < 9 && Number.isInteger(cell.cell) && cell.cell >= 0 && cell.cell < 9 &&
              !setup.some((mark) => mark.board === cell.board && mark.cell === cell.cell)));
        if (!valid) {
          showUnavailablePlayerCampaign("This community challenge is missing, or its saved data is invalid.");
          return;
        }

        campaignStage = {
          ...stage,
          setup,
          firstPlayer: stage.firstPlayer || "X",
          rules: {
            ...stage.rules,
            routing: stage.rules?.routing || "normal",
            blockedCells: stage.rules?.blockedCells || []
          }
        };
        newGame();
      } catch (error) {
        console.error("Could not load the community challenge.", error);
        showUnavailablePlayerCampaign(
          "This community challenge is unavailable right now. Please try again later."
        );
      }
    }

    resetButton.addEventListener("click", newGame);
    campaignRetry.addEventListener("click", newGame);
    function legacyCopyText(text) {
      const temporaryInput = document.createElement("textarea");
      temporaryInput.value = text;
      temporaryInput.setAttribute("readonly", "");
      temporaryInput.style.position = "fixed";
      temporaryInput.style.opacity = "0";
      document.body.append(temporaryInput);
      temporaryInput.select();
      const copied = document.execCommand("copy");
      temporaryInput.remove();
      return copied;
    }

    async function copyText(text, button, successMessage) {
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(text);
        } else if (!legacyCopyText(text)) {
          throw new Error("Clipboard access is unavailable.");
        }
        onlineCopyStatus.textContent = successMessage;
      } catch (error) {
        if (legacyCopyText(text)) {
          onlineCopyStatus.textContent = successMessage;
        } else {
          onlineCopyStatus.textContent = "Copy was blocked. Select the room code and copy it manually.";
        }
      }

      const originalLabel = button.id === "copy-room-code" ? "Copy code" : "Copy invite link";
      button.textContent = onlineCopyStatus.textContent === successMessage ? "Copied" : originalLabel;
      window.setTimeout(() => {
        button.textContent = originalLabel;
      }, 2000);
    }

    copyRoomCodeButton.addEventListener("click", () => {
      copyText(roomCode, copyRoomCodeButton, "Room code copied.");
    });
    copyRoomLinkButton.addEventListener("click", () => {
      const inviteLink = new URL("onlineSetup.html", window.location.href);
      inviteLink.searchParams.set("join", roomCode);
      copyText(inviteLink.toString(), copyRoomLinkButton, "Invite link copied.");
    });
    strengthSlider.addEventListener("input", () => {
      strengthValue.value = `AI strength ${strengthSlider.value}`;
      strengthValue.textContent = strengthSlider.value;
    });
    strengthSlider.addEventListener("change", newGame);
    if (missingPlayerCampaign) {
      showUnavailablePlayerCampaign("This challenge is no longer saved in this browser.");
    } else {
      if (gameMode !== "playerCampaign") newGame();
      if (gameMode === "online") connectOnlineGame();
      if (gameMode === "playerCampaign") loadCommunityCampaign();
    }
