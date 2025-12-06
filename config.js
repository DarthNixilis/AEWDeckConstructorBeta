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

// State management functions
export function setCardDatabase(cards) {
    appState.cardDatabase = cards;
}

export function setKeywordDatabase(keywords) {
    appState.keywordDatabase = keywords;
}

export function setStartingDeck(deck) {
    appState.deck.starting = deck;
}

export function setPurchaseDeck(deck) {
    appState.deck.purchase = deck;
}

export function setSelectedWrestler(wrestler) {
    appState.deck.selectedWrestler = wrestler;
}

export function setSelectedManager(manager) {
    appState.deck.selectedManager = manager;
}

export function setCurrentSort(sort) {
    appState.view.cardPool.sort = sort;
}

export function setCurrentViewMode(mode) {
    appState.view.cardPool.mode = mode;
}

export function setDeckViewMode(mode) {
    appState.view.deck.mode = mode;
}

export function setNumGridColumns(columns) {
    appState.view.cardPool.gridColumns = parseInt(columns);
}

export function setNumDeckGridColumns(columns) {
    appState.view.deck.gridColumns = parseInt(columns);
}

export function setShowZeroCost(show) {
    appState.view.cardPool.showZeroCost = show;
}

export function setShowNonZeroCost(show) {
    appState.view.cardPool.showNonZeroCost = show;
}

export function setShowSetCore(show) {
    appState.view.cardPool.showSetCore = show;
}

export function setShowSetAdvanced(show) {
    appState.view.cardPool.showSetAdvanced = show;
}

export function setUsePlaytestProxies(use) {
    appState.view.cardPool.usePlaytestProxies = use;
}

export function setActiveFilters(filters) {
    appState.view.cardPool.filters = filters;
}

export function setStartingDeckExpanded(expanded) {
    appState.view.deck.expanded.starting = expanded;
}

export function setPurchaseDeckExpanded(expanded) {
    appState.view.deck.expanded.purchase = expanded;
}

// Unified state update function
export function updateAppState(path, value) {
    const pathParts = path.split('.');
    let current = appState;
    
    for (let i = 0; i < pathParts.length - 1; i++) {
        if (current[pathParts[i]] === undefined) {
            console.error(`Invalid path in updateAppState: ${path}`);
            return;
        }
        current = current[pathParts[i]];
    }
    
    current[pathParts[pathParts.length - 1]] = value;

    // Only save the deck state to cache, not the entire app state
    if (path.startsWith('deck.')) {
        saveStateToCache();
    }
}

// Helper functions
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

export function saveStateToCache() {
    const deckState = {
        wrestler: appState.deck.selectedWrestler ? appState.deck.selectedWrestler.title : null,
        manager: appState.deck.selectedManager ? appState.deck.selectedManager.title : null,
        startingDeck: appState.deck.starting,
        purchaseDeck: appState.deck.purchase
    };
    localStorage.setItem(CACHE_KEY, JSON.stringify(deckState));
}

export function buildCardTitleCache() {
    appState.cardTitleCache = {};
    appState.cardDatabase.forEach(card => {
        if (card && card.title) {
            appState.cardTitleCache[card.title] = card;
        }
    });
}

export function isKitCard(card) {
    return card && typeof card['Wrestler Kit'] === 'string' && card['Wrestler Kit'].toUpperCase() === 'TRUE';
}

export function isSignatureFor(card) {
    if (!card || !card['Signature For']) return false;
    const activePersonaTitles = [];
    if (appState.deck.selectedWrestler) activePersonaTitles.push(appState.deck.selectedWrestler.title);
    if (appState.deck.selectedManager) activePersonaTitles.push(appState.deck.selectedManager.title);
    return activePersonaTitles.includes(card['Signature For']);
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
export const lastFocusedElement = appState.ui.lastFocusedElement;
