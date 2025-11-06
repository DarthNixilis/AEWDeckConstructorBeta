// listeners.js
import * as state from './state.js';
import * as renderer from './ui-renderer.js';
// ... other imports

// --- Deck Management Logic ---
function addCardToDeck(cardTitle, deckName) {
    console.log(`Attempting to add "${cardTitle}" to ${deckName} deck.`);
    const deck = deckName === 'starting' ? [...state.startingDeck] : [...state.purchaseDeck];
    deck.push(cardTitle);
    
    if (deckName === 'starting') {
        state.setStartingDeck(deck);
    } else {
        state.setPurchaseDeck(deck);
    }
}
// ... other functions in listeners.js ...

export function initializeEventListeners() {
    console.log('Initializing event listeners...');
    // ... the robust event delegation logic from before ...
}

