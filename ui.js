// ui.js

import * as state from './config.js';
import { toPascalCase } from './config.js'; // Import toPascalCase

// --- DOM REFERENCES ---
const searchResults = document.getElementById('searchResults');
const startingDeckList = document.getElementById('startingDeckList');
const purchaseDeckList = document.getElementById('purchaseDeckList');
const startingDeckCount = document.getElementById('startingDeckCount');
const purchaseDeckCount = document.getElementById('purchaseDeckCount');
const startingDeckHeader = document.getElementById('startingDeckHeader');
const purchaseDeckHeader = document.getElementById('purchaseDeckHeader');
const personaDisplay = document.getElementById('personaDisplay');
const cardModal = document.getElementById('cardModal');
const modalCardContent = document.getElementById('modalCardContent');
const modalCloseButton = cardModal.querySelector('.modal-close-button');

// --- RENDERING FUNCTIONS ---

export function renderCardPool(cards) {
    searchResults.innerHTML = '';
    searchResults.className = `card-list ${state.currentViewMode}-view`;
    if (state.currentViewMode === 'grid') searchResults.setAttribute('data-columns', state.numGridColumns);
    else searchResults.removeAttribute('data-columns');
    
    if (cards.length === 0) {
        searchResults.innerHTML = '<p>No cards match the current filters.</p>';
        return;
    }
    cards.forEach(card => {
        const cardElement = document.createElement('div');
        cardElement.className = state.currentViewMode === 'list' ? 'card-item' : 'grid-card-item';
        if (state.isSignatureFor(card)) cardElement.classList.add('signature-highlight');
        cardElement.dataset.title = card.title;
        if (state.currentViewMode === 'list') {
            cardElement.innerHTML = `<span data-title="${card.title}">${card.title} (C:${card.cost ?? 'N/A'}, D:${card.damage ?? 'N/A'}, M:${card.momentum ?? 'N/A'})</span>`;
            const buttonsDiv = document.createElement('div');
            buttonsDiv.className = 'card-buttons';
            if (card.cost === 0) buttonsDiv.innerHTML = `<button data-title="${card.title}" data-deck-target="starting">Starting</button><button class="btn-purchase" data-title="${card.title}" data-deck-target="purchase">Purchase</button>`;
            else buttonsDiv.innerHTML = `<button class="btn-purchase" data-title="${card.title}" data-deck-target="purchase">Purchase</button>`;
            cardElement.appendChild(buttonsDiv);
        } else {
            const visualHTML = generateCardVisualHTML(card);
            cardElement.innerHTML = `<div class="card-visual" data-title="${card.title}">${visualHTML}</div>`;
            const buttonsDiv = document.createElement('div');
            buttonsDiv.className = 'card-buttons';
            if (card.cost === 0) buttonsDiv.innerHTML = `<button data-title="${card.title}" data-deck-target="starting">Starting</button><button class="btn-purchase" data-title="${card.title}" data-deck-target="purchase">Purchase</button>`;
            else buttonsDiv.innerHTML = `<button class="btn-purchase" data-title="${card.title}" data-deck-target="purchase">Purchase</button>`;
            cardElement.appendChild(buttonsDiv);
        }
        searchResults.appendChild(cardElement);
    });
}

