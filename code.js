import { Toolbox } from "./toolbox.js";

const canvas = document.getElementById("myCanvas");
const pencil = canvas.getContext("2d");
const toolbox = new Toolbox();

// Define color variants
const colorVariants = {
  red: ["#FF0000", "#BF0000", "#7F0000", "#3F0000"],
  green: ["#00FF00", "#00BF00", "#007F00", "#003F00"],
  blue: ["#0000FF", "#0000BF", "#00007F", "#00003F"],
  yellow: ["#FFFF00", "#BFBF00", "#7F7F00", "#3F3F00"],
  cyan: ["#00FFFF", "#00BFBF", "#007F7F", "#003F3F"],
  magenta: ["#FF00FF", "#BF00BF", "#7F007F", "#3F003F"]
};

// Game state variables
let gameState = 'start'; // 'start', 'level', 'playing', 'win'
let currentLevel = 1;
let totalCardsCount = 12; // default for level 1
let rows = 3;
let cols = 4;
let cardWidth = canvas.width / cols;
let cardHeight = canvas.height / rows;

let cards = [];
let firstFlippedCard = null;
let secondFlippedCard = null;
let lockBoard = false;

// Confetti setup
class ConfettiParticle {
  constructor(canvas) {
    this.canvas = canvas;
    this.reset();
  }
  reset() {
    this.x = Math.random() * this.canvas.width;
    this.y = Math.random() * -500; 
    this.size = Math.random() * 5 + 2;
    this.color = `hsl(${Math.random() * 360}, 100%, 50%)`;
    this.speedY = Math.random() * 2 + 1;
    this.speedX = (Math.random() - 0.5) * 2;
    this.rotation = Math.random() * 2 * Math.PI;
    this.rotationSpeed = (Math.random() - 0.5) * 0.02;
}
  draw(pencil) {
    const halfSize = this.size / 2;
    pencil.save();
    pencil.translate(this.x, this.y);
    pencil.rotate(this.rotation);
    pencil.fillStyle = this.color;
    pencil.beginPath();
    pencil.moveTo(0, -halfSize);
    pencil.lineTo(halfSize, 0);
    pencil.lineTo(0, halfSize);
    pencil.lineTo(-halfSize, 0);
    pencil.closePath();
    pencil.fill();
    pencil.restore();
  }
  update() {
    this.x += this.speedX;
    this.y += this.speedY;
    this.rotation += this.rotationSpeed;
    if (
      this.y > this.canvas.height + this.size ||
      this.x < -this.size || this.x > this.canvas.width + this.size
    ) {
      this.reset();
      this.y = -this.size;
    }
  }
}

let confettiParticles = [];
let confettiActive = false;

function createConfetti(count = 150) {
  confettiParticles = [];
  for (let i = 0; i < count; i++) {
    confettiParticles.push(new ConfettiParticle(canvas));
  }
  confettiActive = true;
}

function drawConfetti() {
  for (const particle of confettiParticles) {
    particle.update();
    particle.draw(pencil);
  }
}

// Draw overlay with "You Win" and button
function drawWinMessage() {
  pencil.fillStyle = "rgba(0, 0, 0, 0.5)";
  pencil.fillRect(0, 0, canvas.width, canvas.height);
  pencil.fillStyle = "white";
  pencil.font = "48px Arial";
  pencil.textAlign = "center";
  pencil.fillText("You Win!", canvas.width/2, canvas.height/2 - 20);
  
  const btnWidth = 200;
  const btnHeight = 50;
  const btnX = (canvas.width - btnWidth) / 2;
  const btnY = canvas.height/2 + 20;
  
  // Draw button
  pencil.fillStyle = "#28a745";
  pencil.fillRect(btnX, btnY, btnWidth, btnHeight);
  pencil.fillStyle = "white";
  pencil.font = "24px Arial";
  pencil.fillText("Play Again?", canvas.width/2, btnY + btnHeight/2 + 8);
  
  // Add event for button click
  canvas.addEventListener('click', handleWinButtonClick);
}

function handleWinButtonClick(e) {
  const rect = canvas.getBoundingClientRect();
  const clickX = e.clientX - rect.left;
  const clickY = e.clientY - rect.top;
  const btnX = (canvas.width - 200) / 2;
  const btnY = canvas.height/2 + 20;
  if (
    clickX >= btnX && clickX <= btnX + 200 &&
    clickY >= btnY && clickY <= btnY + 50
  ) {
    canvas.removeEventListener('click', handleWinButtonClick);
    confettiActive = false;
    gameState = 'level'; // Show level selection
    drawLevelSelection();
  }
}

