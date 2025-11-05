// listeners.js
import * as state from './state.js';
// ... other imports

// --- Corrected Implementations ---
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
    // This function now correctly uses the return value of removeCardFromDeck
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
// --- End of Corrected Implementations ---

export function initializeEventListeners() { /* ... same as before ... */ }

