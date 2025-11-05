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

        // --- STARTING DECK BUTTON FIX ---
        // The button is disabled if the card cost is > 0.
        const startingButtonDisabled = card.cost > 0 ? 'disabled' : '';

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
                    <button data-deck-target="starting" ${startingButtonDisabled}>Starting</button>
                    <button data-deck-target="purchase">Purchase</button>
                </div>`;
        } else {
            item.className = 'card-list-item';
            item.innerHTML = `
                <span class="card-title">${card.title}</span>
                <div class="card-actions">
                    <button data-deck-target="starting" ${startingButtonDisabled}>Starting</button>
                    <button data-deck-target="purchase">Purchase</button>
                </div>`;
        }
        fragment.appendChild(item);
    });
    searchResults.appendChild(fragment);
}

export function renderDecks() { /* ... same as before ... */ }
function renderDeck(container, deck, deckName, kitCards = []) { /* ... same as before ... */ }
export function updateDeckCounts(kitCardCount = 0) { /* ... same as before ... */ }
export function renderPersonaDisplay() { /* ... same as before ... */ }

export function showCardModal(cardTitle) {
    const card = state.cardTitleCache[cardTitle];
    if (!card) return;

    // --- KEYWORD DEFINITION FIX ---
    let keywordHTML = '';
    if (card.keywords && card.keywords.length > 0) {
        const definitions = card.keywords
            .map(kw => state.keywordDatabase[kw] ? `<p><strong>${kw}:</strong> ${state.keywordDatabase[kw]}</p>` : '')
            .join('');
        if (definitions) {
            keywordHTML = `<div class="keyword-definitions">${definitions}</div>`;
        }
    }

    modalCardContent.innerHTML = `
        <h3>${card.title}</h3>
        <p><strong>Type:</strong> ${card.type || 'N/A'}</p>
        <p><strong>Cost:</strong> ${card.cost ?? 'N/A'}</p>
        <p><strong>Stats:</strong> D:${card.damage ?? 'N/A'} / M:${card.momentum ?? 'N/A'}</p>
        <p><strong>Text:</strong> ${card.card_raw_game_text || 'None'}</p>
        ${keywordHTML}
    `;
    cardModal.classList.add('visible');
}

export function closeAllModals() {
    document.querySelectorAll('.modal-backdrop.visible').forEach(m => m.classList.remove('visible'));
}

