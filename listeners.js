// listeners.js
import * as state from './state.js';
import * as renderer from './ui-renderer.js';
import * as filters from './filters.js';
import { debounce } from './utils.js';
// Importer and Exporter will be re-integrated later if this works.

function refreshCardPool() {
    console.log("listeners: refreshCardPool triggered.");
    const cards = filters.getFilteredAndSortedCardPool();
    renderer.renderCardPool(cards);
}

export function initializeEventListeners() {
    console.log("listeners: Attaching event listeners.");

    // Filter Controls
    document.getElementById('searchInput').addEventListener('input', debounce(refreshCardPool, 300));
    document.getElementById('sortSelect').addEventListener('change', (e) => { state.setCurrentSort(e.target.value); refreshCardPool(); });
    document.getElementById('showZeroCost').addEventListener('change', (e) => { state.setShowZeroCost(e.target.checked); refreshCardPool(); });
    document.getElementById('showNonZeroCost').addEventListener('change', (e) => { state.setShowNonZeroCost(e.target.checked); refreshCardPool(); });
    
    // This is a special case. The filters are created dynamically.
    // We listen on the container.
    document.getElementById('cascadingFiltersContainer').addEventListener('change', refreshCardPool);

    // View Controls
    document.getElementById('viewModeToggle').addEventListener('click', (e) => {
        const newMode = state.currentViewMode === 'list' ? 'grid' : 'list';
        state.setCurrentViewMode(newMode);
        e.target.textContent = newMode === 'list' ? 'Switch to Grid View' : 'Switch to List View';
        refreshCardPool();
    });

    document.getElementById('gridSizeControls').addEventListener('click', (e) => {
        if (e.target.tagName === 'BUTTON') {
            document.querySelectorAll('#gridSizeControls button').forEach(btn => btn.classList.remove('active'));
            e.target.classList.add('active');
            state.setNumGridColumns(e.target.dataset.columns);
            refreshCardPool();
        }
    });

    // Other listeners (deck, modals, etc.) will be re-added once the core loop is confirmed working.
    console.log("listeners: Core listeners attached.");
}

