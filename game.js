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
    const campaignResult = document.querySelector("#campaign-result");
    const campaignResultTitle = document.querySelector("#campaign-result-title");
    const campaignResultCopy = document.querySelector("#campaign-result-copy");
    const campaignNext = document.querySelector("#campaign-next");
    const campaignRetry = document.querySelector("#campaign-retry");
    const onlineInfo = document.querySelector("#online-info");
    const onlineMessage = document.querySelector("#online-message");
    const onlineRoomCode = document.querySelector("#online-room-code");
    const copyRoomLinkButton = document.querySelector("#copy-room-link");
    const onlineError = document.querySelector("#online-error");
    const campaignProgressKey = "ultimate-tic-tac-toe-campaign";
    const query = new URLSearchParams(window.location.search);
    const requestedMode = query.get("mode");
    const gameMode = ["ai", "campaign", "online"].includes(requestedMode) ? requestedMode : "local";
    const roomCode = (query.get("room") || "").toUpperCase();
    let humanMark = gameMode === "ai" && query.get("player") === "O" ? "O" : "X";
    const aiMark = humanMark === "X" ? "O" : "X";
    const requestedStrength = Number(query.get("elo"));
    const requestedStage = Number(query.get("stage"));
    const campaignStageNumber = requestedStage >= 1 && requestedStage <= window.CAMPAIGN_STAGES.length
      ? requestedStage
      : 1;
    const campaignStage = gameMode === "campaign"
      ? window.CAMPAIGN_STAGES[campaignStageNumber - 1] || window.CAMPAIGN_STAGES[0]
      : null;
    if (requestedStrength >= 400 && requestedStrength <= 2000 && requestedStrength % 100 === 0) {
      strengthSlider.value = String(requestedStrength);
    }
    difficultyControl.hidden = true;
    campaignInfo.hidden = gameMode !== "campaign";
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
    let onlineReady = false;
    let onlineOpponentReady = false;
    let onlineBusy = false;
    let onlineStatusMessage = "Connecting to online match…";
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

    function isBoardClosed(boardIndex) {
      return boardResults[boardIndex] !== null || cells[boardIndex].every(Boolean);
    }

    function isBoardClosedIn(positionCells, positionResults, boardIndex) {
      return positionResults[boardIndex] !== null || positionCells[boardIndex].every(Boolean);
    }

    function updateStatus() {
      statusElement.className = "turn-status";

      if (gameMode === "campaign") {
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
        const isActive = !gameResult && !closed && (nextBoard === null || nextBoard === boardIndex);
        if (isActive) board.classList.add("active");
        if (closed) board.classList.add("closed");

        const miniGrid = document.createElement("div");
        miniGrid.className = "mini-grid";
        miniGrid.setAttribute("aria-label", `Board ${boardIndex + 1}`);

        for (let cellIndex = 0; cellIndex < 9; cellIndex += 1) {
          const button = document.createElement("button");
          const mark = cells[boardIndex][cellIndex];
          button.className = "cell";
          button.type = "button";
          button.textContent = mark || "";
          const onlineTurnBlocked = gameMode === "online" &&
            (!onlineReady || !onlineOpponentReady || onlineBusy || currentPlayer !== humanMark);
          const aiTurnBlocked = (gameMode === "ai" || gameMode === "campaign") && currentPlayer === aiMark;
          button.disabled = Boolean(gameResult) || aiThinking || onlineTurnBlocked || aiTurnBlocked ||
            closed || Boolean(mark) || !isActive;
          button.setAttribute(
            "aria-label",
            `Board ${boardIndex + 1}, square ${cellIndex + 1}${mark ? `, ${mark}` : ""}`
          );
          if (mark) button.classList.add(`mark-${mark.toLowerCase()}`);
          button.addEventListener("click", () => playMove(boardIndex, cellIndex));
          miniGrid.append(button);
        }

        board.append(miniGrid);

        const result = boardResults[boardIndex];
        if (result !== null || cells[boardIndex].every(Boolean)) {
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
      boardResults[boardIndex] = getWinner(cells[boardIndex]);

      const overallWinner = getWinner(boardResults);
      if (overallWinner) {
        gameResult = overallWinner;
      } else if (boardResults.every((result, index) => result !== null || cells[index].every(Boolean))) {
        gameResult = "draw";
      } else {
        currentPlayer = currentPlayer === "X" ? "O" : "X";
        nextBoard = isBoardClosed(cellIndex) ? null : cellIndex;
      }

      if (gameResult && gameMode === "campaign" && gameResult === "X") {
        const completedStages = Number(localStorage.getItem(campaignProgressKey)) || 0;
        localStorage.setItem(
          campaignProgressKey,
          String(Math.max(completedStages, campaignStageNumber))
        );
      }

      render();
      if (!gameResult && (gameMode === "ai" || gameMode === "campaign") && currentPlayer === aiMark) {
        scheduleAiMove();
      }
    }

    function playMove(boardIndex, cellIndex) {
      if (gameResult || isBoardClosed(boardIndex) || cells[boardIndex][cellIndex]) return;
      if (nextBoard !== null && nextBoard !== boardIndex) return;
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

    function decodeOnlineState(state) {
      const validMark = (mark) => mark === "" || mark === "X" || mark === "O";
      if (!state || !Array.isArray(state.cells) || state.cells.length !== 9 ||
        !state.cells.every((row) => Array.isArray(row) && row.length === 9 && row.every(validMark)) ||
        !Array.isArray(state.boardResults) || state.boardResults.length !== 9 ||
        !state.boardResults.every(validMark) ||
        !["X", "O"].includes(state.currentPlayer) ||
        !(state.nextBoard === -1 || Number.isInteger(state.nextBoard) && state.nextBoard >= 0 && state.nextBoard < 9) ||
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
        position.nextBoard !== null && position.nextBoard !== boardIndex) {
        return null;
      }

      const nextCells = position.cells.map((row) => [...row]);
      const nextResults = [...position.boardResults];
      nextCells[boardIndex][cellIndex] = position.currentPlayer;
      nextResults[boardIndex] = getWinner(nextCells[boardIndex]);

      const overallWinner = getWinner(nextResults);
      let nextPlayer = position.currentPlayer;
      let nextBoard = position.nextBoard;
      let nextResult = null;
      if (overallWinner) {
        nextResult = overallWinner;
      } else if (nextResults.every((result, index) =>
        result !== null || nextCells[index].every(Boolean)
      )) {
        nextResult = "draw";
      } else {
        nextPlayer = position.currentPlayer === "X" ? "O" : "X";
        nextBoard = isBoardClosedIn(nextCells, nextResults, cellIndex) ? null : cellIndex;
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
        showOnlineError(error.code === "PERMISSION_DENIED"
          ? "Firebase denied the move. Check that the Realtime Database rules are installed."
          : error.message || "The move could not be sent. Check your connection and try again.");
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

    async function connectOnlineGame() {
      if (!/^[A-HJ-NP-Z2-9]{8}$/.test(roomCode)) {
        onlineStatusMessage = "Room code is invalid";
        showOnlineError("This room link is missing a valid room code. Return to the online menu and create or join a room.");
        render();
        return;
      }

      try {
        if (!window.firebase || !window.FIREBASE_CONFIG) {
          throw new Error("Firebase could not load. Check your internet connection and reload.");
        }
        const app = window.firebase.apps.length
          ? window.firebase.app()
          : window.firebase.initializeApp(window.FIREBASE_CONFIG);
        const auth = window.firebase.auth(app);
        const credential = await auth.signInAnonymously();
        onlineUid = credential.user.uid;
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
          onlineGuestUid = typeof room.guestUid === "string" ? room.guestUid : null;
          humanMark = room.hostUid === onlineUid ? "X" : "O";
          onlineOpponentReady = Boolean(onlineGuestUid && onlineGuestUid !== onlineHostUid);
          onlineRoomCode.textContent = roomCode;
          onlineMessage.textContent = humanMark === "X"
            ? onlineOpponentReady
              ? "You are X. Your friend is O."
              : "You are X. Share the invite link and wait for your friend to join."
            : "You are O. The host plays X.";
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
          } catch (error) {
            onlineReady = false;
            onlineStatusMessage = "Room data is invalid";
            showOnlineError(error.message);
          }
          render();
        }, (error) => {
          onlineReady = false;
          onlineOpponentReady = false;
          onlineStatusMessage = "Online connection failed";
          showOnlineError(error.code === "PERMISSION_DENIED"
            ? "Firebase denied access. Check Authentication and your Realtime Database rules."
            : error.message || "The room could not be read. Check your internet connection.");
          render();
        });
      } catch (error) {
        onlineReady = false;
        onlineStatusMessage = "Online sign-in failed";
        showOnlineError(error.code === "auth/unauthorized-domain"
          ? "Add this site’s domain in Firebase Authentication → Settings → Authorized domains."
          : error.code === "auth/operation-not-allowed"
            ? "Enable Anonymous sign-in in Firebase Authentication → Sign-in method."
            : error.message || "Could not connect to Firebase.");
        render();
      }
    }

    function legalMoves(boardIndices, player, positionCells = cells, positionResults = boardResults) {
      const moves = [];
      for (const boardIndex of boardIndices) {
        for (let cellIndex = 0; cellIndex < 9; cellIndex += 1) {
          if (positionCells[boardIndex][cellIndex]) continue;
          const localBoard = [...positionCells[boardIndex]];
          localBoard[cellIndex] = player;
          const results = [...positionResults];
          results[boardIndex] = getWinner(localBoard);
          moves.push({ boardIndex, cellIndex, localBoard, results });
        }
      }
      return moves;
    }

    function availableBoards(forcedBoard, positionCells = cells, positionResults = boardResults) {
      return forcedBoard !== null && !isBoardClosedIn(positionCells, positionResults, forcedBoard)
        ? [forcedBoard]
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
          position.results[board] === null && position.cells[board].every(Boolean)
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
      const nextBoard = isBoardClosedIn(nextCells, nextResults, move.cellIndex)
        ? null
        : move.cellIndex;

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
      currentPlayer = gameMode === "ai" && humanMark === "O" ? aiMark : "X";
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
          : gameMode === "campaign"
            ? ` AI · ${campaignStage.rating}`
            : aiMark === "O" ? ` AI · ${strengthSlider.value}` : " You";
      }
      strengthValue.value = `${strengthSlider.value} approximate Elo`;
      strengthValue.textContent = strengthSlider.value;
      if (campaignStage) {
        document.querySelector("#campaign-stage").textContent =
          `Challenge ${campaignStageNumber} of ${window.CAMPAIGN_STAGES.length}`;
        document.querySelector("#campaign-name").textContent = campaignStage.name;
        document.querySelector("#campaign-rating").textContent = `${campaignStage.rating} Elo-style`;
        document.querySelector("#campaign-description").textContent = campaignStage.description;
        for (const mark of campaignStage.setup) {
          cells[mark.board][mark.cell] = "O";
        }
        boardResults = cells.map(getWinner);
      }
      render();
      if (gameMode === "ai" && currentPlayer === aiMark) scheduleAiMove();
    }

    function updateCampaignResult() {
      const won = gameResult === "X";
      const complete = campaignStageNumber >= window.CAMPAIGN_STAGES.length;
      campaignResultTitle.textContent = won
        ? complete ? "Campaign complete!" : "Challenge cleared!"
        : "Challenge not cleared";
      campaignResultCopy.textContent = won
        ? complete
          ? "You defeated every opponent. You are the Ultimate Tic-Tac-Toe champion!"
          : `${window.CAMPAIGN_STAGES[campaignStageNumber]?.name || "Next challenge"} is now unlocked.`
        : "Study the board, adjust your strategy, and give this challenge another try.";
      campaignNext.hidden = !won || complete;
      if (!campaignNext.hidden) {
        campaignNext.href = `index.html?mode=campaign&stage=${campaignStageNumber + 1}`;
        campaignNext.textContent = "Next challenge";
      }
    }

    resetButton.addEventListener("click", newGame);
    campaignRetry.addEventListener("click", newGame);
    copyRoomLinkButton.addEventListener("click", async () => {
      const inviteLink = new URL("onlineSetup.html", window.location.href);
      inviteLink.searchParams.set("join", roomCode);
      try {
        await navigator.clipboard.writeText(inviteLink.toString());
        copyRoomLinkButton.textContent = "Invite link copied";
      } catch (error) {
        showOnlineError("Could not copy the invite link. Copy the room code and send it to your friend instead.");
      }
    });
    strengthSlider.addEventListener("input", () => {
      strengthValue.value = `${strengthSlider.value} approximate Elo`;
      strengthValue.textContent = strengthSlider.value;
    });
    strengthSlider.addEventListener("change", newGame);
    newGame();
    if (gameMode === "online") connectOnlineGame();
