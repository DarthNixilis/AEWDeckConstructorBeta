// listeners.js
import * as state from './state.js';
import * as renderer from './ui-renderer.js';
import * as filters from './filters.js';
import * as importer from './importer.js';
import * as exporter from './exporter.js';
import { debounce } from './utils.js';

// --- Deck Management Logic ---
function addCardToDeck(cardTitle, deckTarget) {
    const card = state.cardTitleCache[cardTitle];
    if (!card) return;
    if (deckTarget === 'starting') {
        if (card.cost > 0) return; // Game rule: Can't add >0 cost cards to starting
        const currentCount = state.startingDeck.filter(t => t === cardTitle).length;
        if (card.cost === 0 && currentCount >= 2) {
            if (confirm(`You can only have 2 copies of "${cardTitle}" in your Starting Deck. Add the 3rd copy to your Purchase Deck?`)) {
                state.setPurchaseDeck([...state.purchaseDeck, cardTitle]);
            }
            return;
        }
        state.setStartingDeck([...state.startingDeck, cardTitle]);
    } else {
        state.setPurchaseDeck([...state.purchaseDeck, cardTitle]);
    }
}
function removeCardFromDeck(cardTitle, deckName) { /* ... same as before ... */ }
function moveCard(cardTitle, fromDeck, toDeck) { /* ... same as before ... */ }

// --- Main Event Listener Initialization ---
export function initializeEventListeners() {
    state.subscribeState('deckChanged', renderer.renderDecks);
    state.subscribeState('personaChanged', renderer.renderPersonaDisplay);

    document.body.addEventListener('click', (e) => {
        const target = e.target;
        const cardItem = target.closest('[data-title]');

        if (target.matches('[data-deck-target]')) {
            const title = target.closest('[data-title]').dataset.title;
            addCardToDeck(title, target.dataset.deckTarget);
            return;
        }
        if (target.matches('[data-action]')) {
            const title = target.closest('[data-title]').dataset.title;
            const action = target.dataset.action;
            if (action === 'remove') {
                const deckName = target.closest('#startingDeckList') ? 'starting' : 'purchase';
                removeCardFromDeck(title, deckName);
            } else if (action === 'moveToPurchase') {
                moveCard(title, 'starting', 'purchase');
            } else if (action === 'moveToStart') {
                moveCard(title, 'purchase', 'starting');
            }
            return;
        }
        if (cardItem) {
            renderer.showCardModal(cardItem.dataset.title);
            return;
        }

        // --- EXPORT BUTTON FIX ---
        // The confirmExportBtn has a span inside, so we need to check the button itself.
        const exportBtn = target.closest('#confirmExportBtn');
        if (exportBtn) {
            const select = document.getElementById('exportSelect');
            exporter.handleExport(select.value);
            exportBtn.classList.remove('visible');
            select.value = "";
            return;
        }
        // --- END OF FIX ---

        const handlers = {
            'viewModeToggle': () => { /* ... same as before ... */ },
            'clearDeck': () => { /* ... same as before ... */ },
            'importDeck': () => document.getElementById('importModal').classList.add('visible'),
            'processImportBtn': () => importer.parseAndLoadDeck(document.getElementById('deckTextInput').value),
        };
        if (handlers[target.id]) {
            handlers[target.id]();
            return;
        }
        
        if (target.matches('#gridSizeControls button')) { /* ... same as before ... */ }
        if (target.matches('.modal-backdrop, .modal-close-button')) { renderer.closeAllModals(); return; }
    });

    // --- Non-click event listeners ---
    const refresh = () => renderer.renderCardPool(filters.getFilteredAndSortedCardPool());
    document.addEventListener('filtersChanged', refresh);
    document.getElementById('searchInput').addEventListener('input', debounce(refresh, 300));
    document.getElementById('sortSelect').addEventListener('change', (e) => { state.setCurrentSort(e.target.value); refresh(); });
    document.getElementById('showZeroCost').addEventListener('change', (e) => { state.setShowZeroCost(e.target.checked); refresh(); });
    document.getElementById('showNonZeroCost').addEventListener('change', (e) => { state.setShowNonZeroCost(e.target.checked); refresh(); });
    document.getElementById('wrestlerSelect').addEventListener('change', (e) => state.setSelectedWrestler(state.cardTitleCache[e.target.value] || null));
    document.getElementById('managerSelect').addEventListener('change', (e) => state.setSelectedManager(state.cardTitleCache[e.target.value] || null));
    
    document.getElementById('exportSelect').addEventListener('change', (e) => {
        const btn = document.getElementById('confirmExportBtn');
        const btnText = document.getElementById('confirmExportBtnText'); // Get the span
        if (e.target.value) {
            btnText.textContent = `Export as ${e.target.options[e.target.selectedIndex].text}`;
            btn.classList.add('visible');
        } else {
            btn.classList.remove('visible');
        }
    });

    document.getElementById('deckFileInput').addEventListener('change', (e) => { /* ... same as before ... */ });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') renderer.closeAllModals(); });
}

