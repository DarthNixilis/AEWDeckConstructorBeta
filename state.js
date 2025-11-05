// state.js
import { CACHE_KEY } from './utils.js';

// --- State Variables ---
export let cardDatabase = [];
export let keywordDatabase = {};
export let cardTitleCache = {};
export let searchIndex = new Map(); // For fast text search
export let startingDeck = [];
export let purchaseDeck = [];
export let selectedWrestler = null;
export let selectedManager = null;
export let currentViewMode = 'list';
export let numGridColumns = 3;
export let currentSort = 'alpha-asc';
export let showZeroCost = true;
export let showNonZeroCost = true;

// --- Observer Pattern ---
const stateListeners = new Map();
function notifyStateChange(key, value) {
    if (stateListeners.has(key)) {
        stateListeners.get(key).forEach(callback => callback(value));
    }
}
export function subscribeState(key, callback) {
    if (!stateListeners.has(key)) stateListeners.set(key, new Set());
    stateListeners.get(key).add(callback);
}

// --- State Validators ---
const STATE_VALIDATORS = {
    deck: (d) => Array.isArray(d) && d.every(title => typeof title === 'string'),
    viewMode: (m) => ['list', 'grid'].includes(m),
    gridCols: (c) => [2, 3, 4].includes(Number(c)),
};

// --- Setters ---
export function setCardDatabase(data) { cardDatabase = data; cardTitleCache = Object.fromEntries(data.map(card => [card.title, card])); }
export function setKeywordDatabase(data) { keywordDatabase = data; }
export function setStartingDeck(deck) { if (STATE_VALIDATORS.deck(deck)) { startingDeck = deck; notifyStateChange('deckChanged'); saveStateToCache(); } }
export function setPurchaseDeck(deck) { if (STATE_VALIDATORS.deck(deck)) { purchaseDeck = deck; notifyStateChange('deckChanged'); saveStateToCache(); } }
export function setSelectedWrestler(w) { selectedWrestler = w; notifyStateChange('personaChanged'); saveStateToCache(); }
export function setSelectedManager(m) { selectedManager = m; notifyStateChange('personaChanged'); saveStateToCache(); }
export function setCurrentViewMode(mode) { if (STATE_VALIDATORS.viewMode(mode)) { currentViewMode = mode; saveStateToCache(); } }
export function setNumGridColumns(cols) { if (STATE_VALIDATORS.gridCols(cols)) { numGridColumns = cols; saveStateToCache(); } }
export function setCurrentSort(sort) { currentSort = sort; }
export function setShowZeroCost(value) { showZeroCost = value; }
export function setShowNonZeroCost(value) { showNonZeroCost = value; }

// --- Advanced Indexing ---
export function buildSearchIndex() {
    cardDatabase.forEach((card) => {
        if (!card || !card.title) return;
        const searchableText = `${card.title} ${card.card_raw_game_text || ''} ${card.type || ''}`.toLowerCase();
        const words = new Set(searchableText.match(/[\w'-]+/g) || []);
        words.forEach(word => {
            if (!searchIndex.has(word)) searchIndex.set(word, new Set());
            searchIndex.get(word).add(card.title);
        });
    });
}

// --- Cache Logic ---
export function saveStateToCache() {
    const stateToCache = {
        startingDeck, purchaseDeck,
        wrestler: selectedWrestler?.title,
        manager: selectedManager?.title,
        viewMode: currentViewMode,
        gridCols: numGridColumns,
    };
    localStorage.setItem(CACHE_KEY, JSON.stringify(stateToCache));
}

export function loadStateFromCache() {
    const cachedState = localStorage.getItem(CACHE_KEY);
    if (!cachedState) return;
    try {
        const parsed = JSON.parse(cachedState);
        if (STATE_VALIDATORS.deck(parsed.startingDeck)) startingDeck = parsed.startingDeck;
        if (STATE_VALIDATORS.deck(parsed.purchaseDeck)) purchaseDeck = parsed.purchaseDeck;
        if (STATE_VALIDATORS.viewMode(parsed.viewMode)) currentViewMode = parsed.viewMode;
        if (STATE_VALIDATORS.gridCols(parsed.gridCols)) numGridColumns = parsed.gridCols;
        if (parsed.wrestler) selectedWrestler = cardTitleCache[parsed.wrestler] || null;
        if (parsed.manager) selectedManager = cardTitleCache[parsed.manager] || null;
    } catch (e) {
        console.error("Failed to load from cache:", e);
        localStorage.removeItem(CACHE_KEY);
    }
}

