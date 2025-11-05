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
    const deckActions = document.querySelector('.deck-actions');
    const deckPanel = document.querySelector('.deck-panel');

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
            state.saveStateToCache();
            refreshCardPool();
        }
    });

    viewModeToggle.addEventListener('click', () => {
        const newMode = state.currentViewMode === 'list' ? 'grid' : 'list';
        state.setCurrentViewMode(newMode);
        viewModeToggle.textContent = newMode === 'list' ? 'Switch to Grid View' : 'Switch to List View';
        state.saveStateToCache();
        refreshCardPool();
    });

    searchResults.addEventListener('click', (e) => {
        const cardItem = e.target.closest('[data-title]');
        if (!cardItem) return;
        if (e.target.tagName === 'BUTTON') {
            deck.addCardToDeck(cardItem.dataset.title, e.target.dataset.deckTarget);
        } else {
            modals.showCardModal(cardItem.dataset.title);
        }
    });

    deckActions.addEventListener('click', (e) => {
        const target = e.target;
        if (target.id === 'clearDeck') deck.clearDeck();
        if (target.id === 'importDeck') modals.showImportModal();
        if (target.id === 'confirmExportBtn') {
            const select = document.getElementById('exportSelect');
            const action = select.value;
            if (!action) return;
            switch (action) {
                case 'export-text': exporter.exportDeckAsText(); break;
                case 'export-full': exporter.exportFull(); break;
                case 'export-printer-friendly': exporter.exportPrinterFriendly(); break;
                case 'export-paper-friendly': exporter.exportPaperFriendly(); break;
                case 'export-both-friendly': exporter.exportBothFriendly(); break;
                case 'export-all-cards': exporter.exportAllCards(); break;
            }
            target.classList.remove('visible');
            select.value = "";
        }
    });
    
    document.getElementById('exportSelect').addEventListener('change', (e) => {
        const btn = document.getElementById('confirmExportBtn');
        const btnText = document.getElementById('confirmExportBtnText');
        if (e.target.value) {
            btnText.textContent = `Export as ${e.target.options[e.target.selectedIndex].text}`;
            btn.classList.add('visible');
        } else {
            btn.classList.remove('visible');
        }
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

    deckPanel.addEventListener('click', (e) => {
        const cardItem = e.target.closest('[data-title]');
        if (!cardItem) return;
        const cardTitle = cardItem.dataset.title;
        const action = e.target.dataset.action;
        if (action === 'remove') {
            const deckName = cardItem.closest('#startingDeckList') ? 'starting' : 'purchase';
            deck.removeCardFromDeck(cardTitle, deckName);
        } else if (action === 'moveToPurchase') {
            deck.moveCardToPurchase(cardTitle);
        } else if (action === 'moveToStart') {
            deck.moveCardToStarting(cardTitle);
        } else {
            modals.showCardModal(cardTitle);
        }
    });

    document.getElementById('processImportBtn').addEventListener('click', () => {
        const text = document.getElementById('deckTextInput').value;
        if (text) importer.parseAndLoadDeck(text);
    });

    document.getElementById('deckFileInput').addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => importer.parseAndLoadDeck(event.target.result);
            reader.readAsText(file);
        }
    });
    
    document.querySelectorAll('.modal-backdrop').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal || e.target.classList.contains('modal-close-button')) {
                modals.closeAllModals();
            }
        });
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') modals.closeAllModals();
    });
}

