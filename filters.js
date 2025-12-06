// filters.js

import * as state from './config.js';
import { isKitCard } from './config.js'; // ADDED isKitCard

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

    // Remove persona types from 'Card Type'
    options['Card Type'].delete('Wrestler');
    options['Card Type'].delete('Manager');
    
    // Sort and convert to array of unique values
    for (const key in options) {
        options[key] = Array.from(options[key]).sort((a, b) => a.localeCompare(b));
    }

    // Special handling for Card Type display
    const cardTypes = options['Card Type'];
    if (cardTypes.some(t => ['Strike', 'Grapple', 'Submission'].includes(t))) {
        // If any maneuver types exist, add the grouped "Maneuver" filter
        const maneuverIndex = cardTypes.findIndex(t => t === 'Strike'); // Find an anchor
        if (maneuverIndex !== -1) {
            cardTypes.splice(maneuverIndex, 0, 'Maneuver');
        } else {
            cardTypes.push('Maneuver');
        }
    }
    
    return options;
}


function applyAllFilters(cards) {
    let filteredCards = [...cards];
    
    state.activeFilters.forEach(filter => {
        const filterKey = filter.key;
        const filterValue = filter.value;
        
        if (filterKey && filterValue) {
            const filterFunc = filterFunctions[filterKey];
            if (filterFunc) {
                filteredCards = filteredCards.filter(card => filterFunc(card, filterValue));
            }
        }
    });
    
    return filteredCards;
}

export function renderCascadingFilters() {
    const filtersContainer = document.getElementById('cascadingFiltersContainer');
    // Start with all cards that are not personas or kit cards
    const baseCards = state.cardDatabase.filter(card => 
        card && 
        card.card_type !== 'Wrestler' && 
        card.card_type !== 'Manager' && 
        !isKitCard(card)
    );
    
    let currentCards = baseCards;
    filtersContainer.innerHTML = '';
    
    // Define the order of filters to render
    const filterOrder = ['Card Type', 'Set', 'Keyword', 'Trait'];
    
    filterOrder.forEach((key, index) => {
        const filterElement = document.createElement('div');
        filterElement.className = 'filter-control';
        
        const label = document.createElement('label');
        label.textContent = `${key}:`;
        
        const select = document.createElement('select');
        select.id = `filter-${key.replace(/\s/g, '')}`;

        // Get available options based on the currently filtered cards
        const availableOptions = getAvailableFilterOptions(currentCards);
        const options = availableOptions[key] || [];

        // Add default 'All' option
        select.add(new Option('All', ''));
        
        // Populate options
        options.forEach(value => {
            select.add(new Option(value, value));
        });

        // Set current selection
        const activeFilter = state.getActiveFilter(index);
        if (activeFilter.key === key) {
            select.value = activeFilter.value || '';
        } else {
            // If the filter type changed or was cleared, make sure the visual state is 'All'
            select.value = '';
        }
        
        // Update state and refresh UI on change
        select.addEventListener('change', (e) => {
            const value = e.target.value;
            if (value) {
                state.setActiveFilter(index, { key: key, value: value });
            } else {
                state.clearActiveFilter(index);
            }
            // Clear subsequent filters
            for (let i = index + 1; i < filterOrder.length; i++) {
                state.clearActiveFilter(i);
            }
            document.dispatchEvent(new Event('filtersChanged'));
            renderCascadingFilters(); // Re-render to update subsequent filter options
        });
        
        filterElement.appendChild(label);
        filterElement.appendChild(select);
        filtersContainer.appendChild(filterElement);

        // Update currentCards for the next filter's options based on the selection just processed
        const selectedValue = select.value;
        if (selectedValue) {
            currentCards = currentCards.filter(card => filterFunctions[key](card, selectedValue));
        }
    });
}

function applySorting(cards, sortBy) {
    const [field, direction] = sortBy.split('-');

    return cards.sort((a, b) => {
        if (field === 'alpha') {
            const valA = a.title.toLowerCase();
            const valB = b.title.toLowerCase();
            if (direction === 'asc') return valA.localeCompare(valB);
            else return valB.localeCompare(valA);
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
    
    // Start with all cards from the database
    let cards = state.cardDatabase.filter(card => {
        // Basic card validation
        if (!card || !card.title) return false; 
        
        // Exclude personas and kit cards
        if (card.card_type === 'Wrestler' || card.card_type === 'Manager' || isKitCard(card)) return false;

        // Cost filters
        if (!state.showZeroCost && card.cost === 0) return false;
        if (!state.showNonZeroCost && (card.cost === null || card.cost > 0)) return false; // Filter non-zero cost

        // Set filters
        if (!state.showSetCore && card.set === 'Core') return false;
        if (!state.showSetAdvanced && card.set === 'Advanced') return false;
        
        // Search query filter
        const rawText = card.text_box?.raw_text || '';
        return query === '' || card.title.toLowerCase().includes(query) || rawText.toLowerCase().includes(query);
    });

    // Apply cascading filters
    const filtered = applyAllFilters(cards);

    // Apply sorting
    return applySorting(filtered, state.appState.view.cardPool.sort);
}

