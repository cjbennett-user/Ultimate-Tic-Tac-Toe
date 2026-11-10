const CAMPAIGN_PROGRESS_KEY = "ultimate-tic-tac-toe-campaign";
const stageList = document.querySelector("#stage-list");
const progressCopy = document.querySelector("#progress-copy");
const progressFill = document.querySelector("#progress-fill");
const progressBar = document.querySelector(".progress-track");

function readProgress() {
  const savedProgress = Number(localStorage.getItem(CAMPAIGN_PROGRESS_KEY)) || 0;
  return Math.min(CAMPAIGN_STAGES.length, Math.max(0, savedProgress));
}

function renderCampaign() {
  const completed = readProgress();
  const highestUnlocked = Math.min(CAMPAIGN_STAGES.length, completed + 1);
  const percentComplete = (completed / CAMPAIGN_STAGES.length) * 100;

  progressCopy.textContent = completed === CAMPAIGN_STAGES.length
    ? "Campaign complete!"
    : `${completed} of ${CAMPAIGN_STAGES.length} challenges complete`;
  progressFill.style.width = `${percentComplete}%`;
  progressBar.setAttribute("aria-valuemax", String(CAMPAIGN_STAGES.length));
  progressBar.setAttribute("aria-valuenow", String(completed));
  stageList.replaceChildren();

  CAMPAIGN_STAGES.forEach((stage, index) => {
    const stageNumber = index + 1;
    const isUnlocked = stageNumber <= highestUnlocked;
    const isComplete = stageNumber <= completed;
    const card = document.createElement(isUnlocked ? "a" : "div");
    card.className = "stage-card";
    if (isComplete) card.classList.add("complete");
    if (stageNumber === highestUnlocked && !isComplete) card.classList.add("current");
    if (!isUnlocked) card.classList.add("locked");
    if (isUnlocked) {
      card.href = `index.html?mode=campaign&stage=${stageNumber}`;
      card.setAttribute("aria-label", `Start challenge ${stageNumber}: ${stage.name}, AI rating ${stage.rating}`);
    } else {
      card.setAttribute("aria-label", `Challenge ${stageNumber} locked`);
    }

    const number = document.createElement("span");
    number.className = "stage-number";
    number.textContent = isComplete ? "✓" : String(stageNumber);

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
    state.textContent = isComplete ? "Complete" : isUnlocked ? "Play ›" : "Locked";
    details.append(rating, state);

    card.append(number, copy, details);
    stageList.append(card);
  });
}

renderCampaign();
