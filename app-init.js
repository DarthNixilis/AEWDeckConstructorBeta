import * as state from './state.js';
import * as renderer from './ui-renderer.js';
import * as filters from './filters.js';
import { initializeEventListeners } from './listeners.js';

let isInitialized = false;

export function initializeApp() {
    if (isInitialized) return;
    isInitialized = true;
    state.loadStateFromCache();
    populatePersonaSelectors();
    filters.renderCascadingFilters();
    setupInitialUI();
    renderer.renderDecks();
    renderer.renderPersonaDisplay();
    initializeEventListeners();
    document.dispatchEvent(new CustomEvent('filtersChanged'));
}

function populatePersonaSelectors() {
    const wrestlerSelect = document.getElementById('wrestlerSelect');
    const managerSelect = document.getElementById('managerSelect');
    wrestlerSelect.length = 1;
    managerSelect.length = 1;
    const wrestlers = state.cardDatabase.filter(c => c && c.type === 'Wrestler').sort((a, b) => a.title.localeCompare(b.title));
    const managers = state.cardDatabase.filter(c => c && c.type === 'Manager').sort((a, b) => a.title.localeCompare(b.title));
    wrestlers.forEach(w => wrestlerSelect.add(new Option(w.title, w.title)));
    managers.forEach(m => managerSelect.add(new Option(m.title, m.title)));
    if (state.selectedWrestler) wrestlerSelect.value = state.selectedWrestler.title;
    if (state.selectedManager) managerSelect.value = state.selectedManager.title;
}

function setupInitialUI() {
    document.getElementById('viewModeToggle').textContent = state.currentViewMode === 'list' ? 'Switch to Grid View' : 'Switch to List View';
    const activeGridButton = document.querySelector(`#gridSizeControls button[data-columns="${state.numGridColumns}"]`);
    if (activeGridButton) activeGridButton.classList.add('active');
}

