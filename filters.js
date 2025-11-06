// filters.js
import * as state from './state.js';

// --- Memoization Cache ---
let filteredCache = null;
let lastFilterState = '';
// --- End of Cache ---

export function renderCascadingFilters() {
    const container = document.getElementById('cascadingFiltersContainer');
    if (!container) {
        if (window.debug) window.debug.warn('renderCascadingFilters: Container not found.');
        return;
    }
    container.innerHTML = '';
    const createSelect = (id, label, options) => {
        const select = document.createElement('select');
        select.id = id;
        select.innerHTML = `<option value="">-- Select ${label} --</option>`;
        options.forEach(opt => select.add(new Option(opt, opt)));
        select.addEventListener('change', () => {
            filteredCache = null; 
            document.dispatchEvent(new CustomEvent('filtersChanged'));
        });
        return select;
    };
    const allTypes = [...new Set(state.cardDatabase.map(c => c.type).filter(Boolean))].sort();
    const allKeywords = [...new Set(state.cardDatabase.flatMap(c => c.keywords || []).filter(Boolean))].sort();
    const allTraits = [...new Set(state.cardDatabase.flatMap(c => c.traits || []).filter(Boolean))].sort();
    const allSets = [...new Set(state.cardDatabase.map(c => c.set).filter(Boolean))].sort();
    container.appendChild(createSelect('typeFilter', 'Card Type', allTypes));
    container.appendChild(createSelect('keywordFilter', 'Keyword', allKeywords));
    container.appendChild(createSelect('traitFilter', 'Trait', allTraits));
    container.appendChild(createSelect('setFilter', 'Set', allSets));
}

export function getFilteredAndSortedCardPool() {
    // --- THIS IS THE FIX, as prescribed by Deepseek ---
    // 1. Get current filter values directly from the DOM elements.
    const searchTerm = document.getElementById('searchInput')?.value.toLowerCase() || '';
    const typeFilter = document.getElementById('typeFilter')?.value || '';
    const keywordFilter = document.getElementById('keywordFilter')?.value || '';
    const traitFilter = document.getElementById('traitFilter')?.value || '';
    const setFilter = document.getElementById('setFilter')?.value || '';
    
    // 2. Create the cache key from these real values.
    const currentStateKey = JSON.stringify({
        search: searchTerm,
        type: typeFilter,
        keyword: keywordFilter,
        trait: traitFilter,
        set: setFilter,
        sort: state.currentSort,
        showZeroCost: state.showZeroCost,
        showNonZeroCost: state.showNonZeroCost
    });

    // 3. Check the cache.
    if (filteredCache && lastFilterState === currentStateKey) {
        if (window.debug) window.debug.log('Filter cache hit!');
        return filteredCache;
    }
    if (window.debug) window.debug.log('Filter cache miss, recalculating...');

    // 4. Perform the filtering using the real values.
    let filteredCards = state.cardDatabase.filter(card => {
        if (!card || !card.title) return false;
        if (card.traits && card.traits.includes('Kit')) return false;

        if (!state.showZeroCost && card.cost === 0) return false;
        if (!state.showNonZeroCost && card.cost !== 0) return false;

        if (typeFilter && card.type !== typeFilter) return false;
        if (setFilter && card.set !== setFilter) return false;
        if (keywordFilter && (!card.keywords || !card.keywords.includes(keywordFilter))) return false;
        if (traitFilter && (!card.traits || !card.traits.includes(traitFilter))) return false;

        if (searchTerm) {
            const terms = searchTerm.split(' ').filter(Boolean);
            if (terms.length > 0) {
                const cardInIndex = terms.every(term => {
                    const results = state.searchIndex.get(term);
                    return results && results.has(card.title);
                });
                if (!cardInIndex) return false;
            }
        }
        return true;
    });
    
    const sortedCards = sortCards(filteredCards, state.currentSort);

    // 5. Update the cache.
    filteredCache = sortedCards;
    lastFilterState = currentStateKey;
    
    return sortedCards;
}

function sortCards(cards, sortValue) {
    return cards.sort((a, b) => {
        switch (sortValue) {
            case 'alpha-asc': return a.title.localeCompare(b.title);
            case 'alpha-desc': return b.title.localeCompare(a.title);
            case 'cost-asc': return (a.cost || 0) - (b.cost || 0) || a.title.localeCompare(b.title);
            case 'cost-desc': return (b.cost || 0) - (a.cost || 0) || a.title.localeCompare(b.title);
            default: return 0;
        }
    });
}

