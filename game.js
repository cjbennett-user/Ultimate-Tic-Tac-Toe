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
    const campaignProgressKey = "ultimate-tic-tac-toe-campaign";
    const query = new URLSearchParams(window.location.search);
    const requestedMode = query.get("mode");
    const gameMode = requestedMode === "ai" || requestedMode === "campaign" ? requestedMode : "local";
    const humanMark = gameMode === "ai" && query.get("player") === "O" ? "O" : "X";
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

    let cells;
    let boardResults;
    let currentPlayer;
    let nextBoard;
    let gameResult;
    let aiThinking;
    let aiTimer;

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
          button.disabled = Boolean(gameResult) || aiThinking || (gameMode !== "local" && currentPlayer === aiMark) ||
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
      if (!gameResult && gameMode !== "local" && currentPlayer === aiMark) scheduleAiMove();
    }

    function playMove(boardIndex, cellIndex) {
      if (gameResult || isBoardClosed(boardIndex) || cells[boardIndex][cellIndex]) return;
      if (nextBoard !== null && nextBoard !== boardIndex) return;
      if (gameMode !== "local" && (currentPlayer !== humanMark || aiThinking)) return;

      cells[boardIndex][cellIndex] = currentPlayer;
      finishMove(boardIndex, cellIndex);
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
      document.querySelector("#first-player").lastChild.textContent =
        gameMode === "local"
          ? " Player 1"
          : aiMark === "X" ? ` AI · ${strengthSlider.value}` : " You";
      secondPlayerElement.lastChild.textContent = gameMode === "local"
        ? " Player 2"
        : gameMode === "campaign"
          ? ` AI · ${campaignStage.rating}`
          : aiMark === "O" ? ` AI · ${strengthSlider.value}` : " You";
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
    strengthSlider.addEventListener("input", () => {
      strengthValue.value = `${strengthSlider.value} approximate Elo`;
      strengthValue.textContent = strengthSlider.value;
    });
    strengthSlider.addEventListener("change", newGame);
    newGame();
