// 63 Unique words for an 8x8 grid (the 64th is empty)
const words = [
    { text: "Nebula", category: "space" }, { text: "Quantum", category: "science" }, { text: "Cosmos", category: "space" }, { text: "Aether", category: "magic" }, { text: "Galaxy", category: "space" }, { text: "Pulsar", category: "space" }, { text: "Quasar", category: "space" }, { text: "Orbit", category: "space" },
    { text: "Zenith", category: "abstract" }, { text: "Nova", category: "space" }, { text: "Epoch", category: "abstract" }, { text: "Stellar", category: "space" }, { text: "Void", category: "abstract" }, { text: "Meteor", category: "space" }, { text: "Nexus", category: "tech" }, { text: "Vertex", category: "abstract" },
    { text: "Luna", category: "space" }, { text: "Solar", category: "space" }, { text: "Astro", category: "space" }, { text: "Plasma", category: "science" }, { text: "Horizon", category: "abstract" }, { text: "Eclipse", category: "space" }, { text: "Comet", category: "space" }, { text: "Aura", category: "magic" },
    { text: "Infinity", category: "abstract" }, { text: "Prism", category: "science" }, { text: "Echo", category: "magic" }, { text: "Mirage", category: "magic" }, { text: "Oasis", category: "nature" }, { text: "Halo", category: "magic" }, { text: "Spark", category: "nature" }, { text: "Flux", category: "science" },
    { text: "Neon", category: "tech" }, { text: "Cyber", category: "tech" }, { text: "Synth", category: "tech" }, { text: "Vortex", category: "magic" }, { text: "Matrix", category: "tech" }, { text: "Cipher", category: "tech" }, { text: "Pixel", category: "tech" }, { text: "Vector", category: "science" },
    { text: "Logic", category: "tech" }, { text: "Node", category: "tech" }, { text: "Data", category: "tech" }, { text: "Byte", category: "tech" }, { text: "Link", category: "tech" }, { text: "Sync", category: "tech" }, { text: "Grid", category: "tech" }, { text: "Core", category: "tech" },
    { text: "Glitch", category: "tech" }, { text: "Pulse", category: "science" }, { text: "Wave", category: "nature" }, { text: "Beam", category: "science" }, { text: "Ray", category: "science" }, { text: "Signal", category: "tech" }, { text: "Code", category: "tech" }, { text: "Flow", category: "nature" },
    { text: "Alpha", category: "abstract" }, { text: "Omega", category: "abstract" }, { text: "Delta", category: "abstract" }, { text: "Sigma", category: "abstract" }, { text: "Rune", category: "magic" }, { text: "Glyph", category: "magic" }, { text: "Shift", category: "abstract" }
];

function getRandomWords(count) {
    const shuffled = [...words].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
}

const GRID_SIZE = 6;
const TOTAL_TILES = GRID_SIZE * GRID_SIZE;

let state = []; // Array to store the current board state
let emptyIndex = TOTAL_TILES - 1; // Index of the empty tile in the state array
let movesCount = 0;
let isAnimating = false;
let currentMode = 'move';
let isMouseDown = false;
let isSelecting = true;

const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playSlideSound() {
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    
    const duration = 0.15;
    const bufferSize = audioCtx.sampleRate * duration;
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    
    for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
    }
    
    const noiseSource = audioCtx.createBufferSource();
    noiseSource.buffer = buffer;
    
    const bandpass = audioCtx.createBiquadFilter();
    bandpass.type = 'bandpass';
    bandpass.frequency.value = 1800;
    bandpass.Q.value = 2.0;

    const lowpass = audioCtx.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.value = 300;

    const rumbleSource = audioCtx.createBufferSource();
    rumbleSource.buffer = buffer;
    rumbleSource.connect(lowpass);

    const gainNode = audioCtx.createGain();
    gainNode.gain.setValueAtTime(0.8, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);
    
    noiseSource.connect(bandpass);
    bandpass.connect(gainNode);
    lowpass.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    noiseSource.start();
    rumbleSource.start();
}

function playBlipSound(isSelected = true) {
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    
    const duration = 0.05;
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    
    osc.type = 'triangle';
    
    if (isSelected) {
        osc.frequency.setValueAtTime(600, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1200, audioCtx.currentTime + duration);
    } else {
        osc.frequency.setValueAtTime(600, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(300, audioCtx.currentTime + duration);
    }

    gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);
    
    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    osc.start();
    osc.stop(audioCtx.currentTime + duration);
}
window.addEventListener('mousedown', () => isMouseDown = true);
window.addEventListener('mouseup', () => {
    isMouseDown = false;
    if (currentMode === 'highlight') {
        enforceSelectionRules();
        updateSelectionState();
    }
});

