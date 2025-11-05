// ui-renderer.js
import * as state from './state.js';

const searchResults = document.getElementById('searchResults');
const startingDeckList = document.getElementById('startingDeckList');
const purchaseDeckList = document.getElementById('purchaseDeckList');
const startingDeckCount = document.getElementById('startingDeckCount');
const purchaseDeckCount = document.getElementById('purchaseDeckCount');
const personaDisplay = document.getElementById('personaDisplay');

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
        if (!card || !card.title) return;
        
        // --- THIS IS THE UNIFIED FIX ---
        // Create a single, consistent element structure for both views.
        const item = document.createElement('div');
        item.dataset.title = card.title; // For click events

        if (state.currentViewMode === 'grid') {
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
                    <button data-deck-target="starting" data-title="${card.title}">Starting</button>
                    <button data-deck-target="purchase" data-title="${card.title}">Purchase</button>
                </div>
            `;
        } else { // List View
            item.className = 'card-list-item';
            item.innerHTML = `
                <span class="card-title">${card.title}</span>
                <div class="card-actions">
                    <button data-deck-target="starting" data-title="${card.title}">Starting</button>
                    <button data-deck-target="purchase" data-title="${card.title}">Purchase</button>
                </div>
            `;
        }
        fragment.appendChild(item);
    });
    searchResults.appendChild(fragment);
}


// --- Unchanged functions below ---

export function renderDecks() {
    renderDeck(startingDeckList, state.startingDeck, 'starting');
    renderDeck(purchaseDeckList, state.purchaseDeck, 'purchase');
    updateDeckCounts();
    state.saveStateToCache();
}

function renderDeck(container, deck, deckName) {
    container.innerHTML = '';
    const counts = deck.reduce((acc, title) => { acc[title] = (acc[title] || 0) + 1; return acc; }, {});
    Object.entries(counts).sort((a, b) => a[0].localeCompare(b[0])).forEach(([title, count]) => {
        const card = state.cardTitleCache[title];
        if (!card) return;
        const item = document.createElement('div');
        item.className = 'deck-card-item';
        item.dataset.title = title;
        const moveAction = deckName === 'starting'
            ? `<button class="deck-card-action" data-action="moveToPurchase" title="Move to Purchase Deck">&rarr;</button>`
            : `<button class="deck-card-action" data-action="moveToStart" title="Move to Starting Deck">&larr;</button>`;
        item.innerHTML = `
            <span class="deck-card-count">${count}x</span>
            <span class="deck-card-title">${title}</span>
            <div class="deck-card-buttons">
                ${moveAction}
                <button class="deck-card-action remove" data-action="remove" title="Remove from Deck">&times;</button>
            </div>
        `;
        container.appendChild(item);
    });
}

export function updateDeckCounts() {
    const startingCount = state.startingDeck.length;
    const purchaseCount = state.purchaseDeck.length;
    startingDeckCount.textContent = `${startingCount}/24`;
    purchaseDeckCount.textContent = `${purchaseCount}/36+`;
    startingDeckCount.classList.toggle('full', startingCount === 24);
    startingDeckCount.classList.toggle('over', startingCount > 24);
}

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

export function filterDeckList(listElement, query) {
    const items = listElement.querySelectorAll('.deck-card-item');
    items.forEach(item => {
        const text = item.textContent.toLowerCase();
        item.style.display = text.includes(query.toLowerCase()) ? '' : 'none';
    });
}

