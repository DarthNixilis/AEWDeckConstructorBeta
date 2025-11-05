// filters.js
import * as state from './state.js';

// --- Memoization Cache ---
let filteredCache = null;
let lastFilterState = '';
// --- End of Cache ---

export function getFilteredAndSortedCardPool() {
    const currentState = JSON.stringify({
        search: document.getElementById('searchInput')?.value.toLowerCase() || '',
        type: document.getElementById('typeFilter')?.value || '',
        keyword: document.getElementById('keywordFilter')?.value || '',
        trait: document.getElementById('traitFilter')?.value || '',
        set: document.getElementById('setFilter')?.value || '',
        sort: state.currentSort,
        showZeroCost: state.showZeroCost,
        showNonZeroCost: state.showNonZeroCost
    });

    if (filteredCache && lastFilterState === currentState) {
        if (window.debug) window.debug.log('Filter cache hit!');
        return filteredCache;
    }
    if (window.debug) window.debug.log('Filter cache miss, recalculating...');

    // ... existing filtering logic from the previous correct version ...
    let filteredCards = state.cardDatabase.filter(card => { /* ... */ });
    
    const sortedCards = sortCards(filteredCards, state.currentSort);

    // Save to cache
    filteredCache = sortedCards;
    lastFilterState = currentState;
    
    return sortedCards;
}

// ... other functions in filters.js remain the same ...