function checkWin() {
  if (cards.every(card => card.matched)) {
    createConfetti();
    confettiActive = true;
    gameState = 'win';
  }
}

// Initialize level based on currentLevel
function initLevel() {
  // Adjust grid size based on level
  if (currentLevel === 1) {
    rows = 3; cols = 4; // 12 cards
  } else if (currentLevel === 2) {
    rows = 4; cols = 6; // 24 cards
  } else {
    rows = 6; cols = 8; // 48 cards
  }
  cardWidth = canvas.width / cols;
  cardHeight = canvas.height / rows;

  let palette = [];

  // Helper: get a random variant from a color
  function getRandomVariant(colorName) {
    return toolbox.getRandomItem(colorVariants[colorName]);
  }

  // Build palette based on level
  if (currentLevel === 1) {
    for (const colorName in colorVariants) {
      palette.push(getRandomVariant(colorName));
    }
  } else if (currentLevel === 2) {
    // For each color, pick either first & third or second & fourth
    for (const colorName in colorVariants) {
      const variants = colorVariants[colorName];
      const pickFirstPair = Math.random() < 0.5;
      if (pickFirstPair) {
        palette.push(variants[0], variants[2]);
      } else {
        palette.push(variants[1], variants[3]);
      }
    }
  } else {
    // Level 3 uses all 4 variants
    for (const colorName in colorVariants) {
      palette.push(...colorVariants[colorName]);
    }
  }

  // Prepare pairs
  let colorsForGame = [];
  let paletteCopy = [...palette];

  // Ensure enough pairs for totalCardsCount
  while (paletteCopy.length * 2 < totalCardsCount) {
    paletteCopy = paletteCopy.concat(paletteCopy);
  }
  paletteCopy = paletteCopy.slice(0, totalCardsCount / 2);
  for (let color of paletteCopy) {
    colorsForGame.push(color, color);
  }

  // Shuffle the card colors
  colorsForGame = toolbox.shuffleArray(colorsForGame);

  // Generate cards array with positions
  cards = [];
  const totalRows = Math.ceil(totalCardsCount / cols);
  for (let r = 0; r < totalRows; r++) {
    for (let c = 0; c < cols; c++) {
      const index = r * cols + c;
      if (index >= totalCardsCount) break;
      cards.push({
        row: r,
        col: c,
        x: c * cardWidth,
        y: r * cardHeight,
        width: cardWidth,
        height: cardHeight,
        color: colorsForGame[index],
        flipped: false,
        matched: false,
      });
    }
  }
}

// Draw all cards
function drawCards() {
  // Clear entire canvas
  pencil.clearRect(0, 0, canvas.width, canvas.height);

  // Draw each card
  for (const card of cards) {
    // Card border
    pencil.strokeStyle = 'black';
    pencil.strokeRect(card.x, card.y, card.width, card.height);
    if (card.flipped || card.matched) {
      // Front face
      pencil.fillStyle = card.color;
      pencil.fillRect(card.x + 2, card.y + 2, card.width - 4, card.height - 4);
    } else {
      // Back face
      pencil.fillStyle = 'gray';
      pencil.fillRect(card.x + 2, card.y + 2, card.width - 4, card.height - 4);
    }
  }
}

// Helper: get card at position
function getCardAt(x, y) {
  return cards.find(card => 
    x >= card.x && x <= card.x + card.width &&
    y >= card.y && y <= card.y + card.height
  );
}

// Card click handler
canvas.addEventListener('click', (e) => {
  if (gameState !== 'playing' || confettiActive || lockBoard) return;

  const rect = canvas.getBoundingClientRect();
  const clickX = e.clientX - rect.left;
  const clickY = e.clientY - rect.top;

  const clickedCard = getCardAt(clickX, clickY);
  if (!clickedCard || clickedCard.flipped || clickedCard.matched) return;

  // Flip the card
  clickedCard.flipped = true;
  drawCards();

  if (!firstFlippedCard) {
    firstFlippedCard = clickedCard;
  } else if (!secondFlippedCard) {
    secondFlippedCard = clickedCard;
    // Check for match
    if (firstFlippedCard.color === secondFlippedCard.color) {
      firstFlippedCard.matched = true;
      secondFlippedCard.matched = true;
      // Reset selections
      firstFlippedCard = null;
      secondFlippedCard = null;
      checkWin();
    } else {
      // No match: lock the board and flip back after delay
      lockBoard = true;
      setTimeout(() => {
        firstFlippedCard.flipped = false;
        secondFlippedCard.flipped = false;
        firstFlippedCard = null;
        secondFlippedCard = null;
        lockBoard = false;
        drawCards();
      }, 1000);
    }
  }
});

