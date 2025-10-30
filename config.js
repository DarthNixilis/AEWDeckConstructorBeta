// config.js

// --- STATE MANAGEMENT ---
export let cardDatabase = [];
export let keywordDatabase = {};
export let startingDeck = [];
export let purchaseDeck = [];
export let selectedWrestler = null;
export let selectedManager = null;
export let activeFilters = [{}, {}, {}];
export let currentViewMode = 'grid';
export let currentSort = 'alpha-asc';
export let showZeroCost = true;
export let showNonZeroCost = true;
export let numGridColumns = 2;
export let lastFocusedElement;
export let cardTitleCache = {}; // NEW: For performance

export const CACHE_KEY = 'aewDeckBuilderCache';

// --- SETTERS ---
export function setCardDatabase(db) { cardDatabase = db; }
export function setKeywordDatabase(db) { keywordDatabase = db; }
export function setStartingDeck(deck) { startingDeck = deck; }
export function setPurchaseDeck(deck) { purchaseDeck = deck; }
export function setSelectedWrestler(wrestler) { selectedWrestler = wrestler; }
export function setSelectedManager(manager) { selectedManager = manager; }
export function setActiveFilters(filters) { activeFilters = filters; }
export function setCurrentViewMode(mode) { currentViewMode = mode; }
export function setCurrentSort(sort) { currentSort = sort; }
export function setShowZeroCost(value) { showZeroCost = value; }
export function setShowNonZeroCost(value) { showNonZeroCost = value; }
export function setNumGridColumns(num) { numGridColumns = num; }
export function setLastFocusedElement(el) { lastFocusedElement = el; }

// NEW: Build the card cache for faster lookups
export function buildCardTitleCache() {
    cardTitleCache = {};
    cardDatabase.forEach(card => {
        if (card && card.title) {
            cardTitleCache[card.title] = card;
        }
    });
}

// --- UTILITY FUNCTIONS ---
export function toPascalCase(str) {
    if (!str) return '';
    return str.replace(/[^a-zA-Z0-9\s]+/g, '').split(/\s+/).map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join('');
}

export function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// --- CACHING LOGIC ---
export function saveStateToCache() {
    const state = {
        wrestler: selectedWrestler ? selectedWrestler.title : null,
        manager: selectedManager ? selectedManager.title : null,
        startingDeck: startingDeck,
        purchaseDeck: purchaseDeck
    };
    localStorage.setItem(CACHE_KEY, JSON.stringify(state));
}

// --- SHARED HELPER FUNCTIONS ---
export function isKitCard(card) {
    return card && typeof card['Wrestler Kit'] === 'string' && card['Wrestler Kit'].toUpperCase() === 'TRUE';
}

export function isSignatureFor(card) {
    if (!card || !card['Signature For']) return false;
    const activePersonaTitles = [];
    if (selectedWrestler) activePersonaTitles.push(selectedWrestler.title);
    if (selectedManager) activePersonaTitles.push(selectedManager.title);
    return activePersonaTitles.includes(card['Signature For']);
}

