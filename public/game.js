const canvas = document.querySelector("#game");
const context = canvas.getContext("2d");
const scoreElement = document.querySelector("#score");
const overlay = document.querySelector("#overlay");
const overlayIcon = document.querySelector("#overlay-icon");
const overlayKicker = document.querySelector("#overlay-kicker");
const overlayTitle = document.querySelector("#overlay-title");
const overlayHint = document.querySelector("#overlay-hint");
const startButton = document.querySelector("#start-button");
const leaderboard = document.querySelector("#leaderboard");
const mobilePauseButton = document.querySelector("#mobile-pause-button");

const tileCount = 22;
const tileSize = canvas.width / tileCount;
const colors = { background: "#141c15", grid: "#1d281d", snake: "#c5f36b", head: "#e1ff9f", food: "#ff785e" };
let snake;
let food;
let direction;
let nextDirection;
let score = 0;
let gameState = "ready";
let gameTimer;

function drawBoard() {
  context.fillStyle = colors.background;
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.strokeStyle = colors.grid;
  context.lineWidth = 1;
  for (let index = 1; index < tileCount; index += 1) {
    const position = index * tileSize;
    context.beginPath();
    context.moveTo(position, 0);
    context.lineTo(position, canvas.height);
    context.moveTo(0, position);
    context.lineTo(canvas.width, position);
    context.stroke();
  }
}

function drawGame() {
  drawBoard();
  if (food) {
    context.fillStyle = colors.food;
    context.beginPath();
    context.arc((food.x + 0.5) * tileSize, (food.y + 0.5) * tileSize, tileSize * 0.29, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = "#ffb19e";
    context.beginPath();
    context.arc((food.x + 0.4) * tileSize, (food.y + 0.4) * tileSize, tileSize * 0.08, 0, Math.PI * 2);
    context.fill();
  }

  snake.forEach((segment, index) => {
    const inset = index === 0 ? 2 : 3;
    const radius = index === 0 ? 5 : 4;
    context.fillStyle = index === 0 ? colors.head : colors.snake;
    context.beginPath();
    context.roundRect(segment.x * tileSize + inset, segment.y * tileSize + inset, tileSize - inset * 2, tileSize - inset * 2, radius);
    context.fill();
  });
}

function placeFood() {
  const openTiles = [];
  for (let y = 0; y < tileCount; y += 1) {
    for (let x = 0; x < tileCount; x += 1) {
      if (!snake.some((segment) => segment.x === x && segment.y === y)) openTiles.push({ x, y });
    }
  }
  food = openTiles.length ? openTiles[Math.floor(Math.random() * openTiles.length)] : null;
}

function resetGame() {
  snake = [{ x: 10, y: 11 }, { x: 9, y: 11 }, { x: 8, y: 11 }];
  direction = { x: 1, y: 0 };
  nextDirection = direction;
  score = 0;
  scoreElement.textContent = "000";
  placeFood();
  drawGame();
}

function showOverlay(mode) {
  overlay.classList.remove("hidden");
  if (mode === "ready") {
    overlayIcon.textContent = "↗";
    overlayKicker.textContent = "READY WHEN YOU ARE";
    overlayTitle.innerHTML = "One more<br>round?";
    startButton.innerHTML = "Start game <span>→</span>";
    overlayHint.textContent = "PRESS ENTER TO PLAY";
  } else if (mode === "paused") {
    overlayIcon.textContent = "Ⅱ";
    overlayKicker.textContent = "TAKE YOUR TIME";
    overlayTitle.innerHTML = "Game<br>paused.";
    startButton.innerHTML = "Keep playing <span>→</span>";
    overlayHint.textContent = "PRESS SPACE TO RESUME";
  } else if (mode === "over") {
    overlayIcon.textContent = "✳";
    overlayKicker.textContent = "NICE RUN";
    overlayTitle.innerHTML = "Game<br>over.";
    startButton.innerHTML = "Play again <span>→</span>";
    overlayHint.textContent = "PRESS ENTER TO PLAY AGAIN";
  }
}

function startGame() {
  if (gameState === "running") return;
  if (gameState === "ready" || gameState === "over") resetGame();
  gameState = "running";
  mobilePauseButton.textContent = "Pause";
  overlay.classList.add("hidden");
  clearInterval(gameTimer);
  gameTimer = setInterval(moveSnake, Math.max(65, 130 - Math.floor(score / 50) * 5));
}

function pauseGame() {
  if (gameState !== "running") return;
  gameState = "paused";
  mobilePauseButton.textContent = "Resume";
  clearInterval(gameTimer);
  showOverlay("paused");
}

function endGame() {
  gameState = "over";
  mobilePauseButton.textContent = "Pause";
  clearInterval(gameTimer);
  drawGame();
  showOverlay("over");
  saveScore();
}

function moveSnake() {
  direction = nextDirection;
  const head = { x: snake[0].x + direction.x, y: snake[0].y + direction.y };
  const ateFood = head.x === food.x && head.y === food.y;
  const bodyToCheck = ateFood ? snake : snake.slice(0, -1);

  if (head.x < 0 || head.x >= tileCount || head.y < 0 || head.y >= tileCount ||
      bodyToCheck.some((segment) => segment.x === head.x && segment.y === head.y)) {
    endGame();
    return;
  }

  snake.unshift(head);
  if (ateFood) {
    score += 10;
    scoreElement.textContent = String(score).padStart(3, "0");
    placeFood();
    clearInterval(gameTimer);
    gameTimer = setInterval(moveSnake, Math.max(65, 130 - Math.floor(score / 50) * 5));
    if (!food) {
      endGame();
      return;
    }
  } else {
    snake.pop();
  }
  drawGame();
}

function setDirection(x, y) {
  if (gameState === "ready" || gameState === "over") startGame();
  if (gameState !== "running" || (x === -direction.x && y === -direction.y)) return;
  nextDirection = { x, y };
}

async function saveScore() {
  if (score === 0) return;
  let name = window.prompt(`You scored ${score}! Enter your name for the leaderboard:`, "PLAYER");
  if (name === null) return;
  name = name.trim().slice(0, 16);
  if (!name) name = "PLAYER";

  try {
    const response = await fetch("/api/scores", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, score }),
    });
    if (!response.ok) throw new Error("Could not save your score.");
    renderLeaderboard(await response.json());
  } catch (error) {
    console.error(error);
    window.alert("Your score could not be saved. Please try again later.");
  }
}

