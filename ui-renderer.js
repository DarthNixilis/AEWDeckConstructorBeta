// ui-renderer.js
import * as state from './state.js';

// --- Element Cache ---
const getElement = (id) => document.getElementById(id);
const elements = {
    searchResults: getElement('searchResults'),
    startingDeckList: getElement('startingDeckList'),
    purchaseDeckList: getElement('purchaseDeckList'),
    startingDeckCount: getElement('startingDeckCount'),
    purchaseDeckCount: getElement('purchaseDeckCount'),
    personaDisplay: getElement('personaDisplay'),
    cardModal: getElement('cardModal'),
    modalCardContent: getElement('modalCardContent'),
};

// --- Core Rendering Functions ---

export function renderCardPool(cards) {
    if (window.debug) window.debug.log(`renderCardPool: Rendering ${cards.length} cards`);
    
    const container = elements.searchResults;
    if (!container) {
        if (window.debug) window.debug.error('renderCardPool: searchResults container not found!');
        return;
    }

    if (window.debug) window.debug.log(`renderCardPool: Container found, current view mode: ${state.currentViewMode}`);
    
    container.innerHTML = '';
    
    if (cards.length === 0) {
        container.innerHTML = '<div class="no-cards-message" style="padding: 20px; text-align: center;">No cards match the current filters.</div>';
        if (window.debug) window.debug.log('renderCardPool: No cards to display, showing message.');
        return;
    }

    if (state.currentViewMode === 'grid') {
        renderGridView(container, cards);
    } else {
        renderListView(container, cards);
    }
    
    if (window.debug) window.debug.log(`renderCardPool: Successfully rendered ${cards.length} cards into the DOM.`);
}

function renderListView(container, cards) {
    if (window.debug) window.debug.log('renderListView: Rendering list view...');
    container.className = 'card-list list-view';
    const fragment = document.createDocumentFragment();
    
    cards.forEach(card => {
        const item = document.createElement('div');
        item.className = 'card-list-item';
        item.dataset.title = card.title; // For modal click
        item.innerHTML = `
            <div class="card-list-info">
                <strong>${card.title}</strong> 
                <span class="card-type" style="margin-left: 10px; font-size: 0.9em; color: #555;">${card.type}</span>
                ${card.cost !== undefined ? `<span class="card-cost" style="margin-left: 10px;">Cost: ${card.cost}</span>` : ''}
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
    if (window.debug) window.debug.log('renderGridView: Rendering grid view...');
    container.className = 'card-list grid-view';
    container.style.gridTemplateColumns = `repeat(${state.numGridColumns}, 1fr)`;
    const fragment = document.createDocumentFragment();
    
    cards.forEach(card => {
        const item = document.createElement('div');
        item.className = 'card-grid-item';
        item.dataset.title = card.title; // For modal click
        item.innerHTML = `
            <div class="card-grid-title">${card.title}</div>
            <div class="card-grid-type">${card.type}</div>
            ${card.cost !== undefined ? `<div class="card-grid-stats">Cost: ${card.cost}</div>` : ''}
            <div class="card-actions">
                <button data-deck-target="starting" data-title="${card.title}" ${card.cost > 0 ? 'disabled' : ''}>Start</button>
                <button data-deck-target="purchase" data-title="${card.title}">Purchase</button>
            </div>
        `;
        fragment.appendChild(item);
    });
    container.appendChild(fragment);
}

export function renderDecks() { /* ... same as before ... */ }
export function updateDeckCounts() { /* ... same as before ... */ }
export function renderPersonaDisplay() { /* ... same as before ... */ }
export function showCardModal(cardTitle) { /* ... same as before ... */ }
export function closeAllModals() { /* ... same as before ... */ }

