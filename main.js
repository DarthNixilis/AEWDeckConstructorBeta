// main.js

import * as state from './config.js';
import * as ui from './ui.js';
import * as filters from './filters.js';
import * as deckState from './deck-state.js'; // NEW
import * as deckActions from './deck-actions.js'; // NEW

// --- DOM ELEMENT REFERENCES ---
const searchInput = document.getElementById('searchInput');
const exportDeckBtn = document.getElementById('exportDeck');
const clearDeckBtn = document.getElementById('clearDeck');
const wrestlerSelect = document.getElementById('wrestlerSelect');
const managerSelect = document.getElementById('managerSelect');
const viewModeToggle = document.getElementById('viewModeToggle');
const sortSelect = document.getElementById('sortSelect');
const showZeroCostCheckbox = document.getElementById('showZeroCost');
const showNonZeroCostCheckbox = document.getElementById('showNonZeroCost');
const gridSizeControls = document.getElementById('gridSizeControls');
const importDeckBtn = document.getElementById('importDeck');
const importModal = document.getElementById('importModal');
const importModalCloseBtn = importModal.querySelector('.modal-close-button');
const deckFileInput = document.getElementById('deckFileInput');
const deckTextInput = document.getElementById('deckTextInput');
const processImportBtn = document.getElementById('processImportBtn');
const searchResults = document.getElementById('searchResults');
const cardModal = document.getElementById('cardModal');
const modalCloseButton = cardModal.querySelector('.modal-close-button');
const startingDeckList = document.getElementById('startingDeckList');
const purchaseDeckList = document.getElementById('purchaseDeckList');
const exportAsImageBtn = document.getElementById('exportAsImageBtn');

// --- DATA LOADING ---
async function loadGameData() {
    try {
        searchResults.innerHTML = '<p>Loading card data...</p>';
        const cardDbUrl = `./cardDatabase.txt?v=${new Date().getTime()}`;
        const keywordsUrl = `./keywords.txt?v=${new Date().getTime()}`;

        const [cardResponse, keywordResponse] = await Promise.all([
            fetch(cardDbUrl),
            fetch(keywordsUrl)
        ]);

        if (!cardResponse.ok) throw new Error(`Could not load cardDatabase.txt (Status: ${cardResponse.status})`);
        if (!keywordResponse.ok) throw new Error(`Could not load keywords.txt (Status: ${keywordResponse.status})`);
        
        const tsvData = await cardResponse.text();
        const cardLines = tsvData.trim().split(/\r?\n/);
        const cardHeaders = cardLines.shift().trim().split('\t').map(h => h.trim());
        const parsedCards = cardLines.map(line => {
            const values = line.split('\t');
            const card = {};
            cardHeaders.forEach((header, index) => {
                const value = (values[index] || '').trim();
                if (value === 'null' || value === '') card[header] = null;
                else if (!isNaN(value) && value !== '') card[header] = Number(value);
                else card[header] = value;
            });
            card.title = card['Card Name'];
            card.card_type = card['Type'];
            card.cost = card['Cost'] === 'N/a' ? null : card['Cost'];
            card.damage = card['Damage'] === 'N/a' ? null : card['Damage'];
            card.momentum = card['Momentum'] === 'N/a' ? null : card['Momentum'];
            card.text_box = { raw_text: card['Card Raw Game Text'] };
            if (card.Keywords) card.text_box.keywords = card.Keywords.split(',').map(name => ({ name: name.trim() })).filter(k => k.name);
            else card.text_box.keywords = [];
            if (card.Traits) card.text_box.traits = card.Traits.split(',').map(traitStr => {
                const [name, value] = traitStr.split(':');
                return { name: name.trim(), value: value ? value.trim() : undefined };
            }).filter(t => t.name);
            else card.text_box.traits = [];
            return card;
        }).filter(card => card.title);
        state.setCardDatabase(parsedCards);

        const keywordText = await keywordResponse.text();
        const parsedKeywords = {};
        const keywordLines = keywordText.trim().split(/\r?\n/);
        keywordLines.forEach(line => {
            if (line.trim() === '') return;
            const parts = line.split(':');
            if (parts.length >= 2) {
                const key = parts[0].trim();
                const value = parts.slice(1).join(':').trim();
                parsedKeywords[key] = value;
            }
        });
        state.setKeywordDatabase(parsedKeywords);
        
        state.buildCardTitleCache(); // Build the cache after loading
        initializeApp();

    } catch (error) {
        console.error("Fatal Error during data load:", error);
        searchResults.innerHTML = `<div style="color: red; padding: 20px; text-align: center;"><strong>FATAL ERROR:</strong> ${error.message}<br><br><button onclick="location.reload()">Retry</button></div>`;
    }
}

