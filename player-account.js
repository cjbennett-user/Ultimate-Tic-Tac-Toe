(function () {
  const startingRating = 800;
  const ratingKFactor = 32;
  const recentMatchLimit = 50;

  function getApp() {
    if (!window.firebase || !window.FIREBASE_CONFIG) {
      throw new Error("Firebase could not load. Check your internet connection and reload.");
    }

    return window.firebase.apps.length
      ? window.firebase.app()
      : window.firebase.initializeApp(window.FIREBASE_CONFIG);
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

  async function initialize() {
    const app = getApp();
    const auth = window.firebase.auth(app);
    const user = await getOrCreateAnonymousUser(auth);
    const database = window.firebase.database(app);
    const profile = await ensureProfile(database, user.uid);
    return { app, auth, database, user, profile };
  }

  async function ensureProfile(database, uid) {
    const result = await database.ref(`players/${uid}`).transaction((current) => {
      const profile = current || {};
      const rating = Number(profile.rating);
      return {
        rating: Number.isFinite(rating) && rating >= 100
          ? Math.min(5000, Math.round(rating))
          : startingRating,
        gamesPlayed: Number(profile.gamesPlayed) || 0,
        wins: Number(profile.wins) || 0,
        losses: Number(profile.losses) || 0,
        draws: Number(profile.draws) || 0,
        recentMatchIds: Array.isArray(profile.recentMatchIds) ? profile.recentMatchIds.slice(-recentMatchLimit) : []
      };
    });

    if (!result.committed || !result.snapshot.exists()) {
      throw new Error("Your player profile could not be loaded. Check your Realtime Database rules.");
    }
    return result.snapshot.val();
  }

  function ratingChange(rating, opponentRating, score) {
    const expectedScore = 1 / (1 + Math.pow(10, (opponentRating - rating) / 400));
    return Math.round(ratingKFactor * (score - expectedScore));
  }

  async function recordMatch(database, uid, matchId, outcome, opponentRating) {
    if (!matchId || !["win", "loss", "draw"].includes(outcome) ||
      !Number.isFinite(opponentRating) || opponentRating < 100) {
      throw new Error("The completed match has invalid rating data.");
    }

    let change = 0;
    let matchWasApplied = false;
    let matchWasAlreadyRecorded = false;
    const transaction = await database.ref(`players/${uid}`).transaction((current) => {
      const profile = current || {};
      const recentMatchIds = Array.isArray(profile.recentMatchIds) ? profile.recentMatchIds : [];
      if (recentMatchIds.includes(matchId)) {
        matchWasApplied = false;
        matchWasAlreadyRecorded = true;
        return;
      }

      const rating = Number(profile.rating);
      const previousRating = Number.isFinite(rating) && rating >= 100
        ? Math.min(5000, Math.round(rating))
        : startingRating;
      const score = outcome === "win" ? 1 : outcome === "draw" ? 0.5 : 0;
      matchWasApplied = true;
      matchWasAlreadyRecorded = false;
      const gamesPlayed = (Number(profile.gamesPlayed) || 0) + 1;
      const wins = (Number(profile.wins) || 0) + (outcome === "win" ? 1 : 0);
      const losses = (Number(profile.losses) || 0) + (outcome === "loss" ? 1 : 0);
      const draws = (Number(profile.draws) || 0) + (outcome === "draw" ? 1 : 0);
      const updatedRating = Math.min(
        5000,
        Math.max(100, previousRating + ratingChange(previousRating, opponentRating, score))
      );
      change = updatedRating - previousRating;
      return {
        ...profile,
        rating: updatedRating,
        gamesPlayed,
        wins,
        losses,
        draws,
        recentMatchIds: [...recentMatchIds.slice(-(recentMatchLimit - 1)), matchId]
      };
    });

    if (!transaction.committed && !matchWasAlreadyRecorded) {
      throw new Error("Your rating update could not be saved. Check your Realtime Database rules.");
    }
    return {
      rating: Number(transaction.snapshot.child("rating").val()) || startingRating,
      change: matchWasApplied ? change : 0
    };
  }

  async function cleanupRooms(database, uid) {
    const playerRoomsRef = database.ref(`playerRooms/${uid}`);
    const roomsSnapshot = await playerRoomsRef.once("value");
    const roomCodes = roomsSnapshot.val() || {};
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;

    for (const roomCode of Object.keys(roomCodes)) {
      const roomRef = database.ref(`rooms/${roomCode}`);
      const roomSnapshot = await roomRef.once("value");
      const room = roomSnapshot.val();
      if (!room) {
        await playerRoomsRef.child(roomCode).remove();
        continue;
      }

      const isParticipant = room.hostUid === uid || room.guestUid === uid;
      const isFinished = Boolean(room.state && room.state.result);
      const isExpired = Number(room.createdAt) < cutoff;
      if (!isParticipant) {
        await playerRoomsRef.child(roomCode).remove();
      } else if (isFinished || isExpired) {
        await roomRef.remove();
        await playerRoomsRef.child(roomCode).remove();
      }
    }
  }

  async function linkEmail(auth, email, password) {
    const user = auth.currentUser || await getOrCreateAnonymousUser(auth);
    const credential = window.firebase.auth.EmailAuthProvider.credential(email, password);
    return user.linkWithCredential(credential);
  }

  async function signInEmail(auth, email, password) {
    return auth.signInWithEmailAndPassword(email, password);
  }

  async function linkGoogle(auth) {
    return auth.currentUser.linkWithPopup(new window.firebase.auth.GoogleAuthProvider());
  }

  async function signInGoogle(auth) {
    return auth.signInWithPopup(new window.firebase.auth.GoogleAuthProvider());
  }

  window.PlayerAccount = {
    startingRating,
    initialize,
    ensureProfile,
    ratingChange,
    recordMatch,
    cleanupRooms,
    linkEmail,
    signInEmail,
    linkGoogle,
    signInGoogle
  };
})();
