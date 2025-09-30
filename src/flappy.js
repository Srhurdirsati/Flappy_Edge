const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// Images
const birdImg = new Image();
birdImg.src = "assets/bird.png";
const pipeImg = new Image();
pipeImg.src = "assets/pipe.png";
const bgImg = new Image();
bgImg.src = "assets/bg.png";

// Sounds
const flapSound = new Audio("assets/flap.mp3");
const hitSound = new Audio("assets/hit.mp3");

// Bird
const bird = {
  x: 50,
  y: 300,
  width: 40,
  height: 30,
  gravity: 0.25,
  lift: -4.5,
  velocity: 0
};

// Pipes
let pipes = [];
let frame = 0;
let score = 0;
let highScore = 0;
let gameOver = false;

// Load high score from storage
chrome.storage.local.get(['highScore'], (result) => {
  if (result.highScore) {
    highScore = result.highScore;
  }
});

// Create pipe
function createPipe() {
  const topHeight = Math.floor(Math.random() * 250) + 50;
  const gap = 120;
  pipes.push({ x: 400, y: 0, width: 50, height: topHeight });
  pipes.push({ x: 400, y: topHeight + gap, width: 50, height: 600 - topHeight - gap });
}

// Reset game
function resetGame() {
  if (score > highScore) {
    highScore = score;
    chrome.storage.local.set({highScore: highScore});
  }
  bird.y = 300;
  bird.velocity = 0;
  pipes = [];
  score = 0;
  frame = 0;
  gameOver = false;
}

// Draw Game Over
function drawGameOver() {
  ctx.fillStyle = "rgba(0,0,0,0.6)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#fff";
  ctx.font = "bold 36px 'Segoe UI', sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("GAME OVER", canvas.width / 2, 200);

  ctx.font = "bold 24px 'Segoe UI', sans-serif";
  ctx.fillText("Score: " + score, canvas.width / 2, 260);
  ctx.fillText("High Score: " + highScore, canvas.width / 2, 300);

  ctx.font = "20px 'Segoe UI', sans-serif";
  ctx.fillText("Click or Press Space to Retry", canvas.width / 2, 350);
}

// Game loop
function gameLoop() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bgImg, 0, 0, canvas.width, canvas.height);

  if (!gameOver) {
    bird.velocity += bird.gravity;
    bird.y += bird.velocity;

    ctx.drawImage(birdImg, bird.x, bird.y, bird.width, bird.height);

    if (frame % 90 === 0) createPipe();
    for (let i = 0; i < pipes.length; i++) {
      pipes[i].x -= 2;
      ctx.drawImage(pipeImg, pipes[i].x, pipes[i].y, pipes[i].width, pipes[i].height);

      if (
        bird.x < pipes[i].x + pipes[i].width &&
        bird.x + bird.width > pipes[i].x &&
        bird.y < pipes[i].y + pipes[i].height &&
        bird.y + bird.height > pipes[i].y
      ) {
        hitSound.play();
        gameOver = true;
      }

      if (pipes[i].x + pipes[i].width === bird.x) score++;
    }

    if (bird.y + bird.height > canvas.height || bird.y < 0) {
      hitSound.play();
      gameOver = true;
    }

    // Live score
    ctx.fillStyle = "#000";
    ctx.font = "bold 24px 'Segoe UI', sans-serif";
    ctx.textAlign = "left";
    ctx.fillText("Score: " + score, 10, 30);

    frame++;
  } else {
    drawGameOver();
  }

  requestAnimationFrame(gameLoop);
}

// Controls
function flap() {
  if (!gameOver) {
    bird.velocity = bird.lift;
    flapSound.play();
  } else {
    resetGame();
  }
}

document.addEventListener("keydown", (e) => { if (e.code === "Space") flap(); });
document.addEventListener("click", flap);

gameLoop();
