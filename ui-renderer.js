// ui-renderer.js
import * as state from './state.js';

// NOTE: Assumes functions like renderGridView and renderListView are defined elsewhere in this file.

export function renderCardPool(cards) {
    // console.log(`renderCardPool: Rendering ${cards.length} cards in ${state.currentViewMode} view.`);
    
    const container = document.getElementById('searchResults');
    if (!container) {
        console.error('renderCardPool: searchResults container not found!');
        return;
    }

    // Clear the container
    container.innerHTML = '';
    
    // Check if there are no cards to display
    if (cards.length === 0) {
        container.innerHTML = '<div style="padding: 20px; text-align: center;">No cards match current filters.</div>';
        return;
    }

    // Render the cards based on the current view mode
    if (state.currentViewMode === 'grid') {
        // ASSUMED: Calls your original grid rendering function
        renderGridView(container, cards); 
    } else {
        // ASSUMED: Calls your original list rendering function
        renderListView(container, cards);
    }
}

// ... (Your other functions like renderListView, renderGridView, renderDecks, etc., should be below here) ...

// Example stubs for reference (replace with your actual code if needed):
// function renderGridView(container, cards) { /* Your grid logic */ }
// function renderListView(container, cards) { /* Your list logic */ }

export function renderDecks() { /* ... */ } 
export function renderPersonaDisplay() { /* ... */ }
export function showCardModal(cardTitle) { /* ... */ }

