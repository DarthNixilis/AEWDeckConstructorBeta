// listeners/listeners-pool.js
import * as state from './config.js'; // CORRECTED PATH
import * as ui from './ui.js'; // CORRECTED PATH
import * as deck from './deck.js'; // CORRECTED PATH

export function initializePoolListeners(refreshCardPool) {
    const searchInput = document.getElementById('searchInput');
    const sortSelect = document.getElementById('sortSelect');
    const showZeroCostCheckbox = document.getElementById('showZeroCost');
    const showNonZeroCostCheckbox = document.getElementById('showNonZeroCost');
    const gridSizeControls = document.getElementById('gridSizeControls');
    const viewModeToggle = document.getElementById('viewModeToggle');
    const searchResults = document.getElementById('searchResults');

    document.addEventListener('filtersChanged', refreshCardPool);
    searchInput.addEventListener('input', state.debounce(refreshCardPool, 300));
    
    sortSelect.addEventListener('change', (e) => {
        state.setCurrentSort(e.target.value);
        refreshCardPool();
    });

    showZeroCostCheckbox.addEventListener('change', (e) => {
        state.setShowZeroCost(e.target.checked);
        refreshCardPool();
    });

    showNonZeroCostCheckbox.addEventListener('change', (e) => {
        state.setShowNonZeroCost(e.target.checked);
        refreshCardPool();
    });

    gridSizeControls.addEventListener('click', (e) => {
        if (e.target.tagName === 'BUTTON') {
            state.setNumGridColumns(e.target.dataset.columns);
            gridSizeControls.querySelectorAll('button').forEach(btn => btn.classList.remove('active'));
            e.target.classList.add('active');
            refreshCardPool();
        }
    });

    viewModeToggle.addEventListener('click', () => {
        const newMode = state.currentViewMode === 'list' ? 'grid' : 'list';
        state.setCurrentViewMode(newMode);
        viewModeToggle.textContent = newMode === 'list' ? 'Switch to Grid View' : 'Switch to List View';
        refreshCardPool();
    });

    searchResults.addEventListener('click', (e) => {
        const target = e.target;
        const cardTitle = target.dataset.title || target.closest('[data-title]')?.dataset.title;
        if (!cardTitle) return;
        if (target.tagName === 'BUTTON') {
            deck.addCardToDeck(cardTitle, target.dataset.deckTarget);
        } else {
            ui.showCardModal(cardTitle);
        }
    });
}

