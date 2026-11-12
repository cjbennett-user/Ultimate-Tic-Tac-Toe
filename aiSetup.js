const setupForm = document.querySelector("#match-setup");
const strengthSlider = document.querySelector("#strength");
const strengthOutput = document.querySelector("#strength-value");

strengthSlider.addEventListener("input", () => {
  strengthOutput.value = `AI strength ${strengthSlider.value}`;
  strengthOutput.textContent = strengthSlider.value;
});

setupForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const player = new FormData(setupForm).get("player");
  const destination = new URL("index.html", window.location.href);
  destination.searchParams.set("mode", "ai");
  destination.searchParams.set("player", String(player));
  destination.searchParams.set("elo", strengthSlider.value);
  window.location.href = destination.href;
});
