// ui-renderer.js
import * as state from './state.js';

const searchResults = document.getElementById('searchResults');
const startingDeckList = document.getElementById('startingDeckList');
const purchaseDeckList = document.getElementById('purchaseDeckList');
const startingDeckCount = document.getElementById('startingDeckCount');
const purchaseDeckCount = document.getElementById('purchaseDeckCount');
const personaDisplay = document.getElementById('personaDisplay');
const cardModal = document.getElementById('cardModal');
const modalCardContent = document.getElementById('modalCardContent');

export function renderCardPool(cards) {
    searchResults.innerHTML = '';
    searchResults.className = 'card-list';
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
        } else {
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

export function renderDecks() {
    // --- FIX: Get Kit cards if a wrestler is selected ---
    const kitCards = [];
    if (state.selectedWrestler && state.selectedWrestler.title) {
        state.cardDatabase.forEach(card => {
            // Check the 'wrestler_kit' column for a match
            if (card.wrestler_kit === state.selectedWrestler.title) {
                kitCards.push(card.title);
            }
        });
    }
    
    renderDeck(startingDeckList, state.startingDeck, 'starting', kitCards);
    renderDeck(purchaseDeckList, state.purchaseDeck, 'purchase', []);
    updateDeckCounts(kitCards.length); // Pass kit card count for accurate total
}

function renderDeck(container, deck, deckName, kitCards = []) {
    container.innerHTML = '';
    
    const combinedDeck = [...kitCards, ...deck];
    const counts = combinedDeck.reduce((acc, title) => { acc[title] = (acc[title] || 0) + 1; return acc; }, {});

    Object.entries(counts).sort((a, b) => a[0].localeCompare(b[0])).forEach(([title, count]) => {
        const isKitCard = kitCards.includes(title);
        const item = document.createElement('div');
        item.className = 'deck-card-item';
        item.dataset.title = title;
        
        if (isKitCard) {
            item.classList.add('kit-card');
            item.innerHTML = `
                <span class="deck-card-count">${count}x</span>
                <span class="deck-card-title">${title} (Kit)</span>
                <div class="deck-card-buttons"></div>`;
        } else {
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
        }
        container.appendChild(item);
    });
}

export function updateDeckCounts(kitCardCount = 0) {
    const startingCount = state.startingDeck.length + kitCardCount; // Include kit cards in the count
    const purchaseCount = state.purchaseDeck.length;
    startingDeckCount.textContent = `${startingCount}/24`;
    purchaseDeckCount.textContent = `${purchaseCount}/36+`;
    startingDeckCount.classList.toggle('full', startingCount === 24);
    startingDeckCount.classList.toggle('over', startingCount > 24);
    if (startingCount === 25 && state.startingDeck.length > (24 - kitCardCount)) {
        alert(`Your Starting Deck should have 24 cards (including Kit cards). You are now at 25.`);
    }
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

export function closeAllModals() {
    document.querySelectorAll('.modal-backdrop.visible').forEach(m => m.classList.remove('visible'));
}