// Start the game
function startGame() {
  gameState = 'playing';
  initLevel();
  drawCards();
}

// UI: Start Screen
function drawStartScreen() {
  // Black background, title, start button
  pencil.fillStyle = "black";
  pencil.fillRect(0, 0, canvas.width, canvas.height);
  pencil.fillStyle = "white";
  pencil.font = "36px Arial";
  pencil.textAlign = "center";
  pencil.fillText("Memory Match Game", canvas.width/2, canvas.height/2 - 60);
  const btnX = (canvas.width - 200) / 2;
  const btnY = canvas.height/2;
  pencil.fillStyle = "#28a745";
  pencil.fillRect(btnX, btnY, 200, 50);
  pencil.fillStyle = "white";
  pencil.font = "24px Arial";
  pencil.fillText("Start Game", canvas.width/2, btnY + 32);
  // Event listener
  canvas.removeEventListener('click', handleStartClick);
  canvas.addEventListener('click', handleStartClick);
}

function handleStartClick(e) {
  const rect = canvas.getBoundingClientRect();
  const clickX = e.clientX - rect.left;
  const clickY = e.clientY - rect.top;
  const btnX = (canvas.width - 200) / 2;
  const btnY = canvas.height/2;
  if (
    clickX >= btnX && clickX <= btnX + 200 &&
    clickY >= btnY && clickY <= btnY + 50
  ) {
    canvas.removeEventListener('click', handleStartClick);
    drawLevelSelection();
  }
}

// Level selection UI
function drawLevelSelection() {
  gameState = 'level';
  // Background
  pencil.fillStyle = "black";
  pencil.fillRect(0, 0, canvas.width, canvas.height);
  // Title
  pencil.fillStyle = "white";
  pencil.font = "36px Arial";
  pencil.textAlign = "center";
  pencil.fillText("Select Level", canvas.width/2, canvas.height/2 - 80);
  // Level buttons
  for (let level = 1; level <= 3; level++) {
    const btnX = (canvas.width - 200) / 2;
    const btnY = canvas.height/2 - 20 + (level - 1) * 70;
    pencil.fillStyle = "#007bff";
    pencil.fillRect(btnX, btnY, 200, 50);
    pencil.fillStyle = "white";
    pencil.font = "24px Arial";
    pencil.fillText(`Level ${level}`, canvas.width/2, btnY + 32);
  }
  // Event handling
  canvas.removeEventListener('click', handleLevelSelect);
  canvas.addEventListener('click', handleLevelSelect);
}

function handleLevelSelect(e) {
  const rect = canvas.getBoundingClientRect();
  const clickX = e.clientX - rect.left;
  const clickY = e.clientY - rect.top;
  for (let level = 1; level <= 3; level++) {
    const btnX = (canvas.width - 200) / 2;
    const btnY = canvas.height/2 - 20 + (level - 1) * 70;
    if (
      clickX >= btnX && clickX <= btnX + 200 &&
      clickY >= btnY && clickY <= btnY + 50
    ) {
      currentLevel = level;
      totalCardsCount = (level === 1) ? 12 : (level === 2) ? 24 : 48;
      canvas.removeEventListener('click', handleLevelSelect);
      startGame();
      break;
    }
  }
}

// Main game loop
function gameLoop() {
  requestAnimationFrame(gameLoop);
  if (gameState === 'start' || gameState === 'level') {
    // Waiting for user interaction
  } else if (gameState === 'playing') {
    if (confettiActive) {
      drawConfetti();
      drawWinMessage();
    } else {
      drawCards();
    }
  } else if (gameState === 'win') {
    if (confettiActive) {
      drawConfetti();
    }
    drawWinMessage();
  }
}

// Initialize game
drawStartScreen();
gameLoop();