// app-init.js
import * as state from './state.js';
import * as renderer from './ui-renderer.js';
import * as filters from './filters.js';
import { initializeEventListeners } from './listeners.js';

export function initializeApp() {
    console.log("initializeApp: STARTING");

    // 1. Load any saved state from the previous session.
    state.loadStateFromCache();
    console.log("initializeApp: State loaded from cache.");

    // 2. Populate UI elements that need the full card list.
    populatePersonaSelectors();
    console.log("initializeApp: Persona selectors populated.");

    // 3. Create the filter dropdowns.
    filters.renderCascadingFilters();
    console.log("initializeApp: Cascading filters rendered.");

    // 4. Set up the initial view mode and grid buttons.
    setupInitialViewMode();
    console.log("initializeApp: Initial view mode UI set.");

    // 5. Render the decks based on the loaded state.
    renderer.renderDecks();
    renderer.renderPersonaDisplay();
    console.log("initializeApp: Decks and persona display rendered.");

    // 6. Attach all event listeners to make the UI interactive.
    initializeEventListeners();
    console.log("initializeApp: Event listeners initialized.");

    // 7. BRUTE FORCE RENDER: Manually get the cards and render the pool.
    // This bypasses any potential event listener race conditions.
    console.log("initializeApp: Forcing initial card pool render...");
    const initialCards = filters.getFilteredAndSortedCardPool();
    renderer.renderCardPool(initialCards);
    console.log(`initializeApp: Initial render complete. ${initialCards.length} cards shown.`);
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

function setupInitialViewMode() {
    const viewModeToggle = document.getElementById('viewModeToggle');
    if (!viewModeToggle) return;
    viewModeToggle.textContent = state.currentViewMode === 'list' ? 'Switch to Grid View' : 'Switch to List View';
    document.querySelectorAll('#gridSizeControls button').forEach(btn => btn.classList.remove('active'));
    const activeGridButton = document.querySelector(`#gridSizeControls button[data-columns="${state.numGridColumns}"]`);
    if (activeGridButton) activeGridButton.classList.add('active');
}

