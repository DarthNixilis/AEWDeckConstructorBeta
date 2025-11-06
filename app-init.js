// app-init.js
import * as state from './state.js';
import * as renderer from './ui-renderer.js';
import * as filters from './filters.js';
import { initializeEventListeners } from './listeners.js';

export function initializeApp() {
    if (window.debug) window.debug.log('initializeApp: Starting...');
    
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

function populatePersonaSelectors() {
    const wrestlerSelect = document.getElementById('wrestlerSelect');
    const managerSelect = document.getElementById('managerSelect');
    if (!wrestlerSelect || !managerSelect) return;
    
    wrestlerSelect.length = 1;
    managerSelect.length = 1;
    
    // Corrected type names from your data
    const wrestlers = state.cardDatabase.filter(c => c && c.type === 'Wrestler').sort((a, b) => a.title.localeCompare(b.title));
    const managers = state.cardDatabase.filter(c => c && c.type === 'Manager').sort((a, b) => a.title.localeCompare(b.title));
    
    if (window.debug) window.debug.log(`Found ${wrestlers.length} wrestlers and ${managers.length} managers`);
    
    wrestlers.forEach(w => wrestlerSelect.add(new Option(w.title, w.title)));
    managers.forEach(m => managerSelect.add(new Option(m.title, m.title)));
    
    if (state.selectedWrestler) wrestlerSelect.value = state.selectedWrestler;
    if (state.selectedManager) managerSelect.value = state.selectedManager;
}

