// ui.js

import { appState, updateAppState, isKitCard, isSignatureFor, CACHE_KEY } from './config.js'; 
// FIX 1: Added generatePlaytestCardHTML to imports
import { generateCardVisualHTML, generatePlaytestCardHTML } from './card-renderer.js'; 
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
const deckStatsContainer = document.getElementById('deckStatsContainer'); // Added as a const for clarity

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
    searchResults.innerHTML = '';
    const tempContainer = document.createElement('div');
    const fragment = document.createDocumentFragment();
    
    const isGridView = appState.view.cardPool.mode === 'grid';
    const numColumns = appState.view.cardPool.gridColumns;
    const useProxies = appState.view.cardPool.usePlaytestProxies;
    
    searchResults.style.display = isGridView ? 'grid' : 'block';
    if (isGridView) {
        searchResults.style.gridTemplateColumns = `repeat(${numColumns}, 1fr)`;
    } else {
        searchResults.style.gridTemplateColumns = 'none';
    }

    for (const card of cards) {
        let cardHTML;
        
        if (useProxies || !card.hasImage) {
            cardHTML = generatePlaytestCardHTML(card);
        } else {
            // Need a temp container for font size calculation in generateCardVisualHTML
            cardHTML = await withTempContainer((tc) => generateCardVisualHTML(card, tc));
        }

        const cardItem = document.createElement('div');
        cardItem.className = isGridView ? 'card-grid-item' : 'card-list-item';
        cardItem.dataset.title = card.title;
        cardItem.innerHTML = cardHTML;
        cardItem.onclick = () => showCardModal(card.title, isGridView);
        fragment.appendChild(cardItem);
    }

    searchResults.appendChild(fragment);
}

export async function renderDecks() {
    const renderCard = (cardTitle, deckType, deckElement) => {
        const card = appState.cardTitleCache[cardTitle];
        if (!card) return '';

        const isGridView = appState.view.deck.mode === 'grid';
        const useProxies = appState.view.cardPool.usePlaytestProxies;
        let cardHTML;

        if (useProxies || !card.hasImage) {
            cardHTML = generatePlaytestCardHTML(card);
        } else {
            // Synchronous call is fine for deck rendering after initial load
            const tempContainer = document.createElement('div');
            // We pass null for the tempContainer to avoid DOM manipulation during synchronous render. 
            // NOTE: generateCardVisualHTML might require an update to handle a null container if it relies on it for sync rendering.
            cardHTML = generateCardVisualHTML(card, tempContainer); 
        }

        const className = isGridView ? 'deck-grid-card-item' : 'card-item';
        const deckClass = deckType === 'starting' ? 'starting-card' : 'purchase-card';
        const removeFn = `removeCardFromDeck('${cardTitle}', '${deckType}')`;
        const clickFn = `showCardModal('${cardTitle}', ${isGridView})`;

        return `
            <div class="${className} ${deckClass}" data-title="${card.title}" onclick="${clickFn}" oncontextmenu="event.preventDefault(); ${removeFn};">
                ${cardHTML}
                <button class="remove-card-btn" onclick="event.stopPropagation(); ${removeFn};">&times;</button>
            </div>
        `;
    };

    const startingDeckCards = appState.deck.starting.map(title => appState.cardTitleCache[title]).filter(c => c).sort((a, b) => a.title.localeCompare(b.title));
    const purchaseDeckCards = appState.deck.purchase.map(title => appState.cardTitleCache[title]).filter(c => c).sort((a, b) => a.title.localeCompare(b.title));

    startingDeckList.innerHTML = startingDeckCards.map(card => renderCard(card.title, 'starting', startingDeckList)).join('');
    purchaseDeckList.innerHTML = purchaseDeckCards.map(card => renderCard(card.title, 'purchase', purchaseDeckList)).join('');

    startingDeckCount.textContent = `${appState.deck.starting.length}/24`;
    purchaseDeckCount.textContent = `${appState.deck.purchase.length}/36+`;
    
    // Set grid columns based on deck view mode
    const numDeckColumns = appState.view.deck.gridColumns;
    startingDeckList.style.gridTemplateColumns = appState.view.deck.mode === 'grid' ? `repeat(${numDeckColumns}, 1fr)` : 'none';
    purchaseDeckList.style.gridTemplateColumns = appState.view.deck.mode === 'grid' ? `repeat(${numDeckColumns}, 1fr)` : 'none';

    // Update expansion state
    startingDeckList.classList.toggle('expanded', appState.view.deck.expanded.starting);
    purchaseDeckList.classList.toggle('expanded', appState.view.deck.expanded.purchase);
    startingDeckHeader.querySelector('.expand-toggle').textContent = appState.view.deck.expanded.starting ? 'Collapse' : 'Expand';
    purchaseDeckHeader.querySelector('.expand-toggle').textContent = appState.view.deck.expanded.purchase ? 'Collapse' : 'Expand';

    // FIX 4: Removed non-existent persona icon update lines:
    // startingDeckHeader.querySelector('i').className = ...
    // purchaseDeckHeader.querySelector('i').className = ...

    renderDeckValidation();
    renderDeckStats();
    saveStateToCache();
}

