// ui-renderer.js
import * as state from './state.js';

export function renderCardPool(cards) {
    console.log(`renderCardPool: Rendering ${cards.length} cards in ${state.currentViewMode} view.`);
    const container = document.getElementById('searchResults');
    if (!container) {
        console.error('renderCardPool: searchResults container not found!');
        return;
    }
    container.innerHTML = '';
    if (cards.length === 0) {
        container.innerHTML = '<div style="padding: 20px; text-align: center;">No cards match current filters.</div>';
        return;
    }
    if (state.currentViewMode === 'grid') {
        renderGridView(container, cards);
    } else {
        renderListView(container, cards);
    }
}

function renderListView(container, cards) {
    const fragment = document.createDocumentFragment();
    cards.forEach(card => {
        const item = document.createElement('div');
        item.className = 'card-list-item';
        item.dataset.title = card.title;
        item.innerHTML = `
            <div class="card-list-info">
                <strong>${card.title}</strong>
                <span class="card-type" style="margin-left: 10px; font-size: 0.9em; color: #555;">${card.type}</span>
                ${card.cost !== null ? `<span class="card-cost" style="margin-left: 10px;">Cost: ${card.cost}</span>` : ''}
            </div>
            <div class="card-actions">
                <button data-deck-target="starting" data-title="${card.title}" ${card.cost > 0 ? 'disabled' : ''}>Start</button>
                <button data-deck-target="purchase" data-title="${card.title}">Purchase</button>
            </div>
        `;
        fragment.appendChild(item);
    });
    container.appendChild(fragment);
}

function renderGridView(container, cards) {
    container.className = 'card-list grid-view';
    container.style.gridTemplateColumns = `repeat(${state.numGridColumns}, 1fr)`;
    const fragment = document.createDocumentFragment();
    cards.forEach(card => {
        const item = document.createElement('div');
        item.className = 'card-grid-item';
        item.dataset.title = card.title;
        item.innerHTML = `
            <div class="card-grid-title">${card.title}</div>
            <div class="card-grid-type">${card.type}</div>
            ${card.cost !== null ? `<div class="card-grid-stats">Cost: ${card.cost}</div>` : ''}
            <div class="card-actions">
                <button data-deck-target="starting" data-title="${card.title}" ${card.cost > 0 ? 'disabled' : ''}>Start</button>
                <button data-deck-target="purchase" data-title="${card.title}">Purchase</button>
            </div>
        `;
        fragment.appendChild(item);
    });
    container.appendChild(fragment);
}

export function renderDecks() {
    const startingDeckList = document.getElementById('startingDeckList');
    const purchaseDeckList = document.getElementById('purchaseDeckList');
    if (!startingDeckList || !purchaseDeckList) return;
    renderDeck(startingDeckList, state.startingDeck, 'starting');
    renderDeck(purchaseDeckList, state.purchaseDeck, 'purchase');
    updateDeckCounts();
}

function renderDeck(container, deck, deckName) {
    container.innerHTML = '';
    const counts = deck.reduce((acc, title) => { acc[title] = (acc[title] || 0) + 1; return acc; }, {});
    Object.entries(counts).sort((a, b) => a[0].localeCompare(b[0])).forEach(([title, count]) => {
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
                <button class="deck-card-action remove" data-action="remove" title="Remove">&times;</button>
            </div>
        `;
        container.appendChild(item);
    });
}

export function updateDeckCounts() {
    const startingDeckCount = document.getElementById('startingDeckCount');
    const purchaseDeckCount = document.getElementById('purchaseDeckCount');
    if (!startingDeckCount || !purchaseDeckCount) return;
    const startingCount = state.startingDeck.length;
    startingDeckCount.textContent = `${startingCount}/24`;
    purchaseDeckCount.textContent = `${state.purchaseDeck.length}/36+`;
    startingDeckCount.classList.toggle('full', startingCount === 24);
    startingDeckCount.classList.toggle('over', startingCount > 24);
}

export function renderPersonaDisplay() {
    const personaDisplay = document.getElementById('personaDisplay');
    if (!personaDisplay) return;
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
    const modal = document.getElementById('cardModal');
    const content = document.getElementById('modalCardContent');
    if (!modal || !content) return;

    let keywordHtml = '';
    const cardKeywords = [...(card.keywords || []), ...(card.traits || [])];
    if (cardKeywords.length > 0) {
        keywordHtml = '<div class="keyword-definitions"><h4>Keywords & Traits</h4>';
        cardKeywords.forEach(kw => {
            if (state.keywordDatabase[kw]) {
                keywordHtml += `<p><strong>${kw}:</strong> ${state.keywordDatabase[kw]}</p>`;
            }
        });
        keywordHtml += '</div>';
    }

    content.innerHTML = `
        <h3>${card.title}</h3>
        <p><strong>Type:</strong> ${card.type || 'N/A'}</p>
        <p><strong>Cost:</strong> ${card.cost ?? 'N/A'} | <strong>Damage:</strong> ${card.damage ?? 'N/A'} | <strong>Momentum:</strong> ${card.momentum ?? 'N/A'}</p>
        <p><strong>Text:</strong> ${card.card_raw_game_text || 'None'}</p>
        ${keywordHtml}
    `;
    modal.classList.add('visible');
}

export function closeAllModals() {
    document.querySelectorAll('.modal-backdrop.visible').forEach(m => m.classList.remove('visible'));
}

