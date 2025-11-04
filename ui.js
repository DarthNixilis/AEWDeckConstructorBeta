// ui.js
import * as state from './config.js';
import { generateCardVisualHTML } from './card-renderer.js';

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
    searchResults.className = `card-list ${state.currentViewMode}-view`;
    if (state.currentViewMode === 'grid') {
        searchResults.setAttribute('data-columns', state.numGridColumns);
    } else {
        searchResults.removeAttribute('data-columns');
    }
    
    if (cards.length === 0) {
        searchResults.innerHTML = '<p>No cards match the current filters.</p>';
        return;
    }
    cards.forEach(card => {
        const cardElement = document.createElement('div');
        cardElement.className = state.currentViewMode === 'list' ? 'card-item' : 'grid-card-item';
        if (state.isSignatureFor(card)) {
            cardElement.classList.add('signature-highlight');
        }
        cardElement.dataset.title = card.title;

        // --- THIS IS THE FIX ---
        // Logic for creating buttons is now unified and correct for both views
        const buttonsDiv = document.createElement('div');
        buttonsDiv.className = 'card-buttons';
        if (card.cost === 0) {
            buttonsDiv.innerHTML = `<button data-title="${card.title}" data-deck-target="starting">Starting</button><button class="btn-purchase" data-title="${card.title}" data-deck-target="purchase">Purchase</button>`;
        } else {
            buttonsDiv.innerHTML = `<button class="btn-purchase" data-title="${card.title}" data-deck-target="purchase">Purchase</button>`;
        }

        if (state.currentViewMode === 'list') {
            cardElement.innerHTML = `<span data-title="${card.title}">${card.title} (C:${card.cost ?? 'N/A'}, D:${card.damage ?? 'N/A'}, M:${card.momentum ?? 'N/A'})</span>`;
            cardElement.appendChild(buttonsDiv);
        } else { // Grid View
            const visualHTML = generateCardVisualHTML(card);
            cardElement.innerHTML = `<div class="card-visual" data-title="${card.title}">${visualHTML}</div>`;
            cardElement.appendChild(buttonsDiv);
        }
        // --- END OF FIX ---

        searchResults.appendChild(cardElement);
    });
}

export function renderPersonaDisplay() {
    if (!state.selectedWrestler) {
        personaDisplay.style.display = 'none';
        return;
    }
    personaDisplay.style.display = 'block';
    personaDisplay.innerHTML = '<h3>Persona & Kit</h3><div class="persona-card-list"></div>';
    const list = personaDisplay.querySelector('.persona-card-list');
    list.innerHTML = ''; 
    const cardsToShow = new Set();
    if (state.selectedWrestler) cardsToShow.add(state.selectedWrestler);
    if (state.selectedManager) cardsToShow.add(state.selectedManager);
    const activePersonaTitles = Array.from(cardsToShow).map(p => p.title);
    const kitCards = state.cardDatabase.filter(card => state.isKitCard(card) && activePersonaTitles.includes(card['Signature For']));
    kitCards.forEach(card => cardsToShow.add(card));
    const sortedCards = Array.from(cardsToShow).sort((a, b) => {
        if (a.card_type === 'Wrestler') return -1; if (b.card_type === 'Wrestler') return 1;
        if (a.card_type === 'Manager') return -1; if (b.card_type === 'Manager') return 1;
        return a.title.localeCompare(b.title);
    });
    sortedCards.forEach(card => {
        const item = document.createElement('div');
        item.className = 'persona-card-item';
        item.textContent = card.title;
        item.dataset.title = card.title;
        list.appendChild(item);
    });
}

export function showCardModal(cardTitle) {
    state.setLastFocusedElement(document.activeElement);
    const card = state.cardTitleCache[cardTitle];
    if (!card) return;
    modalCardContent.innerHTML = generateCardVisualHTML(card);
    cardModal.style.display = 'flex';
}

export function renderDecks() {
    renderDeckList(document.getElementById('startingDeckList'), state.startingDeck, true);
    renderDeckList(document.getElementById('purchaseDeckList'), state.purchaseDeck, false);
    updateDeckCounts();
    state.saveStateToCache();
}

function renderDeckList(element, deck, isStartingDeck) {
    element.innerHTML = '';
    const cardCounts = deck.reduce((acc, cardTitle) => { acc[cardTitle] = (acc[cardTitle] || 0) + 1; return acc; }, {});
    
    Object.entries(cardCounts).sort((a, b) => a[0].localeCompare(b[0])).forEach(([cardTitle, count]) => {
        const card = state.cardTitleCache[cardTitle];
        if (!card) return;

        const cardElement = document.createElement('div');
        cardElement.className = 'card-item';
        
        let buttonsHTML = `<button class="btn-remove" data-title="${cardTitle}" data-action="remove">Remove</button>`;
        
        if (isStartingDeck) {
            buttonsHTML += `<button class="btn-move" data-title="${cardTitle}" data-action="moveToPurchase">Move</button>`;
        } else if (card.cost === 0) {
            buttonsHTML += `<button class="btn-move" data-title="${cardTitle}" data-action="moveToStart">Move</button>`;
        }

        cardElement.innerHTML = `
            <span data-title="${cardTitle}">${count}x ${card.title}</span>
            <div class="card-item-buttons">${buttonsHTML}</div>
        `;
        element.appendChild(cardElement);
    });
}

function updateDeckCounts() {
    const startingDeckCountEl = document.getElementById('startingDeckCount');
    const purchaseDeckCountEl = document.getElementById('purchaseDeckCount');
    startingDeckCountEl.textContent = state.startingDeck.length;
    purchaseDeckCountEl.textContent = state.purchaseDeck.length;

    if (state.startingDeck.length > 24) {
        startingDeckCountEl.style.color = 'red';
    } else if (state.startingDeck.length === 24) {
        startingDeckCountEl.style.color = 'green';
    } else {
        startingDeckCountEl.style.color = 'black';
    }

    if (state.purchaseDeck.length >= 36) {
        purchaseDeckCountEl.style.color = 'green';
    } else {
        purchaseDeckCountEl.style.color = 'black';
    }
}

export function filterDeckList(deckListElement, query) {
    const items = deckListElement.querySelectorAll('.card-item');
    items.forEach(item => {
        const text = item.textContent.toLowerCase();
        item.style.display = text.includes(query.toLowerCase()) ? '' : 'none';
    });
}

