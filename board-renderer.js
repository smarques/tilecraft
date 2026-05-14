function tileTextColor(hexBg) {
    if (!hexBg || hexBg.length < 7) return '#ffffff';
    const r = parseInt(hexBg.slice(1, 3), 16) / 255;
    const g = parseInt(hexBg.slice(3, 5), 16) / 255;
    const b = parseInt(hexBg.slice(5, 7), 16) / 255;
    const lin = c => c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    const L = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
    return L > 0.35 ? '#3a3836' : '#ffffff';
}

function renderBoardFromState(targetBoard, boardState) {
    if (!targetBoard) return;
    targetBoard.innerHTML = '';
    targetBoard.className = 'game-board';
    boardState.forEach((tileData, index) => {
        const tile = document.createElement('div');
        tile.classList.add('tile');
        const inner = document.createElement('div');
        inner.classList.add('tile-inner');
        if (tileData) {
            inner.textContent = tileData.text;
            inner.style.setProperty('--char-count', Math.max(...tileData.text.split(' ').map(w => w.length)));
            inner.setAttribute('data-category', tileData.category);
            const bgColor = (window.categories[tileData.category] || {}).color || '#888888';
            inner.style.backgroundColor = bgColor;
            inner.style.color = tileTextColor(bgColor);
            const randX = Math.floor(Math.random() * 1000);
            const randY = Math.floor(Math.random() * 1000);
            inner.style.setProperty('--texture-pos', `${randX}px ${randY}px`);
            if (tileData.selected) inner.classList.add('selected');
        } else {
            tile.classList.add('empty-tile');
        }
        tile.appendChild(inner);
        targetBoard.appendChild(tile);
        const col = index % GRID_SIZE;
        const row = Math.floor(index / GRID_SIZE);
        tile.style.transform = `translate(${col * 100}%, ${row * 100}%)`;
    });
    if (boardState.some(t => t && t.selected)) {
        targetBoard.classList.add('has-selection');
    }
}
