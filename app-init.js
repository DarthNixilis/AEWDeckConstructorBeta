// app-init.js
import * as state from './state.js';
import * as renderer from './ui-renderer.js';
import * as filters from './filters.js';
import { initializeEventListeners } from './listeners.js';

// Temporary debug function to verify data state
function debugCheckData() {
    if (window.debug) {
        window.debug.log('=== DEBUG DATA CHECK ===');
        window.debug.log(`cardDatabase length: ${state.cardDatabase.length}`);
        window.debug.log(`First 3 cards:`, state.cardDatabase.slice(0, 3).map(c => c.title));
        window.debug.log(`Wrestlers: ${state.cardDatabase.filter(c => c.type === 'Wrestler').length}`);
        window.debug.log(`Managers: ${state.cardDatabase.filter(c => c.type === 'Manager').length}`);
        window.debug.log('=== END DEBUG CHECK ===');
    }
}

export function initializeApp() {
    if (window.debug) window.debug.log('initializeApp: Starting...');
    
    // Run the debug check
    debugCheckData();
    
    const loadingOverlay = document.getElementById('loading-overlay');
    const appContainer = document.getElementById('app-container');
    if (loadingOverlay) loadingOverlay.style.display = 'none';
    if (appContainer) appContainer.style.display = 'block';

    state.loadStateFromCache();
    if (window.debug) window.debug.log('initializeApp: State loaded from cache.');

    populatePersonaSelectors();
    if (window.debug) window.debug.log('initializeApp: Persona selectors populated.');

    filters.renderCascadingFilters();
    if (window.debug) window.debug.log('initializeApp: Cascading filters rendered.');

    renderer.renderDecks();
    renderer.renderPersonaDisplay();
    if (window.debug) window.debug.log('initializeApp: Decks and persona display rendered.');

    initializeEventListeners();
    if (window.debug) window.debug.log('initializeApp: Event listeners initialized.');

    if (window.debug) window.debug.log('initializeApp: Triggering initial card pool render...');
    
    const filteredCards = filters.getFilteredAndSortedCardPool();
    if (window.debug) window.debug.log(`initializeApp: Filtered cards count = ${filteredCards.length}`);
    
    renderer.renderCardPool(filteredCards);
    if (window.debug) window.debug.log('initializeApp: Card pool rendered.');
    
    if (window.debug) window.debug.log('App initialized and is now visible.');
}

function populatePersonaSelectors() { /* ... same as before ... */ }

