// app-init.js
import * as state from './state.js';
import * as renderer from './ui-renderer.js';
import * as filters from './filters.js';
import { initializeEventListeners } from './listeners.js';

let isInitialized = false;

export function initializeApp() {
    if (isInitialized) return;
    isInitialized = true;

    populatePersonaSelectors();
    state.loadStateFromCache();
    setupInitialUI();
    addDeckSearchFunctionality();
    filters.renderCascadingFilters();
    renderer.renderDecks();
    renderer.renderPersonaDisplay();
    initializeEventListeners();
    
    const finalCards = filters.getFilteredAndSortedCardPool();
    renderer.renderCardPool(finalCards);
}

function populatePersonaSelectors() {
    const wrestlerSelect = document.getElementById('wrestlerSelect');
    const managerSelect = document.getElementById('managerSelect');
    wrestlerSelect.length = 1;
    managerSelect.length = 1;
    
    // --- THIS IS THE FIX ---
    // The parser now creates 'card_type', not 'Card Type'. We must use the standardized name.
    const wrestlers = state.cardDatabase.filter(c => c && c.type === 'Wrestler').sort((a, b) => a.title.localeCompare(b.title));
    const managers = state.cardDatabase.filter(c => c && c.type === 'Manager').sort((a, b) => a.title.localeCompare(b.title));
    // --- END OF FIX ---

    wrestlers.forEach(w => wrestlerSelect.add(new Option(w.title, w.title)));
    managers.forEach(m => managerSelect.add(new Option(m.title, m.title)));
}

function setupInitialUI() {
    const viewModeToggle = document.getElementById('viewModeToggle');
    const gridSizeControls = document.getElementById('gridSizeControls');
    viewModeToggle.textContent = state.currentViewMode === 'list' ? 'Switch to Grid View' : 'Switch to List View';
    const activeGridButton = gridSizeControls.querySelector(`[data-columns="${state.numGridColumns}"]`);
    if (activeGridButton) activeGridButton.classList.add('active');
}

function addDeckSearchFunctionality() {
    const startingDeckList = document.getElementById('startingDeckList');
    const purchaseDeckList = document.getElementById('purchaseDeckList');
    
    const startingDeckSearch = document.createElement('input');
    startingDeckSearch.type = 'text';
    startingDeckSearch.placeholder = 'Search starting deck...';
    startingDeckSearch.className = 'deck-search-input';
    startingDeckSearch.addEventListener('input', state.debounce(() => renderer.filterDeckList(startingDeckList, startingDeckSearch.value), 300));
    
    const purchaseDeckSearch = document.createElement('input');
    purchaseDeckSearch.type = 'text';
    purchaseDeckSearch.placeholder = 'Search purchase deck...';
    purchaseDeckSearch.className = 'deck-search-input';
    purchaseDeckSearch.addEventListener('input', state.debounce(() => renderer.filterDeckList(purchaseDeckList, purchaseDeckSearch.value), 300));
    
    if (!startingDeckList.previousElementSibling?.classList.contains('deck-search-input')) {
        startingDeckList.parentNode.insertBefore(startingDeckSearch, startingDeckList);
    }
    if (!purchaseDeckList.previousElementSibling?.classList.contains('deck-search-input')) {
        purchaseDeckList.parentNode.insertBefore(purchaseDeckSearch, purchaseDeckList);
    }
}

