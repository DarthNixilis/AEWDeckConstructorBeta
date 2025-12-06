// ui.js

import { appState, updateAppState, isKitCard, isSignatureFor, CACHE_KEY } from './config.js'; // ADDED isKitCard, isSignatureFor
import { generateCardVisualHTML } from './card-renderer.js';
import { validateDeck, DeckValidator } from './deck.js';

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

// BUG FIX: Wrapper to prevent memory leaks
async function withTempContainer(callback) {
    const tempContainer = document.createElement('div');
    tempContainer.style.position = 'absolute';
    tempContainer.style.left = '-9999px';
    document.body.appendChild(tempContainer);
    
    try {
        return await callback(tempContainer);
    } finally {
        document.body.removeChild(tempContainer);
    }
}

export async function renderCardPool(cards) {
    const view = appState.view.cardPool;
    searchResults.innerHTML = '';
    searchResults.className = `card-list ${view.mode}-view`;
    if (view.mode === 'grid') {
        searchResults.setAttribute('data-columns', view.gridColumns);
    } else {
        searchResults.removeAttribute('data-columns');
    }
    
    if (cards.length === 0) {
        searchResults.innerHTML = '<p>No cards match the current filters.</p>';
        return;
    }

    await withTempContainer(async (tempContainer) => {
        const cardPromises = cards.map(async (card) => {
            const cardElement = document.createElement('div');
            cardElement.className = view.mode === 'list' ? 'card-item' : 'grid-card-item';
            if (isSignatureFor(card)) cardElement.classList.add('signature-highlight'); // Using imported function
            cardElement.dataset.title = card.title;

            if (view.mode === 'list') {
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
                const visualHTML = await generateCardVisualHTML(card, tempContainer);
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
            return cardElement;
        });

        const cardElements = await Promise.all(cardPromises);
        cardElements.forEach(el => searchResults.appendChild(el));
    });
}

export function renderPersonaDisplay() {
    if (!appState.deck.selectedWrestler) { personaDisplay.style.display = 'none'; return; }
    personaDisplay.style.display = 'block';
    personaDisplay.innerHTML = '<h3>Persona & Kit</h3><div class="persona-card-list"></div>';
    const list = personaDisplay.querySelector('.persona-card-list');
    list.innerHTML = ''; 
    const cardsToShow = new Set();
    const activePersona = [];
    if (appState.deck.selectedWrestler) activePersona.push(appState.deck.selectedWrestler);
    if (appState.deck.selectedManager) activePersona.push(appState.deck.selectedManager);
    activePersona.forEach(p => cardsToShow.add(p));
    const activePersonaTitles = activePersona.map(p => p.title);
    const kitCards = appState.cardDatabase.filter(card => isKitCard(card) && activePersonaTitles.includes(card['Signature For'])); // Using imported function
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

export async function showCardModal(cardTitle) {
    updateAppState('ui.lastFocusedElement', document.activeElement);
    const card = appState.cardDatabase.find(c => c.title === cardTitle);
    if (!card) return;
    modalCardContent.innerHTML = await generateCardVisualHTML(card);
    cardModal.style.display = 'flex';
    cardModal.setAttribute('role', 'dialog');
    cardModal.setAttribute('aria-modal', 'true');
    modalCloseButton.focus();
}

export async function renderDecks() {
    deckGridSizeControls.style.display = appState.view.deck.mode === 'grid' ? 'flex' : 'none';
    await Promise.all([
        renderDeckList(startingDeckList, appState.deck.starting, 'starting'),
        renderDeckList(purchaseDeckList, appState.deck.purchase, 'purchase')
    ]);
    updateDeckCounts();
    renderValidationIssues();
    renderDeckStats();
    saveStateToCache();
}

async function renderDeckList(element, deck, deckName) {
    const view = appState.view.deck;
    element.innerHTML = '';
    element.className = `deck-list ${view.mode}-view`;
    if (view.expanded[deckName]) element.classList.add('expanded');

    const cardCounts = deck.reduce((acc, cardTitle) => { acc[cardTitle] = (acc[cardTitle] || 0) + 1; return acc; }, {});
    const uniqueSortedTitles = Object.keys(cardCounts).sort((a, b) => a.localeCompare(b));

    if (view.mode === 'list') {
        element.removeAttribute('data-columns');
        uniqueSortedTitles.forEach(cardTitle => {
            const card = appState.cardTitleCache[cardTitle];
            const count = cardCounts[cardTitle];
            const cardElement = document.createElement('div');
            cardElement.className = 'card-item';
            cardElement.dataset.title = cardTitle;

            let buttonsHTML = `<button data-action="remove" data-deck="${deckName}" data-title="${cardTitle}">Remove</button>`;
            if (card.cost === 0) {
                const moveTarget = deckName === 'starting' ? 'Purchase' : 'Starting';
                buttonsHTML += `<button data-action="move" data-deck="${deckName}" data-title="${cardTitle}" class="btn-move">To ${moveTarget}</button>`;
            }

            cardElement.innerHTML = `<span data-title="${cardTitle}">${count}x ${cardTitle}</span><div class="card-buttons">${buttonsHTML}</div>`;
            element.appendChild(cardElement);
        });
    } else {
        element.setAttribute('data-columns', view.gridColumns);
        await withTempContainer(async (tempContainer) => {
            const cardPromises = deck.sort((a, b) => a.localeCompare(b)).map(async (cardTitle) => {
                const card = appState.cardTitleCache[cardTitle];
                if (!card) return null;

                const cardElement = document.createElement('div');
                cardElement.className = 'deck-grid-card-item';
                cardElement.dataset.title = card.title;

                let buttonsHTML = `<button data-action="remove" data-deck="${deckName}" data-title="${cardTitle}">Remove</button>`;
                if (card.cost === 0) {
                    const moveTarget = deckName === 'starting' ? 'Purchase' : 'Starting';
                    buttonsHTML += `<button data-action="move" data-deck="${deckName}" data-title="${cardTitle}" class="btn-move">To ${moveTarget}</button>`;
                }

                const visualHTML = await generateCardVisualHTML(card, tempContainer);
                cardElement.innerHTML = `<div class="card-visual" data-title="${card.title}">${visualHTML}</div><div class="deck-grid-buttons">${buttonsHTML}</div>`;
                return cardElement;
            });

            const cardElements = await Promise.all(cardPromises);
            cardElements.filter(Boolean).forEach(el => element.appendChild(el));
        });
    }
}

// BUG FIX: Correctly assign header colors
function updateDeckCounts() {
    const startingDeckLength = appState.deck.starting.length;
    const purchaseDeckLength = appState.deck.purchase.length;
    startingDeckCount.textContent = startingDeckLength;
    purchaseDeckCount.textContent = purchaseDeckLength;
    
    startingDeckHeader.style.color = startingDeckLength === 24 ? 'var(--success-color)' : 'var(--danger-color)';
    purchaseDeckHeader.style.color = purchaseDeckLength >= 36 ? 'var(--success-color)' : 'var(--danger-color)';
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

// BUG FIX: Ensure stats container exists before trying to update it
export function renderDeckStats() {
    const stats = DeckValidator.getDeckStats();
    let statsContainer = document.getElementById('deckStatsContainer');
    if (!statsContainer) {
        console.error("Could not find #deckStatsContainer");
        return;
    }

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
            <h5>Cost Curve (Purchase Deck)</h5>
            <div class="curve-bars">
                ${sortedCostCurve.map(([cost, count]) => `
                    <div class="curve-bar" title="${count} card(s) at cost ${cost}">
                        <div class="bar-label">${count > 0 ? count : ''}</div>
                        <div class="bar" style="height: ${(count / maxCount) * 100}%"></div>
                        <div class="cost-label">${cost}</div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
    
    statsContainer.innerHTML = statsHTML;
}

export function filterDeckList(deckListElement, query) {
    const itemSelector = appState.view.deck.mode === 'list' ? '.card-item' : '.deck-grid-card-item';
    const items = deckListElement.querySelectorAll(itemSelector);
    items.forEach(item => {
        const text = item.dataset.title.toLowerCase();
        item.style.display = text.includes(query.toLowerCase()) ? '' : 'none';
    });
}

function saveStateToCache() {
    const deckState = {
        wrestler: appState.deck.selectedWrestler ? appState.deck.selectedWrestler.title : null,
        manager: appState.deck.selectedManager ? appState.deck.selectedManager.title : null,
        startingDeck: appState.deck.starting,
        purchaseDeck: appState.deck.purchase
    };
    localStorage.setItem(CACHE_KEY, JSON.stringify(deckState));
}
