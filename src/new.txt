const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// Game states
const STATE = {
  START: 0,
  PLAYING: 1,
  GAME_OVER: 2
};

let gameState = STATE.START;
let currentScore = 0;
let highScore = 0;
let scoresHistory = [];
let newHighScoreAchieved = false;

// Bird physics - optimized for smooth gameplay
const bird = {
  x: 80,
  y: 300,
  width: 34,
  height: 24,
  gravity: 0.5,
  lift: -8.5, // Perfect jump height
  velocity: 0,
  rotation: 0
};

// Game objects
let pipes = [];
let frameCount = 0;
let pipeSpeed = 3.2; // Smooth speed

// Load sounds from assets
const sounds = {
  flap: new Audio("assets/flap.mp3"),
  hit: new Audio("assets/hit.mp3"),
  point: new Audio("assets/power.mp3"),
  highscore: new Audio("assets/highscore.mp3")
};

// Set sound volumes
sounds.flap.volume = 0.7;
sounds.hit.volume = 0.8;
sounds.point.volume = 0.6;
sounds.highscore.volume = 0.8;

let soundsEnabled = true;

// Load saved data
chrome.storage.local.get(['highScore', 'scoresHistory', 'soundsEnabled'], (result) => {
  highScore = result.highScore || 0;
  scoresHistory = result.scoresHistory || [];
  if (result.soundsEnabled !== undefined) {
    soundsEnabled = result.soundsEnabled;
  }
});

// Pipe generation
function createPipe() {
  const gap = 140; // Comfortable gap
  const topHeight = Math.floor(Math.random() * 280) + 60; // Reasonable pipe heights
  
  pipes.push({
    x: canvas.width,
    y: 0,
    width: 70, // Wider pipes for better visuals
    height: topHeight,
    counted: false
  });
  
  pipes.push({
    x: canvas.width,
    y: topHeight + gap,
    width: 70,
    height: canvas.height - topHeight - gap
  });
}

// Reset game
function resetGame() {
  bird.y = canvas.height / 2;
  bird.velocity = 0;
  bird.rotation = 0;
  pipes = [];
  currentScore = 0;
  frameCount = 0;
  gameState = STATE.PLAYING;
  newHighScoreAchieved = false;
}

// Play sound with checks
function playSound(sound) {
  if (soundsEnabled && sound) {
    sound.currentTime = 0;
    sound.play().catch(() => {}); // Ignore play errors
  }
}

// Save score to history
function saveScore(score) {
  scoresHistory.unshift({
    score: score,
    timestamp: new Date().toLocaleDateString()
  });
  
  // Keep only last 10 scores
  scoresHistory = scoresHistory.slice(0, 10);
  
  chrome.storage.local.set({ 
    highScore: highScore,
    scoresHistory: scoresHistory 
  });
}

// Draw bird with rotation
function drawBird() {
  ctx.save();
  ctx.translate(bird.x + bird.width / 2, bird.y + bird.height / 2);
  ctx.rotate(bird.rotation);
  
  // Bird body
  ctx.fillStyle = '#FFD700'; // Gold yellow
  ctx.fillRect(-bird.width / 2, -bird.height / 2, bird.width, bird.height);
  
  // Bird wing
  ctx.fillStyle = '#FF8C00'; // Dark orange
  ctx.fillRect(-bird.width / 2 + 5, -bird.height / 2 + 5, 15, 10);
  
  // Bird eye
  ctx.fillStyle = '#000';
  ctx.fillRect(bird.width / 2 - 10, -bird.height / 2 + 5, 4, 4);
  
  // Bird beak
  ctx.fillStyle = '#FF4500'; // Orange red
  ctx.fillRect(bird.width / 2 - 5, -2, 8, 4);
  
  ctx.restore();
}