// --- INITIALIZATION & EVENT LISTENERS ---
function initializeApp() {
    setupEventListeners();
    addDeckSearchFunctionality();
    
    viewModeToggle.textContent = state.currentViewMode === 'list' ? 'Switch to Grid View' : 'Switch to List View';
    gridSizeControls.querySelectorAll('button').forEach(btn => btn.classList.remove('active'));
    const activeGridButton = gridSizeControls.querySelector(`[data-columns="${state.numGridColumns}"]`);
    if (activeGridButton) activeGridButton.classList.add('active');

    populatePersonaSelectors();
    loadStateFromCache(); 
    
    filters.renderCascadingFilters();
    ui.renderDecks();
    ui.renderPersonaDisplay();
    refreshCardPool();
}

function populatePersonaSelectors() {
    wrestlerSelect.value = "";
    managerSelect.value = "";
    state.setSelectedWrestler(null);
    state.setSelectedManager(null);
    wrestlerSelect.length = 1;
    managerSelect.length = 1;
    const wrestlers = state.cardDatabase.filter(c => c && c.card_type === 'Wrestler').sort((a, b) => a.title.localeCompare(b.title));
    const managers = state.cardDatabase.filter(c => c && c.card_type === 'Manager').sort((a, b) => a.title.localeCompare(b.title));
    wrestlers.forEach(w => wrestlerSelect.add(new Option(w.title, w.title)));
    managers.forEach(m => managerSelect.add(new Option(m.title, m.title)));
}

function loadStateFromCache() {
    const cachedState = localStorage.getItem(state.CACHE_KEY);
    if (cachedState) {
        try {
            const parsed = JSON.parse(cachedState);
            state.setStartingDeck(parsed.startingDeck || []);
            state.setPurchaseDeck(parsed.purchaseDeck || []);
            if (parsed.wrestler) {
                const wrestlerExists = Array.from(wrestlerSelect.options).some(opt => opt.value === parsed.wrestler);
                if (wrestlerExists) {
                    wrestlerSelect.value = parsed.wrestler;
                    state.setSelectedWrestler(state.cardDatabase.find(c => c.title === parsed.wrestler));
                }
            }
            if (parsed.manager) {
                const managerExists = Array.from(managerSelect.options).some(opt => opt.value === parsed.manager);
                if (managerExists) {
                    managerSelect.value = parsed.manager;
                    state.setSelectedManager(state.cardDatabase.find(c => c.title === parsed.manager));
                }
            }
        } catch (e) {
            console.error("Failed to load from cache:", e);
            localStorage.removeItem(state.CACHE_KEY); // Clear corrupted cache
        }
    }
}

function refreshCardPool() {
    const finalCards = filters.getFilteredAndSortedCardPool();
    ui.renderCardPool(finalCards);
}

function addDeckSearchFunctionality() {
    const startingDeckSearch = document.createElement('input');
    startingDeckSearch.type = 'text';
    startingDeckSearch.placeholder = 'Search starting deck...';
    startingDeckSearch.className = 'deck-search-input';
    startingDeckSearch.addEventListener('input', state.debounce(() => ui.filterDeckList(startingDeckList, startingDeckSearch.value), 300));
    
    const purchaseDeckSearch = document.createElement('input');
    purchaseDeckSearch.type = 'text';
    purchaseDeckSearch.placeholder = 'Search purchase deck...';
    purchaseDeckSearch.className = 'deck-search-input';
    purchaseDeckSearch.addEventListener('input', state.debounce(() => ui.filterDeckList(purchaseDeckList, purchaseDeckSearch.value), 300));
    
    startingDeckList.parentNode.insertBefore(startingDeckSearch, startingDeckList);
    purchaseDeckList.parentNode.insertBefore(purchaseDeckSearch, purchaseDeckList);
}