function renderLeaderboard(scores) {
  leaderboard.replaceChildren();
  if (!scores.length) {
    const empty = document.createElement("li");
    empty.className = "empty-state";
    empty.textContent = "No scores yet — be the first!";
    leaderboard.append(empty);
    return;
  }

  scores.forEach((entry, index) => {
    const row = document.createElement("li");
    const rank = document.createElement("span");
    rank.className = "rank";
    rank.textContent = String(index + 1).padStart(2, "0");
    const name = document.createElement("span");
    name.className = "player-name";
    name.textContent = entry.name;
    const points = document.createElement("span");
    points.className = "player-score";
    points.textContent = String(entry.score).padStart(3, "0");
    row.append(rank, name, points);
    leaderboard.append(row);
  });
}

async function loadLeaderboard() {
  try {
    const response = await fetch("/api/scores");
    if (!response.ok) throw new Error("Could not load scores.");
    renderLeaderboard(await response.json());
  } catch (error) {
    console.error(error);
    const empty = document.createElement("li");
    empty.className = "empty-state";
    empty.textContent = "Leaderboard unavailable";
    leaderboard.replaceChildren(empty);
  }
}

const keyDirections = {
  ArrowUp: [0, -1], w: [0, -1], W: [0, -1],
  ArrowDown: [0, 1], s: [0, 1], S: [0, 1],
  ArrowLeft: [-1, 0], a: [-1, 0], A: [-1, 0],
  ArrowRight: [1, 0], d: [1, 0], D: [1, 0],
};

let touchStart;
const boardShell = document.querySelector(".board-shell");

boardShell.addEventListener("touchstart", (event) => {
  const touch = event.changedTouches[0];
  touchStart = { x: touch.clientX, y: touch.clientY };
}, { passive: true });

boardShell.addEventListener("touchend", (event) => {
  if (!touchStart) return;
  const touch = event.changedTouches[0];
  const deltaX = touch.clientX - touchStart.x;
  const deltaY = touch.clientY - touchStart.y;
  touchStart = null;
  if (Math.max(Math.abs(deltaX), Math.abs(deltaY)) < 24) return;
  if (Math.abs(deltaX) > Math.abs(deltaY)) {
    setDirection(deltaX > 0 ? 1 : -1, 0);
  } else {
    setDirection(0, deltaY > 0 ? 1 : -1);
  }
}, { passive: true });

boardShell.addEventListener("touchcancel", () => {
  touchStart = null;
}, { passive: true });

document.addEventListener("keydown", (event) => {
  const movement = keyDirections[event.key];
  if (movement) {
    event.preventDefault();
    setDirection(movement[0], movement[1]);
  } else if (event.key === " " && gameState === "running") {
    event.preventDefault();
    pauseGame();
  } else if (event.key === " " && gameState === "paused") {
    event.preventDefault();
    startGame();
  } else if (event.key === "Enter" && gameState !== "running") {
    startGame();
  }
});

document.querySelectorAll("[data-direction]").forEach((button) => {
  button.addEventListener("click", () => {
    const movement = {
      up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0],
    }[button.dataset.direction];
    setDirection(movement[0], movement[1]);
  });
});

mobilePauseButton.addEventListener("click", () => {
  if (gameState === "running") {
    pauseGame();
  } else if (gameState === "paused") {
    startGame();
  }
});

startButton.addEventListener("click", startGame);
document.querySelector("#restart-button").addEventListener("click", () => {
  clearInterval(gameTimer);
  gameState = "ready";
  mobilePauseButton.textContent = "Pause";
  resetGame();
  showOverlay("ready");
});

resetGame();
showOverlay("ready");
loadLeaderboard();

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch((error) => {
      console.error("Could not enable offline support:", error);
    });
  });
}
