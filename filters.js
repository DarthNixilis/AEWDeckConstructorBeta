// filters.js
import * as state from './state.js';

// ... (renderCascadingFilters remains the same) ...

export function getFilteredAndSortedCardPool() {
    console.log('=== FILTER DEBUG ===');
    console.log('Total cards in database:', state.cardDatabase.length);
    
    // --- DEEPSEEK'S DEBUG: Show ALL cards, ignore filters ---
    const allCards = [...state.cardDatabase.filter(c => c && c.title && (!c.traits || !c.traits.includes('Kit')))];
    console.log('Cards being returned (excluding Kit):', allCards.length);
    
    const sortedCards = sortCards(allCards, state.currentSort);
    return sortedCards;
    // --- END OF DEEPSEEK'S DEBUG ---
}

function sortCards(cards, sortValue) {
    // ... (The robust sort logic from before remains the same) ...
}

