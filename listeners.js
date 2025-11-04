// listeners.js
import * as state from './config.js';
import * as ui from './ui.js';
import * as deck from './deck.js';
import * as filters from './filters.js';
import * as importer from './importer.js';
import * as exporter from './exporter.js';

export function initializeEventListeners() {
    // --- POOL LISTENERS ---
    const searchInput = document.getElementById('searchInput');
    const sortSelect = document.getElementById('sortSelect');
    const showZeroCostCheckbox = document.getElementById('showZeroCost');
    const showNonZeroCostCheckbox = document.getElementById('showNonZeroCost');
    const gridSizeControls = document.getElementById('gridSizeControls');
    const viewModeToggle = document.getElementById('viewModeToggle');
    const searchResults = document.getElementById('searchResults');

    document.addEventListener('filtersChanged', refreshCardPool);
    searchInput.addEventListener('input', state.debounce(refreshCardPool, 300));
    sortSelect.addEventListener('change', (e) => { state.setCurrentSort(e.target.value); refreshCardPool(); });
    showZeroCostCheckbox.addEventListener('change', (e) => { state.setShowZeroCost(e.target.checked); refreshCardPool(); });
    showNonZeroCostCheckbox.addEventListener('change', (e) => { state.setShowNonZeroCost(e.target.checked); refreshCardPool(); });
    gridSizeControls.addEventListener('click', (e) => {
        if (e.target.tagName === 'BUTTON') {
            gridSizeControls.querySelectorAll('button').forEach(btn => btn.classList.remove('active'));
            e.target.classList.add('active');
            state.setNumGridColumns(e.target.dataset.columns);
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

    // --- DECK LISTENERS ---
    const wrestlerSelect = document.getElementById('wrestlerSelect');
    const managerSelect = document.getElementById('managerSelect');
    const startingDeckList = document.getElementById('startingDeckList');
    const purchaseDeckList = document.getElementById('purchaseDeckList');
    const personaDisplay = document.getElementById('personaDisplay');
    const clearDeckBtn = document.getElementById('clearDeck');
    const exportDeckBtn = document.getElementById('exportDeck');
    const exportAsImageBtn = document.getElementById('exportAsImageBtn');

    wrestlerSelect.addEventListener('change', (e) => {
        const newWrestler = state.cardTitleCache[e.target.value] || null;
        state.setSelectedWrestler(newWrestler);
        ui.renderPersonaDisplay();
        state.saveStateToCache();
    });
    managerSelect.addEventListener('change', (e) => {
        const newManager = state.cardTitleCache[e.target.value] || null;
        state.setSelectedManager(newManager);
        ui.renderPersonaDisplay();
        state.saveStateToCache();
    });

    // --- THIS IS THE KEY CHANGE #3 ---
    // The listener now handles all four possible actions: remove, moveToPurchase, moveToStart, and view.
    [startingDeckList, purchaseDeckList].forEach(container => {
        container.addEventListener('click', (e) => {
            const target = e.target;
            const cardTitle = target.dataset.title || target.closest('[data-title]')?.dataset.title;
            if (!cardTitle) return;

            const action = target.dataset.action;
            if (action === 'remove') {
                const deckName = container === startingDeckList ? 'starting' : 'purchase';
                deck.removeCardFromDeck(cardTitle, deckName);
            } else if (action === 'moveToPurchase') {
                deck.moveCardToPurchase(cardTitle);
            } else if (action === 'moveToStart') {
                deck.moveCardToStarting(cardTitle);
            } else {
                // If no action button was clicked, assume user wants to view the card
                ui.showCardModal(cardTitle);
            }
        });
    });
    // --- END OF KEY CHANGE #3 ---

    personaDisplay.addEventListener('click', (e) => {
        const cardTitle = e.target.dataset.title || e.target.closest('[data-title]')?.dataset.title;
        if (cardTitle) ui.showCardModal(cardTitle);
    });

    clearDeckBtn.addEventListener('click', () => {
        if (confirm('Are you sure you want to clear the entire deck?')) {
            state.setStartingDeck([]);
            state.setPurchaseDeck([]);
            ui.renderDecks();
        }
    });
    exportDeckBtn.addEventListener('click', exporter.exportDeckAsText);
    exportAsImageBtn.addEventListener('click', exporter.exportDeckAsImage);

    // --- MODAL LISTENERS ---
    const importDeckBtn = document.getElementById('importDeck');
    const importModal = document.getElementById('importModal');
    const deckFileInput = document.getElementById('deckFileInput');
    const processImportBtn = document.getElementById('processImportBtn');
    const cardModal = document.getElementById('cardModal');

    importDeckBtn.addEventListener('click', () => {
        importModal.style.display = 'flex';
        document.getElementById('importStatus').textContent = '';
        document.getElementById('deckTextInput').value = '';
        deckFileInput.value = '';
    });
    processImportBtn.addEventListener('click', () => {
        const text = document.getElementById('deckTextInput').value;
        if (text) importer.parseAndLoadDeck(text);
    });
    deckFileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => importer.parseAndLoadDeck(event.target.result);
            reader.readAsText(file);
        }
    });
    
    [cardModal, importModal].forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal || e.target.classList.contains('modal-close-button')) {
                modal.style.display = 'none';
            }
        });
    });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            cardModal.style.display = 'none';
            importModal.style.display = 'none';
            if (state.lastFocusedElement) {
                state.lastFocusedElement.focus();
            }
        }
    });
}

function refreshCardPool() {
    const finalCards = filters.getFilteredAndSortedCardPool();
    ui.renderCardPool(finalCards);
}

