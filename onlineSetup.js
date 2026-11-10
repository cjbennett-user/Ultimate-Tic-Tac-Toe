const createRoomButton = document.querySelector("#create-room");
const joinRoomForm = document.querySelector("#join-room-form");
const roomCodeInput = document.querySelector("#room-code-input");
const onlineError = document.querySelector("#online-error");
const onlineProgress = document.querySelector("#online-progress");
const roomCodeCharacters = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

let requestInProgress = false;

function initializeFirebase() {
  if (!window.firebase || !window.FIREBASE_CONFIG) {
    throw new Error("Firebase could not load. Check your internet connection and Firebase setup.");
  }

  const app = window.firebase.apps.length
    ? window.firebase.app()
    : window.firebase.initializeApp(window.FIREBASE_CONFIG);

  const auth = window.firebase.auth(app);
  return getOrCreateAnonymousUser(auth).then((user) => ({
    database: window.firebase.database(app),
    uid: user.uid
  }));
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

function newGameState() {
  return {
    cells: Array.from({ length: 9 }, () => Array(9).fill("")),
    boardResults: Array(9).fill(""),
    currentPlayer: "X",
    nextBoard: -1,
    result: ""
  };
}

function openRoom(roomCode) {
  window.location.href = `index.html?mode=online&room=${encodeURIComponent(roomCode)}`;
}

async function createRoom() {
  const { database, uid } = await initializeFirebase();
  const roomCode = makeRoomCode();
  await database.ref(`rooms/${roomCode}`).set({
    hostUid: uid,
    guestUid: null,
    state: newGameState()
  });
  openRoom(roomCode);
}

async function joinRoom(roomCode) {
  const { database, uid } = await initializeFirebase();
  const roomRef = database.ref(`rooms/${roomCode}`);
  await roomRef.child("guestUid").set(uid);
  openRoom(roomCode);
}

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
      ? new Error("That room code is invalid or already has two players.")
      : error);
  }
});

const invitedRoomCode = new URLSearchParams(window.location.search).get("join");
if (invitedRoomCode) {
  roomCodeInput.value = invitedRoomCode.toUpperCase().replace(/[^A-HJ-NP-Z2-9]/g, "").slice(0, 8);
  joinRoomForm.requestSubmit();
}