// Draw improved pipes with gradient and details
function drawPipes() {
  pipes.forEach(pipe => {
    // Pipe gradient
    const pipeGradient = ctx.createLinearGradient(pipe.x, 0, pipe.x + pipe.width, 0);
    pipeGradient.addColorStop(0, '#2E8B57'); // Sea green
    pipeGradient.addColorStop(1, '#228B22'); // Forest green
    
    // Pipe body with gradient
    ctx.fillStyle = pipeGradient;
    ctx.fillRect(pipe.x, pipe.y, pipe.width, pipe.height);
    
    // Pipe cap with better design
    ctx.fillStyle = '#006400'; // Dark green
    ctx.fillRect(pipe.x - 5, pipe.y, pipe.width + 10, 25);
    
    // Pipe cap details
    ctx.fillStyle = '#004d00';
    ctx.fillRect(pipe.x - 3, pipe.y + 5, pipe.width + 6, 3);
    ctx.fillRect(pipe.x - 3, pipe.y + 15, pipe.width + 6, 3);
    
    // Bottom pipe cap (for bottom pipes only)
    if (pipe.y > canvas.height / 2) {
      ctx.fillStyle = '#006400';
      ctx.fillRect(pipe.x - 5, pipe.y, pipe.width + 10, 25);
      
      // Bottom pipe cap details
      ctx.fillStyle = '#004d00';
      ctx.fillRect(pipe.x - 3, pipe.y + 5, pipe.width + 6, 3);
      ctx.fillRect(pipe.x - 3, pipe.y + 15, pipe.width + 6, 3);
    }
    
    // Pipe inner shadow
    ctx.strokeStyle = '#1a6b1a';
    ctx.lineWidth = 2;
    ctx.strokeRect(pipe.x + 2, pipe.y + 2, pipe.width - 4, pipe.height - 4);
  });
}

// Draw improved background with clouds and gradient
function drawBackground() {
  // Sky gradient
  const skyGradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  skyGradient.addColorStop(0, '#87CEEB'); // Light sky blue
  skyGradient.addColorStop(1, '#98D8E8'); // Lighter blue at bottom
  
  ctx.fillStyle = skyGradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // Draw clouds
  drawCloud(100, 80, 60, 30);
  drawCloud(300, 120, 80, 35);
  drawCloud(50, 180, 70, 32);
  drawCloud(350, 60, 50, 28);
  
  // Ground with texture
  ctx.fillStyle = '#8B4513'; // Saddle brown
  ctx.fillRect(0, canvas.height - 10, canvas.width, 10);
  
  // Ground details
  ctx.fillStyle = '#A0522D'; // Sienna
  ctx.fillRect(0, canvas.height - 10, canvas.width, 3);
  
  ctx.fillStyle = '#654321'; // Dark brown
  for (let i = 0; i < canvas.width; i += 20) {
    ctx.fillRect(i, canvas.height - 10, 2, 10);
  }
}

// Draw cloud function
function drawCloud(x, y, width, height) {
  ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
  
  // Cloud shape using multiple circles
  ctx.beginPath();
  ctx.arc(x, y, height / 2, 0, Math.PI * 2);
  ctx.arc(x + width / 3, y - height / 4, height / 2.5, 0, Math.PI * 2);
  ctx.arc(x + width * 2/3, y, height / 2, 0, Math.PI * 2);
  ctx.arc(x + width / 3, y + height / 4, height / 2.5, 0, Math.PI * 2);
  ctx.closePath();
  ctx.fill();
}

// Draw start screen
function drawStartScreen() {
  drawBackground();
  
  // Title with shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
  ctx.font = 'bold 48px "Segoe UI"';
  ctx.textAlign = 'center';
  ctx.fillText('FLAPPY', canvas.width / 2 + 2, 152);
  ctx.fillText('EDGE', canvas.width / 2 + 2, 212);
  
  ctx.fillStyle = '#FF8C00';
  ctx.fillText('FLAPPY', canvas.width / 2, 150);
  ctx.fillText('EDGE', canvas.width / 2, 210);
  
  // Bird preview with shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
  ctx.fillRect(canvas.width / 2 - 16, 251, 34, 24);
  
  drawBirdPreview();
  
  // Instructions
  ctx.fillStyle = '#FFF';
  ctx.font = 'bold 20px "Segoe UI"';
  ctx.fillText('Click or Press SPACE', canvas.width / 2, 350);
  ctx.fillText('to Start', canvas.width / 2, 380);
  
  // High score
  ctx.fillStyle = '#FFD700';
  ctx.font = 'bold 24px "Segoe UI"';
  ctx.fillText(`Best: ${highScore}`, canvas.width / 2, 450);
  
  // Sound indicator
  ctx.fillStyle = soundsEnabled ? '#4CAF50' : '#ff4444';
  ctx.font = '16px "Segoe UI"';
  ctx.fillText(soundsEnabled ? 'Sound: ON' : 'Sound: OFF', canvas.width / 2, 500);
}

