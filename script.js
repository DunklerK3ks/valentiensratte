const yesBtn = document.getElementById("yesBtn");
const noBtn = document.getElementById("noBtn");
const hint = document.getElementById("hint");
const subtitle = document.getElementById("subtitle");
const buttonZone = document.getElementById("buttonZone");

const challengeModal = document.getElementById("challengeModal");
const restartBtn = document.getElementById("restartBtn");
const gameArea = document.getElementById("gameArea");
const goodTarget = document.getElementById("goodTarget");
const badTarget = document.getElementById("badTarget");
const gameMessage = document.getElementById("gameMessage");

const scoreValue = document.getElementById("scoreValue");
const levelValue = document.getElementById("levelValue");
const timeValue = document.getElementById("timeValue");
const livesValue = document.getElementById("livesValue");

const mainCard = document.getElementById("mainCard");
const successScreen = document.getElementById("successScreen");
const heartRain = document.getElementById("heartRain");

const gameConfig = {
  goal: 12,
  startTime: 22,
  startLives: 3,
  maxLevel: 6
};

const gameState = {
  score: 0,
  level: 1,
  timeLeft: gameConfig.startTime,
  lives: gameConfig.startLives,
  running: false,
  moveTimerId: null,
  clockTimerId: null,
  lastGoodHitAt: 0
};

let noClicks = 0;

const noHints = [
  "Sicher? Probier lieber Ja.",
  "Nein wird kleiner und flieht.",
  "Nein ist jetzt fast untreffbar.",
  "Fast weg. Noch immer Nein?",
  "Nein ist praktisch nicht mehr moeglich."
];

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function setGameMessage(text, tone = "ok") {
  gameMessage.textContent = text;
  gameMessage.classList.remove("ok", "warn", "fail");
  gameMessage.classList.add(tone);
}

function updateHud() {
  scoreValue.textContent = `${gameState.score}/${gameConfig.goal}`;
  levelValue.textContent = String(gameState.level);
  timeValue.textContent = `${gameState.timeLeft}s`;

  let hearts = "";
  for (let i = 0; i < gameState.lives; i += 1) {
    hearts += "&hearts;";
  }
  livesValue.innerHTML = hearts || "0";
}

function getTargetSize(level, isGood) {
  const base = isGood ? 56 : 52;
  const shrink = (level - 1) * (isGood ? 4 : 3);
  return clamp(base - shrink, 34, base);
}

function placeTargetRandom(target, padding = 8) {
  const areaRect = gameArea.getBoundingClientRect();
  const targetRect = target.getBoundingClientRect();

  const maxX = Math.max(padding, areaRect.width - targetRect.width - padding);
  const maxY = Math.max(padding, areaRect.height - targetRect.height - padding - 36);

  const x = Math.random() * maxX;
  const y = Math.random() * maxY;

  target.style.left = `${x}px`;
  target.style.top = `${y}px`;
}

function styleTargetsByLevel() {
  const goodSize = getTargetSize(gameState.level, true);
  const badSize = getTargetSize(gameState.level, false);

  goodTarget.style.width = `${goodSize}px`;
  goodTarget.style.height = `${goodSize}px`;
  badTarget.style.width = `${badSize}px`;
  badTarget.style.height = `${badSize}px`;
}

function moveTargets() {
  styleTargetsByLevel();
  placeTargetRandom(goodTarget, 8);
  placeTargetRandom(badTarget, 8);
}

function moveDelayByLevel() {
  return clamp(980 - gameState.level * 110, 280, 980);
}

function clearGameTimers() {
  if (gameState.moveTimerId) {
    clearTimeout(gameState.moveTimerId);
    gameState.moveTimerId = null;
  }
  if (gameState.clockTimerId) {
    clearInterval(gameState.clockTimerId);
    gameState.clockTimerId = null;
  }
}

function scheduleMovement() {
  if (!gameState.running) {
    return;
  }

  moveTargets();
  gameState.moveTimerId = setTimeout(scheduleMovement, moveDelayByLevel());
}

function deriveLevel() {
  return clamp(1 + Math.floor(gameState.score / 3), 1, gameConfig.maxLevel);
}

function hideTargets(hidden) {
  goodTarget.classList.toggle("hidden-target", hidden);
  badTarget.classList.toggle("hidden-target", hidden);
}

function startGame() {
  clearGameTimers();

  gameState.score = 0;
  gameState.level = 1;
  gameState.timeLeft = gameConfig.startTime;
  gameState.lives = gameConfig.startLives;
  gameState.running = true;
  gameState.lastGoodHitAt = 0;

  restartBtn.classList.add("hidden");
  hideTargets(false);

  updateHud();
  setGameMessage("Triff +1. Vermeide -1. Schnelle Treffer geben +2.", "ok");
  moveTargets();
  scheduleMovement();

  gameState.clockTimerId = setInterval(() => {
    if (!gameState.running) {
      return;
    }

    gameState.timeLeft -= 1;
    updateHud();

    if (gameState.timeLeft <= 0) {
      loseGame("Zeit abgelaufen.");
    }
  }, 1000);
}

