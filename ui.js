// ui.js

import * as state from './config.js';
import { generateCardVisualHTML } from './card-renderer.js';
import { validateDeck, DeckValidator } from './deck.js'; // Import DeckValidator

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
const validationIssuesContainer = document.getElementById('validationIssues');
const deckGridSizeControls = document.getElementById('deckGridSizeControls');

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
    deckGridSizeControls.style.display = state.deckViewMode === 'grid' ? 'flex' : 'none';
    renderDeckList(startingDeckList, state.startingDeck, 'starting');
    renderDeckList(purchaseDeckList, state.purchaseDeck, 'purchase');
    updateDeckCounts();
    renderValidationIssues();
    renderDeckStats(); // NEW: Call stats rendering
    state.saveStateToCache();
}

function renderDeckList(element, deck, deckName) {
    element.innerHTML = '';
    element.className = `deck-list ${state.deckViewMode}-view`;
    if (state.isStartingDeckExpanded && deckName === 'starting') element.classList.add('expanded');
    if (state.isPurchaseDeckExpanded && deckName === 'purchase') element.classList.add('expanded');

    const cardCounts = deck.reduce((acc, cardTitle) => { acc[cardTitle] = (acc[cardTitle] || 0) + 1; return acc; }, {});
    const uniqueSortedTitles = Object.keys(cardCounts).sort((a, b) => a.localeCompare(b));

    if (state.deckViewMode === 'list') {
        element.removeAttribute('data-columns');
        uniqueSortedTitles.forEach(cardTitle => {
            const card = state.cardTitleCache[cardTitle];
            const count = cardCounts[cardTitle];
            const cardElement = document.createElement('div');
            cardElement.className = 'card-item';
            cardElement.dataset.title = cardTitle;

            let buttonsHTML = `<button data-action="remove" data-deck="${deckName}" data-title="${cardTitle}">Remove</button>`;
            if (deckName === 'purchase' && card.cost === 0) {
                buttonsHTML += `<button data-action="move" data-deck="${deckName}" data-title="${cardTitle}" class="btn-move">Move</button>`;
            }
            if (deckName === 'starting') {
                 buttonsHTML += `<button data-action="move" data-deck="${deckName}" data-title="${cardTitle}" class="btn-move">Move</button>`;
            }

            cardElement.innerHTML = `<span data-title="${cardTitle}">${count}x ${cardTitle}</span><div class="card-buttons">${buttonsHTML}</div>`;
            element.appendChild(cardElement);
        });
    } else {
        element.setAttribute('data-columns', state.numDeckGridColumns);
        deck.sort((a, b) => a.localeCompare(b)).forEach(cardTitle => {
            const card = state.cardTitleCache[cardTitle];
            if (!card) return;

            const cardElement = document.createElement('div');
            cardElement.className = 'deck-grid-card-item';
            cardElement.dataset.title = card.title;

            let buttonsHTML = `<button data-action="remove" data-deck="${deckName}" data-title="${cardTitle}">Remove</button>`;
            if (deckName === 'purchase' && card.cost === 0) {
                buttonsHTML += `<button data-action="move" data-deck="${deckName}" data-title="${cardTitle}" class="btn-move">To Starting</button>`;
            }
             if (deckName === 'starting') {
                buttonsHTML += `<button data-action="move" data-deck="${deckName}" data-title="${cardTitle}" class="btn-move">To Purchase</button>`;
            }

            const visualHTML = generateCardVisualHTML(card);
            cardElement.innerHTML = `<div class="card-visual" data-title="${card.title}">${visualHTML}</div><div class="deck-grid-buttons">${buttonsHTML}</div>`;
            element.appendChild(cardElement);
        });
    }
}

function updateDeckCounts() {
    startingDeckCount.textContent = state.startingDeck.length;
    purchaseDeckCount.textContent = state.purchaseDeck.length;
    startingDeckCount.parentElement.style.color = state.startingDeck.length === 24 ? 'var(--success-color)' : 'var(--danger-color)';
    purchaseDeckHeader.style.color = state.startingDeck.length === 24 ? 'var(--success-color)' : 'inherit';
    purchaseDeckCount.parentElement.style.color = state.purchaseDeck.length >= 36 ? 'var(--success-color)' : 'var(--danger-color)';
    purchaseDeckHeader.style.color = state.purchaseDeck.length >= 36 ? 'var(--success-color)' : 'inherit';
}

function renderValidationIssues() {
    const issues = validateDeck();
    if (!validationIssuesContainer) return;
    validationIssuesContainer.innerHTML = '';
    if (issues.length === 0) {
        validationIssuesContainer.innerHTML = '<div class="validation-item validation-success">Deck is valid!</div>';
    } else {
        const list = document.createElement('ul');
        issues.forEach(issue => {
            const item = document.createElement('li');
            item.className = 'validation-item validation-error';
            item.textContent = issue;
            list.appendChild(item);
        });
        validationIssuesContainer.appendChild(list);
    }
}

// NEW: Function to render deck statistics
export function renderDeckStats() {
    const stats = DeckValidator.getDeckStats();
    const sortedCardTypes = Object.entries(stats.cardTypes).sort((a, b) => a[0].localeCompare(b[0]));
    const sortedCostCurve = Object.entries(stats.costCurve).sort((a, b) => Number(a[0]) - Number(b[0]));
    const maxCount = Math.max(...Object.values(stats.costCurve), 1);

    const statsHTML = `
        <h4>Deck Statistics</h4>
        <div class="stat-grid">
            <div class="stat-item">
                <span class="stat-label">Total Cards:</span>
                <span class="stat-value">${stats.totalCards}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Avg Cost:</span>
                <span class="stat-value">${stats.averageCost.toFixed(2)}</span>
            </div>
            ${sortedCardTypes.map(([type, count]) => `
                <div class="stat-item">
                    <span class="stat-label">${type}:</span>
                    <span class="stat-value">${count}</span>
                </div>
            `).join('')}
        </div>
        <div class="cost-curve">
            <h5>Cost Curve</h5>
            <div class="curve-bars">
                ${sortedCostCurve.map(([cost, count]) => `
                    <div class="curve-bar" title="${count} card(s) at cost ${cost}">
                        <div class="bar-label">${count}</div>
                        <div class="bar" style="height: ${(count / maxCount) * 100}%"></div>
                        <div class="cost-label">${cost}</div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
    
    let statsContainer = document.getElementById('deckStatsContainer');
    statsContainer.innerHTML = statsHTML;
}

export function filterDeckList(deckListElement, query) {
    const itemSelector = state.deckViewMode === 'list' ? '.card-item' : '.deck-grid-card-item';
    const items = deckListElement.querySelectorAll(itemSelector);
    items.forEach(item => {
        const text = item.dataset.title.toLowerCase();
        item.style.display = text.includes(query.toLowerCase()) ? '' : 'none';
    });
}

