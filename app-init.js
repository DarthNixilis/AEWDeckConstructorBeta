// app-init.js
import * as state from './state.js';
import * as renderer from './ui-renderer.js';
import * as filters from './filters.js';
import { initializeEventListeners } from './listeners.js';

export function initializeApp() {
    console.log('initializeApp: Starting...');
    
    const loadingOverlay = document.getElementById('loading-overlay');
    const appContainer = document.getElementById('app-container');
    if (loadingOverlay) loadingOverlay.style.display = 'none';
    if (appContainer) appContainer.style.display = 'block';

    state.loadStateFromCache();
    console.log('initializeApp: State loaded from cache.');

    populatePersonaSelectors();
    console.log('initializeApp: Persona selectors populated.');

    filters.renderCascadingFilters();
    console.log('initializeApp: Cascading filters rendered.');

    renderer.renderDecks();
    renderer.renderPersonaDisplay();
    console.log('initializeApp: Decks and persona display rendered.');

    initializeEventListeners();
    console.log('initializeApp: Event listeners initialized.');

    console.log('initializeApp: Triggering initial card pool render...');
    const filteredCards = filters.getFilteredAndSortedCardPool();
    console.log(`initializeApp: Filtered cards count = ${filteredCards.length}`);
    renderer.renderCardPool(filteredCards);
    console.log('initializeApp: Card pool rendered.');
    
    console.log('App initialized and is now visible.');
}

function populatePersonaSelectors() {
    const wrestlerSelect = document.getElementById('wrestlerSelect');
    const managerSelect = document.getElementById('managerSelect');
    if (!wrestlerSelect || !managerSelect) return;
    
    wrestlerSelect.length = 1;
    managerSelect.length = 1;
    
    const wrestlers = state.cardDatabase.filter(c => c && c.type === 'Wrestler').sort((a, b) => a.title.localeCompare(b.title));
    const managers = state.cardDatabase.filter(c => c && c.type === 'Manager').sort((a, b) => a.title.localeCompare(b.title));
    
    wrestlers.forEach(w => wrestlerSelect.add(new Option(w.title, w.title)));
    managers.forEach(m => managerSelect.add(new Option(m.title, m.title)));
    
    if (state.selectedWrestler) wrestlerSelect.value = state.selectedWrestler.title;
    if (state.selectedManager) managerSelect.value = state.selectedManager.title;
}

