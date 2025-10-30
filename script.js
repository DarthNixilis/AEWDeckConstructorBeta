// script.js

import * as state from './config.js';
import * as ui from './ui.js';
import * as deck from './deck.js';

// --- DOM ELEMENT REFERENCES ---
const searchInput = document.getElementById('searchInput');
const cascadingFiltersContainer = document.getElementById('cascadingFiltersContainer');
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

// --- DATA LOADING ---
async function loadGameData() {
    try {
        document.getElementById('searchResults').innerHTML = '<p>Loading card data...</p>';
        const [cardResponse, keywordResponse] = await Promise.all([
            fetch(`./cardDatabase.txt?v=${new Date().getTime()}`),
            fetch(`./keywords.txt?v=${new Date().getTime()}`)
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

        initializeApp();

    } catch (error) {
        console.error("Fatal Error during data load:", error);
        document.getElementById('searchResults').innerHTML = `<div style="color: red; padding: 20px; text-align: center;"><strong>FATAL ERROR:</strong> ${error.message}<br><br><button onclick="location.reload()">Retry</button></div>`;
    }
}

// --- INITIALIZATION & EVENT LISTENERS ---
function initializeApp() {
    populatePersonaSelectors();
    loadStateFromCache();
    setupEventListeners();
    
    // Initial render
    ui.renderDecks();
    ui.renderPersonaDisplay(state.selectedWrestler, state.selectedManager);
    refreshCardPool();
}

function populatePersonaSelectors() {
    wrestlerSelect.length = 1;
    managerSelect.length = 1;
    const wrestlers = state.cardDatabase.filter(c => c && c.card_type === 'Wrestler').sort((a, b) => a.title.localeCompare(b.title));
    const managers = state.cardDatabase.filter(c => c && c.card_type === 'Manager').sort((a, b) => a.title.localeCompare(b.title));
    wrestlers.forEach(w => wrestlerSelect.add(new Option(w.title, w.title)));
    managers.forEach(m => managerSelect.add(new Option(m.title, m.title)));
}

function refreshCardPool() {
    // This function will gather all filtered and sorted cards and pass them to the UI renderer
    const query = searchInput.value.toLowerCase();
    let cards = state.cardDatabase.filter(card => {
        if (!card || !card.title) return false; 
        if (card.card_type === 'Wrestler' || card.card_type === 'Manager' || deck.isKitCard(card)) return false;
        if (!state.showZeroCost && card.cost === 0) return false;
        if (!state.showNonZeroCost && card.cost > 0) return false;
        const rawText = card.text_box?.raw_text || '';
        return query === '' || card.title.toLowerCase().includes(query) || rawText.toLowerCase().includes(query);
    });
    // Apply cascading filters and sort
    // ... logic to apply activeFilters and currentSort ...
    ui.renderCardPool(cards);
}

function setupEventListeners() {
    searchInput.addEventListener('input', debounce(refreshCardPool, 300));
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

    document.getElementById('searchResults').addEventListener('click', (e) => {
        const target = e.target;
        const cardTitle = target.dataset.title || target.closest('[data-title]')?.dataset.title;
        if (!cardTitle) return;

        if (target.tagName === 'BUTTON') {
            deck.addCardToDeck(cardTitle, target.dataset.deckTarget);
        } else {
            ui.showCardModal(cardTitle);
        }
    });

    // Event listeners for deck lists and persona display
    [document.getElementById('startingDeckList'), document.getElementById('purchaseDeckList'), document.getElementById('personaDisplay')].forEach(container => {
        container.addEventListener('click', (e) => {
            const target = e.target;
            const cardTitle = target.dataset.title || target.closest('[data-title]')?.dataset.title;
            if (!cardTitle) return;

            if (target.tagName === 'BUTTON' && target.dataset.deck) {
                deck.removeCardFromDeck(cardTitle, target.dataset.deck);
            } else {
                ui.showCardModal(cardTitle);
            }
        });
    });

    wrestlerSelect.addEventListener('change', (e) => {
        const newWrestler = state.cardDatabase.find(c => c.title === e.target.value) || null;
        state.setSelectedWrestler(newWrestler);
        ui.renderPersonaDisplay(state.selectedWrestler, state.selectedManager);
        refreshCardPool();
        state.saveStateToCache();
    });
    managerSelect.addEventListener('change', (e) => {
        const newManager = state.cardDatabase.find(c => c.title === e.target.value) || null;
        state.setSelectedManager(newManager);
        ui.renderPersonaDisplay(state.selectedWrestler, state.selectedManager);
        refreshCardPool();
        state.saveStateToCache();
    });

    exportDeckBtn.addEventListener('click', () => {
        const issues = deck.validateDeck();
        if (issues.length > 0) {
            alert("Deck is not valid:\n" + issues.join("\n"));
            return;
        }
        const text = deck.generatePlainTextDeck();
        const blob = new Blob([text], { type: 'text/plain' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `${toPascalCase(state.selectedWrestler.title)}Deck.txt`;
        a.click();
        URL.revokeObjectURL(a.href);
    });

    clearDeckBtn.addEventListener('click', () => {
        if (confirm('Clear both decks and reset persona?')) {
            wrestlerSelect.value = "";
            managerSelect.value = "";
            state.setSelectedWrestler(null);
            state.setSelectedManager(null);
            state.setStartingDeck([]);
            state.setPurchaseDeck([]);
            localStorage.removeItem(state.CACHE_KEY);
            ui.renderDecks();
            ui.renderPersonaDisplay(null, null);
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
        if (text) {
            deck.parseAndLoadDeck(text);
        } else if (deckFileInput.files.length > 0) {
            const reader = new

