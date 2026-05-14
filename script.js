function getRandomWords(count) {
    const shuffled = [...window.gameWords].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
}

let state = []; // Array to store the current board state
let emptyIndex = TOTAL_TILES - 1; // Index of the empty tile in the state array
let movesCount = 0;
let isAnimating = false;
let currentMode = 'move';
let isMouseDown = false;
let isSelecting = true;

const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

let tileSoundBuffer = null;
fetch('./tilesound.mp3')
    .then(r => r.arrayBuffer())
    .then(ab => audioCtx.decodeAudioData(ab))
    .then(buf => { tileSoundBuffer = buf; })
    .catch(err => console.warn('Could not load tilesound.mp3:', err));

function playSlideSound() {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    if (!tileSoundBuffer) return;
    const src = audioCtx.createBufferSource();
    src.buffer = tileSoundBuffer;
    src.connect(audioCtx.destination);
    src.start();
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

document.addEventListener('keydown', (e) => {
    const tag = document.activeElement.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;
    if (modeMoveBtn.disabled) return;
    if (e.key === 'm' || e.key === 'M') setMode('move');
    else if (e.key === 'h' || e.key === 'H') setMode('highlight');
    else if (currentMode === 'move' && (e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
        e.preventDefault();
        const emptyTile = state.find(t => t.id === TOTAL_TILES - 1);
        const emptyIdx = emptyTile.index;
        let targetIndex = -1;

        if (e.key === 'ArrowUp') targetIndex = emptyIdx - GRID_SIZE;
        else if (e.key === 'ArrowDown') targetIndex = emptyIdx + GRID_SIZE;
        else if (e.key === 'ArrowLeft' && getCol(emptyIdx) > 0) targetIndex = emptyIdx - 1;
        else if (e.key === 'ArrowRight' && getCol(emptyIdx) < GRID_SIZE - 1) targetIndex = emptyIdx + 1;

        if (targetIndex >= 0 && targetIndex < TOTAL_TILES) {
            const targetTile = state.find(t => t.index === targetIndex);
            if (targetTile && targetTile.id !== TOTAL_TILES - 1) handleTileClick(targetTile.id);
        }
    }
});

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
            if (!tileData) return true;
            const hasAdjacentSelected = selectedTiles.some(otherInner => {
                if (inner === otherInner) return false;
                const otherData = state.find(t => t.element === otherInner.parentElement);
                if (!otherData) return false;
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
            const word = currentWords[i];
            inner.textContent = word.text;
            inner.style.setProperty('--char-count', Math.max(...word.text.split(' ').map(w => w.length)));
            inner.setAttribute('data-category', word.category);
            inner.style.backgroundColor = (window.categories[word.category] || {}).color || '#f0f0f0';

            // Randomize background position for organic ceramic texture (set via CSS var for ::before)
            const randX = Math.floor(Math.random() * 1000);
            const randY = Math.floor(Math.random() * 1000);
            inner.style.setProperty('--texture-pos', `${randX}px ${randY}px`);
            
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

shuffleBtn.addEventListener('click', () => {
    if (getScore() > 0) {
        reshuffleConfirmModal.classList.remove('hidden');
    } else {
        initGame();
    }
});

const startBtn = document.getElementById('start-btn');
const nameModal = document.getElementById('name-modal');
const playerNameInput = document.getElementById('player-name-input');
const startGameBtn = document.getElementById('start-game-btn');
const playerNameDisplay = document.getElementById('player-name-display');

startBtn.addEventListener('click', () => {
    nameModal.classList.remove('hidden');
    playerNameInput.focus();
});

document.getElementById('name-modal-close-btn').addEventListener('click', () => {
    nameModal.classList.add('hidden');
});

function startGame() {
    const name = playerNameInput.value.trim();
    if (name) {
        playerNameDisplay.textContent = name;
        nameModal.classList.add('hidden');
        shuffleBtn.disabled = false;
        modeMoveBtn.disabled = false;
        modeHighlightBtn.disabled = false;
        document.getElementById('save-btn').disabled = false;
        boardElement.style.pointerEvents = 'auto';
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
    if (window.usingDefaultContent) {
        document.getElementById('setup-notice').classList.remove('hidden');
    }
    initGame();
    boardElement.style.pointerEvents = 'none';
    const kbdM = document.createElement('kbd');
    kbdM.textContent = 'M';
    modeMoveBtn.appendChild(kbdM);
    const kbdH = document.createElement('kbd');
    kbdH.textContent = 'H';
    modeHighlightBtn.appendChild(kbdH);
}, { once: true });

// Save Feature Logic
const saveBtn = document.getElementById('save-btn');
const saveModal = document.getElementById('save-modal');
const saveComment = document.getElementById('save-comment');
const wordCountIndicator = document.getElementById('word-count-indicator');
const saveCancelBtn = document.getElementById('save-cancel-btn');
const saveConfirmBtn = document.getElementById('save-confirm-btn');
const savePreviewImg = document.getElementById('save-preview-img');
const savePreviewLoading = document.getElementById('save-preview-loading');


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

    if (savePreviewImg) {
        savePreviewImg.src = '';
        savePreviewImg.style.display = 'none';
    }
    if (savePreviewLoading) {
        savePreviewLoading.textContent = t('highScores.loading');
        savePreviewLoading.style.display = '';
    }

    captureSavedBoard({
        board_state: getBoardState(),
        player_name: playerNameDisplay.textContent || 'Player',
        statement: ''
    }).then(dataURL => {
        if (!savePreviewImg || !savePreviewLoading) return;
        savePreviewImg.src = dataURL;
        savePreviewImg.style.display = '';
        savePreviewLoading.style.display = 'none';
    }).catch(() => {
        if (!savePreviewLoading) return;
        savePreviewLoading.textContent = t('highScores.loadError');
    });
});

saveModal.addEventListener('click', (e) => {
    if (e.target === saveModal) {
        saveModal.classList.add('hidden');
        if (savePreviewImg) {
            savePreviewImg.src = '';
            savePreviewImg.style.display = 'none';
        }
        if (savePreviewLoading) {
            savePreviewLoading.textContent = t('highScores.loading');
            savePreviewLoading.style.display = '';
        }
    }
});

saveCancelBtn.addEventListener('click', () => {
    saveModal.classList.add('hidden');
    if (savePreviewImg) {
        savePreviewImg.src = '';
        savePreviewImg.style.display = 'none';
    }
    if (savePreviewLoading) {
        savePreviewLoading.textContent = t('highScores.loading');
        savePreviewLoading.style.display = '';
    }
});

saveConfirmBtn.addEventListener('click', () => {
    saveModal.classList.add('hidden');
    if (savePreviewImg) {
        savePreviewImg.src = '';
        savePreviewImg.style.display = 'none';
    }
    if (savePreviewLoading) {
        savePreviewLoading.textContent = t('highScores.loading');
        savePreviewLoading.style.display = '';
    }

    // Save to database in the background — failures are non-blocking
    saveGameData(saveComment.value.trim()).catch(err => console.warn('DB save failed:', err));

    const commentDisplay = document.getElementById('saved-comment-display');
    commentDisplay.textContent = saveComment.value.trim();
    commentDisplay.classList.remove('hidden');

    const imageFooter = document.getElementById('image-footer');
    const gameTitle = t('stats.gameTitle');
    imageFooter.textContent = t('messages.imageFooter', { gameTitle });
    imageFooter.classList.remove('hidden');

    // Give DOM time to update before capturing
    setTimeout(() => {
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
            imageFooter.classList.add('hidden');
            const link = document.createElement('a');
            const playerName = playerNameDisplay.textContent || 'Player';
            link.download = t('messages.downloadFilename', { playerName, gameTitle });
            link.href = canvas.toDataURL('image/png');
            link.click();
            showDialog(t('messages.success'), t('messages.successMessage'), () => {
                document.getElementById('saved-comment-display').classList.add('hidden');
                initGame();
            });
        }).catch(err => {
            // Restore original styles on error too
            appContainer.style.maxWidth = origMaxWidth;
            appContainer.style.width = origWidth;
            imageFooter.classList.add('hidden');
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

// Reshuffle Confirm Modal
const reshuffleConfirmModal = document.getElementById('reshuffle-confirm-modal');
const reshuffleCancelBtn = document.getElementById('reshuffle-cancel-btn');
const reshuffleConfirmBtn = document.getElementById('reshuffle-confirm-btn');

reshuffleCancelBtn.addEventListener('click', () => {
    reshuffleConfirmModal.classList.add('hidden');
});

reshuffleConfirmBtn.addEventListener('click', () => {
    reshuffleConfirmModal.classList.add('hidden');
    initGame();
});

// Generic Dialog Logic
const dialogModal = document.getElementById('dialog-modal');
const dialogTitle = document.getElementById('dialog-title');
const dialogMessage = document.getElementById('dialog-message');
const dialogOkBtn = document.getElementById('dialog-ok-btn');

function showDialog(title, message, onClose = null) {
    dialogTitle.textContent = title;
    dialogMessage.textContent = message;
    dialogModal.classList.remove('hidden');
    if (onClose) {
        dialogOkBtn.addEventListener('click', onClose, { once: true });
    }
}

dialogOkBtn.addEventListener('click', () => {
    dialogModal.classList.add('hidden');
});

// --- Menu Logic ---
const menuBtn = document.getElementById('menu-btn');
const menuPanel = document.getElementById('menu-panel');
const menuHighScore = document.getElementById('menu-highscore');
const scoresPage = document.getElementById('scores-page');
const scoresContainer = document.getElementById('scores-container');
const scoresBackBtn = document.getElementById('scores-back-btn');
const appContainer = document.querySelector('.app-container');

function closeMenu() {
    menuPanel.classList.add('hidden');
    menuBtn.classList.remove('open');
}

function showScoresPage() {
    appContainer.style.display = 'none';
    scoresPage.classList.remove('hidden');
}

function hideScoresPage() {
    scoresPage.classList.add('hidden');
    appContainer.style.display = '';
}

menuBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const isHidden = menuPanel.classList.toggle('hidden');
    menuBtn.classList.toggle('open', !isHidden);
});

document.addEventListener('click', (e) => {
    if (!menuPanel.contains(e.target) && e.target !== menuBtn) {
        closeMenu();
    }
});

menuHighScore.addEventListener('click', async () => {
    closeMenu();
    await showHighScores();
});

scoresBackBtn.addEventListener('click', () => {
    hideScoresPage();
});

// --- About page ---
const menuAbout = document.getElementById('menu-about');
const aboutModal = document.getElementById('about-modal');
const aboutModalBody = document.getElementById('about-modal-body');

async function openAboutModal() {
    aboutModalBody.innerHTML = '<p style="color:var(--text-secondary)">Loading…</p>';
    aboutModal.classList.remove('hidden');

    try {
        const res = await fetch('/api/settings');
        const data = res.ok ? await res.json() : {};
        let content = data.about;
        if (!content) {
            const mdRes = await fetch('/tilecraft.md');
            if (mdRes.ok) content = await mdRes.text();
        }
        if (content) {
            aboutModalBody.innerHTML = window.marked ? marked.parse(content) : `<pre>${content}</pre>`;
        } else {
            aboutModalBody.innerHTML = '<p style="color:var(--text-secondary)">No about content configured yet.</p>';
        }
    } catch {
        aboutModalBody.innerHTML = '<p style="color:var(--text-secondary)">Could not load content.</p>';
    }
}

menuAbout.addEventListener('click', () => {
    closeMenu();
    openAboutModal();
});

document.getElementById('help-btn').addEventListener('click', () => {
    openAboutModal();
});

document.getElementById('about-modal-close-btn').addEventListener('click', () => {
    aboutModal.classList.add('hidden');
});

aboutModal.addEventListener('click', (e) => {
    if (e.target === aboutModal) aboutModal.classList.add('hidden');
});

// Fetch and apply settings overrides (tagline) at startup
fetch('/api/settings')
    .then(r => r.ok ? r.json() : {})
    .then(data => {
        if (data.tagline) {
            const el = document.querySelector('[data-i18n="header.tagline"]');
            if (el) el.textContent = data.tagline;
        }
    })
    .catch(() => {});

async function showHighScores() {
    scoresContainer.innerHTML = `<p style="color: var(--text-secondary); text-align: center; margin: 1.5rem 0;">${t('highScores.loading')}</p>`;
    showScoresPage();

    try {
        const response = await fetch('/api/scores');
        if (!response.ok) {
            const body = await response.text().catch(() => '');
            throw new Error(`HTTP ${response.status}: ${body}`);
        }
        const { scores } = await response.json();

        if (!scores || scores.length === 0) {
            scoresContainer.innerHTML = `<p class="scores-empty">${t('highScores.noScores')}</p>`;
            return;
        }

        scoresContainer.innerHTML = '';
        scores.forEach((s, i) => {
            const card = document.createElement('div');
            card.className = 'score-card';

            const date = new Date(s.date).toLocaleDateString();

            const header = document.createElement('div');
            header.className = 'score-card-header';
            header.innerHTML = `
                <span class="score-card-rank">${i + 1}</span>
                <span class="score-card-player">${s.player_name}</span>
                <div class="score-card-stats">
                    <span>${s.score} pts</span>
                    <span>${s.moves} moves</span>
                    <span>${date}</span>
                </div>
            `;
            card.appendChild(header);

            if (s.statement) {
                const statement = document.createElement('p');
                statement.className = 'score-card-statement';
                statement.textContent = `"${s.statement}"`;
                card.appendChild(statement);
            }

            if (s.board_state) {
                const btnRow = document.createElement('div');
                btnRow.className = 'score-card-btn-row';

                const viewBtn = document.createElement('button');
                viewBtn.className = 'score-card-view-btn';
                viewBtn.textContent = t('highScores.viewBoard');
                viewBtn.addEventListener('click', () => showSavedBoard(s));

                const dlBtn = document.createElement('button');
                dlBtn.className = 'score-card-view-btn score-card-download-btn';
                dlBtn.textContent = t('highScores.downloadBoard');
                dlBtn.addEventListener('click', async () => {
                    dlBtn.disabled = true;
                    try {
                        const dataURL = await captureSavedBoard(s);
                        const link = document.createElement('a');
                        const gameTitle = t('stats.gameTitle');
                        link.download = t('messages.downloadFilename', { playerName: s.player_name, gameTitle });
                        link.href = dataURL;
                        link.click();
                    } finally {
                        dlBtn.disabled = false;
                    }
                });

                btnRow.appendChild(viewBtn);
                btnRow.appendChild(dlBtn);
                card.appendChild(btnRow);
            }

            scoresContainer.appendChild(card);
        });
    } catch (err) {
        console.error('Failed to load scores:', err);
        scoresContainer.innerHTML = `<p style="color: #c97a7e; text-align: center; margin: 1.5rem 0;">${t('highScores.loadError')}</p>`;
    }
}

// --- Board Preview ---
const boardPreviewModal = document.getElementById('board-preview-modal');
const boardPreviewPlayer = document.getElementById('board-preview-player');
const boardPreviewLoading = document.getElementById('board-preview-loading');
const boardPreviewImg = document.getElementById('board-preview-img');
const boardPreviewCloseBtn = document.getElementById('board-preview-close-btn');

boardPreviewCloseBtn.addEventListener('click', () => {
    boardPreviewModal.classList.add('hidden');
});

boardPreviewModal.addEventListener('click', (e) => {
    if (e.target === boardPreviewModal) boardPreviewModal.classList.add('hidden');
});

async function showSavedBoard(score) {
    boardPreviewPlayer.textContent = t('highScores.boardPreviewTitle', { player: score.player_name });
    boardPreviewImg.src = '';
    boardPreviewImg.style.display = 'none';
    boardPreviewLoading.style.display = '';
    boardPreviewModal.classList.remove('hidden');

    try {
        const dataURL = await captureSavedBoard(score);
        boardPreviewImg.src = dataURL;
        boardPreviewImg.style.display = '';
        boardPreviewLoading.style.display = 'none';
    } catch (err) {
        boardPreviewLoading.textContent = t('highScores.loadError');
    }
}

function injectCeramicTexture(root) {
    root.querySelectorAll('.tile-inner').forEach(inner => {
        const pos = inner.style.getPropertyValue('--texture-pos') || '0px 0px';
        const div = document.createElement('div');
        div.style.cssText = `position:absolute;inset:0;border-radius:4px;background-image:url('/ceramic.png');background-size:150px 150px;background-position:${pos};mix-blend-mode:multiply;pointer-events:none;z-index:-1;`;
        inner.appendChild(div);
    });
}

async function captureSavedBoard(score) {
    const boardState = typeof score.board_state === 'string'
        ? JSON.parse(score.board_state)
        : score.board_state;

    const cover = document.createElement('div');
    cover.style.cssText = 'position:fixed;inset:0;z-index:99998;background:#f5f2eb;pointer-events:none;';
    document.body.appendChild(cover);

    const container = document.createElement('div');
    container.className = 'app-container board-capture-root';
    container.style.cssText = 'position:fixed;left:0;top:0;z-index:99997;max-width:none;width:max-content;background-color:#f5f2eb;';

    const header = document.createElement('header');
    const h1 = document.createElement('h1');
    h1.id = 'player-name-display';
    h1.textContent = score.player_name;
    header.appendChild(h1);
    container.appendChild(header);

    const main = document.createElement('main');
    const board = document.createElement('div');
    renderBoardFromState(board, boardState);
    main.appendChild(board);

    if (score.statement) {
        const comment = document.createElement('div');
        comment.className = 'saved-comment';
        comment.textContent = `"${score.statement}"`;
        main.appendChild(comment);
    }

    const gameTitle = t('stats.gameTitle');
    const footer = document.createElement('div');
    footer.className = 'image-footer';
    footer.textContent = t('messages.imageFooter', { gameTitle });
    main.appendChild(footer);

    container.appendChild(main);
    document.body.appendChild(container);
    void container.offsetWidth;

    try {
        const canvas = await html2canvas(container, {
            backgroundColor: '#f5f2eb',
            scale: 2,
            windowWidth: container.scrollWidth,
            windowHeight: container.scrollHeight,
            onclone: (_, el) => injectCeramicTexture(el),
        });
        return canvas.toDataURL('image/png');
    } finally {
        document.body.removeChild(container);
        document.body.removeChild(cover);
    }
}

// --- Exit / Save to Database ---

function getBoardState() {
    const grid = new Array(TOTAL_TILES).fill(null);
    state.forEach(tile => {
        if (tile.id < TOTAL_TILES - 1) {
            const inner = tile.element.querySelector('.tile-inner');
            grid[tile.index] = {
                id: tile.id,
                text: inner.textContent,
                category: inner.getAttribute('data-category'),
                selected: inner.classList.contains('selected')
            };
        }
    });
    return grid;
}

function getScore() {
    const selectedCount = boardElement.querySelectorAll('.tile-inner.selected').length;
    return movesCount + (selectedCount * 50);
}

async function saveGameData(statement = '') {
    const playerName = playerNameDisplay.textContent || 'Anonymous';
    const payload = {
        playerName,
        score: getScore(),
        moves: movesCount,
        statement,
        boardState: getBoardState(),
        date: new Date().toISOString()
    };

    const response = await fetch('/api/save-game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || `HTTP ${response.status}`);
    }

    return response.json();
}

