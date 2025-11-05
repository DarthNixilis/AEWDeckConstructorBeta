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
    document.dispatchEvent(new CustomEvent('filtersChanged'));
    if (window.debug) window.debug.log('initializeApp: "filtersChanged" event dispatched.');
    
    if (window.debug) window.debug.log('App initialized and is now visible.');
}

function populatePersonaSelectors() { /* ... same as before ... */ }

