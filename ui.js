// ui.js

import { cardDatabase, keywordDatabase, currentViewMode, numGridColumns, startingDeck, purchaseDeck } from './config.js';
import { isSignatureFor } from './deck.js'; // We'll need this for highlighting

// --- DOM ELEMENT REFERENCES (Keep them here as they are UI-related) ---
const searchResults = document.getElementById('searchResults');
const startingDeckList = document.getElementById('startingDeckList');
const purchaseDeckList = document.getElementById('purchaseDeckList');
const startingDeckCount = document.getElementById('startingDeckCount');
const purchaseDeckCount = document.getElementById('purchaseDeckCount');
const personaDisplay = document.getElementById('personaDisplay');
const modalCardContent = document.getElementById('modalCardContent');
const cardModal = document.getElementById('cardModal');
const modalCloseButton = cardModal.querySelector('.modal-close-button');

// --- UTILITY ---
function toPascalCase(str) {
    if (!str) return '';
    return str.replace(/[^a-zA-Z0-9\s]+/g, '').split(/\s+/).map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join('');
}

// --- EXPORTED UI FUNCTIONS ---
export function renderCardPool(finalCards) {
    searchResults.innerHTML = '';
    searchResults.className = `card-list ${currentViewMode}-view`;
    if (currentViewMode === 'grid') {
        searchResults.setAttribute('data-columns', numGridColumns);
    } else {
        searchResults.removeAttribute('data-columns');
    }
    
    if (finalCards.length === 0) {
        searchResults.innerHTML = '<p>No cards match the current filters.</p>';
        return;
    }

    finalCards.forEach(card => {
        const cardElement = document.createElement('div');
        cardElement.className = currentViewMode === 'list' ? 'card-item' : 'grid-card-item';
        if (isSignatureFor(card)) {
            cardElement.classList.add('signature-highlight');
        }
        cardElement.dataset.title = card.title;

        if (currentViewMode === 'list') {
            cardElement.innerHTML = `<span data-title="${card.title}">${card.title} (C:${card.cost ?? 'N/A'}, D:${card.damage ?? 'N/A'}, M:${card.momentum ?? 'N/A'})</span>`;
            const buttonsDiv = document.createElement('div');
            buttonsDiv.className = 'card-buttons';
            if (card.cost === 0) {
                buttonsDiv.innerHTML = `<button data-title="${card.title}" data-deck-target="starting">Starting</button><button class="btn-purchase" data-title="${card.title}" data-deck-target="purchase">Purchase</button>`;
            } else {
                buttonsDiv.innerHTML = `<button class="btn-purchase" data-title="${card.title}" data-deck-target="purchase">Purchase</button>`;
            }
            cardElement.appendChild(buttonsDiv);
        } else {
            const visualHTML = generateCardVisualHTML(card);
            cardElement.innerHTML = `<div class="card-visual" data-title="${card.title}">${visualHTML}</div>`;
            const buttonsDiv = document.createElement('div');
            buttonsDiv.className = 'card-buttons';
            if (card.cost === 0) {
                buttonsDiv.innerHTML = `<button data-title="${card.title}" data-deck-target="starting">Starting</button><button class="btn-purchase" data-title="${card.title}" data-deck-target="purchase">Purchase</button>`;
            } else {
                buttonsDiv.innerHTML = `<button class="btn-purchase" data-title="${card.title}" data-deck-target="purchase">Purchase</button>`;
            }
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
    let keywordsText = keywords.map(kw => `<strong>${kw.name.trim()}:</strong> ${keywordDatabase[kw.name.trim()] || 'Definition not found.'}`).join('<br>');
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

export function renderPersonaDisplay(selectedWrestler, selectedManager) {
    if (!selectedWrestler) {
        personaDisplay.style.display = 'none';
        return;
    }
    personaDisplay.style.display = 'block';
    personaDisplay.innerHTML = '<h3>Persona & Kit</h3><div class="persona-card-list"></div>';
    const list = personaDisplay.querySelector('.persona-card-list');
    list.innerHTML = ''; 
    const cardsToShow = new Set();
    const activePersona = [];
    if (selectedWrestler) activePersona.push(selectedWrestler);
    if (selectedManager) activePersona.push(selectedManager);
    activePersona.forEach(p => cardsToShow.add(p));
    const activePersonaTitles = activePersona.map(p => p.title);
    const kitCards = cardDatabase.filter(card => isKitCard(card) && activePersonaTitles.includes(card['Signature For']));
    kitCards.forEach(card => cardsToShow.add(card));
    const sortedCards = Array.from(cardsToShow).sort((a, b) => {
        if (a.card_type === 'Wrestler') return -1;
        if (b.card_type === 'Wrestler') return 1;
        if (a.card_type === 'Manager') return -1;
        if (b.card_type === 'Manager') return 1;
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
    const card = cardDatabase.find(c => c.title === cardTitle);
    if (!card) return;
    modalCardContent.innerHTML = generateCardVisualHTML(card);
    cardModal.style.display = 'flex';
    cardModal.setAttribute('role', 'dialog');
    cardModal.setAttribute('aria-modal', 'true');
    modalCloseButton.focus();
}

export function renderDecks() {
    renderDeckList(startingDeckList, startingDeck, 'starting');
    renderDeckList(purchaseDeckList, purchaseDeck, 'purchase');
    updateDeckCounts();
}

function renderDeckList(element, deck, deckName) {
    element.innerHTML = '';
    const cardCounts = deck.reduce((acc, cardTitle) => { acc[cardTitle] = (acc[cardTitle] || 0) + 1; return acc; }, {});
    Object.entries(cardCounts).forEach(([cardTitle, count]) => {
        const card = cardDatabase.find(c => c.title === cardTitle);
        if (!card) return;
        const cardElement = document.createElement('div');
        cardElement.className = 'card-item';
        cardElement.innerHTML = `<span data-title="${card.title}">${count}x ${card.title}</span><button data-title="${card.title}" data-deck="${deckName}">Remove</button>`;
        element.appendChild(cardElement);
    });
}

function updateDeckCounts() {
    startingDeckCount.textContent = startingDeck.length;
    purchaseDeckCount.textContent = purchaseDeck.length;
    startingDeckCount.parentElement.style.color = startingDeck.length === 24 ? 'green' : 'red';
    document.getElementById('startingDeckHeader').style.color = startingDeck.length === 24 ? 'green' : 'inherit';
    purchaseDeckCount.parentElement.style.color = purchaseDeck.length >= 36 ? 'green' : 'red';
    document.getElementById('purchaseDeckHeader').style.color = purchaseDeck.length >= 36 ? 'green' : 'inherit';
}

function isKitCard(card) {
    return card && typeof card['Wrestler Kit'] === 'string' && card['Wrestler Kit'].toUpperCase() === 'TRUE';
}
