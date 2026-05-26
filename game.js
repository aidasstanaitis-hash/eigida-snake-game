const canvas = document.querySelector("#game");
const ctx = canvas.getContext("2d");
const scoreEl = document.querySelector("#score");
const bestScoreEl = document.querySelector("#bestScore");
const overlay = document.querySelector("#overlay");
const overlayTitle = document.querySelector("#overlayTitle");
const overlayText = document.querySelector("#overlayText");
const startButton = document.querySelector("#startButton");
const scoreForm = document.querySelector("#scoreForm");
const playerNameInput = document.querySelector("#playerName");
const saveScoreButton = document.querySelector("#saveScoreButton");
const scoreStatus = document.querySelector("#scoreStatus");
const leaderboardList = document.querySelector("#leaderboardList");
const leaderboardEmpty = document.querySelector("#leaderboardEmpty");
const refreshLeaderboard = document.querySelector("#refreshLeaderboard");

const grid = 18;
const tile = canvas.width / grid;
const startSpeed = 150;
const minSpeed = 72;

const products = [
  { name: "Biuro stalas", label: "Stalas", kind: "desk", color: "#8b5e34", accent: "#d6a35f", points: 10 },
  { name: "Laboratorinis stalas", label: "Lab.", kind: "labTable", color: "#64748b", accent: "#dce6f1", points: 10 },
  { name: "Kėdė", label: "Kėdė", kind: "chair", color: "#2563eb", accent: "#c7d7ff", points: 10 },
  { name: "Spinta", label: "Spinta", kind: "cabinet", color: "#7c3aed", accent: "#efe7ff", points: 10 },
  { name: "Persirengimo spintelė", label: "Spintelė", kind: "locker", color: "#0f9f8f", accent: "#d9fffb", points: 10 },
  { name: "Magnetinė lenta", label: "Lenta", kind: "whiteboard", color: "#15803d", accent: "#ffffff", points: 10 },
  { name: "Kamštinė lenta", label: "Kamštis", kind: "corkboard", color: "#a16207", accent: "#e8bf7a", points: 10 },
  { name: "Bibliotekos lentyna", label: "Lentyna", kind: "shelf", color: "#ef7d22", accent: "#ffe4c7", points: 10 },
  { name: "Konferencijų stovas", label: "Stovas", kind: "stand", color: "#d94141", accent: "#fff1f1", points: 10 },
  { name: "Projektoriaus ekranas", label: "Ekranas", kind: "screen", color: "#334155", accent: "#eef2f7", points: 10 },
  { name: "Komoda su stalčiais", label: "Komoda", kind: "dresser", color: "#854d0e", accent: "#f7dca4", points: 10 },
  { name: "Akustinė pertvara", label: "Pertvara", kind: "partition", color: "#be185d", accent: "#ffd7e8", points: 10 }
];

const directorBonus = {
  name: "Direktoriaus galva",
  label: "MS",
  kind: "director",
  color: "#111827",
  accent: "#f8d8bd",
  points: 50,
  bonus: true
};

const directorImage = new Image();
let directorImageReady = false;
directorImage.onload = () => {
  directorImageReady = true;
  draw();
};
directorImage.src = "assets/directorius.png";

let snake;
let direction;
let nextDirection;
let product;
let score;
let bestScore;
let speed;
let lastStep;
let running;
let ended;
let frameId;
let foodsEaten;
let scoreSubmitted;

function loadBestScore() {
  try {
    const stored = Number(localStorage.getItem("eigidaSnakeBest"));
    return Number.isFinite(stored) ? stored : 0;
  } catch {
    return 0;
  }
}

function saveBestScore(value) {
  try {
    localStorage.setItem("eigidaSnakeBest", String(value));
  } catch {
    // The game still works if local storage is disabled.
  }
}

function resetGame() {
  snake = [
    { x: 8, y: 9 },
    { x: 7, y: 9 },
    { x: 6, y: 9 }
  ];
  direction = { x: 1, y: 0 };
  nextDirection = { x: 1, y: 0 };
  score = 0;
  foodsEaten = 0;
  scoreSubmitted = false;
  speed = startSpeed;
  running = true;
  ended = false;
  lastStep = 0;
  scoreEl.textContent = score;
  product = createProduct();
}

