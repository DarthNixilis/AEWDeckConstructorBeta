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

/**
 * Creates the HTML element for a single card in the pool or deck.
 */
function createCardElement(card, sourceDeck) {
    const isDeckCard = !!sourceDeck;
    const element = document.createElement('div');
    const mode = isDeckCard ? appState.view.deck.mode : appState.view.cardPool.mode;

    if (mode === 'grid') {
        element.className = isDeckCard ? 'deck-grid-card-item' : 'card-grid-item';
        element.dataset.title = card.title;
        element.style.flexBasis = `calc(${100 / (isDeckCard ? appState.view.deck.gridColumns : appState.view.cardPool.gridColumns)}% - 10px)`;
        
        const renderFunc = appState.view.cardPool.usePlaytestProxies || isKitCard(card) ? generatePlaytestCardHTML : generateCardVisualHTML;
        
        // Grid view renders asynchronously, using a temporary container helper
        element.innerHTML = `<div class="card-visual-placeholder">${card.title}</div>`;

        withTempContainer(async (tempContainer) => {
            const cardHTML = await renderFunc(card, tempContainer);
            if (cardHTML) {
                element.innerHTML = cardHTML;
            } else {
                element.innerHTML = `<div class="card-visual-placeholder error">Error rendering ${card.title}</div>`;
            }
        });

    } else { // List View
        element.className = 'card-item';
        element.dataset.title = card.title;
        
        let actions = '';
        if (isDeckCard) {
            actions = `
                <button class="remove-card-btn" data-title="${card.title}" data-deck="${sourceDeck}">Remove</button>
            `;
        } else if (isKitCard(card)) {
            // Kit cards can be viewed, but not added manually
            actions = `<span class="kit-card-tag">Kit Card (${card['Signature For']})</span>`;
        } else {
             // Main pool card
            actions = `
                <button class="add-starting-btn" data-title="${card.title}" ${card.cost !== 0 ? 'disabled title="Only 0-Cost cards allowed in Starting Deck"' : ''}>Add to Starting</button>
                <button class="add-purchase-btn" data-title="${card.title}">Add to Purchase</button>
            `;
        }

        element.innerHTML = `
            <div class="card-info">
                <span class="card-title">${card.title}</span>
                <span class="card-type">${card.card_type}</span>
                <span class="card-cost">${card.cost ?? '—'} C</span>
                <span class="card-damage">${card.damage ?? '—'} D</span>
                <span class="card-momentum">${card.momentum ?? '—'} M</span>
                <span class="card-set">(${card.set})</span>
            </div>
            <div class="card-actions">
                ${actions}
                <button class="view-card-btn" data-title="${card.title}">View</button>
            </div>
        `;
    }

    // Add modal click listener to the entire element in grid mode, or the view button in list mode
    const viewTarget = mode === 'grid' ? element : element.querySelector('.view-card-btn');
    if (viewTarget) {
        viewTarget.addEventListener('click', (e) => {
            if (e.target.closest('.add-starting-btn, .add-purchase-btn, .remove-card-btn')) return;
            showCardModal(card);
        });
    }

    return element;
}

/**
 * Renders the Card Pool based on filtered and sorted results.
 */
export function renderCardPool(cards) {
    searchResults.innerHTML = '';
    const mode = appState.view.cardPool.mode;

    if (mode === 'grid') {
        searchResults.className = 'card-pool-grid';
        searchResults.style.gridTemplateColumns = `repeat(${appState.view.cardPool.gridColumns}, 1fr)`;
    } else {
        searchResults.className = 'card-pool-list';
        searchResults.style.gridTemplateColumns = '1fr';
    }

    if (cards.length === 0) {
        searchResults.innerHTML = '<p class="no-results-message">No cards match your current filters.</p>';
        return;
    }

    cards.forEach(card => {
        searchResults.appendChild(createCardElement(card, null));
    });
}

/**
 * Renders both Starting and Purchase Decks.
 */
