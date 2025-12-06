// config.js

// Unified Application State
export const appState = {
    // Card data
    cardDatabase: [],
    keywordDatabase: {},
    cardTitleCache: {},
    
    // Deck state
    deck: {
        starting: [],
        purchase: [],
        selectedWrestler: null,
        selectedManager: null
    },
    
    // View state
    view: {
        cardPool: {
            mode: 'grid',
            sort: 'alpha-asc',
            gridColumns: 2,
            filters: [{}, {}, {}],
            showZeroCost: true,
            showNonZeroCost: true,
            showSetCore: true,
            showSetAdvanced: true,
            usePlaytestProxies: false
        },
        deck: {
            mode: 'grid',
            gridColumns: 3,
            expanded: {
                starting: false,
                purchase: false
            }
        }
    },
    
    // UI state
    ui: {
        lastFocusedElement: null
    }
};

export const CACHE_KEY = 'aewDeckBuilderCache';

// --- Utility Functions ---

/**
 * Converts a string to PascalCase (e.g., "buckshot lariat" -> "BuckshotLariat").
 * Used for generating image file names.
 */
export function toPascalCase(str) {
    if (!str) return '';
    return str.replace(/\w+/g, function(w) {
        return w[0].toUpperCase() + w.slice(1).toLowerCase();
    }).replace(/\s/g, '');
}

/**
 * Checks if a card is a Kit card (Wrestler or Manager Signature).
 */
export function isKitCard(card) {
    // Also checks if card is null/undefined before accessing properties
    return card && typeof card['Wrestler Kit'] === 'string' && card['Wrestler Kit'].toUpperCase() === 'TRUE';
}

/**
 * Checks if a card is a Signature card for the currently selected Wrestler or Manager.
 */
export function isSignatureFor(card) {
    if (!card || !card['Signature For']) return false;
    const activePersonaTitles = [];
    if (appState.deck.selectedWrestler) activePersonaTitles.push(appState.deck.selectedWrestler.title);
    if (appState.deck.selectedManager) activePersonaTitles.push(appState.deck.selectedManager.title);
    return activePersonaTitles.includes(card['Signature For']);
}

// --- State Management Functions ---

export function setCardDatabase(cards) {
    appState.cardDatabase = cards;
}

export function setKeywordDatabase(keywords) {
    appState.keywordDatabase = keywords;
}

// **CRITICAL FIX ADDED HERE**
export function buildCardTitleCache() {
    appState.cardTitleCache = {};
    appState.cardDatabase.forEach(card => {
        if (card && card.title) {
            appState.cardTitleCache[card.title] = card;
        }
    });
}

export function setStartingDeck(deck) {
    appState.deck.starting = deck;
}

export function setPurchaseDeck(deck) {
    appState.deck.purchase = deck;
}

export function setSelectedWrestler(wrestler) {
    appState.deck.selectedWrestler = wrestler;
    saveStateToCache();
}

export function setSelectedManager(manager) {
    appState.deck.selectedManager = manager;
    saveStateToCache();
}

export function setCurrentSort(sort) {
    appState.view.cardPool.sort = sort;
}

export function setViewMode(mode) {
    appState.view.cardPool.mode = mode;
}

export function setDeckViewMode(mode) {
    appState.view.deck.mode = mode;
}

export function setDeckGridColumns(cols) {
    appState.view.deck.gridColumns = cols;
}

export function setGridColumns(cols) {
    appState.view.cardPool.gridColumns = cols;
}

export function setShowZeroCost(checked) {
    appState.view.cardPool.showZeroCost = checked;
}

export function setShowNonZeroCost(checked) {
    appState.view.cardPool.showNonZeroCost = checked;
}

export function setShowSetCore(checked) {
    appState.view.cardPool.showSetCore = checked;
}

export function setShowSetAdvanced(checked) {
    appState.view.cardPool.showSetAdvanced = checked;
}

export function setUsePlaytestProxies(checked) {
    appState.view.cardPool.usePlaytestProxies = checked;
}

export function setLastFocusedElement(element) {
    appState.ui.lastFocusedElement = element;
}

export function setDeckStartingExpanded(expanded) {
    appState.view.deck.expanded.starting = expanded;
    saveStateToCache();
}

export function setDeckPurchaseExpanded(expanded) {
    appState.view.deck.expanded.purchase = expanded;
    saveStateToCache();
}

export function getActiveFilter(index) {
    return appState.view.cardPool.filters[index] || {};
}

export function setActiveFilter(index, filterObj) {
    appState.view.cardPool.filters[index] = filterObj;
}

export function clearActiveFilter(index) {
    appState.view.cardPool.filters[index] = {};
}

// Function to debounce calls (to limit the frequency of expensive operations like filtering/rendering)
export function debounce(func, delay) {
    let timeoutId;
    return function(...args) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
            func.apply(this, args);
        }, delay);
    };
}

// Function to safely update the appState and trigger cache save if needed
export function updateAppState(path, value) {
    const parts = path.split('.');
    let current = appState;
    for (let i = 0; i < parts.length - 1; i++) {
        current = current[parts[i]];
    }
    current[parts[parts.length - 1]] = value;
    saveStateToCache();
}

// Function to save only the deck-related state to local storage
function saveStateToCache() {
    const deckState = {
        wrestler: appState.deck.selectedWrestler ? appState.deck.selectedWrestler.title : null,
        manager: appState.deck.selectedManager ? appState.deck.selectedManager.title : null,
        startingDeck: appState.deck.starting,
        purchaseDeck: appState.deck.purchase,
        view: { // Save relevant view settings
            cardPool: appState.view.cardPool,
            deck: {
                mode: appState.view.deck.mode,
                gridColumns: appState.view.deck.gridColumns,
                expanded: appState.view.deck.expanded
            }
        }
    };
    localStorage.setItem(CACHE_KEY, JSON.stringify(deckState));
}

// Getters for convenience
export const currentViewMode = appState.view.cardPool.mode;
export const deckViewMode = appState.view.deck.mode;
export const numGridColumns = appState.view.cardPool.gridColumns;
export const activeFilters = appState.view.cardPool.filters;
export const showZeroCost = appState.view.cardPool.showZeroCost;
export const showNonZeroCost = appState.view.cardPool.showNonZeroCost;
export const showSetCore = appState.view.cardPool.showSetCore;
export const showSetAdvanced = appState.view.cardPool.showSetAdvanced;
export const usePlaytestProxies = appState.view.cardPool.usePlaytestProxies;
export const selectedWrestler = appState.deck.selectedWrestler;
export const selectedManager = appState.deck.selectedManager;
export const cardDatabase = appState.cardDatabase;
export const cardTitleCache = appState.cardTitleCache;
export const keywordDatabase = appState.keywordDatabase;
export const startingDeck = appState.deck.starting;
export const purchaseDeck = appState.deck.purchase;
export const isStartingDeckExpanded = appState.view.deck.expanded.starting;
export const isPurchaseDeckExpanded = appState.view.deck.expanded.purchase;

