// ui-renderer.js
import * as state from './state.js';

// --- Element Cache ---
const getElement = (id) => document.getElementById(id);
const elements = {
    searchResults: getElement('searchResults'),
    startingDeckList: getElement('startingDeckList'),
    purchaseDeckList: getElement('purchaseDeckList'),
    startingDeckCount: getElement('startingDeckCount'),
    purchaseDeckCount: getElement('purchaseDeckCount'),
    personaDisplay: getElement('personaDisplay'),
    cardModal: getElement('cardModal'),
    modalCardContent: getElement('modalCardContent')
};
// --- End Element Cache ---

export function renderCardPool(cards) {
    console.log(`renderCardPool: Rendering ${cards.length} cards in ${state.currentViewMode} view.`);
    if (!elements.searchResults) {
        console.error('renderCardPool: searchResults container not found!');
        return;
    }
    elements.searchResults.innerHTML = '';
    if (cards.length === 0) {
        elements.searchResults.innerHTML = '<div style="padding: 20px; text-align: center;">No cards match current filters.</div>';
        return;
    }
    if (state.currentViewMode === 'grid') {
        renderGridView(elements.searchResults, cards);
    } else {
        renderListView(elements.searchResults, cards);
    }
}

export function renderDecks() {
    console.log('renderDecks: Rendering starting and purchase decks.');
    if (!elements.startingDeckList || !elements.purchaseDeckList) return;
    renderDeck(elements.startingDeckList, state.startingDeck, 'starting');
    renderDeck(elements.purchaseDeckList, state.purchaseDeck, 'purchase');
    updateDeckCounts();
}

export function updateDeckCounts() {
    if (!elements.startingDeckCount || !elements.purchaseDeckCount) return;
    const startingCount = state.startingDeck.length;
    elements.startingDeckCount.textContent = `${startingCount}/24`;
    elements.purchaseDeckCount.textContent = `${state.purchaseDeck.length}/36+`;
    elements.startingDeckCount.classList.toggle('full', startingCount === 24);
    elements.startingDeckCount.classList.toggle('over', startingCount > 24);
}

export function renderPersonaDisplay() {
    console.log('renderPersonaDisplay: Rendering selected persona.');
    if (!elements.personaDisplay) return;
    elements.personaDisplay.innerHTML = '';
    [state.selectedWrestler, state.selectedManager].forEach(persona => {
        if (persona) {
            const item = document.createElement('div');
            item.className = 'persona-item';
            item.dataset.title = persona.title;
            item.innerHTML = `<strong>${persona.type}:</strong> ${persona.title}`;
            elements.personaDisplay.appendChild(item);
        }
    });
}

export function showCardModal(cardTitle) {
    // ... (showCardModal implementation remains the same)
}

export function closeAllModals() {
    // ... (closeAllModals implementation remains the same)
}

// --- Helper functions that are NOT exported ---
function renderListView(container, cards) {
    // ... (renderListView implementation remains the same)
}

function renderGridView(container, cards) {
    // ... (renderGridView implementation remains the same)
}

function renderDeck(container, deck, deckName) {
    // ... (renderDeck implementation remains the same)
}