function openChallenge() {
  subtitle.textContent = "Fast geschafft. Erst die Challenge knacken.";
  challengeModal.classList.remove("hidden");
  startGame();
}

function winGame() {
  gameState.running = false;
  clearGameTimers();
  challengeModal.classList.add("hidden");
  mainCard.classList.add("hidden");
  successScreen.classList.remove("hidden");
  startHeartRain();
}

function loseGame(reason) {
  gameState.running = false;
  clearGameTimers();
  hideTargets(true);
  setGameMessage(`${reason} Nochmal?`, "fail");
  restartBtn.classList.remove("hidden");
}

function onGoodHit(event) {
  event.stopPropagation();
  if (!gameState.running) {
    return;
  }

  const now = Date.now();
  const wasFast = now - gameState.lastGoodHitAt < 700;
  const gain = wasFast ? 2 : 1;
  gameState.lastGoodHitAt = now;

  gameState.score += gain;
  const nextLevel = deriveLevel();
  const levelUp = nextLevel > gameState.level;
  gameState.level = nextLevel;

  if (gameState.score >= gameConfig.goal) {
    gameState.score = gameConfig.goal;
    updateHud();
    winGame();
    return;
  }

  updateHud();
  if (levelUp) {
    setGameMessage(`Level ${gameState.level}. Es wird schneller.`, "warn");
  } else if (wasFast) {
    setGameMessage("Schneller Treffer: +2", "ok");
  } else {
    setGameMessage("Sauberer Treffer: +1", "ok");
  }

  moveTargets();
}

function onBadHit(event) {
  event.stopPropagation();
  if (!gameState.running) {
    return;
  }

  gameState.lives -= 1;
  gameState.score = clamp(gameState.score - 1, 0, gameConfig.goal);
  gameState.level = deriveLevel();

  updateHud();

  if (gameState.lives <= 0) {
    loseGame("Zu viele Fehltreffer.");
    return;
  }

  setGameMessage("Autsch. Das war das falsche Ziel.", "warn");
  moveTargets();
}

function onAreaMiss(event) {
  if (!gameState.running || event.target !== gameArea) {
    return;
  }

  gameState.timeLeft = clamp(gameState.timeLeft - 1, 0, gameConfig.startTime);
  updateHud();
  setGameMessage("Vorbei geklickt: -1s", "warn");

  if (gameState.timeLeft <= 0) {
    loseGame("Zeit abgelaufen.");
  }
}

function startHeartRain() {
  heartRain.innerHTML = "";

  for (let i = 0; i < 56; i += 1) {
    const node = document.createElement("span");
    node.className = "confetti";
    node.textContent = i % 2 === 0 ? "<3" : "*";
    node.style.left = `${Math.random() * 100}%`;
    node.style.animationDuration = `${2.8 + Math.random() * 3.4}s`;
    node.style.animationDelay = `${Math.random() * 1.4}s`;
    node.style.fontSize = `${13 + Math.random() * 14}px`;
    heartRain.appendChild(node);
  }
}

function moveNoButton() {
  const zoneRect = buttonZone.getBoundingClientRect();
  const noRect = noBtn.getBoundingClientRect();

  const maxX = Math.max(12, zoneRect.width - noRect.width - 12);
  const maxY = Math.max(12, zoneRect.height - noRect.height - 12);

  const x = Math.random() * maxX;
  const y = Math.random() * maxY;

  noBtn.style.left = `${x}px`;
  noBtn.style.top = `${y}px`;
}

function makeNoHarder() {
  noClicks += 1;

  if (!noBtn.classList.contains("floating")) {
    noBtn.classList.add("floating");
  }

  const noScale = clamp(1 - noClicks * 0.17, 0.05, 1);
  const noOpacity = clamp(1 - noClicks * 0.1, 0.35, 1);
  const yesScale = clamp(1 + noClicks * 0.07, 1, 1.35);

  noBtn.style.transform = `scale(${noScale})`;
  noBtn.style.opacity = String(noOpacity);
  yesBtn.style.transform = `scale(${yesScale})`;

  hint.textContent = noHints[Math.min(noClicks - 1, noHints.length - 1)];
  moveNoButton();
}

yesBtn.addEventListener("click", openChallenge);
restartBtn.addEventListener("click", startGame);
goodTarget.addEventListener("click", onGoodHit);
badTarget.addEventListener("click", onBadHit);
gameArea.addEventListener("click", onAreaMiss);

noBtn.addEventListener("click", makeNoHarder);
noBtn.addEventListener("pointerenter", () => {
  if (noClicks > 0) {
    moveNoButton();
  }
});

window.addEventListener("resize", () => {
  if (gameState.running) {
    moveTargets();
  }
  if (noBtn.classList.contains("floating")) {
    moveNoButton();
  }
});