export function renderPersonaDisplay() {
    personaDisplay.innerHTML = '';
    const wrestler = appState.deck.selectedWrestler;
    const manager = appState.deck.selectedManager;

    let html = '';
    if (wrestler) {
        html += `<div class="persona-item wrestler-persona">
            <i class="fas fa-user-circle"></i>
            <span class="persona-name">Wrestler: ${wrestler.title}</span>
            <span class="persona-momentum">M: ${wrestler.momentum ?? '–'}</span>
            <button onclick="clearPersona('wrestler')" class="clear-persona-btn">&times;</button>
        </div>`;
    } else {
        html += `<div class="persona-item placeholder-persona">Wrestler: None Selected</div>`;
    }

    if (manager) {
        html += `<div class="persona-item manager-persona">
            <i class="fas fa-hand-holding-usd"></i>
            <span class="persona-name">Manager: ${manager.title}</span>
            <span class="persona-momentum">M: ${manager.momentum ?? '–'}</span>
            <button onclick="clearPersona('manager')" class="clear-persona-btn">&times;</button>
        </div>`;
    } else {
        html += `<div class="persona-item placeholder-persona">Manager: None Selected</div>`;
    }

    const activePersonaTitles = [];
    if (wrestler) activePersonaTitles.push(wrestler.title);
    if (manager) activePersonaTitles.push(manager.title);
    
    const kitCards = appState.cardDatabase
        .filter(card => isKitCard(card) && activePersonaTitles.includes(card['Signature For']))
        .sort((a, b) => a.title.localeCompare(b.title));
        
    if (kitCards.length > 0) {
        html += `<div class="kit-cards-container"><h5>Kit Cards:</h5>`;
        html += kitCards.map(card => `<span class="kit-card-item" onclick="showCardModal('${card.title}', true)">${card.title}</span>`).join('');
        html += `</div>`;
    }

    personaDisplay.innerHTML = html;
}

export function renderDeckValidation() {
    const issues = validateDeck();
    validationIssuesContainer.innerHTML = '';
    
    if (issues.length === 0) {
        validationIssuesContainer.innerHTML = `<p class="validation-success">Deck is Valid!</p>`;
    } else {
        const ul = document.createElement('ul');
        issues.forEach(issue => {
            const li = document.createElement('li');
            li.className = 'validation-item validation-error';
            li.textContent = issue;
            ul.appendChild(li);
        });
        validationIssuesContainer.appendChild(ul);
    }
}

export async function showCardModal(cardTitle, isGridView) {
    const card = appState.cardTitleCache[cardTitle];
    if (!card) return;

    modalCardContent.innerHTML = '';
    const useProxies = appState.view.cardPool.usePlaytestProxies || !card.hasImage;

    // Use a temporary container for the full card HTML
    const cardHTML = await withTempContainer((tc) => {
        return useProxies ? generatePlaytestCardHTML(card) : generateCardVisualHTML(card, tc);
    });

    modalCardContent.innerHTML = cardHTML;
    cardModal.style.display = 'flex';
}

export function renderDeckStats() {
    const stats = DeckValidator.getDeckStats();
    
    // FIX 3: Correct DOM Element Reference for stats container (if not using the const from the top)
    const statsContainer = document.getElementById('deckStatsContainer');

    if (!statsContainer) {
        console.error("Deck stats container not found (ID: deckStatsContainer)");
        return;
    }

    // Handle case where wrestler is not selected (no cards available)
    if (stats.totalCards === 0 && (!appState.deck.selectedWrestler && !appState.deck.selectedManager)) {
        statsContainer.innerHTML = '<h3>Deck Statistics</h3><p>Select a Wrestler to begin constructing your deck.</p>';
        return;
    }

    const totalCards = stats.totalCards;
    const sortedCardTypes = Object.entries(stats.cardTypes).sort(([, countA], [, countB]) => countB - countA);
    const maxTypeCount = sortedCardTypes.length > 0 ? sortedCardTypes[0][1] : 1;
    const sortedCostCurve = Object.entries(stats.costCurve).map(([cost, count]) => [Number(cost), count]).sort(([costA], [costB]) => costA - costB);
    const maxCount = sortedCostCurve.length > 0 ? Math.max(...sortedCostCurve.map(([, count]) => count)) : 1;

    const statsHTML = `
        <h3>Deck Statistics</h3>
        <p>Total Cards: ${totalCards} / 60 (Min)</p>
        <p>Avg. Purchase Cost: ${stats.averageCost.toFixed(2)}</p>
        <div class="card-type-breakdown">
            <h5>Card Type Breakdown</h5>
            ${sortedCardTypes.map(([type, count]) => `
                <div class="type-bar-container" title="${type}: ${count} card(s)">
                    <div class="type-label">${type} (${count})</div>
                    <div class="type-bar-wrapper">
                        <div class="type-bar type-${type.toLowerCase().replace(/\s/g, '-')}" style="width: ${(count / maxTypeCount) * 100}%"></div>
                    </div>
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


function saveStateToCache() {
    const deckState = {
        wrestler: appState.deck.selectedWrestler ? appState.deck.selectedWrestler.title : null,
        manager: appState.deck.selectedManager ? appState.deck.selectedManager.title : null,
        startingDeck: appState.deck.starting,
        purchaseDeck: appState.deck.purchase,
        view: appState.view
    };
    localStorage.setItem(CACHE_KEY, JSON.stringify(deckState));
}

