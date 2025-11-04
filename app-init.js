// app-init.js
import * as state from './state.js';
import * as renderer from './ui-renderer.js';
import * as filters from './filters.js';
import { initializeEventListeners } from './listeners.js';

export function initializeApp() {
    // Populate dropdowns from the state
    populatePersonaSelectors();

    // Load cached state
    state.loadStateFromCache();
    
    // Initial UI setup
    setupInitialUI();
    
    // Add deck search inputs (this is a UI setup task)
    addDeckSearchFunctionality();

    // Initial renders
    filters.renderCascadingFilters();
    renderer.renderDecks();
    renderer.renderPersonaDisplay();
    
    // Initialize all event listeners for the entire application
    initializeEventListeners(); 
    
    // Trigger initial card pool render
    const finalCards = filters.getFilteredAndSortedCardPool();
    renderer.renderCardPool(finalCards);
}

function populatePersonaSelectors() {
    const wrestlerSelect = document.getElementById('wrestlerSelect');
    const managerSelect = document.getElementById('managerSelect');
    wrestlerSelect.length = 1;
    managerSelect.length = 1;
    const wrestlers = state.cardDatabase.filter(c => c && c.card_type === 'Wrestler').sort((a, b) => a.title.localeCompare(b.title));
    const managers = state.cardDatabase.filter(c => c && c.card_type === 'Manager').sort((a, b) => a.title.localeCompare(b.title));
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