// Draw bird preview for start screen
function drawBirdPreview() {
  ctx.save();
  ctx.translate(canvas.width / 2, 262);
  
  // Animated floating effect
  const floatOffset = Math.sin(frameCount * 0.1) * 3;
  ctx.translate(0, floatOffset);
  
  // Bird body
  ctx.fillStyle = '#FFD700';
  ctx.fillRect(-17, -12, 34, 24);
  
  // Bird wing
  ctx.fillStyle = '#FF8C00';
  ctx.fillRect(-12, -7, 15, 10);
  
  // Bird eye
  ctx.fillStyle = '#000';
  ctx.fillRect(7, -7, 4, 4);
  
  // Bird beak
  ctx.fillStyle = '#FF4500';
  ctx.fillRect(12, -2, 8, 4);
  
  ctx.restore();
}

// Draw game over screen with leaderboard
function drawGameOverScreen() {
  drawBackground();
  
  // Semi-transparent overlay
  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // Game Over text with glow effect for high score
  if (newHighScoreAchieved) {
    ctx.fillStyle = 'rgba(255, 215, 0, 0.5)';
    for (let i = 0; i < 5; i++) {
      ctx.font = 'bold 36px "Segoe UI"';
      ctx.textAlign = 'center';
      ctx.fillText('GAME OVER', canvas.width / 2, 100 + i);
    }
  }
  
  ctx.fillStyle = newHighScoreAchieved ? '#FFD700' : '#FF4444';
  ctx.font = 'bold 36px "Segoe UI"';
  ctx.textAlign = 'center';
  ctx.fillText('GAME OVER', canvas.width / 2, 100);
  
  // Current score
  ctx.fillStyle = '#FFF';
  ctx.font = 'bold 28px "Segoe UI"';
  ctx.fillText(`Score: ${currentScore}`, canvas.width / 2, 160);
  
  // New high score message with animation
  if (newHighScoreAchieved) {
    const pulse = Math.sin(frameCount * 0.2) * 0.2 + 0.8;
    ctx.fillStyle = `rgba(255, 215, 0, ${pulse})`;
    ctx.font = 'bold 24px "Segoe UI"';
    ctx.fillText('NEW HIGH SCORE!', canvas.width / 2, 200);
  }
  
  // Leaderboard
  ctx.fillStyle = '#FF8C00';
  ctx.font = 'bold 24px "Segoe UI"';
  ctx.fillText('RECENT SCORES', canvas.width / 2, 250);
  
  // Display recent scores
  ctx.fillStyle = '#FFF';
  ctx.font = '18px "Segoe UI"';
  ctx.textAlign = 'left';
  
  const displayScores = scoresHistory.slice(0, 5);
  displayScores.forEach((scoreObj, index) => {
    const yPos = 290 + (index * 30);
    const isCurrentScore = scoreObj.score === currentScore && newHighScoreAchieved;
    
    if (isCurrentScore) {
      ctx.fillStyle = '#FFD700';
    } else {
      ctx.fillStyle = '#FFF';
    }
    
    ctx.fillText(`${index + 1}. ${scoreObj.score}`, 120, yPos);
    ctx.textAlign = 'right';
    ctx.fillText(scoreObj.timestamp, 280, yPos);
    ctx.textAlign = 'left';
  });
  
  // Restart instruction
  ctx.textAlign = 'center';
  ctx.fillStyle = '#87CEEB';
  ctx.font = '20px "Segoe UI"';
  ctx.fillText('Click or SPACE to Play Again', canvas.width / 2, 500);
  
  // Sound indicator
  ctx.fillStyle = soundsEnabled ? '#4CAF50' : '#ff4444';
  ctx.font = '16px "Segoe UI"';
  ctx.fillText(soundsEnabled ? 'Sound: ON' : 'Sound: OFF', canvas.width / 2, 530);
}

// Draw in-game UI
function drawGameUI() {
  // Score with shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
  ctx.font = 'bold 32px "Segoe UI"';
  ctx.textAlign = 'left';
  ctx.fillText(currentScore.toString(), 22, 42);
  
  ctx.fillStyle = '#FFF';
  ctx.fillText(currentScore.toString(), 20, 40);
  
  // Sound indicator
  ctx.fillStyle = soundsEnabled ? '#4CAF50' : '#ff4444';
  ctx.font = '16px "Segoe UI"';
  ctx.textAlign = 'right';
  ctx.fillText(soundsEnabled ? '🔊' : '🔇', canvas.width - 20, 30);
}