function randomCell() {
  return {
    x: Math.floor(Math.random() * grid),
    y: Math.floor(Math.random() * grid)
  };
}

function createProduct(forceBonus = false) {
  let cell = randomCell();

  while (snake.some(part => part.x === cell.x && part.y === cell.y)) {
    cell = randomCell();
  }

  const item = forceBonus
    ? directorBonus
    : products[Math.floor(Math.random() * products.length)];

  return { ...cell, item };
}

function setDirection(newDirection) {
  if (!running || ended) {
    return;
  }

  const isOpposite =
    newDirection.x + direction.x === 0 &&
    newDirection.y + direction.y === 0;

  if (!isOpposite) {
    nextDirection = newDirection;
  }
}

function step() {
  direction = nextDirection;

  const head = snake[0];
  const nextHead = {
    x: head.x + direction.x,
    y: head.y + direction.y
  };

  const hitWall =
    nextHead.x < 0 ||
    nextHead.y < 0 ||
    nextHead.x >= grid ||
    nextHead.y >= grid;

  const hitSelf = snake
    .slice(0, -1)
    .some(part => part.x === nextHead.x && part.y === nextHead.y);

  if (hitWall || hitSelf) {
    endGame();
    return;
  }

  snake.unshift(nextHead);

  if (nextHead.x === product.x && nextHead.y === product.y) {
    score += product.item.points;
    foodsEaten += 1;
    speed = Math.max(minSpeed, speed - 5);
    scoreEl.textContent = score;

    if (score > bestScore) {
      bestScore = score;
      bestScoreEl.textContent = bestScore;
      saveBestScore(bestScore);
    }

    product = createProduct(foodsEaten % 6 === 0);
  } else {
    snake.pop();
  }
}

function drawBoard() {
  ctx.fillStyle = "#edf5ef";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (let y = 0; y < grid; y += 1) {
    for (let x = 0; x < grid; x += 1) {
      if ((x + y) % 2 === 0) {
        ctx.fillStyle = "#dfece5";
        ctx.fillRect(x * tile, y * tile, tile, tile);
      }
    }
  }
}

function drawProduct() {
  const x = product.x * tile;
  const y = product.y * tile;
  const item = product.item;

  ctx.save();
  ctx.lineWidth = 2;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  if (item.bonus) {
    drawDirectorBonus(x, y, item);
  } else if (item.kind === "chair") {
    drawChair(x, y, item);
  } else if (item.kind === "desk") {
    drawDesk(x, y, item);
  } else if (item.kind === "labTable") {
    drawLabTable(x, y, item);
  } else if (item.kind === "cabinet") {
    drawCabinet(x, y, item);
  } else if (item.kind === "locker") {
    drawLocker(x, y, item);
  } else if (item.kind === "whiteboard") {
    drawWhiteboard(x, y, item);
  } else if (item.kind === "corkboard") {
    drawCorkboard(x, y, item);
  } else if (item.kind === "shelf") {
    drawShelf(x, y, item);
  } else if (item.kind === "stand") {
    drawConferenceStand(x, y, item);
  } else if (item.kind === "screen") {
    drawProjectorScreen(x, y, item);
  } else if (item.kind === "dresser") {
    drawDresser(x, y, item);
  } else {
    drawPartition(x, y, item);
  }

  drawFoodLabel(x, y, item.label, item.bonus);
  ctx.restore();
}

function drawFoodLabel(x, y, text, isBonus) {
  ctx.fillStyle = isBonus ? "#ffffff" : "#152025";
  ctx.font = fitCanvasText(text, tile * 0.88, 8.5);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, x + tile / 2, y + tile * 0.86);
}

function drawChair(x, y, item) {
  ctx.fillStyle = item.color;
  roundRect(x + tile * 0.25, y + tile * 0.15, tile * 0.48, tile * 0.34, 5);
  ctx.fill();
  ctx.fillStyle = item.accent;
  roundRect(x + tile * 0.20, y + tile * 0.44, tile * 0.58, tile * 0.20, 4);
  ctx.fill();
  ctx.strokeStyle = "#152025";
  ctx.beginPath();
  ctx.moveTo(x + tile * 0.30, y + tile * 0.64);
  ctx.lineTo(x + tile * 0.22, y + tile * 0.78);
  ctx.moveTo(x + tile * 0.68, y + tile * 0.64);
  ctx.lineTo(x + tile * 0.76, y + tile * 0.78);
  ctx.stroke();
}