export function generateCardVisualHTML(card) {
    const imageName = toPascalCase(card.title);
    const imagePath = `card-images/${imageName}.png?v=${new Date().getTime()}`;
    const keywords = card.text_box?.keywords || [];
    const traits = card.text_box?.traits || [];
    let keywordsText = keywords.map(kw => `<strong>${kw.name.trim()}:</strong> ${state.keywordDatabase[kw.name.trim()] || 'Definition not found.'}`).join('<br>');
    let traitsText = traits.map(tr => `<strong>${tr.name.trim()}</strong>${tr.value ? `: ${tr.value}` : ''}`).join('<br>');
    const targetTrait = traits.find(t => t.name.trim() === 'Target');
    const targetValue = targetTrait ? targetTrait.value : null;
    const typeClass = `type-${card.card_type.toLowerCase()}`;
    const placeholderHTML = `
        <div class="placeholder-card">
            <div class="placeholder-header"><span>${card.title}</span></div>
            <div class="placeholder-stats-line">
                <div class="stats-left">
                    <span>D: ${card.damage ?? 'N/A'}</span>
                    <span>M: ${card.momentum ?? 'N/A'}</span>
                    ${targetValue ? `<span>T: ${targetValue}</span>` : ''}
                </div>
                <div class="cost-right"><span>C: ${card.cost ?? 'N/A'}</span></div>
            </div>
            <div class="placeholder-art-area"><span>Art Missing</span></div>
            <div class="placeholder-type-line ${typeClass}"><span>${card.card_type}</span></div>
            <div class="placeholder-text-box">
                <p>${card.text_box?.raw_text || ''}</p>
                ${keywordsText ? `<hr><p>${keywordsText}</p>` : ''}
                ${traitsText ? `<hr><p>${traitsText}</p>` : ''}
            </div>
        </div>`;
    return `<img src="${imagePath}" alt="${card.title}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';"><div style="display: none;">${placeholderHTML}</div>`;
}

export function renderPersonaDisplay() {
    if (!state.selectedWrestler) { personaDisplay.style.display = 'none'; return; }
    personaDisplay.style.display = 'block';
    personaDisplay.innerHTML = '<h3>Persona & Kit</h3><div class="persona-card-list"></div>';
    const list = personaDisplay.querySelector('.persona-card-list');
    list.innerHTML = ''; 
    const cardsToShow = new Set();
    const activePersona = [];
    if (state.selectedWrestler) activePersona.push(state.selectedWrestler);
    if (state.selectedManager) activePersona.push(state.selectedManager);
    activePersona.forEach(p => cardsToShow.add(p));
    const activePersonaTitles = activePersona.map(p => p.title);
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
    const card = state.cardDatabase.find(c => c.title === cardTitle);
    if (!card) return;
    modalCardContent.innerHTML = generateCardVisualHTML(card);
    cardModal.style.display = 'flex';
    cardModal.setAttribute('role', 'dialog');
    cardModal.setAttribute('aria-modal', 'true');
    modalCloseButton.focus();
}

export function renderDecks() {
    renderDeckList(startingDeckList, state.startingDeck);
    renderDeckList(purchaseDeckList, state.purchaseDeck);
    updateDeckCounts();
    state.saveStateToCache();
}

function renderDeckList(element, deck) {
    element.innerHTML = '';
    const cardCounts = deck.reduce((acc, cardTitle) => { acc[cardTitle] = (acc[cardTitle] || 0) + 1; return acc; }, {});
    Object.entries(cardCounts).forEach(([cardTitle, count]) => {
        const card = state.cardDatabase.find(c => c.title === cardTitle);
        if (!card) return;
        const cardElement = document.createElement('div');
        cardElement.className = 'card-item';
        const deckName = element === startingDeckList ? 'starting' : 'purchase';
        cardElement.innerHTML = `<span data-title="${card.title}">${count}x ${card.title}</span><button data-title="${card.title}" data-deck="${deckName}">Remove</button>`;
        element.appendChild(cardElement);
    });
}

function updateDeckCounts() {
    startingDeckCount.textContent = state.startingDeck.length;
    purchaseDeckCount.textContent = state.purchaseDeck.length;
    startingDeckCount.parentElement.style.color = state.startingDeck.length === 24 ? 'green' : 'red';
    startingDeckHeader.style.color = state.startingDeck.length === 24 ? 'green' : 'inherit';
    purchaseDeckCount.parentElement.style.color = state.purchaseDeck.length >= 36 ? 'green' : 'red';
    purchaseDeckHeader.style.color = state.purchaseDeck.length >= 36 ? 'green' : 'inherit';
}

export function filterDeckList(deckListElement, query) {
    const items = deckListElement.querySelectorAll('.card-item');
    items.forEach(item => {
        const text = item.textContent.toLowerCase();
        item.style.display = text.includes(query.toLowerCase()) ? '' : 'none';
    });
}

