// listeners.js
import * as state from './state.js';
import * as renderer from './ui-renderer.js';
import * as filters from './filters.js';
import * as importer from './importer.js';
import * as exporter from './exporter.js';
import { debounce } from './utils.js';

// --- Missing Functions ---
function removeCardFromDeck(cardTitle, deckName) {
    const deck = deckName === 'starting' ? state.startingDeck : state.purchaseDeck;
    const index = deck.lastIndexOf(cardTitle);
    if (index > -1) {
        const newDeck = [...deck];
        newDeck.splice(index, 1);
        deckName === 'starting' ? state.setStartingDeck(newDeck) : state.setPurchaseDeck(newDeck);
    }
}

function moveCard(cardTitle, fromDeck, toDeck) {
    const sourceDeck = fromDeck === 'starting' ? state.startingDeck : state.purchaseDeck;
    const targetDeck = toDeck === 'starting' ? state.startingDeck : state.purchaseDeck;
    
    const sourceIndex = sourceDeck.lastIndexOf(cardTitle);
    if (sourceIndex > -1) {
        const newSource = [...sourceDeck];
        newSource.splice(sourceIndex, 1);
        const newTarget = [...targetDeck, cardTitle];
        
        fromDeck === 'starting' ? state.setStartingDeck(newSource) : state.setPurchaseDeck(newSource);
        toDeck === 'starting' ? state.setStartingDeck(newTarget) : state.setPurchaseDeck(newTarget);
    }
}
// --- End of Missing Functions ---

export function initializeEventListeners() { /* ... same as before ... */ }

