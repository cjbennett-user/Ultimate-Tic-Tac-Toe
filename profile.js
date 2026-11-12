const playerHeading = document.querySelector("#player-heading");
const playerRating = document.querySelector("#player-rating");
const playerAccountStatus = document.querySelector("#player-account-status");
const playerRecord = document.querySelector("#player-record");
const accountEmail = document.querySelector("#account-email");
const accountPassword = document.querySelector("#account-password");
const accountError = document.querySelector("#account-error");
const accountButtons = [...document.querySelectorAll(".account-actions button")];

let profileAuth;
let profileDatabase;
let profileBusy = false;
let currentRating = 800;
let currentGamesPlayed = 0;

function showAccountError(error) {
  const messages = {
    "auth/email-already-in-use": "That email already has an account. Sign in to it instead; ratings from separate profiles cannot be merged automatically.",
    "auth/credential-already-in-use": "That account is already linked to another player profile. Sign in to that account to use its rating.",
    "auth/weak-password": "Choose a password with at least 6 characters.",
    "auth/invalid-email": "Enter a valid email address.",
    "auth/operation-not-allowed": "This sign-in option is unavailable right now. Please try again later.",
    "auth/popup-blocked": "Your browser blocked the Google sign-in popup. Allow popups for this site and try again.",
    "auth/popup-closed-by-user": "The sign-in window was closed before the process finished.",
    "auth/wrong-password": "The email or password is incorrect.",
    "auth/invalid-credential": "The email or password is incorrect."
  };
  console.error("Player account action failed.", error);
  accountError.textContent = messages[error.code] || "The account action failed. Please try again.";
  accountError.hidden = false;
}

function setAccountBusy(isBusy) {
  profileBusy = isBusy;
  for (const button of accountButtons) {
    const user = profileAuth && profileAuth.currentUser;
    const providerAlreadyLinked = user && (
      button.id === "link-email" && user.providerData.some((provider) => provider.providerId === "password") ||
      button.id === "link-google" && user.providerData.some((provider) => provider.providerId === "google.com")
    );
    button.disabled = isBusy || Boolean(providerAlreadyLinked);
  }
}

function updateProfileUI(user, profile) {
  currentRating = Number(profile.rating) || 800;
  currentGamesPlayed = Number(profile.gamesPlayed) || 0;
  playerRating.value = String(currentRating);
  playerRating.textContent = String(currentRating);
  playerHeading.textContent = user.isAnonymous ? "Guest player" : "Player rating";
  playerAccountStatus.textContent = user.isAnonymous
    ? `Rating ${currentRating} · Guest profile on this browser`
    : `Rating ${currentRating} · Account linked${user.email ? ` as ${user.email}` : ""}`;
  playerRecord.textContent =
    `${Number(profile.gamesPlayed) || 0} games · ${Number(profile.wins) || 0} wins · ` +
    `${Number(profile.losses) || 0} losses · ${Number(profile.draws) || 0} draws`;

  setAccountBusy(profileBusy);
}

async function refreshProfile(user) {
  if (!user || !profileDatabase) return;
  const profile = await window.PlayerAccount.ensureProfile(profileDatabase, user.uid);
  updateProfileUI(user, profile);
}

async function runAccountAction(action) {
  if (profileBusy || !profileAuth) return;
  accountError.hidden = true;
  setAccountBusy(true);

  try {
    await action();
    const user = profileAuth.currentUser;
    if (user) await refreshProfile(user);
    if (!user || user.isAnonymous) {
      playerAccountStatus.textContent = "The account action did not link a permanent sign-in method.";
    }
  } catch (error) {
    showAccountError(error);
  } finally {
    setAccountBusy(false);
  }
}

document.querySelector("#link-email").addEventListener("click", () => {
  const email = accountEmail.value.trim();
  const password = accountPassword.value;
  if (!email || password.length < 6) {
    showAccountError({ message: "Enter an email and a password with at least 6 characters." });
    return;
  }
  runAccountAction(() => window.PlayerAccount.linkEmail(profileAuth, email, password));
});

document.querySelector("#sign-in-email").addEventListener("click", () => {
  const email = accountEmail.value.trim();
  const password = accountPassword.value;
  if (!email || !password) {
    showAccountError({ message: "Enter the email and password for your linked account." });
    return;
  }
  if (profileAuth.currentUser && profileAuth.currentUser.isAnonymous &&
    currentGamesPlayed > 0 &&
    !window.confirm("Signing in will switch away from this guest profile. Link it first if you want to keep its rating.")) {
    return;
  }
  runAccountAction(() => window.PlayerAccount.signInEmail(profileAuth, email, password));
});

document.querySelector("#link-google").addEventListener("click", () => {
  runAccountAction(() => window.PlayerAccount.linkGoogle(profileAuth));
});

document.querySelector("#account-form").addEventListener("submit", (event) => {
  event.preventDefault();
});

document.querySelector("#sign-in-google").addEventListener("click", () => {
  if (profileAuth && profileAuth.currentUser && profileAuth.currentUser.isAnonymous &&
    currentGamesPlayed > 0 &&
    !window.confirm("Signing in will switch away from this guest profile. Link it first if you want to keep its rating.")) {
    return;
  }
  runAccountAction(() => window.PlayerAccount.signInGoogle(profileAuth));
});

window.PlayerAccount.initialize().then(({ auth, database, user, profile }) => {
  profileAuth = auth;
  profileDatabase = database;
  updateProfileUI(user, profile);
  auth.onAuthStateChanged((updatedUser) => {
    if (updatedUser) {
      refreshProfile(updatedUser).catch(showAccountError);
    }
  });
}).catch((error) => {
  playerHeading.textContent = "Profile unavailable";
  playerRating.value = "—";
  playerRating.textContent = "—";
  playerRecord.textContent = "";
  playerAccountStatus.textContent = "Could not load your rating. Check your connection and try again.";
  showAccountError(error);
});
