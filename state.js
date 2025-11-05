// state.js
import { CACHE_KEY } from './utils.js';

// State Variables
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

// State Observer Pattern
const stateListeners = new Map();
export function subscribeState(key, callback) { if (!stateListeners.has(key)) stateListeners.set(key, new Set()); stateListeners.get(key).add(callback); }
function notifyStateChange(key, value) { const listeners = stateListeners.get(key); if (listeners) { listeners.forEach(callback => callback(value)); } if (key === 'deckChanged' || key === 'personaChanged') { saveStateToCache(); } }

// State Setters
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

// Search Index
export function buildSearchIndex() {
    const safeDebug = window.debug && typeof window.debug.startTimer === 'function' ? window.debug : null;
    if (safeDebug) safeDebug.startTimer('buildSearchIndex');
    
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

    if (safeDebug) safeDebug.endTimer('buildSearchIndex');
}

// Caching
export function saveStateToCache() { /* ... same as before ... */ }
export function loadStateFromCache() { /* ... same as before ... */ }
export function getStateSnapshot() { /* ... same as before ... */ }

