// state.js
import { CACHE_KEY } from './utils.js';

// --- FIX: DO NOT IMPORT THE DEBUG MANAGER. ---
// This breaks the final circular dependency.

// --- State Variables ---
export let cardDatabase = [];
export let keywordDatabase = {};
export let cardTitleCache = {};
export let startingDeck = [];
export let purchaseDeck = [];
export let selectedWrestler = null;
export let selectedManager = null;
export let currentViewMode = 'list';
export let numGridColumns = 3;
export let currentSort = 'alpha-asc';
export let showZeroCost = true;
export let showNonZeroCost = true;
export const searchIndex = new Map();

// --- State Observer Pattern ---
const stateListeners = new Map();

export function subscribeState(key, callback) {
    if (!stateListeners.has(key)) stateListeners.set(key, new Set());
    stateListeners.get(key).add(callback);
}

function notifyStateChange(key, value) {
    const listeners = stateListeners.get(key);
    if (listeners) {
        listeners.forEach(callback => callback(value));
    }
    if (key === 'deckChanged' || key === 'personaChanged') {
        saveStateToCache();
    }
}

// --- State Setters (Mutations) ---
export function setCardDatabase(data) { cardDatabase = data; cardTitleCache = Object.fromEntries(data.map(card => [card.title, card])); }
export function setKeywordDatabase(data) { keywordDatabase = data; }
export function setStartingDeck(deck) { startingDeck = deck; notifyStateChange('deckChanged', deck); }
export function setPurchaseDeck(deck) { purchaseDeck = deck; notifyStateChange('deckChanged', deck); }
export function setSelectedWrestler(wrestler) { selectedWrestler = wrestler; notifyStateChange('personaChanged', wrestler); }
export function setSelectedManager(manager) { selectedManager = manager; notifyStateChange('personaChanged', manager); }
export function setCurrentViewMode(mode) { currentViewMode = mode; }
export function setNumGridColumns(cols) { numGridColumns = cols; }
export function setCurrentSort(sort) { currentSort = sort; }
export function setShowZeroCost(value) { showZeroCost = value; }
export function setShowNonZeroCost(value) { showNonZeroCost = value; }

// --- Search Index ---
export function buildSearchIndex() {
    // --- FIX: Safely check for the global debug object. ---
    if (window.debug) window.debug.startTimer('buildSearchIndex');
    
    searchIndex.clear();
    cardDatabase.forEach((card) => {
        if (!card || !card.title) return;
        const searchableText = `${card.title} ${card.card_raw_game_text || ''} ${card.type || ''} ${card.traits?.join(' ') || ''} ${card.keywords?.join(' ') || ''}`.toLowerCase();
        const words = new Set(searchableText.match(/[\w'-]+/g) || []);
        words.forEach(word => {
            if (word.length < 2) return;
            if (!searchIndex.has(word)) searchIndex.set(word, new Set());
            searchIndex.get(word).add(card.title);
        });
    });

    if (window.debug) window.debug.endTimer('buildSearchIndex');
}

// --- Caching and State Snapshots ---
export function saveStateToCache() {
    const stateToCache = {
        startingDeck,
        purchaseDeck,
        wrestler: selectedWrestler ? selectedWrestler.title : null,
        manager: selectedManager ? selectedManager.title : null,
    };
    localStorage.setItem(CACHE_KEY, JSON.stringify(stateToCache));
    if (window.debug) window.debug.log('State saved to cache.');
}

export function loadStateFromCache() {
    const cachedState = localStorage.getItem(CACHE_KEY);
    if (cachedState) {
        try {
            const parsed = JSON.parse(cachedState);
            setStartingDeck(parsed.startingDeck || []);
            setPurchaseDeck(parsed.purchaseDeck || []);
            if (parsed.wrestler) setSelectedWrestler(cardTitleCache[parsed.wrestler] || null);
            if (parsed.manager) setSelectedManager(cardTitleCache[parsed.manager] || null);
        } catch (e) {
            if (window.debug) window.debug.error("Failed to load from cache:", e);
            localStorage.removeItem(CACHE_KEY);
        }
    }
}

export function getStateSnapshot() {
    return {
        cardCount: cardDatabase.length,
        keywordCount: Object.keys(keywordDatabase).length,
        startingDeckSize: startingDeck.length,
        purchaseDeckSize: purchaseDeck.length,
        selectedWrestler: selectedWrestler?.title,
        selectedManager: selectedManager?.title,
        viewMode: currentViewMode,
        searchIndexSize: searchIndex.size
    };
}