// Check collisions
function checkCollisions() {
  // Ground collision
  if (bird.y + bird.height > canvas.height - 10) {
    playSound(sounds.hit);
    return true;
  }
  
  // Ceiling collision
  if (bird.y < 0) {
    playSound(sounds.hit);
    return true;
  }
  
  // Pipe collisions
  for (const pipe of pipes) {
    if (
      bird.x < pipe.x + pipe.width &&
      bird.x + bird.width > pipe.x &&
      bird.y < pipe.y + pipe.height &&
      bird.y + bird.height > pipe.y
    ) {
      playSound(sounds.hit);
      return true;
    }
  }
  
  return false;
}

// Update bird rotation based on velocity
function updateBirdRotation() {
  // Rotate based on velocity - feels natural
  bird.rotation = bird.velocity * 0.05;
  bird.rotation = Math.max(-0.5, Math.min(0.5, bird.rotation)); // Clamp rotation
}

// Check sound toggle click
function checkSoundToggleClick(x, y) {
  const soundTextWidth = 80;
  const soundTextHeight = 20;
  const centerX = canvas.width / 2;
  
  if (gameState === STATE.START || gameState === STATE.GAME_OVER) {
    // Center position for start/game over screens
    if (x >= centerX - soundTextWidth / 2 && x <= centerX + soundTextWidth / 2 && 
        y >= 485 && y <= 505) {
      toggleSound();
      return true;
    }
  } else if (gameState === STATE.PLAYING) {
    // Top right position for gameplay
    if (x >= canvas.width - 40 && x <= canvas.width - 10 && y >= 10 && y <= 30) {
      toggleSound();
      return true;
    }
  }
  return false;
}

// Toggle sound
function toggleSound() {
  soundsEnabled = !soundsEnabled;
  chrome.storage.local.set({ soundsEnabled: soundsEnabled });
}

// Main game loop
function gameLoop() {
  // Draw improved background
  drawBackground();
  
  if (gameState === STATE.START) {
    drawStartScreen();
  } 
  else if (gameState === STATE.PLAYING) {
    // Update bird physics
    bird.velocity += bird.gravity;
    bird.y += bird.velocity;
    
    updateBirdRotation();
    
    // Generate pipes
    if (frameCount % 120 === 0) { // Every 2 seconds at 60fps
      createPipe();
    }
    
    // Update pipes and check scoring
    for (let i = pipes.length - 1; i >= 0; i--) {
      pipes[i].x -= pipeSpeed;
      
      // Remove off-screen pipes
      if (pipes[i].x + pipes[i].width < 0) {
        pipes.splice(i, 1);
        continue;
      }
      
      // Score when passing pipes (only check top pipes)
      if (pipes[i].y === 0 && !pipes[i].counted && pipes[i].x + pipes[i].width < bird.x) {
        pipes[i].counted = true;
        currentScore++;
        playSound(sounds.point);
        
        // Check for new high score
        if (currentScore > highScore) {
          const wasNewHighScore = highScore === 0 || currentScore - 1 === highScore;
          highScore = currentScore;
          
          // Play high score sound only when actually achieving a new high score
          if (wasNewHighScore) {
            newHighScoreAchieved = true;
            playSound(sounds.highscore);
          }
        }
      }
    }
    
    // Draw game elements
    drawPipes();
    drawBird();
    drawGameUI();
    
    // Check collisions
    if (checkCollisions()) {
      gameState = STATE.GAME_OVER;
      saveScore(currentScore);
    }
    
    frameCount++;
  } 
  else if (gameState === STATE.GAME_OVER) {
    // Still draw the final game state
    drawPipes();
    drawBird();
    drawGameUI();
    drawGameOverScreen();
  }
  
  requestAnimationFrame(gameLoop);
}

// Input handling
function jump() {
  if (gameState === STATE.START) {
    gameState = STATE.PLAYING;
  } 
  else if (gameState === STATE.PLAYING) {
    bird.velocity = bird.lift;
    playSound(sounds.flap);
  } 
  else if (gameState === STATE.GAME_OVER) {
    resetGame();
  }
}

// Event listeners
document.addEventListener('keydown', (e) => {
  if (e.code === 'Space') {
    e.preventDefault();
    jump();
  }
});

canvas.addEventListener('click', (e) => {
  const rect = canvas.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;
  
  // Check if sound toggle was clicked
  if (!checkSoundToggleClick(mouseX, mouseY)) {
    jump();
  }
});

// Start the game
gameLoop();