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
    
    // Convert sets to sorted arrays
    return Object.keys(options).reduce((acc, key) => {
        acc[key] = Array.from(options[key]).sort();
        return acc;
    }, {});
}

export function renderCascadingFilters() {
    const filtersContainer = document.getElementById('cascadingFiltersContainer');
    // For simplicity, we just use a small subset of the total card pool to determine options
    // A more robust app might process the entire database once.
    const filterOptions = getAvailableFilterOptions(state.cardDatabase);

    // Render 3 filter selects
    filtersContainer.innerHTML = state.activeFilters.map((activeFilter, index) => {
        const categories = Object.keys(filterOptions).sort();
        const categoryOptions = ['<option value="">-- Category --</option>']
            .concat(categories.map(cat => `<option value="${cat}" ${activeFilter.category === cat ? 'selected' : ''}>${cat}</option>`))
            .join('');

        let valueOptions = '<option value="">-- Value --</option>';
        if (activeFilter.category && filterOptions[activeFilter.category]) {
            valueOptions = filterOptions[activeFilter.category].sort().map(value => 
                `<option value="${value}" ${activeFilter.value === value ? 'selected' : ''}>${value}</option>`
            ).join('');
            valueOptions = `<option value="">-- Value --</option>` + valueOptions;
        }

        return `
            <div class="cascading-filter" data-filter-index="${index}">
                <select class="filter-category" data-index="${index}">${categoryOptions}</select>
                <select class="filter-value" data-index="${index}" ${!activeFilter.category ? 'disabled' : ''}>${valueOptions}</select>
                ${index > 0 ? `<button class="remove-filter-btn" data-index="${index}">&times;</button>` : ''}
            </div>
        `;
    }).join('');

    // Add Filter button
    if (state.activeFilters.length < 3) {
        const addButton = document.createElement('button');
        addButton.className = 'add-filter-btn';
        addButton.textContent = '+ Add Filter';
        addButton.onclick = () => {
            state.addFilter({});
            renderCascadingFilters();
            document.dispatchEvent(new Event('filtersChanged'));
        };
        filtersContainer.appendChild(addButton);
    }

    // Add event listeners for the new selects
    filtersContainer.querySelectorAll('.filter-category').forEach(select => {
        select.addEventListener('change', (e) => {
            const index = parseInt(e.target.dataset.index);
            const category = e.target.value;
            state.setActiveFilterCategory(index, category);
            state.setActiveFilterValue(index, ''); // Reset value when category changes
            renderCascadingFilters(); // Re-render to update the value dropdown
            document.dispatchEvent(new Event('filtersChanged'));
        });
    });

    filtersContainer.querySelectorAll('.filter-value').forEach(select => {
        select.addEventListener('change', (e) => {
            const index = parseInt(e.target.dataset.index);
            state.setActiveFilterValue(index, e.target.value);
            document.dispatchEvent(new Event('filtersChanged'));
        });
    });

    filtersContainer.querySelectorAll('.remove-filter-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            const index = parseInt(e.target.dataset.index);
            state.removeFilter(index);
            renderCascadingFilters();
            document.dispatchEvent(new Event('filtersChanged'));
        });
    });
}

function applyAllFilters(cards) {
    return cards.filter(card => {
        return state.activeFilters.every(filter => {
            if (!filter.category || !filter.value) return true;
            const filterFunc = filterFunctions[filter.category];
            return filterFunc ? filterFunc(card, filter.value) : true;
        });
    });
}

function sortCardPool(cards) {
    const [key, direction] = state.currentSort.split('-');
    
    return cards.sort((a, b) => {
        let valA, valB;

        switch (key) {
            case 'alpha': valA = a.title; valB = b.title; break;
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

