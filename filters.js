// filters.js
import * as state from './state.js';

// --- Memoization Cache ---
let filteredCache = null;
let lastFilterState = '';
// --- End of Cache ---

// --- THIS IS THE FIX: The function I accidentally deleted ---
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
            // When a filter changes, we must clear the cache and re-render.
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
// --- END OF FIX ---

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

    let filteredCards = state.cardDatabase.filter(card => {
        if (!card || !card.title) return false;
        if (card.traits && card.traits.includes('Kit')) return false;

        if (!state.showZeroCost && card.cost === 0) return false;
        if (!state.showNonZeroCost && card.cost !== 0) return false;

        if (currentState.type && card.type !== currentState.type) return false;
        if (currentState.set && card.set !== currentState.set) return false;
        if (currentState.keyword && (!card.keywords || !card.keywords.includes(currentState.keyword))) return false;
        if (currentState.trait && (!card.traits || !card.traits.includes(currentState.trait))) return false;

        if (currentState.search) {
            const terms = currentState.search.split(' ').filter(Boolean);
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

    filteredCache = sortedCards;
    lastFilterState = currentState;
    
    return sortedCards;
}

function sortCards(cards, sortValue) {
    return cards.sort((a, b) => {
        switch (sortValue) {
            case 'alpha-asc': return a.title.localeCompare(b.title);
            case 'alpha-desc': return b.title.localeCompare(a.title);
            case 'cost-asc': return (a.cost || 0) - (b.cost || 0) || a.title.localeCompare(b.title);
            case 'cost-desc': return (b.cost || 0) - (a.cost || 0) || a.title.localeCompare(b.title);
            case 'damage-desc': return (b.damage || 0) - (a.damage || 0) || a.title.localeCompare(b.title);
            case 'damage-asc': return (a.damage || 0) - (b.damage || 0) || a.title.localeCompare(b.title);
            case 'momentum-desc': return (b.momentum || 0) - (a.momentum || 0) || a.title.localeCompare(b.title);
            case 'momentum-asc': return (a.momentum || 0) - (b.momentum || 0) || a.title.localeCompare(b.title);
            default: return 0;
        }
    });
}

