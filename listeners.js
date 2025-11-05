// listeners.js
import * as state from './state.js';
import * as renderer from './ui-renderer.js';
import * as modals from './ui-modal.js';
import * as deck from './deck-manager.js';
import * as filters from './filters.js';
import * as importer from './importer.js';
import * as exporter from './exporter.js';

export function initializeEventListeners() {
    const searchInput = document.getElementById('searchInput');
    const sortSelect = document.getElementById('sortSelect');
    const showZeroCostCheckbox = document.getElementById('showZeroCost');
    const showNonZeroCostCheckbox = document.getElementById('showNonZeroCost');
    const gridSizeControls = document.getElementById('gridSizeControls');
    const viewModeToggle = document.getElementById('viewModeToggle');
    const searchResults = document.getElementById('searchResults');
    const wrestlerSelect = document.getElementById('wrestlerSelect');
    const managerSelect = document.getElementById('managerSelect');
    const startingDeckList = document.getElementById('startingDeckList');
    const purchaseDeckList = document.getElementById('purchaseDeckList');
    const personaDisplay = document.getElementById('personaDisplay');
    const clearDeckBtn = document.getElementById('clearDeck');
    const importDeckBtn = document.getElementById('importDeck');
    const exportSelect = document.getElementById('exportSelect');
    const confirmExportBtn = document.getElementById('confirmExportBtn');
    const confirmExportBtnText = document.getElementById('confirmExportBtnText');
    const importModal = document.getElementById('importModal');
    const deckFileInput = document.getElementById('deckFileInput');
    const processImportBtn = document.getElementById('processImportBtn');
    const cardModal = document.getElementById('cardModal');
    let pendingExportAction = null;

    function refreshCardPool() {
        const finalCards = filters.getFilteredAndSortedCardPool();
        renderer.renderCardPool(finalCards);
    }

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
        // --- FIX #2: Re-render the card pool after changing the view mode. ---
        refreshCardPool();
        // --- END OF FIX #2 ---
    });

    searchResults.addEventListener('click', (e) => {
        const target = e.target;
        // Find the parent element with the data-title attribute
        const cardItem = target.closest('[data-title]');
        if (!cardItem) return;

        const cardTitle = cardItem.dataset.title;
        
        // Check if the original click target was a button
        if (target.tagName === 'BUTTON') {
            deck.addCardToDeck(cardTitle, target.dataset.deckTarget);
        } else {
            // If not a button, show the modal
            modals.showCardModal(cardTitle);
        }
    });

    exportSelect.addEventListener('change', (e) => {
        pendingExportAction = e.target.value;
        const selectedOption = e.target.options[e.target.selectedIndex];
        if (pendingExportAction) {
            confirmExportBtnText.textContent = `Export as ${selectedOption.text}`;
            confirmExportBtn.classList.add('visible');
        } else {
            confirmExportBtn.classList.remove('visible');
        }
    });

    confirmExportBtn.addEventListener('click', () => {
        if (!pendingExportAction) return;
        switch (pendingExportAction) {
            case 'export-text': exporter.exportDeckAsText(); break;
            case 'export-full': exporter.exportFull(); break;
            case 'export-printer-friendly': exporter.exportPrinterFriendly(); break;
            case 'export-paper-friendly': exporter.exportPaperFriendly(); break;
            case 'export-both-friendly': exporter.exportBothFriendly(); break;
            case 'export-all-cards': exporter.exportAllCards(); break;
        }
        confirmExportBtn.classList.remove('visible');
        exportSelect.value = "";
        pendingExportAction = null;
    });

    wrestlerSelect.addEventListener('change', (e) => {
        const newWrestler = state.cardTitleCache[e.target.value] || null;
        state.setSelectedWrestler(newWrestler);
        renderer.renderPersonaDisplay();
        state.saveStateToCache();
    });

    managerSelect.addEventListener('change', (e) => {
        const newManager = state.cardTitleCache[e.target.value] || null;
        state.setSelectedManager(newManager);
        renderer.renderPersonaDisplay();
        state.saveStateToCache();
    });

    [startingDeckList, purchaseDeckList, personaDisplay].forEach(container => {
        container.addEventListener('click', (e) => {
            const target = e.target;
            const cardItem = target.closest('[data-title]');
            if (!cardItem) return;
            
            const cardTitle = cardItem.dataset.title;
            const action = target.dataset.action;

            if (action === 'remove') {
                const deckName = container === startingDeckList ? 'starting' : 'purchase';
                deck.removeCardFromDeck(cardTitle, deckName);
            } else if (action === 'moveToPurchase') {
                deck.moveCardToPurchase(cardTitle);
            } else if (action === 'moveToStart') {
                deck.moveCardToStarting(cardTitle);
            } else {
                modals.showCardModal(cardTitle);
            }
        });
    });

    clearDeckBtn.addEventListener('click', deck.clearDeck);
    importDeckBtn.addEventListener('click', modals.showImportModal);

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
                modals.closeAllModals();
            }
        });
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            modals.closeAllModals();
        }
    });
}

