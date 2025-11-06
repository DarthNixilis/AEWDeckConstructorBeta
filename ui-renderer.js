// ui-renderer.js
import * as state from './state.js';

// ... (Element cache and other functions remain the same) ...

function renderListView(container, cards) {
    if (window.debug) window.debug.log('renderListView: Rendering list view...');
    container.className = 'card-list list-view';
    const fragment = document.createDocumentFragment();
    
    cards.forEach(card => {
        const item = document.createElement('div');
        item.className = 'card-list-item';
        item.dataset.title = card.title;
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
        item.dataset.title = card.title;
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

// ... (The rest of ui-renderer.js remains the same) ...

