// filters.js
import * as state from './state.js';

// --- Memoization Cache ---
let filteredCache = null;
let lastFilterState = '';
// --- End of Cache ---

export function renderCascadingFilters() {
    const container = document.getElementById('cascadingFiltersContainer');
    if (!container) {
        console.warn('renderCascadingFilters: Container not found.');
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
    
    // Gather all unique options from the database
    const allTypes = [...new Set(state.cardDatabase.map(c => c.type).filter(Boolean))].sort();
    const allKeywords = [...new Set(state.cardDatabase.flatMap(c => c.keywords || []).filter(Boolean))].sort();
    const allTraits = [...new Set(state.cardDatabase.flatMap(c => c.traits || []).filter(Boolean))].sort();
    const allSets = [...new Set(state.cardDatabase.map(c => c.set).filter(Boolean))].sort();
    
    // Append the selectors to the container
    container.appendChild(createSelect('typeFilter', 'Card Type', allTypes));
    container.appendChild(createSelect('keywordFilter', 'Keyword', allKeywords));
    container.appendChild(createSelect('traitFilter', 'Trait', allTraits));
    container.appendChild(createSelect('setFilter', 'Set', allSets));
}

// --- Main Filter/Sort Logic ---

export function getFilteredAndSortedCardPool() {
    // Check cache first
    const currentState = JSON.stringify({
        filters: state.currentFilters,
        sort: state.currentSort
    });

    if (filteredCache && currentState === lastFilterState) {
        return filteredCache;
    }

    // --- Actual Filtering Logic ---
    const filteredCards = state.cardDatabase.filter(card => {
        if (!card || !card.title) return false;
        
        // 1. Exclude 'Kit' cards
        if (card.traits && card.traits.includes('Kit')) return false;

        // 2. Check Type Filter
        const typeFilter = state.currentFilters.typeFilter;
        if (typeFilter && card.type !== typeFilter) return false;
        
        // 3. Check Keyword Filter
        const keywordFilter = state.currentFilters.keywordFilter;
        if (keywordFilter && (!card.keywords || !card.keywords.includes(keywordFilter))) return false;
        
        // 4. Check Trait Filter
        const traitFilter = state.currentFilters.traitFilter;
        if (traitFilter && (!card.traits || !card.traits.includes(traitFilter))) return false;
        
        // 5. Check Set Filter
        const setFilter = state.currentFilters.setFilter;
        if (setFilter && card.set !== setFilter) return false;

        // 6. Check Search Term (assumes searchIndex is correctly populated)
        const searchTerm = state.currentFilters.search;
        if (searchTerm) {
            const terms = searchTerm.toLowerCase().split(' ').filter(Boolean);
            if (terms.length > 0) {
                // Check if ALL search terms match the card's entry in the search index
                return terms.every(term => {
                    // This relies on state.searchIndex being correctly set up
                    const results = state.searchIndex.get(term);
                    return results && results.has(card.title);
                });
            }
        }
        
        // 7. Check Cost/Damage/Momentum Checkboxes (This logic is incomplete in the snippet but assumed to be here)
        // ...

        return true; // Card passed all active filters
    });

    // Sort the filtered cards
    const sortedCards = sortCards(filteredCards, state.currentSort);

    // Update cache and return
    filteredCache = sortedCards;
    lastFilterState = currentState;
    
    return sortedCards;
}

function sortCards(cards, sortValue) {
    return cards.sort((a, b) => {
        switch (sortValue) {
            case 'alpha-asc': return a.title.localeCompare(b.title);
            case 'alpha-desc': return b.title.localeCompare(a.title);
            // Use ?? 99 for cost to push N/A/null values to the end for ascending
            case 'cost-asc': return (a.cost ?? 99) - (b.cost ?? 99) || a.title.localeCompare(b.title); 
            case 'cost-desc': return (b.cost ?? -1) - (a.cost ?? -1) || a.title.localeCompare(b.title);
            case 'damage-desc': return (b.damage ?? -1) - (a.damage ?? -1) || a.title.localeCompare(b.title);
            case 'damage-asc': return (a.damage ?? 99) - (b.damage ?? 99) || a.title.localeCompare(b.title);
            case 'momentum-desc': return (b.momentum ?? -1) - (a.momentum ?? -1) || a.title.localeCompare(b.title);
            case 'momentum-asc': return (a.momentum ?? 99) - (b.momentum ?? 99) || a.title.localeCompare(b.title);
            default: return 0;
        }
    });
}

