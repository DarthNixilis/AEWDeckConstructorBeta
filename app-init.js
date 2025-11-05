// app-init.js
import * as state from './state.js';
import * as renderer from './ui-renderer.js';
import * as filters from './filters.js';
import { initializeEventListeners } from './listeners.js';
import debug from './debug-manager.js'; // Use the correct debug system

export function initializeApp() {
    debug.log('initializeApp: Starting...');
    
    // Hide the loading message and show the main application container
    const loadingMessage = document.getElementById('loading-message');
    const appContainer = document.getElementById('app-container');
    if (loadingMessage) loadingMessage.style.display = 'none';
    if (appContainer) appContainer.style.display = 'flex';

    // Load cached state first
    state.loadStateFromCache();
    debug.log('initializeApp: State loaded from cache.');

    // Populate UI elements
    populatePersonaSelectors();
    debug.log('initializeApp: Persona selectors populated.');

    filters.renderCascadingFilters();
    debug.log('initializeApp: Cascading filters rendered.');

    // Initial render based on loaded state
    renderer.renderDecks();
    renderer.renderPersonaDisplay();
    debug.log('initializeApp: Decks and persona display rendered.');

    // Attach all event listeners
    initializeEventListeners();
    debug.log('initializeApp: Event listeners initialized.');

    // Trigger the first render of the card pool
    debug.log('initializeApp: Triggering initial card pool render...');
    document.dispatchEvent(new CustomEvent('filtersChanged'));
    debug.log('initializeApp: "filtersChanged" event dispatched.');
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
    
    // Set the dropdown value based on the loaded state
    if (state.selectedWrestler) wrestlerSelect.value = state.selectedWrestler.title;
    if (state.selectedManager) managerSelect.value = state.selectedManager.title;
}

