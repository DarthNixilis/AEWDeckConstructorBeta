// listeners.js
import * as state from './state.js';
import * as renderer from './ui-renderer.js';
import * as filters from './filters.js';
import * as importer from './importer.js';
import * as exporter from './exporter.js';
import { debounce } from './utils.js';

// --- Deck Management Logic ---
function addCardToDeck(cardTitle, deckTarget) { /* ... same as before ... */ }
function removeCardFromDeck(cardTitle, deckName) { /* ... same as before ... */ }
function moveCard(cardTitle, fromDeck, toDeck) { /* ... same as before ... */ }

export function initializeEventListeners() {
    state.subscribeState('deckChanged', renderer.renderDecks);
    state.subscribeState('personaChanged', renderer.renderPersonaDisplay);

    document.body.addEventListener('click', (e) => {
        const target = e.target;
        // ... (The robust click handler from the previous message) ...
    });

    // ... (The non-click event listeners from the previous message) ...
}

