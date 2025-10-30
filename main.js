// main.js

import * as state from './config.js';
import * as ui from './ui.js';
import * as deck from './deck.js';
import * as filters from './filters.js';

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

// --- NEW: FALLBACK TEST DATA ---
function createTestData() {
    console.warn("FALLBACK: Creating test data because live files failed to load.");
    
    const testCards = [
        { title: "Test Strike", card_type: "Strike", cost: 0, damage: 5, momentum: 3, text_box: { raw_text: "A basic test strike maneuver.", keywords: [{name: "Power Attack"}], traits: [{name: "Target", value: "H"}] } },
        { title: "Test Grapple", card_type: "Grapple", cost: 3, damage: 6, momentum: 4, text_box: { raw_text: "A basic test grapple maneuver.", keywords: [{name: "Finisher"}], traits: [{name: "Target", value: "T"}] } },
        { title: "Test Action", card_type: "Action", cost: 0, damage: null, momentum: 2, text_box: { raw_text: "A test action.", keywords: [{name: "Permanent"}], traits: [] } },
        { title: "MJF", card_type: "Wrestler", cost: null, damage: null, momentum: null, text_box: { raw_text: "", keywords: [], traits: [] } },
        { title: "Another Card", card_type: "Strike", cost: 4, damage: 8, momentum: 5, text_box: { raw_text: "Another powerful strike.", keywords: [], traits: [] } }
    ];
    
    const testKeywords = {
        "Power Attack": "Add momentum to damage when committed",
        "Finisher": "Powerful finishing maneuver",
        "Permanent": "Stays in play after use"
    };
    
    state.setCardDatabase(testCards);
    state.setKeywordDatabase(testKeywords);
    state.buildCardTitleCache();
    
    // Pre-populate decks for testing
    state.setSelectedWrestler(testCards.find(c => c.title === "MJF"));
    state.setStartingDeck(["Test Strike", "Test Action"]);
    state.setPurchaseDeck(["Test Grapple", "Another Card", "Test Grapple"]);
    
    return true;
}

// --- DATA LOADING ---
async function loadGameData() {
    try {
        searchResults.innerHTML = '<p>Loading card data from repository...</p>';
        
        const cardDbUrl = `./cardDatabase.txt?v=${new Date().getTime()}`;
        const keywordsUrl = `./keywords.txt?v=${new Date().getTime()}`;

        const [cardResponse, keywordResponse] = await Promise.all([
            fetch(cardDbUrl),
            fetch(keywordsUrl)
        ]);

        if (!cardResponse.ok || !keywordResponse.ok) {
            throw new Error(`File loading failed (Status: ${cardResponse.status}, ${keywordResponse.status}) - using test data instead.`);
        }
        
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
        state.buildCardTitleCache();

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

        initializeApp();

    } catch (error) {
        console.warn("Using test data for development:", error.message);
        createTestData(); // Load the fallback data
        initializeApp(); // Initialize the app with the test data
    }
}

// --- INITIALIZATION & EVENT LISTENERS ---
function initializeApp() {
    setupEventListeners();
    addDeckSearchFunctionality();
    
    viewModeToggle.textContent = state.currentViewMode === 'list' ? 'Switch to Grid View' : 'Switch to List View';
    gridSizeControls.querySelectorAll('button').forEach(btn => btn.classList.remove('active'));
    gridSizeControls.querySelector(`[data-columns="${state.numGridColumns}"]`).classList.add('active');

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
    // Don't reset selected wrestler/manager if they are already set by test data
    if (!state.selectedWrestler) state.setSelectedWrestler(null);
    if (!state.selectedManager) state.setSelectedManager(null);
    
    wrestlerSelect.length = 1;
    managerSelect.length = 1;
    const wrestlers = state.cardDatabase.filter(c => c && c.card_type === 'Wrestler').sort((a, b) => a.title.localeCompare(b.title));
    const managers = state.cardDatabase.filter(c => c && c.card_type === 'Manager').sort((a, b) => a.title.localeCompare(b.title));
    wrestlers.forEach(w => wrestlerSelect.add(new Option(w.title, w.title)));
    managers.forEach(m => managerSelect.add(new Option(m.title, m.title)));

    // If a wrestler was pre-selected (by test data), make sure the dropdown reflects it
    if (state.selectedWrestler) {
        wrestlerSelect.value = state.selectedWrestler.title;
    }
}

