// filters.js
import * as state from './state.js';

let activeFilters = {};

export function renderCascadingFilters() {
    const container = document.getElementById('cascadingFiltersContainer');
    container.innerHTML = '';
    const filterableFields = ['type', 'set', 'keywords', 'traits'];

    filterableFields.forEach(field => {
        const select = document.createElement('select');
        select.dataset.field = field;
        select.innerHTML = `<option value="">-- Select ${field.charAt(0).toUpperCase() + field.slice(1)} --</option>`;
        
        const options = new Set();
        state.cardDatabase.forEach(card => {
            if (card && card[field]) {
                if (Array.isArray(card[field])) {
                    card[field].forEach(item => options.add(item));
                } else {
                    options.add(card[field]);
                }
            }
        });

        Array.from(options).sort().forEach(option => {
            select.add(new Option(option, option));
        });

        select.addEventListener('change', (e) => {
            if (e.target.value) {
                activeFilters[field] = e.target.value;
            } else {
                delete activeFilters[field];
            }
            document.dispatchEvent(new CustomEvent('filtersChanged'));
        });
        container.appendChild(select);
    });
}

export function getFilteredAndSortedCardPool() {
    const searchInput = document.getElementById('searchInput');
    const query = searchInput ? searchInput.value.toLowerCase() : '';

    let filtered = state.cardDatabase.filter(card => {
        if (!card) return false;

        const matchesSearch = !query || 
            (card.title && card.title.toLowerCase().includes(query)) ||
            (card.card_raw_game_text && card.card_raw_game_text.toLowerCase().includes(query));

        const matchesCost = (state.showZeroCost && card.cost === 0) || (state.showNonZeroCost && card.cost > 0);

        const matchesFilters = Object.entries(activeFilters).every(([field, value]) => {
            if (!card[field]) return false;
            return Array.isArray(card[field]) ? card[field].includes(value) : card[field] === value;
        });

        return matchesSearch && matchesCost && matchesFilters;
    });

    return sortCards(filtered, state.currentSort);
}

function sortCards(cards, sortOrder) {
    return cards.sort((a, b) => {
        switch (sortOrder) {
            case 'alpha-asc': return a.title.localeCompare(b.title);
            case 'alpha-desc': return b.title.localeCompare(a.title);
            case 'cost-asc': return (a.cost || 0) - (b.cost || 0) || a.title.localeCompare(b.title);
            case 'cost-desc': return (b.cost || 0) - (a.cost || 0) || a.title.localeCompare(b.title);
            case 'damage-asc': return (a.damage || 0) - (b.damage || 0) || a.title.localeCompare(b.title);
            case 'damage-desc': return (b.damage || 0) - (a.damage || 0) || a.title.localeCompare(b.title);
            case 'momentum-asc': return (a.momentum || 0) - (b.momentum || 0) || a.title.localeCompare(b.title);
            case 'momentum-desc': return (b.momentum || 0) - (a.momentum || 0) || a.title.localeCompare(b.title);
            default: return 0;
        }
    });
}

