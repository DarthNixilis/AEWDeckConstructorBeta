import { CACHE_KEY, debounce } from './config.js';

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

export function setCardDatabase(data) {
    cardDatabase = data;
    cardTitleCache = Object.fromEntries(data.map(card => [card.title, card]));
}
export function setKeywordDatabase(data) { keywordDatabase = data; }
export function setStartingDeck(deck) { startingDeck = deck; }
export function setPurchaseDeck(deck) { purchaseDeck = deck; }
export function setSelectedWrestler(wrestler) { selectedWrestler = wrestler; }
export function setSelectedManager(manager) { selectedManager = manager; }
export function setCurrentViewMode(mode) { currentViewMode = mode; }
export function setNumGridColumns(cols) { numGridColumns = cols; }
export function setCurrentSort(sort) { currentSort = sort; }
export function setShowZeroCost(value) { showZeroCost = value; }
export function setShowNonZeroCost(value) { showNonZeroCost = value; }

export function saveStateToCache() {
    const stateToCache = {
        startingDeck,
        purchaseDeck,
        wrestler: selectedWrestler ? selectedWrestler.title : null,
        manager: selectedManager ? selectedManager.title : null,
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
        setStartingDeck(parsed.startingDeck || []);
        setPurchaseDeck(parsed.purchaseDeck || []);
        setCurrentViewMode(parsed.viewMode || 'list');
        setNumGridColumns(parsed.gridCols || 3);
        if (parsed.wrestler) setSelectedWrestler(cardTitleCache[parsed.wrestler] || null);
        if (parsed.manager) setSelectedManager(cardTitleCache[parsed.manager] || null);
    } catch (e) {
        console.error("Failed to load from cache:", e);
        localStorage.removeItem(CACHE_KEY);
    }
}

export { debounce };

