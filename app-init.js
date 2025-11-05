// app-init.js
import * as state from './state.js';
import * as renderer from './ui-renderer.js';
import * as filters from './filters.js';
import { initializeEventListeners } from './listeners.js';
import { logToScreen } from './utils.js';

export function initializeApp() {
    logToScreen('initializeApp: Starting...');
    
    state.loadStateFromCache();
    logToScreen('initializeApp: State loaded from cache.');

    populatePersonaSelectors();
    logToScreen('initializeApp: Persona selectors populated.');

    filters.renderCascadingFilters();
    logToScreen('initializeApp: Cascading filters rendered.');

    setupInitialViewMode();
    logToScreen('initializeApp: Initial view mode UI set.');

    renderer.renderDecks();
    renderer.renderPersonaDisplay();
    logToScreen('initializeApp: Decks and persona display rendered.');

    initializeEventListeners();
    logToScreen('initializeApp: Event listeners initialized.');

    logToScreen('initializeApp: Triggering initial card pool render...');
    document.dispatchEvent(new CustomEvent('filtersChanged'));
    logToScreen('initializeApp: "filtersChanged" event dispatched.');
}

// ... (populatePersonaSelectors and setupInitialViewMode functions remain the same)
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

function setupInitialViewMode() {
    const viewModeToggle = document.getElementById('viewModeToggle');
    if (!viewModeToggle) return;
    viewModeToggle.textContent = state.currentViewMode === 'list' ? 'Switch to Grid View' : 'Switch to List View';
    document.querySelectorAll('#gridSizeControls button').forEach(btn => btn.classList.remove('active'));
    const activeGridButton = document.querySelector(`#gridSizeControls button[data-columns="${state.numGridColumns}"]`);
    if (activeGridButton) activeGridButton.classList.add('active');
}