function drawDesk(x, y, item) {
  ctx.fillStyle = item.accent;
  roundRect(x + tile * 0.13, y + tile * 0.31, tile * 0.74, tile * 0.16, 4);
  ctx.fill();
  ctx.fillStyle = item.color;
  ctx.fillRect(x + tile * 0.19, y + tile * 0.47, tile * 0.10, tile * 0.29);
  ctx.fillRect(x + tile * 0.71, y + tile * 0.47, tile * 0.10, tile * 0.29);
  ctx.fillStyle = "#ffffff";
  roundRect(x + tile * 0.42, y + tile * 0.50, tile * 0.16, tile * 0.18, 3);
  ctx.fill();
}

function drawLabTable(x, y, item) {
  ctx.fillStyle = item.color;
  roundRect(x + tile * 0.12, y + tile * 0.30, tile * 0.76, tile * 0.16, 4);
  ctx.fill();
  ctx.fillStyle = item.accent;
  roundRect(x + tile * 0.58, y + tile * 0.33, tile * 0.18, tile * 0.08, 3);
  ctx.fill();
  ctx.strokeStyle = "#152025";
  ctx.beginPath();
  ctx.moveTo(x + tile * 0.25, y + tile * 0.46);
  ctx.lineTo(x + tile * 0.21, y + tile * 0.77);
  ctx.moveTo(x + tile * 0.75, y + tile * 0.46);
  ctx.lineTo(x + tile * 0.79, y + tile * 0.77);
  ctx.moveTo(x + tile * 0.48, y + tile * 0.31);
  ctx.quadraticCurveTo(x + tile * 0.58, y + tile * 0.17, x + tile * 0.64, y + tile * 0.31);
  ctx.stroke();
}

function drawCabinet(x, y, item) {
  ctx.fillStyle = item.color;
  roundRect(x + tile * 0.22, y + tile * 0.12, tile * 0.56, tile * 0.66, 5);
  ctx.fill();
  ctx.strokeStyle = item.accent;
  ctx.beginPath();
  ctx.moveTo(x + tile * 0.50, y + tile * 0.16);
  ctx.lineTo(x + tile * 0.50, y + tile * 0.75);
  ctx.stroke();
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(x + tile * 0.42, y + tile * 0.43, tile * 0.04, tile * 0.08);
  ctx.fillRect(x + tile * 0.54, y + tile * 0.43, tile * 0.04, tile * 0.08);
}

function drawLocker(x, y, item) {
  ctx.fillStyle = item.color;
  roundRect(x + tile * 0.23, y + tile * 0.12, tile * 0.54, tile * 0.66, 5);
  ctx.fill();
  ctx.fillStyle = item.accent;
  ctx.fillRect(x + tile * 0.33, y + tile * 0.22, tile * 0.34, tile * 0.04);
  ctx.fillRect(x + tile * 0.33, y + tile * 0.30, tile * 0.34, tile * 0.04);
  ctx.fillRect(x + tile * 0.62, y + tile * 0.46, tile * 0.05, tile * 0.09);
  ctx.strokeStyle = "#152025";
  ctx.strokeRect(x + tile * 0.23, y + tile * 0.12, tile * 0.54, tile * 0.66);
}

function drawWhiteboard(x, y, item) {
  ctx.fillStyle = "#ffffff";
  roundRect(x + tile * 0.14, y + tile * 0.20, tile * 0.72, tile * 0.43, 4);
  ctx.fill();
  ctx.strokeStyle = item.color;
  ctx.strokeRect(x + tile * 0.14, y + tile * 0.20, tile * 0.72, tile * 0.43);
  ctx.strokeStyle = "#64748b";
  ctx.beginPath();
  ctx.moveTo(x + tile * 0.34, y + tile * 0.64);
  ctx.lineTo(x + tile * 0.22, y + tile * 0.78);
  ctx.moveTo(x + tile * 0.66, y + tile * 0.64);
  ctx.lineTo(x + tile * 0.78, y + tile * 0.78);
  ctx.stroke();
}