function loadStateFromCache() {
    const cachedState = localStorage.getItem(state.CACHE_KEY);
    if (cachedState) {
        const parsed = JSON.parse(cachedState);
        // Only load from cache if test data wasn't used.
        if (state.startingDeck.length === 0 && state.purchaseDeck.length === 0) {
            state.setStartingDeck(parsed.startingDeck || []);
            state.setPurchaseDeck(parsed.purchaseDeck || []);
        }
        if (parsed.wrestler && !state.selectedWrestler) {
            const wrestlerExists = Array.from(wrestlerSelect.options).some(opt => opt.value === parsed.wrestler);
            if (wrestlerExists) {
                wrestlerSelect.value = parsed.wrestler;
                state.setSelectedWrestler(state.cardDatabase.find(c => c.title === parsed.wrestler));
            }
        }
        if (parsed.manager && !state.selectedManager) {
            const managerExists = Array.from(managerSelect.options).some(opt => opt.value === parsed.manager);
            if (managerExists) {
                managerSelect.value = parsed.manager;
                state.setSelectedManager(state.cardDatabase.find(c => c.title === parsed.manager));
            }
        }
    }
}

function refreshCardPool() {
    const finalCards = filters.getFilteredAndSortedCardPool();
    ui.renderCardPool(finalCards);
}

function addDeckSearchFunctionality() {
    // Prevent adding search bars twice if app re-initializes
    if (document.querySelector('.deck-search-input')) return;

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
    // Prevent adding listeners multiple times
    if (document.body.dataset.listenersAttached) return;
    document.body.dataset.listenersAttached = 'true';

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
        if (target.tagName === 'BUTTON') deck.addCardToDeck(cardTitle, target.dataset.deckTarget);
        else ui.showCardModal(cardTitle);
    });

    [startingDeckList, purchaseDeckList, document.getElementById('personaDisplay')].forEach(container => {
        container.addEventListener('click', (e) => {
            const target = e.target;
            const cardTitle = target.dataset.title || target.closest('[data-title]')?.dataset.title;
            if (!cardTitle) return;
            if (target.tagName === 'BUTTON' && target.dataset.deck) deck.removeCardFromDeck(cardTitle, target.dataset.deck);
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
        state.setCurrentViewMode(state.currentViewMode === 'list' ? 'grid' : 'list');
        viewModeToggle.textContent = state.currentViewMode === 'list' ? 'Switch to Grid View' : 'Switch to List View';
        refreshCardPool();
    });

    exportDeckBtn.addEventListener('click', () => {
        const text = deck.generatePlainTextDeck();
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

    exportAsImageBtn.addEventListener('click', deck.exportDeckAsImage);

    clearDeckBtn.addEventListener('click', () => {
        if (confirm('Are you sure you want to clear both decks and reset your persona?')) {
            wrestlerSelect.value = "";
            managerSelect.value = "";
            state.setSelectedWrestler(null);
            state.setSelectedManager(null);
            localStorage.removeItem(state.CACHE_KEY);
            state.setStartingDeck([]);
            state.setPurchaseDeck([]);
            ui.renderDecks();
            ui.renderPersonaDisplay();
            refreshCardPool();
        }
    });

    importDeckBtn.addEventListener('click', () => {
        importModal.style.display = 'flex';
        document.getElementById('importStatus').textContent = '';
        deckTextInput.value = '';
        deckFileInput.value = '';
    });
    importModalCloseBtn.addEventListener('click', () => { importModal.style.display = 'none'; });
    processImportBtn.addEventListener('click', () => {
        const text = deckTextInput.value;
        if (text) deck.parseAndLoadDeck(text);
        else if (deckFileInput.files.length > 0) {
            const reader = new FileReader();
            reader.onload = (e) => { deck.parseAndLoadDeck(e.target.result); };
            reader.readAsText(deckFileInput.files[0]);
        } else {
            document.getElementById('importStatus').textContent = 'Please paste a decklist or select a file.';
            document.getElementById('importStatus').style.color = 'orange';
        }
    });

    modalCloseButton.addEventListener('click', () => {
        cardModal.style.display = 'none';
        if (state.lastFocusedElement) state.lastFocusedElement.focus();
    });
    cardModal.addEventListener('click', (e) => {
        if (e.target === cardModal) {
            cardModal.style.display = 'none';
            if (state.lastFocusedElement) state.lastFocusedElement.focus();
        }
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

