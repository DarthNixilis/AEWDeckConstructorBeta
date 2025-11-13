// config.js

// NEW: Unified Application State
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

// NEW: Unified state update function
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

