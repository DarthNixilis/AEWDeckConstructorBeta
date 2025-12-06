// listeners.js
import * as state from './config.js';
import * as ui from './ui.js';
import * as deck from './deck.js';
import { parseAndLoadDeck } from './importer.js';
import { generatePlainTextDeck, exportDeckAsImage } from './exporter.js';

// --- DOM REFERENCES (Moved to module scope for efficiency) ---
const searchInput = document.getElementById('searchInput');
const sortSelect = document.getElementById('sortSelect');
const showZeroCostCheckbox = document.getElementById('showZeroCost');
const showNonZeroCostCheckbox = document.getElementById('showNonZeroCost');
const showSetCoreCheckbox = document.getElementById('showSetCore');
const showSetAdvancedCheckbox = document.getElementById('showSetAdvanced');
const gridSizeControls = document.getElementById('gridSizeControls');
const viewModeToggle = document.getElementById('viewModeToggle');
const searchResults = document.getElementById('searchResults');
const usePlaytestProxiesToggle = document.getElementById('usePlaytestProxiesToggle');

const wrestlerSelect = document.getElementById('wrestlerSelect');
const managerSelect = document.getElementById('managerSelect');

const exportPlaintextBtn = document.getElementById('exportPlaintextBtn');
const openImportModalBtn = document.getElementById('openImportModalBtn');
const processImportBtn = document.getElementById('processImportBtn');
const deckFileInput = document.getElementById('deckFileInput');
const deckTextInput = document.getElementById('deckTextInput');

const cardModal = document.getElementById('cardModal');
const importModal = document.getElementById('importModal');
const exportOptionsModal = document.getElementById('exportOptionsModal');

// Added null checks here just in case, though they should exist in index.html
const modalCloseButton = cardModal ? cardModal.querySelector('.modal-close-button') : null;
const exportOptionsModalCloseBtn = exportOptionsModal ? exportOptionsModal.querySelector('.modal-close-button') : null;

const exportPlaytestBtn = document.getElementById('exportPlaytestBtn');
const exportOfficialBtn = document.getElementById('exportOfficialBtn');
const exportFullBtn = document.getElementById('exportFullBtn');


