import { Toolbox } from "./toolbox.js";

const canvas = document.getElementById("myCanvas");
const pencil = canvas.getContext("2d");
const toolbox = new Toolbox();

const rows = 3; // Adjust grid size as needed
const cols = 4;
const cardWidth = canvas.width / cols;
const cardHeight = canvas.height / rows;

// Define your custom colors here
const customColors = [
    "#FF0000", // Red
    "#00FF00", // Green
    "#0000FF", // Blue
    "#FFFF00", // Yellow
    "#FF00FF", // Magenta
    "#00FFFF", // Cyan
];

// Generate colors based on your custom palette
function generateColors() {
    const totalCards = rows * cols;
    const colors = [];

    let palette = [...customColors];

    // Duplicate palette if needed to fill all pairs
    while (palette.length * 2 < totalCards) {
        palette = palette.concat(palette);
    }

    // Slice to match total pairs
    palette = palette.slice(0, totalCards / 2);

    // Create pairs
    for (let color of palette) {
        colors.push(color);
        colors.push(color);
    }

    // Shuffle the array
    return toolbox.shuffleArray(colors);
}

let cards = [];
let firstFlippedCard = null;
let secondFlippedCard = null;
let lockBoard = false;

// Initialize cards
function initCards() {
    const colors = generateColors();
    cards = [];

    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const index = r * cols + c;
            cards.push({
                row: r,
                col: c,
                x: c * cardWidth,
                y: r * cardHeight,
                width: cardWidth,
                height: cardHeight,
                color: colors[index],
                flipped: false,
                matched: false,
            });
        }
    }
}

// Draw all cards
function drawCards() {
    pencil.clearRect(0, 0, canvas.width, canvas.height);
    for (const card of cards) {
        pencil.strokeStyle = 'black';
        pencil.strokeRect(card.x, card.y, card.width, card.height);
        if (card.flipped || card.matched) {
            pencil.fillStyle = card.color;
            pencil.fillRect(card.x + 2, card.y + 2, card.width - 4, card.height - 4);
        } else {
            pencil.fillStyle = 'gray';
            pencil.fillRect(card.x + 2, card.y + 2, card.width - 4, card.height - 4);
        }
    }
}

// Get clicked card
function getCardAt(x, y) {
    return cards.find(card => 
        x >= card.x && x <= card.x + card.width &&
        y >= card.y && y <= card.y + card.height
    );
}

// Handle click
canvas.addEventListener('click', (e) => {
    if (lockBoard) return;

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
            // Keep both flipped
            firstFlippedCard.matched = true;
            secondFlippedCard.matched = true;
            firstFlippedCard = null;
            secondFlippedCard = null;

            // Check if all matched
            const allMatched = cards.every(card => card.matched);
            if (allMatched) {
                // Reset game shortly after
                setTimeout(() => {
                    resetGame();
                }, 1500); // 1.5 seconds delay
            }
        } else {
            // Flip back after delay
            lockBoard = true;
            setTimeout(() => {
                firstFlippedCard.flipped = false;
                secondFlippedCard.flipped = false;
                firstFlippedCard = null;
                secondFlippedCard = null;
                lockBoard = false;
                drawCards();
            }, 1000); // 1 second delay
        }
    }
    drawCards();
});

// Reset game function
function resetGame() {
    initCards();
    drawCards();
}

// Initialize and draw
initCards();
drawCards();