function drawCorkboard(x, y, item) {
  ctx.fillStyle = item.color;
  roundRect(x + tile * 0.13, y + tile * 0.19, tile * 0.74, tile * 0.48, 4);
  ctx.fill();
  ctx.fillStyle = item.accent;
  ctx.fillRect(x + tile * 0.21, y + tile * 0.27, tile * 0.58, tile * 0.32);
  ctx.fillStyle = "#d94141";
  ctx.beginPath();
  ctx.arc(x + tile * 0.36, y + tile * 0.39, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#2563eb";
  ctx.beginPath();
  ctx.arc(x + tile * 0.62, y + tile * 0.47, 3, 0, Math.PI * 2);
  ctx.fill();
}

function drawShelf(x, y, item) {
  ctx.fillStyle = item.color;
  roundRect(x + tile * 0.18, y + tile * 0.16, tile * 0.64, tile * 0.60, 5);
  ctx.fill();
  ctx.fillStyle = item.accent;
  ctx.fillRect(x + tile * 0.25, y + tile * 0.28, tile * 0.10, tile * 0.18);
  ctx.fillRect(x + tile * 0.39, y + tile * 0.24, tile * 0.10, tile * 0.22);
  ctx.fillRect(x + tile * 0.55, y + tile * 0.31, tile * 0.10, tile * 0.15);
  ctx.fillRect(x + tile * 0.25, y + tile * 0.55, tile * 0.40, tile * 0.05);
  ctx.strokeStyle = "#ffffff";
  ctx.beginPath();
  ctx.moveTo(x + tile * 0.22, y + tile * 0.50);
  ctx.lineTo(x + tile * 0.78, y + tile * 0.50);
  ctx.stroke();
}

function drawConferenceStand(x, y, item) {
  ctx.fillStyle = item.accent;
  roundRect(x + tile * 0.25, y + tile * 0.16, tile * 0.50, tile * 0.34, 4);
  ctx.fill();
  ctx.strokeStyle = item.color;
  ctx.strokeRect(x + tile * 0.25, y + tile * 0.16, tile * 0.50, tile * 0.34);
  ctx.strokeStyle = "#152025";
  ctx.beginPath();
  ctx.moveTo(x + tile * 0.50, y + tile * 0.50);
  ctx.lineTo(x + tile * 0.50, y + tile * 0.77);
  ctx.moveTo(x + tile * 0.50, y + tile * 0.60);
  ctx.lineTo(x + tile * 0.27, y + tile * 0.78);
  ctx.moveTo(x + tile * 0.50, y + tile * 0.60);
  ctx.lineTo(x + tile * 0.73, y + tile * 0.78);
  ctx.stroke();
}

function drawProjectorScreen(x, y, item) {
  ctx.fillStyle = item.color;
  roundRect(x + tile * 0.16, y + tile * 0.15, tile * 0.68, tile * 0.08, 3);
  ctx.fill();
  ctx.fillStyle = item.accent;
  roundRect(x + tile * 0.19, y + tile * 0.24, tile * 0.62, tile * 0.38, 3);
  ctx.fill();
  ctx.strokeStyle = "#152025";
  ctx.beginPath();
  ctx.moveTo(x + tile * 0.50, y + tile * 0.62);
  ctx.lineTo(x + tile * 0.50, y + tile * 0.78);
  ctx.moveTo(x + tile * 0.50, y + tile * 0.70);
  ctx.lineTo(x + tile * 0.31, y + tile * 0.79);
  ctx.moveTo(x + tile * 0.50, y + tile * 0.70);
  ctx.lineTo(x + tile * 0.69, y + tile * 0.79);
  ctx.stroke();
}

function drawDresser(x, y, item) {
  ctx.fillStyle = item.color;
  roundRect(x + tile * 0.18, y + tile * 0.22, tile * 0.64, tile * 0.50, 5);
  ctx.fill();
  ctx.fillStyle = item.accent;
  for (let row = 0; row < 3; row += 1) {
    const drawerY = y + tile * (0.28 + row * 0.13);
    roundRect(x + tile * 0.27, drawerY, tile * 0.46, tile * 0.08, 2);
    ctx.fill();
    ctx.fillStyle = "#152025";
    ctx.fillRect(x + tile * 0.48, drawerY + tile * 0.03, tile * 0.04, tile * 0.02);
    ctx.fillStyle = item.accent;
  }
}

function drawPartition(x, y, item) {
  ctx.fillStyle = item.color;
  roundRect(x + tile * 0.18, y + tile * 0.18, tile * 0.28, tile * 0.54, 5);
  ctx.fill();
  ctx.fillStyle = item.accent;
  roundRect(x + tile * 0.46, y + tile * 0.14, tile * 0.32, tile * 0.62, 5);
  ctx.fill();
  ctx.strokeStyle = "#152025";
  ctx.beginPath();
  ctx.moveTo(x + tile * 0.46, y + tile * 0.20);
  ctx.lineTo(x + tile * 0.46, y + tile * 0.72);
  ctx.stroke();
}

function drawDirectorBonus(x, y, item) {
  if (directorImageReady) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(x + tile * 0.50, y + tile * 0.43, tile * 0.35, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(directorImage, x + tile * 0.15, y + tile * 0.08, tile * 0.70, tile * 0.70);
    ctx.restore();

    ctx.strokeStyle = item.color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(x + tile * 0.50, y + tile * 0.43, tile * 0.36, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = "#ffffff";
    ctx.font = "700 8px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("+50", x + tile * 0.50, y + tile * 0.14);
    return;
  }

  ctx.fillStyle = item.color;
  ctx.beginPath();
  ctx.arc(x + tile * 0.50, y + tile * 0.43, tile * 0.35, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = item.accent;
  ctx.beginPath();
  ctx.arc(x + tile * 0.50, y + tile * 0.45, tile * 0.27, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#3b2418";
  ctx.beginPath();
  ctx.arc(x + tile * 0.50, y + tile * 0.29, tile * 0.24, Math.PI, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#152025";
  ctx.beginPath();
  ctx.arc(x + tile * 0.40, y + tile * 0.43, 2, 0, Math.PI * 2);
  ctx.arc(x + tile * 0.60, y + tile * 0.43, 2, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "#152025";
  ctx.beginPath();
  ctx.arc(x + tile * 0.50, y + tile * 0.50, 5, 0.15, Math.PI - 0.15);
  ctx.stroke();

  ctx.fillStyle = "#ffffff";
  ctx.font = "700 8px Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("+50", x + tile * 0.50, y + tile * 0.14);
}

function fitCanvasText(text, maxWidth, startSize) {
  let size = startSize;

  while (size > 5) {
    ctx.font = `700 ${size}px Arial`;

    if (ctx.measureText(text).width <= maxWidth) {
      return ctx.font;
    }

    size -= 0.5;
  }

  return "700 5px Arial";
}

function drawSnake() {
  snake.forEach((part, index) => {
    const x = part.x * tile;
    const y = part.y * tile;
    const pad = index === 0 ? tile * 0.08 : tile * 0.12;

    ctx.fillStyle = index === 0 ? "#0f5e31" : "#15803d";
    roundRect(x + pad, y + pad, tile - pad * 2, tile - pad * 2, 9);
    ctx.fill();

    if (index === 0) {
      drawEyes(x, y);
    }
  });
}

function drawEyes(x, y) {
  const eyeY = y + tile * 0.32;
  const leftX = x + tile * 0.34;
  const rightX = x + tile * 0.66;

  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(leftX, eyeY, 4, 0, Math.PI * 2);
  ctx.arc(rightX, eyeY, 4, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#152025";
  ctx.beginPath();
  ctx.arc(leftX + direction.x * 1.5, eyeY + direction.y * 1.5, 2, 0, Math.PI * 2);
  ctx.arc(rightX + direction.x * 1.5, eyeY + direction.y * 1.5, 2, 0, Math.PI * 2);
  ctx.fill();
}

function roundRect(x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function draw() {
  drawBoard();
  drawProduct();
  drawSnake();
}

function loop(timestamp) {
  if (!running) {
    return;
  }

  if (timestamp - lastStep >= speed) {
    step();
    lastStep = timestamp;
  }

  draw();
  frameId = requestAnimationFrame(loop);
}

function startGame() {
  cancelAnimationFrame(frameId);
  resetGame();
  scoreForm.classList.add("is-hidden");
  scoreStatus.textContent = "";
  saveScoreButton.disabled = false;
  overlay.classList.add("is-hidden");
  draw();
  frameId = requestAnimationFrame(loop);
}

function endGame() {
  running = false;
  ended = true;
  cancelAnimationFrame(frameId);
  overlayTitle.textContent = "Žaidimas baigtas";
  overlayText.textContent = `Surinkai ${score} taškų. Eigidos baldai ir direktoriaus bonusas laukia revanšo.`;
  scoreForm.classList.toggle("is-hidden", score <= 0);
  scoreStatus.textContent = score > 0 ? "Įrašyk vardą ir pateksi į bendrą TOP lentelę." : "";
  playerNameInput.value = loadPlayerName();
  startButton.textContent = "Žaisti dar kartą";
  overlay.classList.remove("is-hidden");

  if (score > 0) {
    setTimeout(() => playerNameInput.focus(), 80);
  }
}

function loadPlayerName() {
  try {
    return localStorage.getItem("eigidaSnakePlayer") || "";
  } catch {
    return "";
  }
}

function savePlayerName(name) {
  try {
    localStorage.setItem("eigidaSnakePlayer", name);
  } catch {
    // Optional convenience only.
  }
}

async function loadLeaderboard() {
  try {
    const response = await fetch("/api/leaderboard", { cache: "no-store" });

    if (!response.ok) {
      throw new Error("Nepavyko gauti rezultatų.");
    }

    const data = await response.json();
    renderLeaderboard(data.entries || []);
  } catch {
    leaderboardList.replaceChildren();
    leaderboardEmpty.textContent = "Rezultatų lentelė laikinai nepasiekiama.";
    leaderboardEmpty.classList.remove("is-hidden");
  }
}

function renderLeaderboard(entries) {
  leaderboardList.replaceChildren();
  leaderboardEmpty.textContent = "Dar nėra rezultatų. Būk pirmas.";
  leaderboardEmpty.classList.toggle("is-hidden", entries.length > 0);

  entries.forEach(entry => {
    const row = document.createElement("li");
    const name = document.createElement("span");
    const points = document.createElement("span");

    name.className = "leaderboard-name";
    points.className = "leaderboard-score";
    name.textContent = entry.name;
    points.textContent = `${entry.score} tšk.`;

    row.append(name, points);
    leaderboardList.append(row);
  });
}

async function submitScore(event) {
  event.preventDefault();

  if (scoreSubmitted || score <= 0) {
    return;
  }

  const name = playerNameInput.value.trim();

  if (!name) {
    scoreStatus.textContent = "Įvesk vardą.";
    return;
  }

  scoreSubmitted = true;
  saveScoreButton.disabled = true;
  scoreStatus.textContent = "Saugau rezultatą...";

  try {
    const response = await fetch("/api/leaderboard", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ name, score })
    });

    if (!response.ok) {
      throw new Error("Nepavyko išsaugoti.");
    }

    const data = await response.json();
    savePlayerName(name);
    renderLeaderboard(data.entries || []);
    scoreStatus.textContent = "Rezultatas įrašytas.";
  } catch {
    scoreSubmitted = false;
    saveScoreButton.disabled = false;
    scoreStatus.textContent = "Nepavyko išsaugoti. Bandyk dar kartą.";
  }
}

document.addEventListener("keydown", event => {
  const directions = {
    ArrowUp: { x: 0, y: -1 },
    ArrowDown: { x: 0, y: 1 },
    ArrowLeft: { x: -1, y: 0 },
    ArrowRight: { x: 1, y: 0 },
    w: { x: 0, y: -1 },
    s: { x: 0, y: 1 },
    a: { x: -1, y: 0 },
    d: { x: 1, y: 0 }
  };

  const newDirection = directions[event.key] || directions[event.key.toLowerCase()];

  if (newDirection) {
    event.preventDefault();
    setDirection(newDirection);
  }
});

document.querySelectorAll("[data-dir]").forEach(button => {
  button.addEventListener("click", () => {
    const directions = {
      up: { x: 0, y: -1 },
      down: { x: 0, y: 1 },
      left: { x: -1, y: 0 },
      right: { x: 1, y: 0 }
    };

    setDirection(directions[button.dataset.dir]);
  });
});

startButton.addEventListener("click", startGame);
scoreForm.addEventListener("submit", submitScore);
refreshLeaderboard.addEventListener("click", loadLeaderboard);

bestScore = loadBestScore();
bestScoreEl.textContent = bestScore;
resetGame();
running = false;
draw();
loadLeaderboard();
