// ui-renderer.js
import * as state from './state.js';

// --- Element Cache ---
const searchResults = document.getElementById('searchResults');
const startingDeckList = document.getElementById('startingDeckList');
const purchaseDeckList = document.getElementById('purchaseDeckList');
const startingDeckCount = document.getElementById('startingDeckCount');
const purchaseDeckCount = document.getElementById('purchaseDeckCount');
const personaDisplay = document.getElementById('personaDisplay');
const cardModal = document.getElementById('cardModal');
const modalCardContent = document.getElementById('modalCardContent');

/**
 * Renders the main card pool based on the current view mode.
 * @param {Array<Object>} cards The array of card objects to render.
 */
export function renderCardPool(cards) {
    searchResults.innerHTML = '';
    searchResults.className = 'card-list'; // Reset classes

    if (state.currentViewMode === 'grid') {
        searchResults.classList.add('grid-view');
        searchResults.style.gridTemplateColumns = `repeat(${state.numGridColumns}, 1fr)`;
    } else {
        searchResults.classList.add('list-view');
    }

    if (!cards || cards.length === 0) {
        searchResults.innerHTML = '<p>No cards match the current filters.</p>';
        return;
    }

    const fragment = document.createDocumentFragment();
    cards.forEach(card => {
        const item = document.createElement('div');
        item.dataset.title = card.title;

        if (state.currentViewMode === 'grid') {
            // --- GRID VIEW FIX ---
            // Correctly displays all the card data.
            item.className = 'card-grid-item';
            item.innerHTML = `
                <div class="card-grid-title">${card.title}</div>
                <div class="card-grid-stats">
                    <span>C: ${card.cost ?? 'N/A'}</span>
                    <span>D: ${card.damage ?? 'N/A'}</span>
                    <span>M: ${card.momentum ?? 'N/A'}</span>
                </div>
                <div class="card-grid-type">${card.type ?? ''}</div>
                <div class="card-actions">
                    <button data-deck-target="starting">Starting</button>
                    <button data-deck-target="purchase">Purchase</button>
                </div>`;
        } else { // List View
            // --- LIST VIEW FIX ---
            // Cleaner layout with title on the left and buttons on the right.
            item.className = 'card-list-item';
            item.innerHTML = `
                <span class="card-title">${card.title}</span>
                <div class="card-actions">
                    <button data-deck-target="starting">Starting</button>
                    <button data-deck-target="purchase">Purchase</button>
                </div>`;
        }
        fragment.appendChild(item);
    });
    searchResults.appendChild(fragment);
}

/**
 * Renders both the starting and purchase decks.
 */
export function renderDecks() {
    renderDeck(startingDeckList, state.startingDeck, 'starting');
    renderDeck(purchaseDeckList, state.purchaseDeck, 'purchase');
    updateDeckCounts();
}

/**
 * Renders a single deck list.
 * @param {HTMLElement} container The container element for the deck.
 * @param {Array<string>} deck The array of card titles in the deck.
 * @param {string} deckName The name of the deck ('starting' or 'purchase').
 */
function renderDeck(container, deck, deckName) {
    container.innerHTML = '';
    const counts = deck.reduce((acc, title) => { acc[title] = (acc[title] || 0) + 1; return acc; }, {});
    Object.entries(counts).sort((a, b) => a[0].localeCompare(b[0])).forEach(([title, count]) => {
        const item = document.createElement('div');
        item.className = 'deck-card-item';
        item.dataset.title = title;
        const moveAction = deckName === 'starting'
            ? `<button class="deck-card-action" data-action="moveToPurchase" title="Move to Purchase">&rarr;</button>`
            : `<button class="deck-card-action" data-action="moveToStart" title="Move to Start">&larr;</button>`;
        item.innerHTML = `
            <span class="deck-card-count">${count}x</span>
            <span class="deck-card-title">${title}</span>
            <div class="deck-card-buttons">
                ${moveAction}
                <button class="deck-card-action remove" data-action="remove" title="Remove">&times;</button>
            </div>`;
        container.appendChild(item);
    });
}

/**
 * Updates the deck count display and applies styling.
 */
export function updateDeckCounts() {
    const startingCount = state.startingDeck.length;
    startingDeckCount.textContent = `${startingCount}/24`;
    purchaseDeckCount.textContent = `${state.purchaseDeck.length}/36+`;
    startingDeckCount.classList.toggle('full', startingCount === 24);
    startingDeckCount.classList.toggle('over', startingCount > 24);
    if (startingCount === 25) {
        // This alert logic can be improved later, but it works for now.
        alert(`Your Starting Deck should have 24 cards. You are now at 25.`);
    }
}

/**
 * Renders the selected persona cards.
 */
export function renderPersonaDisplay() {
    personaDisplay.innerHTML = '';
    [state.selectedWrestler, state.selectedManager].forEach(persona => {
        if (persona) {
            const item = document.createElement('div');
            item.className = 'persona-item';
            item.dataset.title = persona.title;
            item.innerHTML = `<strong>${persona.type}:</strong> ${persona.title}`;
            personaDisplay.appendChild(item);
        }
    });
}

/**
 * Shows the modal with details for a specific card.
 * @param {string} cardTitle The title of the card to show.
 */
export function showCardModal(cardTitle) {
    const card = state.cardTitleCache[cardTitle];
    if (!card) return;
    modalCardContent.innerHTML = `
        <h3>${card.title}</h3>
        <p><strong>Type:</strong> ${card.type || 'N/A'}</p>
        <p><strong>Cost:</strong> ${card.cost ?? 'N/A'}</p>
        <p><strong>Stats:</strong> D:${card.damage ?? 'N/A'} / M:${card.momentum ?? 'N/A'}</p>
        <p><strong>Text:</strong> ${card.card_raw_game_text || 'None'}</p>
    `;
    cardModal.classList.add('visible');
}

/**
 * Hides all visible modals.
 */
export function closeAllModals() {
    document.querySelectorAll('.modal-backdrop.visible').forEach(m => m.classList.remove('visible'));
}