const boardElement = document.getElementById('game-board');
const movesElement = document.getElementById('moves-count');
const scoreElement = document.getElementById('score-count');
const shuffleBtn = document.getElementById('shuffle-btn');
const modeMoveBtn = document.getElementById('mode-move');
const modeHighlightBtn = document.getElementById('mode-highlight');

modeMoveBtn.addEventListener('click', () => setMode('move'));
modeHighlightBtn.addEventListener('click', () => setMode('highlight'));

function setMode(mode) {
    currentMode = mode;
    modeMoveBtn.classList.toggle('active', mode === 'move');
    modeHighlightBtn.classList.toggle('active', mode === 'highlight');
}

function updateSelectionState() {
    const selectedCount = boardElement.querySelectorAll('.tile-inner.selected').length;
    boardElement.classList.toggle('has-selection', selectedCount > 0);
    updateScoreDisplay();
}

function enforceSelectionRules(activeInner = null) {
    let changed;
    do {
        changed = false;
        const selectedTiles = [...boardElement.querySelectorAll('.tile-inner.selected')];
        
        const toDeselect = selectedTiles.filter(inner => {
            if (inner === activeInner && inner.classList.contains('selected')) return false;
            
            const tileData = state.find(t => t.element === inner.parentElement);
            const hasAdjacentSelected = selectedTiles.some(otherInner => {
                if (inner === otherInner) return false;
                const otherData = state.find(t => t.element === otherInner.parentElement);
                return isAdjacent(tileData.index, otherData.index);
            });
            return !hasAdjacentSelected;
        });

        if (toDeselect.length > 0) {
            toDeselect.forEach(inner => inner.classList.remove('selected'));
            changed = true;
            playBlipSound(false);
        }
    } while (changed);
}

function initGame() {
    state = [];
    movesCount = 0;
    updateMovesDisplay();
    updateScoreDisplay();
    boardElement.innerHTML = '';
    
    const currentWords = getRandomWords(TOTAL_TILES - 1);
    
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
            inner.textContent = currentWords[i].text;
            inner.setAttribute('data-category', currentWords[i].category);
            
            // Randomize background position for organic ceramic texture
            const randX = Math.floor(Math.random() * 1000);
            const randY = Math.floor(Math.random() * 1000);
            // The texture is the second layer, the gradient is the first
            inner.style.backgroundPosition = `0 0, ${randX}px ${randY}px`;
            
            tile.onclick = () => handleTileClick(i);
            
            tile.addEventListener('mousedown', (e) => {
                if (currentMode === 'highlight') {
                    e.preventDefault();
                    isSelecting = !inner.classList.contains('selected');
                    inner.classList.toggle('selected', isSelecting);
                    playBlipSound(isSelecting);
                    enforceSelectionRules(inner);
                    updateSelectionState();
                }
            });
            
            tile.addEventListener('mouseenter', (e) => {
                if (currentMode === 'highlight' && isMouseDown) {
                    const wasSelected = inner.classList.contains('selected');
                    if (wasSelected !== isSelecting) {
                        inner.classList.toggle('selected', isSelecting);
                        playBlipSound(isSelecting);
                    }
                    enforceSelectionRules(inner);
                    updateSelectionState();
                }
            });
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
    updateSelectionState();
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
    
    if (currentMode === 'highlight') {
        return;
    }
    
    // Find where THIS tile currently is
    const tileState = state.find(t => t.id === id);
    const tileIndex = tileState.index;
    
    // Find where the EMPTY tile currently is
    const emptyTile = state.find(t => t.id === TOTAL_TILES - 1);
    const currEmptyIndex = emptyTile.index;
    
    if (isAdjacent(tileIndex, currEmptyIndex)) {
        isAnimating = true;
        playSlideSound();
        
        // Swap indexes
        tileState.index = currEmptyIndex;
        emptyTile.index = tileIndex;
        
        // Enforce selection contiguity after movement
        enforceSelectionRules();
        updateSelectionState();
        
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
    updateScoreDisplay();
}

function updateScoreDisplay() {
    const selectedCount = boardElement.querySelectorAll('.tile-inner.selected').length;
    const score = movesCount + (selectedCount * 50);
    scoreElement.textContent = score;
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
            showDialog(t('messages.puzzleSolved'), t('messages.puzzleSolvedMessage', { moves: movesCount }));
        }, 300);
    }
}

