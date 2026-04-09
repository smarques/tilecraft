// 63 Unique words for an 8x8 grid (the 64th is empty)
const words = [
    "Nebula", "Quantum", "Cosmos", "Aether", "Galaxy", "Pulsar", "Quasar", "Orbit",
    "Zenith", "Nova", "Epoch", "Stellar", "Void", "Meteor", "Nexus", "Vertex",
    "Luna", "Solar", "Astro", "Plasma", "Horizon", "Eclipse", "Comet", "Aura",
    "Infinity", "Prism", "Echo", "Mirage", "Oasis", "Halo", "Spark", "Flux",
    "Neon", "Cyber", "Synth", "Vortex", "Matrix", "Cipher", "Pixel", "Vector",
    "Logic", "Node", "Data", "Byte", "Link", "Sync", "Grid", "Core",
    "Glitch", "Pulse", "Wave", "Beam", "Ray", "Signal", "Code", "Flow",
    "Alpha", "Omega", "Delta", "Sigma", "Rune", "Glyph", "Shift"
];

const GRID_SIZE = 8;
const TOTAL_TILES = GRID_SIZE * GRID_SIZE;

let state = []; // Array to store the current board state
let emptyIndex = TOTAL_TILES - 1; // Index of the empty tile in the state array
let movesCount = 0;
let isAnimating = false;

const boardElement = document.getElementById('game-board');
const movesElement = document.getElementById('moves-count');
const shuffleBtn = document.getElementById('shuffle-btn');

function initGame() {
    state = [];
    movesCount = 0;
    updateMovesDisplay();
    boardElement.innerHTML = '';
    
    // Create tiles
    for (let i = 0; i < TOTAL_TILES; i++) {
        const tile = document.createElement('div');
        tile.classList.add('tile');
        
        const inner = document.createElement('div');
        inner.classList.add('tile-inner');
        
        if (i === TOTAL_TILES - 1) {
            tile.classList.add('empty-tile');
            // Store the empty tile object
        } else {
            inner.textContent = words[i];
            tile.onclick = () => handleTileClick(i);
        }
        
        tile.appendChild(inner);
        boardElement.appendChild(tile);
        
        state.push({
            id: i, // The original solved position ID
            element: tile, // DOM Element reference
            index: i // Current position index in the grid
        });
    }

    // Set initial positions based on their index
    state.forEach((tile) => updateTilePosition(tile));
    
    // Initially shuffle the board
    shuffleBoard();
}

function getCol(index) { return index % GRID_SIZE; }
function getRow(index) { return Math.floor(index / GRID_SIZE); }

function updateTilePosition(tile) {
    const col = getCol(tile.index);
    const row = getRow(tile.index);
    
    // Using CSS transforms for buttery smooth sliding animations
    // The padding of the board sets the origin offset
    tile.element.style.transform = `translate(${col * 100}%, ${row * 100}%)`;
}

function handleTileClick(id) {
    if (isAnimating) return;
    
    // Find where THIS tile currently is
    const tileState = state.find(t => t.id === id);
    const tileIndex = tileState.index;
    
    // Find where the EMPTY tile currently is
    const emptyTile = state.find(t => t.id === TOTAL_TILES - 1);
    const currEmptyIndex = emptyTile.index;
    
    if (isAdjacent(tileIndex, currEmptyIndex)) {
        isAnimating = true;
        
        // Swap indexes
        tileState.index = currEmptyIndex;
        emptyTile.index = tileIndex;
        
        // Visually update the translated positions
        updateTilePosition(tileState);
        updateTilePosition(emptyTile);
        
        movesCount++;
        updateMovesDisplay();
        
        // Wait for CSS transition to end before allowing next move
        setTimeout(() => {
            isAnimating = false;
            checkWinCondition();
        }, 250); // Matches the 0.25s CSS transition
    }
}

function isAdjacent(index1, index2) {
    const r1 = getRow(index1);
    const c1 = getCol(index1);
    const r2 = getRow(index2);
    const c2 = getCol(index2);
    
    const rowDiff = Math.abs(r1 - r2);
    const colDiff = Math.abs(c1 - c2);
    
    // They are adjacent if row diff is 1 and col diff is 0, OR row diff is 0 and col diff is 1
    return (rowDiff === 1 && colDiff === 0) || (rowDiff === 0 && colDiff === 1);
}

function updateMovesDisplay() {
    movesElement.textContent = movesCount;
}

function shuffleBoard() {
    // A quick way to shuffle a sliding puzzle while guaranteeing it remains solvable:
    // SIMULATE random valid moves quickly.
    
    // Disable animation during shuffle
    boardElement.style.pointerEvents = 'none';
    const allTiles = document.querySelectorAll('.tile');
    allTiles.forEach(t => t.style.transition = 'none');
    
    let lastSwappedId = -1;
    const SHUFFLE_MOVES = 300;
    
    let emptyTile = state.find(t => t.id === TOTAL_TILES - 1);
    
    for (let i = 0; i < SHUFFLE_MOVES; i++) {
        const validNeighbors = state.filter(t => 
            t.id !== TOTAL_TILES - 1 && 
            t.id !== lastSwappedId && 
            isAdjacent(t.index, emptyTile.index)
        );
        
        if (validNeighbors.length > 0) {
            const randomTile = validNeighbors[Math.floor(Math.random() * validNeighbors.length)];
            
            // Swap indexes
            const temp = randomTile.index;
            randomTile.index = emptyTile.index;
            emptyTile.index = temp;
            
            lastSwappedId = randomTile.id;
        }
    }
    
    // Reposition purely numerically
    state.forEach(tile => updateTilePosition(tile));
    
    // Force a reflow, then restore transition
    void boardElement.offsetWidth;
    allTiles.forEach(t => t.style.transition = 'transform 0.25s cubic-bezier(0.2, 0.8, 0.2, 1)');
    boardElement.style.pointerEvents = 'auto';
    
    movesCount = 0;
    updateMovesDisplay();
    
    // Remove solved state if present
    document.body.classList.remove('solved');
}

function checkWinCondition() {
    const isSolved = state.every(tile => tile.id === tile.index);
    if (isSolved && movesCount > 0) {
        document.body.classList.add('solved');
        setTimeout(() => {
            alert(`Stellar work! You solved the puzzle in ${movesCount} moves.`);
        }, 300);
    }
}

shuffleBtn.addEventListener('click', shuffleBoard);

// Initialize on page load
initGame();