export function initializeAllEventListeners(refreshCardPool) {
    // POOL LISTENERS
    document.addEventListener('filtersChanged', refreshCardPool);
    searchInput.addEventListener('input', state.debounce(refreshCardPool, 300));
    sortSelect.addEventListener('change', (e) => { state.setCurrentSort(e.target.value); refreshCardPool(); });
    showZeroCostCheckbox.addEventListener('change', (e) => { state.setShowZeroCost(e.target.checked); refreshCardPool(); });
    showNonZeroCostCheckbox.addEventListener('change', (e) => { state.setShowNonZeroCost(e.target.checked); refreshCardPool(); });
    showSetCoreCheckbox.addEventListener('change', (e) => { state.setShowSetCore(e.target.checked); refreshCardPool(); });
    showSetAdvancedCheckbox.addEventListener('change', (e) => { state.setShowSetAdvanced(e.target.checked); refreshCardPool(); });

    gridSizeControls.querySelectorAll('button').forEach(button => {
        button.addEventListener('click', (e) => {
            state.setGridColumns(parseInt(e.target.dataset.columns));
            gridSizeControls.querySelectorAll('button').forEach(btn => btn.classList.remove('active'));
            e.target.classList.add('active');
            refreshCardPool();
        });
    });

    viewModeToggle.addEventListener('click', () => {
        state.toggleViewMode();
        viewModeToggle.textContent = state.currentViewMode === 'list' ? 'Switch to Grid View' : 'Switch to List View';
        refreshCardPool();
    });

    searchResults.addEventListener('click', (e) => {
        const cardElement = e.target.closest('.card-item');
        if (!cardElement) return;

        const cardTitle = cardElement.dataset.title;
        const targetDeck = e.ctrlKey || e.metaKey ? 'purchase' : 'starting';
        
        deck.addCardToDeck(cardTitle, targetDeck);
    });
    
    usePlaytestProxiesToggle.addEventListener('change', (e) => {
        state.setUsePlaytestProxies(e.target.checked);
        document.dispatchEvent(new Event('filtersChanged')); // Re-render pool to update visuals
    });

    // PERSONA LISTENERS
    wrestlerSelect.addEventListener('change', (e) => {
        const wrestler = state.cardTitleCache[e.target.value] || null;
        state.setSelectedWrestler(wrestler);
        ui.renderPersonaDisplay();
        ui.renderDecks();
        document.dispatchEvent(new Event('filtersChanged'));
    });

    managerSelect.addEventListener('change', (e) => {
        const manager = state.cardTitleCache[e.target.value] || null;
        state.setSelectedManager(manager);
        ui.renderPersonaDisplay();
        ui.renderDecks();
        document.dispatchEvent(new Event('filtersChanged'));
    });
    
    // DECK LISTENERS
    const deckListContainer = document.getElementById('deckListContainer');
    deckListContainer.addEventListener('click', (e) => {
        const removeButton = e.target.closest('.remove-card-btn');
        if (!removeButton) return;

        const cardElement = removeButton.closest('.card-item') || removeButton.closest('.deck-grid-card-item');
        const cardTitle = cardElement.dataset.title;
        const targetDeck = cardElement.closest('#startingDeckList') ? 'starting' : 'purchase';

        deck.removeCardFromDeck(cardTitle, targetDeck);
    });
    
    document.getElementById('startingDeckHeader').addEventListener('click', () => {
        state.toggleStartingDeckExpanded();
        ui.renderDecks();
    });

    document.getElementById('purchaseDeckHeader').addEventListener('click', () => {
        state.togglePurchaseDeckExpanded();
        ui.renderDecks();
    });
    
    document.getElementById('deckGridSizeControls').querySelectorAll('button').forEach(button => {
        button.addEventListener('click', (e) => {
            state.setDeckGridColumns(parseInt(e.target.dataset.columns));
            document.getElementById('deckGridSizeControls').querySelectorAll('button').forEach(btn => btn.classList.remove('active'));
            e.target.classList.add('active');
            ui.renderDecks();
        });
    });

    // MODAL LISTENERS
    document.getElementById('openExportOptionsBtn').addEventListener('click', () => {
        exportOptionsModal.style.display = 'flex';
    });
    
    exportPlaintextBtn.addEventListener('click', () => {
        const text = generatePlainTextDeck();
        const blob = new Blob([text], { type: 'text/plain' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        const wrestlerName = state.selectedWrestler ? state.selectedWrestler.title : "Deck";
        a.download = `${wrestlerName}-Decklist.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        exportOptionsModal.style.display = 'none';
    });
    
    openImportModalBtn.addEventListener('click', () => {
        importModal.style.display = 'flex';
        deckTextInput.value = '';
        deckFileInput.value = '';
        document.getElementById('importStatus').textContent = '';
    });

    processImportBtn.addEventListener('click', () => {
        const text = deckTextInput.value.trim();
        if (text) {
            parseAndLoadDeck(text);
        } else {
            document.getElementById('importStatus').textContent = 'Please paste a decklist or select a file.';
            document.getElementById('importStatus').style.color = 'red';
        }
    });

    deckFileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                deckTextInput.value = event.target.result;
                // Auto-import after file load
                parseAndLoadDeck(event.target.result);
            };
            reader.readAsText(file);
        }
    });

    // Close Modals with buttons/backdrop
    if (modalCloseButton) modalCloseButton.addEventListener('click', () => cardModal.style.display = 'none');
    if (cardModal) cardModal.addEventListener('click', (e) => { if (e.target === cardModal) cardModal.style.display = 'none'; });
    if (importModal) importModal.addEventListener('click', (e) => { if (e.target === importModal) importModal.style.display = 'none'; });
    
    // Export Options Modal Listeners
    if (exportOptionsModalCloseBtn) exportOptionsModalCloseBtn.addEventListener('click', () => exportOptionsModal.style.display = 'none');
    if (exportOptionsModal) exportOptionsModal.addEventListener('click', (e) => { 
        if (e.target === exportOptionsModal) exportOptionsModal.style.display = 'none'; 
    });
    
    exportPlaytestBtn.addEventListener('click', async () => {
        exportOptionsModal.style.display = 'none';
        await exportDeckAsImage('playtest');
    });
    
    exportOfficialBtn.addEventListener('click', async () => {
        exportOptionsModal.style.display = 'none';
        await exportDeckAsImage('official');
    });
    
    exportFullBtn.addEventListener('click', async () => {
        exportOptionsModal.style.display = 'none';
        await exportDeckAsImage('hybrid');
    });
    
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            cardModal.style.display = 'none';
            importModal.style.display = 'none';
            exportOptionsModal.style.display = 'none';
            if (state.lastFocusedElement) { state.lastFocusedElement.focus(); }
        }
    });
}