export function renderDecks() {
    const startingDeckCards = appState.deck.starting.map(title => appState.cardTitleCache[title]).filter(c => c);
    const purchaseDeckCards = appState.deck.purchase.map(title => appState.cardTitleCache[title]).filter(c => c);

    startingDeckList.innerHTML = '';
    purchaseDeckList.innerHTML = '';

    const renderList = (deckListElement, deckCards, deckName) => {
        const mode = appState.view.deck.mode;
        
        if (mode === 'grid') {
            deckListElement.className = 'deck-grid';
            deckListElement.style.gridTemplateColumns = `repeat(${appState.view.deck.gridColumns}, 1fr)`;
        } else {
            deckListElement.className = 'deck-list';
            deckListElement.style.gridTemplateColumns = '1fr';
        }
        
        // Group cards by title to display counts
        const cardCounts = deckCards.reduce((acc, card) => {
            acc[card.title] = { card: card, count: (acc[card.title]?.count || 0) + 1 };
            return acc;
        }, {});

        // Sort alphabetically
        const sortedTitles = Object.keys(cardCounts).sort((a, b) => a.localeCompare(b));

        sortedTitles.forEach(title => {
            const { card, count } = cardCounts[title];
            const cardElement = createCardElement(card, deckName);
            
            if (mode === 'list') {
                const countSpan = document.createElement('span');
                countSpan.className = 'card-count';
                countSpan.textContent = `${count}x`;
                cardElement.prepend(countSpan);
            } else {
                // For grid view, prepend count to the title (placeholder or rendered card)
                // This is less accurate due to async rendering, but better than nothing.
                const countLabel = document.createElement('div');
                countLabel.className = 'deck-card-count-overlay';
                countLabel.textContent = `${count}x`;
                cardElement.prepend(countLabel);
            }
            
            deckListElement.appendChild(cardElement);
        });
    };

    renderList(startingDeckList, startingDeckCards, 'starting');
    renderList(purchaseDeckList, purchaseDeckCards, 'purchase');
    
    startingDeckCount.textContent = startingDeckCards.length;
    purchaseDeckCount.textContent = purchaseDeckCards.length;
    
    // Toggle deck list visibility based on expansion state
    startingDeckList.classList.toggle('expanded', appState.view.deck.expanded.starting);
    purchaseDeckList.classList.toggle('expanded', appState.view.deck.expanded.purchase);
    startingDeckHeader.querySelector('i').className = appState.view.deck.expanded.starting ? 'fas fa-chevron-up' : 'fas fa-chevron-down';
    purchaseDeckHeader.querySelector('i').className = appState.view.deck.expanded.purchase ? 'fas fa-chevron-up' : 'fas fa-chevron-down';


    renderValidation(validateDeck());
    renderDeckStats();
    saveStateToCache();
}

/**
 * Renders the Wrestler and Manager info.
 */
export function renderPersonaDisplay() {
    personaDisplay.innerHTML = '';
    const wrestler = appState.deck.selectedWrestler;
    const manager = appState.deck.selectedManager;

    const renderPersona = (persona, role) => {
        if (!persona) return '';
        
        const isKitCardFlag = isKitCard(persona); // Should always be true for Wrestler/Manager
        const renderFunc = appState.view.cardPool.usePlaytestProxies || isKitCardFlag ? generatePlaytestCardHTML : generateCardVisualHTML;

        // Use a placeholder immediately, then render async
        const container = document.createElement('div');
        container.className = 'persona-card';
        container.dataset.title = persona.title;
        container.innerHTML = `<div class="card-visual-placeholder">${persona.title}</div>`;

        withTempContainer(async (tempContainer) => {
            const cardHTML = await renderFunc(persona, tempContainer);
            if (cardHTML) {
                container.innerHTML = cardHTML;
            } else {
                container.innerHTML = `<div class="card-visual-placeholder error">Error rendering ${persona.title}</div>`;
            }
        });

        // Add modal listener
        container.addEventListener('click', () => showCardModal(persona));

        return container;
    }
    
    const wrestlerElement = renderPersona(wrestler, 'Wrestler');
    if (wrestlerElement) personaDisplay.appendChild(wrestlerElement);

    const managerElement = renderPersona(manager, 'Manager');
    if (managerElement) personaDisplay.appendChild(managerElement);

    const kitCards = appState.cardDatabase.filter(card => isKitCard(card) && isSignatureFor(card)).sort((a, b) => a.title.localeCompare(b.title));

    if (kitCards.length > 0) {
        const kitHeader = document.createElement('h4');
        kitHeader.textContent = 'Kit Cards (Not in Deck)';
        personaDisplay.appendChild(kitHeader);

        const kitContainer = document.createElement('div');
        kitContainer.className = 'kit-cards-container';
        
        kitCards.forEach(card => {
            const cardElement = createCardElement(card, null);
            kitContainer.appendChild(cardElement);
        });

        personaDisplay.appendChild(kitContainer);
    }
}