shuffleBtn.addEventListener('click', initGame);

const nameModal = document.getElementById('name-modal');
const playerNameInput = document.getElementById('player-name-input');
const startGameBtn = document.getElementById('start-game-btn');
const playerNameDisplay = document.getElementById('player-name-display');

function startGame() {
    const name = playerNameInput.value.trim();
    if (name) {
        playerNameDisplay.textContent = name;
        nameModal.classList.add('hidden');
    } else {
        playerNameInput.focus();
    }
}

startGameBtn.addEventListener('click', startGame);
playerNameInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') startGame();
});

// Initialize on page load after translations are ready
document.addEventListener('i18n:ready', () => {
    initGame();
    playerNameInput.focus();
}, { once: true });

// Save Feature Logic
const saveBtn = document.getElementById('save-btn');
const saveModal = document.getElementById('save-modal');
const saveComment = document.getElementById('save-comment');
const wordCountIndicator = document.getElementById('word-count-indicator');
const saveCancelBtn = document.getElementById('save-cancel-btn');
const saveConfirmBtn = document.getElementById('save-confirm-btn');

saveBtn.addEventListener('click', () => {
    const selectedCount = boardElement.querySelectorAll('.tile-inner.selected').length;
    if (selectedCount === 0) {
        showDialog(t('messages.selectionRequired'), t('messages.selectionRequiredMessage'));
        return;
    }
    saveModal.classList.remove('hidden');
    saveComment.value = '';
    updateWordCount();
    saveComment.focus();
});

saveCancelBtn.addEventListener('click', () => {
    saveModal.classList.add('hidden');
});

saveConfirmBtn.addEventListener('click', () => {
    saveModal.classList.add('hidden');
    
    const commentDisplay = document.getElementById('saved-comment-display');
    commentDisplay.textContent = saveComment.value.trim();
    commentDisplay.classList.remove('hidden');
    
    // Give DOM time to update before capturing
    setTimeout(() => {
        const appContainer = document.querySelector('.app-container');
        // Temporarily expand the container so it fully wraps the board
        const origMaxWidth = appContainer.style.maxWidth;
        const origWidth = appContainer.style.width;
        appContainer.style.maxWidth = 'none';
        appContainer.style.width = 'max-content';
        // Force reflow so measurements update
        void appContainer.offsetWidth;
        html2canvas(appContainer, {
            backgroundColor: '#f5f2eb',
            scale: 2,
            windowWidth: appContainer.scrollWidth,
            windowHeight: appContainer.scrollHeight
        }).then(canvas => {
            // Restore original styles
            appContainer.style.maxWidth = origMaxWidth;
            appContainer.style.width = origWidth;
            const link = document.createElement('a');
            const playerName = playerNameDisplay.textContent || 'Player';
            link.download = t('messages.downloadFilename', { playerName });
            link.href = canvas.toDataURL('image/png');
            link.click();
            showDialog(t('messages.success'), t('messages.successMessage'));
        }).catch(err => {
            // Restore original styles on error too
            appContainer.style.maxWidth = origMaxWidth;
            appContainer.style.width = origWidth;
            console.error("Capture failed:", err);
            showDialog(t('messages.error'), t('messages.errorMessage', { error: err.message || err.toString() }));
        });
    }, 150);
});

saveComment.addEventListener('input', updateWordCount);

function updateWordCount() {
    const text = saveComment.value.trim();
    const words = text ? text.split(/\s+/) : [];
    const count = words.length;
    
    wordCountIndicator.textContent = t('saveModal.wordCount', { count });

    if (count >= 30) {
        wordCountIndicator.classList.add('ready');
        wordCountIndicator.textContent = t('saveModal.wordCountReady', { count });
        saveConfirmBtn.disabled = false;
    } else {
        wordCountIndicator.classList.remove('ready');
        saveConfirmBtn.disabled = true;
    }
}

// Generic Dialog Logic
const dialogModal = document.getElementById('dialog-modal');
const dialogTitle = document.getElementById('dialog-title');
const dialogMessage = document.getElementById('dialog-message');
const dialogOkBtn = document.getElementById('dialog-ok-btn');

function showDialog(title, message) {
    dialogTitle.textContent = title;
    dialogMessage.textContent = message;
    dialogModal.classList.remove('hidden');
}

dialogOkBtn.addEventListener('click', () => {
    dialogModal.classList.add('hidden');
});
