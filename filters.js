// filters.js
import * as state from './state.js';
import debug from './debug-manager.js';

// --- FIX: Do not get the element here. Get it inside the function. ---

export function renderCascadingFilters() {
    // --- FIX: Get the container element just-in-time. ---
    const container = document.getElementById('cascadingFiltersContainer');
    if (!container) {
        debug.error('renderCascadingFilters: Could not find the container element.');
        return; // Exit gracefully if the container doesn't exist.
    }

    container.innerHTML = ''; // Now this is safe.
    
    const createSelect = (id, label, options) => {
        const select = document.createElement('select');
        select.id = id;
        select.innerHTML = `<option value="">-- Select ${label} --</option>`;
        options.forEach(opt => select.add(new Option(opt, opt)));
        select.addEventListener('change', () => document.dispatchEvent(new CustomEvent('filtersChanged')));
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
    // ... (The rest of this file is correct and does not need to change)
    const searchInput = document.getElementById('searchInput').value.toLowerCase();
    const typeFilter = document.getElementById('typeFilter')?.value;
    const keywordFilter = document.getElementById('keywordFilter')?.value;
    const traitFilter = document.getElementById('traitFilter')?.value;
    const setFilter = document.getElementById('setFilter')?.value;

    let filteredCards = state.cardDatabase.filter(card => {
        if (!card || !card.title) return false;
        if (card.traits && card.traits.includes('Kit')) return false;
        if (!state.showZeroCost && card.cost === 0) return false;
        if (!state.showNonZeroCost && card.cost !== 0) return false;
        if (typeFilter && card.type !== typeFilter) return false;
        if (setFilter && card.set !== setFilter) return false;
        if (keywordFilter && (!card.keywords || !card.keywords.includes(keywordFilter))) return false;
        if (traitFilter && (!card.traits || !card.traits.includes(traitFilter))) return false;

        if (searchInput) {
            const terms = searchInput.split(' ').filter(Boolean);
            return terms.every(term => {
                const results = state.searchIndex.get(term);
                return results && results.has(card.title);
            });
        }
        return true;
    });

    return sortCards(filteredCards, state.currentSort);
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