/**
 * Populates and shows the modal with a single card's visual render.
 */
export async function showCardModal(card) {
    modalCardContent.innerHTML = '<div class="card-loading-message">Loading card preview...</div>';
    cardModal.style.display = 'block';

    const isKitCardFlag = isKitCard(card);
    const renderFunc = appState.view.cardPool.usePlaytestProxies || isKitCardFlag ? generatePlaytestCardHTML : generateCardVisualHTML;

    await withTempContainer(async (tempContainer) => {
        const cardHTML = await renderFunc(card, tempContainer);
        if (cardHTML) {
            modalCardContent.innerHTML = cardHTML;
        } else {
            modalCardContent.innerHTML = `<div class="card-visual-placeholder error">Error rendering ${card.title}</div>`;
        }
    });
}

/**
 * Renders deck validation issues.
 */
function renderValidation(issues) {
    validationIssuesContainer.innerHTML = '';
    
    if (issues.length === 0) {
        validationIssuesContainer.innerHTML = '<div class="validation-success">Deck is Valid!</div>';
        return;
    }
    
    const ul = document.createElement('ul');
    issues.forEach(issue => {
        const li = document.createElement('li');
        li.className = 'validation-item validation-error';
        li.textContent = issue;
        ul.appendChild(li);
    });
    
    validationIssuesContainer.innerHTML = '<h4>Deck Validation Issues:</h4>';
    validationIssuesContainer.appendChild(ul);
}


/**
 * Renders deck statistics.
 */
function renderDeckStats() {
    const statsContainer = document.getElementById('deckStats');
    const stats = DeckValidator.getDeckStats();
    
    const costCurveEntries = Object.entries(stats.costCurve).map(([cost, count]) => ({ cost: Number(cost), count: count }));
    const sortedCostCurve = costCurveEntries.sort((a, b) => a.cost - b.cost).map(e => [e.cost, e.count]);
    const maxCount = Math.max(...sortedCostCurve.map(e => e[1]), 1); // Avoid division by zero

    const totalNonPersonaCards = stats.totalCards - (appState.deck.selectedWrestler ? 1 : 0) - (appState.deck.selectedManager ? 1 : 0);
    
    const statsHTML = `
        <h3>Deck Statistics</h3>
        <div class="stat-summary">
            <div><strong>Total Cards in Deck (Starting + Purchase):</strong> ${totalNonPersonaCards}</div>
            <div><strong>Starting Deck Size:</strong> ${appState.deck.starting.length}/24</div>
            <div><strong>Purchase Deck Size:</strong> ${appState.deck.purchase.length}/36</div>
            <div><strong>Average Purchase Cost:</strong> ${stats.averageCost.toFixed(2)} C</div>
        </div>
        
        <div class="card-type-breakdown">
            <h5>Card Type Breakdown (Total)</h5>
            ${Object.entries(stats.cardTypes).sort((a, b) => b[1] - a[1]).map(([type, count]) => `
                <div class="type-item">
                    <span>${type}:</span>
                    <span class="type-count">${count}</span>
                </div>
            `).join('')}
        </div>
        <div class="cost-curve">
            <h5>Cost Curve (Purchase Deck)</h5>
            <div class="curve-bars">
                ${sortedCostCurve.map(([cost, count]) => `
                    <div class="curve-bar" title="${count} card(s) at cost ${cost}">
                        <div class="bar-label">${count > 0 ? count : ''}</div>
                        <div class="bar" style="height: ${(count / maxCount) * 100}%; background-color: var(--purchase-color);"></div>
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

