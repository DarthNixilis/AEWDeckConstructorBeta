// filters.js

import * as state from './config.js';
import { isKitCard } from './config.js'; // FIX: Added missing import

// --- FILTER & SORT LOGIC ---

const filterFunctions = {
    'Card Type': (card, value) => {
        if (value === 'Maneuver') return ['Strike', 'Grapple', 'Submission'].includes(card.card_type);
        return card.card_type === value;
    },
    'Keyword': (card, value) => card.text_box?.keywords?.some(k => k.name.trim() === value),
    'Trait': (card, value) => card.text_box?.traits?.some(t => t.name.trim() === value),
    'Set': (card, value) => card.set === value,
};

function getAvailableFilterOptions(cards) {
    const options = { 
        'Card Type': new Set(), 
        'Keyword': new Set(), 
        'Trait': new Set(),
        'Set': new Set() 
    };
    
    cards.forEach(card => {
        if (card && card.card_type) options['Card Type'].add(card.card_type);
        if (card && card.text_box?.keywords) card.text_box.keywords.forEach(k => { 
            if (k.name) options['Keyword'].add(k.name.trim()); 
        });
        if (card && card.text_box?.traits) card.text_box.traits.forEach(t => { 
            if (t.name) options['Trait'].add(t.name.trim()); 
        });
        if (card && card.set) options['Set'].add(card.set);
    });
    
    // Custom logic to handle 'Maneuver' rollup for UI
    if (options['Card Type'].has('Strike') || options['Card Type'].has('Grapple') || options['Card Type'].has('Submission')) {
        options['Card Type'].add('Maneuver');
    }

    return Object.fromEntries(
        Object.entries(options).map(([key, value]) => [key, [...value].sort()])
    );
}

export function renderCascadingFilters() {
    const cardsToFilter = state.cardDatabase.filter(card => {
        // Exclude personas and kit cards from filter options calculation
        return !card || (card.card_type !== 'Wrestler' && card.card_type !== 'Manager' && !isKitCard(card));
    });

    const options = getAvailableFilterOptions(cardsToFilter);
    const container = document.getElementById('cascadingFiltersContainer');
    container.innerHTML = '';
    
    // Clear old filters and reset to 3 empty filter objects
    state.activeFilters.length = 0;
    state.activeFilters.push({}, {}, {});

    // Render filter blocks
    for (let i = 0; i < 3; i++) {
        const filterBlock = document.createElement('div');
        filterBlock.className = 'filter-block';
        filterBlock.dataset.filterIndex = i;
        
        const typeSelect = document.createElement('select');
        typeSelect.className = 'filter-type-select';
        typeSelect.add(new Option('Filter By...', '', true, true));
        Object.keys(options).forEach(key => typeSelect.add(new Option(key, key)));
        
        const valueSelect = document.createElement('select');
        valueSelect.className = 'filter-value-select';
        valueSelect.disabled = true;

        // Load existing filter state if available
        if (state.activeFilters[i].type) {
            typeSelect.value = state.activeFilters[i].type;
            const currentOptions = options[state.activeFilters[i].type] || [];
            currentOptions.forEach(value => valueSelect.add(new Option(value, value)));
            if (state.activeFilters[i].value) {
                valueSelect.value = state.activeFilters[i].value;
            }
            valueSelect.disabled = false;
        }

        typeSelect.addEventListener('change', () => {
            const filterType = typeSelect.value;
            state.activeFilters[i] = {}; // Reset filter on type change
            valueSelect.innerHTML = ''; // Clear old values
            valueSelect.disabled = true;
            
            if (filterType) {
                const currentOptions = options[filterType] || [];
                valueSelect.add(new Option(`Select ${filterType}...`, '', true, true));
                currentOptions.forEach(value => valueSelect.add(new Option(value, value)));
                valueSelect.disabled = false;
                
                // Update state for new filter type
                state.activeFilters[i].type = filterType;
            }
            document.dispatchEvent(new Event('filtersChanged'));
        });

        valueSelect.addEventListener('change', () => {
            state.activeFilters[i].value = valueSelect.value;
            document.dispatchEvent(new Event('filtersChanged'));
        });

        filterBlock.appendChild(typeSelect);
        filterBlock.appendChild(valueSelect);
        container.appendChild(filterBlock);
    }
}

function applyAllFilters(cards) {
    let filteredCards = [...cards];
    
    state.activeFilters.forEach(filter => {
        if (filter.type && filter.value) {
            const filterFn = filterFunctions[filter.type];
            if (filterFn) {
                filteredCards = filteredCards.filter(card => filterFn(card, filter.value));
            }
        }
    });
    
    return filteredCards;
}

function sortCardPool(cards) {
    const [field, direction] = state.currentSort.split('-');
    
    return cards.sort((a, b) => {
        if (field === 'alpha') {
            const titleA = a.title || '';
            const titleB = b.title || '';
            if (direction === 'asc') return titleA.localeCompare(titleB);
            else return titleB.localeCompare(titleA);
        }
        
        let valA, valB;
        switch (field) {
            case 'cost': valA = a.cost ?? -1; valB = b.cost ?? -1; break;
            case 'damage': valA = a.damage ?? -1; valB = b.damage ?? -1; break;
            case 'momentum': valA = a.momentum ?? -1; valB = b.momentum ?? -1; break;
            default: return 0;
        }
        if (direction === 'asc') return valA > valB ? 1 : -1;
        else return valA < valB ? 1 : -1;
    });
}

export function getFilteredAndSortedCardPool() {
    const searchInput = document.getElementById('searchInput');
    const query = searchInput.value.toLowerCase();
    
    let cards = state.cardDatabase.filter(card => {
        if (!card || !card.title) return false; 
        if (card.card_type === 'Wrestler' || card.card_type === 'Manager' || isKitCard(card)) return false;
        if (!state.showZeroCost && card.cost === 0) return false;
        if (!state.showNonZeroCost && card.cost > 0) return false;
        
        // Filter by set
        if (!state.showSetCore && card.set === 'Core') return false;
        if (!state.showSetAdvanced && card.set === 'Advanced') return false;
        
        const rawText = card.text_box?.raw_text || '';
        return query === '' || card.title.toLowerCase().includes(query) || rawText.toLowerCase().includes(query);
    });

    const filtered = applyAllFilters(cards);
    return sortCardPool(filtered);
}

