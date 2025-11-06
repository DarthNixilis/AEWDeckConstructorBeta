// listeners.js
import * as state from './state.js';
import * as renderer from './ui-renderer.js';
import * as filters from './filters.js';
import * as importer from './importer.js';
import * as exporter from './exporter.js';
import { debounce } from './utils.js';

// --- Deck Management Logic ---
function addCardToDeck(cardTitle, deckName) {
    const deck = deckName === 'starting' ? [...state.startingDeck] : [...state.purchaseDeck];
    deck.push(cardTitle);
    
    if (deckName === 'starting') {
        state.setStartingDeck(deck);
    } else {
        state.setPurchaseDeck(deck);
    }
    
    if (window.debug) window.debug.log(`Added "${cardTitle}" to ${deckName} deck`);
}

function removeCardFromDeck(cardTitle, deckName) {
    const deck = deckName === 'starting' ? [...state.startingDeck] : [...state.purchaseDeck];
    const index = deck.lastIndexOf(cardTitle);
    if (index > -1) {
        deck.splice(index, 1);
        if (deckName === 'starting') {
            state.setStartingDeck(deck);
        } else {
            state.setPurchaseDeck(deck);
        }
        return true;
    }
    return false;
}

function moveCard(cardTitle, fromDeck, toDeck) {
    if (removeCardFromDeck(cardTitle, fromDeck)) {
        const targetDeck = toDeck === 'starting' ? [...state.startingDeck] : [...state.purchaseDeck];
        targetDeck.push(cardTitle);
        if (toDeck === 'starting') {
            state.setStartingDeck(targetDeck);
        } else {
            state.setPurchaseDeck(targetDeck);
        }
        return true;
    }
    return false;
}
// --- End of Deck Management Logic ---

export function initializeEventListeners() {
    if (window.debug) window.debug.log('initializeEventListeners: Setting up event listeners...');
    
    // Use event delegation for all dynamic content
    document.body.addEventListener('click', (e) => {
        const target = e.target;

        // Card Pool Buttons
        if (target.matches('.card-actions button[data-deck-target]')) {
            const deckTarget = target.dataset.deckTarget;
            const cardTitle = target.dataset.title;
            if (cardTitle) {
                if (window.debug) window.debug.log(`Card action: Adding "${cardTitle}" to ${deckTarget} deck`);
                addCardToDeck(cardTitle, deckTarget);
            }
        }

        // Deck List Buttons
        else if (target.matches('.deck-card-action')) {
            const cardItem = target.closest('.deck-card-item');
            if (cardItem) {
                const cardTitle = cardItem.dataset.title;
                const action = target.dataset.action;
                const deckName = cardItem.closest('.deck-list-small').id === 'startingDeckList' ? 'starting' : 'purchase';

                if (window.debug) window.debug.log(`Deck action: ${action} "${cardTitle}" from ${deckName} deck`);

                if (action === 'remove') {
                    removeCardFromDeck(cardTitle, deckName);
                } else if (action === 'moveToPurchase') {
                    moveCard(cardTitle, 'starting', 'purchase');
                } else if (action === 'moveToStart') {
                    moveCard(cardTitle, 'purchase', 'starting');
                }
            }
        }

        // Card Modal Clicks
        else if (target.closest('.card-list-item, .card-grid-item, .persona-item, .deck-card-item')) {
            const cardElement = target.closest('[data-title]');
            if (cardElement) {
                renderer.showCardModal(cardElement.dataset.title);
            }
        }
    });

    // Static element listeners
    const searchInput = document.getElementById('searchInput');
    if (searchInput) searchInput.addEventListener('input', debounce(() => document.dispatchEvent(new CustomEvent('filtersChanged')), 300));
    
    const sortSelect = document.getElementById('sortSelect');
    if (sortSelect) sortSelect.addEventListener('change', (e) => { state.setCurrentSort(e.target.value); document.dispatchEvent(new CustomEvent('filtersChanged')); });

    // ... other static listeners for checkboxes, view toggles, etc.
    
    state.subscribeState('deckChanged', renderer.renderDecks);
    state.subscribeState('personaChanged', renderer.renderPersonaDisplay);
}