function setupEventListeners() {
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

    searchResults.addEventListener('click', (e) => {
        const target = e.target;
        const cardTitle = target.dataset.title || target.closest('[data-title]')?.dataset.title;
        if (!cardTitle) return;
        if (target.tagName === 'BUTTON') deckState.addCardToDeck(cardTitle, target.dataset.deckTarget);
        else ui.showCardModal(cardTitle);
    });

    [startingDeckList, purchaseDeckList, document.getElementById('personaDisplay')].forEach(container => {
        container.addEventListener('click', (e) => {
            const target = e.target;
            const cardTitle = target.dataset.title || target.closest('[data-title]')?.dataset.title;
            if (!cardTitle) return;
            if (target.tagName === 'BUTTON' && target.dataset.deck) deckState.removeCardFromDeck(cardTitle, target.dataset.deck);
            else ui.showCardModal(cardTitle);
        });
    });

    wrestlerSelect.addEventListener('change', (e) => {
        const newWrestler = state.cardDatabase.find(c => c.title === e.target.value) || null;
        state.setSelectedWrestler(newWrestler);
        ui.renderPersonaDisplay();
        refreshCardPool();
        state.saveStateToCache();
    });
    managerSelect.addEventListener('change', (e) => {
        const newManager = state.cardDatabase.find(c => c.title === e.target.value) || null;
        state.setSelectedManager(newManager);
        ui.renderPersonaDisplay();
        refreshCardPool();
        state.saveStateToCache();
    });

    viewModeToggle.addEventListener('click', () => {
        const newMode = state.currentViewMode === 'list' ? 'grid' : 'list';
        state.setCurrentViewMode(newMode);
        viewModeToggle.textContent = newMode === 'list' ? 'Switch to Grid View' : 'Switch to List View';
        refreshCardPool();
    });

    clearDeckBtn.addEventListener('click', () => {
        if (confirm('Are you sure you want to clear the entire deck?')) {
            state.setStartingDeck([]);
            state.setPurchaseDeck([]);
            ui.renderDecks();
        }
    });

    exportDeckBtn.addEventListener('click', () => {
        const text = deckActions.generatePlainTextDeck();
        const blob = new Blob([text], { type: 'text/plain' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        const wrestlerName = state.selectedWrestler ? state.toPascalCase(state.selectedWrestler.title) : "Deck";
        a.download = `${wrestlerName}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(a.href);
    });

    exportAsImageBtn.addEventListener('click', deckActions.exportDeckAsImage);

    importDeckBtn.addEventListener('click', () => {
        importModal.style.display = 'flex';
        document.getElementById('importStatus').textContent = '';
        deckTextInput.value = '';
        deckFileInput.value = '';
    });
    importModalCloseBtn.addEventListener('click', () => importModal.style.display = 'none');
    processImportBtn.addEventListener('click', () => {
        if (deckTextInput.value) {
            deckActions.parseAndLoadDeck(deckTextInput.value);
        }
    });
    deckFileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                deckActions.parseAndLoadDeck(event.target.result);
            };
            reader.readAsText(file);
        }
    });

    modalCloseButton.addEventListener('click', () => cardModal.style.display = 'none');
    cardModal.addEventListener('click', (e) => {
        if (e.target === cardModal) cardModal.style.display = 'none';
    });
    importModal.addEventListener('click', (e) => {
        if (e.target === importModal) importModal.style.display = 'none';
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && (cardModal.style.display === 'flex' || importModal.style.display === 'flex')) {
            cardModal.style.display = 'none';
            importModal.style.display = 'none';
            if (state.lastFocusedElement) state.lastFocusedElement.focus();
        }
    });
}

// --- START THE APP ---
loadGameData();

