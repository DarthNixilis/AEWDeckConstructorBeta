// ui-renderer.js
import * as state from './state.js';
import * as modals from './ui-modal.js';
import { isKitCard, isSignatureFor } from './config.js';

const searchResults = document.getElementById('searchResults');
const startingDeckList = document.getElementById('startingDeckList');
const purchaseDeckList = document.getElementById('purchaseDeckList');
const startingDeckCount = document.getElementById('startingDeckCount');
const purchaseDeckCount = document.getElementById('purchaseDeckCount');
const personaDisplay = document.getElementById('personaDisplay');

export function renderCardPool(cards) {
    searchResults.innerHTML = '';
    
    // --- FIX #1: Correctly apply the view mode from the state ---
    searchResults.className = 'card-list'; // Reset classes
    if (state.currentViewMode === 'grid') {
        searchResults.classList.add('grid-view');
        searchResults.style.gridTemplateColumns = `repeat(${state.numGridColumns}, 1fr)`;
    } else {
        searchResults.classList.add('list-view');
    }
    // --- END OF FIX #1 ---

    if (cards.length === 0) {
        searchResults.innerHTML = '<p>No cards match the current filters.</p>';
        return;
    }

    const fragment = document.createDocumentFragment();
    cards.forEach(card => {
        // The rest of the app uses 'title', which the parser now provides.
        if (!card || !card.title) return;

        const cardEl = (state.currentViewMode === 'grid') 
            ? createGridItem(card) 
            : createListItem(card);
        
        fragment.appendChild(cardEl);
    });
    searchResults.appendChild(fragment);
}

function createListItem(card) {
    const item = document.createElement('div');
    item.className = 'card-list-item';
    // --- FIX #2: Ensure data-title is always present for click handlers ---
    item.dataset.title = card.title;
    // --- END OF FIX #2 ---

    item.innerHTML = `
        <span class="card-title">${card.title}</span>
        <div class="card-actions">
            <button data-deck-target="starting" data-title="${card.title}">Starting</button>
            <button data-deck-target="purchase" data-title="${card.title}">Purchase</button>
        </div>
    `;
    return item;
}

function createGridItem(card) {
    const item = document.createElement('div');
    item.className = 'card-grid-item';
    // --- FIX #3: Ensure data-title is present and use standardized keys ---
    item.dataset.title = card.title;

    // Use standardized keys like 'cost', 'damage', 'momentum', 'type'
    const cost = card.cost ?? 'N/A';
    const damage = card.damage ?? 'N/A';
    const momentum = card.momentum ?? 'N/A';
    const type = card.type ?? 'Unknown';

    item.innerHTML = `
        <div class="card-grid-title">${card.title}</div>
        <div class="card-grid-stats">
            <span><strong>C:</strong> ${cost}</span>
            <span><strong>D:</strong> ${damage}</span>
            <span><strong>M:</strong> ${momentum}</span>
        </div>
        <div class="card-grid-type">${type}</div>
        <div class="card-actions">
            <button data-deck-target="starting" data-title="${card.title}">Starting</button>
            <button data-deck-target="purchase" data-title="${card.title}">Purchase</button>
        </div>
    `;
    // --- END OF FIX #3 ---
    return item;
}


// --- The rest of the file is unchanged but included for completeness ---

export function renderDecks() {
    renderDeck(startingDeckList, state.startingDeck, 'starting');
    renderDeck(purchaseDeckList, state.purchaseDeck, 'purchase');
    updateDeckCounts();
    state.saveStateToCache();
}

function renderDeck(container, deck, deckName) {
    container.innerHTML = '';
    const counts = deck.reduce((acc, title) => {
        acc[title] = (acc[title] || 0) + 1;
        return acc;
    }, {});

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

